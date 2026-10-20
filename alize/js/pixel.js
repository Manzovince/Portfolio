import * as THREE from 'three';

// Nombre de « gros pixels » sur le petit côté de l'écran.
const TARGET = 200;

const FRAG = /* glsl */`
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 rtSize;
uniform float px;
uniform vec2 offset;
uniform float near;
uniform float far;
uniform float ortho;

float lin(float d) {
  if (ortho > 0.5) return near + d * (far - near);
  float z = d * 2.0 - 1.0;
  return 2.0 * near * far / (far + near - z * (far - near));
}
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 toSRGB(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 c = gl_FragCoord.xy / px + 1.0 + offset;
  vec2 t = floor(c);
  vec2 e = 1.0 / rtSize;
  vec2 uv = (t + 0.5) * e;
  vec4 col = texture2D(tColor, uv);

  // Contour d'un pixel, côté objet proche, là où la profondeur casse (alpha 0 = pas de contour).
  if (col.a > 0.5) {
    float dc = lin(texture2D(tDepth, uv).r);
    float dl = lin(texture2D(tDepth, uv - vec2(e.x, 0.0)).r);
    float dr = lin(texture2D(tDepth, uv + vec2(e.x, 0.0)).r);
    float dd = lin(texture2D(tDepth, uv - vec2(0.0, e.y)).r);
    float du = lin(texture2D(tDepth, uv + vec2(0.0, e.y)).r);
    float edge;
    if (ortho > 0.5) {
      edge = step(1.4, dl + dr + du + dd - 4.0 * dc);
    } else {
      // 1/z est linéaire à l'écran sur un plan : seul un vrai saut de profondeur passe le seuil.
      float wc = 1.0 / dc;
      float s = 1.0 / dl + 1.0 / dr + 1.0 / du + 1.0 / dd - 4.0 * wc;
      edge = step(0.22 * wc, -s);
    }
    col.rgb *= 1.0 - 0.45 * edge;
  }

  vec3 s = toSRGB(col.rgb);
  s = floor(s * 28.0 + bayer4(t)) / 28.0;
  gl_FragColor = vec4(s, 1.0);
}`;

export class PixelPipeline {
  constructor(renderer) {
    this.r = renderer;
    const ext = renderer.extensions;
    this.halfFloat = renderer.capabilities.isWebGL2 &&
      (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
    this.offset = new THREE.Vector2();
    this.rt = null;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tDepth: { value: null },
        rtSize: { value: new THREE.Vector2(1, 1) }, px: { value: 1 },
        offset: { value: this.offset },
        near: { value: 1 }, far: { value: 1000 }, ortho: { value: 0 },
      },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FRAG,
      depthTest: false, depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.qScene = new THREE.Scene();
    this.qScene.add(quad);
    this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  resize() {
    const devW = this.r.domElement.width, devH = this.r.domElement.height;
    this.px = Math.max(1, Math.round(Math.min(devW, devH) / TARGET));
    this.w = Math.ceil(devW / this.px);
    this.h = Math.ceil(devH / this.px);
    // 1 pixel de marge de chaque côté pour le décalage sous-pixel de la caméra iso.
    this.rtW = this.w + 2;
    this.rtH = this.h + 2;
    if (this.rt) this.rt.dispose();
    const depth = new THREE.DepthTexture(this.rtW, this.rtH);
    this.rt = new THREE.WebGLRenderTarget(this.rtW, this.rtH, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      type: this.halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthTexture: depth, depthBuffer: true,
    });
    const u = this.mat.uniforms;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = depth;
    u.rtSize.value.set(this.rtW, this.rtH);
    u.px.value = this.px;
  }

  get aspect() { return this.rtW / this.rtH; }

  render(scene, camera) {
    const u = this.mat.uniforms;
    u.near.value = camera.near;
    u.far.value = camera.far;
    u.ortho.value = camera.isOrthographicCamera ? 1 : 0;
    this.r.setRenderTarget(this.rt);
    this.r.render(scene, camera);
    this.r.setRenderTarget(null);
    this.r.render(this.qScene, this.qCam);
  }
}
