/* Pferde-Mathe – freischaltbare Mini-Spiele: Apfelfangen, Ausritt im Wald, Pferde-Memory
   Ohne Zeitdruck und ohne Verlieren. Belohnungen sind pro Tag begrenzt (Elternbereich-freundlich). */
(window.PM_MODS = window.PM_MODS || []).push(function (core) {
'use strict';
const { h, $, range, pick, shuffle, rand, Sound, hooks, HORSES } = core;
const PA = window.PMArt;
const st = () => core.S;
const SHOE = '<span class="ih">' + core.SHOE + '</span>';
const CAP_H = 8, CAP_C = 2;
const speed = () => (window.__miniSpeed > 0 ? window.__miniSpeed : 1);
const hasMini = (id) => st().owned.includes('mini_' + id);
let raf = 0, cleanup = null;
const stopAll = () => { cancelAnimationFrame(raf); if (cleanup) { cleanup(); cleanup = null; } };

function frame(title) {
  stopAll();
  core.currentScreen = 'mini'; Sound.setScene('mini');
  const main = core.shell(title, false);
  const wrap = h('div', { class: 'mg-wrap' });
  main.append(wrap);
  return wrap;
}
// Belohnung mit Tageslimit
function reward(wantH, wantC) {
  const s = st(), d = core.shop.daily('miniDay');
  const gh = Math.max(0, Math.min(wantH, CAP_H - d.shoes)), gc = Math.max(0, Math.min(wantC, CAP_C - d.car));
  d.shoes += gh; d.car += gc; s.shoes += gh; s.totalShoes = (s.totalShoes || 0) + gh; s.carrots += gc;
  s.minis.played = (s.minis.played || 0) + 1;
  core.save(); core.updateCounters();
  return { h: gh, c: gc, capped: gh < wantH || gc < wantC };
}
function endCard(wrap, o) {
  const r = reward(o.h, o.c);
  Sound.fanfare(); setTimeout(() => core.confetti && core.confetti(), 150);
  const lines = [];
  if (r.h) lines.push(h('span', { class: 'mg-r', html: `+${r.h} ${SHOE}` }));
  if (r.c) lines.push(h('span', { class: 'mg-r' }, `+${r.c} 🥕`));
  const card = h('div', { class: 'mg-end', id: 'mgEnd' }, h('div', { class: 'lc-rays' }), h('h2', null, o.title), h('p', null, o.text),
    h('div', { class: 'mg-rewards' }, lines.length ? lines : h('span', { class: 'mg-r' }, '💖')),
    r.capped ? h('p', { class: 'mg-cap' }, 'Für heute gibt es genug Belohnung. Spielen darfst du natürlich weiter! 💕') : null,
    h('div', { class: 'lc-btns' }, h('button', { class: 'bigbtn primary', id: 'mgAgain', onclick: () => { Sound.tap(); o.again(); } }, 'Nochmal 🔁'), h('button', { class: 'bigbtn', id: 'mgFarm', onclick: () => { Sound.tap(); stopAll(); core.showStable(); } }, '🏡 Zum Hof')));
  wrap.append(card);
  return r;
}
const hud = (left, mid) => h('div', { class: 'mg-hud' }, h('div', { class: 'mg-score', id: 'mgScore' }, left), mid || null,
  h('button', { class: 'smallbtn', id: 'mgQuit', onclick: () => { Sound.tap(); stopAll(); core.showStable(); } }, '🏡 Hof'));

// ---------------------------------------------------------------- Apfelfangen
function startApple() {
  const wrap = frame('Apfelfangen');
  const stage = h('div', { class: 'mg-stage apple', id: 'mgStage' });
  const crown = h('div', { class: 'ap-crown' });
  const basket = h('div', { class: 'ap-basket', id: 'apBasket', html: PA.svg('0 0 140 90', `<path d="M10 28 H130 L118 80 Q70 92 22 80 Z" fill="#c9965e" stroke="#8a5a36" stroke-width="3"/><path d="M26 28 L34 80 M52 28 L56 86 M78 28 L80 86 M104 28 L100 82" stroke="#8a5a36" stroke-width="2.4" opacity=".7"/><path d="M6 28 H134" stroke="#a7743f" stroke-width="9" stroke-linecap="round"/>`) });
  const score = h('span', null, '🍎 0 von 12');
  stage.append(crown, basket);
  wrap.append(hud(score), stage);
  const W = () => stage.clientWidth, H = () => stage.clientHeight;
  let bx = 0.5, tx = 0.5, caught = 0, done = 0, nextAt = 1.2, t0 = performance.now(), spawned = 0, over = false;
  const apples = [];
  const move = (e) => { const r = stage.getBoundingClientRect(); tx = Math.max(0.06, Math.min(0.94, (e.clientX - r.left) / r.width)); };
  stage.addEventListener('pointermove', move); stage.addEventListener('pointerdown', move);
  const key = (e) => { if (e.key === 'ArrowLeft') tx = Math.max(0.06, tx - 0.08); if (e.key === 'ArrowRight') tx = Math.min(0.94, tx + 0.08); };
  document.addEventListener('keydown', key);
  cleanup = () => document.removeEventListener('keydown', key);
  const FALL = 3.4;
  const loop = (now) => {
    if (!document.body.contains(stage)) return;
    const t = ((now - t0) / 1000) * speed(), dt = Math.min(0.05, 0.016);
    bx += (tx - bx) * 0.22; basket.style.left = (bx * 100) + '%';
    if (spawned < 12 && t >= nextAt) {
      const a = h('div', { class: 'ap-apple', html: PA.ICON.apfel ? PA.svg('0 0 40 40', PA.ICON.apfel()) : '🍎' });
      const x = 0.1 + Math.random() * 0.8; a._x = x; a._t = t; a._st = 0; a.style.left = (x * 100) + '%'; stage.append(a); apples.push(a); spawned++; nextAt = t + 1.5 + Math.random() * 0.5;
      Sound.pop && Sound.tick();
    }
    for (const a of apples) {
      if (a._st === 2) continue;
      const k = (t - a._t) / FALL, y = 12 + k * (H() - 12 - 56);
      if (a._st === 0) {
        a.style.top = y + 'px';
        const by = H() - 100;
        if (y >= by - 10 && y <= by + 40 && Math.abs(a._x - bx) * W() < 84) {
          a._st = 2; a.classList.add('in'); caught++; done++; a.style.top = (by + 14) + 'px'; a.style.left = (bx * 100) + '%';
          setTimeout(() => a.remove(), 260); Sound.correct ? Sound.coin() : null; score.textContent = `🍎 ${caught} von 12`; basket.classList.remove('wob'); void basket.offsetWidth; basket.classList.add('wob');
        } else if (y >= H() - 70) { a._st = 2; done++; a.classList.add('miss'); Sound.plop(); setTimeout(() => a.remove(), 900); }
      }
    }
    if (!over && spawned >= 12 && done >= 12) { over = true; setTimeout(finish, 600); }
    if (!over) raf = requestAnimationFrame(loop);
  };
  const finish = () => {
    const hh = 1 + Math.floor(caught / 4), cc = caught >= 10 ? 1 : 0;
    endCard(wrap, { title: caught >= 10 ? 'Wunderbar!' : 'Gut gefangen!', text: `Du hast ${caught} von 12 Äpfeln im Korb. 🍎`, h: hh, c: cc, again: startApple });
  };
  raf = requestAnimationFrame((n) => { t0 = n; raf = requestAnimationFrame(loop); });
}

// ---------------------------------------------------------------- Ausritt im Wald
const treeTile = (c1, c2, hh) => 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="${hh}" viewBox="0 0 560 ${hh}">${[40, 150, 270, 380, 490].map((x, i) => { const s = 0.8 + (i % 3) * 0.18, b = hh; return `<rect x="${x - 5}" y="${b - 46 * s}" width="10" height="${46 * s}" fill="#7a5a44"/><path d="M${x} ${b - 150 * s} l${46 * s} ${96 * s} h-${92 * s}z M${x} ${b - 110 * s} l${54 * s} ${90 * s} h-${108 * s}z" fill="${i % 2 ? c1 : c2}"/>`; }).join('')}</svg>`) + '")';
function startRide(horseId) {
  const hs = core.adultHorses();
  if (!horseId) {
    if (hs.length > 1) {
      const wrap = frame('Ausritt im Wald');
      wrap.append(h('div', { class: 'mg-pick' }, h('h2', null, 'Wer soll reiten?'), h('div', { class: 'pick-grid' }, hs.map((id) => h('button', { class: 'pick', 'data-ride': id, onclick: () => { Sound.neigh && Sound.neigh(); startRide(id); } }, h('span', { class: 'pv', html: core.horseSVG(Object.assign({}, HORSES[id], { delay: 0 })) }), core.horseName(id))))));
      return;
    }
    horseId = hs[0] || 'luna';
  }
  const wrap = frame('Ausritt im Wald');
  const stage = h('div', { class: 'mg-stage ride', id: 'mgStage' });
  const far = h('div', { class: 'rd-far' }), mid = h('div', { class: 'rd-mid' }), near = h('div', { class: 'rd-near' });
  far.style.backgroundImage = treeTile('#8fcdb8', '#a6d9c4', 220); mid.style.backgroundImage = treeTile('#4fb39a', '#3f9a82', 300); near.style.backgroundImage = treeTile('#2f7f6c', '#276b5c', 380);
  const horse = h('div', { class: 'rd-horse', id: 'rdHorse' }, h('div', { class: 'rd-bob', html: core.rideHorseSVG(horseId) }));
  const ground = h('div', { class: 'rd-ground' });
  stage.append(far, mid, ground, near, horse);
  const score = h('span', null, '⭐ 0');
  const hint = h('div', { class: 'rd-hint', id: 'rdHint' }, 'Tippe auf den Bildschirm: Dein Pferd hüpft! ✨');
  wrap.append(hud(score), stage, hint);
  // Strecke
  const items = [];
  for (let i = 0; i < 6; i++) { const d = 900 + i * 850; items.push({ k: 'log', d }); [-70, 0, 70].forEach((o, j) => items.push({ k: 'star', d: d + o, hi: 1 - (j === 1 ? 0 : 0.35) })); items.push({ k: 'star', d: d + 425, hi: 0 }); }
  const END = 6400;
  items.forEach((it) => {
    it.el = h('div', { class: 'rd-item ' + it.k }, it.k === 'log' ? '' : '');
    it.el.innerHTML = it.k === 'log' ? PA.svg('0 0 90 50', `<rect x="4" y="12" width="82" height="34" rx="14" fill="#9a6c46"/><ellipse cx="14" cy="29" rx="9" ry="16" fill="#d9a96e"/><ellipse cx="14" cy="29" rx="4" ry="8" fill="#b78650"/><path d="M34 20 h40 M30 32 h50" stroke="#7a5236" stroke-width="3" stroke-linecap="round" opacity=".6"/>`) : PA.svg('0 0 40 40', PA.ICON.stern ? PA.ICON.stern() : '');
    stage.append(it.el);
  });
  let dist = 0, vy = 0, y = 0, air = false, stars = 0, stumble = 0, t0 = performance.now(), last = t0, over = false, stepT = 0, jumps = 0;
  const jump = () => { if (air || over) return; air = true; vy = 1; jumps++; Sound.hop && Sound.hop(); hint.classList.add('hide'); };
  stage.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
  const key = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } };
  document.addEventListener('keydown', key); cleanup = () => document.removeEventListener('keydown', key);
  const loop = (now) => {
    if (!document.body.contains(stage)) return;
    const dt = Math.min(0.05, (now - last) / 1000) * speed(); last = now;
    const W = stage.clientWidth, Hh = stage.clientHeight, sc = Math.max(0.55, Math.min(1.2, W / 900));
    const v = (stumble > 0 ? 80 : 240) * dt; dist += v; if (stumble > 0) stumble -= dt;
    far.style.backgroundPositionX = (-dist * 0.12 * sc) + 'px'; mid.style.backgroundPositionX = (-dist * 0.3 * sc) + 'px'; near.style.backgroundPositionX = (-dist * 0.62 * sc) + 'px';
    if (air) { y += vy * dt * 190; vy -= dt * 2.1; if (y <= 0) { y = 0; air = false; vy = 0; Sound.hoof && Sound.hoof(false); } }
    const gy = Hh * 0.2, hx = W * 0.2;
    horse.style.transform = `translate(${hx}px, ${-(y * sc)}px)`;
    horse.classList.toggle('air', air); horse.classList.toggle('stumble', stumble > 0);
    stepT += dt; if (!air && stepT > 0.36) { stepT = 0; Sound.hoof && Sound.hoof(true); }
    for (const it of items) {
      const sx = hx + (it.d - dist) * sc + 70 * sc;
      if (sx < -120 || sx > W + 120) { it.el.style.display = 'none'; continue; }
      it.el.style.display = '';
      const iy = it.k === 'log' ? 0 : (it.hi ? 120 * it.hi : 20);
      it.el.style.transform = `translate(${sx}px, ${-(iy * sc)}px)`;
      if (it.got) continue;
      if (it.k === 'star' && Math.abs(sx - (hx + 70 * sc)) < 46 * sc && Math.abs(y - iy + 30) < 66) {
        it.got = true; it.el.classList.add('got'); stars++; score.textContent = '⭐ ' + stars; Sound.star ? Sound.star() : Sound.coin();
      }
      if (it.k === 'log' && Math.abs(sx - (hx + 70 * sc)) < 36 * sc && y < 34) { it.got = true; it.el.classList.add('gone'); stumble = 0.7; Sound.plop(); hint.textContent = 'Ups! Ganz sanft weiter – hüpf beim nächsten Baumstamm. 🌲'; hint.classList.remove('hide'); }
    }
    if (dist >= END && !over) { over = true; horse.classList.add('stop'); setTimeout(finish, 500); }
    if (!over) raf = requestAnimationFrame(loop);
  };
  const finish = () => endCard(wrap, { title: 'Das war ein schöner Ausritt!', text: `${core.horseName(horseId)} und du habt ${stars} Sterne gesammelt. ⭐`, h: 1 + Math.floor(stars / 6), c: stars >= 16 ? 1 : 0, again: () => startRide(horseId) });
  raf = requestAnimationFrame((n) => { last = n; raf = requestAnimationFrame(loop); });
}

// ---------------------------------------------------------------- Pferde-Memory
function startMemory() {
  const s = st(); const lv = Math.max(1, Math.min(4, s.minis.memLevel || 1)); const pairs = [3, 4, 6, 8][lv - 1];
  const wrap = frame('Pferde-Memory');
  const faces = [];
  core.ownedHorses().forEach((id) => faces.push({ k: 'h' + id, html: core.horseSVG(Object.assign({}, HORSES[id], { delay: 0 })), cls: 'horse' }));
  const got = Object.keys(s.stickers || {}).filter((i) => s.stickers[i] > 0).map(Number);
  shuffle(got).forEach((i) => faces.push({ k: 's' + i, html: PA.stickerSVG(i, true) }));
  [['apfel', PA.ICON.apfel], ['karotte', PA.ICON.karotte], ['hufeisen', PA.ICON.hufeisen], ['herz', PA.ICON.herz], ['stern', PA.ICON.stern], ['blume', PA.ICON.blume], ['sonne', PA.ICON.sonne], ['krone', PA.ICON.krone]].forEach(([k, f]) => { if (f) faces.push({ k: 'i' + k, html: PA.svg('0 0 40 40', f()) }); });
  const pick8 = shuffle(faces).slice(0, pairs);
  const deck = shuffle(pick8.concat(pick8));
  const cols = pairs <= 4 ? 4 : pairs <= 6 ? 4 : 4;
  let first = null, lock = false, moves = 0, found = 0;
  const moveEl = h('span', null, 'Züge: 0');
  const grid = h('div', { class: 'mem-grid c' + deck.length, id: 'memGrid' });
  deck.forEach((f, i) => {
    const c = h('button', { class: 'mem-card', 'data-k': f.k, 'aria-label': 'Karte ' + (i + 1) }, h('div', { class: 'mem-in' }, h('div', { class: 'mem-back' }, h('span', { html: PA.ICON.hufeisen ? PA.svg('0 0 40 40', PA.ICON.hufeisen()) : '🐴' })), h('div', { class: 'mem-front ' + (f.cls || ''), html: f.html })));
    c.addEventListener('click', () => {
      if (lock || c.classList.contains('up') || c.classList.contains('ok')) return;
      c.classList.add('up'); Sound.tick();
      if (!first) { first = c; return; }
      moves++; moveEl.textContent = 'Züge: ' + moves; const a = first; first = null;
      if (a.dataset.k === c.dataset.k) {
        found++; a.classList.add('ok'); c.classList.add('ok'); setTimeout(() => { Sound.correct ? Sound.coin() : null; }, 250);
        if (found === pairs) setTimeout(finish, 700);
      } else { lock = true; setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); lock = false; Sound.plop(); }, 1100); }
    });
    grid.append(c);
  });
  wrap.append(hud(h('span', null, `Paare: ${pairs}`), moveEl), h('div', { class: 'mg-stage mem', id: 'mgStage' }, grid));
  const finish = () => {
    const good = moves <= pairs * 2 + 1; if (good && (s.minis.memLevel || 1) < 4) s.minis.memLevel = lv + 1; core.save();
    endCard(wrap, { title: good ? 'Super gemerkt!' : 'Alle Paare gefunden!', text: `${pairs} Paare in ${moves} Zügen.` + (good && lv < 4 ? ' Beim nächsten Mal sind es mehr Karten!' : ''), h: 1 + lv, c: lv >= 3 ? 1 : 0, again: startMemory });
  };
}

// ---------------------------------------------------------------- Auswahl und Freischaltung
const LIST = [['apfel', '🍎', 'Apfelfangen', 'Fang die fallenden Äpfel mit dem Korb!', startApple], ['wald', '🌲', 'Ausritt im Wald', 'Hüpfe über Baumstämme und sammle Sterne.', () => startRide()], ['memory', '🃏', 'Pferde-Memory', 'Finde die Paare – ohne Zeitdruck.', startMemory]];
function open() {
  const d = core.shop.daily('miniDay');
  const card = h('div', { class: 'lad board', id: 'miniMenu' }, h('div', { class: 'lad-head' }, h('h2', null, '🎮 Mini-Spiele'), h('button', { class: 'iconbtn', id: 'miniClose', 'aria-label': 'Schließen', onclick: () => { Sound.tap(); close(); } }, '✕')),
    h('p', { class: 'board-sub' }, d.shoes >= CAP_H ? 'Für heute hast du genug Belohnung gesammelt – Spielen geht trotzdem!' : 'Spiele ohne Zeitdruck. Für jedes Spiel gibt es ein paar Hufeisen.'),
    h('div', { class: 'board-grid' }, LIST.map(([id, ic, nm, sub, fn]) => {
      const ok = hasMini(id);
      return h('button', { class: 'board-tile mini' + (ok ? '' : ' locked'), 'data-mini': id, onclick: () => { Sound.tap(); close(); if (ok) fn(); else core.shop.open('spiele'); } },
        h('span', { class: 'bt-ic' }, ic), h('b', null, nm), h('small', null, sub), h('span', { class: 'bt-lv' }, ok ? 'Spielen ▶' : '🔒 Im Hofladen holen')); })));
  const close = core.sheet(card, () => { if (core.currentScreen === 'stable') core.showStable(); }); Sound.page();
}
core.minis = { open, start: (id) => { const e = LIST.find((x) => x[0] === id); if (e) e[4](); }, stop: stopAll };
});
