// E2E: Welt 6 "Zauberwald der Hundert": Sprung per Elternbereich, echte Station spielen, Tor, Geschenk, Rucksack.
const fs = require('fs');
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const SOLVER = fs.readFileSync(__dirname + '/test-bis100.js', 'utf8').match(/const SOLVER = `([\s\S]*?)`;/)[1];
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const st = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__pm.state)));
async function solveRound(p, id) {
  for (let i = 1; i <= 5; i++) {
    await p.waitForFunction((n) => window.__pmCore.b100.cur && window.__pmCore.b100.n === n, i, { timeout: 8000 });
    await sleep(500); // Eingabe erst nach kurzer Pause sicher bereit (unter Last sonst flackerig)
    for (let t = 0; t < 3; t++) {
      await p.evaluate(([id]) => { if (window.__pmCore.b100.cur) window.__solve.correct(id, 1); }, [id]);
      if (i === 5) break;
      try { await p.waitForFunction((n) => window.__pmCore.b100.n === n + 1, i, { timeout: 4000 }); break; } catch (e) { if (t === 2) throw e; }
    }
  }
}
(async () => {
  const browser = await pw.webkit.launch();
  for (const [W, H] of [[1024, 768], [768, 1024], [820, 1180], [1180, 820]]) {
    console.log(`\n== webkit ${W}x${H} ==`);
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: false, locale: 'de-DE', userAgent: UA });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE); await p.waitForSelector('#advTile');
    await p.evaluate(() => { const s = window.__pm.state; s.setupSeen = true; s.riderAsked = true; window.__pm.save(); });
    await p.evaluate(SOLVER);
    await p.evaluate(() => window.__pm.showParent()); await p.waitForSelector('#advPanel');
    await p.click('[data-jump="5"]'); await p.waitForSelector('#advPanel');
    let s = await st(p);
    ok(s.adv.done['4-5'] && !s.adv.done['5-0'], 'Eltern: Sprung zu Welt 6 (Welten 1–5 als geschafft markiert)');
    await p.evaluate(() => window.__pm.showHome()); await p.waitForSelector('#advTile');
    ok(/Welt 6/.test(await p.textContent('#advTile')) && /Zauberwald/.test(await p.textContent('#advTile')), 'Startseite: Abenteuer-Kachel zeigt Welt 6 Zauberwald');
    await p.click('#advTile'); await p.waitForSelector('.map-screen'); await sleep(900);
    const nw = await p.evaluate(() => __pm.WORLDS.length), n6 = await p.evaluate(() => __pm.WORLDS[5].stations.length);
    ok(nw === 6 && n6 === 8, `6 Welten, Welt 6 hat ${n6} Stationen`);
    ok(await p.$eval('.station.current', (e) => e.dataset.w + '-' + e.dataset.i) === '5-0', 'Aktuelle Station: Welt 6, Station 1');
    if (W === 1024) await p.screenshot({ path: __dirname + '/../screenshots/welt6-karte.png' });
    await p.click('.station.current'); await p.waitForSelector('#stationGo'); await p.click('#stationGo'); await p.waitForSelector('#stage');
    await solveRound(p, 'h100');
    await p.waitForSelector('#stationReward', { timeout: 15000 });
    s = await st(p);
    ok(s.adv.done['5-0'] === true, 'Station 1 (Hunderterfeld) echt gespielt und geschafft');
    ok(/Glühkugel/i.test(await p.textContent('#stationReward')), 'Schatz: Glühkugel');
    await p.click('#rewardNext'); await p.waitForSelector('.map-screen');
    // Stationen 2–7 simulieren; Items vergeben wie im Spiel
    await p.evaluate(() => { const S = window.__pm.state; for (let i = 1; i < 7; i++) S.adv.done['5-' + i] = true; window.__pm.save(); window.__pm.showMap({ quiet: true }); });
    await sleep(500);
    await p.click('#bagBtn'); await p.waitForSelector('#bag'); await sleep(300);
    const bagTxt = await p.textContent('#bag');
    ok(/Glühkugel/.test(bagTxt), 'Rucksack zeigt Glühkugeln');
    await p.click('#bagClose'); await sleep(300);
    await p.click('.station.current'); await p.waitForSelector('.station-card.gatecard');
    ok(/3 von 3/.test(await p.textContent('.station-card')), 'Tor zeigt "3 von 3 Glühkugeln"');
    await p.click('#stationGo'); await p.waitForSelector('.gate-round #stage, .gate-round .stage');
    await solveRound(p, 'pm100');
    await p.waitForSelector('#worldDone', { timeout: 15000 });
    s = await st(p);
    ok(s.adv.done['5-7'] === true && s.owned.includes('zauberlaterne'), 'Hundert-Tor geschafft, Geschenk Zauberlaterne im Stall');
    if (W === 1024) await p.screenshot({ path: __dirname + '/../screenshots/welt6-geschafft.png' });
    await p.click('#worldNext, #worldHome, #worldDone button'); await sleep(2500);
    // Einhorn im Hofladen jetzt freischalten
    await p.evaluate(() => { __pm.core.S.shoes = 500; __pm.save(); __pm.showStable(); }); await p.waitForSelector('#laden'); await sleep(500);
    await p.click('#laden'); await p.click('[data-tab="pferde"]');
    ok(await p.$eval('[data-shop="sternschnuppe"] .lad-btn', (b) => b.dataset.state) === 'buy', 'Nach Welt 6: Einhorn Sternschnuppe im Hofladen kaufbar');
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${checks} Prüfungen, ${fails} Fehler`); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ABBRUCH', e.message.split('\n')[0]); process.exit(2); });
