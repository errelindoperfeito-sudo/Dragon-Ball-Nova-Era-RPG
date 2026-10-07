// sheets.js — lógica de várias fichas: criar, alternar, deletar e resetar (sem DOM).
import { state, store, setState, persist, normalize } from './state.js';
import { syncUnlocks } from './level.js';
import { getRace } from './races.js';
import { newId } from './utils.js';

const clone = o => JSON.parse(JSON.stringify(o));
const current = () => store.sheets.find(s => s.id === store.activeId);
// Guarda um retrato da ficha ativa antes de sair dela.
const snapshot = () => { const c = current(); if (c) c.data = clone(state); };
// Avisa o resto do app que a ficha ativa mudou (main.js atualiza abas, anotações, painéis...).
const activated = () => { syncUnlocks(); document.dispatchEvent(new CustomEvent('sheetchange')); };

export const summaries = () => store.sheets.map(s => {
  const active = s.id === store.activeId, d = active ? state : s.data;
  return { id: s.id, active, name: (d.name || '').trim(), race: getRace(d.race, d.custom).name, level: d.level || 1, avatar: d.avatar || null };
});

export function switchTo(id) {
  const target = store.sheets.find(s => s.id === id);
  if (!target || id === store.activeId) return;
  snapshot();
  store.activeId = id; setState(target.data); activated();
}

export function createSheet() {
  snapshot();
  const s = { id: newId(), data: {} };
  store.sheets.push(s); store.activeId = s.id; setState(s.data); activated();
}

export function deleteSheet(id) {
  const i = store.sheets.findIndex(s => s.id === id);
  if (i < 0) return;
  store.sheets.splice(i, 1);
  if (id !== store.activeId) return persist();
  if (!store.sheets.length) store.sheets.push({ id: newId(), data: {} }); // era a última: nasce uma ficha em branco
  const next = store.sheets[Math.min(i, store.sheets.length - 1)];
  store.activeId = next.id; setState(next.data); activated();
}

// Zera só a ficha ativa (as outras não são afetadas).
export function resetActive() { setState({}); activated(); }

// ---------- backup: exportar / importar fichas em arquivo JSON ----------
export const FORMAT = 'ficha-dragonball';

// Monta o conteúdo do arquivo (todas as fichas, ou só as de `ids`). A foto vai embutida (base64).
export function exportPayload(ids) {
  snapshot();
  const sheets = store.sheets.filter(s => !ids || ids.includes(s.id)).map(s => ({ id: s.id, data: clone(s.data) }));
  return { app: FORMAT, version: 1, exportedAt: new Date().toISOString(), sheets };
}

// Lê o texto do arquivo e devolve [{id, data}] já validados/corrigidos. Lança Error com mensagem amigável se não servir.
export function parsePayload(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('O arquivo não é um JSON válido.'); }
  const raw = Array.isArray(obj?.sheets) ? obj.sheets : (obj && typeof obj === 'object' && ('race' in obj || 'base' in obj) ? [{ data: obj }] : null);
  if (!raw || !raw.length) throw new Error('Este arquivo não parece ser uma ficha do Dragon Ball RPG.');
  const seen = new Set();
  return raw.slice(0, 100).filter(x => x && typeof x.data === 'object' && x.data).map(x => {
    let id = typeof x.id === 'string' && x.id && x.id.length < 60 ? x.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    return { id, data: normalize(x.data) };
  });
}

export const conflictCount = list => list.filter(s => store.sheets.some(x => x.id === s.id)).length;

// Adiciona as fichas importadas. Se `replace`, as que têm o mesmo id de uma ficha existente a substituem; senão viram cópias.
export function importSheets(list, replace) {
  snapshot();
  let added = 0, replaced = 0, last = null;
  for (const it of list) {
    const ex = store.sheets.find(s => s.id === it.id);
    if (ex && replace) { ex.data = it.data; replaced++; last = ex; }
    else { last = { id: ex ? newId() : it.id, data: it.data }; store.sheets.push(last); added++; }
  }
  const target = list.length === 1 ? last : store.sheets.find(s => s.id === store.activeId); // 1 ficha: abre ela
  store.activeId = target.id; setState(target.data); activated();
  return { added, replaced };
}
