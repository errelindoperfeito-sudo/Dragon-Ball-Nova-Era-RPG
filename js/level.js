// level.js — nível derivado do XP (mín. 1, máx. 350), subida/descida e liberação de formas.
import { state, commit } from './state.js';
import { clamp } from './utils.js';
import { getTransforms } from './transformations.js';
import { TECHS } from './techniques.js';

export const MIN = 1, MAX = 350;
export const need = l => 100 + (l - 1) * 10; // XP necessário no nível l (ajuste aqui a curva)

export function addXp(delta) {
  let xp = state.xp + delta, l = state.level;
  const old = l;
  while (xp >= need(l) && l < MAX) { xp -= need(l); l++; }
  while (xp < 0 && l > MIN) { l--; xp += need(l); }
  state.level = l;
  state.xp = clamp(Math.round(xp), 0, need(l));
  if (l !== old) syncUnlocks();
  commit();
  if (l > old) document.dispatchEvent(new CustomEvent('levelup'));
}

// Desativa formas/técnicas que o nível atual não permite mais.
export function syncUnlocks() {
  const f = getTransforms(state.race, state.mutant).find(t => t.id === state.form);
  if (!f || f.lvl > state.level) state.form = null;
  state.techs = state.techs.filter(id => { const t = TECHS.find(x => x.id === id); return t && t.lvl <= state.level; });
}
