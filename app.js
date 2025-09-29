/* Strafkatalog – 1–5 global, ab 6. pro Spieltag, Summen, Kommentare, Sticky ohne Überlappung, Persistenz */
(() => {
  'use strict';

  // ===== Helpers =====
  const $  = (s, root = document) => root.querySelector(s);
  const KEY = 'strafkatalog_state_v2';

  // Sticky: Seitenkopf-Höhe & Kopf der 1–5-Tabelle messen
  function updateStickyTop(){
    const hdr = document.querySelector('header');
    const h = hdr ? hdr.offsetHeight : 0;
    document.documentElement.style.setProperty('--headerH', (h || 0) + 'px');
    updateGlobalHeadHeight();
  }
  function updateGlobalHeadHeight(){
    const th = document.querySelector('#globalTable thead');
    const h  = th ? th.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--globalHeadH', (h || 0) + 'px');
  }
  updateStickyTop();
  window.addEventListener('resize', () => { updateStickyTop(); });

  if (window.ResizeObserver){
    const headerEl = document.querySelector('header');
    if (headerEl){ new ResizeObserver(updateStickyTop).observe(headerEl); }
  }

  const escapeHtml = (s) => String(s).replace(/[&<>\"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
  const attr = (s) => String(s).split('"').join('&quot;');

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const save = (state) => localStorage.setItem(KEY, JSON.stringify(state));
  const valid = (s) => s && Array.isArray(s.players) && Array.isArray(s.penalties) && Array.isArray(s.matchdays);

  const parseEuro = (price) => {
    if (!price || typeof price !== 'string') return 0;
    const cleaned = price.replace(/\u00A0/g, ' ').replace(/,/g, '.').trim();
    const m = cleaned.match(/(\d+(?:\.\d+)?)(?=\s*€)/i);
    if (!m) return 0;
    const v = parseFloat(m[1]);
    return Number.isFinite(v) ? v : 0;
  };
  const formatEuro = (n) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2).replace('.', ',') + '€';

  const isMonetary = (price) =>
    typeof price === 'string' && /€/i.test(price) && /[0-9]/.test(price);
  const normalizeNonEuroLabel = (price) =>
    String(price || '').replace(/^\s*\d+\s+/, '').trim();

  // ===== Defaults =====
  const defaults = {
    projectName: 'Saison 2025/26',
    players: ['Steffen','Daniel','Armin','Robert','Tim','Phillip','Jean'],
    penalties: [
      { num:'1.',  label:'Unentschuldigte Abwesenheit Vereinspokal/VM', price:'5€' },
      { num:'2.',  label:'Vereinsmeister/Pokalsieger', price:'netter Abend' },
      { num:'3.',  label:'Hochzeit', price:'1 Kasten Bier' },
      { num:'4.',  label:'Nuller kassiert (auch im Spiel)', price:'1 Kasten Bier' },
      { num:'5.',  label:'Gegen Jugend verloren', price:'1 Kasten Bier' },

      { num:'6.',  label:'Zu spät kommen', price:'' }, // Kommentarzeile
      { num:'6.1', label:'Weniger als 3 min',  price:'1€', isSub:true },
      { num:'6.2', label:'Weniger als 5 min',  price:'2€', isSub:true },
      { num:'6.3', label:'Weniger als 10 min', price:'3€', isSub:true },
      { num:'6.4', label:'Mehr als 10 min',    price:'5€', isSub:true },

      { num:'7.',  label:'Spiel vorziehen / früher gehen', price:'5€ pro Spiel', allowMulti:true },
      { num:'8.',  label:'Aufschlagfehler Satzball',       price:'2€',          allowMulti:true },
      { num:'9.',  label:'Aufschlagfehler Matchball',      price:'5€',          allowMulti:true },

      { num:'10.',  label:'Grob unsportliches Verhalten', price:'' }, // Kommentarzeile
      { num:'10.1', label:'Handschlag verweigert', price:'5€', allowMulti:true, isSub:true },
      { num:'10.2', label:'Schläger werfen',        price:'5€', allowMulti:true, isSub:true },
      { num:'10.3', label:'Umrandung treten',        price:'5€', allowMulti:true, isSub:true },
      { num:'10.4', label:'Tisch treten',            price:'5€', allowMulti:true, isSub:true },

      { num:'11.', label:'Gegenstand vergessen', price:'2€', allowMulti:true },
      { num:'12.', label:'Schläger vergessen',  price:'10€' },
      { num:'13.', label:'Falsche Hose',        price:'5€' },
      { num:'14.', label:'Falsches Trikot',     price:'10€' },
      { num:'15.', label:'Kurzfristige Absage', price:'1 Runde' },
      { num:'16.', label:'Unentschuldigtes Fehlen', price:'30€' },
      { num:'17.', label:'Handynutzung während des Spielbetriebs', price:'2€', allowMulti:true },

      { num:'—', label:'SEPARATOR', isSeparator:true },

      { num:'18.', label:'Doppel verloren',        price:'0,5€' },
      { num:'19.', label:'1. Einzel verloren',     price:'1€'   },
      { num:'20.', label:'2. Einzel verloren',     price:'1€'   },
      { num:'21.', label:'Schlussdoppel verloren', price:'0,5€' },
    ],
    matchdays: [
      '20.09.2025 · 17:30 · TTC Langhurst – TTC Berghaupten II',
      '27.09.2025 · 17:00 · TUS Rammersweier II – TTC Langhurst',
      '11.10.2025 · 17:30 (v) · DJK Oberharmersbach – TTC Langhurst',
      '18.10.2025 · 17:30 · SG Renchtal III – TTC Langhurst',
      '15.11.2025 · 17:30 (v) · TTC Langhurst – DJK Offenburg V',
      '22.11.2025 · 17:30 · TTC Durbach – TTC Langhurst',
      '29.11.2025 · 14:00 (v) · TTC Langhurst – TUS Windschläg',
      '06.12.2025 · 17:30 · TTC Langhurst – TTC Steinach II',
      '13.12.2025 · 17:30 · TTC Langhurst – TTC Fessenbach II',
      '17.01.2026 · 17:30 · TUS Windschläg – TTC Langhurst',
      '24.01.2026 · 17:30 · TTC Langhurst – TTC Durbach',
      '07.02.2026 · 14:30 · DJK Offenburg V – TTC Langhurst',
      '21.02.2026 · 19:00 · TTC Steinach II – TTC Langhurst',
      '28.02.2026 · 17:30 (v) · TTC Langhurst – SG Renchtal III',
      '07.03.2026 · 17:30 · TTC Langhurst – DJK Oberharmersbach',
      '13.03.2026 · 19:00 · TTC Fessenbach II – TTC Langhurst',
      '21.03.2026 · 18:30 · TTC Berghaupten II – TTC Langhurst',
      '18.04.2026 · 17:30 · TTC Langhurst – TUS Rammersweier II'
    ],
    data: {},     // ab 6. pro Spieltag
    global: {},   // 1–5 global
    log: []
  };

  // ===== State & Elements =====
  let state = load();
  if (!valid(state)) state = JSON.parse(JSON.stringify(defaults));

  const els = {
    projectName:   $('#projectName'),
    matchdaySelect:$('#matchdaySelect'),
    tableWrap:     $('#tableWrap'),
    globalWrap:    $('#globalWrap'),
    log:           $('#log'),
  };

  // Header-Inputs
  if (els.projectName){
    els.projectName.value = state.projectName || '';
    els.projectName.addEventListener('input', () => { state.projectName = els.projectName.value; save(state); });
  }
  $('#btnPrint')?.addEventListener('click', () => window.print());
  $('#btnExportJSON')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `strafkatalog_${(state.projectName||'projekt').replace(/\s+/g,'_')}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  });
  $('#btnImportJSON')?.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange = (ev) => {
      const f = ev.target.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const obj = JSON.parse(r.result);
          if (valid(obj)) { state = obj; save(state); location.reload(); }
          else alert('Ungültiges Format.');
        } catch { alert('Import fehlgeschlagen.'); }
      };
      r.readAsText(f);
    };
    inp.click();
  });
  $('#btnReset')?.addEventListener('click', () => {
    if (confirm('Alles zurücksetzen?')) { state = JSON.parse(JSON.stringify(defaults)); save(state); location.reload(); }
  });
  $('#clearLog')?.addEventListener('click', () => { state.log = []; save(state); renderLog(); });

  // ===== Data helpers =====
  const firstToFifth = new Set(['1.','2.','3.','4.','5.']);

  function ensureGlobal(){
    state.global ||= {};
    for (const p of state.players){
      state.global[p] ||= {};
      for (const row of state.penalties){
        if (!firstToFifth.has(row.num)) continue;
        if (!state.global[p][row.num]){
          const base = row.allowMulti ? { count:0, comment:'', ts:null } : { checked:false, comment:'', ts:null };
          state.global[p][row.num] = base;
        }
      }
    }
    save(state);
  }

  function ensureMD(md){
    state.data ||= {};
    if (!state.data[md]) state.data[md] = {};
    for (const p of state.players){
      state.data[md][p] ||= {};
      for (const row of state.penalties){
        if (row.isSeparator) continue;
        if (firstToFifth.has(row.num)) continue;
        const base = row.allowMulti ? { count:0, comment:'', ts:null } : { checked:false, comment:'', ts:null };
        if (!state.data[md][p][row.num]) state.data[md][p][row.num] = base;
      }
    }
    save(state);
  }

  const getEntryGlobal = (p,num) => ((state.global||{})[p]||{})[num] || null;
  function setEntryGlobal(p,num,partial){
    ensureGlobal();
    const prev = getEntryGlobal(p,num) || {};
    state.global[p][num] = { ...prev, ...partial, ts: Date.now() };
    save(state);
  }

  const getEntry = (md,p,num) => (((state.data||{})[md]||{})[p]||{})[num] || null;
  function setEntry(md,p,num,partial){
    ensureMD(md);
    const prev = getEntry(md,p,num) || {};
    state.data[md][p][num] = { ...prev, ...partial, ts: Date.now() };
    save(state);
  }

  // ===== Summen =====
  function sumGlobalFirstToFifth(){
    const sums = Object.fromEntries(state.players.map(p=>[p,0]));
    for (const row of state.penalties){
      if (!firstToFifth.has(row.num)) continue;
      const price = parseEuro(row.price); if (!price) continue;
      for (const p of state.players){
        const e = getEntryGlobal(p,row.num) || {};
        const qty = row.allowMulti ? (e.count||0) : (e.checked ? 1 : 0);
        if (qty) sums[p] += price * qty;
      }
    }
    return sums;
  }
  function sumForMatchday(md){
    const sums = Object.fromEntries(state.players.map(p=>[p,0]));
    for (const row of state.penalties){
      if (row.isSeparator) continue;
      if (firstToFifth.has(row.num)) continue;
      const price = parseEuro(row.price); if (!price) continue;
      for (const p of state.players){
        const e = getEntry(md,p,row.num) || {};
        const qty = row.allowMulti ? (e.count||0) : (e.checked ? 1 : 0);
        if (qty) sums[p] += price * qty;
      }
    }
    return sums;
  }
  function sumForAllMatchdays(){
    const sums = Object.fromEntries(state.players.map(p=>[p,0]));
    for (const md of state.matchdays){
      ensureMD(md);
      const tmp = sumForMatchday(md);
      for (const p of state.players) sums[p] += tmp[p];
    }
    return sums;
  }

  // ===== Nicht-€ =====
  function collectNonMonetaryForMatchdayDetailed(md){
    const bag = {};
    for (const row of state.penalties){
      if (row.isSeparator) continue;
      if (firstToFifth.has(row.num)) continue;
      if (!row.price || isMonetary(row.price)) continue;
      const item = normalizeNonEuroLabel(row.price); if (!item) continue;
      for (const p of state.players){
        const e = getEntry(md, p, row.num) || {};
        const qty = row.allowMulti ? (e.count || 0) : (e.checked ? 1 : 0);
        if (qty > 0){ (bag[item] ||= {}); bag[item][p] = (bag[item][p] || 0) + qty; }
      }
    }
    return Object.entries(bag).map(([item, playersMap])=>{
      const total = Object.values(playersMap).reduce((a,b)=>a+b,0);
      const who = Object.entries(playersMap).map(([pl,c]
