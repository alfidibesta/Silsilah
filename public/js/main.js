/**
 * main.js — Application controller
 */
import {
  bootstrap, getAll, create, update, remove,
  search, exportJSON, resetToDefault,
} from './api.js';

import {
  toast, renderStats,
  renderList, renderTextTree, renderVisualTree,
  openDetailModal, openAddModal, openConfirm,
  populateFilterSelect,
} from './ui.js';

/* ── state ───────────────────────────────────── */
let viewMode    = 'vtree';   // 'vtree' | 'ttree' | 'list'
let searchQuery = '';
let filterPid   = '__all__';
let expandedSet = new Set();

/* ── derived list ────────────────────────────── */
function currentList() {
  let list = searchQuery ? search(searchQuery) : getAll();
  if (filterPid && filterPid !== '__all__')
    list = list.filter(m => m.parentId === filterPid);
  return list;
}

/* ── refresh all views ───────────────────────── */
function refresh() {
  renderStats();
  populateFilterSelect();
  const list = currentList();
  if (viewMode === 'list')   renderList(list, id => openDetail(id));
  else if (viewMode === 'ttree') renderTextTree(list, id => openDetail(id), expandedSet);
  else                       renderVisualTree(list, id => openDetail(id));
}

/* ── open detail / edit ──────────────────────── */
function openDetail(id) {
  openDetailModal(
    id,
    (id, patch) => {
      update(id, patch);
      toast(`✓ ${patch.name} diperbarui`);
      refresh();
    },
    (id) => {
      const m = getAll().find(x=>x.id===id);
      openConfirm(m?.name ?? '?', () => {
        remove(id);
        toast(`${m?.name} dihapus`, 'warn');
        refresh();
      });
    }
  );
}

/* ── add ─────────────────────────────────────── */
function handleAdd() {
  openAddModal(data => {
    const m = create(data);
    toast(`✓ ${m.name} ditambahkan`);
    refresh();
  });
}

/* ── view toggle ──────────────────────────────── */
function setView(mode) {
  viewMode = mode;
  ['vtree','ttree','list'].forEach(v => {
    document.getElementById(`btn-${v}`).classList.toggle('active', v === mode);
    document.getElementById(`view-${v}`).hidden = v !== mode;
  });
  const treeCtrl = document.getElementById('tree-controls');
  treeCtrl.style.display = mode === 'ttree' ? '' : 'none';
  refresh();
}

/* ── expand / collapse ────────────────────────── */
function expandAll()  { getAll().forEach(m=>expandedSet.add(m.id)); refresh(); }
function collapseAll(){ expandedSet.clear(); refresh(); }

/* ── zoom visual tree ─────────────────────────── */
let zoomLevel = 1;
function setZoom(z) {
  zoomLevel = Math.min(2, Math.max(0.3, z));
  const wrap = document.getElementById('vtree-wrap');
  wrap.style.transformOrigin = '0 0';
  const inner = wrap.querySelector('div');
  if (inner) inner.style.transform = `scale(${zoomLevel})`;
}

/* ── search ───────────────────────────────────── */
function handleSearch(q) {
  searchQuery = q;
  refresh();
}

/* ── dark mode ────────────────────────────────── */
function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
  const dark = saved !== null ? saved === 'true' : prefersDark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('dark-toggle').textContent = dark ? '☀' : '🌙';
}
function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('darkMode', String(!isDark));
  document.getElementById('dark-toggle').textContent = isDark ? '🌙' : '☀';
  // re-render visual tree for colors
  if (viewMode === 'vtree') renderVisualTree(currentList(), id => openDetail(id));
}

/* ── export / reset ───────────────────────────── */
function doExport() {
  const blob = new Blob([exportJSON()], {type:'application/json;charset=utf-8'});
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `silsilah_${Date.now()}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ JSON diunduh');
}

async function doReset() {
  if (!confirm('Reset semua data ke data awal? Semua perubahan hilang.')) return;
  try {
    const res = await fetch('./data/family.json');
    if (!res.ok) throw new Error('family.json tidak ditemukan');
    const data = await res.json();
    resetToDefault(data);
    expandedSet.clear();
    getAll().filter(m=>m.gen<=2).forEach(m=>expandedSet.add(m.id));
    toast('✓ Data direset');
    refresh();
  } catch(e) { toast(e.message,'error'); }
}

/* ── bind ────────────────────────────────────── */
function bind() {
  document.getElementById('btn-add').onclick = handleAdd;
  document.getElementById('btn-vtree').onclick = () => setView('vtree');
  document.getElementById('btn-ttree').onclick = () => setView('ttree');
  document.getElementById('btn-list').onclick  = () => setView('list');
  document.getElementById('btn-expand-all').onclick   = expandAll;
  document.getElementById('btn-collapse-all').onclick = collapseAll;
  document.getElementById('btn-zoom-in').onclick  = () => setZoom(zoomLevel+0.15);
  document.getElementById('btn-zoom-out').onclick = () => setZoom(zoomLevel-0.15);
  document.getElementById('btn-zoom-reset').onclick = () => setZoom(1);
  document.getElementById('search-input').addEventListener('input', e => handleSearch(e.target.value));
  document.getElementById('filter-parent').addEventListener('change', e => {
    filterPid = e.target.value; refresh();
  });
  document.getElementById('dark-toggle').onclick = toggleDark;
  document.getElementById('btn-export').onclick  = doExport;
  document.getElementById('btn-reset').onclick   = doReset;
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') {
      document.getElementById('detail-overlay').classList.remove('open');
      document.getElementById('confirm-overlay').classList.remove('open');
      document.getElementById('add-overlay').classList.remove('open');
    }
  });
}

/* ── init ────────────────────────────────────── */
async function init() {
  await bootstrap();
  initDarkMode();
  bind();
  getAll().filter(m=>m.gen<=2).forEach(m=>expandedSet.add(m.id));
  setView('vtree');
}

init();
