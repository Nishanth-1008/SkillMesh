// Seeds a demo community so SkillMesh Phase 1+2 can be evaluated end-to-end
// immediately without manual signup first. Safe to re-run: wipes and rebuilds data/db.json.

const fs = require('fs');
const crypto = require('crypto');
const { DB_FILE } = require('./db');
const { hashPassword } = require('./utils/auth');

if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);

const { load, getState, persist } = require('./db');
load();
const state = getState();
const { addRelationship } = require('./graph/relationships');
const { recordContribution } = require('./services/trust');

function makeUser({ name, email, location, availability, skills }) {
  const { salt, hash } = hashPassword('password123');
  const user = {
    id: crypto.randomUUID(),
    name, email,
    passwordHash: hash, salt,
    location, availability,
    bio: '',
    interests: [],
    createdAt: new Date().toISOString(),
  };
  state.users.push(user);
  for (const skillName of skills) {
    const canonical = skillName.toLowerCase();
    let skill = state.skills.find((s) => s.name === canonical);
    if (!skill) {
      skill = { id: crypto.randomUUID(), name: canonical };
      state.skills.push(skill);
    }
    state.userSkills.push({
      id: crypto.randomUUID(), userId: user.id, skillId: skill.id,
      level: 'expert', source: 'stated',
    });
    addRelationship(state, {
      fromType: 'person', fromId: user.id, toType: 'skill', toId: skill.id, kind: 'has_skill',
    });
  }
  return user;
}

const community = {
  id: crypto.randomUUID(),
  name: 'Greenwood Residents Community',
  description: 'A demo neighborhood community used to showcase SkillMesh Phase 1 & 2.',
  ownerId: null,
  createdAt: new Date().toISOString(),
};
state.communities.push(community);

const raj = makeUser({
  name: 'Raj Malhotra', email: 'raj@example.com', location: 'Greenwood Sector 4',
  availability: 'available', skills: ['robotics', 'programming', 'teaching', 'leadership'],
});
community.ownerId = raj.id;

const sneha = makeUser({
  name: 'Sneha Iyer', email: 'sneha@example.com', location: 'Greenwood Sector 2',
  availability: 'available', skills: ['design', 'machine learning', 'marketing'],
});
const arjun = makeUser({
  name: 'Arjun Verma', email: 'arjun@example.com', location: 'Greenwood Sector 4',
  availability: 'busy', skills: ['electrical', 'carpentry'],
});
const priya = makeUser({
  name: 'Priya Nair', email: 'priya@example.com', location: 'Greenwood Sector 1',
  availability: 'available', skills: ['first aid', 'event management', 'fundraising'],
});
const kabir = makeUser({
  name: 'Kabir Shah', email: 'kabir@example.com', location: 'Greenwood Sector 3',
  availability: 'available', skills: ['plumbing', 'electrical'],
});

for (const u of [raj, sneha, arjun, priya, kabir]) {
  state.communityMembers.push({
    id: crypto.randomUUID(), communityId: community.id, userId: u.id,
    role: u.id === raj.id ? 'owner' : 'member', joinedAt: new Date().toISOString(),
  });
  addRelationship(state, {
    fromType: 'person', fromId: u.id, toType: 'community', toId: community.id, kind: 'member_of',
  });
}

// Prior collaborations
addRelationship(state, { fromType: 'person', fromId: raj.id, toType: 'person', toId: sneha.id, kind: 'collaborated' });
addRelationship(state, { fromType: 'person', fromId: sneha.id, toType: 'person', toId: raj.id, kind: 'collaborated' });
addRelationship(state, { fromType: 'person', fromId: priya.id, toType: 'person', toId: raj.id, kind: 'collaborated' });
addRelationship(state, { fromType: 'person', fromId: raj.id, toType: 'person', toId: priya.id, kind: 'collaborated' });

// --- Phase 2 seed data ---

// Endorsements
function endorse(from, to, skillName, note) {
  const skill = state.skills.find((s) => s.name === skillName);
  if (!skill) return;
  state.endorsements.push({
    id: crypto.randomUUID(),
    fromUserId: from.id,
    toUserId: to.id,
    skillId: skill.id,
    note,
    createdAt: new Date().toISOString(),
  });
  recordContribution(state, {
    userId: to.id, kind: 'endorsement_received',
    refType: 'endorsement', refId: null, points: 2,
    summary: `Endorsed for ${skillName}`,
  });
}
endorse(sneha, raj, 'robotics', 'Best robotics mentor in Greenwood');
endorse(priya, raj, 'teaching', 'Patient and clear teacher');
endorse(raj, sneha, 'design', 'Incredible product sense');
endorse(raj, priya, 'event management', 'Ran our blood drive flawlessly');

// Demo project
const project = {
  id: crypto.randomUUID(),
  title: 'Neighborhood Hackathon 2026',
  description: 'Build civic tech tools for Greenwood residents.',
  goal: 'Ship 3 working prototypes in one weekend',
  communityId: community.id,
  ownerId: raj.id,
  status: 'active',
  timeline: '2026-08-15 to 2026-08-17',
  createdAt: new Date().toISOString(),
};
state.projects.push(project);
for (const [user, role] of [[raj, 'owner'], [sneha, 'member']]) {
  state.projectMembers.push({
    id: crypto.randomUUID(),
    projectId: project.id,
    userId: user.id,
    role,
    status: 'joined',
    joinedAt: new Date().toISOString(),
  });
  addRelationship(state, {
    fromType: 'person', fromId: user.id,
    toType: 'project', toId: project.id,
    kind: role === 'owner' ? 'owns' : 'member_of',
  });
}
recordContribution(state, {
  userId: raj.id, kind: 'project_create',
  refType: 'project', refId: project.id, points: 3,
  summary: 'Created Neighborhood Hackathon 2026',
});

// Opportunities
const opp1 = {
  id: crypto.randomUUID(),
  type: 'volunteer',
  title: 'Blood Donation Camp Volunteers',
  description: 'Need volunteers for registration desk and first-aid support.',
  communityId: community.id,
  creatorId: priya.id,
  skillsNeeded: ['first aid', 'event management'],
  location: 'Greenwood Community Hall',
  status: 'open',
  createdAt: new Date().toISOString(),
};
const opp2 = {
  id: crypto.randomUUID(),
  type: 'mentorship',
  title: 'Robotics Mentors for School Club',
  description: 'Looking for mentors to teach robotics to Grade 8–10 students.',
  communityId: community.id,
  creatorId: sneha.id,
  skillsNeeded: ['robotics', 'teaching'],
  location: 'Greenwood High School',
  status: 'open',
  createdAt: new Date().toISOString(),
};
state.opportunities.push(opp1, opp2);

// NGO organization
const ngo = {
  id: crypto.randomUUID(),
  name: 'Greenwood Care Foundation',
  type: 'ngo',
  description: 'Local NGO coordinating health camps and skill workshops.',
  ownerId: priya.id,
  communityId: community.id,
  createdAt: new Date().toISOString(),
};
state.organizations.push(ngo);
state.organizationMembers.push({
  id: crypto.randomUUID(),
  organizationId: ngo.id,
  userId: priya.id,
  role: 'owner',
  joinedAt: new Date().toISOString(),
});
addRelationship(state, {
  fromType: 'person', fromId: priya.id,
  toType: 'organization', toId: ngo.id,
  kind: 'works_at',
});

// Activity feed
state.activity.push(
  {
    id: crypto.randomUUID(), communityId: community.id, actorId: raj.id,
    type: 'project_created', summary: 'Raj Malhotra created project "Neighborhood Hackathon 2026"',
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(), communityId: community.id, actorId: priya.id,
    type: 'opportunity', summary: 'Priya Nair posted a volunteer opportunity: "Blood Donation Camp Volunteers"',
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(), communityId: community.id, actorId: sneha.id,
    type: 'endorsement', summary: 'Sneha Iyer endorsed Raj Malhotra for robotics',
    createdAt: new Date().toISOString(),
  }
);

// Project discussion seed
state.messages.push({
  id: crypto.randomUUID(),
  fromUserId: raj.id,
  toUserId: null,
  projectId: project.id,
  body: 'Welcome to the hackathon team! Kickoff briefing Friday 6pm.',
  announcement: true,
  createdAt: new Date().toISOString(),
});

// --- Phase 3–6 seed data ---

// Second community for federation demos
const riverside = {
  id: crypto.randomUUID(),
  name: 'Riverside Makers Collective',
  description: 'Neighboring maker community — used to demo cross-community federation.',
  ownerId: sneha.id,
  createdAt: new Date().toISOString(),
};
state.communities.push(riverside);
for (const u of [sneha, kabir]) {
  state.communityMembers.push({
    id: crypto.randomUUID(), communityId: riverside.id, userId: u.id,
    role: u.id === sneha.id ? 'owner' : 'member', joinedAt: new Date().toISOString(),
  });
  addRelationship(state, {
    fromType: 'person', fromId: u.id, toType: 'community', toId: riverside.id, kind: 'member_of',
  });
}

// Event
const event = {
  id: crypto.randomUUID(),
  communityId: community.id,
  title: 'Greenwood First-Aid Workshop',
  description: 'Hands-on CPR and first-aid training for residents.',
  type: 'workshop',
  startAt: '2026-08-01T10:00:00.000Z',
  endAt: '2026-08-01T13:00:00.000Z',
  location: 'Greenwood Community Hall',
  creatorId: priya.id,
  skillsNeeded: ['first aid', 'teaching'],
  status: 'upcoming',
  impactReport: null,
  createdAt: new Date().toISOString(),
};
state.events.push(event);
state.eventAttendance.push(
  { id: crypto.randomUUID(), eventId: event.id, userId: raj.id, status: 'registered', checkedInAt: null },
  { id: crypto.randomUUID(), eventId: event.id, userId: sneha.id, status: 'registered', checkedInAt: null },
);

// Gamification baseline
const { evaluateAchievements, awardPoints, ensurePoints } = require('./services/gamification');
const { ensureAgents, buildDigitalTwin, addCommunityMemory } = require('./services/autonomy');
const { syncPassport, recordImpact } = require('./services/ecosystem');

for (const u of [raj, sneha, arjun, priya, kabir]) {
  evaluateAchievements(state, u.id);
  ensurePoints(state, u.id);
}
awardPoints(state, raj.id, 40, 'Seed bonus — community founder');
awardPoints(state, priya.id, 25, 'Seed bonus — NGO lead');

// Partnership (pending → will accept in demos; seed as active)
state.partnerships.push({
  id: crypto.randomUUID(),
  fromCommunityId: community.id,
  toCommunityId: riverside.id,
  type: 'collaboration',
  status: 'active',
  createdAt: new Date().toISOString(),
});
state.federationLinks.push({
  id: crypto.randomUUID(),
  communityIds: [community.id, riverside.id],
  name: 'Greenwood × Riverside Network',
  region: 'metro',
  createdAt: new Date().toISOString(),
});

// Impact records
recordImpact(state, {
  communityId: community.id, userId: priya.id,
  metric: 'people_helped', value: 45, tags: ['health', 'volunteer', 'event'],
});
recordImpact(state, {
  communityId: community.id, userId: raj.id,
  metric: 'volunteer_hours', value: 12, tags: ['teaching', 'education'],
});

// Skill passports
for (const u of [raj, sneha, priya]) syncPassport(state, u.id);

// Agents + digital twin + memory
ensureAgents(state, community.id);
buildDigitalTwin(state, community.id);
addCommunityMemory(state, {
  communityId: community.id,
  kind: 'founding',
  content: 'Greenwood Residents Community founded to make neighborhood skills visible and actionable.',
  tags: ['history', 'founding'],
});
addCommunityMemory(state, {
  communityId: community.id,
  kind: 'lesson',
  content: 'Blood donation camps fill faster when first-aid volunteers are invited 48h ahead.',
  tags: ['volunteer', 'events'],
});

// Plugin marketplace seed install
state.plugins.push({
  id: crypto.randomUUID(),
  name: 'csv-export',
  version: '1.0.0',
  enabled: true,
  config: {},
  installedAt: new Date().toISOString(),
  installedBy: raj.id,
});

persist();

console.log('[SkillMesh] Seed complete (Phases 1–6).');
console.log(`Community: ${community.name} (${community.id})`);
console.log(`Federation partner: ${riverside.name} (${riverside.id})`);
console.log(`Project: ${project.title}`);
console.log(`Organization: ${ngo.name}`);
console.log(`Event: ${event.title}`);
console.log('Demo login (any of these, password: password123):');
for (const u of [raj, sneha, arjun, priya, kabir]) console.log(`  - ${u.email}`);
