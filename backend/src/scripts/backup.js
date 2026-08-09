// CLI: node src/scripts/backup.js — write a fresh snapshot of the current state.
const { load, close } = require('../db');
const { createSnapshot } = require('../backup');

(async () => {
  await load();
  await createSnapshot();
  await close();
  process.exit(0);
})().catch((e) => {
  console.error('[backup] failed:', e.message);
  process.exit(1);
});
