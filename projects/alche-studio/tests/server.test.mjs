import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from '../server.mjs';

let server, origin;
before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

async function files(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await files(full));
    else found.push(full);
  }
  return found;
}

test('every mirrored route renders and is free of Google tracking', async () => {
  const pages = (await files('public')).filter(f => f.endsWith('.html'));
  assert.ok(pages.length >= 30);
  for (const file of pages) {
    const route = '/' + path.relative('public', file).replaceAll('\\', '/').replace(/index\.html$/, '');
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const html = await response.text();
    assert.ok(html.includes('/replica.css'), route);
    assert.doesNotMatch(html, /googletagmanager\.com|gtag\('config'/, route);
  }
});

test('all same-origin HTML links, scripts, and images resolve locally', async () => {
  const pages = (await files('public')).filter(f => f.endsWith('.html'));
  const paths = new Set();
  for (const file of pages) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/(?:src|href|poster)=["'](\/[^"']*)["']/g)) {
      if (match[1].startsWith('//')) continue;
      paths.add(new URL(match[1], origin).pathname);
    }
  }
  for (const pathname of paths) {
    const response = await fetch(origin + pathname, { method: 'HEAD' });
    assert.equal(response.status, 200, pathname);
  }
});

test('video byte ranges and suffix ranges work', async () => {
  const response = await fetch(origin + '/top/service/ue.mp4', { headers: { Range: 'bytes=0-1023' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.match(response.headers.get('content-range'), /^bytes 0-1023\//);
  assert.equal((await response.arrayBuffer()).byteLength, 1024);
  const suffix = await fetch(origin + '/top/service/ue.mp4', { headers: { Range: 'bytes=-128' } });
  assert.equal(suffix.status, 206);
  assert.equal((await suffix.arrayBuffer()).byteLength, 128);
});

test('malformed and unsatisfiable ranges are rejected', async () => {
  for (const value of ['bytes=999999999-', 'bytes=2-1', 'bytes=-', 'bytes=0-1,5-6']) {
    const response = await fetch(origin + '/top/service/ue.mp4', { headers: { Range: value } });
    assert.equal(response.status, 416, value);
  }
});

test('missing files, malformed URLs, unsupported methods fail safely', async () => {
  assert.equal((await fetch(origin + '/does-not-exist')).status, 404);
  assert.equal((await fetch(origin + '/%00')).status, 400);
  assert.equal((await fetch(origin + '/%FF')).status, 400);
  assert.equal((await fetch(origin + '/', { method: 'POST' })).status, 405);
  assert.equal((await fetch(origin + '/..%2fpackage.json')).status, 403);
});

test('models, audio, and fonts are available with correct MIME types', async () => {
  for (const [url, type] of [
    ['/common/scene.glb', 'model/gltf-binary'],
    ['/sounds/bgm.mp3', 'audio/mpeg'],
    ['/_astro/ibm-plex-mono-latin-400-normal.Dm_PoFIZ.woff2', 'font/woff2'],
  ]) {
    const res = await fetch(origin + url, { method: 'HEAD' });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), type);
    assert.ok(Number(res.headers.get('content-length')) > 0);
  }
});
