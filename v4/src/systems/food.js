import { toast } from '../engine/ui.js';

// Eten: wat het je geeft, hoe het smaakt, en wat je ervan leert.
export function initFood(G) {
  const { state, player, sound, discover, renderHands, freeHand } = G;
  // Hoe iets smaakt lees je niet, dat hoor je aan jezelf: een tevreden 'hm' of een vies 'ugh'. Geen woorden, en niet bij
  // elke hap: na een reactie blijft het een tijd stil. Gewoon eten (rauw vlees, een knol) kauw je zonder iets te zeggen.
  const TASTE = { berry: 'hm', honey: 'hm', roast: 'hm', egg: 'hm', fish: 'hm', marrow: 'hm', redberry: 'ugh', leaf: 'ugh' };
  const TASTE_WAIT = { hm: 20, ugh: 8 }, tasteAt = { hm: -1e9, ugh: -1e9 }, heard = [];
  function taste(it) {
    const k = TASTE[it], now = performance.now() / 1000;
    if (!k || now - tasteAt[k] < TASTE_WAIT[k]) return;
    tasteAt[k] = now; heard.push(k); if (heard.length > 20) heard.shift();
    setTimeout(() => sound.voice(k), 650);
  }
  const FOOD = { berry: 15, redberry: 5, roast: 55, meat: 35, egg: 20, honey: 30, tuber: 18, fish: 30 };
  function eat(it) {
    player.action = 0.5; sound.eat(); taste(it);
    state.food = Math.min(100, state.food + (FOOD[it] || 0));
    if (it === 'roast') { state.health = Math.min(100, state.health + 5); state.ate = { ...state.ate, roast: true }; }
    if (it === 'honey') state.health = Math.min(100, state.health + 8);
    if (it === 'redberry') state.sick = 75;
    if (it === 'leaf') { if (state.sick <= 0) return; state.sick = 0; }
    state.known.add(it);
    if (['berry', 'redberry', 'meat', 'egg', 'honey', 'leaf'].includes(it)) discover(it);
  }
  function crack() {
    const b = state.hands.indexOf('bone');
    state.hands[b] = null; renderHands(); player.action = 0.5; sound.crack();
    state.food = Math.min(100, state.food + 40);
    state.known.add('bone'); state.known.add('stone');
    taste('marrow');
    discover('marrow');
    // de eerste keer springt er een scherp scherfje van de kei: zo ontdek je hoe je afslagen maakt
    if (!state.found.has('flake')) setTimeout(() => {
      toast('Hé… er is een scherp scherfje van de kei gesprongen! Je raapt het op.', 5);
      const h = state.hands[b] === null ? b : freeHand();
      if (h < 0) G.dropAt('flake'); else { state.hands[h] = 'flake'; renderHands(); }
      state.known.add('flake'); discover('flake');
    }, 5200);
  }
  // met een afslag de laatste reepjes vlees van het karkas snijden
  function cutMeat() {
    if (state.carcassMeat <= 0) { toast('Er zit echt niets meer aan. Alleen de botten nog.'); return; }
    state.carcassMeat = 0; player.action = 0.5; sound.eat();
    state.food = Math.min(100, state.food + 25);
    discover('cut');
  }
  return { eat, taste, crack, cutMeat, FOOD, heard, tasteAt };
}
