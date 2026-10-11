// abilities.js — aba Habilidades (a lógica fica em entries.js, compartilhada com Itens).
import { makeTab } from './entries.js';
const tab = makeTab('abilities');
export const init = tab.init, render = tab.render;
