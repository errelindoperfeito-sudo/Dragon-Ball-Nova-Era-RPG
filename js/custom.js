// custom.js — editor da "Custom Race": nome, descrição, bônus de atributos e transformações próprias.
// Tudo é gravado em state.custom (dentro da ficha) a cada alteração, então fica salvo no localStorage.
import { state, commit } from './state.js';
import { syncUnlocks } from './level.js';
import { CUSTOM_GAINS, newForm } from './races.js';
import { ATTRS, LABEL, LEVEL_MAX, $, h, field, clamp } from './utils.js';

const MAXV = 99999;
const upd = () => { syncUnlocks(); commit(); };

// Campo numérico ligado a map[key]. Vazio, 0 (ou o valor neutro) = sem efeito; negativos viram 0; teto em MAXV.
function num(map, key, {neutral = 0, ph = '0'} = {}) {
  return h('input', {type: 'number', min: 0, max: MAXV, step: 'any', placeholder: ph, value: map[key] ?? '',
    oninput: e => {
      const raw = e.target.value;
      if (raw === '') delete map[key];
      else {
        const v = clamp(Number(raw) || 0, 0, MAXV);
        if (v !== Number(raw)) e.target.value = v;
        if (v === neutral || v <= 0) delete map[key]; else map[key] = v;
      }
      upd();
    }});
}
const grid = (map, opts) => h('div', {class: 'cust-grid'}, ATTRS.map(a => field(LABEL[a], num(map, a, opts))));
const text = (o, k, max) => h('input', {type: 'text', maxLength: max, value: o[k] || '', oninput: e => { o[k] = e.target.value; upd(); }});
const area = (o, k, max, ph = '') => h('textarea', {maxLength: max, placeholder: ph, value: o[k] || '', oninput: e => { o[k] = e.target.value; upd(); }});
const select = (opts, val, fn) => h('select', {onchange: e => fn(e.target.value)}, opts.map(([v, l]) => h('option', {value: v, textContent: l, selected: v === val})));

// Atalho: preenche os 5 atributos de combate (sem HP/Ki Max) com o mesmo valor.
function quick(map, neutral) {
  const i = h('input', {type: 'number', min: 0, max: MAXV, placeholder: 'valor'});
  return h('div', {class: 'cust-quick'}, h('span', {}, 'Atalho:'), i,
    h('button', {textContent: 'Aplicar em todos (exceto HP/Ki Max)', onclick: () => {
      const v = clamp(Number(i.value) || 0, 0, MAXV);
      ATTRS.slice(2).forEach(a => { if (v > 0 && v !== neutral) map[a] = v; else delete map[a]; });
      upd(); build();
    }}));
}

function formCard(c, f, i) {
  let armed = false;
  const rm = h('button', {class: 'danger mini', textContent: '🗑 Remover transformação', onclick: () => {
    if (!armed) { armed = true; rm.textContent = 'Clique de novo para confirmar'; setTimeout(() => { armed = false; rm.textContent = '🗑 Remover transformação'; }, 3000); return; }
    c.forms.splice(i, 1); upd(); build();
  }});
  return h('article', {class: 'card cust'},
    h('h3', {}, `⚡ Transformação ${i + 1}`),
    h('div', {class: 'cust-row'},
      field('Nome da transformação', text(f, 'name', 40)),
      field(`Nível que desbloqueia (1 a ${LEVEL_MAX})`, h('input', {type: 'number', min: 1, max: LEVEL_MAX, value: f.lvl, oninput: e => {
        if (e.target.value === '') return;
        f.lvl = clamp(Math.floor(Number(e.target.value) || 1), 1, LEVEL_MAX); e.target.value = f.lvl; upd();
      }}))),
    h('div', {class: 'cust-ki'},
      field('Gasto de Ki', num(f.kiCost, 'val')),
      field('Medido em', select([['%', '% da barra de Ki'], ['pts', 'pontos de Ki']], f.kiCost.unit, v => { f.kiCost.unit = v; upd(); })),
      field('Cobrado', select([['activate', 'ao ativar'], ['turn', 'por turno'] ], f.kiCost.when, v => { f.kiCost.when = v; upd(); }))),
    field('Descrição', area(f, 'desc', 400, 'Como a transformação funciona, aparência, restrições...')),
    h('h4', {}, 'Bônus em pontos (+)'), grid(f.add), quick(f.add, 0),
    h('h4', {}, 'Multiplicadores (×) — aplicados depois dos pontos. Vazio ou 1 = sem multiplicador'), grid(f.mult, {neutral: 1, ph: '1'}), quick(f.mult, 1),
    rm);
}

function build() {
  const c = state.custom;
  $('#customDlgBody').replaceChildren(
    h('h2', {}, '🛠 Custom Race'),
    h('p', {class: 'absorb-rules'}, 'Monte sua raça: passiva, bônus de atributos e transformações próprias. Tudo é salvo automaticamente nesta ficha.'),
    h('section', {class: 'card cust'},
      h('h3', {}, 'Raça'),
      field('Nome da raça', text(c, 'name', 30)),
      field('Descrição / passiva racial (aparece na ficha)', area(c, 'desc', 600, 'Ex.: Regeneração: recupera 10% do HP por turno...')),
      field('Ganho de pontos por nível', select(CUSTOM_GAINS.map((g, i) => [String(i), g.label]), String(c.gain), v => { c.gain = Number(v); upd(); })),
      h('h4', {}, 'Passivas nos atributos — bônus iniciais em pontos'), grid(c.bonus)),
    h('div', {class: 'toolbar'}, h('h3', {}, `Transformações (${c.forms.length})`),
      h('button', {textContent: '+ Adicionar transformação', onclick: () => { c.forms.push(newForm(c.forms.length + 1)); upd(); build(); }})),
    ...(c.forms.length ? c.forms.map((f, i) => formCard(c, f, i)) : [h('p', {class: 'empty'}, 'Nenhuma transformação criada ainda.')]),
    h('div', {class: 'dlg-actions'}, h('button', {textContent: 'Fechar', onclick: () => $('#customDlg').close()})));
}

export function openCustom() {
  build();
  if (!$('#customDlg').open) $('#customDlg').showModal();
}
