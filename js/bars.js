// bars.js — barras de HP/Ki: botões %, edição manual e limites.
import { state, commit } from './state.js';
import { barMax } from './attributes.js';
import { $, $$, h, clamp, applyInput, inlineEdit } from './utils.js';

export function clampBars() {
  for (const k of ['hp', 'ki']) {
    const m = barMax(k);
    state[k] = state[k] == null ? m : clamp(Math.round(state[k]), 0, m);
  }
}
function byPercent(k, p) {
  const m = barMax(k), cur = state[k] ?? m;
  const d = Math.max(m ? 1 : 0, Math.round(m * Math.abs(p) / 100));
  state[k] = clamp(cur + Math.sign(p) * d, 0, m);
  commit();
}
export function initBars() {
  $$('[data-bar]').forEach(sec => {
    const k = sec.dataset.bar;
    [-100, -50, -10, -5].forEach(p => $('.neg', sec).append(h('button', {onclick: () => byPercent(k, p), textContent: p + '%'})));
    [5, 10, 50, 100].forEach(p => $('.pos', sec).append(h('button', {onclick: () => byPercent(k, p), textContent: '+' + p + '%'})));
    inlineEdit($('.val', sec), txt => {
      const n = applyInput(txt, state[k]);
      if (n != null) { state[k] = n; commit(); }
    });
  });
}
