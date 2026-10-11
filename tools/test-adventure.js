// E2E-Test der Abenteuer-Reise: node tools/test-adventure.js  (lokaler Server nötig, URL per Umgebungsvariable URL)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const { solveAny } = require('./solvers.js')(ok);
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const st = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__pm.state)));
async function box(p, sel) { const e = await p.$(sel); return e ? e.boundingBox() : null; }
async function openMap(p) { await p.click('#advTile'); await p.waitForSelector('.map-screen'); await sleep(600); }

(async () => {
  const browser = await pw.webkit.launch();
  const vps = [[1024, 768], [768, 1024], [820, 1180], [1180, 820]];
  for (let v = 0; v < vps.length; v++) {
    const [W, H] = vps[v];
    console.log(`\n== webkit ${W}x${H} ==`);
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, locale: 'de-DE', userAgent: UA });
    await ctx.addInitScript(() => { try { const k = 'pferde-mathe-v1', s = JSON.parse(localStorage.getItem(k) || 'null'); if (s && !s.riderAsked) { s.riderAsked = true; localStorage.setItem(k, JSON.stringify(s)); } window.__noRiderPrompt = true; } catch (e) {} });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('request', (r) => { if (!r.url().startsWith(new URL(BASE).origin)) errs.push('externe Anfrage: ' + r.url()); });
    await p.goto(BASE);
    await p.waitForSelector('#advTile');
    ok(/Welt 1/.test(await p.textContent('#advTile')), 'Startseite: Abenteuer-Kachel zeigt Welt 1');
    await openMap(p);
    ok((await p.$$('.wpanel')).length === 5, 'Karte: 5 Welten');
    ok((await p.$$('.station')).length === 30, 'Karte: 30 Stationen');
    ok((await p.$$('.mist')).length === 4, 'Karte: 4 Welten noch hinter sanften Wolken');
    ok(!(await p.$('.topbar')), 'Karte im Vollbild');
    const hb = await box(p, '#mapHorse'), sb = await box(p, '.station.current');
    ok(hb && sb && hb.x >= -5 && hb.y >= 0 && hb.x + hb.width <= W + 5 && sb.y + sb.height <= H, 'Pferd und aktuelle Station sichtbar');
    ok(await p.$eval('.station.current', (e) => e.dataset.w + '-' + e.dataset.i) === '0-0', 'Aktuelle Station: Welt 1, Station 1');
    const mistBg = await p.$eval('.mist', (e) => getComputedStyle(e).backgroundImage);
    ok(!/rgba?\((\d{1,2}|1[0-9]{2}), /.test(mistBg), 'Nebel ist hell (kein Dunkel)');
    // zukünftige Station antippen → nur freundlicher Hinweis
    await p.click('.station[data-w="0"][data-i="2"]'); await sleep(400);
    ok(!(await p.$('.sheet')) && /leuchtenden Kreis/.test(await p.textContent('#mapSay')), 'Spätere Station: sanfter Hinweis statt Sperre');
    // Station 1 spielen
    await p.click('.station.current'); await p.waitForSelector('.station-card'); await sleep(400);
    ok(/Belohnung/.test(await p.textContent('.station-card')), 'Stationskarte zeigt Belohnung');
    const s0 = await st(p);
    await p.click('#stationGo'); await p.waitForSelector('.stage');
    ok(/Biene/.test(await p.textContent('.topbar .title')), 'Station startet ein Spiel (Titel: Stationsname)');
    ok(/🗺️/.test(await p.textContent('#homeBtn')), 'Zurück-Knopf führt zur Karte');
    const g = await solveAny(p);
    await p.waitForSelector('#stationReward', { timeout: 15000 });
    const s1 = await st(p);
    ok(s1.adv.done['0-0'] === true, `Station geschafft (${g})`);
    ok(s1.shoes - s0.shoes === 5 && s1.carrots - s0.carrots === 1, 'Hufeisen (+5) und Karotte (+1) wie gewohnt');
    ok(/Blume/.test(await p.textContent('#stationReward')), 'Schatz gefunden: Blume');
    await p.click('#rewardNext'); await p.waitForSelector('.map-screen'); await sleep(2300);
    const h2 = await box(p, '#mapHorse'), s2 = await box(p, '.station[data-w="0"][data-i="1"]');
    ok(Math.abs((h2.x + h2.width / 2) - (s2.x + s2.width / 2)) < 12, 'Pferd ist zur nächsten Station gelaufen');
    ok(!!(await p.$('.station[data-w="0"][data-i="0"].done .sstar')), 'Geschaffte Station hat einen Stern');
    await p.click('#bagBtn'); await p.waitForSelector('#bag'); await sleep(400);
    ok((await p.$$('#bag .bag-item:not(.empty)')).length === 1, 'Rucksack zeigt die gefundene Blume');
    await p.click('#bagClose'); await sleep(400);
    // Neu laden → Fortschritt bleibt
    await p.reload(); await p.waitForSelector('#advTile'); await openMap(p);
    ok(await p.$eval('.station.current', (e) => e.dataset.w + '-' + e.dataset.i) === '0-1', 'Nach Neuladen: Fortschritt erhalten (Station 2)');
    // Stationen 2–5 als geschafft simulieren, dann die Tor-Aufgabe spielen
    await p.evaluate(() => { const S = window.__pm.state; for (let i = 1; i < 5; i++) S.adv.done['0-' + i] = true; window.__pm.save(); window.__pm.showMap({ quiet: true }); });
    await sleep(500);
    await p.click('.station.current'); await p.waitForSelector('.station-card.gatecard');
    ok(/4 von 4 Blumen/.test(await p.textContent('.station-card')), 'Tor: zeigt die gesammelten Blumen (4 von 4)');
    const lvl = (await st(p)).skills.rechnen.level;
    await p.click('#stationGo'); await p.waitForSelector('.gate-round .stage');
    await solveAny(p);
    await p.waitForSelector('#worldDone', { timeout: 15000 });
    const s3 = await st(p);
    ok(s3.lastRound.level === Math.min(6, lvl + 1), `Tor-Aufgabe eine Stufe schwerer (Stufe ${s3.lastRound.level} statt ${lvl})`);
    ok((await p.$$('#worldDone .confetti i')).length >= 30, 'Welt geschafft: Konfetti-Feier');
    if (v === 0) await p.screenshot({ path: '/tmp/shots/worlddone.png' });
    ok(s3.adv.done['0-5'] === true, 'Rosentor geschafft');
    await p.click('#worldNext'); await p.waitForSelector('#travel');
    ok(/Apfelgarten/.test(await p.textContent('#travel')), 'Reise-Szene zur neuen Welt');
    await p.waitForSelector('.map-screen', { timeout: 6000 }); await sleep(3000);
    const sl = await p.$eval('#mapScroll', (e) => Math.round(e.scrollLeft / e.clientWidth));
    ok(sl === 1, 'Karte zeigt Welt 2');
    ok((await p.$$('.mist')).length === 3, 'Nebel über Welt 2 ist verschwunden');
    ok(await p.$eval('.station.current', (e) => e.dataset.w + '-' + e.dataset.i) === '1-0', 'Welt 2 freigeschaltet, Station 1 ist dran');
    ok(!!(await p.$('.wpanel[data-world="1"] #mapHorse')), 'Pferd steht in Welt 2');
    await p.reload(); await p.waitForSelector('#advTile');
    ok(/Welt 2/.test(await p.textContent('#advTile')), 'Nach Neuladen: Welt 2 bleibt offen');
    if (v === 0) {
      // Elternbereich: springen
      await p.evaluate(() => window.__pm.showParent()); await p.waitForSelector('#advPanel');
      await p.click('[data-jump="4"]'); await p.waitForSelector('#advPanel');
      const s4 = await st(p);
      ok(s4.adv.done['3-5'] && !s4.adv.done['4-0'] && s4.owned.includes('ziege'), 'Eltern: zu Welt 5 springen (Geschenke aus früheren Welten im Stall)');
      // Zehner-Station
      await p.evaluate(() => { window.__pm.state.adv.done['4-0'] = true; window.__pm.save(); window.__pm.showMap({ quiet: true }); }); await sleep(500);
      await p.click('.station.current'); await p.waitForSelector('#stationGo'); await p.click('#stationGo'); await p.waitForSelector('.game-zehner');
      ok((await p.$$('.rods .rod')).length > 0, 'Zehnerzahlen: Perlenstäbe sichtbar');
      if (v === 0) await p.screenshot({ path: '/tmp/shots/station-zehner.png' });
      await solveAny(p); await p.waitForSelector('#stationReward', { timeout: 15000 });
      ok((await st(p)).adv.done['4-1'], 'Zehnerzahlen-Station geschafft');
      // Pferdehof als Basis
      await p.click('#rewardNext'); await p.waitForSelector('.map-screen'); await sleep(500);
      await p.click('#farmBtn'); await p.waitForSelector('.farm');
      ok(!!(await p.$('.item[data-id="ziege"]')), 'Pferdehof: Ziege Zenzi wohnt jetzt dort');
      ok(/🗺️/.test(await p.textContent('#homeBtn')), 'Pferdehof: Zurück führt zur Karte');
      await p.click('#homeBtn'); await p.waitForSelector('.map-screen');
      ok(true, 'Zurück vom Pferdehof auf die Karte');
      // Offline
      await p.goto(BASE); await p.evaluate(() => navigator.serviceWorker.ready); await sleep(800);
      await ctx.setOffline(true);
      await p.reload(); await p.waitForSelector('#advTile', { timeout: 8000 }); await openMap(p);
      ok((await p.$$('.station')).length === 30, 'Offline: Karte lädt aus dem Cache');
      await ctx.setOffline(false);
    }
    ok(errs.length === 0, 'Keine JS-Fehler / keine externen Anfragen' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await ctx.close();
  }
  // Migration: alter Spielstand (vor dem Abenteuer-Update)
  console.log('\n== Migration alter Spielstand ==');
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, userAgent: UA });
  await ctx.addInitScript(() => { try { const k = 'pferde-mathe-v1', s = JSON.parse(localStorage.getItem(k) || 'null'); if (s && !s.riderAsked) { s.riderAsked = true; localStorage.setItem(k, JSON.stringify(s)); } window.__noRiderPrompt = true; } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto(BASE); await p.waitForSelector('#advTile');
  await p.evaluate(() => {
    const old = { v: 1, sound: true, volume: 0.7, shoes: 42, totalShoes: 97, carrots: 9, fed: 3, owned: ['heu', 'sattel', 'pony'], placed: {}, horseNames: { luna: 'Stern' },
      skills: { paare: { level: 2, rounds: 4, recent: [] }, haeuser: { level: 3, rounds: 5, recent: [] }, rechnen: { level: 4, rounds: 9, recent: [true] }, familie: { level: 2, rounds: 2, recent: [] }, strahl: { level: 2, rounds: 3, recent: [] } },
      stats: { plus10: { n: 10, ok: 9, hints: 1 } }, trouble: [], childName: 'Testkind', bday: null, setupSeen: true };
    localStorage.setItem('pferde-mathe-v1', JSON.stringify(old));
  });
  await p.reload(); await p.waitForSelector('#advTile');
  const m = await st(p);
  ok(m.shoes === 42 && m.carrots === 9 && m.owned.length === 3 && m.skills.rechnen.level === 4 && m.horseNames.luna === 'Stern' && m.childName === 'Testkind', 'Alter Spielstand bleibt komplett erhalten');
  ok(m.skills.zehner && m.skills.zehner.level === 1 && m.adv && Object.keys(m.adv.done).length === 0, 'Neue Felder (Abenteuer, Zehnerzahlen) ergänzt');
  await openMap(p);
  await ctx.close();
  await browser.close();
  console.log(fails ? `\n${fails} FEHLER` : '\nAlle Abenteuer-Tests bestanden ✔');
  process.exit(fails ? 1 : 0);
})();
