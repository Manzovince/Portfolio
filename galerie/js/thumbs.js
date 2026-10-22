// Vignettes des espèces pour le carnet, rendues hors écran une seule fois.
import { THREE, renderer, U } from './gfx.js?v=1';
import { speciesModel } from './species.js?v=1';

const S = 160, rt = new THREE.WebGLRenderTarget(S, S), scn = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .01, 100);
scn.add(new THREE.HemisphereLight('#ffffff', '#b8a888', 1.6));
const dl = new THREE.DirectionalLight('#ffffff', 2.2); dl.position.set(3, 5, 4); scn.add(dl);
const cache = {}, buf = new Uint8Array(S * S * 4), cv = document.createElement('canvas'); cv.width = cv.height = S;
const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S);
const LUT = new Uint8Array(256).map((_, i) => { const c = i / 255; return Math.round(255 * (c <= .0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - .055)); });

export function thumb(id) {
  if (cache[id]) return cache[id];
  const m = speciesModel(id, { shadow: false }); m.rotation.y = -Math.PI / 2 - .6; scn.add(m);
  const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
  const d = r / Math.sin(THREE.MathUtils.degToRad(15)) * 1.05;
  cam.position.set(c.x + d * .25, c.y + d * .6, c.z + d * .85).sub(c).normalize().multiplyScalar(d).add(c); cam.lookAt(c);
  const curve = U.uCurve.value, ow = U.uOW.value; U.uCurve.value = 0; U.uOW.value = r * .025;
  const prevBg = scn.background; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.render(scn, cam); renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf); renderer.setRenderTarget(null);
  U.uCurve.value = curve; U.uOW.value = ow; scn.background = prevBg; scn.remove(m);
  for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = LUT[img.data[i]]; img.data[i + 1] = LUT[img.data[i + 1]]; img.data[i + 2] = LUT[img.data[i + 2]]; }
  ctx.putImageData(img, 0, 0);
  return cache[id] = cv.toDataURL('image/png');
}
