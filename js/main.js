// main.js — ponto de entrada: inicializa os módulos e liga os renders ao estado.
import { subscribe, commit } from './state.js';
import { syncUnlocks } from './level.js';
import { clampBars, initBars } from './bars.js';
import { initXp } from './xp.js';
import * as ui from './ui.js';
import * as abilities from './abilities.js';
import * as items from './items.js';
import * as skills from './skills.js';
import * as notes from './notes.js';
import * as sidebar from './sidebar.js';

syncUnlocks();
subscribe(clampBars);
subscribe(ui.render);
subscribe(() => skills.render());
subscribe(sidebar.render);
ui.init(); initBars(); initXp();
abilities.init(); skills.init(); items.init(); notes.init(); sidebar.init();
clampBars();
ui.render();

// Ao trocar/criar/deletar/resetar a ficha ativa: recarrega tudo que não depende só do estado.
document.addEventListener('sheetchange', () => {
  ui.closePanels(); notes.refresh(); abilities.render(); items.render();
  commit();
  window.scrollTo({ top: 0 });
});
