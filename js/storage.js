// storage.js — leitura/escrita no localStorage.
const KEY = 'dragonball_sheet_v1';
export const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
export const save = s => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); }
  catch { alert('Não foi possível salvar (limite do navegador). Tente uma foto menor.'); }
};
export const wipe = () => localStorage.removeItem(KEY);
