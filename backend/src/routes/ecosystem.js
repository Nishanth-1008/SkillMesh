// Phase 4 — Federation, public hub, emergency, integrations, open platform

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const {
  discoverSharedTalent,
  publicCommunityProfile,
  createEmergency,
} = require('../services/ecosystem');
const { notify, logActivity } = require('../services/notify');
const { grantAchievement } = require('../services/gamification');
const { extractSkills } = require('../nlp/skillExtractor');

const router = new Router();

// ---- Public hub ----
router.get('/hub', (req, res, next) => {
  try {
    const state = getState();
    const directory = state.communities.map((c) => publicCommunityProfile(state, c.id));
    res.json({
      directory,
      openOpportunities: state.opportunities
        .filter((o) => o.status === 'open')
        .slice(0, 20)
        .map((o) => ({ id: o.id, title: o.title, type: o.type, communityId: o.communityId })),
      showcases: directory.filter(Boolean).slice(0, 10),
    });
  } catch (e) { next(e); }
});

router.get('/hub/:communityId', (req, res, next) => {
  try {
    const profile = publicCommunityProfile(getState(), req.params.communityId);
    if (!profile) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    res.json({ profile });
  } catch (e) { next(e); }
});

// ---- Federation / partnerships ----
router.get('/partnerships', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    let list = state.partnerships;
    if (req.query.communityId) {
      list = list.filter(
        (p) => p.fromCommunityId === req.query.communityId || p.toCommunityId === req.query.communityId
      );
    }
    res.json({ partnerships: list, federations: state.federationLinks });
  } catch (e) { next(e); }
});

router.post('/partnerships', requireAuth, (req, res, next) => {
  try {
    const { fromCommunityId, toCommunityId, type } = req.body;
    if (!fromCommunityId || !toCommunityId) {
      const err = new Error('fromCommunityId and toCommunityId are required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const from = state.communities.find((c) => c.id === fromCommunityId);
    if (!from || from.ownerId !== req.user.id) {
      const err = new Error('Only the source community owner can propose a partnership');
      err.status = 403;
      throw err;
    }
    const partnership = {
      id: crypto.randomUUID(),
      fromCommunityId,
      toCommunityId,
      type: type || 'collaboration',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    state.partnerships.push(partnership);
    const to = state.communities.find((c) => c.id === toCommunityId);
    if (to) {
      notify(state, {
        userId: to.ownerId,
        type: 'partnership',
        title: `Partnership proposed by ${from.name}`,
        body: type || 'collaboration',
        link: '#hub',
      });
    }
    save();
    res.status(201).json({ partnership });
  } catch (e) { next(e); }
});

router.post('/partnerships/:id/accept', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const p = state.partnerships.find((x) => x.id === req.params.id);
    if (!p) {
      const err = new Error('Partnership not found');
      err.status = 404;
      throw err;
    }
    const to = state.communities.find((c) => c.id === p.toCommunityId);
    if (!to || to.ownerId !== req.user.id) {
      const err = new Error('Only the target community owner can accept');
      err.status = 403;
      throw err;
    }
    p.status = 'active';
    grantAchievement(state, req.user.id, 'bridge_builder');
    const from = state.communities.find((c) => c.id === p.fromCommunityId);
    if (from) grantAchievement(state, from.ownerId, 'bridge_builder');

    // Create federation link if none
    const existing = state.federationLinks.find(
      (f) => f.communityIds.includes(p.fromCommunityId) && f.communityIds.includes(p.toCommunityId)
    );
    if (!existing) {
      state.federationLinks.push({
        id: crypto.randomUUID(),
        communityIds: [p.fromCommunityId, p.toCommunityId],
        name: `${from ? from.name : 'A'} × ${to.name}`,
        region: 'local',
        createdAt: new Date().toISOString(),
      });
    }
    save();
    res.json({ partnership: p });
  } catch (e) { next(e); }
});

router.get('/shared-talent', (req, res, next) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) {
      const err = new Error('Query params a and b (community ids) are required');
      err.status = 400;
      throw err;
    }
    res.json({ talent: discoverSharedTalent(getState(), a, b) });
  } catch (e) { next(e); }
});

// ---- Emergency ----
router.get('/emergencies', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    let list = state.emergencies;
    if (req.query.communityId) list = list.filter((e) => e.communityId === req.query.communityId);
    if (req.query.status) list = list.filter((e) => e.status === req.query.status);
    res.json({ emergencies: list });
  } catch (e) { next(e); }
});

router.post('/emergencies', requireAuth, (req, res, next) => {
  try {
    const { communityId, title, severity, skillsNeeded, location } = req.body;
    if (!communityId || !title) {
      const err = new Error('communityId and title are required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const skills = skillsNeeded && skillsNeeded.length
      ? skillsNeeded
      : extractSkills(title).skills;
    const result = createEmergency(state, {
      communityId, title, severity, skillsNeeded: skills, location, creatorId: req.user.id,
    });
    // Alert top responders
    for (const r of result.recommendedResponders.slice(0, 5)) {
      notify(state, {
        userId: r.user.id,
        type: 'emergency',
        title: `EMERGENCY: ${title}`,
        body: `Matched skills: ${r.matchedSkills.join(', ')}. ETA ~${r.etaMinutes}m.`,
        link: `#emergency?id=${result.emergency.id}`,
      });
    }
    logActivity(state, {
      communityId, actorId: req.user.id, type: 'emergency',
      summary: `Emergency opened: "${title}" (${severity || 'high'})`,
    });
    save();
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.post('/emergencies/:id/respond', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const emergency = state.emergencies.find((e) => e.id === req.params.id);
    if (!emergency) {
      const err = new Error('Emergency not found');
      err.status = 404;
      throw err;
    }
    const response = {
      id: crypto.randomUUID(),
      emergencyId: emergency.id,
      userId: req.user.id,
      status: 'en_route',
      eta: req.body.eta || 20,
      createdAt: new Date().toISOString(),
    };
    state.emergencyResponses.push(response);
    grantAchievement(state, req.user.id, 'emergency_responder');
    notify(state, {
      userId: emergency.creatorId,
      type: 'emergency',
      title: `${req.user.name} is responding`,
      body: `ETA ${response.eta} minutes`,
      link: `#emergency?id=${emergency.id}`,
    });
    save();
    res.status(201).json({ response });
  } catch (e) { next(e); }
});

router.post('/emergencies/:id/resolve', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const emergency = state.emergencies.find((e) => e.id === req.params.id);
    if (!emergency) {
      const err = new Error('Emergency not found');
      err.status = 404;
      throw err;
    }
    if (emergency.creatorId !== req.user.id) {
      const err = new Error('Only the reporter can resolve');
      err.status = 403;
      throw err;
    }
    emergency.status = 'resolved';
    emergency.resolvedAt = new Date().toISOString();
    save();
    res.json({ emergency });
  } catch (e) { next(e); }
});

// ---- Integrations (stubs that record config — no external calls) ----
router.get('/integrations', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    res.json({
      integrations: state.integrations.filter(
        (i) => i.userId === req.user.id || i.communityId
      ),
      available: [
        { provider: 'google_calendar', status: 'stub' },
        { provider: 'google_maps', status: 'stub' },
        { provider: 'email', status: 'stub' },
        { provider: 'social_login', status: 'stub' },
        { provider: 'file_storage', status: 'stub' },
      ],
    });
  } catch (e) { next(e); }
});

router.post('/integrations', requireAuth, (req, res, next) => {
  try {
    const { provider, config, communityId } = req.body;
    if (!provider) {
      const err = new Error('provider is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const row = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      communityId: communityId || null,
      provider,
      config: config || {},
      status: 'connected_stub',
      createdAt: new Date().toISOString(),
    };
    state.integrations.push(row);
    save();
    res.status(201).json({
      integration: row,
      note: 'External API calls are stubbed in this offline build; config is stored for later wiring.',
    });
  } catch (e) { next(e); }
});

// ---- Open platform: API keys, webhooks, plugins ----
router.post('/api-keys', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const key = `sm_demo_${crypto.randomBytes(24).toString('hex')}`;
    const row = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      key,
      name: req.body.name || 'default',
      scopes: req.body.scopes || ['read', 'search'],
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    state.apiKeys.push(row);
    save();
    res.status(201).json({ apiKey: row });
  } catch (e) { next(e); }
});

router.get('/api-keys', requireAuth, (req, res, next) => {
  try {
    const keys = getState().apiKeys
      .filter((k) => k.userId === req.user.id)
      .map((k) => ({ ...k, key: k.key.slice(0, 12) + '…' }));
    res.json({ apiKeys: keys });
  } catch (e) { next(e); }
});

router.post('/webhooks', requireAuth, (req, res, next) => {
  try {
    const { url, events } = req.body;
    if (!url) {
      const err = new Error('url is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const wh = {
      id: crypto.randomUUID(),
      ownerId: req.user.id,
      url,
      events: events || ['project.created', 'emergency.opened', 'opportunity.posted'],
      secret: crypto.randomBytes(16).toString('hex'),
      active: true,
      createdAt: new Date().toISOString(),
    };
    state.webhooks.push(wh);
    save();
    res.status(201).json({ webhook: wh });
  } catch (e) { next(e); }
});

router.post('/webhooks/test', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const mine = state.webhooks.filter((w) => w.ownerId === req.user.id && w.active);
    const deliveries = [];
    for (const wh of mine) {
      const delivery = {
        id: crypto.randomUUID(),
        webhookId: wh.id,
        event: 'test.ping',
        payload: { ok: true, at: new Date().toISOString() },
        status: 'recorded_stub', // would POST to wh.url in production
        createdAt: new Date().toISOString(),
      };
      state.webhookDeliveries.push(delivery);
      deliveries.push(delivery);
    }
    save();
    res.json({ deliveries, note: 'Deliveries recorded locally; outbound HTTP is stubbed.' });
  } catch (e) { next(e); }
});

router.get('/plugins', (req, res, next) => {
  try {
    res.json({
      installed: getState().plugins,
      marketplace: [
        { name: 'slack-notify', version: '1.0.0', description: 'Post SkillMesh events to Slack' },
        { name: 'csv-export', version: '1.0.0', description: 'Export community analytics as CSV' },
        { name: 'custom-ranking', version: '0.9.0', description: 'Custom AI ranking weights' },
      ],
    });
  } catch (e) { next(e); }
});

router.post('/plugins', requireAuth, (req, res, next) => {
  try {
    const { name, version, config } = req.body;
    if (!name) {
      const err = new Error('name is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const plugin = {
      id: crypto.randomUUID(),
      name,
      version: version || '1.0.0',
      enabled: true,
      config: config || {},
      installedAt: new Date().toISOString(),
      installedBy: req.user.id,
    };
    state.plugins.push(plugin);
    save();
    res.status(201).json({ plugin });
  } catch (e) { next(e); }
});

module.exports = router;
