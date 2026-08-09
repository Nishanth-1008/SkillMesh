// Load env from project root or backend/, then export typed config.
const path = require('path');
const fs = require('fs');

function loadDotEnv() {
  try {
    const root = path.join(__dirname, '..', '..');
    const backend = path.join(__dirname, '..');
    // Later files override earlier ones when override: true.
    // Order: .env → .env.local → backend/.env → backend/.env.local
    const candidates = [
      path.join(root, '.env'),
      path.join(root, '.env.local'),
      path.join(backend, '.env'),
      path.join(backend, '.env.local'),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        require('dotenv').config({ path: file, override: true });
      }
    }
  } catch {
    // dotenv optional if env already injected by host
  }
}

loadDotEnv();

function bool(v, fallback = false) {
  if (v === undefined || v === null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function int(v, fallback) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const JWT_SECRET = process.env.JWT_SECRET || (isProd ? '' : 'skillmesh-dev-secret-change-me');
if (isProd && !process.env.JWT_SECRET) {
  console.error('[config] JWT_SECRET is required when NODE_ENV=production');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL && !(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE)) {
  console.warn(
    '[config] DATABASE_URL is not set. Copy .env.example → .env and add your Neon connection string.'
  );
}

/**
 * Allowed browser origins for CORS. Comma-separated `ALLOWED_ORIGINS`
 * (e.g. "https://skillmesh.app,https://staging.skillmesh.app") or the legacy
 * single-value `CORS_ORIGIN`. `*` allows every origin (local dev only).
 */
function parseOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '*';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins();

const config = {
  NODE_ENV,
  isProd,
  PORT: int(process.env.PORT, 4000),
  HOST: process.env.HOST || '0.0.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  ALLOWED_ORIGINS: allowedOrigins,
  JWT_SECRET,
  JWT_TTL_SECONDS: int(process.env.JWT_TTL_SECONDS, 60 * 60 * 24 * 7),
  DATABASE_URL,
  DATABASE_SSL: bool(process.env.DATABASE_SSL, true),
  DATABASE_POOL_MAX: int(process.env.DATABASE_POOL_MAX, 5),
  PGHOST: process.env.PGHOST,
  PGPORT: int(process.env.PGPORT, 5432),
  PGDATABASE: process.env.PGDATABASE,
  PGUSER: process.env.PGUSER,
  PGPASSWORD: process.env.PGPASSWORD,
  SKILLMESH_API_BASE: process.env.SKILLMESH_API_BASE || `http://localhost:${int(process.env.PORT, 4000)}/api`,
  // 100 requests / minute / IP — see utils/router.js rate limiter.
  RATE_LIMIT_PER_MINUTE: int(process.env.RATE_LIMIT_PER_MINUTE, 100),
  // Frontend static assets (served with long-lived cache headers in production).
  STATIC_DIR: process.env.STATIC_DIR || path.join(__dirname, '..', '..', 'frontend'),
  // Daily database snapshot backups.
  BACKUP_DIR: process.env.BACKUP_DIR || path.join(__dirname, '..', 'data', 'backups'),
};

function pgPoolConfig() {
  if (config.DATABASE_URL) {
    return {
      connectionString: config.DATABASE_URL,
      ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
      max: config.DATABASE_POOL_MAX,
    };
  }
  return {
    host: config.PGHOST,
    port: config.PGPORT,
    database: config.PGDATABASE,
    user: config.PGUSER,
    password: config.PGPASSWORD,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    max: config.DATABASE_POOL_MAX,
  };
}

module.exports = { config, pgPoolConfig, loadDotEnv };
