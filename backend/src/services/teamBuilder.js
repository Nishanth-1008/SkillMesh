// AI Team Builder (Phase 2).
// Given a natural-language goal + extracted skills, assembles a balanced team
// by covering required skills, preferring available people, and maximizing
// prior-collaboration compatibility — without putting the same person on twice.

const { computeTrustScore, getUserSkillNames } = require('./trust');

function skillMatches(skillName, queryToken) {
  return skillName.includes(queryToken) || queryToken.includes(skillName);
}

function personCovers(userSkills, neededSkill) {
  return userSkills.some((s) => skillMatches(s, neededSkill));
}

function collaborationScore(state, aId, bId) {
  return state.relationships
    .filter(
      (r) =>
        r.kind === 'collaborated' &&
        r.fromType === 'person' &&
        r.toType === 'person' &&
        ((r.fromId === aId && r.toId === bId) || (r.fromId === bId && r.toId === aId))
    )
    .reduce((sum, r) => sum + (r.weight || 1), 0);
}

function scorePersonForTeam(state, user, neededSkills, alreadyPicked, communityId) {
  if (communityId) {
    const member = state.communityMembers.some(
      (m) => m.communityId === communityId && m.userId === user.id
    );
    if (!member) return null;
  }

  const skills = getUserSkillNames(state, user.id);
  const covers = neededSkills.filter((ns) => personCovers(skills, ns));
  if (covers.length === 0 && neededSkills.length > 0) return null;

  const trust = computeTrustScore(state, user.id);
  let score = covers.length * 12;
  score += trust.score * 0.15;

  if (user.availability === 'available') score += 8;
  else if (user.availability === 'busy') score -= 4;

  // Compatibility with people already on the team
  let compat = 0;
  for (const other of alreadyPicked) {
    compat += collaborationScore(state, user.id, other.id);
  }
  score += compat * 4;

  // Diversity bonus: prefer people who cover uncovered skills
  const uncovered = neededSkills.filter(
    (ns) => !alreadyPicked.some((p) => personCovers(getUserSkillNames(state, p.id), ns))
  );
  const newCoverage = uncovered.filter((ns) => personCovers(skills, ns));
  score += newCoverage.length * 10;

  return {
    user: {
      id: user.id,
      name: user.name,
      location: user.location,
      availability: user.availability,
    },
    skills,
    covers,
    newCoverage,
    trustScore: trust.score,
    compatibility: compat,
    score: Math.round(score * 10) / 10,
  };
}

/**
 * Build a balanced team from a goal.
 * @returns {{ team, uncoveredSkills, coverage, successPrediction, rationale }}
 */
function buildTeam(state, { skills = [], communityId, size = 4, excludeUserIds = [] }) {
  const needed = skills.length ? skills : ['leadership', 'programming', 'design'];
  const teamSize = Math.max(2, Math.min(Number(size) || 4, 8));
  const excluded = new Set(excludeUserIds);

  const pool = state.users.filter((u) => !excluded.has(u.id));
  const team = [];
  const remaining = [...needed];

  for (let slot = 0; slot < teamSize; slot++) {
    let best = null;
    for (const user of pool) {
      if (team.some((t) => t.user.id === user.id)) continue;
      const candidate = scorePersonForTeam(
        state,
        user,
        remaining.length ? remaining : needed,
        team.map((t) => t.user),
        communityId
      );
      if (!candidate) continue;
      if (!best || candidate.score > best.score) best = candidate;
    }
    if (!best) break;
    team.push(best);
    // Remove skills this person covers from the "still needed" list
    for (const covered of best.covers) {
      const idx = remaining.findIndex((s) => skillMatches(s, covered) || skillMatches(covered, s));
      if (idx !== -1) remaining.splice(idx, 1);
    }
  }

  const coveredSet = new Set();
  for (const member of team) {
    for (const s of member.covers) coveredSet.add(s);
  }
  const uncoveredSkills = needed.filter(
    (ns) => ![...coveredSet].some((c) => skillMatches(c, ns) || skillMatches(ns, c))
  );

  const coverage = needed.length
    ? Math.round(((needed.length - uncoveredSkills.length) / needed.length) * 100)
    : 100;

  // Team success prediction: blend of coverage, avg trust, availability, prior collabs
  const avgTrust = team.length
    ? team.reduce((s, m) => s + m.trustScore, 0) / team.length
    : 0;
  const availableRatio = team.length
    ? team.filter((m) => m.user.availability === 'available').length / team.length
    : 0;
  let pairCompat = 0;
  let pairs = 0;
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      pairCompat += collaborationScore(state, team[i].user.id, team[j].user.id);
      pairs++;
    }
  }
  const avgCompat = pairs ? pairCompat / pairs : 0;

  const successPrediction = Math.min(
    100,
    Math.round(coverage * 0.45 + avgTrust * 0.25 + availableRatio * 100 * 0.2 + Math.min(avgCompat, 5) * 4)
  );

  return {
    team,
    neededSkills: needed,
    uncoveredSkills,
    coverage,
    successPrediction,
    rationale: {
      avgTrust: Math.round(avgTrust),
      availableRatio: Math.round(availableRatio * 100),
      priorCollaborations: pairCompat,
      skillCoveragePercent: coverage,
    },
  };
}

/**
 * Hidden expert discovery: people whose skills partially match via graph
 * neighbors / collaboration, even if they didn't list the exact skill.
 */
function findHiddenExperts(state, { skills = [], communityId, limit = 10 }) {
  const results = [];

  for (const user of state.users) {
    if (communityId) {
      const member = state.communityMembers.some(
        (m) => m.communityId === communityId && m.userId === user.id
      );
      if (!member) continue;
    }

    const stated = getUserSkillNames(state, user.id);
    const directHits = skills.filter((qs) => stated.some((s) => skillMatches(s, qs)));

    // Look at collaborators' skills as a proxy for "hidden" related expertise
    const collabIds = state.relationships
      .filter((r) => r.kind === 'collaborated' && r.fromType === 'person' && r.fromId === user.id && r.toType === 'person')
      .map((r) => r.toId);

    const neighborSkills = new Set();
    for (const cid of collabIds) {
      getUserSkillNames(state, cid).forEach((s) => neighborSkills.add(s));
    }

    const inferredHits = skills.filter(
      (qs) =>
        !directHits.some((d) => skillMatches(d, qs)) &&
        [...neighborSkills].some((s) => skillMatches(s, qs))
    );

    if (directHits.length === 0 && inferredHits.length === 0) continue;
    if (inferredHits.length === 0 && directHits.length > 0) continue; // only surface "hidden"

    const trust = computeTrustScore(state, user.id);
    results.push({
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      statedSkills: stated,
      directHits,
      inferredHits,
      reason: inferredHits.length
        ? `Collaborated with people who have: ${inferredHits.join(', ')}`
        : 'Related expertise via community graph',
      trustScore: trust.score,
      score: inferredHits.length * 8 + trust.score * 0.1,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

module.exports = { buildTeam, findHiddenExperts, skillMatches, scorePersonForTeam };
