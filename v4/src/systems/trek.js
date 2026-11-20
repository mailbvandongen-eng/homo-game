import { AREA } from '../eras/index.js';
import { LOOKS } from '../items.js';
import { HOME } from '../group.js';
import { title, placeWords } from '../engine/ui.js';
import { route } from './route.js';

// De groep trekt rond. Jagers-verzamelaars blijven niet op één plek: is het land rond het kamp leeg gegeten,
// dan breken ze op en lopen ze naar een volgende kampplek. Elk gebied heeft er een paar (zie 'camps' in het gebiedsbestand).
// Dit bestand weet waar het kamp nu is, verhuist alles wat bij het kamp hoort en laat de groep erheen lopen.
const first = { id: 'home', at: [AREA.home.x, AREA.home.z], words: AREA.words, look: (AREA.looks && AREA.looks.tree) || LOOKS.tree };
// say: hoe een plek heet in zinnen. Alle teksten zeggen 'de slaapboom', 'bij de boom' enzovoort; hier wordt dat de naam van deze plek.
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const words = (c) => (c.say ? [['de slaapboom', c.say[0]], ['De slaapboom', cap(c.say[0])], ['bij de boom', c.say[1]], ['naar de boom', c.say[2]], ['onder de boom', c.say[3]], ['rond de boom', c.say[4]]] : AREA.words);
export const CAMPS = (AREA.camps || [{}]).map((c, i) => (i ? { ...c, words: words(c) } : { ...first, ...c, at: first.at }));
export const STAY = 2;   // zoveel dagen blijft de groep op een plek, als het niet regent

export function initTrek(G) {
  const { state, group, fire, player, sound } = G;
  let arrived = true, shown = true, limit = 0, callT = 0;
  const cur = () => CAMPS[state.camp] || CAMPS[0];
  const hearthOf = (c) => c.hearth || (fire && [c.at[0] + fire.off[0], c.at[1] + fire.off[1]]);
  const sourceOf = (c) => c.source || (fire && fire.carried && [c.at[0] + fire.offS[0], c.at[1] + fire.offS[1]]);
  if (fire) { fire.off = [fire.H.x - HOME.x, fire.H.z - HOME.z]; fire.offS = [fire.S.x - HOME.x, fire.S.z - HOME.z]; }
  // het kamp ligt nu hier: de plek zelf, hoe hij heet en wat je ziet als je ernaar kijkt
  function put(i) {
    const c = CAMPS[i]; state.camp = i; HOME.x = c.at[0]; HOME.z = c.at[1];
    LOOKS.tree = c.look || first.look; placeWords(c.words);
    return c;
  }
  // meteen op een kampplek staan: verdergaan na bewaren, of de groep die je na dagen terugvindt
  function jump(i, tell) {
    const c = put(CAMPS[i] ? i : 0);
    group.settle();
    if (fire) { fire.moveTo(hearthOf(c), sourceOf(c)); fire.arrive(); }
    group.beds(hearthOf(c));
    arrived = true; shown = !tell;
  }
  // Is het tijd om op te breken? Niet als het gaat regenen (dan groeit alles weer), niet met een zieke, en niet midden in iets dat hier moet gebeuren.
  function due(rain) {
    if (CAMPS.length < 2 || rain || !arrived || group.sick) return false;
    if (G.missions.mission.active.some((e) => e.m.here)) return false;
    return state.day - state.campDay >= STAY;
  }
  const next = () => (state.camp + 1) % CAMPS.length;
  // wat de groep achterlaat, blijft kaal tot de regen komt
  function leave() { state.left.push([HOME.x, HOME.z, Math.max(1, state.day - state.campDay) * DRY_R]); state.campDay = state.day; }
  // De groep breekt op. wait: zo lang staan ze nog te kijken voor ze gaan lopen.
  function start(wait = 6) {
    const from = [HOME.x, HOME.z]; leave();
    if (fire) fire.depart();
    const c = put(next()), path = route(from, [...(c.via || []), c.at]);   // om rotsen en water heen
    if (fire) fire.moveTo(hearthOf(c), sourceOf(c));
    group.beds(hearthOf(c));   // de slaapplekken liggen op de nieuwe plek
    let len = 0, a = from; for (const q of path) { len += Math.hypot(q[0] - a[0], q[1] - a[1]); a = q; }
    limit = wait + len / 1.85 * 2.2 + 60; arrived = false; shown = false; callT = 1.5;
    group.startTrek(path, wait, !!(fire && fire.carrying), arrive);
    return c;
  }
  function arrive() {
    arrived = true;
    if (fire) fire.arrive();
    if (Math.hypot(player.pos.x - HOME.x, player.pos.z - HOME.z) < 60) sound.home();
  }
  // De groep trok weg zonder jou: je vindt ze terug op de volgende plek.
  function lost() { if (CAMPS.length < 2) return; leave(); jump(next(), true); }
  function update(dt) {
    if (!arrived) { limit -= dt; if (limit < 0) { group.settle(); arrive(); } }   // vangnet: nooit blijven steken onderweg
    // Geen woorden: de voorste wijst en roept. Blijf je achter, dan roept hij opnieuw, uit de richting waar de rij loopt.
    const T = group.trek, lead = T && T.line[0];
    if (lead && state.sleeping <= 0 && (callT -= dt) < 0) {
      const dx = lead.x - player.pos.x, dz = lead.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
      if (T.wait > 0 || d > 14) { sound.call((dx * -Math.cos(G.camYaw) + dz * Math.sin(G.camYaw)) / d * Math.min(1, d / 4), false, Math.max(0.3, Math.min(1, 1.25 - d / 60))); callT = T.wait > 0 ? T.wait + 2 : 7; }
      else callT = 1;
    }
    // de naam van de nieuwe plek zie je als je er met de groep staat
    if (arrived && !shown && state.sleeping <= 0 && Math.hypot(player.pos.x - HOME.x, player.pos.z - HOME.z) < 22) {
      shown = true; const c = cur();
      if (c.name) title('Nieuw kamp', c.name, c.intro || '', 6);
    }
  }
  return { CAMPS, cur, due, next, start, jump, lost, update, get active() { return !arrived; } };
}
export const DRY_R = 20;   // zoveel meter per dag raakt het land rond het kamp leeg
