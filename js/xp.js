// xp.js — barra de XP: botões ±10 e edição manual.
import { state } from './state.js';
import { addXp } from './level.js';
import { $, applyInput, inlineEdit } from './utils.js';

export function initXp() {
  $('#xpMinus').onclick = () => addXp(-10);
  $('#xpPlus').onclick = () => addXp(10);
  inlineEdit($('#xpBar .val'), txt => {
    const n = applyInput(txt, state.xp); // "+50"/"-20" somam; "340" define o XP do nível atual
    if (n != null) addXp(n - state.xp);
  });
}
