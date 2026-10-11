// Vollbild-Test des Pferdehofs: node tools/test-stable.js  (lokaler Server nötig, URL per Umgebungsvariable)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const START = { v: 1, setupSeen: true, riderAsked: true, shoes: 60, carrots: 4, owned: [] };
(async () => {
  const b = await pw.webkit.launch();
  for (const [w, hh] of [[1024, 768], [768, 1024], [820, 1180], [1180, 820]]) {
    for (const mood of ['day', 'evening']) {
      console.log(`\n== Pferdehof ${w}x${hh} (${mood}) ==`);
      const ctx = await b.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: mood === 'evening' && w === 768 ? 'reduce' : 'no-preference' });
      const p = await ctx.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await p.goto(BASE + '?mood=' + mood);
      await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), START);
      await p.reload(); await p.waitForSelector('.tile');
      await p.click('.tile[data-game="stall"]'); await p.waitForSelector('.farm');
      await sleep(400);
      const fr = await p.$eval('.farm', (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
      ok(fr[0] === 0 && fr[1] === 0 && Math.round(fr[2]) === w && Math.round(fr[3]) === hh, `Vollbild: Hof füllt ${fr[2]}x${fr[3]}`);
      ok(!(await p.$('.topbar')) && (await p.$eval('.farm', (e) => e.classList.contains(location.search.includes('evening') ? 'evening' : 'day'))), 'Keine Kopfzeile, Stimmung ' + mood);
      const back = await (await p.$('#homeBtn')).boundingBox();
      ok(back.width >= 44 && back.height >= 44 && back.x >= 0 && back.y >= 0 && back.width < 80, 'Kleiner Zurück-Knopf sichtbar');
      ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight)), 'Kein Scrollen/Überlaufen');
      // kaufen
      for (const id of ['heu', 'decke', 'wolke', 'pony', 'wetterfahne', 'regenbogen', 'kaetzchen']) {
        await p.click('#shopBtn'); await sleep(550);
        const dr = await (await p.$('#drawer')).boundingBox();
        if (id === 'heu') ok(dr.x >= -1 && dr.y >= -1 && dr.x + dr.width <= w + 1 && dr.y + dr.height <= hh + 1, 'Laden öffnet sich im Bild');
        const btn = await p.$(`[data-buy="${id}"]`);
        if (btn) { await btn.scrollIntoViewIfNeeded(); await btn.click(); await sleep(900); const wc = await p.$('#wardClose'); if (wc) { await wc.click(); await sleep(450); } } else { await p.click('#shopClose'); await sleep(450); }
      }
      const st = await p.evaluate(() => window.__pm.state);
      ok(st.owned.length === 7 && st.shoes === 60 - (3 + 6 + 12 + 10 + 8 + 10 + 6), 'Sieben Sachen gekauft: ' + st.owned.join(','));
      ok(await p.$('.barn .vane') !== null, 'Wetterfahne auf der Scheune');
      const items = await p.$$eval('.farm .item', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.id, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; }));
      ok(items.length === 6 && items.every((i) => i.cx > 0 && i.cx < innerWidthSafe(w) && i.cy > 0 && i.cy < hh), 'Alle Sachen im Bild: ' + items.map((i) => i.id).join(','));
      // Decke färben, Namen geben
      await p.click('#shopBtn'); await sleep(550);
      const sw = await p.$('.swatch[data-color="#b9e2a0"]'); await sw.scrollIntoViewIfNeeded(); await sw.click(); await sleep(300);
      const inp = await p.$('input[data-horse-name="wolke"]'); await inp.scrollIntoViewIfNeeded(); await inp.fill('Schneeflocke'); await inp.press('Enter'); await p.$eval('input[data-horse-name="wolke"]', (e) => e.blur()); await sleep(200);
      await p.click('#shopClose'); await sleep(500);
      ok(await p.$eval('.item[data-id="luna"] svg', (e) => e.innerHTML.includes('#b9e2a0')), 'Pferdedecke in neuer Farbe');
      // Interaktionen
      await p.click('.item[data-id="wolke"]'); await sleep(300);
      ok(/Schneeflocke/.test(await p.textContent('#farmSay')), 'Pferd antippen → reagiert mit Namen');
      await p.click('#barn'); await sleep(200);
      ok(await p.$('#barn.open') !== null, 'Scheunentor öffnet sich');
      const fed0 = (await p.evaluate(() => window.__pm.state)).fed || 0;
      const c = async (sel) => { const r = await (await p.$(sel)).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
      let [x0, y0] = await c('#toolCarrot'); let [x1, y1] = await c('.item[data-id="pony"]');
      await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 10 }); await p.mouse.up(); await sleep(300);
      ok((await p.evaluate(() => window.__pm.state.fed)) === fed0 + 1 && (await p.evaluate(() => window.__pm.state.carrots)) === 3, 'Karotte ans Pony verfüttert');
      [x0, y0] = await c('#toolBrush'); [x1, y1] = await c('.item[data-id="wolke"]');
      await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 6 });
      for (let i = 0; i < 30; i++) { await p.mouse.move(x1 + (i % 2 ? 25 : -25), y1, { steps: 2 }); await sleep(45); }
      await p.mouse.up(); await sleep(200);
      ok(await p.$('.item[data-id="wolke"].shiny') !== null, 'Bürsten → Schimmel glänzt');
      // verschieben
      [x0, y0] = await c('.item[data-id="heu"]');
      await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x0 + 90, y0 + 20, { steps: 8 }); await p.mouse.up(); await sleep(500);
      const pos = await p.evaluate(() => window.__pm.state.pos.heu);
      ok(pos && pos.x % 2 === 0 && pos.y % 2 === 0, 'Heu verschoben & eingerastet ' + JSON.stringify(pos));
      // Reload → alles bleibt
      await p.reload(); await p.waitForSelector('.tile'); await p.click('.tile[data-game="stall"]'); await p.waitForSelector('.farm'); await sleep(300);
      const s2 = await p.evaluate(() => window.__pm.state);
      const heuLeft = await p.$eval('.item[data-id="heu"]', (e) => e.style.left);
      ok(s2.owned.length === 7 && s2.horseNames.wolke === 'Schneeflocke' && s2.gear.luna.blanket === '#b9e2a0' && s2.barnOpen === true && heuLeft === pos.x + '%' && s2.fed === fed0 + 1,
        'Nach Reload: Sachen, Namen, Deckenfarbe, Tor, Positionen, Füttern erhalten');
      ok(await p.$('#barn.open') !== null && await p.$('.item[data-id="regenbogen"]') !== null, 'Hof nach Reload korrekt aufgebaut');
      if (mood === 'evening') ok((await p.$$('.farm .star')).length > 0, 'Abendstimmung: Sterne funkeln');
      await p.click('#homeBtn'); await p.waitForSelector('.tile');
      ok(errors.length === 0, 'Keine JS-Fehler ' + errors.join(' | '));
      await ctx.close();
    }
  }
  await b.close();
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE PFERDEHOF-TESTS OK');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
function innerWidthSafe(w) { return w; }
