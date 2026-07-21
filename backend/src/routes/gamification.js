// Phase 3 — Gamification + Admin tools

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const {
  leaderboard,
  milestones,
  evaluateAchievements,
  ensurePoints,
  ACHIEVEMENT_DEFS,
} = require('../services/gamification');

const router = new Router();

router.get('/leaderboard', optionalAuth, (req, res, next) => {
  try {
    res.json({
      leaderboard: leaderboard(getState(), {
        communityId: req.query.communityId,
        limit: Number(req.query.limit) || 15,
      }),
    });
  } catch (e) { next(e); }
});

router.get('/milestones/:communityId', (req, res, next) => {
  try {
    res.json({ milestones: milestones(getState(), req.params.communityId) });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    evaluateAchievements(state, req.user.id);
    save();
    res.json({
      points: ensurePoints(state, req.user.id),
      achievements: state.achievements.filter((a) => a.userId === req.user.id),
      catalog: ACHIEVEMENT_DEFS,
    });
  } catch (e) { next(e); }
});

// ---- Admin ----
router.get('/admin/users', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    // Simple admin: community owners can manage
    const owned = state.communities.filter((c) => c.ownerId === req.user.id);
    if (!owned.length) {
      const err = new Error('Admin access requires owning a community');
      err.status = 403;
      throw err;
    }
    const memberIds = new Set(
      state.communityMembers
        .filter((m) => owned.some((c) => c.id === m.communityId))
        .map((m) => m.userId)
    );
    const users = state.users
      .filter((u) => memberIds.has(u.id))
      .map(({ passwordHash, salt, ...u }) => u);
    res.json({ users, communities: owned.map((c) => ({ id: c.id, name: c.name })) });
  } catch (e) { next(e); }
});

router.get('/admin/audit', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const owned = state.communities.some((c) => c.ownerId === req.user.id);
    if (!owned) {
      const err = new Error('Admin access required');
      err.status = 403;
      throw err;
    }
    res.json({
      auditLogs: state.auditLogs.slice(-50).reverse(),
      moderationLogs: state.moderationLogs.slice(-50).reverse(),
      reports: state.reports.slice(-50).reverse(),
    });
  } catch (e) { next(e); }
});

router.post('/admin/moderate', requireAuth, (req, res, next) => {
  try {
    const { targetType, targetId, action, reason } = req.body;
    if (!targetType || !targetId || !action) {
      const err = new Error('targetType, targetId, and action are required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    if (!state.communities.some((c) => c.ownerId === req.user.id)) {
      const err = new Error('Admin access required');
      err.status = 403;
      throw err;
    }
    const log = {
      id: crypto.randomUUID(),
      actorId: req.user.id,
      targetType,
      targetId,
      action,
      reason: reason || '',
      createdAt: new Date().toISOString(),
    };
    state.moderationLogs.push(log);
    state.auditLogs.push({
      id: crypto.randomUUID(),
      actorId: req.user.id,
      action: `moderate:${action}`,
      meta: { targetType, targetId, reason },
      createdAt: new Date().toISOString(),
    });

    // Soft actions
    if (action === 'close_opportunity') {
      const opp = state.opportunities.find((o) => o.id === targetId);
      if (opp) opp.status = 'closed';
    }
    if (action === 'archive_project') {
      const p = state.projects.find((x) => x.id === targetId);
      if (p) p.status = 'archived';
    }
    save();
    res.status(201).json({ log });
  } catch (e) { next(e); }
});

router.post('/admin/report', requireAuth, (req, res, next) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      const err = new Error('targetType, targetId, and reason are required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const report = {
      id: crypto.randomUUID(),
      reporterId: req.user.id,
      targetType,
      targetId,
      reason,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    state.reports.push(report);
    save();
    res.status(201).json({ report });
  } catch (e) { next(e); }
});

module.exports = router;
