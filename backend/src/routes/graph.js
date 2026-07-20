const { Router } = require('../utils/router');
const { getState } = require('../db');
const { buildGraph } = require('../graph/relationships');

const router = new Router();

router.get('/', (req, res, next) => {
  try {
    const state = getState();
    const communityId = req.query.communityId || undefined;
    res.json(buildGraph(state, { communityId }));
  } catch (e) { next(e); }
});

module.exports = router;
