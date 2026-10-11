// Test: Ausrüstung je Pferd (Decke/Sattel/Schleife …), Migration der alten globalen Deckenfarbe.
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const OLD = { v: 1, sound: false, setupSeen: true, riderAsked: true, shoes: 30, totalShoes: 90, carrots: 4, owned: ['heu', 'decke', 'sattel', 'schleife', 'pony', 'wolke'], blanket: '#d6c2f2',
  horseNames: { luna: 'Sternchen' }, pos: { pony: { x: 30, y: 86 }, wolke: { x: 70, y: 80 } }, adv: { done: { '0-0': true }, last: null },
  skills: { rechnen: { level: 3, rounds: 3, recent: [] } } };
const get = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
const svgHas = (p, id, c) => p.$eval(`.item[data-id="${id}"] svg`, (e, c) => e.innerHTML.includes(c), c);
(async () => {
  const b = await pw.webkit.launch();
  for (const [W, H] of [[1024, 768], [820, 1180]]) {
    console.log(`\n== webkit ${W}x${H} ==`);
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await p.waitForSelector('#advTile');
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), OLD);
    await p.reload(); await p.waitForSelector('#advTile');
    const m = await get(p);
    if (W === 1024) console.log('    vorher: blanket=' + OLD.blanket + ', gear=—   nachher: blanket=' + m.blanket + ', gear=' + JSON.stringify(m.gear));
    ok(m.gear && m.gear.luna.blanket === '#d6c2f2' && m.gear.luna.saddle && m.gear.luna.bow && !m.gear.pony, 'Migration: alte Decke (Farbe), Sattel, Schleife gehören dem Hauptpferd');
    ok(m.blanket === '#d6c2f2' && m.shoes === 30 && m.owned.length === 6 && m.horseNames.luna === 'Sternchen' && m.adv.done['0-0'], 'Alte Felder unverändert (blanket, Hufeisen, Sachen, Namen, Sterne)');
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('.item[data-id="pony"]'); await sleep(1500);
    ok(await svgHas(p, 'luna', '#d6c2f2') && !(await svgHas(p, 'pony', '#d6c2f2')), 'Hauptpferd trägt die alte Decke, Pony nicht');
    await p.click('.item[data-id="pony"]'); await p.waitForSelector('.dress-btn'); await p.click('.dress-btn [data-dress]'); await p.waitForSelector('#wardrobe'); await sleep(400);
    ok(await p.$('#wardrobe [data-wcolor]') === null && await p.$('#wardBuyBlanket') !== null, 'Pony hat noch keine eigene Decke → „Eigene Decke holen“');
    await p.click('#wardBuyBlanket'); await p.waitForSelector('#wardrobe [data-wcolor="#b9e2a0"]'); await sleep(400);
    ok((await get(p)).shoes === 24, 'Decke fürs Pony gekauft (−6 Hufeisen)');
    await p.click('#wardrobe [data-wcolor="#b9e2a0"]'); await sleep(200);
    await p.click('#wardrobe [data-gear="sattel"]'); await sleep(200);
    await p.click('#wardClose'); await sleep(500);
    ok(await svgHas(p, 'pony', '#b9e2a0') && await svgHas(p, 'luna', '#d6c2f2'), 'Pony bekommt eigene grüne Decke, Hauptpferd behält Lila');
    let g = (await get(p)).gear;
    ok(g.pony.saddle === true && g.luna.saddle === true, 'Sattel auch fürs Pony (Hauptpferd behält seinen)');
    // Laden: Decke noch einmal kaufen – diesmal für den Schimmel
    await p.click('#shopBtn'); await sleep(600);
    ok(await p.$('.wardrow[data-ward="wolke"] .swatch') === null, 'Schimmel hat noch keine Decke (keine Farbwahl)');
    await p.click('[data-buy="decke"]'); await p.waitForSelector('#wardrobe [data-wcolor="#ffd27a"]'); await sleep(400);
    await p.click('#wardrobe [data-wcolor="#ffd27a"]'); await sleep(200); await p.click('#wardClose'); await sleep(500);
    const s3 = await get(p);
    ok(s3.shoes === 18 && s3.gear.wolke.ownB && s3.gear.pony.ownB && s3.gear.luna.ownB, 'Zweite Decke gekauft (−6), jetzt hat jedes Pferd eine eigene');
    await p.click('#shopBtn'); await sleep(600);
    ok(await p.$('[data-buy="decke"]') === null, 'Laden: Decke erst wieder kaufbar, wenn ein neues Pferd kommt');
    await p.click('#shopClose'); await sleep(400);
    ok(await svgHas(p, 'wolke', '#ffd27a'), 'Im Laden: Schimmel bekommt gelbe Decke');
    await p.reload(); await p.waitForSelector('#advTile'); await p.evaluate(() => window.__pm.showStable()); await sleep(1200);
    ok(await svgHas(p, 'pony', '#b9e2a0') && await svgHas(p, 'wolke', '#ffd27a') && await svgHas(p, 'luna', '#d6c2f2'), 'Nach Neuladen: jede Decke beim richtigen Pferd');
    // Kauf mit mehreren Pferden → Auswahl
    await p.evaluate(() => { const S = window.__pm.state; S.owned = S.owned.filter((x) => x !== 'schleife'); S.gear.luna.bow = false; S.gear.pony.bow = false; S.shoes = 30; window.__pm.save(); window.__pm.showStable(); }); await sleep(1200);
    await p.click('#shopBtn'); await sleep(600); await p.click('[data-buy="schleife"]'); await p.waitForSelector('#pickHorse'); await sleep(400);
    ok((await p.$$('#pickHorse [data-pick]')).length === 3, 'Nach dem Kauf: Kind wählt, welches Pferd die Schleife bekommt (3 Pferde)');
    await p.click('#pickHorse [data-pick="wolke"]'); await sleep(800);
    g = (await get(p)).gear;
    ok(g.wolke.bow === true && !g.luna.bow, 'Schleife geht an den Schimmel, nicht automatisch ans Hauptpferd');
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.join('|'));
    if (W === 1024) { await p.click('.item[data-id="wolke"]'); await p.click('.dress-btn [data-dress]'); await sleep(700); await p.screenshot({ path: '/tmp/shots/wardrobe.png' }); }
    await ctx.close();
  }
  await b.close(); console.log(fails ? `\n${fails} FEHLER` : '\nAlle Ausrüstungs-Tests bestanden ✔'); process.exit(fails ? 1 : 0);
})();
