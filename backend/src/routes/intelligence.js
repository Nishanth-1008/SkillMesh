// Phase 5 — Global intelligence, identity, impact, scenarios, research

const crypto = require('crypto');
const { Router } = require('../utils/router');
const { getState, save } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');
const {
  syncPassport,
  recordImpact,
  impactReport,
  runScenario,
  publicCommunityProfile,
  discoverSharedTalent,
} = require('../services/ecosystem');
const { buildGraph } = require('../graph/relationships');
const { extractSkills } = require('../nlp/skillExtractor');
const { buildTeam, findHiddenExperts } = require('../services/teamBuilder');
const { predictNeeds, communityHealth } = require('../services/analytics');

const router = new Router();

// Global knowledge network overview
router.get('/network', (req, res, next) => {
  try {
    const state = getState();
    const communities = state.communities.map((c) => ({
      ...publicCommunityProfile(state, c.id),
      health: communityHealth(state, c.id).healthIndex,
    }));
    const federations = state.federationLinks;
    const graph = buildGraph(state);

    // Cross-border / regional grouping by location tokens
    const regions = {};
    for (const u of state.users) {
      const region = (u.location || 'Unknown').split(/\s+/)[0];
      if (!regions[region]) regions[region] = { region, people: 0, skills: new Set() };
      regions[region].people++;
    }

    res.json({
      communities,
      federations,
      graphStats: { nodes: graph.nodes.length, edges: graph.edges.length },
      regions: Object.values(regions).map((r) => ({ region: r.region, people: r.people })),
      mentorshipEdges: state.relationships.filter((r) => r.kind === 'collaborated').length,
    });
  } catch (e) { next(e); }
});

// AI Reasoning Engine — multi-step explainable plan
router.post('/reason', optionalAuth, (req, res, next) => {
  try {
    const { query, communityId } = req.body;
    if (!query) {
      const err = new Error('query is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const understanding = extractSkills(query);
    const steps = [];

    steps.push({ step: 1, name: 'intent_detection', result: understanding });

    let agents = [];
    if (understanding.intent === 'build_team') {
      agents.push('team_builder');
      const team = buildTeam(state, { skills: understanding.skills, communityId, size: 4 });
      steps.push({ step: 2, name: 'team_assembly', result: team });
    } else if (understanding.intent === 'emergency') {
      agents.push('emergency_response');
      steps.push({
        step: 2,
        name: 'emergency_triage',
        result: { severity: 'high', skills: understanding.skills },
      });
    } else if (understanding.intent === 'volunteer') {
      agents.push('volunteer');
    } else {
      agents.push('mentor', 'community_manager');
    }

    const hidden = findHiddenExperts(state, {
      skills: understanding.skills,
      communityId,
      limit: 5,
    });
    steps.push({ step: steps.length + 1, name: 'hidden_expert_discovery', result: { count: hidden.length, experts: hidden } });

    if (communityId) {
      const preds = predictNeeds(state, communityId);
      steps.push({
        step: steps.length + 1,
        name: 'context_aware_community_state',
        result: {
          risks: preds.risks,
          gaps: preds.skillGaps.slice(0, 3),
          leaders: preds.emergingLeaders.slice(0, 3),
        },
      });
    }

    const recommendation = {
      agentsInvoked: agents,
      primaryAction:
        understanding.intent === 'build_team' ? 'Review assembled team and confirm invites'
          : understanding.intent === 'emergency' ? 'Open emergency incident and alert responders'
            : 'Review ranked people and hidden experts',
      explainability: steps.map((s) => s.name),
    };
    steps.push({ step: steps.length + 1, name: 'recommendation', result: recommendation });

    res.json({
      query,
      agents,
      steps,
      recommendation,
      continuousLearning: {
        note: 'Feedback on accepted recommendations would retrain ranking weights in a production LLM setup.',
      },
    });
  } catch (e) { next(e); }
});

// Predictive intelligence
router.get('/forecast/:communityId', (req, res, next) => {
  try {
    const state = getState();
    const preds = predictNeeds(state, req.params.communityId);
    const health = communityHealth(state, req.params.communityId);
    res.json({
      communityId: req.params.communityId,
      skillDemand: preds.highDemand,
      volunteerForecast: preds.volunteerDemand,
      collaborationSuccess: preds.projectPredictions,
      crisisRisk: preds.risks,
      healthTrend: {
        current: health.healthIndex,
        outlook: health.healthIndex >= 70 ? 'stable_positive' : health.healthIndex >= 45 ? 'watch' : 'needs_attention',
      },
      workforce: {
        availableRatio: health.metrics.members
          ? Math.round((health.metrics.available / health.metrics.members) * 100)
          : 0,
        uniqueSkills: health.metrics.uniqueSkills,
      },
    });
  } catch (e) { next(e); }
});

// Digital identity / skill passport
router.get('/passport/:userId', optionalAuth, (req, res, next) => {
  try {
    const state = getState();
    if (!state.users.find((u) => u.id === req.params.userId)) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    const result = syncPassport(state, req.params.userId);
    save();
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/passport/sync', requireAuth, (req, res, next) => {
  try {
    const result = syncPassport(getState(), req.user.id);
    save();
    res.json(result);
  } catch (e) { next(e); }
});

// Impact / SDG
router.get('/impact', optionalAuth, (req, res, next) => {
  try {
    res.json(impactReport(getState(), { communityId: req.query.communityId }));
  } catch (e) { next(e); }
});

router.post('/impact', requireAuth, (req, res, next) => {
  try {
    const { communityId, projectId, metric, value, unit, tags } = req.body;
    if (!metric) {
      const err = new Error('metric is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const record = recordImpact(state, {
      communityId, projectId, userId: req.user.id, metric, value, unit, tags,
    });
    save();
    res.status(201).json({ record, report: impactReport(state, { communityId }) });
  } catch (e) { next(e); }
});

// Scenarios / digital twin planning input
router.post('/scenarios', requireAuth, (req, res, next) => {
  try {
    const { communityId, name, assumptions } = req.body;
    if (!communityId) {
      const err = new Error('communityId is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    const scenario = runScenario(state, { communityId, name, assumptions });
    save();
    res.status(201).json({ scenario });
  } catch (e) { next(e); }
});

router.get('/scenarios', (req, res, next) => {
  try {
    let list = getState().scenarios;
    if (req.query.communityId) list = list.filter((s) => s.communityId === req.query.communityId);
    res.json({ scenarios: list.slice(-20).reverse() });
  } catch (e) { next(e); }
});

// Research hub / open datasets
router.get('/research', (req, res, next) => {
  try {
    const state = getState();
    res.json({
      datasets: state.researchDatasets,
      suggested: [
        { title: 'Community skill distributions', description: 'Anonymized skill counts per community' },
        { title: 'Volunteer fill rates', description: 'Opportunity application outcomes' },
        { title: 'Collaboration success labels', description: 'Project outcomes vs predicted success' },
      ],
    });
  } catch (e) { next(e); }
});

router.post('/research', requireAuth, (req, res, next) => {
  try {
    const { title, description, open } = req.body;
    if (!title) {
      const err = new Error('title is required');
      err.status = 400;
      throw err;
    }
    const state = getState();
    // Snapshot anonymized skill distribution as a sample open dataset
    const records = state.skills.map((sk) => ({
      skill: sk.name,
      holders: state.userSkills.filter((us) => us.skillId === sk.id).length,
    }));
    const ds = {
      id: crypto.randomUUID(),
      title,
      description: description || '',
      open: open !== false,
      records,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
    };
    state.researchDatasets.push(ds);
    save();
    res.status(201).json({ dataset: ds });
  } catch (e) { next(e); }
});

// Cross-community talent search
router.get('/talent', (req, res, next) => {
  try {
    const state = getState();
    const { a, b } = req.query;
    if (a && b) {
      return res.json({ shared: discoverSharedTalent(state, a, b) });
    }
    // Global talent directory (public summary)
    const directory = state.users.map((u) => {
      const { passwordHash, salt, email, ...rest } = u;
      const skills = state.userSkills
        .filter((us) => us.userId === u.id)
        .map((us) => {
          const sk = state.skills.find((s) => s.id === us.skillId);
          return sk ? sk.name : null;
        })
        .filter(Boolean);
      return { id: rest.id, name: rest.name, location: rest.location, availability: rest.availability, skills };
    });
    res.json({ directory });
  } catch (e) { next(e); }
});

module.exports = router;
