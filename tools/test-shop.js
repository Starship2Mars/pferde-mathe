// E2E: Hofladen, Pflege, Stübchen, Album, Mini-Spiele, Migration, Elternbereich, Offline.
// node tools/test-shop.js [webkit|chromium]   (Server nötig, URL per Umgebungsvariable)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const engine = process.argv[2] || 'webkit';
const SHOTS = process.env.SHOTS === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const VPS = [[1024, 768], [820, 1180], [1180, 820], [768, 1024]];
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const KEY = 'pferde-mathe-v1';

async function newPage(browser, vp, state, errors) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, hasTouch: false, locale: 'de-DE', userAgent: UA });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE); await p.waitForSelector('.tile');
  if (state) { await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, state]); await p.reload(); await p.waitForSelector('.tile'); }
  return { ctx, p };
}
const base = (o) => Object.assign({ v: 1, rev: 3, setupSeen: true, riderAsked: true, shoes: 3000, carrots: 40, owned: [], clothes: [] }, o || {});
const S = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__pm.state)));
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${__dirname}/../screenshots/${name}.png` }); };
const small = async (p, sel) => p.$$eval(sel, (els) => els.filter((e) => e.offsetParent && !e.disabled).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), (e.id || e.className || e.tagName).toString().slice(0, 30)]; }).filter((x) => x[1] < 44 || x[0] < 44));

(async () => {
  const browser = await pw[engine].launch();
  const errors = [];

  // ---------- Migration ----------
  console.log('\n== Migration alter Spielstand (Version 2.4) ==');
  {
    const old = { v: 1, childName: 'Clara', setupSeen: true, riderAsked: true, shoes: 77, carrots: 4, totalShoes: 120, owned: ['wolke', 'kaetzchen', 'brunnen_alt'], clothes: ['c_helm_rosa'], pos: { wolke: { x: 40, y: 50 } }, horseNames: { luna: 'Lunaa' }, skills: { paare: { level: 3, rounds: 9, recent: [] } }, stats: {}, trouble: [] };
    const { ctx, p } = await newPage(browser, VPS[0], null, errors);
    await p.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, old]);
    await p.reload(); await p.waitForSelector('.tile');
    const s = await S(p), raw = await p.evaluate((k) => localStorage.getItem(k + '-backup-2.4'), KEY);
    ok(s.shoes === 77 && s.carrots === 4 && s.totalShoes === 120, 'Hufeisen/Karotten unverändert');
    ok(['wolke', 'kaetzchen', 'brunnen_alt'].every((i) => s.owned.includes(i)) && s.clothes.includes('c_helm_rosa'), 'Gekaufte Sachen bleiben erhalten (auch unbekannte IDs)');
    ok(s.pos.wolke && s.pos.wolke.x === 40 && s.horseNames.luna === 'Lunaa' && s.skills.paare.level === 3 && s.childName === 'Clara', 'Positionen, Namen, Lernstand bleiben');
    ok(raw && JSON.parse(raw).shoes === 77 && !JSON.parse(raw).rev, 'Sicherung "backup-2.4" des alten Stands angelegt');
    ok(s.rev === 3 && !!s.room && !!s.minis && !!s.stickers && !!s.care && Object.keys(s.skills).length >= 12, 'Neue Felder ergänzt (rev 3, Stübchen, Sticker, Pflege, Mini-Spiele, neue Lernspiele)');
    await p.evaluate(() => window.__pm.showStable()); await sleep(500);
    await p.click('#laden'); await p.waitForSelector('#laden .lad-card');
    await p.click('[data-tab="pferde"]');
    ok(await p.$eval('[data-shop="wolke"] .lad-btn', (b) => b.dataset.state) === 'own', 'Alt gekauftes Pferd zeigt im neuen Hofladen "Hast du"');
    await ctx.close();
  }

  for (const vp of VPS) {
    console.log(`\n== ${engine} ${vp[0]}x${vp[1]} ==`);
    const tag = vp[0] + 'x' + vp[1];
    const { ctx, p } = await newPage(browser, vp, base(), errors);
    p.setDefaultTimeout(8000);
    const season = await p.evaluate(() => __pm.core.seasonNow());

    // Hofladen
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('#laden'); await sleep(500);
    await p.click('#laden'); await p.waitForSelector('#laden.lad .lad-card');
    const tabs = await p.$$eval('[data-tab]', (e) => e.map((x) => x.dataset.tab));
    ok(tabs.length >= 9, `Hofladen hat ${tabs.length} Reiter`);
    for (const t of tabs) { await p.click(`[data-tab="${t}"]`); await sleep(60); if ((await p.$$('.lad-card')).length === 0) ok(false, 'Reiter leer: ' + t); }
    ok(true, 'Alle Reiter öffnen sich und zeigen Karten');
    await p.click('[data-tab="pferde"]');
    const lockU = await p.$eval('[data-shop="sternschnuppe"] .lad-btn', (b) => b.dataset.state);
    ok(lockU === 'locked', 'Einhorn ist gesperrt, bis der Zauberwald geschafft ist');
    const tooSmall = await small(p, '#laden button');
    ok(tooSmall.length === 0, 'Hofladen: alle Knöpfe ≥ 44 px' + (tooSmall.length ? ' ' + JSON.stringify(tooSmall.slice(0, 4)) : ''));
    await shot(p, `shop-${tag}`);

    const buy = async (tab, id, confirm) => {
      await p.click(`[data-tab="${tab}"]`); const before = await S(p);
      const price = await p.evaluate((i) => __pm.core.shop.CAT.find((c) => c.id === i).price || 0, id);
      const car = await p.evaluate((i) => __pm.core.shop.CAT.find((c) => c.id === i).carrots || 0, id);
      await p.$eval(`[data-shopbuy="${id}"]`, (b) => b.scrollIntoView({ block: 'center' }));
      await p.click(`[data-shopbuy="${id}"]`);
      if (confirm === 'no') { await p.click('#confirmNo'); await sleep(200); const a = await S(p); return [before, a, price, car]; }
      if (price >= 25 || car >= 3) { await p.waitForSelector('#confirmYes'); await p.click('#confirmYes'); }
      await p.waitForSelector('.lad-cele'); const a = await S(p);
      await p.evaluate(() => { const b = document.querySelector('#moreShop'); b && b.click(); }); await sleep(250);
      return [before, a, price, car];
    };
    let r = await buy('pferde', 'funke', 'no');
    ok(r[1].shoes === r[0].shoes && !r[1].owned.includes('funke'), 'Bei "Nein" im Bestätigen wird nichts bezahlt');
    r = await buy('pferde', 'funke');
    ok(r[1].owned.includes('funke') && r[0].shoes - r[1].shoes === r[2], `Pferd Funke: ${r[2]} Hufeisen bezahlt, im Stall`);
    r = await buy('hof', 'brunnen');
    ok(r[1].owned.includes('brunnen') && r[1].pos.brunnen && r[0].shoes - r[1].shoes === r[2], 'Hof: Brunnen gekauft und auf dem Hof platziert');
    r = await buy('tiere', 'hase');
    ok(r[1].owned.includes('hase') && r[1].pos.hase, 'Tier: Hase gekauft und platziert');
    r = await buy('reiterin', 'c_halstuch_rot');
    const cid = await p.evaluate(() => __pm.core.shop.CAT.find((c) => c.id === 'c_halstuch_rot').cid);
    ok(r[1].clothes.includes(cid) && r[0].shoes - r[1].shoes === r[2], 'Reiterin: Halstuch gekauft (Kleiderschrank)');
    r = await buy('stuebchen', 'r_sofa');
    ok(r[1].owned.includes('r_sofa') && r[1].room.pos.sofa, 'Stübchen: Sofa gekauft und eingeräumt');
    r = await buy('pflege', 'care_flecht');
    ok(r[1].owned.includes('care_flecht'), 'Pflege: Flechtband gekauft');
    r = await buy('pferde', 'acc_kranz');
    ok(r[1].owned.includes('acc_kranz'), 'Schmuck: Blumenkranz gekauft');
    // Saison
    await p.click('[data-tab="saison"]');
    const states = await p.$$eval('[data-tab="saison"]', () => [...document.querySelectorAll('.lad-card')].map((c) => [c.dataset.shop, c.querySelector('.lad-btn').dataset.state]));
    const inS = await p.evaluate((se) => __pm.core.shop.CAT.filter((c) => c.cat === 'saison' && c.season === se).map((c) => c.id), season);
    ok(states.every(([id, st]) => (inS.includes(id) ? st === 'buy' : st === 'season')), `Saison (${season}): nur passende Sachen kaufbar, die anderen "Wieder im …"`);
    r = await buy('saison', inS[0]);
    ok(r[1].owned.includes(inS[0]), 'Saison-Artikel gekauft: ' + inS[0]);
    // Spiele
    r = await buy('spiele', 'mini_apfel');
    ok(r[1].owned.includes('mini_apfel') && r[0].carrots - r[1].carrots === r[3], 'Spiel Apfelfangen freigeschaltet (Hufeisen und Karotten bezahlt)');
    // Sticker-Tüte
    await p.click('[data-tab="sticker"]'); const stB = await S(p);
    await p.click('[data-shopbuy="pack1"]'); await p.waitForSelector('#confirmYes'); await p.click('#confirmYes'); await p.waitForSelector('#packOpen');
    await p.click('#packTear'); await p.waitForSelector('.pk-card', { timeout: 8000 }); await sleep(1800);
    const stA = await S(p);
    const cnt = (s) => Object.values(s.stickers).reduce((a, b) => a + b, 0);
    ok(cnt(stA) - cnt(stB) === 3 && stB.carrots - stA.carrots === 4, 'Sticker-Tüte: 3 Sticker, 4 Karotten bezahlt');
    await shot(p, `pack-${tag}`);
    await p.click('#packAlbum'); await p.waitForSelector('#album .alb-slot'); await sleep(1100);
    ok((await p.$$('[data-page]')).length === 6, 'Album: 6 Seiten');
    await shot(p, `album-${tag}`);
    await p.click('#albumClose'); await sleep(300);
    // Nicht genug Hufeisen
    await p.evaluate(() => { __pm.core.S.shoes = 5; __pm.save(); }); await p.reload(); await p.waitForSelector('.tile'); await p.evaluate(() => __pm.showStable()); await p.waitForSelector('#laden');
    await p.click('#laden'); await p.click('[data-tab="pferde"]');
    ok(await p.$eval('[data-shop="mondlicht"] .lad-btn', (b) => b.dataset.state) === 'save', 'Zu wenig Hufeisen: Knopf zeigt "Noch …" und ist gesperrt');
    await p.click('#ladClose'); await sleep(300);

    // Albumseite voll
    await p.evaluate(() => { const s = __pm.core.S; s.shoes = 0; s.stickers = {}; for (let i = 0; i < 8; i++) s.stickers[i] = 1; });
    const al = await p.evaluate(() => { const a = __pm.core.shop.albumCheck(); const b = __pm.core.shop.albumCheck(); return [a.length, b.length, __pm.core.S.shoes]; });
    ok(al[0] === 1 && al[1] === 0 && al[2] === 10, 'Volle Albumseite: einmalig +10 Hufeisen und Rosette');

    // Pflege
    await p.evaluate(() => { const s = __pm.core.S; s.shoes = 0; s.owned = ['care_flecht', 'care_schwamm', 'acc_kranz']; s.care = {}; __pm.save(); __pm.showStable(); });
    await sleep(500); await p.click('#dockToggle'); await p.click('#dock-care'); await p.waitForSelector('#careStage');
    await shot(p, `care-${tag}`);
    await p.click('[data-tool="flecht"]'); await sleep(250);
    for (const sp of await p.$$('.care-spot')) { await sp.click(); await sleep(120); }
    await sleep(800);
    const cs = await S(p);
    ok(cs.shoes >= 2, `Pflege (Flechtband): ${cs.shoes} Hufeisen als Belohnung`);
    ok(/strahlt|fertig|schön|Hufeisen/i.test(await p.textContent('#careMsg')), 'Pflege: freundliche Rückmeldung');
    await p.click('#careClose'); await sleep(500);

    // Stübchen
    await p.evaluate(() => { __pm.core.S.owned.push('r_sofa', 'r_lampe'); __pm.save(); __pm.core.shop.showRoom(); }); await p.waitForSelector('#roomScene'); await sleep(500);
    const it = await p.$('.rm-item:not(.wall)');
    if (it) {
      const id = await it.getAttribute('data-room'), b = await it.boundingBox();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2 - 70, b.y + b.height / 2 - 20, { steps: 8 }); await p.mouse.up(); await sleep(300);
      const before = (await S(p)).room.pos[id];
      await p.reload(); await p.waitForSelector('.tile');
      const after = (await S(p)).room.pos[id];
      ok(before && after && Math.abs(before.x - after.x) < 0.01, `Stübchen: Möbel "${id}" verschoben und nach Neustart an gleicher Stelle`);
    } else ok(false, 'Stübchen: kein Möbelstück gefunden');
    await p.evaluate(() => __pm.core.shop.showRoom()); await p.waitForSelector('#roomScene'); await sleep(600);
    await shot(p, `stuebchen-${tag}`);
    const bad = await small(p, '#screen button');
    ok(bad.length === 0, 'Stübchen: Knöpfe ≥ 44 px' + (bad.length ? ' ' + JSON.stringify(bad.slice(0, 3)) : ''));

    // Mini-Spiele
    await p.evaluate(() => { const s = __pm.core.S; s.owned.push('mini_apfel', 'mini_wald', 'mini_memory'); s.minis.miniDay = null; s.shoes = 0; s.carrots = 0; window.__miniSpeed = 6; __pm.save(); __pm.core.minis.open(); });
    await p.waitForSelector('#miniMenu'); ok((await p.$$('.board-tile.mini:not(.locked)')).length === 3, 'Mini-Spiele-Menü: 3 Spiele frei');
    await p.click('[data-mini="memory"]'); await p.waitForSelector('.mem-card');
    const keys = await p.$$eval('.mem-card', (e) => e.map((x) => x.dataset.k)); const cards = await p.$$('.mem-card'); const seen = {};
    keys.forEach((k, i) => (seen[k] = seen[k] || []).push(i));
    for (const k in seen) { await cards[seen[k][0]].click(); await cards[seen[k][1]].click(); await sleep(120); }
    await p.waitForSelector('#mgEnd', { timeout: 8000 }); ok(true, `Memory (${keys.length} Karten) geschafft`);
    await shot(p, `memory-${tag}`);
    await p.click('#mgFarm'); await sleep(400);
    await p.evaluate(() => __pm.core.minis.start('apfel')); await p.waitForSelector('#apBasket');
    for (let i = 0; i < 160 && !(await p.$('#mgEnd')); i++) { const xs = await p.$$eval('.ap-apple:not(.in)', (e) => e.map((a) => { const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y]; })); if (xs.length) { xs.sort((a, b) => b[1] - a[1]); await p.mouse.move(xs[0][0], 400); } await sleep(150); }
    ok(!!(await p.$('#mgEnd')), 'Apfelfangen: Runde endet mit Belohnungskarte');
    await shot(p, `apfel-${tag}`);
    await p.click('#mgFarm'); await sleep(400);
    await p.evaluate(() => __pm.core.minis.start('wald')); await p.waitForSelector('#rdHorse, [data-ride]');
    if (await p.$('[data-ride]')) await p.click('[data-ride]');
    await p.waitForSelector('#rdHorse');
    for (let i = 0; i < 120 && !(await p.$('#mgEnd')); i++) { await p.mouse.click(vp[0] / 2, vp[1] / 2); await sleep(500); }
    ok(!!(await p.$('#mgEnd')), 'Ausritt im Wald: Strecke zu Ende, Belohnungskarte');
    await shot(p, `ausritt-${tag}`);
    const ms = await S(p);
    ok(ms.shoes <= 8 && ms.carrots <= 2 && ms.shoes > 0, `Tageslimit der Mini-Spiele greift (${ms.shoes} Hufeisen, ${ms.carrots} Karotten nach 3 Spielen)`);
    await p.evaluate(() => { __pm.core.S.minis.miniDay = { d: new Date().toDateString(), shoes: 7, car: 2, n: 0 }; __pm.core.S.shoes = 0; __pm.core.S.carrots = 0; });
    await p.click('#mgFarm'); await sleep(300); await p.evaluate(() => __pm.core.minis.start('memory')); await p.waitForSelector('.mem-card');
    { const ks = await p.$$eval('.mem-card', (e) => e.map((x) => x.dataset.k)); const cs = await p.$$('.mem-card'); const sn = {}; ks.forEach((k, i) => (sn[k] = sn[k] || []).push(i)); for (const k in sn) { await cs[sn[k][0]].click(); await cs[sn[k][1]].click(); await sleep(120); } }
    await p.waitForSelector('#mgEnd', { timeout: 8000 });
    const cap = await S(p);
    ok(cap.shoes === 1 && cap.carrots === 0 && /genug Belohnung/.test(await p.textContent('#mgEnd')), 'Tageslimit: nur noch 1 Hufeisen, freundlicher Hinweis statt Fehler');
    await p.click('#mgFarm'); await sleep(300);

    // Startseite, Lernschild, Elternbereich
    await p.evaluate(() => __pm.showHome()); await sleep(400);
    ok((await p.$$('#hofRow .hof-tile')).length === 5, 'Startseite: Kachelreihe "Mein Hof" mit 5 Kacheln');
    await shot(p, `home-${tag}`);
    await p.evaluate(() => __pm.core.shop.openBoard()); await p.waitForSelector('[data-board]');
    ok((await p.$$('[data-board]')).length >= 7, 'Lernschild zeigt die bis-100-Spiele');
    await p.keyboard.press('Escape'); await p.evaluate(() => { document.querySelectorAll('.sheet').forEach((e) => e.remove()); });
    await p.evaluate(() => __pm.showParent()); await sleep(500);
    ok(!!(await p.$('#shopPanel')), 'Elternbereich: Hofladen-/Album-Überblick');
    ok((await p.$$('.psub, #psub100')).length > 0, 'Elternbereich: bis-100-Spiele aufgeführt');
    // Horizontal overflow
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Kein horizontales Überlaufen');
    await ctx.close();
  }

  // ---------- Service Worker / Offline ----------
  console.log('\n== Service Worker und Offline ==');
  {
    const { ctx, p } = await newPage(browser, VPS[0], base(), errors);
    const sw = await (await fetch(new URL('sw.js', BASE))).text();
    const idx = await (await fetch(BASE)).text();
    const files = [...idx.matchAll(/(?:src|href)="\.?\/?([^"#:]+\.(?:js|css|json|svg|png))"/g)].map((m) => m[1]);
    const missing = files.filter((f) => !sw.includes(f));
    ok(missing.length === 0, 'sw.js listet alle Dateien aus index.html' + (missing.length ? ' – fehlt: ' + missing : ''));
    ok(/pferde-mathe-v(1\d|9-bis100)/.test(sw), 'Cache-Name wurde angehoben: ' + (sw.match(/const CACHE = '([^']+)'/) || [])[1]);
    const ready = await p.evaluate(async () => { if (!navigator.serviceWorker) return 'kein SW'; try { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((_, j) => setTimeout(() => j('timeout'), 8000))]); return r.active ? 'aktiv' : 'inaktiv'; } catch (e) { return String(e); } });
    ok(ready === 'aktiv', 'Service Worker aktiv (' + ready + ')');
    await sleep(1500);
    await ctx.setOffline(true);
    await p.reload(); await p.waitForSelector('.tile', { timeout: 10000 });
    ok(true, 'Offline-Start: App lädt ohne Netz');
    await p.evaluate(() => __pm.core.minis.start('memory')); await p.waitForSelector('.mem-card'); ok(true, 'Offline: Mini-Spiel startet');
    await ctx.setOffline(false); await ctx.close();
  }
  ok(errors.length === 0, 'Keine Konsolenfehler im gesamten Lauf' + (errors.length ? ': ' + [...new Set(errors)].slice(0, 4).join(' | ') : ''));
  await browser.close();
  console.log(`\n${checks} Prüfungen, ${fails} Fehler`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ABBRUCH', e); process.exit(2); });
