import { toast, note, sign } from '../engine/ui.js';
import { ICON } from '../icons.js';

// Eten: wat het je geeft, hoe het smaakt, en wat je ervan leert.
export function initFood(G) {
  const { state, player, sound, discover, renderHands, freeHand } = G;
  // Hoe iets smaakt lees je niet, dat hoor je aan jezelf: een tevreden 'hm' of een vies 'ugh'. Geen woorden, en niet bij
  // elke hap: na een reactie blijft het een tijd stil. Gewoon eten (rauw vlees, een knol) kauw je zonder iets te zeggen.
  const TASTE = { berry: 'hm', fig: 'hm', baobab: 'hm', honey: 'hm', roast: 'hm', egg: 'hm', fish: 'hm', marrow: 'hm', redberry: 'ugh', leaf: 'ugh' };
  const TASTE_WAIT = { hm: 20, ugh: 8 }, tasteAt = { hm: -1e9, ugh: -1e9 }, heard = [];
  function taste(it) {
    const k = TASTE[it], now = performance.now() / 1000;
    if (!k || now - tasteAt[k] < TASTE_WAIT[k]) return;
    tasteAt[k] = now; heard.push(k); if (heard.length > 20) heard.shift();
    setTimeout(() => sound.voice(k), 650);
  }
  const FOOD = { berry: 15, redberry: 5, roast: 55, meat: 35, egg: 20, honey: 30, tuber: 18, fish: 30, fig: 12 };
  // sappig eten lest ook je dorst: een knol is voor wie ver van het water woont bijna een waterzak
  const JUICE = { berry: 6, redberry: 4, fig: 9, tuber: 14, fish: 5, meat: 4, egg: 6, honey: 2 };
  // Eten geneest, direct en per hap: vlees en merg veel, knollen en vruchten gemiddeld, bessen weinig.
  // Bitterblad is er voor wonden: het geneest je helemaal en stopt gif.
  const HEAL = { roast: 45, meat: 35, fish: 30, honey: 25, egg: 22, tuber: 20, fig: 20, baobab: 20, berry: 8, marrow: 40, grubs: 10, scraps: 20 };
  const heal = (k) => { state.health = Math.min(100, state.health + (HEAL[k] || 0)); };
  function eat(it) {
    player.action = 0.5; sound.eat(); taste(it);
    state.food = Math.min(100, state.food + (FOOD[it] || 0));
    state.water = Math.min(100, state.water + (JUICE[it] || 0));
    heal(it);
    if (it === 'roast') state.ate = { ...state.ate, roast: true };
    if (it === 'redberry') state.sick = 75;
    if (it === 'leaf') { const hurt = state.health < 100 || state.sick > 0; state.sick = 0; state.health = 100; if (hurt) { sound.good(); sign(ICON.wound + ICON.check, 2.4, 'good'); } }
    state.known.add(it);
    if (['berry', 'redberry', 'meat', 'egg', 'honey', 'leaf', 'fig'].includes(it)) discover(it);
  }
  function crack() {
    const b = state.hands.indexOf('bone');
    state.hands[b] = null; renderHands(); player.action = 0.5; sound.crack();
    state.food = Math.min(100, state.food + 40); heal('marrow');
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
  // een baobabvrucht openslaan met een kei: in de harde schil zit droog, zuur vruchtvlees
  function crackFruit() {
    const b = state.hands.indexOf('baobab'); if (b < 0) return;
    state.hands[b] = null; renderHands(); player.action = 0.5; sound.crack();
    state.food = Math.min(100, state.food + 26); state.water = Math.min(100, state.water + 8); heal('baobab');
    state.known.add('baobab'); taste('baobab'); discover('baobab');
  }
  // met een afslag de laatste reepjes vlees van het karkas snijden
  function cutMeat() {
    if (state.carcassMeat <= 0) { note('bone', 'Alleen botten'); return; }
    state.carcassMeat = 0; player.action = 0.5; sound.eat();
    state.food = Math.min(100, state.food + 25); heal('scraps');
    discover('cut');
  }
  return { eat, taste, crack, crackFruit, cutMeat, heal, FOOD, HEAL, heard, tasteAt };
}
