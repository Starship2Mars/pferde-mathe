// Test: Futter (Knochen, Körner, Leckerli), Hund spielt Fangen, Lesezeit der Sprechblasen
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const { solveAny } = require('./solvers.js')(ok);
const OLD = { v: 1, sound: false, setupSeen: true, riderAsked: true, shoes: 12, totalShoes: 50, carrots: 3, owned: ['heu', 'hund', 'huehner', 'kaetzchen'], horseNames: {}, pos: { hund: { x: 27, y: 99 } }, skills: {} };
const get = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
async function center(p, sel) { const b = await (await p.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }
async function drag(p, from, to) { const [x0, y0] = await center(p, from), [x1, y1] = await center(p, to); await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 12 }); await p.mouse.up(); await sleep(500); }
(async () => {
  const b = await pw.webkit.launch();
  for (const [W, H] of [[1024, 768], [768, 1024]]) {
    console.log(`\n== webkit ${W}x${H} ==`);
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await p.waitForSelector('#advTile');
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), OLD);
    await p.reload(); await p.waitForSelector('#advTile');
    let s = await get(p);
    ok(s.bones === 2 && s.grain === 2 && s.treats === 2 && s.carrots === 3 && s.shoes === 12, 'Alter Spielstand: Willkommensgeschenk je 2 Futter, Karotten/Hufeisen unverändert');
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('#tool-bones'); await sleep(1200);
    ok(!!(await p.$('#tool-grain')) && !!(await p.$('#tool-treats')), 'Futter-Werkzeuge nur für vorhandene Tiere (Hund, Hühner, Kätzchen)');
    await drag(p, '#tool-bones', '.item[data-id="hund"]');
    await drag(p, '#tool-grain', '.item[data-id="huehner"]');
    await drag(p, '#tool-treats', '.item[data-id="kaetzchen"]');
    s = await get(p);
    ok(s.bones === 1 && s.grain === 1 && s.treats === 1 && s.fedAnimals.hund === 1 && s.fedAnimals.huehner === 1 && s.fedAnimals.kaetzchen === 1, 'Hund, Hühner und Kätzchen gefüttert (Zähler −1)');
    ok(await p.textContent('#tool-bones .badge') === '1', 'Zähler im Stall aktualisiert');
    const before = await p.evaluate(() => ['hund', 'huehner'].map((id) => { const e = document.querySelector(`.item[data-id="${id}"]`); return e.style.left + '/' + e.style.top; }));
    await p.click('.item[data-id="hund"]'); await p.waitForSelector('#dogPlay'); await p.click('#dogPlay'); await sleep(2500);
    const mid = await p.evaluate(() => document.querySelector('.item[data-id="huehner"]').style.left);
    ok(mid !== before[1].split('/')[0], 'Fangen: Hühner flattern umher');
    if (W === 1024) await p.screenshot({ path: '/tmp/shots/dogplay.png' });
    await sleep(5500);
    const after = await p.evaluate(() => ['hund', 'huehner'].map((id) => { const e = document.querySelector(`.item[data-id="${id}"]`); return e.style.left + '/' + e.style.top; }));
    ok(JSON.stringify(after) === JSON.stringify(before), 'Danach sind alle wieder an ihrem Platz');
    ok(JSON.stringify((await get(p)).pos) === JSON.stringify(s.pos), 'Gespeicherte Positionen bleiben unverändert');
    // Sprechblase: Lesezeit und Antippen
    await p.click('.item[data-id="heu"]'); await sleep(300);
    ok(await p.$('#farmSay.show') !== null, 'Sprechblase sichtbar');
    await sleep(6000);
    ok(await p.$('#farmSay.show') !== null, 'Sprechblase nach 6 s noch sichtbar (früher 4,2 s)');
    await p.click('#farmSay'); await sleep(300);
    ok(await p.$('#farmSay.show') === null, 'Antippen schließt die Sprechblase');
    // Runde → Extra-Futter
    const s0 = await get(p);
    await p.evaluate(() => window.__pm.startGame('paare')); await p.waitForSelector('.stage'); await solveAny(p); await p.waitForSelector('.end', { timeout: 15000 });
    const s1 = await get(p);
    const gained = ['bones', 'grain', 'treats'].filter((k) => s1[k] === s0[k] + 1);
    ok(s1.carrots === s0.carrots + 1 && gained.length === 1, 'Runde: +1 Karotte und +1 Futter für ein Tier (' + gained + ')');
    ok(/Knochen|Körner|Leckerli/.test(await p.textContent('.end .loot')), 'Rundenende zeigt das Extra-Futter');
    if (W === 1024) {
      await p.evaluate(() => window.__pm.showParent()); await p.waitForSelector('#readRow');
      await p.click('[data-read="sehrlang"]'); ok((await get(p)).readTime === 'sehrlang', 'Eltern: Lesezeit einstellbar');
    }
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? `\n${fails} FEHLER` : '\nAlle Tier-Tests bestanden ✔'); process.exit(fails ? 1 : 0);
})();
