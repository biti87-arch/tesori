/* Test automatici del motore (Tesori_app_design_v1.md, sezione D).
   Uso: node sorgenti/test_motore.js */
'use strict';
const path = require('path');
const M = require('./motore.js');
const DB = require('./tesori_db_v1.1.json');
const INC = require('./incantesimi.json');
const S = DB.sottotabelle, RG = DB.regole;

let lanci = 0, fuori = 0;
const spia = n => { const x = M.rngCasuale(n); lanci++; if (!(Number.isInteger(n) && n >= 1 && x >= 1 && x <= n)) fuori++; return x; };
const m = M.crea(DB, INC, spia);
const esiti = [];
function prova(nome, f) {
  try { const r = f(); esiti.push([true, nome, r || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const copre = (voci, dado, nome) => {           // le voci coprono 1..dado esattamente una volta
  const seen = Array(dado + 1).fill(0);
  voci.forEach(v => { for (let x = v.da; x <= v.a; x++) seen[x]++; });
  for (let x = 1; x <= dado; x++) assert(seen[x] === 1, nome + ': il ' + x + ' è coperto ' + seen[x] + ' volte');
  assert(seen.length === dado + 1, nome);
};

// 1. ogni riga risolta 200 volte, ogni rimando arriva a una voce esistente
prova('1. Ogni riga dei 21 gradi risolta 200 volte', () => {
  let n = 0;
  DB.oggetti.forEach(riga => {
    for (let i = 0; i < 200; i++) {
      const R = m.risolvi(riga); n++;
      assert(R.nome && typeof R.nome === 'string', 'nome vuoto in ' + riga.id_riga);
      if (riga.rimando_rif) {
        const f = riga.rimando_rif.foglio;
        if (f === 'pergamene') assert(R.pergamene.lista.length >= 1 && R.pergamene.lista.every(p => p.incantesimo), 'pergamene vuote ' + riga.id_riga);
        else if (f !== 'generazione') assert(R.voce, 'rimando senza voce in ' + riga.id_riga);
      }
      if (riga.tipo_riga === 'oggetto' && riga.categoria !== 'Artefatto') assert(R.prezzo != null, 'oggetto senza prezzo ' + riga.id_riga);
      if (riga.rimando_rif && !['generazione'].includes(riga.rimando_rif.foglio)) assert(R.prezzo != null, 'rimando senza prezzo ' + riga.id_riga);
    }
  });
  return n.toLocaleString('it-IT') + ' risoluzioni su ' + DB.oggetti.length + ' righe';
});

// 3. copertura esatta delle tabelle di tiro
prova('3a. Cristalli: d% = 1–100 in ogni grado (G6 e G11 un solo cristallo)', () => {
  const g = {}; S.cristalli_tabelle.forEach(c => (g[c.grado] = g[c.grado] || []).push({ da: c.tiro_da, a: c.tiro_a }));
  Object.entries(g).forEach(([k, v]) => { if (v.length === 1) assert(k === '6' || k === '11', 'grado ' + k); else copre(v, 100, 'cristalli G' + k); });
  return Object.keys(g).length + ' tabelle';
});
prova('3b. Livello → grado: colonne 1–20, 20 livelli × 7 colonne', () => {
  copre(RG.livello_grado.colonne.map(s => { const [a, b] = s.split('–').map(Number); return { da: a, a: b || a }; }), 20, 'colonne');
  for (let L = 1; L <= 20; L++) { const r = RG.livello_grado_tiri[String(L)]; assert(r.length === 7, 'livello ' + L); r.flat().forEach(g => assert(m.tabelle[M.gs(g)], 'grado ' + g)); }
});
prova('3c. Esiti «Tira 1dN» di generazione e note ¹ ²', () => {
  let n = 0;
  S.generazione.righe.concat(S.generazione.note_difensivi.map(e => ({ esito: e }))).forEach(r => {
    const t = M.leggiTira(r.esito); if (t) { copre(t.voci, t.dado, r.esito.slice(0, 40)); n++; }
  });
  return n + ' tabelle';
});
prova('3d. Valore della parte (1d6) e varianti casuali (1d2/1d4)', () => {
  RG.valore_parte.forEach(v => { const f = M.leggiFrecce(v.valore); if (f) copre(f.voci, f.dado, 'valore ' + v.grado); });
  DB.oggetti.filter(o => o.tipo_riga === 'variante casuale').forEach(o => { const v = M.leggiVariante(o.prezzo_variabile); copre(v.voci, v.dado, o.id_riga); v.voci.forEach(x => assert(x.prezzo > 0, o.id_riga)); });
});
prova('3e. 1d20 delle pergamene e Tabelle Armi di Classe', () => {
  copre(S.pergamene.tiro_1d20, 20, 'pergamene');
  ['Marzialista', 'Druido e Morfico'].forEach(t => {
    const r = S.armi_di_classe.filter(x => x.tabella === t);
    copre(r.map(x => { const [a, b] = x.tiro.split('-').map(Number); return { da: a, a: b || a }; }), +r[0].dado.slice(2), t);
  });
  const d2 = S.armi_di_classe.filter(x => x.tabella === 'Marzialista (2d8)').map(x => +x.tiro).sort((a, b) => a - b);
  assert(d2.join() === Array.from({ length: 15 }, (_, i) => i + 2).join(), '2d8');
});
prova('3f. Intervalli delle tabelle dei gradi (numeri consecutivi)', () => M.GRADI.map(g => g + ':' + m.tabelle[g].length).join(' '));

// 4. composizione e nota ¹
prova('4. Nota ¹ e composizione al 50% (100.000 ritrovamenti)', () => {
  let parti = 0, tot = 0;
  for (let i = 0; i < 100000; i++) {
    const L = 1 + (i % 20), r = m.tesoroPerLivello(L);
    const ok3 = r.tesori.some((t, j) => j > 0 && M.gn(t.grado) >= 3);   // un secondario di grado ≥3 può ricevere l'obbligo
    if (r.tesori.length >= 2 && ok3) {
      assert(r.tesori.some(t => t.tipo === 'parte') && r.tesori.some(t => t.tipo === 'vario'), 'nota ¹ violata al livello ' + L + ': ' + r.gradi.join('+'));
    }
    if (r.tesori.length >= 2) assert(r.tesori.some(t => t.tipo === 'vario'), 'nessun Oggetto vario: ' + r.gradi.join('+'));
    r.tesori.forEach(t => {
      if (M.gn(t.grado) < 3) assert(t.tipo === 'vario', 'parte sotto il grado 3');
      if (t.tipo === 'parte') assert(t.parte.categoria !== 'Arma da mischia' && t.parte.categoria !== 'Arma a distanza' || M.gn(t.grado) >= 4, 'arma al grado 3');
    });
  }
  // composizione libera (senza nota ¹): un tesoro singolo
  for (let i = 0; i < 100000; i++) { const t = m.ritrovamento(['10'], {}).tesori[0]; tot++; if (t.tipo === 'parte') parti++; }
  const p = parti / tot; assert(Math.abs(p - 0.5) < 0.01, 'parti ' + p);
  return 'parti al grado 10: ' + (p * 100).toFixed(1) + '%';
});

// 5. speciali e mercato
prova('5a. Mai speciali nei tesori secondari (20.000 ritrovamenti dal livello 13)', () => {
  let rit = 0;
  for (let i = 0; i < 20000; i++) {
    const r = m.tesoroPerLivello(13 + (i % 8));
    r.tesori.forEach(t => { if (t.ruolo === 'secondario' && t.oggetto) { assert(!t.oggetto.speciale, 'speciale in secondario: ' + t.oggetto.nome); rit += t.oggetto.ritirati.length; } });
  }
  return rit + ' ritiri';
});
prova('5b. Mercato: niente pozioni né pergamene, speciali entro il limite', () => {
  let n = 0;
  RG.disponibilita_mercanti.forEach(ins => {
    for (let PL = 1; PL <= 20; PL++) for (let k = 0; k < 30; k++) {
      const r = m.mercato(ins.tipo, PL);
      const sp = r.oggetti.filter(o => o.oggetto.speciale).length;
      assert(sp <= (r.maxSpeciali || 0), ins.tipo + ': speciali ' + sp);
      r.oggetti.forEach(o => { assert(!['Pozione', 'Pergamena'].includes(o.oggetto.categoria), 'pozione/pergamena al mercato'); n++; });
      if (r.grado) assert(M.gn(r.grado) >= 1 && M.gn(r.grado) <= Math.max(1, PL - r.info.offset), 'grado ' + r.grado);
    }
  });
  const c = m.mercato('Cittadina', 8); assert(c.grado === '4', 'Cittadina PL 8 → grado ' + c.grado + ' (K6)');
  return n.toLocaleString('it-IT') + ' oggetti';
});
prova('5c. Senza armi, armature e scudi: nessuna riga di quelle categorie', () => {
  for (let i = 0; i < 5000; i++) m.tesoroPerGrado(M.GRADI[i % 21], 4, { parti: true, armi: false }).tesori.forEach(t => {
    if (t.oggetto) assert(!['Arma', 'Armatura', 'Scudo', 'Munizione'].includes(DB.oggetti.find(o => o.id_riga === t.oggetto.id_riga).categoria), t.oggetto.nome);
  });
});

// 6. partenza
prova('6. Partenza: L+1 oggetti vari, parti 2/4/6…, nessun doppione', () => {
  for (let L = 2; L <= 20; L++) for (let k = 0; k < 20; k++) {
    const r = m.partenza({ livello: L, marzialista: k % 3 === 0, armatura: { usa: k % 2 === 0, categoria: 'media' }, scudo: { usa: k % 4 === 1, tipi: ['leggero', 'pesante'] },
      armi: k % 5 === 4 ? [] : [{ modo: 'vol3', categoria: 'guerra', tipo: 'mischia' }].concat(k % 2 ? [{ modo: 'vol3', categoria: 'semplice', tipo: 'tiro', distanza: true }] : []),
      compensazioni: { armatura: 'parti', scudo: 'oggetto' } });
    assert(r.vari.length === L + 1, 'oggetti vari ' + r.vari.length);
    const T = m.tetto(L);
    r.parti.forEach(p => {
      assert(p.gruppi.length === T, 'gruppi ' + p.gruppi.length);
      p.gruppi.forEach((g, i) => {
        assert(g.parti.length === 2 * (i + 1), 'parti ' + g.valore + ' = ' + g.parti.length);
        assert(new Set(g.parti.map(x => x.capacita)).size === g.parti.length, 'doppione in ' + p.oggetto + ' ' + g.valore);
        assert(g.valore === '+' + (T - i), 'valore');
      });
    });
    if (L < 4) assert(r.parti.length === 0, 'parti prima del 4°');
    r.combattimento.forEach(c => assert(c.candidati.length >= 1, c.voce));
    assert(r.pozioni.length === 2, 'pozioni');
  }
  return 'livelli 2–20';
});

// 7. pergamene
prova('7. Pergamene: livelli 1–9, prezzo dello Stregone, classe con quel livello', () => {
  const P = [0, 25, 200, 450, 800, 1250, 1800, 2450, 3200, 4050];
  let n = 0;
  M.GRADI.forEach(g => {
    const N = S.pergamene.livello_massimo[g];
    assert(N === Math.min(9, Math.floor(M.gn(g) / 2) + 1), 'N del grado ' + g);
    for (let i = 0; i < 300; i++) {
      const p = m.pergamene(g, null, []);
      if (g === '½') assert(p.lista.length <= 2, 'G½ più di 2 pergamene');
      p.lista.forEach(x => {
        assert(x.livello >= 1 && x.livello <= N, 'livello ' + x.livello);
        assert(x.prezzo === P[x.livello], 'prezzo ' + x.livello);
        assert(m.listaDi(p.classe)[String(x.livello)].includes(x.incantesimo), 'incantesimo fuori lista');
        n++;
      });
      assert(p.lista[0].livello === N || p.colonna === '15–16' || p.colonna === '17–18' || p.colonna === '19', 'principale');
    }
  });
  assert(DB.oggetti.filter(o => o.rimando_rif && o.rimando_rif.foglio === 'pergamene').length === 121, 'righe pergamene');
  m.CLASSI.forEach(c => assert(m.listaDi(c)['1'] && m.listaDi(c)['4'], c));
  return n.toLocaleString('it-IT') + ' pergamene; ' + m.CLASSI.length + ' classi';
});

// 2. nessun tiro fuori intervallo (in fondo: conta tutti i lanci dei test)
prova('2. Nessun tiro fuori intervallo', () => { assert(fuori === 0, fuori + ' lanci fuori intervallo'); return lanci.toLocaleString('it-IT') + ' lanci controllati'; });

let ko = 0;
esiti.forEach(([ok, nome, info]) => { if (!ok) ko++; console.log((ok ? '✅ ' : '❌ ') + nome + (info ? ' — ' + info : '')); });
console.log(ko ? ko + ' test falliti' : 'Tutti i test superati');
process.exit(ko ? 1 : 0);
