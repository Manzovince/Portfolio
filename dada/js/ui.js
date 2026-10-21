'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = {
  px: 1, cards: {}, rollPending: null, pawnPending: null, selected: null, plainOnly: false, cfg: null,

  init() {
    buildSprites();
    this.cellURL = {};
    for (const t in SPECIALS) {
      const c = document.createElement('canvas'); c.width = 17; c.height = 17;
      const x = c.getContext('2d');
      R.cell.call({}, x, -M / CELL, -M / CELL, SPECIALS[t].fill);
      if (t === 'portal') { ['#b48cff', '#41a6f6', '#73eff7'].forEach((col, i) => R.disc(x, 8, 8, 6 - i * 2, col)); }
      else R.drawSpecialIcon(x, t, 2, 0, 0);
      this.cellURL[t] = c.toDataURL();
    }
    {
      const c = document.createElement('canvas'); c.width = 17; c.height = 17; const x = c.getContext('2d');
      R.cell.call({}, x, -M / CELL, -M / CELL, '#cfd9e8'); x.drawImage(PX.icons.star, 3, 3); this.cellURL.safe = c.toDataURL();
    }
    for (const k in TILES) {
      // tile icon: the square it creates, with a pennant
      const c = document.createElement('canvas'); c.width = 18; c.height = 18; const x = c.getContext('2d');
      R.cell.call({}, x, -M / CELL, -M / CELL, SPECIALS[TILES[k].tile].fill);
      R.drawSpecialIcon(x, TILES[k].tile, 2, 0, 0);
      x.fillStyle = OUT; x.fillRect(12, 0, 1, 7); x.fillStyle = '#ffffff'; x.fillRect(13, 0, 4, 3);
      PX.iconURL[k] = c.toDataURL();
    }
    this.cellURL.peage = PX.iconURL.tpeage;
    this.loadCfg();
    this.buildMenu();
    $('#btnPlay').onclick = () => { SFX.init(); this.startNew(); };
    $('#btnResume').onclick = () => { SFX.init(); this.resume(); };
    $('#btnRules').onclick = () => { SFX.init(); this.rules(); };
    $('#btnRoll').onclick = () => this.onRoll();
    $('#btnPause').onclick = () => this.pause();
    $('#board').addEventListener('pointerdown', e => this.onBoardTap(e));
    window.addEventListener('resize', () => this.layout());
    document.addEventListener('pointerdown', () => SFX.init(), { once: true });
    this.updateResume();
  },

  // ---------- menu ----------
  loadCfg() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(CFG_KEY)); } catch (e) { }
    this.cfg = Object.assign({ slots: ['human', 'ai', 'ai', 'ai'], pawns: 4, speed: 1, sound: true }, c || {});
    SFX.on = this.cfg.sound;
  },
  saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(this.cfg)); } catch (e) { } },
  buildMenu() {
    const box = $('#slots');
    const LABEL = { human: 'Joueur', ai: 'IA', off: '—' };
    const draw = () => {
      box.innerHTML = [0, 1, 3, 2].map(c => [this.cfg.slots[c], c]).map(([t, c]) => `
        <button class="slot-row ${t}" data-c="${c}" style="--cb:${COLORS[c].b};--cd:${COLORS[c].d};--cl:${COLORS[c].l}">
          <img class="av" src="${PX.iconURL.horse[c]}" alt="">
          <span class="sn">${COLORS[c].nom}</span>
          <span class="st">${LABEL[t]}</span>
        </button>`).join('');
      box.querySelectorAll('.slot-row').forEach(b => b.onclick = () => {
        const c = +b.dataset.c, order = ['human', 'ai', 'off'];
        this.cfg.slots[c] = order[(order.indexOf(this.cfg.slots[c]) + 1) % 3];
        SFX.init(); SFX.play('select'); this.saveCfg(); draw();
      });
      const n = this.cfg.slots.filter(s => s !== 'off').length;
      $('#btnPlay').disabled = n < 2;
      $('#menuWarn').textContent = n < 2 ? 'Il faut au moins 2 chevaux en course.' : '';
    };
    draw();
    const seg = (id, key) => {
      const el = $(id);
      const upd = () => el.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === this.cfg[key]));
      el.querySelectorAll('button').forEach(b => b.onclick = () => { this.cfg[key] = +b.dataset.v; SFX.init(); SFX.play('select'); this.saveCfg(); upd(); });
      upd();
    };
    seg('#optPawns', 'pawns'); seg('#optSpeed', 'speed');
    this.menuAnim();
  },
  menuAnim() {
    const cv = $('#menuRun'), x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    let t0 = performance.now();
    const step = now => {
      if (!$('#menu').classList.contains('hidden')) {
        const t = (now - t0) / 1000;
        x.clearRect(0, 0, cv.width, cv.height);
        x.fillStyle = '#4a3a6a'; x.fillRect(0, 22, cv.width, 2);
        for (let i = 0; i < 4; i++) {
          const ph = t * 1.2 + i * .9;
          const px = ((t * 38 + i * 44) % (cv.width + 30)) - 15;
          const h = Math.abs(Math.sin(ph * 4)) * 6;
          x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(Math.round(px - 4), 21, 8, 2);
          x.drawImage(PX.horse[i], Math.round(px - 6), Math.round(22 - 14 - h));
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
  updateResume() {
    const s = loadSave();
    $('#btnResume').style.display = s && !s.over ? '' : 'none';
  },
  show(id) {
    ['#menu', '#game'].forEach(s => $(s).classList.toggle('hidden', s !== id));
    if (id === '#game') requestAnimationFrame(() => this.layout());
  },
  startNew() {
    if (this.cfg.slots.filter(s => s !== 'off').length < 2) return;
    Tw.clear();
    G = newGame({ slots: this.cfg.slots.slice(), pawns: this.cfg.pawns, speed: this.cfg.speed });
    this.enterGame();
    this.banner('À vos chevaux !', 'Fais 1 ou 6 pour sortir de l\'écurie', { col: '#ffd84a', dur: 1200 }).then(() => runGame());
  },
  resume() {
    const s = loadSave(); if (!s) return;
    Tw.clear();
    G = s; G.sid = Math.random(); G.moves = null; G.placing = null; G.cfg.speed = this.cfg.speed;
    G.owners = G.owners || {}; G.nat = G.nat || [];
    this.enterGame();
    runGame();
  },
  enterGame() {
    R.parts = []; R.dice = null;
    R.buildBase(G.specials, G.owners);
    resetVis();
    this.buildCards();
    this.show('#game');
    this.refresh();
  },

  // ---------- layout ----------
  layout() {
    const area = $('#boardArea');
    if (!area || $('#game').classList.contains('hidden')) return;
    const w = area.clientWidth - 8, h = area.clientHeight - 4;
    const dpr = window.devicePixelRatio || 1;
    let css = Math.max(120, Math.min(w, h, 720));
    // Prefer whole device-pixel scales for crisp pixels, unless that wastes too much room.
    const sc = Math.floor(css * dpr / BW);
    if (sc >= 1 && sc * BW / dpr >= css * .9) css = sc * BW / dpr;
    else css = Math.floor(css);
    const cv = $('#board'), wrap = $('#boardWrap');
    cv.style.width = cv.style.height = css + 'px';
    wrap.style.width = wrap.style.height = css + 'px';
    this.px = css / BW;
  },

  // ---------- player cards ----------
  buildCards() {
    this.cards = {};
    const make = c => {
      const P = G.players.find(p => p.c === c);
      const C = COLORS[c];
      const el = document.createElement('div');
      el.className = 'pcard' + (P ? '' : ' empty');
      el.style.cssText = `--cb:${C.b};--cd:${C.d};--cl:${C.l};--ct:${C.t}`;
      el.innerHTML = P ? `
        <img class="av" src="${PX.iconURL.horse[c]}" alt="">
        <div class="pi">
          <div class="pn">${esc(P.name)}</div>
          <div class="ps"><span class="coins"><img src="${PX.iconURL.coin}" alt="">&nbsp;<b>0</b></span><span class="dc"><img src="${PX.iconURL.normal}" alt="">&nbsp;<b>0</b></span></div>
          <div class="pp"></div>
        </div>
        <div class="curse"></div>` : `<img class="av" src="${PX.iconURL.horse[c]}" alt=""><div class="pi"><div class="pn">—</div></div>`;
      if (P) this.cards[c] = el;
      return el;
    };
    const top = $('#cardsTop'), bot = $('#cardsBot');
    top.innerHTML = ''; bot.innerHTML = '';
    top.append(make(0), make(1)); bot.append(make(3), make(2));
  },
  refresh() {
    if (!G) return;
    for (const P of G.players) {
      const el = this.cards[P.c]; if (!el) continue;
      const cb = el.querySelector('.coins b');
      if (+cb.textContent !== P.coins) { cb.textContent = P.coins; }
      el.querySelector('.dc b').textContent = P.dice.length;
      el.querySelector('.pp').innerHTML = P.pawns.map(r => `<i class="${r < 0 ? 'b' : r === FIN ? 'f' : r > LAST ? 'h' : 't'}"></i>`).join('');
      el.querySelector('.curse').innerHTML = P.curse ? `<img src="${PX.iconURL[P.curse]}" alt="">` : '';
      el.classList.toggle('active', G.players[G.cur] === P);
    }
    const left = MARKET_EVERY - ((G.round - 1) % MARKET_EVERY);
    $('#info').innerHTML = `Manche <b>${G.round}</b> · Marché ${left === 1 ? '<b>à la fin de la manche</b>' : `dans <b>${left}</b> manches`}`;
    const P = G.players[G.cur];
    this.renderInv(P);
  },
  setActive(P) { this.refresh(); const el = this.cards[P.c]; if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } },
  cardFx(pi, cls) { const el = this.cards[G.players[pi].c]; if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); },
  async turnIntro(P) {
    this.hint(P.type === 'human' ? `À toi, ${P.name} !` : `${P.name} réfléchit…`);
    if (P.type === 'human' && humanCount() > 1) {
      SFX.play('select');
      await this.banner(`À toi, ${P.name} !`, '', { col: COLORS[P.c].l, dur: 750, small: true });
    } else if (P.type === 'human') {
      SFX.play('select');
    } else await wait(spd(200));
  },
  hint(t) { $('#hint').innerHTML = t; },

  // ---------- inventory & roll ----------
  renderInv(P) {
    const inv = $('#inv');
    const mine = P && P.type === 'human' && this.rollPending;
    const lockDie = !mine || this.plainOnly || G.usedSpecial;
    const lockTile = !mine || this.plainOnly || G.usedTile;
    let h = '';
    for (let i = 0; i < MAXDICE; i++) {
      const d = P && P.dice[i];
      if (!d) { h += '<div class="slot empty"></div>'; continue; }
      const tile = !!TILES[d], locked = tile ? lockTile : lockDie;
      const sel = (this.selected === d || (this.placing && this.placing.kind === d)) && i === P.dice.indexOf(d);
      h += `<button class="slot ${sel ? 'sel' : ''} ${tile ? 'tile' : DICE[d].give ? 'give' : ''}" data-k="${d}" ${locked ? 'disabled' : ''}><img src="${PX.iconURL[d]}" alt="${ITEM(d).nom}"></button>`;
    }
    inv.innerHTML = h;
    inv.querySelectorAll('button.slot').forEach(b => b.onclick = () => this.onInvTap(P, b.dataset.k));
    const btn = $('#btnRoll');
    btn.disabled = !mine;
    btn.classList.toggle('ready', !!mine);
    btn.style.setProperty('--cb', P ? COLORS[P.c].b : '#888');
    btn.style.setProperty('--cd', P ? COLORS[P.c].d : '#444');
    if (!mine && this.rollFaces) {
      btn.innerHTML = `<span class="dv">${this.rollFaces.map(f => `${f.val < 0 ? '<b>−</b>' : ''}<img src="${this.faceURL(f.val, f.kind)}" alt="${f.val}">`).join('')}</span>`;
      return;
    }
    btn.innerHTML = mine ? (this.selected ? `LANCER<small>${DICE[this.selected].nom}</small>` : 'LANCER') : (P && P.type === 'ai' ? '<small>IA…</small>' : '…');
  },
  faceURL(val, kind) {
    const key = val + kind;
    this._faces = this._faces || {};
    if (!this._faces[key]) { const c = document.createElement('canvas'); c.width = 16; c.height = 16; drawDie(c.getContext('2d'), 0, 0, Math.abs(val), kind); this._faces[key] = c.toDataURL(); }
    return this._faces[key];
  },
  waitRoll(P, plainOnly = false) {
    return new Promise(res => {
      this.selected = null; this.plainOnly = plainOnly; this.rollPending = res;
      this.renderInv(P);
      this.hint(plainOnly ? 'Relance pour tenter le 1 ou le 6 !' : P.dice.length && !G.usedSpecial ? 'Touche un objet pour l\'utiliser, ou lance !' : 'Lance le dé !');
    });
  },
  onRoll() {
    if (!this.rollPending) return;
    if (this.placing) this.cancelPlacing();
    SFX.init(); SFX.play('select'); buzz(15);
    const r = this.rollPending, k = this.selected || 'normal';
    this.rollPending = null; this.selected = null;
    this.renderInv(G.players[G.cur]);
    this.hint('');
    r(k);
  },
  async onInvTap(P, kind) {
    if (!this.rollPending || this.plainOnly) return;
    if (TILES[kind]) {
      if (G.usedTile) return;
      if (this.placing) { const same = this.placing.kind === kind; this.cancelPlacing(); if (same) return; }
      SFX.play('select');
      this.selected = null;
      this.placing = { P, kind };
      G.placing = tileSquares();
      this.hint(`<b>${TILES[kind].nom}</b> : touche une case libre qui clignote. <u data-cancel>Annuler</u>`);
      const c = $('#hint [data-cancel]'); if (c) c.onclick = () => { this.cancelPlacing(); this.hint('Lance le dé !'); };
      this.renderInv(P);
      return;
    }
    if (G.usedSpecial) return;
    if (this.placing) this.cancelPlacing();
    SFX.play('select');
    if (DICE[kind].give) {
      const Q = await this.pickTarget(P, kind);
      if (Q && this.rollPending) { await giveCurse(P, Q, kind); this.hint('Lance le dé !'); }
    } else {
      this.selected = this.selected === kind ? null : kind;
      this.hint(this.selected ? `<b>${DICE[kind].nom}</b> : ${DICE[kind].desc}` : 'Lance le dé !');
    }
    this.renderInv(P);
  },
  pickTarget(P, kind) {
    const opp = others(P);
    const body = `<h2>${DICE[kind].nom}</h2><p class="sub">${DICE[kind].desc}</p><div class="targets">${opp.map(Q => {
      const no = !!Q.curse;
      return `<button class="btn tgt" data-i="${pidx(Q)}" ${no ? 'disabled' : ''} style="--cb:${COLORS[Q.c].b};--cd:${COLORS[Q.c].d}"><img src="${PX.iconURL.horse[Q.c]}" alt=""> ${esc(Q.name)}${no ? ' <small>(déjà maudit)</small>' : ''}</button>`;
    }).join('')}</div><button class="btn ghost" data-x>Annuler</button>`;
    return new Promise(res => {
      this.modal(body, el => {
        el.querySelectorAll('.tgt').forEach(b => b.onclick = () => { this.closeModal(); res(G.players[+b.dataset.i]); });
        el.querySelector('[data-x]').onclick = () => { this.closeModal(); res(null); };
      });
    });
  },
  pickNumber() {
    const faces = [1, 2, 3, 4, 5, 6].map(v => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; drawDie(c.getContext('2d'), 0, 0, v, 'dore'); return c.toDataURL(); });
    const body = `<h2>Dé Doré</h2><p class="sub">Choisis ton nombre</p><div class="faces">${faces.map((u, i) => `<button class="face" data-v="${i + 1}"><img src="${u}" alt="${i + 1}"></button>`).join('')}</div>`;
    return new Promise(res => this.modal(body, el => el.querySelectorAll('.face').forEach(b => b.onclick = () => { SFX.play('select'); this.closeModal(); res(+b.dataset.v); })));
  },
  pickPawn(P, moves) {
    G.moves = moves;
    this.hint('Touche un cheval qui brille');
    return new Promise(res => { this.pawnPending = { P, moves, res }; });
  },
  cancelPlacing() {
    this.placing = null; if (G) { G.placing = null; this.renderInv(G.players[G.cur]); }
  },
  onBoardTap(e) {
    const r = $('#board').getBoundingClientRect();
    const bx = (e.clientX - r.left) / r.width * BW, by = (e.clientY - r.top) / r.height * BW;
    if (this.placing && G.placing) {
      const cx = Math.floor((bx - M) / CELL), cy = Math.floor((by - M) / CELL);
      const a = TRACK.findIndex(([x, y]) => x === cx && y === cy);
      if (a >= 0 && G.placing.includes(a)) {
        const { P, kind } = this.placing;
        this.placing = null; G.placing = null;
        placeTile(P, kind, a).then(() => { if (this.rollPending) { this.renderInv(P); this.hint('Lance le dé !'); } });
      } else SFX.play('select');
      return;
    }
    const pp = this.pawnPending; if (!pp) return;
    const pi = pidx(pp.P);
    let best = null, bd = 1e9;
    for (const m of pp.moves) {
      const v = R.vis[pi][m.k];
      const d1 = Math.hypot(bx - v.x, by - (v.y - 6));
      const dp = posOf(pp.P.c, m.k, m.to), d2 = Math.hypot(bx - dp.x, by - (dp.y - 4)) + 2;
      const d = Math.min(d1, d2);
      if (d < bd) { bd = d; best = m; }
    }
    if (best && bd < 14) {
      this.pawnPending = null; G.moves = null; this.hint('');
      SFX.play('select'); buzz(10);
      pp.res(best);
    }
  },

  // ---------- floating text, banners ----------
  pop(text, bx, by, { col = '#fff', size = 1 } = {}) {
    const el = document.createElement('div');
    el.className = 'pop s' + size;
    el.textContent = text;
    el.style.color = col;
    el.style.left = clamp(bx, 30, BW - 30) * this.px + 'px';
    el.style.top = by * this.px + 'px';
    $('#fx').appendChild(el);
    setTimeout(() => el.remove(), 1300);
  },
  async banner(title, sub, { col = '#fff', dur = 1000, icon = null, small = false } = {}) {
    const b = $('#banner');
    b.innerHTML = `<div class="bn ${small ? 'small' : ''}" style="--bc:${col}">${icon && PX.iconURL[icon] ? `<img src="${PX.iconURL[icon]}" alt="">` : ''}<div class="bt">${esc(title)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}</div>`;
    b.className = 'show';
    await wait(dur);
    b.className = 'hide';
    await wait(180);
    b.className = '';
  },
  async roulette(ev) {
    const b = $('#banner');
    b.innerHTML = `<div class="bn roul"><div class="bh">CHANCE ?</div><div class="bt"></div><div class="bs"></div></div>`;
    b.className = 'show';
    const bt = b.querySelector('.bt'), bs = b.querySelector('.bs'), bn = b.querySelector('.bn');
    const n = 14;
    for (let i = 0; i < n; i++) {
      const e = i === n - 1 ? ev : CHANCE[(rnd(CHANCE.length))];
      bt.textContent = e.t;
      SFX.play('roulette', i);
      await wait(40 + i * i * 1.6);
    }
    bt.textContent = ev.t; bs.textContent = ev.s;
    bn.style.setProperty('--bc', ev.good === 1 ? '#a7f070' : ev.good === 0 ? '#ff6d7c' : '#7fd0ff');
    bn.classList.add('land');
    SFX.play(ev.good === 0 ? 'bad' : 'good');
    await wait(spd(1300));
    b.className = 'hide';
    await wait(180);
    b.className = '';
  },
  coinFly(bx, by, pi, n) {
    const P = G.players[pi], card = this.cards[P.c];
    if (!card) return;
    const target = card.querySelector('.coins img').getBoundingClientRect();
    const br = $('#board').getBoundingClientRect();
    const sx = br.left + bx * this.px, sy = br.top + by * this.px;
    const k = Math.min(n, 6);
    for (let i = 0; i < k; i++) {
      const c = document.createElement('img');
      c.src = PX.iconURL.coin; c.className = 'flycoin';
      c.style.left = sx + 'px'; c.style.top = sy + 'px';
      document.body.appendChild(c);
      const dx = target.left + target.width / 2 - sx, dy = target.top + target.height / 2 - sy;
      const jx = (Math.random() - .5) * 60, jy = -20 - Math.random() * 40;
      c.animate([
        { transform: 'translate(-50%,-50%) scale(.6)' },
        { transform: `translate(calc(-50% + ${jx}px),calc(-50% + ${jy}px)) scale(1.3)`, offset: .35 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.8)` },
      ], { duration: 620 + i * 70, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).onfinish = () => {
        c.remove();
        if (i === k - 1) { this.refresh(); this.cardFx(pi, 'coinbump'); SFX.play('coin'); }
      };
    }
  },

  // ---------- modals ----------
  modal(html, bind, cls = '') {
    const m = $('#modal'), p = $('#panel');
    p.className = 'panel ' + cls;
    p.innerHTML = html;
    m.classList.remove('hidden');
    p.scrollTop = 0;
    bind && bind(p);
  },
  closeModal() { $('#modal').classList.add('hidden'); },

  shop(P, offer) {
    let bought = [];
    return new Promise(res => {
      const draw = () => {
        const base = P.pawns.filter(r => r === -1).length - bought.filter(b => b === 'sortie').length;
        const html = `<h2 class="mk">MARCHÉ</h2>
          <div class="who" style="--cb:${COLORS[P.c].b}"><img src="${PX.iconURL.horse[P.c]}" alt=""> ${esc(P.name)} · <img class="ci" src="${PX.iconURL.coin}" alt=""> <b>${P.coins}</b> · achats ${bought.length}/2</div>
          <div class="items">${offer.map(it => {
            const S = SHOP[it];
            const full = it === 'sortie' ? base < 1 : P.dice.length >= MAXDICE;
            const ok = bought.length < 2 && P.coins >= S.prix && !full;
            return `<div class="item ${ok ? '' : 'off'}"><img src="${PX.iconURL[it]}" alt=""><div class="it"><b>${S.nom}</b><span>${S.desc}</span>${full ? `<em>${it === 'sortie' ? 'Aucun cheval à l\'écurie' : 'Sac plein (4 dés)'}</em>` : ''}</div><button class="btn buy" data-it="${it}" ${ok ? '' : 'disabled'}>${S.prix}<img src="${PX.iconURL.coin}" alt=""></button></div>`;
          }).join('')}</div>
          <button class="btn big" data-done>Terminer</button>`;
        this.modal(html, el => {
          el.querySelectorAll('.buy').forEach(b => b.onclick = () => {
            const it = b.dataset.it; P.coins -= SHOP[it].prix; bought.push(it);
            if (it !== 'sortie') P.dice.push(it);
            SFX.play('buy'); buzz(15); this.refresh(); draw();
          });
          el.querySelector('[data-done]').onclick = () => { this.closeModal(); SFX.play('select'); res(bought); };
        }, 'shop');
      };
      draw();
    });
  },

  rules() {
    const sp = (t, txt) => `<li><img src="${this.cellURL[t]}" alt=""><span><b>${t === 'safe' ? 'Refuge' : SPECIALS[t].nom}</b> — ${txt}</span></li>`;
    const di = (k) => `<li><img src="${PX.iconURL[k]}" alt=""><span><b>${SHOP[k].nom}</b> — ${SHOP[k].desc}</span></li>`;
    this.modal(`<h2>Règles</h2>
      <p><b>But :</b> amener tous tes chevaux au centre du plateau.</p>
      <p>Fais un <b>1</b> ou un <b>6</b> pour sortir un cheval de l'écurie. Un 6 te fait relancer (2 fois max). Si tu n'as aucun cheval en piste, tu as 3 essais.</p>
      <p>Le plateau commence <b>vide</b>. À chaque nouvelle manche, des cases spéciales apparaissent (les plus anciennes finissent par disparaître).</p>
      <p>Tomber sur un cheval adverse le renvoie à l'écurie, te rapporte <b>3 pièces</b> et te fait <b>rejouer</b>. Pas besoin du nombre exact pour arriver : chaque cheval arrivé rapporte <b>4 pièces</b>.</p>
      <h3>Cases</h3><ul class="lst">
      ${sp('safe', 'personne ne peut t\'y capturer.')}
      ${sp('coin', '+3 pièces.')}
      ${sp('coffre', 'un dé spécial gratuit.')}
      ${sp('chance', 'une surprise, bonne… ou pas.')}
      ${sp('piege', 'recule de 3 cases.')}
      ${sp('turbo', 'avance de 4 cases.')}
      ${sp('portal', 'saute jusqu\'au portail suivant.')}</ul>
      <h3>Tuiles</h3><p>Pose une tuile sur une case libre avant de lancer (une par tour). Elle porte ta couleur, ne te piège jamais, et disparaît dès qu'elle sert.</p><ul class="lst">
      ${['tpiege', 'tpeage', 'tturbo'].map(di).join('')}</ul>
      <h3>Dés spéciaux</h3><p>Un seul dé spécial par tour, à utiliser avant de lancer. Ton sac contient 4 objets (dés et tuiles).</p><ul class="lst">
      ${['dore', 'turbo', 'bis', 'maudit', 'escargot'].map(di).join('')}</ul>
      <h3>Marché</h3><p>Toutes les ${MARKET_EVERY} manches, le marché ouvre pour tout le monde : chacun peut acheter jusqu'à 2 objets, en commençant par le joueur le plus en retard. On y trouve toujours des tuiles.</p>
      <ul class="lst">${di('sortie')}</ul>
      <button class="btn big" data-x>Compris !</button>`, el => el.querySelector('[data-x]').onclick = () => this.closeModal(), 'rules');
  },
  pause() {
    SFX.play('select');
    const draw = () => this.modal(`<h2>Pause</h2>
      <button class="btn big" data-a="back">Reprendre</button>
      <button class="btn" data-a="sound">Son : ${SFX.on ? 'oui' : 'non'}</button>
      <button class="btn" data-a="speed">Vitesse IA : ${this.cfg.speed < 1 ? 'rapide' : 'normale'}</button>
      <button class="btn" data-a="rules">Règles</button>
      <button class="btn ghost" data-a="quit">Quitter vers le menu</button>
      <p class="sub">La partie est sauvegardée au début de chaque tour.</p>`, el => el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'back') this.closeModal();
        if (a === 'sound') { SFX.on = !SFX.on; this.cfg.sound = SFX.on; this.saveCfg(); draw(); }
        if (a === 'speed') { this.cfg.speed = this.cfg.speed < 1 ? 1 : .5; G.cfg.speed = this.cfg.speed; this.saveCfg(); draw(); }
        if (a === 'rules') this.rules();
        if (a === 'quit') this.quit();
      }));
    draw();
  },
  quit() {
    this.closeModal();
    Tw.clear(); G = null; this.rollPending = this.pawnPending = null;
    $('#banner').className = '';
    this.updateResume();
    this.show('#menu');
  },
  endScreen() {
    const rank = G.players.slice().sort((a, b) => (b === G.players[G.winner]) - (a === G.players[G.winner]) || progress(b) - progress(a));
    const n = G.cfg.pawns;
    this.modal(`<h2 class="mk">Podium</h2><ol class="podium">${rank.map((P, i) => `
      <li style="--cb:${COLORS[P.c].b};--cd:${COLORS[P.c].d}"><span class="rk">${i + 1}</span><img src="${PX.iconURL.horse[P.c]}" alt=""><span class="nm">${esc(P.name)}</span>
      <span class="st">${P.pawns.filter(r => r === FIN).length}/${n} arrivés · ${P.stats.caps} capture${P.stats.caps > 1 ? 's' : ''} · ${P.stats.coins} pièces gagnées</span></li>`).join('')}</ol>
      <button class="btn big" data-a="again">Rejouer</button><button class="btn ghost" data-a="menu">Menu</button>`, el => {
      el.querySelector('[data-a=again]').onclick = () => { this.closeModal(); this.startNew(); };
      el.querySelector('[data-a=menu]').onclick = () => this.quit();
    }, 'end');
  },
};

// ---------- boot ----------
let _last = performance.now();
function loop(now) {
  const dt = Math.min(50, now - _last); _last = now;
  Tw.update(dt * Tw.speed * Tw.slow);
  if (G && !$('#game').classList.contains('hidden')) R.frame(dt * Tw.slow);
  requestAnimationFrame(loop);
}
window.addEventListener('load', () => {
  R.init($('#board'));
  UI.init();
  requestAnimationFrame(loop);
});
window.__dada = { get G() { return G; }, Tw, R, UI, AI };
