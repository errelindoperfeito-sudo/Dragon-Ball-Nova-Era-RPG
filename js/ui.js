// ui.js — renderização e eventos visuais (cabeçalho, atributos, painéis, abas, diálogo de raça).
import { state, commit, persist } from './state.js';
import { stats, reads, activeForm } from './attributes.js';
import { RACES, getRace, CUSTOM_ID } from './races.js';
import { openCustom } from './custom.js';
import { getTransforms } from './transformations.js';
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
  const S = stats(), form = activeForm(), R = getRace(state.race, state.custom);

  setVal($('#nameInput'), state.name);
  $('#raceBtn').textContent = `${R.name} ▾`;
  $('#levelNum').textContent = state.level;
  $('#avatarImg').src = state.avatar || DEFAULT_AVATAR;
  $('#avatarRemove').hidden = !state.avatar;
  document.body.dataset.aura = form ? 'on' : '';

  const badges = [];
  if (form) badges.push(['form', '⚡ ' + form.name]);
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
    if (L.abil) rows.push(['b', 'Habilidades', sgn(L.abil)]);
    if (L.item) rows.push(['i', 'Itens', sgn(L.item)]);
    rows.push(['sum', 'Total de pontos', fmt(t)]);
    $('.layers', card).innerHTML = rows.map(([c, l, v]) => `<li class="${c}"><span>${l}</span><b>${v}</b></li>`).join('');
    $('.result', card).innerHTML = `[ ${fmt(t)} ] → <b>${isPool ? fmt(a === 'hpMax' ? S.hpTotal : S.kiTotal) : fmt(t * 0.7)}</b>${isPool ? (a === 'hpMax' ? ' HP' : ' Ki') : ''}`;
    $('.reads', card).innerHTML = reads(a, S).map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('');
    card.classList.toggle('boosted', !!(L.form || L.abil || L.item));
  });

  // Pontos disponíveis = pontos ganhos por nível − pontos já investidos (nunca negativo). Mostra de quais níveis são.
  const pool = R.every ? Math.floor(state.level / R.every) : 0, spent = ATTRS.reduce((s, a) => s + state.base[a], 0);
  const avail = Math.max(0, pool - spent), first = (pool - avail + 1) * R.every, last = pool * R.every;
  $('#pointsInfo').innerHTML = R.perLevelAll
    ? `<b>${R.name}</b>: ${R.gain} (automático: +${state.level} em cada)`
    : `Pontos disponíveis: <b>${avail}</b>${avail ? ` · referentes ${first === last ? 'ao nível' : 'aos níveis'} <b>${first === last ? last : first + ' a ' + last}</b>` : ''} <small>(${R.gain})</small>`;
  $('#racePassive').textContent = R.passive;

  $('#btnCustom').hidden = state.race !== CUSTOM_ID;
  const mb = $('#btnMutant');
  mb.hidden = state.race !== 'saiyajin';
  mb.classList.toggle('on', state.mutant);
  $('#btnForms').classList.toggle('on', !$('#formsPanel').hidden);

  panel('#formsPanel', state.mutant ? 'Transformações — Saiyajin Mutante' : `⚡ Transformações — ${R.name}`, getTransforms(state.race, state.mutant, state.custom),
    t => t.id === state.form, toggleForm,
    state.race === CUSTOM_ID ? 'Nenhuma transformação criada. Use "Editar Custom Race" para criar.' : 'Esta raça não possui transformações. Poderes como Kaio-Ken são registrados na aba Habilidades.', notice);

  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  $$('.tab').forEach(s => s.hidden = s.id !== 'tab-' + state.tab);
}

// Mensagem exibida no painel de transformações (ex.: Ki insuficiente).
let notice = '';
const costValue = k => k.unit === '%' ? Math.round(stats().kiTotal * Math.min(100, k.val) / 100) : Math.round(k.val);
const costText = k => `${fmt(k.val)}${k.unit === '%' ? '% da barra' : ' de Ki'} ${k.when === 'turn' ? 'por turno' : 'ao ativar'}`;
function spend(t) { // desconta o gasto de Ki da transformação; false se não houver Ki suficiente
  const c = costValue(t.kiCost);
  if (state.ki < c) { notice = `Ki insuficiente para ${t.name}: precisa de ${c} e você tem ${state.ki}.`; render(); return false; }
  state.ki -= c; return true;
}
function toggleForm(t) {
  notice = '';
  if (t.action === 'absorb') return openAbsorb();
  if (state.form === t.id) { state.form = null; return commit(); }
  if (t.kiCost?.when === 'activate' && !spend(t)) return;
  state.form = t.id; commit();
}
const payTurn = t => { notice = ''; if (spend(t)) commit(); };

function panel(selector, title, items, isOn, toggle, empty, warn) {
  const kids = [h('h3', {}, title)];
  if (warn) kids.push(h('p', {class: 'warn'}, warn));
  if (!items.length) kids.push(h('p', {class: 'none'}, empty));
  items.forEach(t => {
    const lock = t.lvl > state.level, on = isOn(t);
    kids.push(h('article', {class: 'tf' + (on ? ' on' : '') + (lock ? ' locked' : '')},
      h('div', {}, h('b', {}, t.name), h('small', {}, `Nível ${t.lvl}` + (lock ? ' · 🔒 bloqueada' : on ? ' · ativa' : ' · disponível')),
        h('p', {}, t.desc || describe(t) || '—'),
        t.note ? h('p', {class: 'note'}, t.note) : null,
        t.kiCost ? h('p', {class: 'cost'}, '🔵 Gasto de Ki: ' + costText(t.kiCost)) : null),
      h('div', {class: 'tf-actions'},
        h('button', {disabled: lock, onclick: () => toggle(t), textContent: on ? 'Desativar' : 'Ativar'}),
        on && t.kiCost?.when === 'turn' ? h('button', {onclick: () => payTurn(t), textContent: 'Pagar turno'}) : null)));
  });
  $(selector).replaceChildren(...kids);
}

// ---------- diálogo de raça ----------
const dlg = () => $('#raceDlg'), body = () => $('#raceDlgBody');
function openRace() {
  body().replaceChildren(h('h2', {}, 'Escolha a raça'),
    h('div', {class: 'race-grid'}, Object.entries(RACES).map(([id, r]) => h('button', {class: 'race-opt' + (id === state.race ? ' on' : ''), onclick: () => pickRace(id)},
      h('b', {}, r.name), h('small', {}, 'Bônus: ' + (describe({add: r.bonus}) || 'nenhum')), h('small', {}, r.gain))),
      h('button', {class: 'race-opt custom' + (state.race === CUSTOM_ID ? ' on' : ''), onclick: () => pickRace(CUSTOM_ID)},
        h('b', {}, '🛠 Custom Race'),
        h('small', {}, 'Crie a sua própria raça: passivas e bônus de atributos, mais transformações próprias (nome, nível, pontos ou multiplicadores, gasto de Ki e descrição).'),
        h('small', {}, state.custom.name || state.custom.forms.length ? `Sua raça atual: ${getRace(CUSTOM_ID, state.custom).name} · ${state.custom.forms.length} transformação(ões)` : 'Tudo fica salvo na ficha.'))),
    h('button', {textContent: 'Fechar', onclick: () => dlg().close()}));
  if (!dlg().open) dlg().showModal();
}
function pickRace(id) {
  if (id === state.race) { dlg().close(); if (id === CUSTOM_ID) openCustom(); return; }
  body().replaceChildren(h('h2', {}, `Trocar para ${getRace(id, state.custom).name}?`),
    h('p', {}, 'Deseja resetar os pontos investidos ou mantê-los? Bônus de raça e transformações serão atualizados.'),
    h('div', {class: 'dlg-actions'},
      h('button', {class: 'danger', textContent: 'Resetar pontos', onclick: () => applyRace(id, true)}),
      h('button', {textContent: 'Manter pontos', onclick: () => applyRace(id, false)}),
      h('button', {textContent: 'Voltar', onclick: openRace})));
}
function applyRace(id, reset) {
  state.race = id; state.mutant = false; state.form = null;
  if (reset) { ATTRS.forEach(a => { state.base[a] = 0; state.absorbed[a] = 0; }); }
  notice = ''; syncUnlocks(); dlg().close(); commit();
  if (id === CUSTOM_ID) openCustom(); // abre o editor ao escolher a Custom Race
}

// ---------- Absorção do Majin ----------
function openAbsorb() {
  const inputs = Object.fromEntries(ABSORB_ATTRS.map(a => [a, h('input', {type: 'number', step: 'any', value: 0})]));
  const apply = () => {
    ABSORB_ATTRS.forEach(a => { state.absorbed[a] = Math.max(0, Math.round((state.absorbed[a] + (Number(inputs[a].value) || 0)) * 100) / 100); });
    $('#absorbDlg').close(); commit();
  };
  $('#absorbDlgBody').replaceChildren(h('h2', {}, 'Absorção'),
    h('p', {class: 'absorb-rules'}, 'Só vale para inimigos derrotados em combate, e o mestre decide se o alvo é absorvível. Não é possível absorver outro Majin (nem criatura que manipule o corpo livremente). A absorção é permanente: você recebe 20% dos atributos do alvo, aprende todas as habilidades dele e recebe todo o conhecimento que ele tinha.'),
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

// Fecha o painel de Transformações (usado ao trocar de ficha).
export function closePanels() { notice = ''; $('#formsPanel').hidden = true; }

// ---------- eventos ----------
export function init() {
  buildAttrs();
  $('#nameInput').oninput = e => { state.name = e.target.value; persist(); };
  $('#avatarBtn').onclick = () => $('#avatarFile').click();
  $('#avatarFile').onchange = e => { const f = e.target.files[0]; if (f) setAvatar(f); e.target.value = ''; };
  $('#avatarRemove').onclick = () => { state.avatar = null; commit(); };
  $('#raceBtn').onclick = openRace;
  $('#btnCustom').onclick = openCustom;
  $('#btnForms').onclick = () => { $('#formsPanel').hidden = !$('#formsPanel').hidden; render(); };
  $('#btnMutant').onclick = () => { state.mutant = !state.mutant; state.form = null; commit(); };
  $('#btnReset').onclick = () => { if (confirm('Resetar esta ficha? Só a ficha aberta é zerada (as outras não mudam). Esta ação não pode ser desfeita.')) resetActive(); };
  $$('#tabs button').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; persist(); render(); });
  document.addEventListener('levelup', () => { const t = $('.topbar'); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); });
}
