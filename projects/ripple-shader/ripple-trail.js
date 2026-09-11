/* Recyclable, time-lived ripples and distance-based pointer sampling.
 * Only expired objects enter the free list. Active ripples are never evicted.
 */
(() => {
  'use strict';
  class RipplePool {
    constructor() {
      this.active = [];
      this.free = [];
    }
    add(values) {
      const ripple = Object.assign(this.free.pop() || {}, values);
      this.active.push(ripple);
      return ripple;
    }
    advance(dt, mode, sizeFactor) {
      const fade = Math.exp(-2.5 * mode.decay * dt);
      const growth = 1 - Math.exp(-1.2 * mode.growth * dt);
      let alive = 0;
      for (const ripple of this.active) {
        ripple.age += dt;
        ripple.opacity *= fade;
        ripple.rotation += 1.2 * dt;
        ripple.size += (300 * sizeFactor - ripple.size) * growth;
        if (ripple.opacity < 0.002) {
          // Cap only the cache of invisible objects, never the visible trail.
          if (this.free.length < 512) this.free.push(ripple);
        } else {
          this.active[alive++] = ripple;
        }
      }
      this.active.length = alive;
    }
    clear() {
      for (const ripple of this.active) {
        if (this.free.length < 512) this.free.push(ripple);
      }
      this.active.length = 0;
    }
  }
  class PathSampler {
    constructor(emit) {
      this.emit = emit;
      this.reset();
    }
    reset() {
      this.last = null;
      this.toNext = 0;
    }
    sample(x, y, spacing) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(spacing) || spacing <= 0) return;
      if (!this.last) {
        this.last = { x, y };
        this.toNext = spacing;
        this.emit(x, y);
        return;
      }
      const dx = x - this.last.x, dy = y - this.last.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0) return;
      let travelled = this.toNext;
      // No per-event stamp cap; carry residual distance across events.
      while (travelled <= distance + 1e-8) {
        const t = Math.min(travelled / distance, 1);
        this.emit(this.last.x + dx * t, this.last.y + dy * t);
        travelled += spacing;
      }
      this.toNext = travelled - distance;
      this.last = { x, y };
    }
  }
  globalThis.RippleTrail = { RipplePool, PathSampler };
})();
