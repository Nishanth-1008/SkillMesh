const { load, getState, close } = require('../db');
const assert = require('assert');

async function runTest() {
  console.log('Running test: Verify demo data exists in Postgres...');
  await load();
  const state = getState();

  assert(state.users.length > 0, 'Database should contain users.');

  const raj = state.users.find((u) => u.email === 'raj@example.com');
  const sneha = state.users.find((u) => u.email === 'sneha@example.com');

  assert(raj, 'Demo user raj@example.com not found.');
  assert(sneha, 'Demo user sneha@example.com not found.');

  console.log('Test passed successfully. Demo data exists.');
  await close();
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
