// Test: Rucksack-Knopf auf jeder Seite sichtbar (4 iPad-Größen, auch mit Safe-Area wie im Home-Bildschirm-Modus)
const pw = require(process.env.PW_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const STATE = { v: 1, sound: false, setupSeen: true, riderAsked: true, shoes: 20, totalShoes: 60, carrots: 3, owned: ['heu', 'pony'], pos: {}, skills: {}, adv: { done: { '0-0': true, '0-1': true, '0-2': true }, last: null } };
async function visible(p, label) {
  const r = await p.evaluate(() => {
    const b = document.querySelector('#bagBtn'); if (!b) return { err: 'fehlt' };
    const q = b.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: innerWidth, h: innerHeight, hit: !!(top && b.contains(top)), badge: document.querySelector('#bagBadge').textContent };
  });
  ok(!r.err && r.l >= 0 && r.t >= 0 && r.r <= r.w && r.b <= r.h && r.hit && r.r - r.l >= 44, `${label}: Rucksack sichtbar & antippbar (${r.err || Math.round(r.l) + ',' + Math.round(r.t) + ' Abzeichen ' + r.badge})`);
  return r;
}
(async () => {
  const b = await pw.webkit.launch();
  for (const safe of (process.env.QUICK ? [false] : [false, true])) for (const [W, H] of (process.env.QUICK ? [[1024, 768]] : [[1024, 768], [768, 1024], [820, 1180], [1180, 820]])) {
    console.log(`\n== webkit ${W}x${H}${safe ? ' (Home-Bildschirm: Safe-Area 24/20 px)' : ''} ==`);
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await p.waitForSelector('#advTile');
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), STATE);
    if (safe) await p.addInitScript((c) => { document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('link[rel=stylesheet]').forEach((l) => l.remove()); const st = document.createElement('style'); st.textContent = c.replace(/env\(safe-area-inset-top\)/g, '24px').replace(/env\(safe-area-inset-bottom\)/g, '20px').replace(/env\(safe-area-inset-(left|right)\)/g, '0px'); document.head.append(st); }); }, css);
    await p.reload(); await p.waitForSelector('#advTile'); await sleep(400);
    await visible(p, 'Startseite');
    const tag = `${W}x${H}${safe ? '-safe' : ''}`;
    if (!safe && W === 768) await p.screenshot({ path: '/tmp/shots/bag-home-768.png' });
    await p.evaluate(() => window.__pm.showMap()); await p.waitForSelector('.map-screen'); await sleep(900);
    const r = await visible(p, 'Karte');
    ok(r.badge === '3', 'Abzeichen zeigt 3 Sachen');
    if (W === 1024 && !safe) await p.screenshot({ path: '/tmp/shots/bag-map-1024.png' });
    await p.click('#bagBtn'); await p.waitForSelector('#bag'); await sleep(400);
    ok(/Rosentor/.test(await p.textContent('#bag [data-bag="blume"]')), 'Rucksack erklärt: Blumen sind für das Rosentor');
    if (W === 1024 && !safe) await p.screenshot({ path: '/tmp/shots/bag-open.png' });
    await p.click('#bagClose'); await sleep(400);
    await p.evaluate(() => window.__pm.openStation(0, 3)); await sleep(500);
    await p.click('.station-card .bigbtn.primary'); await p.waitForSelector('.stage'); await sleep(500);
    await visible(p, 'Station-Aufgabe');
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('.farm'); await sleep(900);
    await visible(p, 'Pferdehof');
    if (!safe && W === 820) await p.screenshot({ path: '/tmp/shots/bag-farm-820.png' });
    await p.evaluate(() => { const S = window.__pm.state; S.adv.done['0-3'] = true; window.__pm.save(); window.__pm.showStationReward(0, 3, false, { n: 5 }, null); }); await sleep(400);
    await visible(p, 'Schatz gefunden');
    await sleep(3000);
    ok(await p.textContent('#bagBadge') === '4', 'Schatz fliegt in den Rucksack → Abzeichen 4');
    // Tor: benutzte Sachen
    await p.evaluate(() => { const S = window.__pm.state; ['0-4', '0-5'].forEach((k) => { S.adv.done[k] = true; }); window.__pm.save(); window.__pm.showWorldDone(0, null); }); await sleep(600);
    ok(/benutzt 4 Blumen aus deinem Rucksack/.test(await p.textContent('#usedNote')), 'Weltende zeigt: „Du benutzt 4 Blumen aus deinem Rucksack“');
    await visible(p, 'Welt geschafft');
    if (W === 1024 && !safe) { await sleep(1600); await p.screenshot({ path: '/tmp/shots/bag-gate.png' }); }
    await p.evaluate(() => window.__pm.openBag()); await sleep(400);
    ok(/Am Tor benutzt/.test(await p.textContent('#bag [data-bag="blume"]')), 'Rucksack: Blumen als „Am Tor benutzt ✓“ markiert');
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? `\n${fails} FEHLER` : '\nAlle Rucksack-Tests bestanden ✔'); process.exit(fails ? 1 : 0);
})();
