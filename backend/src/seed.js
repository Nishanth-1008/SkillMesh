// Seeds a small demo community so Phase 1 can be evaluated end-to-end
// immediately (search, graph view, etc.) without manual signup first.
// Safe to re-run: it wipes and rebuilds data/db.json.

const fs = require('fs');
const crypto = require('crypto');
const { DB_FILE } = require('./db');
const { hashPassword } = require('./utils/auth');

if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);

const { load, save, getState, persist } = require('./db');
load();
const state = getState();
const { addRelationship } = require('./graph/relationships');

function makeUser({ name, email, location, availability, skills }) {
  const { salt, hash } = hashPassword('password123');
  const user = {
    id: crypto.randomUUID(),
    name, email,
    passwordHash: hash, salt,
    location, availability,
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
  description: 'A demo neighborhood community used to showcase SkillMesh Phase 1.',
  ownerId: null,
  createdAt: new Date().toISOString(),
};
state.communities.push(community);

const raj = makeUser({
  name: 'Raj Malhotra', email: 'raj@example.com', location: 'Greenwood Sector 4',
  availability: 'available', skills: ['robotics', 'programming', 'teaching'],
});
community.ownerId = raj.id;

const sneha = makeUser({
  name: 'Sneha Iyer', email: 'sneha@example.com', location: 'Greenwood Sector 2',
  availability: 'available', skills: ['design', 'machine learning'],
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
  availability: 'available', skills: ['plumbing'],
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

// A couple of "collaborated" edges so the ranking factor has something to show
addRelationship(state, { fromType: 'person', fromId: raj.id, toType: 'person', toId: sneha.id, kind: 'collaborated' });
addRelationship(state, { fromType: 'person', fromId: sneha.id, toType: 'person', toId: raj.id, kind: 'collaborated' });

persist(); // synchronous flush — save() is debounced and the process exits before it fires

console.log('[SkillMesh] Seed complete.');
console.log(`Community: ${community.name} (${community.id})`);
console.log('Demo login (any of these, password: password123):');
for (const u of [raj, sneha, arjun, priya, kabir]) console.log(`  - ${u.email}`);
