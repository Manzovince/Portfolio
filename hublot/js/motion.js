// Capteurs de mouvement : gestes de déclenchement, niveau et orientation physique.
// Sous l'eau, l'écran tactile ne répond plus : c'est le corps du téléphone qui sert de bouton.

const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const lerp = (a, b, t) => a + (b - a) * t;

export class Motion {
  constructor() {
    this.mode = 'off';         // off | knock | twist
    this.sens = 5;             // 1..10
    this.onTrigger = () => {};
    this.onMeter = () => {};   // (ratio valeur / seuil)
    this.onGravity = () => {}; // (roulis en degrés, à plat ?)
    this.enabled = false;

    this.prev = null;
    this.knocks = [];
    this.twistPeak = null;     // { sign, t }
    this.settling = null;      // attente que le téléphone se stabilise
    this.cooldownUntil = 0;
    this.handler = e => this.handle(e);
  }

  static needsPermission() {
    return typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
  }

  // À appeler depuis un geste utilisateur (iOS)
  async enable() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (Motion.needsPermission()) {
      try { if (await DeviceMotionEvent.requestPermission() !== 'granted') return false; }
      catch { return false; }
    }
    if (!this.enabled) window.addEventListener('devicemotion', this.handler);
    this.enabled = true;
    return true;
  }

  get threshold() {
    const t = (this.sens - 1) / 9;
    return this.mode === 'knock' ? lerp(22, 4, t) : lerp(520, 160, t);
  }

  handle(e) {
    const now = e.timeStamp || performance.now();
    const g = e.accelerationIncludingGravity;
    if (g && g.x != null) {
      const s = isIOS ? -1 : 1; // iOS inverse le signe par rapport à Android/spécification
      const gx = g.x * s, gy = g.y * s, gz = g.z * s;
      const roll = Math.atan2(gx, gy) * 180 / Math.PI; // 0 = portrait droit, 90 = haut vers la gauche
      const flat = Math.abs(gz) > 0.85 * Math.hypot(gx, gy, gz);
      this.onGravity(roll, flat);
    }
    if (this.mode === 'off') return;

    const rr = e.rotationRate || {};
    const a = e.acceleration;

    // Après un geste, on attend que le téléphone soit immobile pour une photo nette
    if (this.settling) {
      const rot = Math.hypot(rr.alpha || 0, rr.beta || 0, rr.gamma || 0);
      const acc = a && a.x != null ? Math.hypot(a.x, a.y, a.z) : 0;
      const calm = rot < 40 && acc < 1.5;
      if (calm) this.settling.calmSince ??= now; else this.settling.calmSince = null;
      if ((this.settling.calmSince && now - this.settling.calmSince > 140) || now - this.settling.t > 900) {
        this.settling = null;
        this.cooldownUntil = now + 900;
        this.onTrigger();
      }
      return;
    }

    let value = 0;
    if (this.mode === 'knock') {
      // Un toc sur la coque = pic de variation brutale d'accélération
      if (a && a.x != null) {
        if (this.prev) value = Math.hypot(a.x - this.prev.x, a.y - this.prev.y, a.z - this.prev.z);
        this.prev = { x: a.x, y: a.y, z: a.z };
      }
      if (now > this.cooldownUntil && value > this.threshold) {
        const last = this.knocks[this.knocks.length - 1];
        if (!last || now - last > 90) {
          this.knocks = this.knocks.filter(t => now - t < 700);
          this.knocks.push(now);
          if (this.knocks.length >= 2 && now - this.knocks[this.knocks.length - 2] > 110) {
            this.knocks = [];
            this.settling = { t: now, calmSince: null };
          }
        }
      }
    } else if (this.mode === 'twist') {
      // Tourner le poignet comme une clé, aller-retour (axe perpendiculaire à l'écran)
      const r = rr.alpha || 0;
      value = Math.abs(r);
      const thr = this.threshold;
      if (now > this.cooldownUntil) {
        if (this.twistPeak && now - this.twistPeak.t > 750) this.twistPeak = null;
        if (value > thr && !this.twistPeak) this.twistPeak = { sign: Math.sign(r), t: now };
        else if (this.twistPeak && Math.sign(r) === -this.twistPeak.sign && value > thr * 0.6) {
          this.twistPeak = null;
          this.settling = { t: now, calmSince: null };
        }
      }
    }
    this.onMeter(value / this.threshold);
  }
}
