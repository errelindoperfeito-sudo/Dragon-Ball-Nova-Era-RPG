// attributes.js — cálculo de atributos em camadas (base → raça → transformação → técnica) e leituras rápidas.
import { state } from './state.js';
import { ATTRS, fmt } from './utils.js';
import { RACES } from './races.js';
import { getTransforms } from './transformations.js';
import { TECHS } from './techniques.js';

export const activeForm = () => getTransforms(state.race, state.mutant).find(t => t.id === state.form) || null;
export const activeTechs = () => TECHS.filter(t => state.techs.includes(t.id));

// Bônus fixos somam; multiplicadores vêm depois (transformação, depois técnicas em cadeia).
export function layers(a) {
  const R = RACES[state.race], f = activeForm(), ts = activeTechs();
  const base = state.base[a], race = (R.bonus[a] || 0) + (R.perLevelAll ? state.level : 0);
  const s1 = base + race;
  const s2 = (s1 + (f?.add[a] || 0)) * (f?.mult[a] || 1);
  const tAdd = ts.reduce((s, t) => s + (t.add[a] || 0), 0);
  const tMul = ts.reduce((m, t) => m * (t.mult[a] || 1), 1);
  const s3 = (s2 + tAdd) * tMul;
  return {base, race, form:s2 - s1, tech:s3 - s2, total:s3};
}

export function stats() {
  const L = {}, T = {};
  for (const a of ATTRS) { L[a] = layers(a); T[a] = L[a].total; }
  return {L, T, hpTotal:Math.round(T.hpMax * 5), kiTotal:Math.round(T.kiMax * 5),
    chance:Math.min(75, 50 + Math.floor(T.vel / 20))};
}
export const barMax = k => stats()[k === 'hp' ? 'hpTotal' : 'kiTotal'];

// "Leitura rápida" ao lado de cada atributo.
export function reads(a, S) {
  const t = S.T[a], m = t * 0.7;
  switch (a) {
    case 'kiMax': return [['Carregar Ki (+10%/turno)', fmt(S.kiTotal * 0.1)]];
    case 'meleeDmg': return [['Dano bruto', fmt(m)]];
    case 'kiDmg': return [['Dano bruto', fmt(m)], ['Ki Blast (10%)', fmt(t * 0.1)], ['Ki Blast carregada (40%)', fmt(t * 0.4)], ['Barrage', (RACES[state.race].barrage || 5) + 'd2']];
    case 'meleeRes': case 'kiRes': return [['Redução passiva', fmt(m * 0.7)], ['Redução ativa', fmt(m * 1.7)], ['Dano mínimo que passa', '10%']];
    case 'vel': return [['Chance de acerto', S.chance + '%'], ['Redução na esquiva', fmt(m * 1.5)]];
    default: return [];
  }
}
