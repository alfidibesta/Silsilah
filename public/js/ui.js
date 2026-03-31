/**
 * ui.js — DOM rendering & UI helpers
 * Works with index.html (IDs: f-name, f-spouse, f-gen, f-parent, f-notes, f-deceased)
 */
import { buildTree, getAll, getById } from './api.js';

/* ── Toast ───────────────────────────────────── */
export function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast toast--${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── Confirm modal ───────────────────────────── */
export function openConfirm(name, onOk) {
  document.getElementById('confirm-name').textContent = name;
  document.getElementById('confirm-modal-overlay').classList.add('open');
  const okBtn = document.getElementById('confirm-ok');
  const newOk = okBtn.cloneNode(true);          // remove old listeners
  okBtn.parentNode.replaceChild(newOk, okBtn);
  newOk.onclick = () => {
    document.getElementById('confirm-modal-overlay').classList.remove('open');
    onOk();
  };
}

/* ── Gen badge ───────────────────────────────── */
function genBadge(g) {
  const labels = { 1:'Gen I', 2:'Gen II', 3:'Gen III', 4:'Gen IV' };
  return `<span class="badge badge--gen${g}">${labels[g] ?? `Gen ${g}`}</span>`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── List (table) ────────────────────────────── */
export function renderList(members, onEdit, onDelete) {
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
      <tr class="${m.deceased ? 'row--deceased' : ''}">
        <td>
          <div class="member-name">${m.deceased ? '<span class="deceased-icon">✝</span> ' : ''}${esc(m.name)}</div>
          ${m.spouse ? `<div class="member-spouse">& ${esc(m.spouse)}</div>` : ''}
        </td>
        <td>${genBadge(m.gen)}</td>
        <td>${parent ? esc(parent.name) : '<span class="muted">—</span>'}</td>
        <td class="notes-cell">${m.notes ? esc(m.notes) : '<span class="muted">—</span>'}</td>
        <td class="actions-cell" style="white-space:nowrap;">
          <button class="btn btn--icon btn--edit" data-id="${m.id}" title="Edit">✏</button>
          <button class="btn btn--icon btn--del"  data-id="${m.id}" title="Hapus">✕</button>
        </td>
      </tr>`;
  }).join('');
  tbody.querySelectorAll('.btn--edit').forEach(b => b.onclick = () => onEdit(b.dataset.id));
  tbody.querySelectorAll('.btn--del').forEach(b  => b.onclick = () => onDelete(b.dataset.id));
}

/* ── Tree ─────────────────────────────────────── */
export function renderTree(list, onEdit, onDelete, expandedSet) {
  const root = document.getElementById('tree-root');
  const tree = buildTree(list);
  if (!tree.length) {
    root.innerHTML = '<p class="muted" style="padding:1.5rem">Tidak ada data.</p>';
    return;
  }
  root.innerHTML = '';
  tree.forEach(node => root.appendChild(makeNode(node, onEdit, onDelete, expandedSet)));
}

function makeNode(node, onEdit, onDelete, expandedSet) {
  const hasKids  = node.children && node.children.length > 0;
  const expanded = expandedSet.has(node.id);

  const wrap = document.createElement('div');
  wrap.className = 'tree-node';

  // card
  const card = document.createElement('div');
  card.className = `tree-card gen${node.gen}${node.deceased ? ' deceased' : ''}`;

  // toggle btn
  const tog = document.createElement('button');
  tog.className = `tree-toggle${!hasKids ? ' invisible' : ''}`;
  tog.textContent = hasKids ? (expanded ? '▾' : '▸') : '';

  // info
  const info = document.createElement('div');
  info.className = 'tree-info';
  info.innerHTML = `
    <div class="tree-name">${node.deceased ? '<span class="deceased-icon">✝</span> ' : ''}${esc(node.name)}</div>
    ${node.spouse ? `<div class="tree-spouse">& ${esc(node.spouse)}</div>` : ''}
    ${node.notes  ? `<div class="tree-notes">${esc(node.notes)}</div>` : ''}`;

  // actions
  const acts = document.createElement('div');
  acts.className = 'tree-actions';
  acts.innerHTML = `
    <button class="btn btn--icon btn--edit" title="Edit">✏</button>
    <button class="btn btn--icon btn--del"  title="Hapus">✕</button>`;
  acts.querySelector('.btn--edit').onclick = () => onEdit(node.id);
  acts.querySelector('.btn--del').onclick  = () => onDelete(node.id);

  card.appendChild(tog);
  card.appendChild(info);
  card.appendChild(acts);

  // children
  const kids = document.createElement('div');
  kids.className = `tree-children${expanded ? '' : ' collapsed'}`;

  if (hasKids) {
    node.children.forEach(c => kids.appendChild(makeNode(c, onEdit, onDelete, expandedSet)));
    tog.onclick = () => {
      const nowCollapsed = kids.classList.toggle('collapsed');
      tog.textContent = nowCollapsed ? '▸' : '▾';
      if (nowCollapsed) expandedSet.delete(node.id);
      else              expandedSet.add(node.id);
    };
  }

  wrap.appendChild(card);
  wrap.appendChild(kids);
  return wrap;
}

/* ── Parent <select> ──────────────────────────── */
export function populateParentSelect(prefix = 'f', excludeId = null) {
  const sel = document.getElementById(`${prefix}-parent`);
  if (!sel) return;
  sel.innerHTML = '<option value="">— root —</option>';
  getAll()
    .filter(m => m.id !== excludeId)
    .sort((a, b) => a.gen - b.gen || a.name.localeCompare(b.name))
    .forEach(m => {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = `(Gen ${m.gen}) ${m.name}`;
      sel.appendChild(o);
    });
}

export function populateFilterSelect() {
  const sel = document.getElementById('filter-parent');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="__all__">Semua</option>';
  const parents = new Set(getAll().map(m => m.parentId).filter(Boolean));
  getAll()
    .filter(m => parents.has(m.id))
    .sort((a, b) => a.gen - b.gen || a.name.localeCompare(b.name))
    .forEach(m => {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = `${m.name} (Gen ${m.gen})`;
      sel.appendChild(o);
    });
  if (prev) sel.value = prev;
}

/* ── Form helpers ─────────────────────────────── */
export function getFormData(prefix = 'f') {
  return {
    name:     document.getElementById(`${prefix}-name`).value.trim(),
    spouse:   document.getElementById(`${prefix}-spouse`).value.trim() || null,
    gen:      parseInt(document.getElementById(`${prefix}-gen`).value) || 2,
    parentId: document.getElementById(`${prefix}-parent`).value || null,
    deceased: document.getElementById(`${prefix}-deceased`).checked,
    notes:    document.getElementById(`${prefix}-notes`).value.trim() || '',
  };
}

export function setFormData(prefix = 'f', id) {
  const m = getById(id);
  if (!m) return;
  document.getElementById(`${prefix}-name`).value     = m.name;
  document.getElementById(`${prefix}-spouse`).value   = m.spouse || '';
  document.getElementById(`${prefix}-gen`).value      = m.gen || 2;
  document.getElementById(`${prefix}-parent`).value   = m.parentId || '';
  document.getElementById(`${prefix}-deceased`).checked = !!m.deceased;
  document.getElementById(`${prefix}-notes`).value    = m.notes || '';
}

export function clearFormData(prefix = 'f') {
  ['name','spouse','notes'].forEach(k =>
    document.getElementById(`${prefix}-${k}`).value = ''
  );
  document.getElementById(`${prefix}-gen`).value = '2';
  document.getElementById(`${prefix}-parent`).value = '';
  document.getElementById(`${prefix}-deceased`).checked = false;
}

/* ── Stats ────────────────────────────────────── */
export function renderStats() {
  const all = getAll();
  document.getElementById('stat-total').textContent    = all.length;
  document.getElementById('stat-deceased').textContent = all.filter(m => m.deceased).length;
  document.getElementById('stat-gens').textContent     = [...new Set(all.map(m => m.gen))].length;
}
