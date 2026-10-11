// guia.js — monta a seção de Raças do Guia a partir dos mesmos dados que a ficha usa (sempre em sincronia).
import { RACES } from './races.js';
import { getTransforms } from './transformations.js';
import { describe, BASE_BAR, h } from './utils.js';

const bonus = r => describe({add: r.bonus}) || 'nenhum';
function table(forms) {
  return h('table', {class: 'g-table'}, h('tr', {}, h('th', {}, 'Transformação'), h('th', {}, 'Nível'), h('th', {}, 'Efeito')),
    forms.map(f => h('tr', {}, h('td', {}, f.name), h('td', {}, String(f.lvl)), h('td', {}, f.desc || describe(f) || '—'))));
}
function raceBlock(id) {
  const r = RACES[id], forms = getTransforms(id, false), mut = id === 'saiyajin' ? getTransforms(id, true) : [];
  return h('article', {class: 'g-race'},
    h('h3', {}, r.name),
    h('ul', {},
      h('li', {}, h('b', {}, 'Bônus iniciais: '), bonus(r)),
      h('li', {}, h('b', {}, 'Pontos por nível: '), r.gain),
      h('li', {}, h('b', {}, 'Passiva: '), r.passive)),
    forms.length ? [h('h4', {}, id === 'saiyajin' ? 'Transformações (Saiyajin padrão)' : 'Transformações'), table(forms)] : h('p', {class: 'mu'}, 'Não possui transformações.'),
    mut.length ? [h('h4', {}, 'Transformações (Saiyajin Mutante / Berserker)'), table(mut)] : null);
}
document.getElementById('racasBody').replaceChildren(...Object.keys(RACES).map(raceBlock));
document.getElementById('g-base').textContent = BASE_BAR;
