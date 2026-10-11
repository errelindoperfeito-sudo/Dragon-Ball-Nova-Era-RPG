// skills.js — aba Perícias: 1 ponto por nível, máx. 40 por perícia. Chance = 50 + pontos (rolar 1d100 ≤ chance).
import { state, persist } from './state.js';
import { $, h, clamp } from './utils.js';

export const SKILL_MAX = 40, SKILL_BASE = 50;
// [id, nome, o que resolve, máx. de pontos (opcional; padrão 40)]
const CATS = [
  {ico: '🏃', name: 'Físicas', note: 'Complementam o Velocity (golpes corpo a corpo) — a Precisão faz o mesmo papel para ataques à distância e de Ki.', list: [
    ['furtividade', 'Furtividade', 'Se esconder, se mover sem ser notado, se infiltrar.'],
    ['rastreamento', 'Rastreamento', 'Seguir pistas, rastrear alvos em qualquer terreno.'],
    ['precisao', 'Precisão', 'Acertar golpes à distância, tiros e ataques de Ki (como a Velocity é para os golpes físicos). Máx. 25 pontos: acerto máximo 75.', 25]]},
  {ico: '🧠', name: 'Mentais', note: 'Inteligência, observação e conhecimento fora de combate.', list: [
    ['intelecto', 'Intelecto', 'Raciocínio lógico, dedução, quebra-cabeças, xadrez mental.'],
    ['investigacao', 'Investigação', 'Examinar cenas de crime, encontrar pistas, juntar evidências.'],
    ['estrategia', 'Estratégia', 'Planejar táticas, prever movimentos inimigos, ler o campo de batalha.'],
    ['percepcao', 'Percepção', 'Notar detalhes, sentidos aguçados, ouvir conversas escondidas.'],
    ['ciencia', 'Ciência', 'Física, química, biologia, fenômenos naturais, análise de substâncias.'],
    ['engenharia', 'Engenharia', 'Consertar naves, construir dispositivos, modificar máquinas.'],
    ['medicina', 'Medicina', 'Diagnosticar doenças, curar ferimentos, anatomia, primeiros socorros.'],
    ['tecnologia', 'Tecnologia', 'Operar e entender tecnologia alienígena, Capsule Corp e androides.']]},
  {ico: '💬', name: 'Sociais', note: 'Nem tudo se resolve na porrada: convencer, enganar, intimidar e mais.', list: [
    ['persuasao', 'Persuasão', 'Convencer, negociar, mudar a ideia de alguém com argumento.'],
    ['intimidacao', 'Intimidação', 'Ameaçar, impor presença física/verbal, forçar uma resposta.'],
    ['labia', 'Lábia', 'Blefar, enganar, disfarçar intenções, contar mentira convincente.'],
    ['lideranca', 'Liderança', 'Comandar esquadrão, inspirar aliados, coordenar combate em grupo.'],
    ['empatia', 'Empatia', 'Ler emoções, entender motivações, detectar mentira alheia.'],
    ['provocacao', 'Provocação', 'Irritar o inimigo, fazê-lo errar por raiva, tirá-lo do eixo.']]},
  {ico: '⚡', name: 'Especiais', note: 'Essenciais neste RPG em específico.', list: [
    ['vontade', 'Vontade', 'Resistir a controle mental, manter transformação sob dor extrema, não ceder.'],
    ['sobrevivencia', 'Sobrevivência', 'Ambientes hostis (espaço, deserto, Namekusei), caçar, achar comida/abrigo.'],
    ['pilotagem', 'Pilotagem', 'Naves e veículos, pilotar sob perseguição ou pressão.'],
    ['controleki', 'Controle de Ki', 'Sentir Ki alheio, suprimir o próprio Ki (sumir de sensores), usar Ki fora de combate.'],
    ['instinto', 'Instinto', 'Pressentir perigo antes de acontecer, sentir presença oculta, reação visceral.'],
    ['erudicao', 'Erudição', 'História, cultura, raças, Esferas do Dragão, lore do universo Dragon Ball.']]}
];
const ALL = CATS.flatMap(c => c.list.map(s => s[0]));
const MAXES = Object.fromEntries(CATS.flatMap(c => c.list.filter(s => s[3]).map(s => [s[0], s[3]])));
const maxOf = id => MAXES[id] ?? SKILL_MAX;
const get = id => clamp(Math.floor(Number(state.pericias[id]) || 0), 0, maxOf(id));
// Valor-alvo (1d100) de uma perícia: 50 + pontos. Usado também pelas habilidades de ataque de Ki (Precisão).
export const hitChance = id => SKILL_BASE + get(id);
const refs = {};

function card([id, name, desc]) {
  const MX = maxOf(id);
  const set = v => { const n = Number(v); state.pericias[id] = clamp(Number.isFinite(n) ? Math.floor(n) : (n > 0 ? MX : 0), 0, MX); persist(); render(); };
  const input = h('input', {type: 'number', min: 0, max: MX, value: get(id),
    // Trava no próprio campo, enquanto digita/cola: negativo vira 0, acima de 40 vira 40, decimais são cortados.
    oninput: e => { if (e.target.value === '') return; set(e.target.value); e.target.value = get(id); },
    onchange: e => { e.target.value = get(id); }});
  const chip = h('span', {class: 'sk-chip'}), calc = h('div', {class: 'sk-calc'});
  const el = h('article', {class: 'card skill'},
    h('div', {class: 'sk-head'}, h('h3', {}, name), chip), h('p', {class: 'sk-desc'}, desc),
    h('div', {class: 'sk-ctl'},
      h('button', {textContent: '−', title: 'Diminuir', onclick: () => set(get(id) - 1)}), input,
      h('button', {textContent: '+', title: 'Aumentar', onclick: () => set(get(id) + 1)})), calc);
  refs[id] = {el, input, chip, calc};
  return el;
}

export function render() {
  if (!refs[ALL[0]]) return; // ainda não inicializado
  for (const id of ALL) {
    const v = get(id), r = refs[id], t = SKILL_BASE + v;
    if (document.activeElement !== r.input) r.input.value = v;
    r.chip.textContent = `≤ ${t}`;
    r.calc.innerHTML = `${SKILL_BASE} + <b>${v}</b> = <b>${t}%</b> · role 1d100 e tire <b>${t} ou menos</b>`;
    r.el.classList.toggle('has', v > 0);
  }
  // 1 ponto por nível; disponíveis = ganhos − investidos (nunca negativo), indicando de quais níveis são.
  const pool = state.level, spent = ALL.reduce((s, id) => s + get(id), 0), avail = Math.max(0, pool - spent), first = pool - avail + 1;
  $('#skillPoints').innerHTML = `Pontos de perícia disponíveis: <b>${avail}</b>` +
    (avail ? ` · referentes ${first === pool ? 'ao nível' : 'aos níveis'} <b>${first === pool ? pool : first + ' a ' + pool}</b>` : '') +
    ' <small>(1 por nível · máx. 40 por perícia; Precisão máx. 25)</small>';
}

export function init() {
  const body = $('#skillsBody');
  body.replaceChildren(...CATS.map(c => h('section', {class: 'sk-cat'},
    h('h3', {}, `${c.ico} ${c.name} (${c.list.length})`), h('p', {class: 'sk-note'}, c.note),
    h('div', {class: 'list'}, c.list.map(card)))));
  render();
}
