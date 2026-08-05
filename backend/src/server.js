const http = require('http');
const { Router } = require('./utils/router');
const { config } = require('./config');
const { load, getState, close } = require('./db');

async function main() {
  await load();

  const state = getState();
  if (state.users.length === 0) {
    console.log('[SkillMesh] Empty database detected. Auto-seeding demo data…');
    const { runSeed } = require('./seed');
    await runSeed({ quiet: false });
  }

  const app = new Router();

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'skillmesh-backend',
      phase: 6,
      database: 'postgres',
      features: [
        'auth', 'communities', 'profiles', 'graph', 'ai-search',
        'team-builder', 'projects', 'recommendations', 'trust',
        'opportunities', 'messaging', 'organizations',
        'analytics', 'events', 'gamification', 'admin',
        'federation', 'public-hub', 'emergency', 'integrations',
        'webhooks', 'api-keys', 'plugins',
        'global-network', 'reasoning', 'passport', 'impact', 'scenarios', 'research',
        'agents', 'digital-twin', 'community-memory', 'auto-teams', 'community-os',
      ],
      time: new Date().toISOString(),
    });
  });

  function mount(prefix, routeModule) {
    const router = typeof routeModule === 'string' ? require(routeModule) : routeModule;
    app.use((req, res, next) => {
      const url = req.url;
      if (url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?')) {
        const originalUrl = req.url;
        let subUrl = url.slice(prefix.length);
        if (!subUrl || subUrl.startsWith('?')) {
          subUrl = '/' + subUrl;
        }
        req.url = subUrl;
        return router.handle(req, res).finally(() => {
          req.url = originalUrl;
        });
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
  mount('/api/analytics', './routes/analytics');
  mount('/api/events', './routes/events');
  mount('/api/gamification', './routes/gamification');
  mount('/api/ecosystem', './routes/ecosystem');
  mount('/api/intelligence', './routes/intelligence');
  mount('/api/autonomy', './routes/autonomy');

  const server = http.createServer((req, res) => {
    app.handle(req, res).catch((e) => {
      console.error(e);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  });

  server.listen(config.PORT, config.HOST, () => {
    console.log(`[SkillMesh] backend listening on http://${config.HOST}:${config.PORT}`);
    console.log(`[SkillMesh] Postgres via ${config.DATABASE_URL ? 'DATABASE_URL' : 'PG*'} · CORS=${config.CORS_ORIGIN}`);
    console.log(`[SkillMesh] API base (frontend): ${config.SKILLMESH_API_BASE}`);
    console.log(`[SkillMesh] try: curl http://localhost:${config.PORT}/health`);
  });

  const shutdown = async () => {
    console.log('[SkillMesh] shutting down…');
    server.close();
    await close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

main().catch((e) => {
  console.error('[SkillMesh] failed to start:', e.message);
  process.exit(1);
});

module.exports = { main };
