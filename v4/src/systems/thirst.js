import { height, poolAt, WATER } from '../world.js';
import { toast, need } from '../engine/ui.js';

// Dorst. Je lijf verliest water: in de hitte van de middag en als je rent het snelst. Drinken doe je aan de rivier of het meer.
// Stilstaand water in een poel maakt ziek. In de maag van een dier kun je water meedragen: voor onderweg, of voor de groep.
const FULL_DAY = 2 * 14 * 60;   // zo lang doe je in de schaduw met een volle buik water: twee hele dagen

export function initThirst(G) {
  const { state, player, sound, discover, renderHands, freeHand, handsFull } = G;
  let told = false, dryT = 6, sipT = 0;

  // sta je aan of in het water? 'river' (stromend, of het meer), 'pool' (stilstaand) of null
  function waterAt() {
    const p = player.pos, fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    for (const r of [0, 0.8, 1.5]) {
      const x = p.x + fx * r, z = p.z + fz * r;
      if (poolAt(x, z)) return 'pool';
      if (height(x, z) < WATER - 0.02) return 'river';
    }
    return null;
  }

  // heat: 0..1 hoe heet het is · rain: 0..1 · running: ren je?
  function tick(dt, { heat, rain, running, off }) {
    if (off) return;
    // Sta je in stromend water, dan drink je vanzelf: je hoeft er geen knop voor te zoeken. (Een poel is anders: daar kies je zelf.)
    const p = player.pos;
    if (state.water < 100 && height(p.x, p.z) < WATER - 0.02 && !poolAt(p.x, p.z)) {
      state.water = Math.min(100, state.water + dt * 16);
      if ((sipT -= dt) <= 0) { sipT = 1.3; sound.sip(); discover('drink'); }
      return;
    }
    const k = (1 + heat * 0.4) * (running ? 1.3 : 1) * (1 - Math.min(1, rain * 1.5) * 0.8);
    state.water = Math.max(0, state.water - dt * 100 / FULL_DAY * k);
    if (state.water >= 30) { told = false; return; }
    dryT -= dt;
    if (dryT <= 0) {
      dryT = 18 + Math.random() * 10; sound.dry();
      if (!told) { told = true; toast(state.hands.includes('waterbag') ? 'Je mond is droog. Je hebt water bij je.' : 'Je mond is droog. Je moet drinken: zoek het water.', 5); }
    }
  }

  function drink() {
    const w = waterAt(); if (!w) return;
    player.action = 0.6; sound.sip();
    state.water = Math.min(100, state.water + 45);
    if (w === 'pool') {
      // stilstaand water: warm, groen, en je wordt er ziek van
      setTimeout(() => sound.voice('ugh'), 700);
      state.sick = Math.max(state.sick, 60);
      if (!state.known.has('poolwater')) toast('Het water in de poel is warm en smaakt muf. Even later krimpt je buik samen…', 6);
      state.known.add('poolwater'); discover('pool');
    } else discover('drink');
  }

  // de lege maag in het water houden tot hij vol is
  function fill(i = state.hands.indexOf('pouch')) {
    if (i < 0 || state.hands[i] !== 'pouch' || waterAt() !== 'river') return;
    state.hands[i] = 'waterbag'; renderHands(); sound.sip(); player.action = 0.6;
    if (!state.found.has('waterbag')) toast('De maag zwelt op in het water. Je knijpt de opening dicht: hij lekt niet. Nu kun je water meenemen.', 7);
    state.known.add('pouch'); state.known.add('waterbag'); discover('waterbag');
  }

  // een paar slokken uit de zak: daarna is hij leeg
  function drinkBag(i = state.hands.indexOf('waterbag')) {
    if (i < 0 || state.hands[i] !== 'waterbag') return;
    state.hands[i] = 'pouch'; renderHands(); sound.sip(); player.action = 0.6;
    state.water = Math.min(100, state.water + 55);
  }

  // met iets scherps de maag uit een vers gedood dier snijden
  function cutPouch(k) {
    if (!k || k.noPouch) return;
    if (!G.sharp()) { need('flake', 'Met je handen krijg je de buik niet open. Je hebt iets scherps nodig.'); return; }
    if (freeHand() < 0) { handsFull(); return; }
    k.noPouch = true; state.hands[freeHand()] = 'pouch'; renderHands(); sound.eat();
    if (!state.known.has('pouch')) toast('Je snijdt de maag los en knijpt hem leeg. Een taaie, lege zak. Wat zou erin kunnen?', 6);
    discover('cut');
  }

  // wat de actieknop hier aanbiedt
  function option() {
    const w = waterAt(); if (!w) return null;
    if (w === 'river' && state.hands.includes('pouch')) return { mode: 'fill', run: () => G.act('PickUp_Table', () => fill(), 1.4) };
    if (state.water > 80 || (w === 'pool' && state.known.has('poolwater') && state.water > 12)) return null;
    return { mode: 'drink', run: () => G.act('PickUp_Table', drink, 1.4) };
  }
  return { tick, waterAt, drink, fill, drinkBag, cutPouch, option };
}
