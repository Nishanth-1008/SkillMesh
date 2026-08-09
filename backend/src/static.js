// Static asset server for the frontend SPA with production cache headers.
//   - `/css/*`, `/js/*`, fonts, images → `Cache-Control: public, max-age=31536000`
//   - `index.html` → `Cache-Control: no-cache` (always revalidate)
// Path traversal is blocked; missing files return a plain 404.

const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res, rootDir) {
  return new Promise((resolve) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.normalize(path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath));

    if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return resolve(true);
    }

    fs.stat(filePath, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        resolve(false);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const isHtml = ext === '.html' || filePath.endsWith('index.html');
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.setHeader(
        'Cache-Control',
        isHtml ? 'no-cache' : 'public, max-age=31536000'
      );
      res.setHeader('Content-Length', String(stat.size));
      fs.createReadStream(filePath).pipe(res);
      resolve(true);
    });
  });
}

module.exports = { serveStatic, MIME };
