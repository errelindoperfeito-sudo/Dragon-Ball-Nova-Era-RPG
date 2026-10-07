// sidebar.js — menu lateral com a lista de fichas (abrir, criar e deletar com confirmação).
import { summaries, switchTo, createSheet, deleteSheet, exportPayload, parsePayload, conflictCount, importSheets } from './sheets.js';
import { DEFAULT_AVATAR } from './ui.js';
import { $, h } from './utils.js';

const isOpen = () => $('#sidebar').classList.contains('open');

function setOpen(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#sidebar').setAttribute('aria-hidden', String(!open));
  $('#sidebarOverlay').hidden = !open;
  $('#sheetsBtn').setAttribute('aria-expanded', String(open));
  if (open) render();
}

export function render() {
  if (!isOpen()) return;
  const list = summaries();
  $('#sheetsCount').textContent = list.length + (list.length === 1 ? ' ficha' : ' fichas');
  $('#sheetsList').replaceChildren(...list.map(s => h('li', {class: 'sheet' + (s.active ? ' on' : '')},
    h('button', {class: 'sheet-pick', title: 'Abrir esta ficha', onclick: () => { switchTo(s.id); setOpen(false); }},
      h('img', {src: s.avatar || DEFAULT_AVATAR, alt: ''}),
      h('span', {class: 'sheet-txt'}, h('b', {}, s.name || 'Sem nome'), h('small', {}, `${s.race} · Nível ${s.level}${s.active ? ' · aberta' : ''}`))),
    h('button', {class: 'sheet-dl mini', title: 'Baixar esta ficha (JSON)', 'aria-label': 'Baixar ficha ' + (s.name || 'sem nome'), textContent: '⬇', onclick: () => downloadSheets([s.id], s.name)}),
    h('button', {class: 'sheet-del danger mini', title: 'Deletar ficha', 'aria-label': 'Deletar ficha ' + (s.name || 'sem nome'), textContent: '🗑', onclick: () => askDelete(s)}))));
}

// Confirmação antes de deletar.
function askDelete(s) {
  const dlg = $('#confirmDlg'), last = summaries().length === 1;
  $('#confirmDlgBody').replaceChildren(h('h2', {}, 'Tem Certeza?'),
    h('p', {}, 'A ficha ', h('b', {}, s.name || 'Sem nome'), ' (' + s.race + ', nível ' + s.level + ') será apagada para sempre. Esta ação não pode ser desfeita.'),
    last ? h('p', {class: 'absorb-rules'}, 'É a sua única ficha: uma ficha em branco será criada no lugar.') : null,
    h('div', {class: 'dlg-actions'},
      h('button', {class: 'danger', textContent: 'Sim, deletar', onclick: () => { deleteSheet(s.id); dlg.close(); render(); }}),
      h('button', {textContent: 'Cancelar', onclick: () => dlg.close()})));
  dlg.showModal();
}

// ---------- backup em arquivo ----------
const slug = t => (t || 'ficha').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'ficha';
function downloadSheets(ids, name) {
  const blob = new Blob([JSON.stringify(exportPayload(ids), null, 2)], {type: 'application/json'});
  const file = ids ? slug(name) + '.json' : 'fichas-dragonball-' + new Date().toISOString().slice(0, 10) + '.json';
  const a = h('a', {href: URL.createObjectURL(blob), download: file});
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function info(title, msg) {
  const dlg = $('#confirmDlg');
  $('#confirmDlgBody').replaceChildren(h('h2', {}, title), h('p', {}, msg), h('div', {class: 'dlg-actions'}, h('button', {textContent: 'OK', onclick: () => dlg.close()})));
  dlg.showModal();
}
function finishImport(list, replace) {
  const r = importSheets(list, replace); render();
  info('Fichas carregadas', `${r.added} adicionada(s)` + (r.replaced ? ` e ${r.replaced} substituída(s)` : '') + '.');
}
async function onFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return info('Arquivo grande demais', 'O arquivo passa de 10 MB e não parece ser uma ficha.');
  let list;
  try { list = parsePayload(await file.text()); } catch (e) { return info('Não foi possível carregar', e.message); }
  if (!list.length) return info('Não foi possível carregar', 'Nenhuma ficha válida no arquivo.');
  const n = conflictCount(list), dlg = $('#confirmDlg');
  if (!n) return finishImport(list, false);
  $('#confirmDlgBody').replaceChildren(h('h2', {}, 'Fichas já existentes'),
    h('p', {}, `${n} de ${list.length} ficha(s) deste arquivo já existem aqui. O que fazer com elas?`),
    h('p', {class: 'absorb-rules'}, 'Substituir troca a ficha atual pela do arquivo (útil quando o mestre editou e devolveu). Cópias mantém as duas.'),
    h('div', {class: 'dlg-actions'},
      h('button', {class: 'danger', textContent: 'Substituir as existentes', onclick: () => { dlg.close(); finishImport(list, true); }}),
      h('button', {textContent: 'Manter ambas (criar cópias)', onclick: () => { dlg.close(); finishImport(list, false); }}),
      h('button', {textContent: 'Cancelar', onclick: () => dlg.close()})));
  dlg.showModal();
}

export function init() {
  $('#exportAll').onclick = () => downloadSheets();
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; onFile(f); };
  $('#sheetsBtn').onclick = () => setOpen(!isOpen());
  $('#sidebarClose').onclick = () => setOpen(false);
  $('#sidebarOverlay').onclick = () => setOpen(false);
  $('#newSheet').onclick = () => { createSheet(); setOpen(false); $('#nameInput').focus(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen() && !$('#confirmDlg').open) setOpen(false); });
}
