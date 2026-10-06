// utils.js — constantes e funções auxiliares (sem dependências de outros módulos).
export const ATTRS = ['hpMax','kiMax','meleeDmg','meleeRes','kiDmg','kiRes','vel'];
export const BASE_BAR = 50; // barra base de HP e de Ki de toda raça (não são pontos); os pontos de HP/Ki Max somam por cima (pontos × 5)
export const ABSORB_ATTRS = ['meleeDmg','kiDmg','meleeRes','kiRes','vel']; // atributos cobrados na Absorção do Majin
export const LABEL = {hpMax:'HP Max',kiMax:'Ki Max',meleeDmg:'Melee Damage',meleeRes:'Melee Resistance',kiDmg:'Ki Damage',kiRes:'Ki Resistance',vel:'Velocity'};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const fmt = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
export const sgn = n => (n >= 0 ? '+' : '') + fmt(n);
export const newId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const debounce = (f, ms = 500) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

// Cria elementos DOM: h('div', {class:'x', onclick:fn}, filhos...)
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter(x => x != null));
  return e;
}
export const field = (label, el) => h('label', {class: 'field'}, h('span', {}, label), el);
export function sel(opts, val, fn) {
  const s = h('select', {onchange: fn}, opts.map(o => h('option', {value: o, textContent: o})));
  s.value = val; return s;
}

// Interpreta texto digitado: "+10"/"-5" soma/subtrai; "50" define valor exato. Retorna null se inválido.
export function applyInput(txt, current) {
  const t = txt.trim().replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null;
  return /^[+-]/.test(t) ? current + Number(t) : Number(t);
}

// Ao clicar no elemento, troca por um input; Enter/blur confirma, Esc cancela.
export function inlineEdit(el, cb) {
  el.addEventListener('click', () => {
    const i = h('input', {type: 'text', class: 'inline', placeholder: 'ex: 50, +10, -5'});
    el.hidden = true; el.after(i); i.focus();
    let done = false;
    const end = ok => { if (done) return; done = true; const v = i.value; i.remove(); el.hidden = false; if (ok && v.trim()) cb(v); };
    i.onkeydown = e => { if (e.key === 'Enter') end(true); if (e.key === 'Escape') end(false); };
    i.onblur = () => end(true);
  });
}

// Descreve um efeito {add, mult} em texto legível.
const names = as => as.length === 7 ? 'todos os atributos'
  : (as.length === 5 && ATTRS.slice(2).every(a => as.includes(a))) ? 'todos (exceto HP/Ki Max)'
  : as.map(a => LABEL[a]).join(', ');
export function describe(fx) {
  const out = [];
  for (const [key, f] of [['add', v => '+' + v], ['mult', v => '×' + v]]) {
    const g = {};
    for (const [a, v] of Object.entries(fx[key] || {})) if (v) (g[v] ??= []).push(a);
    for (const [v, as] of Object.entries(g)) out.push(`${f(v)} ${names(as)}`);
  }
  return out.join(' · ');
}
