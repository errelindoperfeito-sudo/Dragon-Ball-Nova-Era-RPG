// races.js — raças, bônus iniciais e ganho de pontos por nível.
import { ATTRS, clamp, newId, LEVEL_MAX } from './utils.js';
const all = n => Object.fromEntries(ATTRS.map(a => [a, n]));
// every = 1 ponto a cada N níveis | perLevelAll = +1 em todos os atributos por nível (Androide)
export const RACES = {
  humano: {name:'Humano', every:1, gain:'1 ponto por nível', bonus:all(10),
    passive:'Inspiração: +20 em todos os atributos (exceto HP/Ki Max) temporariamente; uma vez por sessão em um combate. Sem transformações — depende de Técnicas.'},
  saiyajin: {name:'Saiyajin', every:1, gain:'1 ponto por nível', bonus:{meleeDmg:15, kiDmg:15},
    passive:'Zenkai: ao cair para 25% ou menos de HP, 50% de chance de recuperar 50% do HP e do Ki (podendo se transformar).'},
  arcosian: {name:'Arcosian', every:1, gain:'Padrão (1 por nível)', bonus:{vel:20, kiDmg:15}, barrage:10,
    passive:'Forma Permanente: não sai da transformação ao chegar a 0 de Ki. Barrage com 10d2.'},
  namekuseijin: {name:'Namekuseijin', every:1, gain:'Padrão (1 por nível)', bonus:{kiMax:20, kiRes:10},
    passive:'Regeneração: recupera 20% do HP gastando 20% do Ki. Pode se fundir com outro Namekuseijin (permanente).'},
  androide: {name:'Androide', every:0, perLevelAll:true, gain:'+1 em TODOS os atributos por nível', bonus:{},
    passive:'Regenera 5% do Ki Max por turno e absorve Ki de inimigos/ataques. Não carrega Ki manualmente. Sem transformações.'},
  majin: {name:'Majin', every:1, gain:'1 ponto por nível', bonus:{hpMax:20, meleeRes:15},
    passive:'Dorme para recuperar 30% de HP/Ki; só morre por desintegração de Ki. Absorção (nível 25, em Transformações): ganha 20% dos atributos, técnicas e conhecimento do alvo derrotado.'}
};

// ---------- Custom Race (raça criada pelo jogador; os dados ficam em state.custom, dentro da ficha) ----------
export const CUSTOM_ID = 'custom';
export const CUSTOM_GAINS = [
  {label:'1 ponto por nível', every:1},
  {label:'1 ponto a cada 2 níveis', every:2},
  {label:'1 ponto a cada 3 níveis', every:3},
  {label:'+1 em TODOS os atributos por nível', every:0, perLevelAll:true}
];
export const newForm = n => ({id:newId(), name:'Transformação ' + n, lvl:1, desc:'', add:{}, mult:{}, kiCost:{unit:'%', when:'activate'}});
export const defaultCustom = () => ({name:'Custom Race', desc:'', gain:0, bonus:{}, forms:[]});

// Garante formato e limites válidos (também corrige dados antigos/editados à mão no localStorage).
export function sanitizeCustom(c) {
  c = c && typeof c === 'object' ? c : {};
  const map = (m, neutral) => Object.fromEntries(ATTRS.map(a => [a, clamp(Number(m?.[a]) || 0, 0, 99999)]).filter(([, v]) => v > 0 && v !== neutral));
  const str = (v, n) => String(v ?? '').slice(0, n);
  return {
    name:str(c.name, 30), desc:str(c.desc, 600), gain:clamp(Math.floor(Number(c.gain) || 0), 0, CUSTOM_GAINS.length - 1), bonus:map(c.bonus, 0),
    forms:(Array.isArray(c.forms) ? c.forms : []).slice(0, 30).map(f => ({
      id:f?.id || newId(), name:str(f?.name, 40), lvl:clamp(Math.floor(Number(f?.lvl) || 1), 1, LEVEL_MAX), desc:str(f?.desc, 400),
      add:map(f?.add, 0), mult:map(f?.mult, 1),
      kiCost:{val:clamp(Number(f?.kiCost?.val) || 0, 0, 99999), unit:f?.kiCost?.unit === 'pts' ? 'pts' : '%', when:f?.kiCost?.when === 'turn' ? 'turn' : 'activate'}}))
  };
}
export function customRace(c) {
  const g = CUSTOM_GAINS[c?.gain] || CUSTOM_GAINS[0];
  return {name:(c?.name || '').trim() || 'Custom Race', every:g.every, perLevelAll:!!g.perLevelAll, gain:g.label, bonus:c?.bonus || {},
    passive:(c?.desc || '').trim() || 'Raça customizada (sem descrição).', custom:true};
}
// Resolve a definição da raça de uma ficha (raças fixas ou a Custom Race).
export const getRace = (id, custom) => id === CUSTOM_ID ? customRace(custom) : (RACES[id] || RACES.humano);
