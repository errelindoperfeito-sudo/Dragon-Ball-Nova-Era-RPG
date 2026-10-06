// notes.js — aba Anotações com salvamento automático (debounce).
import { state, persist } from './state.js';
import { $, debounce } from './utils.js';

export function init() {
  const area = $('#notesArea'), st = $('#notesStatus');
  area.value = state.notes;
  const save = debounce(() => { state.notes = area.value; persist(); st.textContent = 'Salvo automaticamente'; });
  area.oninput = () => { st.textContent = 'Salvando...'; save(); };
}
