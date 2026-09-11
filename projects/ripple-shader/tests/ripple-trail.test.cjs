const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../ripple-trail.js');
const { RipplePool, PathSampler } = globalThis.RippleTrail;
const mode = { decay: 1, growth: 1 };
const stamp = x => ({ x, y: 20, age: 0, opacity: 0.5, rotation: 0, size: 40 });

test('600 live stamps retain the oldest object and coordinates, not just the last 80', () => {
  const pool = new RipplePool();
  const oldest = pool.add(stamp(0));
  for (let i = 1; i < 600; i++) pool.add(stamp(i));
  assert.equal(pool.active.length, 600);
  assert.equal(pool.active[0], oldest);
  assert.deepEqual(oldest, stamp(0));
  assert.equal(new Set(pool.active).size, 600);
});
test('only naturally expired objects are recycled', () => {
  const pool = new RipplePool();
  const oldest = pool.add(stamp(0));
  pool.advance(2, mode, 1);
  assert.ok(oldest.opacity >= 0.002);
  const fresh = pool.add(stamp(1));
  assert.notEqual(oldest, fresh);
  pool.advance(0.3, mode, 1);
  assert.deepEqual(pool.active, [fresh]);
  const reused = pool.add(stamp(2));
  assert.equal(reused, oldest);
  assert.equal(fresh.x, 1);
  assert.equal(reused.age, 0);
});
test('free-list limit never caps active ripples, and idle cache is bounded', () => {
  const pool = new RipplePool();
  for (let i = 0; i < 3000; i++) pool.add(stamp(i));
  assert.equal(pool.active.length, 3000);
  pool.advance(4, mode, 1);
  assert.equal(pool.active.length, 0);
  assert.equal(pool.free.length, 512);
});
test('clear and repeated reuse do not duplicate object identities', () => {
  const pool = new RipplePool();
  for (let round = 0; round < 10; round++) {
    for (let i = 0; i < 400; i++) pool.add(stamp(i));
    assert.equal(new Set(pool.active).size, 400);
    pool.clear();
    assert.equal(pool.free.length, 400);
    assert.equal(pool.active.length, 0);
  }
});
test('decay and growth agree at 30Hz, 60Hz and 120Hz', () => {
  const values = [30,60,120].map(hz => {
    const pool = new RipplePool();
    pool.add(stamp(0));
    for (let i = 0; i < hz; i++) pool.advance(1 / hz, mode, 1);
    return pool.active[0];
  });
  for (const result of values) {
    assert.ok(Math.abs(result.opacity - values[0].opacity) < 1e-12);
    assert.ok(Math.abs(result.size - values[0].size) < 1e-9);
  }
});
test('elapsed-time decay handles a slow frame without freezing lifetime', () => {
  const pool = new RipplePool(); pool.add(stamp(0));
  pool.advance(10, mode, 1);
  assert.equal(pool.active.length, 0);
});
test('a fast 1120px sweep produces 141 evenly spaced points, without a 12-point cap', () => {
  const points = [];
  const sampler = new PathSampler((x,y) => points.push([x,y]));
  sampler.sample(0,0,8); sampler.sample(1120,0,8);
  assert.equal(points.length, 141);
  points.forEach((p,i) => { assert.ok(Math.abs(p[0]-i*8) < 1e-9); assert.equal(p[1],0); });
});
test('sampling density is independent of pointer-event frequency', () => {
  function path(step) {
    const points = [];
    const sampler = new PathSampler((x,y) => points.push([x,y]));
    for (let x=0; x<=1120; x+=step) sampler.sample(x,0,8);
    return points;
  }
  const baseline = path(1120);
  for (const step of [1,7]) {
    const points = path(step); assert.equal(points.length, baseline.length);
    points.forEach((p,i) => assert.ok(Math.hypot(p[0]-baseline[i][0],p[1]-baseline[i][1]) < 1e-9));
  }
});
test('sub-spacing movements follow actual corners instead of a shortcut chord', () => {
  const points = [];
  const sampler = new PathSampler((x,y) => points.push([x,y]));
  sampler.sample(0,0,10);sampler.sample(6,0,10);sampler.sample(6,6,10);
  assert.deepEqual(points, [[0,0],[6,4]]);
});
test('reset breaks the path rather than bridging across canvas re-entry', () => {
  const points = [];
  const sampler = new PathSampler((x,y) => points.push([x,y]));
  sampler.sample(0,0,8);sampler.reset();sampler.sample(1000,0,8);
  assert.deepEqual(points, [[0,0],[1000,0]]);
});
test('stationary events and malformed samples emit no duplicate points', () => {
  const points = [];
  const sampler = new PathSampler((x,y) => points.push([x,y]));
  sampler.sample(0,0,8);sampler.sample(0,0,8);
  sampler.sample(Infinity,0,8);sampler.sample(10,0,0);sampler.sample(NaN,0,8);
  assert.deepEqual(points, [[0,0]]);
});
