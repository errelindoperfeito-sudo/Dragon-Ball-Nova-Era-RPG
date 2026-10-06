// abilities.js — CRUD da aba Habilidades (edição direta nos cards, salvamento automático).
import { state, persist } from './state.js';
import { $, h, field, sel } from './utils.js';

const TIPOS = ['Melee', 'Ki', 'Suporte', 'Outro'];
const card = a => {
  const upd = k => e => { a[k] = e.target.value; persist(); };
  return h('article', {class: 'card ability'},
    h('div', {class: 'row'}, field('Nome', h('input', {value: a.name, oninput: upd('name')})), field('Tipo', sel(TIPOS, a.type, upd('type')))),
    field('Custo em Ki', h('input', {value: a.cost, oninput: upd('cost'), placeholder: 'ex: 20'})),
    field('Descrição / efeito', h('textarea', {value: a.desc, oninput: upd('desc')})),
    field('Observações', h('textarea', {value: a.obs, oninput: upd('obs')})),
    h('button', {class: 'del danger mini', textContent: 'Remover', onclick: () => { if (confirm('Remover habilidade?')) { state.abilities = state.abilities.filter(x => x !== a); persist(); render(); } }}));
};
export function render() {
  $('#abilitiesList').replaceChildren(...state.abilities.map(card));
  $('#abilitiesEmpty').hidden = state.abilities.length > 0;
}
export function init() {
  $('#addAbility').onclick = () => { state.abilities.push({name: '', type: 'Ki', cost: '', desc: '', obs: ''}); persist(); render(); };
  render();
}
