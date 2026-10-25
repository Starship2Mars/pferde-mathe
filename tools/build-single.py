#!/usr/bin/env python3
"""Baut pferde-mathe.html: eine einzige Datei mit allem (CSS, JS, Icons) inline."""
import base64, json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
def b64(p): return base64.b64encode((root / p).read_bytes()).decode()
html = (root / 'index.html').read_text(encoding='utf-8')
touch = 'data:image/png;base64,' + b64('icons/apple-touch-icon.png')
i192 = 'data:image/png;base64,' + b64('icons/icon-192.png')
man = json.loads((root / 'manifest.webmanifest').read_text(encoding='utf-8'))
man['icons'] = [{'src': i192, 'sizes': '192x192', 'type': 'image/png'}]
man.pop('start_url', None); man.pop('scope', None)
man_uri = 'data:application/manifest+json;base64,' + base64.b64encode(json.dumps(man).encode()).decode()
html = html.replace("script-src 'self'", "script-src 'unsafe-inline'")
html = html.replace("default-src 'self'", "default-src 'self' data:")
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', f'<link rel="manifest" href="{man_uri}">')
html = html.replace('<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">', f'<link rel="apple-touch-icon" href="{touch}">')
html = html.replace('<link rel="icon" type="image/png" href="icons/icon-192.png">', f'<link rel="icon" type="image/png" href="{i192}">')
# alle Stylesheets inline
def css_sub(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_sub, html)
# alle Skripte inline (in der Reihenfolge der index.html)
first = True
def js_sub(m):
    global first
    js = (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script')
    pre = '<script>window.__PM_SINGLE__ = true;</script>\n' if first else ''
    first = False
    return pre + '<script>\n' + js + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', js_sub, html)
(root / 'pferde-mathe.html').write_text(html, encoding='utf-8')
print('pferde-mathe.html', len(html.encode()) // 1024, 'KB')
