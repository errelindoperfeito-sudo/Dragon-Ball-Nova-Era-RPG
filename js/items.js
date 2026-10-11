// items.js — aba Itens (a lógica fica em entries.js, compartilhada com Habilidades).
import { makeTab } from './entries.js';
const tab = makeTab('items');
export const init = tab.init, render = tab.render;
