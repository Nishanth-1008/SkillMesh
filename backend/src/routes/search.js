const { Router } = require('../utils/router');
const { getState } = require('../db');
const { optionalAuth } = require('../middleware/requireAuth');
const { extractSkills } = require('../nlp/skillExtractor');
const { computeTrustScore } = require('../services/trust');
const { buildTeam, findHiddenExperts } = require('../services/teamBuilder');

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
    score: Math.round(score * 10) / 10,
  };
}

router.post('/', optionalAuth, (req, res, next) => {
  try {
    const { query, communityId } = req.body;
    if (!query || !query.trim()) {
      const err = new Error('query is required — describe what you need in plain language');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const understanding = extractSkills(query);

    // Phase 2: build_team intent → AI Team Builder
    if (understanding.intent === 'build_team') {
      const teamResult = buildTeam(state, {
        skills: understanding.skills,
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
          score: m.score,
        })),
        resultCount: teamResult.team.length,
      });
    }

    const candidates = state.users
      .map((u) => scoreCandidate(state, u, understanding.skills, {
        communityId, urgent: understanding.urgent,
      }))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Attach hidden experts when intent suggests discovery
    const hidden = findHiddenExperts(state, {
      skills: understanding.skills,
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

module.exports = router;
