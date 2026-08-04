#!/usr/bin/env node
// Apply schema.sql to the configured Postgres database (Neon or local).
require('../config');
const { migrate, close } = require('../db');

migrate()
  .then(() => close())
  .then(() => {
    console.log('[migrate] done');
    process.exit(0);
  })
  .catch((e) => {
    console.error('[migrate] failed:', e.message);
    process.exit(1);
  });
