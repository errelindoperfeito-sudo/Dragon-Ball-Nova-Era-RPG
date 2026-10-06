// races.js — raças, bônus iniciais e ganho de pontos por nível.
import { ATTRS } from './utils.js';
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
