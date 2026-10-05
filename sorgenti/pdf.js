/* PDF dei risultati (Tesoro, Partenza, Mercato) — Tesori_app_design_v1.md, sezione F.
   A4, margini 20/15 mm; titoli Gelasio grassetto #C45911 (metrica di Georgia), testo Tinos (metrica di Times New Roman)
   giustificato; tabelle della Collana; condizioni di stato in rosso #C00000.
   Uso: PdfTesori.crea(m, res, { jsPDF, font, extra }) → documento jsPDF. */
(function (root) {
  'use strict';
  const ARANCIO = [196, 89, 17], ROSSO = [192, 0, 0], NERO = [0, 0, 0], GRIGIO = [90, 90, 90];
  const ORO = [212, 168, 75], BORDO = [139, 105, 20], RIGA_A = [245, 237, 208], RIGA_B = [250, 243, 224];
  const PAG_W = 210, PAG_H = 297, ML = 15, MR = 15, MT = 20, MB = 20, W = PAG_W - ML - MR;
  const PT = 0.3528;
  const COND = ['Azzoppat[oaie]', 'Colt[oaie] alla sprovvista', 'Offuscat[oaie]', 'Sempre pront[oaie]', 'Affaticat[oaie]', 'Abbagliat[oaie]', 'Accecat[oaie]', 'Accovacciat[oaie]',
    'Affascinat[oaie]', 'Assordat[oaie]', 'Barcollant[ei]', 'Confus[oaie]', 'Esaust[oaie]', 'Frastornat[oaie]', 'Immobilizzat[oaie]', 'Impreparat[oaie]', 'In lotta', 'Inabil[ei]',
    'Incorpore[oaie]', 'Incorporei', 'Indifes[oaie]', 'Inferm[oaie]', 'Intralciat[oaie]', 'Invisibil[ei]', 'Morent[ei]', '(?<!non )Mort[oaie]', 'Nauseat[oaie]', 'Paralizzat[oaie]',
    'Scoss[oaie]', 'Spaventat[oaie]', 'In preda al panico', 'Pietrificat[oaie]', 'Priv[oaie] di sensi', 'Pron[oaie]', 'Rott[oaie]', 'Sanguinant[ei]', 'Scheggiat[oaie]',
    'Stabilizzat[oaie]', 'Stordit[oaie]'];
  const COND_RE = new RegExp('(?<![\\p{L}])(' + COND.join('|') + ')(?![\\p{L}])', 'giu');
  // caratteri assenti dai font incorporati
  const pulisci = s => String(s == null ? '' : s).replace(/★/g, '*').replace(/→/g, '»').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/[^\u0009\u000A -ɏ -⁯€™]/gu, '');

  function crea(m, res, opz) {
    const jsPDF = opz.jsPDF;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const F = opz.font;
    doc.addFileToVFS('Tinos-R.ttf', F['tinos-r']); doc.addFont('Tinos-R.ttf', 'Tinos', 'normal');
    doc.addFileToVFS('Tinos-B.ttf', F['tinos-b']); doc.addFont('Tinos-B.ttf', 'Tinos', 'bold');
    doc.addFileToVFS('Tinos-I.ttf', F['tinos-i']); doc.addFont('Tinos-I.ttf', 'Tinos', 'italic');
    doc.addFileToVFS('Gelasio-B.ttf', F['gelasio-b']); doc.addFont('Gelasio-B.ttf', 'Gelasio', 'bold');
    let y = MT;
    const font = (f, st, pt, col) => { doc.setFont(f, st); doc.setFontSize(pt); doc.setTextColor.apply(doc, col || NERO); };
    const lh = pt => pt * PT * 1.22;
    const spazio = h => { if (y + h > PAG_H - MB) { doc.addPage(); y = MT; } };
    const fmt = m.fmt;

    function titolo(t, sotto) {
      font('Gelasio', 'bold', 20, ARANCIO);
      doc.splitTextToSize(pulisci(t), W).forEach(r => { y += lh(20); doc.text(r, ML, y); });
      y += 2;
      if (sotto) { font('Tinos', 'italic', 10.5, GRIGIO); doc.splitTextToSize(pulisci(sotto), W).forEach(r => { y += lh(10.5); doc.text(r, ML, y); }); }
      doc.setDrawColor.apply(doc, BORDO); doc.setLineWidth(0.4); y += 3; doc.line(ML, y, ML + W, y); y += 3;
    }
    function sezione(t) {
      spazio(lh(14) + 14);
      y += 4; font('Gelasio', 'bold', 14, ARANCIO); y += lh(14); doc.text(pulisci(t), ML, y); y += 2;
    }
    function voce(nome, destra, meta) {
      spazio(lh(11) + lh(9.5) + 10);
      y += 2.5; font('Tinos', 'bold', 11);
      const wD = destra ? doc.getTextWidth(pulisci(destra)) + 4 : 0;
      const righe = doc.splitTextToSize(pulisci(nome), W - wD);
      righe.forEach((r, i) => { y += lh(11); doc.text(r, ML, y); if (i === 0 && destra) doc.text(pulisci(destra), ML + W, y, { align: 'right' }); });
      if (meta) { font('Tinos', 'italic', 9.5, GRIGIO); doc.splitTextToSize(pulisci(meta), W).forEach(r => { y += lh(9.5); doc.text(r, ML, y); }); }
    }
    // paragrafo giustificato con le condizioni in rosso
    function paragrafo(testo, o) {
      o = o || {}; const pt = o.pt || 10.5, x0 = ML + (o.rientro || 0), larg = W - (o.rientro || 0);
      String(testo || '').split('\n').forEach(par => {
        par = pulisci(par).trim(); if (!par) return;
        const pezzi = []; let ult = 0; COND_RE.lastIndex = 0; let mm;
        while ((mm = COND_RE.exec(par))) { if (mm.index > ult) pezzi.push([par.slice(ult, mm.index), false]); pezzi.push([mm[0], true]); ult = mm.index + mm[0].length; }
        if (ult < par.length) pezzi.push([par.slice(ult), false]);
        const parole = []; let cur = [];
        pezzi.forEach(([t, rosso]) => t.split(/( +)/).forEach(s => {
          if (/^ +$/.test(s)) { if (cur.length) parole.push(cur); cur = []; } else if (s) cur.push([s, rosso]);
        }));
        if (cur.length) parole.push(cur);
        font('Tinos', o.stile || 'normal', pt);
        const larghezza = p => p.reduce((s, [t]) => s + doc.getTextWidth(t), 0);
        const sp = doc.getTextWidth(' ');
        const righe = []; let riga = [], wr = 0;
        parole.forEach(p => { const wp = larghezza(p); if (riga.length && wr + sp + wp > larg) { righe.push([riga, wr]); riga = [p]; wr = wp; } else { wr += (riga.length ? sp : 0) + wp; riga.push(p); } });
        if (riga.length) righe.push([riga, wr]);
        righe.forEach(([r, wr2], i) => {
          spazio(lh(pt)); y += lh(pt);
          const ultima = i === righe.length - 1;
          const extra = !ultima && r.length > 1 && o.giustifica !== false ? (larg - wr2) / (r.length - 1) : 0;
          let x = x0;
          r.forEach(p => { p.forEach(([t, rosso]) => { doc.setTextColor.apply(doc, rosso ? ROSSO : (o.colore || NERO)); doc.text(t, x, y); x += doc.getTextWidth(t); }); x += sp + extra; });
        });
        y += 1.2;
      });
      doc.setTextColor.apply(doc, NERO);
    }
    function tabella(intest, righe, larghezze, allinea) {
      const pt = 9.5, pad = 1.6, tot = larghezze.reduce((a, b) => a + b, 0), cw = larghezze.map(l => l / tot * W);
      const disegna = (celle, stile, sfondo) => {
        font('Tinos', stile, pt);
        const linee = celle.map((c, i) => doc.splitTextToSize(pulisci(c), cw[i] - 2 * pad));
        const h = Math.max.apply(null, linee.map(l => l.length)) * lh(pt) + 2 * pad;
        if (y + h > PAG_H - MB) { doc.addPage(); y = MT; if (stile !== 'bold') disegnaIntest(); }
        let x = ML;
        linee.forEach((l, i) => {
          doc.setFillColor.apply(doc, sfondo); doc.setDrawColor.apply(doc, BORDO); doc.setLineWidth(0.25);
          doc.rect(x, y, cw[i], h, 'FD');
          doc.setTextColor.apply(doc, NERO);
          l.forEach((t, j) => {
            const ty = y + pad + (j + 1) * lh(pt) - 0.8;
            const a = (allinea || [])[i];
            if (a === 'r') doc.text(t, x + cw[i] - pad, ty, { align: 'right' });
            else if (a === 'c') doc.text(t, x + cw[i] / 2, ty, { align: 'center' });
            else doc.text(t, x + pad, ty);
          });
          x += cw[i];
        });
        y += h;
      };
      const disegnaIntest = () => disegna(intest, 'bold', ORO);
      spazio(20); y += 2; disegnaIntest();
      righe.forEach((r, i) => disegna(r, 'normal', i % 2 ? RIGA_B : RIGA_A));
      y += 2;
    }
    const prezzo = v => v == null ? '—' : fmt(v);
    function schedaOggetto(o, etichetta) {
      voce(o.nome, prezzo(o.prezzo), [etichetta, o.categoria, o.slot !== o.categoria ? o.slot : ''].filter(Boolean).join(' · ') + (o.prezzo_stimato ? ' · prezzo stimato' : '') + (o.speciale ? ' · oggetto speciale' : ''));
      if (o.prezzo_testo && o.prezzo != null && !o.pergamene && !o.tintura) paragrafo(o.prezzo_testo, { pt: 9, colore: GRIGIO, giustifica: false });
      if (o.effetto) paragrafo(o.effetto);
      if (o.tintura) paragrafo('Applicata a: ' + o.tintura.bersaglio + ' perfetto adatto al gruppo (+ oggetto perfetto: arma +300, armatura o scudo +150 mo, oltre al prezzo base).', { pt: 9.5, stile: 'italic' });
      if (o.pergamene) {
        paragrafo('Lista: ' + o.pergamene.classe + (o.pergamene.colonna === '—' ? '' : ' · livello massimo ' + o.pergamene.N + '°') + '. CD se l\'incantesimo concede un Tiro Salvezza.', { pt: 9.5, stile: 'italic', giustifica: false });
        o.pergamene.lista.forEach(x => paragrafo(x.livello + '° ' + x.incantesimo + ' — CD ' + x.cd + ', LI ' + x.li + ', ' + fmt(x.prezzo), { rientro: 4, giustifica: false }));
      }
      if (o.nota && o.stato_nota !== 'superata' && !(o.effetto || '').includes(o.nota.trim())) paragrafo('Nota (*): ' + o.nota, { pt: 9.5 });
      if (o.set) {
        const s = m.setPer[o.set];
        paragrafo('Set: ' + o.set + (s ? ' — ' + s.bonus.map(b => b.pezzi + ' pezzi: ' + b.bonus).join(' ') : ''), { pt: 9.5, stile: 'italic' });
      }
    }
    function schedaParte(p, etichetta) {
      voce(p.capacita, p.categoria + ' ' + p.valore, etichetta + ' · capacità speciale (n° ' + p.n + (p.totale ? ' di ' + p.totale : '') + ')');
      if (p.effetto) paragrafo(p.effetto);
    }
    const data = new Date(res.data || Date.now()).toLocaleDateString('it-IT');

    // ---------- Tesoro ----------
    if (res.modo === 'livello' || res.modo === 'grado') {
      const sotto = res.modo === 'livello'
        ? 'Livello del gruppo ' + res.livello + ' · d20 = ' + res.tiro + ' (colonna ' + res.colonna + ') · gradi ' + res.gradi.join(' + ') + ' · ' + data
        : 'Grado ' + res.grado + ' × ' + res.quanti + (res.opz.parti ? ', con parti di potenziamento' : ', solo oggetti vari') + (res.opz.armi ? '' : ', senza armi, armature e scudi') + ' · ' + data;
      titolo(res.titolo || 'Tesoro', sotto);
      sezione('Riepilogo');
      tabella(['Tesoro', 'Grado', 'Contenuto', 'Prezzo'], res.tesori.map(t => [t.ruolo === 'primario' ? 'Primario' : 'Secondario', t.grado,
        t.tipo === 'parte' ? 'Parte ' + t.parte.categoria + ' ' + t.parte.valore + ': ' + t.parte.capacita : t.oggetto.nome, t.tipo === 'parte' ? '—' : prezzo(t.oggetto.prezzo)]), [18, 10, 56, 16], ['', 'c', '', 'r']);
      sezione('Descrizioni');
      res.tesori.forEach(t => { const et = (t.ruolo === 'primario' ? 'Primario' : 'Secondario') + ' · G' + t.grado; if (t.tipo === 'parte') schedaParte(t.parte, et); else schedaOggetto(t.oggetto, et); });
    }
    // ---------- Mercato ----------
    if (res.modo === 'mercato') {
      titolo(res.titolo || 'Mercato: ' + res.tipo, res.tipo + ' · livello del gruppo ' + res.livello + (res.grado ? ' · grado ' + res.grado : '') + ' · incantesimi: ' + res.info.riga.livello_incantesimi + ' · ' + data);
      if (res.oggetti.length) {
        sezione('Oggetti disponibili');
        tabella(['Grado', 'Oggetto', 'Prezzo'], res.oggetti.map(t => [t.grado, t.oggetto.nome, prezzo(t.oggetto.prezzo)]), [10, 70, 20], ['c', '', 'r']);
        sezione('Descrizioni');
        res.oggetti.forEach(t => schedaOggetto(t.oggetto, 'G' + t.grado));
      }
      const pp = (opz.extra && opz.extra.pergamene) || [];
      if (pp.length) { sezione('Templi e accademie: pergamene'); pp.forEach(R => schedaOggetto(Object.assign({}, R, { categoria: '' }), 'Tempio')); }
    }
    // ---------- Partenza ----------
    if (res.modo === 'partenza') {
      titolo(res.titolo ? res.titolo : 'Equipaggiamento di partenza', (res.titolo ? 'Equipaggiamento di partenza · ' : '') + res.livello + '° livello · tetto di Sintonia ' + (res.tetto ? '+' + res.tetto : '—') + ' · ' + data);
      if (res.combattimento.length) {
        sezione('Equipaggiamento da combattimento');
        tabella(['Voce', 'Scelta'], res.combattimento.map(c => [c.voce, c.scelta != null ? c.candidati[c.scelta] : c.candidati.join(' oppure ')]), [30, 70]);
        res.combattimento.filter(c => c.nota).forEach(c => paragrafo(c.voce + ': ' + c.nota, { pt: 9, colore: GRIGIO, giustifica: false }));
      }
      const extra = res.extra.filter(e => e.tesoro);
      sezione('Oggetti vari');
      tabella(['Grado', 'Oggetto', 'Prezzo'], res.vari.concat(extra.map(e => e.tesoro)).map((t, i) => [t.grado + (i >= res.vari.length ? '*' : ''), t.oggetto.nome, prezzo(t.oggetto.prezzo)]), [10, 70, 20], ['c', '', 'r']);
      if (extra.length || res.extra.length) paragrafo('* Compensazioni: ' + res.extra.map(e => e.motivo + ' → ' + (e.tesoro ? 'un oggetto in più' : e.scelta)).join('; ') + '.', { pt: 9, colore: GRIGIO, giustifica: false });
      res.vari.concat(extra.map(e => e.tesoro)).forEach(t => schedaOggetto(t.oggetto, 'G' + t.grado));
      if (res.parti.length) {
        sezione('Parti di potenziamento');
        paragrafo('Il giocatore applica le parti che vuole entro il tetto; quelle non applicate non si conservano.', { pt: 9.5, stile: 'italic' });
        res.parti.forEach(p => {
          spazio(20); y += 3; font('Tinos', 'bold', 12, ARANCIO); y += lh(12); doc.text(pulisci((p.oggetto === p.categoria ? p.oggetto : p.oggetto + ' (' + p.categoria.toLowerCase() + ')') + ' · tetto ' + p.tetto), ML, y);
          const tutte = []; p.gruppi.forEach(g => g.parti.forEach(c => tutte.push(c)));
          const app = tutte.filter(c => c.applicata), altre = tutte.filter(c => !c.applicata);
          if (app.length) app.forEach(c => schedaParte(c, 'Applicata'));
          else paragrafo('Nessuna parte segnata come applicata.', { pt: 9.5, stile: 'italic', colore: GRIGIO });
          if (altre.length) {
            const perValore = {}; altre.forEach(c => (perValore[c.valore] = perValore[c.valore] || []).push(c.capacita));
            paragrafo((app.length ? 'Non applicate — ' : 'Estratte — ') + Object.keys(perValore).sort().reverse().map(v => v + ': ' + perValore[v].join(', ')).join(' · '), { pt: 9.5, giustifica: false });
          }
        });
      }
      sezione('Pozioni e oro');
      res.pozioni.forEach(p => voce(p.nome, fmt(p.prezzo)));
      paragrafo('Oro: a cura del DM.', { pt: 9.5, stile: 'italic' });
    }
    // ---------- totale e numeri di pagina ----------
    const tt = m.totale(res);
    spazio(14); y += 4;
    doc.setFillColor.apply(doc, RIGA_A); doc.setDrawColor.apply(doc, BORDO); doc.rect(ML, y, W, 9, 'FD');
    font('Tinos', 'bold', 11); doc.text('Totale', ML + 2, y + 6);
    doc.text(pulisci(fmt(tt.mo) + (tt.senza ? ' + ' + tt.senza + ' senza prezzo' : '')), ML + W - 2, y + 6, { align: 'right' });
    y += 9;
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); font('Tinos', 'normal', 9, GRIGIO); doc.text(String(i), PAG_W / 2, PAG_H - 10, { align: 'center' }); }
    return doc;
  }
  function nomeFile(res) {
    const d = new Date(res.data || Date.now()), ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const ascii = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/½/g, '05').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const t = ascii(res.titolo).slice(0, 40);
    const base = res.modo === 'partenza' ? 'Partenza_L' + res.livello : res.modo === 'mercato' ? 'Mercato_' + ascii(res.tipo) : 'Tesoro_' + (res.modo === 'livello' ? 'L' + res.livello : 'G' + ascii(res.grado));
    return base + (t ? '_' + t : '') + '_' + ds + '.pdf';
  }
  const API = { crea, nomeFile, pulisci };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PdfTesori = API;
})(this);
