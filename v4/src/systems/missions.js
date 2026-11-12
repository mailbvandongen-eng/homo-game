import * as THREE from '../../lib/three.module.js';
import { ERA, AREA } from '../eras/index.js';
import { HOME } from '../group.js';
import { Save } from '../save.js';
import { $, toast, title, showCard, closeCard } from '../engine/ui.js';

// Missies: wie in de groep iets nodig heeft roept en wenkt; aantikken is aannemen. Alle missies klaar: de groep trekt verder.
export function initMissions(G) {
  const { state, player, hyenas, sabres, group, scene, sound, closeRadial, hints } = G;
  // Eten zoeken en delen moet altijd; dat is geen missie. Een missie heeft een doel: iets maken of iets kunnen.
  // Je kiest er zelf één, ziet de stappen, en als ze alle vier gelukt zijn trekt de groep verder.
  const has = (it) => state.hands.includes(it);
  const carries = (it) => has(it) || !!(state.bag && state.bag.some((e) => e && e.it === it));
  const MISSIONS = AREA.missions({ state, has, carries, player, hyenas, sabres, group, night: () => G.predGame.night, dayP: () => G.dayP });
  const NEXT = ERA.areas.find((a) => a.id === AREA.next && a.playable) || null;   // waar de groep hierna heen trekt
  const NAMES = { tor: 'Tor', kem: 'Kem', ibo: 'Ibo' };
  for (const m of MISSIONS) m.steps.push({ t: 'Ga terug naar ' + NAMES[m.who], ok: () => false });
  // Niemand duwt je een keuzescherm onder je neus: wie iets nodig heeft roept en wenkt bij de slaapboom.
  // Aantikken is aannemen. Daarna terug naar diegene, en het is volbracht.
  const mission = { cur: null, giver: null, done: new Set(), over: false, callT: 12, calls: 0, startT: 0, endT: 0, shown: -1, late: false };
  const stepOf = (m) => { let n = 0; while (n < m.steps.length - 1 && m.steps[n].ok()) n++; return n; };
  const offerOf = (g) => (mission.cur || mission.over || g.sick > 0 ? null : MISSIONS.find((m) => m.who === g.id && !mission.done.has(m.id) && (!m.needs || mission.done.has(m.needs)) && (!m.when || m.when())) || null);
  function accept(g) {
    const m = offerOf(g); if (!m) return;
    closeRadial(); mission.cur = m; mission.giver = g; mission.startT = 0; mission.shown = -1; g.busy = 3;
    G.camTurn = { x: g.x, z: g.z, t: 1.8 }; mission.late = false;
    if (m.onStart) m.onStart();
    sound.mission(); title('Missie', m.title, m.ask);
  }
  function complete(m) {
    mission.done.add(m.id); mission.cur = null; mission.callT = 45; mission.calls = 0;
    if (mission.giver) mission.giver.busy = 3;
    state.group = Math.min(100, state.group + 10);
    sound.discover(); title('Missie volbracht', m.title, m.end, 4.5);
    if (mission.done.size === MISSIONS.length) mission.endT = 7;
  }
  function missionInfo() {
    const m = mission.cur; if (!m) return;
    const n = stepOf(m);
    showCard(`<div class="eyebrow">Missie van ${NAMES[m.who]}</div><h2>${m.title}</h2><p>${m.why}</p>
      <ol class="steps">${m.steps.map((x, i) => `<li class="${i < n ? 'ok' : i === n ? 'now' : ''}">${x.t}</li>`).join('')}</ol>
      <div class="row"><button class="btn" id="misGo">Verder spelen</button><button class="btn ghost" id="misDrop">Laat maar</button></div>`);
    $('card').onpointerdown = (e) => e.stopPropagation();
    $('misGo').onclick = closeCard;
    $('misDrop').onclick = () => { mission.cur = null; mission.callT = 60; mission.calls = 0; closeCard(); };
  }
  $('quest').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('quest').addEventListener('click', missionInfo);
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
  function endCard() {
    const o = AREA.outro;
    showCard(`<div class="eyebrow">${AREA.name}</div><h2>${o.title}</h2>${o.text.map((p) => `<p>${p}</p>`).join('')}` + (NEXT
      ? '<div class="row"><button class="btn" id="goNext">Trek mee</button><button class="btn ghost" id="stayHere">Nog even blijven</button></div>'
      : `<p class="fine">${o.fine}</p>`));
    if (!NEXT) return;
    $('card').onpointerdown = (e) => e.stopPropagation();
    $('stayHere').onclick = () => { closeCard(); toast('Tor wacht bij de slaapboom. Tik hem aan als je mee wilt.', 6); };
    $('goNext').onclick = travel;
  }
  function travel() {
    if (!NEXT) return;
    window.__nosave = 1; closeCard(); $('fade').style.opacity = 1;
    Save.write({ ...G.snapshot(), area: NEXT.id, missions: [], mission: null, over: false, past: [...state.past, ...mission.done], rainDay: state.day - 1, dayP: 0.1, arrived: true });
    setTimeout(() => location.replace(location.pathname), 900);
  }
  function markTick(g, want, dt) {
    g.mark.material.opacity += (want - g.mark.material.opacity) * Math.min(1, dt * 3);
    g.mark.visible = g.mark.material.opacity > 0.02;
    if (g.mark.visible) { g.mark.position.set(g.x, g.g.position.y + (g.calling === 'shiver' ? 1.05 : 1.62) * g.k + 0.18 + Math.sin(hints.playT * 2.4) * 0.04, g.z); g.mark.scale.setScalar(0.42 + Math.sin(hints.playT * 2.4) * 0.03); }
  }
  function questTick(dt) {
    if (!state.started) return;
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
      if (mission.endT <= 0 && !calm) mission.endT = 1;
      else if (mission.endT <= 0) {
        mission.over = true; $('quest').classList.remove('on'); for (const g of group.list) { g.calling = null; g.mark.visible = false; }
        endCard();
        return;
      }
    }
    const m = mission.cur, sure = !!window.__sure;   // de testbot speelt zonder roepende groep
    // wie roept er, en wie wacht op je
    const asking = [];
    for (const g of group.list) {
      const o = !sure && !night && mission.endT <= 0 && hints.playT > 6 ? offerOf(g) : null;
      const back = m && mission.giver === g && m.done();
      g.calling = o ? (o.shiver ? 'shiver' : 'wave') : null;
      if (o) asking.push(g);
      const d = Math.hypot(g.x - player.pos.x, g.z - player.pos.z);
      markTick(g, (o || back) && d < 34 ? Math.min(1, (34 - d) / 8) : 0, dt);
    }
    if (!m) {
      $('quest').classList.remove('on');
      mission.callT -= dt;
      if (mission.callT <= 0 && asking.length && calm && dHome < 48) {
        mission.calls++; mission.callT = mission.calls % 3 ? 7 : 80;
        callOut(asking[Math.floor(mission.calls / 3) % asking.length]);
      } else if (mission.callT <= 0) mission.callT = 2;
      return;
    }
    mission.startT += dt;
    // een missie met haast: de zon is de klok. Te laat kost de groep een nacht, en morgen ga je weer.
    if (m.late) { const l = m.late(); if (l && !mission.late) { state.group = Math.max(0, state.group - 10); sound.bad(); toast(m.lateText, 7); } mission.late = l; }
    if (!sure && m.done() && calm && mission.startT > 5 && (m.here || Math.hypot(mission.giver.x - player.pos.x, mission.giver.z - player.pos.z) < 3.4)) { $('quest').classList.remove('on'); complete(m); return; }
    $('quest').classList.add('on');
    const n = stepOf(m);
    $('questN').textContent = m.title; $('questT').textContent = `${n + 1}/${m.steps.length}  ${m.steps[n].t}`;
    if (n !== mission.shown) { if (mission.shown >= 0) sound.good(); mission.shown = n; const el = $('quest'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }
  // terloopse opmerkingen leiden af; ze komen alleen nog als ze bij je missie horen
  function murmur(text, sec, tag) { if (tag && mission.cur && mission.cur.tag === tag) toast(text, sec); }
  return { has, carries, MISSIONS, NEXT, NAMES, mission, offerOf, accept, complete, missionInfo, endCard, travel, questTick, murmur };
}
