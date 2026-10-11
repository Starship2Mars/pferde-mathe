/* Pferde-Mathe – reines HTML/CSS/JS, keine Netzwerkaufrufe, Daten nur in localStorage */
'use strict';
(function () {
// ---------- Helfer ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MINUS = '−';

// ---------- Speicher ----------
const KEY = 'pferde-mathe-v1';
const GAME_IDS = ['paare', 'haeuser', 'rechnen', 'familie', 'strahl'];
function defaultState() {
  return {
    v: 1, childName: '', bday: null, setupSeen: false, horseNames: {}, blanket: '', brushed: 0, barnOpen: false, shoes: 0, carrots: 0, totalShoes: 0, owned: [], pos: {}, sound: true, volume: 0.5,
    skills: Object.fromEntries(GAME_IDS.map((id) => [id, { level: 1, rounds: 0, recent: [] }])),
    stats: {}, trouble: [], fed: 0, created: Date.now()
  };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      const d = defaultState();
      const skills = {};
      for (const id of GAME_IDS) skills[id] = Object.assign({}, d.skills[id], (s.skills || {})[id]);
      return Object.assign(d, s, { skills });
    }
  } catch (e) { /* ignore */ }
  return defaultState();
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

// ---------- Sanfte Klänge (WebAudio, alles synthetisch, keine Dateien) ----------
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null;
  function ensure() {
    if (!S.sound) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
    master.gain.value = 0.16 * S.volume;
    return ctx;
  }
  function noise() {
    if (!noiseBuf) {
      const len = ctx.sampleRate;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(f, t0, dur, type, g, f2) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), v = c.createGain();
    o.type = type || 'sine';
    const t = c.currentTime + (t0 || 0);
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    env(v, t, g || 0.5, 0.02, dur);
    o.connect(v); v.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(f, t0, dur, g) { tone(f, t0, dur, 'sine', g); tone(f * 2, t0, dur * 0.6, 'sine', g * 0.22); tone(f * 3.01, t0, dur * 0.3, 'sine', g * 0.07); }
  function nz(t0, dur, g, type, freq, freq2, q) {
    const c = ensure(); if (!c) return;
    const s = c.createBufferSource(); s.buffer = noise();
    const f = c.createBiquadFilter(); f.type = type || 'bandpass';
    const t = c.currentTime + (t0 || 0);
    f.frequency.setValueAtTime(freq || 1000, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    f.Q.value = q || 1;
    const v = c.createGain(); env(v, t, g, 0.01, dur);
    s.connect(f); f.connect(v); v.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  const API = {
    unlock() { ensure(); },
    tap() { tone(880, 0, 0.09, 'sine', 0.18); },
    pop() { tone(660, 0, 0.14, 'sine', 0.3); tone(990, 0.06, 0.16, 'sine', 0.18); },
    plop() { tone(520, 0, 0.18, 'sine', 0.32, 170); },
    /** Fröhliches Glockenspiel bei richtiger Antwort – leicht variiert, ab und zu mit Wiehern oder Hufgeklapper */
    correct() {
      const pats = [[523.25, 659.25, 783.99, 1046.5], [587.33, 739.99, 880, 1174.66], [523.25, 783.99, 659.25, 1046.5], [659.25, 783.99, 987.77, 1318.51], [392, 523.25, 659.25, 783.99]];
      pick(pats).forEach((f, i) => bell(f, i * 0.1, 0.55, 0.3));
      const r = Math.random();
      if (r < 0.14) API.neigh(0.55); else if (r < 0.28) API.clipclop(0.5);
    },
    /** Falsche Antwort: nur ein sehr leiser, neutraler Ton */
    hint() { tone(415, 0, 0.35, 'sine', 0.1); },
    /** Größere, aber sanfte Fanfare: Rundenende und neue Stall-Sachen */
    fanfare() {
      [523.25, 659.25, 783.99].forEach((f, i) => bell(f, i * 0.14, 0.6, 0.26));
      [523.25, 659.25, 783.99].forEach((f) => tone(f, 0.46, 1.3, 'triangle', 0.1));
      bell(1046.5, 0.46, 1.3, 0.24);
      [1318.51, 1567.98, 2093].forEach((f, i) => bell(f, 0.95 + i * 0.12, 0.5, 0.08));
    },
    reward() { API.fanfare(); },
    hop() { nz(0, 0.05, 0.3, 'bandpass', 900, null, 3); tone(200, 0, 0.07, 'sine', 0.22); },
    clipclop(t0) { [0, 0.16, 0.36, 0.52].forEach((d, i) => { nz((t0 || 0) + d, 0.05, 0.26, 'bandpass', i % 2 ? 1150 : 850, null, 4); tone(i % 2 ? 230 : 190, (t0 || 0) + d, 0.06, 'sine', 0.18); }); },
    neigh(t0) {
      const c = ensure(); if (!c) return;
      const t = c.currentTime + (t0 || 0);
      const o = c.createOscillator(), v = c.createGain(), l = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1300;
      o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(840, t + 0.15);
      o.frequency.linearRampToValueAtTime(700, t + 0.45); o.frequency.linearRampToValueAtTime(560, t + 0.8);
      l.frequency.value = 11; lg.gain.value = 26; l.connect(lg); lg.connect(o.frequency);
      env(v, t, 0.07, 0.06, 0.85);
      o.connect(f); f.connect(v); v.connect(master); o.start(t); l.start(t); o.stop(t + 0.9); l.stop(t + 0.9);
    },
    munch() { [0, 0.17, 0.34, 0.5].forEach((t) => nz(t, 0.08, 0.26, 'lowpass', 1800, 600, 0.7)); },
    swish() { nz(0, 0.22, 0.07, 'bandpass', 1800, 4200, 1.2); },
    sparkle() { bell(pick([1567.98, 1760, 2093, 2349.32]), 0, 0.3, 0.05); },
    quack() {
      const c = ensure(); if (!c) return;
      [0, 0.2].forEach((d) => {
        const t = c.currentTime + d;
        const o = c.createOscillator(), f = c.createBiquadFilter(), v = c.createGain();
        o.type = 'square'; f.type = 'lowpass'; f.frequency.value = 900;
        o.frequency.setValueAtTime(390, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.13);
        env(v, t, 0.05, 0.02, 0.15);
        o.connect(f); f.connect(v); v.connect(master); o.start(t); o.stop(t + 0.2);
      });
    },
    chirp() { [0, 0.09, 0.2].forEach((t) => tone(2600 + Math.random() * 400, t, 0.07, 'sine', 0.05, 3400)); },
    meow() { tone(620, 0, 0.18, 'sine', 0.08, 800); tone(800, 0.16, 0.3, 'sine', 0.07, 520); },
    woof() { [0, 0.22].forEach((t) => tone(300, t, 0.13, 'triangle', 0.1, 190)); },
    cluck() { [0, 0.12, 0.24].forEach((t) => tone(520, t, 0.07, 'triangle', 0.07, 420)); },
    door() { tone(196, 0, 0.28, 'triangle', 0.14, 150); nz(0, 0.22, 0.04, 'lowpass', 600); }
  };
  return API;
})();
['touchend', 'pointerdown', 'click'].forEach((ev) => document.addEventListener(ev, () => Sound.unlock(), { passive: true }));

// ---------- Grafiken ----------
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((x) => Math.max(0, Math.min(255, Math.round(x * f))));
  return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
}
const HORSES = {
  luna: { body: '#c98b57', mane: '#6b3e26', muzzle: '#efcfae', blaze: true },
  wolke: { body: '#f6f3ee', mane: '#cbbfb1', muzzle: '#efe6dc', blaze: false },
  nacht: { body: '#5b4b48', mane: '#2c2220', muzzle: '#8a7570', blaze: true },
  fohlen: { body: '#e0ad73', mane: '#94603a', muzzle: '#f3d7b8', blaze: true, foal: true },
  pony: { body: '#fbf3e6', mane: '#7b5236', muzzle: '#f3e2cc', blaze: false, spots: '#b07a4f', pony: true }
};
const BLANKET_COLORS = ['#9ad0ec', '#f7a8c4', '#b9e2a0', '#d6c2f2', '#ffd27a'];
const DEFAULT_HNAMES = { luna: 'Luna', wolke: 'Wolke', nacht: 'Nacht', fohlen: 'Krümel', pony: 'Keks' };
function horseName(id) { const n = (S.horseNames || {})[id]; return (n && String(n).trim()) || DEFAULT_HNAMES[id] || ''; }
function LN() { return horseName('luna'); }
function horseSVG(o) {
  o = Object.assign({}, HORSES.luna, o || {});
  const body = o.body, mane = o.mane, far = shade(body, 0.85), hoof = '#6a4a38';
  const ly = o.foal ? 104 : 110, lh = o.foal ? 52 : o.pony ? 36 : 44;
  const leg = (x, c) => `<rect x="${x}" y="${ly}" width="12" height="${lh}" rx="6" fill="${c}"/><rect x="${x - 1}" y="${ly + lh - 8}" width="14" height="10" rx="4" fill="${hoof}"/>`;
  const spots = o.spots ? `<ellipse cx="80" cy="92" rx="16" ry="12" fill="${o.spots}"/><ellipse cx="114" cy="106" rx="11" ry="8" fill="${o.spots}"/><ellipse cx="58" cy="100" rx="8" ry="10" fill="${o.spots}"/>` : '';
  const blanket = o.blanket ? `<path d="M62 74 Q95 60 128 74 L132 110 Q95 124 58 110 Z" fill="${o.blanket}"/><path d="M58 110 Q95 124 132 110" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="1 7" stroke-linecap="round"/><path d="M95 95 c-3 -6 -12 -3 -8 4 l8 7 l8 -7 c4 -7 -5 -10 -8 -4z" fill="#fff" opacity=".85"/>` : '';
  const saddle = o.saddle ? `${o.blanket ? '' : '<path d="M72 74 Q95 64 118 74 L120 92 Q95 100 70 92 Z" fill="#9ad0ec"/>'}<path d="M80 72 Q95 62 110 72 L111 84 Q95 90 79 84 Z" fill="#8b5a2b"/><path d="M94 86 L94 104" stroke="#6a4a38" stroke-width="3"/><circle cx="94" cy="106" r="4" fill="none" stroke="#c9962a" stroke-width="3"/>` : '';
  const bow = o.bow ? `<g transform="translate(136 30)"><path d="M0 0 L-14 -9 L-14 9 Z" fill="#f48fb1"/><path d="M0 0 L14 -9 L14 9 Z" fill="#f48fb1"/><circle r="5" fill="#ec6f9c"/></g>` : '';
  const blaze = o.blaze ? `<path d="M152 34 Q160 40 172 56 Q166 58 160 50 Q154 42 150 37 Z" fill="#fff" opacity=".85"/>` : '';
  const dl = o.delay != null ? o.delay : -Math.random() * 5;
  return `<svg class="horse" viewBox="0 0 210 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="tail" style="animation-delay:${dl}s"><path d="M50 88 C22 90 14 122 26 148 C34 130 40 112 54 100 Z" fill="${mane}"/></g>
  ${leg(60, far)}${leg(124, far)}
  <ellipse cx="95" cy="98" rx="54" ry="31" fill="${body}"/>${spots}
  ${leg(72, body)}${leg(136, body)}
  ${blanket}${saddle}
  <g class="head" style="animation-delay:${dl * 1.3}s">
  <path d="M116 84 C122 62 130 46 140 32 L166 46 C156 64 150 84 146 104 Z" fill="${body}"/>
  <path d="M138 28 C128 44 120 62 113 86 L123 86 C128 66 136 50 147 36 Z" fill="${mane}"/>
  <polygon points="143,32 147,10 157,30" fill="${body}"/><polygon points="146,28 148,16 153,29" fill="#f3b6c3"/>
  <ellipse cx="164" cy="50" rx="31" ry="18" transform="rotate(32 164 50)" fill="${body}"/>
  ${blaze}
  <ellipse cx="183" cy="66" rx="14" ry="12" fill="${o.muzzle}"/>
  <path d="M146 30 C150 22 160 24 162 34 C156 31 151 33 146 37 Z" fill="${mane}"/>
  <g class="eye" style="animation-delay:${dl}s"><circle cx="158" cy="45" r="5.5" fill="#3a2a20"/><circle cx="160" cy="43" r="2" fill="#fff"/></g>
  <circle cx="168" cy="58" r="4.5" fill="#f3a0b5" opacity=".55"/>
  <ellipse cx="189" cy="63" rx="2.2" ry="1.6" fill="#7a5a48"/>
  <path d="M175 73 Q182 78 190 72" stroke="#7a5a48" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  ${bow}
  </g>
</svg>`;
}
function has(id) { return S.owned.includes(id); }
function lunaOpts() { return { saddle: has('sattel'), bow: has('schleife'), blanket: has('decke') ? (S.blanket || BLANKET_COLORS[0]) : null }; }
function lunaSVG() { return horseSVG(lunaOpts()); }
const SHOE = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 5 C1 22 7 37 20 37 C33 37 39 22 32 5 L25 5 C29 20 26 30 20 30 C14 30 11 20 15 5 Z" fill="#f2c14e" stroke="#c9962a" stroke-width="2" stroke-linejoin="round"/><circle cx="9.5" cy="15" r="1.4" fill="#a87b1c"/><circle cx="11" cy="24" r="1.4" fill="#a87b1c"/><circle cx="30.5" cy="15" r="1.4" fill="#a87b1c"/><circle cx="29" cy="24" r="1.4" fill="#a87b1c"/></svg>`;
const SHOE_EMPTY = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 5 C1 22 7 37 20 37 C33 37 39 22 32 5 L25 5 C29 20 26 30 20 30 C14 30 11 20 15 5 Z" fill="#f3ece3" stroke="#dccbb8" stroke-width="2" stroke-dasharray="3 3" stroke-linejoin="round"/></svg>`;
const HAY = `<svg viewBox="0 0 100 70" aria-hidden="true"><rect x="4" y="8" width="92" height="58" rx="14" fill="#f2d16b" stroke="#d1a93c" stroke-width="3"/><path d="M14 20 h72 M10 34 h80 M14 48 h72" stroke="#d9b54d" stroke-width="3" stroke-dasharray="6 5"/><rect x="30" y="8" width="7" height="58" fill="#b5652f"/><rect x="63" y="8" width="7" height="58" fill="#b5652f"/><path d="M8 10 l-4 -6 M20 8 l-2 -7 M80 8 l3 -7 M92 10 l5 -5" stroke="#e1bd52" stroke-width="3"/></svg>`;

function burst(el, chars) {
  const r = el.getBoundingClientRect();
  const set = chars || ['💖', '⭐', '✨', '🌸'];
  for (let i = 0; i < 6; i++) {
    const s = h('span', { class: 'fx' }, pick(set));
    s.style.left = (r.left + r.width / 2 + rand(-40, 40)) + 'px';
    s.style.top = (r.top + r.height / 3 + rand(-10, 10)) + 'px';
    s.style.setProperty('--dx', rand(-50, 50) + 'px');
    s.style.animationDelay = (i * 0.07) + 's';
    document.body.append(s);
    setTimeout(() => s.remove(), 1700);
  }
}

// ---------- Rahmen / Bildschirme ----------
const app = $('#app');
let currentScreen = 'home';
function shell(title, isHome) {
  clearInterval(ambientTimer);
  app.innerHTML = '';
  const bar = h('header', { class: 'topbar' },
    isHome ? h('div', { class: 'title' }, '🐴 ', title)
      : h('button', { class: 'iconbtn', 'aria-label': 'Nach Hause', id: 'homeBtn', onclick: () => { Sound.tap(); showHome(); } }, '🏠'),
    !isHome ? h('div', { class: 'title' }, title) : null,
    h('div', { class: 'counter', id: 'shoeCount', title: 'Hufeisen', html: SHOE + `<span>${S.shoes}</span>` }),
    h('div', { class: 'counter', id: 'carrotCount', title: 'Karotten' }, h('span', { class: 'emo' }, '🥕'), h('span', null, String(S.carrots))),
    h('button', { class: 'iconbtn', id: 'soundBtn', 'aria-label': 'Ton an oder aus', onclick: toggleSound }, S.sound ? '🔊' : '🔇')
  );
  const main = h('main', { id: 'screen' });
  app.append(bar, main);
  return main;
}
function updateCounters() {
  const a = $('#shoeCount span'); if (a) a.textContent = S.shoes;
  const b = $('#carrotCount span:last-child'); if (b) b.textContent = S.carrots;
}
function toggleSound() {
  S.sound = !S.sound; save();
  const b = $('#soundBtn'); if (b) b.textContent = S.sound ? '🔊' : '🔇';
  if (S.sound) Sound.pop();
}
function lunaBlock(text, small, mood) {
  const wrap = h('div', { class: 'luna-wrap' },
    h('div', { class: 'luna' + (small ? ' small' : ''), html: lunaSVG() }),
    h('div', { class: 'bubble' + (mood === 'think' ? ' think' : '') }, text));
  return wrap;
}
function say(text, mood) {
  const b = $('.bubble'); if (!b) return;
  b.textContent = text;
  b.classList.toggle('think', mood === 'think');
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  if (mood === 'happy') {
    const l = $('.luna'); if (l) { l.classList.remove('happy'); void l.offsetWidth; l.classList.add('happy'); }
  }
}

// ---------- Startseite ----------
function kidName() { return String(S.childName || '').trim(); }
function withName(pre, post) { const n = kidName(); return n ? `${pre}, ${n}${post == null ? '!' : post}` : `${pre}${post == null ? '!' : post}`; }
function birthdayInfo() {
  const b = S.bday;
  if (!b || !b.d || !b.m) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let days = Math.round((new Date(today.getFullYear(), b.m - 1, b.d) - today) / 86400000);
  if (days < -7) days = Math.round((new Date(today.getFullYear() + 1, b.m - 1, b.d) - today) / 86400000);
  return { days, isToday: days === 0 };
}
function greeting() {
  const hr = new Date().getHours();
  const hello = hr < 11 ? withName('Guten Morgen') : hr < 18 ? withName('Hallo') : withName('Guten Abend');
  return hello + ' ' + pick([`Ich bin ${LN()}. Schön, dass du da bist! Was wollen wir heute spielen?`,
    'Ich habe mich schon auf dich gefreut! Such dir ein Spiel aus.',
    'Wollen wir zusammen ein bisschen rechnen? Ich helfe dir!',
    'Wie schön, dass du mich besuchst! Wähle ein Spiel.']);
}
function showHome() {
  currentScreen = 'home';
  const main = shell('Pferde-Mathe', true);
  const bd = birthdayInfo();
  let banner = null;
  if (bd && bd.isToday) {
    banner = h('div', { class: 'bday', id: 'bdayBanner' }, '🎂 ' + withName('Alles Gute zum Geburtstag', '! 🎉🐴'));
    if (!S.owned.includes('kuchen')) { S.owned.push('kuchen'); save(); }
  } else if (bd && bd.days > 0 && bd.days <= 21) {
    banner = h('div', { class: 'bday', id: 'bdayBanner' }, `🎈 Noch ${bd.days} Mal schlafen bis zu deinem Geburtstag! 🎈`);
  } else if (bd && bd.days < 0 && bd.days >= -7 && !S.owned.includes('kuchen')) {
    S.owned.push('kuchen'); save();
  }
  let setup = null;
  if (!S.setupSeen && !kidName()) {
    setup = h('div', { class: 'setup', id: 'setupCard' },
      h('div', null, h('b', null, '👪 Für Eltern: '), 'Sie können einmalig den Namen und den Geburtstag Ihres Kindes eintragen. Das bleibt nur auf diesem Gerät.'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'smallbtn', id: 'setupNow', style: { background: '#ffe08a' }, onclick: () => { S.setupSeen = true; save(); showGate(); } }, 'Jetzt eintragen'),
        h('button', { class: 'smallbtn', id: 'setupLater', onclick: () => { S.setupSeen = true; save(); showHome(); } }, 'Später / nicht nötig')));
  }
  const tiles = h('div', { class: 'tiles' },
    GAMES.map((g, i) => h('button', { class: 'tile c' + (i + 1), 'data-game': g.id, onclick: () => { Sound.tap(); startGame(g.id); } },
      h('div', { class: 'ti' }, g.icon), g.name, h('small', null, g.sub))),
    h('button', { class: 'tile stall', 'data-game': 'stall', onclick: () => { Sound.tap(); showStable(); } },
      h('div', { class: 'ti' }, '🏡'), 'Pferdehof', h('small', null, 'Hufeisen eintauschen')));
  main.append(h('div', { class: 'screen home' },
    setup, banner,
    h('div', { class: 'hero' }, lunaBlock(bd && bd.isToday ? 'Heute ist dein Geburtstag! Ich habe dir einen Kuchen in den Stall gestellt. 🎂' : greeting())),
    tiles,
    h('button', { class: 'parent-link', id: 'parentLink', onclick: showGate }, '👪 Für Eltern')));
}

// ---------- Spiel-Rahmen ----------
const ROUND = 5;
const TYPE_LABELS = {
  'paare': 'Zerlegung der 10 (verliebte Zahlen)',
  'haus-10': 'Zahlenhaus bis 10', 'haus-20': 'Zahlenhaus bis 20', 'haus-dach': 'Dachzahl finden (Plus)',
  'plus10': 'Plus bis 10', 'minus10': 'Minus bis 10',
  'plus20o': 'Plus bis 20 ohne Zehnerübergang', 'minus20o': 'Minus bis 20 ohne Zehnerübergang',
  'plusZU': 'Plus mit Zehnerübergang', 'minusZU': 'Minus mit Zehnerübergang',
  'familie-plus': 'Aufgabenfamilie: Plusaufgabe', 'tausch': 'Tauschaufgabe rechnen', 'umkehr': 'Umkehraufgabe (Minus)',
  'tausch-erkennen': 'Tauschaufgabe erkennen',
  'strahl-finden-10': 'Zahlenstrahl: Zahl finden bis 10', 'strahl-finden-20': 'Zahlenstrahl: Zahl finden bis 20',
  'strahl-huepfen': 'Zahlenstrahl: hüpfen (ohne Übergang)', 'strahl-zehner': 'Zahlenstrahl: hüpfen über die 10'
};
const PRAISE = ['Super gemacht! 🌟', 'Toll! 💖', 'Ganz genau! 🐴', 'Prima! 🥰', 'Wunderbar! ✨', 'Richtig! Du bist klasse! 🌸', 'Juhu, stimmt! 🎉'];

function makeApi(game, root) {
  const sk = S.skills[game.id];
  const results = [];
  const missed = new Set();
  let doneCount = 0;
  const prog = $('.progress', root);
  const api = {
    level: sk.level,
    say,
    praise() { const l = PRAISE.concat([`${LN()} freut sich! 🥰`]); return pick(kidName() ? l.concat([withName('Toll', '! 💖')]) : l); },
    miss(type, label, key) {
      Sound.hint();
      S.stats[type] = S.stats[type] || { n: 0, ok: 0, hints: 0 };
      S.stats[type].hints++;
      const k = key || label;
      if (!missed.has(k)) {
        missed.add(k);
        S.trouble.unshift({ t: type, l: label, d: Date.now() });
        S.trouble = S.trouble.slice(0, 40);
      }
      save();
    },
    done(type, firstTry, el) {
      S.stats[type] = S.stats[type] || { n: 0, ok: 0, hints: 0 };
      S.stats[type].n++;
      if (firstTry) S.stats[type].ok++;
      results.push(!!firstTry);
      S.shoes++; S.totalShoes++;
      doneCount++;
      save(); updateCounters();
      Sound.correct();
      if (el) burst(el);
      const slots = $$('.progress span', root);
      if (slots[doneCount - 1]) { slots[doneCount - 1].innerHTML = SHOE; slots[doneCount - 1].classList.add('on'); }
    },
    finish() {
      const ok = results.filter(Boolean).length;
      const acc = results.length ? ok / results.length : 1;
      sk.rounds++;
      sk.recent = sk.recent.concat(results).slice(-12);
      const recentAcc = sk.recent.filter(Boolean).length / Math.max(1, sk.recent.length);
      let levelUp = false;
      if (acc >= 0.8 && sk.recent.length >= 8 && recentAcc >= 0.8 && sk.level < game.maxLevel) {
        sk.level++; sk.recent = []; levelUp = true;
      } else if (acc < 0.4 && sk.level > 1) {
        sk.level--; sk.recent = [];
      }
      S.carrots++;
      save();
      showRoundEnd(game, results.length, levelUp);
    }
  };
  return api;
}

function startGame(id) {
  const game = GAMES.find((g) => g.id === id);
  currentScreen = 'game-' + id;
  const main = shell(game.name, false);
  const scr = h('div', { class: 'screen' },
    h('div', { class: 'game game-' + id },
      h('div', { class: 'game-top' }, lunaBlock(game.intro, true),
        h('div', { class: 'progress', 'aria-label': 'Fortschritt' }, range(1, ROUND).map(() => h('span', { html: SHOE_EMPTY })))),
      h('div', { class: 'stage', id: 'stage' })));
  main.append(scr);
  const api = makeApi(game, scr);
  game.start(api, $('#stage', scr));
}

function numPad(max, onPick) {
  const pad = h('div', { class: 'pad ' + (max > 10 ? 'pad20' : 'pad10') });
  for (let n = 0; n <= max; n++) {
    const b = h('button', { class: 'num', 'data-n': n, 'aria-label': 'Zahl ' + n }, String(n));
    b.addEventListener('click', () => onPick(n, b));
    pad.append(b);
  }
  return pad;
}
function softNo(b) { b.classList.remove('soft-no'); void b.offsetWidth; b.classList.add('soft-no'); setTimeout(() => b.classList.remove('soft-no'), 1100); }
function glowBtn(container, n) { const b = $(`[data-n="${n}"]`, container); if (b) b.classList.add('glow'); }
function clearMarks(container) { $$('.glow,.yes,.soft-no', container).forEach((b) => b.classList.remove('glow', 'yes', 'soft-no')); }
function miniTen(n) { return h('div', { class: 'mini10' }, range(1, 10).map((i) => h('i', { class: i <= n ? 'f' : '' }))); }

// ---------- 1) Verliebte Zahlen ----------
const Paare = {
  id: 'paare', name: 'Verliebte Zahlen', icon: '💞', sub: 'Zusammen sind sie 10', maxLevel: 3,
  levels: ['Karten offen, mit Punktebildern', 'Karten offen, nur Zahlen', 'Memory (Karten verdeckt)'],
  intro: 'Zwei Zahlen sind verliebt, wenn sie zusammen 10 sind. Tippe zwei Karten an, die zusammenpassen!',
  start(api, stage) {
    const L = api.level;
    const all = [[0, 10], [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]];
    const pairs = L === 1 ? all.slice(1) : shuffle(all).slice(0, 5);
    const cards = shuffle(pairs.flatMap((p) => [{ n: p[0], key: p[0] }, { n: p[1], key: p[0] }]));
    if (L === 3) api.say('Memory! Alle Karten liegen verdeckt. Finde zwei Zahlen, die zusammen 10 sind. Merk dir, wo sie liegen!');
    const errs = {};
    let sel = null, busy = false, matched = 0;
    const grid = h('div', { class: 'cards' });
    cards.forEach((c, i) => {
      const el = h('button', { class: 'mcard' + (L === 3 ? ' down' : ''), 'data-i': i, 'data-n': c.n, 'aria-label': 'Karte' },
        h('div', { class: 'face front' }, h('span', null, String(c.n)), L === 1 ? miniTen(c.n) : null, h('span', { class: 'heart' }, '💕')),
        h('div', { class: 'face back', html: SHOE }));
      c.el = el;
      el.addEventListener('click', () => tapCard(c));
      grid.append(el);
    });
    stage.append(grid);
    stage.style.display = 'block';

    function flip(el) { el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); }
    function tapCard(c) {
      if (busy || c.matched || c === sel) return;
      Sound.tap();
      if (L === 3) { c.el.classList.remove('down'); flip(c.el); }
      if (!sel) {
        sel = c; c.el.classList.add('sel');
        if (L < 3) api.say(`Die ${c.n}! Welche Zahl braucht die ${c.n}, damit es zusammen 10 sind?`, 'think');
        return;
      }
      const a = sel, sum = a.n + c.n;
      if (sum === 10) {
        a.matched = c.matched = true;
        a.el.classList.remove('sel', 'glow'); c.el.classList.remove('glow');
        a.el.classList.add('matched'); c.el.classList.add('matched');
        $$('.mcard.glow', grid).forEach((x) => x.classList.remove('glow'));
        sel = null; matched++;
        api.done('paare', !errs[a.key], c.el);
        api.say(`${a.n} und ${c.n} sind zusammen 10. Die zwei sind verliebt! 💕`, 'happy');
        if (matched === pairs.length) setTimeout(() => api.finish(), 1600);
        return;
      }
      busy = true;
      c.el.classList.add('sel');
      if (L < 3) {
        errs[a.key] = (errs[a.key] || 0) + 1;
        api.miss('paare', `${a.n} + ? = 10`, 'p' + a.key);
        if (errs[a.key] >= 3) {
          $$('.mcard', grid).forEach((x) => { if (+x.dataset.n === 10 - a.n && !cards[+x.dataset.i].matched) x.classList.add('glow'); });
          api.say(`Die ${a.n} braucht die ${10 - a.n}. Schau, welche Karte leuchtet!`, 'think');
        } else if (L === 1 || errs[a.key] === 2) {
          api.say(`${a.n} und ${c.n} sind zusammen ${sum}. Die ${a.n} braucht ${10 - a.n}, damit es 10 sind.`, 'think');
        } else {
          api.say(`${a.n} und ${c.n} sind zusammen ${sum}, nicht 10. Wie viele fehlen der ${a.n} bis zur 10?`, 'think');
        }
        setTimeout(() => { c.el.classList.remove('sel'); busy = false; }, 1300);
      } else {
        api.say(`${a.n} und ${c.n} passen nicht zusammen. Die ${a.n} sucht die ${10 - a.n}. Merk dir die Karten!`, 'think');
        setTimeout(() => {
          a.el.classList.remove('sel'); c.el.classList.remove('sel');
          a.el.classList.add('down'); c.el.classList.add('down'); flip(a.el); flip(c.el);
          sel = null; busy = false;
        }, 1700);
      }
    }
  }
};

// ---------- 2) Zahlenhäuser ----------
const Haeuser = {
  id: 'haeuser', name: 'Zahlenhäuser', icon: '🏠', sub: 'Wer wohnt im Haus?', maxLevel: 5,
  levels: ['Dach bis 7, zwei Stockwerke', 'Dach 6 bis 10', 'Dach 8 bis 10 und Dachzahl finden', 'Dach 11 bis 15', 'Dach 12 bis 20'],
  intro: 'In jedem Stockwerk wohnen zwei Zahlen. Zusammen sind sie so viel wie die Zahl auf dem Dach.',
  start(api, stage) {
    const L = api.level;
    let idx = 0;
    const next = () => { stage.innerHTML = ''; if (idx >= ROUND) { api.finish(); return; } renderHouse(idx++); };
    next();
    function renderHouse(i) {
      const [lo, hi] = [[4, 7], [6, 10], [8, 10], [11, 15], [12, 20]][L - 1];
      const roof = rand(lo, hi);
      const roofBlank = L >= 3 && i === ROUND - 1;
      const nFloors = L === 1 || roofBlank ? 2 : 3;
      const lefts = shuffle(range(1, roof - 1)).slice(0, nFloors).sort((a, b) => a - b);
      const rows = lefts.map((a) => ({ a, b: roof - a, blank: roofBlank ? null : (Math.random() < 0.5 ? 'a' : 'b') }));
      const type = roofBlank ? 'haus-dach' : roof <= 10 ? 'haus-10' : 'haus-20';
      const blanks = [];
      let houseErr = false;
      const dots = h('div', { class: 'dots' });
      const roofCell = h('button', { class: 'hc' + (roofBlank ? ' blank' : '') }, roofBlank ? '?' : String(roof));
      if (roofBlank) blanks.push({ el: roofCell, val: roof, roof: true, errs: 0 });
      const floors = h('div', { class: 'floors' }, rows.map((r) => {
        const cell = (v, isBlank, known) => {
          const el = h('button', { class: 'hc' + (isBlank ? ' blank' : '') }, isBlank ? '?' : String(v));
          if (isBlank) blanks.push({ el, val: v, known, errs: 0 });
          return el;
        };
        return h('div', { class: 'floor' }, cell(r.a, r.blank === 'a', r.b), cell(r.b, r.blank === 'b', r.a));
      }));
      blanks.forEach((b) => b.el.addEventListener('click', () => { if (!b.filled) { Sound.tap(); setCur(b); } }));
      const house = h('div', { class: 'house' }, h('div', { class: 'roof' }, roofCell), floors);
      const max = roof > 10 || L >= 4 ? 20 : 10;
      const pad = numPad(max, onPick);
      stage.append(h('div', { class: 'left' }, house, dots), h('div', { class: 'right' }, pad, h('div', { class: 'note' }, 'Tippe auf die richtige Zahl.')));
      let cur = null;
      setCur(blanks[0]);
      api.say(roofBlank ? 'Oh, das Dach hat keine Zahl! Wie viel sind beide Zahlen in einem Stockwerk zusammen?'
        : `Das Dach sagt ${roof}. Welche Zahl fehlt im leuchtenden Kästchen?`);
      function setCur(b) {
        cur = b; blanks.forEach((x) => x.el.classList.toggle('cur', x === b));
        dots.innerHTML = ''; dots.classList.remove('strong'); clearMarks(pad);
      }
      function showDots(b, strong) {
        dots.innerHTML = '';
        if (b.roof) {
          range(1, rows[0].a).forEach(() => dots.append(h('i', { class: 'f' })));
          range(1, rows[0].b).forEach(() => dots.append(h('i', { class: 'g' })));
        } else {
          range(1, roof).forEach((k) => dots.append(h('i', { class: k <= b.known ? 'f' : '' }, strong && k > b.known ? String(k - b.known) : '')));
        }
        dots.classList.toggle('strong', !!strong);
      }
      function onPick(n, btn) {
        if (!cur || cur.filled) return;
        if (n === cur.val) {
          cur.filled = true; cur.el.textContent = String(n); cur.el.classList.remove('blank', 'cur'); cur.el.classList.add('filled');
          btn.classList.add('yes'); setTimeout(() => btn.classList.remove('yes'), 600);
          const rest = blanks.filter((x) => !x.filled);
          if (rest.length) {
            Sound.pop(); api.say(pick(['Genau!', 'Richtig!', 'Stimmt!', 'Prima!']) + ' Und jetzt das nächste Kästchen.', 'happy');
            setTimeout(() => setCur(rest[0]), 350);
          } else {
            cur = null; dots.innerHTML = '';
            api.done(type, !houseErr, house);
            api.say(api.praise() + ' Alle Zahlen sind zu Hause.', 'happy');
            setTimeout(next, 1700);
          }
          return;
        }
        houseErr = true; cur.errs++;
        softNo(btn);
        const lbl = cur.roof ? `Dach: ${rows[0].a} + ${rows[0].b}` : `Haus ${roof}: ${cur.known} + ?`;
        api.miss(type, lbl, lbl);
        if (cur.roof) {
          if (cur.errs === 1) { api.say(`Fast! Rechne ${rows[0].a} + ${rows[0].b}. Die Punkte helfen dir beim Zählen.`, 'think'); showDots(cur); }
          else { showDots(cur); glowBtn(pad, cur.val); api.say('Zähl alle Punkte zusammen. Schau, welcher Knopf leuchtet!', 'think'); }
        } else if (cur.errs === 1) {
          api.say(`Hmm, noch nicht ganz. ${cur.known} und wie viele sind zusammen ${roof}? Die Punkte helfen dir.`, 'think'); showDots(cur, false);
        } else if (cur.errs === 2) {
          api.say(`Zähl die leeren Kreise: So viele fehlen der ${cur.known} bis zur ${roof}.`, 'think'); showDots(cur, true);
        } else {
          showDots(cur, true); glowBtn(pad, cur.val); api.say('Schau, welcher Knopf leuchtet. Du schaffst das!', 'think');
        }
      }
    }
  }
};

// ---------- 3) Plus und Minus mit Zwanzigerfeld ----------
function genCalc(type) {
  let a, b;
  switch (type) {
    case 'plus10': a = rand(1, 8); b = rand(1, 10 - a); return { a, b, op: '+', res: a + b, type };
    case 'minus10': a = rand(3, 10); b = rand(1, a - 1); return { a, b, op: MINUS, res: a - b, type };
    case 'plus20o': a = rand(10, 17); b = rand(1, 9 - (a % 10)); return { a, b, op: '+', res: a + b, type };
    case 'minus20o': a = rand(12, 19); b = rand(1, a % 10); return { a, b, op: MINUS, res: a - b, type };
    case 'plusZU': a = rand(3, 9); b = rand(11 - a, 9); if (b < 2) b = 2; return { a, b, op: '+', res: a + b, type };
    case 'minusZU': a = rand(11, 17); b = rand((a % 10) + 1, 9); return { a, b, op: MINUS, res: a - b, type };
  }
}
const CALC_PLAN = [
  ['plus10'],
  ['plus10', 'minus10'],
  ['plus20o', 'minus20o', 'plus10'],
  ['plusZU', 'plusZU', 'plus20o', 'minus20o'],
  ['plusZU', 'minusZU', 'plusZU', 'minusZU', 'plus20o']
];
const Rechnen = {
  id: 'rechnen', name: 'Plus und Minus', icon: '🧮', sub: 'Rechnen mit dem Zwanzigerfeld', maxLevel: 5,
  levels: ['Plus bis 10', 'Plus und Minus bis 10', 'Bis 20 ohne Zehnerübergang', 'Plus mit Zehnerübergang', 'Plus und Minus mit Zehnerübergang'],
  intro: 'Rechne mit mir! Im Zwanzigerfeld kannst du Plättchen legen und wegnehmen.',
  start(api, stage) {
    const L = api.level;
    const plan = CALC_PLAN[L - 1];
    const tasks = [];
    const seen = new Set();
    let guard = 0;
    while (tasks.length < ROUND && guard++ < 200) {
      const t = genCalc(plan[tasks.length % plan.length]);
      const k = t.a + t.op + t.b;
      if (seen.has(k)) continue;
      seen.add(k); tasks.push(t);
    }
    const order = shuffle(tasks);
    let idx = 0;
    const next = () => { stage.innerHTML = ''; if (idx >= order.length) { api.finish(); return; } render(order[idx++]); };
    next();
    function render(t) {
      const plus = t.op === '+';
      const size = L <= 2 ? 10 : 20;
      const max = L <= 2 ? 10 : 20;
      const zu = t.type === 'plusZU' || t.type === 'minusZU';
      let errs = 0, busy = false;
      const ans = h('span', { class: 'ans' }, '?');
      const eq = h('div', { class: 'eq' }, `${t.a} ${t.op} ${t.b} = `, ans);
      // Feld: Zustände 0 leer, 1 = erste Zahl, 2 = dazugelegt, 3 = weggenommen
      const st = new Array(size).fill(0);
      for (let i = 0; i < t.a; i++) st[i] = 1;
      const field = h('div', { class: 'zf' + (size === 10 ? ' ten' : '') });
      const cells = [];
      for (let i = 0; i < size; i++) {
        const c = h('button', { class: 'cell', 'aria-label': 'Feld ' + (i + 1) });
        c.addEventListener('click', () => tapCell(i));
        cells.push(c);
      }
      // Gap richtig platzieren: wir bauen das Raster neu, damit die Lücke in Spalte 6 steht
      field.innerHTML = '';
      cells.forEach((c, i) => {
        if (i === 5) field.append(h('div', { class: 'gap' }));
        field.append(c);
      });
      const caption = h('div', { class: 'zf-caption' });
      const strategy = h('div', { class: 'strategy' });
      const trickBtn = h('button', { class: 'softbtn', onclick: () => { Sound.tap(); runTrick(); } }, '💡 Trick zeigen');
      const resetBtn = h('button', { class: 'softbtn', style: { background: '#f3ece3' }, onclick: () => { Sound.tap(); resetField(); } }, '↺ Neu legen');
      const pad = numPad(max, onPick);
      stage.append(
        h('div', { class: 'left' }, eq, field, caption, h('div', { class: 'btnrow' }, trickBtn, resetBtn), strategy),
        h('div', { class: 'right' }, pad, h('div', { class: 'note' }, plus ? 'Tippe ins Feld, um blaue Plättchen dazuzulegen.' : 'Tippe auf ein Plättchen, um es wegzunehmen.')));
      api.say(plus ? `Was ist ${t.a} plus ${t.b}? Leg ${t.b} blaue Plättchen dazu, wenn du magst.`
        : `Was ist ${t.a} minus ${t.b}? Nimm ${t.b} Plättchen weg, wenn du magst.`);
      draw();
      function count(v) { return st.filter((x) => x === v).length; }
      function draw() {
        st.forEach((v, i) => { cells[i].className = 'cell' + (v === 1 ? ' a' : v === 2 ? ' b' : v === 3 ? ' gone' : ''); });
        if (plus) {
          const nb = count(2);
          caption.textContent = nb === 0 ? `${t.a} Plättchen liegen schon da.` : nb === t.b ? `${t.a} + ${t.b} – jetzt zähle alle!` : `${t.a} + ${nb}`;
        } else {
          const ng = count(3);
          caption.textContent = ng === 0 ? `${t.a} Plättchen liegen da.` : ng === t.b ? `${t.a} ${MINUS} ${t.b} – wie viele sind noch da?` : `${t.a} ${MINUS} ${ng}`;
        }
      }
      function tapCell(i) {
        if (busy) return;
        if (plus) {
          if (st[i] === 2) { const last = st.lastIndexOf(2); st[last] = 0; Sound.tap(); }
          else { const free = st.indexOf(0); if (free < 0) return; st[free] = 2; Sound.pop(); }
        } else {
          if (st[i] === 1) { const last = st.lastIndexOf(1); st[last] = 3; Sound.pop(); }
          else if (st[i] === 3) { const first = st.indexOf(3); st[first] = 1; Sound.tap(); }
          else return;
        }
        draw();
      }
      function resetField() {
        if (busy) return;
        st.fill(0); for (let i = 0; i < t.a; i++) st[i] = 1; strategy.innerHTML = ''; draw();
      }
      async function runTrick() {
        if (busy) return;
        busy = true; trickBtn.disabled = true;
        st.fill(0); for (let i = 0; i < t.a; i++) st[i] = 1; draw();
        strategy.innerHTML = '';
        await sleep(300);
        const line = (html) => { strategy.append(h('div', { html })); };
        if (plus) {
          if (zu) {
            const first = 10 - t.a, rest = t.b - first;
            line(`${t.a} + ${t.b} = ${t.a} + <span class="s1">${first}</span> + <span class="s2">${rest}</span>`);
            api.say(`Erst bis zur 10 auffüllen: ${t.a} + ${first} = 10.`, 'think');
            for (let k = 0; k < first; k++) { st[st.indexOf(0)] = 2; draw(); Sound.pop(); await sleep(380); }
            line(`${t.a} + <span class="s1">${first}</span> = 10`);
            await sleep(700);
            api.say(`Dann noch ${rest} dazu: 10 + ${rest}. Wie viel ist das?`, 'think');
            for (let k = 0; k < rest; k++) { st[st.indexOf(0)] = 2; draw(); Sound.pop(); await sleep(380); }
            line(`10 + <span class="s2">${rest}</span> = ?`);
          } else {
            for (let k = 0; k < t.b; k++) { st[st.indexOf(0)] = 2; draw(); Sound.pop(); await sleep(380); }
            if (t.a >= 10) { line(`${t.a % 10} + ${t.b} = ${t.a % 10 + t.b}`); line(`also ${t.a} + ${t.b} = ?`); api.say(`Kleiner Trick: ${t.a % 10} + ${t.b} = ${t.a % 10 + t.b}. Und die Zehn bleibt!`, 'think'); }
            else { line(`Zähle alle Plättchen: ${t.a} + ${t.b} = ?`); api.say('Jetzt zähle alle Plättchen zusammen.', 'think'); }
          }
        } else {
          if (zu) {
            const first = t.a - 10, rest = t.b - first;
            line(`${t.a} ${MINUS} ${t.b} = ${t.a} ${MINUS} <span class="s1">${first}</span> ${MINUS} <span class="s2">${rest}</span>`);
            api.say(`Erst bis zur 10 zurück: ${t.a} ${MINUS} ${first} = 10.`, 'think');
            for (let k = 0; k < first; k++) { st[st.lastIndexOf(1)] = 3; draw(); Sound.pop(); await sleep(380); }
            line(`${t.a} ${MINUS} <span class="s1">${first}</span> = 10`);
            await sleep(700);
            api.say(`Dann noch ${rest} weg: 10 ${MINUS} ${rest}. Wie viele bleiben?`, 'think');
            for (let k = 0; k < rest; k++) { st[st.lastIndexOf(1)] = 3; draw(); Sound.pop(); await sleep(380); }
            line(`10 ${MINUS} <span class="s2">${rest}</span> = ?`);
          } else {
            for (let k = 0; k < t.b; k++) { st[st.lastIndexOf(1)] = 3; draw(); Sound.pop(); await sleep(380); }
            if (t.a > 10 && t.a % 10 >= t.b) { line(`${t.a % 10} ${MINUS} ${t.b} = ${t.a % 10 - t.b}`); line(`also ${t.a} ${MINUS} ${t.b} = ?`); api.say(`Kleiner Trick: ${t.a % 10} ${MINUS} ${t.b} = ${t.a % 10 - t.b}. Und die Zehn bleibt!`, 'think'); }
            else { line(`Zähle, wie viele noch da sind: ${t.a} ${MINUS} ${t.b} = ?`); api.say('Zähle die Plättchen, die noch da sind.', 'think'); }
          }
        }
        busy = false; trickBtn.disabled = false;
      }
      function onPick(n, btn) {
        if (ans.classList.contains('filled')) return;
        if (n === t.res) {
          ans.textContent = String(n); ans.classList.add('filled');
          clearMarks(pad); btn.classList.add('yes');
          api.done(t.type, errs === 0, eq);
          api.say(api.praise() + ` ${t.a} ${t.op} ${t.b} = ${t.res}`, 'happy');
          setTimeout(next, 1800);
          return;
        }
        errs++;
        softNo(btn);
        api.miss(t.type, `${t.a} ${t.op} ${t.b}`);
        if (errs === 1) {
          api.say(plus ? 'Fast! Leg die blauen Plättchen ins Feld und zähle dann alle.' : 'Fast! Nimm die Plättchen im Feld weg und zähle, wie viele übrig sind.', 'think');
          field.classList.remove('pulse'); void field.offsetWidth; field.classList.add('pulse');
        } else if (errs === 2) {
          runTrick();
        } else {
          glowBtn(pad, t.res); api.say('Schau, welcher Knopf leuchtet. Das ist die Lösung!', 'think');
        }
      }
    }
  }
};

// ---------- 4) Aufgabenfamilie (Tausch- und Umkehraufgaben) ----------
function genFamily(L) {
  let a, b;
  if (L === 1) { do { a = rand(1, 8); b = rand(1, 9 - a); } while (a === b); }
  else if (L === 2) { a = rand(10, 15); b = rand(2, 9 - (a % 10)); }
  else { do { a = rand(3, 9); b = rand(Math.max(2, 11 - a), 9); } while (a === b); }
  if (Math.random() < 0.5) [a, b] = [b, a];
  return { a, b, c: a + b };
}
const Familie = {
  id: 'familie', name: 'Aufgabenfamilie', icon: '👪', sub: 'Tauschen und Umkehren', maxLevel: 3,
  levels: ['Familien bis 10', 'Familien bis 20 ohne Zehnerübergang', 'Mit Zehnerübergang und Lücken an anderer Stelle'],
  intro: 'Das ist eine Pferdefamilie! Mit drei Zahlen kann man vier Aufgaben rechnen.',
  start(api, stage) {
    const L = api.level;
    const { a, b, c } = genFamily(L);
    const rows = [
      { l: a, op: '+', r: b, res: c, type: 'familie-plus' },
      { l: b, op: '+', r: a, res: c, type: 'tausch' },
      { l: c, op: MINUS, r: b, res: a, type: 'umkehr' },
      { l: c, op: MINUS, r: a, res: b, type: 'umkehr' }
    ];
    rows.forEach((r, i) => { r.blank = 'res'; if (L === 3 && i > 0 && Math.random() < 0.5) r.blank = i === 1 ? 'l' : 'r'; });
    const fam = h('div', { class: 'family' },
      h('div', { class: 'fm kid' }, h('div', { class: 'horsebox', html: horseSVG(HORSES.fohlen) }), h('div', { class: 'badge' }, String(a))),
      h('div', { class: 'fm big' }, h('div', { class: 'horsebox', html: horseSVG(HORSES.wolke) }), h('div', { class: 'badge' }, String(c))),
      h('div', { class: 'fm kid' }, h('div', { class: 'horsebox', html: horseSVG(HORSES.luna) }), h('div', { class: 'badge' }, String(b))));
    const rowsEl = h('div', { class: 'rows' });
    rows.forEach((r) => {
      const part = (key, v) => r.blank === key ? (r.bx = h('span', { class: 'bx' }, '?')) : h('span', null, String(v));
      r.el = h('div', { class: 'row' }, h('span', { class: 'star' }, ''), part('l', r.l), h('span', null, r.op), part('r', r.r), h('span', null, '='), part('res', r.res));
      r.want = r.blank === 'l' ? r.l : r.blank === 'r' ? r.r : r.res;
      rowsEl.append(r.el);
    });
    const right = h('div', { class: 'right' });
    stage.append(h('div', { class: 'left' }, fam, rowsEl), right);
    const pad = numPad(c > 10 ? 20 : 10, onPick);
    right.append(pad);
    let ri = 0, errs = 0;
    focusRow();
    function focusRow() {
      rows.forEach((r, i) => r.el.classList.toggle('cur', i === ri));
      clearMarks(pad); errs = 0;
      const r = rows[ri];
      const txt = [
        `Die Familie hat die Zahlen ${a}, ${b} und ${c}. Fang mit der Plusaufgabe an!`,
        'Jetzt die Tauschaufgabe: Die Zahlen tauschen nur den Platz.',
        'Jetzt rechnen wir rückwärts mit Minus. Das ist die Umkehraufgabe.',
        'Noch eine Umkehraufgabe! Welches Familienmitglied bleibt übrig?'][ri];
      api.say(txt);
      if (r.blank !== 'res' && ri > 0) api.say('Hier fehlt eine Zahl in der Mitte oder vorne. Welche Zahl aus der Familie passt?');
    }
    function pulseFam() { fam.classList.remove('pulse'); void fam.offsetWidth; fam.classList.add('pulse'); }
    function onPick(n, btn) {
      const r = rows[ri];
      if (!r) return;
      if (n === r.want) {
        r.bx.textContent = String(n); r.bx.classList.add('filled');
        r.el.classList.remove('cur'); r.el.classList.add('ok'); $('.star', r.el).textContent = '⭐';
        btn.classList.add('yes');
        api.done(r.type, errs === 0, r.el);
        if (ri === 1) api.say('Siehst du? Beim Tauschen bleibt das Ergebnis gleich! 🌟', 'happy');
        else api.say(api.praise(), 'happy');
        ri++;
        setTimeout(() => (ri < rows.length ? focusRow() : askTausch()), 1500);
        return;
      }
      errs++;
      softNo(btn);
      api.miss(r.type, `${r.blank === 'l' ? '?' : r.l} ${r.op} ${r.blank === 'r' ? '?' : r.r} = ${r.blank === 'res' ? '?' : r.res}`);
      pulseFam();
      if (errs >= 3) { glowBtn(pad, r.want); api.say('Schau, welcher Knopf leuchtet!', 'think'); return; }
      if (ri === 0) api.say(errs === 1 ? `Rechne ${a} + ${b}. Die große Zahl in der Familie verrät es dir!` : `Die Familie: ${a} und ${b} sind zusammen ${c}.`, 'think');
      else if (ri === 1) api.say(errs === 1 ? 'Tauschaufgabe! Die Zahlen tauschen nur den Platz – das Ergebnis bleibt gleich.' : `${a} + ${b} = ${c}. Also ist ${b} + ${a} auch ${c}.`, 'think');
      else if (r.blank === 'r') api.say(errs === 1 ? `Von ${c} geht eine Zahl weg, und ${r.res} bleibt übrig. Welche Zahl aus der Familie ist das?`
        : `Denk an die Familie: ${r.res} + ? = ${c}.`, 'think');
      else api.say(errs === 1 ? `Minus rechnet rückwärts. Von ${c} gehen ${r.r} weg. Welches Familienmitglied bleibt übrig?`
        : `Denk an die Familie: ${r.r} + ? = ${c}.`, 'think');
    }
    function askTausch() {
      rows.forEach((r) => r.el.classList.remove('cur'));
      right.innerHTML = '';
      api.say(`Letzte Frage: Welche Aufgabe ist die Tauschaufgabe von ${a} + ${b}?`);
      const big = Math.max(a, b), small = Math.min(a, b);
      const opts = shuffle([
        { t: `${b} + ${a}`, ok: true },
        { t: `${big} ${MINUS} ${small}`, ok: false },
        { t: `${c} ${MINUS} ${b}`, ok: false }]);
      let e = 0;
      const box = h('div', { class: 'choices' }, h('div', { class: 'task-big' }, `Tauschaufgabe von ${a} + ${b}?`));
      opts.forEach((o) => {
        const bt = h('button', { class: 'choice' }, o.t);
        bt.addEventListener('click', () => {
          if (box.dataset.done) return;
          if (o.ok) {
            box.dataset.done = '1'; bt.classList.add('yes');
            api.done('tausch-erkennen', e === 0, bt);
            api.say(`Ja! ${a} + ${b} und ${b} + ${a} sind Tauschaufgaben. Beide sind ${c}. 💕`, 'happy');
            setTimeout(() => api.finish(), 1800);
          } else {
            e++; softNo(bt); api.miss('tausch-erkennen', `Tausch von ${a} + ${b}`);
            api.say(e === 1 ? 'Bei der Tauschaufgabe bleiben die Zahlen gleich und auch das Plus. Nur der Platz wird getauscht.' : `Schau mal: ${b} + ${a} – die ${a} und die ${b} haben getauscht.`, 'think');
            if (e >= 2) box.querySelectorAll('.choice').forEach((x) => { if (x.textContent === `${b} + ${a}`) x.classList.add('glow'); });
          }
        });
        box.append(bt);
      });
      right.append(box);
    }
  }
};

// ---------- 5) Zahlenstrahl-Hüpfen ----------
function genLineTasks(L) {
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < ROUND && guard++ < 300) {
    let t;
    if (L === 1) { const n = rand(1, 10); t = { kind: 'find', target: n, type: 'strahl-finden-10' }; }
    else if (L === 2) { let n; do { n = rand(1, 19); } while (n % 5 === 0 && Math.random() < 0.8); t = { kind: 'find', target: n, type: 'strahl-finden-20' }; }
    else if (L === 3) {
      const plus = Math.random() < 0.6, k = rand(1, 5);
      let s;
      if (plus) { s = pick([rand(0, 9), rand(10, 19)]); const lim = s < 10 ? 10 : 20; if (s + k > lim) continue; t = { start: s, step: k, target: s + k }; }
      else { s = pick([rand(2, 10), rand(11, 20)]); const lim = s > 10 ? 10 : 0; if (s - k < lim) continue; t = { start: s, step: -k, target: s - k }; }
      t.kind = 'hop'; t.type = 'strahl-huepfen';
    } else {
      const plus = Math.random() < 0.55;
      if (plus) { const s = rand(5, 9), k = rand(11 - s, Math.min(9, 18 - s)); t = { start: s, step: k, target: s + k }; }
      else { const s = rand(11, 16), k = rand(s - 9, Math.min(9, s - 3)); t = { start: s, step: -k, target: s - k }; }
      t.kind = 'hop'; t.type = 'strahl-zehner';
    }
    const key = JSON.stringify([t.target, t.start, t.step]);
    if (seen.has(key)) continue;
    seen.add(key); out.push(t);
  }
  return out;
}
const Strahl = {
  id: 'strahl', name: 'Zahlenstrahl-Hüpfen', icon: '🐎', sub: 'Das Pferd hüpft von 0 bis 20', maxLevel: 4,
  levels: ['Zahlen finden bis 10', 'Zahlen finden bis 20', 'Hüpfen bis 20 (ohne Übergang)', 'Hüpfen über die 10'],
  intro: 'Ich hüpfe so gern auf dem Zahlenstrahl! Hilfst du mir?',
  start(api, stage) {
    const L = api.level;
    const max = L === 1 ? 10 : 20;
    const tasks = genLineTasks(L);
    let idx = 0, pos = 0;
    stage.style.display = 'block';
    const next = () => { stage.innerHTML = ''; if (idx >= tasks.length) { api.finish(); return; } render(tasks[idx++]); };
    next();
    function render(t) {
      if (t.kind === 'hop') pos = t.start;
      let errs = 0, busy = false;
      const center = (n) => ((n + 0.5) / (max + 1)) * 100;
      const horse = h('div', { class: 'line-horse', html: lunaSVG() });
      const ticks = h('div', { class: 'ticks' + (max === 10 ? ' t10' : '') });
      const tickEls = range(0, max).map((n) => {
        const showLabel = L !== 2 || n % 5 === 0;
        const el = h('button', { class: 'tick' + (n % 5 === 0 ? ' five' : '') + (t.kind === 'hop' && n === t.start ? ' start' : ''), 'data-n': n, 'aria-label': 'Zahl ' + n },
          h('span', { class: 'm' }), h('span', { class: 'lb' }, showLabel ? String(n) : ''));
        el.addEventListener('click', () => onTap(n, el));
        ticks.append(el);
        return el;
      });
      const wrap = h('div', { class: 'line-wrap' }, horse, ticks);
      const plus = t.step > 0, k = Math.abs(t.step || 0);
      const head = t.kind === 'find'
        ? h('div', { class: 'task-big' }, `Wo ist die ${t.target}?`)
        : h('div', { class: 'task-big' }, `${t.start} ${plus ? '+' : MINUS} ${k} = ?`);
      stage.append(head, h('div', { style: { height: '14px' } }), wrap, h('div', { class: 'note', style: { marginTop: '12px' } }, 'Tippe auf die Zahl auf dem Zahlenstrahl.'));
      const place = () => { horse.style.left = center(pos) + '%'; };
      place();
      if (t.kind === 'find') api.say(`Wo ist die ${t.target}? Tippe auf die Stelle, dann galoppiere ich hin!`);
      else api.say(`Ich stehe auf der ${t.start}. Ich hüpfe ${k} ${plus ? 'nach vorne' : 'zurück'}. Wo lande ich?`);
      async function hopTo(target, speed, withArcs) {
        const dir = target > pos ? 1 : -1;
        let c = 0;
        while (pos !== target) {
          pos += dir; c++;
          horse.classList.remove('hop'); void horse.offsetWidth; horse.classList.add('hop');
          place(); Sound.hop();
          if (withArcs) {
            const arc = h('span', { class: 'arc' }, String(c));
            arc.style.left = center(pos) + '%';
            ticks.append(arc);
          }
          await sleep(speed);
        }
      }
      function clearArcs() { $$('.arc', ticks).forEach((a) => a.remove()); }
      async function onTap(n, el) {
        if (busy) return;
        Sound.tap();
        if (n === t.target) {
          busy = true;
          tickEls.forEach((x) => x.classList.remove('glow', 'seg', 'soft-no'));
          el.classList.add('yes');
          $('.lb', el).textContent = String(n);
          clearArcs();
          if (t.kind === 'hop') { pos = t.start; place(); await sleep(150); await hopTo(t.target, 380, true); }
          else await hopTo(t.target, 130, false);
          api.done(t.type, errs === 0, el);
          api.say(t.kind === 'find' ? `${api.praise()} Da ist die ${t.target}!` : `${api.praise()} ${t.start} ${plus ? '+' : MINUS} ${k} = ${t.target}`, 'happy');
          setTimeout(next, 1700);
          return;
        }
        errs++;
        el.classList.add('soft-no'); setTimeout(() => el.classList.remove('soft-no'), 1200);
        api.miss(t.type, t.kind === 'find' ? `Finde ${t.target}` : `${t.start} ${plus ? '+' : MINUS} ${k}`);
        if (errs >= 3) { tickEls[t.target].classList.add('glow'); api.say('Schau, wo es leuchtet!', 'think'); return; }
        if (t.kind === 'find') {
          const lo = Math.floor(t.target / 5) * 5;
          if (errs === 1) {
            if (t.target % 5 === 0) api.say(`Fast! Die ${t.target} hat einen langen Strich.`, 'think');
            else api.say(`Fast! Die ${t.target} liegt zwischen ${lo} und ${lo + 5}.`, 'think');
          } else {
            for (let x = lo; x <= Math.min(max, lo + 5); x++) tickEls[x].classList.add('seg');
            api.say(`Fang bei der ${lo} an und zähle weiter: ${lo + 1}, ${lo + 2} …`, 'think');
          }
        } else if (errs === 1) {
          api.say(`Fast! Zähl die Sprünge von der ${t.start} aus: 1, 2, 3 … bis ${k}.`, 'think');
        } else {
          busy = true;
          api.say('Ich zeige es dir! Zähl mit …', 'think');
          clearArcs(); pos = t.start; place(); await sleep(300);
          await hopTo(t.target, 650, true);
          await sleep(700);
          api.say('Hast du mitgezählt? Tippe auf die Zahl, wo ich gelandet bin.', 'think');
          busy = false;
        }
      }
    }
  }
};

const GAMES = [Paare, Haeuser, Rechnen, Familie, Strahl];
const GAME_TYPES = {
  paare: ['paare'], haeuser: ['haus-10', 'haus-20', 'haus-dach'],
  rechnen: ['plus10', 'minus10', 'plus20o', 'minus20o', 'plusZU', 'minusZU'],
  familie: ['familie-plus', 'tausch', 'umkehr', 'tausch-erkennen'],
  strahl: ['strahl-finden-10', 'strahl-finden-20', 'strahl-huepfen', 'strahl-zehner']
};

// ---------- Rundenende ----------
function showRoundEnd(game, n, levelUp) {
  currentScreen = 'end';
  const main = shell(game.name, false);
  const msg = pick([withName('Toll gemacht'), withName('Super'), 'Wunderbar gerechnet!', 'Du bist ein Mathe-Star!']);
  main.append(h('div', { class: 'screen' }, h('div', { class: 'end' },
    h('div', { class: 'luna happy', html: lunaSVG() }),
    h('h2', null, msg + ' 🌟'),
    h('div', { class: 'loot' },
      h('div', { html: SHOE + `<span>+${n} Hufeisen</span>` }),
      h('div', null, h('span', { style: { fontSize: '2.2rem' } }, '🥕'), h('span', null, '+1 Karotte'))),
    h('p', { style: { fontSize: '1.2rem', margin: 0 } }, levelUp ? `${LN()} sagt: Du wirst immer besser! Beim nächsten Mal gibt es neue Aufgaben. 💖`
      : `${LN()} sagt: Danke, dass du mit mir gerechnet hast! Möchtest du mir auf dem Pferdehof eine Karotte geben?`),
    h('div', { class: 'btnrow' },
      h('button', { class: 'bigbtn primary', id: 'againBtn', onclick: () => { Sound.tap(); startGame(game.id); } }, '🔁 Noch eine Runde'),
      h('button', { class: 'bigbtn', id: 'toStable', onclick: () => { Sound.tap(); showStable(); } }, '🏡 Zum Stall'),
      h('button', { class: 'bigbtn', onclick: () => { Sound.tap(); showHome(); } }, '🏠 Startseite')))));
  Sound.reward();
  setTimeout(() => { const l = $('.end .luna'); if (l) burst(l, ['⭐', '💖', '✨', '🥕']); }, 200);
}

// ---------- Pferdehof (Vollbild) – alle Grafiken selbst gezeichnet (Inline-SVG) ----------
const svgw = (vb, inner, cls) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${inner}</svg>`;
function flowerSVG(x, y, hgt, col, dl) {
  const petals = range(0, 4).map((i) => { const a = (i / 5) * Math.PI * 2; return `<circle cx="${(x + Math.cos(a) * 5).toFixed(1)}" cy="${(y - hgt + Math.sin(a) * 5).toFixed(1)}" r="4.6" fill="${col}"/>`; }).join('');
  return `<g class="sway" style="animation-delay:${dl}s"><path d="M${x} ${y} q-2 -${hgt / 2} 0 -${hgt}" stroke="#5fa04e" stroke-width="3" fill="none"/><ellipse cx="${x + 4}" cy="${y - hgt / 2.4}" rx="5" ry="2.4" fill="#6fb85a" transform="rotate(-30 ${x + 4} ${y - hgt / 2.4})"/>${petals}<circle cx="${x}" cy="${y - hgt}" r="3.6" fill="#ffd166"/></g>`;
}
const ART = {
  trough: svgw('0 0 140 70', `<rect x="14" y="44" width="10" height="24" rx="3" fill="#8a5a36"/><rect x="116" y="44" width="10" height="24" rx="3" fill="#8a5a36"/>
    <path d="M6 22 L134 22 L124 54 L16 54 Z" fill="#b07a4f" stroke="#8a5a36" stroke-width="3" stroke-linejoin="round"/><path d="M14 31 H126 M18 43 H122" stroke="#9a6740" stroke-width="2"/>
    <ellipse cx="70" cy="23" rx="62" ry="6" fill="#8fd3f4"/><ellipse class="shimmer" cx="48" cy="22" rx="16" ry="2" fill="#fff" opacity=".7"/>`),
  flowerbed: svgw('0 0 160 80', `<ellipse cx="80" cy="68" rx="76" ry="11" fill="#9c6b45"/><ellipse cx="80" cy="64" rx="70" ry="8" fill="#b17d52"/>
    ${[[18, 64, 30, '#f7a8c4'], [36, 66, 40, '#ffe08a'], [54, 63, 28, '#d6c2f2'], [72, 66, 42, '#fff'], [90, 63, 32, '#f7a8c4'], [108, 66, 38, '#ffb38a'], [126, 63, 30, '#b5dcff'], [144, 65, 36, '#ffe08a']].map(([x, y, hh, c], i) => flowerSVG(x, y, hh, c, -i * 0.4)).join('')}`),
  kitten: svgw('0 0 120 100', `<g class="kitten"><path d="M44 46 L47 24 L58 38 Z" fill="#f2a65a"/><path d="M76 46 L73 24 L62 38 Z" fill="#f2a65a"/><path d="M47 30 L49 26 L54 35 Z" fill="#f7c3cf"/><path d="M73 30 L71 26 L66 35 Z" fill="#f7c3cf"/>
    <ellipse cx="60" cy="46" rx="21" ry="16" fill="#f2a65a"/><path d="M52 34 q8 4 16 0" stroke="#d98a3e" stroke-width="2.5" fill="none"/>
    <g class="eye"><path d="M49 45 q4 -4 8 0" stroke="#3a2a20" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M63 45 q4 -4 8 0" stroke="#3a2a20" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
    <path d="M57.5 50 h5 l-2.5 2.6z" fill="#e9798f"/><path d="M36 50 h12 M36 55 h12 M72 50 h12 M72 55 h12" stroke="#fff" stroke-width="1.4" opacity=".8"/><circle cx="50" cy="54" r="3" fill="#f7a0b5" opacity=".5"/><circle cx="70" cy="54" r="3" fill="#f7a0b5" opacity=".5"/></g>
    <rect x="8" y="56" width="104" height="42" rx="12" fill="#f2d16b" stroke="#d1a93c" stroke-width="3"/><path d="M16 68 h88 M14 80 h92 M18 90 h84" stroke="#d9b54d" stroke-width="3" stroke-dasharray="6 5"/>
    <rect x="34" y="56" width="7" height="42" fill="#b5652f"/><rect x="79" y="56" width="7" height="42" fill="#b5652f"/><ellipse cx="49" cy="60" rx="7" ry="4.5" fill="#f2a65a"/><ellipse cx="71" cy="60" rx="7" ry="4.5" fill="#f2a65a"/>
    <path d="M10 58 l-4 -7 M24 56 l-1 -8 M98 56 l3 -8 M110 59 l5 -6" stroke="#e1bd52" stroke-width="3"/>`),
  chickens: svgw('0 0 150 86', [[40, 1], [96, -1]].map(([x, d]) => `<g class="peck" style="animation-delay:${d}s">
    <path d="M${x - 18} ${48} q-14 -18 -4 -26 q4 10 10 14z" fill="#f1e6d6"/><ellipse cx="${x}" cy="52" rx="21" ry="16" fill="#fffaf2"/><ellipse cx="${x - 3}" cy="52" rx="11" ry="7" fill="#efe3d2"/>
    <circle cx="${x + 17}" cy="35" r="9.5" fill="#fffaf2"/><circle cx="${x + 15}" cy="25" r="3.5" fill="#f28b82"/><circle cx="${x + 19}" cy="25" r="3.2" fill="#f28b82"/>
    <path d="M${x + 25} ${34} l8 3 l-8 3z" fill="#f6b26b"/><circle cx="${x + 19}" cy="33" r="1.8" fill="#3a2a20"/><path d="M${x + 24} 41 q3 4 -1 6" fill="#f28b82"/>
    <path d="M${x - 5} 66 v12 M${x + 5} 66 v12" stroke="#f6b26b" stroke-width="3" stroke-linecap="round"/></g>`).join('') +
    `<g class="peck" style="animation-delay:-0.5s"><circle cx="68" cy="72" r="8.5" fill="#ffe27a"/><circle cx="76" cy="64" r="6" fill="#ffe27a"/><path d="M81 64 l5 1.5 l-5 1.5z" fill="#f6b26b"/><circle cx="77.5" cy="62.5" r="1.3" fill="#3a2a20"/></g>`),
  dog: svgw('0 0 120 110', `<g class="wag"><path d="M34 82 C18 78 14 62 20 52 C26 62 30 70 40 74 Z" fill="#c8935e"/></g>
    <ellipse cx="54" cy="76" rx="26" ry="28" fill="#c8935e"/><ellipse cx="64" cy="80" rx="12" ry="18" fill="#f6ead9"/>
    <rect x="56" y="88" width="10" height="20" rx="5" fill="#c8935e"/><rect x="70" y="88" width="10" height="20" rx="5" fill="#c8935e"/><ellipse cx="40" cy="102" rx="14" ry="7" fill="#b98352"/>
    <circle cx="76" cy="42" r="21" fill="#c8935e"/><ellipse cx="91" cy="50" rx="12" ry="9" fill="#f3dcc0"/><circle cx="101" cy="46" r="4.2" fill="#3a2a20"/>
    <path d="M92 58 q3 6 7 1" fill="#f28ba0"/><g class="eye"><circle cx="81" cy="36" r="3.3" fill="#3a2a20"/><circle cx="82" cy="35" r="1.1" fill="#fff"/></g>
    <path d="M62 26 C50 26 48 44 54 54 C60 50 64 40 66 30 Z" fill="#8d5a35"/><circle cx="86" cy="46" r="3" fill="#f3a0b5" opacity=".5"/>`),
  rainbow: svgw('0 0 300 160', ['#ffb3ba', '#ffd8a8', '#fff3a8', '#c7f0b4', '#b5dcff', '#d7c4f5'].map((c, i) => `<path d="M${22 + i * 11} 150 A${128 - i * 11} ${128 - i * 11} 0 0 1 ${278 - i * 11} 150" stroke="${c}" stroke-width="11.5" fill="none"/>`).join('') +
    `<g fill="#fff"><circle cx="30" cy="150" r="16"/><circle cx="52" cy="152" r="13"/><circle cx="14" cy="154" r="10"/><circle cx="270" cy="150" r="16"/><circle cx="248" cy="152" r="13"/><circle cx="288" cy="154" r="10"/></g>`),
  arena: svgw('0 0 400 170', `<ellipse cx="200" cy="100" rx="192" ry="64" fill="#e9cf9f"/><ellipse cx="200" cy="100" rx="176" ry="54" fill="#f6e3bd"/>
    <path d="M60 100 q140 30 280 0" stroke="#efd8ac" stroke-width="5" fill="none" stroke-dasharray="14 10"/>
    ${range(0, 15).map((i) => { const a = (i / 16) * Math.PI * 2; const x = 200 + Math.cos(a) * 186, y = 100 + Math.sin(a) * 60; return `<rect x="${(x - 3).toFixed(1)}" y="${(y - 22).toFixed(1)}" width="6" height="24" rx="2" fill="#fff"/>`; }).join('')}
    <ellipse cx="200" cy="88" rx="186" ry="60" fill="none" stroke="#fff" stroke-width="4"/>
    ${[[130, '#f7a8c4'], [270, '#9ad0ec']].map(([x, c]) => `<rect x="${x - 34}" y="70" width="8" height="40" rx="3" fill="#fff" stroke="#d9cdbd"/><rect x="${x + 26}" y="70" width="8" height="40" rx="3" fill="#fff" stroke="#d9cdbd"/>
      <rect x="${x - 30}" y="82" width="60" height="7" rx="3.5" fill="${c}"/><path d="M${x - 22} 85.5 h8 M${x - 4} 85.5 h8 M${x + 14} 85.5 h8" stroke="#fff" stroke-width="7"/>
      <rect x="${x - 30}" y="96" width="60" height="6" rx="3" fill="#fff"/><path d="M${x - 22} 99 h8 M${x - 4} 99 h8 M${x + 14} 99 h8" stroke="${c}" stroke-width="6"/>`).join('')}
    <path d="M196 120 l6 -14 l6 14z" fill="#ffb38a"/>`),
  sunflowers: svgw('0 0 90 140', [[22, 140, 70], [48, 140, 100], [72, 140, 80]].map(([x, y, hh], k) => `<g class="sway" style="animation-delay:${-k * 0.7}s"><path d="M${x} ${y} q-3 -${hh / 2} 0 -${hh}" stroke="#5c9e4a" stroke-width="4" fill="none"/>
    <ellipse cx="${x + 7}" cy="${y - hh / 2.2}" rx="9" ry="4" fill="#6fb85a" transform="rotate(-25 ${x + 7} ${y - hh / 2.2})"/>
    ${range(0, 11).map((i) => { const a = (i / 12) * 360; return `<ellipse cx="${x}" cy="${y - hh - 11}" rx="3.6" ry="8" fill="#ffd166" transform="rotate(${a} ${x} ${y - hh})"/>`; }).join('')}
    <circle cx="${x}" cy="${y - hh}" r="8" fill="#9a6235"/><circle cx="${x - 2}" cy="${y - hh - 2}" r="1.4" fill="#c88b52"/><circle cx="${x + 3}" cy="${y - hh + 2}" r="1.4" fill="#c88b52"/></g>`).join('')),
  cake: svgw('0 0 100 100', `<ellipse cx="50" cy="92" rx="44" ry="7" fill="#e9e1f5"/><rect x="14" y="56" width="72" height="34" rx="9" fill="#f7a8c4"/><rect x="24" y="34" width="52" height="26" rx="8" fill="#fff2dc"/>
    <path d="M24 42 q6 8 10 0 q6 8 10 0 q6 8 10 0 q6 8 10 0 q6 8 12 0 v-6 h-52z" fill="#fff"/><path d="M14 64 q7 9 12 0 q7 9 12 0 q7 9 12 0 q7 9 12 0 q7 9 12 0 q7 9 12 0 v-8 h-72z" fill="#fde3ec"/>
    ${[36, 50, 64].map((x, i) => `<rect x="${x - 2.5}" y="18" width="5" height="16" rx="2" fill="${['#9ad0ec', '#ffe08a', '#b9e2a0'][i]}"/><path class="flame" style="animation-delay:${-i * 0.3}s" d="M${x} 6 q5 7 0 11 q-5 -4 0 -11z" fill="#ffb347"/>`).join('')}
    ${[[22, 76, '#9ad0ec'], [40, 82, '#ffe08a'], [60, 74, '#fff'], [76, 82, '#b9e2a0']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${c}"/>`).join('')}`),
  butterfly: (c) => svgw('0 0 40 32', `<g class="wings"><ellipse cx="12" cy="11" rx="10" ry="8" fill="${c}"/><ellipse cx="28" cy="11" rx="10" ry="8" fill="${c}"/><ellipse cx="13" cy="22" rx="7" ry="6" fill="${c}" opacity=".85"/><ellipse cx="27" cy="22" rx="7" ry="6" fill="${c}" opacity=".85"/><circle cx="11" cy="10" r="2.5" fill="#fff" opacity=".7"/><circle cx="29" cy="10" r="2.5" fill="#fff" opacity=".7"/></g><rect x="18.8" y="6" width="2.4" height="20" rx="1.2" fill="#5a4033"/><path d="M20 6 q-3 -5 -6 -5 M20 6 q3 -5 6 -5" stroke="#5a4033" stroke-width="1.2" fill="none"/>`),
  cloud: svgw('0 0 200 80', `<g fill="currentColor"><circle cx="60" cy="48" r="28"/><circle cx="100" cy="36" r="34"/><circle cx="140" cy="50" r="26"/><rect x="34" y="48" width="134" height="28" rx="14"/></g>`),
  bird: svgw('0 0 40 20', `<path class="flapb" d="M2 12 Q10 2 20 10 Q30 2 38 12" stroke="#6d6a8a" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  duck: (c, bill) => svgw('0 0 64 46', `<path d="M8 28 L2 20 L14 24 Z" fill="${c}"/><ellipse cx="28" cy="31" rx="21" ry="11" fill="${c}"/><ellipse cx="25" cy="29" rx="10" ry="5.5" fill="#000" opacity=".06"/><circle cx="45" cy="16" r="9.5" fill="${c}"/><ellipse cx="56" cy="18.5" rx="7" ry="3.3" fill="${bill}"/><circle cx="47.5" cy="13.5" r="1.8" fill="#3a2a20"/><circle cx="47" cy="20" r="2.4" fill="#f7a0b5" opacity=".5"/><path d="M8 40 q22 8 42 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`),
  tree: svgw('0 0 200 240', `<path d="M90 240 C92 200 88 170 80 150 L104 150 C100 172 108 205 114 240 Z" fill="#9a6640"/><path d="M96 175 C80 160 70 150 60 148" stroke="#9a6640" stroke-width="8" fill="none" stroke-linecap="round"/>
    <g class="canopy"><circle cx="100" cy="92" r="66" fill="#7cc36a"/><circle cx="55" cy="110" r="42" fill="#8fd27a"/><circle cx="148" cy="108" r="44" fill="#73b862"/><circle cx="100" cy="52" r="44" fill="#8fd27a"/><circle cx="80" cy="80" r="28" fill="#9fdc89" opacity=".7"/>
    ${[[70, 90], [118, 70], [140, 120], [92, 124], [52, 122], [110, 104], [76, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="#f26d6d"/><circle cx="${x - 2.5}" cy="${y - 2.5}" r="2.2" fill="#fff" opacity=".6"/>`).join('')}</g>
    <circle cx="130" cy="232" r="7" fill="#f26d6d"/><circle cx="62" cy="234" r="6.5" fill="#f26d6d"/>`),
  fence: `<svg viewBox="0 0 600 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="0" y="20" width="600" height="9" rx="4" fill="#c99d6e"/><rect x="0" y="46" width="600" height="9" rx="4" fill="#c99d6e"/>${range(0, 8).map((i) => `<rect x="${i * 73 + 6}" y="6" width="12" height="74" rx="4" fill="#a87b52"/>`).join('')}</svg>`,
  tuft: svgw('0 0 30 30', `<path d="M15 30 C13 20 8 12 4 8 C10 12 14 18 16 30Z" fill="#6fb85a"/><path d="M15 30 C15 18 16 8 18 2 C18 10 18 20 17 30Z" fill="#86c96d"/><path d="M15 30 C18 22 22 16 27 12 C22 18 19 24 17 30Z" fill="#78bf62"/>`),
  carrot: svgw('0 0 60 60', `<path d="M34 16 C44 18 46 26 40 32 L14 54 C10 57 6 53 9 49 Z" fill="#f59e4c"/><path d="M22 36 l5 3 M18 42 l4 3 M28 30 l5 3" stroke="#d9772c" stroke-width="2" stroke-linecap="round"/><path d="M36 18 C36 8 40 4 44 2 C42 8 42 12 40 18 Z M38 20 C46 12 52 12 58 14 C52 16 48 18 42 22 Z M40 20 C46 20 52 24 54 30 C48 26 44 24 40 24Z" fill="#6fb85a"/>`),
  brush: svgw('0 0 60 60', `<g transform="rotate(-25 30 30)"><rect x="8" y="18" width="44" height="18" rx="9" fill="#c98b57"/><rect x="12" y="20" width="36" height="6" rx="3" fill="#dba57a"/><rect x="10" y="34" width="40" height="12" rx="4" fill="#fff2dc"/><path d="M14 36 v9 M19 36 v9 M24 36 v9 M29 36 v9 M34 36 v9 M39 36 v9 M44 36 v9" stroke="#e8d3b4" stroke-width="2"/></g>`),
  saddlePv: svgw('0 0 60 40', `<path d="M8 18 Q30 4 52 18 L54 30 Q30 40 6 30 Z" fill="#9ad0ec"/><path d="M14 16 Q30 2 46 16 L47 26 Q30 33 13 26 Z" fill="#8b5a2b"/><circle cx="30" cy="36" r="3.5" fill="none" stroke="#c9962a" stroke-width="2.5"/>`),
  bowPv: svgw('0 0 40 30', `<g transform="translate(20 15)"><path d="M0 0 L-16 -11 L-16 11 Z" fill="#f48fb1"/><path d="M0 0 L16 -11 L16 11 Z" fill="#f48fb1"/><circle r="5.5" fill="#ec6f9c"/></g>`),
  blanketPv: (c) => svgw('0 0 60 40', `<path d="M6 10 Q30 0 54 10 L56 32 Q30 42 4 32 Z" fill="${c}"/><path d="M4 32 Q30 42 56 32" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="1 6" stroke-linecap="round"/><path d="M30 20 c-3 -6 -12 -3 -8 4 l8 7 l8 -7 c4 -7 -5 -10 -8 -4z" fill="#fff" opacity=".85"/>`),
  vanePv: svgw('0 0 40 50', `<path d="M20 50 V14" stroke="#7d6a5a" stroke-width="3"/><path d="M6 22 H34 M30 18 l6 4 l-6 4" stroke="#7d6a5a" stroke-width="2.5" fill="none"/><path d="M10 12 q4 -9 12 -7 q6 -5 9 1 l-2 3 q-4 -2 -6 1 l2 6 h-3 l-2 -5 h-5 l-2 5 h-3z" fill="#e5b84a"/>`)
};
function barnSVG(evening, vane) {
  return svgw('0 0 320 310', `
  ${vane ? `<g class="vane"><path d="M160 54 V8" stroke="#7d6a5a" stroke-width="3.5"/><path d="M142 20 H178 M172 15 l8 5 l-8 5" stroke="#7d6a5a" stroke-width="3" fill="none"/><path d="M146 6 q5 -11 15 -9 q8 -6 12 1 l-3 4 q-5 -3 -8 1 l3 8 h-4 l-3 -7 h-6 l-3 7 h-4z" fill="#e5b84a"/></g>` : ''}
  <polygon points="6,128 160,46 314,128" fill="#a84a3a"/><polygon points="22,124 160,58 298,124" fill="#c45a45"/>
  <path d="M6 128 L160 46 L314 128" stroke="#fff" stroke-width="7" fill="none" stroke-linejoin="round"/>
  <rect x="30" y="122" width="260" height="184" fill="#d9705a"/>
  <path d="${range(0, 12).map((i) => `M${44 + i * 21} 124 V306`).join(' ')}" stroke="#c4604c" stroke-width="2"/>
  <rect x="30" y="122" width="260" height="184" fill="none" stroke="#fff" stroke-width="6"/>
  <rect x="132" y="140" width="56" height="44" rx="6" fill="${evening ? '#ffe08a' : '#fff3d6'}" class="${evening ? 'glow-win' : ''}"/><path d="M160 140 v44 M132 162 h56" stroke="#a84a3a" stroke-width="5"/>
  <path d="M136 184 l6 -10 l6 10 l6 -12 l6 12 l6 -9 l6 9 l6 -11 l6 11z" fill="#f2d16b"/>
  <rect x="92" y="200" width="136" height="106" fill="${evening ? '#d9a06a' : '#b98058'}"/>
  <ellipse cx="160" cy="300" rx="58" ry="20" fill="#f2d16b"/><path d="M110 296 l8 -12 l6 12 l8 -14 l6 14 l8 -10 l6 10 l8 -13 l6 13 l8 -11 l6 11 l8 -12 l6 12" stroke="#e1bd52" stroke-width="3" fill="none"/>
  ${evening ? '<circle cx="160" cy="226" r="9" fill="#ffd27a"/><circle cx="160" cy="226" r="22" fill="#ffd27a" opacity=".3" class="glow-win"/>' : ''}
  <g class="door dl"><rect x="92" y="200" width="68" height="106" fill="#fff3d6"/><path d="M96 204 L156 302 M156 204 L96 302" stroke="#d9705a" stroke-width="9"/><rect x="92" y="200" width="68" height="106" fill="none" stroke="#fff" stroke-width="6"/></g>
  <g class="door dr"><rect x="160" y="200" width="68" height="106" fill="#fff3d6"/><path d="M164 204 L224 302 M224 204 L164 302" stroke="#d9705a" stroke-width="9"/><rect x="160" y="200" width="68" height="106" fill="none" stroke="#fff" stroke-width="6"/></g>
  <circle cx="160" cy="112" r="15" fill="#f2c14e"/><path d="M153 104 C150 116 154 121 160 121 C166 121 170 116 167 104" stroke="#c9962a" stroke-width="3.5" fill="none"/>
  <rect x="24" y="300" width="272" height="10" rx="4" fill="#b9a99a"/>`, 'barn-svg');
}
function pondSVG() {
  return svgw('0 0 300 130', `<ellipse cx="150" cy="70" rx="146" ry="56" fill="#8bc77a"/><ellipse cx="150" cy="68" rx="134" ry="48" fill="#7fcdef"/><ellipse cx="150" cy="64" rx="118" ry="38" fill="#a6defa"/>
  <ellipse class="ripple" cx="110" cy="66" rx="24" ry="7" fill="none" stroke="#fff" stroke-width="2"/><ellipse class="ripple" style="animation-delay:-2s" cx="196" cy="74" rx="20" ry="6" fill="none" stroke="#fff" stroke-width="2"/>
  <g><ellipse cx="62" cy="80" rx="16" ry="7" fill="#6fb85a"/><path d="M62 80 l14 -3 l-2 5z" fill="#a6defa"/><ellipse cx="236" cy="56" rx="14" ry="6" fill="#6fb85a"/><circle cx="234" cy="52" r="4.5" fill="#f7a8c4"/><circle cx="234" cy="52" r="1.8" fill="#ffe08a"/></g>
  ${[[24, 60], [34, 54], [266, 64], [276, 58]].map(([x, y], i) => `<g class="sway" style="animation-delay:${-i * 0.8}s"><path d="M${x} ${y + 40} q-2 -30 0 -${54}" stroke="#5c9e4a" stroke-width="3" fill="none"/><rect x="${x - 3.5}" y="${y - 16}" width="7" height="18" rx="3.5" fill="#9a6235"/></g>`).join('')}
  ${[[30, 104], [70, 118], [118, 124], [182, 124], [232, 116], [272, 100]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#d7cfc4"/>`).join('')}`, 'pond-svg');
}
// Freischaltbare Sachen. x/y = Position in % des Bildschirms (Fußpunkt), s = Breite in vmin
const ITEMS = [
  { id: 'heu', name: 'Heuballen', price: 3, art: () => HAY, s: 12, x: 9, y: 79, snd: 'plop' },
  { id: 'blumen', name: 'Blumenbeet', price: 3, art: () => ART.flowerbed, s: 18, x: 47, y: 63, snd: 'sparkle' },
  { id: 'trog', name: 'Wassertrog', price: 4, art: () => ART.trough, s: 15, x: 43, y: 93, snd: 'plop' },
  { id: 'schleife', name: () => `Mähnenschleife für ${LN()}`, price: 5, onLuna: true, pv: () => ART.bowPv },
  { id: 'schmetterlinge', name: 'Schmetterlinge', price: 5, fly: true, pv: () => ART.butterfly('#f7a8c4') },
  { id: 'sattel', name: () => `Sattel für ${LN()}`, price: 6, onLuna: true, pv: () => ART.saddlePv },
  { id: 'decke', name: 'Pferdedecke (Farbe wählbar)', price: 6, onLuna: true, pv: () => ART.blanketPv(S.blanket || BLANKET_COLORS[0]) },
  { id: 'kaetzchen', name: 'Kätzchen im Heu', price: 6, art: () => ART.kitten, s: 12, x: 30, y: 67, snd: 'meow' },
  { id: 'sonnenblumen', name: 'Sonnenblumen', price: 6, art: () => ART.sunflowers, s: 11, x: 4, y: 70, snd: 'sparkle' },
  { id: 'huehner', name: 'Hühner', price: 7, art: () => ART.chickens, s: 16, x: 88, y: 98, snd: 'cluck' },
  { id: 'hund', name: 'Hofhund', price: 8, art: () => ART.dog, s: 12, x: 27, y: 99, snd: 'woof' },
  { id: 'wetterfahne', name: 'Wetterfahne', price: 8, onBarn: true, pv: () => ART.vanePv },
  { id: 'pony', name: () => `Pony ${horseName('pony')}`, price: 10, horse: 'pony', s: 20, x: 31, y: 88 },
  { id: 'regenbogen', name: 'Regenbogen', price: 10, art: () => ART.rainbow, s: 62, x: 50, y: 44, sky: true, snd: 'sparkle' },
  { id: 'wolke', name: () => `Schimmel ${horseName('wolke')}`, price: 12, horse: 'wolke', s: 26, x: 67, y: 71 },
  { id: 'reitplatz', name: 'Reitplatz mit Hindernissen', price: 14, art: () => ART.arena, s: 46, x: 58, y: 100, flat: true, snd: 'plop' },
  { id: 'fohlen', name: () => `Fohlen ${horseName('fohlen')}`, price: 15, horse: 'fohlen', s: 16, x: 60, y: 88 },
  { id: 'nacht', name: () => `Rappe ${horseName('nacht')}`, price: 20, horse: 'nacht', s: 26, x: 38, y: 75 },
  { id: 'kuchen', name: 'Geburtstagskuchen', price: 0, art: () => ART.cake, s: 9, x: 55, y: 98, special: true, snd: 'sparkle' }
];
const itemName = (it) => (typeof it.name === 'function' ? it.name() : it.name);
const TUFTS = [[6, 58], [16, 62], [27, 59], [47, 61], [58, 57], [72, 60], [96, 59], [8, 72], [21, 76], [46, 70], [53, 82], [70, 78], [80, 70], [94, 76], [4, 88], [18, 90], [36, 84], [64, 94], [76, 90], [96, 92], [12, 99], [48, 99], [90, 99]];
const FLOWERS = [[10, 66, '#f7a8c4'], [33, 61, '#fff'], [52, 68, '#ffe08a'], [66, 64, '#d6c2f2'], [85, 61, '#fff'], [25, 84, '#ffe08a'], [44, 79, '#f7a8c4'], [74, 86, '#b5dcff'], [92, 84, '#f7a8c4'], [6, 95, '#d6c2f2'], [38, 97, '#fff'], [68, 99, '#ffe08a']];
let ambientTimer = 0;
function farmMood() {
  const q = new URLSearchParams(location.search).get('mood');
  if (q === 'day' || q === 'evening') return q;
  const hr = new Date().getHours() + new Date().getMinutes() / 60;
  return hr >= 17.5 || hr < 6.5 ? 'evening' : 'day';
}
function showStable() {
  currentScreen = 'stable';
  clearInterval(ambientTimer);
  const mood = farmMood();
  app.innerHTML = '';
  const farm = h('div', { class: 'farm scene ' + mood, id: 'scene' });
  const main = h('main', { id: 'screen', class: 'farm-screen' }, farm);
  app.append(main);
  const add = (el) => { farm.append(el); return el; };
  const at = (el, x, y, s, z) => { el.style.left = x + '%'; el.style.top = y + '%'; if (s != null) el.style.setProperty('--s', s); el.style.zIndex = z != null ? z : Math.round(100 + y * 10); return el; };

  // Himmel, Sonne, Sterne, Wolken, Vögel
  add(h('div', { class: 'sky' }));
  add(h('div', { class: 'sun px1' }, h('div', { class: 'sun-core' })));
  if (mood === 'evening') range(1, 16).forEach((i) => { const st = add(h('span', { class: 'star' })); st.style.left = ((i * 37) % 97 + 1.5) + '%'; st.style.top = ((i * 23) % 33 + 2) + '%'; st.style.animationDelay = (-(i % 5) * 0.8) + 's'; });
  [[12, 120, -10], [24, 170, -80], [6, 140, -40], [30, 200, -130]].forEach(([top, dur, dl], i) => {
    const c = add(h('div', { class: 'cloud', html: ART.cloud })); c.style.top = top + '%'; c.style.animationDuration = dur + 's'; c.style.animationDelay = dl + 's'; c.style.setProperty('--cs', [22, 30, 16, 20][i]);
  });
  [[14, 46, -5], [22, 60, -30]].forEach(([top, dur, dl]) => {
    const b = add(h('div', { class: 'bird', html: ART.bird })); b.style.top = top + '%'; b.style.animationDuration = dur + 's'; b.style.animationDelay = dl + 's';
    b.addEventListener('pointerdown', () => { Sound.chirp(); });
  });
  // Sachen am Himmel (Regenbogen) liegen hinter den Hügeln
  const skyLayer = add(h('div', { class: 'skylayer' }));
  add(h('div', { class: 'layer hills-far px2', html: `<svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><path d="M0 180 Q150 60 320 140 T640 120 T1000 130 L1000 300 L0 300 Z" fill="#bfe5ab"/><g fill="#a5d892">${[[120, 128], [480, 140], [820, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16"/><circle cx="${x + 18}" cy="${y + 6}" r="12"/>`).join('')}</g></svg>` }));
  add(h('div', { class: 'layer hills-mid px3', html: `<svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><path d="M0 200 Q200 110 450 170 T1000 150 L1000 300 L0 300 Z" fill="#acdc95"/></svg>` }));
  add(h('div', { class: 'layer meadow', html: `<svg viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3d684"/><stop offset="1" stop-color="#86c46a"/></linearGradient></defs><path d="M0 40 Q250 0 520 30 T1000 24 L1000 500 L0 500 Z" fill="url(#mg)"/><path d="M0 200 Q300 160 600 210 T1000 190" stroke="#b4e09a" stroke-width="26" fill="none" opacity=".5"/><path d="M0 360 Q350 320 700 370 T1000 350" stroke="#b4e09a" stroke-width="30" fill="none" opacity=".4"/><path d="M-20 500 Q120 300 260 230 Q330 200 420 196" stroke="#e9d6ac" stroke-width="38" fill="none" opacity=".75" stroke-linecap="round"/></svg>` }));
  add(h('div', { class: 'tint' }));

  // Feste Kulisse: Scheune, Baum, Teich mit Enten, Zaun, Gras, Blumen, Schmetterling
  const barn = at(add(h('div', { class: 'scen barn' + (S.barnOpen ? ' open' : ''), id: 'barn', html: barnSVG(mood === 'evening', has('wetterfahne')) })), 20, 64, 38);
  barn.addEventListener('click', () => { barn.classList.toggle('open'); S.barnOpen = barn.classList.contains('open'); save(); Sound.door(); });
  at(add(h('div', { class: 'scen tree', html: ART.tree })), 92, 64, 28);
  const fence = add(h('div', { class: 'fence', html: ART.fence })); fence.style.zIndex = 100 + 58 * 10;
  const pond = at(add(h('div', { class: 'scen pond', id: 'pond', html: pondSVG() })), 83, 92, 34, 95);
  [['#fffdf5', '#f6b26b', 7, 0], ['#ffe27a', '#f6b26b', 4.2, -3], ['#ffe27a', '#f6b26b', 4, -3.6]].forEach(([c, bill, s, dl], i) => {
    const d = h('div', { class: 'duck', html: ART.duck(c, bill) });
    d.style.setProperty('--s', s); d.style.animationDelay = dl + 's'; d.style.top = (i ? 34 : 26) + '%'; d.style.left = (18 + i * 9) + '%';
    d.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sound.quack(); d.classList.remove('bob'); void d.offsetWidth; d.classList.add('bob'); });
    pond.append(d);
  });
  TUFTS.forEach(([x, y], i) => { const t = at(add(h('div', { class: 'tuft sway', html: ART.tuft })), x, y, 3 + (i % 3)); t.style.animationDelay = (-(i % 7) * 0.6) + 's'; t.style.zIndex = Math.round(100 + y * 10) - 1; });
  FLOWERS.forEach(([x, y, c], i) => { const f = at(add(h('div', { class: 'flw', html: svgw('0 0 20 34', flowerSVG(10, 34, 22, c, -i * 0.5)) })), x, y, 2.6); f.style.zIndex = Math.round(100 + y * 10) - 1; });
  const flies = [];
  const addFly = (c, i) => { const b = add(h('div', { class: 'fly f' + (i % 4), html: ART.butterfly(c) })); b.style.animationDelay = (-i * 4.3) + 's'; b.style.zIndex = 3000; flies.push(b); return b; };
  addFly('#ffd27a', 0);

  // Bedienelemente: kleiner Zurück-Knopf, Zähler, Laden, Werkzeuge, Sprechblase
  const ui = add(h('div', { class: 'farm-ui' }));
  ui.append(
    h('button', { class: 'farm-btn back', id: 'homeBtn', 'aria-label': 'Zurück', onclick: () => { Sound.tap(); clearInterval(ambientTimer); showHome(); } }, '🏠'),
    h('div', { class: 'farm-hud' },
      h('div', { class: 'counter', id: 'shoeCount', html: SHOE + `<span>${S.shoes}</span>` }),
      h('div', { class: 'counter', id: 'carrotCount' }, h('span', { class: 'emo', html: ART.carrot }), h('span', null, String(S.carrots))),
      h('button', { class: 'farm-btn', id: 'shopBtn', 'aria-label': 'Stall-Laden', onclick: () => { Sound.tap(); openDrawer(); } }, '🛒')),
    h('div', { class: 'bubble farm-say', id: 'farmSay' }, ''));
  const carrotTool = h('button', { class: 'tool', id: 'toolCarrot', 'aria-label': 'Karotte' }, h('span', { html: ART.carrot }), h('b', { class: 'badge' }, String(S.carrots)));
  const brushTool = h('button', { class: 'tool', id: 'toolBrush', 'aria-label': 'Bürste' }, h('span', { html: ART.brush }));
  ui.append(h('div', { class: 'tray' }, carrotTool, brushTool));
  const drawer = h('div', { class: 'drawer', id: 'drawer' });
  ui.append(drawer);

  let sayT = 0;
  const fsay = (t) => { const b = $('#farmSay'); b.textContent = t; b.classList.add('show'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); clearTimeout(sayT); sayT = setTimeout(() => b.classList.remove('show'), 4200); };
  const updTools = () => { updateCounters(); $('.badge', carrotTool).textContent = S.carrots; carrotTool.classList.toggle('empty', S.carrots <= 0); };
  updTools();

  // Parallaxe (sanft)
  let pxRaf = 0, pxv = 0;
  farm.addEventListener('pointermove', (e) => { pxv = (e.clientX / window.innerWidth - 0.5) * 2; if (!pxRaf) pxRaf = requestAnimationFrame(() => { pxRaf = 0; farm.style.setProperty('--px', pxv.toFixed(3)); }); }, { passive: true });

  // Gegenstände und Pferde
  function itemOf(id) { return id === 'luna' ? { id: 'luna', horse: 'luna', s: 29, x: 51, y: 81 } : ITEMS.find((i) => i.id === id); }
  function zFor(it, y) { return it.sky ? 2 : it.flat ? Math.round(90 + y / 10) : Math.round(100 + y * 10); }
  function placeItem(it, isNew) {
    const p = S.pos[it.id] || { x: it.x, y: it.y };
    const html = it.horse ? (it.id === 'luna' ? lunaSVG() : horseSVG(HORSES[it.horse])) : it.art();
    const el = h('div', { class: 'item' + (it.horse ? ' horse-item' : '') + (isNew ? ' new' : ''), 'data-id': it.id, html });
    if (it.horse) el.append(h('span', { class: 'shine' }));
    el.style.setProperty('--s', it.s);
    el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.zIndex = zFor(it, p.y);
    (it.sky ? skyLayer : farm).append(el);
    makeDraggable(el, it);
    return el;
  }
  function renderScene(newId) {
    $$('.item', farm).forEach((x) => x.remove());
    ITEMS.forEach((it) => { if (!it.onLuna && !it.onBarn && !it.fly && has(it.id)) placeItem(it, it.id === newId); });
    placeItem(itemOf('luna'), ['sattel', 'schleife', 'decke'].includes(newId));
    flies.slice(1).forEach((f) => f.remove()); flies.length = 1;
    if (has('schmetterlinge')) ['#f7a8c4', '#b5dcff', '#d6c2f2'].forEach((c, i) => addFly(c, i + 1));
    if (newId === 'wetterfahne') { barn.innerHTML = barnSVG(mood === 'evening', true); }
  }
  function makeDraggable(el, it) {
    let st = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      const p = S.pos[it.id] || { x: it.x, y: it.y };
      st = { cx: e.clientX, cy: e.clientY, x: p.x, y: p.y, w: farm.clientWidth, hh: farm.clientHeight, moved: false };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!st) return;
      const dx = e.clientX - st.cx, dy = e.clientY - st.cy;
      if (!st.moved && Math.hypot(dx, dy) < 10) return;
      if (!st.moved) { st.moved = true; el.classList.add('dragging'); }
      const [ymin, ymax] = it.sky ? [18, 52] : [54, 100];
      const x = Math.max(3, Math.min(97, st.x + (dx / st.w) * 100));
      const y = Math.max(ymin, Math.min(ymax, st.y + (dy / st.hh) * 100));
      el.style.left = x + '%'; el.style.top = y + '%'; el.style.zIndex = it.sky ? 2 : 4000;
      st.nx = x; st.ny = y;
    });
    const end = () => {
      if (!st) return;
      if (st.moved && st.nx != null) {
        // sanftes Einrasten auf ein 2%-Raster
        const x = Math.round(st.nx / 2) * 2, y = Math.round(st.ny / 2) * 2;
        el.classList.remove('dragging'); el.classList.add('settle');
        el.style.left = x + '%'; el.style.top = y + '%'; el.style.zIndex = zFor(it, y);
        setTimeout(() => el.classList.remove('settle'), 500);
        S.pos[it.id] = { x, y }; save(); Sound.plop();
      } else tapItem(el, it);
      st = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { if (st && st.moved) end(); st = null; el.classList.remove('dragging'); });
  }
  function react(el, cls) { el.classList.remove('yay', 'munch', 'bounce'); void el.offsetWidth; el.classList.add(cls); }
  function tapItem(el, it) {
    if (it.horse) {
      react(el, 'yay'); burst(el, ['💖', '💕', '✨']);
      if (Math.random() < 0.5) Sound.neigh(); else Sound.clipclop();
      fsay(pick([`Hallo! Ich bin ${horseName(it.horse)}! 💕`, `${horseName(it.horse)} freut sich, dass du da bist!`, `${horseName(it.horse)} kuschelt mit dir. 🥰`]));
    } else {
      react(el, 'bounce'); (Sound[it.snd] || Sound.plop)();
      fsay(pick([`Schön: ${itemName(it)}!`, `${itemName(it)} – gefällt mir!`]));
    }
  }
  // Werkzeuge: Karotte und Bürste zum Pferd ziehen
  function horseAt(x, y) {
    let best = null;
    $$('.horse-item', farm).forEach((el) => { const r = el.getBoundingClientRect(); if (x > r.left + r.width * 0.1 && x < r.right - r.width * 0.05 && y > r.top + r.height * 0.15 && y < r.bottom - r.height * 0.1) { if (!best || +el.style.zIndex > +best.style.zIndex) best = el; } });
    return best;
  }
  function toolDrag(tool, kind) {
    tool.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (kind === 'carrot' && S.carrots <= 0) { Sound.tap(); fsay('Spiel eine Runde, dann bekommst du Karotten für die Pferde. 🥕'); return; }
      try { tool.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const ghost = add(h('div', { class: 'ghost', html: kind === 'carrot' ? ART.carrot : ART.brush }));
      const mv = (ev) => { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; };
      mv(e);
      let strokes = 0, lastHorse = null, lastFx = 0, moved = false;
      const onMove = (ev) => {
        mv(ev); moved = true;
        if (kind !== 'brush') { const hz = horseAt(ev.clientX, ev.clientY); $$('.horse-item.target', farm).forEach((x) => x !== hz && x.classList.remove('target')); if (hz) hz.classList.add('target'); return; }
        const hz = horseAt(ev.clientX, ev.clientY);
        if (!hz) return;
        if (hz !== lastHorse) { strokes = 0; lastHorse = hz; }
        const now = performance.now();
        if (now - lastFx > 90) {
          lastFx = now; strokes++;
          const sp = add(h('span', { class: 'sparkle' }, pick(['✦', '✧', '✦', '·'])));
          sp.style.left = (ev.clientX + rand(-18, 18)) + 'px'; sp.style.top = (ev.clientY + rand(-18, 10)) + 'px';
          setTimeout(() => sp.remove(), 900);
          if (strokes % 3 === 1) Sound.swish(); else if (strokes % 5 === 0) Sound.sparkle();
          if (strokes === 14) {
            hz.classList.add('shiny'); setTimeout(() => hz.classList.remove('shiny'), 6000);
            burst(hz, ['✨', '💖', '⭐']); Sound.neigh(); S.brushed = (S.brushed || 0) + 1; save();
            fsay(`${horseName(hz.dataset.id === 'luna' ? 'luna' : (ITEMS.find((i) => i.id === hz.dataset.id) || {}).horse)} glänzt jetzt wunderschön! ✨`);
          }
        }
      };
      const onUp = (ev) => {
        tool.removeEventListener('pointermove', onMove); tool.removeEventListener('pointerup', onUp); tool.removeEventListener('pointercancel', onUp);
        ghost.remove(); $$('.horse-item.target', farm).forEach((x) => x.classList.remove('target'));
        if (!moved) { Sound.tap(); fsay(kind === 'carrot' ? 'Zieh die Karotte zu einem Pferd! 🥕' : 'Zieh die Bürste über ein Pferd, dann glänzt es! ✨'); return; }
        if (kind === 'carrot') {
          const hz = horseAt(ev.clientX, ev.clientY);
          if (hz && S.carrots > 0) {
            S.carrots--; S.fed++; save(); updTools();
            react(hz, 'munch'); Sound.munch(); burst(hz, ['💖', '🥕', '💕']);
            const id = hz.dataset.id === 'luna' ? 'luna' : (ITEMS.find((i) => i.id === hz.dataset.id) || {}).horse;
            fsay(pick([withName('Mmmh, lecker! Danke', '! 💖'), `${horseName(id)} knuspert: Mampf, mampf … 🥕`, `${horseName(id)} sagt: Du bist meine beste Freundin! 🥰`]));
            setTimeout(() => { if (Math.random() < 0.6) Sound.neigh(); }, 800);
          }
        }
      };
      tool.addEventListener('pointermove', onMove); tool.addEventListener('pointerup', onUp); tool.addEventListener('pointercancel', onUp);
    });
  }
  toolDrag(carrotTool, 'carrot'); toolDrag(brushTool, 'brush');

  // Laden (Schublade)
  function openDrawer() { renderDrawer(); drawer.classList.add('open'); $('#farmSay').classList.remove('show'); }
  function closeDrawer() { drawer.classList.remove('open'); }
  function renderDrawer() {
    drawer.innerHTML = '';
    const body = h('div', { class: 'drawer-body' });
    drawer.append(h('div', { class: 'drawer-head' }, h('b', null, '🛒 Stall-Laden'), h('span', { class: 'counter', html: SHOE + `<span>${S.shoes}</span>` }),
      h('button', { class: 'farm-btn', id: 'shopClose', 'aria-label': 'Schließen', onclick: () => { Sound.tap(); closeDrawer(); } }, '✕')), body);
    const list = h('div', { class: 'shoplist' });
    ITEMS.forEach((it) => {
      if (it.special && !has(it.id)) return;
      const pvHtml = it.pv ? it.pv() : it.horse ? horseSVG(Object.assign({}, HORSES[it.horse], { delay: 0 })) : it.art();
      let btn;
      if (has(it.id)) btn = h('button', { class: 'have', disabled: true }, '✔ Da');
      else if (S.shoes >= it.price) btn = h('button', { 'data-buy': it.id, onclick: () => buy(it) }, 'Holen');
      else btn = h('button', { class: 'later', disabled: true }, `Noch ${it.price - S.shoes}`);
      list.append(h('div', { class: 'sitem' + (has(it.id) ? ' owned' : '') }, h('div', { class: 'pv', html: pvHtml }),
        h('div', { class: 'nm' }, itemName(it), it.special ? h('small', null, '🎁 Geschenk') : h('small', { html: SHOE + ' ' + it.price })), btn));
    });
    body.append(list);
    if (has('decke')) {
      body.append(h('h4', null, 'Farbe der Pferdedecke'), h('div', { class: 'swatches' }, BLANKET_COLORS.map((c) => h('button', {
        class: 'swatch' + ((S.blanket || BLANKET_COLORS[0]) === c ? ' on' : ''), 'data-color': c, 'aria-label': 'Farbe', style: { background: c },
        onclick: () => { S.blanket = c; save(); Sound.sparkle(); renderScene('decke'); renderDrawer(); }
      }))));
    }
    const horses = ['luna'].concat(ITEMS.filter((i) => i.horse && has(i.id)).map((i) => i.horse));
    body.append(h('h4', null, 'Namen der Pferde'), h('div', { class: 'names' }, horses.map((id) => {
      const inp = h('input', { type: 'text', maxlength: '14', 'data-horse-name': id, value: horseName(id), autocomplete: 'off', 'aria-label': 'Name' });
      inp.addEventListener('change', () => { S.horseNames = S.horseNames || {}; S.horseNames[id] = inp.value.replace(/[<>]/g, '').trim().slice(0, 14); save(); Sound.sparkle(); });
      return h('label', { class: 'nameRow' }, h('span', { class: 'pvh', html: id === 'luna' ? lunaSVG() : horseSVG(Object.assign({}, HORSES[id], { delay: 0 })) }), inp);
    })));
  }
  function buy(it) {
    if (S.shoes < it.price || has(it.id)) return;
    S.shoes -= it.price; S.owned.push(it.id); save(); updTools();
    Sound.fanfare();
    closeDrawer();
    renderScene(it.id);
    setTimeout(() => {
      const el = it.onBarn ? barn : $(`.item[data-id="${it.onLuna ? 'luna' : it.id}"]`, farm) || (it.fly ? flies[1] : null);
      if (el) burst(el, ['✨', '⭐', '💖']);
    }, 150);
    fsay(`Juhu! ${itemName(it)} ist jetzt auf unserem Hof! 🎉`);
  }
  renderScene();
  fsay(S.carrots > 0 ? 'Willkommen auf dem Pferdehof! Zieh eine Karotte zu einem Pferd. 🥕' : 'Willkommen auf dem Pferdehof! Mit der Bürste kannst du die Pferde putzen. ✨');
  // ganz leise Naturgeräusche ab und zu
  ambientTimer = setInterval(() => {
    if (currentScreen !== 'stable') { clearInterval(ambientTimer); return; }
    const r = Math.random();
    if (r < 0.22) Sound.chirp(); else if (r < 0.32) Sound.quack();
  }, 9000);
}

// ---------- Elternbereich ----------
function showGate() {
  currentScreen = 'gate';
  const main = shell('Für Eltern', false);
  const fill = h('i');
  const btn = h('button', { class: 'holdbtn', id: 'holdBtn' }, fill, h('span', null, 'Halte 3 Sekunden gedrückt'));
  let t0 = 0, raf = 0;
  const step = () => {
    const p = Math.min(1, (performance.now() - t0) / 3000);
    fill.style.width = (p * 100) + '%';
    if (p >= 1) { stop(); showParent(); return; }
    raf = requestAnimationFrame(step);
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; fill.style.width = '0'; };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } raf = requestAnimationFrame(step); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, stop));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  main.append(h('div', { class: 'screen' }, h('div', { class: 'gate' },
    h('h2', null, '👪 Elternbereich'),
    h('p', null, 'Dieser Bereich ist für Erwachsene. Bitte den Knopf 3 Sekunden lang gedrückt halten.'),
    btn)));
}
function pct(st) { return st && st.n ? Math.round((st.ok / st.n) * 100) : null; }
function tagFor(st) {
  if (!st || st.n < 3) return h('span', { class: 'tag none' }, 'noch wenig geübt');
  const p = st.ok / st.n;
  if (p >= 0.8) return h('span', { class: 'tag good' }, 'läuft gut');
  if (p >= 0.5) return h('span', { class: 'tag mid' }, 'übt noch');
  return h('span', { class: 'tag help' }, 'braucht Hilfe');
}
function showParent() {
  currentScreen = 'parent';
  const main = shell('Elternbereich', false);
  const wrap = h('div', { class: 'parent' });
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const nameIn = h('input', { id: 'kidName', type: 'text', maxlength: '20', autocomplete: 'off', autocapitalize: 'words', placeholder: 'z. B. Vorname (freiwillig)' });
  nameIn.value = kidName();
  const daySel = h('select', { id: 'bdDay', 'aria-label': 'Tag' }, h('option', { value: '' }, 'Tag'), range(1, 31).map((d) => h('option', { value: d }, d + '.')));
  const monSel = h('select', { id: 'bdMonth', 'aria-label': 'Monat' }, h('option', { value: '' }, 'Monat'), MONTHS.map((m, i) => h('option', { value: i + 1 }, m)));
  if (S.bday) { daySel.value = String(S.bday.d); monSel.value = String(S.bday.m); }
  const msg = h('div', { class: 'note', id: 'kidMsg', style: { textAlign: 'left' } }, '');
  const saveKid = () => {
    const d = +daySel.value || 0, m = +monSel.value || 0;
    if ((d && !m) || (!d && m)) { msg.textContent = 'Bitte Tag und Monat auswählen (oder beides leer lassen).'; return; }
    if (d && m && d > new Date(2024, m, 0).getDate()) { msg.textContent = 'Diesen Tag gibt es in dem Monat nicht.'; return; }
    S.childName = nameIn.value.replace(/[<>]/g, '').trim().slice(0, 20);
    S.bday = d && m ? { d, m } : null;
    S.setupSeen = true; save();
    msg.textContent = 'Gespeichert ✓';
  };
  wrap.append(h('div', { class: 'panel' }, h('h3', null, 'Kind (nur auf diesem Gerät gespeichert)'),
    h('div', { class: 'prow' }, h('label', { class: 'pn', for: 'kidName' }, 'Name des Kindes', h('small', null, 'Leer lassen = neutrale Ansprache („du“).')), nameIn),
    h('div', { class: 'prow' }, h('div', { class: 'pn' }, 'Geburtstag (Tag/Monat)', h('small', null, 'Für Countdown und Geburtstagsüberraschung. Leer = aus.')), daySel, monSel),
    h('div', { class: 'btnrow', style: { justifyContent: 'flex-start', marginTop: '8px' } },
      h('button', { class: 'smallbtn', id: 'saveKid', style: { background: '#ffe08a' }, onclick: saveKid }, 'Speichern'),
      h('button', { class: 'smallbtn', id: 'clearKid', onclick: () => { nameIn.value = ''; daySel.value = ''; monSel.value = ''; saveKid(); } }, 'Name & Geburtstag löschen')),
    msg));
  wrap.append(h('div', { class: 'panel' }, h('h3', null, 'Überblick'),
    h('div', null, `Gesammelte Hufeisen insgesamt: ${S.totalShoes} · aktuell: ${S.shoes} · Karotten: ${S.carrots} · gefüttert: ${S.fed}× · Stall-Sachen: ${S.owned.length}`),
    h('div', { class: 'note', style: { textAlign: 'left', marginTop: '6px' } }, '„Richtig beim 1. Versuch“ zählt Aufgaben ohne Hinweis. Fehler werden dem Kind nie als Fehler gezeigt, sondern nur als freundlicher Tipp.')));
  const gp = h('div', { class: 'panel' }, h('h3', null, 'Spiele & Schwierigkeitsstufe (passt sich automatisch an)'));
  GAMES.forEach((g) => {
    const sk = S.skills[g.id];
    const agg = GAME_TYPES[g.id].reduce((a, t) => { const s = S.stats[t]; if (s) { a.n += s.n; a.ok += s.ok; } return a; }, { n: 0, ok: 0 });
    const p = pct(agg);
    const lvl = h('span', { style: { fontWeight: 800, minWidth: '90px', textAlign: 'center' } }, `Stufe ${sk.level}/${g.maxLevel}`);
    const change = (d) => { const nl = Math.max(1, Math.min(g.maxLevel, sk.level + d)); if (nl !== sk.level) { sk.level = nl; sk.recent = []; save(); showParent(); } };
    gp.append(h('div', { class: 'prow' },
      h('div', { class: 'pn' }, `${g.icon} ${g.name}`, h('small', null, `${g.levels[sk.level - 1]} · ${sk.rounds} Runden · ${agg.n} Aufgaben`)),
      h('div', { class: 'bar', title: p == null ? '' : p + '%' }, h('i', { style: { width: (p || 0) + '%' } })),
      h('span', { style: { minWidth: '54px' } }, p == null ? '–' : p + ' %'),
      h('button', { class: 'smallbtn', 'aria-label': 'Stufe leichter', onclick: () => change(-1) }, '−'), lvl,
      h('button', { class: 'smallbtn', 'aria-label': 'Stufe schwerer', onclick: () => change(1) }, '+')));
  });
  wrap.append(gp);
  const tp = h('div', { class: 'panel' }, h('h3', null, 'Aufgabentypen (richtig beim 1. Versuch)'));
  const types = Object.keys(TYPE_LABELS).filter((t) => S.stats[t]);
  if (!types.length) tp.append(h('div', { class: 'note', style: { textAlign: 'left' } }, 'Noch keine Aufgaben gespielt.'));
  types.sort((x, y) => (S.stats[x].ok / S.stats[x].n) - (S.stats[y].ok / S.stats[y].n)).forEach((t) => {
    const st = S.stats[t];
    tp.append(h('div', { class: 'prow' }, h('div', { class: 'pn' }, TYPE_LABELS[t], h('small', null, `${st.ok} von ${st.n} beim 1. Versuch · ${st.hints} Tipps gebraucht`)), tagFor(st)));
  });
  wrap.append(tp);
  const tr = h('div', { class: 'panel' }, h('h3', null, 'Zuletzt knifflig (brauchte einen Tipp)'));
  if (!S.trouble.length) tr.append(h('div', { class: 'note', style: { textAlign: 'left' } }, 'Bisher nichts – prima!'));
  else tr.append(h('div', { class: 'trouble' }, S.trouble.slice(0, 24).map((x) => h('span', { title: TYPE_LABELS[x.t] || '' }, x.l))));
  wrap.append(tr);
  const vol = h('div', { class: 'prow' }, h('div', { class: 'pn' }, 'Ton', h('small', null, 'Sanfte Klänge (Standard: an, leise)')),
    h('button', { class: 'smallbtn', onclick: () => { S.sound = !S.sound; save(); showParent(); } }, S.sound ? '🔊 an' : '🔇 aus'),
    ...[['leise', 0.5], ['mittel', 1]].map(([n, v]) => h('button', { class: 'smallbtn', style: S.volume === v ? { background: '#ffe08a' } : null, onclick: () => { S.volume = v; save(); Sound.pop(); showParent(); } }, n)));
  const confirmBox = h('div', { style: { display: 'none', marginTop: '10px' } },
    h('p', null, 'Wirklich alles löschen? Hufeisen, Stall und Lernfortschritt gehen verloren (Name und Geburtstag bleiben).'),
    h('div', { class: 'btnrow', style: { justifyContent: 'flex-start' } },
      h('button', { class: 'smallbtn danger', id: 'resetYes', onclick: () => { const keep = { childName: S.childName, bday: S.bday, setupSeen: true }; S = Object.assign(defaultState(), keep); save(); showHome(); } }, 'Ja, alles zurücksetzen'),
      h('button', { class: 'smallbtn', onclick: () => { confirmBox.style.display = 'none'; } }, 'Abbrechen')));
  wrap.append(h('div', { class: 'panel' }, h('h3', null, 'Einstellungen'), vol,
    h('div', { class: 'prow' }, h('div', { class: 'pn' }, 'Zurücksetzen', h('small', null, 'Setzt alles auf den Anfang.')),
      h('button', { class: 'smallbtn danger', id: 'resetBtn', onclick: () => { confirmBox.style.display = 'block'; } }, 'Alles zurücksetzen')), confirmBox,
    h('div', { class: 'note', style: { textAlign: 'left', marginTop: '8px' } }, 'Alle Daten bleiben nur auf diesem Gerät (localStorage). Keine Werbung, kein Tracking, keine Internetverbindung nötig.')));
  main.append(h('div', { class: 'screen' }, wrap));
}

// ---------- Start ----------
window.__pm = { get state() { return S; }, startGame, showStable, showHome, showParent };
showHome();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__PM_SINGLE__) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
