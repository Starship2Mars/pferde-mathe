/* Pferde-Mathe – Echt-Optik: fotorealistische Bilder (Tiere, Hintergründe) und kleine Hilfen.
   Alle Bilder liegen lokal im Ordner img/ (kein Netzwerk). Mit ?cartoon in der Adresse gibt es den alten Zeichentrick-Look. */
(function () {
  'use strict';
  var MAN = {"eichhoernchen":{"w":320,"h":311,"back":[[90,20],[109,22],[128,46],[147,60],[166,76],[186,118],[205,95]],"head":[227,8]},"esel":{"w":320,"h":304,"back":[[90,98],[109,100],[128,102],[147,101],[166,98],[186,91],[205,70]],"head":[268,2]},"eule":{"w":320,"h":570,"back":[[90,12],[109,6],[128,3],[147,4],[166,4],[186,5],[205,9]],"head":[224,17]},"fohlen":{"w":440,"h":454,"back":[[123,122],[150,129],[176,136],[202,136],[229,119],[255,89],[282,60]],"head":[368,3]},"funke":{"w":440,"h":374,"back":[[123,94],[150,100],[176,103],[202,102],[229,88],[255,79],[282,65]],"head":[386,2]},"hase":{"w":320,"h":361,"back":[[90,159],[109,152],[128,147],[147,6],[166,2],[186,10],[205,30]],"head":[224,61]},"huehner":{"w":420,"h":253,"back":[[118,47],[143,19],[168,10],[193,65],[218,71],[244,94],[269,79]],"head":[315,17]},"hund":{"w":340,"h":335,"back":[[95,284],[116,226],[136,193],[156,166],[177,141],[197,120],[218,32]],"head":[300,2]},"igel":{"w":320,"h":193,"back":[[90,10],[109,6],[128,5],[147,6],[166,9],[186,11],[205,16]],"head":[224,19]},"kaetzchen":{"w":340,"h":480,"back":[[95,242],[116,219],[136,207],[156,41],[177,53],[197,64],[218,61]],"head":[310,3]},"lamm":{"w":320,"h":314,"back":[[90,71],[109,72],[128,76],[147,79],[166,76],[186,74],[205,18]],"head":[252,3]},"luna":{"w":440,"h":375,"back":[[123,94],[150,100],[176,104],[202,102],[229,88],[255,80],[282,65]],"head":[387,2]},"mohn":{"w":440,"h":476,"back":[[123,113],[150,121],[176,128],[202,130],[229,124],[255,102],[282,73]],"head":[365,3]},"mondlicht":{"w":440,"h":367,"back":[[123,94],[150,100],[176,104],[202,103],[229,89],[255,80],[282,64]],"head":[387,2]},"nacht":{"w":440,"h":362,"back":[[123,91],[150,97],[176,101],[202,101],[229,88],[255,79],[282,64]],"head":[387,2]},"pony":{"w":440,"h":366,"back":[[123,90],[150,96],[176,103],[202,105],[229,91],[255,74],[282,50]],"head":[370,2]},"puenktchen":{"w":440,"h":352,"back":[[123,85],[150,91],[176,96],[202,96],[229,83],[255,74],[282,59]],"head":[387,2]},"sonnenschein":{"w":440,"h":375,"back":[[123,94],[150,100],[176,104],[202,102],[229,88],[255,79],[282,65]],"head":[387,2]},"sternschnuppe":{"w":440,"h":365,"back":[[123,93],[150,99],[176,103],[202,103],[229,89],[255,78],[282,61]],"head":[384,3]},"wolke":{"w":440,"h":369,"back":[[123,93],[150,99],[176,104],[202,104],[229,90],[255,81],[282,66]],"head":[385,3]},"ziege":{"w":340,"h":302,"back":[[95,68],[116,69],[136,74],[156,79],[177,81],[197,75],[218,59]],"head":[293,2]}};
  var on = !/[?&]cartoon\b/.test(location.search);
  function url(p) { return (window.__PM_IMGS && window.__PM_IMGS[p]) || ('img/' + p); }
  // Breite der Tiere im Hof in vmin (Pferde behalten ihre Größe aus der Liste)
  var K = { kaetzchen: 12, huehner: 16, hund: 15, ziege: 13, hase: 10, lamm: 14, esel: 22, eichhoernchen: 9, eule: 7.5, igel: 10 };
  function has(id) { return on && !!MAN[id]; }
  // Zonen als Anteile des Hintergrundbilds: [links, oben, rechts, unten]
  var ZONES = [
    { img: 'bg/hof-quer.webp', w: 1152, h: 864, barn: [0.06, 0.10, 0.49, 0.53], house: [0.615, 0.14, 0.95, 0.47], door: [0.308, 0.365, 0.405, 0.505], hdoor: [0.715, 0.34, 0.77, 0.46], wins: [[0.69, 0.309], [0.738, 0.309], [0.796, 0.309], [0.69, 0.39], [0.776, 0.39]] },
    { img: 'bg/hof-hoch.webp', w: 864, h: 1152, barn: [0.052, 0.098, 0.49, 0.354], house: [0.63, 0.14, 0.96, 0.322], door: [0.302, 0.256, 0.404, 0.344], hdoor: [0.725, 0.255, 0.77, 0.325], wins: [[0.693, 0.228], [0.745, 0.228], [0.803, 0.228], [0.694, 0.275], [0.785, 0.275]] }
  ];
  var UID = 0;
  function bow(x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0 0 L-14 -9 L-14 9 Z" fill="#f48fb1"/><path d="M0 0 L14 -9 L14 9 Z" fill="#f48fb1"/><circle r="5" fill="#ec6f9c"/></g>'; }
  function crown(x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') rotate(-12) scale(' + s + ')"><path d="M-13 9 L-13 -4 L-6 2 L0 -9 L6 2 L13 -4 L13 9 Z" fill="#f6cf5a" stroke="#c9962a" stroke-width="1.6" stroke-linejoin="round"/><circle cx="0" cy="-9" r="2.6" fill="#f7a8c4"/><circle cx="-13" cy="-4" r="2" fill="#b5dcff"/><circle cx="13" cy="-4" r="2" fill="#b5dcff"/></g>'; }
  // Sprite als <svg> mit eingebettetem Foto; Decke, Sattel, Schleife, Krone werden passend zur Rückenlinie darübergelegt
  function sprite(id, o) {
    var m = MAN[id]; if (!m || !on) return null;
    o = o || {}; var W = m.w, H = m.h, g = '', uid = 'pg' + (++UID), defs = '', href = url('tiere/' + id + '.webp');
    var b = m.back.slice(0, 5), top = Math.min.apply(null, b.map(function (p) { return p[1]; }));
    var cloth = '';
    if (o.blanket || o.saddle) {
      var d = H * 0.25, yb = b.map(function (p) { return [p[0], p[1] - 8]; });
      var shape = function (x0, x1, drop, up) {
        var p0 = [x0, yb[0][1]], p1 = [x1, yb[4][1]];
        return 'M' + (x0 - 4) + ' ' + (top - up) + ' L' + (x1 + 4) + ' ' + (top - up) + ' L' + (x1 + 4) + ' ' + (p1[1] + drop * 0.9) + ' Q' + ((x0 + x1) / 2) + ' ' + (top + drop * 1.28) + ' ' + (x0 - 4) + ' ' + (p0[1] + drop * 0.9) + ' Z';
      };
      if (o.blanket || o.pad) {
        var col = o.blanket || o.pad || '#9ad0ec', sh = shape(b[0][0], b[4][0], o.blanket ? d : d * 0.8, 30);
        cloth += '<path d="' + sh + '" fill="' + col + '"/><path d="' + sh + '" fill="url(#' + uid + 'g)"/><path d="' + sh + '" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="2.4"/>';
        if (o.blanket) cloth += '<path d="' + sh + '" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round" transform="translate(0 -5)"/>';
      }
      if (o.saddle) {
        var sx0 = b[1][0], sx1 = b[3][0], sh2 = shape(sx0, sx1, H * 0.15, 30);
        cloth += '<path d="' + sh2 + '" fill="#7a4a24"/><path d="' + sh2 + '" fill="url(#' + uid + 'g)"/><path d="' + sh2 + '" fill="none" stroke="#3e220f" stroke-width="2.4"/>';
      }
      g += '<g mask="url(#' + uid + 'm)">' + cloth + '</g>';
    }
    if (o.bow) g += bow(m.head[0] - W * 0.05, m.head[1] + H * 0.06, W / 260);
    if (o.crown) g += crown(m.head[0] - W * 0.02, m.head[1] + H * 0.005, W / 260);
    if (o.glanz) g += [[0.42, 0.3], [0.55, 0.38], [0.3, 0.45], [0.8, 0.12]].map(function (q, i) { var x = q[0] * W, y = q[1] * H; return '<path class="spk" style="animation-delay:' + (i * 0.4) + 's" d="M' + x + ' ' + (y - 6) + ' l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2z" fill="#fff"/>'; }).join('');
    if (o.blanket || o.saddle) defs = '<defs><mask id="' + uid + 'm" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '"><image href="' + url('tiere/' + id + '-m.webp') + '" width="' + W + '" height="' + H + '"/></mask><linearGradient id="' + uid + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient></defs>';
    return '<svg class="ph' + (o.horse ? ' horse' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + defs + '<g class="fl"><g class="idle"><image href="' + href + '" width="' + W + '" height="' + H + '"/>' + g + '</g></g></svg>';
  }
  window.PM_ECHT = { on: on, has: has, sprite: sprite, url: url, K: K, ZONES: ZONES, MAN: MAN };
})();
