// E2E: Bauernhaus von innen (Stübchen), Stall von innen, Pferde/Tiere bleiben im Stall, Persistenz, Migration.
// node tools/test-haus-stall.js webkit   (URL per Umgebungsvariable; SHOTS=1 schreibt Screenshots)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const SHOTS = !!process.env.SHOTS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const SEED = { v: 1, rev: 3, sound: false, volume: 0.5, setupSeen: true, riderAsked: true, childName: 'Clara', shoes: 120, carrots: 5, totalShoes: 300,
  owned: ['pony', 'wolke', 'hund', 'kaetzchen', 'hase', 'r_sofa', 'r_lampe'], horseNames: { wolke: 'Schneeflocke' } };
const st = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
const shot = async (p, name, W, H) => { if (SHOTS) await p.screenshot({ path: `${__dirname}/../screenshots/${name}-${W}x${H}.png` }); };
const visible = (p, id) => p.evaluate((id) => { const e = document.querySelector(`.item[data-id="${id}"]`); if (!e) return false; const r = e.getBoundingClientRect();
  return [[.5, .45], [.35, .6], [.65, .6], [.5, .75]].some(([fx, fy]) => { const h = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); return h && e.contains(h); }); }, id);
async function dragTo(p, sel, target) {
  const a = await (await p.$(sel)).boundingBox(), b = await (await p.$(target)).boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height * 0.6); await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height * 0.7, { steps: 14 }); await p.mouse.up();
}
(async () => {
  const browser = await pw.webkit.launch();
  let first = true;
  for (const [W, H] of [[1024, 768], [768, 1024], [820, 1180], [1180, 820]]) {
    console.log(`\n== webkit ${W}x${H} ==`);
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: 'de-DE', userAgent: UA });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE); await p.waitForSelector('#advTile');
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), SEED);
    await p.reload(); await p.waitForSelector('#advTile');
    let s = await st(p);
    ok(Array.isArray(s.stall) || s.stall === undefined, 'Alter Spielstand ohne Stall-Feld lädt');
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('.item[data-id="wolke"]'); await sleep(1200);
    s = await p.evaluate(() => JSON.parse(JSON.stringify(window.__pm.state)));
    ok(Array.isArray(s.stall) && s.stall.length === 0, 'Migration: Stall ist leer, alle Tiere sind draußen auf dem Hof');
    ok(s.owned.length === 7 && s.shoes === 120 && s.horseNames.wolke === 'Schneeflocke', 'Migration: gekaufte Sachen, Hufeisen und Namen unverändert');
    ok(await visible(p, 'wolke') && await visible(p, 'pony') && await visible(p, 'hund'), 'Pferde und Hund sichtbar auf dem Hof');
    // Hinweise
    ok(await p.isVisible('#housePill') && await p.$('.house .door-glow') !== null, 'Bauernhaus: Tür-Glühen und kleines Schild "Stübchen"');
    ok(await p.isVisible('#stallPill'), 'Scheune: kleines Schild "Stall"');
    await shot(p, 'hof-haus-hinweis', W, H);

    // ---- Bauernhaus innen
    const hb = await (await p.$('.scen.house')).boundingBox(); await p.click('.scen.house', { position: { x: hb.width * 0.4, y: hb.height * 0.2 } }); await p.waitForSelector('#roomScene', { timeout: 8000 }); await sleep(900);
    s = await st(p);
    ok(s.houseSeen === true, 'Haus betreten: Tür-Schild verschwindet künftig');
    ok(await p.$$eval('.rm-item', (a) => a.length) === 2, 'Im Stübchen: gekauftes Sofa und Lampe sind zu sehen');
    await shot(p, 'haus-innen', W, H);
    const sofa = await (await p.$('.rm-item[data-room="sofa"]')).boundingBox();
    await p.mouse.move(sofa.x + sofa.width / 2, sofa.y + sofa.height / 2); await p.mouse.down();
    await p.mouse.move(sofa.x + sofa.width / 2 + 90, sofa.y + sofa.height / 2 - 12, { steps: 10 }); await p.mouse.up(); await sleep(300);
    s = await st(p);
    ok(s.room && s.room.pos && s.room.pos.sofa && Math.abs(s.room.pos.sofa.x - 30) > 3, 'Sofa im Stübchen verschoben und gespeichert');
    await p.click('#roomFarm'); await p.waitForSelector('#scene .item[data-id="wolke"]', { timeout: 8000 }); await sleep(900);
    ok(await p.$('#housePill') === null, 'Zurück auf dem Hof (Schild weg)');

    // ---- Pferd in den Stall ziehen
    await dragTo(p, '.item[data-id="wolke"]', '#barn'); await sleep(1500);
    s = await st(p);
    ok(s.stall.includes('wolke'), 'Schimmel auf die Scheune gezogen: im Stall gespeichert');
    ok(await p.$('.item[data-id="wolke"]') === null, 'Schimmel ist nicht mehr auf dem Hof');
    ok(/Stall/.test(await p.textContent('#farmSay')), 'Freundlicher Satz: "' + (await p.textContent('#farmSay')).slice(0, 50) + '…"');
    // Hund per Tippen: Knopf "In den Stall"
    await p.click('.item[data-id="hund"]'); await p.waitForSelector('[data-stall="hund"]'); await p.click('[data-stall="hund"]'); await sleep(1500);
    s = await st(p);
    ok(s.stall.includes('hund') && await p.$('.item[data-id="hund"]') === null, 'Hund per Knopf "In den Stall" hineingestellt');
    ok(/2 im Stall/.test(await p.textContent('#stallPill')), 'Schild an der Scheune zählt: ' + await p.textContent('#stallPill'));
    // bleibt drin (kein Wegrennen)
    const wait = first ? 62000 : 9000;
    await sleep(wait);
    s = await st(p);
    ok(s.stall.includes('wolke') && s.stall.includes('hund') && await p.$('.item[data-id="wolke"]') === null && await p.$('.item[data-id="hund"]') === null, `Nach ${Math.round(wait / 1000)} s sind beide noch im Stall und nicht auf dem Hof`);
    // Hof neu aufbauen: bleiben drin
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('#scene .item[data-id="pony"]'); await sleep(1500);
    ok(await p.$('.item[data-id="wolke"]') === null && await p.$('.item[data-id="hund"]') === null, 'Hof neu geöffnet: Stallbewohner bleiben im Stall');
    first = false;

    // ---- Stall innen
    await p.click('#barn', { position: { x: 200, y: 150 } }); await p.waitForSelector('#stallView', { timeout: 8000 }); await sleep(900);
    ok(await p.$('.st-card[data-box="wolke"]') !== null && await p.$('.st-card[data-box="hund"]') !== null, 'Stall innen: Schimmel und Hund sind zu sehen');
    ok(/Schneeflocke/.test(await p.textContent('.st-card[data-box="wolke"] .st-plate')), 'Namensschild des Pferdes: Schneeflocke');
    ok(await p.$('.st-card .st-pv.munch, .st-card .st-pv.sleep') !== null, 'Pferd hat Ruhe-Animation (kauen oder schlafen)');
    ok(/2 im Stall/.test(await p.textContent('#stallCount')), 'Zähler im Stall');
    await p.click('.st-card[data-box="wolke"] .st-pv'); await sleep(300);
    ok((await p.textContent('#stSay')).length > 5, 'Tippen auf das Pferd: freundliche Reaktion');
    const btns = await p.$$eval('.st-out,#stallBack', (a) => a.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
    ok(btns.every((v) => v >= 44), 'Stall-Knöpfe ≥ 44 px (' + btns.map(Math.round).join(',') + ')');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Kein horizontales Überlaufen');
    await shot(p, 'stall-innen', W, H);
    await p.click('[data-out="wolke"]'); await sleep(900);
    s = await st(p);
    ok(!s.stall.includes('wolke') && s.stall.includes('hund'), 'Schimmel herausgeholt, Hund bleibt drin');
    ok(s.pos.wolke && s.pos.wolke.x < 46 && s.pos.wolke.y >= 72, 'Schimmel steht am Scheunentor (' + JSON.stringify(s.pos.wolke) + ')');
    ok(await p.$('.st-card[data-box="wolke"]') === null, 'Karte des Schimmels ist aus dem Stall verschwunden');
    await p.click('#stallBack'); await p.waitForSelector('#scene .item[data-id="wolke"]', { timeout: 8000 }); await sleep(2800);
    ok(await visible(p, 'wolke') && await p.$('.item[data-id="hund"]') === null, 'Zurück auf dem Hof: Schimmel draußen und sichtbar, Hund noch drin');

    // ---- Persistenz
    await p.reload(); await p.waitForSelector('#advTile');
    s = await st(p);
    ok(s.stall.length === 1 && s.stall[0] === 'hund', 'Nach Neuladen: nur der Hund im Stall');
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('#scene .item[data-id="wolke"]'); await sleep(1500);
    ok(await p.$('.item[data-id="hund"]') === null && await visible(p, 'wolke'), 'Nach Neuladen: Hund nicht auf dem Hof, Schimmel da');
    await p.evaluate(() => window.__pm.showStall()); await p.waitForSelector('#stallView');
    ok(await p.$('.st-card[data-box="hund"]') !== null && await p.$$eval('.st-card', (a) => a.length) === 1, 'Nach Neuladen: Hund im Stall sichtbar');
    // alle rauslassen leeres Stall-Bild
    await p.click('[data-out="hund"]'); await sleep(900);
    ok(await p.$('#stallEmpty') !== null, 'Leerer Stall zeigt freundlichen Hinweis');
    await p.click('#stallBack'); await p.waitForSelector('#scene .item[data-id="hund"]', { timeout: 8000 }); await sleep(2800);
    ok(await visible(p, 'hund'), 'Hund wieder draußen und sichtbar');
    // Elternbereich: Hof aufräumen lässt alle aus dem Stall
    await p.evaluate(() => { window.__pm.state.stall = ['pony', 'hase']; window.__pm.save(); window.__pm.showParent(); });
    await p.waitForSelector('#tidyFarm'); await p.click('#tidyFarm'); await sleep(300);
    s = await st(p);
    ok(s.stall.length === 0 && Object.keys(s.pos).length === 0, 'Elternbereich "Pferdehof aufräumen": Stall leer, Positionen zurückgesetzt, Gekauftes bleibt (' + s.owned.length + ')');
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${checks} Prüfungen, ${fails} Fehler`); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ABBRUCH', e.message.split('\n')[0]); process.exit(2); });
