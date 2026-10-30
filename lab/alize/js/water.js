import * as THREE from 'three';
import { U } from './util.js?v=1';

// Houle : somme de sinus, partagée entre le shader et la physique du bateau.
const WAVES = [
  [1.0, 0.3, 62, 0.32],
  [-0.45, 1.0, 38, 0.2],
  [0.8, -0.65, 24, 0.1],
  [0.25, 0.95, 95, 0.28],
].map(([dx, dz, L, A]) => {
  const l = Math.hypot(dx, dz), k = (2 * Math.PI) / L;
  return { dx: dx / l, dz: dz / l, k, A, w: Math.sqrt(9.8 * k) * 0.55 };
});

export const waveState = { scale: 1 };

export function waveHeight(x, z, t) {
  let h = 0;
  for (const w of WAVES) h += w.A * Math.sin(w.k * (w.dx * x + w.dz * z) + w.w * t);
  return h * waveState.scale;
}

const f = (n) => n.toFixed(6);
const waveGLSL = WAVES.map((w) => `{
    float ph = ${f(w.k)} * dot(vec2(${f(w.dx)}, ${f(w.dz)}), wp.xz) + ${f(w.w)} * uTime;
    h += ${f(w.A)} * sin(ph);
    float c = ${f(w.A * w.k)} * cos(ph);
    gx += c * ${f(w.dx)}; gz += c * ${f(w.dz)};
  }`).join('\n');

const SIZE = 1800, SEG = 200;
const HM = 160, SPAN = 800;

const VERT = /* glsl */`
uniform float uTime;
uniform float uScale;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFogDepth;
varying float vH;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float h = 0.0, gx = 0.0, gz = 0.0;
  ${waveGLSL}
  h *= uScale; gx *= uScale; gz *= uScale;
  wp.y = h;
  vH = h;
  vWorld = wp.xyz;
  vNormal = normalize(vec3(-gx, 1.0, -gz));
  vec4 mv = viewMatrix * wp;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform float uScale;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform vec3 uSunDir;
uniform float uSunUp;
uniform sampler2D tHM;
uniform vec2 uHMOrigin;
uniform float uHMSpan;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFogDepth;
varying float vH;

// Hash sans sin() (D. Hoskins), replié sur une période : stable loin de l'origine.
float h21(vec2 p) {
  p = mod(p, 1024.0);
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 p = vWorld.xz;
  vec2 huv = (p - uHMOrigin) / uHMSpan;
  float g = -10.0;
  if (huv.x > 0.0 && huv.y > 0.0 && huv.x < 1.0 && huv.y < 1.0) g = texture2D(tHM, huv).r * 14.0 - 10.0;

  // Hauts-fonds en trois paliers.
  float s = smoothstep(-8.0, -1.2, g);
  s = floor(s * 3.0 + 0.5) / 3.0;
  vec3 col = mix(uDeep, uShallow, s);

  // Facettes de houle, côté soleil / côté ombre.
  float tilt = dot(vNormal.xz, normalize(uSunDir.xz + 1e-4));
  col *= tilt < -0.035 ? 0.9 : (tilt > 0.05 ? 1.05 : 1.0);

  // Écume en haute mer : bords de cellules, par plaques.
  vec2 q = p * 0.07 + vec2(uTime * 0.02, uTime * 0.008);
  q += (vec2(vnoise(p * 0.035), vnoise(p * 0.035 + 17.0)) - 0.5) * 1.3;
  // Volutes : courbes de niveau d'un bruit lisse, trait d'environ un pixel à l'écran.
  float sw = vnoise(q) * 0.65 + vnoise(q * 2.1 + 5.0) * 0.35;
  float e = abs(sw - 0.5);
  float w = min(0.035, fwidth(sw) * 0.8 + 0.004);
  float m = vnoise(p * 0.009 + uTime * 0.006);
  float cut = vnoise(p * 0.1 + uTime * 0.05);
  float foam = step(e, w) * step(0.62, m) * step(0.4, cut);

  // Rouleaux qui avancent vers le rivage, puis frange blanche.
  float band = smoothstep(-2.6, -1.8, g);
  float rings = step(fract(g * 0.55 - uTime * 0.22 + vnoise(p * 0.15) * 0.45), 0.22);
  foam = max(foam, band * rings);
  foam = max(foam, step(-0.5 + vnoise(p * 0.3 + uTime * 0.4) * 0.3, g));
  col = mix(col, uFoam, foam);

  // Éclats de soleil.
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal + vec3(vnoise(p * 0.9 + uTime * 0.7) - 0.5, 0.0, vnoise(p.yx * 0.9 - uTime * 0.6) - 0.5) * 0.3);
  float sp = dot(reflect(-V, n), uSunDir);
  col = mix(col, uFoam * 1.15, step(0.993, sp) * uSunUp);

  col = mix(col, fogColor, smoothstep(fogNear, fogFar, vFogDepth));
  gl_FragColor = vec4(col, 0.0);
}`;

export class Water {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    this.hmData = new Uint8Array(HM * HM * 4);
    this.hmTex = new THREE.DataTexture(this.hmData, HM, HM);
    this.hmTex.magFilter = this.hmTex.minFilter = THREE.LinearFilter;
    this.hmTex.needsUpdate = true;
    this.hmOrigin = new THREE.Vector2(1e9, 1e9);
    this.uniforms = {
      uTime: U.uTime, fogColor: U.fogColor, fogNear: U.fogNear, fogFar: U.fogFar,
      uScale: { value: 1 },
      uDeep: { value: new THREE.Color('#1a7ad4') },
      uShallow: { value: new THREE.Color('#40dcd2') },
      uFoam: { value: new THREE.Color('#ffffff') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunUp: { value: 1 },
      tHM: { value: this.hmTex },
      uHMOrigin: { value: this.hmOrigin },
      uHMSpan: { value: SPAN },
    };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  follow(px, pz, heightAt) {
    const s = SIZE / SEG;
    this.mesh.position.set(Math.round(px / s) * s, 0, Math.round(pz / s) * s);
    this.uniforms.uScale.value = waveState.scale;

    // Carte des fonds autour du bateau, recalculée par pas de SPAN/8.
    const snap = SPAN / 8;
    const ox = Math.round(px / snap) * snap - SPAN / 2;
    const oz = Math.round(pz / snap) * snap - SPAN / 2;
    if (ox === this.hmOrigin.x && oz === this.hmOrigin.y) return;
    this.hmOrigin.set(ox, oz);
    const d = this.hmData, step = SPAN / HM;
    for (let j = 0; j < HM; j++) {
      for (let i = 0; i < HM; i++) {
        const h = heightAt(ox + (i + 0.5) * step, oz + (j + 0.5) * step);
        const v = Math.max(0, Math.min(255, Math.round(((h + 10) / 14) * 255)));
        const k = (j * HM + i) * 4;
        d[k] = v; d[k + 1] = v; d[k + 2] = v; d[k + 3] = 255;
      }
    }
    this.hmTex.needsUpdate = true;
  }

  setColors(pal, sunDir, sunUp) {
    this.uniforms.uDeep.value.copy(pal.deep);
    this.uniforms.uShallow.value.copy(pal.shal);
    this.uniforms.uFoam.value.copy(pal.foam);
    this.uniforms.uSunDir.value.copy(sunDir);
    this.uniforms.uSunUp.value = sunUp;
  }
}
