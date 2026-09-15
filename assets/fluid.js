/* ===== fluid.js ===== */
/* Punjabi Rewind — the GPU ink engine.
   A 2D fluid approximation: velocity, vorticity, pressure projection and a dye
   field are all simulated in WebGL 2 fragment shaders. No libraries, no network
   requests and no build step — only this file.
   Public API (window.PR.Fluid): init, set, setPalette, setEnergy, bloom, pulse,
   togglePause, isPaused, clear, save, resize, destroy. */
(function () {
  'use strict';

  window.PR = window.PR || {};

  var palettes = {
    aurora: [[0.08, 0.9, 0.65], [0.08, 0.45, 1], [0.65, 0.13, 1], [1, 0.12, 0.48]],
    ember: [[1, 0.12, 0.03], [1, 0.48, 0.06], [0.85, 0.05, 0.25], [1, 0.72, 0.28]],
    lagoon: [[0.01, 0.7, 0.8], [0.02, 0.3, 0.95], [0.1, 0.95, 0.55], [0.35, 0.7, 1]],
    prism: [[1, 0.1, 0.35], [0.95, 0.55, 0.04], [0.15, 0.9, 0.4], [0.2, 0.25, 1]],
  };

  var qualities = {
    efficient: { simulation: 112, dye: 448, iterations: 16, dpr: 1 },
    balanced: { simulation: 176, dye: 768, iterations: 24, dpr: 1.5 },
    high: { simulation: 256, dye: 1024, iterations: 36, dpr: 2 },
  };

  var canvas = null;
  var hooks = {
    status: function () {},
    announce: function () {},
    stir: function () {},
    error: function () {},
    pause: function () {},
  };
  var settings = {
    swirl: 30, lifetime: 6, brush: 24, palette: 'aurora',
    quality: 'balanced', autoflow: true, glow: true, energy: 1,
  };
  var defaults = {
    swirl: 30, lifetime: 6, brush: 24, palette: 'aurora',
    quality: 'balanced', autoflow: true, glow: true, energy: 1,
  };

  var gl = null, resources = null, programs = null, vao = null;
  var paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lost = false, dirty = true, time = 0, previousTime = 0, frameCount = 0, fpsTime = 0;
  var resizePending = true, colorIndex = 0, pendingBlooms = 1, savePending = false;
  var raf = 0, inited = false;
  var pointers = new Map();
  var splats = [];

  var vertexSource = ['#version 300 es',
    'precision highp float;',
    'out vec2 uv;',
    'void main() {',
    '  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);',
    '  uv = p;',
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);',
    '}'].join('\n');

  var fragmentHeader = ['#version 300 es',
    'precision highp float;',
    'precision highp sampler2D;',
    'in vec2 uv;',
    'out vec4 fragColor;', ''].join('\n');

  /* Manual bilinear sampling, so drivers without float texture filtering work. */
  var bilinear = [
    'vec4 sampleLinear(sampler2D field, vec2 p) {',
    '  vec2 size = vec2(textureSize(field, 0));',
    '  vec2 st = p * size - 0.5;',
    '  vec2 f = fract(st);',
    '  vec2 base = (floor(st) + 0.5) / size;',
    '  vec2 px = 1.0 / size;',
    '  return mix(mix(texture(field, base), texture(field, base + vec2(px.x, 0)), f.x),',
    '    mix(texture(field, base + vec2(0, px.y)), texture(field, base + px), f.x), f.y);',
    '}', ''].join('\n');

  var shaders = {};

  shaders.splat = [
    'uniform sampler2D source; uniform vec2 point; uniform vec3 amount; uniform float radius; uniform float aspect;',
    'void main() { vec2 p = uv - point; p.x *= aspect; float weight = exp(-dot(p,p) / (radius * radius));',
    '  fragColor = vec4(texture(source, uv).xyz + amount * weight, 1); }'].join('\n');
shaders.advect = [bilinear,
    'uniform sampler2D velocity; uniform sampler2D source; uniform vec2 texel; uniform float dt; uniform float decay;',
    'void main() { vec2 p = uv - dt * sampleLinear(velocity, uv).xy * texel;',
    '  fragColor = sampleLinear(source, p) * exp(-decay * dt); }'].join('\n');

  shaders.curl = [
    'uniform sampler2D velocity; uniform vec2 texel;',
    'void main() { float l = texture(velocity, uv - vec2(texel.x,0)).y;',
    '  float r = texture(velocity, uv + vec2(texel.x,0)).y;',
    '  float b = texture(velocity, uv - vec2(0,texel.y)).x;',
    '  float t = texture(velocity, uv + vec2(0,texel.y)).x;',
    '  fragColor = vec4(0.5 * (r-l-t+b), 0, 0, 1); }'].join('\n');

  shaders.vorticity = [
    'uniform sampler2D velocity; uniform sampler2D curl; uniform vec2 texel; uniform float strength; uniform float dt;',
    'void main() { float l = abs(texture(curl, uv-vec2(texel.x,0)).x);',
    '  float r = abs(texture(curl, uv+vec2(texel.x,0)).x);',
    '  float b = abs(texture(curl, uv-vec2(0,texel.y)).x);',
    '  float t = abs(texture(curl, uv+vec2(0,texel.y)).x);',
    '  vec2 gradient = vec2(t-b, r-l) * 0.5;',
    '  vec2 force = vec2(gradient.y, -gradient.x) * texture(curl, uv).x * strength;',
    '  fragColor = vec4(clamp(texture(velocity, uv).xy + force * dt, vec2(-900), vec2(900)),0,1); }'].join('\n');

  shaders.divergence = [
    'uniform sampler2D velocity; uniform vec2 texel;',
    'void main() { vec2 c = texture(velocity, uv).xy;',
    '  float l = texture(velocity, uv-vec2(texel.x,0)).x;',
    '  float r = texture(velocity, uv+vec2(texel.x,0)).x;',
    '  float b = texture(velocity, uv-vec2(0,texel.y)).y;',
    '  float t = texture(velocity, uv+vec2(0,texel.y)).y;',
    '  if (uv.x < texel.x) l = -c.x; if (uv.x > 1.0-texel.x) r = -c.x;',
    '  if (uv.y < texel.y) b = -c.y; if (uv.y > 1.0-texel.y) t = -c.y;',
    '  fragColor = vec4(0.5*(r-l+t-b),0,0,1); }'].join('\n');

  shaders.pressure = [
    'uniform sampler2D pressure; uniform sampler2D divergence; uniform vec2 texel;',
    'void main() { float l = texture(pressure, uv-vec2(texel.x,0)).x;',
    '  float r = texture(pressure, uv+vec2(texel.x,0)).x;',
    '  float b = texture(pressure, uv-vec2(0,texel.y)).x;',
    '  float t = texture(pressure, uv+vec2(0,texel.y)).x;',
    '  fragColor = vec4((l+r+b+t-texture(divergence,uv).x)*0.25,0,0,1); }'].join('\n');

  shaders.project = [
    'uniform sampler2D velocity; uniform sampler2D pressure; uniform vec2 texel;',
    'void main() { float l = texture(pressure, uv-vec2(texel.x,0)).x;',
    '  float r = texture(pressure, uv+vec2(texel.x,0)).x;',
    '  float b = texture(pressure, uv-vec2(0,texel.y)).x;',
    '  float t = texture(pressure, uv+vec2(0,texel.y)).x;',
    '  vec2 v = texture(velocity,uv).xy - 0.5*vec2(r-l,t-b);',
    '  if (uv.x < texel.x || uv.x > 1.0-texel.x) v.x = 0.0;',
    '  if (uv.y < texel.y || uv.y > 1.0-texel.y) v.y = 0.0;',
    '  fragColor = vec4(v,0,1); }'].join('\n');
shaders.copy = [bilinear, 'uniform sampler2D source;',
    'void main() { fragColor = sampleLinear(source,uv); }'].join('\n');

  shaders.blur = [bilinear, 'uniform sampler2D source; uniform vec2 direction;',
    'void main() { fragColor = sampleLinear(source,uv)*0.227027;',
    '  fragColor += (sampleLinear(source,uv+direction*1.384615)+sampleLinear(source,uv-direction*1.384615))*0.316216;',
    '  fragColor += (sampleLinear(source,uv+direction*3.230769)+sampleLinear(source,uv-direction*3.230769))*0.070270; }'].join('\n');

  shaders.display = [bilinear,
    'uniform sampler2D dye; uniform sampler2D bloom; uniform vec2 texel; uniform float glow;',
    'float density(vec2 p) { return length(sampleLinear(dye,p).rgb); }',
    'void main() {',
    '  vec3 ink = max(sampleLinear(dye,uv).rgb, vec3(0));',
    '  float dx = density(uv+vec2(texel.x,0))-density(uv-vec2(texel.x,0));',
    '  float dy = density(uv+vec2(0,texel.y))-density(uv-vec2(0,texel.y));',
    '  vec3 normal = normalize(vec3(-dx*2.0,-dy*2.0,0.7));',
    '  float light = 0.78 + 0.32 * max(dot(normal,normalize(vec3(-0.5,0.7,1))),0.0);',
    '  vec3 color = ink * light + sampleLinear(bloom,uv).rgb * glow * 0.25;',
    '  color = 1.0-exp(-color*1.25);',
    '  color = pow(max(color,vec3(0)),vec3(0.83));',
    '  vec3 background = mix(vec3(0.018,0.025,0.043),vec3(0.028,0.040,0.060),1.0-length(uv-0.5));',
    '  float vignette = 1.0-0.25*dot(uv-0.5,uv-0.5);',
    '  fragColor = vec4((background+color)*vignette,1);',
    '}'].join('\n');

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(source) {
    var vertex = compile(gl.VERTEX_SHADER, vertexSource);
    var fragment = compile(gl.FRAGMENT_SHADER, fragmentHeader + source);
    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var name = gl.getActiveUniform(program, i).name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program: program, uniforms: uniforms };
  }

  function createTarget(width, height, channels) {
    channels = channels || 4;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var internal = channels === 1 ? gl.R16F : channels === 2 ? gl.RG16F : gl.RGBA16F;
    var format = channels === 1 ? gl.RED : channels === 2 ? gl.RG : gl.RGBA;
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, gl.HALF_FLOAT, null);
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      throw new Error('Your graphics driver cannot render floating-point fluid textures.');
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture: texture, framebuffer: framebuffer, width: width, height: height };
  }

  function createPair(width, height, channels) {
    return { read: createTarget(width, height, channels), write: createTarget(width, height, channels) };
  }
  function swap(pair) { var old = pair.read; pair.read = pair.write; pair.write = old; }
  function releaseTarget(target) { gl.deleteTexture(target.texture); gl.deleteFramebuffer(target.framebuffer); }
  function clearTarget(target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.clear(gl.COLOR_BUFFER_BIT); }
function dimensions(shortSide, cap) {
    cap = cap || 2048;
    var aspect = canvas.clientWidth / canvas.clientHeight;
    var width = aspect >= 1 ? shortSide * aspect : shortSide;
    var height = aspect >= 1 ? shortSide : shortSide / aspect;
    var scale = Math.min(1, cap / Math.max(width, height));
    return [Math.max(2, Math.round(width * scale)), Math.max(2, Math.round(height * scale))];
  }

  function draw(name, target, textures, uniforms) {
    var p = programs[name];
    gl.useProgram(p.program);
    var unit = 0;
    textures = textures || {};
    uniforms = uniforms || {};
    for (var key in textures) {
      if (!Object.prototype.hasOwnProperty.call(textures, key)) continue;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[key].texture);
      gl.uniform1i(p.uniforms[key], unit++);
    }
    for (var name2 in uniforms) {
      if (!Object.prototype.hasOwnProperty.call(uniforms, name2)) continue;
      var value = uniforms[name2];
      var location = p.uniforms[name2];
      if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2f(location, value[0], value[1]);
        else gl.uniform3f(location, value[0], value[1], value[2]);
      } else gl.uniform1f(location, value);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    resizePending = false;
    var quality = qualities[settings.quality];
    var dpr = Math.min(window.devicePixelRatio || 1, quality.dpr,
      2560 / Math.max(window.innerWidth, window.innerHeight));
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    var s = dimensions(quality.simulation, 768);
    var d = dimensions(quality.dye);
    var b = dimensions(160, 512);
    if (resources && resources.velocity.read.width === s[0] && resources.velocity.read.height === s[1] &&
      resources.dye.read.width === d[0] && resources.dye.read.height === d[1]) {
      dirty = true;
      return;
    }
    var old = resources;
    resources = {
      velocity: createPair(s[0], s[1], 2), dye: createPair(d[0], d[1], 4),
      pressure: createPair(s[0], s[1], 1), divergence: createTarget(s[0], s[1], 1),
      curl: createTarget(s[0], s[1], 1), bloom: createPair(b[0], b[1], 4),
    };
    if (old) {
      draw('copy', resources.dye.read, { source: old.dye.read });
      // Restart velocity when the grid changes so its cells/second units stay valid.
      for (var key in old) {
        if (!Object.prototype.hasOwnProperty.call(old, key)) continue;
        if (old[key].read) { releaseTarget(old[key].read); releaseTarget(old[key].write); } else releaseTarget(old[key]);
      }
    }
    dirty = true;
  }
function inkColor(index) {
    var palette = palettes[settings.palette] || palettes.aurora;
    var i = (index === undefined) ? colorIndex++ : index;
    return palette[Math.abs(i) % 4];
  }

  function addSplat(x, y, dx, dy, color, radius, amount) {
    var velocity = resources.velocity, dye = resources.dye;
    var common = {
      point: [x, y], radius: radius,
      aspect: canvas.clientWidth / canvas.clientHeight,
    };
    draw('splat', velocity.write, { source: velocity.read },
      { point: common.point, radius: common.radius, aspect: common.aspect, amount: [dx, dy, 0] });
    swap(velocity);
    draw('splat', dye.write, { source: dye.read },
      { point: common.point, radius: common.radius, aspect: common.aspect,
        amount: [color[0] * amount, color[1] * amount, color[2] * amount] });
    swap(dye);
    dirty = true;
  }

  /* A ten-petal ink flower — the signature gesture of the canvas. */
  function bloom() {
    var aspect = canvas.clientWidth / canvas.clientHeight;
    var centerX = 0.43 + Math.random() * 0.12;
    var centerY = 0.42 + Math.random() * 0.16;
    for (var i = 0; i < 10; i++) {
      var angle = i / 10 * Math.PI * 2 + time * 0.2;
      var radius = 0.12 + Math.random() * 0.07;
      addSplat(centerX + Math.cos(angle) * radius / aspect, centerY + Math.sin(angle) * radius,
        -Math.sin(angle) * 140, Math.cos(angle) * 140, inkColor(i), 0.045, 1.6);
    }
  }

  /* A smaller bloom dropped when a track starts, so the canvas answers the music. */
  function pulse(strength) {
    if (!resources || lost) return;
    var scale = typeof strength === 'number' && isFinite(strength) ? strength : 1;
    var aspect = canvas.clientWidth / canvas.clientHeight;
    var centerX = 0.2 + Math.random() * 0.6;
    var centerY = 0.25 + Math.random() * 0.5;
    var petals = Math.max(3, Math.round(6 * scale));
    for (var i = 0; i < petals; i++) {
      var angle = i / petals * Math.PI * 2 + Math.random();
      var radius = 0.05 + Math.random() * 0.05;
      addSplat(centerX + Math.cos(angle) * radius / aspect, centerY + Math.sin(angle) * radius,
        -Math.sin(angle) * 90 * scale, Math.cos(angle) * 90 * scale,
        inkColor(i), 0.03 * scale, 0.9 * scale);
    }
  }

  /* Ambient drift: only ever runs while "Living flow" is on. */
  function emit(dt) {
    var aspect = canvas.clientWidth / canvas.clientHeight;
    var energy = settings.energy;
    for (var i = 0; i < 3; i++) {
      var angle = time * 0.34 + i * Math.PI * 2 / 3;
      var radius = 0.18 + Math.sin(time * 0.27 + i) * 0.06;
      var x = 0.48 + Math.cos(angle) * radius / aspect;
      var y = 0.51 + Math.sin(angle * 1.2 + i * 0.4) * radius;
      var speed = resources.velocity.read.height * 0.36 * dt * energy;
      addSplat(x, y, -Math.sin(angle) * speed, Math.cos(angle) * speed,
        inkColor((i + Math.floor(time / 12)) % 4), 0.021, dt * 1.9 * energy);
    }
  }

  function step(dt) {
    var velocity = resources.velocity, dye = resources.dye;
    var curl = resources.curl, divergence = resources.divergence, pressure = resources.pressure;
    var texel = [1 / velocity.read.width, 1 / velocity.read.height];
    draw('advect', velocity.write, { velocity: velocity.read, source: velocity.read },
      { texel: texel, dt: dt, decay: 0.18 });
    swap(velocity);
    draw('curl', curl, { velocity: velocity.read }, { texel: texel });
    draw('vorticity', velocity.write, { velocity: velocity.read, curl: curl },
      { texel: texel, dt: dt, strength: settings.swirl });
    swap(velocity);
    draw('divergence', divergence, { velocity: velocity.read }, { texel: texel });
    clearTarget(pressure.read);
    var iterations = qualities[settings.quality].iterations;
    for (var i = 0; i < iterations; i++) {
      draw('pressure', pressure.write, { pressure: pressure.read, divergence: divergence }, { texel: texel });
      swap(pressure);
    }
    draw('project', velocity.write, { velocity: velocity.read, pressure: pressure.read }, { texel: texel });
    swap(velocity);
    draw('advect', dye.write, { velocity: velocity.read, source: dye.read },
      { texel: texel, dt: dt, decay: 1 / settings.lifetime });
    swap(dye);
  }

  function render() {
    var dye = resources.dye, glowField = resources.bloom;
    if (settings.glow) {
      draw('copy', glowField.read, { source: dye.read });
      for (var i = 0; i < 2; i++) {
        draw('blur', glowField.write, { source: glowField.read }, { direction: [1 / glowField.read.width, 0] });
        swap(glowField);
        draw('blur', glowField.write, { source: glowField.read }, { direction: [0, 1 / glowField.read.height] });
        swap(glowField);
      }
    }
    draw('display', null, { dye: dye.read, bloom: glowField.read }, {
      texel: [1 / dye.read.width, 1 / dye.read.height],
      glow: settings.glow ? 1 : 0,
    });
    dirty = false;
  }
function writeImage() {
    savePending = false;
    try {
      render(); // Capture in the same task, without preserveDrawingBuffer's ongoing cost.
      canvas.toBlob(function (blob) {
        if (!blob) { hooks.announce('Image could not be saved. Please try again.'); return; }
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'punjabi-rewind-ink-' + Date.now() + '.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
        hooks.announce('Image saved');
      }, 'image/png');
    } catch (error) {
      hooks.announce('Image could not be saved. Please try again.');
    }
  }

  function frame(now) {
    if (lost) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { previousTime = 0; fpsTime = now; frameCount = 0; return; }
    // Limit GPU work to about 60 Hz even on ProMotion displays.
    var elapsed = previousTime ? now - previousTime : 16.67;
    if (elapsed < 15) return;
    previousTime = now;
    try {
      if (resizePending) resize();
      while (pendingBlooms > 0) { bloom(); pendingBlooms--; }
      var queued = splats.splice(0);
      for (var i = 0; i < queued.length; i++) addSplat.apply(null, queued[i]);
      if (!paused) {
        var dt = Math.min(elapsed / 1000, 1 / 30);
        time += dt;
        if (settings.autoflow) emit(dt);
        step(dt);
        dirty = true;
        frameCount++;
      }
      if (dirty) render();
      if (savePending) writeImage();
      if (now - fpsTime > 1000) {
        hooks.status(paused ? 'PAUSED · WEBGL 2'
          : Math.round(frameCount * 1000 / (now - fpsTime)) + ' FPS · WEBGL 2');
        frameCount = 0;
        fpsTime = now;
      }
    } catch (error) { fail(error); }
  }

  function fail(error) {
    if (window.console && console.error) console.error(error);
    lost = true;
    cancelAnimationFrame(raf);
    hooks.status('GPU UNAVAILABLE');
    hooks.error(error.message || 'The simulation could not start.');
  }

  function position(event) {
    var rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height];
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', function (event) {
      if (event.button !== 0 || lost || !resources) return;
      var point = position(event);
      var color = inkColor();
      pointers.set(event.pointerId, { x: point[0], y: point[1], color: color });
      try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* not fatal */ }
      splats.push([point[0], point[1], 0, 0, color]);
      hooks.stir();
    });

    canvas.addEventListener('pointermove', function (event) {
      var pointer = pointers.get(event.pointerId);
      if (!pointer || !resources || lost) return;
      var point = position(event);
      var dx = point[0] - pointer.x, dy = point[1] - pointer.y;
      var aspect = canvas.clientWidth / canvas.clientHeight;
      var segments = Math.min(8, Math.max(1,
        Math.ceil(Math.hypot(dx * aspect, dy) / 0.012)));
      for (var i = 1; i <= segments && splats.length < 48; i++) {
        splats.push([
          pointer.x + dx * i / segments,
          pointer.y + dy * i / segments,
          Math.max(-400, Math.min(400, dx * resources.velocity.read.width * 12)) / segments,
          Math.max(-400, Math.min(400, dy * resources.velocity.read.height * 12)) / segments,
          pointer.color, settings.brush / 1000, 0.45 / Math.sqrt(segments),
        ]);
      }
      pointer.x = point[0];
      pointer.y = point[1];
    });

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) {
      canvas.addEventListener(name, function (event) { pointers.delete(event.pointerId); });
    });
    window.addEventListener('blur', function () { pointers.clear(); });
    window.addEventListener('resize', function () { resizePending = true; });
    window.addEventListener('orientationchange', function () { resizePending = true; });

    canvas.addEventListener('webglcontextlost', function (event) {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(raf);
      hooks.status('CONTEXT LOST');
      hooks.error('The graphics connection was interrupted. Reload to start a fresh simulation.');
    });
    canvas.addEventListener('webglcontextrestored', function () { window.location.reload(); });
  }
function init(options) {
    options = options || {};
    if (inited) return true;
    canvas = options.canvas || document.getElementById('fluid');
    if (!canvas) throw new Error('The ink canvas is missing from the page.');
    if (typeof options.onStatus === 'function') hooks.status = options.onStatus;
    if (typeof options.onAnnounce === 'function') hooks.announce = options.onAnnounce;
    if (typeof options.onStir === 'function') hooks.stir = options.onStir;
    if (typeof options.onError === 'function') hooks.error = options.onError;
    if (typeof options.onPause === 'function') hooks.pause = options.onPause;
    var overrides = options.settings || {};
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key) && key in settings) settings[key] = overrides[key];
    }

    bindInput();
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false, antialias: false, depth: false, stencil: false,
        preserveDrawingBuffer: false, powerPreference: 'high-performance',
      });
      if (!gl) throw new Error('This browser could not start WebGL 2.');
      if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('Floating-point render targets are unavailable.');
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      programs = {};
      for (var name in shaders) {
        if (Object.prototype.hasOwnProperty.call(shaders, name)) programs[name] = createProgram(shaders[name]);
      }
      inited = true;
      hooks.pause(paused);
      fpsTime = performance.now();
      raf = requestAnimationFrame(frame);
    } catch (error) {
      fail(error);
    }
    return inited;
  }

  function getState() {
    var state = {};
    for (var key in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) state[key] = settings[key];
    }
    state.paused = paused;
    state.lost = lost;
    return state;
  }

  function set(key, value) {
    if (!(key in settings)) return getState();
    if (key === 'quality' && settings.quality !== value) resizePending = true;
    if ((key === 'glow') || (key === 'palette')) dirty = true;
    settings[key] = value;
    return getState();
  }

  function clear(keepFlow) {
    if (!resources || lost) return getState();
    for (var key in resources) {
      if (!Object.prototype.hasOwnProperty.call(resources, key)) continue;
      if (resources[key].read) { clearTarget(resources[key].read); clearTarget(resources[key].write); }
      else clearTarget(resources[key]);
    }
    pendingBlooms = 0;
    splats.length = 0;
    dirty = true;
    if (keepFlow !== true) settings.autoflow = false;
    hooks.announce(keepFlow === true ? 'Canvas cleared.' : 'Canvas cleared. Living flow turned off.');
    return getState();
  }

  function togglePause() {
    paused = !paused;
    hooks.pause(paused);
    hooks.announce(paused ? 'Ink frozen' : 'Ink flowing');
    return paused;
  }

  function destroy() {
    cancelAnimationFrame(raf);
    if (gl && resources) {
      for (var key in resources) {
        if (!Object.prototype.hasOwnProperty.call(resources, key)) continue;
        if (resources[key].read) { releaseTarget(resources[key].read); releaseTarget(resources[key].write); }
        else releaseTarget(resources[key]);
      }
    }
    resources = null;
    inited = false;
  }

  window.PR.Fluid = {
    init: init,
    palettes: palettes,
    qualities: qualities,
    defaults: defaults,
    getState: getState,
    set: set,
    setPalette: function (name) { return set('palette', name); },
    setEnergy: function (value) { return set('energy', Math.max(0.2, Math.min(2.2, Number(value) || 1))); },
    bloom: function (count) {
      pendingBlooms = Math.min(pendingBlooms + (count || 1), 3);
      hooks.announce('Added a bloom');
    },
    pulse: pulse,
    clear: clear,
    togglePause: togglePause,
    isPaused: function () { return paused; },
    isReady: function () { return inited && !lost && !!resources; },
    save: function () {
      if (!resources || lost) return false;
      savePending = true;
      return true;
    },
    resize: function () { resizePending = true; },
    destroy: destroy,
  };
})();