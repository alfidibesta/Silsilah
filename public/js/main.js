/**
 * main.js — App controller
 * Uses sidebar inline form (prefix "f-") for all CRUD.
 * No duplicate modal form needed.
 */
import {
  bootstrap, getAll, create, update, remove,
  search, filterByParent, exportJSON, importJSON, resetToDefault,
} from './api.js';

import {
  toast, openConfirm,
  renderList, renderTree,
  populateParentSelect, populateFilterSelect,
  getFormData, setFormData, clearFormData,
  renderStats,
} from './ui.js';

/* ── state ───────────────────────────────────── */
let viewMode    = 'tree';
let searchQuery = '';
let filterPid   = '__all__';
let editingId   = null;           // null = add mode
let expandedSet = new Set();

const PREFIX = 'f';               // sidebar form prefix

/* ── derive list ─────────────────────────────── */
function currentList() {
  let list = searchQuery ? search(searchQuery) : getAll();
  if (filterPid && filterPid !== '__all__')
    list = list.filter(m => m.parentId === filterPid);
  return list;
}

/* ── refresh ──────────────────────────────────── */
function refresh() {
  renderStats();
  populateFilterSelect();
  const list = currentList();
  if (viewMode === 'list') renderList(list, startEdit, startDelete);
  else                     renderTree(list, startEdit, startDelete, expandedSet);
}

/* ── CRUD: add ────────────────────────────────── */
function startAdd() {
  editingId = null;
  clearFormData(PREFIX);
  populateParentSelect(PREFIX, null);
  document.getElementById('sidebar-form-title').textContent = '✚ Tambah Anggota';
  document.getElementById('f-name').focus();
}

/* ── CRUD: edit ───────────────────────────────── */
function startEdit(id) {
  editingId = id;
  populateParentSelect(PREFIX, id);
  setFormData(PREFIX, id);
  document.getElementById('sidebar-form-title').textContent = '✏ Edit Anggota';
  // scroll sidebar to top so user sees the form
  document.querySelector('.sidebar').scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('f-name').focus();
}

/* ── CRUD: save ───────────────────────────────── */
function handleSave() {
  const data = getFormData(PREFIX);
  if (!data.name) { toast('Nama tidak boleh kosong!', 'error'); return; }

  if (editingId) {
    update(editingId, data);
    toast(`✓ ${data.name} diperbarui`);
  } else {
    create(data);
    toast(`✓ ${data.name} ditambahkan`);
  }

  editingId = null;
  clearFormData(PREFIX);
  populateParentSelect(PREFIX, null);
  document.getElementById('sidebar-form-title').textContent = '✚ Tambah Anggota';
  refresh();
}

/* ── CRUD: delete ─────────────────────────────── */
function startDelete(id) {
  const m = getAll().find(x => x.id === id);
  if (!m) return;
  openConfirm(m.name, () => {
    remove(id);
    toast(`${m.name} dihapus`, 'warn');
    if (editingId === id) startAdd();
    refresh();
  });
}

/* ── view toggle ──────────────────────────────── */
function setView(mode) {
  viewMode = mode;
  document.getElementById('btn-tree').classList.toggle('active', mode === 'tree');
  document.getElementById('btn-list').classList.toggle('active', mode === 'list');
  document.getElementById('view-tree').hidden = mode !== 'tree';
  document.getElementById('view-list').hidden = mode !== 'list';
  document.getElementById('tree-controls').style.display = mode === 'tree' ? '' : 'none';
  refresh();
}

/* ── expand / collapse all ────────────────────── */
function expandAll() {
  getAll().forEach(m => expandedSet.add(m.id));
  refresh();
}
function collapseAll() {
  expandedSet.clear();
  refresh();
}

/* ── dark mode ────────────────────────────────── */
function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved !== null ? saved === 'true' : prefersDark;
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  document.getElementById('dark-toggle').textContent = dark ? '☀' : '🌙';
}

function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('darkMode', String(!isDark));
  document.getElementById('dark-toggle').textContent = isDark ? '🌙' : '☀';
}

/* ── export / import / reset ──────────────────── */
function doExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `silsilah_${Date.now()}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ JSON diunduh');
}

function doImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      importJSON(ev.target.result);
      expandedSet.clear();
      getAll().filter(m => m.gen <= 2).forEach(m => expandedSet.add(m.id));
      toast('✓ Data berhasil diimpor');
      refresh();
    } catch (err) {
      toast(`Error: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

async function doReset() {
  if (!confirm('Reset semua data ke data awal? Semua perubahan akan hilang.')) return;
  try {
    const res = await fetch('./data/family.json');
    if (!res.ok) throw new Error('Tidak dapat memuat family.json');
    const data = await res.json();
    resetToDefault(data);
    expandedSet.clear();
    data.filter(m => m.gen <= 2).forEach(m => expandedSet.add(m.id));
    toast('✓ Data direset ke awal');
    startAdd();
    refresh();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ── bind events ──────────────────────────────── */
function bindEvents() {
  // sidebar form
  document.getElementById('btn-save').onclick  = handleSave;
  document.getElementById('btn-clear').onclick = startAdd;

  // Enter key in name field
  document.getElementById('f-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
  });

  // views
  document.getElementById('btn-tree').onclick = () => setView('tree');
  document.getElementById('btn-list').onclick = () => setView('list');

  // expand/collapse
  document.getElementById('btn-expand-all').onclick   = expandAll;
  document.getElementById('btn-collapse-all').onclick = collapseAll;

  // search
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value;
    refresh();
  });

  // filter
  document.getElementById('filter-parent').addEventListener('change', e => {
    filterPid = e.target.value;
    refresh();
  });

  // dark mode
  document.getElementById('dark-toggle').onclick = toggleDark;

  // export / import / reset
  document.getElementById('btn-export').onclick = doExport;
  document.getElementById('btn-import').onclick = () =>
    document.getElementById('import-input').click();
  document.getElementById('import-input').addEventListener('change', doImport);
  document.getElementById('btn-reset').onclick = doReset;

  // confirm modal close
  document.getElementById('confirm-cancel').onclick = () =>
    document.getElementById('confirm-modal-overlay').classList.remove('open');
  document.querySelector('#confirm-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget)
      e.currentTarget.classList.remove('open');
  });

  // keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.getElementById('confirm-modal-overlay').classList.remove('open');
  });
}

/* ── init ─────────────────────────────────────── */
async function init() {
  await bootstrap();
  initDarkMode();
  bindEvents();
  populateParentSelect(PREFIX, null);
  // default: gen 1 & 2 expanded
  getAll().filter(m => m.gen <= 2).forEach(m => expandedSet.add(m.id));
  setView('tree');
}

init();
