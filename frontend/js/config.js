// Frontend runtime config. Override by creating config.local.js (gitignored)
// or by setting window.SKILLMESH_API_BASE before this file loads.
// Keep in sync with SKILLMESH_API_BASE in .env.example.
//
// Default is a same-origin relative path, so it works both locally (the
// backend serves this SPA at :4000) and in production when the SPA is served
// from the same origin as the API (e.g. Render all-in-one). For a separated
// deployment (Vercel/Netlify + Render), set the absolute API URL via
// window.SKILLMESH_API_BASE or config.local.js.
window.SKILLMESH_CONFIG = window.SKILLMESH_CONFIG || {
  API_BASE: '/api',
};
