// Test: Reiterin, Kleiderschrank, Reiten, Turnier, Rosettenwand
const pw = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.URL || 'http://127.0.0.1:9518/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const OLD = { v: 1, sound: false, setupSeen: true, childName: '', shoes: 40, totalShoes: 90, carrots: 4, owned: ['heu', 'sattel', 'pony', 'fohlen', 'wolke'], horseNames: { luna: 'Sternchen' }, pos: {}, skills: { rechnen: { level: 2, rounds: 3, recent: [] } }, adv: { done: { '0-0': true }, last: null } };
const get = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pferde-mathe-v1')));
const shots = process.env.SHOTS || '/tmp/shots';
(async () => {
  const b = await pw.webkit.launch();
  for (const [W, H] of (process.env.QUICK ? [[1024, 768]] : [[1024, 768], [768, 1024], [820, 1180], [1180, 820]])) {
    console.log(`\n== webkit ${W}x${H} ==`);
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await p.waitForSelector('#advTile');
    await p.evaluate((s) => localStorage.setItem('pferde-mathe-v1', JSON.stringify(s)), OLD);
    await p.reload(); await p.waitForSelector('#advTile');
    await p.evaluate(() => window.__pm.showStable()); await p.waitForSelector('#riderSetup', { timeout: 6000 });
    ok(true, 'Beim ersten Besuch: Reiterin aussuchen');
    await p.click('[data-skin="#e8b48e"]'); await p.click('[data-hair="#d9a35b"]'); await p.click('[data-style="offen"]'); await sleep(200);
    if (W === 1024) await p.screenshot({ path: shots + '/rider-setup.png' });
    await p.click('#setupDone'); await sleep(900);
    let s = await get(p);
    ok(s.rider.set && s.rider.skin === '#e8b48e' && s.rider.style === 'offen' && s.clothes.includes('helm_basis') && s.horseNames.luna === 'Sternchen' && s.shoes === 40, 'Aussehen gespeichert, Gratis-Helm, alter Spielstand unverändert');
    ok(!!(await p.$('.item[data-id="reiterin"]')), 'Reiterin steht auf dem Hof');
    // Kleiderschrank
    await p.click('#closetBtn'); await p.waitForSelector('#closet');
    await p.click('[data-cbuy="helm_rosa"]'); await sleep(200);
    await p.click('[data-ccat="top"]'); await p.click('[data-cbuy="jacke_lila"]'); await sleep(200);
    await p.click('[data-ccat="hose"]'); await p.click('[data-cbuy="hose_beige"]');
    await p.click('[data-ccat="stiefel"]'); await p.click('[data-cbuy="stiefel_braun"]');
    await p.click('[data-ccat="glitzer"]'); await p.click('[data-cbuy="glitzer"]');
    await p.click('[data-ccat="pad"]'); await p.click('[data-cbuy="pad_rosa"]'); await sleep(200);
    await p.click('[data-cloth="pad_rosa"] [data-for="pony"]'); await sleep(200);
    if (W === 1024) await p.screenshot({ path: shots + '/wardrobe-rider.png' });
    s = await get(p);
    ok(s.shoes === 40 - 4 - 5 - 3 - 4 - 6 - 3 && s.rider.wear.helm === 'helm_rosa' && s.rider.wear.top === 'jacke_lila' && s.rider.wear.glitzer === true, 'Kleidung mit Hufeisen gekauft und angezogen');
    ok(s.gear.pony.pad === '#f7b6cf', 'Sattelpad gehört dem Pony');
    await p.click('#closetClose'); await sleep(500);
    // Fohlen darf nicht geritten werden
    await p.click('.item[data-id="fohlen"]'); await p.waitForSelector('.dress-btn'); 
    ok(!(await p.$('[data-ridehorse="fohlen"]')) && !!(await p.$('.foalnote')), 'Fohlen: kein Reiten (zu klein)');
    // Reiten
    await p.click('.item[data-id="reiterin"]'); await p.waitForSelector('#rideBtn'); await p.click('#rideBtn'); await p.waitForSelector('#pickRide');
    const choices = await p.$$eval('#pickRide [data-ride]', (e) => e.map((x) => x.dataset.ride));
    ok(JSON.stringify(choices.sort()) === JSON.stringify(['luna', 'pony', 'wolke']), 'Nur erwachsene Pferde zur Auswahl: ' + choices);
    await p.click('[data-ride="pony"]'); await p.waitForSelector('#ride'); await sleep(400);
    ok(await p.$eval('#rideHorse', (e) => e.innerHTML.includes('class="seated"') && e.innerHTML.includes('#f48fb1') && e.innerHTML.includes('#f7b6cf')), 'Reiterin sitzt mit Helm auf dem Pony (rosa Sattelpad)');
    await p.evaluate(() => { window.__fast = true; });
    await p.click('[data-gait="trab"]'); await sleep(2500);
    const pos1 = await p.$eval('#rideHorse', (e) => e.style.left);
    await sleep(800);
    ok(pos1 !== await p.$eval('#rideHorse', (e) => e.style.left), 'Pferd trabt auf dem Reitplatz');
    if (W === 1024) await p.screenshot({ path: shots + '/riding.png' });
    await p.waitForSelector('#prize', { timeout: 60000 });
    s = await get(p);
    ok(s.rosettes.length === 1 && s.rosettes[0].horse === 'pony', 'Nach 3 Runden: Rosette gewonnen');
    await p.click('#prizeOk'); await sleep(300);
    // Turnier
    await p.waitForSelector('#tourStart', { state: 'visible', timeout: 15000 }); await sleep(600); await p.click('#tourStart', { timeout: 30000 }); await p.waitForSelector('#tourGo'); await sleep(300);
    let q = 0;
    for (let k = 0; k < 80 && !(await p.$('#prize')); k++) {
      if (await p.$('#tourGo')) { await p.click('#tourGo'); await sleep(300); }
      if (await p.$('#judgeQ .jopt:not(.right)')) {
        const txt = await p.textContent('#judgeQ .jq'); const m = txt.match(/(\d+) (\+|−) (\d+)/); const r = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3];
        if (q === 0) { const wrong = await p.$(`#judgeQ .jopt:not([data-jopt="${r}"])`); await wrong.click(); await sleep(300); ok(/Fast|schau/.test(await p.textContent('.jq-hint')), 'Falsche Antwort: sanfter Hinweis, nochmal probieren'); }
        if (q === 0 && W === 1024) await p.screenshot({ path: shots + '/tournament-judge.png' });
        await p.click(`#judgeQ [data-jopt="${r}"]`); q++; await sleep(1800);
      }
      await sleep(700);
    }
    ok(q === 3, 'Drei Richterinnen-Fragen beantwortet');
    await sleep(800);
    if (W === 1024) await p.screenshot({ path: shots + '/tournament-prize.png' });
    s = await get(p);
    ok(s.rosettes.length === 2 && s.rosettes[1].kind === 'turnier', 'Turnier: jedes Pferd gewinnt eine Schleife');
    await p.click('#prizeOk'); await p.waitForSelector('#tourHome', { timeout: 60000 });
    await p.click('#tourHome'); await p.waitForSelector('.farm'); await sleep(900);
    await p.click('#rosWall'); await p.waitForSelector('#rosettes'); await sleep(300);
    ok((await p.$$('#rosettes .ros')).length === 2, 'Rosettenwand im Stall zeigt 2 Rosetten');
    if (W === 1024) await p.screenshot({ path: shots + '/rosette-wall.png' });
    await p.click('#rosClose'); await sleep(300);
    await p.reload(); await p.waitForSelector('#advTile'); s = await get(p);
    ok(s.rosettes.length === 2 && s.rider.wear.helm === 'helm_rosa' && s.adv.done['0-0'] && s.owned.length === 5, 'Nach Neuladen alles erhalten');
    ok(errs.length === 0, 'Keine JS-Fehler ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? `\n${fails} FEHLER` : '\nAlle Reiter-Tests bestanden ✔'); process.exit(fails ? 1 : 0);
})();
