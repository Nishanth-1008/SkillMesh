const http = require('http');
const { Router, securityHeaders, rateLimit } = require('./utils/router');
const { config } = require('./config');
const { load, getState, close, ping } = require('./db');
const { requireAuth } = require('./middleware/requireAuth');
const { serveStatic } = require('./static');
const { ensureDailyBackup } = require('./backup');
const { openapiSpec, openapiDocsHtml } = require('./openapi');

async function main() {
  await load();
  await ensureDailyBackup();

  const state = getState();
  if (state.users.length === 0) {
    console.log('[SkillMesh] Empty database detected. Auto-seeding demo data…');
    const { runSeed } = require('./seed');
    await runSeed({ quiet: false });
  }

  const app = new Router();
  app.use(securityHeaders);
  app.use(rateLimit);

  app.get('/api/me', requireAuth, (req, res, next) => {
    try {
      const st = getState();
      const user = st.users.find((u) => u.id === req.user.id);
      if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
      }
      const { passwordHash, salt, ...rest } = user;
      res.json({ user: rest });
    } catch (e) { next(e); }
  });

  app.get('/health', async (req, res) => {
    let dbPing = 'unknown';
    let database = 'postgres';
    try {
      const p = await ping();
      database = p.mode;
      dbPing = p.ok ? 'ok' : 'error';
    } catch (e) {
      dbPing = 'error';
    }
    res.json({
      status: 'ok',
      service: 'skillmesh-backend',
      phase: 6,
      database,
      dbPing,
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

  // API contracts & docs (Phase 1)
  app.get('/api/openapi.json', (req, res) => res.json(openapiSpec));
  app.get('/api/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(openapiDocsHtml);
  });

  const server = http.createServer((req, res) => {
    // Serve the SPA static assets (with long-lived cache headers) for any
    // non-API GET request. Falling through to the router leaves a 404 for
    // unknown paths.
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
      serveStatic(req, res, config.STATIC_DIR).then((served) => {
        if (served) return;
        app.handle(req, res).catch((e) => {
          console.error(e);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      });
      return;
    }
    app.handle(req, res).catch((e) => {
      console.error(e);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
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

  // Zero-crash resilience: surface unhandled rejections instead of crashing,
  // and convert fatal exceptions into a graceful shutdown.
  process.on('unhandledRejection', (reason) => {
    console.error('[SkillMesh] unhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[SkillMesh] uncaughtException:', err);
    shutdown().catch(() => process.exit(1));
  });

  return server;
}

main().catch((e) => {
  console.error('[SkillMesh] failed to start:', e.message);
  process.exit(1);
});

module.exports = { main };
