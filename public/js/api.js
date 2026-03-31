/**
 * api.js — Data layer
 * Loads from data/family.json on first run,
 * then persists all changes to localStorage.
 */

const STORAGE_KEY = 'kromohardjo_v2';
const JSON_URL    = './data/family.json';

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

/* bootstrap: load seed JSON once, then always use localStorage */
async function bootstrap() {
  if (localStorage.getItem(STORAGE_KEY)) return getAll();
  try {
    const res = await fetch(JSON_URL);
    if (!res.ok) throw new Error();
    const data = await res.json();
    saveAll(data);
    return data;
  } catch {
    saveAll([]);
    return [];
  }
}

function getAll() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
function getById(id) {
  return getAll().find(m => m.id === id) || null;
}
function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* CRUD */
function create(data) {
  const list = getAll();
  const m = { id: genId(), ...data };
  list.push(m);
  saveAll(list);
  return m;
}
function update(id, patch) {
  const list = getAll();
  const i = list.findIndex(m => m.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  saveAll(list);
  return list[i];
}
function remove(id) {
  let list = getAll();
  const t = list.find(m => m.id === id);
  if (!t) return false;
  list = list.filter(m => m.id !== id)
             .map(m => m.parentId === id ? { ...m, parentId: t.parentId } : m);
  saveAll(list);
  return true;
}

/* search */
function search(q) {
  const lq = q.trim().toLowerCase();
  if (!lq) return getAll();
  return getAll().filter(m =>
    m.name.toLowerCase().includes(lq) ||
    (m.spouse && m.spouse.toLowerCase().includes(lq)) ||
    (m.notes  && m.notes.toLowerCase().includes(lq))
  );
}

/* tree */
function buildTree(list, parentId = null) {
  return (list || getAll())
    .filter(m => (m.parentId ?? null) === parentId)
    .map(m => ({ ...m, children: buildTree(list || getAll(), m.id) }))
    .sort((a,b) => (a.gen??99)-(b.gen??99) || a.name.localeCompare(b.name));
}

/* export / reset */
function exportJSON() { return JSON.stringify(getAll(), null, 2); }
function resetToDefault(data) { saveAll(data); }

/* stats */
function getStats() {
  const all = getAll();
  return {
    total:    all.length,
    deceased: all.filter(m => m.deceased).length,
    married:  all.filter(m => m.spouse).length,
    alive:    all.filter(m => !m.deceased).length,
    gens:     [...new Set(all.map(m => m.gen))].length,
  };
}

export {
  bootstrap, getAll, getById, saveAll,
  create, update, remove,
  search, buildTree,
  exportJSON, resetToDefault, getStats,
};
