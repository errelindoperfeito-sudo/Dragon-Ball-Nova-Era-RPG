// attributes.js — cálculo de atributos em camadas (base → raça → transformação → técnica) e leituras rápidas.
import { state } from './state.js';
import { ATTRS, BASE_BAR, fmt } from './utils.js';
import { RACES } from './races.js';
import { getTransforms } from './transformations.js';
import { TECHS } from './techniques.js';

export const activeForm = () => getTransforms(state.race, state.mutant).find(t => t.id === state.form) || null;
export const activeTechs = () => TECHS.filter(t => state.techs.includes(t.id));

// Bônus fixos somam; multiplicadores vêm depois (transformação, depois técnicas em cadeia).
export function layers(a) {
  const R = RACES[state.race], f = activeForm(), ts = activeTechs();
  const base = state.base[a], race = (R.bonus[a] || 0) + (R.perLevelAll ? state.level : 0);
  const absorb = R === RACES.majin ? (state.absorbed[a] || 0) : 0; // Absorção do Majin (permanente)
  const s1 = base + race + absorb;
  const s2 = (s1 + (f?.add[a] || 0)) * (f?.mult[a] || 1);
  const tAdd = ts.reduce((s, t) => s + (t.add[a] || 0), 0);
  const tMul = ts.reduce((m, t) => m * (t.mult[a] || 1), 1);
  const s3 = (s2 + tAdd) * tMul;
  return {base, race, absorb, form:s2 - s1, tech:s3 - s2, total:s3};
}

export function stats() {
  const L = {}, T = {};
  for (const a of ATTRS) { L[a] = layers(a); T[a] = L[a].total; }
  return {L, T, hpTotal:BASE_BAR + Math.round(T.hpMax * 5), kiTotal:BASE_BAR + Math.round(T.kiMax * 5),
    chance:Math.min(75, 50 + Math.floor(T.vel / 20))};
}
export const barMax = k => stats()[k === 'hp' ? 'hpTotal' : 'kiTotal'];

// "Leitura rápida" ao lado de cada atributo.
export function reads(a, S) {
  const t = S.T[a], m = t * 0.7;
  switch (a) {
    case 'hpMax': return [['Barra base', '+' + BASE_BAR], ['Pontos × 5', '+' + fmt(t * 5)]];
    case 'kiMax': return [['Barra base', '+' + BASE_BAR], ['Pontos × 5', '+' + fmt(t * 5)], ['Carregar Ki (+10%/turno)', fmt(S.kiTotal * 0.1)]];
    case 'meleeDmg': return [['Dano bruto', fmt(m)]];
    case 'kiDmg': return [['Dano bruto', fmt(m)], ['Ki Blast (10%)', fmt(t * 0.1)], ['Ki Blast carregada (40%)', fmt(t * 0.4)], ['Barrage', (RACES[state.race].barrage || 5) + 'd2'],
      ['Ki Feixe — 1 mão (70%)', fmt(t * 0.7)], ['Ki Feixe — 2 mãos (90%)', fmt(t * 0.9)]];
    case 'meleeRes': case 'kiRes': return [['Redução passiva', fmt(m * 0.7)], ['Redução ativa', fmt(m * 1.7)], ['Dano mínimo que passa', '10%']];
    case 'vel': return [['Chance de acerto', S.chance + '%'], ['Redução na esquiva', fmt(m * 1.5)]];
    default: return [];
  }
}
