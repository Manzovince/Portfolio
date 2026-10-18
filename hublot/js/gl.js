// Rendu WebGL : une seule passe qui recadre, tourne et corrige les couleurs.
// Sert au viseur (à chaque image) et à la photo finale (pleine résolution).

const VS = `
attribute vec2 p;
uniform vec2 crop;     // part de la source gardée, dans l'espace de sortie
uniform vec4 rot;      // matrice 2x2 (a b / c d) : sortie -> source
uniform float mirror;  // -1 pour inverser horizontalement (caméra avant)
varying vec2 uv;
void main() {
  vec2 o = vec2(p.x * 0.5 * mirror, -p.y * 0.5) * crop;
  vec2 s = vec2(rot.x * o.x + rot.y * o.y, rot.z * o.x + rot.w * o.y);
  uv = s + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FS = `
precision highp float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec3 gain;
uniform vec3 offs;
uniform float sat;
void main() {
  vec3 c = texture2D(tex, uv).rgb * gain + offs;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, sat);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// Quart de tour dans le sens antihoraire -> matrice sortie -> source (repère y vers le bas)
const ROT = [
  [1, 0, 0, 1],
  [0, -1, 1, 0],
  [-1, 0, 0, -1],
  [0, 1, -1, 0],
];

export class Renderer {
  constructor(canvas, { preserve = false } = {}) {
    this.canvas = canvas;
    const opts = { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: preserve, premultipliedAlpha: false };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) throw new Error('WebGL indisponible');
    this.gl = gl;
    this.maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    }
    gl.linkProgram(prog);
    gl.useProgram(prog);
    this.u = {};
    for (const n of ['crop', 'rot', 'mirror', 'gain', 'offs', 'sat']) this.u[n] = gl.getUniformLocation(prog, n);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  /**
   * source : vidéo, canvas ou ImageBitmap de taille sw × sh
   * quarter : quarts de tour antihoraires appliqués à l'image
   * cover : recadre la source pour remplir la sortie (viseur) ; sinon la sortie doit avoir le ratio de la source
   */
  draw(source, sw, sh, params, { quarter = 0, cover = true, mirror = false } = {}) {
    const { gl, canvas } = this;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);

    let cx = 1, cy = 1;
    if (cover) {
      const srcA = quarter % 2 ? sh / sw : sw / sh;
      const dstA = canvas.width / canvas.height;
      if (srcA > dstA) cx = dstA / srcA; else cy = srcA / dstA;
    }
    gl.uniform2f(this.u.crop, cx, cy);
    gl.uniform4fv(this.u.rot, ROT[((quarter % 4) + 4) % 4]);
    gl.uniform1f(this.u.mirror, mirror ? -1 : 1);
    gl.uniform3fv(this.u.gain, params.gain);
    gl.uniform3fv(this.u.offs, params.offs);
    gl.uniform1f(this.u.sat, params.sat);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
