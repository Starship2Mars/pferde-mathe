// node tools/screenshots.js  – erstellt die Screenshots in screenshots/ (neutral, ohne Namen)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STATE = { v: 1, setupSeen: true, shoes: 14, carrots: 3, totalShoes: 120, blanket: '#f7a8c4',
  owned: ['heu', 'blumen', 'trog', 'sattel', 'schleife', 'decke', 'kaetzchen', 'fohlen', 'wolke', 'regenbogen', 'schmetterlinge', 'huehner', 'hund', 'wetterfahne', 'pony', 'reitplatz', 'sonnenblumen'],
  skills: { rechnen: { level: 4, rounds: 6, recent: [] }, haeuser: { level: 2, rounds: 2, recent: [] }, familie: { level: 1, rounds: 1, recent: [] }, strahl: { level: 2, rounds: 1, recent: [] }, paare: { level: 2, rounds: 3, recent: [] } } };
(async () => {
  const b = await pw.webkit.launch();
  const mk = async (w, h, q) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true }); const p = await c.newPage(); await p.goto(BASE + (q || ''));
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), STATE); await p.reload(); await sleep(500); return [c, p]; };
  let [c, p] = await mk(1024, 768);
  await p.screenshot({ path: 'screenshots/01-start-1024x768.png' });
  await c.close();
  [c, p] = await mk(820, 1180);
  await p.click('.tile[data-game="rechnen"]'); await sleep(500);
  for (let i = 0; i < 30; i++) { const t = await p.textContent('.eq'); const m = t.match(/(\d+) \+ (\d+)/); if (m && +m[1] + +m[2] > 10 && +m[1] < 10) break; await p.evaluate(() => window.__pm.startGame('rechnen')); await sleep(300); }
  await p.click('.softbtn'); await sleep(6000);
  await p.screenshot({ path: 'screenshots/02-plus-minus-zehneruebergang-820x1180.png' });
  await c.close();
  for (const [w, h, mood, name, shop] of [[1024, 768, 'day', '03-pferdehof-tag-1024x768', false], [820, 1180, 'evening', '04-pferdehof-abend-820x1180', false], [1180, 820, 'day', '05-pferdehof-laden-1180x820', true], [768, 1024, 'day', '06-pferdehof-tag-768x1024', false]]) {
    [c, p] = await mk(w, h, '?mood=' + mood);
    await p.click('.tile[data-game="stall"]'); await sleep(1800);
    if (shop) { await p.click('#shopBtn'); await sleep(800); }
    else { await p.click('.item[data-id="luna"]'); await sleep(250); }
    await p.screenshot({ path: `screenshots/${name}.png` });
    await c.close();
  }
  await b.close(); console.log('screenshots ok');
})();
