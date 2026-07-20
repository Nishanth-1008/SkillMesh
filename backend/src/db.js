// SkillMesh Phase 1 — Data layer
//
// Design note: the target architecture (see documentation/system_architecture.md)
// calls for PostgreSQL/Supabase. This sandbox has no network access to install
// a Postgres driver, so Phase 1 ships a small JSON-file-backed store that
// implements the SAME schema/shape a Postgres migration would use. Swapping
// this module for a real `pg` client later should not require changes to any
// route file — every route talks to db.js, not to files directly.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function emptyState() {
  return {
    users: [],              // { id, name, email, passwordHash, salt, location, availability, createdAt }
    communities: [],        // { id, name, description, ownerId, createdAt }
    communityMembers: [],   // { id, communityId, userId, role, joinedAt }
    skills: [],             // { id, name }
    userSkills: [],         // { id, userId, skillId, level, source: 'stated'|'inferred' }
    // Knowledge graph relationship edges — the "relationship engine"
    relationships: [],      // { id, fromType, fromId, toType, toId, kind, weight, createdAt }
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
  // backfill any new collections added after a prior save
  const fresh = emptyState();
  for (const key of Object.keys(fresh)) {
    if (!Array.isArray(state[key])) state[key] = fresh[key];
  }
  return state;
}

let writeQueued = false;
function persist() {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

// Debounce writes slightly so bursts of edits don't thrash disk I/O.
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
