// sidebar.js — menu lateral com a lista de fichas (abrir, criar e deletar com confirmação).
import { summaries, switchTo, createSheet, deleteSheet } from './sheets.js';
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

export function init() {
  $('#sheetsBtn').onclick = () => setOpen(!isOpen());
  $('#sidebarClose').onclick = () => setOpen(false);
  $('#sidebarOverlay').onclick = () => setOpen(false);
  $('#newSheet').onclick = () => { createSheet(); setOpen(false); $('#nameInput').focus(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen() && !$('#confirmDlg').open) setOpen(false); });
}
