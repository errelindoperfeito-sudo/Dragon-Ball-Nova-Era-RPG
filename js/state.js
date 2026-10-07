// state.js — fonte única da verdade. commit() = notifica os módulos de render e salva.
// `state` é SEMPRE a ficha ativa (o objeto é o mesmo; ao trocar de ficha o conteúdo é substituído).
import { ATTRS, newId, clamp } from './utils.js';
import { RACES, CUSTOM_ID, defaultCustom, sanitizeCustom } from './races.js';
import { loadStore, saveStore } from './storage.js';

export const defaults = () => ({name:'', race:'humano', mutant:false, level:1, xp:0,
  base:Object.fromEntries(ATTRS.map(a => [a, 0])), hp:null, ki:null, form:null, techs:[],
  absorbed:Object.fromEntries(ATTRS.map(a => [a, 0])), pericias:{}, custom:defaultCustom(), avatar:null, abilities:[], items:[], notes:'', tab:'ficha'});

// Completa campos que faltam (fichas antigas) e corrige valores inválidos.
function normalize(saved = {}) {
  const d = defaults(), s = {...d, ...saved, base:{...d.base, ...(saved.base || {})}, absorbed:{...d.absorbed, ...(saved.absorbed || {})}, pericias:{...(saved.pericias || {})}, custom:sanitizeCustom(saved.custom ?? d.custom)};
  ATTRS.forEach(a => s.base[a] = Math.max(0, Number(s.base[a]) || 0));
  for (const k of Object.keys(s.pericias)) s.pericias[k] = clamp(Math.floor(Number(s.pericias[k]) || 0), 0, 40); // perícias: sempre entre 0 e 40
  if (s.race !== CUSTOM_ID && !RACES[s.race]) s.race = 'humano';
  return s;
}

// Lista de fichas: { activeId, sheets: [{ id, data }] }. Só a ficha ativa fica "viva" em `state`.
export const store = loadStore() || { activeId: null, sheets: [{ id: newId(), data: {} }] };
if (!store.sheets.some(s => s.id === store.activeId)) store.activeId = store.sheets[0].id;

export const state = normalize(store.sheets.find(s => s.id === store.activeId).data);
export const setState = data => { Object.keys(state).forEach(k => delete state[k]); Object.assign(state, normalize(data)); };

const subs = [];
export const subscribe = f => subs.push(f);
export const persist = () => saveStore({ activeId: store.activeId, sheets: store.sheets.map(s => s.id === store.activeId ? { id: s.id, data: state } : s) });
export const commit = () => { subs.forEach(f => f()); persist(); };
