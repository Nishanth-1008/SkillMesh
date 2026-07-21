const http = require('http');
const { Router } = require('./utils/router');
const { load } = require('./db');

load();

const app = new Router();

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'skillmesh-backend',
    phase: 6,
    features: [
      // 1
      'auth', 'communities', 'profiles', 'graph', 'ai-search',
      // 2
      'team-builder', 'projects', 'recommendations', 'trust',
      'opportunities', 'messaging', 'organizations',
      // 3
      'analytics', 'events', 'gamification', 'admin',
      // 4
      'federation', 'public-hub', 'emergency', 'integrations',
      'webhooks', 'api-keys', 'plugins',
      // 5
      'global-network', 'reasoning', 'passport', 'impact', 'scenarios', 'research',
      // 6
      'agents', 'digital-twin', 'community-memory', 'auto-teams', 'community-os',
    ],
    time: new Date().toISOString(),
  });
});

function mount(prefix, routeModule) {
  app.use((req, res, next) => {
    if (req.url.startsWith(prefix)) {
      const router = require(routeModule);
      req.url = req.url.replace(prefix, '') || '/';
      return router.handle(req, res);
    }
    next();
  });
}

// Phase 1–2
mount('/api/auth', './routes/auth');
mount('/api/communities', './routes/communities');
mount('/api/profiles', './routes/profiles');
mount('/api/search', './routes/search');
mount('/api/graph', './routes/graph');
mount('/api/projects', './routes/projects');
mount('/api/teams', './routes/teams');
mount('/api/recommendations', './routes/recommendations');
mount('/api/trust', './routes/trust');
mount('/api/opportunities', './routes/opportunities');
mount('/api/messages', './routes/messages');
mount('/api/organizations', './routes/organizations');

// Phase 3–6
mount('/api/analytics', './routes/analytics');
mount('/api/events', './routes/events');
mount('/api/gamification', './routes/gamification');
mount('/api/ecosystem', './routes/ecosystem');
mount('/api/intelligence', './routes/intelligence');
mount('/api/autonomy', './routes/autonomy');

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  app.handle(req, res).catch((e) => {
    console.error(e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

server.listen(PORT, () => {
  console.log(`[SkillMesh] backend listening on http://localhost:${PORT}`);
  console.log(`[SkillMesh] Phases 1–6 complete — Autonomous Community Intelligence`);
  console.log(`[SkillMesh] try: curl http://localhost:${PORT}/health`);
});

module.exports = server;
