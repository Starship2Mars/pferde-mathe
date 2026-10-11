// Gemeinsame Löser für die E2E-Tests (lösen die Aufgaben über die Oberfläche)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = (ok) => {
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
async function solveZehner(p) {
  for (let t = 0; t < 5; t++) {
    await p.waitForSelector('.eq .ans:not(.filled)', { timeout: 5000 });
    const txt = await p.textContent('.eq');
    const m = txt.match(/(\d+)\s*([+−])\s*(\d+)/);
    const want = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3];
    await p.click(`.pad .num[data-n="${want}"]`);
    await sleep(2100);
  }
}
async function solveAny(p) {
  const id = await p.evaluate(() => (document.querySelector('.game').className.match(/game-(\w+)/) || [])[1]);
  const f = { paare: solvePaare, haeuser: solveHaeuser, rechnen: solveRechnen, familie: solveFamilie, strahl: solveStrahl, zehner: solveZehner }[id];
  await f(p, false);
  return id;
}
return { solvePaare, solveHaeuser, solveRechnen, solveFamilie, solveStrahl, solveZehner, solveAny, center, dragTo, brush };
};
