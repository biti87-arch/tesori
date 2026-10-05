# Tesori della Collana

App dei Tesori per il Manuale dei Tesori v2.7: tesori casuali per livello del gruppo o per grado (composizione, parti di potenziamento, rimandi alle sotto-tabelle risolti in automatico), equipaggiamento di partenza (Cap. 4), mercato (Cap. 1), consultazione del database, pergamene con le liste degli incantesimi del Vol. 2, storico dei risultati.

## Come si aggiorna
1. Database: `sorgenti/tesori_db_v1.json` è quello della fase 4 (non si tocca a mano).
   `python3 sorgenti/aggiorna_db_pergamene.py` → `sorgenti/tesori_db_v1.1.json` (pergamene per grado B2, composizione K9, segnalazioni K6–K9).
2. Liste degli incantesimi: metti il docx in `sorgenti/docx/0_Incantesimi.docx`, poi `python3 sorgenti/parse_incantesimi.py` → `sorgenti/incantesimi.json`.
3. Test del motore: `node sorgenti/test_motore.js` (devono passare tutti).
4. Pagina: `python3 sorgenti/build.py [versione_web.html]` → `www/index.html` (font locali, offline); il parametro facoltativo scrive anche la versione con i font di Google (quella pubblicata come artifact).

## File
- `sorgenti/motore.js`: tutti gli algoritmi di tiro (funzioni pure, dado sostituibile).
- `sorgenti/template.html`: interfaccia (5 schede).
- `Tesori_app_design_v1.md`: decisioni A–E, fa fede.
