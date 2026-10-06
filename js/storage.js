// storage.js — leitura/escrita no localStorage (todas as fichas do jogador em uma única chave).
const KEY = 'dragonball_sheets_v2', OLD = 'dragonball_sheet_v1';

// Formato: { activeId, sheets: [{ id, data }] }. Se só existir a chave antiga (1 ficha), ela vira a primeira ficha.
export function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.sheets) && s.sheets.length) return s;
  } catch {}
  try {
    const old = JSON.parse(localStorage.getItem(OLD));
    if (old && typeof old === 'object') { const id = 's' + Date.now().toString(36); return { activeId: id, sheets: [{ id, data: old }] }; }
  } catch {}
  return null;
}
export function saveStore(store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); localStorage.removeItem(OLD); }
  catch { alert('Não foi possível salvar (limite do navegador). Tente uma foto menor ou delete fichas que não usa mais.'); }
}
