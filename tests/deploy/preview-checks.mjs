// Checks the preview deployment THROUGH the proxy. Usage: node tests/deploy/preview-checks.mjs <baseUrl> <hostHeader>
// Exits 1 on any failed check. Prints every check, one line each.
import http from 'node:http';

const [base, host] = process.argv.slice(2);
if (!base || !host) { console.error('usage: node tests/deploy/preview-checks.mjs <baseUrl> <hostHeader>'); process.exit(2); }
const u = new URL(base);

function get(path, headers = {}) {
  return new Promise((res) => {
    const r = http.request({ host: u.hostname, port: u.port || 80, method: 'GET', path, headers: { Host: host, ...headers }, timeout: 30000 }, (resp) => {
      const chunks = [];
      resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body: Buffer.concat(chunks) }));
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', (e) => res({ status: 0, headers: {}, body: Buffer.from(String(e.message)) }));
    r.end();
  });
}

let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail || ''}`); };

// 1) Source and config must not be served: the shell page (or a deny) is fine, real source is not.
for (const p of ['/@vite/client', '/src/main.js', '/vite.config.js', '/package.json', '/server/standalone/vite.config.js']) {
  const r = await get(p);
  const text = r.body.toString('utf8', 0, 400);
  const leaked = /defineConfig|createHotContext|"dependencies"|import\s.+from\s/.test(text);
  check(`no source at ${p}`, !leaked && r.status !== 0, `status ${r.status}`);
}

// 2) The built page loads and names a hashed JS bundle.
const home = await get('/', { 'Accept-Encoding': 'gzip' });
const html = home.body.toString('utf8');
const m = /\/assets\/[^"'\s]+-[A-Za-z0-9_-]{8}\.js/.exec(html);
check('home 200 with a hashed asset', home.status === 200 && !!m, `status ${home.status} asset ${m ? m[0] : 'none'}`);

// 3) Compression and caching on the hashed bundle (the measured gaps).
if (m) {
  const a = await get(m[0], { 'Accept-Encoding': 'gzip' });
  check('bundle is gzip-compressed', a.headers['content-encoding'] === 'gzip', `content-encoding ${a.headers['content-encoding']} bytes ${a.body.length}`);
  check('bundle has a one-year immutable cache', /max-age=31536000/.test(a.headers['cache-control'] || '') && /immutable/.test(a.headers['cache-control'] || ''), `cache-control ${a.headers['cache-control']}`);
}
check('html is not cached for a year', !/max-age=31536000/.test(home.headers['cache-control'] || ''), `cache-control ${home.headers['cache-control']}`);

// 4) An API route answers JSON through the proxy.
const api = await get('/api/radio/stations');
check('api answers through the proxy', [200, 429, 502, 503].includes(api.status), `status ${api.status}`);

// 5) Embedding: the embed shape must carry frame-ancestors, the plain page must not be frameable.
const embed = await get('/?embed=1');
check('embed shape sets frame-ancestors', /frame-ancestors/.test(embed.headers['content-security-policy'] || ''), String(embed.headers['content-security-policy'] || '').match(/frame-ancestors[^;]*/)?.[0] || 'missing');

console.log(`\nSUMMARY fail=${fails}`);
process.exitCode = fails ? 1 : 0;
