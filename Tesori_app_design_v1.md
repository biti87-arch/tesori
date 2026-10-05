# App dei Tesori — Design doc v1

Base: `tesori_db_v1.json` (database unico del Manuale dei Tesori v2.7, fase 4), `Tesori_database_design_v2.md` (fa fede su colonne, fonti e decisioni del database), `Tesori_v2.7_tabelle_design_v1.md`, `0_Incantesimi.docx` (liste degli incantesimi per classe dal Vol. 2, fornite da Massy il 05/10/2026), golarion.altervista.org/wiki/Pergamene (colonna dello Stregone).
Modello di architettura: app `biti87-arch/inventore`.
Analisi fatta in chat il 05/10/2026; tutte le sezioni sono state confermate da Massy il 05/10/2026.
L'app non cambia il manuale: le correzioni per la v2.7.1 sono nella sezione E e vanno riportate nella sezione K del design doc del database.

## STATO LAVORO

| Passo | Stato |
|---|---|
| 1. Analisi in chat: funzioni, schermate, algoritmi, punti da decidere (A–E) | ✅ confermato (05/10/2026) |
| 2. Dati (`tesori_db_v1.1.json`, `incantesimi.json`), motore, pagina HTML (artifact da provare), test automatici | 🔄 pagina pubblicata da provare (05/10/2026); test tutti superati |
| 3. Versioni native: Capacitor (Android), Electron (Windows), workflow delle Releases | ⬜ |
| 4. Chiusura: `claude/stato_lavori.md`, sezione K del design doc del database, zip dei sorgenti in chat | ⬜ |

## A. SCHERMATE ✅

Telefono prima di tutto. Cinque schede nella barra in basso.

| Scheda | Contenuto |
|---|---|
| **Tesoro** | interruttore «Per livello / Per grado». Per livello: livello del gruppo 1–20 → «Tira». Per grado: grado ½–20, numero di tesori 1–6, interruttori «Parti di potenziamento» e «Armi, armature e scudi fra gli oggetti vari» |
| **Partenza** | equipaggiamento di partenza del Cap. 4 (sezione C7) |
| **Mercato** | disponibilità dei mercanti del Cap. 1 (sezione C8) |
| **Consulta** | ricerca per nome (italiano, nome in tabella, originale) con filtri grado e categoria; sotto-tabelle sfogliabili (veleni, tinture, pietre ioun, capacità speciali, bonus di set, liste degli incantesimi…); **generatore di pergamene** (classe e livello 1–9 o casuale) |
| **Storico** | ultimi 50 risultati salvati |

**Risultato di un tiro.** In alto il tiro iniziale (es. «d20 = 14 → colonna 13–14: 8+5»). Un riquadro per tesoro: intestazione («Primario · G8 · Oggetto vario», «Secondario · G5 · Parte: Scudo +1»), nome, prezzo, categoria; i dadi tirati in piccolo, in grigio; **↻** ritira solo quel pezzo (oggetto non usabile, bonus non cumulabile, capacità incompatibile o doppione, incantesimo); un tocco sul nome apre la scheda. In fondo: totale in mo, Salva · Copia · Condividi.

**Scheda dell'oggetto.** Nome italiano; sotto, in grigio, il nome originale; grado e numero di tiro · categoria · slot · prezzo (≈ se stimato); effetto (tag invariati, condizioni di stato in rosso #C00000); Nota (*) (se superata: chiusa, «nota superata: vale l'effetto»); set con pezzi e bonus; riga grigia «Nel manuale v2.7: …» con la segnalazione K, se il nome differisce o la riga ha una segnalazione.

## B. DECISIONI ✅

| # | Punto | Decisione |
|---|---|---|
| B1 | Oggetti speciali | Speciale = «Raro»/«Rarissimo» scritto nella riga o nella voce della sotto-tabella, oppure categoria Artefatto (Granata a miccia, granate a pallini, veleni dei gradi 13–20, Sfera annientatrice). In un tesoro secondario si ritira; nel mercato vale il limite fra parentesi. La rarità per colore resta esclusa (colori persi) |
| B2 | Pergamene | Sezione B2 sotto |
| B3 | Tinture | «Tintura X — applicata a: [bersaglio] perfetto adatto al gruppo». Valore del tesoro = prezzo dell'applicazione; nota «+ oggetto perfetto (arma +300, armatura o scudo +150 mo, oltre al prezzo base)». L'oggetto lo sceglie il DM (35 bersagli diversi, non collegabili in modo affidabile al Vol. 3) |
| B4 | Segnalazioni K | Non compaiono nel risultato; nella scheda una riga grigia «Nel manuale v2.7: "…" (K1)». L'app segue già le decisioni del design doc del database (pietre ioun 1–3 e 1–16, Verga +2 uniforme, tinture A8, nomi corretti) |
| B5 | Persistenza | Storico degli ultimi 50 risultati (tesori, partenza, mercato) nel dispositivo (localStorage, come le altre app); etichetta modificabile, eliminazione singola o totale; ogni oggetto conserva l'`id_riga` |
| B6 | Esportazione | «Copia» (testo compatto: un oggetto per riga con grado e prezzo) e «Condividi» su Android. Nessun file |
| B7 | Nomi originali | Solo nella scheda e nella ricerca, come nel database |
| B8 | Mercato | Incluso: solo Oggetti vari del grado indicato; pozioni e pergamene si ritirano |
| B9 | Bracciali dell'armatura del marzialista (non nel database) | «Bracciali dell'armatura +N», N = tetto di Sintonia del livello (2°–8° +1, 9°–11° +2, 12°–14° +3, 15°–16° +4, 17°+ +5); contano come armatura per le parti |
| B10 | Pozioni guaritrici del Cap. 4 | Cura ferite leggere 2°–4° (100 mo), moderate 5°–8° (400 mo), gravi dal 9° (900 mo); prezzi con la formula A15; il Vol. 3 ferma le pozioni al 3° livello |

### B2. Pergamene

**Liste:** `0_Incantesimi.docx` (dal Vol. 2, fa fede). 13 liste, 4.580 incantesimi: Bardo 0–6, Convocatore 0–6, Druido 0–9, Fattucchiere 0–9, Guardia Nera 1–4, Inquisitore 0–6, Magus 0–6, Necrarca 0–9, Paladino 1–4, Ranger 1–4, Sacerdote 0–9, Stregone 0–9, Sigillatore 0–6. **Arcanista** usa la lista dello Stregone, **Oracolo** quella del Sacerdote (15 classi nel selettore). Dell'incantesimo si mostrano solo nome (asterisco compreso) e CD.

**Prezzo e CD** (pagina Pergamene di golarion, solo colonna dello Stregone; prezzo = 25 × livello × LI). CD = 10 + livello + modificatore minimo per lanciare (punteggio 10 + livello) + 1 (regola del Cap. 2 sulle CD degli oggetti ritrovati: la CD non è indicata nel manuale), con la dicitura «se l'incantesimo concede un TS».

| Liv. | LI | Prezzo | CD |
|---|---|---|---|
| 1° | 1 | 25 mo | 12 |
| 2° | 4 | 200 mo | 14 |
| 3° | 6 | 450 mo | 15 |
| 4° | 8 | 800 mo | 17 |
| 5° | 10 | 1.250 mo | 18 |
| 6° | 12 | 1.800 mo | 20 |
| 7° | 14 | 2.450 mo | 21 |
| 8° | 16 | 3.200 mo | 23 |
| 9° | 18 | 4.050 mo | 24 |

**Livello massimo per grado:** N = metà del grado per difetto + 1, al massimo 9° (riproduce G½ → 1° e G6 → 4° del manuale).

| Gradi | ½–1 | 2–3 | 4–5 | 6–7 | 8–9 | 10–11 | 12–13 | 14–15 | 16–20 |
|---|---|---|---|---|---|---|---|---|---|
| N | 1° | 2° | 3° | 4° | 5° | 6° | 7° | 8° | 9° |

**Numero e livelli (1d20)**; il primo è la pergamena principale; nessun livello sotto il 1°.

| 1–9 | 10–12 | 13–14 | 15–16 | 17–18 | 19 | 20 |
|---|---|---|---|---|---|---|
| N | N + (N−2) | N + (N−1) | (N−1)×2 | (N−1) + (N−2)×2 | (N−1)×2 + (N−2)×2 | N×2 |

Al G½ al massimo 2 pergamene (colonne 17–19 → 1° + 1°): valore entro 50 mo.

**Classe:** una per ritrovamento. Righe esistenti: quella scritta nella riga. Righe nuove: tiro uniforme fra le 13 liste che hanno il livello N. Il selettore «Classe» la cambia (solo classi con quel livello). Ogni incantesimo è uniforme fra quelli del livello nella lista; ↻ ritira l'incantesimo.

**Righe delle tabelle (modifica per la v2.7.1, K8):**
- le 14 righe attuali diventano rimandi: «Pergamene di grado ½ (bardo)», «Pergamene di grado 6 (sacerdote)», …;
- negli altri gradi, in coda, righe «Pergamene di grado N» fino a coprire il 4% dell'intervallo (origine «aggiunta v2.7.1»), 107 righe:

| Grado | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Righe | 6 | 5 | 4 | 4 | 5 | 5 | 7 | 7 | 8 | 8 | 11 | 8 | 7 | 6 | 3 | 4 | 3 | 3 | 3 |

**Valore:** somma dei prezzi (es. G1 25–100, medio 44; G6 800–1.600, medio 955; G12 2.450–6.100, medio 3.422; G20 4.050–11.300, medio 5.942). Resta sotto la fascia del grado, come già la pergamena di 4° del G6; con il 4% dei tiri l'effetto sul valore medio dei tesori è piccolo. Scartata l'alternativa «pergamene fino al valore della fascia» (al G20 circa 19 pergamene di 9°).

**Mercato e generatore:** nel Mercato, per templi e accademie, pulsante «Pergamena» fino al livello di incantesimi dell'insediamento; nella scheda Consulta, generatore libero (classe e livello 1–9 o casuali).

## C. ALGORITMI DI TIRO ✅

Tutti i tiri sono uniformi; ogni risultato conserva i tiri che l'hanno prodotto e ↻ ritira solo il pezzo toccato.

### C1. Tesoro per livello
1. 1d20 sulla riga del livello → colonna → gradi (`livello_grado_tiri`); il primo è il primario.
2. Per ogni tesoro: tipo (C2), poi parte (C3) o Oggetto vario (C4).
3. Uno speciale (B1) in un tesoro secondario si ritira (riga grigia «ritirato: …»).
4. Totale in mo degli oggetti con prezzo; quelli senza prezzo sono segnati.

### C2. Composizione (modificata da Massy il 05/10/2026: 50% parti, 50% Oggetti vari)

| Grado | Tiro |
|---|---|
| ½–2 | sempre Oggetto vario |
| 3 | 1d2: 1 parte (1d2: armatura / scudo) · 2 Oggetto vario |
| 4–20 | 1d2: 1 parte (1d3: armatura / scudo / arma, l'arma 1d2: mischia / distanza) · 2 Oggetto vario |

Sostituisce la tabella del manuale (grado 3: 1d3 con 2 parti su 3; gradi 4–20: 1d4 con 3 parti su 4): correzione per la v2.7.1 (K9).

**Nota ¹** (almeno 2 tesori), invariata: primario normale; se è una parte, il primo secondario è un Oggetto vario; se è un Oggetto vario, il primo secondario di grado ≥3 è una parte (1d2 al grado 3, 1d3 dal grado 4); se nessun secondario è di grado ≥3, tutti i tesori sono Oggetti vari. Gli altri secondari si tirano normalmente.

### C3. Parte di potenziamento
1. Valore dal grado: 3–8 +1 · 9–11 1d6 (1–2 +1, 3–6 +2) · 12–14 (+2/+3) · 15–16 (+3/+4) · 17–19 (+4/+5) · 20 +5.
2. Capacità: uniforme fra le voci di categoria e valore (`capacita_speciali`, es. Armatura +1: 1–43); ↻ per incompatibile o doppione.

### C4. Oggetto vario
Tiro da 1 al totale della tabella del grado; poi:

| Tipo di riga | Risoluzione |
|---|---|
| oggetto, generica (pozione) | com'è |
| variante casuale | 1d2 / 1d4 dalla colonna Prezzo variabile |
| rimando, T12 | C5 |

### C5. Rimandi (`rimando_rif`)

| Rimando | Tiro |
|---|---|
| Oggetto difensivo (T12) | esito del grado (`generazione`); ¹ 1d10 Mantello / Veste / Bardatura della Resistenza; ² 1d4 Protezione a distanza / dai proiettili |
| Oggetto di potenziamento (T12) | esito del grado; ¹ 1d6 caratteristica; «due caratteristiche» = due diverse |
| Verga metamagica +N | uniforme fra 24 (+1), 17 (+2, A7) o 3 (+3) verghe; prezzo del rango della riga |
| Veleno | uniforme fra le voci `n_da`–`n_a` |
| Tintura | uniforme fra le applicazioni della fascia di tiro (`tinture_fascia_di_tiro`, A8); presentata come B3 |
| Bastone arcano | 1–17 |
| Bastone arcano superiore | 1–17 (energia e incantesimi base) + livello massimo e prezzo del grado; tema del DM |
| Pietra ioun | uniforme fra le pietre del grado (G19–20 sulla tabella 19-20); con `n`, la pietra indicata |
| Gioiello alchemico | 1–15 minori / 1–16 maggiori |
| Cristallo | d% sulla tabella del grado (G6 e G11: unico cristallo) |
| Sotto-tabelle alchemiche | uniforme fra le voci `n` |
| Arma / armatura perfetta | uniforme fra armi o armature della categoria (`armi_armature_vol3`) + 300 / 150 mo |
| Pergamene | B2 |

Le righe T12 non hanno prezzo nel manuale: «—», escluse dal totale.

### C6. Tesoro per grado
N tesori (1–6) del grado scelto. «Parti di potenziamento» sì → C2 e nota ¹ (il primo è il primario); no → solo Oggetti vari. «Armi, armature e scudi» no → si ritirano le righe di categoria Arma, Armatura, Scudo, Munizione. Speciali nei secondari come C1.

### C7. Equipaggiamento di partenza (livello L, dal 2°)
1. **Combattimento:** per armatura, scudo e ogni arma (1–2) 2 candidati casuali della categoria scelta (Vol. 3: armi semplici e da guerra, mischia o tiro; altre categorie a mano); Tabelle Armi di Classe (Marzialista 1d8 → 2d8; Druido e Morfico 1d12). Marzialista: Bracciali dell'armatura +N (B9) al posto dell'armatura.
2. **Oggetti vari:** uno per grado da L al ½ (L+1 oggetti, solo Oggetti vari, ↻ su ciascuno).
3. **Compensazioni:** niente armatura / niente scudo → +1 oggetto di grado L oppure (dall'8°, con una seconda arma) le parti per la seconda arma, a scelta; niente armi → +1 oggetto di grado L.
4. **Parti (dal 4°):** per ogni oggetto sintonizzato, tetto T (4–8 +1, 9–11 +2, 12–14 +3, 15–16 +4, 17+ +5): 2 parti di +T, 4 di +(T−1), … fino a +1, senza doppioni nella stessa lista, raggruppate per valore.
5. **Pozioni e oro:** 2 pozioni guaritrici (B10); oro «a cura del DM».

Lettura applicata nell'app (da confermare in prova): la seconda arma dichiarata riceve le sue parti solo dall'8° livello (la Sintonia copre due armi); l'opzione «parti per una seconda arma» delle compensazioni compare solo dall'8° livello e con una sola arma dichiarata, e vale una volta sola anche se mancano sia armatura sia scudo.

### C8. Mercato
Tipo di insediamento → numero di oggetti, speciali e offset; grado = PL − offset (minimo 1), abbassabile. k Oggetti vari dello stesso grado; pozioni, pergamene e speciali oltre il limite si ritirano; «50% di 1» con un d%. Promemoria del livello di incantesimi e pulsante «Pergamena» (B2). Accampamento: nessun oggetto.

## D. ARCHITETTURA E TEST ✅

| File | Contenuto |
|---|---|
| `sorgenti/tesori_db_v1.json` | database della fase 4 (invariato) |
| `sorgenti/aggiorna_db_pergamene.py` → `sorgenti/tesori_db_v1.1.json` | B2: 14 righe a rimando, 107 righe nuove in coda |
| `sorgenti/docx/0_Incantesimi.docx` + `sorgenti/parse_incantesimi.py` → `sorgenti/incantesimi.json` | 13 liste |
| `sorgenti/motore.js` | algoritmi, funzioni pure con dado sostituibile |
| `sorgenti/template.html` + `sorgenti/build.py` → `www/index.html` | interfaccia; dati e motore incorporati; funziona offline |
| `sorgenti/test_motore.js` | test con Node |
| Capacitor (`android/`), Electron (`desktop/`), `.github/workflows/` | come le altre app; apostrofi escapati in `strings.xml` |

**Test automatici:**
1. Ogni riga dei 21 gradi risolta 200 volte: nessun errore; ogni rimando arriva a una voce esistente.
2. Nessun tiro fuori intervallo (dado «spia» su ogni lancio).
3. Copertura esatta dei dadi: d% dei cristalli 1–100; 1d20 livello → grado 1–20; esiti «Tira 1dN» 1–N; varianti 1d2/1d4; 1d20 delle pergamene.
4. Nota ¹ su 100.000 ritrovamenti: con ≥2 tesori e un grado ≥3, sempre almeno una parte e un Oggetto vario; composizione al 50% (±1%).
5. Mai speciali nei secondari; nel mercato mai pozioni, pergamene o speciali oltre il limite.
6. Partenza: L+1 Oggetti vari; parti 2/4/6…; nessun doppione.
7. Pergamene: livelli 1–9; prezzo dalla colonna dello Stregone; classe sempre con quel livello.

**Stile:** tabelle della Collana (intestazione #D4A84B, bordi #8B6914, righe alternate #F5EDD0/#FAF3E0), condizioni di stato in rosso #C00000, impaginazione per telefono come le altre app.

## F. PDF DEI RISULTATI ✅ (richiesta di Massy del 05/10/2026)

| Aspetto | Decisione |
|---|---|
| Dove | pulsante «PDF» sotto i risultati di Tesoro, Partenza e Mercato. Android: salvataggio e menu Condividi; Windows: finestra «Salva con nome»; nella pagina di prova (artifact) il download è bloccato e la pagina lo dice |
| Prima del PDF | campo «Titolo» (Partenza: «Nome del personaggio»); Partenza: tocco sul candidato scelto (armatura, scudo, armi) e spunta sulle parti applicate |
| Contenuto | intestazione (titolo, livello o grado, tiro, data) · tabella di riepilogo · descrizioni complete (effetto, pergamene con CD e LI, tintura, nota (*) non superata, set) · Partenza: combattimento (candidato scelto, o entrambi), oggetti vari e compensazioni, **tutte le parti estratte con l'effetto**, per oggetto e per valore, ciascuna con una casella da spuntare (già spuntata se segnata come applicata nell'app; correzione di Massy del 05/10/2026), pozioni e oro · Mercato: anche le pergamene dei templi · totale |
| Stile | A4, margini 20/15 mm; titoli Gelasio grassetto #C45911 (stessa metrica di Georgia), testo Tinos giustificato (stessa metrica di Times New Roman), tabelle della Collana (#D4A84B, #8B6914, #F5EDD0/#FAF3E0), condizioni di stato in rosso #C00000, numero di pagina centrato. Font incorporati nell'app (funziona offline); ★ → *, → → », ≥/≤ → >=/<= (caratteri assenti dai font) |
| File | `sorgenti/pdf.js` (jsPDF 2.5.2 in `sorgenti/vendor/`, font in `sorgenti/font/`); nome del file es. `Partenza_L8_Brann_2026-10-05.pdf` |

## E. CORREZIONI PER LA V2.7.1 (da aggiungere alla sezione K di `Tesori_database_design_v2.md`)

| # | Dove | Correzione |
|---|---|---|
| K6 | Cap. 1, Disponibilità dei mercanti | L'esempio dice «8° livello, cittadina → grado 5», ma la tabella dà PL −4 = grado 4. L'app segue la tabella; l'esempio va corretto in «grado 4» |
| K7 | Vol. 2, liste degli incantesimi | Fattucchiere: intestazioni con il numero sbagliato (3° «76» ma 89 voci; 5° «43» ma 62; 6° «40» ma 43). Convocatore 6°: Teletrasporto* (niente teletrasporto a lunga distanza). Intestazioni da uniformare («Lista degli incantesimi da fattucchiere», «Incantesimi da inquisitore») |
| K8 | Cap. 3, pergamene | Righe «Pergamena di livello N (classe)» → «Pergamene di grado N (classe)» con la sotto-tabella B2; 107 righe nuove «Pergamene di grado N» in coda ai gradi 1–5 e 7–20; prezzo della pergamena di 1° livello 25 mo (colonna dello Stregone), che sostituisce i 50 mo della A15 (le pozioni restano con la A15) |
| K9 | Cap. 2, Composizione del tesoro | Grado 3 e gradi 4–20: 1d2 parte / Oggetto vario; il tipo di parte con 1d2 (grado 3) o 1d3 (gradi 4–20), come nella nota ¹ |
