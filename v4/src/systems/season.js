import * as THREE from '../../lib/three.module.js';
import { ITEMS } from '../items.js';
import { HOME } from '../group.js';
import { $, toast } from '../engine/ui.js';
import { DRY_DAYS } from './weather.js';
import { DRY_R } from './trek.js';

// Het droge seizoen en de nieuwe dag.
export function initSeason(G) {
  const { state, things, sabres, shore, forage, beast, group, sound, discover, freeHand, renderHands } = G;
  // Elke dag raakt het land rond het kamp verder leeg: je moet steeds verder weg voor eten. Dan breekt de groep op (zie trek.js).
  // Rond de plekken waar ze al geweest zijn blijft het kaal. Na een paar droge dagen komt de regen en groeit alles weer.
  const DRY_COLOR = new THREE.Color(0x8a6a3a);
  function setBush(t, n, dry) {
    const b = t.bush; b.left = n; b.dry = dry;
    if (b.berries) b.berries.count = Math.ceil(14 * n / b.max);
    if (t.item === 'leaf') b.g.scale.y = 0.6 + 0.8 * n / b.max;
    for (const m of b.mats) m.color.copy(b.green).lerp(DRY_COLOR, dry * 0.8);
  }
  function season() {
    const dry = state.day - 1 - state.rainDay, rain = dry >= DRY_DAYS;
    if (rain) { state.rainDay = state.day - 1; state.left = []; state.campDay = state.day; }
    const zones = [[HOME.x, HOME.z, Math.max(0, Math.min(dry, state.day - state.campDay)) * DRY_R], ...state.left];
    for (const t of things) {
      if (!t.bush) continue;
      const d = Math.min(...zones.map(([x, z, r]) => Math.hypot(t.x - x, t.z - z) - r));   // zo ver buiten het kale land
      if (rain || t.item === 'leaf') setBush(t, t.bush.max, 0);   // bij het water blijft het groen
      else if (d < 0) setBush(t, 0, 1);
      else if (d < 15) setBush(t, Math.ceil(t.bush.max / 2), 0.5);
      else setBush(t, t.bush.max, 0);
    }
    forage.dress(rain ? 0 : dry);
    return rain;
  }
  // Een nieuwe dag: de struiken groeien bij (of verdorren), en je hoort hoe de groep erbij zit.
  function newDay(how) {
    state.day++;
    // breekt de groep vandaag op? Alleen als jij erbij bent: ze gaan niet weg terwijl je ergens anders slaapt.
    const trek = G.trek, go = how === 'slept' && trek.due(state.day - 1 - state.rainDay >= DRY_DAYS) ? trek.start() : null;
    const rain = season(), g = state.group, dry = state.day - 1 - state.rainDay;
    const b = state.brought; state.brought = {};
    const list = Object.keys(b).map((it) => `${b[it]}× ${ITEMS[it].name.toLowerCase()}`).join(', ');
    let hint;
    if (rain) hint = 'Overal lopen de struiken weer uit. Geniet ervan: de droogte komt terug.';
    else if (dry === DRY_DAYS - 1) hint = 'Tor ruikt aan de wind en wijst naar zware wolken in de verte. Nog één dag volhouden.';
    else if (sabres.kill && sabres.kill.meat > 0) hint = 'Tor wijst naar de gieren die in de verte cirkelen. Daar ligt vlees.';
    else if (go) hint = 'Loop mee, of ga je eigen weg en kom later. De pijl wijst naar het nieuwe kamp.';
    else if (dry >= 2) hint = 'De struiken rond de boom zijn verdord. Hoe verder je gaat, hoe meer er nog hangt. Het meeste vlees ligt waar de katten jagen.';
    else hint = 'Het wordt droger. De struiken dicht bij de boom zijn verdord. Verderop hangt nog fruit.';
    if (shore) shore.newDay();
    forage.newDay(dry, rain);
    if (G.flat) G.flat.newDay();
    const gh = beast.newDay(dry, rain, G.predGame);   // het grote dier heeft zijn eigen nieuws
    if (gh && rain) hint += ' ' + gh; else if (gh && dry !== DRY_DAYS - 1) hint = gh;
    if (rain) { sound.home(); discover('rain'); } else if (dry >= 1) discover('drought');
    if (how === 'alone') { toast(`Dag ${state.day}. Je hebt de nacht alleen doorgebracht. ` + hint, 8); return; }
    let title, text;
    if (how === 'lost') {
      title = 'Je hebt ze teruggevonden';
      text = trek.CAMPS.length > 1 ? 'De groep kon niet langer wachten en trok weg, op zoek naar eten. Dagenlang volgde je hun spoor, alleen. Nu heb je ze ingehaald, op een nieuwe plek. Ze zijn mager, maar blij je te zien.'
        : 'De groep kon niet langer wachten en trok weg, op zoek naar eten. Dagenlang volgde je hun spoor, alleen. Nu zijn ze terug bij de slaapboom: mager, maar blij je te zien.';
    } else if (g >= 60) {
      title = 'De groep is sterk';
      const h = freeHand();
      if (h >= 0) { state.hands[h] = 'flake'; renderHands(); state.known.add('flake'); }
      text = 'Iedereen heeft goed gegeten.' + (h >= 0 ? ' Tor heeft een scherpe afslag voor je geslagen.' : '');
      if (g >= 70 && !go && group.startFollow()) text += ' Kem loopt vandaag met je mee: wat jij plukt of snijdt, neemt hij ook mee naar de boom.';
    } else if (g >= 25) { title = 'De magen knorren'; text = 'Iedereen is er nog, maar er is weinig over. Tor heeft geen kracht om stenen te slaan.'; }
    else { title = 'De groep is zwak'; text = 'Kleine Ibo huilt van de honger. Als er vandaag niets komt, trekt de groep verder zonder jou.'; }
    if (rain) title = 'De regen is gekomen';
    if (go) text += ' De groep breekt op.';
    const got = how === 'lost' ? '' : list ? 'Gisteren bracht je: ' + list + '.' : 'Gisteren bracht je niets naar de boom.';
    // geen dagkaart: de nieuwe dag zie je aan het licht en aan de groep. De tekst wordt alleen bijgehouden voor de tests.
    toast(`Dag ${state.day}. ${title}. ${text} ${got} ${hint}`);
  }
  // de groep heeft te lang niets gehad en trekt verder
  function groupLeaves() {
    state.lost = true; state.starve = 0; state.sleeping = 4; G.stopWalk(); $('fade').style.opacity = 1; sound.bad();
    toast('De groep kan niet langer wachten. Ze trekken weg, op zoek naar eten…', 3.8);
  }
  return { season, newDay, groupLeaves };
}
