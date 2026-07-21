// Phase 4–5 services: federation, emergency, integrations, identity, impact

const crypto = require('crypto');
const { getUserSkillNames, computeTrustScore } = require('./trust');
const { skillMatches } = require('./teamBuilder');
const { memberUsers } = require('./analytics');
const { grantAchievement, awardPoints } = require('./gamification');

// ---------- Federation / Cross-community ----------
function discoverSharedTalent(state, communityA, communityB) {
  const a = memberUsers(state, communityA);
  const b = memberUsers(state, communityB);
  const aIds = new Set(a.map((u) => u.id));
  const shared = [];

  for (const user of b) {
    if (aIds.has(user.id)) {
      shared.push({
        user: { id: user.id, name: user.name },
        skills: getUserSkillNames(state, user.id),
        reason: 'member_of_both',
      });
      continue;
    }
    const skillsB = getUserSkillNames(state, user.id);
    for (const other of a) {
      const skillsA = getUserSkillNames(state, other.id);
      const overlap = skillsA.filter((s) => skillsB.some((t) => skillMatches(s, t)));
      if (overlap.length >= 2) {
        shared.push({
          user: { id: user.id, name: user.name },
          counterpart: { id: other.id, name: other.name },
          sharedSkills: overlap,
          reason: 'skill_overlap',
        });
        break;
      }
    }
  }
  return shared.slice(0, 20);
}

function publicCommunityProfile(state, communityId) {
  const community = state.communities.find((c) => c.id === communityId);
  if (!community) return null;
  const members = memberUsers(state, communityId);
  const projects = state.projects.filter(
    (p) => p.communityId === communityId && p.status !== 'archived'
  );
  const opps = state.opportunities.filter(
    (o) => o.communityId === communityId && o.status === 'open'
  );
  const events = (state.events || []).filter((e) => e.communityId === communityId);
  const successStories = state.activity
    .filter((a) => a.communityId === communityId &&
      ['project_created', 'ai_team', 'opportunity'].includes(a.type))
    .slice(-10);

  return {
    id: community.id,
    name: community.name,
    description: community.description,
    public: true,
    stats: {
      members: members.length,
      projects: projects.length,
      openOpportunities: opps.length,
      events: events.length,
    },
    showcase: {
      projects: projects.slice(0, 5).map((p) => ({ id: p.id, title: p.title, goal: p.goal })),
      opportunities: opps.slice(0, 5).map((o) => ({ id: o.id, title: o.title, type: o.type })),
      events: events.slice(0, 5).map((e) => ({ id: e.id, title: e.title, startAt: e.startAt })),
    },
    successStories: successStories.map((s) => ({ summary: s.summary, at: s.createdAt })),
  };
}

// ---------- Emergency Response ----------
function createEmergency(state, { communityId, title, severity, skillsNeeded, location, creatorId }) {
  const emergency = {
    id: crypto.randomUUID(),
    communityId,
    title,
    severity: severity || 'high',
    skillsNeeded: (skillsNeeded || []).map((s) => s.toLowerCase()),
    status: 'active',
    location: location || null,
    creatorId,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  state.emergencies.push(emergency);

  // Rapid expert discovery
  const members = memberUsers(state, communityId);
  const matches = [];
  for (const user of members) {
    const skills = getUserSkillNames(state, user.id);
    const matched = emergency.skillsNeeded.filter((ns) =>
      skills.some((s) => skillMatches(s, ns))
    );
    if (!matched.length && emergency.skillsNeeded.length) continue;
    const trust = computeTrustScore(state, user.id);
    const score =
      matched.length * 15 +
      (user.availability === 'available' ? 20 : 0) +
      trust.score * 0.2;
    matches.push({
      user: { id: user.id, name: user.name, location: user.location, availability: user.availability },
      matchedSkills: matched.length ? matched : skills.slice(0, 3),
      trustScore: trust.score,
      score: Math.round(score),
      etaMinutes: user.availability === 'available' ? 15 : 45,
    });
  }
  matches.sort((a, b) => b.score - a.score);

  return { emergency, recommendedResponders: matches.slice(0, 10) };
}

// ---------- Digital Identity / Skill Passport ----------
function getOrCreatePassport(state, userId) {
  let passport = state.skillPassports.find((p) => p.userId === userId);
  if (!passport) {
    passport = {
      id: crypto.randomUUID(),
      userId,
      credentials: [],
      verifications: [],
      updatedAt: new Date().toISOString(),
    };
    state.skillPassports.push(passport);
  }
  return passport;
}

function syncPassport(state, userId) {
  const passport = getOrCreatePassport(state, userId);
  const skills = getUserSkillNames(state, userId);
  const trust = computeTrustScore(state, userId);
  const endorsements = state.endorsements.filter((e) => e.toUserId === userId);
  const badges = state.badges.filter((b) => b.userId === userId);
  const achievements = state.achievements.filter((a) => a.userId === userId);

  // Auto-issue credentials for expert skills with endorsements
  for (const skill of skills) {
    const existing = state.credentials.find(
      (c) => c.userId === userId && c.skill === skill
    );
    if (existing) continue;
    const skillNode = state.skills.find((s) => s.name === skill);
    const endorsed = skillNode
      ? endorsements.filter((e) => e.skillId === skillNode.id).length
      : 0;
    const level = state.userSkills.find(
      (us) => us.userId === userId && us.skillId === (skillNode && skillNode.id)
    );
    state.credentials.push({
      id: crypto.randomUUID(),
      userId,
      skill,
      issuer: endorsed > 0 ? 'community_endorsement' : 'self_attested',
      verified: endorsed > 0 || (level && level.level === 'expert'),
      evidence: {
        endorsements: endorsed,
        level: level ? level.level : 'unknown',
        trustScore: trust.score,
      },
      issuedAt: new Date().toISOString(),
    });
  }

  passport.credentials = state.credentials.filter((c) => c.userId === userId).map((c) => c.id);
  passport.verifications = {
    trustScore: trust.score,
    badges: badges.map((b) => b.badge),
    achievements: achievements.map((a) => a.achievement),
    portable: true,
  };
  passport.updatedAt = new Date().toISOString();

  if (state.credentials.some((c) => c.userId === userId && c.verified)) {
    grantAchievement(state, userId, 'passport_verified');
  }

  return {
    passport,
    credentials: state.credentials.filter((c) => c.userId === userId),
    summary: {
      skills: skills.length,
      verified: state.credentials.filter((c) => c.userId === userId && c.verified).length,
      trustScore: trust.score,
    },
  };
}

// ---------- SDG / Impact ----------
const SDG_MAP = {
  education: [4],
  teaching: [4],
  health: [3],
  'first aid': [3],
  volunteering: [11, 17],
  volunteer: [11, 17],
  environment: [13, 15],
  fundraising: [1, 10],
  technology: [9],
  programming: [9],
  robotics: [4, 9],
  community: [11],
  emergency: [11, 3],
};

function recordImpact(state, { communityId, userId, projectId, metric, value, unit, tags }) {
  const sdgGoals = new Set();
  for (const tag of tags || []) {
    const mapped = SDG_MAP[tag.toLowerCase()] || [];
    mapped.forEach((g) => sdgGoals.add(g));
  }
  if (!sdgGoals.size) sdgGoals.add(11); // Sustainable Cities default

  const record = {
    id: crypto.randomUUID(),
    communityId: communityId || null,
    userId: userId || null,
    projectId: projectId || null,
    sdgGoals: [...sdgGoals],
    metric,
    value,
    unit: unit || 'count',
    createdAt: new Date().toISOString(),
  };
  state.impactRecords.push(record);
  if (userId) awardPoints(state, userId, Math.min(20, Math.round(Number(value) || 1)), `Impact: ${metric}`);
  return record;
}

function impactReport(state, { communityId } = {}) {
  let records = state.impactRecords;
  if (communityId) records = records.filter((r) => r.communityId === communityId);

  const bySdg = {};
  for (const r of records) {
    for (const g of r.sdgGoals) {
      if (!bySdg[g]) bySdg[g] = { sdg: g, records: 0, value: 0 };
      bySdg[g].records++;
      bySdg[g].value += Number(r.value) || 0;
    }
  }

  const resilience = Math.min(100, 40 + records.length * 5 + Object.keys(bySdg).length * 8);

  return {
    totalRecords: records.length,
    bySdg: Object.values(bySdg).sort((a, b) => a.sdg - b.sdg),
    recent: records.slice(-15).reverse(),
    communityResilienceScore: resilience,
    sustainabilityMetrics: {
      volunteerHours: records.filter((r) => r.metric.includes('volunteer')).reduce((s, r) => s + (Number(r.value) || 0), 0),
      peopleHelped: records.filter((r) => r.metric.includes('people')).reduce((s, r) => s + (Number(r.value) || 0), 0),
      eventsRun: records.filter((r) => r.metric.includes('event')).length,
    },
  };
}

// ---------- Scenario simulation ----------
function runScenario(state, { communityId, name, assumptions }) {
  const members = memberUsers(state, communityId);
  const {
    newMembers = 0,
    skillTraining = [],
    emergencySkill = null,
    projectCount = 0,
  } = assumptions || {};

  const projectedMembers = members.length + newMembers;
  let skillCoverage = members.reduce((s, u) => s + getUserSkillNames(state, u.id).length, 0);
  skillCoverage += skillTraining.length * Math.max(1, Math.floor(newMembers / 2) || 1);

  let emergencyReadiness = 40;
  if (emergencySkill) {
    const have = members.filter((u) =>
      getUserSkillNames(state, u.id).some((s) => skillMatches(s, emergencySkill))
    ).length;
    emergencyReadiness = Math.min(100, 30 + have * 15 + (skillTraining.includes(emergencySkill) ? 20 : 0));
  }

  const projectedProjects = state.projects.filter((p) => p.communityId === communityId).length + projectCount;
  const healthProjection = Math.min(100, Math.round(
    35 +
    Math.min(projectedMembers, 50) +
    Math.min(skillCoverage, 40) * 0.5 +
    projectedProjects * 4
  ));

  const results = {
    projectedMembers,
    projectedSkillSlots: skillCoverage,
    projectedProjects,
    emergencyReadiness,
    healthProjection,
    narrative: `With ${newMembers} new members and training in [${skillTraining.join(', ') || 'none'}], ` +
      `community health is projected at ${healthProjection}/100` +
      (emergencySkill ? ` and ${emergencySkill} emergency readiness at ${emergencyReadiness}/100.` : '.'),
  };

  const scenario = {
    id: crypto.randomUUID(),
    communityId,
    name: name || 'Untitled scenario',
    assumptions,
    results,
    createdAt: new Date().toISOString(),
  };
  state.scenarios.push(scenario);
  return scenario;
}

module.exports = {
  discoverSharedTalent,
  publicCommunityProfile,
  createEmergency,
  syncPassport,
  getOrCreatePassport,
  recordImpact,
  impactReport,
  runScenario,
  SDG_MAP,
};
