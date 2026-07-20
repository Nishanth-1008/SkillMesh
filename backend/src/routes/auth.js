const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../utils/auth');
const { requireAuth } = require('../middleware/requireAuth');

const router = new Router();

function publicUser(u) {
  const { passwordHash, salt, ...rest } = u;
  return rest;
}

router.post('/register', (req, res, next) => {
  try {
    const { name, email, password, location } = req.body;
    if (!name || !email || !password) {
      const err = new Error('name, email and password are required');
      err.status = 400;
      throw err;
    }
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
    save();

    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;
    const state = getState();
    const user = state.users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (!user || !verifyPassword(password || '', user.salt, user.passwordHash)) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }
    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    res.json({ token, user: publicUser(user) });
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
