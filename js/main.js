// main.js — ponto de entrada: inicializa os módulos e liga os renders ao estado.
import { subscribe } from './state.js';
import { syncUnlocks } from './level.js';
import { clampBars, initBars } from './bars.js';
import { initXp } from './xp.js';
import * as ui from './ui.js';
import * as abilities from './abilities.js';
import * as items from './items.js';
import * as notes from './notes.js';

syncUnlocks();
subscribe(clampBars);
subscribe(ui.render);
ui.init(); initBars(); initXp();
abilities.init(); items.init(); notes.init();
clampBars();
ui.render();
