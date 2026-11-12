import { $, toast } from '../engine/ui.js';

// Wat je lijf en je groep je laten merken: de streepjes, je knorrende maag, het huilen bij de boom.
export function initBody(G) {
  const { state, sound } = G;
  const statShow = { food: 0, health: 0, group: 0 }, statPrev = { food: 55, health: 100, group: 50 };
  let bellyT = 8, cryT = 5, hungerTold = false;
  function bodySignals(dt, sick, hd) {
    // de streepjes zie je alleen als er iets verandert, als het slecht gaat, of als je stilstaat en voelt hoe het met je is
    for (const [k, id, low] of [['food', 'statFood', 20], ['health', 'statHealth', 35], ['group', 'statGroup', 20]]) {
      const v = state[k];
      if (Math.abs(v - statPrev[k]) > 0.6) statShow[k] = 5;
      statPrev[k] = v; statShow[k] -= dt;
      $(id).classList.toggle('on', statShow[k] > 0 || v < low || state.sensing || (k === 'health' && sick));
    }
    $('homeRow').classList.toggle('on', state.sensing && hd > 22);
    if (!state.started || state.sleeping > 0 || state.collapsed > 0) { $('weak').style.opacity = 0; return; }
    if (state.food < 20) {
      bellyT -= dt;
      if (bellyT <= 0) { bellyT = 16 + Math.random() * 10; sound.belly(); if (!hungerTold) { hungerTold = true; toast('Je maag knort. Je moet zelf ook eten.', 4); } }
    } else hungerTold = false;
    $('weak').style.opacity = state.health < 35 ? (1 - state.health / 35) * (0.55 + 0.2 * Math.sin(G.clock.elapsedTime * 3)) + 0.15 : 0;
    if (state.group < 20 && hd < 45 && !state.lost) { cryT -= dt; if (cryT <= 0) { cryT = 12 + Math.random() * 8; sound.cry(1 - hd / 60); } }
  }
  return bodySignals;
}
