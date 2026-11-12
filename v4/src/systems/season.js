import * as THREE from '../../lib/three.module.js';
import { ITEMS } from '../items.js';
import { HOME } from '../group.js';
import { $, toast, showCard } from '../engine/ui.js';

// Het droge seizoen en de nieuwe dag.
export function initSeason(G) {
  const { state, things, sabres, shore, giant, group, sound, discover, freeHand, renderHands } = G;
  // Elke dag droogt het land verder uit, vanaf de slaapboom gezien: je moet steeds verder weg voor eten.
  // Na een paar droge dagen komt de regen en groeit alles weer.
  const DRY_DAYS = 5, DRY_COLOR = new THREE.Color(0x8a6a3a);
  function setBush(t, n, dry) {
    const b = t.bush; b.left = n; b.dry = dry;
    if (b.berries) b.berries.count = Math.ceil(14 * n / b.max);
    if (t.item === 'leaf') b.g.scale.y = 0.6 + 0.8 * n / b.max;
    for (const m of b.mats) m.color.copy(b.green).lerp(DRY_COLOR, dry * 0.8);
  }
  function season() {
    const dry = state.day - 1 - state.rainDay, rain = dry >= DRY_DAYS, R = dry * 16;
    if (rain) state.rainDay = state.day - 1;
    for (const t of things) {
      if (!t.bush) continue;
      const d = Math.hypot(t.x - HOME.x, t.z - HOME.z);
      if (rain || t.item === 'leaf') setBush(t, t.bush.max, 0);   // bij het water blijft het groen
      else if (d < R) setBush(t, 0, 1);
      else if (d < R + 15) setBush(t, Math.ceil(t.bush.max / 2), 0.5);
      else setBush(t, t.bush.max, 0);
    }
    return rain;
  }
  // Een nieuwe dag: de struiken groeien bij (of verdorren), en je hoort hoe de groep erbij zit.
  function newDay(how) {
    state.day++;
    const rain = season(), g = state.group, dry = state.day - 1 - state.rainDay;
    const b = state.brought; state.brought = {};
    const list = Object.keys(b).map((it) => `${b[it]}× ${ITEMS[it].name.toLowerCase()}`).join(', ');
    let hint;
    if (rain) hint = 'Overal lopen de struiken weer uit. Geniet ervan: de droogte komt terug.';
    else if (dry === DRY_DAYS - 1) hint = 'Tor ruikt aan de wind en wijst naar zware wolken in de verte. Nog één dag volhouden.';
    else if (sabres.kill && sabres.kill.meat > 0) hint = 'Tor wijst naar de gieren die in de verte cirkelen. Daar ligt vlees.';
    else if (dry >= 2) hint = 'De struiken rond de boom zijn verdord. Hoe verder je gaat, hoe meer er nog hangt. Het meeste vlees ligt waar de katten jagen.';
    else hint = 'Het wordt droger. De struik bij de boom is verdord. Verderop hangt nog fruit.';
    if (shore) shore.newDay();
    const gh = giant.newDay(dry, rain, G.predGame);   // de reus heeft zijn eigen nieuws
    if (gh && rain) hint += ' ' + gh; else if (gh && dry !== DRY_DAYS - 1) hint = gh;
    if (rain) { sound.home(); discover('rain'); } else if (dry >= 1) discover('drought');
    if (how === 'alone') { toast(`Dag ${state.day}. Je hebt de nacht alleen doorgebracht. ` + hint, 8); return; }
    let title, text;
    if (how === 'lost') {
      title = 'Je hebt ze teruggevonden';
      text = 'De groep kon niet langer wachten en trok weg, op zoek naar eten. Dagenlang volgde je hun spoor, alleen. Nu zijn ze terug bij de slaapboom: mager, maar blij je te zien.';
    } else if (g >= 60) {
      title = 'De groep is sterk';
      const h = freeHand();
      if (h >= 0) { state.hands[h] = 'flake'; renderHands(); state.known.add('flake'); }
      text = 'Iedereen heeft goed gegeten.' + (h >= 0 ? ' Tor heeft een scherpe afslag voor je geslagen.' : '');
      if (g >= 70 && group.startFollow()) text += ' Kem loopt vandaag met je mee: wat jij plukt of snijdt, neemt hij ook mee naar de boom.';
    } else if (g >= 25) { title = 'De magen knorren'; text = 'Iedereen is er nog, maar er is weinig over. Tor heeft geen kracht om stenen te slaan.'; }
    else { title = 'De groep is zwak'; text = 'Kleine Ibo huilt van de honger. Als er vandaag niets komt, trekt de groep verder zonder jou.'; }
    if (rain) title = 'De regen is gekomen';
    const got = how === 'lost' ? '' : `<p>${list ? 'Gisteren bracht je: ' + list + '.' : 'Gisteren bracht je niets naar de boom.'}</p>`;
    showCard(`<div class="eyebrow">Dag ${state.day}</div><h2>${title}</h2><p>${text}</p>${got}<p class="know">${hint}</p>`);
  }
  // de groep heeft te lang niets gehad en trekt verder
  function groupLeaves() {
    state.lost = true; state.starve = 0; state.sleeping = 4; G.stopWalk(); $('fade').style.opacity = 1; sound.bad();
    toast('De groep kan niet langer wachten. Ze trekken weg, op zoek naar eten…', 3.8);
  }
  return { season, newDay, groupLeaves };
}
