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
const KEY = 'pferde-mathe-v1'; // Schlüssel bleibt gleich → gespeicherter Fortschritt bleibt bei Updates erhalten
const APP_VERSION = '2.1.1';
const GAME_IDS = ['paare', 'haeuser', 'rechnen', 'familie', 'strahl', 'zehner'];
function defaultState() {
  return {
    v: 1, childName: '', bday: null, setupSeen: false, horseNames: {}, blanket: '', brushed: 0, barnOpen: false, adv: { done: {}, last: null }, shoes: 0, carrots: 0, totalShoes: 0, owned: [], pos: {}, sound: true, volume: 0.5,
    skills: Object.fromEntries(GAME_IDS.map((id) => [id, { level: 1, rounds: 0, recent: [] }])),
    stats: {}, trouble: [], fed: 0, bones: 2, grain: 2, treats: 2, created: Date.now()
  };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      const d = defaultState();
      const skills = {};
      for (const id of GAME_IDS) skills[id] = Object.assign({}, d.skills[id], (s.skills || {})[id]);
      return Object.assign(d, s, { skills, adv: Object.assign({ done: {}, last: null }, s.adv || {}) });
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
    door() { tone(196, 0, 0.28, 'triangle', 0.14, 150); nz(0, 0.22, 0.04, 'lowpass', 600); },
    baa() { tone(560, 0, 0.55, 'triangle', 0.07, 470); tone(565, 0.03, 0.5, 'sine', 0.05, 480); },
    treasure() { [784, 988, 1175, 1568, 1976].forEach((f, i) => bell(f, i * 0.09, 0.9, 0.16)); bell(2637, 0.5, 1.2, 0.06); }
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
  const bridle = o.bridle ? `<path d="M148 38 Q160 56 178 60 M150 58 Q166 64 184 56" stroke="#e5b84a" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="171" cy="58" r="3.4" fill="#f2c14e" stroke="#c9962a"/>` : '';
  const crown = o.crown ? `<g transform="translate(153 16) rotate(-12)"><path d="M-13 9 L-13 -4 L-6 2 L0 -9 L6 2 L13 -4 L13 9 Z" fill="#f6cf5a" stroke="#c9962a" stroke-width="1.6" stroke-linejoin="round"/><circle cx="0" cy="-9" r="2.6" fill="#f7a8c4"/><circle cx="-13" cy="-4" r="2" fill="#b5dcff"/><circle cx="13" cy="-4" r="2" fill="#b5dcff"/></g>` : '';
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
  ${bridle}${bow}${crown}
  </g>
</svg>`;
}
function has(id) { return S.owned.includes(id); }
// Ausrüstung je Pferd: S.gear[pferd] = { blanket: Farbe|null, saddle, bow, bridle, crown }.
// Gekauft wird ein Teil einmal (S.owned); welches Pferd es trägt, entscheidet das Kind.
const GEAR = { decke: 'blanket', sattel: 'saddle', schleife: 'bow', goldzaum: 'bridle', krone: 'crown' };
function ensureGear() {
  if (!S.gear || typeof S.gear !== 'object' || Array.isArray(S.gear)) {
    // Migration: bisher trug immer das Hauptpferd alles → genau so übernehmen (alte Deckenfarbe bleibt)
    S.gear = { luna: { blanket: has('decke') ? (S.blanket || BLANKET_COLORS[0]) : null, saddle: has('sattel'), bow: has('schleife'), bridle: has('goldzaum'), crown: has('krone') } };
    save();
  }
  if (!S.blanketV2) { // Decken gehören jetzt einzelnen Pferden: wer schon eine Decke trug, behält sie (die alte Decke gehört dem Hauptpferd)
    if (has('decke')) { const L = S.gear.luna = S.gear.luna || {}; L.ownB = true; if (!L.blanket && !Object.keys(S.gear).some((k) => k !== 'luna' && S.gear[k] && S.gear[k].blanket)) L.blanket = S.blanket || BLANKET_COLORS[0]; }
    Object.keys(S.gear).forEach((k) => { const g = S.gear[k]; if (g && g.blanket && has('decke')) g.ownB = true; });
    S.blanketV2 = true; save();
  }
  return S.gear;
}
function ownsBlanket(id) { const g = ensureGear()[id]; return !!(g && g.ownB); }
function gearOf(id) { const g = ensureGear(); if (!g[id] || typeof g[id] !== 'object') g[id] = {}; return g[id]; }
function horseOpts(id) {
  const g = (ensureGear()[id]) || {};
  return { saddle: !!g.saddle && has('sattel'), bow: !!g.bow && has('schleife'), bridle: !!g.bridle && has('goldzaum'), crown: !!g.crown && has('krone'),
    blanket: g.blanket && g.ownB ? g.blanket : null };
}
function giveGear(itemId, horseId) { const k = GEAR[itemId]; if (!k) return; const g = gearOf(horseId || 'luna'); if (k === 'blanket') g.ownB = true; g[k] = k === 'blanket' ? (g.blanket || BLANKET_COLORS[ownedHorses().indexOf(horseId || 'luna') % BLANKET_COLORS.length] || BLANKET_COLORS[0]) : true; save(); }
// Decken kann man für jedes Pferd einzeln kaufen
function horsesWithoutBlanket() { return ownedHorses().filter((id) => !ownsBlanket(id)); }
function ownedHorses() { return ['luna'].concat(['wolke', 'pony', 'fohlen', 'nacht'].filter((id) => has(id))); }
function lunaOpts() { return horseOpts('luna'); }
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
function shell(title, isHome, back) {
  clearInterval(ambientTimer);
  app.innerHTML = '';
  const bar = h('header', { class: 'topbar' },
    isHome ? h('div', { class: 'title' }, '🐴 ', title)
      : h('button', { class: 'iconbtn', 'aria-label': 'Nach Hause', id: 'homeBtn', onclick: () => { Sound.tap(); (back || showHome)(); } }, back ? '🗺️' : '🏠'),
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
// Lesezeit für Sprechblasen: wächst mit der Textlänge; Faktor einstellbar im Elternbereich (Standard: doppelt so lang wie früher)
const READF = { normal: 1, lang: 2, sehrlang: 3 };
function readMs(text, base) { return Math.round(Math.max(base, 1200 + String(text || '').length * 75) * (READF[S.readTime] || 2)); }
// Antippen schließt eine Sprechblase sofort
document.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('.farm-say.show'); if (b) { e.stopPropagation(); b.classList.remove('show'); } }, true);
// Futter für die anderen Tiere: Knochen (Hund), Körner (Hühner), Leckerli (Kätzchen)
const FOODS = [
  { key: 'bones', animal: 'hund', name: 'Knochen', one: 'Knochen', emo: '🦴' },
  { key: 'grain', animal: 'huehner', name: 'Körner', one: 'Handvoll Körner', emo: '🌾' },
  { key: 'treats', animal: 'kaetzchen', name: 'Leckerli', one: 'Katzen-Leckerli', emo: '🐟' }
];
function roundExtraFood() { // pro Runde zusätzlich 1 Futter für ein Tier, das schon auf dem Hof wohnt (abwechselnd)
  const own = FOODS.filter((f) => S.owned.includes(f.animal));
  if (!own.length) return null;
  const f = own[(S.foodTurn = ((S.foodTurn || 0) + 1)) % own.length];
  S[f.key] = (S[f.key] || 0) + 1;
  return f.key;
}
function extraLoot() {
  const k = S.lastRound && S.lastRound.extra, f = FOODS.find((x) => x.key === k);
  return f ? h('div', null, h('span', { style: { fontSize: '2.1rem' } }, f.emo), h('span', null, '+1 ' + f.one)) : null;
}
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
  currentScreen = 'home'; stableBack = showHome;
  if (window.__pmUpdate) { location.reload(); return; }
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
  const cur = advCurrent();
  const advTile = h('button', { class: 'adv-tile', id: 'advTile', 'data-game': 'abenteuer', onclick: () => { Sound.tap(); showMap(); } },
    h('div', { class: 'adv-mini', html: `<div class="am-path"></div>${WORLDS.map((W, k) => `<span class="am-dot${worldOpen(k) ? ' open' : ''}${cur && cur.w === k ? ' here' : ''}" style="background:${W.c}"></span>`).join('')}` }),
    h('div', { class: 'adv-txt' }, h('b', null, '🗺️ Abenteuer-Reise'),
      h('small', null, cur ? `Welt ${cur.w + 1}: ${WORLDS[cur.w].name} · Station ${cur.i + 1}` : 'Alle Welten geschafft! 👑')),
    h('span', { class: 'adv-go' }, 'Los ➜'));
  const tiles = h('div', { class: 'tiles' },
    GAMES.filter((g) => !g.adventureOnly).map((g, i) => h('button', { class: 'tile c' + (i + 1), 'data-game': g.id, onclick: () => { Sound.tap(); startGame(g.id); } },
      h('div', { class: 'ti' }, g.icon), g.name, h('small', null, g.sub))),
    h('button', { class: 'tile stall', 'data-game': 'stall', onclick: () => { Sound.tap(); showStable(); } },
      h('div', { class: 'ti' }, '🏡'), 'Pferdehof', h('small', null, 'Hufeisen eintauschen')));
  main.append(h('div', { class: 'screen home' },
    setup, banner,
    h('div', { class: 'hero' }, lunaBlock(bd && bd.isToday ? 'Heute ist dein Geburtstag! Ich habe dir einen Kuchen in den Stall gestellt. 🎂' : greeting())),
    advTile,
    h('div', { class: 'free-label' }, 'Freies Üben'),
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
  'strahl-huepfen': 'Zahlenstrahl: hüpfen (ohne Übergang)', 'strahl-zehner': 'Zahlenstrahl: hüpfen über die 10',
  'zehner-plus': 'Zehnerzahlen plus (bis 100)', 'zehner-minus': 'Zehnerzahlen minus (bis 100)'
};
const PRAISE = ['Super gemacht! 🌟', 'Toll! 💖', 'Ganz genau! 🐴', 'Prima! 🥰', 'Wunderbar! ✨', 'Richtig! Du bist klasse! 🌸', 'Juhu, stimmt! 🎉'];

function makeApi(game, root, opts) {
  opts = opts || {};
  const sk = S.skills[game.id];
  const results = [];
  const missed = new Set();
  let doneCount = 0;
  const prog = $('.progress', root);
  const api = {
    level: opts.level != null ? opts.level : sk.level,
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
      const natural = api.level === sk.level;
      if (natural) sk.recent = sk.recent.concat(results).slice(-12);
      const recentAcc = sk.recent.filter(Boolean).length / Math.max(1, sk.recent.length);
      let levelUp = false;
      if (natural && acc >= 0.8 && sk.recent.length >= 8 && recentAcc >= 0.8 && sk.level < game.maxLevel) {
        sk.level++; sk.recent = []; levelUp = true;
      } else if (natural && acc < 0.4 && sk.level > 1) {
        sk.level--; sk.recent = [];
      }
      S.carrots++;
      const extra = roundExtraFood();
      S.lastRound = { game: game.id, level: api.level, n: results.length, ok, at: Date.now(), extra };
      save();
      if (opts.onFinish) opts.onFinish({ n: results.length, ok, levelUp });
      else showRoundEnd(game, results.length, levelUp);
    }
  };
  return api;
}

function startGame(id, opts) {
  opts = opts || {};
  const game = GAMES.find((g) => g.id === id);
  currentScreen = 'game-' + id;
  const main = shell(opts.title || game.name, false, opts.back);
  const scr = h('div', { class: 'screen' },
    h('div', { class: 'game game-' + id },
      h('div', { class: 'game-top' }, lunaBlock(opts.intro || game.intro, true),
        h('div', { class: 'progress', 'aria-label': 'Fortschritt' }, range(1, ROUND).map(() => h('span', { html: SHOE_EMPTY })))),
      h('div', { class: 'stage', id: 'stage' })));
  main.append(scr);
  const api = makeApi(game, scr, opts);
  if (opts.gate) scr.classList.add('gate-round');
  game.start(api, $('#stage', scr));
}

function numPad(max, onPick, step) {
  step = step || 1;
  const pad = h('div', { class: 'pad ' + (max > 10 && step === 1 ? 'pad20' : 'pad10') + (step > 1 ? ' padT' : '') });
  for (let n = 0; n <= max; n += step) {
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


// ---------- 6) Zehnerzahlen bis 100 (Ausblick, nur im Abenteuer) ----------
const Zehner = {
  id: 'zehner', name: 'Zehnerzahlen', icon: '🔟', sub: 'Rechnen mit ganzen Zehnern bis 100', maxLevel: 2, adventureOnly: true,
  levels: ['Zehner plus bis 100', 'Zehner plus und minus bis 100'],
  intro: 'Im Schloss rechnen wir mit ganzen Zehnern! Ein Perlenstab hat immer 10 Perlen.',
  start(api, stage) {
    const L = api.level;
    const tasks = [], seen = new Set();
    let guard = 0;
    while (tasks.length < ROUND && guard++ < 200) {
      let a, b, op;
      if (L === 1 || Math.random() < 0.5) { a = rand(1, 8); b = rand(1, 9 - a); op = '+'; }
      else { a = rand(3, 10); b = rand(1, a - 1); op = MINUS; }
      const k = a + op + b; if (seen.has(k)) continue; seen.add(k);
      tasks.push({ a: a * 10, b: b * 10, op, res: (op === '+' ? a + b : a - b) * 10, type: op === '+' ? 'zehner-plus' : 'zehner-minus' });
    }
    let idx = 0;
    const next = () => { stage.innerHTML = ''; if (idx >= tasks.length) { api.finish(); return; } render(tasks[idx++]); };
    next();
    function render(t) {
      let errs = 0;
      const plus = t.op === '+';
      const ans = h('span', { class: 'ans' }, '?');
      const eq = h('div', { class: 'eq' }, `${t.a} ${t.op} ${t.b} = `, ans);
      const rod = (cls) => h('div', { class: 'rod ' + cls }, range(1, 10).map(() => h('i')));
      const rods = h('div', { class: 'rods' });
      for (let i = 0; i < t.a / 10; i++) rods.append(rod('ra' + (!plus && i >= (t.a - t.b) / 10 ? ' gone' : '')));
      if (plus) for (let i = 0; i < t.b / 10; i++) rods.append(rod('rb'));
      const cap = h('div', { class: 'zf-caption' }, plus ? `${t.a / 10} Zehner + ${t.b / 10} Zehner` : `${t.a / 10} Zehner ${MINUS} ${t.b / 10} Zehner`);
      const pad = numPad(100, onPick, 10);
      stage.append(h('div', { class: 'left' }, eq, rods, cap), h('div', { class: 'right' }, pad, h('div', { class: 'note' }, 'Jeder Stab ist 10. Tippe auf die richtige Zahl.')));
      api.say(plus ? `Was ist ${t.a} plus ${t.b}? Zähle die Perlenstäbe in Zehnerschritten: 10, 20, 30 …` : `Was ist ${t.a} minus ${t.b}? Die hellen Stäbe gehen weg.`);
      function onPick(n, btn) {
        if (ans.classList.contains('filled')) return;
        if (n === t.res) {
          ans.textContent = String(n); ans.classList.add('filled'); clearMarks(pad); btn.classList.add('yes');
          api.done(t.type, errs === 0, eq);
          api.say(api.praise() + ` ${t.a / 10} Zehner ${t.op} ${t.b / 10} Zehner = ${t.res / 10} Zehner = ${t.res}`, 'happy');
          setTimeout(next, 1900); return;
        }
        errs++; softNo(btn); api.miss(t.type, `${t.a} ${t.op} ${t.b}`);
        if (errs === 1) { api.say('Fast! Zähle die Stäbe, die übrig sind, in Zehnerschritten: 10, 20, 30 …', 'think'); rods.classList.remove('pulse'); void rods.offsetWidth; rods.classList.add('pulse'); }
        else if (errs === 2) api.say(`Kleiner Trick: ${t.a / 10} ${t.op} ${t.b / 10} = ${t.res / 10}. Also sind es ${t.res / 10} Zehner.`, 'think');
        else { glowBtn(pad, t.res); api.say('Schau, welcher Knopf leuchtet!', 'think'); }
      }
    }
  }
};

const GAMES = [Paare, Haeuser, Rechnen, Familie, Strahl, Zehner];
const GAME_TYPES = {
  paare: ['paare'], haeuser: ['haus-10', 'haus-20', 'haus-dach'],
  rechnen: ['plus10', 'minus10', 'plus20o', 'minus20o', 'plusZU', 'minusZU'],
  familie: ['familie-plus', 'tausch', 'umkehr', 'tausch-erkennen'],
  strahl: ['strahl-finden-10', 'strahl-finden-20', 'strahl-huepfen', 'strahl-zehner'],
  zehner: ['zehner-plus', 'zehner-minus']
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
      h('div', null, h('span', { style: { fontSize: '2.2rem' } }, '🥕'), h('span', null, '+1 Karotte')), extraLoot()),
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
  bone: svgw('0 0 60 40', '<g transform="rotate(-20 30 20)"><rect x="14" y="15" width="32" height="10" rx="5" fill="#fff6e8" stroke="#e3d3bd" stroke-width="2"/><circle cx="13" cy="14" r="7" fill="#fff6e8" stroke="#e3d3bd" stroke-width="2"/><circle cx="13" cy="26" r="7" fill="#fff6e8" stroke="#e3d3bd" stroke-width="2"/><circle cx="47" cy="14" r="7" fill="#fff6e8" stroke="#e3d3bd" stroke-width="2"/><circle cx="47" cy="26" r="7" fill="#fff6e8" stroke="#e3d3bd" stroke-width="2"/><rect x="14" y="16" width="32" height="8" fill="#fff6e8"/></g>'),
  grain: svgw('0 0 60 56', '<path d="M8 26 Q30 18 52 26 L46 50 Q30 56 14 50 Z" fill="#b5dcff"/><ellipse cx="30" cy="26" rx="22" ry="7" fill="#f6d27a"/>' + [[18, 24], [26, 22], [34, 25], [42, 23], [22, 28], [30, 27], [38, 28]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.6" fill="#d9a94a"/>`).join('') + '<path d="M16 38 q14 6 28 0" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>'),
  treat: svgw('0 0 60 40', '<path d="M8 20 Q22 4 40 14 L52 6 L50 20 L52 34 L40 26 Q22 36 8 20 Z" fill="#f7b38a" stroke="#e58f73" stroke-width="2" stroke-linejoin="round"/><circle cx="17" cy="18" r="2.4" fill="#5a4033"/><path d="M26 14 v12 M32 15 v10" stroke="#e58f73" stroke-width="2"/>'),
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
  { id: 'schleife', name: 'Mähnenschleife', price: 5, onLuna: true, pv: () => ART.bowPv },
  { id: 'schmetterlinge', name: 'Schmetterlinge', price: 5, fly: true, pv: () => ART.butterfly('#f7a8c4') },
  { id: 'sattel', name: 'Sattel', price: 6, onLuna: true, pv: () => ART.saddlePv },
  { id: 'decke', name: 'Pferdedecke (für jedes Pferd eine eigene)', price: 6, perHorse: true, onLuna: true, pv: () => ART.blanketPv(S.blanket || BLANKET_COLORS[0]) },
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
  { id: 'kuchen', name: 'Geburtstagskuchen', price: 0, art: () => ART.cake, s: 9, x: 55, y: 98, special: true, snd: 'sparkle' },
  { id: 'ziege', name: 'Ziege Zenzi (aus dem Apfelgarten)', price: 0, art: () => MAPART.goat, s: 11, x: 93, y: 80, special: true, snd: 'baa' },
  { id: 'goldzaum', name: 'Goldenes Zaumzeug', price: 0, onLuna: true, pv: () => TREASURE.goldzaum.svg, special: true },
  { id: 'krone', name: 'Krone (vom Märchenschloss)', price: 0, onLuna: true, pv: () => TREASURE.krone.svg, special: true }
];
const DECKE = ITEMS.find((i) => i.id === 'decke');
// ---- Pferdehof-Positionen absichern (Reparatur für Pferde, die hinter der Scheune verschwunden sind) ----
// Gilt nur für S.pos (Positionen). Gekaufte Sachen, Hufeisen, Fortschritt usw. werden nie verändert.
const FARM_HORSES = ['luna', 'pony', 'wolke', 'fohlen', 'nacht'];
const FARM_FREE = [[51, 81], [62, 88], [40, 92], [72, 80], [56, 96], [46, 72], [30, 86], [66, 72], [80, 78], [24, 96]];
function farmDef(id) { return id === 'luna' ? { id: 'luna', horse: 'luna', x: 51, y: 81 } : ITEMS.find((i) => i.id === id); }
function farmHiddenZone(it, x, y) {
  if (!it || it.sky || it.flat) return false;
  if (x < 40 && y < 65) return true;            // hinter/in der Scheune (Scheune steht bei x 20 %, Fuß bei 64 %)
  if (it.horse && x > 84 && y < 64) return true; // hinter dem Baum
  return false;
}
function farmValid(it, p) {
  if (!p || typeof p !== 'object' || !Number.isFinite(+p.x) || !Number.isFinite(+p.y)) return false;
  const [ymin, ymax] = it && it.sky ? [18, 52] : [54, 100];
  return p.x >= 3 && p.x <= 97 && p.y >= ymin && p.y <= ymax && !farmHiddenZone(it, +p.x, +p.y);
}
function farmFreeSpot(selfId) {
  // belegte Plätze: alle aufgestellten Sachen/Pferde (gespeicherte Position oder Startplatz)
  const ids = ['luna'].concat((S.owned || []).filter((id) => { const it = farmDef(id); return it && !it.onLuna && !it.onBarn && !it.fly && !it.sky && !it.flat; }));
  const taken = ids.filter((k) => k !== selfId).map((k) => { const q = S.pos && S.pos[k]; const d = farmDef(k); return q && Number.isFinite(+q.x) && Number.isFinite(+q.y) ? q : { x: d.x, y: d.y }; });
  let best = FARM_FREE[0], bestD = -1;
  for (const [x, y] of FARM_FREE) {
    const d = taken.reduce((m, q) => Math.min(m, Math.hypot(q.x - x, (q.y - y) * 1.6)), 999);
    if (d >= 16) return { x, y };
    if (d > bestD) { bestD = d; best = [x, y]; }
  }
  return { x: best[0], y: best[1] };
}
function farmSafePos(id, x, y) {
  const it = farmDef(id); if (!it) return { x, y };
  const p = { x: Math.max(3, Math.min(97, +x)), y: +y };
  const [ymin, ymax] = it.sky ? [18, 52] : [54, 100];
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return farmFreeSpot(id);
  p.y = Math.max(ymin, Math.min(ymax, p.y));
  if (farmHiddenZone(it, p.x, p.y)) return farmFreeSpot(id);
  return p;
}
function repairFarm() { // läuft bei jedem Start und beim Öffnen des Pferdehofs
  if (!S.pos || typeof S.pos !== 'object' || Array.isArray(S.pos)) { S.pos = {}; }
  let changed = false;
  for (const id of Object.keys(S.pos)) {
    const it = farmDef(id);
    if (!it) continue; // unbekannte Einträge unangetastet lassen
    if (!farmValid(it, S.pos[id])) { S.pos[id] = farmSafePos(id, S.pos[id] && S.pos[id].x, S.pos[id] && S.pos[id].y); changed = true; }
  }
  if (changed) save();
  return changed;
}
const itemName = (it) => (typeof it.name === 'function' ? it.name() : it.name);
const TUFTS = [[6, 58], [16, 62], [27, 59], [47, 61], [58, 57], [72, 60], [96, 59], [8, 72], [21, 76], [46, 70], [53, 82], [70, 78], [80, 70], [94, 76], [4, 88], [18, 90], [36, 84], [64, 94], [76, 90], [96, 92], [12, 99], [48, 99], [90, 99]];
const FLOWERS = [[10, 66, '#f7a8c4'], [33, 61, '#fff'], [52, 68, '#ffe08a'], [66, 64, '#d6c2f2'], [85, 61, '#fff'], [25, 84, '#ffe08a'], [44, 79, '#f7a8c4'], [74, 86, '#b5dcff'], [92, 84, '#f7a8c4'], [6, 95, '#d6c2f2'], [38, 97, '#fff'], [68, 99, '#ffe08a']];
let ambientTimer = 0;
let stableBack = null;
function farmMood() {
  const q = new URLSearchParams(location.search).get('mood');
  if (q === 'day' || q === 'evening') return q;
  const hr = new Date().getHours() + new Date().getMinutes() / 60;
  return hr >= 17.5 || hr < 6.5 ? 'evening' : 'day';
}
function showStable() {
  currentScreen = 'stable';
  repairFarm();
  clearInterval(ambientTimer);
  const mood = farmMood();
  app.innerHTML = '';
  const farm = h('div', { class: 'farm scene ' + mood, id: 'scene' });
  farm.addEventListener('scroll', () => { if (farm.scrollLeft || farm.scrollTop) { farm.scrollLeft = 0; farm.scrollTop = 0; } }); // nie verrutschen (Safari scrollt sonst versteckte Ränder ins Bild)
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
  barn.addEventListener('click', () => {
    barn.classList.toggle('open'); S.barnOpen = barn.classList.contains('open'); save(); Sound.door();
    if (S.barnOpen) setTimeout(() => { const n = callHorsesOut(true); fsay(n ? 'Alle Pferde kommen aus der Scheune! 🐴💕' : 'Die Scheune ist offen. Alle Pferde sind draußen auf der Koppel! 🐴'); }, 500);
  });
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
    h('button', { class: 'farm-btn back', id: 'homeBtn', 'aria-label': 'Zurück', onclick: () => { Sound.tap(); clearInterval(ambientTimer); (stableBack || showHome)(); } }, stableBack === showMap ? '🗺️' : '🏠'),
    h('div', { class: 'farm-hud' },
      h('div', { class: 'counter', id: 'shoeCount', html: SHOE + `<span>${S.shoes}</span>` }),
      h('div', { class: 'counter', id: 'carrotCount' }, h('span', { class: 'emo', html: ART.carrot }), h('span', null, String(S.carrots))),
      h('button', { class: 'farm-btn', id: 'shopBtn', 'aria-label': 'Stall-Laden', onclick: () => { Sound.tap(); openDrawer(); } }, '🛒')),
    h('div', { class: 'bubble farm-say', id: 'farmSay' }, ''));
  const carrotTool = h('button', { class: 'tool', id: 'toolCarrot', 'aria-label': 'Karotte' }, h('span', { html: ART.carrot }), h('b', { class: 'badge' }, String(S.carrots)));
  const brushTool = h('button', { class: 'tool', id: 'toolBrush', 'aria-label': 'Bürste' }, h('span', { html: ART.brush }));
  ui.append(h('div', { class: 'tray' }, carrotTool, brushTool));
  const tray = h('div', { class: 'tray2', id: 'foodTray' });
  ui.append(tray);
  const foodTools = {};
  function renderTray() {
    FOODS.forEach((f) => {
      const show = has(f.animal);
      if (show && !foodTools[f.key]) {
        const t = h('button', { class: 'tool food', id: 'tool-' + f.key, 'data-food': f.key, 'aria-label': f.name }, h('span', { html: ART[{ bones: 'bone', grain: 'grain', treats: 'treat' }[f.key]] }), h('b', { class: 'badge' }, String(S[f.key] || 0)));
        foodTools[f.key] = t; tray.append(t); foodDrag(t, f);
      } else if (!show && foodTools[f.key]) { foodTools[f.key].remove(); delete foodTools[f.key]; }
      if (foodTools[f.key]) { $('.badge', foodTools[f.key]).textContent = S[f.key] || 0; foodTools[f.key].classList.toggle('empty', !(S[f.key] > 0)); }
    });
  }
  const drawer = h('div', { class: 'drawer', id: 'drawer' });
  ui.append(drawer);

  let sayT = 0;
  const fsay = (t) => { const b = $('#farmSay'); b.textContent = t; b.classList.add('show'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); clearTimeout(sayT); sayT = setTimeout(() => b.classList.remove('show'), readMs(t, 4200)); };
  const updTools = () => { updateCounters(); $('.badge', carrotTool).textContent = S.carrots; carrotTool.classList.toggle('empty', S.carrots <= 0); };
  updTools();

  // Parallaxe (sanft)
  let pxRaf = 0, pxv = 0;
  farm.addEventListener('pointermove', (e) => { pxv = (e.clientX / window.innerWidth - 0.5) * 2; if (!pxRaf) pxRaf = requestAnimationFrame(() => { pxRaf = 0; farm.style.setProperty('--px', pxv.toFixed(3)); }); }, { passive: true });

  // Gegenstände und Pferde
  function itemOf(id) { return id === 'luna' ? { id: 'luna', horse: 'luna', s: 29, x: 51, y: 81 } : ITEMS.find((i) => i.id === id); }
  // Pferd (oder Sache) sanft an einen sichtbaren Platz traben lassen
  function walkTo(el, id, p) {
    S.pos[id] = { x: p.x, y: p.y }; save();
    el.classList.remove('settle', 'dragging'); el.classList.add('walkout');
    const it = itemOf(id);
    requestAnimationFrame(() => { el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.zIndex = zFor(it, p.y); });
    setTimeout(() => el.classList.remove('walkout'), 1400);
  }
  function isVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return false;
    return [[.5, .45], [.35, .6], [.65, .6], [.5, .75], [.3, .35], [.7, .35]].some(([fx, fy]) => {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
      const hit = document.elementFromPoint(x, y); return hit && el.contains(hit);
    });
  }
  // Alle Pferde, die versteckt sind (z. B. hinter der Scheune), kommen heraus. all=true: auch die, die nur halb verdeckt sind
  function callHorsesOut(all) {
    let n = 0;
    $$('.item.horse-item', farm).forEach((el) => {
      const id = el.dataset.id, p = S.pos[id] || itemOf(id);
      if (farmHiddenZone(itemOf(id), p.x, p.y) || !isVisible(el)) { walkTo(el, id, farmFreeSpot(id)); n++; }
      else if (all && p.y < 70 && p.x < 46) { walkTo(el, id, farmFreeSpot(id)); n++; }
    });
    if (n) Sound.clipclop();
    return n;
  }
  function zFor(it, y) { return it.sky ? 2 : it.flat ? Math.round(90 + y / 10) : Math.round(100 + y * 10); }
  function placeItem(it, isNew) {
    const p = S.pos[it.id] || { x: it.x, y: it.y };
    const html = it.horse ? horseSVG(Object.assign({}, HORSES[it.horse], horseOpts(it.id))) : it.art();
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
    placeItem(itemOf('luna'), false);
    flies.slice(1).forEach((f) => f.remove()); flies.length = 1;
    if (has('schmetterlinge')) ['#f7a8c4', '#b5dcff', '#d6c2f2'].forEach((c, i) => addFly(c, i + 1));
    if (newId === 'wetterfahne') { barn.innerHTML = barnSVG(mood === 'evening', true); }
    renderTray();
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
        const safe = farmSafePos(it.id, x, y);
        if (safe.x !== x || safe.y !== y) {
          // nicht in/hinter die Scheune: das Pferd trabt fröhlich wieder heraus
          setTimeout(() => { walkTo(el, it.id, safe); Sound.clipclop(); fsay(it.horse ? `${horseName(it.horse)} trabt wieder aus der Scheune – hier draußen ist es schöner! 🐴` : 'Das stellen wir lieber hierhin, damit du es gut sehen kannst. 😊'); }, 380);
        } else if (it.horse && !it.sky) setTimeout(() => { if (!isVisible(el)) { walkTo(el, it.id, farmFreeSpot(it.id)); Sound.clipclop(); } }, 450);
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
      dressBtn(el, it.id);
    } else {
      react(el, 'bounce'); (Sound[it.snd] || Sound.plop)();
      fsay(pick([`Schön: ${itemName(it)}!`, `${itemName(it)} – gefällt mir!`]));
      if (it.id === 'hund' && !playing) playBtn(el);
    }
  }
  // Wer bekommt das neue Teil?
  function buyBlanket(it, forId) {
    const free = horsesWithoutBlanket();
    if (S.shoes < it.price || !free.length || (forId && !free.includes(forId))) return;
    const pay = (id) => {
      S.shoes -= it.price; if (!has('decke')) S.owned.push('decke'); giveGear('decke', id); save(); updTools(); Sound.fanfare(); renderScene();
      const el = $(`.item[data-id="${id}"]`, farm); if (el) { burst(el, ['✨', '⭐', '💖']); react(el, 'yay'); }
      fsay(`${horseName(id)} hat jetzt eine eigene Decke! Tipp ${horseName(id)} an, dann kannst du die Farbe aussuchen. 💖`);
    };
    closeDrawer();
    if (forId || free.length === 1) { pay(forId || free[0]); if (!forId) setTimeout(() => openWardrobe(free[0]), 600); return; }
    const card = h('div', { class: 'bag-card pick-card', id: 'pickHorse' }, h('h2', null, 'Welches Pferd bekommt die neue Decke?'),
      h('div', { class: 'pick-grid' }, free.map((id) => h('button', { class: 'pick', 'data-pick': id, onclick: () => { close(); pay(id); setTimeout(() => openWardrobe(id), 600); } },
        h('span', { class: 'pvh', html: horseSVG(Object.assign({}, HORSES[id], horseOpts(id), { delay: 0 })) }), h('b', null, horseName(id))))),
      h('button', { class: 'bigbtn', id: 'pickCancel', onclick: () => { Sound.tap(); close(); } }, 'Doch nicht'));
    const close = sheet(card);
  }
  function pickHorse(it) {
    const card = h('div', { class: 'bag-card pick-card', id: 'pickHorse' }, h('h2', null, `Wer bekommt: ${itemName(it)}?`),
      h('div', { class: 'pick-grid' }, ownedHorses().map((id) => h('button', { class: 'pick', 'data-pick': id, onclick: () => {
        giveGear(it.id, id); Sound.sparkle(); close(); renderScene();
        const el = $(`.item[data-id="${id}"]`, farm); if (el) { burst(el, ['✨', '⭐', '💖']); react(el, 'yay'); }
        fsay(`${horseName(id)} freut sich riesig! 💖`);
        if (it.id === 'decke') setTimeout(() => openWardrobe(id), 500);
      } }, h('span', { class: 'pvh', html: horseSVG(Object.assign({}, HORSES[id], horseOpts(id), { delay: 0 })) }), h('b', null, horseName(id))))));
    const close = sheet(card);
  }
  // Anziehen: jedes Pferd hat eigene Decke (Farbe), Sattel, Schleife, Zaumzeug, Krone
  function openWardrobe(id) {
    const card = h('div', { class: 'bag-card ward-card', id: 'wardrobe' });
    const draw = () => {
      card.innerHTML = '';
      const o = horseOpts(id), g = gearOf(id);
      const tog = (item, key, label) => has(item) ? h('button', { class: 'wtog' + (o[key] ? ' on' : ''), 'data-gear': item, onclick: () => { g[key] = !o[key]; save(); o[key] ? Sound.plop() : Sound.sparkle(); draw(); renderScene(); } },
        h('span', { html: ITEMS.find((x) => x.id === item).pv() }), label) : null;
      card.append(h('h2', null, `🎀 ${horseName(id)} anziehen`),
        h('div', { class: 'ward-pv', html: horseSVG(Object.assign({}, HORSES[id], o, { delay: 0 })) }),
        !ownsBlanket(id) ? h('div', null, h('div', { class: 'wlabel' }, 'Decke'), S.shoes >= DECKE.price
          ? h('button', { class: 'smallbtn', id: 'wardBuyBlanket', html: `Eigene Decke holen (${SHOE} ${DECKE.price})`, onclick: () => { close(); buyBlanket(DECKE, id); setTimeout(() => openWardrobe(id), 600); } })
          : h('small', { html: `Eine eigene Decke kostet ${SHOE} ${DECKE.price}. Spiel eine Runde, dann reicht es bald!` })) : null,
        ownsBlanket(id) ? h('div', null, h('div', { class: 'wlabel' }, 'Decke'), h('div', { class: 'swatches' }, BLANKET_COLORS.map((c) => h('button', {
          class: 'swatch' + (o.blanket === c ? ' on' : ''), 'data-wcolor': c, style: { background: c }, 'aria-label': 'Deckenfarbe',
          onclick: () => { g.blanket = c; save(); Sound.sparkle(); draw(); renderScene(); } })),
          h('button', { class: 'swatch none' + (o.blanket ? '' : ' on'), 'data-wcolor': 'none', 'aria-label': 'Keine Decke', onclick: () => { g.blanket = null; save(); Sound.plop(); draw(); renderScene(); } }, '–'))) : null,
        h('div', { class: 'wtogs' }, tog('sattel', 'saddle', 'Sattel'), tog('schleife', 'bow', 'Schleife'), tog('goldzaum', 'bridle', 'Zaumzeug'), tog('krone', 'crown', 'Krone')),
        h('button', { class: 'bigbtn primary', id: 'wardClose', onclick: () => { Sound.tap(); close(); } }, 'Fertig 💖'));
    };
    draw();
    const close = sheet(card);
  }
  function dressBtn(el, id) {
    if (!Object.keys(GEAR).some((g) => has(g))) return;
    $$('.dress-btn', farm).forEach((b) => b.remove());
    const r = el.getBoundingClientRect(), fr = farm.getBoundingClientRect();
    const b = h('button', { class: 'dress-btn', 'data-dress': id, 'aria-label': 'Anziehen', onclick: (e) => { e.stopPropagation(); Sound.tap(); b.remove(); openWardrobe(id); } }, '🎀 Anziehen');
    b.style.left = Math.min(fr.width - 90, Math.max(70, r.left - fr.left + r.width / 2)) + 'px'; b.style.top = Math.max(70, r.top - fr.top - 6) + 'px';
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    farm.append(b); setTimeout(() => b.remove(), readMs('', 5000));
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
  // Futter zu Hund, Hühnern, Kätzchen ziehen
  function animalAt(x, y, id) {
    const el = $(`.item[data-id="${id}"]`, farm); if (!el) return null;
    const r = el.getBoundingClientRect();
    return x > r.left - 20 && x < r.right + 20 && y > r.top - 20 && y < r.bottom + 20 ? el : null;
  }
  const FEED_SAY = {
    hund: ['Wuff! Der Hofhund wedelt ganz doll mit dem Schwanz! 🐶💖', 'Knusper, knusper – der Hund liebt Knochen! 🦴', 'Der Hund macht Männchen vor Freude! 🐶'],
    huehner: ['Pick, pick, pick! Die Hühner gackern fröhlich. 🐔', 'Die Hühner freuen sich über die Körner! 🌾💛', 'Gack-gack! Danke für das Frühstück! 🐔'],
    kaetzchen: ['Miau! Das Kätzchen schnurrt ganz zufrieden. 🐱💕', 'Das Kätzchen putzt sich nach dem Leckerli das Schnäuzchen. 🐟', 'Schnurr, schnurr … 🐱']
  };
  function foodDrag(tool, f) {
    tool.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!(S[f.key] > 0)) { Sound.tap(); fsay(`Spiel eine Runde, dann bekommst du neue ${f.name}. ${f.emo}`); return; }
      try { tool.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const ghost = add(h('div', { class: 'ghost', html: $('span', tool).innerHTML }));
      const mv = (ev) => { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; };
      mv(e); let moved = false;
      const onMove = (ev) => { mv(ev); moved = true; const t = animalAt(ev.clientX, ev.clientY, f.animal); $$('.item.target', farm).forEach((x) => x !== t && x.classList.remove('target')); if (t) t.classList.add('target'); };
      const onUp = (ev) => {
        tool.removeEventListener('pointermove', onMove); tool.removeEventListener('pointerup', onUp); tool.removeEventListener('pointercancel', onUp);
        ghost.remove(); $$('.item.target', farm).forEach((x) => x.classList.remove('target'));
        const t = animalAt(ev.clientX, ev.clientY, f.animal);
        if (!moved || !t) { Sound.tap(); fsay(`Zieh ${f.name === 'Körner' ? 'die Körner' : f.name === 'Knochen' ? 'den Knochen' : 'das Leckerli'} zu ${f.animal === 'hund' ? 'dem Hund' : f.animal === 'huehner' ? 'den Hühnern' : 'dem Kätzchen'}! ${f.emo}`); return; }
        S[f.key]--; S.fedAnimals = S.fedAnimals || {}; S.fedAnimals[f.animal] = (S.fedAnimals[f.animal] || 0) + 1; save(); renderTray();
        react(t, f.animal === 'huehner' ? 'munch' : 'yay'); burst(t, ['💖', f.emo, '💕']);
        (f.animal === 'hund' ? Sound.woof : f.animal === 'huehner' ? Sound.cluck : Sound.meow)(); setTimeout(() => Sound.munch(), 300);
        fsay(pick(FEED_SAY[f.animal]));
      };
      tool.addEventListener('pointermove', onMove); tool.addEventListener('pointerup', onUp); tool.addEventListener('pointercancel', onUp);
    });
  }
  // Hund spielt Fangen mit den Hühnern – nur Spaß: niemand wird gefangen, alle kommen wieder an ihren Platz
  let playing = false;
  function dogPlay() {
    const dog = $('.item[data-id="hund"]', farm); if (!dog || playing) return;
    const hens = $('.item[data-id="huehner"]', farm);
    playing = true;
    const home = (el) => ({ left: el.style.left, top: el.style.top, z: el.style.zIndex });
    const dh = home(dog), hh = hens ? home(hens) : null;
    const path = [[30, 90], [52, 84], [72, 92], [60, 98], [38, 96], [24, 88], [44, 82], [66, 88]];
    dog.classList.add('chase'); if (hens) hens.classList.add('flutter');
    fsay(hens ? 'Der Hund will spielen! Die Hühner flattern lustig davon – fang mich doch! 🐶🐔' : 'Der Hund rennt eine fröhliche Runde über die Koppel! 🐶💨');
    let step = 0;
    const tick = () => {
      if (currentScreen !== 'stable' || step >= path.length) { end(); return; }
      const [x, y] = path[step];
      if (hens) { hens.style.left = x + '%'; hens.style.top = y + '%'; hens.style.zIndex = 3200; if (step % 2 === 0) { Sound.cluck(); feathers(hens); } }
      const [px, py] = path[Math.max(0, step - 1)];
      setTimeout(() => { if (!playing) return; dog.style.left = (hens ? px : x) + '%'; dog.style.top = (hens ? py : y) + '%'; dog.style.zIndex = 3100; if (step % 3 === 1) Sound.woof(); }, hens ? 250 : 0);
      step++; playT = setTimeout(tick, 650);
    };
    let playT = setTimeout(tick, 200);
    function end() {
      clearTimeout(playT);
      setTimeout(() => {
        dog.style.left = dh.left; dog.style.top = dh.top; if (hens) { hens.style.left = hh.left; hens.style.top = hh.top; }
        setTimeout(() => {
          dog.classList.remove('chase'); dog.style.zIndex = dh.z; if (hens) { hens.classList.remove('flutter'); hens.style.zIndex = hh.z; }
          playing = false; if (currentScreen === 'stable') { burst(dog, ['💖', '🐾']); fsay(hens ? 'Puh, das war lustig! Jetzt ruhen sich alle wieder aus. 💤' : 'Puh! Jetzt legt sich der Hund gemütlich hin. 💤'); }
        }, 900);
      }, 300);
    }
  }
  function feathers(el) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 3; i++) { const f = add(h('span', { class: 'feather' }, '🪶')); f.style.left = (r.left + r.width * Math.random()) + 'px'; f.style.top = (r.top + r.height * 0.4) + 'px'; f.style.setProperty('--dx', rand(-40, 40) + 'px'); setTimeout(() => f.remove(), 1600); }
  }
  function playBtn(el) {
    $$('.dress-btn', farm).forEach((b) => b.remove());
    const r = el.getBoundingClientRect(), fr = farm.getBoundingClientRect();
    const b = h('button', { class: 'dress-btn', id: 'dogPlay', 'aria-label': 'Spielen', onclick: (e) => { e.stopPropagation(); Sound.tap(); b.remove(); dogPlay(); } }, has('huehner') ? '🐾 Fang!' : '🐾 Lauf!');
    b.style.left = Math.min(fr.width - 90, Math.max(70, r.left - fr.left + r.width / 2)) + 'px'; b.style.top = Math.max(70, r.top - fr.top - 6) + 'px';
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    farm.append(b); setTimeout(() => b.remove(), readMs('', 5000));
  }

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
      const done = it.perHorse ? !horsesWithoutBlanket().length : has(it.id);
      if (done) btn = h('button', { class: 'have', disabled: true }, '✔ Alle haben eine');
      else if (S.shoes >= it.price) btn = h('button', { 'data-buy': it.id, onclick: () => buy(it) }, 'Holen');
      else btn = h('button', { class: 'later', disabled: true }, `Noch ${it.price - S.shoes}`);
      if (done && !it.perHorse) btn = h('button', { class: 'have', disabled: true }, '✔ Da');
      list.append(h('div', { class: 'sitem' + (done ? ' owned' : '') }, h('div', { class: 'pv', html: pvHtml }),
        h('div', { class: 'nm' }, itemName(it), it.special ? h('small', null, '🎁 Geschenk') : h('small', { html: SHOE + ' ' + it.price })), btn));
    });
    body.append(list);
    if (Object.keys(GEAR).some((id) => has(id))) {
      body.append(h('h4', null, '🎀 Pferde anziehen'), h('div', { class: 'wardlist' }, ownedHorses().map((id) => h('div', { class: 'wardrow', 'data-ward': id },
        h('span', { class: 'pvh', html: horseSVG(Object.assign({}, HORSES[id], horseOpts(id), { delay: 0 })) }),
        h('b', null, horseName(id)),
        ownsBlanket(id) ? h('div', { class: 'swatches' }, BLANKET_COLORS.map((c) => h('button', {
          class: 'swatch' + (horseOpts(id).blanket === c ? ' on' : ''), 'data-color': c, 'data-horse': id, 'aria-label': 'Deckenfarbe', style: { background: c },
          onclick: () => { gearOf(id).blanket = c; save(); Sound.sparkle(); renderScene(); renderDrawer(); }
        })), h('button', { class: 'swatch none' + (horseOpts(id).blanket ? '' : ' on'), 'data-color': 'none', 'data-horse': id, 'aria-label': 'Keine Decke',
          onclick: () => { gearOf(id).blanket = null; save(); Sound.plop(); renderScene(); renderDrawer(); } }, '–')) : null,
        h('button', { class: 'smallbtn', 'data-wardrobe': id, onclick: () => { Sound.tap(); openWardrobe(id); } }, 'Anziehen')))));
    }
    const horses = ['luna'].concat(ITEMS.filter((i) => i.horse && has(i.id)).map((i) => i.horse));
    body.append(h('h4', null, 'Namen der Pferde'), h('div', { class: 'names' }, horses.map((id) => {
      const inp = h('input', { type: 'text', maxlength: '14', 'data-horse-name': id, value: horseName(id), autocomplete: 'off', 'aria-label': 'Name' });
      inp.addEventListener('change', () => { S.horseNames = S.horseNames || {}; S.horseNames[id] = inp.value.replace(/[<>]/g, '').trim().slice(0, 14); save(); Sound.sparkle(); });
      return h('label', { class: 'nameRow' }, h('span', { class: 'pvh', html: id === 'luna' ? lunaSVG() : horseSVG(Object.assign({}, HORSES[id], { delay: 0 })) }), inp);
    })));
  }
  function buy(it) {
    if (it.perHorse) { buyBlanket(it); return; }
    if (S.shoes < it.price || has(it.id)) return;
    S.shoes -= it.price; S.owned.push(it.id); save(); updTools();
    Sound.fanfare();
    closeDrawer();
    renderScene(it.id);
    if (GEAR[it.id]) {
      const hs = ownedHorses();
      if (hs.length === 1) { giveGear(it.id, 'luna'); renderScene(); }
      else { setTimeout(() => pickHorse(it), 350); fsay(`Juhu, ${itemName(it)}! Welches Pferd bekommt es? 🐴`); return; }
    }
    setTimeout(() => {
      const el = it.onBarn ? barn : $(`.item[data-id="${it.onLuna ? 'luna' : it.id}"]`, farm) || (it.fly ? flies[1] : null);
      if (el) burst(el, ['✨', '⭐', '💖']);
    }, 150);
    fsay(`Juhu! ${itemName(it)} ist jetzt auf unserem Hof! 🎉`);
  }
  renderScene();
  // Sicherheitsnetz: falls ein Pferd trotzdem verdeckt ist, kommt es von selbst heraus
  setTimeout(() => { if (currentScreen === 'stable' && callHorsesOut(false)) fsay(`${LN()} ist wieder da! 🐴💕`); }, 700);
  fsay(S.carrots > 0 ? 'Willkommen auf dem Pferdehof! Zieh eine Karotte zu einem Pferd. 🥕' : 'Willkommen auf dem Pferdehof! Mit der Bürste kannst du die Pferde putzen. ✨');
  // ganz leise Naturgeräusche ab und zu
  ambientTimer = setInterval(() => {
    if (currentScreen !== 'stable') { clearInterval(ambientTimer); return; }
    const r = Math.random();
    if (r < 0.22) Sound.chirp(); else if (r < 0.32) Sound.quack();
  }, 9000);
}

// ================= Abenteuer-Reise: Schätze, Welten, Karte =================
// Schatz-Symbole (alle selbst gezeichnet)
const TREASURE = {
  blume: { name: 'Blume', svg: svgw('0 0 48 48', `<path d="M24 46 q-2 -12 0 -20" stroke="#5fa04e" stroke-width="3.5" fill="none"/><ellipse cx="30" cy="38" rx="7" ry="3.4" fill="#6fb85a" transform="rotate(-30 30 38)"/>${range(0, 4).map((i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return `<circle cx="${(24 + Math.cos(a) * 8).toFixed(1)}" cy="${(18 + Math.sin(a) * 8).toFixed(1)}" r="7.2" fill="#f7a8c4"/>`; }).join('')}<circle cx="24" cy="18" r="5.5" fill="#ffd166"/><circle cx="22.5" cy="16.5" r="1.6" fill="#fff" opacity=".8"/>`) },
  kartenteil: { name: 'Stück der Schatzkarte', svg: svgw('0 0 48 48', `<path d="M8 10 L22 6 L26 12 L40 8 L42 38 L28 42 L24 36 L10 40 Z" fill="#f7e3b5" stroke="#d9b874" stroke-width="2" stroke-linejoin="round"/><path d="M14 30 q6 -10 12 -4 t10 -8" stroke="#e58f73" stroke-width="2.2" fill="none" stroke-dasharray="3 3"/><path d="M33 15 l4 4 m0 -4 l-4 4" stroke="#e58f73" stroke-width="2.4" stroke-linecap="round"/>`) },
  schluessel: { name: 'Goldener Schlüssel', svg: svgw('0 0 48 48', `<circle cx="15" cy="17" r="10" fill="none" stroke="#f2c14e" stroke-width="5"/><circle cx="15" cy="17" r="10" fill="none" stroke="#c9962a" stroke-width="1" opacity=".5"/><path d="M22 24 L40 42 M32 34 l4 -4 M36 38 l4 -4" stroke="#f2c14e" stroke-width="5" stroke-linecap="round"/><circle cx="12" cy="13" r="2" fill="#fff" opacity=".7"/>`) },
  apfel: { name: 'Apfel', svg: svgw('0 0 48 48', `<path d="M24 14 C14 8 6 16 8 28 C10 40 18 44 24 41 C30 44 38 40 40 28 C42 16 34 8 24 14 Z" fill="#f26d6d"/><path d="M24 14 q1 -6 5 -9" stroke="#8a5a36" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M26 9 q8 -4 12 2 q-7 3 -12 -2z" fill="#6fb85a"/><ellipse cx="16" cy="22" rx="3" ry="5" fill="#fff" opacity=".45"/>`) },
  ei: { name: 'Frühstücksei', svg: svgw('0 0 48 48', `<ellipse cx="24" cy="38" rx="16" ry="5" fill="#d9b874" opacity=".5"/><path d="M24 6 C14 6 9 20 9 28 C9 37 16 42 24 42 C32 42 39 37 39 28 C39 20 34 6 24 6 Z" fill="#fff6e8" stroke="#ecd9bd" stroke-width="2"/><ellipse cx="18" cy="20" rx="3" ry="5" fill="#fff" /><circle cx="28" cy="30" r="2" fill="#f7c3cf"/><circle cx="20" cy="33" r="1.6" fill="#b5dcff"/>`) },
  glocke: { name: 'Glöckchen von Zenzi', svg: svgw('0 0 48 48', `<path d="M24 6 C14 6 12 16 12 24 C12 30 8 32 8 35 L40 35 C40 32 36 30 36 24 C36 16 34 6 24 6 Z" fill="#f6cf5a" stroke="#c9962a" stroke-width="2"/><circle cx="24" cy="39" r="4.5" fill="#c9962a"/><path d="M17 14 q-2 6 -2 12" stroke="#fff" stroke-width="2.4" opacity=".7" fill="none" stroke-linecap="round"/><path d="M14 35 h20" stroke="#f7a8c4" stroke-width="4"/>`) },
  muschel: { name: 'Muschel', svg: svgw('0 0 48 48', `<path d="M24 40 L8 22 C10 10 38 10 40 22 Z" fill="#fbc6d4" stroke="#ef9bb3" stroke-width="2" stroke-linejoin="round"/><path d="M24 40 L14 16 M24 40 L20 13 M24 40 L28 13 M24 40 L34 16" stroke="#ef9bb3" stroke-width="2"/><rect x="18" y="38" width="12" height="5" rx="2.5" fill="#ef9bb3"/>`) },
  brett: { name: 'Holzbrett', svg: svgw('0 0 48 48', `<g transform="rotate(-18 24 24)"><rect x="4" y="17" width="40" height="14" rx="3" fill="#d29a64" stroke="#a87146" stroke-width="2"/><path d="M10 22 q8 3 16 0 t14 1" stroke="#b8804f" stroke-width="1.6" fill="none"/><circle cx="9" cy="24" r="1.6" fill="#8a5a36"/><circle cx="39" cy="24" r="1.6" fill="#8a5a36"/></g>`) },
  perle: { name: 'Glitzer-Perle', svg: svgw('0 0 48 48', `<path d="M6 30 C10 18 38 18 42 30 C38 40 10 40 6 30 Z" fill="#fbc6d4"/><circle cx="24" cy="28" r="10" fill="#fdf6ff" stroke="#e3d3f5" stroke-width="2"/><circle cx="20" cy="24" r="3.4" fill="#fff"/><path d="M36 10 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5z" fill="#ffe08a"/>`) },
  kristall: { name: 'Berg-Kristall', svg: svgw('0 0 48 48', `<path d="M24 4 L36 18 L30 44 L18 44 L12 18 Z" fill="#c9e6ff" stroke="#9fc8f0" stroke-width="2" stroke-linejoin="round"/><path d="M24 4 L24 44 M12 18 L36 18" stroke="#9fc8f0" stroke-width="1.6"/><path d="M17 20 L21 38" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><path d="M38 6 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2z" fill="#d6c2f2"/>`) },
  laterne: { name: 'Bunte Laterne', svg: svgw('0 0 48 48', `<path d="M24 2 v6" stroke="#8a5a36" stroke-width="2.4"/><rect x="18" y="7" width="12" height="4" rx="2" fill="#8a5a36"/><ellipse cx="24" cy="27" rx="15" ry="16" fill="#ffb38a"/><path d="M24 11 v32 M14 15 q-4 12 0 24 M34 15 q4 12 0 24" stroke="#f6a07a" stroke-width="1.8" fill="none"/><ellipse cx="24" cy="27" rx="7" ry="9" fill="#ffe08a" opacity=".75"/><rect x="18" y="42" width="12" height="4" rx="2" fill="#8a5a36"/>`) },
  edelweiss: { name: 'Edelweiß', svg: svgw('0 0 48 48', `<path d="M24 46 v-14" stroke="#7fae6a" stroke-width="3"/>${range(0, 7).map((i) => `<ellipse cx="24" cy="12" rx="4.2" ry="9" fill="#fbfaf6" stroke="#dcd8cc" stroke-width="1.2" transform="rotate(${i * 45} 24 21)"/>`).join('')}<circle cx="24" cy="21" r="5" fill="#f3e6a6"/><circle cx="22.5" cy="20" r="1.2" fill="#d9c56b"/><circle cx="25.5" cy="22" r="1.2" fill="#d9c56b"/>`) },
  stern: { name: 'Zauberstern', svg: svgw('0 0 48 48', `<path d="M24 4 L29.5 17 L43 18 L32.5 27 L36 41 L24 33.5 L12 41 L15.5 27 L5 18 L18.5 17 Z" fill="#ffd966" stroke="#e5b84a" stroke-width="2" stroke-linejoin="round"/><circle cx="19" cy="22" r="1.8" fill="#8a6a4a"/><circle cx="29" cy="22" r="1.8" fill="#8a6a4a"/><path d="M20 28 q4 3 8 0" stroke="#8a6a4a" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="16" cy="26" r="2" fill="#f7a0b5" opacity=".6"/><circle cx="32" cy="26" r="2" fill="#f7a0b5" opacity=".6"/>`) },
  goldzaum: { name: 'Goldenes Zaumzeug', svg: svgw('0 0 48 48', `<path d="M10 10 Q24 2 38 10 Q44 26 34 40 M10 10 Q4 26 14 40" stroke="#f2c14e" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M8 26 H40" stroke="#f2c14e" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="6" r="4" fill="#f7a8c4" stroke="#c9962a" stroke-width="1.4"/><circle cx="8" cy="26" r="3.4" fill="#fff3c4" stroke="#c9962a"/><circle cx="40" cy="26" r="3.4" fill="#fff3c4" stroke="#c9962a"/>`) },
  krone: { name: 'Prinzessinnen-Krone', svg: svgw('0 0 48 48', `<path d="M6 38 L6 14 L16 24 L24 8 L32 24 L42 14 L42 38 Z" fill="#f6cf5a" stroke="#c9962a" stroke-width="2" stroke-linejoin="round"/><rect x="6" y="34" width="36" height="6" rx="2" fill="#e5b84a"/><circle cx="24" cy="8" r="3.4" fill="#f7a8c4"/><circle cx="6" cy="14" r="2.8" fill="#b5dcff"/><circle cx="42" cy="14" r="2.8" fill="#b5dcff"/><circle cx="24" cy="29" r="3.6" fill="#d6c2f2"/><circle cx="14" cy="31" r="2.4" fill="#b9e2a0"/><circle cx="34" cy="31" r="2.4" fill="#b9e2a0"/>`) }
};

// Landschafts-Elemente für die Weltkarte
const MAPART = {
  mushroom: svgw('0 0 60 60', `<path d="M22 34 Q20 52 24 56 L36 56 Q40 52 38 34 Z" fill="#fff5e6"/><path d="M4 36 C4 14 56 14 56 36 Q30 42 4 36 Z" fill="#f7949f"/><circle cx="18" cy="26" r="4" fill="#fff"/><circle cx="34" cy="21" r="3.2" fill="#fff"/><circle cx="45" cy="30" r="3.6" fill="#fff"/><circle cx="26" cy="47" r="1.6" fill="#5a4033"/><circle cx="34" cy="47" r="1.6" fill="#5a4033"/><path d="M27 51 q3 2 6 0" stroke="#5a4033" stroke-width="1.4" fill="none"/>`),
  bee: svgw('0 0 44 34', `<g class="wings"><ellipse cx="16" cy="9" rx="8" ry="6" fill="#fff" opacity=".85"/><ellipse cx="27" cy="8" rx="8" ry="6" fill="#fff" opacity=".85"/></g><ellipse cx="22" cy="21" rx="13" ry="9" fill="#ffd166"/><path d="M18 13 q-2 8 0 16 M25 12.5 q-2 8.5 0 17" stroke="#8a6a4a" stroke-width="3.2" fill="none"/><circle cx="32" cy="19" r="1.8" fill="#3a2a20"/><circle cx="33" cy="23" r="1.6" fill="#f7a0b5" opacity=".6"/>`),
  roseArch: svgw('0 0 170 180', `<rect x="18" y="60" width="12" height="118" rx="5" fill="#fff"/><rect x="140" y="60" width="12" height="118" rx="5" fill="#fff"/>
    <path d="M24 70 C24 10 146 10 146 70" stroke="#7cc36a" stroke-width="16" fill="none" stroke-linecap="round"/>
    ${[[26, 62], [30, 40], [44, 24], [64, 14], [86, 12], [108, 16], [126, 28], [140, 46], [144, 66]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 7 : 9}" fill="${i % 3 === 0 ? '#f7a8c4' : i % 3 === 1 ? '#fff' : '#ffb3c6'}"/><circle cx="${x}" cy="${y}" r="3" fill="#ec8fae" opacity=".6"/>`).join('')}
    <g class="gdoor gl">${range(0, 4).map((i) => `<rect x="${32 + i * 11}" y="${108 - (i % 2) * 6}" width="8" height="${70 + (i % 2) * 6}" rx="4" fill="#fff6e6" stroke="#e9d6bb"/>`).join('')}<rect x="30" y="128" width="56" height="7" rx="3" fill="#fff6e6" stroke="#e9d6bb"/></g>
    <g class="gdoor gr">${range(0, 4).map((i) => `<rect x="${86 + i * 11}" y="${108 - ((i + 1) % 2) * 6}" width="8" height="${70 + ((i + 1) % 2) * 6}" rx="4" fill="#fff6e6" stroke="#e9d6bb"/>`).join('')}<rect x="84" y="128" width="56" height="7" rx="3" fill="#fff6e6" stroke="#e9d6bb"/></g>`),
  goat: svgw('0 0 120 112', `<path d="M24 52 q-10 -6 -8 -14 q6 6 12 8z" fill="#efe9df"/>
    <rect x="32" y="70" width="9" height="36" rx="4.5" fill="#e7e0d4"/><rect x="72" y="70" width="9" height="36" rx="4.5" fill="#e7e0d4"/>
    <ellipse cx="56" cy="62" rx="34" ry="20" fill="#fbf8f2"/>
    <rect x="42" y="72" width="9" height="36" rx="4.5" fill="#fbf8f2"/><rect x="82" y="72" width="9" height="36" rx="4.5" fill="#fbf8f2"/>
    <rect x="41" y="102" width="11" height="7" rx="3" fill="#b9a99a"/><rect x="81" y="102" width="11" height="7" rx="3" fill="#b9a99a"/>
    <path d="M82 50 C84 36 90 28 98 26 L106 40 C100 44 96 52 92 60 Z" fill="#fbf8f2"/>
    <path d="M92 22 C88 12 94 6 100 8 C96 12 96 16 98 22Z M102 22 C102 12 108 8 113 11 C108 14 106 18 106 23Z" fill="#d8c3a5"/>
    <ellipse cx="104" cy="34" rx="13" ry="11" fill="#fbf8f2"/><ellipse cx="112" cy="40" rx="7" ry="6" fill="#f3e6dc"/>
    <path d="M88 30 q-10 2 -12 10 q8 -2 13 -6z" fill="#f3c6cf"/><g class="eye"><circle cx="105" cy="31" r="2.8" fill="#3a2a20"/><circle cx="106" cy="30" r="1" fill="#fff"/></g>
    <path d="M108 46 q2 10 -2 14 q-4 -6 -2 -14z" fill="#e7e0d4"/><path d="M110 43 q3 2 6 0" stroke="#7a5a48" stroke-width="1.6" fill="none"/>
    <path d="M90 52 q8 4 14 0" stroke="#f7a8c4" stroke-width="4" fill="none"/><circle cx="97" cy="58" r="4.5" fill="#f6cf5a" stroke="#c9962a"/><circle cx="100" cy="36" r="2.6" fill="#f7a0b5" opacity=".5"/>`),
  pumpkin: svgw('0 0 64 52', `<path d="M32 12 q2 -8 8 -10" stroke="#6b8f4a" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="32" rx="14" ry="17" fill="#f6a85c"/><ellipse cx="44" cy="32" rx="14" ry="17" fill="#f6a85c"/><ellipse cx="32" cy="32" rx="13" ry="18" fill="#f9b971"/><path d="M32 15 v34" stroke="#ec9a4c" stroke-width="2"/><path d="M40 10 q12 -2 14 8 q-10 0 -14 -8z" fill="#7cc36a"/>`),
  basket: svgw('0 0 76 60', `<path d="M12 26 C12 6 64 6 64 26" stroke="#b5804f" stroke-width="4" fill="none"/>${[[22, 22], [36, 18], [50, 22], [29, 26], [44, 27]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#f26d6d"/><circle cx="${x - 3}" cy="${y - 3}" r="2.2" fill="#fff" opacity=".5"/>`).join('')}<path d="M6 28 H70 L62 56 H14 Z" fill="#d7a06c" stroke="#b5804f" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 38 H64 M16 48 H60" stroke="#b5804f" stroke-width="2"/><path d="M24 28 L26 56 M38 28 V56 M52 28 L50 56" stroke="#c48e5c" stroke-width="2"/>`),
  lighthouse: svgw('0 0 70 170', `<g class="beam"><path d="M35 26 L-30 6 L-30 46 Z M35 26 L100 6 L100 46 Z" fill="#fff6c4" opacity=".55"/></g><path d="M22 44 L48 44 L54 156 L16 156 Z" fill="#fff"/><path d="M20 70 L50 70 L51 86 L19 86 Z M18 108 L52 108 L53 124 L17 124 Z" fill="#f7a8c4"/><rect x="18" y="38" width="34" height="8" rx="3" fill="#8a7bb0"/><rect x="24" y="18" width="22" height="20" rx="3" fill="#ffe08a"/><path d="M20 18 L35 4 L50 18 Z" fill="#e58f73"/><path d="M30 156 v-18 a5 5 0 0 1 10 0 v18z" fill="#b5804f"/><ellipse cx="35" cy="160" rx="34" ry="10" fill="#c9c2d6"/>`),
  sailboat: svgw('0 0 100 90', `<g class="bobble"><path d="M48 8 V64" stroke="#8a5a36" stroke-width="3.5"/><path d="M52 12 L52 60 L88 60 Z" fill="#fff"/><path d="M45 18 L45 60 L18 60 Z" fill="#fde3ec"/><path d="M48 8 l14 4 l-14 4z" fill="#f7a8c4"/><path d="M10 64 H90 L78 82 H22 Z" fill="#fff"/><path d="M14 70 H86" stroke="#9ad0ec" stroke-width="5"/></g>`),
  umbrella: svgw('0 0 90 100', `<rect x="10" y="80" width="60" height="16" rx="5" fill="#b5dcff"/><path d="M16 88 h48" stroke="#fff" stroke-width="4" stroke-dasharray="8 6"/><path d="M48 30 L40 92" stroke="#c9a37a" stroke-width="3.5"/><path d="M6 36 C14 6 78 2 88 30 Q78 26 68 34 Q58 26 47 34 Q36 26 26 36 Q16 30 6 36 Z" fill="#f7a8c4"/><path d="M26 36 C30 16 40 8 48 4 C44 14 46 26 47 34 Q36 26 26 36Z M68 34 C66 18 58 8 48 4 C60 8 76 14 88 30 Q78 26 68 34Z" fill="#fff"/>`),
  sandcastle: svgw('0 0 100 80', `<rect x="14" y="36" width="72" height="40" rx="4" fill="#f2d39b"/><rect x="8" y="22" width="22" height="54" rx="3" fill="#f6dcaa"/><rect x="70" y="22" width="22" height="54" rx="3" fill="#f6dcaa"/><path d="M8 22 h5 v-6 h6 v6 h5 v-6 h6 v6" fill="#f6dcaa"/><path d="M70 22 h5 v-6 h6 v6 h5 v-6 h6 v6" fill="#f6dcaa"/><path d="M42 76 v-16 a8 8 0 0 1 16 0 v16z" fill="#e2bf82"/><path d="M80 16 V2 l12 4 l-12 4" stroke="#8a5a36" stroke-width="2" fill="#f7a8c4"/><circle cx="26" cy="54" r="2.4" fill="#e2bf82"/><circle cx="74" cy="56" r="2.4" fill="#e2bf82"/>`),
  hut: svgw('0 0 160 130', `<rect x="22" y="56" width="116" height="70" fill="#d29a64"/><path d="${range(0, 6).map((i) => `M22 ${64 + i * 11} H138`).join(' ')}" stroke="#bd8452" stroke-width="2"/><path d="M4 62 L80 14 L156 62 L144 66 L80 28 L16 66 Z" fill="#a86b45"/><path d="M16 66 L80 28 L144 66" fill="#c88a5a"/><rect x="66" y="84" width="28" height="42" rx="3" fill="#8a5a36"/><circle cx="88" cy="106" r="2" fill="#f2c14e"/>${[34, 106].map((x) => `<rect x="${x}" y="76" width="22" height="20" rx="2" fill="#fff3d6" stroke="#8a5a36" stroke-width="3"/><path d="M${x + 11} 76 v20 M${x} 86 h22" stroke="#8a5a36" stroke-width="2"/><rect x="${x - 3}" y="96" width="28" height="7" rx="2" fill="#8a5a36"/>${[0, 7, 14, 21].map((d) => `<circle cx="${x + 1 + d}" cy="${95}" r="3.6" fill="${d % 14 ? '#f7a8c4' : '#f26d6d'}"/>`).join('')}`).join('')}<rect x="112" y="18" width="12" height="28" fill="#b9a99a"/><g class="smoke"><circle cx="118" cy="12" r="5" fill="#fff" opacity=".8"/><circle cx="124" cy="4" r="6" fill="#fff" opacity=".6"/></g>`),
  marmot: svgw('0 0 54 72', `<ellipse cx="27" cy="50" rx="17" ry="20" fill="#b98352"/><ellipse cx="27" cy="54" rx="10" ry="13" fill="#e6c49c"/><circle cx="27" cy="24" r="14" fill="#b98352"/><circle cx="16" cy="13" r="4" fill="#a06f43"/><circle cx="38" cy="13" r="4" fill="#a06f43"/><ellipse cx="27" cy="29" rx="7" ry="5" fill="#e6c49c"/><circle cx="21" cy="21" r="2.2" fill="#3a2a20"/><circle cx="33" cy="21" r="2.2" fill="#3a2a20"/><ellipse cx="27" cy="26" rx="2.4" ry="1.6" fill="#5a4033"/><rect x="25" y="29" width="4" height="4" rx="1" fill="#fff"/><ellipse cx="19" cy="40" rx="4" ry="6" fill="#a06f43" transform="rotate(20 19 40)"/><ellipse cx="35" cy="40" rx="4" ry="6" fill="#a06f43" transform="rotate(-20 35 40)"/><circle cx="17" cy="27" r="2.6" fill="#f7a0b5" opacity=".5"/><circle cx="37" cy="27" r="2.6" fill="#f7a0b5" opacity=".5"/>`),
  waterfall: svgw('0 0 120 170', `<path d="M8 40 C8 10 112 10 112 40 L104 140 L16 140 Z" fill="#c9c2dc"/><path d="M20 30 C30 12 90 12 100 30" stroke="#dcd6ea" stroke-width="10" fill="none"/><rect x="40" y="24" width="40" height="124" rx="10" fill="#9ad8f5"/><g class="fall"><path d="M48 24 V150 M60 24 V150 M72 24 V150" stroke="#fff" stroke-width="4" stroke-dasharray="14 18" opacity=".85"/></g><ellipse cx="60" cy="150" rx="52" ry="16" fill="#9ad8f5"/><ellipse cx="60" cy="146" rx="30" ry="8" fill="#fff" opacity=".7"/><circle cx="34" cy="140" r="5" fill="#fff" opacity=".8"/><circle cx="88" cy="142" r="6" fill="#fff" opacity=".8"/>`),
  castle: (open) => svgw('0 0 320 300', `
    ${[[46, 70], [274, 70]].map(([x, y]) => `<g class="flag"><path d="M${x} ${y - 52} V${y - 20}" stroke="#a88bd0" stroke-width="3"/><path d="M${x} ${y - 52} l22 7 l-22 7z" fill="#f7a8c4"/></g>`).join('')}
    <g class="flag"><path d="M160 6 V40" stroke="#a88bd0" stroke-width="3"/><path d="M160 6 l26 8 l-26 8z" fill="#ffd27a"/></g>
    <rect x="80" y="110" width="160" height="180" fill="#fdf0f6"/><path d="M80 110 h16 v-12 h16 v12 h16 v-12 h16 v12 h16 v-12 h16 v12 h16 v-12 h16 v12 h16 v-12 h16 v12" fill="#fdf0f6"/>
    <rect x="120" y="60" width="80" height="70" fill="#fbe3ef"/><path d="M112 64 L160 22 L208 64 Z" fill="#c9a3e8"/>
    <rect x="22" y="70" width="48" height="220" rx="4" fill="#fbe3ef"/><rect x="250" y="70" width="48" height="220" rx="4" fill="#fbe3ef"/>
    <path d="M14 74 L46 20 L78 74 Z" fill="#f7a8c4"/><path d="M242 74 L274 20 L306 74 Z" fill="#f7a8c4"/>
    ${[[38, 110], [266, 110], [38, 180], [266, 180], [146, 80]].map(([x, y]) => `<path d="M${x} ${y + 30} v-18 a8 8 0 0 1 16 0 v18z" fill="#c9b6ec"/><path d="M${x + 8} ${y + 4} v26" stroke="#fdf0f6" stroke-width="2"/>`).join('')}
    ${[[110, 150], [200, 150]].map(([x, y]) => `<path d="M${x} ${y} c-6 -10 -20 -4 -12 6 l12 12 l12 -12 c8 -10 -6 -16 -12 -6z" fill="#f7a8c4"/>`).join('')}
    <path d="M124 290 V220 a36 36 0 0 1 72 0 V290 Z" fill="${open ? '#fff3c4' : '#c98b57'}"/>
    ${open ? '<path d="M124 290 V220 a36 36 0 0 1 12 -26 V290 Z M196 290 V220 a36 36 0 0 0 -12 -26 V290 Z" fill="#b5804f"/><circle cx="160" cy="250" r="26" fill="#fff" opacity=".6"/>' : '<path d="M160 186 V290" stroke="#a87146" stroke-width="3"/><circle cx="150" cy="250" r="3" fill="#f2c14e"/><circle cx="170" cy="250" r="3" fill="#f2c14e"/>'}
    <path d="M124 220 a36 36 0 0 1 72 0" stroke="#e5b84a" stroke-width="5" fill="none"/>
    ${[[30, 40], [300, 36], [170, 96], [96, 60], [230, 90]].map(([x, y], i) => `<path class="twinkle" style="animation-delay:${-i * 0.7}s" d="M${x} ${y - 7} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" fill="#ffe08a"/>`).join('')}`),
  rosebush: svgw('0 0 80 54', `<circle cx="20" cy="34" r="16" fill="#7cc36a"/><circle cx="40" cy="26" r="20" fill="#8fd27a"/><circle cx="60" cy="34" r="16" fill="#73b862"/><rect x="6" y="38" width="68" height="16" rx="8" fill="#7cc36a"/>${[[20, 28], [38, 16], [56, 26], [44, 36], [28, 40], [64, 40]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="6" fill="${i % 2 ? '#fff' : '#f7a8c4'}"/><circle cx="${x}" cy="${y}" r="2.4" fill="#ec8fae" opacity=".7"/>`).join('')}`),
  balloon: svgw('0 0 70 110', `<g class="floaty"><path d="M35 4 C10 4 4 30 14 48 L28 70 L42 70 L56 48 C66 30 60 4 35 4 Z" fill="#f7a8c4"/><path d="M35 4 C18 10 14 36 22 56 L28 70 L34 70 C28 46 28 18 35 4Z M35 4 C52 10 56 36 48 56 L42 70 L36 70 C42 46 42 18 35 4Z" fill="#fff"/><path d="M35 4 C30 16 30 44 33 70 L37 70 C40 44 40 16 35 4Z" fill="#b5dcff"/><path d="M14 48 C22 46 48 46 56 48" stroke="#fff" stroke-width="3" fill="none"/><path d="M28 70 L28 84 M42 70 L42 84" stroke="#a88bd0" stroke-width="1.6"/><rect x="24" y="84" width="22" height="16" rx="3" fill="#c98b57"/></g>`),
  fountain: svgw('0 0 100 90', `<ellipse cx="50" cy="76" rx="46" ry="12" fill="#e6dcf5"/><ellipse cx="50" cy="72" rx="40" ry="9" fill="#9ad8f5"/><rect x="44" y="34" width="12" height="38" rx="5" fill="#efe7fa"/><ellipse cx="50" cy="36" rx="20" ry="6" fill="#efe7fa"/><g class="spray"><path d="M50 30 C46 14 36 12 30 26 M50 30 C54 14 64 12 70 26 M50 30 V8" stroke="#9ad8f5" stroke-width="4" fill="none" stroke-linecap="round"/></g><circle cx="50" cy="6" r="3" fill="#fff"/><path d="M78 30 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5z" fill="#ffe08a" class="twinkle"/>`),
  bridge: (repaired) => svgw('0 0 220 110', `<path d="M10 70 Q110 30 210 70" stroke="#a87146" stroke-width="7" fill="none"/><path d="M10 40 Q110 4 210 40" stroke="#c99d6e" stroke-width="5" fill="none"/>
    ${range(0, 9).map((i) => { const x = 18 + i * 20; const y = 70 - Math.sin((i + 0.5) / 10 * Math.PI) * 30; const missing = !repaired && [3, 5, 6].includes(i); return missing ? `<rect x="${x}" y="${(y - 4).toFixed(1)}" width="16" height="8" rx="2" fill="none" stroke="#d9c3a3" stroke-dasharray="3 3"/>` : `<rect x="${x}" y="${(y - 5).toFixed(1)}" width="16" height="10" rx="2" fill="#d29a64" stroke="#a87146"/>`; }).join('')}
    ${range(0, 4).map((i) => { const x = 14 + i * 64; const y = 70 - Math.sin((x - 10) / 200 * Math.PI) * 30; return `<rect x="${x}" y="${(y - 36).toFixed(1)}" width="7" height="40" rx="3" fill="#a87146"/>`; }).join('')}`)
};

// ---------- Die fünf Welten ----------
// Jede Station: Spiel (aus den 6 Spielarten), Schwierigkeit relativ zum eigenen Niveau (diff),
// sanfte Lehrplan-Untergrenze (min; nie mehr als eine Stufe über dem eigenen Niveau), Schatz (item).
const WORLDS = [
  { id: 'wiese', name: 'Blumenwiese', sky: ['#bfe4ff', '#eef9ff'], c: '#f39abb', soft: '#fde8f0', entry: 64, exit: 62,
    pos: [[11, 72], [26, 50], [41, 73], [57, 52], [72, 73], [87, 57]],
    need: { item: 'blume', n: 4, pl: 'Blumen' },
    stations: [
      { name: 'Bei der Biene Summsi', game: 'paare', diff: -1, item: 'blume', story: 'Die Biene Summsi sucht verliebte Zahlen. Zwei Zahlen, die zusammen 10 sind, gehören zusammen!' },
      { name: 'Das Blumenhaus', game: 'haeuser', diff: 0, item: 'blume', story: 'Im Blumenhaus fehlen Zahlen in den Stockwerken. Hilfst du beim Einräumen?' },
      { name: 'Der Hüpfstein-Weg', game: 'strahl', diff: 0, item: 'kartenteil', story: 'Über die Hüpfsteine hüpfen wir am Zahlenstrahl entlang. Hopp, hopp!' },
      { name: 'Die Pilz-Familie', game: 'familie', diff: -1, item: 'blume', story: 'Die Pilze sind eine Aufgaben-Familie: Plus und Minus gehören zusammen.' },
      { name: 'Pusteblumen-Hügel', game: 'rechnen', diff: 0, item: 'blume', story: 'Wir pusten Pusteblumen und rechnen dabei Plus und Minus.' },
      { name: 'Das Rosentor', game: 'rechnen', diff: 1, gate: true, item: 'schluessel', story: 'Die Blumenfee wohnt am Rosentor. Sie hat eine besondere Aufgabe für dich – ein kleines bisschen kniffliger. Ich helfe dir!' }
    ],
    doneText: 'Die Blumenfee flicht aus deinen Blumen einen Kranz und schenkt dir den goldenen Schlüssel. Das Rosentor geht auf!',
    next: 'Auf zum Apfelgarten!' },
  { id: 'apfel', name: 'Apfelgarten', sky: ['#c6e6ff', '#fff4df'], c: '#f2a35e', soft: '#fff0de', entry: 62, exit: 66,
    pos: [[12, 56], [27, 75], [43, 55], [58, 75], [73, 56], [88, 70]],
    need: { item: 'apfel', n: 3, pl: 'Äpfel' },
    stations: [
      { name: 'Am großen Apfelbaum', game: 'haeuser', diff: 0, min: 2, item: 'apfel', story: 'Unter dem Apfelbaum stehen Zahlenhäuser. Für jedes fertige Haus fällt ein Apfel herunter!' },
      { name: 'Im Hühnerstall', game: 'rechnen', diff: 0, min: 2, item: 'ei', story: 'Die Hühner gackern fröhlich. Wir rechnen, und sie schenken dir ein Frühstücksei.' },
      { name: 'Das Kürbisbeet', game: 'paare', diff: 0, item: 'apfel', story: 'Zwischen den Kürbissen verstecken sich verliebte Zahlen.' },
      { name: 'Die rote Scheune', game: 'strahl', diff: 0, min: 2, item: 'kartenteil', story: 'Auf dem Scheunenboden ist ein langer Zahlenstrahl gemalt. Wohin hüpfe ich?' },
      { name: 'Der Obstkorb', game: 'familie', diff: 0, min: 2, item: 'apfel', story: 'Im Obstkorb liegen Tausch-Aufgaben. 3 + 4 ist dasselbe wie 4 + 3!' },
      { name: 'Ziege Zenzi am Gatter', game: 'rechnen', diff: 1, min: 3, gate: true, item: 'glocke', gift: 'ziege', story: 'Ziege Zenzi steht mitten auf dem Weg. Sie liebt Äpfel! Löse ihre besonderen Rätsel, dann bekommt sie deine Äpfel und macht Platz.' }
    ],
    doneText: 'Zenzi mampft glücklich deine Äpfel und schenkt dir ihr Glöckchen. Sie möchte mit auf deinen Pferdehof ziehen!',
    next: 'Auf zum Sonnenstrand!' },
  { id: 'strand', name: 'Sonnenstrand am See', sky: ['#a9ddff', '#fff1d8'], c: '#5fb9e0', soft: '#e3f5fd', entry: 66, exit: 64,
    pos: [[11, 74], [26, 58], [41, 76], [56, 60], [71, 77], [88, 63]],
    need: { item: 'brett', n: 3, pl: 'Bretter' },
    stations: [
      { name: 'Muschelsuche', game: 'paare', diff: 0, min: 2, item: 'muschel', story: 'Im Sand liegen Muscheln mit Zahlen. Finde die verliebten Paare!' },
      { name: 'Der alte Bootssteg', game: 'rechnen', diff: 0, min: 4, item: 'brett', story: 'Am Bootssteg liegen lose Bretter. Wir rechnen über die 10 – erst bis zur 10, dann weiter!' },
      { name: 'Die Sandburg', game: 'haeuser', diff: 0, min: 3, item: 'brett', story: 'Die Sandburg hat Zahlenhaus-Türme. Welche Zahlen fehlen?' },
      { name: 'Der Leuchtturm', game: 'strahl', diff: 0, min: 3, item: 'kartenteil', story: 'Vom Leuchtturm sieht man weit! Wir hüpfen über die 10 auf dem Zahlenstrahl.' },
      { name: 'Die Entenfamilie', game: 'familie', diff: 0, min: 2, item: 'brett', story: 'Mama Ente und ihre Küken sind eine Aufgaben-Familie. Quak!' },
      { name: 'Die Brücke reparieren', game: 'rechnen', diff: 1, min: 4, gate: true, item: 'perle', story: 'Die kleine Brücke hat Lücken. Mit deinen Brettern und einer besonderen Aufgabe reparieren wir sie zusammen!' }
    ],
    doneText: 'Klopf, klopf – die Brücke ist wieder ganz! Im Wasser glitzert etwas: eine Glitzer-Perle für dich.',
    next: 'Auf zur Bergwiese!' },
  { id: 'berg', name: 'Bergwiese am Bach', sky: ['#bcdcff', '#f2f8ff'], c: '#8f9be0', soft: '#eceefd', entry: 64, exit: 66,
    pos: [[12, 60], [27, 78], [42, 60], [57, 78], [72, 62], [87, 76]],
    need: { item: 'kristall', n: 3, pl: 'Kristalle' },
    stations: [
      { name: 'Am Bergbach', game: 'strahl', diff: 0, min: 4, item: 'kristall', story: 'Der Bach plätschert. Auf den Steinen hüpfen wir am Zahlenstrahl über die 10.' },
      { name: 'Beim Murmeltier', game: 'haeuser', diff: 0, min: 4, item: 'laterne', story: 'Das Murmeltier Mo baut Zahlenhäuser bis 20. Es schenkt dir eine bunte Laterne für das Bergfest.' },
      { name: 'Der Wasserfall', game: 'rechnen', diff: 0, min: 5, item: 'kristall', story: 'Am Wasserfall rechnen wir Minus über die 10: erst bis zur 10, dann weiter.' },
      { name: 'Die Almhütte', game: 'familie', diff: 0, min: 3, item: 'kartenteil', story: 'In der Almhütte wohnen Umkehr-Aufgaben. Plus und Minus sind Freunde!' },
      { name: 'Die Bergblumen', game: 'paare', diff: 0, min: 3, item: 'kristall', story: 'Zwischen den Bergblumen glitzern verliebte Zahlen.' },
      { name: 'Die Regenbogen-Brücke', game: 'rechnen', diff: 1, min: 5, gate: true, item: 'edelweiss', story: 'Mit deinen Kristallen kann die Regenbogen-Brücke leuchten. Löse die besondere Aufgabe – ein kleines bisschen kniffliger!' }
    ],
    doneText: 'Die Kristalle funkeln, und der Regenbogen wird zur Brücke! Oben wächst ein Edelweiß – das ist für dich.',
    next: 'Auf zum Märchenschloss!' },
  { id: 'schloss', name: 'Märchenschloss', sky: ['#e6d6ff', '#fff0f6'], c: '#c49be8', soft: '#f5ecfd', entry: 66, exit: 60,
    pos: [[11, 74], [26, 56], [41, 76], [56, 58], [70, 77], [86, 66]],
    need: { item: 'stern', n: 3, pl: 'Zaubersterne' },
    stations: [
      { name: 'Der Rosengarten', game: 'familie', diff: 0, min: 3, item: 'stern', story: 'Im Rosengarten der Prinzessin blühen Aufgaben-Familien.' },
      { name: 'Der Zauberbrunnen', game: 'zehner', diff: 0, item: 'stern', story: 'Im Zauberbrunnen rechnen wir mit großen Zahlen – mit ganzen Zehnern bis 100! Ein Perlenstab hat 10 Perlen.' },
      { name: 'Die Turmtreppe', game: 'haeuser', diff: 0, min: 5, item: 'kartenteil', story: 'Die Turmtreppe hat viele Stufen. Jede Stufe ist ein Zahlenhaus.' },
      { name: 'Der Ballsaal', game: 'zehner', diff: 0, min: 2, item: 'stern', story: 'Im Ballsaal tanzen die Zehner: plus und minus bis 100!' },
      { name: 'Der Schlossstall', game: 'strahl', diff: 0, min: 4, item: 'goldzaum', gift: 'goldzaum', story: 'Im Schlossstall wartet ein Geschenk für mich: ein goldenes Zaumzeug! Hüpfst du mit mir?' },
      { name: 'Das Schlosstor', game: 'rechnen', diff: 1, min: 5, gate: true, item: 'krone', gift: 'krone', story: 'Die Prinzessin öffnet das Schlosstor für alle, die ihre besondere Aufgabe lösen. Wir schaffen das zusammen!' }
    ],
    doneText: 'Das Schlosstor öffnet sich, und alle feiern ein großes Schlossfest! Die Prinzessin schenkt mir eine Krone.',
    next: '' }
];
const skey = (w, i) => w + '-' + i;
function advState() { if (!S.adv || typeof S.adv !== 'object') S.adv = { done: {}, last: null }; if (!S.adv.done) S.adv.done = {}; return S.adv; }
function advDone(w, i) { return !!advState().done[skey(w, i)]; }
function advCurrent() { for (let w = 0; w < WORLDS.length; w++) for (let i = 0; i < WORLDS[w].stations.length; i++) if (!advDone(w, i)) return { w, i }; return null; }
function worldOpen(w) { return w === 0 || advDone(w - 1, WORLDS[w - 1].stations.length - 1); }
function worldStars(w) { return WORLDS[w].stations.filter((_, i) => advDone(w, i)).length; }
function inventory() {
  const inv = {};
  WORLDS.forEach((W, w) => W.stations.forEach((st, i) => { if (advDone(w, i)) inv[st.item] = (inv[st.item] || 0) + 1; }));
  return inv;
}
function stationLevel(st) {
  const g = GAMES.find((x) => x.id === st.game), sk = S.skills[st.game];
  let L = sk.level + (st.diff || 0);
  L = Math.max(L, Math.min(st.min || 1, sk.level + 1));
  return Math.max(1, Math.min(g.maxLevel, L));
}
function advSetWorld(w) { // Elternbereich: ab Welt w neu beginnen (alles davor gilt als geschafft)
  const d = {};
  WORLDS.forEach((W, k) => W.stations.forEach((st, i) => { if (k < w) { d[skey(k, i)] = true; if (st.gift && !has(st.gift)) { S.owned.push(st.gift); giveGear(st.gift, 'luna'); } } }));
  S.adv = { done: d, last: null }; save();
}

// ---------- Landschaften (geschichtet; Hintergründe dehnen sich, Figuren behalten ihre Form) ----------
const wl = (inner, cls) => `<svg class="wl ${cls || ''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`;
function worldLayers(k) {
  switch (k) {
    case 0: return wl(`<path d="M0 40 Q14 30 30 38 T62 34 T100 38 V100 H0Z" fill="#d3efbd"/><path d="M0 46 Q24 38 50 46 T100 44 V100 H0Z" fill="#bfe6a4"/>`, 'far')
      + wl(`<path d="M0 54 Q30 46 60 53 T100 52 V100 H0Z" fill="#acdc8f"/><path d="M0 70 Q40 64 100 72 V100 H0Z" fill="#a2d685" opacity=".7"/>`);
    case 1: return wl(`<path d="M0 38 Q20 28 44 36 T100 32 V100 H0Z" fill="#dcefb8"/>${range(0, 9).map((i) => `<path d="M${i * 12} 41 q6 -4 12 0" stroke="#c6e39d" stroke-width="1.4" fill="none"/>`).join('')}<path d="M0 46 Q30 38 64 46 T100 44 V100 H0Z" fill="#c4e5a0"/>`, 'far')
      + wl(`<path d="M0 54 Q34 48 70 54 T100 53 V100 H0Z" fill="#a8d888"/><path d="M0 74 Q50 68 100 76 V100 H0Z" fill="#9dd17e" opacity=".7"/>`);
    case 2: return wl(`<path d="M0 26 Q16 20 34 25 T70 22 T100 25 V40 H0Z" fill="#c6e8c8"/><rect x="0" y="30" width="100" height="22" fill="#94d4f2"/><rect x="0" y="30" width="100" height="5" fill="#b5e3f7"/><path d="M0 50 Q25 47 50 50 T100 50 V54 H0Z" fill="#a7ddf5"/>`, 'far')
      + `<div class="waves">${wl(range(0, 12).map((i) => `<path d="M${i * 10} 38 q2.5 -1.2 5 0 t5 0" stroke="#fff" stroke-width=".5" fill="none" opacity=".8"/><path d="M${i * 10 + 4} 45 q2.5 -1.2 5 0 t5 0" stroke="#fff" stroke-width=".5" fill="none" opacity=".6"/>`).join(''))}</div>`
      + wl(`<path d="M0 54 Q25 50 50 54 T100 54 V100 H0Z" fill="#f6e1b5"/><path d="M0 54 Q25 50 50 54 T100 54" stroke="#fff4dc" stroke-width="1.6" fill="none"/><path d="M83 52 C86 64 92 72 89 100 L97 100 C99 74 93 62 91 52 Z" fill="#94d4f2"/><path d="M85 56 C87 66 91 74 91 100" stroke="#c7ecfb" stroke-width=".6" fill="none"/>`);
    case 3: return wl(`<path d="M0 44 L10 22 L18 30 L30 10 L42 30 L52 18 L64 34 L76 12 L88 28 L100 20 V60 H0Z" fill="#d3d6f4"/><path d="M26 15 L30 10 L34 15 L31 14 Z M72 17 L76 12 L80 17 L77 16Z M48 22 L52 18 L56 22 Z" fill="#fff"/><path d="M0 48 L14 32 L26 42 L40 26 L54 42 L68 30 L84 42 L100 34 V60 H0Z" fill="#c2c8ee"/>`, 'far')
      + wl(`<path d="M0 50 Q30 42 60 50 T100 48 V100 H0Z" fill="#c4e8aa"/><path d="M0 60 Q40 54 100 62 V100 H0Z" fill="#addf8f"/><path d="M34 52 C40 60 52 60 58 66 S80 74 84 82 S90 94 94 100 L100 100 C96 92 92 84 88 78 S66 64 60 60 S44 54 38 50 Z" fill="#9ad8f5"/><path d="M38 53 C46 58 54 60 60 64 S80 74 87 84" stroke="#d3f0fc" stroke-width=".6" fill="none"/>`);
    default: return wl(`<path d="M0 40 Q18 32 36 38 T72 34 T100 36 V100 H0Z" fill="#eadcf8"/><path d="M0 46 Q26 40 54 46 T100 44 V100 H0Z" fill="#dcefd0"/>`, 'far')
      + wl(`<path d="M0 54 Q32 48 64 54 T100 52 V100 H0Z" fill="#c9ebb6"/><path d="M0 72 Q50 66 100 74 V100 H0Z" fill="#bfe6aa" opacity=".7"/><path d="M74 66 Q86 62 100 66 V74 Q86 70 74 74 Z" fill="#e8dcc8" opacity=".6"/>`);
  }
}
// Deko je Welt: [Kunst, x%, y% (Fußpunkt), Breite vmin, Extra-Klasse]
function worldDecor(k, done) {
  const fl = (x, y, c) => [svgw('0 0 30 40', flowerSVG(15, 34, 22, c, 0)), x, y, 3.4];
  switch (k) {
    case 0: return [[ART.tree, 5, 50, 17], [ART.tree, 96, 47, 14], [MAPART.mushroom, 19, 88, 6], [MAPART.mushroom, 34, 44, 4.6], [MAPART.mushroom, 64, 90, 5],
      [ART.sunflowers, 47, 47, 7], [ART.flowerbed, 50, 97, 16], [pondSVG(), 82, 94, 18], [MAPART.bee, 30, 34, 4.5, 'fly'], [MAPART.bee, 66, 40, 4, 'fly f2'],
      [ART.butterfly('#f7a8c4'), 18, 40, 4, 'fly'], [ART.butterfly('#ffd27a'), 78, 46, 4, 'fly f2'],
      fl(8, 92, '#f7a8c4'), fl(31, 86, '#fff'), fl(36, 62, '#ffe08a'), fl(48, 66, '#d6c2f2'), fl(63, 64, '#f7a8c4'), fl(79, 62, '#fff'), fl(16, 60, '#d6c2f2'), fl(94, 70, '#ffe08a'), fl(72, 88, '#fff'), fl(55, 86, '#f7a8c4'),
      [MAPART.roseArch, 87, 62, 17, 'gate-art' + (done ? ' open' : '')]];
    case 1: return [[ART.tree, 6, 46, 15], [ART.tree, 20, 44, 13], [ART.tree, 36, 45, 14], [barnSVG(false, true), 60, 47, 20], [HAY, 76, 50, 7], [HAY, 81, 52, 6],
      [MAPART.pumpkin, 17, 92, 6], [MAPART.pumpkin, 22, 95, 5], [MAPART.pumpkin, 70, 92, 5.5], [MAPART.basket, 50, 92, 7], [ART.chickens, 37, 95, 12],
      [ART.butterfly('#d6c2f2'), 46, 36, 4, 'fly'], [ART.tree, 95, 46, 15], fl(10, 70, '#ffe08a'), fl(65, 66, '#fff'), fl(84, 92, '#f7a8c4'), fl(31, 66, '#fff'),
      [ART.fence, 88, 82, 13], [MAPART.goat, done ? 95 : 93, done ? 92 : 64, done ? 8 : 10, 'goat' + (done ? ' aside' : '')]];
    case 2: return [[MAPART.lighthouse, 70, 36, 6.5], [MAPART.sailboat, 36, 42, 9], [MAPART.sailboat, 58, 37, 6], [ART.duck('#fff6e0', '#f6a85c'), 18, 46, 4.6, 'duckm'], [ART.duck('#ffe08a', '#f6a85c'), 23, 47, 3.4, 'duckm d2'],
      [MAPART.umbrella, 19, 92, 9], [MAPART.sandcastle, 49, 95, 10], [MAPART.umbrella, 64, 94, 7.5],
      [TREASURE.muschel.svg, 33, 88, 3.4], [TREASURE.muschel.svg, 78, 90, 3], [TREASURE.muschel.svg, 6, 82, 3], [ART.bird, 30, 14, 4, 'gull'], [ART.bird, 52, 18, 3.4, 'gull g2'],
      [MAPART.bridge(done), 88, 74, 22, 'gate-art']];
    case 3: return [[MAPART.waterfall, 34, 55, 13], [MAPART.hut, 62, 49, 15], [ART.tree, 6, 54, 12], [ART.tree, 96, 52, 11], [MAPART.marmot, 21, 92, 4.6], [MAPART.marmot, 47, 92, 3.6],
      [TREASURE.edelweiss.svg, 14, 70, 3.4], [TREASURE.edelweiss.svg, 50, 70, 3], [TREASURE.edelweiss.svg, 66, 92, 3.4], fl(77, 92, '#d6c2f2'), fl(9, 88, '#f7a8c4'), fl(39, 92, '#ffe08a'),
      [ART.butterfly('#b5dcff'), 52, 40, 4, 'fly'], [ART.rainbow, 87, 82, 30, 'gate-art rainbowgate' + (done ? ' lit' : '')]];
    default: return [[MAPART.castle(done), 86, 69, 30, 'gate-art'], [MAPART.balloon, 34, 30, 6, 'balloon'], [MAPART.balloon, 62, 22, 4.4, 'balloon b2'], [MAPART.fountain, 41, 54, 9],
      [MAPART.rosebush, 8, 92, 9], [MAPART.rosebush, 30, 95, 8], [MAPART.rosebush, 56, 92, 8], [MAPART.rosebush, 71, 52, 6], [ART.tree, 5, 52, 13], [ART.tree, 20, 48, 9],
      [ART.butterfly('#f7a8c4'), 48, 36, 4, 'fly'], [ART.butterfly('#ffd27a'), 16, 44, 3.6, 'fly f2'], fl(48, 86, '#fff'), fl(64, 92, '#d6c2f2'), fl(18, 66, '#f7a8c4')];
  }
}

// ---------- Die Weltkarte ----------
function catmull(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function drawPath(panel, W, k) {
  const wpx = panel.clientWidth || window.innerWidth, hpx = panel.clientHeight || window.innerHeight;
  const P = (p) => [p[0] / 100 * wpx, p[1] / 100 * hpx];
  const pts = [[0, W.entry]].concat(W.pos, k < WORLDS.length - 1 ? [[100, W.exit]] : []).map(P);
  let doneN = 0; while (doneN < W.stations.length && advDone(k, doneN)) doneN++;
  const donePts = pts.slice(0, Math.min(pts.length, doneN + (doneN >= W.stations.length ? 3 : 2)));
  const d = catmull(pts);
  const svg = `<svg class="mappath" viewBox="0 0 ${wpx} ${hpx}" aria-hidden="true">
    <path d="${d}" stroke="#d9bf86" stroke-width="40" stroke-opacity=".35" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="#f8ebc8" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="#fff8e4" stroke-width="10" stroke-opacity=".75" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="#e3cb94" stroke-width="5" stroke-dasharray="1 22" fill="none" stroke-linecap="round"/>
    ${donePts.length > 1 ? `<path class="goldtrail" d="${catmull(donePts)}" stroke="#f2c14e" stroke-width="6" stroke-dasharray="1 22" fill="none" stroke-linecap="round"/>` : ''}
  </svg>`;
  const old = $('.mappath', panel); if (old) old.remove();
  $('.wdeco', panel).insertAdjacentHTML('beforebegin', svg);
}
function stationEl(W, k, i, cur) {
  const st = W.stations[i], done = advDone(k, i), isCur = cur && cur.w === k && cur.i === i;
  const [x, y] = W.pos[i];
  const cls = 'station' + (done ? ' done' : '') + (isCur ? ' current' : '') + (!done && !isCur ? ' future' : '') + (st.gate ? ' gate' : '');
  const b = h('button', { class: cls, 'data-w': k, 'data-i': i, 'aria-label': st.name, style: { left: x + '%', top: y + '%' } },
    h('span', { class: 'medal', html: TREASURE[st.item].svg }),
    done ? h('span', { class: 'sstar', html: ART_STAR }) : null,
    isCur ? h('span', { class: 'slabel' + (x < 18 ? ' lft' : x > 82 ? ' rgt' : '') }, st.name) : null);
  b.addEventListener('click', () => {
    if (done || isCur) { Sound.tap(); openStation(k, i); }
    else { Sound.plop(); mapSay(`Erst gehen wir zur Station mit dem leuchtenden Kreis. Hier kommen wir bald hin! 😊`); }
  });
  return b;
}
const ART_STAR = svgw('0 0 40 40', '<path d="M20 3 L25 14.5 L37.5 15.5 L28 24 L31 36.5 L20 30 L9 36.5 L12 24 L2.5 15.5 L15 14.5 Z" fill="#ffd966" stroke="#e5b84a" stroke-width="2.4" stroke-linejoin="round"/><circle cx="16" cy="16" r="2.6" fill="#fff" opacity=".7"/>');
function worldPanel(W, k, cur, o) {
  const open = worldOpen(k), gateDone = advDone(k, W.stations.length - 1);
  const p = h('section', { class: 'wpanel w' + k, 'data-world': k, style: { background: `linear-gradient(180deg, ${W.sky[0]} 0%, ${W.sky[1]} 46%)` } });
  p.insertAdjacentHTML('beforeend', `<div class="wsun"></div>`
    + [[8, 10, 13, 0], [46, 6, 10, -14], [74, 14, 15, -30]].map(([x, y, s, dl]) => `<div class="mcloud" style="left:${x}%;top:${y}%;width:${s}vmin;animation-delay:${dl}s">${ART.cloud}</div>`).join('')
    + worldLayers(k));
  const deco = h('div', { class: 'wdeco' });
  worldDecor(k, gateDone).forEach(([art, x, y, s, extra]) => deco.insertAdjacentHTML('beforeend',
    `<div class="deco ${extra || ''}" style="left:${x}%;top:${y}%;width:${s}vmin;z-index:${Math.round(y)}">${art}</div>`));
  p.append(deco);
  const sts = h('div', { class: 'wstations' });
  W.stations.forEach((_, i) => sts.append(stationEl(W, k, i, cur)));
  p.append(sts);
  p.append(h('div', { class: 'wname' }, h('b', null, `Welt ${k + 1}`), ' ', W.name, h('span', { class: 'wstars' }, ` ${worldStars(k)}/${W.stations.length} ⭐`)));
  if (!open || (o && o.arrive === k)) {
    const mist = h('div', { class: 'mist' + (o && o.arrive === k ? ' lifting' : ''), 'aria-hidden': 'true' });
    mist.insertAdjacentHTML('beforeend', [[6, 18, 34], [40, 8, 40], [70, 22, 36], [-4, 52, 40], [30, 46, 44], [64, 56, 42], [10, 78, 46], [52, 80, 48]].map(([x, y, s], i) =>
      `<div class="mpuff" style="left:${x}%;top:${y}%;width:${s}vmin;animation-delay:${-i * 1.7}s">${ART.cloud}</div>`).join('')
      + `<div class="mistcard">☁️ <b>${W.name}</b><br><span>Hinter den Wolken wartet die nächste Welt. ✨</span></div>`);
    p.append(mist);
  }
  return p;
}
let mapSayTimer = 0;
function mapSay(t) {
  const b = $('#mapSay'); if (!b) return;
  b.textContent = t; b.classList.add('show');
  clearTimeout(mapSayTimer); mapSayTimer = setTimeout(() => b.classList.remove('show'), readMs(t, 5200));
}
let mapResizeT = 0, mapFocus = 0;
window.addEventListener('resize', () => {
  clearTimeout(mapResizeT);
  mapResizeT = setTimeout(() => { if (currentScreen === 'map' && !$('.sheet')) showMap({ world: mapFocus, quiet: true }); }, 250);
});
function placeHorse(horse, W, x, y) { horse.style.left = x + '%'; horse.style.top = y + '%'; }
function showMap(o) {
  o = o || {};
  currentScreen = 'map'; stableBack = showMap;
  clearInterval(ambientTimer); app.innerHTML = '';
  const cur = advCurrent();
  const curW = cur ? cur.w : WORLDS.length - 1;
  let focus = o.world != null ? o.world : curW;
  if (!worldOpen(focus)) focus = curW;
  mapFocus = focus;
  const root = h('div', { class: 'map-screen' });
  const scroll = h('div', { class: 'map-scroll', id: 'mapScroll' });
  WORLDS.forEach((W, k) => scroll.append(worldPanel(W, k, cur, o)));
  const ui = h('div', { class: 'map-ui' },
    h('button', { class: 'farm-btn back', id: 'homeBtn', 'aria-label': 'Startseite', onclick: () => { Sound.tap(); showHome(); } }, '🏠'),
    h('div', { class: 'farm-hud' },
      h('div', { class: 'counter', html: SHOE + `<span>${S.shoes}</span>` }),
      h('div', { class: 'counter' }, h('span', { class: 'emo' }, '🥕'), h('span', null, String(S.carrots))),
      h('button', { class: 'farm-btn', id: 'bagBtn', 'aria-label': 'Rucksack', onclick: () => { Sound.tap(); openBag(); } }, '🎒'),
      h('button', { class: 'farm-btn', id: 'farmBtn', 'aria-label': 'Pferdehof', onclick: () => { Sound.tap(); showStable(); } }, '🏡'),
      h('button', { class: 'farm-btn', id: 'soundBtn', 'aria-label': 'Ton an oder aus', onclick: toggleSound }, S.sound ? '🔊' : '🔇')),
    h('button', { class: 'wnav prev', id: 'prevWorld', 'aria-label': 'Vorherige Welt', onclick: () => go(-1) }, '‹'),
    h('button', { class: 'wnav next', id: 'nextWorld', 'aria-label': 'Nächste Welt', onclick: () => go(1) }, '›'),
    h('div', { class: 'bubble farm-say', id: 'mapSay' }));
  root.append(scroll, ui);
  app.append(root);
  // Pfade (in Pixeln, damit Linien in jeder Ausrichtung gleich schön sind)
  $$('.wpanel', scroll).forEach((p, k) => drawPath(p, WORLDS[k], k));
  scroll.scrollLeft = focus * scroll.clientWidth;
  // Pferd
  const hw = cur ? cur.w : WORLDS.length - 1;
  const hp = cur ? WORLDS[hw].pos[cur.i] : WORLDS[hw].pos[WORLDS[hw].pos.length - 1];
  const horse = h('div', { class: 'map-horse', id: 'mapHorse', html: `<div class="bob">${lunaSVG()}</div>` });
  $$('.wpanel', scroll)[hw].append(horse);
  const from = o.moveFrom;
  if (from && cur && from.w === hw && from.i === cur.i - 1) {
    const fp = WORLDS[hw].pos[from.i];
    placeHorse(horse, WORLDS[hw], fp[0], fp[1]); horse.classList.add('walking');
    if (fp[0] > hp[0]) horse.classList.add('flip');
    setTimeout(() => { placeHorse(horse, WORLDS[hw], hp[0], hp[1]); Sound.clipclop(); }, 450);
    setTimeout(() => { horse.classList.remove('walking', 'flip'); mapSay(`Wir sind da: ${WORLDS[hw].stations[cur.i].name}! Tippe auf den leuchtenden Kreis.`); }, 1900);
  } else if (o.arrive === hw && cur && cur.i === 0) {
    placeHorse(horse, WORLDS[hw], 0, WORLDS[hw].entry); horse.classList.add('walking');
    setTimeout(() => { placeHorse(horse, WORLDS[hw], hp[0], hp[1]); Sound.clipclop(); }, 1300);
    setTimeout(() => { horse.classList.remove('walking'); mapSay(`Willkommen in der Welt „${WORLDS[hw].name}“! 🌈`); }, 2800);
    setTimeout(() => { const m = $('.mist.lifting'); if (m) m.remove(); }, 2600);
  } else {
    placeHorse(horse, WORLDS[hw], hp[0], hp[1]);
    if (!o.quiet) setTimeout(() => mapSay(cur ? (cur.i === 0 && cur.w === 0 && !advState().last ? `Hallo! Ich bin ${LN()}. Komm mit auf die große Reise! Tippe auf den leuchtenden Kreis.` : `Weiter geht's! Unsere nächste Station: ${WORLDS[cur.w].stations[cur.i].name}.`) : 'Wir haben das ganze Abenteuer geschafft! Du kannst jede Station noch einmal besuchen. 💖'), 500);
  }
  horse.addEventListener('click', () => { Sound.neigh(); horse.classList.remove('nuzzle'); void horse.offsetWidth; horse.classList.add('nuzzle'); });
  function nav() {
    const k = Math.round(scroll.scrollLeft / Math.max(1, scroll.clientWidth));
    mapFocus = k;
    $('#prevWorld').classList.toggle('hide', k <= 0);
    $('#nextWorld').classList.toggle('hide', k >= WORLDS.length - 1 || !worldOpen(k + 1) && k >= curW + 1);
  }
  function go(dir) { Sound.swish(); const k = Math.max(0, Math.min(WORLDS.length - 1, mapFocus + dir)); scroll.scrollTo({ left: k * scroll.clientWidth, behavior: 'smooth' }); mapFocus = k; setTimeout(nav, 600); }
  scroll.addEventListener('scroll', () => { clearTimeout(scroll._t); scroll._t = setTimeout(nav, 120); }, { passive: true });
  nav();
  ambientTimer = setInterval(() => { if (Math.random() < 0.35) Sound.chirp(); }, 9000);
}

// ---------- Stations-Karte ----------
function sheet(content, onClose) {
  const bg = h('div', { class: 'sheet', onclick: (e) => { if (e.target === bg) close(); } }, content);
  function close() { bg.classList.remove('show'); setTimeout(() => bg.remove(), 260); if (onClose) onClose(); }
  app.append(bg); requestAnimationFrame(() => bg.classList.add('show'));
  return close;
}
function openStation(w, i) {
  const W = WORLDS[w], st = W.stations[i], done = advDone(w, i), T = TREASURE[st.item];
  const inv = inventory();
  const card = h('div', { class: 'station-card' + (st.gate ? ' gatecard' : ''), style: { '--wc': W.c, '--ws': W.soft } },
    h('div', { class: 'sc-icon', html: T.svg }),
    h('div', { class: 'sc-world' }, `Welt ${w + 1} · ${W.name} · Station ${i + 1} von ${W.stations.length}`),
    h('h2', null, st.name),
    h('div', { class: 'sc-story' }, h('div', { class: 'luna mini', html: lunaSVG() }), h('p', null, st.story)),
    st.gate && W.need ? h('div', { class: 'sc-need' }, h('span', { html: TREASURE[W.need.item].svg }),
      `Gesammelt: ${Math.min(inv[W.need.item] || 0, W.need.n)} von ${W.need.n} ${W.need.pl}`, (inv[W.need.item] || 0) >= W.need.n ? ' ✓' : '') : null,
    st.gate ? h('div', { class: 'sc-gate' }, '🌟 Besondere Tor-Aufgabe: ein kleines bisschen kniffliger. Du kannst dir immer Hilfe holen!') : null,
    h('div', { class: 'sc-reward' }, done ? h('span', null, `⭐ Schon geschafft! Du kannst hier noch einmal üben und Hufeisen sammeln.`)
      : h('span', null, h('b', null, 'Belohnung: '), h('i', { html: T.svg }), ` ${T.name}`, h('span', { class: 'plus' }, ' + Hufeisen + 🥕'))),
    h('div', { class: 'btnrow' },
      h('button', { class: 'bigbtn primary', id: 'stationGo', onclick: () => { Sound.tap(); close(); playStation(w, i); } }, 'Los geht\'s! 🐴'),
      h('button', { class: 'bigbtn', id: 'stationClose', onclick: () => { Sound.tap(); close(); } }, 'Zurück zur Karte')));
  const close = sheet(card);
  Sound.sparkle();
}
function playStation(w, i) {
  const W = WORLDS[w], st = W.stations[i];
  startGame(st.game, { level: stationLevel(st), title: st.name, intro: st.story, gate: !!st.gate,
    back: () => showMap({ world: w }), onFinish: (r) => stationFinished(w, i, r) });
}
function stationFinished(w, i, r) {
  const W = WORLDS[w], st = W.stations[i];
  const was = advDone(w, i);
  advState().done[skey(w, i)] = true; S.adv.last = { w, i, at: Date.now() };
  let gift = null;
  if (st.gift && !has(st.gift)) { S.owned.push(st.gift); gift = st.gift; giveGear(st.gift, 'luna'); }
  save();
  if (st.gate && !was) showWorldDone(w, gift);
  else showStationReward(w, i, was, r, gift);
}
function confetti(n) {
  const cols = ['#f7a8c4', '#ffd966', '#b5dcff', '#b9e2a0', '#d6c2f2', '#ffb38a', '#fff'];
  return h('div', { class: 'confetti', 'aria-hidden': 'true' }, range(1, n).map((j) => h('i', { style: {
    left: Math.random() * 100 + '%', background: pick(cols), animationDelay: (-Math.random() * 7).toFixed(2) + 's',
    animationDuration: (6 + Math.random() * 4).toFixed(2) + 's', width: (8 + Math.random() * 8).toFixed(0) + 'px',
    height: (6 + Math.random() * 10).toFixed(0) + 'px', borderRadius: j % 3 ? '3px' : '50%' } })));
}
function lootRow(n) {
  return h('div', { class: 'loot' }, h('div', { html: SHOE + `<span>+${n} Hufeisen</span>` }),
    h('div', null, h('span', { style: { fontSize: '2.1rem' } }, '🥕'), h('span', null, '+1 Karotte')), extraLoot());
}
function giftNote(gift) {
  if (!gift) return null;
  const it = ITEMS.find((x) => x.id === gift);
  return h('div', { class: 'gift' }, '🎁 Neu auf deinem Pferdehof: ', h('b', null, it ? itemName(it) : gift));
}
function showStationReward(w, i, was, r, gift) {
  currentScreen = 'reward'; clearInterval(ambientTimer); app.innerHTML = '';
  const W = WORLDS[w], st = W.stations[i], T = TREASURE[st.item];
  const scr = h('div', { class: 'adv-screen', id: 'stationReward', style: { '--wc': W.c, '--ws': W.soft, background: `linear-gradient(180deg, ${W.sky[0]}, ${W.soft} 70%)` } },
    h('div', { class: 'celebrate-bg', html: worldLayers(w) }),
    h('div', { class: 'adv-card' },
      was ? h('div', { class: 'luna happy', html: lunaSVG() }) : h('div', { class: 'treasure-pop' }, h('div', { class: 'rays' }), h('div', { class: 'ticon', html: T.svg })),
      h('h2', null, was ? pick([withName('Toll geübt'), 'Super gemacht! 🌟', 'Wunderbar gerechnet!']) : `Du hast gefunden: ${T.name}!`),
      h('p', null, was ? `${LN()} freut sich, dass ihr noch einmal hier wart.` : `${T.name === 'Stück der Schatzkarte' ? 'Ein Stück der Schatzkarte!' : 'Es steckt jetzt in deinem Rucksack.'} 🎒`),
      giftNote(gift),
      lootRow(r.n),
      h('div', { class: 'btnrow' },
        h('button', { class: 'bigbtn primary', id: 'rewardNext', onclick: () => { Sound.tap(); showMap({ world: w, moveFrom: was ? null : { w, i } }); } }, 'Weiter auf der Karte 🗺️'),
        h('button', { class: 'bigbtn', id: 'toStable', onclick: () => { Sound.tap(); stableBack = showMap; showStable(); } }, '🏡 Zum Pferdehof'))));
  app.append(scr);
  if (was) Sound.reward(); else { Sound.treasure(); setTimeout(() => { const t = $('.ticon'); if (t) burst(t, ['✨', '⭐', '💖']); }, 350); }
}
function showWorldDone(w, gift) {
  currentScreen = 'worlddone'; clearInterval(ambientTimer); app.innerHTML = '';
  const W = WORLDS[w], st = W.stations[W.stations.length - 1], T = TREASURE[st.item], last = w === WORLDS.length - 1;
  const scr = h('div', { class: 'adv-screen celebrate', id: 'worldDone', style: { '--wc': W.c, '--ws': W.soft, background: `linear-gradient(180deg, ${W.sky[0]}, ${W.soft} 75%)` } },
    h('div', { class: 'celebrate-bg', html: worldLayers(w) }),
    confetti(46),
    h('div', { class: 'adv-card big' },
      h('div', { class: 'celebrate-row' },
        h('div', { class: 'luna happy', html: lunaSVG() }),
        h('div', { class: 'treasure-pop' }, h('div', { class: 'rays' }), h('div', { class: 'ticon', html: T.svg }))),
      h('div', { class: 'stars5' }, W.stations.map(() => h('span', { html: ART_STAR }))),
      h('h2', null, last ? withName('Hurra! Du hast das ganze Abenteuer geschafft', '! 👑') : withName(`Hurra! ${W.name} geschafft`, '! 🎉')),
      h('p', null, W.doneText),
      giftNote(gift),
      h('div', { class: 'btnrow' },
        last ? h('button', { class: 'bigbtn primary', id: 'worldNext', onclick: () => { Sound.tap(); showMap({ world: w }); } }, 'Zur Karte 🗺️')
          : h('button', { class: 'bigbtn primary', id: 'worldNext', onclick: () => { Sound.tap(); showTravel(w + 1); } }, `${W.next.replace('!', '')} ➜`),
        h('button', { class: 'bigbtn', id: 'toStable', onclick: () => { Sound.tap(); stableBack = showMap; showStable(); } }, '🏡 Zum Pferdehof'))));
  app.append(scr);
  Sound.fanfare();
  setTimeout(() => Sound.neigh(), 1500);
  setTimeout(() => { const t = $('.adv-card .ticon'); if (t) burst(t, ['⭐', '💖', '✨', '🌸']); }, 500);
}
function showTravel(k) {
  currentScreen = 'travel'; clearInterval(ambientTimer); app.innerHTML = '';
  const W = WORLDS[k];
  const scr = h('div', { class: 'travel', id: 'travel', style: { background: `linear-gradient(180deg, ${W.sky[0]}, ${W.sky[1]} 60%)` } });
  scr.insertAdjacentHTML('beforeend',
    `<div class="tlayer t1"><div class="tcopy">${worldLayers(k)}</div><div class="tcopy">${worldLayers(k)}</div></div>`
    + `<div class="tlayer t2">${range(0, 7).map((i) => `<div class="tdeco" style="left:${i * 15 + 3}%;width:${i % 2 ? 9 : 13}vmin">${i % 3 === 2 ? ART.flowerbed : ART.tree}</div>`).join('')}${range(0, 7).map((i) => `<div class="tdeco" style="left:${100 + i * 15 + 3}%;width:${i % 2 ? 9 : 13}vmin">${i % 3 === 2 ? ART.flowerbed : ART.tree}</div>`).join('')}</div>`
    + `<div class="troad"></div>`
    + `<div class="thorse"><div class="trot">${lunaSVG()}</div></div>`
    + `<div class="ttext">${W.name}<small>Welt ${k + 1}</small></div>`
    + [[10, 12, 14], [50, 8, 11], [78, 16, 15]].map(([x, y, s], i) => `<div class="mcloud" style="left:${x}%;top:${y}%;width:${s}vmin;animation-delay:${-i * 8}s">${ART.cloud}</div>`).join(''));
  app.append(scr);
  let gone = false;
  const done = () => { if (gone) return; gone = true; clearInterval(t); showMap({ world: k, arrive: k }); };
  const t = setInterval(() => Sound.clipclop(), 900); Sound.clipclop();
  scr.addEventListener('click', done);
  setTimeout(done, 3900);
}

// ---------- Rucksack ----------
function openBag() {
  const inv = inventory();
  const order = ['blume', 'apfel', 'ei', 'muschel', 'brett', 'kristall', 'laterne', 'stern', 'kartenteil', 'schluessel', 'glocke', 'perle', 'edelweiss', 'goldzaum', 'krone'];
  const maps = inv.kartenteil || 0;
  const card = h('div', { class: 'bag-card', id: 'bag' },
    h('h2', null, '🎒 Mein Rucksack'),
    h('div', { class: 'bag-grid' }, order.map((id) => {
      const n = inv[id] || 0;
      return h('div', { class: 'bag-item' + (n ? '' : ' empty') },
        h('div', { class: 'bi', html: TREASURE[id].svg }), n > 1 ? h('span', { class: 'cnt' }, '×' + n) : null,
        h('small', null, n ? TREASURE[id].name : '???'));
    })),
    h('div', { class: 'bag-map' }, h('b', null, 'Schatzkarte: '), `${maps} von ${WORLDS.length} Stücken`,
      h('div', { class: 'mapbar' }, range(1, WORLDS.length).map((j) => h('i', { class: j <= maps ? 'on' : '' })))),
    h('button', { class: 'bigbtn', id: 'bagClose', onclick: () => { Sound.tap(); close(); } }, 'Rucksack zumachen'));
  const close = sheet(card);
  Sound.swish();
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
    h('div', null, `Gesammelte Hufeisen insgesamt: ${S.totalShoes} · aktuell: ${S.shoes} · Karotten: ${S.carrots} · gefüttert: ${S.fed}× · Stall-Sachen: ${S.owned.length} · App-Version ${APP_VERSION}`),
    h('div', { class: 'note', style: { textAlign: 'left', marginTop: '6px' } }, '„Richtig beim 1. Versuch“ zählt Aufgaben ohne Hinweis. Fehler werden dem Kind nie als Fehler gezeigt, sondern nur als freundlicher Tipp.')));
  const ap = h('div', { class: 'panel', id: 'advPanel' }, h('h3', null, '🗺️ Abenteuer-Reise'));
  const curA = advCurrent();
  ap.append(h('div', null, curA ? `Aktuell: Welt ${curA.w + 1} (${WORLDS[curA.w].name}), Station ${curA.i + 1}: ${WORLDS[curA.w].stations[curA.i].name}` : 'Alle Welten sind geschafft.'));
  WORLDS.forEach((W, k) => {
    const n = worldStars(k);
    ap.append(h('div', { class: 'prow' },
      h('div', { class: 'pn' }, `Welt ${k + 1}: ${W.name}`, h('small', null, worldOpen(k) ? (n === W.stations.length ? 'geschafft' : 'offen') : 'noch hinter den Wolken')),
      h('div', { class: 'bar' }, h('i', { style: { width: Math.round(n / W.stations.length * 100) + '%' } })),
      h('span', { style: { minWidth: '54px' } }, `${n}/${W.stations.length} ⭐`),
      h('button', { class: 'smallbtn', 'data-jump': k, onclick: () => { advSetWorld(k); showParent(); } }, k === 0 ? 'Von vorn' : 'Hierhin springen')));
  });
  ap.append(h('div', { class: 'note', style: { textAlign: 'left', marginTop: '6px' } }, '„Hierhin springen“ setzt die Reise auf den Anfang dieser Welt: frühere Welten gelten als geschafft, diese und spätere Welten beginnen neu. Hufeisen, Stall und Lernstand bleiben erhalten. Die Tor-Aufgabe am Ende jeder Welt ist eine Stufe schwerer als das aktuelle Niveau.'));
  wrap.append(ap);
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
  const readRow = h('div', { class: 'prow', id: 'readRow' }, h('div', { class: 'pn' }, 'Lesezeit der Sprechblasen', h('small', null, 'Wie lange Hinweise stehen bleiben (längere Texte länger). Antippen schließt sie.')),
    ...[['normal', 'normal'], ['lang', 'lang (empfohlen)'], ['sehrlang', 'sehr lang']].map(([v, n]) => h('button', { class: 'smallbtn', 'data-read': v, style: (S.readTime || 'lang') === v ? { background: '#ffe08a' } : null, onclick: () => { S.readTime = v; save(); Sound.tap(); showParent(); } }, n)));
  const confirmBox = h('div', { style: { display: 'none', marginTop: '10px' } },
    h('p', null, 'Wirklich alles löschen? Hufeisen, Stall und Lernfortschritt gehen verloren (Name und Geburtstag bleiben).'),
    h('div', { class: 'btnrow', style: { justifyContent: 'flex-start' } },
      h('button', { class: 'smallbtn danger', id: 'resetYes', onclick: () => { const keep = { childName: S.childName, bday: S.bday, setupSeen: true }; S = Object.assign(defaultState(), keep); save(); showHome(); } }, 'Ja, alles zurücksetzen'),
      h('button', { class: 'smallbtn', onclick: () => { confirmBox.style.display = 'none'; } }, 'Abbrechen')));
  wrap.append(h('div', { class: 'panel' }, h('h3', null, 'Einstellungen'), vol, readRow,
    h('div', { class: 'prow' }, h('div', { class: 'pn' }, 'Pferdehof aufräumen', h('small', null, 'Stellt alle Pferde und Sachen wieder an ihren Startplatz. Gekauftes, Hufeisen und Fortschritt bleiben.')),
      h('button', { class: 'smallbtn', id: 'tidyFarm', onclick: (e) => { S.pos = {}; save(); Sound.sparkle(); e.target.textContent = 'Aufgeräumt ✓'; } }, '🧹 Pferdehof aufräumen')),
    h('div', { class: 'prow' }, h('div', { class: 'pn' }, 'Zurücksetzen', h('small', null, 'Setzt alles auf den Anfang.')),
      h('button', { class: 'smallbtn danger', id: 'resetBtn', onclick: () => { confirmBox.style.display = 'block'; } }, 'Alles zurücksetzen')), confirmBox,
    h('div', { class: 'note', style: { textAlign: 'left', marginTop: '8px' } }, 'Alle Daten bleiben nur auf diesem Gerät (localStorage). Keine Werbung, kein Tracking, keine Internetverbindung nötig.')));
  main.append(h('div', { class: 'screen' }, wrap));
}

// ---------- Start ----------
ensureGear();
repairFarm();
window.__pm = { get state() { return S; }, repairFarm, startGame, showStable, showHome, showParent, showMap, openStation, showWorldDone, showTravel, WORLDS, advSetWorld, stationLevel, save, version: APP_VERSION };
showHome();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__PM_SINGLE__) {
  // Neue Version installiert → neu laden, aber nie mitten in einer Aufgabe (sonst beim nächsten Besuch der Startseite)
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || window.__pmReloaded) return;
    if (currentScreen === 'home' || currentScreen === 'map') { window.__pmReloaded = true; location.reload(); } else window.__pmUpdate = true;
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
