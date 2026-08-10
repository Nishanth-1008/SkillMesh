const { Router } = require('../utils/router');
const { getState, save, semanticTableAvailable } = require('../db');
const { optionalAuth } = require('../middleware/requireAuth');
const { validate } = require('../middleware/validate');
const { searchQuery } = require('../validation/schemas');
const { extractSkills } = require('../nlp/skillExtractor');
const { computeTrustScore } = require('../services/trust');
const { buildTeam, findHiddenExperts } = require('../services/teamBuilder');
const { buildExplain } = require('../services/explain');
const { understandQuery } = require('../services/llm');
const { DIM } = require('../services/embeddings');

const router = new Router();

function skillMatches(skillName, queryToken) {
  return skillName.includes(queryToken) || queryToken.includes(skillName);
}

function scoreCandidate(state, user, extractedSkills, { communityId, urgent }) {
  const userSkillRows = state.userSkills.filter((us) => us.userId === user.id);
  const userSkillNames = userSkillRows.map((us) => {
    const skill = state.skills.find((s) => s.id === us.skillId);
    return skill ? skill.name : null;
  }).filter(Boolean);

  const matchedSkills = extractedSkills.filter((qs) =>
    userSkillNames.some((sn) => skillMatches(sn, qs))
  );
  if (matchedSkills.length === 0) return null;

  const trust = computeTrustScore(state, user.id);

  let score = 0;
  score += matchedSkills.length * 10; // Skills
  score += trust.score * 0.2; // Trust (Phase 2)

  const isMember = communityId
    ? state.communityMembers.some((m) => m.communityId === communityId && m.userId === user.id)
    : true;
  if (!isMember) return null;
  score += 3;

  if (user.availability === 'available') score += urgent ? 6 : 3;
  else if (user.availability === 'busy') score -= 2;

  if (user.location) score += 1;

  const priorCollab = state.relationships.filter(
    (r) => r.fromType === 'person' && r.fromId === user.id && r.kind === 'collaborated'
  ).length;
  score += priorCollab * 2;

  const endorsements = state.endorsements.filter((e) => e.toUserId === user.id).length;
  score += endorsements * 2; // Reputation

  return {
    user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
    matchedSkills,
    skills: userSkillNames,
    trustScore: trust.score,
    explain: buildExplain({
      matchedSkills,
      trustScore: trust.score,
      availability: user.availability,
    }),
    score: Math.round(score * 10) / 10,
  };
}

router.post('/', optionalAuth, validate(searchQuery), async (req, res, next) => {
  try {
    const { query, communityId } = req.body;
    const state = getState();
    const understanding = await understandQuery(query);
    const skills = understanding.skills || extractSkills(query).skills;

    // Phase 2: build_team intent → AI Team Builder
    if (understanding.intent === 'build_team') {
      const teamSkills = skills.length >= 2
        ? skills
        : [...skills, 'programming', 'design', 'leadership'];
      const teamResult = buildTeam(state, {
        skills: teamSkills,
        communityId,
        size: 4,
      });
      return res.json({
        query,
        understanding,
        mode: 'team_builder',
        team: teamResult,
        results: teamResult.team.map((m) => ({
          user: m.user,
          matchedSkills: m.covers,
          skills: m.skills,
          trustScore: m.trustScore,
          explain: m.explain || [],
          score: m.score,
        })),
        resultCount: teamResult.team.length,
      });
    }

    const candidates = state.users
      .map((u) => scoreCandidate(state, u, skills, {
        communityId, urgent: understanding.urgent,
      }))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Attach hidden experts when intent suggests discovery
    const hidden = findHiddenExperts(state, {
      skills,
      communityId,
      limit: 5,
    });

    res.json({
      query,
      understanding,
      mode: understanding.intent === 'emergency' ? 'emergency' : 'people',
      results: candidates,
      resultCount: candidates.length,
      hiddenExperts: hidden,
    });
  } catch (e) { next(e); }
});

// Semantic ("magic") search — ranks people, opportunities, skills, and
// projects by embedding cosine similarity (pgvector-backed when available).
router.post('/semantic', optionalAuth, validate(searchQuery), async (req, res, next) => {
  try {
    const { query, communityId } = req.body;
    const state = getState();
    const understanding = await understandQuery(query);
    const { ensureSemanticVectors, rankPeople, rankOpportunities, rankSkills, rankProjects } =
      require('../services/semanticSearch');

    const changed = await ensureSemanticVectors(state);
    if (changed > 0) save();

    const viewerId = req.user ? req.user.id : undefined;
    const [people, opportunities, skills, projects, pgAvailable] = await Promise.all([
      rankPeople(state, { text: query, communityId, excludeUserId: viewerId, viewerId }),
      rankOpportunities(state, { text: query, communityId }),
      rankSkills(state, { text: query }),
      rankProjects(state, { text: query, communityId }),
      semanticTableAvailable(),
    ]);

    res.json({
      query,
      understanding,
      people: people.people,
      opportunities,
      skills,
      projects,
      engine: people.engine,
      pgVectorAvailable: pgAvailable,
      embeddingDim: DIM,
    });
  } catch (e) { next(e); }
});

// Genuine pgvector SQL distance query (Postgres only). 501 when unavailable.
router.get('/semantic/pg', optionalAuth, async (req, res, next) => {
  try {
    const { text, entityType = 'user', limit } = req.query;
    if (!text) {
      const err = new Error('text query param is required');
      err.status = 400;
      throw err;
    }
    const { pgVectorSearch, ensureSemanticVectors, DIM: _DIM } = require('../services/semanticSearch');
    const state = getState();
    await ensureSemanticVectors(state);

    const rows = await pgVectorSearch(state, {
      text: String(text),
      entityType: ['user', 'skill', 'opportunity', 'project'].includes(entityType) ? entityType : 'user',
      limit: Number(limit) || 10,
    });
    if (!rows) {
      const err = new Error('pgvector is not available in this deployment (Postgres + vector extension required).');
      err.status = 501;
      throw err;
    }
    res.json({ engine: 'pgvector', text, entityType, matches: rows });
  } catch (e) { next(e); }
});

module.exports = router;
