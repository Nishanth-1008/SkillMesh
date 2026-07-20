const http = require('http');
const { Router } = require('./utils/router');
const { load } = require('./db');

load(); // initialize / load db.json on boot

const app = new Router();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'skillmesh-backend', phase: 1, time: new Date().toISOString() });
});

app.use((req, res, next) => {
  const authRouter = require('./routes/auth');
  if (req.url.startsWith('/api/auth')) {
    req.url = req.url.replace('/api/auth', '') || '/';
    return authRouter.handle(req, res);
  }
  next();
});

app.use((req, res, next) => {
  const communitiesRouter = require('./routes/communities');
  if (req.url.startsWith('/api/communities')) {
    req.url = req.url.replace('/api/communities', '') || '/';
    return communitiesRouter.handle(req, res);
  }
  next();
});

app.use((req, res, next) => {
  const profilesRouter = require('./routes/profiles');
  if (req.url.startsWith('/api/profiles')) {
    req.url = req.url.replace('/api/profiles', '') || '/';
    return profilesRouter.handle(req, res);
  }
  next();
});

app.use((req, res, next) => {
  const searchRouter = require('./routes/search');
  if (req.url.startsWith('/api/search')) {
    req.url = req.url.replace('/api/search', '') || '/';
    return searchRouter.handle(req, res);
  }
  next();
});

app.use((req, res, next) => {
  const graphRouter = require('./routes/graph');
  if (req.url.startsWith('/api/graph')) {
    req.url = req.url.replace('/api/graph', '') || '/';
    return graphRouter.handle(req, res);
  }
  next();
});

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
  console.log(`[SkillMesh] try: curl http://localhost:${PORT}/health`);
});

module.exports = server;
