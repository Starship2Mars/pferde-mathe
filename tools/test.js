// E2E-Test: node tools/test.js [webkit|chromium]  (lokaler Server nötig, URL per Umgebungsvariable URL)
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const engine = process.argv[2] || 'webkit';
const SHOTS = process.env.SHOTS === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

async function solvePaare(p, withMistake) {
  const cards = await p.$$eval('.mcard', (els) => els.map((e) => +e.dataset.n));
  const used = new Set();
  let first = true;
  for (let i = 0; i < cards.length; i++) {
    if (used.has(i)) continue;
    const j = cards.findIndex((n, k) => k !== i && !used.has(k) && n + cards[i] === 10);
    if (withMistake && first) {
      const w = cards.findIndex((n, k) => k !== i && !used.has(k) && n + cards[i] !== 10);
      await p.click(`.mcard[data-i="${i}"]`); await p.click(`.mcard[data-i="${w}"]`);
      await sleep(1500);
      const bubble = await p.textContent('.bubble');
      ok(/10/.test(bubble), 'Paare: sanfter Hinweis nach falschem Paar: "' + bubble.slice(0, 70) + '…"');
      await p.click(`.mcard[data-i="${j}"]`);
      first = false;
    } else {
      await p.click(`.mcard[data-i="${i}"]`); await p.click(`.mcard[data-i="${j}"]`);
    }
    used.add(i); used.add(j);
    await sleep(250);
  }
}
async function solveHaeuser(p, withMistake) {
  for (let house = 0; house < 5; house++) {
    await p.waitForSelector('.hc.cur', { timeout: 5000 });
    let guard = 0;
    while (await p.$('.hc.cur') && guard++ < 10) {
      const want = await p.evaluate(() => {
        const cur = document.querySelector('.hc.cur');
        const roofEl = document.querySelector('.roof .hc');
        if (cur === roofEl) { const f = document.querySelector('.floor'); return [...f.children].reduce((s, c) => s + +c.textContent, 0); }
        const sib = [...cur.parentElement.children].find((c) => c !== cur);
        return +roofEl.textContent - +sib.textContent;
      });
      if (withMistake && house === 0 && guard === 1) {
        const wrong = want === 0 ? 1 : want - 1;
        await p.click(`.pad .num[data-n="${wrong}"]`); await sleep(300);
        ok(await p.$$eval('.dots i', (e) => e.length) > 0, 'Häuser: Punkte-Hilfe erscheint nach falscher Zahl');
        const bg = await p.$eval(`.pad .num[data-n="${wrong}"]`, (e) => getComputedStyle(e).backgroundColor);
        ok(!/rgb\(2[0-5]\d, [0-9]{1,2}, [0-9]{1,2}\)/.test(bg), 'Häuser: kein Rot beim Fehler (' + bg + ')');
      }
      await p.click(`.pad .num[data-n="${want}"]`);
      await sleep(450);
    }
    await sleep(1600);
  }
}
async function solveRechnen(p, withMistake, shotPath) {
  for (let t = 0; t < 5; t++) {
    await p.waitForSelector('.eq .ans:not(.filled)', { timeout: 5000 });
    const txt = await p.textContent('.eq');
    const m = txt.match(/(\d+)\s*([+−])\s*(\d+)/);
    const want = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3];
    if (withMistake && t === 0) {
      await p.click('.zf .cell:not(.a)'); await sleep(150);
      ok(m[2] === '+' ? (await p.$$('.zf .cell.b')).length === 1 : (await p.$$('.zf .cell.gone')).length === 1, 'Rechnen: Plättchen per Tippen legbar/wegnehmbar');
      const w1 = (want + 1) % 11, w2 = (want + 2) % 11;
      await p.click(`.pad .num[data-n="${w1}"]`); await sleep(400);
      await p.click(`.pad .num[data-n="${w2}"]`); await sleep(200);
      await p.waitForFunction(() => !document.querySelector('.softbtn').disabled, null, { timeout: 15000 });
      const strat = await p.textContent('.strategy');
      ok(strat.length > 0, 'Rechnen: Trick/Zerlegung erscheint nach 2. Fehlversuch: "' + strat + '"');
      if (shotPath) await p.screenshot({ path: shotPath });
    }
    await p.click(`.pad .num[data-n="${want}"]`);
    await sleep(2000);
  }
}
async function solveFamilie(p) {
  for (let r = 0; r < 4; r++) {
    await p.waitForSelector('.row.cur', { timeout: 5000 });
    const txt = (await p.textContent('.row.cur')).replace('⭐', '');
    const m = txt.match(/(\d+|\?)([+−])(\d+|\?)=(\d+|\?)/);
    const [l, op, rr, res] = [m[1], m[2], m[3], m[4]];
    let want;
    if (res === '?') want = op === '+' ? +l + +rr : +l - +rr;
    else if (l === '?') want = op === '+' ? +res - +rr : +res + +rr;
    else want = op === '+' ? +res - +l : +l - +res;
    await p.click(`.pad .num[data-n="${want}"]`);
    await sleep(1700);
  }
  const q = await p.textContent('.task-big');
  const m = q.match(/(\d+) \+ (\d+)/);
  await p.click(`.choice:text-is("${m[2]} + ${m[1]}")`);
  await sleep(2100);
}
async function solveStrahl(p) {
  for (let t = 0; t < 5; t++) {
    await p.waitForSelector('.task-big', { timeout: 5000 });
    const q = await p.textContent('.task-big');
    let want; let m;
    if ((m = q.match(/Wo ist die (\d+)/))) want = +m[1];
    else { m = q.match(/(\d+) ([+−]) (\d+)/); want = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]; }
    await p.click(`.tick[data-n="${want}"]`);
    await sleep(5200);
  }
}
async function center(p, sel) { const b = await (await p.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }
async function dragTo(p, from, to) {
  const [x0, y0] = await center(p, from); const [x1, y1] = await center(p, to);
  await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 12 }); await p.mouse.up(); await sleep(400);
}
async function brush(p, to) {
  const [x0, y0] = await center(p, '#toolBrush'); const [x1, y1] = await center(p, to);
  await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 8 });
  for (let i = 0; i < 30; i++) { await p.mouse.move(x1 + (i % 2 ? 30 : -30), y1 + (i % 3) * 4, { steps: 2 }); await sleep(45); }
  await p.mouse.up(); await sleep(300);
}
async function playGame(p, id, fn, ...args) {
  await p.click('#homeBtn').catch(() => {});
  await p.waitForSelector(`.tile[data-game="${id}"]`);
  await p.click(`.tile[data-game="${id}"]`);
  await p.waitForSelector('.stage');
  const before = await p.evaluate(() => window.__pm.state.shoes);
  await fn(p, ...args);
  await p.waitForSelector('.end', { timeout: 15000 });
  const after = await p.evaluate(() => window.__pm.state.shoes);
  ok(after - before === 5, `${id}: Runde beendet, +${after - before} Hufeisen`);
}

(async () => {
  const browser = await pw[engine].launch();
  for (const vp of [{ width: 1024, height: 768, tag: 'quer' }, { width: 820, height: 1180, tag: 'hoch' }]) {
    console.log(`\n== ${engine} ${vp.width}x${vp.height} (${vp.tag}) ==`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, hasTouch: true, locale: 'de-DE',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const p = await ctx.newPage();
    const errors = [], external = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('request', (r) => { if (!r.url().startsWith(new URL(BASE).origin)) external.push(r.url()); });
    await p.goto(BASE);
    await p.waitForSelector('.tile');
    ok((await p.$$('.tile')).length === 6, 'Startseite: 5 Spiele + Stall');
    // Neutral ohne Einstellungen
    const hello = await p.textContent('.bubble');
    ok(!/,\s*\w+!/.test(hello.split(' ').slice(0, 3).join(' ')) && !(await p.$('#bdayBanner')), 'Ohne Einstellungen: neutrale Begrüßung, kein Geburtstags-Countdown ("' + hello.slice(0, 40) + '…")');
    ok(!!(await p.$('#setupCard')), 'Erster Start: sanfter Einrichtungs-Hinweis für Eltern sichtbar');
    await p.click('#setupLater'); await p.reload(); await p.waitForSelector('.tile');
    ok(!(await p.$('#setupCard')), 'Einrichtungs-Hinweis erscheint nach „Später“ nicht mehr');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    ok(!overflow, 'Kein horizontales Überlaufen');
    if (SHOTS && vp.tag === 'quer') await p.screenshot({ path: 'screenshots/01-start-1024x768.png' });
    const small = await p.$$eval('button', (bs) => bs.filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map((b) => b.textContent));
    ok(small.length === 0, 'Alle Knöpfe ≥ 44 px (' + small.join(',') + ')');

    await playGame(p, 'paare', solvePaare, true);
    await playGame(p, 'haeuser', solveHaeuser, true);
    await playGame(p, 'rechnen', solveRechnen, true, SHOTS && vp.tag === 'hoch' ? 'screenshots/02-plus-minus-zwanzigerfeld-820x1180.png' : null);
    // Größenprüfung Spielfläche
    await playGame(p, 'familie', solveFamilie);
    await playGame(p, 'strahl', solveStrahl);
    // Adaptivität: zwei perfekte Runden Rechnen -> Stufe 2
    const lv0 = await p.evaluate(() => window.__pm.state.skills.rechnen.level);
    await playGame(p, 'rechnen', solveRechnen, false);
    await playGame(p, 'rechnen', solveRechnen, false);
    const lv1 = await p.evaluate(() => window.__pm.state.skills.rechnen.level);
    ok(lv1 === lv0 + 1, `Adaptiv: Rechnen-Stufe ${lv0} -> ${lv1} nach sicheren Runden`);
    await playGame(p, 'rechnen', solveRechnen, false);

    // Stall: kaufen & Persistenz
    const st = await p.evaluate(() => window.__pm.state);
    ok(st.shoes >= 30 && st.carrots >= 7, `Belohnungen: ${st.shoes} Hufeisen, ${st.carrots} Karotten`);
    await p.click('#toStable');
    await p.waitForSelector('.farm');
    ok(!(await p.$('.topbar')), 'Pferdehof im Vollbild (keine Kopfzeile)');
    for (const id of ['heu', 'blumen', 'sattel', 'schleife', 'fohlen']) {
      await p.click('#shopBtn'); await sleep(550);
      const b = await p.$(`[data-buy="${id}"]`); if (b) { await b.click(); await sleep(500); }
      else { await p.click('#shopClose'); await sleep(400); }
    }
    await p.click('.item[data-id="luna"]'); await sleep(400);
    const fed0 = await p.evaluate(() => window.__pm.state.fed);
    await dragTo(p, '#toolCarrot', '.item[data-id="luna"]');
    ok((await p.evaluate(() => window.__pm.state.fed)) === fed0 + 1, 'Karotte zum Pferd ziehen → gefüttert');
    await brush(p, '.item[data-id="luna"]');
    ok(await p.$('.item[data-id="luna"].shiny') !== null, 'Bürsten → Pferd glänzt');
    // ziehen
    const box = await (await p.$('.item[data-id="heu"]')).boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
    await p.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 - 30, { steps: 6 }); await p.mouse.up();
    const pos = await p.evaluate(() => window.__pm.state.pos.heu);
    ok(!!pos && pos.x % 2 === 0, 'Pferdehof: Gegenstand verschiebbar, rastet sanft ein, Position gespeichert ' + JSON.stringify(pos));
    if (SHOTS && vp.tag === 'quer') { await sleep(1200); await p.screenshot({ path: 'screenshots/03-stall-1024x768.png' }); }
    const pre = await p.evaluate(() => JSON.stringify({ s: window.__pm.state.shoes, o: window.__pm.state.owned, c: window.__pm.state.carrots, f: window.__pm.state.fed }));
    await p.reload();
    await p.waitForSelector('.tile');
    const post = await p.evaluate(() => JSON.stringify({ s: window.__pm.state.shoes, o: window.__pm.state.owned, c: window.__pm.state.carrots, f: window.__pm.state.fed }));
    ok(pre === post && JSON.parse(post).o.length >= 3, 'Persistenz nach Reload: ' + post);
    await p.click('.tile[data-game="stall"]'); await p.waitForSelector('.farm');
    ok((await p.$$('.scene .item')).length >= 4, 'Stall nach Reload: Gegenstände sichtbar');
    ok(await p.evaluate(() => !!document.querySelector('.item[data-id="luna"] svg path[fill="#8b5a2b"]')), 'Luna trägt den gekauften Sattel');

    // Elternbereich
    await p.click('#homeBtn'); await p.click('#parentLink');
    const hb = await (await p.$('#holdBtn')).boundingBox();
    await p.mouse.move(hb.x + 20, hb.y + 20); await p.mouse.down(); await sleep(1000); await p.mouse.up(); await sleep(200);
    ok(!(await p.$('.parent')), 'Eltern-Tor: kurzes Drücken öffnet nicht');
    await p.mouse.down(); await sleep(3300); await p.mouse.up();
    await p.waitForSelector('.parent', { timeout: 3000 });
    const ptxt = await p.textContent('.parent');
    ok(/Stufe \d\/5/.test(ptxt) && /Zehnerübergang|Plus bis 10/.test(ptxt), 'Elternbereich zeigt Stufen & Aufgabentypen');
    ok(/Zuletzt knifflig/.test(ptxt) && (await p.$$('.trouble span')).length > 0, 'Elternbereich zeigt knifflige Aufgaben');
    // Name & Geburtstag einstellen
    const today = await p.evaluate(() => { const d = new Date(); return { d: d.getDate(), m: d.getMonth() + 1 }; });
    await p.fill('#kidName', 'Mia');
    await p.selectOption('#bdDay', String(today.d)); await p.selectOption('#bdMonth', String(today.m));
    await p.click('#saveKid');
    ok((await p.textContent('#kidMsg')).includes('Gespeichert'), 'Elternbereich: Name & Geburtstag gespeichert');
    await p.click('#homeBtn'); await p.waitForSelector('.tile');
    const banner = await p.textContent('#bdayBanner').catch(() => '');
    ok(/Geburtstag, Mia/.test(banner), 'Geburtstag heute: Glückwunsch mit Namen ("' + banner + '")');
    ok(/Mia/.test(await p.textContent('.bubble')) || /Geburtstag/.test(await p.textContent('.bubble')), 'Luna spricht das Kind an');
    await p.reload(); await p.waitForSelector('.tile');
    ok((await p.evaluate(() => window.__pm.state.childName)) === 'Mia' && /Mia/.test(await p.textContent('#bdayBanner')), 'Name/Geburtstag bleiben nach Reload erhalten');
    await p.click('.tile[data-game="stall"]');
    ok(!!(await p.$('.item[data-id="kuchen"]')), 'Geburtstagskuchen steht im Stall');
    await p.click('#homeBtn');
    const in5 = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return { d: d.getDate(), m: d.getMonth() + 1 }; });
    await p.evaluate(() => window.__pm.showParent());
    await p.selectOption('#bdDay', String(in5.d)); await p.selectOption('#bdMonth', String(in5.m)); await p.click('#saveKid');
    await p.click('#homeBtn'); await p.waitForSelector('.tile');
    ok(/Noch 5 Mal schlafen/.test(await p.textContent('#bdayBanner').catch(() => '')), 'Countdown: „Noch 5 Mal schlafen“');
    const far = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 60); return { d: d.getDate(), m: d.getMonth() + 1 }; });
    await p.evaluate(() => window.__pm.showParent());
    await p.selectOption('#bdDay', String(far.d)); await p.selectOption('#bdMonth', String(far.m)); await p.click('#saveKid');
    await p.click('#homeBtn'); await p.waitForSelector('.tile');
    ok(!(await p.$('#bdayBanner')), 'Geburtstag weit weg: kein Countdown');
    await p.evaluate(() => window.__pm.showParent());
    if (SHOTS && vp.tag === 'hoch') await p.screenshot({ path: 'screenshots/04-elternbereich-820x1180.png', fullPage: false });
    await p.click('#resetBtn'); await p.click('#resetYes');
    await p.waitForSelector('.tile');
    const rs = await p.evaluate(() => window.__pm.state);
    ok(rs.shoes === 0 && rs.owned.length === 0 && rs.skills.rechnen.level === 1, 'Zurücksetzen funktioniert');
    ok(rs.childName === 'Mia', 'Zurücksetzen behält Name/Geburtstag');
    await p.evaluate(() => window.__pm.showParent()); await p.click('#clearKid');
    await p.click('#homeBtn'); await p.waitForSelector('.tile');
    ok(!/Mia/.test(await p.textContent('#app')) && !(await p.$('#bdayBanner')), 'Name & Geburtstag löschen → wieder neutral');

    // Ton aus
    await p.click('#soundBtn');
    ok((await p.evaluate(() => window.__pm.state.sound)) === false, 'Ton ausschaltbar');
    await p.click('#soundBtn');

    // Service Worker
    const sw = await p.evaluate(async () => { if (!('serviceWorker' in navigator)) return 'n/a'; const r = await Promise.race([navigator.serviceWorker.ready.then(() => 'ready'), new Promise((r) => setTimeout(() => r('timeout'), 4000))]); return r; });
    console.log('  ℹ Service Worker: ' + sw);
    ok(errors.length === 0, 'Keine JS-Fehler ' + errors.join(' | '));
    ok(external.length === 0, 'Keine externen Netzwerkaufrufe ' + external.join(' '));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS OK');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
