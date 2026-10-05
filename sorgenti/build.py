"""Genera l'app a partire da template.html, motore.js e dai dati JSON.
Uso: python3 sorgenti/build.py [percorso_versione_web]
- scrive www/index.html (app Android/Windows, font locali, funziona offline)
- se indicato, scrive anche la versione web con i font di Google Fonts (per l'artifact)."""
import json, sys, os, re
R = os.path.dirname(os.path.abspath(__file__))
leggi = lambda f: open(os.path.join(R, f), encoding='utf8').read()
mini = lambda f: json.dumps(json.load(open(os.path.join(R, f), encoding='utf8')), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
t = leggi('template.html')
for k, v in (('__DATI__', mini('tesori_db_v1.1.json')), ('__INC__', mini('incantesimi.json')), ('__MOTORE__', leggi('motore.js'))):
    assert t.count(k) == 1, k
    t = t.replace(k, v)
if len(sys.argv) > 1:
    open(sys.argv[1], 'w', encoding='utf8').write(t)
fonts = re.compile(r'<link rel="preconnect"[^>]*>\n<link rel="preconnect"[^>]*>\n<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>')
assert fonts.search(t)
body = fonts.sub('<link rel="stylesheet" href="vendor/fonts.css">\n<link rel="icon" href="icona.png">', t)
head = '''<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light dark}body{margin:0}[hidden]{display:none!important}</style>
'''
i = body.index('<div class="wrap">')
out = head + body[:i] + '</head>\n<body>\n' + body[i:] + '\n</body>\n</html>\n'
open(os.path.join(R, '..', 'www', 'index.html'), 'w', encoding='utf8').write(out)
print('ok', len(out))
