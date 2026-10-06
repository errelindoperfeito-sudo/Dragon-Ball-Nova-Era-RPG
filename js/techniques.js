// techniques.js — Kaio-Ken e Místico (valem para todas as raças e acumulam com a transformação).
import { ATTRS } from './utils.js';
const X = ['hpMax', 'kiMax'];
const A = n => Object.fromEntries(ATTRS.filter(a => !X.includes(a)).map(a => [a, n]));
const K = (id, name, lvl, m) => ({id, name, lvl, group:'kaio', add:{}, mult:A(m)});
// group: apenas uma técnica ativa por grupo; grupos diferentes podem ser combinados.
export const TECHS = [
  K('kaio2', 'Kaio-Ken x2', 25, 2),
  K('kaio3', 'Kaio-Ken x3', 70, 3),
  K('kaio4', 'Kaio-Ken x4', 100, 4),
  K('kaio5', 'Kaio-Ken x5', 150, 5),
  {id:'mistico', name:'Místico', lvl:150, group:'mistico', add:A(130), mult:{kiMax:2.5}},
  {id:'mistico-kaio', name:'Místico Kaioken', lvl:200, group:'mistico', add:A(260), mult:{kiMax:2.5}}
];
