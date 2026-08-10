// Smart Recommendations API (Phase 2).

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { validate } = require('../middleware/validate');
const { feedbackCreate } = require('../validation/schemas');
const { understandQuery } = require('../services/llm');
const {
  recommendMentors,
  recommendVolunteers,
  recommendExperts,
  similarPeople,
  relatedSkills,
  nearbyContributors,
  recommendAll,
} = require('../services/recommendations');

const router = new Router();

router.get('/', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const skills = req.query.skills
      ? String(req.query.skills).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const opts = {
      userId: req.user ? req.user.id : req.query.userId,
      viewerId: req.user ? req.user.id : undefined,
      communityId: req.query.communityId,
      skills,
      skill: req.query.skill,
      limit: Number(req.query.limit) || 8,
    };
    res.json(recommendAll(state, opts));
  } catch (e) { next(e); }
});

router.get('/mentors', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    res.json({
      mentors: recommendMentors(state, {
        userId: req.user ? req.user.id : req.query.userId,
        viewerId: req.user ? req.user.id : undefined,
        communityId: req.query.communityId,
      }),
    });
  } catch (e) { next(e); }
});

router.get('/volunteers', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const skills = req.query.skills
      ? String(req.query.skills).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    res.json({
      volunteers: recommendVolunteers(state, {
        skills,
        viewerId: req.user ? req.user.id : undefined,
        communityId: req.query.communityId,
      }),
    });
  } catch (e) { next(e); }
});

router.get('/experts', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const skills = req.query.skills
      ? String(req.query.skills).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    res.json({
      experts: recommendExperts(state, {
        skills,
        viewerId: req.user ? req.user.id : undefined,
        communityId: req.query.communityId,
      }),
    });
  } catch (e) { next(e); }
});

router.get('/similar', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    res.json({
      similar: similarPeople(state, {
        userId: req.user.id,
        viewerId: req.user.id,
        communityId: req.query.communityId,
      }),
    });
  } catch (e) { next(e); }
});

router.get('/nearby', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    res.json({
      nearby: nearbyContributors(state, {
        userId: req.user.id,
        viewerId: req.user.id,
        communityId: req.query.communityId,
      }),
    });
  } catch (e) { next(e); }
});

router.get('/related-skills', (req, res, next) => {
  try {
    const state = getState();
    if (!req.query.skill) {
      const err = new Error('skill query param is required');
      err.status = 400;
      throw err;
    }
    res.json({ related: relatedSkills(state, { skill: req.query.skill }) });
  } catch (e) { next(e); }
});

// Natural-language recommendation shortcut
router.post('/ask', optionalAuth, async (req, res, next) => {
  try {
    const { query, communityId } = req.body;
    if (!query) {
      const err = new Error('query is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const understanding = await understandQuery(query);
    const opts = {
      userId: req.user ? req.user.id : undefined,
      viewerId: req.user ? req.user.id : undefined,
      communityId,
      skills: understanding.skills,
      limit: 8,
    };

    let primary = [];
    if (understanding.intent === 'volunteer') {
      primary = recommendVolunteers(state, opts);
    } else if (understanding.skills.some((s) => s.includes('teach') || s === 'teaching')) {
      primary = recommendMentors(state, opts);
    } else {
      primary = recommendExperts(state, opts);
    }

    res.json({
      query,
      understanding,
      recommendations: primary,
      all: recommendAll(state, opts),
    });
  } catch (e) { next(e); }
});

// Record feedback on a recommendation (up/down). Upsert per (user, target, context)
router.post('/feedback', requireAuth, validate(feedbackCreate), (req, res, next) => {
  try {
    const { targetType, targetId, rating, context } = req.body;
    const state = getState();

    const existing = state.feedback.find(
      (f) =>
        f.userId === req.user.id &&
        f.targetType === targetType &&
        f.targetId === targetId &&
        f.context === (context || '')
    );

    if (existing) {
      existing.rating = rating;
    } else {
      state.feedback.push({
        id: crypto.randomUUID(),
        userId: req.user.id,
        targetType,
        targetId,
        rating,
        context: context || '',
        createdAt: new Date().toISOString(),
      });
    }

    save();
    res.json({ ok: true, rating, targetType, targetId });
  } catch (e) { next(e); }
});

// The viewer's own feedback (optionally filtered by targetType)
router.get('/feedback', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    let list = state.feedback.filter((f) => f.userId === req.user.id);
    if (req.query.targetType) {
      list = list.filter((f) => f.targetType === req.query.targetType);
    }
    res.json({ feedback: list });
  } catch (e) { next(e); }
});

module.exports = router;
