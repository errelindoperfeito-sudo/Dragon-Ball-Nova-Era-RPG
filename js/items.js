// items.js — CRUD da aba Itens.
import { state, persist } from './state.js';
import { $, h, field, sel } from './utils.js';

const CATS = ['Consumível', 'Equipamento', 'Especial', 'Outro'];
const card = it => {
  const upd = k => e => { it[k] = e.target.value; persist(); };
  const el = h('article', {class: 'card item' + (it.used ? ' used' : '')},
    h('div', {class: 'row'}, field('Nome', h('input', {type: 'text', value: it.name, oninput: upd('name')})), field('Quantidade', h('input', {type: 'number', min: 0, value: it.qty, oninput: upd('qty')}))),
    field('Categoria', sel(CATS, it.cat, upd('cat'))),
    field('Descrição / efeito', h('textarea', {value: it.desc, oninput: upd('desc')})),
    h('div', {class: 'foot'},
      h('label', {class: 'check'}, h('input', {type: 'checkbox', checked: !!it.used, onchange: e => { it.used = e.target.checked; el.classList.toggle('used', it.used); persist(); }}), 'Usado/consumido'),
      h('button', {class: 'danger mini', textContent: 'Remover', onclick: () => { if (confirm('Remover item?')) { state.items = state.items.filter(x => x !== it); persist(); render(); } }})));
  return el;
};
export function render() {
  $('#itemsList').replaceChildren(...state.items.map(card));
  $('#itemsEmpty').hidden = state.items.length > 0;
}
export function init() {
  $('#addItem').onclick = () => { state.items.push({name: '', qty: 1, cat: 'Consumível', desc: '', used: false}); persist(); render(); };
  render();
}
