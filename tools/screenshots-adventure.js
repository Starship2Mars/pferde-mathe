// node tools/screenshots-adventure.js – Screenshots der Abenteuer-Reise (neutral, ohne Namen)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = { v: 1, setupSeen: true, shoes: 23, carrots: 6, totalShoes: 80, owned: ['heu', 'blumen', 'sattel', 'schleife'],
  skills: { rechnen: { level: 3, rounds: 6, recent: [] }, haeuser: { level: 2, rounds: 2, recent: [] }, familie: { level: 2, rounds: 1, recent: [] }, strahl: { level: 2, rounds: 1, recent: [] }, paare: { level: 2, rounds: 3, recent: [] } } };
const done = (list) => Object.fromEntries(list.map((k) => [k, true]));
(async () => {
  const b = await pw.webkit.launch();
  const mk = async (w, h, adv) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true }); const p = await c.newPage(); await p.goto(BASE);
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), Object.assign({}, base, { adv })); await p.reload(); await sleep(400); return [c, p]; };
  const w1 = ['0-0', '0-1', '0-2'];
  const all1 = ['0-0', '0-1', '0-2', '0-3', '0-4', '0-5'];
  let [c, p] = await mk(1024, 768, { done: done(w1), last: null });
  await p.click('#advTile'); await sleep(2200);
  await p.screenshot({ path: 'screenshots/07-abenteuer-karte-blumenwiese-1024x768.png' });
  await p.click('.station.current'); await sleep(900);
  await p.screenshot({ path: 'screenshots/09-abenteuer-station-karte-1024x768.png' });
  await p.click('#stationGo'); await sleep(1500);
  await p.screenshot({ path: 'screenshots/10-abenteuer-station-aufgabe-1024x768.png' });
  await c.close();
  [c, p] = await mk(820, 1180, { done: done(all1.concat(['1-0', '1-1', '1-2'])), last: null });
  await p.click('#advTile'); await sleep(2200);
  await p.screenshot({ path: 'screenshots/08-abenteuer-karte-apfelgarten-820x1180.png' });
  await p.click('#bagBtn'); await sleep(900);
  await p.screenshot({ path: 'screenshots/12-abenteuer-rucksack-820x1180.png' });
  await c.close();
  [c, p] = await mk(1180, 820, { done: done(all1), last: null });
  await p.evaluate(() => window.__pm.showWorldDone(0, null)); await sleep(2600);
  await p.screenshot({ path: 'screenshots/11-abenteuer-welt-geschafft-1180x820.png' });
  await p.click('#worldNext'); await sleep(1500);
  await p.screenshot({ path: 'screenshots/13-abenteuer-reise-1180x820.png' });
  await c.close();
  [c, p] = await mk(768, 1024, { done: done(all1.concat(['1-0', '1-1', '1-2', '1-3', '1-4', '1-5', '2-0', '2-1', '2-2', '2-3', '2-4', '2-5', '3-0', '3-1', '3-2', '3-3', '3-4', '3-5', '4-0', '4-1'])), last: null });
  await p.evaluate(() => window.__pm.showMap({ world: 4, quiet: true })); await sleep(1500);
  await p.screenshot({ path: 'screenshots/14-abenteuer-karte-maerchenschloss-768x1024.png' });
  await c.close();
  await b.close(); console.log('adventure screenshots ok');
})();
