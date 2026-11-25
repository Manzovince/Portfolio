/* Progrès — tableau de bord course & apnée (données : window.DATA, généré par tools/extract.py) */
(function () {
  const D = window.DATA;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------------ formats
  const fmtT = (s, dec) => {
    if (s == null || isNaN(s)) return '—';
    const neg = s < 0; s = Math.abs(s);
    let h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    let ss = dec ? x.toFixed(1).padStart(4, '0') : String(Math.round(x)).padStart(2, '0');
    if (!dec && ss === '60') { ss = '00'; m++; if (m === 60) { m = 0; h++; } }
    return (neg ? '−' : '') + (h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`);
  };
  const fmtPace = spk => spk ? fmtT(spk) + '/km' : '—';
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const fmtD = d => { d = new Date(d); return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
  const fmtDL = d => { d = new Date(d); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const km = m => (m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const pct = (v, d = 0) => (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: d }) + ' %';
  const parseT = s => { // "3:15" | "195" | "1:02:03"
    s = String(s).trim().replace(',', '.'); if (!s) return null;
    const p = s.split(':').map(Number); if (p.some(isNaN)) return null;
    return p.reduce((a, v) => a * 60 + v, 0);
  };
  const median = a => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const quant = (a, q) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const i = (b.length - 1) * q, lo = Math.floor(i); return b[lo] + (b[Math.min(lo + 1, b.length - 1)] - b[lo]) * (i - lo); };
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const DAY = 864e5;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // ------------------------------------------------------------------ onglets
  const tabs = document.querySelectorAll('.tabs button');
  function go(name) {
    tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach(s => s.classList.toggle('on', s.id === name));
    try { localStorage.setItem('progres.tab', name); } catch (e) { }
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    window.dispatchEvent(new Event('resize'));
  }
  tabs.forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
  document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.go); scrollTo(0, 0); }));

  $('gen').textContent = fmtDL(D.generated);

  // ================================================================== COURSE
  const runs = D.runs.map(r => Object.assign({}, r, { t: new Date(r.local).getTime() }));
  const DISTS = [
    { k: '400', m: 400, l: '400 m' }, { k: '800', m: 800, l: '800 m' }, { k: '1000', m: 1000, l: '1 km' },
    { k: '1609', m: 1609.34, l: '1 mile' }, { k: '3000', m: 3000, l: '3 km' }, { k: '5000', m: 5000, l: '5 km' },
    { k: '10000', m: 10000, l: '10 km' }, { k: '15000', m: 15000, l: '15 km' }, { k: '21097', m: 21097.5, l: 'Semi' },
  ];
  const lastPred = D.pred.length ? D.pred[D.pred.length - 1] : null; // [date, [5k,10k,half,mara]]
  const potential = d => {
    if (!lastPred) return null;
    const [p5, p10, ph] = lastPred[1];
    if (d.k === '5000') return p5; if (d.k === '10000') return p10; if (d.k === '21097') return ph;
    return p5 * Math.pow(d.m / 5000, 1.06);
  };

  // progression des records + événements
  const prEvents = []; // {t, dist, time, prev, run}
  const prog = {};
  DISTS.forEach(d => {
    let best = null; prog[d.k] = [];
    runs.forEach(r => {
      const b = r.best[d.k]; if (!b) return;
      const rec = best == null || b.t < best;
      prog[d.k].push({ x: r.t, y: b.t, run: r, b, rec, prev: best });
      if (rec) { prEvents.push({ t: r.t, d, time: b.t, prev: best, run: r }); best = b.t; }
    });
    d.pr = best;
    d.prRun = prog[d.k].filter(p => p.rec).pop();
    d.pot = potential(d);
  });
  prEvents.sort((a, b) => a.t - b.t);
  runs.forEach(r => r.prs = prEvents.filter(e => e.run === r));

  // ---------- tuiles
  const now = Math.max(Date.now(), runs.length ? runs[runs.length - 1].t : 0);
  const kmIn = (a, b) => runs.filter(r => r.t >= now - a * DAY && r.t < now - b * DAY).reduce((s, r) => s + r.dist, 0);
  const k28 = kmIn(28, 0), k28p = kmIn(56, 28);
  const vo2 = D.vo2, vLast = vo2.length ? vo2[vo2.length - 1][1] : null, vFirst = vo2.length ? vo2[0][1] : null;
  const year = new Date().getFullYear();
  const prYear = prEvents.filter(e => e.prev != null && new Date(e.t).getFullYear() === year).length;
  const lastPR = prEvents.filter(e => e.prev != null).pop();
  $('sub').textContent = `${runs.length} sorties course · ${D.dives.length} sessions d'apnée · ${D.dives.reduce((s, d) => s + d.n, 0)} plongées`;
  $('runTiles').innerHTML = [
    ['VO2max', vLast ?? '—', vFirst != null ? `${vLast - vFirst >= 0 ? '+' : ''}${vLast - vFirst} depuis ${fmtD(vo2[0][0])}` : ''],
    ['Prédiction 5 km', lastPred ? fmtT(lastPred[1][0]) : '—', `record actuel ${fmtT(DISTS[5].pr)}`],
    ['Records battus en ' + year, prYear, lastPR ? `dernier : ${lastPR.d.l}, ${fmtD(lastPR.t)}` : ''],
    ['4 dernières semaines', km(k28) + ' km', `${k28 >= k28p ? '+' : '−'}${km(Math.abs(k28 - k28p))} km vs les 4 d'avant`],
  ].map(([l, v, d]) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('');

  // ---------- tableau des records
  let selDist = '5000';
  function renderPR() {
    const maxGap = Math.max(...DISTS.filter(d => d.pr && d.pot).map(d => (d.pr - d.pot) / d.pot), 0.01);
    $('prTable').innerHTML = `<thead><tr><th>Distance</th><th class="num">Record</th><th class="num">Allure</th><th>Date</th><th>Terrain</th><th class="num">Potentiel</th><th>Marge</th><th class="num">Prochaine cible</th></tr></thead><tbody>` +
      DISTS.map(d => {
        if (!d.pr) return `<tr class="click${d.k === selDist ? ' sel' : ''}" data-k="${d.k}"><td>${d.l}</td><td class="num muted" colspan="7">jamais couru d'une traite</td></tr>`;
        const gap = d.pot ? (d.pr - d.pot) / d.pot : null;
        const target = targetFor(d);
        const r = d.prRun.run, b = d.prRun.b;
        return `<tr class="click${d.k === selDist ? ' sel' : ''}" data-k="${d.k}">
          <td>${d.l}</td><td class="num">${fmtT(d.pr)}</td><td class="num">${fmtPace(d.pr / d.m * 1000)}</td>
          <td>${fmtD(r.t)}</td><td>${r.trail ? `<span class="badge">trail · ${b.up} m D+</span>` : '<span class="badge">route</span>'}</td>
          <td class="num">${d.pot ? fmtT(d.pot) : '—'}</td>
          <td>${gap != null ? `<span class="gap"><i style="width:${Math.max(3, gap / maxGap * 60)}px"></i>${gap > 0 ? '+' : ''}${pct(gap)}</span>` : ''}</td>
          <td class="num"><b>${fmtT(target)}</b> <span class="muted">${fmtPace(target / d.m * 1000)}</span></td></tr>`;
      }).join('') + '</tbody>';
    $('prTable').querySelectorAll('tr[data-k]').forEach(tr => tr.addEventListener('click', () => { selDist = tr.dataset.k; renderPR(); renderProg(); }));
  }
  (function garminNote() {
    const map = { 'Best 1km Run': '1000', 'Best 1mile Run': '1609', 'Best 5km Run': '5000', 'Best 10km Run': '10000', 'Best Half Marathon': '21097' };
    const notes = D.garminPR.filter(g => g.cur && map[g.type]).map(g => ({ g, d: DISTS.find(d => d.k === map[g.type]) }))
      .filter(x => x.d.pr && x.g.v < x.d.pr * 0.95);
    if (notes.length) {
      const p = document.createElement('p'); p.className = 'hint';
      p.innerHTML = notes.map(x => `Garmin affiche ${x.d.l} en ${fmtT(x.g.v)} (${fmtD(new Date(x.g.date))}) : la montre était restée allumée en voiture ou à vélo (segment à plus de 23 km/h), il est ignoré ici.`).join(' ');
      $('prTable').closest('.card').querySelector('.card-h').appendChild(p);
    }
  })();
  function targetFor(d) {
    if (!d.pr) return null;
    const gap = d.pot ? d.pr - d.pot : 0;
    let t = gap > d.pr * 0.02 ? d.pr - gap * 0.5 : d.pr * 0.985;
    const q = d.m <= 1000 ? 1 : d.m <= 5000 ? 5 : 15;
    return Math.floor(t / q) * q;
  }

  function renderProg() {
    const d = DISTS.find(x => x.k === selDist);
    $('progTitle').textContent = `Progression ${d.l}`;
    const P = prog[d.k];
    const road = P.filter(p => !p.run.trail), trail = P.filter(p => p.run.trail);
    const recs = P.filter(p => p.rec);
    $('progLegend').innerHTML = `<span><i class="dot" style="background:var(--s1)"></i>Route</span><span><i class="dot" style="background:var(--s2)"></i>Trail</span><span><i style="background:var(--s3)"></i>Record</span><span><i style="background:var(--text-muted)"></i>Potentiel (pointillé)</span>`;
    const tipF = p => `<b>${fmtT(p.y, d.m <= 1000)}</b> · ${fmtPace(p.y / d.m * 1000)}<br>${fmtDL(p.x)} — ${esc(p.run.name)}<br>FC ${p.b.hr ?? '—'} · ${p.b.up} m D+ · dès le km ${p.b.at.toLocaleString('fr-FR')}${p.rec ? '<br><b>Record</b>' + (p.prev ? ` (−${fmtT(p.prev - p.y, d.m <= 1000)})` : ' (premier)') : ''}`;
    Charts.line('progChart', {
      time: true, invert: true, yTime: true, yFmt: v => fmtT(v), height: 240,
      series: [
        { name: 'Record', color: 'var(--s3)', step: true, points: recs.map(p => ({ x: p.x, y: p.y })), line: true },
        { name: 'Route', color: 'var(--s1)', line: false, dots: true, points: road },
        { name: 'Trail', color: 'var(--s2)', line: false, dots: true, points: trail },
      ],
      refs: d.pot ? [{ y: d.pot, label: 'potentiel ' + fmtT(d.pot) }] : [],
      tip: (p, s) => p.run ? tipF(p) : `Record : <b>${fmtT(p.y)}</b><br>${fmtDL(p.x)}`,
      onClick: p => p.run && openRun(p.run),
    });
  }

  // ---------- records par mois
  function renderPRMonth() {
    if (!runs.length) return;
    const start = new Date(runs[0].t); start.setDate(1);
    const items = [];
    for (const m = new Date(start); m <= new Date(now); m.setMonth(m.getMonth() + 1)) {
      const ev = prEvents.filter(e => { const x = new Date(e.t); return x.getFullYear() === m.getFullYear() && x.getMonth() === m.getMonth(); });
      const imp = ev.filter(e => e.prev != null);
      items.push({
        label: MONTHS[m.getMonth()], y: ev.length,
        tip: `<b>${MONTHS[m.getMonth()]} ${m.getFullYear()}</b> : ${ev.length} record${ev.length > 1 ? 's' : ''}<br>` +
          (ev.length ? ev.map(e => `${e.d.l} ${fmtT(e.time)}${e.prev ? ` (−${fmtT(e.prev - e.time)})` : ' (1ʳᵉ fois)'}`).join('<br>') : 'aucun') + (imp.length < ev.length ? '' : ''),
      });
    }
    Charts.columns('prMonth', { items, height: 220, valueLabels: true });
  }

  // ---------- conseils course
  function renderRunAdvice() {
    const out = [];
    const soft = DISTS.filter(d => d.pr && d.pot).map(d => ({ d, gap: (d.pr - d.pot) / d.pot })).sort((a, b) => b.gap - a.gap);
    const s3 = soft.slice(0, 3);
    if (s3.length) out.push(`<b>Records les plus « mous » :</b> ${s3.map(s => `${s.d.l} (record ${fmtT(s.d.pr)}, potentiel ~${fmtT(s.d.pot)}, soit ${fmtPace(s.d.pot / s.d.m * 1000)})`).join(', ')}. Ils datent souvent d'une sortie qui n'était pas une tentative : une sortie dédiée, sur un parcours plat, devrait suffire.`);
    const d10 = DISTS.find(d => d.k === '10000'), d5 = DISTS.find(d => d.k === '5000');
    if (d10.pr && d10.pot) {
      const target = targetFor(d10);
      out.push(`<b>10 km :</b> vise <b>${fmtT(target)}</b> (${fmtPace(target / 10000 * 1000)}) sur du plat. Ton record de ${fmtT(d10.pr)} date du ${fmtD(d10.prRun.x)} et ta VO2max a ${vLast >= vFirst ? 'progressé' : 'bougé'} depuis.`);
    }
    const d4 = DISTS.find(d => d.k === '400');
    if (d4.pr && d5.pr) {
      const ratio = (d5.pr / 5000) / (d4.pr / 400);
      const g4 = d4.pot ? (d4.pr - d4.pot) / d4.pot : 0;
      if (ratio < 0.2 || g4 > 0.03) out.push(`<b>Vitesse :</b> ton allure sur 400 m (${fmtPace(d4.pr / 0.4)}) n'est que ${pct(ratio - 1)} plus rapide que sur 5 km : il te manque de la vitesse pure. Une séance par semaine de type 10 × 400 m (récup 1 min 30) ou 6 × 800 m fera tomber les records courts et nourrira le 5 km.`);
      else out.push(`<b>Vitesse :</b> tes records courts (400 m ${fmtT(d4.pr)}, 1 km ${fmtT(DISTS[2].pr)}) sont déjà au niveau de ton potentiel. Pour les battre, il faut de la vitesse spécifique : une séance par semaine de 10 × 400 m (récup 1 min 30) ou 6 × 800 m, sur du plat. C'est aussi ce qui fera baisser le 5 km.`);
    }
    // zones
    const recent = runs.filter(r => r.t >= now - 56 * DAY);
    const zs = [0, 0, 0, 0, 0]; recent.forEach(r => r.zones.forEach((v, i) => zs[i] += v));
    const tot = zs.reduce((a, b) => a + b, 0);
    if (tot) {
      const hard = (zs[3] + zs[4]) / tot, easy = (zs[0] + zs[1]) / tot;
      if (hard > 0.3) out.push(`<b>Intensité :</b> sur 8 semaines, ${pct(hard)} de ton temps est en zone 4–5 et seulement ${pct(easy)} en zone 1–2. Fais la majorité des sorties vraiment lentement (FC < ${D.zones ? D.zones.floors[2] : 144}) et garde l'intensité pour 1 ou 2 séances ciblées : tu récupéreras mieux et tu seras plus frais le jour d'une tentative de record.`);
      else out.push(`<b>Intensité :</b> ${pct(easy)} du temps en zone 1–2 sur 8 semaines, c'est une bonne base. Ajoute une séance de qualité par semaine.`);
    }
    const trailPR = DISTS.filter(d => d.prRun && d.prRun.run.trail);
    if (trailPR.length) out.push(`<b>Terrain :</b> ${trailPR.map(d => d.l).join(', ')} ${trailPR.length > 1 ? 'ont été établis' : 'a été établi'} en trail. Tu peux les battre sur route sans gagner en forme. Repère une boucle plate et mesurée (un front de mer, une piste) pour tes tentatives.`);
    const lastAcwr = D.load.length ? D.load[D.load.length - 1][1] : null;
    if (lastAcwr && lastAcwr[0] != null && lastAcwr[1]) {
      const r = lastAcwr[0] / lastAcwr[1];
      out.push(`<b>Charge du moment :</b> ratio aiguë/chronique de ${r.toFixed(2).replace('.', ',')} ${r < 0.8 ? '(tu es reposé : bon moment pour une tentative, ou pour relancer le volume)' : r > 1.3 ? '(charge élevée : garde les tentatives pour après une semaine plus légère)' : '(zone saine)'}.`);
    }
    $('runAdvice').innerHTML = out.map(s => `<li>${s}</li>`).join('');
  }

  // ---------- volume hebdo
  function weekStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
  function renderWeekly() {
    if (!runs.length) return;
    const items = [];
    for (let w = weekStart(runs[0].t); w <= now; w += 7 * DAY) {
      const rr = runs.filter(r => r.t >= w && r.t < w + 7 * DAY);
      const dist = rr.reduce((s, r) => s + r.dist, 0), up = rr.reduce((s, r) => s + (r.up || 0), 0), time = rr.reduce((s, r) => s + r.time, 0);
      const d = new Date(w);
      items.push({
        label: d.getDate() <= 7 ? MONTHS[d.getMonth()] : '', y: dist / 1000,
        tip: `<b>Semaine du ${fmtD(w)}</b><br>${km(dist)} km · ${up} m D+ · ${fmtT(time)}<br>${rr.length} sortie${rr.length > 1 ? 's' : ''}`,
      });
    }
    Charts.columns('weekly', { items, every: 1, height: 220, yFmt: v => Math.round(v) });
  }

  // ---------- zones
  function renderZones() {
    const ZC = ['#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#104281'];
    const INK = ['#0b0b0b', '#0b0b0b', '#fff', '#fff', '#fff'];
    const agg = rr => { const z = [0, 0, 0, 0, 0]; rr.forEach(r => r.zones.forEach((v, i) => z[i] += v)); return z; };
    const recent = runs.filter(r => r.t >= now - 56 * DAY), older = runs.filter(r => r.t < now - 56 * DAY);
    const f = D.zones ? D.zones.floors : null;
    const name = i => `Zone ${i + 1}` + (f ? ` (${f[i]}${i < 4 ? '–' + (f[i + 1] - 1) : '+'} bpm)` : '');
    const row = (label, z) => ({ label, parts: z.map((v, i) => ({ v, color: ZC[i], ink: INK[i], name: name(i) })) });
    Charts.stack('zones', { rows: [row('8 dernières sem.', agg(recent)), row('Avant', agg(older))], fmt: v => fmtT(v) });
    const lg = document.createElement('div'); lg.className = 'legend'; lg.style.marginTop = '8px';
    lg.innerHTML = ZC.map((c, i) => `<span><i class="dot" style="background:${c}"></i>Z${i + 1}</span>`).join('');
    $('zones').appendChild(lg);
  }

  // ---------- VO2 / prédiction / efficacité
  function renderVo2() {
    Charts.line('vo2', {
      time: true, height: 200, yFmt: v => Math.round(v),
      series: [{ name: 'VO2max', color: 'var(--s1)', step: true, extend: false, points: D.vo2.map(([d, v]) => ({ x: new Date(d).getTime(), y: v })) }],
      tip: p => `<b>VO2max ${p.y}</b><br>${fmtDL(p.x)}`,
    });
    const P = D.pred.map(([d, v]) => ({ x: new Date(d).getTime(), y: v[0] }));
    Charts.line('pred', {
      time: true, height: 200, yTime: true, yFmt: v => fmtT(v), invert: false, ml: 52,
      series: [{ name: 'Prédiction 5 km', color: 'var(--s1)', area: false, points: P }],
      refs: DISTS[5].pr ? [{ y: DISTS[5].pr, label: 'record ' + fmtT(DISTS[5].pr) }] : [],
      tip: p => `<b>${fmtT(p.y)}</b> prédit<br>${fmtDL(p.x)}`,
    });
    const E = runs.filter(r => r.gap && r.hr).map(r => ({ x: r.t, y: r.gap / (r.hr / 60), run: r }));
    const trend = E.map((p, i) => ({ x: p.x, y: mean(E.slice(Math.max(0, i - 4), i + 1).map(q => q.y)) }));
    Charts.line('eff', {
      time: true, height: 220, yFmt: v => v.toFixed(2).replace('.', ','),
      series: [
        { name: 'Tendance', color: 'var(--text-secondary)', points: trend },
        { name: 'Route', color: 'var(--s1)', line: false, dots: true, points: E.filter(p => !p.run.trail) },
        { name: 'Trail', color: 'var(--s2)', line: false, dots: true, points: E.filter(p => p.run.trail) },
      ],
      tip: (p, s) => p.run ? `<b>${p.y.toFixed(2).replace('.', ',')} m/battement</b><br>${fmtDL(p.x)} — ${esc(p.run.name)}<br>${km(p.run.dist)} km · FC ${p.run.hr} · ${fmtPace(1000 / p.run.gap)} ajustée` : `Tendance (5 sorties) : ${p.y.toFixed(2).replace('.', ',')}`,
      onClick: p => p.run && openRun(p.run),
    });
    const lg = document.createElement('div'); lg.className = 'legend';
    lg.innerHTML = `<span><i class="dot" style="background:var(--s1)"></i>Route</span><span><i class="dot" style="background:var(--s2)"></i>Trail</span><span><i style="background:var(--text-secondary)"></i>Moyenne des 5 dernières sorties</span>`;
    $('eff').before(lg);
  }

  // ---------- liste + détail
  let selRun = null;
  function renderRunTable() {
    $('runTable').innerHTML = `<thead><tr><th>Date</th><th>Sortie</th><th class="num">Distance</th><th class="num">Durée</th><th class="num">Allure</th><th class="num">D+</th><th class="num">FC moy.</th><th>Records</th></tr></thead><tbody>` +
      [...runs].reverse().map((r, i) => `<tr class="click${r === selRun ? ' sel' : ''}" data-i="${runs.length - 1 - i}">
        <td>${fmtD(r.t)}</td><td>${esc(r.name.replace(/ (Course à pied|Trail)$/, ''))} ${r.trail ? '<span class="badge">trail</span>' : ''}</td>
        <td class="num">${km(r.dist)} km</td><td class="num">${fmtT(r.time)}</td><td class="num">${fmtPace(r.time / r.dist * 1000)}</td>
        <td class="num">${r.up ?? '—'} m</td><td class="num">${r.hr ?? '—'}</td>
        <td>${r.prs.filter(e => e.prev != null).map(e => `<span class="badge">${e.d.l}</span>`).join(' ')}</td></tr>`).join('') + '</tbody>';
    $('runTable').querySelectorAll('tr[data-i]').forEach(tr => tr.addEventListener('click', () => openRun(runs[+tr.dataset.i])));
  }
  function openRun(r) {
    selRun = r; renderRunTable();
    const box = $('runDetail'); box.hidden = false;
    $('rdTitle').textContent = `${r.name} — ${fmtDL(r.t)}`;
    $('rdSub').innerHTML = `${km(r.dist)} km · ${fmtT(r.time)} · ${fmtPace(r.time / r.dist * 1000)} · ${r.up ?? 0} m D+ · FC ${r.hr ?? '—'} (max ${r.hrMax ?? '—'})${r.cad ? ` · cadence ${Math.round(r.cad)} pas/min` : ''}${r.te ? ` · effet aérobie ${r.te.toFixed(1).replace('.', ',')}` : ''}` +
      (r.prs.length ? `<br>Records : ${r.prs.map(e => `${e.d.l} ${fmtT(e.time)}${e.prev ? '' : ' (1ʳᵉ fois)'}`).join(' · ')}` : '');
    const prof = r.prof;
    const maxP = 900; // > 15:00/km : marche ou arrêt, coupé
    Charts.line('rdPace', {
      height: 200, invert: true, yTime: true, yFmt: v => fmtT(v), xFmt: v => v + ' km',
      series: [{ name: 'Allure', color: 'var(--s1)', points: prof.map(p => ({ x: p[0], y: p[1] && p[1] < maxP ? p[1] : null, hr: p[2] })) }],
      tip: p => `km ${p.x.toLocaleString('fr-FR')} : <b>${fmtPace(p.y)}</b>${p.hr ? ' · FC ' + p.hr : ''}`,
    });
    Charts.line('rdAlt', {
      height: 120, yFmt: v => Math.round(v), xFmt: v => v + ' km',
      series: [{ name: 'Altitude', color: 'var(--s3)', area: true, points: prof.map(p => ({ x: p[0], y: p[3] })) }],
      tip: p => `km ${p.x.toLocaleString('fr-FR')} : <b>${Math.round(p.y)} m</b>`,
    });
    Charts.line('rdHr', {
      height: 120, yFmt: v => Math.round(v), xFmt: v => v + ' km',
      series: [{ name: 'FC', color: 'var(--s2)', points: prof.map(p => ({ x: p[0], y: p[2] })) }],
      tip: p => `km ${p.x.toLocaleString('fr-FR')} : <b>${p.y} bpm</b>`,
    });
    const best = Math.min(...r.splits);
    Charts.columns('rdSplits', {
      height: 160, yTime: true, yFmt: v => fmtT(v),
      items: r.splits.map((s, i) => ({ label: String(i + 1), y: s, color: s === best ? 'var(--s3)' : 'var(--s1)', tip: `<b>km ${i + 1}</b> : ${fmtT(s)}${s === best ? ' (le plus rapide)' : ''}` })),
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderPR(); renderProg(); renderPRMonth(); renderRunAdvice(); renderWeekly(); renderZones(); renderVo2(); renderRunTable();

  // ================================================================== APNÉE
  const ses = D.dives.map(s => {
    const durs = s.dives.map(d => d[0]);
    return Object.assign({}, s, { t: new Date(s.date).getTime(), p90: quant(durs, 0.9), avgDur: mean(durs) });
  });
  const allDives = ses.flatMap(s => s.dives.map((d, i) => ({ dur: d[0], depth: d[1], surf: d[2], s, i })));
  const longest = allDives.reduce((a, b) => b.dur > a.dur ? b : a, allDives[0] || { dur: 0 });
  const deepest = allDives.reduce((a, b) => b.depth > a.depth ? b : a, allDives[0] || { depth: 0 });
  const firstN = ses.slice(0, 10), lastN = ses.slice(-10);
  const p90a = mean(firstN.map(s => s.p90)), p90b = mean(lastN.map(s => s.p90));

  $('diveTiles').innerHTML = [
    ['Plus longue apnée', fmtT(longest.dur), longest.s ? `${fmtD(longest.s.t)} · ${longest.depth.toFixed(1).replace('.', ',')} m` : ''],
    ['Profondeur max', deepest.depth.toFixed(1).replace('.', ',') + ' m', deepest.s ? `${fmtD(deepest.s.t)} · ${fmtT(deepest.dur)}` : ''],
    ['Apnée « habituelle » (p90)', fmtT(p90b), `10 dernières sessions · ${p90b >= p90a ? '+' : '−'}${fmtT(Math.abs(p90b - p90a))} vs les 10 premières`],
    ['Sessions en mer', ses.length, `${allDives.length} plongées · ${fmtT(allDives.reduce((a, d) => a + d.dur, 0))} sous l'eau`],
  ].map(([l, v, d]) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('');

  const sesTip = s => `<b>${fmtDL(s.t)}</b> — ${esc(s.loc || s.name)}${s.hunt ? ' (chasse)' : ''}<br>${s.n} plongées · plus longue ${fmtT(s.longest)} · p90 ${fmtT(s.p90)}<br>max ${s.maxDepth.toFixed(1).replace('.', ',')} m${s.temp ? ` · eau ${String(s.temp).replace('.', ',')} °C` : ''}`;
  $('durLegend').innerHTML = `<span><i class="dot" style="background:var(--s1)"></i>Plus longue de la session</span><span><i class="dot" style="background:var(--s2)"></i>90ᵉ centile</span><span><i style="background:var(--s1)"></i><i style="background:var(--s2)"></i>Moyennes glissantes (8 sessions)</span>`;
  const roll = (arr, key, n = 8) => arr.map((s, i) => ({ x: s.t, y: mean(arr.slice(Math.max(0, i - n + 1), i + 1).map(q => q[key])) }));
  Charts.line('durChart', {
    time: true, height: 240, yTime: true, yFmt: v => fmtT(v), yMin: 0,
    series: [
      { name: 'Plus longue', color: 'var(--s1)', line: false, dots: true, r: 3, points: ses.map(s => ({ x: s.t, y: s.longest, s })) },
      { name: 'p90', color: 'var(--s2)', line: false, dots: true, r: 3, points: ses.map(s => ({ x: s.t, y: s.p90, s })) },
      { name: 'Tendance plus longue', color: 'var(--s1)', points: roll(ses, 'longest') },
      { name: 'Tendance p90', color: 'var(--s2)', points: roll(ses, 'p90') },
    ],
    tip: (p, s) => p.s ? sesTip(p.s) : `${s.name} : <b>${fmtT(p.y)}</b><br>moyenne des 8 sessions jusqu'au ${fmtDL(p.x)}`,
    onClick: p => p.s && openSes(p.s),
  });
  const dl = document.createElement('div'); dl.className = 'legend';
  dl.innerHTML = `<span><i class="dot" style="background:var(--s1)"></i>Apnée</span><span><i class="dot" style="background:var(--s2)"></i>Chasse</span>`;
  $('depthChart').before(dl);
  Charts.line('depthChart', {
    time: true, height: 220, invert: true, yMin: 0, yFmt: v => v + ' m',
    series: [
      { name: 'Apnée', color: 'var(--s1)', line: false, dots: true, points: ses.filter(s => !s.hunt).map(s => ({ x: s.t, y: s.maxDepth, s })) },
      { name: 'Chasse', color: 'var(--s2)', line: false, dots: true, points: ses.filter(s => s.hunt).map(s => ({ x: s.t, y: s.maxDepth, s })) },
    ],
    tip: p => sesTip(p.s), onClick: p => openSes(p.s),
  });
  const hist = (vals, step, max, fmt) => {
    const n = Math.ceil(max / step), b = new Array(n).fill(0);
    vals.forEach(v => b[Math.min(n - 1, Math.floor(v / step))]++);
    return b.map((c, i) => ({ label: fmt(i * step), y: c, tip: `<b>${fmt(i * step)} – ${fmt((i + 1) * step)}</b> : ${c} plongée${c > 1 ? 's' : ''} (${pct(c / vals.length)})` }));
  };
  Charts.columns('depthHist', { height: 200, items: hist(allDives.map(d => d.depth), 2, Math.ceil((deepest.depth + 0.01) / 2) * 2, v => v + ' m') });
  Charts.columns('durHist', { height: 200, items: hist(allDives.map(d => d.dur), 10, Math.ceil((longest.dur + 0.01) / 10) * 10, v => fmtT(v)) });
  Charts.line('ratioChart', {
    time: true, height: 200, yMin: 0, yFmt: v => v.toFixed(1).replace('.', ',') + '×',
    series: [{ name: 'Ratio', color: 'var(--s1)', line: false, dots: true, points: ses.filter(s => s.ratio).map(s => ({ x: s.t, y: s.ratio, s })) }],
    refs: [{ y: 2, label: '2× minimum' }],
    tip: p => `<b>Repos ${p.y.toFixed(1).replace('.', ',')}× l'apnée</b><br>` + sesTip(p.s), onClick: p => openSes(p.s),
  });

  // conseils apnée
  (function () {
    const out = [];
    out.push(`<b>Statique et dynamique :</b> ton export Garmin ne les contient pas. Note chaque séance de piscine dans le <a href="#carnet" data-go2="carnet">Carnet</a> pour suivre tes records. Les tables CO2/O2 à sec (2 à 3 par semaine, jamais deux O2 de suite) font progresser le statique en quelques semaines ; le dynamique progresse surtout avec la technique (glisse, palmage lent, lestage neutre à 1–2 m) et la relaxation.`);
    if (p90a && p90b) out.push(`<b>Durée en mer :</b> ton apnée « habituelle » (p90) est passée de ${fmtT(p90a)} à ${fmtT(p90b)} entre tes 10 premières et tes 10 dernières sessions${p90b > p90a ? ' : la base progresse doucement' : ''}. Tes apnées en mer sont surtout courtes (chasse, exploration) : pour allonger le temps au fond, la progression viendra d'abord du statique et des tables, puis de la relaxation pendant la descente.`);
    const deep10 = allDives.filter(d => d.depth >= 10).length;
    out.push(`<b>Profondeur :</b> seulement ${deep10} plongées sur ${allDives.length} dépassent 10 m (${pct(deep10 / Math.max(1, allDives.length), 1)}). Pour gagner quelques mètres sans risque : travaille la compensation (Frenzel) à sec, descends le long d'un bout en immersion libre (FIM), par paliers de 1 à 2 m, avec un binôme qui te surveille depuis la surface. Le blocage vient le plus souvent des oreilles, pas du souffle.`);
    const med = median(ses.filter(s => s.ratio).map(s => s.ratio));
    const low = ses.filter(s => s.ratio && s.ratio < 2).length;
    if (med) out.push(`<b>Récupération :</b> ratio médian ${med.toFixed(1).replace('.', ',')}× ; ${low} session${low > 1 ? 's' : ''} sous 2×. Au-delà de 10 m ou des apnées longues, vise plutôt 3× et allonge encore le repos en fin de session.`);
    out.push(`<b>Sécurité :</b> jamais d'apnée seul dans l'eau, un binôme qui te regarde à chaque immersion (« un en bas, un en haut »), pas d'hyperventilation avant une apnée.`);
    $('diveAdvice').innerHTML = out.map(s => `<li>${s}</li>`).join('');
    $('diveAdvice').querySelectorAll('[data-go2]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go('carnet'); scrollTo(0, 0); }));
  })();

  const topRows = arr => `<thead><tr><th>Date</th><th>Lieu</th><th class="num">Durée</th><th class="num">Profondeur</th></tr></thead><tbody>` +
    arr.map(d => `<tr class="click" data-id="${ses.indexOf(d.s)}"><td>${fmtD(d.s.t)}</td><td>${esc(d.s.loc)}</td><td class="num">${fmtT(d.dur)}</td><td class="num">${d.depth.toFixed(1).replace('.', ',')} m</td></tr>`).join('') + '</tbody>';
  $('topDur').innerHTML = topRows([...allDives].sort((a, b) => b.dur - a.dur).slice(0, 10));
  $('topDepth').innerHTML = topRows([...allDives].sort((a, b) => b.depth - a.depth).slice(0, 10));
  [$('topDur'), $('topDepth')].forEach(t => t.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => openSes(ses[+tr.dataset.id]))));

  let selSes = null;
  function renderSesTable() {
    $('diveTable').innerHTML = `<thead><tr><th>Date</th><th>Lieu</th><th>Type</th><th class="num">Plongées</th><th class="num">Plus longue</th><th class="num">p90</th><th class="num">Prof. max</th><th class="num">Eau</th><th class="num">Repos/apnée</th></tr></thead><tbody>` +
      [...ses].reverse().map(s => `<tr class="click${s === selSes ? ' sel' : ''}" data-id="${ses.indexOf(s)}"><td>${fmtD(s.t)}</td><td>${esc(s.loc)}</td><td>${s.hunt ? 'chasse' : 'apnée'}</td>
        <td class="num">${s.n}</td><td class="num">${fmtT(s.longest)}</td><td class="num">${fmtT(s.p90)}</td><td class="num">${s.maxDepth.toFixed(1).replace('.', ',')} m</td>
        <td class="num">${s.temp ? String(s.temp).replace('.', ',') + ' °C' : '—'}</td><td class="num ${s.ratio && s.ratio < 2 ? 'warn' : ''}">${s.ratio ? s.ratio.toFixed(1).replace('.', ',') + '×' : '—'}</td></tr>`).join('') + '</tbody>';
    $('diveTable').querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => openSes(ses[+tr.dataset.id])));
  }
  function openSes(s) {
    selSes = s; renderSesTable();
    $('diveDetail').hidden = false;
    $('ddTitle').textContent = `${s.loc || s.name} — ${fmtDL(s.t)}`;
    $('ddSub').textContent = `${s.hunt ? 'Chasse' : 'Apnée'} · ${s.n} plongées · durée totale ${fmtT(s.total)}${s.temp ? ` · eau ${String(s.temp).replace('.', ',')} °C` : ''}${s.hrMin ? ` · FC min ${s.hrMin}` : ''}`;
    $('ddLegend').innerHTML = '';
    const box = $('ddChart'); box.innerHTML = '<h3>Durée de chaque apnée</h3><div id="ddDur" class="chart"></div><h3>Profondeur max</h3><div id="ddDep" class="chart"></div>';
    const tipD = (d, i) => `<b>Plongée ${i + 1}</b><br>${fmtT(d[0])} · ${d[1].toFixed(1).replace('.', ',')} m<br>repos avant : ${fmtT(d[2])}${d[5] ? ` · pause au fond ${d[5]} s` : ''}`;
    Charts.columns('ddDur', { height: 160, yTime: true, yFmt: v => fmtT(v), items: s.dives.map((d, i) => ({ label: String(i + 1), y: d[0], tip: tipD(d, i) })) });
    Charts.columns('ddDep', { height: 140, yFmt: v => v + ' m', items: s.dives.map((d, i) => ({ label: String(i + 1), y: d[1], color: 'var(--s3)', tip: tipD(d, i) })) });
    $('diveDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  renderSesTable();

  // ================================================================== CARNET
  const DISC = {
    STA: { l: 'Statique', unit: 't' }, DRY: { l: 'Statique à sec', unit: 't' },
    DYN: { l: 'Dynamique mono', unit: 'm' }, DYNB: { l: 'Dynamique bipalmes', unit: 'm' },
    DNF: { l: 'Sans palmes', unit: 'm' }, CWT: { l: 'Profondeur', unit: 'm' },
  };
  const KEY = 'progres.log.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { $('logErr').textContent = 'Impossible d\'enregistrer dans ce navigateur (navigation privée ?). Exporte tes données.'; } };
  let log = load();
  const fmtVal = (disc, v) => DISC[disc].unit === 't' ? fmtT(v) : (v.toLocaleString('fr-FR') + ' m');
  let selDisc = 'STA';

  const form = $('logForm');
  form.date.value = new Date().toISOString().slice(0, 10);
  const syncLabel = () => {
    const u = DISC[form.disc.value].unit;
    $('valLabel').textContent = u === 't' ? 'Durée (m:ss)' : form.disc.value === 'CWT' ? 'Profondeur (m)' : 'Distance (m)';
    form.val.placeholder = u === 't' ? '3:15' : form.disc.value === 'CWT' ? '15' : '75';
    form.val.inputMode = u === 't' ? 'text' : 'decimal';
  };
  form.disc.addEventListener('change', syncLabel); syncLabel();
  form.addEventListener('submit', e => {
    e.preventDefault(); $('logErr').textContent = '';
    const disc = form.disc.value, u = DISC[disc].unit;
    const v = u === 't' ? parseT(form.val.value) : parseFloat(form.val.value.replace(',', '.'));
    if (!v || v <= 0) { $('logErr').textContent = u === 't' ? 'Durée attendue au format m:ss, par exemple 3:15.' : 'Nombre de mètres attendu, par exemple 75.'; return; }
    log.push({ id: Date.now().toString(36), date: form.date.value, disc, val: v, where: form.where.value.trim(), note: form.note.value.trim() });
    save(log); selDisc = disc; form.val.value = ''; form.note.value = '';
    renderLog();
  });
  $('logExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(log, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `carnet-apnee-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('logImport').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const arr = JSON.parse(await f.text());
      if (!Array.isArray(arr)) throw 0;
      const ids = new Set(log.map(x => x.id)); let n = 0;
      arr.forEach(x => { if (x && DISC[x.disc] && x.val > 0 && x.date && !ids.has(x.id)) { log.push({ id: String(x.id || Math.random().toString(36).slice(2)), date: String(x.date).slice(0, 10), disc: x.disc, val: +x.val, where: String(x.where || ''), note: String(x.note || '') }); n++; } });
      save(log); renderLog(); $('logErr').textContent = `${n} entrée${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}.`;
    } catch (err) { $('logErr').textContent = 'Fichier non reconnu.'; }
    e.target.value = '';
  });

  const bestOf = disc => log.filter(x => x.disc === disc).reduce((a, x) => a == null || x.val > a.val ? x : a, null);
  function renderLog() {
    log.sort((a, b) => a.date.localeCompare(b.date));
    const tiles = ['STA', 'DYN', 'DYNB', 'CWT'].map(k => {
      const b = bestOf(k);
      let v = b ? fmtVal(k, b.val) : '—', d = b ? fmtDL(b.date) : 'pas encore noté';
      if (k === 'CWT' && (!b || b.val < deepest.depth)) { v = deepest.depth.toFixed(1).replace('.', ',') + ' m'; d = `montre Garmin, ${fmtD(deepest.s.t)}`; }
      return `<div class="tile"><div class="l">Record ${DISC[k].l.toLowerCase()}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
    });
    $('logTiles').innerHTML = tiles.join('');
    const used = Object.keys(DISC).filter(k => log.some(x => x.disc === k));
    if (!used.includes(selDisc)) used.unshift(selDisc);
    $('logSeg').innerHTML = Object.keys(DISC).filter(k => used.includes(k)).map(k => `<button class="${k === selDisc ? 'on' : ''}" data-k="${k}">${DISC[k].l}</button>`).join('');
    $('logSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { selDisc = b.dataset.k; renderLog(); }));
    const pts = log.filter(x => x.disc === selDisc).map(x => ({ x: new Date(x.date).getTime(), y: x.val, e: x }));
    let best = 0; const rec = []; pts.forEach(p => { if (p.y > best) { best = p.y; rec.push({ x: p.x, y: p.y }); } });
    if (!pts.length) $('logChart').innerHTML = `<div class="empty">Aucune séance de ${DISC[selDisc].l.toLowerCase()} notée pour l'instant.</div>`;
    else Charts.line('logChart', {
      time: true, height: 220, yMin: 0, yTime: DISC[selDisc].unit === 't', yFmt: v => fmtVal(selDisc, Math.round(v)),
      series: [{ name: 'Record', color: 'var(--s3)', step: true, points: rec }, { name: DISC[selDisc].l, color: 'var(--s1)', line: false, dots: true, points: pts }],
      tip: p => p.e ? `<b>${fmtVal(p.e.disc, p.e.val)}</b> — ${fmtDL(p.e.date)}${p.e.where ? '<br>' + esc(p.e.where) : ''}${p.e.note ? '<br>' + esc(p.e.note) : ''}` : `Record ${fmtVal(selDisc, p.y)}`,
    });
    $('logTable').innerHTML = log.length ? `<thead><tr><th>Date</th><th>Discipline</th><th class="num">Perf</th><th>Lieu</th><th>Notes</th><th></th></tr></thead><tbody>` +
      [...log].reverse().map(x => `<tr><td>${fmtD(x.date)}</td><td>${DISC[x.disc].l}</td><td class="num">${fmtVal(x.disc, x.val)}${bestOf(x.disc) === x ? ' <span class="badge">record</span>' : ''}</td><td>${esc(x.where)}</td><td style="white-space:normal">${esc(x.note)}</td><td><button class="del" data-id="${esc(x.id)}" aria-label="Supprimer">×</button></td></tr>`).join('') + '</tbody>'
      : '<tbody><tr><td class="muted">Rien pour l\'instant. Ajoute ta première séance de piscine ci-dessus.</td></tr></tbody>';
    $('logTable').querySelectorAll('.del').forEach(b => b.addEventListener('click', () => {
      const x = log.find(y => y.id === b.dataset.id);
      if (x && confirm(`Supprimer ${DISC[x.disc].l} ${fmtVal(x.disc, x.val)} du ${fmtDL(x.date)} ?`)) { log = log.filter(y => y !== x); save(log); renderLog(); }
    }));
    if (!staInput.value) { const b = bestOf('STA') || bestOf('DRY'); if (b) { staInput.placeholder = fmtT(b.val); } renderTable(); }
  }

  // ---------- tables CO2 / O2
  const staInput = $('staRef');
  try { staInput.value = localStorage.getItem('progres.staRef') || ''; } catch (e) { }
  let tableKind = 'CO2';
  $('tableSeg').innerHTML = ['CO2', 'O2'].map(k => `<button data-k="${k}" class="${k === tableKind ? 'on' : ''}">Table ${k === 'CO2' ? 'CO₂' : 'O₂'}</button>`).join('');
  $('tableSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    if (timer) return; tableKind = b.dataset.k; $('tableSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderTable();
  }));
  staInput.addEventListener('input', () => { try { localStorage.setItem('progres.staRef', staInput.value); } catch (e) { } renderTable(); });
  const r5 = s => Math.round(s / 5) * 5;
  function buildTable() {
    const ref = parseT(staInput.value) || parseT(staInput.placeholder) || 120;
    const rows = [];
    for (let i = 0; i < 8; i++) {
      if (tableKind === 'CO2') rows.push({ rest: Math.max(15, 120 - 15 * i), hold: r5(ref * 0.5) });
      else rows.push({ rest: 120, hold: r5(ref * (0.45 + 0.35 * i / 7)) });
    }
    return { ref, rows };
  }
  function renderTable(cur) {
    const { ref, rows } = buildTable();
    const total = rows.reduce((a, r) => a + r.rest + r.hold, 0);
    $('coTable').innerHTML = `<thead><tr><th>Série</th><th class="num">Respiration</th><th class="num">Apnée</th><th class="num">% du record</th></tr></thead><tbody>` +
      rows.map((r, i) => `<tr class="${cur === i ? 'cur' : ''}"><td>${i + 1}</td><td class="num">${fmtT(r.rest)}</td><td class="num">${fmtT(r.hold)}</td><td class="num">${pct(r.hold / ref)}</td></tr>`).join('') +
      `<tr><td class="muted" colspan="4" style="white-space:normal">Durée totale ${fmtT(total)} · basé sur ${fmtT(ref)} · ${tableKind === 'CO2' ? 'apnée fixe, repos qui raccourcit : habitue au CO₂' : 'repos fixe, apnée qui s\'allonge : habitue au manque d\'O₂'}</td></tr></tbody>`;
  }
  renderTable();

  // ---------- minuteur
  let timer = null, ac = null, contr = [];
  const beep = (f = 880, d = 0.12, when = 0) => {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime + when; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d + 0.02);
    } catch (e) { }
  };
  let wake = null;
  function stopTimer(msg) {
    if (timer) clearInterval(timer); timer = null;
    $('tPhase').textContent = msg || 'Prêt'; $('tClock').textContent = '0:00'; $('tRound').textContent = '';
    $('tStart').disabled = false; $('tContr').disabled = true; $('timerBox').className = 'timer';
    renderTable(); try { wake && wake.release(); } catch (e) { } wake = null;
  }
  document.querySelector('.timer').id = 'timerBox';
  $('tStart').addEventListener('click', async () => {
    const { rows } = buildTable();
    const phases = rows.flatMap((r, i) => [{ k: 'rest', d: r.rest, i }, { k: 'hold', d: r.hold, i }]);
    let pi = 0, t0 = performance.now(), warned = false; contr = []; $('tContrLog').textContent = '';
    try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { }
    beep(660, 0.2); $('tStart').disabled = true;
    const tick = () => {
      const ph = phases[pi], el = (performance.now() - t0) / 1000, left = ph.d - el;
      $('timerBox').className = 'timer ' + ph.k;
      $('tPhase').textContent = ph.k === 'rest' ? 'Respire' : 'Apnée';
      $('tClock').textContent = fmtT(Math.max(0, Math.ceil(left)));
      $('tRound').textContent = `Série ${ph.i + 1} / ${rows.length}`;
      $('tContr').disabled = ph.k !== 'hold';
      renderTable(ph.i);
      if (left <= 10 && !warned) { beep(520, 0.1); warned = true; }
      if (left <= 0) {
        pi++; warned = false; t0 = performance.now();
        if (pi >= phases.length) { beep(880, 0.15); beep(880, 0.15, 0.25); beep(1100, 0.3, 0.5); stopTimer('Terminé'); return; }
        beep(880, 0.12); beep(880, 0.12, 0.18);
      }
    };
    tick(); timer = setInterval(tick, 200);
    $('tContr').onclick = () => {
      const ph = phases[pi]; const s = Math.round((performance.now() - t0) / 1000);
      contr.push(`S${ph.i + 1} : ${fmtT(s)}`); $('tContrLog').textContent = 'Contractions — ' + contr.join(' · ');
    };
  });
  $('tStop').addEventListener('click', () => stopTimer());

  renderLog();

  // onglet initial
  let start = location.hash.slice(1);
  if (!['course', 'apnee', 'carnet'].includes(start)) { try { start = localStorage.getItem('progres.tab') || 'course'; } catch (e) { start = 'course'; } }
  go(start);
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (['course', 'apnee', 'carnet'].includes(h)) go(h); });
})();
