const { verifyToken } = require('../utils/auth');

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (!payload) {
    const err = new Error('Unauthorized — missing or invalid token');
    err.status = 401;
    return next(err);
  }
  req.user = { id: payload.sub, email: payload.email, name: payload.name };
  next();
}

// Like requireAuth but doesn't fail if there's no token — useful for routes
// that personalize results when logged in but still work anonymously.
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (payload) req.user = { id: payload.sub, email: payload.email, name: payload.name };
  next();
}

module.exports = { requireAuth, optionalAuth };
