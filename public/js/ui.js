/**
 * ui.js — DOM rendering
 */
import { buildTree, getAll, getById, getStats } from './api.js';

/* ── Toast ───────────────────────────────────── */
export function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast--${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── Stats ───────────────────────────────────── */
export function renderStats() {
  const s = getStats();
  document.getElementById('stat-total').textContent    = s.total;
  document.getElementById('stat-alive').textContent    = s.alive;
  document.getElementById('stat-deceased').textContent = s.deceased;
  document.getElementById('stat-married').textContent  = s.married;
  document.getElementById('stat-gens').textContent     = s.gens;
}

/* ── Gen badge ───────────────────────────────── */
function genBadge(g) {
  return `<span class="badge badge--gen${g}">Gen ${toRoman(g)}</span>`;
}
function toRoman(n) {
  return ['','I','II','III','IV','V'][n] ?? n;
}
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── List ────────────────────────────────────── */
export function renderList(members, onRowClick) {
  const tbody = document.getElementById('list-body');
  const empty = document.getElementById('list-empty');
  if (!members.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  const all = getAll();
  tbody.innerHTML = members.map(m => {
    const parent = m.parentId ? all.find(x => x.id === m.parentId) : null;
    return `
      <tr class="${m.deceased ? 'row--deceased' : ''}" data-id="${m.id}" style="cursor:pointer">
        <td>
          <div class="member-name">${m.deceased ? '<span class="deceased-icon">✝</span> ':''} ${esc(m.name)}</div>
          ${m.spouse ? `<div class="member-spouse">& ${esc(m.spouse)}</div>` : ''}
        </td>
        <td>${genBadge(m.gen)}</td>
        <td>${parent ? esc(parent.name) : '<span class="muted">—</span>'}</td>
        <td class="notes-cell">${m.notes ? esc(m.notes) : '<span class="muted">—</span>'}</td>
      </tr>`;
  }).join('');
  tbody.querySelectorAll('tr[data-id]').forEach(row =>
    row.onclick = () => onRowClick(row.dataset.id)
  );
}

/* ── Detail / Edit Modal ─────────────────────── */
export function openDetailModal(id, onSave, onDelete) {
  const m = getById(id);
  if (!m) return;
  const all = getAll();
  const parent   = all.find(x => x.id === m.parentId);
  const children = all.filter(x => x.parentId === m.id);

  const modal = document.getElementById('detail-modal');
  const overlay = document.getElementById('detail-overlay');

  // header
  document.getElementById('dm-title').textContent = m.name;
  document.getElementById('dm-subtitle').textContent =
    `Generasi ${toRoman(m.gen)}${m.deceased ? ' · Almarhum/ah' : ''}`;

  // view mode content
  document.getElementById('dm-view').innerHTML = `
    <table class="detail-table">
      <tr><td>Pasangan</td><td>${m.spouse ? esc(m.spouse) : '<em class="muted">—</em>'}</td></tr>
      <tr><td>Generasi</td><td>${genBadge(m.gen)}</td></tr>
      <tr><td>Status</td><td>${m.deceased ? '<span class="tag tag--red">✝ Almarhum/ah</span>' : '<span class="tag tag--green">✓ Hidup</span>'}</td></tr>
      <tr><td>Orang Tua</td><td>${parent ? esc(parent.name) : '<em class="muted">Akar keluarga</em>'}</td></tr>
      <tr><td>Anak-anak</td><td>${children.length ? children.map(c => `<span class="child-chip">${esc(c.name)}</span>`).join('') : '<em class="muted">—</em>'}</td></tr>
      ${m.notes ? `<tr><td>Catatan</td><td>${esc(m.notes)}</td></tr>` : ''}
    </table>`;

  // populate edit form
  document.getElementById('de-name').value       = m.name;
  document.getElementById('de-spouse').value     = m.spouse || '';
  document.getElementById('de-gen').value        = m.gen;
  document.getElementById('de-deceased').checked = !!m.deceased;
  document.getElementById('de-notes').value      = m.notes || '';
  // populate parent select
  const pSel = document.getElementById('de-parent');
  pSel.innerHTML = '<option value="">— root —</option>';
  all.filter(x => x.id !== m.id)
     .sort((a,b) => a.gen-b.gen || a.name.localeCompare(b.name))
     .forEach(x => {
       const o = document.createElement('option');
       o.value = x.id;
       o.textContent = `(Gen ${x.gen}) ${x.name}`;
       if (x.id === m.parentId) o.selected = true;
       pSel.appendChild(o);
     });

  // switch to view mode
  showDetailTab('view');

  // wire buttons
  document.getElementById('dm-edit-btn').onclick = () => showDetailTab('edit');
  document.getElementById('dm-cancel-edit').onclick = () => showDetailTab('view');
  document.getElementById('dm-delete-btn').onclick = () => {
    overlay.classList.remove('open');
    onDelete(id);
  };
  document.getElementById('dm-save-btn').onclick = () => {
    const name = document.getElementById('de-name').value.trim();
    if (!name) { toast('Nama tidak boleh kosong!','error'); return; }
    onSave(id, {
      name,
      spouse:   document.getElementById('de-spouse').value.trim() || null,
      gen:      parseInt(document.getElementById('de-gen').value),
      parentId: document.getElementById('de-parent').value || null,
      deceased: document.getElementById('de-deceased').checked,
      notes:    document.getElementById('de-notes').value.trim(),
    });
    overlay.classList.remove('open');
  };
  document.getElementById('dm-close').onclick = () => overlay.classList.remove('open');
  overlay.onclick = e => { if (e.target===overlay) overlay.classList.remove('open'); };

  overlay.classList.add('open');
}

function showDetailTab(tab) {
  document.getElementById('dm-view').hidden      = tab !== 'view';
  document.getElementById('dm-edit-form').hidden = tab !== 'edit';
  document.getElementById('dm-edit-btn').hidden  = tab !== 'view';
  document.getElementById('dm-save-btn').hidden  = tab !== 'edit';
  document.getElementById('dm-cancel-edit').hidden = tab !== 'edit';
}

/* ── Confirm Delete ──────────────────────────── */
export function openConfirm(name, onOk) {
  document.getElementById('confirm-name').textContent = name;
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('open');
  const btn = document.getElementById('confirm-ok');
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  fresh.onclick = () => { overlay.classList.remove('open'); onOk(); };
  document.getElementById('confirm-cancel').onclick = () => overlay.classList.remove('open');
  overlay.onclick = e => { if (e.target===overlay) overlay.classList.remove('open'); };
}

/* ── Add Member Modal ────────────────────────── */
export function openAddModal(onSave) {
  // clear form
  ['am-name','am-spouse','am-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('am-gen').value = '2';
  document.getElementById('am-deceased').checked = false;

  const pSel = document.getElementById('am-parent');
  pSel.innerHTML = '<option value="">— root —</option>';
  getAll().sort((a,b)=>a.gen-b.gen||a.name.localeCompare(b.name)).forEach(m => {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = `(Gen ${m.gen}) ${m.name}`;
    pSel.appendChild(o);
  });

  const overlay = document.getElementById('add-overlay');
  overlay.classList.add('open');
  document.getElementById('am-name').focus();

  document.getElementById('am-close').onclick   = () => overlay.classList.remove('open');
  document.getElementById('am-cancel').onclick  = () => overlay.classList.remove('open');
  overlay.onclick = e => { if (e.target===overlay) overlay.classList.remove('open'); };

  const saveBtn = document.getElementById('am-save');
  const fresh = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(fresh, saveBtn);
  fresh.onclick = () => {
    const name = document.getElementById('am-name').value.trim();
    if (!name) { toast('Nama tidak boleh kosong!','error'); return; }
    onSave({
      name,
      spouse:   document.getElementById('am-spouse').value.trim() || null,
      gen:      parseInt(document.getElementById('am-gen').value),
      parentId: document.getElementById('am-parent').value || null,
      deceased: document.getElementById('am-deceased').checked,
      notes:    document.getElementById('am-notes').value.trim(),
    });
    overlay.classList.remove('open');
  };
}

/* ── Visual Family Tree ──────────────────────── */
export function renderVisualTree(list, onNodeClick) {
  const wrap = document.getElementById('vtree-wrap');
  wrap.innerHTML = '';
  const all = list || getAll();
  const tree = buildTree(all, null);
  if (!tree.length) {
    wrap.innerHTML = '<p class="muted" style="padding:2rem">Tidak ada data.</p>';
    return;
  }

  // Build a full horizontal SVG-based tree
  const NODE_W = 140, NODE_H = 56, H_GAP = 24, V_GAP = 72;

  // Compute positions
  let positions = {};
  function calcSubW(node) {
    if (!node.children.length) return NODE_W;
    return node.children.reduce((s,c,i) => s + calcSubW(c) + (i?H_GAP:0), 0);
  }
  function assignPos(node, x, y) {
    const kids = node.children;
    if (!kids.length) { positions[node.id] = { x, y, cx: x+NODE_W/2 }; return; }
    let cursor = x;
    const cxs = kids.map(c => {
      const w = calcSubW(c);
      assignPos(c, cursor, y + NODE_H + V_GAP);
      const pos = positions[c.id];
      cursor += w + H_GAP;
      return pos.cx;
    });
    const cx = (cxs[0] + cxs[cxs.length-1]) / 2;
    positions[node.id] = { x: cx - NODE_W/2, y, cx };
  }

  let startX = 0;
  tree.forEach(root => {
    assignPos(root, startX, 0);
    startX += calcSubW(root) + H_GAP * 2;
  });

  // canvas size
  const allPos = Object.values(positions);
  const maxX = Math.max(...allPos.map(p => p.x + NODE_W)) + 20;
  const maxY = Math.max(...allPos.map(p => p.y + NODE_H)) + 20;

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width', maxX);
  svg.setAttribute('height', maxY);
  svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;';

  const canvas = document.createElement('div');
  canvas.style.cssText = `position:relative;width:${maxX}px;height:${maxY}px;`;
  canvas.appendChild(svg);

  const GEN_COLORS = {
    1: { bg:'#f5ede3', border:'#5c3a1e', text:'#3d2409' },
    2: { bg:'#fdf3e7', border:'#7b5e3a', text:'#5a3e1f' },
    3: { bg:'#eaf4ec', border:'#3a6b4a', text:'#234232' },
    4: { bg:'#e8f2fb', border:'#2a5580', text:'#1a3a5c' },
  };
  const DARK_GEN = {
    1: { bg:'#2d1f12', border:'#c9a87c', text:'#f5dfc0' },
    2: { bg:'#261c10', border:'#a07840', text:'#e8c898' },
    3: { bg:'#122218', border:'#5a9a6a', text:'#a8d8b0' },
    4: { bg:'#0e1c2e', border:'#4a80b0', text:'#90c0e8' },
  };

  function isDark() { return document.documentElement.getAttribute('data-theme')==='dark'; }

  // Draw SVG connector lines
  function drawLines(node) {
    const kids = node.children;
    if (!kids.length) return;
    const pp = positions[node.id];
    const parentCX = pp.cx;
    const parentBY = pp.y + NODE_H;
    const midY = parentBY + V_GAP / 2;

    if (kids.length === 1) {
      const cp = positions[kids[0].id];
      addLine(svg, parentCX, parentBY, cp.cx, cp.y, '#c9a87c');
    } else {
      const cxs = kids.map(c => positions[c.id].cx);
      addLine(svg, parentCX, parentBY, parentCX, midY, '#c9a87c');
      addLine(svg, Math.min(...cxs), midY, Math.max(...cxs), midY, '#c9a87c');
      cxs.forEach((cx, i) => {
        addLine(svg, cx, midY, cx, positions[kids[i].id].y, '#c9a87c');
      });
    }
    kids.forEach(drawLines);
  }
  tree.forEach(drawLines);

  // Draw nodes
  function drawNodes(node) {
    const p = positions[node.id];
    const gc = (isDark() ? DARK_GEN : GEN_COLORS)[node.gen] || GEN_COLORS[2];
    const opacity = node.deceased ? '0.72' : '1';

    const box = document.createElement('div');
    box.dataset.id = node.id;
    box.title = node.name + (node.spouse ? ` & ${node.spouse}` : '');
    box.style.cssText = `
      position:absolute;
      left:${p.x}px; top:${p.y}px;
      width:${NODE_W}px; height:${NODE_H}px;
      background:${gc.bg};
      border:2px solid ${gc.border};
      border-radius:10px;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      padding:6px 8px;
      cursor:pointer;
      opacity:${opacity};
      box-shadow:0 2px 8px rgba(0,0,0,0.12);
      transition:transform .15s, box-shadow .15s;
      text-align:center;
      overflow:hidden;
      z-index:2;
    `;
    box.innerHTML = `
      <div style="font-weight:700;font-size:11.5px;color:${gc.text};line-height:1.25;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${node.deceased?'✝ ':''}${esc(node.name)}
      </div>
      ${node.spouse ? `<div style="font-size:9.5px;color:${gc.text};opacity:.7;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">& ${esc(node.spouse)}</div>` : ''}
      <div style="margin-top:3px;">${genBadge(node.gen)}</div>
    `;
    box.onmouseenter = () => {
      box.style.transform = 'translateY(-2px)';
      box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.18)';
    };
    box.onmouseleave = () => {
      box.style.transform = '';
      box.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    };
    box.onclick = () => onNodeClick(node.id);
    canvas.appendChild(box);
    node.children.forEach(drawNodes);
  }
  tree.forEach(drawNodes);

  wrap.appendChild(canvas);
  // pan support
  initPan(wrap);
}

function addLine(svg, x1, y1, x2, y2, color) {
  const l = document.createElementNS('http://www.w3.org/2000/svg','line');
  l.setAttribute('x1',x1); l.setAttribute('y1',y1);
  l.setAttribute('x2',x2); l.setAttribute('y2',y2);
  l.setAttribute('stroke', color);
  l.setAttribute('stroke-width','1.8');
  l.setAttribute('stroke-linecap','round');
  svg.appendChild(l);
}

function initPan(el) {
  let down = false, sx=0, sy=0, sl=0, st=0;
  el.style.cursor = 'grab';
  el.onmousedown = e => {
    if (e.button !== 0) return;
    down = true; sx=e.clientX; sy=e.clientY;
    sl=el.scrollLeft; st=el.scrollTop;
    el.style.cursor='grabbing';
    e.preventDefault();
  };
  window.addEventListener('mousemove', e => {
    if (!down) return;
    el.scrollLeft = sl - (e.clientX-sx);
    el.scrollTop  = st - (e.clientY-sy);
  });
  window.addEventListener('mouseup', () => { down=false; el.style.cursor='grab'; });
  // touch
  let tx=0, ty=0, tsl=0, tst=0;
  el.addEventListener('touchstart', e => {
    tx=e.touches[0].clientX; ty=e.touches[0].clientY;
    tsl=el.scrollLeft; tst=el.scrollTop;
  }, {passive:true});
  el.addEventListener('touchmove', e => {
    el.scrollLeft = tsl-(e.touches[0].clientX-tx);
    el.scrollTop  = tst-(e.touches[0].clientY-ty);
  }, {passive:true});
}

/* ── Text Tree (outline) ──────────────────────── */
export function renderTextTree(list, onNodeClick, expandedSet) {
  const root = document.getElementById('tree-root');
  const tree = buildTree(list || getAll(), null);
  if (!tree.length) {
    root.innerHTML = '<p class="muted" style="padding:1.5rem">Tidak ada data.</p>';
    return;
  }
  root.innerHTML = '';
  tree.forEach(n => root.appendChild(makeNode(n, onNodeClick, expandedSet)));
}

function makeNode(node, onClick, expandedSet) {
  const hasKids = node.children && node.children.length > 0;
  const expanded = expandedSet.has(node.id);
  const wrap = document.createElement('div');
  wrap.className = 'tree-node';

  const card = document.createElement('div');
  card.className = `tree-card gen${node.gen}${node.deceased?' deceased':''}`;
  card.style.cursor = 'pointer';

  const tog = document.createElement('button');
  tog.className = `tree-toggle${hasKids?'':' invisible'}`;
  tog.textContent = hasKids ? (expanded?'▾':'▸') : '';

  const info = document.createElement('div');
  info.className = 'tree-info';
  info.innerHTML = `
    <div class="tree-name">${node.deceased?'<span class="deceased-icon">✝</span> ':''}${esc(node.name)}</div>
    ${node.spouse?`<div class="tree-spouse">& ${esc(node.spouse)}</div>`:''}`;

  info.onclick = () => onClick(node.id);

  const kids = document.createElement('div');
  kids.className = `tree-children${expanded?'':' collapsed'}`;

  if (hasKids) {
    node.children.forEach(c => kids.appendChild(makeNode(c, onClick, expandedSet)));
    tog.onclick = (e) => {
      e.stopPropagation();
      const nowClosed = kids.classList.toggle('collapsed');
      tog.textContent = nowClosed ? '▸' : '▾';
      if (nowClosed) expandedSet.delete(node.id);
      else expandedSet.add(node.id);
    };
  }

  card.appendChild(tog);
  card.appendChild(info);
  wrap.appendChild(card);
  wrap.appendChild(kids);
  return wrap;
}

/* ── Filter select ───────────────────────────── */
export function populateFilterSelect() {
  const sel = document.getElementById('filter-parent');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="__all__">Semua</option>';
  const parentIds = new Set(getAll().map(m=>m.parentId).filter(Boolean));
  getAll().filter(m=>parentIds.has(m.id))
    .sort((a,b)=>a.gen-b.gen||a.name.localeCompare(b.name))
    .forEach(m => {
      const o = document.createElement('option');
      o.value=m.id; o.textContent=`${m.name} (Gen ${m.gen})`;
      sel.appendChild(o);
    });
  if (prev) sel.value = prev;
}
