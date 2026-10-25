/* Pferde-Mathe – Zahlenraum bis 100 (Modul): 7 neue Übungsspiele + Welt 6 „Zauberwald der Hundert“.
   Alles lokal, keine Netzwerkaufrufe. Wird von app.js über window.PM_MODS eingebunden. */
(window.PM_MODS = window.PM_MODS || []).push(function (core) {
'use strict';
const { h, $, $$, rand, pick, shuffle, range, sleep, MINUS, Sound, ROUND, softNo, lunaSVG } = core;
core.b100 = {};
const GAMES = core.GAMES, GAME_TYPES = core.GAME_TYPES, TYPE_LABELS = core.TYPE_LABELS;

// ---------- gemeinsame Bausteine ----------
const zn = (n) => Math.floor(n / 10), en = (n) => n % 10;
const zerl = (n) => `${zn(n)} Zehner und ${en(n)} Einer`;

/** Zehnerstangen + Einerwürfel */
function stangen(n, opts) {
  opts = opts || {};
  const z = zn(n), e = en(n);
  const wrap = h('div', { class: 'zevis' + (opts.small ? ' small' : '') });
  const rods = h('div', { class: 'zrods' });
  for (let i = 0; i < z; i++) {
    const r = h('div', { class: 'zstab' }, range(1, 10).map(() => h('i')));
    if (opts.labels) r.append(h('b', null, String((i + 1) * 10)));
    rods.append(r);
  }
  const cubes = h('div', { class: 'ecubes' });
  for (let i = 0; i < e; i++) {
    const c = h('i', { class: 'ecube' });
    if (opts.labels) c.textContent = String(i + 1);
    cubes.append(c);
  }
  if (z) wrap.append(rods);
  if (e || !z) wrap.append(cubes);
  return wrap;
}

/** Hunderterfeld */
function hunderterfeld(o) {
  o = o || {};
  const grid = h('div', { class: 'hf' + (o.small ? ' small' : '') + (o.labels === 'none' ? ' nolab' : '') });
  const cells = {};
  for (let n = 1; n <= 100; n++) {
    const r = Math.floor((n - 1) / 10);
    let txt = '';
    if (o.labels === 'all' || o.labels === undefined) txt = String(n);
    else if (o.labels === 'ends' && n % 10 === 0) txt = String(n);
    if (o.blank && o.blank.indexOf(n) >= 0) txt = '';
    const c = o.onTap ? h('button', { class: 'hf-cell r' + (r % 2), 'data-n': n, 'aria-label': 'Feld ' + n, type: 'button' }, txt) : h('div', { class: 'hf-cell r' + (r % 2), 'data-n': n }, txt);
    if (o.onTap) c.addEventListener('click', () => o.onTap(n, c));
    cells[n] = c; grid.append(c);
  }
  return {
    el: grid, cell: (n) => cells[n],
    mark(n, cls) { if (cells[n]) cells[n].classList.add(cls || 'on'); },
    clear(cls) { Object.values(cells).forEach((c) => c.classList.remove(...(cls ? [cls] : ['on', 'hint', 'step1', 'step2', 'row', 'glow', 'yes', 'soft-no']))); },
    row(n, cls) { const r = Math.floor((n - 1) / 10); for (let i = 1; i <= 10; i++) cells[r * 10 + i].classList.add(cls || 'row'); },
    text(n, t) { if (cells[n]) cells[n].textContent = t; }
  };
}

/** Zifferntastatur mit einem oder mehreren Feldern */
function keypad(o) {
  const fields = o.fields.map((f) => Object.assign({ len: 2, pre: '', post: '' }, f));
  const vals = fields.map(() => '');
  let active = 0, locked = false;
  const wrap = h('div', { class: 'kp' });
  const row = h('div', { class: 'kp-fields' });
  const fEls = fields.map((f, i) => {
    const box = h('button', { type: 'button', class: 'kp-box', 'data-f': i, 'aria-label': 'Feld ' + (i + 1) });
    box.addEventListener('click', () => { if (locked) return; vals[i] = ''; active = i; paint(); Sound.tap(); });
    row.append(f.pre ? h('span', { class: 'kp-pre' }, f.pre) : '', box, f.post ? h('span', { class: 'kp-post' }, f.post) : '');
    return box;
  });
  const pad = h('div', { class: 'kp-pad' });
  const digit = (d) => {
    if (locked) return;
    Sound.tap();
    const f = fields[active];
    if (vals[active].length >= f.len) vals[active] = '';
    vals[active] += String(d);
    if (vals[active].length >= f.len && active < fields.length - 1) active++;
    paint();
  };
  [7, 8, 9, 4, 5, 6, 1, 2, 3].forEach((d) => pad.append(h('button', { type: 'button', class: 'kp-key num', 'data-n': d, onclick: () => digit(d) }, String(d))));
  pad.append(
    h('button', { type: 'button', class: 'kp-key del', 'aria-label': 'Löschen', onclick: () => { if (locked) return; Sound.tap(); if (!vals[active] && active > 0) active--; vals[active] = vals[active].slice(0, -1); paint(); } }, '⌫'),
    h('button', { type: 'button', class: 'kp-key num', 'data-n': 0, onclick: () => digit(0) }, '0'),
    h('button', { type: 'button', class: 'kp-key ok', id: 'kpOk', 'aria-label': 'Fertig', onclick: () => {
      if (locked) return;
      if (vals.some((v) => v === '')) { Sound.softno(); const e = fEls[vals.findIndex((v) => v === '')]; e.classList.add('nudge'); setTimeout(() => e.classList.remove('nudge'), 700); active = vals.findIndex((v) => v === ''); paint(); return; }
      o.onSubmit(vals.map(Number), kp);
    } }, '✓'));
  function paint() {
    fEls.forEach((b, i) => { b.textContent = vals[i] === '' ? '?' : vals[i]; b.classList.toggle('empty', vals[i] === ''); b.classList.toggle('act', i === active && !locked); b.style.minWidth = (fields[i].len * 1.0 + 1) + 'em'; });
  }
  const kp = {
    el: wrap, pad,
    clear() { vals.fill(''); active = 0; paint(); },
    fill(arr) { arr.forEach((v, i) => { vals[i] = String(v); }); active = fields.length - 1; paint(); const ok = $('#kpOk', wrap); if (ok) ok.classList.add('glow'); },
    lock(v) { locked = v !== false; paint(); },
    shake() { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); setTimeout(() => row.classList.remove('shake'), 800); },
    done(ok) { fEls.forEach((b) => b.classList.toggle('good', ok)); $$('.glow', wrap).forEach((b) => b.classList.remove('glow')); },
    fieldEls: fEls
  };
  wrap.append(row, pad); paint();
  return kp;
}

/** Aufgabenschleife */
function loop(api, stage, tasks, render) {
  let idx = 0;
  const next = () => { stage.innerHTML = ''; stage.style.display = ''; if (idx >= tasks.length) { core.b100.cur = null; api.finish(); return; } const t = tasks[idx++]; core.b100.cur = t; core.b100.n = idx; render(t, next); };
  next();
}
function unique(gen, n) {
  const out = [], seen = new Set(); let g = 0;
  while (out.length < (n || ROUND) && g++ < 600) { const t = gen(out.length); if (!t) continue; if (seen.has(t.key)) continue; seen.add(t.key); out.push(t); }
  while (out.length < (n || ROUND)) { let t, g2 = 0; do { t = gen(out.length); } while (!t && g2++ < 1000); out.push(t); } // Notnagel (Duplikate), falls das Zahlenfeld klein ist
  return out;
}
const TS = (n) => `${zn(n)} Z + ${en(n)} E`;

/** Standard-Antwortfluss für Aufgaben mit Tastatur */
function answerFlow(api, t, kp, ctx) {
  // ctx: {check(vals)->bool, hints:[fn,fn], reveal:[...], expl: text, anchor: el, next}
  let errs = 0;
  return {
    get errs() { return errs; },
    submit(vals) {
      if (ctx.check(vals)) {
        kp.done(true); kp.lock(true); Sound.correct();
        api.done(t.type, errs === 0, ctx.anchor);
        api.say(api.praise() + ' ' + (ctx.expl || ''), 'happy');
        setTimeout(ctx.next, 2000);
        return;
      }
      errs++; kp.shake(); Sound.softno(); api.miss(t.type, t.label);
      kp.fieldEls.forEach((b) => softNo(b));
      if (errs === 1) ctx.hints[0]();
      else if (errs === 2) ctx.hints[1]();
      else { kp.fill(ctx.reveal); api.say('Schau, die Lösung steht schon da. Tippe auf den Haken ✓.', 'think'); return; }
      setTimeout(() => kp.clear(), 500);
    }
  };
}
const pulse = (el) => { if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); };

// =====================================================================
// 1) Hunderterfeld
// =====================================================================
const H100 = {
  id: 'h100', name: 'Hunderterfeld', icon: '💯', sub: 'Zahlen im Hunderterfeld finden', maxLevel: 4, b100: true,
  levels: ['Zahlen finden bis 50', 'Zahlen finden bis 100', 'Welche Zahl ist markiert?', 'Welche Zahl fehlt?'],
  intro: 'Das Hunderterfeld hat 10 Reihen mit je 10 Feldern. Jede Reihe ist ein Zehner!',
  start(api, stage) {
    const L = api.level;
    const tasks = unique(() => {
      const n = L === 1 ? rand(2, 50) : L === 2 ? rand(11, 100) : rand(11, 99);
      return { n, key: n, type: ['h100-find50', 'h100-find100', 'h100-markiert', 'h100-fehlt'][L - 1], label: L <= 2 ? `Finde ${n}` : `Welche Zahl? (${n})` };
    });
    loop(api, stage, tasks, (t, next) => {
      let errs = 0, solved = false;
      if (L <= 2) {
        const hf = hunderterfeld({ labels: 'all', onTap });
        const info = h('div', { class: 'hf-info' }, '');
        stage.append(h('div', { class: 'left' }, h('div', { class: 'task-big' }, `Tippe die ${t.n}!`), info), h('div', { class: 'right hfwrap' }, hf.el));
        api.say(`Wo ist die ${t.n}? Suche sie im Hunderterfeld. Tipp: Die Zehnerreihen helfen dir!`);
        function onTap(n, el) {
          if (solved) return;
          Sound.tap();
          if (n === t.n) {
            solved = true; hf.clear(); hf.row(n, 'row'); el.classList.add('yes');
            info.innerHTML = ''; info.append(stangen(n, { small: true }), h('div', { class: 'hf-eq' }, `${n} = ${zn(n)} Zehner + ${en(n)} Einer`));
            api.done(t.type, errs === 0, el);
            api.say(`${api.praise()} Die ${n} sind ${zerl(n)}.`, 'happy');
            setTimeout(next, 2400); return;
          }
          errs++; softNo(el); api.miss(t.type, t.label);
          info.innerHTML = ''; info.append(h('div', { class: 'hf-eq soft' }, `Das ist die ${n}: ${zn(n)} Zehner, ${en(n)} Einer.`));
          if (errs === 1) { api.say(`Fast! Die ${t.n} hat ${zn(t.n)} Zehner und ${en(t.n)} Einer. Such die Reihe ab ${zn(t.n) * 10 + 1}.`, 'think'); }
          else if (errs === 2) { hf.row(t.n, 'row'); api.say(`Die Reihe leuchtet: ${zn(t.n) * 10 + 1} bis ${zn(t.n) * 10 + 10}. Zähle ${en(t.n)} Felder weiter.`, 'think'); }
          else { hf.cell(t.n).classList.add('glow'); api.say('Schau, wo es leuchtet!', 'think'); }
        }
      } else {
                const hf = hunderterfeld({ labels: L === 3 ? 'ends' : 'all', blank: [t.n], small: false });
        hf.mark(t.n, 'mark'); if (L === 4) hf.text(t.n, '?');
        const kp = keypad({ fields: [{ len: 3, pre: 'Das ist die' }], onSubmit: (v) => flow.submit(v) });
        const flow = answerFlow(api, t, kp, {
          check: (v) => v[0] === t.n, reveal: [t.n], anchor: hf.cell(t.n), next,
          expl: `Die ${t.n} sind ${zerl(t.n)}.`,
          hints: [
            () => { api.say(L === 3 ? `Fast! Zähle die vollen Reihen: jede Reihe ist ein Zehner. Dann die Felder in der letzten Reihe.` : `Fast! Schau auf die Zahlen links und rechts vom Fragezeichen.`, 'think'); hf.row(t.n, 'row'); },
            () => { for (let i = 1; i <= 10; i++) { const m = zn(t.n) * 10 + i; if (m <= t.n) hf.cell(m).classList.add('step1'); } api.say(`Hier sind ${zn(t.n)} volle Zehner (${zn(t.n) * 10}) und ${en(t.n)} Einer dazu.`, 'think'); }
          ]
        });
        stage.append(h('div', { class: 'left' }, h('div', { class: 'task-big' }, L === 3 ? 'Welche Zahl ist markiert?' : 'Welche Zahl fehlt?'), kp.el), h('div', { class: 'right hfwrap' }, hf.el));
        api.say(L === 3 ? 'Ein Feld leuchtet. Welche Zahl ist das? Zähle die Reihen.' : 'Ein Feld ist leer. Welche Zahl gehört dorthin?');
      }
    });
  }
};

// =====================================================================
// 2) Zehner und Einer
// =====================================================================
const ZE = {
  id: 'ze', name: 'Zehner und Einer', icon: '🧱', sub: 'Stangen und Würfel', maxLevel: 4, b100: true,
  levels: ['Zahl lesen bis 59', 'Zahl lesen bis 99', 'Zahl bauen', 'Zahl zerlegen'],
  intro: 'Zehnerstangen und Einerwürfel zeigen jede Zahl. 10 Würfel sind eine Stange!',
  start(api, stage) {
    const L = api.level;
    const tasks = unique((i) => {
      let n, kind;
      if (L === 1) { n = rand(11, 59); kind = 'lesen'; }
      else if (L === 2) { n = rand(21, 99); kind = 'lesen'; }
      else if (L === 3) { n = rand(11, 99); kind = 'bauen'; }
      else { n = rand(21, 99); kind = i < 3 ? 'zerlegen' : 'setzen'; }
      if (n % 10 === 0 && L !== 3) n += rand(1, 9) > 9 ? 0 : 1; // meist mit Einern
      return { n, kind, key: kind + n, type: ['ze-lesen', 'ze-lesen99', 'ze-bauen', 'ze-zerlegen'][L - 1], label: kind === 'setzen' ? `${zn(n) * 10} + ${en(n)}` : `${kind} ${n}` };
    });
    loop(api, stage, tasks, (t, next) => {
      if (t.kind === 'lesen') {
        const vis = stangen(t.n);
        const kp = keypad({ fields: [{ len: 2, pre: 'Die Zahl ist' }], onSubmit: (v) => flow.submit(v) });
        const flow = answerFlow(api, t, kp, { check: (v) => v[0] === t.n, reveal: [t.n], anchor: vis, next, expl: `${zerl(t.n)} sind ${t.n}.`,
          hints: [
            () => { api.say(`Fast! Zähle erst die Stangen in Zehnerschritten (10, 20, 30 …), dann die Würfel einzeln dazu.`, 'think'); pulse(vis); },
            () => { vis.replaceWith(stangen(t.n, { labels: true })); api.say(`Jetzt stehen Zahlen dran: ${zn(t.n)} Stangen sind ${zn(t.n) * 10}, dazu ${en(t.n)} Würfel.`, 'think'); }
          ] });
        stage.append(h('div', { class: 'left' }, h('div', { class: 'task-big' }, 'Welche Zahl ist das?'), vis), h('div', { class: 'right' }, kp.el));
        api.say('Eine Stange sind 10, ein Würfel ist 1. Welche Zahl siehst du?');
      } else if (t.kind === 'bauen') {
        let z = 0, e = 0, errs = 0, done = false;
        const zlab = h('span', { class: 'st-val' }, '0'), elab = h('span', { class: 'st-val' }, '0');
        const view = h('div', { class: 'build-view' });
        const redraw = () => { view.innerHTML = ''; view.append(z + e ? stangen(z * 10 + e, { small: false }) : h('div', { class: 'build-empty' }, 'Tippe auf + und baue die Zahl!')); zlab.textContent = z; elab.textContent = e; };
        const stepper = (name, val, set, max, cls) => h('div', { class: 'stepper ' + cls },
          h('div', { class: 'st-name' }, name),
          h('div', { class: 'st-row' },
            h('button', { type: 'button', class: 'st-btn', 'aria-label': name + ' weniger', onclick: () => { if (done) return; set(Math.max(0, val() - 1)); Sound.cube(); redraw(); } }, MINUS),
            val === null ? '' : (name === 'Zehner' ? zlab : elab),
            h('button', { type: 'button', class: 'st-btn plus', 'aria-label': name + ' mehr', onclick: () => { if (done) return; set(Math.min(max, val() + 1)); name === 'Zehner' ? Sound.stick() : Sound.cube(); redraw(); } }, '+')));
        const sz = stepper('Zehner', () => z, (v) => { z = v; }, 9, 'z'), se = stepper('Einer', () => e, (v) => { e = v; }, 9, 'e');
        const ok = h('button', { type: 'button', class: 'bigok', id: 'buildOk', onclick: () => {
          if (done) return;
          if (z === zn(t.n) && e === en(t.n)) {
            done = true; Sound.correct(); ok.classList.remove('glow'); ok.classList.add('yes');
            api.done(t.type, errs === 0, view); api.say(`${api.praise()} ${t.n} = ${zerl(t.n)}.`, 'happy'); setTimeout(next, 2000); return;
          }
          errs++; softNo(ok); Sound.softno(); api.miss(t.type, t.label);
          if (errs === 1) api.say(`Fast! Die ${t.n} hat ${zn(t.n)} Zehner und ${en(t.n)} Einer. Schau auf die Ziffern: ${zn(t.n)}${en(t.n)}.`, 'think');
          else if (errs === 2) { api.say(`Vorne steht die ${zn(t.n)}: ${zn(t.n)} Stangen. Hinten steht die ${en(t.n)}: ${en(t.n)} Würfel.`, 'think'); $('.stepper.z .plus', stage).classList.add('glow'); $('.stepper.e .plus', stage).classList.add('glow'); }
          else { z = zn(t.n); e = en(t.n); redraw(); ok.classList.add('glow'); api.say('So sieht es richtig aus. Tippe auf Fertig!', 'think'); }
        } }, 'Fertig ✓');
        redraw();
        stage.append(h('div', { class: 'left' }, h('div', { class: 'task-big' }, `Baue die Zahl ${t.n}!`), view), h('div', { class: 'right' }, h('div', { class: 'steppers' }, sz, se), ok));
        api.say(`Baue die ${t.n}: Wie viele Zehnerstangen und wie viele Einerwürfel brauchst du?`);
      } else if (t.kind === 'zerlegen') {
        const vis = stangen(t.n);
        const kp = keypad({ fields: [{ len: 2, pre: `${t.n} =` }, { len: 1, pre: '+' }], onSubmit: (v) => flow.submit(v) });
        const flow = answerFlow(api, t, kp, { check: (v) => v[0] === zn(t.n) * 10 && v[1] === en(t.n), reveal: [zn(t.n) * 10, en(t.n)], anchor: vis, next, expl: `${t.n} = ${zn(t.n) * 10} + ${en(t.n)}.`,
          hints: [
            () => { api.say(`Fast! Zerlege in ganze Zehner und Einer: Die ${zn(t.n)} vorne bedeutet ${zn(t.n)} Zehner.`, 'think'); pulse(vis); },
            () => { vis.replaceWith(stangen(t.n, { labels: true })); api.say(`${zn(t.n)} Stangen sind ${zn(t.n) * 10}. Dazu ${en(t.n)} Würfel. Also ${zn(t.n) * 10} + ${en(t.n)}.`, 'think'); }
          ] });
        stage.append(h('div', { class: 'left' }, h('div', { class: 'task-big' }, `Zerlege die ${t.n}!`), vis), h('div', { class: 'right' }, kp.el, h('div', { class: 'note' }, 'Erst die ganzen Zehner, dann die Einer.')));
        api.say(`Wie setzt sich die ${t.n} zusammen? Ganze Zehner plus Einer.`);
      } else {
        const a = zn(t.n) * 10, b = en(t.n);
        const vis = stangen(t.n);
        const kp = keypad({ fields: [{ len: 2, pre: `${a} + ${b} =` }], onSubmit: (v) => flow.submit(v) });
        const flow = answerFlow(api, t, kp, { check: (v) => v[0] === t.n, reveal: [t.n], anchor: vis, next, expl: `${a} + ${b} = ${t.n}.`,
          hints: [
            () => { api.say(`Fast! ${a} sind ${zn(t.n)} Zehner. Die Einer kommen hinten dran: ${b}.`, 'think'); pulse(vis); },
            () => { vis.replaceWith(stangen(t.n, { labels: true })); api.say(`${a} und ${b} zusammen: Die Zehnerziffer ${zn(t.n)}, die Einerziffer ${b}.`, 'think'); }
          ] });
        stage.append(h('div', { class: 'left' }, h('div', { class: 'task-big' }, `${a} + ${b} = ?`), vis), h('div', { class: 'right' }, kp.el));
        api.say(`Setze zusammen: ${a} plus ${b}. Welche Zahl entsteht?`);
      }
    });
  }
};

// =====================================================================
// Zahlenstrahl-Baustein (frei positioniert)
// =====================================================================
function nline(lo, hi, step, o) {
  o = o || {};
  const span = hi - lo;
  const xp = (n) => ((n - lo) / span) * 100;
  const wrap = h('div', { class: 'nl' });
  const horse = h('div', { class: 'nl-horse', html: lunaSVG() });
  const axis = h('div', { class: 'nl-axis' });
  axis.style.setProperty('--minor', (100 / span) + '%');
  const ticks = {};
  const tickList = [];
  for (let n = lo; n <= hi; n += step) {
    const showLabel = o.labelAll || (o.labels && o.labels.indexOf(n) >= 0) || (!o.labels && true);
    const t = h('button', { type: 'button', class: 'nl-tick' + (n % 10 === 0 ? ' ten' : '') + (n % 50 === 0 ? ' fifty' : ''), 'data-n': n, 'aria-label': 'Zahl ' + n, style: { left: xp(n) + '%' } },
      h('span', { class: 'm' }), h('span', { class: 'lb' }, showLabel ? String(n) : ''));
    if (o.onTap) t.addEventListener('click', () => o.onTap(n, t));
    else { t.tabIndex = -1; t.style.pointerEvents = 'none'; }
    ticks[n] = t; tickList.push(t); wrap.append(t);
  }
  wrap.append(axis, horse);
  let pos = o.start != null ? o.start : lo;
  const place = () => { horse.style.left = xp(pos) + '%'; };
  place();
  return {
    el: wrap, tick: (n) => ticks[n], list: tickList, xp, horse,
    get pos() { return pos; },
    setPos(n) { pos = n; place(); },
    label(n, txt) { const l = $('.lb', ticks[n]); if (l) l.textContent = txt != null ? txt : String(n); },
    arc(from, to, txt, cls) {
      const a = h('span', { class: 'nl-arc ' + (cls || ''), style: { left: ((xp(from) + xp(to)) / 2) + '%', width: Math.abs(xp(to) - xp(from)) + '%' } }, h('b', null, txt));
      wrap.append(a); return a;
    },
    clearArcs() { $$('.nl-arc', wrap).forEach((a) => a.remove()); },
    async hop(to, speed, label, big) {
      const from = pos; const dir = to > from ? 1 : -1;
      horse.classList.remove('hop'); void horse.offsetWidth; horse.classList.add('hop');
      pos = to; place(); Sound.hop();
      this.arc(from, to, label != null ? label : (to > from ? '+' : MINUS) + Math.abs(to - from), (dir > 0 ? 'fw' : 'bw') + (big ? ' big' : ''));
      await sleep(speed || 600);
    }
  };
}

// =====================================================================
// 3) Zahlenstrahl bis 100
// =====================================================================
const S100 = {
  id: 's100', name: 'Zahlenstrahl bis 100', icon: '🏇', sub: 'Hüpfen in Zehnern und Einern', maxLevel: 4, b100: true,
  levels: ['Zehner finden', 'In Zehnern hüpfen', 'Zahl finden (zwei Schritte)', 'Hüpfen mit Zehnern und Einern'],
  intro: 'Auf dem Zahlenstrahl bis 100 hüpfe ich in großen Zehner-Sprüngen und kleinen Einer-Schritten!',
  start(api, stage) {
    const L = api.level;
    const tasks = unique(() => {
      if (L === 1) { const n = rand(1, 10) * 10; return { n, key: n, type: 'strahl100-zehner', label: `Finde ${n}` }; }
      if (L === 2) {
        const plus = Math.random() < 0.6; let a, k, r;
        if (plus) { a = rand(0, 7) * 10; k = rand(1, Math.min(5, (100 - a) / 10)); r = a + k * 10; } else { a = rand(3, 10) * 10; k = rand(1, Math.min(5, a / 10 - 0)); r = a - k * 10; }
        if (k < 1) return null;
        return { a, k, plus, r, key: a + (plus ? '+' : '-') + k, type: 'strahl100-huepfen', label: `${a} ${plus ? '+' : MINUS} ${k * 10}` };
      }
      if (L === 3) { let n = rand(11, 99); if (n % 10 === 0) n++; return { n, key: n, type: 'strahl100-finden', label: `Finde ${n}` }; }
      const plus = Math.random() < 0.6; let a, z, e, r;
      if (plus) { z = rand(1, 5); a = rand(1, 5) * 10 + rand(0, 4); e = rand(1, 9 - en(a)); r = a + z * 10 + e; if (r > 100) return null; }
      else { z = rand(1, 4); a = rand(z + 2, 9) * 10 + rand(3, 9); e = rand(1, en(a)); r = a - z * 10 - e; if (r < 0) return null; }
      return { a, z, e, plus, r, key: a + (plus ? '+' : '-') + z + e, type: 'strahl100-ze', label: `${a} ${plus ? '+' : MINUS} ${z * 10} ${plus ? '+' : MINUS} ${e}` };
    });
    loop(api, stage, tasks, (t, next) => {
      stage.style.display = 'block';
      const box = h('div', { class: 'nl-box' });
      stage.append(box);
      let errs = 0, busy = false;
      if (L === 1) {
        const nl = nline(0, 100, 10, { labels: [0, 50, 100], onTap });
        box.append(h('div', { class: 'task-big' }, `Wo ist die ${t.n}?`), nl.el, h('div', { class: 'note' }, 'Jeder große Strich ist ein Zehner. Tippe auf den richtigen Strich.'));
        api.say(`Wo ist die ${t.n}? Zähle in Zehnerschritten: 10, 20, 30 …`);
        async function onTap(n, el) {
          if (busy) return; Sound.tap();
          if (n === t.n) { busy = true; el.classList.add('yes'); nl.label(n); await hopStraight(nl, n); api.done(t.type, errs === 0, el); api.say(`${api.praise()} Das ist die ${n}: ${zn(n)} Zehner.`, 'happy'); setTimeout(next, 1900); return; }
          errs++; softNo(el); api.miss(t.type, t.label);
          if (errs === 1) api.say(`Fast! Die ${t.n} ist die ${zn(t.n)}. Zahl in der Zehnerreihe: 10, 20, 30 …`, 'think');
          else if (errs === 2) { busy = true; api.say('Ich hüpfe in Zehnern vor. Zähl mit!', 'think'); nl.setPos(0); await sleep(300); for (let x = 10; x <= t.n; x += 10) { nl.label(x); await nl.hop(x, 450, '+10'); } nl.clearArcs(); busy = false; }
          else { nl.tick(t.n).classList.add('glow'); api.say('Schau, wo es leuchtet!', 'think'); }
        }
      } else if (L === 2) {
        const nl = nline(0, 100, 10, { labels: [0, 50, 100], start: t.a, onTap });
        nl.label(t.a);
        nl.tick(t.a).classList.add('start');
        box.append(h('div', { class: 'task-big' }, `${t.a} ${t.plus ? '+' : MINUS} ${t.k * 10} = ?`), nl.el, h('div', { class: 'note' }, `Hüpfe ${t.k} Zehner-Sprünge ${t.plus ? 'nach vorne' : 'zurück'}. Wo landest du?`));
        api.say(`Ich stehe auf der ${t.a}. Ich hüpfe ${t.k} Mal einen Zehner ${t.plus ? 'vor' : 'zurück'}. Wo lande ich?`);
        async function onTap(n, el) {
          if (busy) return; Sound.tap();
          if (n === t.r) {
            busy = true; nl.clearArcs(); nl.setPos(t.a); await sleep(150);
            for (let i = 1; i <= t.k; i++) await nl.hop(t.a + (t.plus ? 1 : -1) * i * 10, 450, (t.plus ? '+' : MINUS) + '10');
            el.classList.add('yes'); nl.label(n);
            api.done(t.type, errs === 0, el); api.say(`${api.praise()} ${t.a} ${t.plus ? '+' : MINUS} ${t.k * 10} = ${t.r}`, 'happy'); setTimeout(next, 1900); return;
          }
          errs++; softNo(el); api.miss(t.type, t.label);
          if (errs === 1) api.say(`Fast! ${t.k} Zehner-Sprünge sind ${t.k * 10}. Zähle von der ${t.a} aus ${t.k} Striche weiter.`, 'think');
          else if (errs === 2) { busy = true; api.say('Ich zeige es dir! Zähl mit …', 'think'); nl.clearArcs(); nl.setPos(t.a); await sleep(300); for (let i = 1; i <= t.k; i++) await nl.hop(t.a + (t.plus ? 1 : -1) * i * 10, 650, (t.plus ? '+' : MINUS) + '10'); await sleep(500); busy = false; api.say('Wo bin ich gelandet? Tippe auf den Strich.', 'think'); }
          else { nl.tick(t.r).classList.add('glow'); api.say('Schau, wo es leuchtet!', 'think'); }
        }
      } else if (L === 3) {
        // Schritt 1: Zehnerstrecke wählen, Schritt 2: heranzoomen
        const lo = zn(t.n) * 10, hi = lo + 10;
        const head = h('div', { class: 'task-big' }, `Wo ist die ${t.n}?`);
        const hintLine = h('div', { class: 'note' }, 'Schritt 1: Zwischen welchen Zehnern liegt die Zahl?');
        const top = nline(0, 100, 10, { labels: [0, 50, 100], onTap: pickDecade });
        const segLayer = h('div', { class: 'nl-segs' });
        for (let d = 0; d < 10; d++) segLayer.append(h('button', { type: 'button', class: 'nl-seg', 'data-seg': d * 10, 'aria-label': `von ${d * 10} bis ${d * 10 + 10}`, style: { left: d * 10 + '%', width: '10%' }, onclick: (e) => pickDecade(d * 10, e.currentTarget, true) }));
        top.el.append(segLayer);
        top.el.classList.add('top');
        const zoom = h('div', { class: 'nl-zoom' });
        box.append(head, top.el, hintLine, zoom);
        api.say(`Wo ist die ${t.n}? Erst: Zwischen welchen zwei Zehnern liegt sie? Tippe auf die Strecke.`);
        let stage2 = false, zl = null;
        async function pickDecade(n, el, seg) {
          if (busy || stage2) return; Sound.tap();
          const d = seg ? n : (n >= 100 ? 90 : n); // Tipp auf einen Strich = die Strecke rechts davon
          if (d === lo) {
            stage2 = true; segLayer.classList.add('done'); el.classList.add('yes'); top.el.classList.add('compact');
            hintLine.textContent = `Schritt 2: Die Strecke von ${lo} bis ${hi} ist herangezoomt. Tippe auf die ${t.n}!`;
            zl = nline(lo, hi, 1, { labelAll: true, labels: [lo, lo + 5, hi], onTap: pickExact });
            zl.el.classList.add('zoomed');
            zoom.append(zl.el); zoom.classList.add('show'); setTimeout(() => { try { zoom.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ignore */ } }, 350);
            api.say(`Richtig, zwischen ${lo} und ${hi}! Jetzt ist die Strecke groß. Wo liegt die ${t.n}?`);
            return;
          }
          errs++; softNo(el); api.miss(t.type, t.label);
          if (errs === 1) api.say(`Fast! Die ${t.n} hat ${zn(t.n)} Zehner. Sie liegt hinter der ${lo}.`, 'think');
          else { segLayer.querySelector(`[data-seg="${lo}"]`).classList.add('glow'); api.say('Schau, welche Strecke leuchtet!', 'think'); }
        }
        async function pickExact(n, el) {
          if (busy) return; Sound.tap();
          if (n === t.n) { busy = true; el.classList.add('yes'); zl.label(n); zl.setPos(lo); await sleep(100); for (let x = lo + 1; x <= n; x++) { zl.setPos(x); Sound.hop(); await sleep(120); } api.done(t.type, errs === 0, el); api.say(`${api.praise()} Die ${t.n}: ${zn(t.n)} Zehner und ${en(t.n)} Einer.`, 'happy'); setTimeout(next, 1900); return; }
          errs++; softNo(el); api.miss(t.type, t.label);
          if (errs === 1 || errs === 2) api.say(`Fast! Fang bei der ${lo} an und zähle ${en(t.n)} Striche weiter: ${lo + 1}, ${lo + 2} …`, 'think');
          else { zl.tick(t.n).classList.add('glow'); api.say('Schau, wo es leuchtet!', 'think'); }
        }
      } else {
        const nl = nline(0, 100, 10, { labels: [0, 50, 100], start: t.a });
        nl.el.classList.add('static');
        const kp = keypad({ fields: [{ len: 3, pre: '=' }], onSubmit: (v) => flow.submit(v) });
        const op = t.plus ? '+' : MINUS;
        box.append(h('div', { class: 'task-big' }, `${t.a} ${op} ${t.z * 10} ${op} ${t.e} = ?`), nl.el, h('div', { class: 'nl-kp' }, kp.el));
        const play = async () => {
          busy = true; nl.clearArcs(); nl.setPos(t.a); await sleep(250);
          await nl.hop(t.a + (t.plus ? 1 : -1) * t.z * 10, 800, (t.plus ? '+' : MINUS) + t.z * 10, true);
          api.say(`Erst die Zehner: ${t.a} ${op} ${t.z * 10} = ${t.a + (t.plus ? 1 : -1) * t.z * 10}. Jetzt die Einer!`, 'think');
          await sleep(500);
          await nl.hop(t.r, 800, op + t.e);
          busy = false;
        };
        const flow = answerFlow(api, t, kp, { check: (v) => v[0] === t.r, reveal: [t.r], anchor: nl.el, next, expl: `${t.a} ${op} ${t.z * 10} ${op} ${t.e} = ${t.r}`,
          hints: [
            () => api.say(`Fast! Rechne erst den großen Sprung (${t.z * 10}), dann den kleinen (${t.e}).`, 'think'),
            () => { api.say('Ich zeige es dir! Schau zu …', 'think'); play(); }
          ] });
        api.say(`Ich stehe auf der ${t.a}. Erst ${t.z} Zehner-Sprünge, dann ${t.e} kleine Schritte ${t.plus ? 'vor' : 'zurück'}. Wo lande ich?`);
      }
    });
    async function hopStraight(nl, n) { nl.setPos(0); await sleep(120); for (let x = 10; x <= n; x += 10) { nl.setPos(x); Sound.hop(); await sleep(160); } }
  }
};

// =====================================================================
// 4) Nachbarzahlen
// =====================================================================
const NB = {
  id: 'nb', name: 'Nachbarzahlen', icon: '🏘️', sub: 'Vorgänger, Nachfolger, Nachbarzehner', maxLevel: 4, b100: true,
  levels: ['Vorgänger und Nachfolger bis 50', 'Vorgänger und Nachfolger bis 100', 'Nachbarzehner', 'Gemischt'],
  intro: 'Jede Zahl wohnt in einer Straße mit Nachbarn: einer davor, einer danach!',
  start(api, stage) {
    const L = api.level;
    const tasks = unique(() => {
      let kind, n;
      if (L === 1) { kind = pick(['vor', 'nach']); n = rand(2, 49); }
      else if (L === 2) { kind = pick(['vor', 'nach']); n = Math.random() < 0.5 ? pick([20, 30, 40, 50, 60, 70, 80, 90, 39, 49, 59, 69, 79, 89, 99, 100]) : rand(11, 99); if (kind === 'vor' && n <= 1) n = 21; if (kind === 'nach' && n >= 100) n = 99; }
      else if (L === 3) { kind = 'zehner'; n = rand(11, 99); if (n % 10 === 0) n += rand(1, 9); }
      else { kind = pick(['beide', 'beide', 'zwischen', 'zehner']); n = rand(12, 98); if (kind === 'zehner' && n % 10 === 0) n++; }
      return { kind, n, key: kind + n, type: kind === 'vor' || kind === 'nach' ? (L === 1 ? 'nb-50' : 'nb-100') : kind === 'zehner' ? 'nb-zehner' : kind === 'zwischen' ? 'nb-zwischen' : 'nb-beide', label: `${kind} ${n}` };
    });
    loop(api, stage, tasks, (t, next) => {
      const n = t.n;
      let task, fields, check, reveal, expl, strip, h1, h2;
      if (t.kind === 'vor' || t.kind === 'nach') {
        const ans = t.kind === 'vor' ? n - 1 : n + 1;
        task = t.kind === 'vor' ? `Welche Zahl kommt direkt vor der ${n}?` : `Welche Zahl kommt direkt nach der ${n}?`;
        fields = [{ len: 3 }]; check = (v) => v[0] === ans; reveal = [ans]; expl = t.kind === 'vor' ? `${ans} ist der Vorgänger von ${n}.` : `${ans} ist der Nachfolger von ${n}.`;
        strip = [t.kind === 'vor' ? '?' : n - 1, n, t.kind === 'vor' ? n + 1 : '?'].map((x, i) => (i === 0 && t.kind === 'nach') ? '' : (i === 2 && t.kind === 'vor') ? '' : x);
        strip = t.kind === 'vor' ? ['?', n] : [n, '?'];
        h1 = () => api.say(t.kind === 'vor' ? `Fast! Zähle rückwärts: ${n}, und eins weniger ist …` : `Fast! Zähle vorwärts: ${n}, und eins mehr ist …`, 'think');
        h2 = () => { const hf = $('.hf', stage); if (hf) { const c = hf.querySelector(`[data-n="${ans}"]`); if (c) c.classList.add('hint'); const d = hf.querySelector(`[data-n="${n}"]`); if (d) d.classList.add('on'); } api.say(`Im Hunderterfeld liegt der Nachbar direkt ${t.kind === 'vor' ? 'links' : 'rechts'} neben der ${n}.`, 'think'); };
      } else if (t.kind === 'zehner') {
        const lo = zn(n) * 10, hi = lo + 10;
        task = `Zwischen welchen Zehnern liegt die ${n}?`;
        fields = [{ len: 2, post: '‹' }, { len: 3 }]; fields = [{ len: 2 }, { len: 3, pre: 'und' }];
        check = (v) => v[0] === lo && v[1] === hi; reveal = [lo, hi]; expl = `Die Nachbarzehner von ${n} sind ${lo} und ${hi}.`;
        strip = [lo, n, hi];
        h1 = () => api.say(`Fast! Der Zehner davor hat dieselbe Zehnerziffer: ${zn(n)} Zehner = ${lo}. Der Zehner danach ist einer mehr.`, 'think');
        h2 = () => { const hf = $('.hf', stage); if (hf) { [lo, hi].forEach((x) => { const c = hf.querySelector(`[data-n="${x}"]`); if (c) c.classList.add('hint'); }); const d = hf.querySelector(`[data-n="${n}"]`); if (d) d.classList.add('on'); } api.say(`Am Ende der Reihe steht die ${hi}, am Ende der Reihe davor die ${lo}.`, 'think'); };
      } else if (t.kind === 'zwischen') {
        const m = n; task = `Welche Zahl liegt zwischen ${m - 1} und ${m + 1}?`;
        fields = [{ len: 3 }]; check = (v) => v[0] === m; reveal = [m]; expl = `${m} liegt zwischen ${m - 1} und ${m + 1}.`;
        strip = [m - 1, '?', m + 1];
        h1 = () => api.say(`Fast! Die gesuchte Zahl ist der Nachfolger von ${m - 1}.`, 'think');
        h2 = () => { const hf = $('.hf', stage); if (hf) { [m - 1, m + 1].forEach((x) => { const c = hf.querySelector(`[data-n="${x}"]`); if (c) c.classList.add('on'); }); const c = hf.querySelector(`[data-n="${m}"]`); if (c) c.classList.add('hint'); } api.say('Im Hunderterfeld liegt sie genau in der Mitte der beiden.', 'think'); };
      } else {
        task = `Welche Nachbarn hat die ${n}?`;
        fields = [{ len: 2 }, { len: 3, pre: 'und' }];
        check = (v) => v[0] === n - 1 && v[1] === n + 1; reveal = [n - 1, n + 1]; expl = `Die Nachbarn von ${n} sind ${n - 1} und ${n + 1}.`;
        strip = ['?', n, '?'];
        h1 = () => api.say(`Fast! Der Vorgänger ist eins weniger, der Nachfolger eins mehr als ${n}.`, 'think');
        h2 = () => { const hf = $('.hf', stage); if (hf) { [n - 1, n + 1].forEach((x) => { const c = hf.querySelector(`[data-n="${x}"]`); if (c) c.classList.add('hint'); }); const d = hf.querySelector(`[data-n="${n}"]`); if (d) d.classList.add('on'); } api.say('Links und rechts im Hunderterfeld wohnen die Nachbarn.', 'think'); };
      }
      const houses = h('div', { class: 'nb-street' }, strip.map((x) => h('div', { class: 'nb-house' + (x === '?' ? ' q' : x === n ? ' me' : '') }, h('div', { class: 'roof' }), h('div', { class: 'wall' }, String(x)))));
      const hf = hunderterfeld({ labels: 'all', small: true });
      const hfw = h('div', { class: 'hfwrap mini helper' }, hf.el);
      const kp = keypad({ fields, onSubmit: (v) => flow.submit(v) });
      const flow = answerFlow(api, t, kp, { check, reveal, anchor: houses, next, expl, hints: [h1, () => { hfw.classList.add('show'); h2(); }] });
      stage.append(h('div', { class: 'left' }, h('div', { class: 'task-big small' }, task), houses, hfw), h('div', { class: 'right' }, kp.el));
      api.say(t.kind === 'zehner' ? `Die Nachbarzehner sind die zwei ganzen Zehner links und rechts von der ${n}.` : 'Schau dir die Hausnummern an. Welche Zahl wohnt da?');
    });
  }
};

// =====================================================================
// 5) Vergleichen
// =====================================================================
const VGL = {
  id: 'vgl', name: 'Vergleichen', icon: '⚖️', sub: 'Kleiner, größer oder gleich', maxLevel: 4, b100: true,
  levels: ['Verschiedene Zehner', 'Gleiche Zehner', 'Auch gleich', 'Mit Plus-Aufgaben'],
  intro: 'Welche Zahl ist größer? Die Spitze von < und > zeigt immer auf die kleinere Zahl.',
  start(api, stage) {
    const L = api.level;
    const tasks = unique(() => {
      let a, b, ea, eb, type;
      if (L === 1) { a = rand(11, 99); do { b = rand(11, 99); } while (zn(a) === zn(b)); type = 'vgl-zehner'; }
      else if (L === 2) { const z = rand(1, 9); a = z * 10 + rand(0, 9); do { b = z * 10 + rand(0, 9); } while (a === b); type = 'vgl-einer'; }
      else if (L === 3) {
        if (Math.random() < 0.4) { a = rand(11, 99); b = a; ea = String(a); eb = String(a); } else if (Math.random() < 0.5) { a = rand(11, 99); b = rand(11, 99); } else { const z = rand(1, 9); a = z * 10 + rand(0, 9); b = z * 10 + rand(0, 9); }
        type = 'vgl-gleich';
      } else {
        const x = rand(1, 7) * 10 + rand(0, 4), y = rand(1, 4); const sum = x + y;
        const forms = ['sum-zahl', 'zahl-sum', 'sum-sum'];
        const f = pick(forms);
        const o = rand(-4, 4);
        if (f === 'sum-zahl') { a = sum; ea = `${x} + ${y}`; b = sum + o; eb = String(b); }
        else if (f === 'zahl-sum') { b = sum; eb = `${x} + ${y}`; a = sum + o; ea = String(a); }
        else { a = sum; ea = `${x} + ${y}`; const x2 = rand(1, 7) * 10 + rand(0, 4), y2 = rand(1, 4); b = x2 + y2; eb = `${x2} + ${y2}`; }
        if (a > 100 || b > 100 || a < 1 || b < 1) return null;
        type = 'vgl-term';
      }
      return { a, b, ea: ea || String(a), eb: eb || String(b), sym: a < b ? '<' : a > b ? '>' : '=', key: `${a}:${b}:${ea || ''}:${eb || ''}`, type, label: `${ea || a} ? ${eb || b}` };
    });
    loop(api, stage, tasks, (t, next) => {
      let errs = 0, solved = false;
      const card = (txt, n, cls) => h('div', { class: 'vgl-card ' + cls }, h('div', { class: 'vgl-num' }, txt), h('div', { class: 'vgl-vis' }, stangen(n, { small: true })));
      const cA = card(t.ea, t.a, 'a'), cB = card(t.eb, t.b, 'b');
      const slot = h('div', { class: 'vgl-slot' }, '?');
      const syms = h('div', { class: 'vgl-syms' }, ['<', '=', '>'].map((s) => h('button', { type: 'button', class: 'vgl-sym', 'data-sym': s, 'aria-label': s === '<' ? 'kleiner' : s === '>' ? 'größer' : 'gleich', onclick: (e) => pickSym(s, e.currentTarget) }, s)));
      const name = (txt, n) => (txt === String(n) ? `${n}` : `${txt} (${n})`);
      stage.style.display = 'block';
      stage.append(h('div', { class: 'vglbox' }, h('div', { class: 'vgl-row' }, cA, slot, cB), syms, h('div', { class: 'note' }, 'Die Spitze zeigt auf die kleinere Zahl. Bei gleich bleibt alles gleich: =')));
      api.say(L === 4 ? 'Rechne erst die Plus-Aufgabe aus, dann vergleiche: kleiner, gleich oder größer?' : `Welche Zahl ist größer: ${t.a} oder ${t.b}? Tippe < , = oder >.`);
      function pickSym(s, btn) {
        if (solved) return; Sound.tap();
        if (s === t.sym) {
          solved = true; slot.textContent = s; slot.classList.add('filled'); btn.classList.add('yes');
          cA.classList.add('show'); cB.classList.add('show');
          api.done(t.type, errs === 0, slot);
          const w = t.sym === '=' ? `${t.a} und ${t.b} sind gleich viel.` : t.sym === '<' ? `${t.a} ist kleiner als ${t.b}.` : `${t.a} ist größer als ${t.b}.`;
          api.say(`${api.praise()} ${w}`, 'happy'); setTimeout(next, 2300); return;
        }
        errs++; softNo(btn); Sound.softno(); api.miss(t.type, t.label);
        if (errs === 1) api.say(L === 4 ? 'Fast! Rechne zuerst die Plus-Aufgabe aus. Dann vergleiche die Zehner, dann die Einer.' : 'Fast! Schau zuerst auf die Zehner: Welche Zahl hat mehr Zehner? Bei gleichen Zehnern entscheiden die Einer.', 'think');
        else if (errs === 2) { cA.classList.add('show'); cB.classList.add('show'); api.say(`Schau auf die Stangen und Würfel: links ${zerl(t.a)}, rechts ${zerl(t.b)}.`, 'think'); }
        else { $(`[data-sym="${t.sym}"]`, stage).classList.add('glow'); api.say('Schau, welcher Knopf leuchtet!', 'think'); }
      }
    });
  }
};

// =====================================================================
// 6) Zahlen ordnen
// =====================================================================
const ORD = {
  id: 'ord', name: 'Zahlen ordnen', icon: '🔢', sub: 'Von klein nach groß sortieren', maxLevel: 3, b100: true,
  levels: ['3 Zahlen ordnen', '4 Zahlen ordnen', '5 Zahlen, auch rückwärts'],
  intro: 'Ordne die Zahlenkarten der Reihe nach. Tippe zuerst die Karte, die als Erste kommt!',
  start(api, stage) {
    const L = api.level, cnt = L + 2;
    const tasks = unique(() => {
      const set = new Set(); let g = 0;
      while (set.size < cnt && g++ < 200) { const n = rand(5, 99); if (L === 1 && [...set].some((x) => zn(x) === zn(n))) continue; if (L === 2 && [...set].filter((x) => zn(x) === zn(n)).length >= 1 && Math.random() < 0.6) continue; set.add(n); }
      const nums = shuffle([...set]);
      const desc = L === 3 && Math.random() < 0.5;
      const sorted = [...nums].sort((x, y) => desc ? y - x : x - y);
      return { nums, sorted, desc, key: sorted.join(',') + desc, type: desc ? 'ord-ab' : 'ord-auf', label: `ordne ${[...nums].join(', ')}` };
    });
    loop(api, stage, tasks, (t, next) => {
      let errs = 0, filled = 0, busy = false;
      const slots = t.sorted.map((_, i) => h('div', { class: 'ord-slot', 'data-i': i }, h('small', null, String(i + 1))));
      const cards = {};
      const hand = h('div', { class: 'ord-hand' }, t.nums.map((n) => {
        const c = h('button', { type: 'button', class: 'ord-card', 'data-n': n, onclick: () => pick1(n, c) }, h('b', null, String(n)));
        cards[n] = c; return c;
      }));
      stage.style.display = 'block';
      stage.append(h('div', { class: 'ord-box' },
        h('div', { class: 'task-big' }, t.desc ? 'Vom größten zum kleinsten!' : 'Vom kleinsten zum größten!'),
        h('div', { class: 'ord-arrow' }, t.desc ? 'groß → klein' : 'klein → groß'), h('div', { class: 'ord-slots' }, slots), hand));
      api.say(t.desc ? 'Tippe zuerst die größte Zahl, dann die nächst kleinere …' : 'Tippe zuerst die kleinste Zahl, dann die nächst größere …');
      function pick1(n, c) {
        if (busy || c.classList.contains('used')) return; Sound.tap();
        const want = t.sorted[filled];
        if (n === want) {
          const sl = slots[filled]; sl.textContent = n; sl.classList.add('filled'); c.classList.add('used'); Sound.cube(); filled++;
          $$('.glow', hand).forEach((x) => x.classList.remove('glow'));
          if (filled === t.sorted.length) { busy = true; api.done(t.type, errs === 0, sl); api.say(`${api.praise()} ${t.sorted.join(t.desc ? ' > ' : ' < ')}`, 'happy'); setTimeout(next, 2300); }
          return;
        }
        errs++; softNo(c); Sound.softno(); api.miss(t.type, t.label, t.key);
        const rest = t.nums.filter((x) => !cards[x].classList.contains('used'));
        if (errs === 1) api.say(t.desc ? 'Fast! Welche Zahl hat die meisten Zehner?' : 'Fast! Welche Zahl hat die wenigsten Zehner? Bei gleichen Zehnern zählen die Einer.', 'think');
        else if (errs === 2) { rest.forEach((x) => { const m = cards[x]; if (!m.querySelector('.zevis')) m.append(stangen(x, { small: true })); }); api.say('Schau auf die Stangen: Welche Karte hat ' + (t.desc ? 'die meisten' : 'die wenigsten') + '?', 'think'); }
        else { cards[want].classList.add('glow'); api.say('Schau, welche Karte leuchtet!', 'think'); }
      }
    });
  }
};

// =====================================================================
// 7) Plus und Minus bis 100
// =====================================================================
function pmTask(L) {
  const R = rand;
  let a, b, plus, type;
  switch (L) {
    case 1: plus = Math.random() < 0.5; if (plus) { a = R(1, 8) * 10; b = R(1, (100 - a) / 10) * 10; } else { a = R(3, 10) * 10; b = R(1, a / 10 - 1) * 10; } type = 'pm-zehner'; break;
    case 2: plus = Math.random() < 0.6; if (plus) { a = R(1, 9) * 10; b = R(1, 9); } else { a = R(2, 9) * 10 + R(2, 9); b = en(a); } type = 'pm-zplus-e'; break;
    case 3: plus = Math.random() < 0.55; if (plus) { a = R(1, 9) * 10 + R(1, 8); b = R(1, 9 - en(a)); if (en(a) + b === 10) b--; if (b < 1) return null; } else { a = R(2, 9) * 10 + R(2, 9); b = R(1, en(a) - 1); if (b < 1) return null; } type = 'pm-ohne'; break;
    case 4: plus = Math.random() < 0.55; if (plus) { a = R(1, 7) * 10 + R(1, 9); b = R(1, (100 - a - 0) / 10 | 0) * 10; if (a + b > 100 || b < 10) return null; } else { a = R(3, 9) * 10 + R(1, 9); b = R(1, zn(a) - 1) * 10; if (b < 10) return null; } type = 'pm-zehner-dazu'; break;
    case 5: plus = true; a = R(1, 8) * 10 + R(3, 9); b = R(11 - en(a), 9); if (a + b > 100 || en(a) + b < 10) return null; type = 'pm-plusUeb'; break;
    default: plus = Math.random() < 0.7; if (plus && Math.random() < 0.3) { a = R(1, 8) * 10 + R(3, 9); b = R(11 - en(a), 9); if (a + b > 100) return null; type = 'pm-plusUeb'; } else { plus = false; a = R(2, 9) * 10 + R(0, 7); b = R(en(a) + 1, 9); if (b > a || b <= en(a)) return null; type = 'pm-minusUeb'; } break;
  }
  const res = plus ? a + b : a - b;
  if (res < 0 || res > 100) return null;
  return { a, b, plus, res, type, key: a + (plus ? '+' : '-') + b, label: `${a} ${plus ? '+' : MINUS} ${b}` };
}
const PM100 = {
  id: 'pm100', name: 'Plus und Minus bis 100', icon: '➕', sub: 'Zehner, Einer und der Zehner-Trick', maxLevel: 6, b100: true,
  levels: ['Ganze Zehner', 'Zehner plus Einer', 'Mit Einern ohne Übergang', 'Zehner dazu und weg', 'Plus mit Übergang', 'Minus mit Übergang'],
  intro: 'Im Hunderterfeld kann man Plus und Minus sehen. Mit dem Zehner-Trick wird auch das Knifflige leicht!',
  start(api, stage) {
    const L = api.level;
    const tasks = unique(() => pmTask(L));
    loop(api, stage, tasks, (t, next) => {
      const op = t.plus ? '+' : MINUS;
      const hf = hunderterfeld({ labels: 'ends', small: true });
      hf.mark(t.a, 'on'); hf.cell(t.a).textContent = t.a;
      const ans = h('span', { class: 'ans' }, '?');
      const eq = h('div', { class: 'eq' }, `${t.a} ${op} ${t.b} = `, ans);
      const kp = keypad({ fields: [{ len: 3, pre: 'Ergebnis' }], onSubmit: (v) => flow.submit(v) });
      let animating = false;
      const trick = async () => {
        if (animating) return; animating = true;
        hf.clear(); hf.mark(t.a, 'on');
        const say = (s) => api.say(s, 'think');
        const cellsRun = async (from, to, cls) => { const dir = to > from ? 1 : -1; for (let n = from + dir; dir > 0 ? n <= to : n >= to; n += dir) { if (n >= 1 && n <= 100) hf.mark(n, cls); Sound.tick(); await sleep(190); } };
        const ueberg = (t.plus && en(t.a) + t.b >= 10) || (!t.plus && t.b > en(t.a));
        if (ueberg && t.plus) {
          const toTen = 10 - en(t.a), rest = t.b - toTen, ten = (zn(t.a) + 1) * 10;
          say(`Schritt 1: Erst bis zum nächsten Zehner! ${t.a} + ${toTen} = ${ten}.`); await cellsRun(t.a, ten, 'step1'); await sleep(700);
          say(`Schritt 2: Der Rest ist ${t.b} − ${toTen} = ${rest}. ${ten} + ${rest} = ${t.res}.`); await cellsRun(ten, t.res, 'step2'); await sleep(500);
        } else if (ueberg) {
          const toTen = en(t.a), rest = t.b - toTen, ten = zn(t.a) * 10;
          say(`Schritt 1: Erst zurück zum vollen Zehner! ${t.a} − ${toTen} = ${ten}.`); await cellsRun(t.a, ten, 'step1'); await sleep(700);
          say(`Schritt 2: Der Rest ist ${t.b} − ${toTen} = ${rest}. ${ten} − ${rest} = ${t.res}.`); await cellsRun(ten, t.res, 'step2'); await sleep(500);
        } else if (t.b % 10 === 0) {
          say(`Zehner springen eine Reihe: ${t.b / 10} Zeile${t.b > 10 ? 'n' : ''} ${t.plus ? 'nach unten' : 'nach oben'}.`);
          for (let i = 1; i <= t.b / 10; i++) { const n = t.a + (t.plus ? 1 : -1) * i * 10; hf.mark(n, 'step1'); Sound.tick(); await sleep(450); }
        } else {
          say(`Die Zehner bleiben. Nur die Einer ändern sich: ${en(t.a)} ${op} ${t.b} = ${en(t.res)}.`); await cellsRun(t.a, t.res, 'step1'); await sleep(500);
        }
        say(`${t.a} ${op} ${t.b} = ${t.res}. Jetzt du!`); animating = false;
      };
      const trickBtn = h('button', { type: 'button', class: 'trickbtn', id: 'trickBtn', onclick: () => { Sound.tap(); trick(); } }, '🪄 Trick zeigen');
      const flow = answerFlow(api, t, kp, { check: (v) => v[0] === t.res, reveal: [t.res], anchor: eq, next,
        expl: `${t.a} ${op} ${t.b} = ${t.res}.`,
        hints: [
          () => { const uh = t.type === 'pm-plusUeb' ? `Fast! Geh erst bis zur vollen Zehnerzahl, dann rechne den Rest.` : t.type === 'pm-minusUeb' ? `Fast! Geh erst zurück zum vollen Zehner, dann rechne den Rest weg.` : t.type === 'pm-zehner' ? `Fast! Rechne mit den Zehnern: ${zn(t.a)} ${op} ${zn(t.b)}.` : t.type === 'pm-zehner-dazu' ? `Fast! Die Einer bleiben gleich. Rechne nur ${zn(t.a)} ${op} ${zn(t.b)} Zehner.` : `Fast! Die Zehner bleiben gleich. Rechne mit den Einern: ${en(t.a)} ${op} ${t.b}.`; api.say(uh, 'think'); },
          () => { api.say('Ich zeige dir den Trick im Hunderterfeld!', 'think'); trick(); }
        ] });
      const hfw = h('div', { class: 'hfwrap mini' }, hf.el);
      stage.append(h('div', { class: 'left' }, eq, hfw, trickBtn), h('div', { class: 'right' }, kp.el));
      api.say(t.type === 'pm-plusUeb' ? `${t.a} + ${t.b}: Das geht über den Zehner. Tipp: erst zum vollen Zehner, dann den Rest!` : t.type === 'pm-minusUeb' ? `${t.a} − ${t.b}: Das geht über den Zehner zurück. Tipp: erst zum vollen Zehner, dann den Rest!` : `Rechne ${t.a} ${op} ${t.b}. Im Hunderterfeld siehst du die Startzahl.`);
    });
  }
};

// ---------- Registrierung ----------
const NEW = [H100, ZE, S100, NB, VGL, ORD, PM100];
NEW.forEach((g) => GAMES.push(g));
Object.assign(GAME_TYPES, {
  h100: ['h100-find50', 'h100-find100', 'h100-markiert', 'h100-fehlt'],
  ze: ['ze-lesen', 'ze-lesen99', 'ze-bauen', 'ze-zerlegen'],
  s100: ['strahl100-zehner', 'strahl100-huepfen', 'strahl100-finden', 'strahl100-ze'],
  nb: ['nb-50', 'nb-100', 'nb-zehner', 'nb-beide', 'nb-zwischen'],
  vgl: ['vgl-zehner', 'vgl-einer', 'vgl-gleich', 'vgl-term'],
  ord: ['ord-auf', 'ord-ab'],
  pm100: ['pm-zehner', 'pm-zplus-e', 'pm-ohne', 'pm-zehner-dazu', 'pm-plusUeb', 'pm-minusUeb']
});
Object.assign(TYPE_LABELS, {
  'h100-find50': 'Hunderterfeld: Zahl finden bis 50', 'h100-find100': 'Hunderterfeld: Zahl finden bis 100', 'h100-markiert': 'Hunderterfeld: markierte Zahl lesen', 'h100-fehlt': 'Hunderterfeld: fehlende Zahl',
  'ze-lesen': 'Zehner/Einer: Zahl lesen bis 59', 'ze-lesen99': 'Zehner/Einer: Zahl lesen bis 99', 'ze-bauen': 'Zehner/Einer: Zahl bauen', 'ze-zerlegen': 'Zehner/Einer: zerlegen und zusammensetzen',
  'strahl100-zehner': 'Zahlenstrahl bis 100: Zehner finden', 'strahl100-huepfen': 'Zahlenstrahl bis 100: in Zehnern hüpfen', 'strahl100-finden': 'Zahlenstrahl bis 100: Zahl finden', 'strahl100-ze': 'Zahlenstrahl bis 100: Zehner und Einer hüpfen',
  'nb-50': 'Nachbarzahlen bis 50', 'nb-100': 'Nachbarzahlen bis 100', 'nb-zehner': 'Nachbarzehner', 'nb-beide': 'Beide Nachbarn', 'nb-zwischen': 'Zahl dazwischen',
  'vgl-zehner': 'Vergleichen: verschiedene Zehner', 'vgl-einer': 'Vergleichen: gleiche Zehner', 'vgl-gleich': 'Vergleichen: auch gleich', 'vgl-term': 'Vergleichen mit Plus-Aufgaben',
  'ord-auf': 'Zahlen ordnen: aufsteigend', 'ord-ab': 'Zahlen ordnen: absteigend',
  'pm-zehner': 'Bis 100: ganze Zehner plus/minus', 'pm-zplus-e': 'Bis 100: Zehner plus Einer', 'pm-ohne': 'Bis 100: Zehner+Einer ohne Übergang', 'pm-zehner-dazu': 'Bis 100: Zehner dazu/weg', 'pm-plusUeb': 'Bis 100: Plus mit Übergang', 'pm-minusUeb': 'Bis 100: Minus mit Übergang'
});

// =====================================================================
// Welt 6: Zauberwald der Hundert
// =====================================================================
const { TREASURE, WORLDS, WORLD_ART, BAG_USE, BAG_EXTRA, ITEMS, svgw, ART } = core;
TREASURE.gluehkugel = { name: 'Glühkugel', svg: svgw('0 0 48 48', `<defs><radialGradient id="gk1" cx="40%" cy="35%"><stop offset="0" stop-color="#fffde0"/><stop offset=".55" stop-color="#d8f5a0"/><stop offset="1" stop-color="#8fd68a"/></radialGradient></defs><circle cx="24" cy="26" r="20" fill="#d8f5a0" opacity=".35"/><circle cx="24" cy="26" r="14" fill="url(#gk1)" stroke="#7cc47a" stroke-width="2"/><ellipse cx="19" cy="20" rx="4" ry="2.6" fill="#fff" opacity=".8"/><path d="M20 10 q4 -6 8 0" stroke="#8a5a36" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M38 8 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2z" fill="#fff6a8"/>`) };
TREASURE.zauberpilz = { name: 'Zauberpilz', svg: svgw('0 0 48 48', `<path d="M18 28 Q16 42 19 45 L29 45 Q32 42 30 28 Z" fill="#fff5e6" stroke="#e8d3b2" stroke-width="1.5"/><path d="M5 30 C5 8 43 8 43 30 Q24 36 5 30 Z" fill="#b99aea" stroke="#9378d0" stroke-width="2"/><circle cx="16" cy="21" r="3.4" fill="#f4ecff"/><circle cx="28" cy="16" r="3" fill="#f4ecff"/><circle cx="35" cy="25" r="2.6" fill="#f4ecff"/><path d="M40 6 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2z" fill="#fff6a8"/>`) };
TREASURE.hundertmedaille = { name: 'Hunderter-Medaille', svg: svgw('0 0 48 48', `<path d="M14 2 L24 18 L34 2 Z" fill="#7cc4ea" stroke="#4f9cc7" stroke-width="1.5" stroke-linejoin="round"/><circle cx="24" cy="30" r="16" fill="#f6cf5a" stroke="#c9962a" stroke-width="2.5"/><circle cx="24" cy="30" r="11.5" fill="#fbe08a" stroke="#e5b84a" stroke-width="1.5"/><text x="24" y="35" text-anchor="middle" font-size="13" font-weight="800" font-family="sans-serif" fill="#a56d12">100</text><path d="M10 14 l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1z" fill="#fff"/>`) };
['gluehkugel', 'zauberpilz', 'hundertmedaille'].forEach((k) => BAG_EXTRA.push(k));
Object.assign(BAG_USE, {
  gluehkugel: 'Die Glühkugeln machen das Hundert-Tor hell.',
  zauberpilz: 'Ein glimmender Schatz aus dem Zauberwald.',
  hundertmedaille: 'Deine Medaille: Du kennst dich bis 100 aus!'
});

const foTree = (c1, c2) => svgw('0 0 80 150', `<rect x="34" y="96" width="12" height="52" rx="5" fill="#8a6a50"/><path d="M40 4 C14 10 6 44 14 62 C4 72 8 98 40 98 C72 98 76 72 66 62 C74 44 66 10 40 4 Z" fill="${c1}"/><path d="M40 4 C24 12 18 40 24 58 C16 72 22 90 40 94 C34 70 36 30 40 4 Z" fill="${c2}" opacity=".55"/>${[[28, 38], [52, 30], [44, 60], [24, 74], [58, 76]].map(([x, y], i) => `<circle class="gl" style="animation-delay:${-i * 0.9}s" cx="${x}" cy="${y}" r="2.6" fill="#fff6a8"/>`).join('')}`);
const glowShroom = (c) => svgw('0 0 60 60', `<ellipse cx="30" cy="54" rx="22" ry="5" fill="${c}" opacity=".25" class="gl"/><path d="M23 34 Q21 50 24 55 L36 55 Q39 50 37 34 Z" fill="#fff5e6"/><path d="M5 36 C5 12 55 12 55 36 Q30 43 5 36 Z" fill="${c}"/><path d="M5 36 C5 12 55 12 55 36 Q30 43 5 36 Z" fill="#fff" opacity=".18"/><circle cx="19" cy="27" r="4" fill="#fff" opacity=".85"/><circle cx="35" cy="21" r="3.2" fill="#fff" opacity=".85"/><circle cx="46" cy="30" r="3.4" fill="#fff" opacity=".85"/>`);
const firefly = svgw('0 0 30 30', `<circle cx="15" cy="15" r="13" fill="#fff6a8" opacity=".22"/><circle cx="15" cy="15" r="7" fill="#fff6a8" opacity=".45"/><circle cx="15" cy="15" r="3.4" fill="#fffbd0"/>`);
const treehouse = svgw('0 0 150 190', `<rect x="58" y="84" width="34" height="104" rx="12" fill="#8a6a50"/><path d="M75 6 C28 14 8 52 24 80 C12 94 22 112 75 112 C128 112 138 94 126 80 C142 52 122 14 75 6Z" fill="#4aa88f"/><rect x="34" y="84" width="82" height="9" rx="4" fill="#b5804f"/><rect x="42" y="50" width="66" height="36" fill="#d9a06a"/><path d="M36 52 L75 22 L114 52 Z" fill="#c4674f"/><rect x="62" y="60" width="26" height="26" rx="4" fill="#ffe08a"/><path d="M75 60 v26 M62 73 h26" stroke="#c98b3a" stroke-width="2"/><circle cx="75" cy="73" r="20" fill="#ffe08a" opacity=".28" class="gl"/><path d="M62 120 v50 M88 120 v50 M62 130 h26 M62 146 h26 M62 162 h26" stroke="#b5804f" stroke-width="4" stroke-linecap="round"/>`);
const hundertTor = (open) => svgw('0 0 170 180', `<rect x="14" y="56" width="18" height="122" rx="7" fill="#9bb7ab"/><rect x="138" y="56" width="18" height="122" rx="7" fill="#9bb7ab"/><path d="M14 90 q9 4 18 0 M138 120 q9 4 18 0" stroke="#6fbf7f" stroke-width="5" fill="none"/>
  <path d="M22 66 C22 6 148 6 148 66" stroke="#8aa89a" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M26 62 C30 22 140 22 144 62" stroke="#6fbf7f" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="1 9"/>
  ${[[28, 56, '#ff9ecb'], [50, 24, '#b9a0ff'], [85, 12, '#7fe3d0'], [120, 24, '#ffe08a'], [142, 56, '#ff9ecb']].map(([x, y, c], i) => `<path class="gl" style="animation-delay:${-i * 0.6}s" d="M${x} ${y - 9} l6 9 l-6 9 l-6 -9z" fill="${c}"/>`).join('')}
  <rect x="58" y="22" width="54" height="26" rx="8" fill="#fff6e6" stroke="#e9d6bb" stroke-width="2"/><text x="85" y="42" text-anchor="middle" font-size="19" font-weight="800" font-family="sans-serif" fill="#c9792b">100</text>
  <g class="gdoor gl">${range(0, 4).map((i) => `<rect x="${32 + i * 11}" y="${108 - (i % 2) * 6}" width="8" height="${70 + (i % 2) * 6}" rx="4" fill="#cfeedd" stroke="#8fcfae"/>`).join('')}<rect x="30" y="128" width="56" height="7" rx="3" fill="#cfeedd" stroke="#8fcfae"/></g>
  <g class="gdoor gr">${range(0, 4).map((i) => `<rect x="${86 + i * 11}" y="${108 - ((i + 1) % 2) * 6}" width="8" height="${70 + ((i + 1) % 2) * 6}" rx="4" fill="#cfeedd" stroke="#8fcfae"/>`).join('')}<rect x="84" y="128" width="56" height="7" rx="3" fill="#cfeedd" stroke="#8fcfae"/></g>
  ${open ? '<ellipse cx="85" cy="150" rx="34" ry="28" fill="#fffbd0" opacity=".55" class="gl"/>' : ''}`);
const laterneArt = svgw('0 0 50 100', `<rect x="22" y="44" width="6" height="54" rx="3" fill="#8a6a50"/><path d="M25 4 v8" stroke="#8a6a50" stroke-width="3"/><circle cx="25" cy="28" r="22" fill="#fff6a8" opacity=".28" class="gl"/><path d="M14 16 h22 l4 8 v14 l-4 8 h-22 l-4 -8 v-14 z" fill="#ffe9a0" stroke="#d9b24a" stroke-width="2.5" stroke-linejoin="round"/><path d="M25 16 v30" stroke="#d9b24a" stroke-width="2"/><circle cx="25" cy="32" r="5" fill="#fff"/>`);

ITEMS.push({ id: 'zauberlaterne', name: 'Zauberlaterne (aus dem Zauberwald)', price: 0, art: () => laterneArt, s: 6, x: 12, y: 96, special: true, snd: 'sparkle' });

WORLD_ART[5] = {
  layers: (wl) => wl(`<path d="M0 36 Q16 24 34 34 T70 28 T100 34 V100 H0Z" fill="#cde9de"/>${range(0, 12).map((i) => `<path d="M${i * 8.5 + 2} 38 l3 -13 l3 13Z" fill="#b4dac9"/>`).join('')}<path d="M0 46 Q24 38 52 46 T100 42 V100 H0Z" fill="#b8e0cb"/>`, 'far')
    + wl(`<path d="M0 54 Q32 46 64 54 T100 50 V100 H0Z" fill="#a1d7b5"/><path d="M0 72 Q50 64 100 74 V100 H0Z" fill="#92cdaa" opacity=".8"/><path d="M0 92 Q50 86 100 94 V100 H0Z" fill="#84c29f" opacity=".7"/>${range(0, 14).map((i) => `<circle class="gl" style="animation-delay:${-i * 0.5}s" cx="${(i * 37) % 97 + 2}" cy="${60 + (i * 23) % 36}" r=".45" fill="#fffbd0"/>`).join('')}`),
  decor: (done, fl) => [
    [foTree('#3f9a82', '#2d7a69'), 3, 56, 13], [foTree('#4aa88f', '#34826e'), 20, 49, 9], [treehouse, 36, 55, 13], [foTree('#3f9a82', '#2d7a69'), 52, 48, 9],
    [foTree('#4aa88f', '#34826e'), 70, 49, 10], [foTree('#3a8f78', '#2a7060'), 97, 52, 12],
    [glowShroom('#ff9ecb'), 12, 90, 6], [glowShroom('#b9a0ff'), 30, 95, 5], [glowShroom('#7fe3d0'), 47, 90, 6], [glowShroom('#ffe08a'), 66, 94, 5], [glowShroom('#ff9ecb'), 80, 95, 5], [glowShroom('#b9a0ff'), 5, 70, 4.2],
    [firefly, 14, 62, 3.2, 'ffly'], [firefly, 26, 50, 2.6, 'ffly f2'], [firefly, 44, 66, 3, 'ffly f3'], [firefly, 58, 56, 2.6, 'ffly'], [firefly, 71, 70, 3.2, 'ffly f2'], [firefly, 82, 52, 2.6, 'ffly f3'], [firefly, 35, 84, 2.8, 'ffly f2'],
    fl(9, 80, '#d6c2f2'), fl(39, 70, '#fff'), fl(55, 68, '#ffe08a'), fl(68, 84, '#f7a8c4'), fl(92, 86, '#fff'), fl(24, 66, '#b5dcff'),
    [hundertTor(done), 89, 62, 17, 'gate-art' + (done ? ' open' : '')]]
};

WORLDS.push({
  id: 'wald', name: 'Zauberwald der Hundert', sky: ['#b9e2dc', '#eef9f2'], c: '#4fb39a', soft: '#e2f6ef', entry: 60, exit: 60,
  pos: [[7, 74], [18, 57], [29, 76], [40, 58], [51, 77], [62, 59], [73, 78], [88, 73]],
  need: { item: 'gluehkugel', n: 3, pl: 'Glühkugeln' },
  stations: [
    { name: 'Der Glühwürmchen-Pfad', game: 'h100', diff: 0, min: 1, item: 'gluehkugel', story: 'Im Zauberwald leuchten Glühwürmchen in einem Hunderterfeld. Jede Reihe ist ein Zehner. Suchst du die Zahlen mit mir?' },
    { name: 'Das Zehnerstangen-Lager', game: 'ze', diff: 0, min: 1, item: 'gluehkugel', story: 'Die Waldzwerge lagern Zehnerstangen und Einerwürfel. Zehn Würfel sind eine Stange – wie viele sind es hier?' },
    { name: 'Die Hundert-Brücke', game: 's100', diff: 0, min: 1, item: 'kartenteil', story: 'Die lange Brücke ist wie ein Zahlenstrahl bis 100. Ich hüpfe in großen Zehner-Sprüngen und kleinen Einer-Schritten!' },
    { name: 'Die Nachbarhäuser', game: 'nb', diff: 0, min: 1, item: 'gluehkugel', story: 'Im Dorf der Waldmäuse hat jede Zahl Nachbarn: einen davor und einen danach. Wer wohnt wo?' },
    { name: 'Der Vergleichs-Teich', game: 'vgl', diff: 0, min: 1, item: 'zauberpilz', story: 'Zwei Frösche streiten, wer mehr Seerosen hat. Du entscheidest: kleiner, größer oder gleich?' },
    { name: 'Die Zahlenreihe', game: 'ord', diff: 0, min: 1, item: 'zauberpilz', story: 'Die Zahlenkarten sind durcheinander gepurzelt. Hilf mir, sie der Reihe nach zu ordnen!' },
    { name: 'Der Zehner-Trick-Pilz', game: 'pm100', diff: 0, min: 2, item: 'zauberpilz', story: 'Der alte Zauberpilz kennt einen Trick: Erst zum vollen Zehner, dann den Rest. So wird Plus und Minus bis 100 leicht!' },
    { name: 'Das Hundert-Tor', game: 'pm100', diff: 1, min: 3, gate: true, item: 'hundertmedaille', gift: 'zauberlaterne', story: 'Das Hundert-Tor leuchtet nur mit drei Glühkugeln und einer besonderen Aufgabe – ein bisschen kniffliger. Zusammen schaffen wir das!' }
  ],
  doneText: 'Das Hundert-Tor leuchtet auf und alle Glühwürmchen tanzen! Du bekommst die Hunderter-Medaille und eine Zauberlaterne für deinen Pferdehof.',
  next: ''
});

Object.assign(core.b100, { stangen, hunderterfeld, keypad, nline, pmTask });
});
