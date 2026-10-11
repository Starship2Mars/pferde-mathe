// Erzeugt die App-Icons (PNG) aus einer SVG-Vorlage. Aufruf: node tools/make-icons.js (benötigt playwright)
const path = require('path');
const { chromium } = require(process.env.PW_PATH || 'playwright');
const horse = `<g transform="translate(70 120) scale(1.75)">
<g><path d="M50 88 C22 90 14 122 26 148 C34 130 40 112 54 100 Z" fill="#6b3e26"/></g>
<rect x="60" y="110" width="12" height="44" rx="6" fill="#ab764a"/><rect x="124" y="110" width="12" height="44" rx="6" fill="#ab764a"/>
<ellipse cx="95" cy="98" rx="54" ry="31" fill="#c98b57"/>
<rect x="72" y="110" width="12" height="44" rx="6" fill="#c98b57"/><rect x="136" y="110" width="12" height="44" rx="6" fill="#c98b57"/>
<rect x="59" y="146" width="14" height="10" rx="4" fill="#6a4a38"/><rect x="71" y="146" width="14" height="10" rx="4" fill="#6a4a38"/><rect x="123" y="146" width="14" height="10" rx="4" fill="#6a4a38"/><rect x="135" y="146" width="14" height="10" rx="4" fill="#6a4a38"/>
<path d="M116 84 C122 62 130 46 140 32 L166 46 C156 64 150 84 146 104 Z" fill="#c98b57"/>
<path d="M138 28 C128 44 120 62 113 86 L123 86 C128 66 136 50 147 36 Z" fill="#6b3e26"/>
<polygon points="143,32 147,10 157,30" fill="#c98b57"/>
<ellipse cx="164" cy="50" rx="31" ry="18" transform="rotate(32 164 50)" fill="#c98b57"/>
<path d="M152 34 Q160 40 172 56 Q166 58 160 50 Q154 42 150 37 Z" fill="#fff" opacity=".85"/>
<ellipse cx="183" cy="66" rx="14" ry="12" fill="#efcfae"/>
<circle cx="158" cy="45" r="5.5" fill="#3a2a20"/><circle cx="160" cy="43" r="2" fill="#fff"/>
<path d="M175 73 Q182 78 190 72" stroke="#7a5a48" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<g transform="translate(136 30)"><path d="M0 0 L-14 -9 L-14 9 Z" fill="#f48fb1"/><path d="M0 0 L14 -9 L14 9 Z" fill="#f48fb1"/><circle r="5" fill="#ec6f9c"/></g>
</g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#cdeac0"/>
<circle cx="256" cy="230" r="200" fill="#e9f7e1"/>
<path d="M0 400 Q256 350 512 400 L512 512 L0 512 Z" fill="#a9d89a"/>
<g transform="translate(330 70) scale(2.2)"><path d="M8 5 C1 22 7 37 20 37 C33 37 39 22 32 5 L25 5 C29 20 26 30 20 30 C14 30 11 20 15 5 Z" fill="#f2c14e" stroke="#c9962a" stroke-width="2"/></g>
<text x="104" y="140" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="900" font-size="88" fill="#7d5233">1+1</text>
${horse}
</svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '..', 'icons', name), omitBackground: false });
  }
  await b.close();
  console.log('icons ok');
})();
