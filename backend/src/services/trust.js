// Trust & Reputation engine (Phase 2).
// Computes a trust score from endorsements, collaborations, contributions,
// and community membership — the same signals the architecture doc lists
// under "AI Decision Factors".

function getUserSkillNames(state, userId) {
  return state.userSkills
    .filter((us) => us.userId === userId)
    .map((us) => {
      const skill = state.skills.find((s) => s.id === us.skillId);
      return skill ? skill.name : null;
    })
    .filter(Boolean);
}

function computeTrustScore(state, userId) {
  const endorsements = state.endorsements.filter((e) => e.toUserId === userId);
  const collabs = state.relationships.filter(
    (r) => r.fromType === 'person' && r.fromId === userId && r.kind === 'collaborated'
  );
  const contributions = state.contributions.filter((c) => c.userId === userId);
  const memberships = state.communityMembers.filter((m) => m.userId === userId);
  const joinedProjects = state.projectMembers.filter(
    (m) => m.userId === userId && m.status === 'joined'
  );
  const badges = state.badges.filter((b) => b.userId === userId);

  const contributionPoints = contributions.reduce((sum, c) => sum + (c.points || 1), 0);

  // Weighted blend — capped so early activity still matters
  let raw =
    endorsements.length * 4 +
    collabs.reduce((s, r) => s + (r.weight || 1), 0) * 3 +
    contributionPoints * 2 +
    memberships.length * 2 +
    joinedProjects.length * 3 +
    badges.length * 5;

  // Normalize to 0–100 for display
  const score = Math.min(100, Math.round(raw));

  return {
    score,
    breakdown: {
      endorsements: endorsements.length,
      collaborations: collabs.length,
      contributions: contributions.length,
      contributionPoints,
      communities: memberships.length,
      projects: joinedProjects.length,
      badges: badges.map((b) => b.badge),
    },
  };
}

function communityReputation(state, userId, communityId) {
  const base = computeTrustScore(state, userId);
  const inCommunity = state.communityMembers.some(
    (m) => m.communityId === communityId && m.userId === userId
  );
  if (!inCommunity) return { ...base, communityBoost: 0, communityScore: base.score };

  const communityProjects = state.projects.filter((p) => p.communityId === communityId);
  const communityProjectIds = new Set(communityProjects.map((p) => p.id));
  const localProjects = state.projectMembers.filter(
    (m) => m.userId === userId && m.status === 'joined' && communityProjectIds.has(m.projectId)
  ).length;
  const localEndorsements = state.endorsements.filter((e) => {
    if (e.toUserId !== userId) return false;
    // count endorsements from fellow community members
    return state.communityMembers.some(
      (m) => m.communityId === communityId && m.userId === e.fromUserId
    );
  }).length;

  const boost = localProjects * 3 + localEndorsements * 2;
  return {
    ...base,
    communityBoost: boost,
    communityScore: Math.min(100, base.score + boost),
  };
}

function recordContribution(state, { userId, kind, refType, refId, points = 1, summary }) {
  const crypto = require('crypto');
  const entry = {
    id: crypto.randomUUID(),
    userId,
    kind,
    refType: refType || null,
    refId: refId || null,
    points,
    summary: summary || kind,
    createdAt: new Date().toISOString(),
  };
  state.contributions.push(entry);
  maybeAwardBadges(state, userId);
  return entry;
}

function maybeAwardBadges(state, userId) {
  const crypto = require('crypto');
  const existing = new Set(state.badges.filter((b) => b.userId === userId).map((b) => b.badge));
  const trust = computeTrustScore(state, userId);
  const awards = [];

  if (trust.breakdown.endorsements >= 1 && !existing.has('endorsed')) {
    awards.push('endorsed');
  }
  if (trust.breakdown.collaborations >= 2 && !existing.has('collaborator')) {
    awards.push('collaborator');
  }
  if (trust.breakdown.projects >= 1 && !existing.has('project_starter')) {
    awards.push('project_starter');
  }
  if (trust.score >= 40 && !existing.has('trusted')) {
    awards.push('trusted');
  }
  if (trust.breakdown.contributions >= 5 && !existing.has('community_pillar')) {
    awards.push('community_pillar');
  }

  for (const badge of awards) {
    state.badges.push({
      id: crypto.randomUUID(),
      userId,
      badge,
      awardedAt: new Date().toISOString(),
    });
  }
  return awards;
}

module.exports = {
  computeTrustScore,
  communityReputation,
  recordContribution,
  maybeAwardBadges,
  getUserSkillNames,
};
