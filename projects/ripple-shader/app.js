/* Independent WebGL implementation of the ripple interaction.
 * Two passes: additive ripple brushes -> full-screen displaced gallery.
 * No libraries, network requests, build step, or perpetual idle rendering.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('#canvas');
  const stage = document.querySelector('#stage');
  const status = document.querySelector('#status');
  const hint = document.querySelector('#hint');
  const motionButton = document.querySelector('#motion');
  const modeSelect = document.querySelector('#effect');
  const about = document.querySelector('#about');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const modes = {
    classic: { strength: 0.10, growth: 1, decay: 1, opacity: 0.5 },
    soft: { strength: 0.045, growth: 0.85, decay: 1.2, opacity: 0.36 },
    liquid: { strength: 0.17, growth: 1.25, decay: 0.75, opacity: 0.62 }
  };
  let mode = modes.classic;
  let paused = preference.matches;
  let ready = false;
  let failed = false;
  let gl, brushProgram, sceneProgram, quad, field, framebuffer, brushBuffer;
  let width = 1, height = 1, fieldWidth = 1, fieldHeight = 1;
  let raf = 0, lastTime = 0;
  let textures = [], images = [], hintTimer;
  const pool = new RippleTrail.RipplePool();
  const sampler = new RippleTrail.PathSampler((x, y) => addRipple(x, y));
  const corners = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
  let brushVertices = new Float32Array(128 * 6 * 5);

  const screenVertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const brushVertex = `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    attribute float a_opacity;
    uniform vec2 u_resolution;
    varying vec2 v_uv;
    varying float v_opacity;
    void main() {
      v_uv = a_uv;
      v_opacity = a_opacity;
      gl_Position = vec4(a_position / u_resolution * 2.0 - 1.0, 0.0, 1.0);
    }
  `;
  const brushFragment = `
    precision mediump float;
    varying vec2 v_uv;
    varying float v_opacity;
    uniform sampler2D u_brush;
    void main() {
      vec4 brush = texture2D(u_brush, v_uv);
      gl_FragColor = vec4(brush.rgb, brush.a * v_opacity);
    }
  `;
  const sceneFragment = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_field;
    uniform sampler2D u_rock;
    uniform sampler2D u_flower;
    uniform sampler2D u_portrait;
    uniform vec2 u_resolution;
    uniform vec2 u_card;
    uniform float u_strength;
    // Apply displacement before the image mask, so edges ripple too.
    void main() {
      float displacement = texture2D(u_field, v_uv).r;
      float angle = displacement * 6.28318530718;
      vec2 uv = v_uv + vec2(sin(angle), cos(angle)) * displacement * u_strength;
      vec2 point = uv * u_resolution;
      float centerY = u_resolution.y * 0.5 + 27.5;
      vec2 size = u_card;
      vec2 a = (point - vec2(u_resolution.x * 0.1875, centerY)) / size + 0.5;
      vec2 b = (point - vec2(u_resolution.x * 0.5000, centerY)) / size + 0.5;
      vec2 c = (point - vec2(u_resolution.x * 0.8125, centerY)) / size + 0.5;
      vec3 color = vec3(0.0);
      if (a.x >= 0.0 && a.x <= 1.0 && a.y >= 0.0 && a.y <= 1.0) color = texture2D(u_rock, a).rgb;
      if (b.x >= 0.0 && b.x <= 1.0 && b.y >= 0.0 && b.y <= 1.0) color = texture2D(u_flower, b).rgb;
      if (c.x >= 0.0 && c.x <= 1.0 && c.y >= 0.0 && c.y <= 1.0) color = texture2D(u_portrait, c).rgb;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }
  function program(vertex, fragment, uniforms) {
    const handle = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(handle, vs);
    gl.attachShader(handle, fs);
    gl.linkProgram(handle);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(handle));
    const result = { handle, position: gl.getAttribLocation(handle, 'a_position') };
    for (const name of uniforms) result[name] = gl.getUniformLocation(handle, name);
    return result;
  }
  function use(program) {
    gl.useProgram(program.handle);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(program.position);
    gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);
  }
  function texture(image) {
    const handle = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (image) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    return handle;
  }
  function bindTexture(unit, handle, location) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.uniform1i(location, unit);
  }
  function initGPU() {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL is unavailable');
    brushProgram = program(brushVertex, brushFragment, ['u_resolution', 'u_brush']);
    brushProgram.uv = gl.getAttribLocation(brushProgram.handle, 'a_uv');
    brushProgram.opacity = gl.getAttribLocation(brushProgram.handle, 'a_opacity');
    brushBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, brushBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, brushVertices.byteLength, gl.DYNAMIC_DRAW);
    sceneProgram = program(screenVertex, sceneFragment, ['u_resolution', 'u_card', 'u_strength', 'u_field', 'u_rock', 'u_flower', 'u_portrait']);
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    textures = images.map(texture);
    field = texture();
    framebuffer = gl.createFramebuffer();
    gl.disable(gl.DEPTH_TEST);
    ready = true;
    failed = false;
    resize();
    canvas.classList.add('ready');
    status.hidden = true;
    document.body.dataset.renderer = 'webgl';
  }
  function resize() {
    if (!ready) return;
    const bounds = stage.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const dpr = Math.min(devicePixelRatio || 1, 2, 2560 / width, maxTexture / width, maxTexture / height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Half-resolution field; linear sampling smooths the displacement.
    fieldWidth = Math.max(1, Math.ceil(width * 0.5));
    fieldHeight = Math.max(1, Math.ceil(height * 0.5));
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fieldWidth, fieldHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      fallback(new Error('Displacement framebuffer is incomplete'));
      return;
    }
    reset();
  }
  function drawBrushes() {
    const count = pool.active.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, brushBuffer);
    if (!count) {
      // Release unusually large high-water allocations once the trail is gone.
      if (brushVertices.length > 512 * 6 * 5) {
        brushVertices = new Float32Array(128 * 6 * 5);
        gl.bufferData(gl.ARRAY_BUFFER, brushVertices.byteLength, gl.DYNAMIC_DRAW);
      }
      return;
    }
    const floats = count * 6 * 5;
    if (floats > brushVertices.length) {
      let capacity = brushVertices.length;
      while (capacity < floats) capacity *= 2;
      brushVertices = new Float32Array(capacity);
      gl.bufferData(gl.ARRAY_BUFFER, brushVertices.byteLength, gl.DYNAMIC_DRAW);
    }
    let offset = 0;
    for (const ripple of pool.active) {
      const c = Math.cos(ripple.rotation) * ripple.size * 0.5;
      const s = Math.sin(ripple.rotation) * ripple.size * 0.5;
      for (let i = 0; i < corners.length; i += 2) {
        const x = corners[i], y = corners[i + 1];
        brushVertices[offset++] = ripple.x + c * x + s * y;
        brushVertices[offset++] = ripple.y - s * x + c * y;
        brushVertices[offset++] = x * 0.5 + 0.5;
        brushVertices[offset++] = y * 0.5 + 0.5;
        brushVertices[offset++] = ripple.opacity;
      }
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, brushVertices.subarray(0, floats));
    gl.useProgram(brushProgram.handle);
    gl.enableVertexAttribArray(brushProgram.position);
    gl.enableVertexAttribArray(brushProgram.uv);
    gl.enableVertexAttribArray(brushProgram.opacity);
    gl.vertexAttribPointer(brushProgram.position, 2, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(brushProgram.uv, 2, gl.FLOAT, false, 20, 8);
    gl.vertexAttribPointer(brushProgram.opacity, 1, gl.FLOAT, false, 20, 16);
    gl.uniform2f(brushProgram.u_resolution, width, height);
    bindTexture(0, textures[3], brushProgram.u_brush);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    // All live ripples share one draw call, regardless of trail length.
    gl.drawArrays(gl.TRIANGLES, 0, count * 6);
    gl.disable(gl.BLEND);
    gl.disableVertexAttribArray(brushProgram.uv);
    gl.disableVertexAttribArray(brushProgram.opacity);
  }
  function draw() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, fieldWidth, fieldHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawBrushes();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    use(sceneProgram);
    gl.uniform2f(sceneProgram.u_resolution, width, height);
    let cardWidth = width * 0.25;
    let cardHeight = width / 3;
    if (width > 600 && height + 55 <= 560) {
      cardHeight = Math.max(1, height - 50);
      cardWidth = cardHeight * 0.75;
    }
    gl.uniform2f(sceneProgram.u_card, cardWidth, cardHeight);
    gl.uniform1f(sceneProgram.u_strength, mode.strength);
    bindTexture(0, field, sceneProgram.u_field);
    bindTexture(1, textures[0], sceneProgram.u_rock);
    bindTexture(2, textures[1], sceneProgram.u_flower);
    bindTexture(3, textures[2], sceneProgram.u_portrait);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function tick(now) {
    raf = 0;
    if (!ready || document.hidden) return;
    const dt = lastTime ? Math.max(0, (now - lastTime) / 1000) : 1 / 60;
    lastTime = now;
    if (!paused) pool.advance(dt, mode, Math.min(1, width / 900));
    draw();
    if (!paused && pool.active.length) wake();
    else lastTime = 0;
  }
  function wake() {
    if (!raf && ready && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function addRipple(x, y, boost = 1) {
    if (!ready || paused) return;
    pool.add({
      x, y, age: 0,
      size: 40 * Math.min(1, width / 900),
      rotation: Math.random() * Math.PI * 2,
      opacity: mode.opacity * boost
    });
    wake();
  }
  function disturb(event) {
    if (!ready || paused || (event.pointerType === 'touch' && event.type === 'pointermove' && !event.buttons)) return;
    hint.classList.remove('visible');
    clearTimeout(hintTimer);
    const bounds = stage.getBoundingClientRect();
    const spacing = Math.max(5, width / 180);
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) {
      // Captured touches may leave the canvas; clip them to its bounds.
      const x = Math.max(0, Math.min(width, sample.clientX - bounds.left));
      const y = Math.max(0, Math.min(height, bounds.bottom - sample.clientY));
      sampler.sample(x, y, spacing);
    }
  }
  function reset() {
    pool.clear();
    sampler.reset();
    lastTime = 0;
    wake();
  }
  function syncMotionButton() {
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? '恢复波纹' : '暂停波纹');
    motionButton.title = paused ? '恢复波纹 · Space' : '暂停波纹 · Space';
  }
  function setPaused(value) {
    paused = value;
    sampler.reset();
    lastTime = 0;
    syncMotionButton();
    wake();
  }
  function fallback(error) {
    console.warn('Ripple renderer fallback:', error.message);
    ready = false;
    failed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.classList.remove('ready');
    status.textContent = '当前浏览器无法运行 WebGL，已显示静态画廊。请尝试开启浏览器硬件加速。';
    status.hidden = false;
    hint.classList.remove('visible');
    clearTimeout(hintTimer);
    motionButton.disabled = true;
    modeSelect.disabled = true;
    document.body.dataset.renderer = 'fallback';
  }
  async function loadAssets() {
    const assets = window.RIPPLE_ASSETS;
    if (!assets) throw new Error('Local assets could not be loaded');
    for (const id of ['rock', 'flower', 'portrait']) document.getElementById(id).src = assets[id];
    images = await Promise.all(['rock', 'flower', 'portrait', 'brush'].map(key => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load ${key}`));
      image.src = assets[key];
    })));
    initGPU();
    if (!paused) {
      hint.classList.add('visible');
      hintTimer = setTimeout(() => hint.classList.remove('visible'), 4500);
    }
  }

  stage.addEventListener('pointermove', disturb);
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    sampler.reset();
    if (event.pointerType === 'touch') stage.setPointerCapture(event.pointerId);
    disturb(event);
  });
  for (const type of ['pointerleave', 'pointercancel', 'pointerup']) stage.addEventListener(type, () => { sampler.reset(); });
  motionButton.addEventListener('click', () => setPaused(!paused));
  modeSelect.addEventListener('change', () => { mode = modes[modeSelect.value] || modes.classic; reset(); });
  document.querySelector('#info').addEventListener('click', () => about.showModal());
  document.querySelector('#close-info').addEventListener('click', () => about.close());
  about.addEventListener('click', event => {
    if (event.target !== about) return;
    const rect = about.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) about.close();
  });
  document.querySelector('#replay').addEventListener('click', () => {
    about.close();
    if (!ready) return;
    setPaused(false);
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      addRipple(width * 0.5 + Math.cos(angle) * width * 0.09, height * 0.5 + 27.5 + Math.sin(angle) * width * 0.09, 0.65);
    }
  });
  document.addEventListener('keydown', event => {
    if (about.open || event.target.closest('button,select,a,input,textarea') || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.code === 'Space') { event.preventDefault(); if (!failed) setPaused(!paused); }
    if (event.key.toLowerCase() === 'r') reset();
  });
  preference.addEventListener('change', event => { setPaused(event.matches); reset(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
    else wake();
  });
  new ResizeObserver(resize).observe(stage);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    ready = false;
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.classList.remove('ready');
    status.textContent = '图形上下文暂时中断，正在等待恢复…';
    status.hidden = false;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try { initGPU(); } catch (error) { fallback(error); }
  });
  syncMotionButton();
  loadAssets().catch(fallback);
})();
