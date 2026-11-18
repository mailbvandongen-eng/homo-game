import { $, note } from '../engine/ui.js';
import { ICON } from '../icons.js';

// Wat je lijf en je groep je laten merken: de streepjes, je knorrende maag, het huilen bij de boom.
export function initBody(G) {
  const { state, sound } = G;
  const statShow = { food: 0, water: 0, health: 0, group: 0 }, statPrev = { food: 70, water: 85, health: 100, group: 50 };
  let bellyT = 8, cryT = 5, hungerTold = false;
  for (const [id, k] of [['statFood', 'food'], ['statWater', 'water'], ['statHealth', 'health'], ['statGroup', 'group'], ['statSick', 'sick'], ['statTired', 'tired'], ['dayIcon', 'day'], ['homeIcon', 'home']]) $(id).innerHTML = ICON[k];
  function bodySignals(dt, sick, hd, weary = 0) {
    // de tekens zie je alleen als er iets verandert, als het slecht gaat, of als je stilstaat en voelt hoe het met je is
    for (const [k, id, low] of [['food', 'statFood', 20], ['water', 'statWater', 30], ['health', 'statHealth', 35], ['group', 'statGroup', 20]]) {
      const v = state[k];
      if (Math.abs(v - statPrev[k]) > 0.6) statShow[k] = 5;
      statPrev[k] = v; statShow[k] -= dt;
      const el = $(id);
      el.style.setProperty('--v', Math.max(0, Math.round(v)));
      el.classList.toggle('on', statShow[k] > 0 || v < low || state.sensing || (k === 'health' && sick));
      el.classList.toggle('low', v < low);
    }
    $('statSick').classList.toggle('on', !!sick); $('statSick').classList.toggle('low', !!sick);
    // moe: het teken knippert, en de rand laat zien hoe moe
    const tired = weary > 0.25 && state.started && state.sleeping <= 0;
    $('statTired').classList.toggle('on', tired); $('statTired').classList.toggle('blink', tired); $('statTired').style.setProperty('--v', Math.round(weary * 100));
    $('dayRow').classList.toggle('on', state.sensing);
    $('homeRow').classList.toggle('on', state.sensing && hd > 22);
    if (!state.started || state.sleeping > 0 || state.collapsed > 0) return;
    if (state.food < 20) {
      bellyT -= dt;
      if (bellyT <= 0) { bellyT = 16 + Math.random() * 10; sound.belly(); if (!hungerTold) { hungerTold = true; note('food', 'Honger', 3); } }
    } else hungerTold = false;
    if (state.group < 20 && hd < 45 && !state.lost) { cryT -= dt; if (cryT <= 0) { cryT = 12 + Math.random() * 8; sound.cry(1 - hd / 60); } }
  }
  return bodySignals;
}
