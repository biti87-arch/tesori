"""Liste degli incantesimi per classe (Vol. 2) → sorgenti/incantesimi.json
Uso: python3 sorgenti/parse_incantesimi.py
Fonte: sorgenti/docx/0_Incantesimi.docx (fa fede, decisione di Massy del 05/10/2026).
Arcanista usa la lista dello Stregone, Oracolo quella del Sacerdote.
Prezzi e LI delle pergamene: golarion.altervista.org/wiki/Pergamene, colonna dello Stregone (B2)."""
import docx, re, json, os, sys
from docx.table import Table
from docx.text.paragraph import Paragraph

R = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(R, 'docx', '0_Incantesimi.docx')
d = docx.Document(SRC)

classi, note, dich, cur = {}, {}, {}, None
for el in d.element.body.iterchildren():
    tag = el.tag.split('}')[1]
    if tag == 'p':
        t = Paragraph(el, d).text.strip()
        m = re.match(r"(?:Lista degli )?Incantesimi d(?:a|el|ell'|ello|i)\s*(.+)$", t, re.I)
        if m and len(t) < 60:
            cur = m.group(1).strip()
            cur = cur[0].upper() + cur[1:]
            classi[cur] = {}
            continue
        if t and cur:
            note.setdefault(cur, []).append(t)
    elif tag == 'tbl':
        T = Table(el, d)
        hdr = [c.text for c in T.rows[0].cells]
        for row in T.rows[1:]:
            for j, cell in enumerate(row.cells):
                m = re.match(r'Livello (\d)\s*\((\d+)', hdr[j])
                if not m:
                    continue
                lv = int(m.group(1)); dich[(cur, lv)] = int(m.group(2))
                L = classi[cur].setdefault(lv, {})
                for line in cell.text.split('\n'):
                    line = re.sub(r'\s+', ' ', line).strip()
                    if not line:
                        continue
                    mm = re.match(r'(\d+)\.\s*(.+)', line)
                    if not mm:
                        sys.exit(f'riga non riconosciuta: {cur} {lv} {line!r}')
                    L[int(mm.group(1))] = mm.group(2).strip()

avvisi, tot = [], 0
out = {}
for c, L in classi.items():
    out[c] = {}
    for lv in sorted(L):
        x = L[lv]
        if sorted(x) != list(range(1, len(x) + 1)):
            sys.exit(f'numerazione non consecutiva: {c} {lv}')
        if len(x) != dich[(c, lv)]:
            avvisi.append(f'{c} {lv}° livello: intestazione {dich[(c, lv)]}, voci {len(x)}')
        out[c][str(lv)] = [x[k] for k in sorted(x)]
        tot += len(x)

LI = {1: 1, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18}
pergamene = {str(l): {'li': LI[l], 'prezzo': 25 * l * LI[l], 'cd': 10 + l + l // 2 + 1} for l in LI}
assert [pergamene[str(l)]['prezzo'] for l in LI] == [25, 200, 450, 800, 1250, 1800, 2450, 3200, 4050]

dati = {
    'fonte': '0_Incantesimi.docx (liste del Vol. 2)',
    'classi': out,
    'alias': {'Arcanista': 'Stregone', 'Oracolo': 'Sacerdote'},
    'pergamene': pergamene,
    'note': note,
    'avvisi': avvisi,
}
json.dump(dati, open(os.path.join(R, 'incantesimi.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(f'{len(out)} liste, {tot} incantesimi')
for a in avvisi:
    print('avviso:', a)
