// Jahreszeiten, Feste und bayerischer Pferdehof: alle Varianten laden ohne Fehler, Antippen reagiert
const { webkit } = require(process.env.PW_PATH || 'playwright');
const base = process.env.BASE || 'http://127.0.0.1:9518/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const STATE = { v: 1, setupSeen: true, riderAsked: true, shoes: 10, carrots: 2, owned: ['pony'] };
(async () => {
  const b = await webkit.launch();
  const sizes = [[1024, 768], [768, 1024], [820, 1180], [1180, 820]];
  const variants = [['spring', 'easter'], ['summer', 'birthday'], ['autumn', 'halloween'], ['autumn', 'none'], ['winter', 'advent'], ['winter', 'xmas']];
  for (const [w, hh] of sizes) {
    console.log(`== webkit ${w}x${hh} ==`);
    for (const [season, fest] of variants) {
      const ctx = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: true, reducedMotion: season === 'winter' && fest === 'xmas' ? 'reduce' : 'no-preference' });
      await ctx.addInitScript((st) => { localStorage.setItem('pferde-mathe-v1', JSON.stringify(st)); }, STATE);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(`${base}?season=${season}&fest=${fest}`); await p.waitForTimeout(400);
      await p.evaluate(() => window.__pm.showStable()); await p.waitForTimeout(700);
      const info = await p.evaluate(() => { const f = document.querySelector('.farm'); return { cls: f.className, house: !!f.querySelector('.house'), cows: f.querySelectorAll('.cow').length, mtn: !!f.querySelector('.mtn'), chapel: !!f.querySelector('.chapel'), maibaum: !!f.querySelector('.maibaum'), tractor: !!f.querySelector('.tractor'), parts: !!f.querySelector('.particles'), pumpkins: f.querySelectorAll('.pumpkin').length, eggs: f.querySelectorAll('.egg').length, xtree: !!f.querySelector('.xtree'), balloons: !!f.querySelector('.balloons') }; });
      const tag = `${season}/${fest}`;
      ok(info.cls.includes('season-' + season) && info.house && info.cows === 2 && info.mtn && info.chapel && info.maibaum && info.tractor, `${tag}: Voralpen-Kulisse komplett`);
      if (fest === 'halloween') ok(info.pumpkins === 3, `${tag}: drei lächelnde Kürbisse`);
      if (fest === 'easter') ok(info.eggs === 5, `${tag}: fünf Ostereier`);
      if (fest === 'xmas' || fest === 'advent') ok(info.xtree, `${tag}: Christbaum`);
      if (fest === 'birthday') ok(info.balloons, `${tag}: Luftballons`);
      if (season === 'winter' && fest === 'xmas') ok(!info.parts, `${tag}: Bewegung reduzieren → keine fallenden Flocken`);
      else if (season !== 'summer') ok(info.parts, `${tag}: sanfte Teilchen (Blüten/Blätter/Flocken)`);
      if (w === 1024 && fest !== 'easter') {
        await p.click('.cow[data-cow="0"]', { force: true }); await p.waitForTimeout(200);
        ok(await p.evaluate(() => document.querySelector('#farmSay').classList.contains('show')), `${tag}: Kuh antippen → Sprechblase`);
        await p.evaluate(() => { const w = document.querySelector('.house .hwin'); w.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
        ok(await p.evaluate(() => document.querySelector('.house .hwin').classList.contains('lit')), `${tag}: Fenster antippen → Licht`);
        await p.evaluate(() => document.querySelector('.tractor').dispatchEvent(new MouseEvent('click', { bubbles: true })));
      }
      if (fest === 'easter' && w === 1024) {
        for (const e of await p.$$('.egg')) await e.click({ force: true });
        await p.waitForTimeout(200);
        ok(await p.evaluate(() => document.querySelectorAll('.egg.got').length === 5), `${tag}: alle Eier gefunden`);
      }
      ok(errs.length === 0, `${tag}: keine JS-Fehler ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  // Ohne Parameter: echtes Datum (Oktober → Herbst)
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  await ctx.addInitScript((st) => { localStorage.setItem('pferde-mathe-v1', JSON.stringify(st)); }, STATE);
  const p = await ctx.newPage(); await p.goto(base); await p.waitForTimeout(400); await p.evaluate(() => window.__pm.showStable());
  const m = new Date().getMonth() + 1, exp = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  ok(await p.evaluate((e) => document.querySelector('.farm').classList.contains('season-' + e), exp), `Echtes Datum → Jahreszeit ${exp}`);
  await b.close();
  console.log(fails ? `${fails} Fehler` : 'Alle Jahreszeiten-Tests bestanden ✔'); process.exit(fails ? 1 : 0);
})();
