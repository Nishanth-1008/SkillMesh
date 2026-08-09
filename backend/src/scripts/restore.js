// CLI: node src/scripts/restore.js <snapshot_id> — roll back to a saved snapshot.
// Example: npm run db:restore snapshot-2026-08-09T00-00-00-000Z.json
const { load, close } = require('../db');
const { restoreSnapshot, listSnapshots } = require('../backup');

(async () => {
  const id = process.argv[2];
  if (!id) {
    const list = listSnapshots();
    console.log('Usage: npm run db:restore <snapshot_id>');
    console.log('Available snapshots:' + (list.length ? '\n  ' + list.join('\n  ') : ' none'));
    process.exit(1);
  }
  await load();
  await restoreSnapshot(id);
  await close();
  process.exit(0);
})().catch((e) => {
  console.error('[restore] failed:', e.message);
  process.exit(1);
});
