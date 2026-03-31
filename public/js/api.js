/**
 * api.js — Data layer
 * Loads from data/family.json on first run,
 * persists everything to localStorage afterward.
 */

const STORAGE_KEY = 'kromohardjo_family';
const JSON_URL    = './data/family.json';

/* ── helpers ─────────────────────────────────── */
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ── bootstrap ───────────────────────────────── */
async function bootstrap() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);

  try {
    const res  = await fetch(JSON_URL);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch {
    // offline / static host without the file — return empty seed
    const seed = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

/* ── read ────────────────────────────────────── */
function getAll() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function getById(id) {
  return getAll().find(m => m.id === id) || null;
}

/* ── write helpers ───────────────────────────── */
function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* ── CRUD ────────────────────────────────────── */
function create(data) {
  const list   = getAll();
  const member = { id: genId(), ...data };
  list.push(member);
  saveAll(list);
  return member;
}

function update(id, patch) {
  const list = getAll();
  const idx  = list.findIndex(m => m.id === id);
  if (idx === -1) throw new Error(`Member ${id} not found`);
  list[idx] = { ...list[idx], ...patch };
  saveAll(list);
  return list[idx];
}

function remove(id) {
  let list = getAll();
  // re-parent children to removed node's parent
  const target = list.find(m => m.id === id);
  if (!target) return false;
  list = list
    .filter(m => m.id !== id)
    .map(m => m.parentId === id ? { ...m, parentId: target.parentId } : m);
  saveAll(list);
  return true;
}

/* ── search / filter ─────────────────────────── */
function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return getAll();
  return getAll().filter(m =>
    m.name.toLowerCase().includes(q)  ||
    (m.spouse && m.spouse.toLowerCase().includes(q)) ||
    (m.notes  && m.notes.toLowerCase().includes(q))
  );
}

function filterByParent(parentId) {
  if (!parentId || parentId === '__all__') return getAll();
  return getAll().filter(m => m.parentId === parentId);
}

/* ── tree builder ────────────────────────────── */
function buildTree(list = getAll(), parentId = null) {
  return list
    .filter(m => m.parentId === parentId)
    .map(m => ({ ...m, children: buildTree(list, m.id) }))
    .sort((a, b) => (a.gen ?? 99) - (b.gen ?? 99) || a.name.localeCompare(b.name));
}

/* ── import / export ─────────────────────────── */
function exportJSON() {
  return JSON.stringify(getAll(), null, 2);
}

function importJSON(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (!Array.isArray(data)) throw new Error('JSON harus berupa array');
  saveAll(data);
  return data;
}

function resetToDefault(data) {
  saveAll(data);
}

export {
  bootstrap, getAll, getById,
  create, update, remove,
  search, filterByParent, buildTree,
  exportJSON, importJSON, resetToDefault,
};
