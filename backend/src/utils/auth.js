// Password hashing + JWT-lite, implemented with Node's built-in `crypto`
// module only (no bcryptjs/jsonwebtoken — this sandbox has no npm registry
// access). Algorithms are industry-standard (scrypt, HMAC-SHA256); only the
// packaging is homegrown. Swappable for bcryptjs/jsonwebtoken later without
// touching call sites.

const crypto = require('crypto');
const { config } = require('../config');

const JWT_SECRET = config.JWT_SECRET;
const TOKEN_TTL_SECONDS = config.JWT_TTL_SECONDS;
const ACCESS_TTL_SECONDS = config.JWT_ACCESS_TTL_SECONDS;
const REFRESH_TTL_SECONDS = config.JWT_REFRESH_TTL_SECONDS;

const ACCESS_COOKIE = 'skillmesh_at';
const REFRESH_COOKIE = 'skillmesh_rt';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(hash));
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf-8');
}

// Sign a JWT. Access tokens carry no `tokenType`; refresh tokens set
// `tokenType: 'refresh'` so requireAuth can refuse to accept them as access.
function signToken(payload, ttlSeconds = ACCESS_TTL_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = { ...payload, exp };
  const encHeader = base64url(JSON.stringify(header));
  const encBody = base64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${encHeader}.${encBody}`).digest();
  const encSig = base64url(sig);
  return `${encHeader}.${encBody}.${encSig}`;
}

function signRefreshToken(user) {
  return signToken(
    { sub: user.id, email: user.email, name: user.name, tokenType: 'refresh' },
    REFRESH_TTL_SECONDS
  );
}

function verifyToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  const [encHeader, encBody, encSig] = parts;
  const expectedSig = base64url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${encHeader}.${encBody}`).digest()
  );
  if (expectedSig !== encSig) return null;
  let body;
  try {
    body = JSON.parse(base64urlDecode(encBody));
  } catch {
    return null;
  }
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}

module.exports = {
  hashPassword, verifyPassword, signToken, verifyToken, signRefreshToken,
  randomToken, sha256Hex, parseCookies,
  ACCESS_COOKIE, REFRESH_COOKIE,
  ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS,
};
