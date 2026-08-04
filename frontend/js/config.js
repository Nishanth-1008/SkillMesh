// Frontend runtime config. Override by creating config.local.js (gitignored)
// or by setting window.SKILLMESH_API_BASE before this file loads.
// Keep in sync with SKILLMESH_API_BASE in .env.example.
window.SKILLMESH_CONFIG = window.SKILLMESH_CONFIG || {
  API_BASE: 'http://localhost:4000/api',
};
