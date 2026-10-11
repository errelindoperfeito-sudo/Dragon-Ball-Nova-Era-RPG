// effects.js — buffs/debuffs, custos e validação de Habilidades e Itens (sem dependência do estado).
import { ATTRS, LABEL, clamp, newId, h, field, describe, fmt } from './utils.js';

export const ABILITY_TYPES = ['Melee', 'Ki', 'Suporte', 'Passiva', 'Outro'];
export const ITEM_CATS = ['Consumível', 'Equipamento', 'Especial', 'Outro'];
export const MODES = ['info', 'passive', 'active'];
export const DMG_TYPES = ['Melee', 'Ki', 'Outro']; // tipos de habilidade que podem causar dano (Passiva e Suporte não)

const S = (v, n) => String(v ?? '').slice(0, n);
// Mapa {atributo: valor} sem zeros nem valor neutro (0 para pontos, 1 para multiplicadores).
const numMap = (m, lo, hi, neutral) => Object.fromEntries(ATTRS.map(a => [a, clamp(Number(m?.[a]) || 0, lo, hi)]).filter(([, v]) => v !== 0 && v !== neutral));

export function sanitizeFx(f) {
  f = f && typeof f === 'object' ? f : {};
  const n = k => clamp(Number(f[k]) || 0, 0, 99999), dur = f.dur === 'instant' ? 'instant' : 'sustained';
  const d = f.dmg && typeof f.dmg === 'object' ? f.dmg : {};
  const dmg = {on: !!d.on, base: d.base === 'meleeDmg' ? 'meleeDmg' : 'kiDmg', pct: clamp(Number(d.pct) || 0, 0, 100000), flat: clamp(Number(d.flat) || 0, 0, 99999),
    shots: clamp(Math.floor(Number(d.shots)) || 1, 1, 50), costEq: !!d.costEq};
  return {dmg, add: numMap(f.add, -99999, 99999, 0), mult: numMap(f.mult, 0, 1000, 1), ki: n('ki'), hp: n('hp'), gKi: n('gKi'), gHp: n('gHp'),
    unit: f.unit === 'pts' ? 'pts' : '%', when: dur === 'sustained' && f.when === 'turn' ? 'turn' : 'activate', dur, consume: f.consume !== false};
}

// Garante o formato de uma habilidade/item (fichas antigas e arquivos importados passam por aqui).
export function sanitizeEntry(e, kind) {
  e = e && typeof e === 'object' ? e : {};
  const mode = MODES.includes(e.mode) ? e.mode : 'info';
  const out = {id: typeof e.id === 'string' && e.id && e.id.length < 60 ? e.id : newId(), name: S(e.name, 60), desc: S(e.desc, 1000), mode,
    on: typeof e.on === 'boolean' ? e.on : mode === 'passive', fx: sanitizeFx(e.fx)};
  if (kind === 'abilities') { out.type = ABILITY_TYPES.includes(e.type) ? e.type : 'Outro'; out.cost = S(e.cost, 40); out.obs = S(e.obs, 1000); }
  else {
    const q = e.qty === '' || e.qty == null ? NaN : Number(e.qty);
    out.cat = ITEM_CATS.includes(e.cat) ? e.cat : 'Outro'; out.qty = Number.isFinite(q) ? clamp(Math.floor(q), 0, 99999) : 1; out.used = !!e.used;
  }
  return out;
}
export const blankEntry = kind => sanitizeEntry({type: 'Ki', cat: 'Consumível', qty: 1}, kind);

// Está aplicando efeitos agora? (passiva ligada, ou ativável sustentada ativa; item "usado" não conta)
export const isOn = e => !e.used && e.on && (e.mode === 'passive' || (e.mode === 'active' && e.fx.dur !== 'instant'));

// Soma dos efeitos ligados: pontos somam, multiplicadores se multiplicam.
export function fxTotals(list) {
  const add = {}, mult = {};
  for (const e of list) {
    if (!isOn(e)) continue;
    for (const a of ATTRS) {
      if (e.fx.add[a]) add[a] = (add[a] || 0) + e.fx.add[a];
      if (e.fx.mult[a]) mult[a] = (mult[a] || 1) * e.fx.mult[a];
    }
  }
  return {add, mult};
}

export function fxText(e) {
  if (e.mode === 'info') return '';
  const f = e.fx, u = v => fmt(v) + (f.unit === '%' ? '%' : ''), out = [];
  if (!(e.mode === 'active' && f.dur === 'instant')) { const d = describe({add: f.add, mult: f.mult}); if (d) out.push(d); }
  if (e.mode === 'active') {
    const eq = f.dmg?.on && f.dmg.costEq; // custo de Ki = dano causado
    const c = [eq ? 'Ki = dano causado' : f.ki && `${u(f.ki)} Ki`, f.hp && `${u(f.hp)} HP`].filter(Boolean), g = [f.gKi && `${u(f.gKi)} Ki`, f.gHp && `${u(f.gHp)} HP`].filter(Boolean);
    if (c.length) out.push(`Custo: ${c.join(' + ')} ${f.when === 'turn' ? 'por turno' : 'ao ativar'}`);
    if (g.length) out.push(`Recupera: ${g.join(' + ')}`);
  }
  return out.join(' · ');
}

const pick = (opts, val, fn) => h('select', {onchange: ev => fn(ev.target.value)}, opts.map(([v, l]) => h('option', {value: v, textContent: l, selected: v === val})));

// Editor de efeitos e custos. onChange = valor digitado (recalcula); onStructure = mudou o formato (recria a lista).
export function fxEditor(e, kind, onChange, onStructure) {
  const fx = e.fx, active = e.mode === 'active', instant = active && fx.dur === 'instant';
  const num = (map, key, {lo = 0, hi = 99999, neutral = 0, ph = '0'} = {}) => h('input', {type: 'number', min: lo, max: hi, step: 'any', placeholder: ph, value: map[key] ?? '',
    oninput: ev => {
      const raw = ev.target.value;
      if (raw === '') delete map[key];
      else { const v = clamp(Number(raw) || 0, lo, hi); if (v !== Number(raw)) ev.target.value = v; if (v === neutral || v === 0) delete map[key]; else map[key] = v; }
      onChange();
    }});
  const grid = (map, o) => h('div', {class: 'cust-grid'}, ATTRS.map(a => field(LABEL[a], num(map, a, o))));
  const quick = (map, neutral, lo, hi) => {
    const i = h('input', {type: 'number', min: lo, max: hi, placeholder: 'valor'});
    return h('div', {class: 'cust-quick'}, h('span', {}, 'Atalho:'), i, h('button', {textContent: 'Aplicar em todos (exceto HP/Ki Max)', onclick: () => {
      const v = clamp(Number(i.value) || 0, lo, hi);
      ATTRS.slice(2).forEach(a => { if (v && v !== neutral) map[a] = v; else delete map[a]; });
      onChange(); onStructure();
    }}));
  };
  // Seção de dano: só para habilidades de ataque (Melee, Ki, Outro), não para Passiva/Suporte.
  const dmgSection = () => {
    const d = fx.dmg;
    return h('div', {class: 'fx-dmg-edit'}, h('h4', {}, 'Dano (habilidades de ataque)'),
      h('label', {class: 'check'}, h('input', {type: 'checkbox', checked: d.on, onchange: ev => { d.on = ev.target.checked; onChange(); onStructure(); }}), 'Esta habilidade causa dano'),
      d.on ? h('div', {class: 'fx-editor'},
        h('div', {class: 'cust-ki'},
          field('Calcular sobre', pick([['kiDmg', 'Ki Damage (pontos totais)'], ['meleeDmg', 'Melee Damage (pontos totais)']], d.base, v => { d.base = v; onChange(); })),
          field('% do atributo', num(d, 'pct', {ph: 'ex: 10'})), field('+ Dano fixo', num(d, 'flat'))),
        field('Disparos (1 = disparo único; 5 = barrage com 5d2)', num(d, 'shots', {ph: '1'})),
        h('label', {class: 'check'}, h('input', {type: 'checkbox', checked: d.costEq, onchange: ev => { d.costEq = ev.target.checked; onChange(); }}), 'Custo de Ki = dano causado (nos disparos que acertarem). Ignora o "Custo de Ki" acima.'),
        h('small', {class: 'mu'}, 'Dano = pontos totais do atributo × % + dano fixo. Ex.: Ki Blast = 10% do Ki Damage. O valor-alvo de acerto usa a Velocity (base Melee) ou a perícia Precisão (base Ki).')) : null);
  };
  const kids = [];
  if (active) kids.push(field('Duração', pick([['sustained', 'Fica ativa até desativar (aplica buffs/debuffs)'], ['instant', 'Instantânea (só executa custo e recuperação)']], fx.dur, v => { fx.dur = v; if (v === 'instant') fx.when = 'activate'; onChange(); onStructure(); })));
  if (!instant) kids.push(h('h4', {}, 'Buff / debuff em pontos (valor negativo = debuff)'), grid(fx.add, {lo: -99999}), quick(fx.add, 0, -99999, 99999),
    h('h4', {}, 'Multiplicadores (×), aplicados depois dos pontos (0.5 = metade; vazio ou 1 = nenhum)'), grid(fx.mult, {hi: 1000, neutral: 1, ph: '1'}), quick(fx.mult, 1, 0, 1000));
  if (active) kids.push(h('h4', {}, 'Custo e recuperação (executados automaticamente)'),
    h('div', {class: 'cust-ki'}, field('Custo de Ki', num(fx, 'ki')), field('Custo de HP', num(fx, 'hp')), field('Recupera Ki', num(fx, 'gKi')), field('Recupera HP', num(fx, 'gHp'))),
    h('div', {class: 'cust-ki'}, field('Valores em', pick([['%', '% da barra'], ['pts', 'pontos']], fx.unit, v => { fx.unit = v; onChange(); })),
      instant ? null : field('Custo cobrado', pick([['activate', 'ao ativar'], ['turn', 'por turno (botão "Pagar turno")']], fx.when, v => { fx.when = v; onChange(); onStructure(); }))),
    h('small', {class: 'mu'}, 'A recuperação é aplicada uma vez, ao ativar/usar.'),
    kind === 'abilities' && DMG_TYPES.includes(e.type) ? dmgSection() : null,
    kind === 'items' ? h('label', {class: 'check'}, h('input', {type: 'checkbox', checked: fx.consume, onchange: ev => { fx.consume = ev.target.checked; onChange(); }}), 'Consome 1 unidade a cada uso') : null);
  return h('div', {class: 'fx-editor'}, kids);
}
