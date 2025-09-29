/* Strafkatalog – 1–5 global, ab 6. pro Spieltag, Summen, Kommentare, Sticky-Header, Persistenz */
(() => {
  'use strict';

  // ---------- DOM Helpers ----------
  const $  = (s, root = document) => root.querySelector(s);
  const KEY = 'strafkatalog_state_v2'; // neue, stabile Version

  // Sticky-Header an Seiten-Header-Höhe anpassen
  function updateStickyTop(){
    const hdr = document.querySelector('header');
    const h = hdr ? hdr.offsetHeight : 0;
    document.documentElement.style.setProperty('--headerH', (h || 0) + 'px');
  }
  updateStickyTop();
  window.addEventListener('resize', updateStickyTop);
  if (window.ResizeObserver){
    const el = document.querySelector('header');
    if (el){ new ResizeObserver(updateStickyTop).observe(el); }
  }

  // ---------- Utils ----------
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
  const isMonetary = (price) => typeof price === 'string' && /€/i.test(price) && /[0-9]/.test(price);
  const normalizeNonEuroLabel = (price) => String(price || '').replace(/^\s*\d+\s+/, '').trim();

  // ---------- Defaults ----------
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

  // ---------- State ----------
  let state = load();
  if (!valid(state)) state = JSON.parse(JSON.stringify(defaults));

  // ---------- Elements ----------
  const els = {
    projectName:   $('#projectName'),
    matchdaySelect:$('#matchdaySelect'),
    tableWrap:     $('#tableWrap'),
    globalWrap:    $('#globalWrap'),
    log:           $('#log'),
    dlg:           $('#commentModal'),
  };

  // ---------- Header-Init ----------
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

  // ---------- Data helpers ----------
  const firstToFifth = new Set(['1.','2.','3.','4.','5.']);

  function ensureGlobal(){
    state.global ||= {};
    for (const p of state.players){
      state.global[p] ||= {};
      for (const row of state.penalties){
        if (!firstToFifth.has(row.num)) continue;
        const prev = state.global[p][row.num];
        if (!prev){
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
        if (firstToFifth.has(row.num)) continue; // 1–5 sind global
        const prev = state.data[md][p][row.num];
        const base = row.allowMulti ? { count:0, comment:'', ts:null } : { checked:false, comment:'', ts:null };
        if (prev && row.allowMulti){
          state.data[md][p][row.num] = {
            count: prev.count ?? (prev.checked ? 1 : 0),
            comment: prev.comment || '',
            ts: prev.ts || null
          };
        } else if (!prev){
          state.data[md][p][row.num] = base;
        }
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

  // ---------- Summen ----------
  function sumGlobalFirstToFifth(){
    const sums = Object.fromEntries(state.players.map(p=>[p,0]));
    for (const row of state.penalties){
      if (!firstToFifth.has(row.num)) continue;
      const price = parseEuro(row.price);
      if (!price) continue;
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
      if (firstToFifth.has(row.num)) continue; // nur 6.–Ende
      const price = parseEuro(row.price);
      if (!price) continue;
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

  // ---------- Nicht-€ ----------
  function collectNonMonetaryForMatchdayDetailed(md){
    const bag = {};
    for (const row of state.penalties){
      if (row.isSeparator) continue;
      if (firstToFifth.has(row.num)) continue;
      if (!row.price || isMonetary(row.price)) continue;
      const item = normalizeNonEuroLabel(row.price);
      if (!item) continue;

      for (const p of state.players){
        const e = getEntry(md, p, row.num) || {};
        const qty = row.allowMulti ? (e.count || 0) : (e.checked ? 1 : 0);
        if (qty > 0){
          bag[item] ||= {};
          bag[item][p] = (bag[item][p] || 0) + qty;
        }
      }
    }
    const lines = [];
    for (const [item, playersMap] of Object.entries(bag)){
      const total = Object.values(playersMap).reduce((a,b)=>a+b,0);
      const who = Object.entries(playersMap).map(([pl,c]) => c === 1 ? pl : `${pl} (${c})`).join(', ');
      lines.push(`${total}× ${item} — ${who}`);
    }
    return lines;
  }

  function collectNonMonetaryAllDetailed(){
    const bag = {};
    // global 1–5
    for (const row of state.penalties){
      if (!firstToFifth.has(row.num)) continue;
      if (!row.price || isMonetary(row.price)) continue;
      const item = normalizeNonEuroLabel(row.price);
      if (!item) continue;
      for (const p of state.players){
        const e = getEntryGlobal(p, row.num) || {};
        const qty = row.allowMulti ? (e.count||0) : (e.checked ? 1 : 0);
        if (qty > 0){
          bag[item] ||= {};
          bag[item][p] = (bag[item][p] || 0) + qty;
        }
      }
    }
    // 6–Ende über alle Spieltage
    for (const md of state.matchdays){
      ensureMD(md);
      for (const row of state.penalties){
        if (row.isSeparator) continue;
        if (firstToFifth.has(row.num)) continue;
        if (!row.price || isMonetary(row.price)) continue;
        const item = normalizeNonEuroLabel(row.price);
        if (!item) continue;

        for (const p of state.players){
          const e = getEntry(md, p, row.num) || {};
          const qty = row.allowMulti ? (e.count || 0) : (e.checked ? 1 : 0);
          if (qty > 0){
            bag[item] ||= {};
            bag[item][p] = (bag[item][p] || 0) + qty;
          }
        }
      }
    }
    const lines = [];
    for (const [item, playersMap] of Object.entries(bag)){
      const total = Object.values(playersMap).reduce((a,b)=>a+b,0);
      const who = Object.entries(playersMap).map(([pl,c]) => c === 1 ? pl : `${pl} (${c})`).join(', ');
      lines.push(`${total}× ${item} — ${who}`);
    }
    return lines;
  }

  // ---------- Render ----------
  function renderMatchdayOptions(){
    if (!els.matchdaySelect) return;
    els.matchdaySelect.innerHTML = state.matchdays.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    if (!els.matchdaySelect.value && state.matchdays.length) els.matchdaySelect.value = state.matchdays[0];
  }

  function renderGlobal(){
    ensureGlobal();
    const rows = state.penalties.filter(r => firstToFifth.has(r.num));
    let html = `<div><table><thead><tr>
      <th class="sticky-left">#</th>
      <th class="sticky-left">Strafe</th>
      <th>Preis</th>
      ${state.players.map(p=>`<th>${escapeHtml(p)}</th>`).join('')}
    </tr></thead><tbody>`;

    for (const row of rows){
      html += `<tr>
        <th class="sticky-left">${escapeHtml(row.num)}</th>
        <th class="sticky-left">${escapeHtml(row.label)}</th>
        <td>${escapeHtml(row.price||'')}</td>`;
      for (const pl of state.players){
        const e = getEntryGlobal(pl,row.num) || {};
        const checked = e.checked ? 'checked' : '';
        html += `<td><input type="checkbox" data-global="1" data-player="${attr(pl)}" data-pen="${attr(row.num)}" ${checked}></td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    els.globalWrap.innerHTML = html;
  }

  function renderTable(){
    const md = els.matchdaySelect?.value || state.matchdays[0];
    ensureMD(md);

    let html = `<div><table><thead><tr>
      <th class="sticky-left">#</th>
      <th class="sticky-left">Strafe</th>
      <th>Preis</th>
      ${state.players.map(p=>`<th>${escapeHtml(p)}</th>`).join('')}
    </tr></thead><tbody>`;

    for (const row of state.penalties){
      if (row.isSeparator){
        html += `<tr class="separator-row"><td colspan="${3 + state.players.length}"></td></tr>`;
        continue;
      }
      if (firstToFifth.has(row.num)) continue; // 1–5 sind oben

      const isCommentRow = (row.num === '6.' || row.num === '10.');
      const rowClass = row.isSub ? 'sub-row' : '';
      html += `<tr class="${rowClass}">
        <th class="sticky-left">${escapeHtml(row.num)}</th>
        <th class="sticky-left">${escapeHtml(row.label)}</th>
        <td>${escapeHtml(row.price||'')}</td>`;

      for (const pl of state.players){
        const e = getEntry(md,pl,row.num) || {};
        let cellHtml = '';

        if (isCommentRow){
          cellHtml += ` <span class="comment-btn" data-md="${attr(md)}" data-player="${attr(pl)}" data-pen="${attr(row.num)}">💬</span>`;
          if (e.comment && e.comment.trim()) cellHtml += `<div class="note">${escapeHtml(e.comment)}</div>`;
        } else if (row.allowMulti){
          const val = e.count ?? 0;
          cellHtml += `<input type="number" min="0" step="1" class="qty-input"
                         data-md="${attr(md)}" data-player="${attr(pl)}" data-pen="${attr(row.num)}"
                         value="${val}">`;
        } else {
          const checked = e.checked ? 'checked' : '';
          cellHtml += `<input type="checkbox" data-md="${attr(md)}" data-player="${attr(pl)}" data-pen="${attr(row.num)}" ${checked}>`;
        }
        html += `<td>${cellHtml}</td>`;
      }
      html += `</tr>`;
    }

    // Summen
    const mdSum   = sumForMatchday(md);      // nur 6.–Ende (dieser Spieltag)
    const allSum  = sumForAllMatchdays();    // alle Spieltage (6.–Ende)
    const gSum    = sumGlobalFirstToFifth(); // 1–5 global
    const colspan = 3 + state.players.length;

    html += `<tr class="summary-row">
      <th class="sticky-left">Σ</th>
      <th class="sticky-left">Gesamt (dieser Spieltag)</th>
      <td></td>
      ${state.players.map(p => `<td>${formatEuro(mdSum[p])}</td>`).join('')}
    </tr>`;

    html += `<tr class="summary-row">
      <th class="sticky-left">Σ</th>
      <th class="sticky-left">Gesamt (alle Spieltage inkl. 1–5)</th>
      <td></td>
      ${state.players.map(p => `<td>${formatEuro(allSum[p] + gSum[p])}</td>`).join('')}
    </tr>`;

    // Nicht-€ Hinweise
    const nonMonThis = collectNonMonetaryForMatchdayDetailed(md);
    const nonMonAll  = collectNonMonetaryAllDetailed();

    if (nonMonThis.length){
      html += `<tr class="note-row"><td colspan="${colspan}">
        <div class="note"><strong>Nicht-monetäre Strafen (dieser Spieltag):</strong><br>
          ${nonMonThis.map(s => escapeHtml(s)).join('<br>')}
        </div>
      </td></tr>`;
    }
    if (nonMonAll.length){
      html += `<tr class="note-row"><td colspan="${colspan}">
        <div class="note"><strong>Nicht-monetäre Strafen (gesamt inkl. 1–5):</strong><br>
          ${nonMonAll.map(s => escapeHtml(s)).join('<br>')}
        </div>
      </td></tr>`;
    }

    html += `</tbody></table></div>`;
    els.tableWrap.innerHTML = html;
  }

  // ---------- Events ----------
  function onGlobalWrapChange(ev){
    const t = ev.target;
    if (t.matches('input[type="checkbox"][data-global]')){
      setEntryGlobal(t.dataset.player, t.dataset.pen, {checked: t.checked});
      renderTable(); // Summen aktualisieren
    }
  }

  function onTableWrapChange(ev){
    const t = ev.target;
    if (t.matches('input[type="checkbox"][data-md]')){
      setEntry(t.dataset.md, t.dataset.player, t.dataset.pen, {checked: t.checked});
      renderTable();
      return;
    }
    if (t.matches('.qty-input')){
      const n = Math.max(0, Math.floor(Number(t.value) || 0));
      setEntry(t.dataset.md, t.dataset.player, t.dataset.pen, {count:n});
      renderTable();
      return;
    }
  }

  let ctx = null;
  function onTableWrapClick(ev){
    const btn = ev.target.closest('.comment-btn');
    if (!btn) return;
    ctx = { md:btn.dataset.md, pl:btn.dataset.player, pen:btn.dataset.pen };
    const e = getEntry(ctx.md, ctx.pl, ctx.pen) || {};
    const dlg = $('#commentModal');
    if (!dlg || !dlg.showModal) { alert('Kommentar-Dialog nicht verfügbar.'); return; }
    $('#modalMeta').textContent = `${ctx.pl} · ${ctx.pen} · ${ctx.md}`;
    $('#modalChecked').checked = !!e.checked;
    $('#commentText').value = e.comment || '';
    dlg.showModal();
  }

  $('#saveComment')?.addEventListener('click', () => {
    if (!ctx) return $('#commentModal').close();
    setEntry(ctx.md, ctx.pl, ctx.pen, {
      comment: $('#commentText').value,
      checked: $('#modalChecked').checked
    });
    renderTable();
    $('#commentModal').close();
  });

  // ---------- Log ----------
  function renderLog(){
    if (!els.log) return;
    els.log.textContent = (state.log||[]).map(l => `[${new Date(l.ts).toLocaleString()}] ${l.msg}`).join('\n');
    els.log.scrollTop = els.log.scrollHeight;
  }

  // ---------- Migration / Extras ----------
  function migrateExtras(){
    const byNum = Object.fromEntries(defaults.penalties.map(r => [r.num, r]));
    if (!state.penalties.some(r => r.isSeparator)){
      const idx17 = state.penalties.findIndex(r => r.num === '17.');
      if (idx17 !== -1) state.penalties.splice(idx17+1, 0, { num:'—', label:'SEPARATOR', isSeparator:true });
    }
    ['18.','19.','20.','21.'].forEach(n => {
      if (!state.penalties.find(r => r.num === n)) state.penalties.push(byNum[n]);
    });
    save(state);
  }

  // ---------- Boot ----------
  function renderAll(){
    renderMatchdayOptions();
    renderGlobal();
    renderTable();
    renderLog();
  }

  function boot(){
    ensureGlobal();
    for (const md of state.matchdays) ensureMD(md);
    migrateExtras();
    renderAll();

    // dauerhafte Event-Delegation (persistente Speicherung)
    els.matchdaySelect?.addEventListener('change', renderTable);
    els.globalWrap?.addEventListener('change', onGlobalWrapChange);
    els.tableWrap?.addEventListener('change', onTableWrapChange);
    els.tableWrap?.addEventListener('click',  onTableWrapClick);
  }

  boot();
})();
