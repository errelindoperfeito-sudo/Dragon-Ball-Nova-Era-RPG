// state.js — fonte única da verdade. commit() = notifica os módulos de render e salva.
import { ATTRS } from './utils.js';
import { RACES } from './races.js';
import { load, save } from './storage.js';

const defaults = () => ({name:'', race:'humano', mutant:false, level:1, xp:0,
  base:Object.fromEntries(ATTRS.map(a => [a, 0])), hp:null, ki:null, form:null, techs:[],
  avatar:null, abilities:[], items:[], notes:'', tab:'ficha'});

const d = defaults(), saved = load() || {};
export const state = {...d, ...saved, base:{...d.base, ...(saved.base || {})}};
ATTRS.forEach(a => state.base[a] = Math.max(0, Number(state.base[a]) || 0));
if (!RACES[state.race]) state.race = 'humano';

const subs = [];
export const subscribe = f => subs.push(f);
export const persist = () => save(state);
export const commit = () => { subs.forEach(f => f()); persist(); };
