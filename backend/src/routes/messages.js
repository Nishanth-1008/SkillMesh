// Communication — messaging, project discussions, notifications, activity feed (Phase 2).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { hasProjectRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { messageCreate } = require('../validation/schemas');
const { notify, logActivity } = require('../services/notify');

const router = new Router();

// Direct messages + project discussion threads
router.get('/inbox', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const msgs = state.messages
      .filter(
        (m) =>
          m.toUserId === req.user.id ||
          m.fromUserId === req.user.id ||
          (m.projectId &&
            state.projectMembers.some(
              (pm) =>
                pm.projectId === m.projectId &&
                pm.userId === req.user.id &&
                pm.status === 'joined'
            ))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100)
      .map((m) => {
        const from = state.users.find((u) => u.id === m.fromUserId);
        const to = m.toUserId ? state.users.find((u) => u.id === m.toUserId) : null;
        return {
          ...m,
          from: from ? { id: from.id, name: from.name } : null,
          to: to ? { id: to.id, name: to.name } : null,
        };
      });
    res.json({ messages: msgs });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, validate(messageCreate), (req, res, next) => {
  try {
    const { toUserId, projectId, body, announcement } = req.body;
    if (!toUserId && !projectId) {
      const err = new Error('Provide toUserId (DM) or projectId (team discussion)');
      err.status = 400;
      throw err;
    }
    const state = getState();

    if (projectId) {
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) {
        const err = new Error('Project not found');
        err.status = 404;
        throw err;
      }
      const member = state.projectMembers.find(
        (m) => m.projectId === projectId && m.userId === req.user.id && m.status === 'joined'
      );
      if (!member) {
        const err = new Error('Join the project before posting');
        err.status = 403;
        throw err;
      }
      if (announcement && !hasProjectRole(state, req.user.id, projectId, ['owner', 'lead'])) {
        const err = new Error('Only owners/leads can post announcements');
        err.status = 403;
        throw err;
      }
    }

    if (toUserId && !state.users.find((u) => u.id === toUserId)) {
      const err = new Error('Recipient not found');
      err.status = 404;
      throw err;
    }

    const msg = {
      id: crypto.randomUUID(),
      fromUserId: req.user.id,
      toUserId: toUserId || null,
      projectId: projectId || null,
      body: body.trim(),
      announcement: !!announcement,
      createdAt: new Date().toISOString(),
    };
    state.messages.push(msg);

    if (toUserId) {
      notify(state, {
        userId: toUserId,
        type: 'message',
        title: `Message from ${req.user.name}`,
        body: body.trim().slice(0, 120),
        link: '#messages',
      });
    } else if (projectId) {
      const project = state.projects.find((p) => p.id === projectId);
      const members = state.projectMembers.filter(
        (m) => m.projectId === projectId && m.status === 'joined' && m.userId !== req.user.id
      );
      for (const m of members) {
        notify(state, {
          userId: m.userId,
          type: announcement ? 'announcement' : 'discussion',
          title: announcement
            ? `Announcement: ${project.title}`
            : `New discussion in ${project.title}`,
          body: body.trim().slice(0, 120),
          link: `#project?id=${projectId}`,
        });
      }
      logActivity(state, {
        communityId: project.communityId,
        actorId: req.user.id,
        type: announcement ? 'announcement' : 'discussion',
        summary: `${req.user.name} ${announcement ? 'announced' : 'posted'} in "${project.title}"`,
      });
    }

    save();
    res.status(201).json({ message: msg });
  } catch (e) { next(e); }
});

router.get('/project/:projectId', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const member = state.projectMembers.find(
      (m) =>
        m.projectId === req.params.projectId &&
        m.userId === req.user.id &&
        m.status === 'joined'
    );
    if (!member) {
      const err = new Error('Join the project to view discussion');
      err.status = 403;
      throw err;
    }
    const msgs = state.messages
      .filter((m) => m.projectId === req.params.projectId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((m) => {
        const from = state.users.find((u) => u.id === m.fromUserId);
        return { ...m, from: from ? { id: from.id, name: from.name } : null };
      });
    res.json({ messages: msgs });
  } catch (e) { next(e); }
});

// Notifications
router.get('/notifications', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const list = state.notifications
      .filter((n) => n.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
    const unread = list.filter((n) => !n.read).length;
    res.json({ notifications: list, unread });
  } catch (e) { next(e); }
});

router.post('/notifications/read', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const { ids, all } = req.body;
    let count = 0;
    for (const n of state.notifications) {
      if (n.userId !== req.user.id || n.read) continue;
      if (all || (ids && ids.includes(n.id))) {
        n.read = true;
        count++;
      }
    }
    save();
    res.json({ marked: count });
  } catch (e) { next(e); }
});

// Activity feed
router.get('/activity', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    let feed = state.activity;
    if (req.query.communityId) {
      feed = feed.filter((a) => a.communityId === req.query.communityId);
    } else if (req.user) {
      // Default: activity from communities the user belongs to
      const myCommunities = new Set(
        state.communityMembers
          .filter((m) => m.userId === req.user.id)
          .map((m) => m.communityId)
      );
      feed = feed.filter((a) => !a.communityId || myCommunities.has(a.communityId));
    }
    feed = feed
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 40)
      .map((a) => {
        const actor = state.users.find((u) => u.id === a.actorId);
        return { ...a, actor: actor ? { id: actor.id, name: actor.name } : null };
      });
    res.json({ activity: feed });
  } catch (e) { next(e); }
});

module.exports = router;
