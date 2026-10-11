// calc.js — aba Calculadora: expressões com %, atalhos com valores da ficha, calculadora de dano recebido e anotações de valores.
import { state, persist } from './state.js';
import { stats } from './attributes.js';
import { $, h, field, fmt, debounce } from './utils.js';

// ---------- avaliador seguro (sem eval): + − × ÷ ^ ( ) e % ----------
// "50%" = 0,5 | "200 + 10%" = 220 (como na calculadora do celular) | "200 * 10%" = 20
export function evaluate(src) {
  const s = String(src).toLowerCase().replace(/,/g, '.').replace(/[×x]/g, '*').replace(/[÷:]/g, '/').replace(/\s+/g, '');
  if (!s) throw new Error('');
  if (s.length > 200) throw new Error('Expressão muito longa');
  let i = 0;
  const expr = () => {
    let l = term();
    while (s[i] === '+' || s[i] === '-') { const op = s[i++], r = term(), rv = r.p ? l.v * r.v : r.v; l = {v: op === '+' ? l.v + rv : l.v - rv, p: false}; }
    return l;
  };
  const term = () => {
    let l = factor();
    while (s[i] === '*' || s[i] === '/') { const op = s[i++], r = factor(); l = {v: op === '*' ? l.v * r.v : l.v / r.v, p: false}; }
    return l;
  };
  const factor = () => { const b = unary(); if (s[i] === '^') { i++; return {v: Math.pow(b.v, factor().v), p: false}; } return b; };
  const unary = () => {
    if (s[i] === '-') { i++; const u = unary(); return {v: -u.v, p: u.p}; }
    if (s[i] === '+') { i++; return unary(); }
    let x = primary();
    while (s[i] === '%') { i++; x = {v: x.v / 100, p: true}; }
    return x;
  };
  const primary = () => {
    if (s[i] === '(') { i++; const e = expr(); if (s[i++] !== ')') throw new Error('Falta fechar parêntese'); return e; }
    const m = /^(\d+(\.\d+)?|\.\d+)/.exec(s.slice(i));
    if (!m) throw new Error('Expressão inválida');
    i += m[0].length; return {v: parseFloat(m[0]), p: false};
  };
  const r = expr();
  if (i < s.length) throw new Error('Expressão inválida');
  if (!Number.isFinite(r.v)) throw new Error(r.v === Infinity || r.v === -Infinity ? 'Divisão por zero' : 'Resultado inválido');
  return r.v;
}
const show = v => String(+v.toFixed(6));
const num = el => { const n = parseFloat(String(el.value).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const out = (el, v, suffix = '') => { el.textContent = Number.isFinite(v) ? show(v) + suffix : '—'; };

let hist = [], expr, preview, histEl, chipsEl, notesArea, notesSt;

// ---------- calculadora principal ----------
function insert(txt) {
  const focused = document.activeElement === expr, a = focused ? expr.selectionStart : expr.value.length, b = focused ? expr.selectionEnd : expr.value.length;
  expr.value = expr.value.slice(0, a) + txt + expr.value.slice(b);
  const p = a + txt.length; expr.setSelectionRange(p, p); live();
}
function live() {
  preview.classList.remove('bad');
  if (!expr.value.trim()) { preview.textContent = ''; return; }
  try { preview.textContent = '= ' + show(evaluate(expr.value)); } catch { preview.textContent = ''; }
}
function equals() {
  if (!expr.value.trim()) return;
  try {
    const r = show(evaluate(expr.value));
    hist.unshift({e: expr.value.trim(), r}); hist = hist.slice(0, 8);
    expr.value = r; preview.textContent = '= ' + r; renderHist();
  } catch (e) { preview.classList.add('bad'); preview.textContent = e.message || 'Expressão inválida'; }
}
const renderHist = () => histEl.replaceChildren(...hist.map(x => h('button', {class: 'mini hist-item', title: 'Usar este resultado', textContent: `${x.e} = ${x.r}`, onclick: () => insert(x.r)})));

function keypad() {
  const keys = ['C', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '%', '+'];
  const act = {C: () => { expr.value = ''; live(); }, '⌫': () => { expr.value = expr.value.slice(0, -1); live(); }};
  return h('div', {class: 'keypad'}, keys.map(k => h('button', {class: /[÷×−+]/.test(k) ? 'op' : k === 'C' || k === '⌫' ? 'danger' : '', textContent: k,
    onclick: () => act[k] ? act[k]() : insert(k === '−' ? '-' : k)})), h('button', {class: 'eq pri', textContent: '=', onclick: equals}));
}

// Valores atuais da ficha, para inserir na conta com um clique.
export function renderChips() {
  if (!chipsEl) return;
  const S = stats(), kd = S.T.kiDmg;
  const list = [['Dano bruto Melee', S.T.meleeDmg * 0.7], ['Dano bruto Ki', kd * 0.7], ['Ki Blast 10%', kd * 0.1], ['Ki Blast carregada 40%', kd * 0.4],
    ['Ki Feixe 1 mão 70%', kd * 0.7], ['Ki Feixe 2 mãos 90%', kd * 0.9], ['HP atual', state.hp ?? S.hpTotal], ['HP máx', S.hpTotal], ['Ki atual', state.ki ?? S.kiTotal], ['Ki máx', S.kiTotal]]; // hp/ki ainda são null antes da 1ª barra ser calculada
  chipsEl.replaceChildren(...list.map(([l, v]) => h('button', {class: 'mini chip', title: 'Inserir na conta', onclick: () => insert(show(v)), textContent: `${l} · ${fmt(+v.toFixed(2))}`})));
}

// ---------- porcentagem rápida ----------
function percentCard() {
  const inp = ph => h('input', {type: 'number', step: 'any', placeholder: ph});
  const r1 = h('b', {class: 'res'}), r2 = h('b', {class: 'res'}), r3 = h('b', {class: 'res'});
  const a1 = inp('%'), b1 = inp('valor');
  const a2 = inp('valor'), mode = h('select', {onchange: () => c2()}, h('option', {value: '+', textContent: 'aumentar'}), h('option', {value: '-', textContent: 'diminuir'})), b2 = inp('%');
  const a3 = inp('parte'), b3 = inp('total');
  const c1 = () => out(r1, num(a1) / 100 * num(b1)), c2 = () => out(r2, num(a2) * (1 + (mode.value === '+' ? 1 : -1) * num(b2) / 100)), c3 = () => out(r3, num(a3) / num(b3) * 100, '%');
  [[a1, c1], [b1, c1], [a2, c2], [b2, c2], [a3, c3], [b3, c3]].forEach(([el, f]) => el.addEventListener('input', f));
  return h('div', {class: 'card calc-card'}, h('h3', {}, 'Porcentagem rápida'),
    h('div', {class: 'pct-row'}, a1, h('span', {}, '% de'), b1, h('span', {}, '='), r1),
    h('div', {class: 'pct-row'}, a2, mode, h('span', {}, 'em'), b2, h('span', {}, '% ='), r2),
    h('div', {class: 'pct-row'}, a3, h('span', {}, 'é quantos % de'), b3, h('span', {}, '='), r3));
}

// ---------- dano recebido (regras de defesa e esquiva do sistema) ----------
function damageCard() {
  const raw = h('input', {type: 'number', min: 0, step: 'any', placeholder: 'ex: 70'}), pts = h('input', {type: 'number', min: 0, step: 'any', placeholder: 'pontos'});
  const kind = h('select', {onchange: label}, h('option', {value: 'meleeRes', textContent: 'Melee'}), h('option', {value: 'kiRes', textContent: 'Ki'}));
  const def = h('select', {onchange: label}, h('option', {value: 'passive', textContent: 'Passiva (sem ação)'}), h('option', {value: 'active', textContent: 'Ativa (defendendo)'}), h('option', {value: 'dodge', textContent: 'Esquiva (gasta o turno)'}));
  const ptsLbl = h('span'), res = h('div', {class: 'dmg-out'});
  function label() { ptsLbl.textContent = def.value === 'dodge' ? 'Pontos de Velocity do defensor' : `Pontos de ${kind.value === 'kiRes' ? 'Ki' : 'Melee'} Resistance do defensor`; calc(); }
  function calc() {
    const r = num(raw), p = num(pts) || 0;
    if (!Number.isFinite(r) || r <= 0) { res.replaceChildren(h('small', {class: 'mu'}, 'Informe o dano bruto do ataque.')); return; }
    const mod = p * 0.7, red = def.value === 'passive' ? mod * 0.7 : def.value === 'active' ? mod * 1.7 : mod * 1.5;
    let final, note = '';
    if (def.value === 'dodge') { if (red >= r) { final = 0; note = '✅ Esquiva total: nenhum dano e você pode contra-atacar.'; } else final = r - red; }
    else { final = Math.max(r - red, r * 0.1); if (r - red < r * 0.1) note = 'Piso de 10%: pelo menos 10% do dano bruto sempre passa na defesa.'; }
    res.replaceChildren(h('div', {class: 'rd'}, h('span', {}, 'Modificador (pontos × 0.7)'), h('b', {}, fmt(+mod.toFixed(2)))),
      h('div', {class: 'rd'}, h('span', {}, 'Redução'), h('b', {}, fmt(+red.toFixed(2)))),
      h('div', {class: 'dmg-final'}, h('span', {}, 'Dano final'), h('b', {}, fmt(+final.toFixed(2)))), note ? h('small', {class: 'mu'}, note) : null);
  }
  const mine = h('button', {class: 'mini', textContent: 'Usar meus pontos', onclick: () => { const T = stats().T; pts.value = def.value === 'dodge' ? T.vel : T[kind.value]; calc(); }});
  [raw, pts].forEach(el => el.addEventListener('input', calc));
  label();
  return h('div', {class: 'card calc-card'}, h('h3', {}, 'Dano recebido'),
    h('small', {class: 'mu'}, 'Descubra quanto dano passa depois da defesa ou da esquiva.'),
    field('Dano bruto do ataque', raw), h('div', {class: 'row'}, field('Tipo do ataque', kind), field('Defesa', def)),
    h('label', {class: 'field'}, ptsLbl, h('div', {class: 'pts-row'}, pts, mine)), res);
}

// ---------- anotações de valores (salvas na ficha) ----------
export const refresh = () => { hist = []; if (histEl) renderHist(); if (notesArea) { notesArea.value = state.calcNotes; notesSt.textContent = 'Salvo automaticamente'; } renderChips(); };

export function init() {
  expr = h('input', {type: 'text', class: 'expr', inputmode: 'none', autocomplete: 'off', placeholder: 'ex: 150 + 20%   ou   87.5 × 0.4',
    oninput: live, onkeydown: e => { if (e.key === 'Enter') equals(); }});
  preview = h('div', {class: 'preview'}); histEl = h('div', {class: 'hist'}); chipsEl = h('div', {class: 'chips'});
  notesSt = h('small', {id: 'calcNotesStatus', textContent: 'Salvo automaticamente'});
  notesArea = h('textarea', {class: 'notes', id: 'calcNotes', placeholder: 'Anote aqui valores, danos, resultados de contas, números do inimigo...'});
  const save = debounce(() => { persist(); notesSt.textContent = 'Salvo automaticamente'; });
  notesArea.oninput = () => { state.calcNotes = notesArea.value; notesSt.textContent = 'Salvando...'; save(); };
  $('#calcRoot').replaceChildren(
    h('div', {class: 'calc-grid'},
      h('div', {class: 'card calc-card'}, h('h3', {}, 'Calculadora'), expr, preview, keypad(),
        h('h4', {}, 'Valores da sua ficha (clique para inserir)'), chipsEl, h('h4', {}, 'Histórico'), histEl),
      h('div', {class: 'calc-side'}, percentCard(), damageCard())),
    h('div', {class: 'card'}, h('div', {class: 'toolbar'}, h('h3', {}, 'Anotações de valores'), notesSt), notesArea));
  refresh();
}
