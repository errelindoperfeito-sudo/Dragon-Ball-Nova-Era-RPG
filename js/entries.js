// entries.js — abas Habilidades e Itens (mesma mecânica): cards agrupados por tipo/categoria, passivas, ativáveis, exportar/importar.
import { state, persist, commit } from './state.js';
import { $, h, field, sel, clamp, fmt } from './utils.js';
import { ABILITY_TYPES, ITEM_CATS, sanitizeEntry, blankEntry, fxEditor, fxText, isOn } from './effects.js';
import { useEntry, payTurn, damageInfo } from './actions.js';

const CFG = {
  abilities: {key: 'abilities', groups: ABILITY_TYPES, gKey: 'type', noun: 'habilidade', nouns: 'habilidades', file: 'habilidade',
    icons: {Melee: '👊', Ki: '⚡', Suporte: '🛡️', Passiva: '🔄', Outro: '✨'}, on: 'Ligada',
    modes: [['info', 'Só registro (anotação)'], ['passive', 'Passiva (buff/debuff sempre ligado)'], ['active', 'Ativável (botão Ativar)']],
    ids: {list: '#abilitiesList', empty: '#abilitiesEmpty', add: '#addAbility', exp: '#exportAbilities', imp: '#importAbilities', file: '#fileAbilities'}},
  items: {key: 'items', groups: ITEM_CATS, gKey: 'cat', noun: 'item', nouns: 'itens', file: 'item',
    icons: {'Consumível': '🧪', Equipamento: '🛡️', Especial: '⭐', Outro: '📦'}, on: 'Ativo / equipado',
    modes: [['info', 'Só registro (anotação)'], ['passive', 'Passivo (buff/debuff enquanto ativo/equipado)'], ['active', 'Usável / ativável (botão Usar)']],
    ids: {list: '#itemsList', empty: '#itemsEmpty', add: '#addItem', exp: '#exportItems', imp: '#importItems', file: '#fileItems'}}
};
const opened = new Set(), msgs = new Map();
const live = {abilities: new Set(), items: new Set()}; // callbacks que atualizam as linhas de cada card quando os atributos mudam
const slug = t => (t || 'sem-nome').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'arquivo';

function notify(title, msg) {
  const dlg = $('#confirmDlg');
  $('#confirmDlgBody').replaceChildren(h('h2', {}, title), h('p', {}, msg), h('div', {class: 'dlg-actions'}, h('button', {textContent: 'OK', onclick: () => dlg.close()})));
  dlg.showModal();
}
function download(cfg, entries, file) {
  const clean = entries.map(e => { const c = JSON.parse(JSON.stringify(e)); delete c.on; delete c.used; return c; });
  const blob = new Blob([JSON.stringify({app: 'ficha-dragonball', kind: cfg.key, version: 1, exportedAt: new Date().toISOString(), entries: clean}, null, 2)], {type: 'application/json'});
  const a = h('a', {href: URL.createObjectURL(blob), download: file + '.json'});
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function card(cfg, e, rerender) {
  const A = cfg.key === 'abilities';
  const text = k => ev => { e[k] = ev.target.value; persist(); };
  const line = h('div', {class: 'fx-line'}), dmgEl = h('div', {class: 'fx-dmg'}), msg = h('div', {class: 'fx-msg'});
  const hitsIn = h('input', {type: 'number', min: 0, step: 1}), hitsLbl = h('label', {class: 'hits', hidden: true}, 'Acertos', hitsIn); // barrage: dados que deram 2
  let el;
  const refresh = () => {
    line.textContent = fxText(e); line.hidden = !line.textContent; el.classList.toggle('on', isOn(e));
    const di = A ? damageInfo(e) : null;
    dmgEl.hidden = !di;
    if (di) dmgEl.textContent = `💥 Dano: ${fmt(di.per)}` + (di.shots > 1 ? ` por disparo (${di.shots}d2: cada 2 acerta)` : '') + ` · Acerto: tire ${di.chance} ou menos (${di.src})` + (di.costEq ? ' · Custo de Ki = dano' : '');
    hitsLbl.hidden = !(di && di.shots > 1 && e.mode === 'active');
    if (di) hitsIn.max = di.shots;
  };
  live[cfg.key].add(refresh);
  const change = () => { refresh(); commit(); };
  const structure = () => { commit(); rerender(); };
  const run = r => { msgs.set(e.id, r); commit(); rerender(); };

  const m = msgs.get(e.id); msg.textContent = m?.msg || ''; msg.classList.toggle('bad', m && !m.ok); msg.hidden = !m?.msg;
  const modeSel = h('select', {onchange: ev => { e.mode = ev.target.value; e.on = e.mode === 'passive'; msgs.delete(e.id); structure(); }},
    cfg.modes.map(([v, l]) => h('option', {value: v, textContent: l, selected: v === e.mode})));
  const head = A
    ? h('div', {class: 'row'}, field('Nome', h('input', {value: e.name, oninput: text('name')})),
        field('Tipo', sel(cfg.groups, e.type, ev => { e.type = ev.target.value; if (e.type === 'Passiva' && e.mode === 'info') { e.mode = 'passive'; e.on = true; } structure(); })))
    : h('div', {class: 'row'}, field('Nome', h('input', {type: 'text', value: e.name, oninput: text('name')})),
        field('Quantidade', h('input', {type: 'number', min: 0, value: e.qty, oninput: ev => { e.qty = clamp(Math.floor(Number(ev.target.value) || 0), 0, 99999); persist(); }})));
  const sub = h('div', {class: 'row'}, A ? field('Funcionamento', modeSel) : field('Categoria', sel(cfg.groups, e.cat, ev => { e.cat = ev.target.value; structure(); })), A ? null : field('Funcionamento', modeSel));
  const f = e.fx, turn = e.mode === 'active' && f.dur !== 'instant' && e.on && f.when === 'turn' && (f.ki || f.hp);
  const act = e.mode === 'passive'
    ? h('label', {class: 'check switch'}, h('input', {type: 'checkbox', checked: e.on, onchange: ev => { e.on = ev.target.checked; structure(); }}), cfg.on)
    : e.mode === 'active'
      ? h('div', {class: 'fx-btns'}, A ? hitsLbl : null,
          h('button', {class: e.on ? '' : 'pri', textContent: f.dur === 'instant' ? 'Usar' : e.on ? 'Desativar' : 'Ativar', onclick: () => run(useEntry(e, cfg.key, hitsIn.value))}),
          turn ? h('button', {textContent: 'Pagar turno', onclick: () => run(payTurn(e))}) : null)
      : null;
  el = h('article', {class: 'card entry ' + (A ? 'ability' : 'item') + ' m-' + e.mode + (e.used ? ' used' : '')},
    head, sub,
    A && e.mode === 'info' ? field('Custo em Ki (anotação)', h('input', {value: e.cost, oninput: text('cost'), placeholder: 'ex: 20'})) : null,
    line, dmgEl, act, msg,
    field('Descrição / efeito', h('textarea', {value: e.desc, oninput: text('desc')})),
    A ? field('Observações', h('textarea', {value: e.obs, oninput: text('obs')})) : null,
    e.mode === 'info' ? null : h('details', {class: 'fx', open: opened.has(e.id), ontoggle: ev => ev.target.open ? opened.add(e.id) : opened.delete(e.id)},
      h('summary', {}, '⚙ Efeitos e custos'), fxEditor(e, cfg.key, change, structure)),
    h('div', {class: 'foot'},
      A ? h('span') : h('label', {class: 'check'}, h('input', {type: 'checkbox', checked: !!e.used, onchange: ev => { e.used = ev.target.checked; structure(); }}), 'Usado/consumido'),
      h('div', {class: 'fx-btns'},
        h('button', {class: 'mini', textContent: '⬇ Baixar', title: 'Baixar só ' + (A ? 'esta habilidade' : 'este item') + ' (JSON)', onclick: () => download(cfg, [e], cfg.file + '-' + slug(e.name))}),
        h('button', {class: 'danger mini', textContent: 'Remover', onclick: () => { if (confirm(`Remover ${cfg.noun}?`)) { state[cfg.key] = state[cfg.key].filter(x => x !== e); commit(); rerender(); } }}))));
  refresh();
  return el;
}

export function makeTab(kind) {
  const cfg = CFG[kind];
  const render = () => {
    live[cfg.key].clear();
    const list = state[cfg.key];
    $(cfg.ids.empty).hidden = list.length > 0;
    $(cfg.ids.list).replaceChildren(...cfg.groups.flatMap(g => {
      const xs = list.filter(e => e[cfg.gKey] === g);
      return xs.length ? [h('h3', {class: 'grp'}, `${cfg.icons[g] || '•'} ${g} (${xs.length})`), h('div', {class: 'list'}, xs.map(e => card(cfg, e, render)))] : [];
    }));
  };
  async function onFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return notify('Arquivo grande demais', 'O arquivo passa de 5 MB.');
    let obj; try { obj = JSON.parse(await file.text()); } catch { return notify('Não foi possível importar', 'O arquivo não é um JSON válido.'); }
    if (obj?.app !== 'ficha-dragonball' || !Array.isArray(obj.entries)) return notify('Não foi possível importar', `Este arquivo não parece ser de ${cfg.nouns} do Dragon Ball RPG.`);
    if (obj.kind !== cfg.key) return notify('Aba errada', `Este arquivo é de ${obj.kind === 'items' ? 'itens' : 'habilidades'}. Importe pela aba ${obj.kind === 'items' ? 'Itens' : 'Habilidades'}.`);
    const novos = obj.entries.slice(0, 200).filter(x => x && typeof x === 'object').map(x => sanitizeEntry({...x, id: undefined, on: undefined, used: false}, cfg.key));
    if (!novos.length) return notify('Não foi possível importar', 'Nenhuma entrada válida no arquivo.');
    state[cfg.key].push(...novos); commit(); render();
    notify('Importação concluída', `${novos.length} ${novos.length === 1 ? cfg.noun + ' adicionado(a)' : cfg.nouns + ' adicionados(as)'}.`);
  }
  const init = () => {
    $(cfg.ids.add).onclick = () => { state[cfg.key].push(blankEntry(cfg.key)); persist(); render(); };
    $(cfg.ids.exp).onclick = () => state[cfg.key].length ? download(cfg, state[cfg.key], cfg.nouns + '-' + new Date().toISOString().slice(0, 10)) : notify('Nada para baixar', `Você ainda não tem ${cfg.nouns}.`);
    $(cfg.ids.imp).onclick = () => $(cfg.ids.file).click();
    $(cfg.ids.file).onchange = ev => { const f = ev.target.files[0]; ev.target.value = ''; onFile(f); };
    render();
  };
  const refresh = () => live[cfg.key].forEach(f => f());
  return {init, render, refresh};
}
