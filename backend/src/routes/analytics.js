// Phase 3 — Analytics, skill intelligence, predictions, insights

const { Router } = require('../utils/router');
const { getState } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const {
  communityDashboard,
  communityHealth,
  skillGaps,
  predictNeeds,
  organizationInsights,
  personalizedInsights,
} = require('../services/analytics');

const router = new Router();

router.get('/community/:id', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const dash = communityDashboard(state, req.params.id);
    if (!dash) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    res.json(dash);
  } catch (e) { next(e); }
});

router.get('/community/:id/health', (req, res, next) => {
  try {
    const state = getState();
    if (!state.communities.find((c) => c.id === req.params.id)) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    res.json(communityHealth(state, req.params.id));
  } catch (e) { next(e); }
});

router.get('/community/:id/skills', (req, res, next) => {
  try {
    res.json(skillGaps(getState(), req.params.id));
  } catch (e) { next(e); }
});

router.get('/community/:id/predict', (req, res, next) => {
  try {
    res.json(predictNeeds(getState(), req.params.id));
  } catch (e) { next(e); }
});

router.get('/organization/:id', (req, res, next) => {
  try {
    const insights = organizationInsights(getState(), req.params.id);
    if (!insights) {
      const err = new Error('Organization not found');
      err.status = 404;
      throw err;
    }
    res.json(insights);
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    res.json(personalizedInsights(getState(), req.user.id));
  } catch (e) { next(e); }
});

module.exports = router;
