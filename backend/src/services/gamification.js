// Phase 3 — Gamification: achievements, leaderboards, reward points

const crypto = require('crypto');

const ACHIEVEMENT_DEFS = {
  first_skill: { points: 10, label: 'First Skill' },
  first_endorsement: { points: 15, label: 'First Endorsement' },
  team_player: { points: 25, label: 'Team Player' },
  volunteer_star: { points: 30, label: 'Volunteer Star' },
  mentor: { points: 40, label: 'Mentor' },
  community_champion: { points: 50, label: 'Community Champion' },
  emergency_responder: { points: 60, label: 'Emergency Responder' },
  bridge_builder: { points: 45, label: 'Bridge Builder' }, // cross-community
  passport_verified: { points: 35, label: 'Verified Passport' },
};

function ensurePoints(state, userId) {
  let row = state.rewardPoints.find((r) => r.userId === userId);
  if (!row) {
    row = { id: crypto.randomUUID(), userId, balance: 0, history: [] };
    state.rewardPoints.push(row);
  }
  return row;
}

function awardPoints(state, userId, delta, reason) {
  const row = ensurePoints(state, userId);
  row.balance += delta;
  row.history.push({ delta, reason, at: new Date().toISOString() });
  if (row.history.length > 100) row.history = row.history.slice(-100);
  return row;
}

function hasAchievement(state, userId, achievement) {
  return state.achievements.some((a) => a.userId === userId && a.achievement === achievement);
}

function grantAchievement(state, userId, achievement) {
  if (hasAchievement(state, userId, achievement)) return null;
  const def = ACHIEVEMENT_DEFS[achievement] || { points: 10, label: achievement };
  const entry = {
    id: crypto.randomUUID(),
    userId,
    achievement,
    label: def.label,
    points: def.points,
    awardedAt: new Date().toISOString(),
  };
  state.achievements.push(entry);
  awardPoints(state, userId, def.points, `Achievement: ${def.label}`);
  return entry;
}

function evaluateAchievements(state, userId) {
  const awarded = [];
  const skills = state.userSkills.filter((us) => us.userId === userId).length;
  if (skills >= 1) {
    const a = grantAchievement(state, userId, 'first_skill');
    if (a) awarded.push(a);
  }
  const endorsements = state.endorsements.filter((e) => e.toUserId === userId).length;
  if (endorsements >= 1) {
    const a = grantAchievement(state, userId, 'first_endorsement');
    if (a) awarded.push(a);
  }
  const projects = state.projectMembers.filter(
    (m) => m.userId === userId && m.status === 'joined'
  ).length;
  if (projects >= 2) {
    const a = grantAchievement(state, userId, 'team_player');
    if (a) awarded.push(a);
  }
  const volunteers = state.contributions.filter(
    (c) => c.userId === userId && c.kind === 'volunteer'
  ).length;
  if (volunteers >= 2) {
    const a = grantAchievement(state, userId, 'volunteer_star');
    if (a) awarded.push(a);
  }
  const teaching = state.userSkills.some((us) => {
    if (us.userId !== userId) return false;
    const sk = state.skills.find((s) => s.id === us.skillId);
    return sk && (sk.name === 'teaching' || sk.name.includes('mentor'));
  });
  if (teaching && endorsements >= 1) {
    const a = grantAchievement(state, userId, 'mentor');
    if (a) awarded.push(a);
  }
  const points = ensurePoints(state, userId);
  if (points.balance >= 100) {
    const a = grantAchievement(state, userId, 'community_champion');
    if (a) awarded.push(a);
  }
  return awarded;
}

function leaderboard(state, { communityId, limit = 10 } = {}) {
  let userIds;
  if (communityId) {
    userIds = state.communityMembers
      .filter((m) => m.communityId === communityId)
      .map((m) => m.userId);
  } else {
    userIds = state.users.map((u) => u.id);
  }

  return userIds
    .map((userId) => {
      const user = state.users.find((u) => u.id === userId);
      if (!user) return null;
      const points = ensurePoints(state, userId).balance;
      const achievements = state.achievements.filter((a) => a.userId === userId);
      const contribPoints = state.contributions
        .filter((c) => c.userId === userId)
        .reduce((s, c) => s + (c.points || 0), 0);
      return {
        user: { id: user.id, name: user.name },
        points,
        achievementCount: achievements.length,
        contributionPoints: contribPoints,
        score: points + contribPoints,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row, i) => ({ rank: i + 1, ...row }));
}

function milestones(state, communityId) {
  const members = state.communityMembers.filter((m) => m.communityId === communityId).length;
  const projects = state.projects.filter((p) => p.communityId === communityId).length;
  const events = (state.events || []).filter((e) => e.communityId === communityId).length;
  const defs = [
    { id: 'members_5', label: '5 Members', target: 5, current: members },
    { id: 'members_25', label: '25 Members', target: 25, current: members },
    { id: 'projects_3', label: '3 Projects', target: 3, current: projects },
    { id: 'events_2', label: '2 Events', target: 2, current: events },
  ];
  return defs.map((d) => ({
    ...d,
    reached: d.current >= d.target,
    progress: Math.min(100, Math.round((d.current / d.target) * 100)),
  }));
}

module.exports = {
  ACHIEVEMENT_DEFS,
  awardPoints,
  grantAchievement,
  evaluateAchievements,
  leaderboard,
  milestones,
  ensurePoints,
};
