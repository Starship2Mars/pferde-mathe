/* Pferde-Mathe – Service Worker (nur lokaler Cache, keine Netzwerkaufrufe nach außen) */
const CACHE = 'pferde-mathe-v13-echt-icons';
const ASSETS = [
  './', './index.html', './style.css', './polish.css', './shop.css', './echt.css', './echt.js', './audio.js', './art.js', './bis100.js', './shop.js', './minigames.js', './app.js', './manifest.webmanifest',
  './img/bg/hof-hoch.webp', './img/bg/hof-quer.webp', './img/bg/stall.webp', './img/bg/stuebchen.webp', './img/ico/album.webp', './img/ico/beet.webp', './img/ico/blatt.webp', './img/ico/buerste.webp', './img/ico/fisch.webp', './img/ico/haus.webp', './img/ico/helm.webp', './img/ico/heu.webp', './img/ico/hufeisen.webp', './img/ico/karotte.webp', './img/ico/karte.webp', './img/ico/knochen.webp', './img/ico/lampe.webp', './img/ico/lautsprecher.webp', './img/ico/medaille.webp', './img/ico/napf.webp', './img/ico/note.webp', './img/ico/pad.webp', './img/ico/pokal.webp', './img/ico/rosette.webp', './img/ico/rucksack.webp', './img/ico/scheune.webp', './img/ico/seife.webp', './img/ico/shirt.webp', './img/ico/sofa.webp', './img/ico/sonnenblume.webp', './img/ico/tasche.webp', './img/ico/trog.webp', './img/ico/wagen.webp', './img/ico/werkzeug.webp', './img/tiere/eichhoernchen.webp', './img/tiere/esel.webp', './img/tiere/eule.webp', './img/tiere/fohlen-m.webp', './img/tiere/fohlen.webp', './img/tiere/funke-m.webp', './img/tiere/funke.webp', './img/tiere/hase.webp', './img/tiere/huehner.webp', './img/tiere/hund.webp', './img/tiere/igel.webp', './img/tiere/kaetzchen.webp', './img/tiere/lamm.webp', './img/tiere/luna-m.webp', './img/tiere/luna.webp', './img/tiere/mohn-m.webp', './img/tiere/mohn.webp', './img/tiere/mondlicht-m.webp', './img/tiere/mondlicht.webp', './img/tiere/nacht-m.webp', './img/tiere/nacht.webp', './img/tiere/pony-m.webp', './img/tiere/pony.webp', './img/tiere/puenktchen-m.webp', './img/tiere/puenktchen.webp', './img/tiere/sonnenschein-m.webp', './img/tiere/sonnenschein.webp', './img/tiere/sternschnuppe-m.webp', './img/tiere/sternschnuppe.webp', './img/tiere/wolke-m.webp', './img/tiere/wolke.webp', './img/tiere/ziege.webp',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
    })
  );
});
