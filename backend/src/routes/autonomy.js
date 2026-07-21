// Phase 6 — Autonomous agents, digital twin, collective intelligence

const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const {
  AGENT_TYPES,
  ensureAgents,
  runAgent,
  runAllAgents,
  buildDigitalTwin,
  addCommunityMemory,
  collectiveBrainstorm,
  autoFormTeams,
} = require('../services/autonomy');

const router = new Router();

router.get('/agents/:communityId', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const agents = ensureAgents(state, req.params.communityId);
    save();
    res.json({ agents, types: AGENT_TYPES });
  } catch (e) { next(e); }
});

router.post('/agents/:communityId/run', requireAuth, (req, res, next) => {
  try {
    const { type, input } = req.body;
    const state = getState();
    const agents = ensureAgents(state, req.params.communityId);
    const agent = type
      ? agents.find((a) => a.type === type)
      : null;

    const payload = {
      ...(input || {}),
      ownerId: req.user.id,
      creatorId: req.user.id,
    };

    if (agent) {
      const result = runAgent(state, agent, payload);
      save();
      return res.json(result);
    }

    const results = runAllAgents(state, req.params.communityId, payload);
    save();
    res.json({ results, count: results.length });
  } catch (e) { next(e); }
});

router.get('/agents/:communityId/runs', (req, res, next) => {
  try {
    const state = getState();
    const agentIds = new Set(
      state.agents.filter((a) => a.communityId === req.params.communityId).map((a) => a.id)
    );
    const runs = state.agentRuns
      .filter((r) => agentIds.has(r.agentId))
      .slice(-30)
      .reverse();
    res.json({ runs });
  } catch (e) { next(e); }
});

router.get('/twin/:communityId', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    const twin = buildDigitalTwin(state, req.params.communityId);
    if (!twin) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }
    save();
    res.json({ twin });
  } catch (e) { next(e); }
});

router.get('/memory/:communityId', (req, res, next) => {
  try {
    const memory = getState().communityMemory
      .filter((m) => m.communityId === req.params.communityId)
      .slice(-40)
      .reverse();
    res.json({ memory });
  } catch (e) { next(e); }
});

router.post('/memory/:communityId', requireAuth, (req, res, next) => {
  try {
    const { kind, content, tags } = req.body;
    if (!content) {
      const err = new Error('content is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const entry = addCommunityMemory(state, {
      communityId: req.params.communityId,
      kind,
      content,
      tags,
    });
    save();
    res.status(201).json({ entry });
  } catch (e) { next(e); }
});

router.post('/brainstorm/:communityId', requireAuth, (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      const err = new Error('prompt is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const result = collectiveBrainstorm(state, {
      communityId: req.params.communityId,
      prompt,
    });
    save();
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/auto-teams/:communityId', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const result = autoFormTeams(state, req.params.communityId, req.user.id);
    save();
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/tasks/:communityId', (req, res, next) => {
  try {
    const tasks = getState().autonomousTasks
      .filter((t) => t.communityId === req.params.communityId)
      .slice(-20)
      .reverse();
    res.json({ tasks });
  } catch (e) { next(e); }
});

// Community Operating System — one-shot governance pulse
router.post('/os/:communityId/pulse', requireAuth, (req, res, next) => {
  try {
    const state = getState();
    const twin = buildDigitalTwin(state, req.params.communityId);
    const agentResults = runAllAgents(state, req.params.communityId, {
      ownerId: req.user.id,
      creatorId: req.user.id,
      goal: req.body.goal || 'Strengthen community collaboration this week',
    });
    const teams = autoFormTeams(state, req.params.communityId, req.user.id);
    addCommunityMemory(state, {
      communityId: req.params.communityId,
      kind: 'os_pulse',
      content: `OS pulse: twin health ${twin.snapshot.health.healthIndex}, agents ${agentResults.length}, auto-teams ${teams.count}`,
      tags: ['os', 'autonomous'],
    });
    save();
    res.json({
      twin: { healthIndex: twin.snapshot.health.healthIndex, updatedAt: twin.updatedAt },
      agents: agentResults.map((r) => ({ type: r.agent.type, summary: r.output.summary })),
      autoTeams: teams,
      message: 'Community Operating System pulse complete.',
    });
  } catch (e) { next(e); }
});

module.exports = router;
