const { load, getState } = require('../db');
const assert = require('assert');

function runTest() {
  console.log('Running test: Verify demo data exists in mock database...');
  // Force a fresh load from db.json
  load();
  const state = getState();

  // Assert users are populated
  assert(state.users.length > 0, 'Database should contain users.');

  // Verify the specific demo users are present
  const raj = state.users.find(u => u.email === 'raj@example.com');
  const sneha = state.users.find(u => u.email === 'sneha@example.com');

  assert(raj, 'Demo user raj@example.com not found.');
  assert(sneha, 'Demo user sneha@example.com not found.');

  console.log('Test passed successfully. Demo data exists.');
}

runTest();
