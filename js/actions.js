// actions.js — executa o custo/efeito/dano de habilidades e itens ativáveis sobre as barras de HP e Ki.
import { state } from './state.js';
import { barMax, stats } from './attributes.js';
import { hitChance } from './skills.js';
import { fmt } from './utils.js';
import { DMG_TYPES } from './effects.js';

const r2 = v => Math.round(v * 100) / 100;
const val = (e, k, bar) => { const v = e.fx[k] || 0; return e.fx.unit === '%' ? Math.round(barMax(bar) * Math.min(100, v) / 100) : Math.round(v); };
const costs = e => ({ki: val(e, 'ki', 'ki'), hp: val(e, 'hp', 'hp')});

// Dano calculado de uma habilidade de ataque: pontos totais do atributo × % + fixo. Acerto: Velocity (Melee) ou Precisão (Ki).
export function damageInfo(e) {
  const d = e.fx.dmg; if (!d?.on || !DMG_TYPES.includes(e.type)) return null; // Passiva/Suporte não causam dano
  const S = stats(), melee = d.base === 'meleeDmg';
  return {per: r2((S.T[d.base] || 0) * (d.pct || 0) / 100 + (d.flat || 0)), shots: Math.max(1, Math.floor(d.shots) || 1),
    chance: melee ? S.chance : hitChance('precisao'), src: melee ? 'Velocity' : 'Precisão', costEq: !!d.costEq};
}

function pay(c) {
  if (state.ki < c.ki) return `Ki insuficiente: precisa de ${fmt(c.ki)} e você tem ${fmt(state.ki)}.`;
  if (c.hp && state.hp <= c.hp) return `HP insuficiente: o custo (${c.hp}) deixaria você sem vida (HP atual ${state.hp}).`;
  state.ki = r2(state.ki - c.ki); state.hp = r2(state.hp - c.hp);
  return null;
}
const spent = c => [c.ki && `−${fmt(c.ki)} Ki`, c.hp && `−${fmt(c.hp)} HP`].filter(Boolean).join(', ');

// Ativar / Usar / Desativar. `hits` = disparos que acertaram (só para barrage). Retorna {ok, msg} para exibir no card.
export function useEntry(e, kind, hits) {
  if (e.mode !== 'active') return {ok: true, msg: ''};
  const sustained = e.fx.dur !== 'instant', perTurn = sustained && e.fx.when === 'turn';
  if (sustained && e.on) { e.on = false; return {ok: true, msg: 'Desativada.'}; }
  if (e.used) return {ok: false, msg: 'Item marcado como usado/consumido.'};
  if (kind === 'items' && e.fx.consume && e.qty < 1) return {ok: false, msg: 'Sem unidades disponíveis.'};
  const di = kind === 'abilities' ? damageInfo(e) : null;
  let n = 1;
  if (di && di.shots > 1) {
    const x = Number(hits);
    if (hits === '' || hits == null || !Number.isInteger(x) || x < 0 || x > di.shots) return {ok: false, msg: `Informe quantos disparos acertaram (0 a ${di.shots}) — os dados que deram 2.`};
    n = x;
  }
  const base = perTurn ? {ki: 0, hp: 0} : costs(e);
  const c = di && di.costEq && !perTurn ? {ki: r2(di.per * n), hp: base.hp} : base;
  const err = pay(c); if (err) return {ok: false, msg: err};
  const gKi = val(e, 'gKi', 'ki'), gHp = val(e, 'gHp', 'hp');
  state.ki = Math.min(barMax('ki'), r2(state.ki + gKi)); state.hp = Math.min(barMax('hp'), r2(state.hp + gHp));
  if (kind === 'items' && e.fx.consume) e.qty -= 1;
  if (sustained) e.on = true;
  const parts = [spent(c), gKi && `+${fmt(gKi)} Ki`, gHp && `+${fmt(gHp)} HP`, kind === 'items' && e.fx.consume && '−1 unidade',
    di && `Dano: ${fmt(r2(di.per * n))}` + (di.shots > 1 ? ` (${n}/${di.shots} acertos)` : ''), di && `acerto: tire ≤ ${di.chance} (${di.src})`].filter(Boolean);
  return {ok: true, msg: (sustained ? 'Ativada' : 'Usada') + (parts.length ? ': ' + parts.join(' · ') : '.')};
}

// Custo por turno de uma habilidade sustentada ativa.
export function payTurn(e) {
  const c = costs(e), err = pay(c);
  return err ? {ok: false, msg: err} : {ok: true, msg: 'Turno pago: ' + (spent(c) || 'sem custo') + '.'};
}
