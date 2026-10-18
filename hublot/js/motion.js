// Accéléromètre : orientation physique du téléphone (rotation des photos,
// des vidéos et des icônes) et niveau d'horizon.

const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export class Motion {
  constructor() {
    this.onGravity = () => {}; // (roulis en degrés, à plat ?)
    this.enabled = false;
  }

  // À appeler depuis un geste utilisateur (iOS demande la permission)
  async enable() {
    if (this.enabled) return true;
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try { if (await DeviceMotionEvent.requestPermission() !== 'granted') return false; }
      catch { return false; }
    }
    window.addEventListener('devicemotion', e => {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x == null) return;
      const s = isIOS ? -1 : 1; // iOS inverse le signe par rapport à Android/spécification
      const gx = g.x * s, gy = g.y * s, gz = g.z * s;
      const roll = Math.atan2(gx, gy) * 180 / Math.PI; // 0 = portrait droit, 90 = haut vers la gauche
      const flat = Math.abs(gz) > 0.85 * Math.hypot(gx, gy, gz);
      this.onGravity(roll, flat);
    });
    this.enabled = true;
    return true;
  }
}
