const { verifyToken, parseCookies, ACCESS_COOKIE } = require('../utils/auth');

// Read the access token from the Authorization header or the HttpOnly cookie.
function readAccessToken(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  const cookies = parseCookies(req.headers['cookie']);
  return cookies[ACCESS_COOKIE] || null;
}

function requireAuth(req, res, next) {
  const token = readAccessToken(req);
  const payload = token && verifyToken(token);
  if (!payload || payload.tokenType === 'refresh' || !payload.sub) {
    const err = new Error('Unauthorized — missing or invalid token');
    err.status = 401;
    return next(err);
  }
  req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  next();
}

// Like requireAuth but doesn't fail if there's no token — useful for routes
// that personalize results when logged in but still work anonymously.
function optionalAuth(req, res, next) {
  const token = readAccessToken(req);
  const payload = token && verifyToken(token);
  if (payload && payload.tokenType !== 'refresh' && payload.sub) {
    req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  }
  next();
}

module.exports = { requireAuth, optionalAuth, readAccessToken };
