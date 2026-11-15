// 3D deck preview (Three.js, loaded only when the 3D tab opens).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const W = 2.5, D = 3.5; // playing-card proportions (63 × 88 mm)
const DUR = 1150;

function backTexture() {
  const c = document.createElement('canvas');
  c.width = 250; c.height = 350;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ec';
  g.fillRect(0, 0, 250, 350);
  g.strokeStyle = '#1d1d1b';
  g.lineWidth = 2;
  g.strokeRect(16, 16, 218, 318);
  g.save();
  g.beginPath(); g.rect(24, 24, 202, 302); g.clip();
  g.lineWidth = 1; g.globalAlpha = 0.35;
  for (let x = -350; x < 250; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 350, 350); g.stroke(); }
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export function createDeck3D(container, { onPick }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(5, 12, 7);
  scene.add(sun);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.5, D * 1.35),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.005;
  scene.add(shadow);

  const faceMat = new THREE.MeshStandardMaterial({ map: backTexture(), roughness: 0.85 });
  let geo = null, cards = [], n = 0, thick = 0.06;
  let anim = null, active = false, follow = null;

  function build(count) {
    cards.forEach((m) => { scene.remove(m); m.material[0].dispose(); });
    geo?.dispose();
    n = count;
    thick = Math.min(0.075, 3.4 / n);
    geo = new THREE.BoxGeometry(W, thick * 0.97, D);
    cards = Array.from({ length: n }, () => {
      const side = new THREE.MeshStandardMaterial({ roughness: 0.55 });
      const m = new THREE.Mesh(geo, [side, side, faceMat, faceMat, side, side]);
      // a real deck is never perfectly squared
      m.userData = { jx: (Math.random() - 0.5) * 0.05, jz: (Math.random() - 0.5) * 0.05, ry: (Math.random() - 0.5) * 0.02, y: 0, x: 0 };
      scene.add(m);
      return m;
    });
    resetView();
  }

  function resetView() {
    const hgt = n * thick;
    controls.target.set(0, hgt / 2, 0);
    camera.position.set(7.5, hgt / 2 + 5.5, 9.5);
    controls.update();
  }

  const yOf = (pos) => (n - 1 - pos) * thick + thick / 2;

  function place(m, x, y, pulled) {
    const u = m.userData;
    m.position.set(x + u.jx, y, u.jz + (pulled ? 0.9 : 0));
    m.rotation.y = u.ry;
  }

  // deck: card ids top→bottom; prev: previous deck (animate from it) or null;
  // color(id) → css colour; groups(id) → [index, count] for the fly-out
  function set({ deck, prev, color, groups, follow: f }) {
    if (deck.length !== n) { build(deck.length); prev = null; }
    follow = f;
    const pos = new Int32Array(n);
    deck.forEach((c, i) => (pos[c] = i));
    cards.forEach((m, c) => {
      m.material[0].color.set(color(c));
      m.material[0].emissive.set(c === follow ? 0x333333 : 0x000000);
    });
    if (prev) {
      const old = new Int32Array(n);
      prev.forEach((c, i) => (old[c] = i));
      const plan = cards.map((m, c) => {
        const [g, count] = groups(c);
        const spread = count > 1 ? (g / (count - 1)) * 2 - 1 : 0;
        return { from: yOf(old[c]), to: yOf(pos[c]), out: spread * Math.min(3, 1.4 + count * 0.4), delay: (n - 1 - pos[c]) / Math.max(1, n - 1) };
      });
      anim = { plan, t0: performance.now() };
    } else {
      anim = null;
      cards.forEach((m, c) => place(m, 0, yOf(pos[c]), c === follow));
    }
    if (!active) renderer.render(scene, camera);
  }

  function step(now) {
    if (!anim) return;
    const t = clamp01((now - anim.t0) / DUR);
    cards.forEach((m, c) => {
      const p = anim.plan[c];
      const out = ease(clamp01(t / 0.28)); // packets spread apart
      const back = ease(clamp01((t - 0.3 - p.delay * 0.42) / 0.28)); // and drop back, bottom card first
      const x = p.out * out * (1 - back);
      const lift = Math.sin(Math.PI * back) * 0.25;
      place(m, x, p.from + (p.to - p.from) * back + lift, c === follow);
    });
    if (t >= 1) anim = null;
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function frame(now) {
    controls.update();
    step(now);
    renderer.render(scene, camera);
  }

  function setActive(on) {
    active = on;
    renderer.setAnimationLoop(on ? frame : null);
    if (on) resize();
  }

  // click (not drag) picks a card
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(cards)[0];
    onPick(hit ? cards.indexOf(hit.object) : null);
  });

  return { set, setActive, resetView };
}
