// Password hashing + JWT-lite, implemented with Node's built-in `crypto`
// module only (no bcryptjs/jsonwebtoken — this sandbox has no npm registry
// access). Algorithms are industry-standard (scrypt, HMAC-SHA256); only the
// packaging is homegrown. Swappable for bcryptjs/jsonwebtoken later without
// touching call sites.

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'skillmesh-dev-secret-change-me';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(hash));
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf-8');
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const body = { ...payload, exp };
  const encHeader = base64url(JSON.stringify(header));
  const encBody = base64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${encHeader}.${encBody}`).digest();
  const encSig = base64url(sig);
  return `${encHeader}.${encBody}.${encSig}`;
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

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
