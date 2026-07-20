const http = require('http');
const { Router } = require('./utils/router');
const { load } = require('./db');

load(); // initialize / load db.json on boot

const app = new Router();

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'skillmesh-backend',
    phase: 2,
    features: [
      'auth', 'communities', 'profiles', 'graph', 'ai-search',
      'team-builder', 'projects', 'recommendations', 'trust',
      'opportunities', 'messaging', 'organizations',
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
  console.log(`[SkillMesh] Phase 2 — Intelligent Collaboration`);
  console.log(`[SkillMesh] try: curl http://localhost:${PORT}/health`);
});

module.exports = server;
