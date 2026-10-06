// transformations.js — catálogo de transformações por raça (inclui Saiyajin Mutante).
import { ATTRS } from './utils.js';
const X = ['hpMax', 'kiMax'];
const A = (n, ex = []) => Object.fromEntries(ATTRS.filter(a => !ex.includes(a)).map(a => [a, n]));
const P = (md, kd, res, vel) => ({meleeDmg:md, kiDmg:kd, meleeRes:res, kiRes:res, vel});
const T = (id, name, lvl, add, mult = {}) => ({id, name, lvl, add, mult});

const SAIYAJIN = [
  T('oozaru', 'Macaco Gigante (Oozaru) — Lua Cheia', 1, A(150, ['vel'])),
  T('false', 'False Super Saiyan', 1, A(30)),
  T('ssj', 'Super Saiyan', 50, A(50, X)),
  T('assj', 'Ascended Super Saiyan (SSJ Grade 2)', 65, A(70, [...X, 'vel'])),
  T('ssj2', 'Super Saiyan 2', 100, A(100, X)),
  T('ssj3', 'Super Saiyan 3', 150, A(150, X), {kiMax:2.5}),
  T('ssjg', 'Super Saiyan God', 200, A(250, X)),
  T('ssjb', 'Super Saiyan Blue', 300, A(300, X))
];
const MUTANTE = [
  T('m-oozaru', 'Macaco Gigante (Oozaru) — Lua Cheia', 1, A(180, ['vel'])),
  T('m-anger', 'Suppressed Anger', 50, A(80, X)),
  T('m-ss', 'Super Saiyan', 100, A(150, X), {kiMax:2.5}),
  T('m-lssj', 'Legendary Super Saiyan', 200, A(300, X), {kiMax:5})
];
const ARCOSIAN = [
  T('second', 'Second Form', 50, P(30, 60, 23, 30), {kiMax:2}),
  T('third', 'Third Form', 100, P(70, 110, 53, 110), {kiMax:3}),
  T('final', 'Final Form', 150, P(130, 130, 75, 130), {kiMax:5}),
  T('full', 'Full Power', 170, P(195, 195, 113, 195), {kiMax:5}),
  T('golden', 'Golden Form', 200, P(250, 300, 188, 250), {kiMax:5}),
  T('black', 'Black Form', 300, P(300, 110, 300, 300), {kiMax:5})
];
const NAMEK = [
  T('pot', 'Potencial Desbloqueado', 70, A(75, X), {kiMax:2.5}),
  T('giant', 'Forma Gigante', 100, {meleeDmg:50, kiDmg:50, meleeRes:70, kiRes:200, vel:0}, {kiMax:5}),
  T('ult', 'Forma Ultimate', 120, A(110, X), {kiMax:5}),
  T('orange', 'Forma Laranja', 250, A(300, X), {kiMax:5})
];

const CATALOG = {saiyajin: SAIYAJIN, arcosian: ARCOSIAN, namekuseijin: NAMEK};
export const getTransforms = (race, mutant) =>
  race === 'saiyajin' && mutant ? MUTANTE : (CATALOG[race] || []);
