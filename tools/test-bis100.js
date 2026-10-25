// E2E für die Spiele „bis 100“: jede Stufe jedes Spiels, richtig und mit Fehlern (Hinweise), Konsole, kein Rot, Touch-Größen
const PW = process.env.PW_PATH || 'playwright';
const { webkit, chromium } = require(PW);
const URL = process.env.URL || 'http://127.0.0.1:9518/index.html';
const which = process.argv[2] || 'webkit';
const VPS = [[1024, 768], [820, 1180]];
const only = process.argv[3] ? process.argv[3].split(',') : null;
let fails = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; if (process.env.V) console.log('  ✔', m); } else { fails++; console.log('  ✘', m); } };

// Löser: arbeitet über die DOM-Elemente, liest die Aufgabe aus __pmCore.b100.cur
const SOLVER = `
(() => {
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clickN = (sel) => { const e = $(sel); if (e) e.click(); return !!e; };
  const type = (digits) => { String(digits).split('').forEach((d) => $('.kp-key[data-n="' + d + '"]').click()); };
  const submit = () => $('#kpOk').click();
  const zn = (n) => Math.floor(n / 10), en = (n) => n % 10;
  const fields = () => $$('.kp-box');
  function typeAll(vals) { // jedes Feld einzeln antippen, damit auch 3-stellige Felder klappen
    vals.forEach((v, i) => { fields()[i].click(); type(v); });
  }
  window.__solve = {
    correct(id, L) {
      const t = __pmCore.b100.cur;
      switch (id) {
        case 'h100': if (L <= 2) clickN('.hf-cell[data-n="' + t.n + '"]'); else { typeAll([t.n]); submit(); } break;
        case 'ze':
          if (t.kind === 'bauen') { for (let i = 0; i < zn(t.n); i++) $('.stepper.z .plus').click(); for (let i = 0; i < en(t.n); i++) $('.stepper.e .plus').click(); $('#buildOk').click(); }
          else if (t.kind === 'zerlegen') { typeAll([zn(t.n) * 10, en(t.n)]); submit(); }
          else { typeAll([t.n]); submit(); }
          break;
        case 's100':
          if (L === 1) clickN('.nl-tick[data-n="' + t.n + '"]');
          else if (L === 2) clickN('.nl-tick[data-n="' + t.r + '"]');
          else if (L === 3) { clickN('.nl-seg[data-seg="' + zn(t.n) * 10 + '"]'); setTimeout(() => clickN('.nl.zoomed .nl-tick[data-n="' + t.n + '"]'), 60); }
          else { typeAll([t.r]); submit(); }
          break;
        case 'nb':
          if (t.kind === 'vor') typeAll([t.n - 1]); else if (t.kind === 'nach') typeAll([t.n + 1]);
          else if (t.kind === 'zehner') typeAll([zn(t.n) * 10, zn(t.n) * 10 + 10]);
          else if (t.kind === 'zwischen') typeAll([t.n]); else typeAll([t.n - 1, t.n + 1]);
          submit(); break;
        case 'vgl': clickN('.vgl-sym[data-sym="' + t.sym + '"]'); break;
        case 'ord': t.sorted.forEach((n) => clickN('.ord-card[data-n="' + n + '"]')); break;
        case 'pm100': typeAll([t.res]); submit(); break;
      }
    },
    wrong(id, L) { // eine falsche Eingabe
      const t = __pmCore.b100.cur;
      const wrongNum = (x) => (x + 7 > 99 ? x - 7 : x + 7);
      switch (id) {
        case 'h100': if (L <= 2) clickN('.hf-cell[data-n="' + (t.n === 1 ? 2 : 1) + '"]'); else { typeAll([wrongNum(t.n)]); submit(); } break;
        case 'ze':
          if (t.kind === 'bauen') $('#buildOk').click();
          else if (t.kind === 'zerlegen') { typeAll([10, 1]); submit(); } else { typeAll([wrongNum(t.n)]); submit(); }
          break;
        case 's100':
          if (L === 1) clickN('.nl-tick[data-n="' + (t.n === 10 ? 20 : 10) + '"]');
          else if (L === 2) clickN('.nl-tick[data-n="' + (t.r === 0 ? 10 : 0) + '"]');
          else if (L === 3) clickN('.nl-seg[data-seg="' + (zn(t.n) === 0 ? 10 : 0) + '"]');
          else { typeAll([wrongNum(t.r)]); submit(); }
          break;
        case 'nb': typeAll(t.kind === 'zehner' || t.kind === 'beide' ? [1, 2] : t.kind === 'zwischen' ? [t.n + 1] : [t.n]); submit(); break;
        case 'vgl': clickN('.vgl-sym[data-sym="' + ({ '<': '>', '>': '<', '=': '<' })[t.sym] + '"]'); break;
        case 'ord': { const w = $$('.ord-card:not(.used)').find((c) => +c.dataset.n !== t.sorted[$$('.ord-slot.filled').length]); if (w) w.click(); } break;
        case 'pm100': typeAll([wrongNum(t.res)]); submit(); break;
      }
    }
  };
})();
`;

async function playRound(page, id, L, mode, log) {
  await page.evaluate(([id, L]) => window.__pm.startGame(id, { level: L }), [id, L]);
  await page.waitForSelector('#stage');
  const before = await page.evaluate(() => window.__pm.state.shoes);
  const types = new Set();
  for (let i = 1; i <= 5; i++) {
    await page.waitForFunction((n) => window.__pmCore.b100.cur && window.__pmCore.b100.n === n, i, { timeout: 8000 });
    const info = await page.evaluate(() => { const t = window.__pmCore.b100.cur; return { type: t.type, label: t.label }; });
    types.add(info.type);
    if (mode === 'wrong') {
      for (let k = 0; k < 3; k++) {
        const bubble0 = await page.evaluate(() => document.querySelector('.bubble') && document.querySelector('.bubble').textContent);
        await page.evaluate(([id, L]) => window.__solve.wrong(id, L), [id, L]);
        await page.waitForTimeout(id === 's100' ? 1500 : 150);
        const bubble1 = await page.evaluate(() => document.querySelector('.bubble') && document.querySelector('.bubble').textContent);
        ok(bubble1 && bubble1.length > 5, `${id} L${L} Aufgabe ${i}: Hinweis ${k + 1} sichtbar`);
        // kein Rot im sichtbaren Bereich
        const red = await page.evaluate(() => [...document.querySelectorAll('.soft-no,.kp-box,.vgl-sym,.ord-card,.hf-cell,.nl-tick')].some((e) => { const c = getComputedStyle(e).backgroundColor; const m = c.match(/\d+/g); return m && +m[0] > 200 && +m[1] < 90 && +m[2] < 90; }));
        ok(!red, `${id} L${L}: kein Rot bei Fehler`);
        if (id === 'ze' && L === 3 && k === 2) break; // Bauen: dritter Fehler füllt selbst aus
      }
      // nach 3 Fehlern: Lösung wird gezeigt / leuchtet; jetzt richtig abschließen
      if (['h100', 'ze', 'nb', 'pm100'].includes(id) || (id === 's100' && L === 4)) {
        const wasKp = await page.evaluate(() => !!document.querySelector('.kp'));
        if (wasKp) { const filled = await page.evaluate(() => [...document.querySelectorAll('.kp-box')].every((b) => !b.classList.contains('empty'))); if (filled) { await page.evaluate(() => document.querySelector('#kpOk').click()); } else await page.evaluate(([id, L]) => window.__solve.correct(id, L), [id, L]); }
        else if (id === 'ze' && L === 3) await page.evaluate(() => document.querySelector('#buildOk').click());
        else await page.evaluate(([id, L]) => window.__solve.correct(id, L), [id, L]);
      } else await page.evaluate(([id, L]) => window.__solve.correct(id, L), [id, L]);
    } else {
      await page.evaluate(([id, L]) => window.__solve.correct(id, L), [id, L]);
    }
    if (i < 5) await page.waitForFunction((n) => window.__pmCore.b100.n === n + 1, i, { timeout: 8000 });
  }
  await page.waitForSelector('.end', { timeout: 8000 });
  const after = await page.evaluate(() => window.__pm.state.shoes);
  ok(after - before === 5, `${id} L${L} (${mode}): Runde fertig, +5 Hufeisen (${after - before})`);
  if (mode === 'correct') {
    const stats = await page.evaluate((tys) => tys.map((t) => window.__pm.state.stats[t]), [...types]);
    ok(stats.every((s) => s && s.n >= 1 && s.ok >= 1), `${id} L${L}: Statistik gezählt (${[...types].join(',')})`);
  }
}

(async () => {
  const b = await (which === 'chromium' ? chromium : webkit).launch();
  for (const [w, hh] of VPS) {
    console.log(`\n== ${which} ${w}x${hh} (bis 100) ==`);
    const ctx = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    await ctx.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (f, d, ...a) => st(f, Math.min(d || 0, 40), ...a); localStorage.setItem('pferde-mathe-seen', '1'); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
    await page.goto(URL); await page.waitForTimeout(500);
    await page.evaluate(SOLVER);
    const GAMES = await page.evaluate(() => window.__pmCore.GAMES.filter((g) => g.b100).map((g) => [g.id, g.maxLevel]));
    ok(GAMES.length === 7, `7 neue Spiele registriert (${GAMES.map((g) => g[0])})`);
    // Startseite: zweite Gruppe
    ok(await page.evaluate(() => document.querySelectorAll('#tiles100 .tile').length) === 7, 'Startseite: 7 Kacheln „Zahlenraum bis 100“');
    for (const [id, max] of GAMES) {
      if (only && !only.includes(id)) continue;
      for (let L = 1; L <= max; L++) {
        for (const mode of ['correct', 'wrong']) {
          try { await playRound(page, id, L, mode); } catch (e) { fails++; console.log(`  ✘ ${id} L${L} ${mode}: ${e.message.split('\n')[0]}`); }
          // Touch-Größen
          if (mode === 'correct' && L === 1) {
            await page.evaluate((id) => window.__pm.startGame(id, { level: 1 }), id);
            await page.waitForSelector('#stage'); await page.waitForTimeout(150);
            const small = await page.evaluate(() => [...document.querySelectorAll('.game button')].filter((b) => !b.classList.contains('hf-cell') && !b.classList.contains('nl-tick')).map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0 && (r.width < 44 || r.height < 44)).length);
            ok(small === 0, `${id}: alle Knöpfe ≥ 44 px (zu klein: ${small})`);
            const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
            ok(!over, `${id}: kein horizontales Überlaufen`);
          }
        }
      }
    }
    // Elternbereich zeigt neue Spiele
    await page.evaluate(() => window.__pm.showParent()); await page.waitForTimeout(200);
    const txt = await page.evaluate(() => document.body.innerText);
    ok(/Hunderterfeld/.test(txt) && /Plus und Minus bis 100/.test(txt) && /Zahlen ordnen/.test(txt), 'Elternbereich: Stufen der neuen Spiele sichtbar');
    if (!only) ok(/Plus mit Übergang/.test(txt), 'Elternbereich: Aufgabentypen der neuen Spiele sichtbar'); else ok(/Zahl finden bis 50/.test(txt), 'Elternbereich: Aufgabentypen sichtbar');
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(`\n${oks} ok, ${fails} Fehler`);
  process.exit(fails ? 1 : 0);
})();
