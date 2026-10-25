// Prüft die Klang-Engine ohne Lautsprecher: rendert jeden Effekt und jedes Musikthema offline
// (OfflineAudioContext) und kontrolliert Pegel, Stille, NaN und Übersteuerung.
// Aufruf: PW_PATH=... node tools/test-audio.js [webkit|chromium]
const path = require('path');
const pw = require(process.env.PW_PATH || 'playwright');
(async () => {
  const which = process.argv[2] || 'webkit';
  const b = await pw[which].launch();
  const page = await b.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ path: path.join(__dirname, '..', 'audio.js') });
  const names = await page.evaluate(() => window.PMSound._names());
  const themes = await page.evaluate(() => window.PMSound._themeNames());
  let bad = 0; const rows = [];
  for (const n of names) {
    const r = await page.evaluate(([n]) => window.PMSound._render('sfx', n, n === 'wave' || n === 'chime' || n === 'bigbell' ? 6 : 3).catch((e) => ({ err: String(e) })), [n]);
    const ambient = ['wind', 'stream', 'wave', 'fire', 'clock', 'cricket', 'twinkle', 'gull'].includes(n);
    const silent = !r.err && r.peak < 0.002 && !ambient;
    const flag = r.err || r.nan || r.clip > 0 || silent || r.peak > 0.95;
    if (flag) bad++;
    rows.push(`${flag ? 'FEHLER' : 'ok    '} sfx   ${n.padEnd(10)} peak=${(r.peak || 0).toFixed(3)} rms=${(r.rms || 0).toFixed(4)} ${r.err || ''}${r.nan ? ' NaN!' : ''}${r.clip ? ' clip!' : ''}${silent ? ' STILL!' : ''}`);
  }
  for (const t of themes) {
    const r = await page.evaluate(([t]) => window.PMSound._render('music', t, 26).catch((e) => ({ err: String(e) })), [t]);
    const flag = r.err || r.nan || r.clip > 0 || r.peak < 0.01 || r.peak > 0.7;
    if (flag) bad++;
    rows.push(`${flag ? 'FEHLER' : 'ok    '} music ${t.padEnd(10)} peak=${(r.peak || 0).toFixed(3)} rms=${(r.rms || 0).toFixed(4)} ${r.err || ''}`);
  }
  console.log(rows.join('\n'));
  if (errs.length) { console.log('Konsolenfehler:', errs.slice(0, 5)); bad++; }
  console.log(bad ? `AUDIO: ${bad} Probleme` : `AUDIO OK: ${names.length} Effekte, ${themes.length} Musikthemen offline gerendert (${which})`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
