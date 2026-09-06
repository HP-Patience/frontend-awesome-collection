import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createStaticServer } from "../scripts/serve.mjs";

const server = createStaticServer();
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
test("serves home, modules, styles and empty data with correct MIME", async () => {
  for (const [url, type] of [["/", "text/html"], ["/src/app.js", "text/javascript"], ["/src/styles.css", "text/css"], ["/src/data/projects.json", "application/json"], ["/public/favicon.svg", "image/svg+xml"]]) {
    const response = await fetch(base + url);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type").includes(type));
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    await response.arrayBuffer();
  }
});
test("HEAD returns headers without a body", async () => {
  const response = await fetch(base, { method: "HEAD" });
  assert.equal(response.status, 200);
  assert.ok(Number(response.headers.get("content-length")) > 0);
  assert.equal(await response.text(), "");
});
test("private files and non-assets are not exposed", async () => {
  for (const url of ["/.git/config", "/src/.private", "/src/%2e%2e%5cpackage.json", "/src/%00", "/src/C:/file", "/scripts/serve.mjs", "/package.json", "/missing"]) {
    const response = await fetch(base + url);
    assert.ok([403, 404].includes(response.status), `${url}: ${response.status}`);
    await response.arrayBuffer();
  }
});
test("malformed encoding is a 400, not a crash", async () => {
  const response = await fetch(base + "/src/%zz");
  assert.equal(response.status, 400);
});
test("unsupported methods are rejected", async () => {
  const response = await fetch(base, { method: "POST" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});
