// Hero background: slow water caustics, as if light were coming through the
// surface above. A WebGL fragment shader draws them at half resolution and a
// CSS blur softens the rest. Colours follow the site theme (--rgb-bg / --rgb-text).

(() => {
  const SPEED = 0.22;       // time scale of the whole pattern
  const SCALE = 0.5;        // render resolution relative to the screen
  const BLUR = 4;           // px, CSS blur on the canvas
  const FADE = 700;         // ms, colour fade when the theme changes

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  const VERT = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

  const DROPS = 12;         // pointer ripples alive at once

  const FRAG = `
    precision highp float;
    #define DROPS ${DROPS}
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec3 uBase;
    uniform vec3 uHi;
    uniform vec3 uShadow;
    uniform float uGain;   // strength of the bright lines
    uniform float uDip;    // strength of the slow shadows
    uniform float uDepth;  // first-visit intro: 0 = deep and dark, 1 = surface
    uniform float uClock;  // seconds since start, for the pointer ripples
    uniform vec4 uDrops[DROPS]; // x, y (centred, aspect-corrected), birth time, strength

    // Pointer ripples bend the surface: a ring travelling outwards plus a
    // short swirl where the cursor just passed
    vec2 disturb(vec2 q) {
      vec2 off = vec2(0.0);
      for (int k = 0; k < DROPS; k++) {
        vec4 dr = uDrops[k];
        if (dr.w <= 0.0) continue;
        float age = uClock - dr.z;
        if (age < 0.0 || age > 4.0) continue;
        vec2 dv = q - dr.xy;
        float d = length(dv) + 1e-4;
        float r = age * 0.32;
        float ring = exp(-pow((d - r) * 11.0, 2.0)) * sin((d - r) * 40.0);
        float stir = exp(-d * d * 70.0) * exp(-age * 3.0);
        float fade = exp(-age * 1.1) * dr.w;
        off += (dv / d) * (ring * 0.011 + stir * 0.008) * fade;
      }
      return off;
    }

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }

    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }

    // Distance to the cell borders (F2 - F1) of an animated Voronoi
    float edge(vec2 x, float t) {
      vec2 n = floor(x), f = fract(x);
      float f1 = 8.0, f2 = 8.0;
      for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        o = 0.5 + 0.42 * sin(t + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; }
        else if (d < f2) { f2 = d; }
      }
      return sqrt(f2) - sqrt(f1);
    }

    float caustic(vec2 p, float t) {
      // surface swell bends the network into soft lines
      vec2 w = vec2(vnoise(p * 0.6 + t * 0.15), vnoise(p * 0.6 - t * 0.12 + 7.3)) - 0.5;
      p += w * 0.9;
      float a = edge(p, t);
      float b = edge(p * 1.35 + vec2(3.1, 1.7), t * 1.15 + 2.0);
      float la = pow(1.0 - smoothstep(0.0, 0.28, a), 3.0);
      float lb = pow(1.0 - smoothstep(0.0, 0.24, b), 3.0);
      return la * 0.55 + lb * 0.35 + la * lb * 1.4;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
      p += disturb(p);

      // projected at an angle, like light raking across a wall
      float ang = -0.42;
      p = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p;
      // portrait screens: a slightly denser network so the cells keep their size
      p *= vec2(2.3, 3.3) * max(1.0, 0.65 / aspect);

      float t = uTime;

      // slight chromatic dispersion
      vec2 off = vec2(0.018, 0.0);
      vec3 c = vec3(caustic(p + off, t), caustic(p, t), caustic(p - off, t));

      // broad slow shadows: the swell defocusing the light
      float s = smoothstep(0.35, 0.85, vnoise(p * 0.35 + vec2(t * 0.05, -t * 0.04)));

      // light falls from the top-right corner and fades out diagonally
      // towards the bottom left, where the intro text sits
      vec2 corner = vec2(aspect, 1.0);
      float d = distance(uv * corner, corner) / length(corner);
      float mask = 1.0 - smoothstep(0.0, 0.95, d);
      mask = pow(mask, 1.4);

      vec3 col = uBase * mix(0.35, 1.0, uDepth);
      col *= mix(vec3(1.0), uShadow, s * uDip * mask * mix(1.5, 1.0, uDepth));
      col += uHi * c * uGain * mask * mix(0.15, 1.0, uDepth);
      col *= 1.0 - (1.0 - c.g) * 0.035 * mask;

      // melt into the page at the bottom of the hero
      float alpha = smoothstep(0.0, 0.28, uv.y);
      gl_FragColor = vec4(col * alpha, alpha);
    }`;

  let canvas, gl, uni = {}, frameId = null, visible = true, lastWidth = 0, ready = false;

  // First visit: the hero rises from the deep (dark, blurred, the light
  // moving faster) while the dictionary entry writes itself
  const RISE = 1.4;          // s
  let rise = null;           // { t0 } while rising
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  function riseK(now) {
    if (!rise) return 1;
    const k = easeOut(Math.min(1, (now - rise.t0) / 1000 / RISE));
    if (k >= 1) {
      rise = null;
      canvas.style.filter = `blur(${BLUR}px)`;
    } else {
      canvas.style.filter = `blur(${BLUR + 14 * (1 - k)}px)`;
    }
    return k;
  }
  const t0 = performance.now();

  // Palette, derived from the theme colours
  let pal = null, from = null, to = null, fadeStart = 0;

  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    const rgb = name => css.getPropertyValue(name).split(",").map(v => parseFloat(v) / 255);
    const bg = rgb("--rgb-bg");
    const text = rgb("--rgb-text");
    if (bg.length !== 3 || bg.some(isNaN)) return pal || null;
    const lum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
    if (lum < 0.5) {
      // dark: pale aqua glints over the deep blue
      const aqua = [0.62, 0.86, 0.84];
      return {
        base: bg,
        hi: aqua.map((v, i) => v * 0.7 + (text[i] || v) * 0.3),
        shadow: bg.map(v => v * 0.45),
        gain: 0.11,
        dip: 0.55,
      };
    }
    // light: warm white glints, cool teal shadows on the sand
    return {
      base: bg,
      hi: [1.0, 0.99, 0.96],
      shadow: [bg[0] * 0.78, bg[1] * 0.86, bg[2] * 0.88],
      gain: 0.08,
      dip: 0.4,
    };
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

  function applyPalette(now) {
    if (from) {
      let k = Math.min(1, (now - fadeStart) / FADE);
      k = k * k * (3 - 2 * k);
      pal = {
        base: lerp3(from.base, to.base, k),
        hi: lerp3(from.hi, to.hi, k),
        shadow: lerp3(from.shadow, to.shadow, k),
        gain: lerp(from.gain, to.gain, k),
        dip: lerp(from.dip, to.dip, k),
      };
      if (k >= 1) from = null;
    }
    gl.uniform3fv(uni.uBase, pal.base);
    gl.uniform3fv(uni.uHi, pal.hi);
    gl.uniform3fv(uni.uShadow, pal.shadow);
    gl.uniform1f(uni.uGain, pal.gain);
    gl.uniform1f(uni.uDip, pal.dip);
  }

  function onThemeChange() {
    const next = readPalette();
    if (!next) return;
    from = pal;
    to = next;
    fadeStart = performance.now();
    if (reduceMotion.matches || frameId === null) {
      // not animating: jump to the new colours
      from = null;
      pal = next;
      draw(performance.now());
    }
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function resize() {
    // clientWidth excludes the classic scrollbar (Windows), innerWidth does not
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    lastWidth = width;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(width * dpr * SCALE));
    const h = Math.max(1, Math.round(height * dpr * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uni.uRes, w, h);
    }
  }

  function onWindowResize() {
    // On phones the address bar changes the height while scrolling: ignore it
    if (coarsePointer.matches && document.documentElement.clientWidth === lastWidth) return;
    resize();
    if (frameId === null) draw(performance.now());
  }

  // ----- Pointer ripples -----
  const drops = new Float32Array(DROPS * 4);
  let nextDrop = 0;
  let lastPointer = null; // { x, y, t } in canvas pixels / ms

  const clock = now => (now - t0) / 1000;

  function addDrop(clientX, clientY, strength) {
    const rect = canvas.getBoundingClientRect();
    const u = (clientX - rect.left) / rect.width;
    const v = 1 - (clientY - rect.top) / rect.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) return;
    const aspect = rect.width / rect.height;
    const i = nextDrop * 4;
    drops[i] = (u - 0.5) * aspect;
    drops[i + 1] = v - 0.5;
    drops[i + 2] = clock(performance.now());
    drops[i + 3] = strength;
    nextDrop = (nextDrop + 1) % DROPS;
  }

  // A drop every few pixels of travel, stronger when the cursor moves fast
  function onPointerMove(e) {
    if (reduceMotion.matches || frameId === null) return;
    const now = performance.now();
    if (lastPointer) {
      const dist = Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
      const dt = now - lastPointer.t;
      if (dist < 28 && dt < 400) return;
      const speed = dt > 0 ? dist / dt : 0; // px per ms
      addDrop(e.clientX, e.clientY, Math.min(0.8, 0.2 + speed * 0.25));
    }
    lastPointer = { x: e.clientX, y: e.clientY, t: now };
  }

  function onPointerDown(e) {
    if (reduceMotion.matches || frameId === null) return;
    addDrop(e.clientX, e.clientY, 1.3);
  }

  function draw(now) {
    applyPalette(now);
    gl.uniform1f(uni.uClock, clock(now));
    gl.uniform4fv(uni.uDrops, drops);
    const k = riseK(now);
    gl.uniform1f(uni.uDepth, k);
    gl.uniform1f(uni.uTime, 12.0 + clock(now) * SPEED + 0.3 * k);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    draw(now);
    frameId = requestAnimationFrame(loop);
  }

  // Only animate while the hero is on screen and the tab is in front
  function syncLoop() {
    const run = visible && !document.hidden && !reduceMotion.matches;
    if (run && frameId === null) {
      frameId = requestAnimationFrame(loop);
    } else if (!run && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function init() {
    canvas = document.getElementById("header-canvas");
    if (!canvas) return;
    // failIfMajorPerformanceCaveat: no context when Chrome would render on the CPU
    gl = canvas.getContext("webgl", {
      antialias: false, alpha: true, premultipliedAlpha: true,
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return; // no (hardware) WebGL: the hero keeps its plain background

    // Software renderers (SwiftShader, llvmpipe: headless test robots, machines
    // without GPU acceleration) take hundreds of ms per frame on this shader and
    // freeze the page: keep the plain background there too
    try {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return;
    } catch (e) {}

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const name of ["uRes", "uTime", "uBase", "uHi", "uShadow", "uGain", "uDip", "uClock", "uDrops", "uDepth"]) {
      uni[name] = gl.getUniformLocation(prog, name);
    }

    pal = readPalette();
    if (!pal) return;

    // Position the canvas behind the hero text
    Object.assign(canvas.style, {
      position: "absolute",
      top: 0,
      left: 0,
      pointerEvents: "none",
      filter: `blur(${BLUR}px)`,
      opacity: 0,
      transition: reduceMotion.matches ? "none" : "opacity 2s ease",
    });

    resize();
    draw(performance.now());
    requestAnimationFrame(() => { canvas.style.opacity = 1; });

    window.addEventListener("resize", onWindowResize);

    // The canvas lets clicks through to the text, so listen on the page
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    // The theme toggle rewrites --rgb-bg / --rgb-text on <html>: follow it
    new MutationObserver(onThemeChange)
      .observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncLoop();
    }).observe(canvas);
    document.addEventListener("visibilitychange", syncLoop);
    reduceMotion.addEventListener?.("change", () => { syncLoop(); draw(performance.now()); });

    syncLoop();
    ready = true;
  }

  // ----- First-visit intro -----
  // <head> adds html.intro on the first visit to the home page (unless the
  // visitor prefers reduced motion), which hides the entry until it starts
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

  function show(el, k, dy) {
    el.style.opacity = k;
    el.style.filter = k < 1 ? `blur(${(1 - k) * 4}px)` : "";
    if (dy) el.style.transform = k < 1 ? `translateY(${(1 - k) * dy}px)` : "";
  }

  // Wrap the nodes of el before / after the first <br> in two spans
  function splitAtBreak(el) {
    const parts = [document.createElement("span"), document.createElement("span")];
    let i = 0;
    [...el.childNodes].forEach(node => {
      if (node.nodeName === "BR" && i === 0) { i = 1; return; }
      parts[i].appendChild(node);
    });
    const br = el.querySelector("br");
    el.prepend(parts[0]);
    el.append(parts[1]);
    if (br) el.insertBefore(br, parts[1]);
    return parts.filter(p => p.childNodes.length);
  }

  function runIntro() {
    const root = document.documentElement;
    const p = document.querySelector('#introduction [data-i18n="introText"]');
    if (!p || !root.classList.contains("intro")) return;
    const original = p.innerHTML;

    const word = p.querySelector(".dict-word");
    const meta = p.querySelector(".dict-meta");
    const def = p.querySelector(".dict-def");
    const fields = p.querySelector(".intro-fields");
    const sea = fields && fields.querySelector("em");
    if (!word || !meta || !def || !fields || !sea) { root.classList.remove("intro"); return; }

    word.innerHTML = [...word.textContent].map(ch => `<span class="intro-ch">${ch}</span>`).join("");
    const chars = [...word.children];
    const lines = splitAtBreak(def);
    const rest = document.createElement("span");
    [...fields.childNodes].filter(n => n !== sea).forEach(n => rest.appendChild(n));
    fields.prepend(rest);

    const pieces = [...chars, meta, ...lines, rest, sea];
    pieces.forEach(el => { el.style.opacity = 0; });
    root.classList.remove("intro");

    const t0 = performance.now();
    if (ready) {
      canvas.style.transition = "none";
      canvas.style.opacity = 1;
      rise = { t0 };
      draw(t0);
    }
    const lead = ready ? 0.6 : 0;   // the entry starts while the light comes up
    let seaDrop = false, done = false, raf = 0;

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach(e => window.removeEventListener(e, finish));
      if (rise) { rise = null; canvas.style.filter = `blur(${BLUR}px)`; }
      // back to the plain markup, unless the language changed meanwhile
      if (p.contains(chars[0])) p.innerHTML = original;
    }

    function step(now) {
      const t = (now - t0) / 1000 - lead;
      chars.forEach((c, i) => show(c, easeOut(seg(t, i * 0.065, i * 0.065 + 0.2)), 6));
      show(meta, easeOut(seg(t, 0.55, 0.8)));
      lines.forEach((l, i) => show(l, easeOut(seg(t, 0.75 + i * 0.22, 1.1 + i * 0.22))));
      show(rest, easeOut(seg(t, 1.3, 1.6)));
      show(sea, easeOut(seg(t, 1.75, 2.0)));
      if (t >= 1.8 && !seaDrop) {
        seaDrop = true;
        const r = sea.getBoundingClientRect();
        if (ready && frameId !== null) addDrop(r.left + r.width / 2, r.top + r.height / 2, 1.1);
      }
      if (t >= 2.05) finish();
      else raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);

    // Any click, key or scroll skips to the end
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(e => window.addEventListener(e, finish, { passive: true }));
  }

  function boot() {
    init();
    runIntro();
  }

  // Start once the page has loaded and the browser is idle, so compiling the
  // shader and the first frames never compete with the first render (the canvas
  // fades in over 2 s anyway)
  function start() {
    const intro = document.documentElement.classList.contains("intro");
    if ("requestIdleCallback" in window) requestIdleCallback(boot, { timeout: intro ? 300 : 1500 });
    else setTimeout(boot, 200);
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
