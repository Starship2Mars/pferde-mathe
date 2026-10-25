/* Pferde-Mathe – Klang-Engine (WebAudio, alles synthetisch: keine Dateien, kein Netzwerk)
 * Busse: Effekte · Musik · Umgebung → Master → sanfter Kompressor → Ausgabe.
 * Einstellungen (Elternbereich): S.sound (Master an/aus), S.volume (Master-Lautstärke 0–1),
 * S.audio = { music, sfx, amb, mvol }.
 * iOS: Der AudioContext wird erst bei der ersten Berührung erzeugt und „entsperrt“ (resume + stiller Puffer).
 */
(function () {
  'use strict';
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOf = (a) => a[Math.floor(Math.random() * a.length)];
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const DEFAULT_AUDIO = { music: true, sfx: true, amb: true, mvol: 0.5 };
  let getS = () => ({ sound: true, volume: 0.5, audio: DEFAULT_AUDIO });
  function cfg() {
    const S = getS() || {};
    const a = Object.assign({}, DEFAULT_AUDIO, S.audio || {});
    return { on: S.sound !== false, vol: typeof S.volume === 'number' ? Math.max(0, Math.min(1, S.volume)) : 0.5, music: !!a.music, sfx: !!a.sfx, amb: !!a.amb, mvol: Math.max(0, Math.min(1, a.mvol)) };
  }

  // ======================= Engine-Fabrik (Echtzeit oder Offline für Tests) =======================
  function createEngine(c, offline) {
    const sr = c.sampleRate;
    const master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    master.connect(comp); comp.connect(c.destination);
    const sfxBus = c.createGain(), musicBus = c.createGain(), ambBus = c.createGain();
    const musicLP = c.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 5200; musicLP.Q.value = 0.3;
    sfxBus.connect(master); musicBus.connect(musicLP); musicLP.connect(master); ambBus.connect(master);
    // sanfter Hall (Faltung mit erzeugtem Rauschen) – gibt allem Wärme
    const verb = c.createConvolver(); const vg = c.createGain(); vg.gain.value = 0.22;
    { const len = Math.floor(sr * 1.6), buf = c.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      verb.buffer = buf; }
    const verbIn = c.createGain(); verbIn.gain.value = 1; verbIn.connect(verb); verb.connect(vg); vg.connect(master);
    let noiseBuf = null;
    function noise() {
      if (!noiseBuf) { const len = sr * 2, b = c.createBuffer(1, len, sr), d = b.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = 0.6 * last + 0.4 * w; d[i] = last * 1.6; } noiseBuf = b; }
      return noiseBuf;
    }
    const now = () => c.currentTime;
    function env(g, t, peak, a, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.003, a));
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, dur));
    }
    function send(node, amt) { const s = c.createGain(); s.gain.value = amt; node.connect(s); s.connect(verbIn); }
    // Grundbausteine -------------------------------------------------------
    function tone(f, t, dur, type, g, f2, dst, rev) {
      const o = c.createOscillator(), v = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.85);
      env(v, t, g == null ? 0.4 : g, 0.012, dur);
      o.connect(v); v.connect(dst || sfxBus); if (rev) send(v, rev);
      o.start(t); o.stop(t + dur + 0.05);
      return v;
    }
    function nz(t, dur, g, ftype, f1, f2, q, dst, rev) {
      const s = c.createBufferSource(); s.buffer = noise(); s.loop = true;
      const f = c.createBiquadFilter(); f.type = ftype || 'bandpass'; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f1 || 1000, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const v = c.createGain(); env(v, t, g, 0.008, dur);
      s.connect(f); f.connect(v); v.connect(dst || sfxBus); if (rev) send(v, rev);
      s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
      return v;
    }
    // Instrumente ------------------------------------------------------------
    function bell(f, t, dur, g, dst, rev) { // Glockenspiel: leicht unharmonische Obertöne
      tone(f, t, dur, 'sine', g, null, dst, rev == null ? 0.5 : rev);
      tone(f * 2.76, t, dur * 0.45, 'sine', g * 0.18, null, dst);
      tone(f * 5.4, t, dur * 0.2, 'sine', g * 0.06, null, dst);
    }
    function musicBox(f, t, g, dst) { tone(f, t, 1.1, 'sine', g, null, dst, 0.6); tone(f * 3, t, 0.35, 'sine', g * 0.2, null, dst); tone(f * 4.01, t, 0.15, 'sine', g * 0.08, null, dst); }
    function marimba(f, t, g, dst) { tone(f, t, 0.55, 'sine', g, null, dst, 0.3); tone(f * 4, t, 0.12, 'sine', g * 0.25, null, dst); nz(t, 0.025, g * 0.25, 'bandpass', f * 3, null, 2, dst); }
    function pluck(f, t, g, dst, len) { const v = tone(f, t, len || 0.7, 'triangle', g, null, dst, 0.3); tone(f * 2, t, (len || 0.7) * 0.4, 'sine', g * 0.3, null, dst); return v; }
    function harp(f, t, g, dst) { tone(f, t, 1.3, 'triangle', g, null, dst, 0.5); tone(f * 2, t, 0.6, 'sine', g * 0.35, null, dst); tone(f * 3, t, 0.25, 'sine', g * 0.1, null, dst); }
    function kalimba(f, t, g, dst) { tone(f, t, 0.9, 'sine', g, null, dst, 0.5); tone(f * 5.4, t, 0.1, 'sine', g * 0.14, null, dst); nz(t, 0.02, g * 0.2, 'bandpass', 2600, null, 2, dst); }
    function pad(f, t, dur, g, dst) {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
      const v = c.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + Math.min(0.9, dur * 0.3)); v.gain.setValueAtTime(g, t + dur * 0.62); v.gain.linearRampToValueAtTime(0.0001, t + dur);
      [-6, 6].forEach((d, i) => { const o = c.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = d; const og = c.createGain(); og.gain.value = i ? 0.8 : 0.35; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.05); });
      lp.connect(v); v.connect(dst || musicBus); send(v, 0.3);
    }
    function flute(f, t, dur, g, dst) {
      const o = c.createOscillator(), v = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.type = 'sine'; o.frequency.value = f; l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6); l.connect(lg); lg.connect(o.frequency);
      v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + 0.09); v.gain.setValueAtTime(g * 0.9, t + dur * 0.7); v.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(v); v.connect(dst || musicBus); send(v, 0.4); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
      nz(t, dur * 0.6, g * 0.12, 'bandpass', f * 2, null, 3, dst || musicBus);
    }
    function softBass(f, t, dur, g, dst) { tone(f, t, dur, 'sine', g, null, dst || musicBus); tone(f * 2, t, dur * 0.4, 'triangle', g * 0.2, null, dst || musicBus); }
    // Tierlaute --------------------------------------------------------------
    function formantVoice(t, dur, f0pts, formants, g, saw, dst, vib) {
      const o = c.createOscillator(); o.type = saw || 'sawtooth';
      f0pts.forEach(([dt, f], i) => { if (i === 0) o.frequency.setValueAtTime(f, t + dt); else o.frequency.linearRampToValueAtTime(f, t + dt); });
      const v = c.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g * 2.5, t + Math.min(0.08, dur * 0.2)); v.gain.setValueAtTime(g * 2.5, t + dur * 0.6); v.gain.linearRampToValueAtTime(0.0001, t + dur);
      if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
      formants.forEach(([fa, fb, q, gain]) => { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(fa, t); f.frequency.linearRampToValueAtTime(fb, t + dur); const fg = c.createGain(); fg.gain.value = gain; o.connect(f); f.connect(fg); fg.connect(v); });
      v.connect(dst || sfxBus); send(v, 0.25); o.start(t); o.stop(t + dur + 0.05);
    }
    function chirpOne(t, f1, f2, dur, g, dst) { const o = c.createOscillator(), v = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); env(v, t, g, 0.01, dur); o.connect(v); v.connect(dst || sfxBus); send(v, 0.2); o.start(t); o.stop(t + dur + 0.03); }
    return { c, sr, master, sfxBus, musicBus, ambBus, musicLP, verbIn, noise, now, env, tone, nz, bell, musicBox, marimba, pluck, harp, kalimba, pad, flute, softBass, formantVoice, chirpOne, send };
  }

  // ======================= Sound-Effekte =======================
  function sfxLib(E) {
    const { c, tone, nz, bell, formantVoice, chirpOne } = E;
    const T = (d) => E.now() + (d || 0);
    const L = {
      tap(d) { const t = T(d), f = 640 * rnd(0.96, 1.05); tone(f, t, 0.09, 'sine', 0.22, f * 0.7); nz(t, 0.02, 0.05, 'bandpass', 2200, null, 2); },
      pop(d) { const t = T(d); tone(620, t, 0.12, 'sine', 0.3, 900); tone(1040, t + 0.06, 0.16, 'sine', 0.16, null, null, 0.3); },
      plop(d) { const t = T(d); tone(520, t, 0.2, 'sine', 0.34, 170); nz(t, 0.04, 0.05, 'lowpass', 900); },
      correct(d, streak) {
        const t = T(d), s = Math.min(4, streak || 0);
        const pats = [[0, 4, 7, 12], [2, 5, 9, 14], [0, 7, 4, 12], [4, 7, 11, 16], [-5, 0, 4, 7]];
        const base = 72 + s;
        pickOf(pats).forEach((n, i) => bell(midi(base + n), t + i * 0.09, 0.7, 0.22));
        E.tone(midi(base + 24), t + 0.38, 0.5, 'sine', 0.04, null, null, 0.6);
        const r = Math.random();
        if (r < 0.12) L.neigh(0.5, 0.55); else if (r < 0.22) L.clipclop(0.5, 0.5);
      },
      hint(d) { const t = T(d); tone(midi(67), t, 0.28, 'sine', 0.1, null, null, 0.4); tone(midi(64), t + 0.2, 0.4, 'sine', 0.09, null, null, 0.4); },
      softno(d) { const t = T(d); tone(midi(62), t, 0.3, 'triangle', 0.08, midi(59), null, 0.3); },
      fanfare(d) {
        const t = T(d);
        [60, 64, 67].forEach((n, i) => bell(midi(n + 12), t + i * 0.13, 0.9, 0.22));
        [60, 64, 67].forEach((n) => { tone(midi(n), t + 0.42, 1.5, 'triangle', 0.08, null, null, 0.5); tone(midi(n + 12), t + 0.42, 1.4, 'sine', 0.05); });
        bell(midi(84), t + 0.42, 1.5, 0.2);
        [88, 91, 96, 100].forEach((n, i) => bell(midi(n), t + 0.95 + i * 0.11, 0.55, 0.07));
      },
      reward(d) { L.fanfare(d); },
      levelUp(d) { const t = T(d); [60, 62, 64, 67, 69, 72, 76].forEach((n, i) => bell(midi(n + 12), t + i * 0.07, 0.6, 0.15)); bell(midi(88), t + 0.6, 1.2, 0.16); },
      coin(d) { const t = T(d); tone(1568, t, 0.09, 'square', 0.05); tone(2093, t + 0.07, 0.5, 'sine', 0.18, null, null, 0.4); tone(2093 * 2.01, t + 0.07, 0.25, 'sine', 0.05); },
      buy(d) { const t = T(d); nz(t, 0.05, 0.08, 'bandpass', 3200, null, 1.5); L.coin(d); L.coin((d || 0) + 0.12); [67, 72, 76].forEach((n, i) => bell(midi(n + 12), t + 0.3 + i * 0.1, 0.8, 0.16)); },
      unlock(d) { L.fanfare(d); L.neigh((d || 0) + 0.7, 0.8); },
      star(d) { const t = T(d); [84, 88, 91].forEach((n, i) => bell(midi(n), t + i * 0.08, 0.5, 0.1)); },
      hop(d) { const t = T(d); nz(t, 0.05, 0.28, 'bandpass', 900, null, 3); tone(200, t, 0.08, 'sine', 0.22, 150); },
      boing(d) { const t = T(d); tone(280, t, 0.28, 'sine', 0.2, 620); tone(560, t, 0.2, 'sine', 0.05, 1240); },
      clipclop(d, g) {
        const t = T(d), gg = g == null ? 1 : g;
        [0, 0.16, 0.36, 0.52, 0.72, 0.88].forEach((x, i) => { const k = i % 2; nz(t + x, 0.05, 0.22 * gg, 'bandpass', k ? 1250 : 900, null, 4, null, 0.15); tone(k ? 240 : 190, t + x, 0.07, 'sine', 0.2 * gg); tone(k ? 1500 : 1100, t + x, 0.02, 'square', 0.015 * gg); });
      },
      hoof(trot) { const t = T(0), f = 700 + Math.random() * 500; nz(t, 0.045, trot ? 0.3 : 0.24, 'bandpass', f, null, 4); tone(170 + Math.random() * 60, t, 0.06, 'sine', 0.12); tone(f * 1.3, t, 0.015, 'square', 0.012); },
      gallop(d) { const t = T(d); [0, 0.1, 0.2, 0.38, 0.48, 0.58].forEach((x, i) => { nz(t + x, 0.045, 0.15, 'bandpass', 700 + (i % 3) * 220, null, 3.5); tone(150 + (i % 3) * 25, t + x, 0.06, 'sine', 0.14); }); },
      neigh(d, g) { // Wiehern: Stimme gleitet hoch–runter mit zwei Formanten und leichtem Vibrato
        const t = T(d), gg = (g == null ? 1 : g) * 0.1;
        formantVoice(t, 1.0, [[0, 480], [0.12, 880], [0.4, 760], [0.75, 560], [1.0, 440]], [[700, 950, 4, 1], [1600, 2100, 3, 0.7], [2800, 3200, 2, 0.3]], gg, 'sawtooth', null, [12, 22]);
        nz(t, 0.18, 0.025 * (g == null ? 1 : g), 'bandpass', 2400, 1800, 1);
        nz(t + 0.85, 0.2, 0.02 * (g == null ? 1 : g), 'lowpass', 1500, 600, 0.8);
      },
      whinny(d) { const t = T(d); formantVoice(t, 1.5, [[0, 520], [0.1, 920], [0.35, 720], [0.55, 860], [0.8, 640], [1.1, 560], [1.5, 420]], [[720, 1000, 4, 1], [1700, 2300, 3, 0.7], [2900, 3300, 2, 0.3]], 0.09, 'sawtooth', null, [14, 30]); },
      snort(d) { const t = T(d); nz(t, 0.25, 0.12, 'bandpass', 700, 300, 0.9); nz(t + 0.18, 0.2, 0.08, 'bandpass', 900, 400, 0.9); },
      munch(d) { const t = T(d); [0, 0.17, 0.34, 0.5].forEach((x) => nz(t + x, 0.08, 0.26, 'lowpass', 1800, 600, 0.7)); },
      swish(d) { nz(T(d), 0.24, 0.2, 'bandpass', 1500, 4200, 1.2); },
      scrub(d) { const t = T(d); nz(t, 0.16, 0.25, 'bandpass', 2600, 3400, 0.8); nz(t + 0.08, 0.12, 0.05, 'highpass', 4200); },
      splash(d) { const t = T(d); nz(t, 0.35, 0.16, 'bandpass', 1800, 700, 0.7); [0, 0.07, 0.15, 0.26].forEach((x, i) => tone(500 + i * 130 + Math.random() * 60, t + 0.05 + x, 0.09, 'sine', 0.07, 1300, null, 0.3)); },
      bubble(d) { const t = T(d), f = rnd(500, 900); tone(f, t, 0.12, 'sine', 0.12, f * 1.8); },
      sparkle(d) { const t = T(d); bell(midi(pickOf([91, 93, 96, 98])), t, 0.4, 0.07); },
      quack() { const t = T(0); [0, 0.2].forEach((x) => formantVoice(t + x, 0.16, [[0, 400], [0.13, 260]], [[900, 700, 3, 1], [1800, 1400, 2, 0.5]], 0.07, 'square')); },
      chirp(d) { const t = T(d), b = rnd(2400, 3400); [0, 0.09, 0.2].forEach((x) => chirpOne(t + x, b * rnd(0.95, 1.05), b * rnd(1.15, 1.35), 0.07, 0.04)); },
      meow() { const t = T(0); formantVoice(t, 0.5, [[0, 600], [0.16, 820], [0.5, 500]], [[900, 1100, 4, 1], [2400, 2000, 3, 0.6]], 0.07, 'sawtooth', null, [6, 12]); },
      woof() { const t = T(0); [0, 0.24].forEach((x) => { formantVoice(t + x, 0.14, [[0, 330], [0.14, 190]], [[600, 450, 3, 1], [1100, 800, 2, 0.5]], 0.11, 'sawtooth'); nz(t + x, 0.05, 0.05, 'bandpass', 1200); }); },
      cluck() { const t = T(0); [0, 0.12, 0.24].forEach((x) => formantVoice(t + x, 0.09, [[0, 520], [0.08, 420]], [[1200, 1000, 1.5, 1]], 0.12, 'sawtooth')); },
      oink() { const t = T(0); [0, 0.22].forEach((x) => formantVoice(t + x, 0.2, [[0, 160], [0.08, 220], [0.2, 140]], [[500, 380, 4, 1], [1200, 900, 3, 0.6]], 0.12, 'sawtooth', null, [18, 12])); nz(t, 0.12, 0.03, 'bandpass', 600, null, 1); },
      baa() { const t = T(0); formantVoice(t, 0.7, [[0, 380], [0.3, 440], [0.7, 340]], [[900, 1200, 5, 1], [1800, 2100, 3, 0.5]], 0.09, 'sawtooth', null, [26, 18]); },
      ihaa() { const t = T(0); formantVoice(t, 0.5, [[0, 300], [0.25, 520]], [[800, 1100, 4, 1]], 0.09, 'sawtooth', null, [10, 12]); formantVoice(t + 0.5, 0.6, [[0, 260], [0.6, 190]], [[700, 500, 4, 1]], 0.09, 'sawtooth', null, [10, 10]); },
      squeak() { const t = T(0); chirpOne(t, 1800, 2600, 0.09, 0.05); chirpOne(t + 0.1, 2100, 3000, 0.08, 0.04); },
      door() { const t = T(0); tone(196, t, 0.3, 'triangle', 0.14, 150); nz(t, 0.24, 0.04, 'lowpass', 600); },
      clap() { nz(T(0), 0.05, 0.3, 'bandpass', 1500 + Math.random() * 900, null, 1.4); },
      moo() { const t = T(0); formantVoice(t, 1.2, [[0, 140], [0.4, 170], [1.2, 120]], [[400, 520, 4, 1], [900, 700, 3, 0.5]], 0.13, 'sawtooth', null, [5, 4]); },
      cowbell(d) { const t = T(d); [0, 0.42, 0.95].forEach((x) => { tone(540, t + x, 0.55, 'triangle', 0.04, null, E.ambBus, 0.3); tone(812, t + x, 0.4, 'sine', 0.025, null, E.ambBus); }); },
      rooster() { const t = T(0); formantVoice(t, 0.9, [[0, 520], [0.12, 700], [0.14, 640], [0.28, 780], [0.3, 700], [0.5, 800], [0.9, 560]], [[1000, 1400, 4, 1], [2200, 2600, 2, 0.4]], 0.07, 'sawtooth', null, [9, 20]); },
      buzz() { const t = T(0), o = c.createOscillator(), v = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 220; l.frequency.value = 7; lg.gain.value = 18; l.connect(lg); lg.connect(o.frequency); E.env(v, t, 0.05, 0.25, 1.5); o.connect(v); v.connect(E.sfxBus); o.start(t); l.start(t); o.stop(t + 1.6); l.stop(t + 1.6); },
      wind() { nz(T(0), 2.8, 0.035, 'bandpass', 400, 900, 0.6, E.ambBus); },
      putt() { const t = T(0); [0, 0.14, 0.28, 0.42, 0.56, 0.7].forEach((x) => nz(t + x, 0.07, 0.14, 'lowpass', 260, null, 1)); },
      honk() { const t = T(0); tone(392, t, 0.2, 'square', 0.035); tone(392, t + 0.24, 0.26, 'square', 0.035); },
      chime() { const t = T(0); [67, 60, 62, 55].forEach((n, i) => { bell(midi(n + 12), t + i * 0.6, 1.6, 0.12, E.sfxBus); tone(midi(n - 12), t + i * 0.6, 2, 'sine', 0.04); }); },
      sleigh() { const t = T(0); for (let i = 0; i < 8; i++) bell(2093 + (i % 3) * 120, t + i * 0.11, 0.26, 0.03); },
      treasure() { const t = T(0); [79, 83, 86, 91, 95].forEach((n, i) => bell(midi(n), t + i * 0.09, 1.0, 0.15)); bell(midi(100), t + 0.5, 1.3, 0.06); },
      drop(d) { const t = T(d); tone(700, t, 0.1, 'sine', 0.2, 300); nz(t, 0.02, 0.04, 'bandpass', 1800); },
      stick(d) { const t = T(d); nz(t, 0.03, 0.2, 'bandpass', 500, null, 3); tone(260, t, 0.1, 'triangle', 0.2, 190); }, // Zehnerstange
      cube(d) { const t = T(d); nz(t, 0.025, 0.18, 'bandpass', 1100, null, 3); tone(520, t, 0.07, 'triangle', 0.18, 420); },
      whoosh(d) { nz(T(d), 0.35, 0.22, 'bandpass', 600, 2600, 0.8); },
      page(d) { const t = T(d); nz(t, 0.12, 0.2, 'bandpass', 2400, 1200, 0.7); nz(t + 0.1, 0.1, 0.1, 'highpass', 3500); },
      sticker(d) { const t = T(d); nz(t, 0.14, 0.07, 'bandpass', 3000, 1500, 0.8); bell(midi(91), t + 0.12, 0.5, 0.1); },
      tick(d) { const t = T(d); tone(1700, t, 0.03, 'square', 0.09); },
      owl() { const t = T(0); [0, 0.5].forEach((x) => formantVoice(t + x, 0.35, [[0, 330], [0.12, 300], [0.35, 280]], [[420, 380, 6, 1]], 0.09, 'sine')); },
      frog() { const t = T(0); [0, 0.14].forEach((x) => formantVoice(t + x, 0.12, [[0, 180], [0.1, 260]], [[500, 800, 5, 1]], 0.08, 'sawtooth', null, [40, 40])); },
      cricket() { const t = T(0), o = c.createOscillator(), v = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = 'sine'; o.frequency.value = 4300; l.type = 'square'; l.frequency.value = 28; lg.gain.value = 0.5; v.gain.value = 0; l.connect(lg); lg.connect(v.gain); const g2 = c.createGain(); E.env(g2, t, 0.025, 0.1, 1.1); o.connect(v); v.connect(g2); g2.connect(E.ambBus); o.start(t); l.start(t); o.stop(t + 1.2); l.stop(t + 1.2); },
      gull() { const t = T(0); formantVoice(t, 0.5, [[0, 900], [0.15, 1300], [0.5, 800]], [[1500, 1900, 4, 1]], 0.04, 'sawtooth', E.ambBus, [8, 30]); },
      whistle() { const t = T(0); chirpOne(t, 1900, 2600, 0.18, 0.05); chirpOne(t + 0.22, 2500, 1700, 0.25, 0.05); },
      fire() { const t = T(0); for (let i = 0; i < 5; i++) nz(t + Math.random() * 1.5, 0.03, 0.05, 'bandpass', 1500 + Math.random() * 2500, null, 2, E.ambBus); },
      clock() { const t = T(0); [0, 1, 2].forEach((x) => { tone(900, t + x, 0.025, 'square', 0.018, null, E.ambBus); tone(700, t + x + 0.5, 0.025, 'square', 0.015, null, E.ambBus); }); },
      twinkle() { const t = T(0); bell(midi(pickOf([96, 98, 100, 103])), t, 0.5, 0.03, E.ambBus); },
      stream() { nz(T(0), 2.4, 0.03, 'bandpass', 1800, 3200, 0.6, E.ambBus); },
      wave() { const t = T(0); const v = nz(t, 4, 0.1, 'bandpass', 500, 900, 0.5, E.ambBus); },
      bigbell() { const t = T(0); [1, 2.4, 3.8, 5.9].forEach((p, i) => tone(196 * p, t, 3 - i * 0.5, 'sine', 0.1 / (i + 1), null, E.sfxBus, 0.5)); },
      jingle(k) { // Willkommens-Melodie je Welt
        const t = T(0), J = [[72, 76, 79, 84, 79], [74, 78, 81, 86, 81], [77, 81, 84, 79, 89], [69, 72, 76, 81, 76], [76, 81, 84, 88, 93], [64, 67, 71, 76, 83]][k % 6];
        const inst = [E.musicBox, E.pluck, E.marimba, E.flute, E.harp, E.kalimba][k % 6];
        J.forEach((n, i) => { const f = midi(n), tt = t + i * 0.18; if (inst === E.flute) E.flute(f, tt, 0.4, 0.09, E.sfxBus); else if (inst === E.pluck) E.pluck(f, tt, 0.2, E.sfxBus); else inst(f, tt, 0.2, E.sfxBus); });
        bell(midi(J[4] + 12), t + 0.95, 1.2, 0.08);
      }
    };
    return L;
  }

  // ======================= Musik =======================
  // Jede Melodie entsteht aus festem Zufalls-Startwert (immer gleich) über einer Akkordfolge: ruhig, pentatonisch, ohne Misstöne.
  const SCALES = { maj: [0, 2, 4, 7, 9], min: [0, 3, 5, 7, 10], lyd: [0, 2, 4, 6, 7, 9, 11], dor: [0, 2, 3, 5, 7, 9, 10] };
  const THEMES = {
    home:    { root: 60, bpm: 92, pent: 'maj', prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], bass: [0, -3, -7, -5], inst: 'musicBox', arp: 'up', seed: 11, dens: 0.6, pad: 0.05 },
    hof:     { root: 55, bpm: 84, pent: 'maj', prog: [[0, 4, 7], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2]].map((a) => a.map((x) => x + 0)), bass: [0, -5, -7, -5], inst: 'pluck', arp: 'roll', seed: 23, dens: 0.55, pad: 0.05, lead: 'flute' },
    hofNacht:{ root: 53, bpm: 62, pent: 'maj', prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 5]], bass: [0, -3, -7, -5], inst: 'musicBox', arp: 'slow', seed: 31, dens: 0.4, pad: 0.07 },
    stube:   { root: 57, bpm: 70, pent: 'maj', prog: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]], bass: [0, -5, -3, -7], inst: 'harp', arp: 'slow', seed: 37, dens: 0.45, pad: 0.06 },
    lern:    { root: 62, bpm: 72, pent: 'maj', prog: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]], bass: [0, -3, -5, -7], inst: 'marimba', arp: 'slow', seed: 41, dens: 0.3, pad: 0.05 },
    spiel:   { root: 60, bpm: 108, pent: 'maj', prog: [[0, 4, 7], [-7, -3, 0], [-5, -1, 2], [0, 4, 7]], bass: [0, -7, -5, 0], inst: 'marimba', arp: 'up', seed: 47, dens: 0.7, pad: 0.03 },
    ritt:    { root: 57, bpm: 100, pent: 'maj', prog: [[0, 4, 7], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2]], bass: [0, -5, -7, -5], inst: 'pluck', arp: 'up', seed: 53, dens: 0.6, pad: 0.04, perc: true },
    w0: { root: 60, bpm: 100, pent: 'maj', prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], bass: [0, -3, -7, -5], inst: 'musicBox', arp: 'up', seed: 101, dens: 0.6, pad: 0.04 },
    w1: { root: 62, bpm: 96, pent: 'maj', prog: [[0, 4, 7], [-2, 2, 5], [-7, -3, 0], [-2, 2, 5]], bass: [0, -2, -7, -2], inst: 'pluck', arp: 'roll', seed: 102, dens: 0.55, pad: 0.04 },
    w2: { root: 65, bpm: 90, pent: 'maj', prog: [[0, 4, 7, 11], [2, 6, 9], [-5, -1, 2], [0, 4, 7]], bass: [0, 2, -5, 0], inst: 'marimba', arp: 'up', seed: 103, dens: 0.6, pad: 0.04 },
    w3: { root: 57, bpm: 78, pent: 'min', prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-7, -3, 0]], bass: [0, -4, -2, -7], inst: 'harp', arp: 'slow', seed: 104, dens: 0.4, pad: 0.07, lead: 'flute' },
    w4: { root: 57, bpm: 88, pent: 'min', prog: [[0, 3, 7], [3, 7, 10], [-4, 0, 3], [-5, -1, 2]], bass: [0, 3, -4, -5], inst: 'harp', arp: 'up', seed: 105, dens: 0.55, pad: 0.05 },
    w5: { root: 52, bpm: 72, pent: 'min', prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], bass: [0, -4, 3, -2], inst: 'kalimba', arp: 'slow', seed: 106, dens: 0.45, pad: 0.07 }
  };
  const BARS = 8;
  function scheduleBar(E, th, barIdx, t0, level, dst, flags) {
    const beat = 60 / th.bpm, bar = beat * 4, rnd = mulberry(th.seed * 1000 + (barIdx % BARS) * 17 + (flags && flags.variant || 0) * 3);
    const ch = th.prog[Math.floor((barIdx % BARS) / 2) % th.prog.length];
    const bassN = th.bass[Math.floor((barIdx % BARS) / 2) % th.bass.length];
    const g = level;
    // Pad
    ch.forEach((n) => E.pad(midi(th.root + n), t0, bar * 1.05, th.pad * g, dst));
    // Bass
    E.softBass(midi(th.root + bassN - 12), t0, beat * 1.6, 0.16 * g, dst);
    if ((barIdx % 2) === 1) E.softBass(midi(th.root + bassN - 12 + 7), t0 + beat * 2, beat * 1.2, 0.1 * g, dst);
    // Begleit-Arpeggio
    const inst = E[th.inst] || E.pluck;
    const tones = ch.map((n) => th.root + n + 12);
    const steps = th.arp === 'slow' ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
    const eighth = beat / 2;
    steps.forEach((s, i) => {
      if (rnd() > th.dens + 0.35) return;
      const n = th.arp === 'roll' ? tones[(i % 2) ? 1 : (i % 4 ? 2 : 0)] : tones[i % tones.length] + (i >= 4 && th.arp === 'up' ? 12 : 0);
      const f = midi(n), tt = t0 + s * eighth;
      if (inst === E.pluck) E.pluck(f, tt, 0.15 * g, dst); else inst(f, tt, 0.14 * g, dst);
    });
    // Melodie (pentatonisch über Akkordtönen)
    const sc = SCALES[th.pent] || SCALES.maj;
    const slots = [0, 1.5, 2, 3, 3.5];
    let prev = th.root + 12 + sc[2];
    slots.forEach((sl, i) => {
      if (rnd() > th.dens + 0.05) return;
      const oct = rnd() < 0.25 ? 12 : 0;
      const cand = []; for (let o = 0; o <= 24; o += 12) sc.forEach((d) => cand.push(th.root + 12 + o + d));
      cand.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
      let n = cand[Math.floor(rnd() * 3)];
      if (i === 0 && rnd() < 0.7) { n = (ch.map((x) => th.root + 12 + ((x % 12) + 12) % 12).sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev)))[0]; }
      n = Math.max(th.root + 7, Math.min(th.root + 33, n + (oct && n < th.root + 24 ? oct : 0)));
      prev = n;
      const f = midi(n), tt = t0 + sl * beat, dur = beat * (rnd() < 0.5 ? 0.9 : 1.6);
      if (th.lead === 'flute') E.flute(f, tt, dur, 0.1 * g, dst); else if (inst === E.musicBox) E.bell(f, tt, 0.9, 0.09 * g, dst); else E.bell(f, tt, 0.8, 0.075 * g, dst);
    });
    if (th.perc) [0, 1, 2, 3].forEach((s) => { E.nz(t0 + s * beat, 0.04, 0.06 * g, 'bandpass', s % 2 ? 1900 : 1300, null, 3, dst); E.tone(s % 2 ? 170 : 130, t0 + s * beat, 0.07, 'sine', 0.06 * g, null, dst); });
  }

  // ======================= Hauptobjekt =======================
  let ctx = null, E = null, L = null, started = false;
  let pendingScene = null, scene = null, themeName = null;
  let musicTimer = 0, nextBarT = 0, barCount = 0, musicActive = null;
  let ambTimers = [], ambBed = null;
  let streak = 0;

  function applyGains() {
    if (!E) return;
    const k = cfg(), t = E.now();
    E.master.gain.cancelScheduledValues(t); E.master.gain.setTargetAtTime(k.on ? 0.24 * k.vol : 0, t, 0.05);
    E.sfxBus.gain.setTargetAtTime(k.sfx ? 2 : 0, t, 0.03);
    E.musicBus.gain.setTargetAtTime(k.music ? 0.15 + 0.45 * k.mvol : 0, t, 0.2);
    E.ambBus.gain.setTargetAtTime(k.amb ? 1.6 : 0, t, 0.3);
  }
  function ensure() {
    const k = cfg();
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return null; } }
      E = createEngine(ctx); L = sfxLib(E);
      try { ctx.onstatechange = () => { if (ctx.state === 'running') onRunning(); }; } catch (e) { /* ignore */ }
    }
    if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
    applyGains();
    return k.on ? ctx : null;
  }
  function onRunning() { startScene(); }
  // iOS-Entsperrung: erster Berührungs-Gesten erzeugt/resumed den Context und spielt einen stillen Puffer
  function unlock() {
    const c = ensure(); if (!ctx) return;
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) { /* ignore */ }
    if (ctx.state === 'running') { if (!started) { started = true; } startScene(); }
    return c;
  }
  function play(name, ...a) {
    const c = ensure(); if (!c || !L || !L[name]) return;
    const k = cfg(); if (!k.sfx) return;
    try { L[name](...a); } catch (e) { /* ein Klang darf nie die App stören */ }
  }
  // ---------- Musik-Steuerung ----------
  function stopMusic() { clearInterval(musicTimer); musicTimer = 0; musicActive = null; }
  function startMusic(name) {
    stopMusic(); if (!ctx || !E) return;
    const k = cfg(); if (!k.on || !k.music || !THEMES[name]) return;
    const th = THEMES[name]; barCount = 0; musicActive = name;
    nextBarT = E.now() + 0.25;
    const lvl = name === 'lern' || (scene && scene.name === 'game') ? 0.7 : 1;
    const tick = () => {
      if (!ctx || ctx.state !== 'running') return;
      const bar = (60 / th.bpm) * 4;
      while (nextBarT < E.now() + 0.8) { scheduleBar(E, th, barCount, nextBarT, lvl, E.musicBus, { variant: Math.floor(barCount / BARS) % 2 }); barCount++; nextBarT += bar; }
    };
    tick(); musicTimer = setInterval(tick, 200);
  }
  function stopAmb() { ambTimers.forEach((t) => clearTimeout(t)); ambTimers = []; if (ambBed) { try { ambBed.stop(); } catch (e) { /* ignore */ } ambBed = null; } }
  const AMB = {
    hof: (o) => o.mood === 'evening' ? [['cricket', 5, 12], ['owl', 14, 30], ['wind', 10, 22], ['whistle', 30, 60]] : [['chirp', 3, 8], ['cowbell', 11, 24], ['moo', 22, 45], ['wind', 9, 20], o.season === 'winter' ? ['sleigh', 60, 90] : ['buzz', 14, 30], ['clipclop', 40, 80], ['quack', 20, 40]],
    room: () => [['fire', 2, 4], ['clock', 6, 10], ['wind', 25, 45]],
    w0: () => [['chirp', 2.5, 6], ['buzz', 10, 18], ['wind', 14, 26]],
    w1: () => [['cluck', 8, 16], ['chirp', 4, 9], ['baa', 22, 40], ['wind', 10, 20]],
    w2: () => [['wave', 4, 6], ['gull', 7, 16], ['splash', 18, 32], ['wind', 14, 26]],
    w3: () => [['stream', 2.2, 3.4], ['wind', 6, 12], ['whistle', 14, 28], ['chirp', 9, 18]],
    w4: () => [['twinkle', 1.5, 4], ['wind', 12, 24], ['chime', 40, 70], ['chirp', 12, 24]],
    w5: () => [['cricket', 3, 8], ['owl', 12, 25], ['frog', 7, 16], ['twinkle', 2, 5], ['wind', 14, 26]]
  };
  function startAmb(key, o) {
    stopAmb(); if (!ctx || !E) return;
    const k = cfg(); if (!k.on || !k.amb) return;
    const def = AMB[key]; if (!def) return;
    // leises Hintergrundrauschen (Wind / Wellen / Bach) als Dauerton
    const bed = E.c.createBufferSource(); bed.buffer = E.noise(); bed.loop = true;
    const f = E.c.createBiquadFilter(), g = E.c.createGain(), l = E.c.createOscillator(), lg = E.c.createGain();
    const profile = { w2: [500, 0.06, 0.12], w3: [2200, 0.03, 0.25], hof: [380, 0.018, 0.08], room: [200, 0.006, 0.05] }[key] || [420, 0.015, 0.07];
    f.type = key === 'w3' ? 'highpass' : 'bandpass'; f.frequency.value = profile[0]; f.Q.value = 0.5; g.gain.value = profile[1];
    l.frequency.value = profile[2]; lg.gain.value = profile[1] * 0.7; l.connect(lg); lg.connect(g.gain);
    bed.connect(f); f.connect(g); g.connect(E.ambBus); bed.start(); l.start();
    ambBed = { stop() { try { bed.stop(); l.stop(); } catch (e) { /* ignore */ } } };
    def(o || {}).forEach(([name, lo, hi]) => {
      const loop = () => { ambTimers.push(setTimeout(() => { if (ctx && ctx.state === 'running' && cfg().amb && L[name]) { try { L[name](); } catch (e) { /* ignore */ } } loop(); }, rnd(lo, hi) * 1000)); };
      ambTimers.push(setTimeout(loop, rnd(0.5, 3) * 1000));
    });
  }
  function resolveTheme(sc) {
    if (!sc) return null;
    const o = sc.opts || {};
    switch (sc.name) {
      case 'home': return { music: 'home', amb: null };
      case 'hof': return { music: o.mood === 'evening' ? 'hofNacht' : 'hof', amb: 'hof' };
      case 'room': return { music: 'stube', amb: 'room' };
      case 'map': return { music: 'w' + (o.world || 0), amb: 'w' + (o.world || 0) };
      case 'game': return { music: o.world != null ? 'w' + o.world : 'lern', amb: null };
      case 'ride': return { music: 'ritt', amb: null };
      case 'mini': return { music: 'spiel', amb: null };
      case 'end': return { music: themeName, amb: null, keep: true };
      default: return { music: null, amb: null };
    }
  }
  function startScene() {
    const sc = pendingScene || scene; if (!sc || !ctx || !E || ctx.state !== 'running') return;
    pendingScene = null; scene = sc;
    const r = resolveTheme(sc);
    if (r.keep) return;
    const k = cfg();
    if (r.music !== musicActive || (!musicTimer && k.music && r.music)) { themeName = r.music; if (r.music && k.music && k.on) startMusic(r.music); else stopMusic(); }
    const ambKey = r.amb; stopAmb(); if (ambKey) startAmb(ambKey, sc.opts);
  }
  function setScene(name, opts) {
    const sc = { name, opts: opts || {} };
    if (name === 'end') { if (scene && scene.name === 'game') { scene = Object.assign({}, scene, { name: 'end' }); stopAmb(); } return; }
    pendingScene = sc; scene = sc;
    if (ctx && ctx.state === 'running') startScene();
  }
  // Sanfte Musik-Absenkung bei Fanfaren
  function duck(sec) { if (!E) return; const t = E.now(), k = cfg(); try { E.musicBus.gain.cancelScheduledValues(t); E.musicBus.gain.setTargetAtTime(k.music ? 0.04 : 0, t, 0.05); E.musicBus.gain.setTargetAtTime(k.music ? 0.15 + 0.45 * k.mvol : 0, t + (sec || 2.2), 0.6); } catch (e) { /* ignore */ } }

  const API = {
    attach(fn) { getS = fn; },
    unlock, ensure, setScene, applySettings() { if (!ctx) return; applyGains(); const k = cfg(); if (!k.on || !k.music) stopMusic(); if (!k.on || !k.amb) stopAmb(); if (ctx.state === 'running') { pendingScene = scene; musicActive = (k.music && k.on) ? musicActive : null; startScene(); } },
    get state() { return ctx ? ctx.state : 'none'; },
    get musicPlaying() { return !!musicTimer; },
    get scene() { return scene; },
    streakReset() { streak = 0; },
    // Kompatibilität mit bisherigen Aufrufen
    tap() { play('tap'); }, pop() { play('pop'); }, plop() { play('plop'); },
    correct() { streak = Math.min(4, streak + 1); play('correct', 0, streak - 1); },
    hint() { streak = 0; play('hint'); },
    fanfare() { play('fanfare'); duck(3); }, reward() { play('fanfare'); duck(3); },
    // alle weiteren Effekte
    themes: THEMES,
    // Test-Hilfen: Offline-Rendern (kein Hörtest nötig, prüft Pegel/Stille)
    async _render(kind, name, secs, arg) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const sr = 44100, oc = new OAC(2, Math.ceil(sr * secs), sr);
      const e = createEngine(oc, true), l = sfxLib(e);
      e.master.gain.value = 0.24 * 0.5; e.sfxBus.gain.value = 2; e.musicBus.gain.value = 0.15 + 0.45 * 0.5; e.ambBus.gain.value = 1.6;
      const s0 = e.now();
      if (kind === 'sfx') l[name](0, arg);
      else if (kind === 'music') { const th = THEMES[name], bar = (60 / th.bpm) * 4; for (let i = 0, t = 0.05; t < secs - 0.1; i++, t += bar) scheduleBar(e, th, i, t, 1, e.musicBus, { variant: 0 }); }
      const buf = await oc.startRendering();
      const d = buf.getChannelData(0); let peak = 0, sum = 0, nan = 0, clip = 0;
      for (let i = 0; i < d.length; i++) { const v = d[i]; if (v !== v) { nan++; continue; } const a = Math.abs(v); if (a > peak) peak = a; if (a >= 0.999) clip++; sum += v * v; }
      return { peak, rms: Math.sqrt(sum / d.length), nan, clip, secs, samples: d.length };
    },
    _names: () => Object.keys(sfxLib(createEngine(new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100)))),
    _themeNames: () => Object.keys(THEMES)
  };
  // SFX-Namen, die nicht oben stehen, dynamisch ergänzen
  ['hop', 'clipclop', 'neigh', 'whinny', 'snort', 'munch', 'swish', 'scrub', 'splash', 'bubble', 'sparkle', 'quack', 'chirp', 'meow', 'woof', 'cluck', 'oink', 'baa', 'ihaa', 'squeak', 'door', 'clap', 'moo', 'cowbell', 'rooster', 'buzz', 'wind', 'putt', 'honk', 'chime', 'sleigh', 'treasure', 'hoof', 'gallop', 'boing', 'coin', 'buy', 'unlock', 'star', 'levelUp', 'softno', 'drop', 'stick', 'cube', 'whoosh', 'page', 'sticker', 'tick', 'owl', 'frog', 'cricket', 'gull', 'whistle', 'fire', 'clock', 'twinkle', 'stream', 'wave', 'bigbell', 'jingle'].forEach((n) => { API[n] = (...a) => play(n, ...a); });
  API.hoof = (trot) => play('hoof', trot);
  API.buy = () => { play('buy'); duck(2); };
  API.unlock_item = () => { play('unlock'); duck(3); };
  API.levelUp = () => { play('levelUp'); duck(2); };
  API.worldJingle = (k) => play('jingle', k);
  window.PMSound = API;
  // Erste Berührung entsperrt Audio (iOS Safari); bleibt aktiv, bis der Context wirklich „running“ ist
  ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { unlock(); }, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { try { ctx.suspend(); } catch (e) { /* ignore */ } } else { try { ctx.resume(); } catch (e) { /* ignore */ } }
  });
  window.addEventListener('pagehide', () => { try { if (ctx) ctx.suspend(); } catch (e) { /* ignore */ } });
  window.addEventListener('pageshow', () => { try { if (ctx) ctx.resume(); } catch (e) { /* ignore */ } });
})();
