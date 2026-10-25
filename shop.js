/* Pferde-Mathe – Hofladen, Katalog, Kauf-Ablauf, Pflege, Reiterstübchen, Sticker-Album
   Alle Käufe laufen über Hufeisen (und manchmal Karotten). Bestehende Käufe (S.owned, S.clothes, S.pos) bleiben unverändert. */
(window.PM_MODS = window.PM_MODS || []).push(function (core) {
'use strict';
const { h, $, $$, range, pick, shuffle, rand, Sound, ITEMS, HORSES, HORSE_ORDER, DEFAULT_HNAMES, ADULT, CLOTHES, WCATS, hooks } = core;
const SHOE = '<span class="ih">' + core.SHOE + '</span>';
const PA = window.PMArt;
const st = () => core.S;
const today = () => new Date().toDateString();
const hasId = (id) => st().owned.includes(id);
const fmt = (n) => String(n);

// =====================================================================
// Neue Pferde: Aussehen, Namen
// =====================================================================
const NEW_HORSES = [
  { id: 'funke', nm: 'Funke', kind: 'Fuchs', price: 40, look: { body: '#c9692f', mane: '#7a3414', muzzle: '#e6b890', blaze: true, socks: '#fff8ee' }, s: 26 },
  { id: 'puenktchen', nm: 'Pünktchen', kind: 'Schecke', price: 55, look: { body: '#fbf5ec', mane: '#5a3a2a', muzzle: '#f1dcc8', patch: '#8a5a3a' }, s: 26 },
  { id: 'sonnenschein', nm: 'Sonnenschein', kind: 'Palomino', price: 70, look: { body: '#e9c46a', mane: '#fbf3dc', muzzle: '#f3e0b0', blaze: true }, s: 27 },
  { id: 'mohn', nm: 'Mohn', kind: 'Fohlen', price: 60, look: { body: '#7a5244', mane: '#d94f4f', muzzle: '#b8907c', blaze: true, foal: true, socks: '#fff8ee' }, s: 16 },
  { id: 'mondlicht', nm: 'Mondlicht', kind: 'Apfelschimmel', price: 90, look: { body: '#c9d3e0', mane: '#7f8aa3', muzzle: '#e3e8ee', spots: '#aeb9cc' }, s: 27 },
  { id: 'sternschnuppe', nm: 'Sternschnuppe', kind: 'Einhorn', price: 180, look: { body: '#fdf6ff', mane: '#c79ff0', muzzle: '#f8e8fb', horn: true, wings: true }, s: 28, req: { text: 'Erst den Zauberwald schaffen 🌲', ok: () => hasId('zauberlaterne') } }
];
NEW_HORSES.forEach((nh) => {
  HORSES[nh.id] = nh.look; DEFAULT_HNAMES[nh.id] = nh.nm;
  if (!HORSE_ORDER.includes(nh.id)) HORSE_ORDER.push(nh.id);
  if (!nh.look.foal && !ADULT.includes(nh.id)) ADULT.push(nh.id);
});

// =====================================================================
// Katalog
// =====================================================================
// Jeder Eintrag: id, cat, name, price (Hufeisen), carrots (optional), art(), kind
const CAT = [];
const add = (o) => { CAT.push(o); return o; };
const A = PA.A, B = PA.B, R = PA.R, S = PA.S;

// Pferde (neue + vorhandene)
NEW_HORSES.forEach((nh) => {
  ITEMS.push({ id: nh.id, name: () => `${nh.kind} ${core.horseName(nh.id)}`, price: nh.price, horse: nh.id, s: nh.s, x: 50, y: 88, nu: true });
  add({ id: nh.id, cat: 'pferde', kind: 'farm', name: nh.kind + ' ' + nh.nm, price: nh.price, horse: nh.id, req: nh.req, sub: nh.kind === 'Einhorn' ? 'Ein Zauberwesen mit Flügeln!' : nh.kind === 'Fohlen' ? 'Ein kleines, freches Fohlen' : 'Ein neues Pferd für deinen Hof' });
});
['wolke', 'pony', 'fohlen', 'nacht'].forEach((id) => { const it = ITEMS.find((i) => i.id === id); add({ id, cat: 'pferde', kind: 'farm', old: true, name: () => core.itemName(it), price: it.price, horse: id, sub: 'Schon im Stall-Laden 🛒' }); });
// Pferdeschmuck (wird im Pflege-Bereich angezogen)
const ACC = [
  { id: 'kranz', name: 'Blumenkranz', price: 30, art: () => PA.svg('0 0 60 60', `<path d="M8 40 Q30 6 52 40" stroke="#6fbf6a" stroke-width="6" fill="none" stroke-linecap="round"/>${[[12, 34, '#f7a8c4'], [20, 20, '#fff'], [30, 14, '#ffd27a'], [40, 20, '#f7a8c4'], [48, 34, '#fff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/><circle cx="${x}" cy="${y}" r="2" fill="#ffd27a"/>`).join('')}`) },
  { id: 'glocke', name: 'Glöckchen-Halsband', price: 25, art: () => PA.svg('0 0 60 60', `<path d="M8 20 Q30 44 52 20" stroke="#ec6f9c" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="30" cy="40" r="10" fill="#f6cf5a" stroke="#c9962a" stroke-width="2.4"/><path d="M22 42 h16" stroke="#c9962a" stroke-width="1.6"/><circle cx="30" cy="46" r="2" fill="#c9962a"/>`) },
  { id: 'stern', name: 'Stirn-Stern', price: 35, art: () => PA.svg('0 0 60 60', `<path d="M30 6 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2z" fill="#ffe08a" stroke="#e5b84a" stroke-width="2.4" stroke-linejoin="round"/>`) },
  { id: 'haube', name: 'Kuschel-Mütze', price: 28, art: () => PA.svg('0 0 60 60', `<path d="M10 44 Q6 8 32 8 Q56 10 50 44 Z" fill="#b39ddb"/><path d="M10 44 H50" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle cx="32" cy="7" r="6" fill="#fff"/>`) }
];
ACC.forEach((a) => add({ id: 'acc_' + a.id, cat: 'pferde', kind: 'acc', acc: a.id, name: a.name, price: a.price, art: a.art, sub: 'Zum Anziehen: 🧼 Pflege-Bereich' }));
// Pflege-Werkzeuge
const TOOLS = [
  { id: 'schwamm', name: 'Schwamm', price: 25, sub: 'Schlamm abwaschen', art: () => PA.svg('0 0 60 60', `<rect x="10" y="20" width="40" height="26" rx="10" fill="#ffd966"/>${[[20, 30], [34, 28], [28, 38], [42, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#f2b84a"/>`).join('')}<circle cx="46" cy="14" r="5" fill="#bfe6f8"/><circle cx="52" cy="22" r="3" fill="#bfe6f8"/>`) },
  { id: 'kratzer', name: 'Hufkratzer', price: 20, sub: 'Hufe sauber machen', art: () => PA.svg('0 0 60 60', `<rect x="8" y="28" width="30" height="10" rx="5" fill="#7cc4ea" transform="rotate(-20 23 33)"/><path d="M34 22 L50 12 L52 18 L40 28Z" fill="#9aa3ad"/>`) },
  { id: 'flecht', name: 'Flechtband', price: 30, sub: 'Mähne flechten', art: () => PA.svg('0 0 60 60', `<path d="M16 8 Q8 30 22 52 M30 8 Q22 30 36 52" stroke="#f48fb1" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M12 22 h14 M16 34 h14 M20 46 h14" stroke="#fff" stroke-width="3" opacity=".8"/><circle cx="46" cy="24" r="7" fill="#f48fb1"/>`) },
  { id: 'spray', name: 'Glanzspray', price: 35, sub: 'Funkelnde Mähne', art: () => PA.svg('0 0 60 60', `<rect x="20" y="22" width="20" height="32" rx="6" fill="#d6c2f2"/><rect x="24" y="12" width="12" height="12" rx="3" fill="#b39ddb"/><path d="M42 10 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z M12 16 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6z" fill="#ffd966"/>`) }
];
TOOLS.forEach((t) => add({ id: 'care_' + t.id, cat: 'pflege', kind: 'tool', tool: t.id, name: t.name, price: t.price, art: t.art, sub: t.sub }));

// Hof & Gebäude: id, Name, Preis, Bild, Größe (vmin), Standard-x/y, Optionen
const FARMDEF = [
  ['brunnen', 'Brunnen mit Dach', 35, B.brunnen, 11, { snd: 'splash' }], ['bank', 'Gartenbank', 28, B.bank, 11, {}], ['schaukel', 'Schaukel', 45, B.schaukel, 12, { snd: 'boing' }],
  ['windrad', 'Windrad', 30, B.windrad, 7, { snd: 'whoosh' }], ['vogelhaus', 'Vogelhaus', 26, B.vogelhaus, 7, { snd: 'chirp' }], ['laternenpfahl', 'Hoflaterne', 32, B.laternenpfahl, 5.4, { snd: 'chime' }],
  ['blumenkuebel', 'Blumenkübel', 22, B.blumenkuebel, 7, { snd: 'sparkle' }], ['heuschober', 'Heuschober', 40, B.heuschober, 11, { snd: 'plop' }], ['apfelstand', 'Apfelstand', 60, B.apfelstand, 15, { snd: 'chime' }],
  ['pavillon', 'Pavillon', 95, B.pavillon, 19, { snd: 'sparkle' }], ['gewaechshaus', 'Gewächshaus', 85, B.gewaechshaus, 18, { snd: 'sparkle' }], ['sattelkammer', 'Sattelkammer', 90, B.sattelkammer, 15, { snd: 'door' }],
  ['stallanbau', 'Stall-Anbau', 120, B.stallanbau, 24, { snd: 'door' }], ['springbrunnen', 'Springbrunnen', 110, B.springbrunnen, 15, { snd: 'splash' }], ['windmuehle', 'Windmühle', 130, B.windmuehle, 17, { snd: 'whoosh' }],
  ['teich', 'Kleiner Teich', 70, B.teich, 22, { snd: 'splash', flat: true }], ['reithalle', 'Reithalle', 150, B.reithalle, 34, { snd: 'door' }]
];
FARMDEF.forEach(([id, name, price, art, s, o]) => {
  const e = { id, name, price, art, s, x: 50, y: 90, nu: true, snd: o.snd || 'plop', flat: !!o.flat };
  ITEMS.push(Object.assign({}, e, { art: () => art() }));
  add({ id, cat: 'hof', kind: 'farm', name, price, art, sub: price >= 90 ? 'Ein großes Gebäude' : 'Zum Aufstellen und Verschieben' });
});
// Tiere
const PETS = [['hase', 'Hase Hoppel', 40, A.hase, 8, 'squeak'], ['lamm', 'Lamm Wölkchen', 50, A.lamm, 10, 'baa'], ['esel', 'Esel Grauchen', 75, A.esel, 14, 'ihaa'], ['eichhoernchen', 'Eichhörnchen Nuss', 45, A.eichhoernchen, 7, 'squeak'], ['eule', 'Eule Uhu', 55, A.eule, 8, 'owl'], ['igel', 'Igel Stachel', 35, A.igel, 8, 'squeak']];
PETS.forEach(([id, name, price, art, s, snd]) => {
  ITEMS.push({ id, name, price, art: () => art(), s, x: 50, y: 92, nu: true, snd });
  add({ id, cat: 'tiere', kind: 'farm', name, price, art, sub: 'Tippe es an – es sagt Hallo!' });
});
['kaetzchen', 'huehner', 'hund'].forEach((id) => { const it = ITEMS.find((i) => i.id === id); add({ id, cat: 'tiere', kind: 'farm', old: true, name: it.name, price: it.price, art: () => it.art(), sub: 'Schon im Stall-Laden 🛒' }); });
// Saison
const SEAS = [
  ['kuerbisbeet', 'Kürbisbeet', 25, 1, S.kuerbisbeet, 12, 'autumn', 'pop'], ['laubhaufen', 'Laubhaufen', 20, 0, S.laubhaufen, 11, 'autumn', 'swish'], ['windspiel', 'Windspiel', 24, 0, S.windspiel, 6, 'autumn', 'chime'],
  ['laternenfest', 'Laternenfest', 28, 1, S.laternenfest, 8, 'autumn', 'chime'],
  ['schneemann', 'Schneemann', 30, 1, S.schneemann, 8, 'winter', 'sparkle'], ['tannenbaum', 'Tannenbaum mit Lichtern', 45, 1, S.tannenbaum, 9, 'winter', 'sleigh'],
  ['osternest', 'Osternest', 25, 1, S.osternest, 10, 'spring', 'pop'], ['maiglocken', 'Frühlings-Blumenkübel', 22, 0, B.blumenkuebel, 7, 'spring', 'sparkle'],
  ['planschbecken', 'Planschbecken', 40, 1, S.planschbecken, 13, 'summer', 'splash'], ['sonnenschirm', 'Sonnenschirm', 30, 0, S.sonnenschirm, 10, 'summer', 'whoosh']
];
const SEAS_NAME = { spring: 'Frühling 🌸', summer: 'Sommer ☀️', autumn: 'Herbst 🍂', winter: 'Winter ❄️' };
SEAS.forEach(([id, name, price, carrots, art, s, season, snd]) => {
  ITEMS.push({ id, name, price, art: () => art(), s, x: 50, y: 92, nu: true, snd });
  add({ id, cat: 'saison', kind: 'farm', season, name, price, carrots, art, sub: SEAS_NAME[season] });
});
// Reiterstübchen
const FURN = [
  // id, Name, Preis, Bild, Breite (% der Stube), Standard x, y, Wand?
  ['teppich', 'Flauschiger Teppich', 25, R.teppich, 34, 50, 90, 0], ['sofa', 'Kuschel-Sofa', 60, R.sofa, 32, 30, 74, 0], ['regal', 'Bücherregal', 55, R.regal, 17, 84, 74, 0], ['tisch', 'Teetisch', 35, R.tisch, 20, 66, 86, 0],
  ['lampe', 'Stehlampe', 30, R.lampe, 8, 8, 84, 0], ['pflanze', 'Zimmerpflanze', 25, R.pflanze, 10, 93, 90, 0], ['sattelstaender', 'Sattelständer', 45, R.sattelstaender, 13, 70, 92, 0], ['pokalvitrine', 'Pokal-Vitrine', 80, R.pokalvitrine, 14, 14, 76, 0],
  ['bild', 'Pferde-Bild', 28, R.bild, 14, 72, 30, 1], ['uhr', 'Wanduhr', 22, R.uhr, 8, 34, 22, 1], ['fensterbild', 'Fenster mit Vorhang', 45, R.fensterbild, 15, 20, 30, 1], ['sitzsack', 'Sitzsack', 40, R.sitzsack, 14, 44, 94, 0],
  ['plueschpferd', 'Plüschpferd', 35, R.plueschpferd, 11, 20, 93, 0], ['schreibtisch', 'Schreibtisch', 65, R.schreibtisch, 22, 76, 82, 0]
];
FURN.forEach(([id, name, price, art, w, x, y, wall]) => add({ id: 'r_' + id, rid: id, cat: 'stuebchen', kind: 'room', name, price, art, w, x, y, wall: !!wall, sub: wall ? 'Hängt an der Wand' : 'Steht im Reiterstübchen' }));
// Reiterin: Neue Kleidung
const NEWCLOTHES = [
  ['halstuch_rot', 'tuch', 'Halstuch Rot', '#e8504a', 18], ['halstuch_blau', 'tuch', 'Halstuch Blau', '#5b8fd6', 18], ['halstuch_gelb', 'tuch', 'Halstuch Gelb', '#ffd966', 18], ['halstuch_mint', 'tuch', 'Halstuch Mint', '#6fcbb0', 18],
  ['brille_rosa', 'brille', 'Sonnenbrille Rosa', '#f48fb1', 22], ['brille_schwarz', 'brille', 'Sonnenbrille Schwarz', '#3b3332', 22], ['brille_gold', 'brille', 'Sonnenbrille Gold', '#e5b84a', 26],
  ['helm_gold', 'helm', 'Reithelm Gold', '#f2c14e', 40], ['helm_rot', 'helm', 'Reithelm Rot', '#e8504a', 32], ['helm_himmel', 'helm', 'Reithelm Himmelblau', '#8cc4ef', 32],
  ['jacke_rot', 'top', 'Turnierjacke Rot', '#d9564e', 38, 1], ['jacke_marine', 'top', 'Turnierjacke Marine', '#3f4f86', 38, 1], ['pulli_mint', 'top', 'Pulli Mint', '#9be0c6', 24], ['pulli_flieder', 'top', 'Pulli Flieder', '#d6c2f2', 24],
  ['weste_gold', 'weste', 'Weste Gold', '#f2c14e', 30], ['weste_blau', 'weste', 'Weste Himmelblau', '#8cc4ef', 26],
  ['hose_weiss', 'hose', 'Turnierhose Weiß', '#f6f4ef', 30], ['hose_rosa', 'hose', 'Reithose Rosa', '#f7b6cf', 26], ['hose_gruen', 'hose', 'Reithose Waldgrün', '#7fae8a', 26],
  ['stiefel_rot', 'stiefel', 'Reitstiefel Rot', '#c0392b', 32], ['stiefel_weiss', 'stiefel', 'Reitstiefel Weiß', '#f1ede8', 30],
  ['hand_weiss', 'hand', 'Handschuhe Weiß', '#f6f4ef', 18], ['hand_mint', 'hand', 'Handschuhe Mint', '#6fcbb0', 18],
  ['pad_gold', 'pad', 'Sattelpad Gold', '#ffd27a', 24], ['pad_rot', 'pad', 'Sattelpad Rot', '#e8828a', 24], ['zaum_gold', 'zaum', 'Zaumzeug Gold', '#e5b84a', 26], ['zaum_lila', 'zaum', 'Zaumzeug Lila', '#9a7fd8', 22]
];
if (!WCATS.some((c) => c[0] === 'tuch')) WCATS.splice(WCATS.length - 2, 0, ['tuch', '🧣 Halstuch'], ['brille', '🕶️ Brille']);
NEWCLOTHES.forEach(([id, cat, name, c, price, jacket]) => { if (!CLOTHES.some((x) => x.id === id)) CLOTHES.push(Object.assign({ id, cat, name, c, price }, jacket ? { jacket: true } : {})); });
const clothArt = (c) => {
  const col = c.c;
  const art = {
    tuch: `<path d="M8 14 Q30 42 52 14 L50 24 Q30 52 10 24 Z" fill="${col}"/><path d="M30 38 L38 54 L28 50 Z" fill="${PA.shade(col, .85)}"/>`,
    brille: `<g fill="${col}" fill-opacity=".35" stroke="${col}" stroke-width="4"><circle cx="18" cy="32" r="11"/><circle cx="42" cy="32" r="11"/></g><path d="M29 30 h2 M7 28 L2 24 M53 28 L58 24" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`,
    helm: `<path d="M8 40 C6 6 54 6 52 40 Z" fill="${col}"/><path d="M12 34 C16 18 30 14 40 16" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/><path d="M28 36 Q44 28 56 40 Q42 44 30 42 Z" fill="${PA.shade(col, .75)}"/>`,
    top: `<path d="M16 10 L4 22 L12 30 L18 26 V52 H42 V26 L48 30 L56 22 L44 10 Q30 20 16 10Z" fill="${col}"/>`,
    weste: `<path d="M14 8 L24 12 L22 52 H10 Z M46 8 L36 12 L38 52 H50 Z" fill="${col}"/><path d="M16 26 h6 M38 26 h6" stroke="${PA.shade(col, .75)}" stroke-width="2"/>`,
    hose: `<path d="M14 6 H46 L44 54 H33 L30 26 L27 54 H16 Z" fill="${col}"/>`,
    stiefel: `<path d="M18 4 H32 V38 L50 44 V54 H14 V4Z" fill="${col}"/><path d="M18 4 H32" stroke="#fff" stroke-width="3" opacity=".5"/>`,
    hand: `<path d="M14 54 V28 Q14 20 20 22 V12 Q20 8 24 10 V8 Q24 4 28 6 V8 Q32 4 34 8 V12 Q40 12 38 20 L44 28 V54Z" fill="${col}" stroke="${PA.shade(col, .8)}" stroke-width="1.6"/>`,
    pad: `<path d="M6 16 Q30 6 54 16 L50 50 Q30 58 10 50 Z" fill="${col}"/><path d="M10 48 Q30 56 50 48" stroke="#fff" stroke-width="3" stroke-dasharray="1 7" stroke-linecap="round" fill="none"/>`,
    zaum: `<path d="M8 14 Q24 34 52 38 M10 36 Q30 44 54 30" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="46" cy="34" r="5" fill="#e3e8ee" stroke="${col}" stroke-width="2"/>`,
    glitzer: `<path d="M30 6 l5 14 l14 2 l-10 10 l3 14 l-12 -8 l-12 8 l3 -14 l-10 -10 l14 -2z" fill="#ffe08a"/>`,
    schleife: `<path d="M30 30 L8 16 V44Z M30 30 L52 16 V44Z" fill="${col}"/><circle cx="30" cy="30" r="6" fill="${PA.shade(col, .85)}"/>`,
    gerte: `<path d="M8 54 L48 8" stroke="${col}" stroke-width="4" stroke-linecap="round"/><path d="M48 8 l-6 2 m6 -2 l-2 6" stroke="#f48fb1" stroke-width="3" stroke-linecap="round"/>`,
    buegel: `<path d="M30 6 V20 M14 24 H46 Q50 44 30 52 Q10 44 14 24Z" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round"/>`
  }[c.cat] || `<circle cx="30" cy="30" r="20" fill="${col}"/>`;
  return PA.svg('0 0 60 60', art);
};
CLOTHES.forEach((c) => { if (c.price > 0) add({ id: 'c_' + c.id, cid: c.id, cat: 'reiterin', kind: 'cloth', name: c.name, price: c.price, art: () => clothArt(c), sub: (WCATS.find((w) => w[0] === c.cat) || ['', ''])[1].replace(/^\S+\s/, '') }); });
// Sticker-Tüten & Mini-Spiele
add({ id: 'pack1', cat: 'sticker', kind: 'pack', name: 'Sticker-Tüte', price: 0, carrots: 4, n: 3, art: () => packArt('#f48fb1'), sub: '3 Sticker für dein Album' });
add({ id: 'pack2', cat: 'sticker', kind: 'pack', name: 'Funkel-Tüte', price: 25, carrots: 6, n: 4, rare: true, art: () => packArt('#f6cf5a'), sub: '4 Sticker – mit mehr Glitzer-Stickern' });
const MINIS = [['apfel', 'Apfelfangen', 40, 2, 'Fang die fallenden Äpfel mit dem Korb!'], ['wald', 'Ausritt im Wald', 70, 3, 'Reite durch den Zauberwald und sammle Sterne.'], ['memory', 'Pferde-Memory', 30, 1, 'Finde die Paare – ohne Zeitdruck.']];
const miniArt = {
  apfel: () => PA.svg('0 0 80 80', `<path d="M12 70 H68 L62 52 H18Z" fill="#c28a56" stroke="#8a5a36" stroke-width="2"/><path d="M24 52 L20 70 M40 52 V70 M56 52 L60 70" stroke="#8a5a36" stroke-width="1.6"/>${[[28, 46], [44, 44], [54, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#e8504a"/><ellipse cx="${x - 3}" cy="${y - 3}" rx="2.4" ry="1.6" fill="#fff" opacity=".6"/>`).join('')}<circle cx="40" cy="14" r="9" fill="#f2c14e"/><path d="M40 6 q2 -4 5 -4" stroke="#6a4a38" stroke-width="2" fill="none"/>`),
  wald: () => PA.svg('0 0 80 80', `<rect width="80" height="80" rx="14" fill="#cfeadf"/><path d="M0 60 Q40 48 80 60 V80 H0Z" fill="#8fcba4"/>${[[12, 40], [66, 36]].map(([x, y]) => `<rect x="${x - 2}" y="${y + 8}" width="5" height="22" fill="#8a6a50"/><path d="M${x} ${y - 14} l14 26 h-28z" fill="#3f9a82"/>`).join('')}<path d="M34 50 q4 -14 14 -10 l6 8 l-6 8 l-14 0z" fill="#c98b57"/><circle cx="52" cy="20" r="3" fill="#fff6a8"/><circle cx="24" cy="26" r="2.4" fill="#fff6a8"/>`),
  memory: () => PA.svg('0 0 80 80', `<rect x="8" y="12" width="28" height="36" rx="5" fill="#f48fb1" stroke="#fff" stroke-width="3" transform="rotate(-8 22 30)"/><rect x="40" y="16" width="28" height="36" rx="5" fill="#7cc4ea" stroke="#fff" stroke-width="3" transform="rotate(8 54 34)"/><path d="M20 34 q2 -8 8 -6 l3 4 l-3 4z" fill="#fff"/><circle cx="54" cy="34" r="8" fill="#ffd966"/>`)
};
MINIS.forEach(([id, name, price, carrots, sub]) => add({ id: 'mini_' + id, cat: 'spiele', kind: 'mini', mini: id, name, price, carrots, art: miniArt[id], sub }));
function packArt(c) { return PA.svg('0 0 70 90', `<path d="M10 14 L60 14 L56 82 Q35 90 14 82 Z" fill="${c}" stroke="#fff" stroke-width="3"/><path d="M8 14 q4 -8 8 0 q4 -8 8 0 q4 -8 8 0 q4 -8 8 0 q4 -8 8 0 q4 -8 8 0 v8 H8z" fill="${PA.shade(c, .9)}"/><circle cx="35" cy="48" r="16" fill="#fffdf6" opacity=".9"/><path d="M35 38 l4 8 l9 1 l-7 6 l2 9 l-8 -5 l-8 5 l2 -9 l-7 -6 l9 -1z" fill="${PA.shade(c, 1)}"/>`); }

// =====================================================================
// Hilfsfunktionen: Besitz, Vorschau, Kaufen
// =====================================================================
const nameOf = (p) => (typeof p.name === 'function' ? p.name() : p.name);
const owned = (p) => {
  if (p.kind === 'cloth') return core.hasCloth(p.cid);
  if (p.kind === 'pack') return false;
  return hasId(p.id);
};
const inSeason = (p) => !p.season || core.seasonNow() === p.season;
const reqOk = (p) => !p.req || p.req.ok();
function preview(p) {
  if (p.horse) return core.horseSVG(Object.assign({}, HORSES[p.horse], { delay: 0 }));
  return p.art ? p.art() : '';
}
const priceHtml = (p) => (p.price ? `${SHOE}<b>${p.price}</b>` : '') + (p.price && p.carrots ? '<i>+</i>' : '') + (p.carrots ? `<span class="emo">🥕</span><b>${p.carrots}</b>` : '');
function afford(p) { const s = st(); return s.shoes >= (p.price || 0) && s.carrots >= (p.carrots || 0); }
function missing(p) {
  const s = st(), a = Math.max(0, (p.price || 0) - s.shoes), c = Math.max(0, (p.carrots || 0) - s.carrots);
  return (a ? `${a} ${SHOE}` : '') + (a && c ? ' + ' : '') + (c ? `${c} 🥕` : '');
}
function spotFor(p) { // freier Platz auf dem Hof
  const s = st(); s.pos = s.pos || {};
  const sp = core.farmFreeSpot(p.id); s.pos[p.id] = { x: sp.x, y: sp.y };
}
let dirtyFarm = false;
function purchase(p) {
  const s = st();
  if (!afford(p) || (p.kind !== 'pack' && owned(p)) || !inSeason(p) || !reqOk(p)) return false;
  s.shoes -= p.price || 0; s.carrots -= p.carrots || 0;
  if (p.kind === 'farm') { s.owned.push(p.id); if (!p.old) spotFor(p); dirtyFarm = true; }
  else if (p.kind === 'acc' || p.kind === 'tool' || p.kind === 'room' || p.kind === 'mini') {
    s.owned.push(p.id);
    if (p.kind === 'room') { s.room.pos[p.rid] = { x: p.x, y: p.y }; }
  } else if (p.kind === 'cloth') { s.clothes.push(p.cid); }
  s.spent = (s.spent || 0) + (p.price || 0);
  core.save(); core.updateCounters();
  return true;
}
function celebrate(p, extra) {
  const s = st();
  const horse = !!p.horse;
  Sound.buy(); setTimeout(() => (horse ? (Sound.ihaa ? Sound.ihaa() : Sound.neigh()) : Sound.fanfare()), 380);
  const btns = [];
  const go = (fn) => () => { Sound.tap(); close(); fn && fn(); };
  if (p.kind === 'farm') btns.push(h('button', { class: 'bigbtn primary', id: 'toFarm', onclick: go(() => { closeShopFn && closeShopFn(); core.showStable(); }) }, p.horse ? '🐴 Zum Hof' : '🏡 Auf den Hof'));
  if (p.kind === 'acc') btns.push(h('button', { class: 'bigbtn primary', id: 'toCare', onclick: go(() => { closeShopFn && closeShopFn(); openCare(); }) }, '🧼 Pferd schmücken'));
  if (p.kind === 'tool') btns.push(h('button', { class: 'bigbtn primary', id: 'toCare', onclick: go(() => { closeShopFn && closeShopFn(); openCare(p.tool); }) }, '🧼 Gleich ausprobieren'));
  if (p.kind === 'room') btns.push(h('button', { class: 'bigbtn primary', id: 'toRoom', onclick: go(() => { closeShopFn && closeShopFn(); showRoom(); }) }, '🛋️ Ins Reiterstübchen'));
  if (p.kind === 'cloth') btns.push(h('button', { class: 'bigbtn primary', id: 'toCloset', onclick: go(() => { closeShopFn && closeShopFn(); core.openCloset(null, (core.CLOTHES.find((c) => c.id === p.cid) || {}).cat); }) }, '👚 Anziehen'));
  if (p.kind === 'mini') btns.push(h('button', { class: 'bigbtn primary', id: 'toMini', onclick: go(() => { closeShopFn && closeShopFn(); core.minis && core.minis.start(p.mini); }) }, '🎮 Jetzt spielen'));
  btns.push(h('button', { class: 'bigbtn', id: 'moreShop', onclick: go() }, 'Weiter schauen'));
  const card = h('div', { class: 'lad-cele', id: 'celebrate' },
    h('div', { class: 'lc-rays' }), h('div', { class: 'lc-pv', html: preview(p) }),
    h('h2', null, horse ? `${nameOf(p).split(' ').pop()} ist da!` : 'Hurra!'),
    h('p', null, `${nameOf(p)} gehört jetzt dir.`), extra ? h('p', { class: 'lc-extra' }, extra) : null,
    h('div', { class: 'lc-btns' }, btns));
  const close = core.sheet(card);
  setTimeout(() => core.confetti && core.confetti(), 120);
  return close;
}
function confirmBuy(p, done) {
  const s = st();
  const afterS = s.shoes - (p.price || 0), afterC = s.carrots - (p.carrots || 0);
  const box = h('div', { class: 'lad-confirm', id: 'confirmBox' }, h('div', { class: 'lc-pv', html: preview(p) }),
    h('h3', null, `${nameOf(p)} holen?`),
    h('p', { class: 'lc-price', html: priceHtml(p) }),
    h('p', { class: 'lc-left', html: `Danach hast du noch ${SHOE}<b>${afterS}</b>${p.carrots ? ` und 🥕<b>${afterC}</b>` : ''}.` }),
    h('div', { class: 'lc-btns' },
      h('button', { class: 'bigbtn primary', id: 'confirmYes', onclick: () => { close(); done(); } }, 'Ja, holen 💖'),
      h('button', { class: 'bigbtn', id: 'confirmNo', onclick: () => { Sound.tap(); close(); } }, 'Noch sparen')));
  const close = core.sheet(box); Sound.pop();
}
// Kaufversuch aus der Liste
function tryBuy(p, redraw) {
  const go = () => {
    if (p.kind === 'pack') { openPack(p, redraw); return; }
    if (!purchase(p)) { Sound.softno(); return; }
    redraw(); celebrate(p);
  };
  if (p.kind === 'pack' ? !afford(p) : false) return;
  if ((p.price || 0) >= 25 || (p.carrots || 0) >= 3) confirmBuy(p, go); else go();
}

// =====================================================================
// Hofladen (Oberfläche)
// =====================================================================
const TABS = [['pferde', '🐴', 'Pferde'], ['pflege', '🧼', 'Pflege'], ['hof', '🏡', 'Hof'], ['tiere', '🐰', 'Tiere'], ['reiterin', '👧', 'Reiterin'], ['stuebchen', '🛋️', 'Stübchen'], ['saison', '🍂', 'Saison'], ['sticker', '📒', 'Sticker'], ['spiele', '🎮', 'Spiele']];
let lastTab = 'pferde', closeShopFn = null;
function openShop(startTab) {
  const s = st();
  let tab = startTab || lastTab, sub = null;
  const card = h('div', { class: 'lad', id: 'laden' });
  const redraw = () => { draw(); };
  const draw = () => {
    const keepScroll = ($('.lad-grid', card) || {}).scrollTop || 0;
    card.innerHTML = '';
    const items = CAT.filter((p) => p.cat === tab && (!sub || p.sub2 === sub));
    const head = h('div', { class: 'lad-head' }, h('h2', null, '🛍️ Hofladen'),
      h('span', { class: 'counter', id: 'ladShoes', html: SHOE + `<span>${s.shoes}</span>` }), h('span', { class: 'counter', id: 'ladCarrots' }, h('span', { class: 'emo' }, '🥕'), h('span', null, String(s.carrots))),
      h('button', { class: 'iconbtn', id: 'ladClose', 'aria-label': 'Schließen', onclick: () => { Sound.tap(); closeShopFn(); } }, '✕'));
    const tabs = h('div', { class: 'lad-tabs', role: 'tablist' }, TABS.map(([k, ic, nm]) => h('button', { class: 'lad-tab' + (k === tab ? ' on' : ''), role: 'tab', 'data-tab': k, onclick: () => { tab = k; lastTab = k; Sound.page ? Sound.page() : Sound.tap(); draw(); } }, h('span', { class: 'ti' }, ic), h('span', null, nm))));
    const grid = h('div', { class: 'lad-grid' });
    if (tab === 'reiterin') grid.append(h('div', { class: 'lad-note wide' }, h('span', null, 'Kaufen und gleich im Kleiderschrank anziehen:'), h('button', { class: 'smallbtn', id: 'ladCloset', onclick: () => { Sound.tap(); closeShopFn(); core.openCloset(); } }, '👚 Kleiderschrank')));
    if (tab === 'pflege') grid.append(h('div', { class: 'lad-note wide' }, h('span', null, 'Bürste hast du schon. Mit dem Schmuck verschönerst du deine Pferde.'), h('button', { class: 'smallbtn', id: 'ladCare', onclick: () => { Sound.tap(); closeShopFn(); openCare(); } }, '🧼 Zur Pflege')));
    if (tab === 'stuebchen') grid.append(h('div', { class: 'lad-note wide' }, h('span', null, 'Richte dein Reiterstübchen ein!'), h('button', { class: 'smallbtn', id: 'ladRoom', onclick: () => { Sound.tap(); closeShopFn(); showRoom(); } }, '🛋️ Stübchen ansehen')));
    if (tab === 'sticker') grid.append(h('div', { class: 'lad-note wide' }, h('span', { html: `Du hast <b>${stickerCount()}</b> von 48 Stickern. Volle Seite = Rosette + 10 ${SHOE}` }), h('button', { class: 'smallbtn', id: 'ladAlbum', onclick: () => { Sound.tap(); closeShopFn(); openAlbum(); } }, '📒 Album')));
    if (tab === 'saison') grid.append(h('div', { class: 'lad-note wide' }, h('span', null, `Jetzt ist ${SEAS_NAME[core.seasonNow()]}. Jede Jahreszeit hat eigene Sachen – was du gekauft hast, bleibt für immer.`)));
    if (tab === 'spiele') grid.append(h('div', { class: 'lad-note wide' }, h('span', null, 'Freigeschaltete Spiele findest du auf dem Hof beim 🎮-Knopf. Als Belohnung gibt es ein paar Hufeisen am Tag.')));
    items.forEach((p) => grid.append(card_(p)));
    card.append(head, tabs, grid);
    if (keepScroll) grid.scrollTop = keepScroll;
  };
  const card_ = (p) => {
    const own = owned(p), seasonOk = inSeason(p), rq = reqOk(p), can = afford(p);
    let btn;
    if (own) btn = h('button', { class: 'lad-btn have', disabled: true, 'data-state': 'own' }, '✔ Hast du');
    else if (!seasonOk) btn = h('button', { class: 'lad-btn later', disabled: true, 'data-state': 'season' }, `Wieder im ${SEAS_NAME[p.season].split(' ')[0]}`);
    else if (!rq) btn = h('button', { class: 'lad-btn later', disabled: true, 'data-state': 'locked' }, '🔒 ' + p.req.text);
    else if (can) btn = h('button', { class: 'lad-btn buy', 'data-shopbuy': p.id, 'data-state': 'buy', html: p.kind === 'pack' ? `Öffnen ${priceHtml(p)}` : `Holen ${priceHtml(p)}`, onclick: () => tryBuy(p, redraw) });
    else btn = h('button', { class: 'lad-btn later', disabled: true, 'data-state': 'save', 'data-shopbuy': p.id, html: `Noch ${missing(p)}` });
    const pct = Math.min(100, Math.round(100 * (s.shoes / Math.max(1, p.price || 1))));
    return h('div', { class: 'lad-card' + (own ? ' own' : '') + (!seasonOk || !rq ? ' dim' : '') + (can && !own && seasonOk && rq ? ' ready' : ''), 'data-shop': p.id },
      h('div', { class: 'lc-art' + (p.horse ? ' horse' : '') + (p.kind === 'cloth' ? ' cloth' : ''), html: preview(p) }),
      h('div', { class: 'lc-name' }, nameOf(p)), h('div', { class: 'lc-sub' }, p.sub || ''),
      !own && seasonOk && rq && !can && p.price ? h('div', { class: 'lc-bar' }, h('i', { style: { width: pct + '%' } })) : null, btn);
  };
  draw();
  const close = core.sheet(card, () => { closeShopFn = null; if (dirtyFarm && core.currentScreen === 'stable') { dirtyFarm = false; core.showStable(); } });
  closeShopFn = close;
  Sound.swish();
  return close;
}

// =====================================================================
// Sticker, Tüten, Album
// =====================================================================
const NSTICK = 48;
const stickerCount = () => { const k = st().stickers; return Object.keys(k).filter((i) => k[i] > 0).length; };
const pageCount = (pg) => range(pg * 8, pg * 8 + 7).filter((i) => (st().stickers[i] || 0) > 0).length;
function daily(key) { const m = st().minis; if (!m[key] || m[key].d !== today()) m[key] = { d: today(), shoes: 0, car: 0, n: 0 }; return m[key]; }
function drawSticker(rarePack) {
  const k = st().stickers, glitz = Math.random() < (rarePack ? 0.4 : 0.08);
  let pool = range(0, NSTICK - 1).filter((i) => (i >= 24) === glitz);
  const fresh = pool.filter((i) => !(k[i] > 0));
  if (fresh.length && Math.random() < 0.72) pool = fresh;
  return pick(pool);
}
// Prüft volle Albumseiten: einmalig Rosette + 10 Hufeisen
function albumCheck() {
  const s = st(), m = s.minis; m.albumPaid = m.albumPaid || {};
  const out = [];
  for (let pg = 0; pg < 6; pg++) {
    if (pageCount(pg) === 8 && !m.albumPaid[pg]) {
      m.albumPaid[pg] = true; s.shoes += 10; s.totalShoes = (s.totalShoes || 0) + 10; core.addRosette('album', 'luna'); out.push(pg);
    }
  }
  if (out.length) { core.save(); core.updateCounters(); }
  return out;
}
const pageBanner = (pgs) => h('div', { class: 'pk-page', id: 'pageDone' }, h('div', { html: core.rosetteSVG('#f6cf5a', '★') }), h('div', null, h('b', null, pgs.length > 1 ? 'Mehrere Seiten sind voll!' : `Seite „${PA.PAGE_NAMES[pgs[0]]}“ ist voll!`), h('div', { html: `Neue Rosette und +${10 * pgs.length} ${SHOE}` })));
function openPack(p, redraw) {
  const s = st();
  if (!afford(p)) { Sound.softno(); return; }
  s.shoes -= p.price || 0; s.carrots -= p.carrots || 0; s.spent = (s.spent || 0) + (p.price || 0);
  const got = range(1, p.n).map(() => drawSticker(p.rare));
  const fresh = [];
  got.forEach((id) => { if (!(s.stickers[id] > 0) && !fresh.includes(id)) fresh.push(id); s.stickers[id] = (s.stickers[id] || 0) + 1; });
  s.minis.packs = (s.minis.packs || 0) + 1;
  const pages = albumCheck();
  core.save(); core.updateCounters(); redraw && redraw();
  const stage = h('div', { class: 'pk-stage' });
  const card = h('div', { class: 'lad-pack', id: 'packOpen' }, h('h2', null, p.rare ? '✨ Funkel-Tüte' : '📒 Sticker-Tüte'), stage);
  const reveal = () => {
    stage.innerHTML = ''; stage.classList.add('open');
    const seen = [];
    got.forEach((id, i) => {
      const isNew = fresh.includes(id) && !seen.includes(id); seen.push(id);
      const c = h('div', { class: 'pk-card', 'data-sticker': id, style: { animationDelay: (0.25 + i * 0.45) + 's' } }, h('div', { class: 'pk-art', html: PA.stickerSVG(id, true) }), h('div', { class: 'pk-name' }, PA.STICKERS[id].name), h('div', { class: 'pk-tag' + (isNew ? ' new' : '') }, isNew ? 'NEU!' : 'Doppelt'));
      stage.append(c);
      setTimeout(() => { Sound.sticker(); if (isNew) setTimeout(() => Sound.star && Sound.star(), 120); }, 250 + i * 450);
    });
    setTimeout(() => { if (pages.length) { Sound.fanfare(); core.confetti && core.confetti(); } }, 300 + got.length * 450);
    card.append(...[pages.length ? pageBanner(pages) : null,
      h('div', { class: 'lc-btns' }, h('button', { class: 'bigbtn primary', id: 'packAlbum', onclick: () => { Sound.tap(); close(); closeShopFn && closeShopFn(); openAlbum(PA.STICKERS[got[0]].page); } }, '📒 Ins Album'),
        h('button', { class: 'bigbtn', id: 'packDone', onclick: () => { Sound.tap(); close(); } }, 'Fertig'))].filter(Boolean));
  };
  stage.append(h('button', { class: 'pk-bag', id: 'packTear', 'aria-label': 'Tüte öffnen', html: packArt(p.rare ? '#f6cf5a' : '#f48fb1') + '<span>Tippe zum Öffnen!</span>', onclick: () => { Sound.whoosh(); Sound.pop(); reveal(); } }));
  const close = core.sheet(card);
  Sound.coin();
}
function openAlbum(startPage) {
  let pg = startPage != null ? startPage : 0;
  const card = h('div', { class: 'lad-album', id: 'album' });
  const draw = () => {
    card.innerHTML = '';
    const col = PA.PAGES[pg % 3].col, glitz = pg >= 3, paid = (st().minis.albumPaid || {})[pg];
    card.append(h('div', { class: 'lad-head' }, h('h2', null, '📒 Sticker-Album'), h('span', { class: 'alb-total', html: `<b>${stickerCount()}</b> / ${NSTICK}` }), h('button', { class: 'iconbtn', id: 'albumClose', 'aria-label': 'Schließen', onclick: () => { Sound.tap(); close(); } }, '✕')),
      h('div', { class: 'lad-tabs alb-tabs' }, range(0, 5).map((i) => h('button', { class: 'lad-tab' + (i === pg ? ' on' : '') + (i >= 3 ? ' glitz' : ''), 'data-page': i, onclick: () => { pg = i; Sound.page(); draw(); } }, h('span', null, PA.PAGE_NAMES[i].replace('Funkel: ', '✨ ')), h('small', null, pageCount(i) + '/8')))),
      h('div', { class: 'alb-page' + (glitz ? ' glitz' : ''), style: { '--pc': col } },
        range(pg * 8, pg * 8 + 7).map((id) => { const n = st().stickers[id] || 0; return h('div', { class: 'alb-slot' + (n ? ' got' : ''), 'data-slot': id }, h('div', { class: 'alb-art', html: PA.stickerSVG(id, !!n) }), h('div', { class: 'alb-name' }, n ? PA.STICKERS[id].name : '?'), n > 1 ? h('span', { class: 'alb-n' }, '×' + n) : null); })),
      pageCount(pg) === 8 ? h('div', { class: 'alb-full' }, '⭐ Seite voll! ' + (paid ? 'Rosette ist an deiner Wand.' : '')) : h('div', { class: 'alb-hint' }, `Noch ${8 - pageCount(pg)} fehlen. Tüten gibt es im Hofladen oder als Tages-Sticker nach einer Mathe-Runde.`),
      h('div', { class: 'lc-btns' }, h('button', { class: 'bigbtn', id: 'albumShop', onclick: () => { Sound.tap(); close(); openShop('sticker'); } }, '🛍️ Tüten holen'), h('button', { class: 'bigbtn primary', id: 'albumDone', onclick: () => { Sound.tap(); close(); } }, 'Fertig 💖')));
  };
  draw();
  const close = core.sheet(card); Sound.page();
}
// Tages-Sticker: nach der ersten Mathe-Runde des Tages gibt es ein Sticker geschenkt
hooks.roundDone = (last) => {
  const m = st().minis;
  if (m.stickerDay === today()) return;
  m.stickerDay = today();
  const id = drawSticker(false), s = st();
  const was = s.stickers[id] > 0;
  s.stickers[id] = (s.stickers[id] || 0) + 1;
  const pages = albumCheck();
  last.sticker = id; last.stickerNew = !was; last.stickerPages = pages.length;
};
hooks.roundEnd = (last) => {
  if (!last || last.sticker == null || last.stickerShown) return null;
  last.stickerShown = true; core.save();
  setTimeout(() => Sound.sticker(), 700);
  return h('div', { class: 'daily-sticker', id: 'dailySticker' }, h('div', { class: 'ds-art', html: PA.stickerSVG(last.sticker, true) }),
    h('div', null, h('b', null, 'Tages-Sticker!'), h('div', null, PA.STICKERS[last.sticker].name + (last.stickerNew ? ' – neu im Album 📒' : ' – doppelt')), last.stickerPages ? h('div', { html: `Seite voll! Rosette + 10 ${SHOE}` }) : null));
};

// =====================================================================
// Pferde-Pflege (Mini-Interaktionen)
// =====================================================================
const CARE = {
  buerste: { nm: 'Bürste', ic: '🪮', free: true, tip: 'Fahre mit dem Finger über den Staub!', mode: 'rub', n: 6, need: 5, cls: 'dust', pos: [[38, 46], [50, 41], [58, 52], [44, 58], [30, 52], [54, 34]], snd: 'swish' },
  schwamm: { nm: 'Schwamm', ic: '🧽', tool: 'schwamm', tip: 'Reibe den Schlamm mit dem Schwamm weg!', mode: 'rub', n: 5, need: 8, cls: 'mud', pos: [[33, 80], [40, 68], [60, 72], [68, 82], [50, 60]], snd: 'bubble' },
  kratzer: { nm: 'Hufkratzer', ic: '🔧', tool: 'kratzer', tip: 'Tippe auf jeden Huf!', mode: 'tap', n: 4, cls: 'hoof', pos: [[31, 90], [37, 90], [62, 90], [68, 90]], snd: 'tick' },
  flecht: { nm: 'Flechtband', ic: '🎀', tool: 'flecht', tip: 'Tippe auf die Knoten in der Mähne!', mode: 'tap', n: 4, cls: 'knot', pos: [[60, 42], [62, 34], [65, 27], [68, 20]], snd: 'plop', flag: 'zopf' },
  spray: { nm: 'Glanzspray', ic: '✨', tool: 'spray', tip: 'Tippe auf das Fell – es beginnt zu glitzern!', mode: 'tap', n: 5, cls: 'shine', pos: [[40, 52], [50, 46], [58, 56], [46, 62], [66, 38]], snd: 'sparkle', flag: 'glanz' }
};
const CARE_ORDER = ['buerste', 'schwamm', 'kratzer', 'flecht', 'spray'];
const careOf = (id) => { const s = st(); s.care = s.care || {}; return (s.care[id] = s.care[id] || { sessions: 0, hearts: 0 }); };
const careTools = () => CARE_ORDER.filter((k) => CARE[k].free || hasId('care_' + CARE[k].tool));
function openCare(startTool, startHorse) {
  const s = st();
  const horses = core.ownedHorses();
  let hid = startHorse && horses.includes(startHorse) ? startHorse : horses[0], tool = startTool && CARE[startTool] && (CARE[startTool].free || hasId('care_' + startTool)) ? startTool : 'buerste', done = false;
  const card = h('div', { class: 'care', id: 'care' });
  const heartsOf = (id) => { const c = careOf(id); return Math.min(5, Math.ceil(c.sessions / 3)); };
  const toolIcon = (k) => { const c = CARE[k]; return c.free ? '<span class="ci-e">🪮</span>' : (CAT.find((p) => p.tool === c.tool).art()); };
  const msg = (t) => { const m = $('#careMsg', card); if (m) m.textContent = t; };
  let closeFn;
  const draw = () => {
    card.innerHTML = ''; done = false;
    const c = CARE[tool], hp = careOf(hid);
    const stage = h('div', { class: 'care-stage ' + c.cls, id: 'careStage' });
    const hs = h('div', { class: 'care-horse', html: core.horseSVG(Object.assign({}, HORSES[hid] || HORSES.luna, core.horseOpts(hid), { delay: 0 })) });
    stage.append(hs);
    const hand = h('div', { class: 'care-hand' }, c.ic); stage.append(hand);
    let left = c.n;
    const spots = c.pos.map(([x, y], i) => {
      const el = h('button', { class: 'care-spot ' + c.cls, 'data-spot': i, 'aria-label': c.nm, style: { left: x + '%', top: y + '%' } });
      el._p = 0; el._x = x; el._y = y; el._done = false; stage.append(el); return el;
    });
    const clear = (el) => {
      if (el._done) return; el._done = true; el.classList.add('gone'); left--;
      if (c.mode === 'tap') { Sound[c.snd] ? Sound[c.snd]() : Sound.pop(); if (c.cls !== 'shine') core.burst && core.burst(el, ['✨']); }
      const bar = $('#careBar', card); if (bar) bar.style.width = (100 * (c.n - left) / c.n) + '%';
      if (left <= 0) setTimeout(finish, 350);
    };
    let lastSnd = 0;
    if (c.mode === 'tap') {
      spots.forEach((el) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); clear(el); }));
      if (c.cls === 'shine') spots.forEach((el) => el.addEventListener('pointerdown', () => { hs.classList.add('glow'); setTimeout(() => hs.classList.remove('glow'), 500); }));
    } else {
      const rub = (e) => {
        const r = stage.getBoundingClientRect(); if (!r.width) return;
        const px = (e.clientX - r.left) / r.width * 100, py = (e.clientY - r.top) / r.height * 100;
        hand.style.left = px + '%'; hand.style.top = py + '%';
        spots.forEach((el) => {
          if (el._done) return;
          if (Math.hypot(px - el._x, (py - el._y) * 0.8) < 9) {
            el._p++; el.style.opacity = String(Math.max(0.12, 1 - el._p / c.need)); el.style.transform = `translate(-50%,-50%) scale(${1 - 0.4 * el._p / c.need})`;
            if (el._p >= c.need) clear(el);
            const now = performance.now(); if (now - lastSnd > 170) { lastSnd = now; Sound[c.snd](); }
          }
        });
      };
      stage.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') rub(e); });
      stage.addEventListener('pointerdown', (e) => { stage.classList.add('down'); rub(e); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => stage.addEventListener(ev, () => stage.classList.remove('down')));
      spots.forEach((el) => el.addEventListener('click', () => { // Tastatur/Tipp: mehrfach tippen putzt auch
        el._p += 2; el.style.opacity = String(Math.max(0.12, 1 - el._p / c.need)); if (el._p >= c.need) clear(el); else Sound[c.snd]();
      }));
    }
    const finish = () => {
      if (done) return; done = true;
      const day = today(), cs = careOf(hid);
      cs.sessions++; cs.last = Date.now();
      if (c.flag) { if (cs.day !== day) { cs.zopf = false; cs.glanz = false; } cs.day = day; cs[c.flag] = true; }
      const d = daily('careDay'); let text = `${core.horseName(hid)} strahlt! 💖`;
      let gain = 0, car = 0;
      if (d.shoes < 6) { gain = Math.min(2, 6 - d.shoes); d.shoes += gain; s.shoes += gain; s.totalShoes = (s.totalShoes || 0) + gain; }
      s.minis.careSessions = (s.minis.careSessions || 0) + 1;
      if (s.minis.careSessions % 5 === 0 && d.car < 2) { d.car++; car = 1; s.carrots++; }
      if (gain) text += `  +${gain} Hufeisen`; if (car) text += '  +1 Karotte 🥕';
      if (!gain && !car) text = `${core.horseName(hid)} ist schön sauber! Für heute gibt es keine Belohnung mehr – morgen wieder. 💕`;
      core.save(); core.updateCounters();
      stage.classList.add('clean'); hs.classList.add('glow');
      core.burst && core.burst(hs, ['💖', '✨', '⭐']); Sound.reward ? Sound.reward() : Sound.fanfare(); setTimeout(() => Sound.neigh && Sound.neigh(), 500);
      msg(text);
      $('#careHearts', card).innerHTML = hearts(heartsOf(hid));
      const nxt = $('#careNext', card); if (nxt) nxt.hidden = false;
      const ct = $('.care-counters', card); if (ct) ct.innerHTML = `<span class="counter">${SHOE}<span>${s.shoes}</span></span><span class="counter"><span class="emo">🥕</span><span>${s.carrots}</span></span>`;
    };
    const hearts = (n) => range(1, 5).map((i) => `<span class="${i <= n ? 'on' : ''}">♥</span>`).join('');
    const tools = h('div', { class: 'care-tools' }, CARE_ORDER.map((k) => { const ok = CARE[k].free || hasId('care_' + CARE[k].tool);
      return h('button', { class: 'care-tool' + (k === tool ? ' on' : '') + (ok ? '' : ' locked'), 'data-tool': k, 'aria-label': CARE[k].nm, onclick: () => { if (!ok) { Sound.tap(); closeFn(); openShop('pflege'); return; } Sound.tap(); tool = k; draw(); } },
        h('span', { class: 'ct-ic', html: toolIcon(k) }), h('span', null, CARE[k].nm), ok ? null : h('em', null, '🔒')); }));
    const picker = h('div', { class: 'care-horses' }, horses.map((id) => h('button', { class: 'care-hp' + (id === hid ? ' on' : ''), 'data-chorse': id, 'aria-label': core.horseName(id), onclick: () => { Sound.neigh && Sound.neigh(); hid = id; draw(); } },
      h('span', { class: 'pvh', html: core.horseSVG(Object.assign({}, HORSES[id] || HORSES.luna, { delay: 0 })) }), h('small', null, core.horseName(id)))));
    // Schmuck
    const accOwned = ACC.filter((a) => hasId('acc_' + a.id));
    const g = core.gearOf(hid); if (!Array.isArray(g.acc)) g.acc = [];
    const accRow = h('div', { class: 'care-acc' }, h('b', null, 'Schmuck'),
      accOwned.length ? accOwned.map((a) => h('button', { class: 'chip' + (g.acc.includes(a.id) ? ' on' : ''), 'data-acc': a.id, onclick: () => { const i = g.acc.indexOf(a.id); if (i >= 0) g.acc.splice(i, 1); else g.acc.push(a.id); core.save(); Sound.sparkle(); draw(); } }, h('span', { class: 'ca-ic', html: a.art() }), a.name))
        : h('button', { class: 'smallbtn', id: 'careShopAcc', onclick: () => { Sound.tap(); closeFn(); openShop('pferde'); } }, '🛍️ Schmuck im Hofladen'));
    card.append(h('div', { class: 'lad-head' }, h('h2', null, '🧼 Pferde-Pflege'), h('span', { class: 'care-counters', html: `<span class="counter">${SHOE}<span>${s.shoes}</span></span><span class="counter"><span class="emo">🥕</span><span>${s.carrots}</span></span>` }),
        h('button', { class: 'iconbtn', id: 'careClose', 'aria-label': 'Schließen', onclick: () => { Sound.tap(); closeFn(); } }, '✕')),
      picker,
      h('div', { class: 'care-main' }, h('div', { class: 'care-left' }, stage, h('div', { class: 'care-prog' }, h('i', { id: 'careBar' }))),
        h('div', { class: 'care-right' }, h('div', { class: 'care-name' }, h('b', null, core.horseName(hid)), h('span', { class: 'care-hearts', id: 'careHearts', html: hearts(heartsOf(hid)) })), tools,
          h('p', { class: 'care-tip', id: 'careMsg' }, c.tip), h('button', { class: 'bigbtn primary', id: 'careNext', hidden: true, onclick: () => { Sound.tap(); draw(); } }, 'Nochmal 🔁'), accRow)));
  };
  draw();
  closeFn = core.sheet(card, () => { if (core.currentScreen === 'stable') core.showStable(); });
  Sound.swish();
}

// =====================================================================
// Reiterstübchen
// =====================================================================
const ROOM_SND = { sofa: 'plop', lampe: 'chime', uhr: 'clock', plueschpferd: 'squeak', pflanze: 'swish', sattelstaender: 'plop', pokalvitrine: 'sparkle', bild: 'sparkle', fensterbild: 'chirp', sitzsack: 'plop', teppich: 'swish', tisch: 'cube', regal: 'page', schreibtisch: 'page' };
const KAMIN = PA.svg('0 0 120 100', `<rect x="6" y="14" width="108" height="86" rx="6" fill="#c9a98a"/><rect x="2" y="8" width="116" height="14" rx="5" fill="#a9825f"/><path d="M28 100 V52 Q60 26 92 52 V100Z" fill="#3a2a26"/><g class="flame"><path d="M60 96 C44 88 48 70 60 58 C58 72 72 74 70 88 C68 94 64 96 60 96Z" fill="#ff9a3c"/><path d="M60 96 C52 92 54 80 60 72 C60 82 68 84 66 92Z" fill="#ffd966"/></g><rect x="40" y="30" width="40" height="12" rx="3" fill="#8a6a50" opacity=".5"/>`);
function showRoom() {
  const s = st(); s.room = s.room || { pos: {} }; s.room.pos = s.room.pos || {};
  core.currentScreen = 'room'; Sound.setScene('room');
  const main = core.shell('Reiterstübchen', false);
  const mine = CAT.filter((p) => p.kind === 'room' && hasId(p.id));
  const scene = h('div', { class: 'room-scene', id: 'roomScene' }, h('div', { class: 'room-wall' }), h('div', { class: 'room-floor' }), h('div', { class: 'room-board' }),
    h('div', { class: 'room-kamin', html: KAMIN, 'aria-hidden': 'true' }));
  const lampOn = () => !!s.room.lamp;
  const pos = (p) => { const q = s.room.pos[p.rid]; return q && Number.isFinite(+q.x) && Number.isFinite(+q.y) ? q : { x: p.x, y: p.y }; };
  const place = (p) => {
    const q = pos(p);
    const el = h('div', { class: 'rm-item' + (p.wall ? ' wall' : '') + ' it-' + p.rid, 'data-room': p.rid, tabindex: 0, role: 'button', 'aria-label': p.name, style: { left: q.x + '%', top: q.y + '%', width: p.w + '%', zIndex: p.wall ? 2 : String(10 + Math.round(q.y)) } },
      h('div', { class: 'rm-art', html: p.art() }));
    if (p.rid === 'pokalvitrine') {
      const ros = s.rosettes ? s.rosettes.slice(-8) : [];
      el.append(h('div', { class: 'rm-ros' }, ros.map((r) => h('span', { html: r.kind === 'pokal' ? '🏆' : core.rosetteSVG(r.c, '★') }))));
    }
    if (p.rid === 'lampe' && lampOn()) el.classList.add('lit');
    const clampY = (y) => (p.wall ? Math.max(14, Math.min(52, y)) : Math.max(64, Math.min(99, y)));
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      const r = scene.getBoundingClientRect(); const q0 = pos(p);
      drag = { sx: e.clientX, sy: e.clientY, ox: q0.x, oy: q0.y, w: r.width, h: r.height, moved: false };
      try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      el.classList.add('drag'); e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 7) return; drag.moved = true;
      const x = Math.max(4, Math.min(96, drag.ox + dx / drag.w * 100)), y = clampY(drag.oy + dy / drag.h * 100);
      el.style.left = x + '%'; el.style.top = y + '%'; el.style.zIndex = p.wall ? 2 : String(10 + Math.round(y)); drag.x = x; drag.y = y;
    });
    const end = () => {
      if (!drag) return; el.classList.remove('drag');
      if (drag.moved) { s.room.pos[p.rid] = { x: +drag.x.toFixed(1), y: +drag.y.toFixed(1) }; core.save(); Sound.plop(); }
      else tap(p, el);
      drag = null;
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', () => { drag = null; el.classList.remove('drag'); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(p, el); } });
    return el;
  };
  const tap = (p, el) => {
    const f = ROOM_SND[p.rid] || 'plop'; (Sound[f] || Sound.plop)();
    el.classList.remove('wob'); void el.offsetWidth; el.classList.add('wob');
    if (p.rid === 'lampe') { s.room.lamp = !s.room.lamp; el.classList.toggle('lit', !!s.room.lamp); scene.classList.toggle('night', !!s.room.lamp); core.save(); }
    if (p.rid === 'pokalvitrine') core.openRosettes();
    if (p.rid === 'plueschpferd') core.burst && core.burst(el, ['💖']);
    if (p.rid === 'sofa' || p.rid === 'sitzsack') core.burst && core.burst(el, ['💤', '☁️']);
  };
  mine.forEach((p) => scene.append(place(p)));
  if (lampOn()) scene.classList.add('night');
  if (!mine.length) scene.append(h('div', { class: 'room-empty', id: 'roomEmpty' }, h('b', null, 'Dein Stübchen ist noch ganz leer.'), h('span', null, 'Im Hofladen gibt es Möbel, Bilder und Lampen!')));
  const total = CAT.filter((p) => p.kind === 'room').length;
  const dock = h('div', { class: 'room-dock' },
    h('button', { class: 'bigbtn primary', id: 'roomShop', onclick: () => { Sound.tap(); openShop('stuebchen'); } }, '🛍️ Möbel holen'),
    h('span', { class: 'room-count', id: 'roomCount' }, `${mine.length} von ${total} Sachen`),
    h('button', { class: 'bigbtn', id: 'roomRos', onclick: () => { Sound.tap(); core.openRosettes(); } }, '🏅 Rosetten'),
    h('button', { class: 'bigbtn', id: 'roomFarm', onclick: () => { Sound.tap(); core.showStable(); } }, '🏡 Zum Hof'));
  main.append(h('div', { class: 'room-wrap' }, scene, mine.length ? h('p', { class: 'room-tip' }, 'Tipp: Schiebe die Möbel mit dem Finger an einen neuen Platz.') : null, dock));
}

// =====================================================================
// Lernschild: Spiele bis 100 (Abkürzung von Hof und Startseite)
// =====================================================================
function openBoard() {
  const gs = core.GAMES.filter((g) => g.b100);
  const card = h('div', { class: 'lad board', id: 'board' }, h('div', { class: 'lad-head' }, h('h2', null, '🏫 Lernschild: Zahlen bis 100'), h('button', { class: 'iconbtn', id: 'boardClose', 'aria-label': 'Schließen', onclick: () => { Sound.tap(); close(); } }, '✕')),
    h('p', { class: 'board-sub' }, 'Jede Runde hat 5 Aufgaben. Du kannst dir so viel Zeit nehmen, wie du willst.'),
    h('div', { class: 'board-grid' }, gs.map((g) => { const sk = st().skills[g.id] || { level: 1 };
      return h('button', { class: 'board-tile', 'data-board': g.id, onclick: () => { Sound.tap(); close(); core.startGame(g.id); } }, h('span', { class: 'bt-ic' }, g.icon), h('b', null, g.name), h('small', null, g.sub), h('span', { class: 'bt-lv' }, 'Stufe ' + sk.level + ' von ' + g.maxLevel)); })));
  const close = core.sheet(card, () => { if (core.currentScreen === 'stable') core.showStable(); }); Sound.page();
}

// =====================================================================
// Hof-Menü (Knöpfe auf dem Pferdehof)
// =====================================================================
const MENU = [
  ['shop', '🛍️', 'Hofladen', () => openShop()], ['room', '🛋️', 'Stübchen', () => showRoom()], ['care', '🧼', 'Pflege', () => openCare()],
  ['mini', '🎮', 'Spiele', () => (core.minis ? core.minis.open() : null)], ['album', '📒', 'Album', () => openAlbum()], ['board', '🏫', 'Lernschild', () => openBoard()]
];
hooks.farmUI = (ctx) => {
  const { ui } = ctx;
  const hud = $('.farm-hud', ui);
  const open = (fn) => () => { Sound.tap(); const m = $('#dockMenu', ui); if (m) m.classList.remove('open'); fn(); };
  if (hud) hud.insertBefore(h('button', { class: 'farm-btn shop2', id: 'laden', 'aria-label': 'Hofladen', onclick: open(() => openShop()) }, '🛍️'), hud.firstChild && $('#closetBtn', hud));
  const menu = h('div', { class: 'dock-menu', id: 'dockMenu' }, MENU.map(([k, ic, nm, fn]) => h('button', { class: 'dock-item', id: 'dock-' + k, 'data-dock': k, onclick: open(fn) }, h('span', { class: 'di-ic' }, ic), h('span', null, nm))));
  const tg = h('button', { class: 'dock-toggle', id: 'dockToggle', 'aria-label': 'Hof-Menü', 'aria-expanded': 'false', onclick: () => { Sound.pop(); const o = menu.classList.toggle('open'); tg.setAttribute('aria-expanded', String(o)); } }, h('span', null, '🧰'), h('b', null, 'Menü'));
  ui.append(h('div', { class: 'farm-dock' }, menu, tg));
};

// Startseite: Kachelreihe "Mein Hof"
hooks.homeHof = () => h('div', { class: 'hof-row', id: 'hofRow' },
  MENU.filter((m) => m[0] !== 'board').map(([k, ic, nm, fn]) => h('button', { class: 'hof-tile hof-' + k, 'data-hof': k, onclick: () => { Sound.tap(); fn(); } },
    h('span', { class: 'hof-ic' }, ic), h('b', null, nm))));

// =====================================================================
// Elternbereich: Überblick Hofladen und Album
// =====================================================================
hooks.parentPanels = (wrap) => {
  const s = st();
  const nOwn = CAT.filter((p) => (p.kind !== 'pack') && owned(p)).length, nAll = CAT.filter((p) => p.kind !== 'pack').length;
  const per = TABS.map(([k, ic, nm]) => { const list = CAT.filter((p) => p.cat === k && p.kind !== 'pack'); return list.length ? `<tr><td>${ic} ${nm}</td><td>${list.filter(owned).length} von ${list.length}</td></tr>` : ''; }).join('');
  const m = s.minis || {};
  wrap.append(h('div', { class: 'panel', id: 'shopPanel' }, h('h3', null, '🛍️ Hofladen und Album'),
    h('p', null, `Gekauft: ${nOwn} von ${nAll} Sachen. Hufeisen ausgegeben: ${s.spent || 0}. Sticker im Album: ${stickerCount()} von ${NSTICK}.`),
    h('table', { class: 'ptable', html: `<tbody>${per}</tbody>` }),
    h('p', { class: 'psmall' }, `Pflege-Runden: ${m.careSessions || 0}. Sticker-Tüten geöffnet: ${m.packs || 0}. Mini-Spiele gespielt: ${m.played || 0}.`),
    h('p', { class: 'psmall' }, 'Alles im Hofladen kostet nur Hufeisen und Karotten, die beim Rechnen verdient werden. Es gibt keine Käufe mit echtem Geld, keine Werbung und keine Zeitdrücke.')));
};

core.shop = { albumCheck, daily, open: openShop, openCare, openAlbum, showRoom, openBoard, CAT, purchase, owned, openPack };
});
