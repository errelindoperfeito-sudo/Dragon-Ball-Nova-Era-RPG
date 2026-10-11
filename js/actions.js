// actions.js — executa o custo/efeito de habilidades e itens ativáveis sobre as barras de HP e Ki.
import { state } from './state.js';
import { barMax } from './attributes.js';
import { fmt } from './utils.js';

const val = (e, k, bar) => { const v = e.fx[k] || 0; return e.fx.unit === '%' ? Math.round(barMax(bar) * Math.min(100, v) / 100) : Math.round(v); };
const costs = e => ({ki: val(e, 'ki', 'ki'), hp: val(e, 'hp', 'hp')});

function pay(c) {
  if (state.ki < c.ki) return `Ki insuficiente: precisa de ${c.ki} e você tem ${state.ki}.`;
  if (c.hp && state.hp <= c.hp) return `HP insuficiente: o custo (${c.hp}) deixaria você sem vida (HP atual ${state.hp}).`;
  state.ki -= c.ki; state.hp -= c.hp;
  return null;
}
const spent = c => [c.ki && `−${c.ki} Ki`, c.hp && `−${c.hp} HP`].filter(Boolean).join(', ');

// Ativar / Usar / Desativar. Retorna {ok, msg} para exibir no card.
export function useEntry(e, kind) {
  if (e.mode !== 'active') return {ok: true, msg: ''};
  const sustained = e.fx.dur !== 'instant';
  if (sustained && e.on) { e.on = false; return {ok: true, msg: 'Desativada.'}; }
  if (e.used) return {ok: false, msg: 'Item marcado como usado/consumido.'};
  if (kind === 'items' && e.fx.consume && e.qty < 1) return {ok: false, msg: 'Sem unidades disponíveis.'};
  const c = sustained && e.fx.when === 'turn' ? {ki: 0, hp: 0} : costs(e);
  const err = pay(c); if (err) return {ok: false, msg: err};
  const gKi = val(e, 'gKi', 'ki'), gHp = val(e, 'gHp', 'hp'), kiMax = barMax('ki'), hpMax = barMax('hp');
  state.ki = Math.min(kiMax, state.ki + gKi); state.hp = Math.min(hpMax, state.hp + gHp);
  if (kind === 'items' && e.fx.consume) e.qty -= 1;
  if (sustained) e.on = true;
  const parts = [spent(c), gKi && `+${fmt(gKi)} Ki`, gHp && `+${fmt(gHp)} HP`, kind === 'items' && e.fx.consume && '−1 unidade'].filter(Boolean);
  return {ok: true, msg: (sustained ? 'Ativada' : 'Usada') + (parts.length ? ': ' + parts.join(', ') : '.')};
}

// Custo por turno de uma habilidade sustentada ativa.
export function payTurn(e) {
  const c = costs(e), err = pay(c);
  return err ? {ok: false, msg: err} : {ok: true, msg: 'Turno pago: ' + (spent(c) || 'sem custo') + '.'};
}
