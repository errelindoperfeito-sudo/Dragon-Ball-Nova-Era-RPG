// notes.js — aba Anotações com salvamento automático (debounce).
import { state, persist } from './state.js';
import { $, debounce } from './utils.js';

// Recarrega o texto da ficha ativa (usado ao trocar de ficha).
export const refresh = () => { $('#notesArea').value = state.notes; $('#notesStatus').textContent = 'Salvo automaticamente'; };

export function init() {
  const area = $('#notesArea'), st = $('#notesStatus');
  refresh();
  const save = debounce(() => { persist(); st.textContent = 'Salvo automaticamente'; });
  area.oninput = () => { state.notes = area.value; st.textContent = 'Salvando...'; save(); }; // grava no estado na hora: não vaza para outra ficha
}
