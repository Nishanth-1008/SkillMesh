// SkillMesh data layer (Phases 1–6)
//
// JSON-file store matching the shape a Postgres migration would use.
// See documentation/system_architecture.md for the target stack.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function emptyState() {
  return {
    // --- Phase 1 ---
    users: [],
    communities: [],
    communityMembers: [],
    skills: [],
    userSkills: [],
    relationships: [],

    // --- Phase 2 ---
    projects: [],
    projectMembers: [],
    endorsements: [],
    contributions: [],
    badges: [],
    opportunities: [],
    opportunityApps: [],
    messages: [],
    notifications: [],
    activity: [],
    organizations: [],
    organizationMembers: [],

    // --- Phase 3: Community Intelligence ---
    events: [],             // { id, communityId, title, description, type, startAt, endAt, location, creatorId, skillsNeeded[], status, attendance[], impactReport, createdAt }
    eventAttendance: [],    // { id, eventId, userId, status: registered|attended|no_show, checkedInAt }
    achievements: [],       // { id, userId, achievement, points, awardedAt }
    rewardPoints: [],       // { id, userId, balance, history: [{delta, reason, at}] }
    moderationLogs: [],     // { id, actorId, targetType, targetId, action, reason, createdAt }
    auditLogs: [],          // { id, actorId, action, meta, createdAt }
    reports: [],            // { id, reporterId, targetType, targetId, reason, status, createdAt }

    // --- Phase 4: Ecosystem ---
    partnerships: [],       // { id, fromCommunityId, toCommunityId, type, status, createdAt }
    federationLinks: [],    // { id, communityIds[], name, region, createdAt }
    webhooks: [],           // { id, ownerId, url, events[], secret, active, createdAt }
    webhookDeliveries: [],  // { id, webhookId, event, payload, status, createdAt }
    apiKeys: [],            // { id, userId, key, name, scopes[], createdAt, lastUsedAt }
    integrations: [],       // { id, userId|communityId, provider, config, status, createdAt }
    emergencies: [],        // { id, communityId, title, severity, skillsNeeded[], status, location, createdAt, resolvedAt }
    emergencyResponses: [], // { id, emergencyId, userId, status, eta, createdAt }
    plugins: [],            // { id, name, version, enabled, config, installedAt }

    // --- Phase 5: Global Intelligence ---
    skillPassports: [],     // { id, userId, credentials[], verifications[], updatedAt }
    credentials: [],        // { id, userId, skill, issuer, verified, evidence, issuedAt }
    impactRecords: [],      // { id, communityId|userId|projectId, sdgGoals[], metric, value, unit, createdAt }
    researchDatasets: [],   // { id, title, description, open, records, createdAt }
    scenarios: [],          // { id, communityId, name, assumptions, results, createdAt }

    // --- Phase 6: Autonomous Intelligence ---
    agents: [],             // { id, type, communityId, status, lastRunAt, config, memory[] }
    agentRuns: [],          // { id, agentId, input, output, status, createdAt }
    digitalTwins: [],       // { id, communityId, snapshot, updatedAt }
    communityMemory: [],    // { id, communityId, kind, content, tags[], createdAt }
    autonomousTasks: [],    // { id, communityId, type, payload, status, assignedAgent, createdAt, completedAt }
  };
}

let state = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    state = emptyState();
    persist();
    return state;
  }
  try {
    state = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('[db] Failed to parse db.json, starting fresh:', e.message);
    state = emptyState();
  }
  const fresh = emptyState();
  for (const key of Object.keys(fresh)) {
    if (!Array.isArray(state[key])) state[key] = fresh[key];
  }
  return state;
}

function persist() {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

let writeQueued = false;
function save() {
  if (writeQueued) return;
  writeQueued = true;
  setImmediate(() => {
    persist();
    writeQueued = false;
  });
}

function getState() {
  if (!state) load();
  return state;
}

module.exports = { getState, save, load, DB_FILE, persist };
