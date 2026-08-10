// Smart Recommendations (Phase 2).
// Surfaces mentors, volunteers, experts, similar people, related skills,
// and nearby contributors from the knowledge graph + trust scores.

const { computeTrustScore, getUserSkillNames } = require('./trust');
const { skillMatches } = require('./teamBuilder');
const { buildExplain } = require('./explain');
const { feedbackModifier } = require('./feedback');

function inCommunity(state, userId, communityId) {
  if (!communityId) return true;
  return state.communityMembers.some((m) => m.communityId === communityId && m.userId === userId);
}

function sameLocation(a, b) {
  if (!a || !b) return false;
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  // soft match on shared tokens (e.g. "Greenwood Sector 4" ~ "Greenwood Sector 2")
  const ta = new Set(na.split(/\s+/));
  const tb = nb.split(/\s+/);
  return tb.some((t) => t.length > 3 && ta.has(t));
}

function recommendMentors(state, { userId, communityId, limit = 10, viewerId }) {
  const me = state.users.find((u) => u.id === userId);
  const mySkills = userId ? getUserSkillNames(state, userId) : [];
  const results = [];
  const feedbackFor = (id) => feedbackModifier(state, id, viewerId || userId);

  for (const user of state.users) {
    if (userId && user.id === userId) continue;
    if (!inCommunity(state, user.id, communityId)) continue;

    const skills = getUserSkillNames(state, user.id);
    const teaching = skills.some((s) => s.includes('teach') || s === 'teaching');
    const expertSkills = state.userSkills
      .filter((us) => us.userId === user.id && us.level === 'expert')
      .map((us) => {
        const sk = state.skills.find((s) => s.id === us.skillId);
        return sk ? sk.name : null;
      })
      .filter(Boolean);

    // Prefer experts in skills the requester doesn't have
    const teachable = expertSkills.filter(
      (s) => !mySkills.some((ms) => skillMatches(ms, s))
    );
    if (!teaching && teachable.length === 0 && expertSkills.length === 0) continue;

    const trust = computeTrustScore(state, user.id);
    const endorsements = state.endorsements.filter((e) => e.toUserId === user.id).length;
    const explain = buildExplain({
      teachable,
      trustScore: trust.score,
      endorsements,
      availability: user.availability,
    });

    results.push({
      type: 'mentor',
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      skills: expertSkills.length ? expertSkills : skills,
      teachable,
      trustScore: trust.score,
      endorsements,
      explain,
      score: teachable.length * 10 + (teaching ? 8 : 0) + trust.score * 0.2 + endorsements * 3 + feedbackFor(user.id),
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function recommendVolunteers(state, { skills = [], communityId, limit = 10, viewerId }) {
  const results = [];
  const feedbackFor = (id) => feedbackModifier(state, id, viewerId);
  for (const user of state.users) {
    if (!inCommunity(state, user.id, communityId)) continue;
    if (user.availability !== 'available') continue;

    const userSkills = getUserSkillNames(state, user.id);
    const matched = skills.length
      ? skills.filter((qs) => userSkills.some((s) => skillMatches(s, qs)))
      : userSkills.slice(0, 3);
    if (skills.length && matched.length === 0) continue;

    const trust = computeTrustScore(state, user.id);
    const volunteerHistory = state.contributions.filter(
      (c) => c.userId === user.id && (c.kind === 'volunteer' || c.kind === 'opportunity')
    ).length;

    results.push({
      type: 'volunteer',
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      matchedSkills: matched,
      skills: userSkills,
      trustScore: trust.score,
      volunteerHistory,
      explain: buildExplain({
        matchedSkills: matched,
        trustScore: trust.score,
        volunteerHistory,
        availability: user.availability,
      }),
      score: matched.length * 10 + trust.score * 0.15 + volunteerHistory * 5 + 5 + feedbackFor(user.id),
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function recommendExperts(state, { skills = [], communityId, limit = 10, viewerId }) {
  const results = [];
  const feedbackFor = (id) => feedbackModifier(state, id, viewerId);
  for (const user of state.users) {
    if (!inCommunity(state, user.id, communityId)) continue;

    const expertRows = state.userSkills.filter(
      (us) => us.userId === user.id && us.level === 'expert'
    );
    const expertSkills = expertRows
      .map((us) => {
        const sk = state.skills.find((s) => s.id === us.skillId);
        return sk ? sk.name : null;
      })
      .filter(Boolean);

    const matched = skills.length
      ? skills.filter((qs) => expertSkills.some((s) => skillMatches(s, qs)))
      : expertSkills;
    if (matched.length === 0) continue;

    const trust = computeTrustScore(state, user.id);
    results.push({
      type: 'expert',
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      expertSkills,
      matchedSkills: matched,
      trustScore: trust.score,
      explain: buildExplain({
        matchedSkills: matched,
        trustScore: trust.score,
        availability: user.availability,
      }),
      score: matched.length * 12 + trust.score * 0.2 + feedbackFor(user.id),
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function similarPeople(state, { userId, communityId, limit = 10, viewerId }) {
  const mySkills = getUserSkillNames(state, userId);
  if (!mySkills.length) return [];

  const results = [];
  const feedbackFor = (id) => feedbackModifier(state, id, viewerId || userId);
  for (const user of state.users) {
    if (user.id === userId) continue;
    if (!inCommunity(state, user.id, communityId)) continue;

    const skills = getUserSkillNames(state, user.id);
    const overlap = mySkills.filter((ms) => skills.some((s) => skillMatches(s, ms)));
    if (!overlap.length) continue;

    const trust = computeTrustScore(state, user.id);
    results.push({
      type: 'similar',
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      sharedSkills: overlap,
      skills,
      trustScore: trust.score,
      explain: buildExplain({
        sharedSkills: overlap,
        trustScore: trust.score,
        availability: user.availability,
      }),
      score: overlap.length * 10 + trust.score * 0.1 + feedbackFor(user.id),
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function relatedSkills(state, { skill, limit = 8 }) {
  if (!skill) return [];
  const canonical = skill.toLowerCase().trim();
  const skillNode = state.skills.find((s) => s.name === canonical || skillMatches(s.name, canonical));
  if (!skillNode) return [];

  // People who have this skill — collect their other skills as "related"
  const holders = state.userSkills.filter((us) => us.skillId === skillNode.id).map((us) => us.userId);
  const counts = {};
  for (const us of state.userSkills) {
    if (!holders.includes(us.userId)) continue;
    if (us.skillId === skillNode.id) continue;
    const sk = state.skills.find((s) => s.id === us.skillId);
    if (!sk) continue;
    counts[sk.name] = (counts[sk.name] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ skill: name, coOccurrence: count }));
}

function nearbyContributors(state, { userId, communityId, limit = 10, viewerId }) {
  const me = state.users.find((u) => u.id === userId);
  if (!me || !me.location) return [];

  const results = [];
  const feedbackFor = (id) => feedbackModifier(state, id, viewerId || userId);
  for (const user of state.users) {
    if (user.id === userId) continue;
    if (!inCommunity(state, user.id, communityId)) continue;
    if (!sameLocation(me.location, user.location)) continue;

    const skills = getUserSkillNames(state, user.id);
    const trust = computeTrustScore(state, user.id);
    results.push({
      type: 'nearby',
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      skills,
      trustScore: trust.score,
      explain: buildExplain({
        trustScore: trust.score,
        availability: user.availability,
        sameArea: user.location,
      }),
      score: trust.score + (user.availability === 'available' ? 10 : 0) + feedbackFor(user.id),
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function recommendAll(state, opts) {
  return {
    mentors: recommendMentors(state, opts),
    volunteers: recommendVolunteers(state, opts),
    experts: recommendExperts(state, opts),
    similar: opts.userId ? similarPeople(state, opts) : [],
    nearby: opts.userId ? nearbyContributors(state, opts) : [],
    relatedSkills: opts.skill ? relatedSkills(state, opts) : [],
  };
}

module.exports = {
  recommendMentors,
  recommendVolunteers,
  recommendExperts,
  similarPeople,
  relatedSkills,
  nearbyContributors,
  recommendAll,
};
