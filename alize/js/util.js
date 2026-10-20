import * as THREE from 'three';

// Uniforms partagés par tous les shaders maison (temps, brouillard).
export const U = {
  uTime: { value: 0 },
  fogColor: { value: new THREE.Color() },
  fogNear: { value: 180 },
  fogFar: { value: 520 },
};

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

let gradientMap = null;
export function gradient() {
  if (!gradientMap) {
    const d = new Uint8Array([72, 72, 72, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
    gradientMap = new THREE.DataTexture(d, 3, 1);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

// Matériau cel-shading à aplats : 3 paliers de lumière, facettes plates.
export function toon(color = 0xffffff, opts = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient(), ...opts });
  m.flatShading = true;
  return m;
}

export function M(p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  if (typeof s === 'number') s = [s, s, s];
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
    new THREE.Vector3(...s),
  );
}

// Géométrie non indexée, transformée, avec une couleur de sommet uniforme et des normales de face.
export function bake(geo, color, matrix) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (matrix) g.applyMatrix4(matrix);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  const n = g.attributes.position.count;
  const c = new THREE.Color(color);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export function merge(geos) {
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

// Matériau non éclairé qui écrit alpha = 0 : la passe pixel ne lui trace pas de contour
// (écume, sillage, traînées de vent).
export function markerMat(color, fog = true) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      fogColor: U.fogColor, fogNear: U.fogNear, fogFar: U.fogFar,
      uFog: { value: fog ? 1 : 0 },
    },
    vertexShader: /* glsl */`
      varying float vFog;
      void main() {
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        #endif
        vec4 mv = modelViewMatrix * p;
        vFog = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform vec3 fogColor;
      uniform float fogNear; uniform float fogFar; uniform float uFog;
      varying float vFog;
      void main() {
        float f = uFog * smoothstep(fogNear, fogFar, vFog);
        gl_FragColor = vec4(mix(uColor, fogColor, f), 0.0);
      }`,
  });
}
