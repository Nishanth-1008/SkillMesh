// Tiny Express-like router built directly on Node's `http` module.
// Supports path params (:id), middleware chains, JSON body parsing,
// and res.json()/res.status() helpers. Enough surface area for Phase 1
// without needing `npm install express` (no registry access here).

const { URL } = require('url');
const { config } = require('../config');

function pathToRegex(path) {
  const paramNames = [];
  const pattern = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${pattern}$`), paramNames };
}

class Router {
  constructor() {
    this.routes = []; // { method, regex, paramNames, handlers: [middleware..., handler] }
    this.globalMiddleware = [];
  }

  use(fn) {
    this.globalMiddleware.push(fn);
  }

  add(method, path, ...handlers) {
    const { regex, paramNames } = pathToRegex(path);
    this.routes.push({ method, regex, paramNames, handlers });
  }

  get(path, ...h) { this.add('GET', path, ...h); }
  post(path, ...h) { this.add('POST', path, ...h); }
  put(path, ...h) { this.add('PUT', path, ...h); }
  patch(path, ...h) { this.add('PATCH', path, ...h); }
  delete(path, ...h) { this.add('DELETE', path, ...h); }

  async handle(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    const pathname = decodeURIComponent(parsedUrl.pathname);

    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      const body = JSON.stringify(obj);
      res.setHeader('Content-Type', 'application/json');
      res.end(body);
    };

    // CORS (frontend runs on a different port during dev)
    const origin = config.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (origin !== '*') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    // Parse JSON body for methods that carry one. Guarded with a flag
    // because a request may pass through more than one Router.handle()
    // call (an outer app mounting a sub-router by URL prefix) — the
    // request stream can only be read once.
    if (!req._bodyParsed) {
      req._bodyParsed = true;
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        req.body = await parseJsonBody(req).catch(() => ({}));
      } else {
        req.body = {};
      }
    }

    // Find a matching route (if any) up front, so route-specific handlers
    // can be appended to the chain after global middleware. Global
    // middleware always runs regardless of a route match in *this* router —
    // that's how sub-routers get mounted by prefix (a middleware forwards
    // to another Router.handle() and ends the response itself).
    let matchedRoute = null;
    const matchedParams = {};
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = pathname.match(route.regex);
      if (!match) continue;
      matchedRoute = route;
      route.paramNames.forEach((name, i) => { matchedParams[name] = match[i + 1]; });
      break;
    }
    req.params = matchedParams;

    const chain = [
      ...this.globalMiddleware,
      ...(matchedRoute ? matchedRoute.handlers : []),
      (rq, rs) => { if (!rs.writableEnded) rs.status(404).json({ error: 'Not found' }); },
    ];
    let idx = 0;
    const next = (err) => {
      if (err) return sendError(res, err);
      if (res.writableEnded) return; // a middleware (e.g. a mounted sub-router) already responded
      const fn = chain[idx++];
      if (!fn) return;
      try {
        const maybePromise = fn(req, res, next);
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(next);
        }
      } catch (e) {
        next(e);
      }
    };
    return next();
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) { // 2MB guard
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendError(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { Router };
