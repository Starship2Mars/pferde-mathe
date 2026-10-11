// Test der Pferdehof-Reparatur: Pferd hinter der Scheune / ungültige Positionen; Spielstand muss erhalten bleiben.
// node tools/test-farmfix.js   (URL per Umgebungsvariable)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const BUG = { v: 1, sound: false, volume: 0.5, setupSeen: true, childName: 'Testkind', bday: { d: 5, m: 3 }, shoes: 37, totalShoes: 212, carrots: 11, fed: 8, brushed: 4,
  owned: ['heu', 'blumen', 'sattel', 'schleife', 'decke', 'pony', 'fohlen', 'wolke', 'nacht', 'ziege', 'kaetzchen'], blanket: '#d6c2f2', barnOpen: false,
  horseNames: { luna: 'Sternchen', pony: 'Keksi' },
  pos: { luna: { x: 20, y: 56 }, pony: { x: 14, y: 60 }, wolke: { x: 'NaN', y: null }, fohlen: { x: 150, y: -20 }, nacht: { x: 30, y: 62 }, heu: { x: 22, y: 58 }, kaetzchen: { x: 60, y: 80 } },
  skills: { paare: { level: 3, rounds: 9, recent: [true] }, haeuser: { level: 4, rounds: 7, recent: [] }, rechnen: { level: 5, rounds: 14, recent: [true, false] }, familie: { level: 3, rounds: 4, recent: [] }, strahl: { level: 3, rounds: 5, recent: [] }, zehner: { level: 1, rounds: 1, recent: [] } },
  stats: { plus10: { n: 20, ok: 18, hints: 2 } }, trouble: [{ t: 'plusZU', l: '8 + 5', d: 1 }],
  adv: { done: { '0-0': true, '0-1': true, '0-2': true, '0-3': true, '0-4': true, '0-5': true, '1-0': true, '1-1': true }, last: { w: 1, i: 1, at: 1 } } };
const strip = (s) => { const c = JSON.parse(JSON.stringify(s)); delete c.pos; return c; };
(async () => {
  const b = await pw.webkit.launch();
  for (const [W, H] of [[1024, 768], [768, 1024], [820, 1180], [1180, 820]]) {
    console.log(`\n== webkit ${W}x${H} ==`);
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await p.waitForSelector('#advTile');
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), BUG);
    const before = await p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
    await p.reload(); await p.waitForSelector('#advTile');
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('.item[data-id="luna"]'); await sleep(2800);
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
    const sb = strip(before), sa = strip(after);
    const diff = Object.keys(sb).filter((k) => JSON.stringify(sb[k]) !== JSON.stringify(sa[k]));
    ok(diff.length === 0, 'Alle gespeicherten Felder außer Positionen unverändert' + (diff.length ? ': ' + diff.join(',') : ''));
    if (W === 1024) { console.log('    vorher pos:', JSON.stringify(before.pos)); console.log('    nachher pos:', JSON.stringify(after.pos)); }
    ok(JSON.stringify(after.pos.kaetzchen) === JSON.stringify(before.pos.kaetzchen), 'Gültige Position (Kätzchen) bleibt, wo sie war');
    const vis = await p.evaluate(() => [...document.querySelectorAll('.item.horse-item')].map((e) => { const r = e.getBoundingClientRect();
      const n = [[.5, .45], [.35, .6], [.65, .6], [.5, .75]].filter(([fx, fy]) => { const h = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); return h && e.contains(h); }).length;
      return [e.dataset.id, n, r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight]; }));
    ok(vis.length === 5, 'Alle 5 Pferde sind auf dem Hof: ' + vis.map((v) => v[0]).join(', '));
    ok(vis.every((v) => v[1] >= 1 && v[2]), 'Alle Pferde sichtbar und antippbar: ' + JSON.stringify(vis));
    // erneut auf die Scheune ziehen → trabt heraus
    const lb = await (await p.$('.item[data-id="luna"]')).boundingBox(); const bb = await (await p.$('#barn')).boundingBox();
    await p.mouse.move(lb.x + lb.width / 2, lb.y + lb.height * 0.6); await p.mouse.down();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height * 0.5, { steps: 15 }); await p.mouse.up(); await sleep(2000);
    const lv = await p.evaluate(() => { const e = document.querySelector('.item[data-id="luna"]'); const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.55); return !!(h && e.contains(h)); });
    ok(lv, 'Pferd auf die Scheune gezogen → trabt wieder heraus und bleibt sichtbar');
    ok(/Scheune/.test(await p.textContent('#farmSay')), 'Freundlicher Satz: "' + (await p.textContent('#farmSay')).slice(0, 60) + '…"');
    // Scheune öffnen → „Alle Pferde rauslassen“
    await p.click('#barn', { position: { x: bb.width / 2, y: bb.height * 0.75 } }); await sleep(1200);
    ok(/Pferde/.test(await p.textContent('#farmSay')), 'Scheune öffnen: Pferde werden gerufen');
    await p.reload(); await p.waitForSelector('#advTile');
    const re = await p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
    ok(re.shoes === 37 && re.carrots === 11 && re.owned.length === 11 && re.horseNames.luna === 'Sternchen' && Object.keys(re.adv.done).length === 8 && re.skills.rechnen.level === 5, 'Nach Neuladen: Hufeisen 37, Karotten 11, 11 Sachen, Namen, 8 Sterne, Stufen erhalten');
    if (W === 1024) {
      await p.evaluate(() => window.__pm.showParent()); await p.waitForSelector('#tidyFarm'); await p.click('#tidyFarm');
      const t = await p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
      ok(Object.keys(t.pos).length === 0 && t.owned.length === 11 && t.shoes === 37, 'Eltern: „Pferdehof aufräumen“ setzt nur Positionen zurück');
    }
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} FEHLER` : '\nAlle Reparatur-Tests bestanden ✔'); process.exit(fails ? 1 : 0);
})();
