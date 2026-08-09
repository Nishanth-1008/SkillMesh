// Daily SQLite/state snapshot backups + restore.
//   snapshots stored in: backend/data/backups/snapshot-<timestamp>.json
//   CLI: node src/scripts/backup.js            → create a snapshot now
//        node src/scripts/restore.js <id>      → restore a snapshot
//
// Snapshots are plain JSON dumps of the full in-memory state. Restoring
// through db.persist() writes back to the JSON store or Postgres, so a
// snapshot can be restored in either mode within seconds.

const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { getState, emptyState, persist } = require('./db');

function snapshotName() {
  return `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

function listSnapshots() {
  if (!fs.existsSync(config.BACKUP_DIR)) return [];
  return fs.readdirSync(config.BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
}

async function createSnapshot({ quiet = false } = {}) {
  fs.mkdirSync(config.BACKUP_DIR, { recursive: true });
  const state = getState();
  const file = path.join(config.BACKUP_DIR, snapshotName());
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
  if (!quiet) console.log(`[backup] snapshot saved → ${file}`);
  return file;
}

/** Called on server start: snapshot if none exists or the newest is ≥24h old. */
async function ensureDailyBackup() {
  const list = listSnapshots();
  if (list.length === 0) {
    await createSnapshot({ quiet: false });
    return;
  }
  const newest = list[list.length - 1];
  const stat = fs.statSync(path.join(config.BACKUP_DIR, newest));
  const ageHours = (Date.now() - stat.mtimeMs) / 36e5;
  if (ageHours >= 24) {
    await createSnapshot({ quiet: false });
  }
}

async function restoreSnapshot(id) {
  const name = id.endsWith('.json') ? id : `snapshot-${id}.json`;
  const file = path.join(config.BACKUP_DIR, name);
  if (!fs.existsSync(file)) {
    const available = listSnapshots().join(', ') || 'none';
    throw new Error(`Snapshot "${id}" not found in ${config.BACKUP_DIR}. Available: ${available}`);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = emptyState();
  Object.assign(next, data);

  const state = getState();
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);

  await persist();
  console.log(`[backup] restored snapshot "${id}" → ${config.BACKUP_DIR}`);
}

module.exports = { snapshotName, listSnapshots, createSnapshot, ensureDailyBackup, restoreSnapshot };
