// ui.js — renderização e eventos visuais (cabeçalho, atributos, painéis, abas, diálogo de raça).
import { state, commit, persist } from './state.js';
import { stats, reads, activeForm, activeTechs } from './attributes.js';
import { RACES } from './races.js';
import { getTransforms } from './transformations.js';
import { TECHS } from './techniques.js';
import { need, syncUnlocks } from './level.js';
import { resetActive } from './sheets.js';
import { ATTRS, ABSORB_ATTRS, LABEL, $, $$, h, field, fmt, sgn, describe } from './utils.js';

export const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1b1f3d"/><path d="M50 12l8 14 8-10 2 18 10-4-6 16c4 6 4 12 0 18-4 8-14 12-22 12s-18-4-22-12c-4-6-4-12 0-18l-6-16 10 4 2-18 8 10z" fill="#ffb347"/><circle cx="50" cy="52" r="16" fill="#f2c9a0"/><path d="M20 100c4-18 18-24 30-24s26 6 30 24z" fill="#ff8a1f"/></svg>');
const setVal = (el, v) => { if (document.activeElement !== el) el.value = v; };

// ---------- construção única dos cards de atributo ----------
function buildAttrs() {
  $('#attrGrid').replaceChildren(...ATTRS.map(a => h('article', {class: 'card attr', id: 'attr-' + a},
    h('h3', {}, LABEL[a]),
    h('div', {class: 'attr-in'}, h('span', {}, 'Pontos base'),
      h('input', {type: 'number', min: 0, value: state.base[a], oninput: e => { state.base[a] = Math.max(0, Number(e.target.value) || 0); commit(); }})),
    h('ul', {class: 'layers'}), h('div', {class: 'result'}), h('div', {class: 'reads'}))));
}

// ---------- render geral ----------
export function render() {
  const S = stats(), form = activeForm(), techs = activeTechs(), R = RACES[state.race];

  setVal($('#nameInput'), state.name);
  $('#raceBtn').textContent = `${R.name} ▾`;
  $('#levelNum').textContent = state.level;
  $('#avatarImg').src = state.avatar || DEFAULT_AVATAR;
  $('#avatarRemove').hidden = !state.avatar;
  document.body.dataset.aura = form ? 'on' : '';

  const badges = [];
  if (form) badges.push(['form', '⚡ ' + form.name]);
  techs.forEach(t => badges.push(['tech', '🌀 ' + t.name]));
  if (state.mutant && state.race === 'saiyajin') badges.push(['mut', 'MUTANTE']);
  $('#badges').replaceChildren(...badges.map(([c, t]) => h('span', {class: 'badge ' + c, textContent: t})));

  for (const k of ['hp', 'ki']) {
    const sec = $(`[data-bar="${k}"]`), m = S[k + 'Total'], c = state[k], p = m ? Math.round(c / m * 100) : 0;
    $('.fill', sec).style.width = p + '%';
    $('.val', sec).textContent = `${c} / ${m} (${p}%)`;
    sec.classList.toggle('low', k === 'hp' && p <= 25);
    sec.classList.toggle('gold', k === 'ki' && !!form);
  }
  const n = need(state.level), xp = Math.round(state.xp / n * 100);
  $('#xpBar .fill').style.width = xp + '%';
  $('#xpBar .val').textContent = `${state.xp} / ${n} (${xp}%)`;

  ATTRS.forEach(a => {
    const card = $('#attr-' + a), L = S.L[a], t = S.T[a], isPool = a === 'hpMax' || a === 'kiMax';
    setVal($('input', card), state.base[a]);
    const rows = [['', 'Base', fmt(L.base)]];
    if (L.race) rows.push(['r', R.perLevelAll ? 'Raça (por nível)' : 'Raça', sgn(L.race)]);
    if (L.absorb) rows.push(['a', 'Absorção', sgn(L.absorb)]);
    if (L.form) rows.push(['f', form.name, sgn(L.form)]);
    if (L.tech) rows.push(['t', 'Técnicas', sgn(L.tech)]);
    rows.push(['sum', 'Total de pontos', fmt(t)]);
    $('.layers', card).innerHTML = rows.map(([c, l, v]) => `<li class="${c}"><span>${l}</span><b>${v}</b></li>`).join('');
    $('.result', card).innerHTML = `[ ${fmt(t)} ] → <b>${isPool ? fmt(a === 'hpMax' ? S.hpTotal : S.kiTotal) : fmt(t * 0.7)}</b>${isPool ? (a === 'hpMax' ? ' HP' : ' Ki') : ''}`;
    $('.reads', card).innerHTML = reads(a, S).map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('');
    card.classList.toggle('boosted', !!(L.form || L.tech));
  });

  // Pontos disponíveis = pontos ganhos por nível − pontos já investidos (nunca negativo). Mostra de quais níveis são.
  const pool = R.every ? Math.floor(state.level / R.every) : 0, spent = ATTRS.reduce((s, a) => s + state.base[a], 0);
  const avail = Math.max(0, pool - spent), first = (pool - avail + 1) * R.every, last = pool * R.every;
  $('#pointsInfo').innerHTML = R.perLevelAll
    ? `<b>${R.name}</b>: ${R.gain} (automático: +${state.level} em cada)`
    : `Pontos disponíveis: <b>${avail}</b>${avail ? ` · referentes ${first === last ? 'ao nível' : 'aos níveis'} <b>${first === last ? last : first + ' a ' + last}</b>` : ''} <small>(${R.gain})</small>`;
  $('#racePassive').textContent = R.passive;

  const mb = $('#btnMutant');
  mb.hidden = state.race !== 'saiyajin';
  mb.classList.toggle('on', state.mutant);
  $('#btnForms').classList.toggle('on', !$('#formsPanel').hidden);
  $('#btnTechs').classList.toggle('on', !$('#techsPanel').hidden);

  panel('#formsPanel', state.mutant ? 'Transformações — Saiyajin Mutante' : `⚡ Transformações — ${R.name}`, getTransforms(state.race, state.mutant),
    t => t.id === state.form, t => { if (t.action === 'absorb') return openAbsorb(); state.form = state.form === t.id ? null : t.id; commit(); }, 'Esta raça não possui transformações. Use as Técnicas.');
  panel('#techsPanel', '🌀 Técnicas (valem para todas as raças e acumulam com a transformação)', TECHS, t => state.techs.includes(t.id), t => {
    const on = state.techs.includes(t.id);
    state.techs = state.techs.filter(id => id !== t.id && TECHS.find(x => x.id === id).group !== t.group);
    if (!on) state.techs.push(t.id);
    commit();
  });

  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  $$('.tab').forEach(s => s.hidden = s.id !== 'tab-' + state.tab);
}

function panel(selector, title, items, isOn, toggle, empty) {
  $(selector).replaceChildren(h('h3', {}, title), ...(items.length ? items.map(t => {
    const lock = t.lvl > state.level, on = isOn(t);
    return h('article', {class: 'tf' + (on ? ' on' : '') + (lock ? ' locked' : '')},
      h('div', {}, h('b', {}, t.name), h('small', {}, `Nível ${t.lvl}` + (lock ? ' · 🔒 bloqueada' : on ? ' · ativa' : ' · disponível')), h('p', {}, t.desc || describe(t))),
      h('button', {disabled: lock, onclick: () => toggle(t), textContent: on ? 'Desativar' : 'Ativar'}));
  }) : [h('p', {class: 'none'}, empty)]));
}

// ---------- diálogo de raça ----------
const dlg = () => $('#raceDlg'), body = () => $('#raceDlgBody');
function openRace() {
  body().replaceChildren(h('h2', {}, 'Escolha a raça'),
    h('div', {class: 'race-grid'}, Object.entries(RACES).map(([id, r]) => h('button', {class: 'race-opt' + (id === state.race ? ' on' : ''), onclick: () => pickRace(id)},
      h('b', {}, r.name), h('small', {}, 'Bônus: ' + (describe({add: r.bonus}) || 'nenhum')), h('small', {}, r.gain)))),
    h('button', {textContent: 'Fechar', onclick: () => dlg().close()}));
  if (!dlg().open) dlg().showModal();
}
function pickRace(id) {
  if (id === state.race) return dlg().close();
  body().replaceChildren(h('h2', {}, `Trocar para ${RACES[id].name}?`),
    h('p', {}, 'Deseja resetar os pontos investidos ou mantê-los? Bônus de raça e transformações serão atualizados.'),
    h('div', {class: 'dlg-actions'},
      h('button', {class: 'danger', textContent: 'Resetar pontos', onclick: () => applyRace(id, true)}),
      h('button', {textContent: 'Manter pontos', onclick: () => applyRace(id, false)}),
      h('button', {textContent: 'Voltar', onclick: openRace})));
}
function applyRace(id, reset) {
  state.race = id; state.mutant = false; state.form = null;
  if (reset) { ATTRS.forEach(a => { state.base[a] = 0; state.absorbed[a] = 0; }); }
  syncUnlocks(); dlg().close(); commit();
}

// ---------- Absorção do Majin ----------
function openAbsorb() {
  const inputs = Object.fromEntries(ABSORB_ATTRS.map(a => [a, h('input', {type: 'number', step: 'any', value: 0})]));
  const apply = () => {
    ABSORB_ATTRS.forEach(a => { state.absorbed[a] = Math.max(0, Math.round((state.absorbed[a] + (Number(inputs[a].value) || 0)) * 100) / 100); });
    $('#absorbDlg').close(); commit();
  };
  $('#absorbDlgBody').replaceChildren(h('h2', {}, 'Absorção'),
    h('p', {class: 'absorb-rules'}, 'Só vale para inimigos derrotados em combate, e o mestre decide se o alvo é absorvível. Não é possível absorver outro Majin (nem criatura que manipule o corpo livremente). A absorção é permanente: você recebe 20% dos atributos do alvo, aprende todas as técnicas dele e recebe todo o conhecimento que ele tinha.'),
    h('p', {}, 'Informe os valores de atributo que você está recebendo (HP Max e Ki Max não são cobrados). Eles serão somados aos pontos que você já investiu. Use valor negativo para corrigir um erro.'),
    h('div', {class: 'absorb-grid'}, ABSORB_ATTRS.map(a => field(`${LABEL[a]} (já absorvido: ${fmt(state.absorbed[a])})`, inputs[a]))),
    h('div', {class: 'dlg-actions'}, h('button', {textContent: 'Aplicar', onclick: apply}), h('button', {textContent: 'Cancelar', onclick: () => $('#absorbDlg').close()})));
  $('#absorbDlg').showModal();
}

// ---------- foto (comprimida para caber no localStorage) ----------
function setAvatar(file) {
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 320 / Math.max(img.width, img.height));
      const c = h('canvas', {width: Math.round(img.width * s), height: Math.round(img.height * s)});
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      state.avatar = c.toDataURL('image/jpeg', 0.85);
      commit();
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

// Fecha os painéis de Transformações/Técnicas (usado ao trocar de ficha).
export function closePanels() { $('#formsPanel').hidden = true; $('#techsPanel').hidden = true; }

// ---------- eventos ----------
export function init() {
  buildAttrs();
  $('#nameInput').oninput = e => { state.name = e.target.value; persist(); };
  $('#avatarBtn').onclick = () => $('#avatarFile').click();
  $('#avatarFile').onchange = e => { const f = e.target.files[0]; if (f) setAvatar(f); e.target.value = ''; };
  $('#avatarRemove').onclick = () => { state.avatar = null; commit(); };
  $('#raceBtn').onclick = openRace;
  const toggle = (id, other) => () => { $(other).hidden = true; $(id).hidden = !$(id).hidden; render(); };
  $('#btnForms').onclick = toggle('#formsPanel', '#techsPanel');
  $('#btnTechs').onclick = toggle('#techsPanel', '#formsPanel');
  $('#btnMutant').onclick = () => { state.mutant = !state.mutant; state.form = null; commit(); };
  $('#btnReset').onclick = () => { if (confirm('Resetar esta ficha? Só a ficha aberta é zerada (as outras não mudam). Esta ação não pode ser desfeita.')) resetActive(); };
  $$('#tabs button').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; persist(); render(); });
  document.addEventListener('levelup', () => { const t = $('.topbar'); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); });
}
