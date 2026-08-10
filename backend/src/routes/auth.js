// Auth — register, login, HttpOnly cookie sessions, refresh-token rotation,
// logout (revocation), and password reset (Phase 1 hardening).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { config } = require('../config');
const {
  hashPassword, verifyPassword, signToken,
  randomToken, sha256Hex, parseCookies,
  ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS,
} = require('../utils/auth');
const { requireAuth } = require('../middleware/requireAuth');
const { validate } = require('../middleware/validate');
const {
  authRegister, authLogin, refreshToken, forgotPassword, resetPassword,
} = require('../validation/schemas');

const router = new Router();
const RESET_TTL_SECONDS = 60 * 60; // 1 hour

function publicUser(u) {
  const { passwordHash, salt, ...rest } = u;
  return rest;
}

function cookieOptions(maxAge) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.isProd,
    maxAge,
  };
}

// Issue an access token + a stored (hashed) refresh token, and set both as
// HttpOnly cookies. The raw refresh token is returned once so a cookie-less
// SPA can still hold it (stored server-side for rotation/revocation).
function issueSession(state, user, res) {
  const accessToken = signToken({ sub: user.id, email: user.email, name: user.name });
  const refreshToken = randomToken(32);
  state.refreshTokens.push({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: sha256Hex(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    revokedAt: null,
  });
  save();
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_SECONDS));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_SECONDS));
  return { accessToken, refreshToken };
}

function findRefreshRecord(state, token) {
  if (!token) return null;
  return state.refreshTokens.find((t) => t.tokenHash === sha256Hex(token));
}

router.post('/register', validate(authRegister), (req, res, next) => {
  try {
    const { name, email, password, location } = req.body;
    const state = getState();
    if (state.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }
    const { salt, hash } = hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: hash,
      salt,
      location: location || null,
      availability: 'available',
      createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    const { accessToken, refreshToken } = issueSession(state, user, res);
    res.status(201).json({ token: accessToken, refreshToken, user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', validate(authLogin), (req, res, next) => {
  try {
    const { email, password } = req.body;
    const state = getState();
    const user = state.users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (!user || !verifyPassword(password || '', user.salt, user.passwordHash)) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }
    const { accessToken, refreshToken } = issueSession(state, user, res);
    res.json({ token: accessToken, refreshToken, user: publicUser(user) });
  } catch (e) { next(e); }
});

// Exchange a valid refresh token for a fresh access token (rotation revokes
// the old one so a leaked refresh token cannot be replayed).
router.post('/refresh', validate(refreshToken), (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers['cookie']);
    const token = (req.body && req.body.refreshToken) || cookies[REFRESH_COOKIE];
    const state = getState();
    const record = findRefreshRecord(state, token);
    if (!record || record.revokedAt || new Date(record.expiresAt) < new Date()) {
      const err = new Error('Refresh token is invalid or expired');
      err.status = 401;
      throw err;
    }
    const user = state.users.find((u) => u.id === record.userId);
    if (!user) {
      const err = new Error('Account not found');
      err.status = 401;
      throw err;
    }
    record.revokedAt = new Date().toISOString();
    const { accessToken, refreshToken } = issueSession(state, user, res);
    res.json({ token: accessToken, refreshToken, user: publicUser(user) });
  } catch (e) { next(e); }
});

// Revoke the presented refresh token and clear session cookies.
router.post('/logout', (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers['cookie']);
    const token = (req.body && req.body.refreshToken) || cookies[REFRESH_COOKIE];
    const state = getState();
    const record = findRefreshRecord(state, token);
    if (record && !record.revokedAt) {
      record.revokedAt = new Date().toISOString();
      save();
    }
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Issue a one-time password-reset token. In non-production environments the
// token is returned in the response so the flow is testable without an email
// provider; production returns a generic message.
router.post('/forgot-password', validate(forgotPassword), (req, res, next) => {
  try {
    const { email } = req.body;
    const state = getState();
    const user = email
      ? state.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())
      : null;
    if (user) {
      const resetToken = randomToken(32);
      state.passwordResetTokens.push({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: sha256Hex(resetToken),
        expiresAt: new Date(Date.now() + RESET_TTL_SECONDS * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        usedAt: null,
      });
      save();
      const body = { message: 'If that email exists, a reset link has been sent.' };
      if (!config.isProd) body.resetToken = resetToken;
      return res.json(body);
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (e) { next(e); }
});

// Redeem a reset token: update the password, invalidate the token, and revoke
// every outstanding refresh session so all devices must re-authenticate.
router.post('/reset-password', validate(resetPassword), (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || String(newPassword).length < 8) {
      const err = new Error('token and a newPassword (min 8 chars) are required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const record = state.passwordResetTokens.find((t) => t.tokenHash === sha256Hex(token));
    if (!record || record.usedAt || new Date(record.expiresAt) < new Date()) {
      const err = new Error('Reset token is invalid or has expired');
      err.status = 400;
      throw err;
    }
    const user = state.users.find((u) => u.id === record.userId);
    if (!user) {
      const err = new Error('Account not found');
      err.status = 400;
      throw err;
    }
    const { salt, hash } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    record.usedAt = new Date().toISOString();
    for (const rt of state.refreshTokens) {
      if (rt.userId === user.id && !rt.revokedAt) {
        rt.revokedAt = new Date().toISOString();
      }
    }
    save();
    res.json({ ok: true, message: 'Password updated. Please log in again.' });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const user = state.users.find((u) => u.id === req.user.id);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    res.json({ user: publicUser(user) });
  } catch (e) { next(e); }
});

module.exports = router;
