import * as THREE from '../../lib/three.module.js';
import { ERA, AREA, ERAS } from '../eras/index.js';
import { ITEMS } from '../items.js';
import { HOME } from '../group.js';
import { Save, DEV } from '../save.js';
import { $, title, showCard, closeCard } from '../engine/ui.js';

// Bewaren en verdergaan.
export function initPersist(G) {
  const { state, player, hints, season, renderHands, renderBag, putCloak } = G, { mission, MISSIONS } = G.missions;
  // Bewaard wordt wat je bent en weet, niet waar elk bot ligt: je wordt wakker bij de slaapboom en de wereld is weer vol.
  function snapshot() {
    return {
      era: ERA.id, area: AREA.id, day: state.day, rainDay: state.rainDay, dayP: +G.dayP.toFixed(3),
      food: Math.round(state.food), water: Math.round(state.water), health: Math.round(state.health), group: Math.round(state.group),
      hands: state.hands, rock: state.rock, bag: state.bag, cloak: state.cloak, knapped: !!state.knapped,
      known: [...state.known], found: [...state.found], finds: [...state.finds], rockKnown: [...state.rockKnown], given: [...state.given],
      fire: G.fire ? G.fire.snapshot() : undefined,
      missions: [...mission.done], mission: mission.cur ? mission.cur.id : null, active: mission.active.map((e) => e.m.id), over: mission.over, past: state.past,
    };
  }
  function restore(d) {
    if (!d || d.era !== ERA.id || d.area !== AREA.id) return false;
    if (d.fresh) {
      // hier nog niet gespeeld: je begint op de eerste dag, maar wat je elders leerde weet je nog
      for (const k of ['known', 'found', 'finds', 'rockKnown']) if (Array.isArray(d[k])) state[k] = new Set(d[k]);
      if (Array.isArray(d.past)) state.past = d.past.filter((x) => typeof x === 'string');
      if (AREA !== ERA.areas[0] || ERA !== ERAS[0]) title(ERA.species, AREA.name, AREA.intro || '', 6);
      return false;
    }
    const ok = (it) => it === null || !!ITEMS[it], num = (v, def) => (Number.isFinite(v) ? v : def);
    state.day = Math.max(1, num(d.day, 1)); state.rainDay = num(d.rainDay, 0); G.dayP = THREE.MathUtils.clamp(num(d.dayP, 0.12), 0, 0.6);   // nooit midden in de nacht wakker worden
    state.food = Math.max(25, num(d.food, 55)); state.water = Math.max(30, num(d.water, 75)); state.health = Math.max(40, num(d.health, 100)); state.group = Math.max(20, num(d.group, 50));
    if (Array.isArray(d.hands) && d.hands.length === 2 && d.hands.every(ok)) { state.hands = d.hands; state.rock = Array.isArray(d.rock) && d.rock.length === 2 ? d.rock : [null, null]; }
    if (Array.isArray(d.bag) && d.bag.length === 5 && d.bag.every((e) => e === null || (e && ITEMS[e.it]))) state.bag = d.bag;
    state.cloak = !!d.cloak; state.knapped = !!d.knapped;
    for (const k of ['known', 'found', 'finds', 'rockKnown', 'given']) if (Array.isArray(d[k])) state[k] = new Set(d[k]);
    mission.done = new Set((d.missions || []).filter((id) => MISSIONS.some((m) => m.id === id)));
    G.missions.clear();
    for (const id of [...(Array.isArray(d.active) ? d.active : []), d.mission]) G.missions.start(MISSIONS.find((m) => m.id === id));
    G.missions.follow(MISSIONS.find((m) => m.id === d.mission));
    if (!mission.cur && mission.active.length) G.missions.follow(mission.active[0].m);
    if (Array.isArray(d.past)) state.past = d.past.filter((x) => typeof x === 'string');
    if (d.arrived) title(ERA.species, AREA.name, AREA.intro || '', 6);   // net aangekomen in een nieuw gebied
    mission.over = !!d.over;
    if (G.fire) G.fire.restore(d.fire);
    player.pos.set(HOME.x + 2, 0, HOME.z + 4); player.vel.set(0, 0, 0);
    season(); renderHands(); renderBag(); if (state.cloak) putCloak();
    hints.playT = 30; hints.moved = 9;   // geen beginaanwijzingen meer
    return true;
  }
  let saveT = 0;
  function saveTick(dt) {
    saveT += dt;
    if (saveT > 6 && state.started && state.collapsed <= 0 && !state.lost && !window.__nosave) { saveT = 0; Save.write(snapshot()); }
  }
  addEventListener('pagehide', () => { if (state.started && !window.__nosave) Save.write(snapshot()); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.started && !window.__nosave) Save.write(snapshot()); });
  function restart() {
    showCard(`<div class="eyebrow">Opnieuw beginnen</div><h2>${AREA.name} opnieuw?</h2><p>Je begint hier weer op de eerste dag, zonder wat je hier gemaakt hebt. De andere gebieden blijven zoals ze zijn.</p>
      <div class="row"><button class="btn" id="noRestart">Nee, verder spelen</button><button class="btn ghost" id="yesRestart">Ja, opnieuw</button></div>`);
    $('noRestart').onclick = closeCard;
    $('yesRestart').onclick = () => { window.__nosave = 1; Save.reset(ERA.id, AREA.id); location.replace(location.pathname + (DEV ? '?dev=1' : '')); };
  }
  // een ander gebied kiezen: eerst bewaren wat je hier hebt, dan daar verder (of er beginnen)
  function goArea(era, area) {
    if (area === AREA.id) return;
    if (state.started && !window.__nosave) Save.write(snapshot());
    window.__nosave = 1; Save.go(era, area); $('fade').style.opacity = 1;
    setTimeout(() => location.replace(location.pathname + (DEV ? '?dev=1' : '')), 500);
  }
  G.goArea = goArea;
  G.restart = restart;
  return { snapshot, restore, saveTick };
}
