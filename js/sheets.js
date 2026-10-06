// sheets.js — lógica de várias fichas: criar, alternar, deletar e resetar (sem DOM).
import { state, store, setState, persist } from './state.js';
import { syncUnlocks } from './level.js';
import { RACES } from './races.js';
import { newId } from './utils.js';

const clone = o => JSON.parse(JSON.stringify(o));
const current = () => store.sheets.find(s => s.id === store.activeId);
// Guarda um retrato da ficha ativa antes de sair dela.
const snapshot = () => { const c = current(); if (c) c.data = clone(state); };
// Avisa o resto do app que a ficha ativa mudou (main.js atualiza abas, anotações, painéis...).
const activated = () => { syncUnlocks(); document.dispatchEvent(new CustomEvent('sheetchange')); };

export const summaries = () => store.sheets.map(s => {
  const active = s.id === store.activeId, d = active ? state : s.data;
  return { id: s.id, active, name: (d.name || '').trim(), race: (RACES[d.race] || RACES.humano).name, level: d.level || 1, avatar: d.avatar || null };
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
