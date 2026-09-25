// A dev server for dist/, dependency-free like the rest of this repo.
//
// It replaces `npx serve dist`, which kept exiting mid-session and
// taking the preview with it. npx re-resolves the package on every
// launch and the process it spawns is one we don't control; this is a
// dozen lines of Node with nothing between it and the port.
//
// It also serves /index.html directly instead of 301-ing to /, which
// is what made a stale redirect look like a dead server.
//
//   node serve.js [port]

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'dist');
const PORT = Number(process.argv[2]) || 8765;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// THE EDIT MODE'S SAVE (2026-09-24): PUT /__layout with the picture
// sizes set by hand ({ slug: { w, r } }, src/edit-mode.js) writes them
// to layout-overrides.json and rebuilds, answering once dist/ is new.
// Loopback only, like the rest of this server.
const { execFile } = require('child_process');
function saveLayout(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on('end', () => {
    const reply = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    let data;
    try { data = JSON.parse(body); } catch (e) { return reply(400, { ok: false, error: 'bad JSON' }); }
    const clean = {};
    for (const [slug, v] of Object.entries(data || {})) {
      if (!/^[a-z0-9-]+$/i.test(slug) || !v || !(+v.w > 0 && +v.w <= 1) || !(+v.r > 0 && +v.r < 10)) return reply(400, { ok: false, error: 'bad entry ' + slug });
      clean[slug] = { w: +(+v.w).toFixed(5), r: +(+v.r).toFixed(5) };
    }
    fs.writeFileSync(path.join(__dirname, 'layout-overrides.json'), JSON.stringify(clean, null, 2) + '\n');
    execFile(process.execPath, [path.join(__dirname, 'build.js')], { cwd: __dirname, timeout: 120000 }, (err, stdout, stderr) => {
      const out = String(stdout || '') + String(stderr || '');
      if (err) return reply(500, { ok: false, error: 'build failed', log: out.slice(-2000) });
      reply(200, { ok: true, count: Object.keys(clean).length, log: out.slice(-400) });
    });
  });
}

http
  .createServer((req, res) => {
    if (req.method === 'PUT' && req.url.split('?')[0] === '/__layout') return saveLayout(req, res);
    // Query strings are cache-busters here, not routes.
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    // /archive resolves to /archive.html, as it does on the live site.
    if (!path.extname(rel) && fs.existsSync(path.join(ROOT, rel + '.html'))) rel += '.html';
    // Resolve inside ROOT and refuse anything that climbs out of it.
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found: ' + rel);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        // The build stamps its own CSS/JS URLs; never let a reload
        // serve yesterday's markup out of the disk cache.
        'Cache-Control': 'no-store',
      });
      res.end(body);
    });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log('serving dist/ on http://localhost:' + PORT);
  });

// BOUND TO LOOPBACK, and noisy when it dies. Listening on every
// interface means the socket is tied to whatever network is up: join a
// café's wifi, sleep the laptop, switch to a hotspot, and the address
// it bound to can go away underneath it. 127.0.0.1 exists whatever the
// network is doing — and it also stops a public network from reaching
// the preview at all, which is the right default for a dev server on
// the road.
process.on('uncaughtException', (e) => {
  console.error('serve.js died:', e && e.stack ? e.stack : e);
  process.exit(1);
});
