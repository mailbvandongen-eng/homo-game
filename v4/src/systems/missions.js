import * as THREE from '../../lib/three.module.js';
import { initPortrait } from './portrait.js';
import { ERAS, ERA, AREA } from '../eras/index.js';
import { HOME } from '../group.js';
import { Save, DEV } from '../save.js';
import { ICON } from '../icons.js';
import { $, toast, title, sign, showCard, closeCard } from '../engine/ui.js';

// Missies: wie in de groep iets nodig heeft roept en wenkt; aantikken is aannemen. Alle missies klaar: de groep trekt verder.
export function initMissions(G) {
  const { state, player, hyenas, sabres, group, scene, sound, closeRadial, hints } = G;
  // Eten zoeken en delen moet altijd; dat is geen missie. Een missie heeft een doel: iets maken of iets kunnen.
  // Je kiest er zelf één, ziet de stappen, en als ze alle vier gelukt zijn trekt de groep verder.
  const has = (it) => state.hands.includes(it);
  const carries = (it) => has(it) || !!(state.bag && state.bag.some((e) => e && e.it === it));
  const MISSIONS = AREA.missions({ state, has, carries, player, hyenas, sabres, group, night: () => G.predGame.night, dayP: () => G.dayP, fire: () => G.fire, herd: () => G.herd, beast: () => G.beast });
  // waar het hierna heen gaat: een volgend gebied, of een volgend tijdperk
  const NEXT_ERA = ERAS.find((e) => e.playable && e.areas.some((a) => a.id === AREA.next && a.playable)) || ERA;
  const NEXT = NEXT_ERA.areas.find((a) => a.id === AREA.next && a.playable) || null;
  const NAMES = Object.fromEntries(group.list.map((g) => [g.id, g.name]));
  for (const m of MISSIONS) m.steps.push({ t: 'Ga terug naar ' + NAMES[m.who], ok: () => false });
  // Niemand duwt je een keuzescherm onder je neus: wie iets nodig heeft roept en wenkt bij de slaapboom.
  // Aantikken is aannemen. Daarna terug naar diegene, en het is volbracht.
  // Je kunt meer missies tegelijk hebben (active). Eén ervan volg je (cur): daarvan zie je de stap in beeld.
  const mission = { active: [], cur: null, giver: null, done: new Set(), over: false, callT: 12, calls: 0, endT: 0, shown: -1, lineT: 0, tickT: 0, viewing: false, pointT: 0 };
  const stepOf = (m) => { let n = 0; while (n < m.steps.length - 1 && m.steps[n].ok()) n++; return n; };
  const entryOf = (m) => mission.active.find((e) => e.m === m);
  const offerOf = (g) => (mission.over || g.sick > 0 ? null : MISSIONS.find((m) => m.who === g.id && !mission.done.has(m.id) && !entryOf(m) && (!m.needs || mission.done.has(m.needs)) && (!m.when || m.when())) || null);
  function follow(m) { const e = m && entryOf(m); mission.cur = e ? e.m : null; mission.giver = e ? e.giver : null; mission.shown = -1; }
  // een missie loopt (zonder plechtigheid): voor het bewaarde spel en de testmodus
  function start(m, startT = 9) {
    if (!m || entryOf(m) || mission.done.has(m.id)) return;
    mission.active.push({ m, giver: group.list.find((g) => g.id === m.who), startT, late: false });
    if (m.onStart) m.onStart();
    if (!mission.cur) follow(m);
  }
  function clear() { mission.active = []; follow(null); }
  function accept(g) {
    const m = offerOf(g); if (!m) return;
    closeRadial(); start(m, 0); follow(m); g.busy = 3;
    G.camTurn = { x: g.x, z: g.z, t: 1.8 };
    sound.mission(); title('Missie', m.title, m.ask); show(m, g);
  }
  function complete(m) {
    const e = entryOf(m);
    mission.done.add(m.id); mission.active = mission.active.filter((x) => x.m !== m); mission.callT = 45; mission.calls = 0;
    if (e && e.giver) e.giver.busy = 3;
    if (mission.cur === m) follow(mission.active.length ? mission.active[0].m : null);
    showLine();
    state.group = Math.min(100, state.group + 10);
    sound.discover(); title('Missie volbracht', m.title, m.end); if (e) show(m, e.giver, 'check');
    if (mission.done.size === MISSIONS.length) mission.endT = 7;
  }
  // wat de vrager wil hebben, als teken
  const WANT = { flake: 'flake', hyena: 'hyena', bag: 'pouch', cloak: 'hide', water: 'waterbag', stick: 'stick', fish: 'fish', sick: 'leaf', track: 'track', axe: 'axe', fire: 'fire', keep: 'fire', camp: 'fire', roast: 'roast', glass: 'flake', run: 'run' };
  const face = initPortrait(G);
  // een missie begint of is klaar: het gezicht van wie het vroeg en het teken van wat hij wil (of een vinkje), zonder woorden
  function show(m, g, mark) { sign(`<img alt="" src="${face(g)}">${ICON[WANT[m.id]] || ''}${mark ? ICON[mark] : ''}`, 4, mark ? 'good' : ''); }
  // het overzicht: per missie het gezicht van wie het vroeg, het teken van wat hij wil en een kerfje per stap. Geen woorden.
  function missionInfo() {
    if (!mission.active.length) return;
    const row = (e) => {
      const m = e.m, n = stepOf(m), on = m === mission.cur;
      return `<button class="mrow${on ? ' now' : ''}" data-m="${m.id}" aria-label="${m.title}"><img class="mface" alt="" src="${face(e.giver)}"><span class="mwant">${ICON[WANT[m.id]] || ''}</span><span class="notch">${m.steps.map((x, i) => `<i class="${i < n ? 'ok' : i === n ? 'at' : ''}"></i>`).join('')}</span></button>`;
    };
    showCard(`<div class="mlist">${mission.active.map(row).join('')}</div>`);
    mission.viewing = true;
    $('card').onpointerdown = (e) => e.stopPropagation();
    for (const b of $('card').querySelectorAll('.mrow')) b.onclick = () => { const m = MISSIONS.find((x) => x.id === b.dataset.m); if (m === mission.cur) closeCard(); else { follow(m); sound.pick(); missionInfo(); } };
  }
  $('questBtn').insertAdjacentHTML('afterbegin', ICON.quest);
  $('questBtn').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('questBtn').addEventListener('click', missionInfo);
  // het teken boven het hoofd van wie je roept: een warm lichtje, pas zichtbaar als je in de buurt bent
  const callTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, '#fff3c8'); g.addColorStop(0.25, '#f0a030'); g.addColorStop(0.5, '#f0a03066'); g.addColorStop(1, '#f0a03000');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  for (const g of group.list) {
    g.mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: callTex, transparent: true, depthWrite: false, opacity: 0 }));
    g.mark.scale.setScalar(0.42); g.mark.visible = false; scene.add(g.mark);
  }
  function callOut(g) {
    const dx = g.x - player.pos.x, dz = g.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
    const pan = (dx * -Math.cos(G.camYaw) + dz * Math.sin(G.camYaw)) / d;
    sound.call(pan * Math.min(1, d / 4), !!g.child, THREE.MathUtils.clamp(1.25 - d / 45, 0.3, 1));
    g.busy = Math.max(g.busy, 1.6);
  }
  // Alles is hier gedaan: de groep trekt verder. Meegaan = bewaren met het nieuwe gebied en de wereld opnieuw opbouwen.
  // Geen afscheidstekst: Tor wenkt, en bij hem kies je met twee tekens: meelopen of nog blijven.
  function endCard() {
    if (!NEXT) return;
    const tor = group.list.find((g) => g.id === 'tor');
    showCard(`<div class="choice"><img class="mface" alt="" src="${face(tor)}"><button class="rb" id="goNext" aria-label="Trek mee">${ICON.steps}</button><button class="rb" id="stayHere" aria-label="Nog even blijven">${ICON.home}</button></div>`);
    $('card').onpointerdown = (e) => e.stopPropagation();
    $('stayHere').onclick = closeCard;
    $('goNext').onclick = travel;
  }
  function travel() {
    if (!NEXT) return;
    window.__nosave = 1; closeCard(); $('fade').style.opacity = 1;
    // was je daar al (zelf gekozen in het menu)? Dan ga je daar verder waar je was.
    if (Save.slots()[NEXT.id]) { Save.write(G.snapshot()); Save.go(NEXT_ERA.id, NEXT.id); setTimeout(() => location.replace(location.pathname + (DEV ? '?dev=1' : '')), 900); return; }
    // een nieuw tijdperk: een andere groep, honderdduizenden jaren later. Wat je weet gaat mee, wat je droeg niet.
    const leap = NEXT_ERA === ERA ? {} : { era: NEXT_ERA.id, hands: [null, null], rock: [null, null], bag: state.bag ? state.bag.map(() => null) : state.bag, day: 1, food: 70, health: 100, group: 55 };
    Save.write({ ...G.snapshot(), ...leap, fire: undefined, area: NEXT.id, missions: [], mission: null, over: false, past: [...state.past, ...mission.done], rainDay: leap.era ? 0 : state.day - 1, dayP: 0.1, arrived: true });
    setTimeout(() => location.replace(location.pathname + (DEV ? '?dev=1' : '')), 900);
  }
  function markTick(g, want, dt) {
    g.mark.material.opacity += (want - g.mark.material.opacity) * Math.min(1, dt * 3);
    g.mark.visible = g.mark.material.opacity > 0.02;
    if (g.mark.visible) { g.mark.position.set(g.x, g.g.position.y + (g.calling === 'shiver' ? 1.05 : 1.62) * g.k + 0.18 + Math.sin(hints.playT * 2.4) * 0.04, g.z); g.mark.scale.setScalar(0.42 + Math.sin(hints.playT * 2.4) * 0.03); }
  }
  function questTick(dt) {
    if (!state.started) return;
    for (const m of MISSIONS) if (m.watch && !mission.done.has(m.id)) m.watch();   // wat je onderweg al zag, telt
    if (mission.over) {
      // wie nog even bleef: Tor wenkt tot je meegaat
      const tor = group.list.find((g) => g.id === 'tor'), go = NEXT && G.predGame.night < 0.6;
      tor.calling = go ? 'wave' : null;
      const d = Math.hypot(tor.x - player.pos.x, tor.z - player.pos.z); markTick(tor, go && d < 34 ? Math.min(1, (34 - d) / 8) : 0, dt);
      return;
    }
    const calm = G.danger < 0.3 && state.sleeping <= 0 && state.collapsed <= 0 && !G.aim && !$('cardScreen').classList.contains('open');
    const night = G.predGame.night > 0.6, dHome = Math.hypot(player.pos.x - HOME.x, player.pos.z - HOME.z);
    if (mission.endT > 0) {
      mission.endT -= dt;
      group.point = null;
      if (mission.endT <= 0 && !calm) mission.endT = 1;
      else if (mission.endT <= 0) {
        mission.over = true; clear(); showLine(); for (const g of group.list) { g.calling = null; g.mark.visible = false; }
        sound.mission();
        return;
      }
    }
    const sure = !!window.__sure;   // de testbot speelt zonder roepende groep
    // wie roept er, en wie wacht op je
    const asking = [];
    for (const g of group.list) {
      const o = !sure && !night && mission.endT <= 0 && hints.playT > 6 ? offerOf(g) : null;
      const back = mission.active.some((e) => e.giver === g && e.m.done());
      g.calling = o ? (o.shiver ? 'shiver' : 'wave') : null;
      if (o) asking.push(g);
      const d = Math.hypot(g.x - player.pos.x, g.z - player.pos.z);
      markTick(g, (o || back) && d < 34 ? Math.min(1, (34 - d) / 8) : 0, dt);
    }
    if (!mission.active.length) {
      group.point = null; G.spotOf(null);
      showLine();
      mission.callT -= dt;
      if (mission.callT <= 0 && asking.length && calm && dHome < 48) {
        mission.calls++; mission.callT = mission.calls % 3 ? 7 : 80;
        callOut(asking[Math.floor(mission.calls / 3) % asking.length]);
      } else if (mission.callT <= 0) mission.callT = 2;
      return;
    }
    for (const e of [...mission.active]) {
      const m = e.m; e.startT += dt;
      // een missie met haast: de zon is de klok. Te laat kost de groep een nacht, en morgen ga je weer.
      if (m.late) { const l = m.late(); if (l && !e.late) { state.group = Math.max(0, state.group - 10); sound.bad(); toast(m.lateText, 7); } e.late = l; }
      if (!sure && m.done() && calm && e.startT > 5 && (m.here || Math.hypot(e.giver.x - player.pos.x, e.giver.z - player.pos.z) < 3.4)) { complete(m); return; }
    }
    if (!mission.cur) follow(mission.active[0].m);
    const n = stepOf(mission.cur);
    // wie het vroeg, wijst naar waar je het vindt (zolang je bij hem staat); het ding zelf valt van verder op
    mission.pointT -= dt;
    if (mission.pointT <= 0) {
      mission.pointT = 0.5;
      const spot = G.spotOf(mission.cur.steps[n].find || null);
      group.point = spot && mission.giver && !night ? { m: mission.giver, x: spot.x, z: spot.z } : null;
    }
    // een stap gelukt: een kort geluid en een vinkje bij het teken, geen scherm
    if (n !== mission.shown) { if (mission.shown >= 0) { sound.good(); sign(ICON[WANT[mission.cur.id]] + ICON.check, 2.2, 'good'); } mission.shown = n; }
    showLine(mission.cur.steps[n].t);
  }
  // in beeld staat alleen het teken rechtsboven, zolang er iets loopt. De stap zelf wordt bijgehouden voor de tests.
  function showLine(text) {
    const n = mission.active.length;
    $('questBtn').classList.toggle('show', n > 0); $('questN').textContent = n > 1 ? n : '';
    if (text !== undefined) $('questT').textContent = text;
  }
  // terloopse opmerkingen leiden af; ze komen alleen nog als ze bij je missie horen
  function murmur(text, sec, tag) { if (tag && mission.cur && mission.cur.tag === tag) toast(text, sec); }
  return { has, carries, MISSIONS, NEXT, NAMES, mission, offerOf, accept, start, clear, follow, stepOf, complete, missionInfo, endCard, travel, questTick, murmur };
}
