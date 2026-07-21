// Smart Recommendations API (Phase 2).

const { Router } = require('../utils/router');
const { getState } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const { extractSkills } = require('../nlp/skillExtractor');
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
router.post('/ask', optionalAuth, (req, res, next) => {
  try {
    const { query, communityId } = req.body;
    if (!query) {
      const err = new Error('query is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const understanding = extractSkills(query);
    const opts = {
      userId: req.user ? req.user.id : undefined,
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

module.exports = router;
