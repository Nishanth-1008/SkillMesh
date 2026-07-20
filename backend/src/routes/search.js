const { Router } = require('../utils/router');
const { getState } = require('../db');
const { optionalAuth } = require('../middleware/requireAuth');
const { extractSkills } = require('../nlp/skillExtractor');

const router = new Router();

// Basic string similarity so "robot" still matches the "robotics" skill node
// and typos/partials don't return zero results.
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

  // --- AI Decision Factors, weighted per documentation/system_architecture.md ---
  let score = 0;
  score += matchedSkills.length * 10; // Skills — primary signal

  const isMember = communityId
    ? state.communityMembers.some((m) => m.communityId === communityId && m.userId === user.id)
    : true;
  if (!isMember) return null; // out of scope for this community's search
  score += 3; // Community membership counts toward "trust" proxy in Phase 1

  if (user.availability === 'available') score += urgent ? 6 : 3; // Availability
  else if (user.availability === 'busy') score -= 2;

  if (user.location) score += 1; // Distance — Phase 1 has no geo distance calc yet, just presence

  const priorCollab = state.relationships.filter(
    (r) => r.fromType === 'person' && r.fromId === user.id && r.kind === 'collaborated'
  ).length;
  score += priorCollab * 2; // Previous collaborations

  return {
    user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
    matchedSkills,
    skills: userSkillNames,
    score,
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

    const candidates = state.users
      .map((u) => scoreCandidate(state, u, understanding.skills, {
        communityId, urgent: understanding.urgent,
      }))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({
      query,
      understanding, // intent, extracted skills, urgent flag — transparency into "how it thinks"
      results: candidates,
      resultCount: candidates.length,
    });
  } catch (e) { next(e); }
});

module.exports = router;
