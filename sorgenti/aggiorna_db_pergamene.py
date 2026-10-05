"""Database v1 → v1.1 per l'app (Tesori_app_design_v1.md, B2 e C2).
Uso: python3 sorgenti/aggiorna_db_pergamene.py
- Le 14 righe «Pergamena di livello N (classe)» diventano rimandi «Pergamene di grado N (classe)».
- In coda ai gradi 1–5 e 7–20 si aggiungono righe «Pergamene di grado N» fino a coprire il 4% dell'intervallo.
- Si aggiungono la sotto-tabella delle pergamene (livello massimo per grado, 1d20) e la composizione al 50% (K9).
- Le segnalazioni K6–K9 vanno nell'elenco delle segnalazioni.
Il nome in tabella delle righe esistenti resta quello del manuale v2.7."""
import json, math, os, re
R = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(R, 'tesori_db_v1.json'), encoding='utf8'))
O = d['oggetti']

GRADI = ['½'] + [str(i) for i in range(1, 21)]
gv = lambda g: 0.5 if g == '½' else int(g)
N = lambda g: min(9, int(gv(g) // 2) + 1)          # livello massimo delle pergamene
ID = lambda g, n: f"G{'0.5' if g == '½' else g}-{n}"

# 1) righe esistenti → rimando
cambiate = 0
for o in O:
    if o['categoria'] == 'Pergamena':
        classe = o['rimando_rif']['classe'].capitalize()
        g = o['grado']
        o.update({
            'nome_italiano': f'Pergamene di grado {g} ({classe.lower()})',
            'tipo_riga': 'rimando', 'fonte': 'Rimando',
            'rimando': f'Pergamene: livello massimo {N(g)}°, lista {"del " if classe != "Arcanista" else "dell\'"}{classe.lower()}',
            'rimando_rif': {'foglio': 'pergamene', 'grado': g, 'classe': classe},
            'prezzo': None, 'prezzo_variabile': 'somma delle pergamene (colonna dello Stregone)',
            'effetto': '', 'segnalazioni': ', '.join(x for x in [o['segnalazioni'], 'K8'] if x),
        })
        cambiate += 1
assert cambiate == 14, cambiate

# 2) righe nuove in coda
massimo = {}
for o in O:
    massimo[o['grado']] = max(massimo.get(o['grado'], 0), o['n'])
nuove = []
for g in GRADI:
    if g in ('½', '6'):
        continue
    n0 = massimo[g]
    k = math.ceil(0.04 * n0 / 0.96)
    for i in range(1, k + 1):
        nuove.append({
            'id_riga': ID(g, n0 + i), 'grado': g, 'n': n0 + i,
            'nome_tabella': f'Pergamene di grado {g}', 'nome_italiano': f'Pergamene di grado {g}',
            'nome_originale': '', 'id_oggetto': '', 'fonte': 'Rimando', 'tipo_riga': 'rimando',
            'rimando': f'Pergamene: livello massimo {N(g)}°, classe casuale',
            'rimando_rif': {'foglio': 'pergamene', 'grado': g, 'classe': None},
            'categoria': 'Pergamena', 'slot': '', 'prezzo': None, 'prezzo_stimato': False,
            'prezzo_variabile': 'somma delle pergamene (colonna dello Stregone)', 'fuori_fascia': False,
            'effetto': '', 'nota': '', 'stato_nota': '', 'set': '', 'origine': 'aggiunta v2.7.1',
            'livello_minimo': max(1, int(gv(g))), 'segnalazioni': 'K8',
        })
assert len(nuove) == 107, len(nuove)
ordine = {g: i for i, g in enumerate(GRADI)}
O.extend(nuove)
O.sort(key=lambda o: (ordine[o['grado']], o['n']))

# 3) sotto-tabella delle pergamene e composizione al 50%
d['sottotabelle']['pergamene'] = {
    'livello_massimo': {g: N(g) for g in GRADI},
    'tiro_1d20': [
        {'tiro': '1–9', 'da': 1, 'a': 9, 'scarti': [0]},
        {'tiro': '10–12', 'da': 10, 'a': 12, 'scarti': [0, -2]},
        {'tiro': '13–14', 'da': 13, 'a': 14, 'scarti': [0, -1]},
        {'tiro': '15–16', 'da': 15, 'a': 16, 'scarti': [-1, -1]},
        {'tiro': '17–18', 'da': 17, 'a': 18, 'scarti': [-1, -2, -2]},
        {'tiro': '19', 'da': 19, 'a': 19, 'scarti': [-1, -1, -2, -2]},
        {'tiro': '20', 'da': 20, 'a': 20, 'scarti': [0, 0]},
    ],
    'massimo_g05': 2,
    'nota': 'N = metà del grado per difetto + 1 (massimo 9°); livelli sotto il 1° → 1°; al grado ½ al massimo 2 pergamene. Classe: quella della riga, oppure casuale fra le liste che hanno il livello N.',
}
d['regole']['composizione_app'] = {
    'righe': [
        {'grado': '½-2', 'tiro': '—', 'risultato': 'Oggetto vario'},
        {'grado': '3', 'tiro': '1d2', 'risultato': '1: parte (1d2: Armatura · Scudo) · 2: Oggetto vario¹'},
        {'grado': '4-20', 'tiro': '1d2', 'risultato': '1: parte (1d3: Armatura · Scudo · Arma, 1d2: da mischia / a distanza) · 2: Oggetto vario¹'},
    ],
    'nota': 'Decisione di Massy del 05/10/2026 (K9): 50% parti, 50% Oggetti vari. La nota ¹ resta invariata.',
}

# 4) segnalazioni nuove
d['segnalazioni'] += [
    {'sezione': 'K6', 'riferimento': 'Cap. 1, Disponibilità dei mercanti', 'nome_in_tabella': '', 'corretto': '',
     'nota': "L'esempio dice «8° livello, cittadina → grado 5», ma la tabella dà PL −4 = grado 4"},
    {'sezione': 'K7', 'riferimento': 'Vol. 2, liste degli incantesimi', 'nome_in_tabella': '', 'corretto': '',
     'nota': 'Fattucchiere: intestazioni 3° «76» (89 voci), 5° «43» (62), 6° «40» (43); Convocatore 6°: Teletrasporto*; intestazioni da uniformare'},
    {'sezione': 'K8', 'riferimento': 'Cap. 3, pergamene', 'nome_in_tabella': 'Pergamena di livello N (classe)', 'corretto': 'Pergamene di grado N (classe)',
     'nota': '107 righe nuove «Pergamene di grado N» in coda ai gradi 1–5 e 7–20; pergamena di 1° livello 25 mo (colonna dello Stregone) al posto dei 50 mo della A15'},
    {'sezione': 'K9', 'riferimento': 'Cap. 2, Composizione del tesoro', 'nome_in_tabella': '', 'corretto': '',
     'nota': 'Grado 3 e gradi 4–20: 1d2 parte / Oggetto vario; tipo di parte 1d2 (grado 3) o 1d3 (gradi 4–20)'},
]
d['versione'] = 'Tesori database v1.1 (Manuale dei Tesori v2.7 + decisioni dell\'app del 05/10/2026: B2, K8, K9)'
json.dump(d, open(os.path.join(R, 'tesori_db_v1.1.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
tot = {g: sum(1 for o in O if o['grado'] == g) for g in GRADI}
print(len(O), 'righe;', ' '.join(f'{g}:{tot[g]}' for g in GRADI))
