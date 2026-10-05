/* Motore di tiro dell'app dei Tesori (Tesori_app_design_v1.md, sezioni B e C).
   Funzioni pure: tutti i dadi passano da `rng(n)` → intero 1..n, sostituibile nei test.
   I risultati sono oggetti JSON semplici (si salvano nello storico così come sono). */
(function (root) {
  'use strict';

  const GRADI = ['½'].concat(Array.from({ length: 20 }, (_, i) => String(i + 1)));
  const gs = g => (g === 0.5 || g === '0.5' || g === '½') ? '½' : String(g);   // grado come stringa
  const gn = g => gs(g) === '½' ? 0.5 : parseInt(g, 10);                     // grado come numero
  const CAT_ARMI = ['Arma', 'Armatura', 'Scudo', 'Munizione'];
  const NO_MERCATO = ['Pozione', 'Pergamena'];
  const CARATT = ['Forza', 'Destrezza', 'Costituzione', 'Intelligenza', 'Saggezza', 'Carisma'];

  function rngCasuale(n) {
    if (n < 1) throw new Error('dado non valido: ' + n);
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
    if (c) {
      const lim = Math.floor(4294967296 / n) * n, b = new Uint32Array(1);
      let x;
      do { c.getRandomValues(b); x = b[0]; } while (x >= lim);
      return (x % n) + 1;
    }
    return Math.floor(Math.random() * n) + 1;
  }

  // «Tira 1d6: 1-4: X · 5: Y» oppure «1-4: X; 5-8: Y» → {dado, voci:[{da,a,testo}]}
  function leggiTira(s) {
    const m = s.match(/^(?:[¹²]\s*)?Tira\s+1d(\d+):\s*(.*)$/);
    if (!m) return null;
    const voci = m[2].split(/\s*(?:·|;)\s*(?=\d+(?:-\d+)?:)/).map(p => {
      const v = p.match(/^(\d+)(?:-(\d+))?:\s*(.*?)\.?$/);
      if (!v) throw new Error('voce non leggibile: ' + p);
      return { da: +v[1], a: +(v[2] || v[1]), testo: v[3].trim() };
    });
    return { dado: +m[1], voci };
  }
  const vocePer = (t, x) => t.voci.find(v => x >= v.da && x <= v.a);
  // «1d6: 1-2 → +1 · 3-6 → +2» → {dado, voci}
  function leggiFrecce(s) {
    const m = s.match(/^1d(\d+):\s*(.*)$/);
    if (!m) return null;
    return {
      dado: +m[1], voci: m[2].split(/\s*·\s*/).map(p => {
        const v = p.match(/^(\d+)(?:-(\d+))?\s*→\s*(.+)$/);
        return { da: +v[1], a: +(v[2] || v[1]), testo: v[3].trim() };
      })
    };
  }
  // «1d4: 1 piccolo 156 · 2 leggero 162 · …» / «1d2: 1 Stivali tellurici (10.000 mo) · 2 …»
  function leggiVariante(s) {
    const m = s.match(/^1d(\d+):\s*(.*)$/);
    const parti = m[2].replace(/\s*mo\s*$/, '').split(/\s*·\s*/);
    return {
      dado: +m[1], voci: parti.map(p => {
        const v = p.match(/^(\d+)\s+(.+?)\s+\(?([\d.]+)(?:\s*mo)?\)?$/);
        return { da: +v[1], a: +v[1], testo: v[2], prezzo: +v[3].replace(/\./g, '') };
      })
    };
  }

  function crea(DB, INC, rngInit) {
    let rng = rngInit || rngCasuale;
    const S = DB.sottotabelle, RG = DB.regole;
    const d = (n, tiri, etichetta) => { const x = rng(n); if (tiri) tiri.push((etichetta ? etichetta + ' ' : '') + 'd' + n + '=' + x); return x; };
    const scegli = (arr, tiri, etichetta) => arr[d(arr.length, tiri, etichetta) - 1];

    // ---------- indici ----------
    const tabelle = {};
    DB.oggetti.forEach(o => { (tabelle[o.grado] = tabelle[o.grado] || []).push(o); });
    GRADI.forEach(g => {
      tabelle[g].sort((a, b) => a.n - b.n);
      tabelle[g].forEach((o, i) => { if (o.n !== i + 1) throw new Error('numerazione ' + g + ' #' + o.n); });
    });
    const perId = {}; DB.oggetti.forEach(o => { perId[o.id_riga] = o; });
    const setPer = {}; S.bonus_set.forEach(s => { setPer[s.set] = s; });
    const capacita = {};
    S.capacita_speciali.forEach(c => { const k = c.oggetto + '|' + c.valore; (capacita[k] = capacita[k] || []).push(c); });
    Object.values(capacita).forEach(l => l.sort((a, b) => a.n - b.n));
    const liste = INC.classi;
    const CLASSI = Object.keys(liste).concat(Object.keys(INC.alias)).sort((a, b) => a.localeCompare(b, 'it'));
    const listaDi = c => liste[INC.alias[c] || c];

    // ---------- oggetti speciali (B1) ----------
    const RARO = /\bRar(?:o|issimo)\b/;
    const eSpeciale = (riga, voce) => riga.categoria === 'Artefatto' || RARO.test(riga.nome_tabella) ||
      RARO.test(riga.rimando || '') || !!(voce && voce.rarita);

    // ---------- oggetto risolto ----------
    function base(riga) {
      return {
        id_riga: riga.id_riga, grado: riga.grado, n: riga.n, nome: riga.nome_italiano, nome_tabella: riga.nome_tabella,
        nome_originale: riga.nome_originale, categoria: riga.categoria, slot: riga.slot, prezzo: riga.prezzo,
        prezzo_stimato: riga.prezzo_stimato, prezzo_testo: riga.prezzo_variabile, effetto: riga.effetto, nota: riga.nota,
        stato_nota: riga.stato_nota, set: riga.set, segnalazioni: riga.segnalazioni, origine: riga.origine,
        fuori_fascia: riga.fuori_fascia, rimando: riga.rimando, tiri: [], speciale: false, voce: null
      };
    }

    // ---------- pergamene (B2) ----------
    const PG = S.pergamene;
    function classiCon(livello) { return Object.keys(liste).filter(c => liste[c][String(livello)]); }
    function incantesimo(classe, livello, tiri, escludi) {
      const L = listaDi(classe)[String(livello)];
      let x, nome, prove = 0;
      do { x = d(L.length, tiri, livello + '°'); nome = L[x - 1]; } while (escludi && escludi.includes(nome) && ++prove < 50 && L.length > escludi.length);
      const p = INC.pergamene[String(livello)];
      return { livello, n: x, incantesimo: nome, li: p.li, prezzo: p.prezzo, cd: p.cd };
    }
    function pergamene(grado, classe, tiri) {
      const g = gs(grado), N = PG.livello_massimo[g];
      const t = d(20, tiri, 'pergamene');
      const col = PG.tiro_1d20.find(c => t >= c.da && t <= c.a);
      let livelli = col.scarti.map(s => Math.max(1, N + s));
      if (g === '½') livelli = livelli.slice(0, PG.massimo_g05);
      if (!classe) classe = scegli(classiCon(N), tiri, 'classe');
      const lista = livelli.map(l => incantesimo(classe, l, tiri));
      return { classe, N, colonna: col.tiro, livelli, lista };
    }
    function pergamenaSingola(classe, livello, tiri) {
      const t = tiri || [];
      if (!classe) classe = scegli(classiCon(livello), t, 'classe');
      return { classe, N: livello, colonna: '—', livelli: [livello], lista: [incantesimo(classe, livello, t)] };
    }
    const sommaPergamene = p => p.lista.reduce((s, x) => s + x.prezzo, 0);

    // ---------- risoluzione di una riga (C4, C5) ----------
    function risolvi(riga) {
      const R = base(riga), T = R.tiri, rr = riga.rimando_rif;
      if (riga.tipo_riga === 'variante casuale') {
        const v = leggiVariante(riga.prezzo_variabile), x = d(v.dado, T, 'variante'), voce = vocePer(v, x);
        R.nome = /^[A-ZÀ-Ú]/.test(voce.testo) ? voce.testo : riga.nome_tabella + ' (' + voce.testo + ')';
        R.prezzo = voce.prezzo; R.prezzo_testo = '';
      } else if (rr) {
        const f = rr.foglio;
        if (f === 'generazione') {
          const r = S.generazione.righe.find(x => x.tipo === rr.tipo && x.grado === rr.grado);
          let es = r.esito; const tt = leggiTira(es);
          if (tt) es = vocePer(tt, d(tt.dado, T, rr.tipo)).testo;
          if (/Indumento della Resistenza¹?/.test(es)) {
            const n1 = leggiTira(S.generazione.note_difensivi[0]);
            es = es.replace(/Indumento della Resistenza¹?/, vocePer(n1, d(n1.dado, T, 'indumento')).testo.replace(/\s*\(.*\)$/, ''));
          }
          if (es.includes('Amuleto della Protezione a Distanza²')) {
            const n2 = leggiTira(S.generazione.note_difensivi[1]), v = vocePer(n2, d(n2.dado, T, 'amuleto')).testo;
            const m = v.match(/^(.*?)\s*\((.*)\)$/);
            es = es.replace('Amuleto della Protezione a Distanza²', m ? m[1] : v);
            if (m) R.effetto = m[2].charAt(0).toUpperCase() + m[2].slice(1) + '.';
          }
          if (rr.tipo === 'potenziamento') {
            const m = es.match(/^(\+\d) a (una caratteristica|due caratteristiche casuali)¹$/);
            if (!m) throw new Error('esito non riconosciuto: ' + es);
            const a = d(6, T, 'caratteristica'); let b = null;
            if (m[2] !== 'una caratteristica') { do { b = d(6, T, 'caratteristica'); } while (b === a); }
            R.nome = 'Oggetto di potenziamento ' + m[1] + ' (' + CARATT[a - 1] + (b ? ', ' + CARATT[b - 1] : '') + ')';
            R.effetto = 'Bonus di potenziamento ' + m[1] + ' a ' + (b ? CARATT[a - 1] + ' e ' + CARATT[b - 1] : CARATT[a - 1]) + '.';
          } else R.nome = es;
          R.prezzo_testo = 'prezzo non indicato nel manuale';
        } else if (f === 'verghe_metamagiche') {
          const rango = (riga.nome_tabella.match(/(minore|normale|superiore)/) || [])[1];
          const l = S.verghe_metamagiche.filter(v => v.verga === rr.verga).sort((a, b) => a.tiro - b.tiro);
          const v = scegli(l, T, 'verga'); R.voce = v;
          R.nome = 'Verga metamagica (' + v.talento + ') ' + rango;
          R.prezzo = v['prezzo_' + rango];
          const max = { minore: '3°', normale: '6°', superiore: '9°' }[rango];
          R.effetto = 'Tre volte al giorno applica il talento ' + v.talento + ' a un incantesimo fino al ' + max + ' livello senza aumentarne il livello.';
        } else if (f === 'veleni') {
          const l = S.veleni.filter(v => v.n >= rr.n_da && v.n <= rr.n_a);
          const v = scegli(l, T, 'veleno'); R.voce = v;
          R.nome = v.veleno; R.prezzo = v.prezzo; R.categoria = 'Veleno';
          R.effetto = 'Tiro Salvezza su ' + v.ts + ' · livello ' + v.livello + ', potenza ' + v.potenza + '. ' + v.effetto;
          if (v.rarita) R.nome += ' (' + v.rarita + ')';
        } else if (f === 'tinture') {
          const fascia = S.tinture_fascia_di_tiro[rr.grado];
          const l = S.tinture.filter(t => t.grado === fascia);
          const v = scegli(l, T, 'tintura'); R.voce = v;
          R.nome = 'Tintura: ' + v.tintura; R.prezzo = v.prezzo;
          R.tintura = { bersaglio: v.bersaglio, fascia };
          R.effetto = v.effetto;
          R.prezzo_testo = 'applicazione; + oggetto perfetto (arma +300, armatura o scudo +150 mo, oltre al prezzo base)';
        } else if (f === 'bastoni_arcani_base') {
          const v = scegli(S.bastoni_arcani_base, T, 'bastone'); R.voce = v;
          R.nome = v.bastone; R.effetto = 'Energia: ' + v.energia + '. Incantesimi: ' + v.incantesimi;
        } else if (f === 'bastoni_arcani_superiori') {
          const k = gn(rr.grado) >= 15 ? '15-20' : rr.grado;
          const s = S.bastoni_arcani_superiori.find(x => x.grado === k);
          const v = scegli(S.bastoni_arcani_base, T, 'bastone base'); R.voce = v;
          R.nome = 'Bastone arcano superiore (grado ' + rr.grado + ', fino al ' + s.incantesimo_massimo + ')';
          R.prezzo = s.prezzo;
          R.effetto = 'Base: ' + v.bastone + ' (energia ' + v.energia + '; ' + v.incantesimi + '). Incantesimi concessi fino al ' + s.incantesimo_massimo + ' livello: tema ed elenco a cura del DM.';
        } else if (f === 'pietre_ioun') {
          const k = gn(rr.grado) >= 19 ? '19-20' : rr.grado;
          const l = S.pietre_ioun.filter(p => p.grado === k).sort((a, b) => a.n - b.n);
          const v = rr.n ? l.find(p => p.n === rr.n) : scegli(l, T, 'pietra'); R.voce = v;
          R.nome = /^Pietra|^Torcia/.test(v.pietra) ? v.pietra : 'Pietra ioun ' + v.pietra.charAt(0).toLowerCase() + v.pietra.slice(1);
          if (v.variante && v.variante !== '—' && !/\//.test(v.variante) && !R.nome.toLowerCase().includes(v.variante.toLowerCase())) R.nome += ' (' + v.variante.toLowerCase() + ')';
          R.prezzo = v.prezzo; R.effetto = v.effetto;
        } else if (f === 'gioielli') {
          const l = S.gioielli.filter(g => g.tipo === rr.tipo).sort((a, b) => a.n - b.n);
          const v = scegli(l, T, 'gioiello'); R.voce = v;
          R.nome = 'Gioiello alchemico ' + rr.tipo + ' (' + v.pietra + ')'; R.prezzo = v.prezzo; R.effetto = v.effetto;
        } else if (f === 'cristalli_tabelle') {
          const l = S.cristalli_tabelle.filter(c => c.grado === rr.grado);
          const v = l.length === 1 ? l[0] : (x => l.find(c => x >= c.tiro_da && x <= c.tiro_a))(d(100, T, 'cristallo'));
          R.voce = v;
          const nomeBase = v.cristallo.replace(/\s+(minim[oa]|minore|superiore)$/i, '').toLowerCase();
          const fam = S.cristalli_famiglie.find(f2 => f2.famiglia.toLowerCase().includes(nomeBase));
          R.nome = /^Cristallo/.test(v.cristallo) ? v.cristallo : 'Cristallo: ' + v.cristallo; R.prezzo = v.prezzo; R.slot = v.tipo;
          R.effetto = fam ? fam.effetto : ''; if (fam) R.nome_originale = fam.originale;
        } else if (f === 'alchemiche') {
          const l = S.alchemiche.filter(a => a.tabella === rr.tabella && rr.n.includes(a.n)).sort((a, b) => a.n - b.n);
          const v = scegli(l, T, rr.tabella.toLowerCase()); R.voce = v;
          R.nome = v.oggetto + (v.rarita ? ' (' + v.rarita + ')' : ''); R.prezzo = v.prezzo; R.effetto = v.effetto;
          R.slot = v.slot || ''; R.categoria = 'Alchemico';
        } else if (f === 'armi_armature_vol3') {
          const l = S.armi_armature_vol3.filter(a => a.prezzo && (rr.tipo ? a.tipo === rr.tipo : a.categoria === rr.categoria));
          const v = scegli(l, T, rr.tipo ? 'arma' : 'armatura'); R.voce = v;
          const extra = rr.tipo === 'Arma' ? S.perfetto.arma : S.perfetto.armatura_o_scudo;
          R.nome = (rr.tipo === 'Arma' ? 'Arma perfetta: ' : 'Armatura perfetta: ') + v.nome;
          R.prezzo = v.prezzo + extra; R.prezzo_testo = v.prezzo + ' + ' + extra + ' mo (perfetto)';
          R.effetto = v.categoria + (v.dettagli ? ' · ' + v.dettagli : '');
        } else if (f === 'pergamene') {
          R.pergamene = pergamene(rr.grado, rr.classe, T);
          R.prezzo = sommaPergamene(R.pergamene); R.prezzo_testo = '';
          R.nome = R.pergamene.lista.length === 1 ? 'Pergamena' : R.pergamene.lista.length + ' pergamene';
          R.nome += ' (' + R.pergamene.classe.toLowerCase() + ')';
        } else throw new Error('foglio sconosciuto: ' + f);
      }
      R.speciale = eSpeciale(riga, R.voce);
      return R;
    }

    // ---------- Oggetto vario con vincoli ----------
    function oggettoVario(grado, opz) {
      opz = opz || {};
      const g = gs(grado), tab = tabelle[g], ritirati = [];
      for (let prova = 0; prova < 500; prova++) {
        const tiri = [], x = d(tab.length, tiri, 'G' + g), riga = tab[x - 1];
        if (opz.armi === false && CAT_ARMI.includes(riga.categoria)) continue;
        if (opz.mercato && NO_MERCATO.includes(riga.categoria)) { ritirati.push(riga.nome_italiano + ' (non in vendita)'); continue; }
        const R = risolvi(riga);
        R.tiri = tiri.concat(R.tiri);
        if (opz.secondario && R.speciale) { ritirati.push(R.nome + ' (speciale in un secondario)'); continue; }
        if (opz.noSpeciali && R.speciale) { ritirati.push(R.nome + ' (speciali esauriti)'); continue; }
        if (opz.escludi && R.id_riga && opz.escludi.includes(R.id_riga) && !R.voce && !R.pergamene) continue;
        R.ritirati = ritirati;
        return R;
      }
      throw new Error('nessun oggetto valido nel grado ' + g);
    }

    // ---------- parti (C3) ----------
    function valoreParte(grado, tiri) {
      const g = gn(grado);
      const r = RG.valore_parte.find(v => { const [a, b] = v.grado.split('-').map(Number); return g >= a && g <= (b || a); });
      const f = leggiFrecce(r.valore);
      return f ? vocePer(f, d(f.dado, tiri, 'valore')).testo : r.valore;
    }
    function capacitaCasuale(categoria, valore, tiri, escludi) {
      const l = capacita[categoria + '|' + valore];
      if (!l) throw new Error('capacità mancanti: ' + categoria + ' ' + valore);
      let c, prove = 0;
      do { c = l[d(l.length, tiri, 'capacità') - 1]; } while (escludi && escludi.includes(c.capacita) && ++prove < 200);
      return { categoria, valore, n: c.n, totale: l.length, capacita: c.capacita, effetto: c.effetto };
    }
    function tipoParte(grado, tiri) {
      const g = gn(grado);
      if (g < 4) return d(2, tiri, 'parte') === 1 ? 'Armatura' : 'Scudo';
      const x = d(3, tiri, 'parte');
      if (x === 1) return 'Armatura';
      if (x === 2) return 'Scudo';
      return d(2, tiri, 'arma') === 1 ? 'Arma da mischia' : 'Arma a distanza';
    }
    function parte(grado, tiri, categoria) {
      const cat = categoria || tipoParte(grado, tiri);
      const val = valoreParte(grado, tiri);
      return capacitaCasuale(cat, val, tiri);
    }

    // ---------- ritrovamento (C1, C2, C6) ----------
    function composizione(grado, tiri) {           // K9: 50% parte, 50% Oggetto vario
      if (gn(grado) < 3) return 'vario';
      return d(2, tiri, 'composizione') === 1 ? 'parte' : 'vario';
    }
    function ritrovamento(gradi, opz) {
      opz = Object.assign({ parti: true, armi: true }, opz || {});
      const tesori = gradi.map((g, i) => ({ ruolo: i === 0 ? 'primario' : 'secondario', grado: gs(g), tipo: 'vario', forzato: false, tiri: [] }));
      if (opz.parti) {
        tesori.forEach(t => { t.tipo = composizione(t.grado, t.tiri); });
        if (tesori.length >= 2) {                     // nota ¹
          const p = tesori[0];
          if (p.tipo === 'parte') { tesori[1].tipo = 'vario'; tesori[1].forzato = true; tesori[1].tiri = []; }
          else {
            const j = tesori.findIndex((t, i) => i > 0 && gn(t.grado) >= 3);
            if (j > 0) { tesori[j].tipo = 'parte'; tesori[j].forzato = true; tesori[j].tiri = []; }
          }
        }
      }
      tesori.forEach(t => {
        if (t.tipo === 'parte') t.parte = parte(t.grado, t.tiri);
        else t.oggetto = oggettoVario(t.grado, { secondario: t.ruolo === 'secondario', armi: opz.armi });
      });
      return { tesori, opz };
    }
    function colonnaLivello(x) {
      const c = RG.livello_grado.colonne;
      return c.findIndex(s => { const [a, b] = s.split('–').map(Number); return x >= a && x <= (b || a); });
    }
    function tesoroPerLivello(livello) {
      const tiri = [], x = d(20, tiri, 'livello');
      const ci = colonnaLivello(x);
      const gradi = RG.livello_grado_tiri[String(livello)][ci].map(gs);
      const r = ritrovamento(gradi, {});
      return Object.assign(r, { modo: 'livello', livello, tiro: x, colonna: RG.livello_grado.colonne[ci], gradi, tiri, data: Date.now() });
    }
    function tesoroPerGrado(grado, quanti, opz) {
      const gradi = Array(quanti).fill(gs(grado));
      const r = ritrovamento(gradi, opz);
      return Object.assign(r, { modo: 'grado', grado: gs(grado), quanti, gradi, data: Date.now() });
    }
    function ritiraTesoro(t, opz) {
      opz = opz || {};
      if (t.tipo === 'parte') {
        const nt = []; t.parte = capacitaCasuale(t.parte.categoria, t.parte.valore, nt, [t.parte.capacita]);
        t.tiri = t.tiri.filter(s => !/^capacità/.test(s)).concat(nt);
      } else {
        t.oggetto = oggettoVario(t.grado, { secondario: t.ruolo === 'secondario', armi: opz.armi !== false, mercato: opz.mercato, noSpeciali: opz.noSpeciali });
      }
      return t;
    }

    // ---------- pergamene: ritira incantesimo, cambia classe ----------
    function ritiraIncantesimo(p, i) {
      const usati = p.lista.filter((x, j) => j !== i && x.livello === p.lista[i].livello).map(x => x.incantesimo).concat([p.lista[i].incantesimo]);
      p.lista[i] = incantesimo(p.classe, p.lista[i].livello, [], usati);
      return p;
    }
    function cambiaClasse(p, classe) {
      p.classe = classe;
      p.lista = p.lista.map(x => incantesimo(classe, x.livello, []));
      return p;
    }
    function aggiornaPrezzoPergamene(R) {
      R.prezzo = sommaPergamene(R.pergamene);
      R.nome = (R.pergamene.lista.length === 1 ? 'Pergamena' : R.pergamene.lista.length + ' pergamene') + ' (' + R.pergamene.classe.toLowerCase() + ')';
      return R;
    }

    // ---------- equipaggiamento di partenza (C7) ----------
    const tetto = L => L >= 17 ? 5 : L >= 15 ? 4 : L >= 12 ? 3 : L >= 9 ? 2 : L >= 4 ? 1 : 0;
    const pozione = L => L >= 9 ? { nome: 'Pozione di Cura ferite gravi', prezzo: 900 } : L >= 5 ? { nome: 'Pozione di Cura ferite moderate', prezzo: 400 } : { nome: 'Pozione di Cura ferite leggere', prezzo: 100 };
    function candidatiArma(categoria, tipo) {
      const pre = categoria === 'semplice' ? 'Arma semplice' : 'Arma da guerra';
      const t = tipo === 'tiro' ? 'Armi da tiro' : 'Armi da mischia';
      return S.armi_armature_vol3.filter(a => a.tipo === 'Arma' && a.categoria.startsWith(pre) && a.categoria.includes(t));
    }
    const SCUDI = { piccolo: 'Scudo piccolo', leggero: 'Scudo leggero', pesante: 'Scudo pesante', torre: 'Scudo torre' };
    function dueDiversi(l, tiri, et) {
      if (l.length < 2) return l.slice();
      const a = scegli(l, tiri, et); let b;
      do { b = scegli(l, tiri, et); } while (b === a);
      return [a, b];
    }
    function tabellaClasse(nome, tiri) {
      const righe = S.armi_di_classe.filter(r => r.tabella === nome);
      const dado = +righe[0].dado.match(/1d(\d+)/)[1];
      const x = d(dado, tiri, nome);
      const r = righe.find(r2 => { const [a, b] = r2.tiro.split('-').map(Number); return x >= a && x <= (b || a); });
      if (/Tira 2d8/.test(r.esito)) {
        const y = d(8, tiri, '2d8') + d(8, tiri, '2d8');
        return S.armi_di_classe.find(r2 => r2.tabella === nome + ' (2d8)' && +r2.tiro === y).esito;
      }
      return r.esito;
    }
    function listaParti(categoria, T) {
      const gruppi = [];
      for (let v = T, k = 2; v >= 1; v--, k += 2) {
        const tiri = [], usate = [], parti = [];
        const tot = capacita[categoria + '|+' + v].length;
        for (let i = 0; i < Math.min(k, tot); i++) { const c = capacitaCasuale(categoria, '+' + v, tiri, usate); usate.push(c.capacita); parti.push(c); }
        gruppi.push({ valore: '+' + v, parti, tiri });
      }
      return gruppi;
    }
    /* opz: {livello, marzialista, armatura:{usa, categoria}, scudo:{usa, tipi:[]}, armi:[{modo:'vol3'|'classe'|'libera', categoria, tipo, tabella, nome, distanza}],
             compensazioni:{armatura:'oggetto'|'parti', scudo:'oggetto'|'parti'}, secondaArmaDistanza} */
    function partenza(opz) {
      const L = opz.livello, T = tetto(L), out = { modo: 'partenza', opz, livello: L, tetto: T, combattimento: [], vari: [], extra: [], parti: [], pozioni: [], data: Date.now() };
      const tiri = [];
      // 1. combattimento
      if (opz.marzialista) out.combattimento.push({ voce: 'Armatura', candidati: ['Bracciali dell\'armatura +' + Math.max(1, T)], nota: 'contano come armatura (B9)' });
      else if (opz.armatura && opz.armatura.usa) {
        const l = S.armi_armature_vol3.filter(a => a.tipo === 'Armatura' && a.categoria === 'Armatura ' + opz.armatura.categoria);
        out.combattimento.push({ voce: 'Armatura ' + opz.armatura.categoria, candidati: dueDiversi(l, tiri, 'armatura').map(a => a.nome + ' (' + a.prezzo + ' mo)') });
      }
      if (opz.scudo && opz.scudo.usa) {
        const l = S.armi_armature_vol3.filter(a => a.tipo === 'Scudo' && (opz.scudo.tipi || []).some(t => a.nome.startsWith(SCUDI[t])));
        out.combattimento.push({ voce: 'Scudo', candidati: dueDiversi(l, tiri, 'scudo').map(a => a.nome + ' (' + a.prezzo + ' mo)') });
      }
      (opz.armi || []).forEach((a, i) => {
        const voce = 'Arma ' + (i + 1) + (a.distanza ? ' (a distanza)' : ' (da mischia)');
        if (a.modo === 'classe') out.combattimento.push({ voce, candidati: [tabellaClasse(a.tabella, tiri), tabellaClasse(a.tabella, tiri)], nota: 'Tabella Armi di Classe: ' + a.tabella });
        else if (a.modo === 'libera') out.combattimento.push({ voce, candidati: [a.nome || 'a scelta'], nota: 'categoria non presente nel Vol. 3: scelta del giocatore e del DM' });
        else out.combattimento.push({ voce, candidati: dueDiversi(candidatiArma(a.categoria, a.tipo), tiri, 'arma').map(x => x.nome + ' (' + x.prezzo + ' mo)') });
      });
      out.tiri = tiri;
      // 2. oggetti vari: uno per grado da L al ½
      const gradi = []; for (let g = L; g >= 1; g--) gradi.push(String(g)); gradi.push('½');
      out.vari = gradi.map(g => ({ ruolo: 'partenza', grado: g, tipo: 'vario', tiri: [], oggetto: oggettoVario(g, {}) }));
      // 3. compensazioni
      const usaArmatura = opz.marzialista || (opz.armatura && opz.armatura.usa);
      const comp = opz.compensazioni || {};
      const nArmi = (opz.armi || []).length;
      const secondaArmaPossibile = L >= 8 && nArmi === 1;
      let secondaArma = false;
      [['armatura', !usaArmatura, 'Niente armatura'], ['scudo', !(opz.scudo && opz.scudo.usa), 'Niente scudo']].forEach(([k, manca, motivo]) => {
        if (!manca) return;
        if (comp[k] === 'parti' && secondaArmaPossibile && !secondaArma) { secondaArma = true; out.extra.push({ motivo, scelta: 'parti per una seconda arma' }); }
        else out.extra.push({ motivo, scelta: 'oggetto', tesoro: { ruolo: 'partenza', grado: String(L), tipo: 'vario', tiri: [], oggetto: oggettoVario(L, {}) } });
      });
      if (nArmi === 0) out.extra.push({ motivo: 'Niente armi', scelta: 'oggetto', tesoro: { ruolo: 'partenza', grado: String(L), tipo: 'vario', tiri: [], oggetto: oggettoVario(L, {}) } });
      // 4. parti
      if (T >= 1) {
        if (usaArmatura) out.parti.push({ oggetto: opz.marzialista ? 'Bracciali dell\'armatura' : 'Armatura', categoria: 'Armatura', tetto: '+' + T, gruppi: listaParti('Armatura', T) });
        if (opz.scudo && opz.scudo.usa) out.parti.push({ oggetto: 'Scudo', categoria: 'Scudo', tetto: '+' + T, gruppi: listaParti('Scudo', T) });
        (opz.armi || []).forEach((a, i) => {
          if (i === 1 && L < 8) return;                // la Sintonia copre due armi dall'8°
          const cat = a.distanza ? 'Arma a distanza' : 'Arma da mischia';
          out.parti.push({ oggetto: 'Arma ' + (i + 1), categoria: cat, tetto: '+' + T, gruppi: listaParti(cat, T) });
        });
        if (secondaArma) {
          const cat = opz.secondaArmaDistanza ? 'Arma a distanza' : 'Arma da mischia';
          out.parti.push({ oggetto: 'Seconda arma (compensazione)', categoria: cat, tetto: '+' + T, gruppi: listaParti(cat, T) });
        }
      }
      // 5. pozioni
      const p = pozione(L); out.pozioni = [p, p];
      return out;
    }
    function ritiraParte(gruppo, i) {
      const usate = gruppo.parti.map(p => p.capacita);
      const c = gruppo.parti[i];
      gruppo.parti[i] = capacitaCasuale(c.categoria, c.valore, [], usate);
      return gruppo;
    }

    // ---------- mercato (C8) ----------
    function infoInsediamento(tipo) {
      const r = RG.disponibilita_mercanti.find(x => x.tipo === tipo);
      const m = r.oggetti_disponibili.match(/^(\d+)\s*(?:\((.*)\))?/);
      const k = +m[1]; const sp = (m[2] || '0').trim();
      const off = (r.livello_massimo_oggetti.match(/PL\s*-\s*(\d+)/) || [])[1];
      const inc = r.livello_incantesimi === '-' ? null : +((r.livello_incantesimi.match(/(\d)°?\s*$/) || [0, 0])[1]);
      return { riga: r, oggetti: k, speciali: sp, offset: off ? +off : null, incantesimi: inc };
    }
    function gradoMercato(tipo, PL) {
      const i = infoInsediamento(tipo);
      return i.offset === null ? null : Math.max(1, PL - i.offset);
    }
    function mercato(tipo, PL, grado) {
      const info = infoInsediamento(tipo), tiri = [];
      const gmax = gradoMercato(tipo, PL);
      const out = { modo: 'mercato', tipo, livello: PL, info, grado: null, oggetti: [], tiri, data: Date.now() };
      if (!info.oggetti || gmax === null) return out;
      const g = gs(grado ? Math.min(gn(grado), gmax) : gmax);
      out.grado = g;
      let maxSp = 0;
      if (/^\d+$/.test(info.speciali)) maxSp = +info.speciali;
      else if (/50%/.test(info.speciali)) maxSp = d(100, tiri, 'speciali') <= 50 ? 1 : 0;
      out.maxSpeciali = maxSp;
      let sp = 0;
      for (let i = 0; i < info.oggetti; i++) {
        const R = oggettoVario(g, { mercato: true, noSpeciali: sp >= maxSp });
        if (R.speciale) sp++;
        out.oggetti.push({ ruolo: 'mercato', grado: g, tipo: 'vario', tiri: [], oggetto: R });
      }
      return out;
    }

    // ---------- totale e testo ----------
    function tesoriDi(r) {
      if (r.modo === 'partenza') return r.vari.concat(r.extra.filter(e => e.tesoro).map(e => e.tesoro));
      if (r.modo === 'mercato') return r.oggetti;
      if (r.modo === 'pergamene') return [];
      return r.tesori;
    }
    function totale(r) {
      let mo = 0, senza = 0;
      tesoriDi(r).forEach(t => { if (t.tipo === 'parte') return; if (t.oggetto.prezzo == null) senza++; else mo += t.oggetto.prezzo; });
      if (r.modo === 'partenza') r.pozioni.forEach(p => { mo += p.prezzo; });
      return { mo, senza };
    }
    const fmtNum = n => { const [i, dec] = String(Math.round(n * 100) / 100).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : ''); };
    const fmt = n => n == null ? '—' : fmtNum(n) + ' mo';
    function rigaTesto(t) {
      if (t.tipo === 'parte') return '- G' + t.grado + ' · Parte ' + t.parte.categoria + ' ' + t.parte.valore + ': ' + t.parte.capacita;
      const o = t.oggetto;
      let s = '- G' + t.grado + ' · ' + o.nome + ' · ' + fmt(o.prezzo);
      if (o.pergamene) s += '\n' + o.pergamene.lista.map(p => '    ' + p.livello + '° ' + p.incantesimo + ' (CD ' + p.cd + ', ' + fmt(p.prezzo) + ')').join('\n');
      if (o.tintura) s += '\n    applicata a: ' + o.tintura.bersaglio + ' perfetto adatto al gruppo';
      return s;
    }
    function testo(r) {
      const righe = [];
      if (r.modo === 'livello') righe.push('Tesoro per il livello ' + r.livello + ' (d20=' + r.tiro + ' → ' + r.gradi.join('+') + ')');
      if (r.modo === 'grado') righe.push('Tesoro di grado ' + r.grado + ' × ' + r.quanti);
      if (r.modo === 'mercato') righe.push('Mercato: ' + r.tipo + ', livello ' + r.livello + (r.grado ? ', grado ' + r.grado : ''));
      if (r.modo === 'partenza') {
        righe.push('Equipaggiamento di partenza, ' + r.livello + '° livello');
        r.combattimento.forEach(c => righe.push('- ' + c.voce + ': ' + c.candidati.join(' / ')));
      }
      tesoriDi(r).forEach(t => righe.push(rigaTesto(t)));
      if (r.modo === 'partenza') {
        r.parti.forEach(p => righe.push('- Parti per ' + p.oggetto + ' (tetto ' + p.tetto + '): ' + p.gruppi.map(g => g.valore + ' ' + g.parti.map(x => x.capacita).join(', ')).join(' · ')));
        r.pozioni.forEach(p => righe.push('- ' + p.nome + ' · ' + fmt(p.prezzo)));
      }
      const tt = totale(r);
      righe.push('Totale: ' + fmt(tt.mo) + (tt.senza ? ' + ' + tt.senza + ' senza prezzo' : ''));
      return righe.join('\n');
    }

    return {
      GRADI, CLASSI, tabelle, perId, setPer, liste, listaDi, classiCon, capacita,
      setRng: f => { rng = f || rngCasuale; },
      risolvi, oggettoVario, parte, capacitaCasuale, valoreParte, composizione, ritrovamento,
      tesoroPerLivello, tesoroPerGrado, ritiraTesoro, colonnaLivello,
      pergamene, pergamenaSingola, ritiraIncantesimo, cambiaClasse, aggiornaPrezzoPergamene, sommaPergamene,
      partenza, ritiraParte, tetto, pozione, candidatiArma, tabellaClasse,
      mercato, infoInsediamento, gradoMercato, totale, testo, fmt, fmtNum, eSpeciale, leggiTira
    };
  }

  const API = { crea, GRADI, gs, gn, leggiTira, leggiFrecce, leggiVariante, rngCasuale };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Motore = API;
})(this);
