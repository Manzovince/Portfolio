// Scène sous-marine de synthèse, utilisée quand aucune caméra n'est disponible
// (ordinateur, navigateur sans permission) pour essayer l'interface et la correction.

export function createDemo(w = 1440, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  const fish = Array.from({ length: 7 }, (_, i) => ({
    x: Math.random() * w, y: h * (0.3 + Math.random() * 0.45), s: 0.6 + Math.random() * 0.8,
    v: (0.4 + Math.random()) * (i % 2 ? 1 : -1), c: ['#ff5a2a', '#ffcc00', '#ff2d6f', '#ff8c1a'][i % 4],
  }));

  function drawFish(f, t) {
    ctx.save();
    ctx.translate(f.x, f.y + Math.sin(t / 600 + f.x) * 8);
    ctx.scale(f.s * Math.sign(f.v), f.s);
    ctx.fillStyle = f.c;
    ctx.beginPath(); ctx.ellipse(0, 0, 60, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-95, -30); ctx.lineTo(-95, 30); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-8, -26, 10, 52);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(34, -6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function frame(t) {
    // Vraies couleurs…
    ctx.globalCompositeOperation = 'source-over';
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#9fd8ff'); sky.addColorStop(1, '#3a6f9a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e9d3a3';
    ctx.beginPath(); ctx.moveTo(0, h * 0.82);
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * 0.82 + Math.sin(x / 90) * 18);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    // corail
    ctx.fillStyle = '#ff6b4a';
    for (let i = 0; i < 9; i++) {
      const x = 120 + i * 150, y = h * 0.84;
      ctx.beginPath(); ctx.ellipse(x, y, 30 + (i % 3) * 14, 70 + (i % 4) * 20, 0, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.arc(w * 0.72, h * 0.78, 60, 0, Math.PI * 2); ctx.fill();
    for (const f of fish) {
      f.x += f.v * 2; if (f.x > w + 120) f.x = -120; if (f.x < -120) f.x = w + 120;
      drawFish(f, t);
    }
    // … puis l'eau : rouge absorbé, voile bleu-vert
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(70, 175, 215)'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgb(0, 45, 70)'; ctx.fillRect(0, 0, w, h);
    // rayons de lumière
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(80, 160, 180, 0.06)';
    for (let i = 0; i < 4; i++) {
      const x = (i * 380 + t / 30) % (w + 400) - 200;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 120, 0); ctx.lineTo(x + 360, h); ctx.lineTo(x + 180, h); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  frame(0);
  return { canvas, width: w, height: h, tick: frame };
}
