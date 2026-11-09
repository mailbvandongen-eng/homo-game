import * as THREE from '../lib/three.module.js';
import { buildWorld, height, tallGrassAt, blockers } from './world.js';
import { Hominin, Herd, Vultures, carcass } from './actors.js';
import { ITEMS, DISCOVERIES, LOOKS, VERDICT, FINDS, placeItems, heldMesh } from './items.js';
import { Hyenas, Leopard, Throws } from './predators.js';
import { Glints, Motes, Birds, Butterflies, Senses } from './life.js';
import { Sound } from './audio.js';
import { loadAssets } from './assets.js';
import { ICON, ITEM_ICON } from './icons.js';

const $ = (id) => document.getElementById(id);
const EDIBLE = new Set(['berry', 'redberry', 'leaf']);
const DAY_LEN = 14 * 60;   // één dag en nacht duurt 14 minuten

// ---------- scène ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// scherp beeld: tot 2x de schermpixels (meer kost veel rekenkracht en zie je nauwelijks)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

// eerst de gescande natuur laden (de knop Begin wacht daarop)
const startBtn = document.getElementById('startBtn');
startBtn.disabled = true; startBtn.textContent = 'Laden… 0%';
const A = await loadAssets(renderer, (f) => { startBtn.textContent = `Laden… ${Math.round(f * 100)}%`; });
startBtn.disabled = false; startBtn.textContent = 'Begin';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 700);
const world = buildWorld(scene, A);
const player = new Hominin(scene);
const herd = new Herd(scene, 42, -12, 9);
const CARCASS = { x: -70, z: -78 };
const vultures = new Vultures(scene, CARCASS.x, CARCASS.z);
carcass(scene, CARCASS.x, CARCASS.z);
const things = placeItems(scene, A);
const glints = new Glints(scene, things);
const motes = new Motes(scene);
const bushes = things.filter((t) => t.bush).map((t) => [t.x, t.z]);
const birds = new Birds(scene, [[6, -14], [-20, 8], [30, -40], [60, 20], [-50, -50], [15, 35]]);
const butterflies = new Butterflies(scene, bushes);
const senses = new Senses(scene);
const sound = new Sound();
const hyenas = new Hyenas(scene, CARCASS);
const leopard = new Leopard(scene, { x: 40, z: 50, branchY: 5.3 });   // zijn boom staat bij de rivier
const throws = new Throws(scene);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 70 : 55;   // staand scherm: wat ruimer kijken
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- toestand ----------
const state = {
  food: 55, health: 100, sick: 0, hands: [null, null], known: new Set(), found: new Set(),
  started: false, collapsed: 0, sensing: false, finds: new Set(), carcassMeat: 1,
};
const verdict = { get: (it) => (state.known.has(it) ? VERDICT[it] : null) };

// ---------- meldingen ----------
let toastTimer = 0;
function toast(text, sec = 4) { $('toast').textContent = text; $('toast').classList.add('on'); toastTimer = sec; }

function discover(id) {
  if (state.found.has(id)) return;
  state.found.add(id);
  const d = DISCOVERIES.find((x) => x.id === id);
  setTimeout(() => { toast('Ontdekt: ' + d.text, 5); sound.discover(); }, 1400);
  $('journalCount').textContent = state.found.size;
  if (state.found.size === DISCOVERIES.length) setTimeout(() => toast('Je hebt alles in dit proefstuk ontdekt. Zo begon het: kijken, proberen en onthouden.', 8), 7500);
}

// ---------- knoppen met icoontjes ----------
$('doBtn').innerHTML = ICON.hand;
$('sneakBtn').innerHTML = ICON.sneak;
$('senseBtn').innerHTML = ICON.sense;
$('journalIcon').innerHTML = ICON.book;
const setSoundIcon = () => { $('soundBtn').innerHTML = sound.muted ? ICON.mute : ICON.sound; };
setSoundIcon();
$('soundBtn').onclick = () => { sound.setMuted(!sound.muted); setSoundIcon(); };

// ---------- je handen ----------
function renderHands() {
  for (const i of [0, 1]) {
    const it = state.hands[i];
    $('hand' + i).innerHTML = `<span class="bg" style="opacity:${it ? 0.15 : 0.5}">${ICON.hand}</span>` + (it ? `<span class="it">${ITEM_ICON[it]}</span>` : '');
  }
  for (const [grp, it] of [[player.heldL, state.hands[0]], [player.held, state.hands[1]]]) {
    grp.clear(); const m = heldMesh(it); if (m) grp.add(m);
  }
}
function freeHand() { return state.hands[1] === null ? 1 : state.hands[0] === null ? 0 : -1; }
function handsFull() {
  toast('Je handen zijn vol. Leg eerst iets neer: tik op een hand.');
  for (const i of [0, 1]) { const h = $('hand' + i); h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake'); }
}
for (const i of [0, 1]) $('hand' + i).onclick = () => { if (state.hands[i]) openRadial({ hand: i }); };

// ---------- bekijken ----------
function closeCard() { $('cardScreen').classList.remove('open'); }
$('cardScreen').addEventListener('pointerdown', closeCard);
function showCard(html) { $('card').innerHTML = html; $('cardScreen').classList.add('open'); }
function lookAt(target) {
  if (target.look) {
    const L = LOOKS[target.look];
    showCard(`<div class="eyebrow">Bekijken</div><h2>${L.name}</h2><p>${L.look}</p><p class="q">${L.hint}</p>`);
    return;
  }
  const it = target.item, def = ITEMS[it], known = state.known.has(it);
  showCard(`<div class="eyebrow">Bekijken</div><span class="big">${ITEM_ICON[it]}</span><h2>${def.name}</h2><p>${def.look}</p>
    <p class="${known ? 'know' : 'q'}">${known ? def.known : def.unknown}</p>`);
}
$('journalBtn').onclick = () => {
  showCard(`<div class="eyebrow">Wat je weet</div><h2>Ontdekkingen</h2><ul>${DISCOVERIES.map((d) => state.found.has(d.id) ? `<li>${d.text}</li>` : '<li class="no">… nog niet ontdekt</li>').join('')}</ul>
    <h2 style="font-size:18px;margin-top:12px">Vondsten</h2><ul>${Object.entries(FINDS).map(([k, f]) => state.finds.has(k) ? `<li><b>${f.name}</b>: ${f.text}</li>` : '<li class="no">… ergens verstopt</li>').join('')}</ul>`);
};

// ---------- eten en doen ----------
function eat(it) {
  player.action = 0.5; sound.eat();
  if (it === 'berry') {
    state.food = Math.min(100, state.food + 15);
    toast(state.known.has(it) ? 'Mmm, zoet.' : 'Je proeft voorzichtig… zoet! Lekker.');
    setTimeout(() => sound.good(), 600);
    state.known.add(it); discover('berry');
  } else if (it === 'redberry') {
    state.food = Math.min(100, state.food + 5);
    toast('Ze smaken wat vreemd… Na een tijdje krijg je buikpijn. Je wordt ziek.', 5);
    setTimeout(() => sound.bad(), 900);
    state.sick = 75; state.known.add(it); discover('redberry');
  } else if (it === 'leaf') {
    if (state.sick > 0) {
      state.sick = 0; state.known.add(it); discover('leaf');
      toast('Bah, wat bitter! Maar… je buikpijn zakt. Je voelt je beter.', 5);
      setTimeout(() => sound.good(), 900);
    } else toast('Bah, wat bitter! Daar word je niet vol van. Waar zou dit goed voor zijn?', 5);
  }
}
function crack() {
  const b = state.hands.indexOf('bone');
  state.hands[b] = null; renderHands(); player.action = 0.5; sound.crack();
  state.food = Math.min(100, state.food + 40);
  state.known.add('bone'); state.known.add('stone');
  toast('Krak! Het bot breekt open. Binnenin zit vet, zacht merg. Heerlijk en voedzaam!', 5);
  setTimeout(() => sound.good(), 700);
  discover('marrow');
  // de eerste keer springt er een scherp scherfje van de kei: zo ontdek je hoe je afslagen maakt
  if (!state.found.has('flake')) setTimeout(() => {
    toast('Hé… er is een scherp scherfje van de kei gesprongen! Je raapt het op.', 5);
    const h = state.hands[b] === null ? b : freeHand();
    if (h < 0) dropAt('flake'); else { state.hands[h] = 'flake'; renderHands(); }
    state.known.add('flake'); discover('flake');
  }, 5200);
}
// twee stenen tegen elkaar slaan: één wordt een scherpe afslag
function knap() {
  const i = state.hands.indexOf('stone');
  state.hands[i] = 'flake'; renderHands(); player.action = 0.5; sound.knap();
  toast(state.found.has('flake') ? 'Tik! Weer een scherpe afslag.' : 'Tik! Er springt een scherpe afslag van de steen af.');
  state.known.add('flake'); discover('flake');
}
// met een afslag de laatste reepjes vlees van het karkas snijden
function cutMeat() {
  if (state.carcassMeat <= 0) { toast('Er zit echt niets meer aan. Alleen de botten nog.'); return; }
  state.carcassMeat = 0; player.action = 0.5; sound.eat();
  state.food = Math.min(100, state.food + 25);
  toast('Met de scherpe afslag snijd je de laatste reepjes vlees van de botten. Taai, maar het vult!', 5);
  setTimeout(() => sound.good(), 700);
  discover('cut');
}
// een platte steen omdraaien
function turnStone(t) {
  if (t.gone) return;
  t.gone = true; player.action = 0.5; sound.pick();
  t.mesh.position.x += 0.6; t.mesh.position.y += 0.15; t.mesh.rotation.z = 2.4;
  if (t.under === 'grubs') {
    state.food = Math.min(100, state.food + 10); sound.eat();
    toast('Larven! Dikke witte larven onder de steen. Je eet ze op: knapperig en voedzaam.', 5);
    discover('grubs');
  } else if (t.under === 'scorpion') {
    state.health -= 10; hurtFlash(); sound.bad();
    toast('Au! Een schorpioen steekt je in je hand. Dat doet pijn, maar het zakt weer.', 5);
  } else if (FINDS[t.under]) {
    state.finds.add(t.under); sound.discover();
    const f = FINDS[t.under];
    showCard(`<div class="eyebrow">Vondst</div><h2>${f.name}</h2><p>${f.text}</p><p class="know">Je vondst staat in je boekje.</p>`);
  }
}
// iets uit de wereld nemen (een kei oppakken, of één keer plukken van een struik)
function take(t) {
  if (t.kind === 'pick') { t.gone = true; scene.remove(t.mesh); return; }
  const b = t.bush; b.left--;
  if (b.berries) b.berries.count = Math.ceil(14 * b.left / b.max);
  if (t.item === 'leaf') b.g.scale.y = 0.6 + 0.8 * b.left / b.max;
}
function available(t) { return !t.gone && !(t.bush && t.bush.left <= 0); }
function pickUp(t) {
  if (!available(t)) return;
  const h = freeHand();
  if (h < 0) { handsFull(); return; }
  take(t); state.hands[h] = t.item; renderHands();
  player.action = 0.5; sound.pick();
}
function tasteFrom(t) { if (!available(t)) return; take(t); eat(t.item); }

// ---------- naar iets toe lopen en het dan doen ----------
let walkTo = null;
function goAndDo(t, fn) {
  if (Math.hypot(t.x - player.pos.x, t.z - player.pos.z) < 1.6) { fn(); return; }
  walkTo = { x: t.x, z: t.z, fn };
}

// ---------- het rondje met icoontjes ----------
let radial = null;
function closeRadial() { radial = null; $('radial').innerHTML = ''; }
function openRadial(target) {
  const opts = [];
  const hasStone = state.hands.includes('stone');
  if (target.hand !== undefined) {
    const i = target.hand, it = state.hands[i], other = state.hands[1 - i];
    opts.push({ icon: ICON.eye, fn: () => lookAt({ item: it }) });
    if (EDIBLE.has(it)) opts.push({ icon: ICON.mouth, q: !state.known.has(it), fn: () => { state.hands[i] = null; renderHands(); eat(it); } });
    if ((it === 'bone' && other === 'stone') || (it === 'stone' && other === 'bone')) opts.push({ icon: ICON.crack, fn: crack });
    if (it === 'stone' && other === 'stone') opts.push({ icon: ICON.knap, fn: knap });
    opts.push({ icon: ICON.drop, fn: () => { state.hands[i] = null; renderHands(); dropAt(it); } });
  } else if (target.kind === 'turn') {
    opts.push({ icon: ICON.eye, fn: () => lookAt(target) });
    opts.push({ icon: ICON.turn, fn: () => goAndDo(target, () => turnStone(target)) });
  } else if (target.look) {
    opts.push({ icon: ICON.eye, fn: () => lookAt(target) });
    if ((target.look === 'hyena' || target.look === 'leopard') && hasStone) opts.push({ icon: ICON.throw, fn: () => throwAt(target.member) });
    if (target.look === 'carcass' && state.hands.includes('flake')) opts.push({ icon: ICON.cut, fn: () => goAndDo(target, cutMeat) });
  } else {
    opts.push({ icon: ICON.eye, fn: () => lookAt(target) });
    opts.push({ icon: ICON.hand, fn: () => goAndDo(target, () => pickUp(target)) });
    if (EDIBLE.has(target.item)) opts.push({ icon: ICON.mouth, q: !state.known.has(target.item), fn: () => goAndDo(target, () => tasteFrom(target)) });
  }
  radial = { target, buttons: [] };
  $('radial').innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button');
    b.innerHTML = o.icon + (o.q ? '<i>?</i>' : '');
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.onclick = (e) => { e.stopPropagation(); closeRadial(); o.fn(); };
    $('radial').appendChild(b); radial.buttons.push(b);
  }
  placeRadial();
}
const v3 = new THREE.Vector3();
function anchorOf(target) {
  if (target.hand !== undefined) { const r = $('hand' + target.hand).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - 10, up: true }; }
  const p = targetPos(target); v3.set(p.x, p.y, p.z).project(camera);
  if (v3.z > 1) return null;
  return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight };
}
function placeRadial() {
  if (!radial) return;
  const tg = radial.target, a = anchorOf(tg);
  if (!a || (tg.item && !available(tg)) || (tg.hand !== undefined && !state.hands[tg.hand])) { closeRadial(); return; }
  const n = radial.buttons.length, r = 74;
  radial.buttons.forEach((b, k) => {
    // in een boogje boven het ding, met ruimte tussen de knoppen
    const ang = -Math.PI / 2 + (k - (n - 1) / 2) * (68 / r);
    let x = a.x + Math.cos(ang) * r, y = a.y + Math.sin(ang) * r - (a.up ? 30 : 0);
    x = Math.max(34, Math.min(innerWidth - 34, x)); y = Math.max(34, Math.min(innerHeight - 34, y));
    b.style.left = x + 'px'; b.style.top = y + 'px';
  });
}

// iets neerleggen: een kei of bot komt weer in de wereld te liggen; eten laat je gewoon vallen
function dropAt(it) {
  dropAtPos(it, player.pos.x + Math.sin(player.yaw) * 0.6, player.pos.z + Math.cos(player.yaw) * 0.6);
}
function dropAtPos(it, x, z) {
  if (it !== 'stone' && it !== 'bone' && it !== 'flake') return;
  const m = heldMesh(it); m.position.set(x, height(x, z) + 0.08, z); if (it === 'bone') m.rotation.set(0, 0, Math.PI / 2);
  m.traverse((o) => { o.castShadow = true; }); scene.add(m);
  const t = { kind: 'pick', item: it, x, z, mesh: m };
  things.push(t); glints.add(scene, t);
}

// ---------- gevaar ----------
function hurtFlash() { const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = 1; void h.offsetWidth; h.style.transition = 'opacity .9s'; h.style.opacity = 0; shake = 0.5; }
let shake = 0;
// een roofdier bijt: gezondheid omlaag; een hyena pakt je bot af, een luipaard laat je alles vallen
function bite(attacker, dmg, big) {
  if (state.collapsed > 0) return null;
  state.health -= dmg; hurtFlash(); sound.bite(); walkTo = null;
  let stolen = null;
  if (attacker.kind === 'hyena' && state.hands.includes('bone')) {
    stolen = 'bone'; state.hands[state.hands.indexOf('bone')] = null; renderHands();
    toast('De hyena bijt je en rukt het bot uit je hand!', 4);
  } else if (big) {
    state.hands.forEach((it, i) => { if (it) { dropAt(it); state.hands[i] = null; } }); renderHands();
    toast('Het luipaard springt je vanuit het niets aan! Je laat alles vallen.', 5);
  } else toast('Au! De hyena bijt je in je been.', 3);
  return stolen;
}
// een steen gooien naar een roofdier
function throwAt(member) {
  const i = state.hands.indexOf('stone');
  if (i < 0) { toast('Je hebt geen steen in je hand.'); return; }
  state.hands[i] = null; renderHands();
  player.action = 0.5; sound.whoosh();
  player.yaw = Math.atan2(member.x - player.pos.x, member.z - player.pos.z);
  const from = player.pos.clone(); from.y += 1.3;
  throws.throw(from, member, (x, z) => {
    if (Math.hypot(member.x - x, member.z - z) < 1.8) {
      sound.thud();
      if (member.kind === 'hyena') hyenas.hit(member, predGame); else leopard.hit(predGame);
    } else { sound.thud(); toast('Mis!'); }
    dropAtPos('stone', x, z);
  });
}
function nearestThreat() {
  let best = null, bd = 18;
  const list = [...hyenas.threats, ...(leopard.threat ? [leopard] : [])];
  for (const m of list) { const d = Math.hypot(m.x - player.pos.x, m.z - player.pos.z); if (d < bd) { bd = d; best = m; } }
  return best;
}
const predGame = { player, state, sound, toast, discover, bite, night: 0 };

// ---------- wat kun je aantikken? ----------
const LOOK_TARGETS = [{ look: 'carcass', x: CARCASS.x, z: CARCASS.z }];
function targetPos(t) {
  if (t.member && t.member.g) return { x: t.member.x, y: t.member.g.position.y + 0.8, z: t.member.z };
  if (t.member) return { x: t.member.x, y: height(t.member.x, t.member.z) + 1, z: t.member.z };
  return { x: t.x, y: height(t.x, t.z) + (t.bush ? 0.7 : t.look ? 0.4 : 0.2), z: t.z };
}
function tapAt(sx, sy) {
  const cands = [...things.filter(available), ...LOOK_TARGETS, ...herd.members.map((m) => ({ look: 'impala', member: m })),
    ...hyenas.list.map((h) => ({ look: 'hyena', member: h })), { look: 'leopard', member: leopard }];
  let best = null, bd = 56;
  for (const c of cands) {
    const p = targetPos(c);
    if (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) > (c.look ? 90 : 35)) continue;
    v3.set(p.x, p.y, p.z).project(camera); if (v3.z > 1) continue;
    const d = Math.hypot((v3.x + 1) / 2 * innerWidth - sx, (1 - v3.y) / 2 * innerHeight - sy);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) { openRadial(best); sound.pick(); } else closeRadial();
}

// ---------- besturing ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyC') toggleSneak();
  if (e.code === 'KeyE' || e.code === 'Space') doAction();
  if (e.code === 'KeyQ') setSense(true);
  if (e.code === 'Escape') { closeCard(); closeRadial(); }
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyQ') setSense(false); });

const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, t0: 0, moved: 0 };
const look = { id: null, lx: 0, ly: 0, last: -9, sx: 0, sy: 0, t0: 0, moved: 0 };
let camYaw = Math.PI, camPitch = 0.42, camDist = 7.5;
const ring = document.querySelector('#joy .ring'), knob = document.querySelector('#joy .knob');
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && joy.id === null) {
    Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0, t0: performance.now(), moved: 0 });
    ring.style.left = knob.style.left = e.clientX + 'px'; ring.style.top = knob.style.top = e.clientY + 'px';
    $('joyHint').style.display = 'none';
  } else if (look.id === null) {
    Object.assign(look, { id: e.pointerId, lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: 0 });
  }
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), max = 60;
    joy.moved = Math.max(joy.moved, d);
    if (joy.moved > 10) ring.style.display = knob.style.display = 'block';
    if (d > max) { dx *= max / d; dy *= max / d; }
    joy.x = dx / max; joy.y = dy / max;
    knob.style.left = joy.ox + dx + 'px'; knob.style.top = joy.oy + dy + 'px';
  } else if (e.pointerId === look.id) {
    look.moved = Math.max(look.moved, Math.hypot(e.clientX - look.sx, e.clientY - look.sy));
    camYaw -= (e.clientX - look.lx) * 0.006;
    camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - look.ly) * 0.003, 0.15, 0.95);
    look.lx = e.clientX; look.ly = e.clientY; look.last = clock.elapsedTime;
  }
});
const endPointer = (e) => {
  // kort tikken zonder te schuiven = iets aantikken
  const tap = (o) => o.moved < 10 && performance.now() - o.t0 < 350;
  if (e.pointerId === joy.id) {
    if (tap(joy) && e.type === 'pointerup') tapAt(e.clientX, e.clientY);
    joy.id = null; joy.x = joy.y = 0; ring.style.display = knob.style.display = 'none';
  }
  if (e.pointerId === look.id) {
    if (tap(look) && e.type === 'pointerup') tapAt(e.clientX, e.clientY);
    look.id = null;
  }
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function toggleSneak() { player.sneaking = !player.sneaking; $('sneakBtn').classList.toggle('on', player.sneaking); }
$('sneakBtn').onclick = toggleSneak;
$('doBtn').onclick = () => doAction();
function setSense(on) {
  if (state.sensing === on) return;
  state.sensing = on; $('senseBtn').classList.toggle('on', on); $('senseVeil').classList.toggle('on', on);
  sound.sense(on);
}
const sb = $('senseBtn');
sb.addEventListener('pointerdown', (e) => { e.preventDefault(); sb.setPointerCapture(e.pointerId); setSense(true); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) sb.addEventListener(ev, () => setSense(false));
sb.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- wat is er dichtbij om te pakken? ----------
let near = null;
function findNear() {
  let best = null, bd = 2.3;
  for (const t of things) {
    if (!available(t)) continue;
    const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function doAction() {
  if (state.collapsed > 0) return;
  const th = nearestThreat();
  if (th && state.hands.includes('stone')) { throwAt(th); return; }
  if (!near) return;
  if (near.kind === 'turn') turnStone(near); else pickUp(near);
}
let btnMode = '';
function setBtn(mode) {
  if (mode === btnMode) return;
  btnMode = mode;
  $('doBtn').innerHTML = mode === 'throw' ? ICON.throw : mode === 'turn' ? ICON.turn : ICON.hand;
  $('doBtn').classList.toggle('danger', mode === 'throw');
  $('doBtn').classList.toggle('ready', mode === 'hand' || mode === 'turn');
}

// de impala's schrikken
const ui = {
  toast,
  flee(smelled) {
    sound.flee();
    if (smelled) { toast('Ze hebben je geroken! De wind waaide van jou naar hen toe.', 5); discover('wind'); }
    else toast('De impala\'s zien je en vluchten!');
  },
};

// ---------- hoofdlus ----------
// eigen klok: tijd in seconden sinds de start
const clock = { elapsedTime: 0, last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } };
const dir = new THREE.Vector3(), camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
let hintStage = 0, sneakNear = 0, playTime = 0, dayP = 0.12, lastPart = '', stepPhase = 0;

function partOfDay(p) { return p < 0.06 ? 'dawn' : p < 0.7 ? 'day' : p < 0.8 ? 'evening' : p < 0.97 ? 'night' : 'dawn'; }
function nightAmount(p) { return p < 0.72 ? (p < 0.04 ? 1 - p / 0.04 : 0) : p < 0.82 ? (p - 0.72) / 0.1 : p < 0.97 ? 1 : 1 - (p - 0.97) / 0.03; }

function update(dt) {
  const t = clock.elapsedTime;
  // invoer → looprichting ten opzichte van de camera
  let ix = joy.x, iy = joy.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
  let mag = Math.min(1, Math.hypot(ix, iy));
  if (joy.id === null && mag > 0) mag = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0.6;
  if (state.collapsed > 0) mag = 0;
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  if (mag > 0.05) {
    walkTo = null;
    // vooruit = waar de camera heen kijkt, rechts = rechts in beeld
    dir.set(fx * -iy - fz * ix, 0, fz * -iy + fx * ix).normalize().multiplyScalar(mag);
  } else if (walkTo && state.collapsed <= 0) {
    const dx = walkTo.x - player.pos.x, dz = walkTo.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d < 1.4) { const fn = walkTo.fn; walkTo = null; dir.set(0, 0, 0); fn(); }
    else dir.set(dx / d, 0, dz / d).multiplyScalar(d > 6 ? 0.9 : 0.6);
  } else dir.set(0, 0, 0);
  if (state.sensing) dir.multiplyScalar(0.45);

  const sick = state.sick > 0;
  player.update(dt, dir, { speed: sick ? 0.6 : state.food < 15 ? 0.8 : 1, sick });
  // de dag
  if (state.started) dayP = (dayP + dt / DAY_LEN) % 1;
  const night = nightAmount(dayP);
  herd.update(dt, player, ui);
  predGame.night = night;
  hyenas.update(dt, predGame);
  leopard.update(dt, predGame, camera);
  throws.update(dt);
  herd.members.forEach((m, i) => senses.track(i, m.x, m.z, m.yaw));
  vultures.update(dt, t);

  world.update(t, player.pos, dayP, state.sensing);
  renderer.toneMappingExposure = (state.sensing ? 0.8 : 1.05) + night * 0.25;
  const part = partOfDay(dayP);
  if (state.started && part !== lastPart && lastPart) {
    if (part === 'evening') toast('De zon zakt. In de schemering gaan de roofdieren op jacht…', 5);
    if (part === 'night') toast('Het is nacht. De krekels zingen.');
    if (part === 'dawn') toast('De lucht kleurt rood: een nieuwe dag begint.');
  }
  lastPart = part;

  const tall = tallGrassAt(player.pos.x, player.pos.z);
  glints.update(t, player, state.sensing, verdict);
  motes.update(dt, t, player.pos, night);
  birds.update(dt, t, player, sound);
  butterflies.update(t, night, player.pos);
  senses.update(dt, t, state.sensing, player.pos, CARCASS);
  sound.tick(dt, { night, move: player.speed, tall, senses: state.sensing });
  // voetstappen
  if (Math.floor(player.phase / Math.PI) !== stepPhase) { stepPhase = Math.floor(player.phase / Math.PI); if (player.speed > 0.5) sound.step(tall); }

  // camera hoog achter de speler; draait langzaam mee als je loopt
  if (player.speed > 1 && t - look.last > 1.2 && look.id === null) {
    let d = player.yaw - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    camYaw += d * dt * 0.9 * Math.min(1, player.speed / 3);
  }
  const dist = camDist, up = 1.0;
  camTarget.set(player.pos.x + Math.sin(camYaw) * 2.2, player.pos.y + up, player.pos.z + Math.cos(camYaw) * 2.2);
  camPos.set(player.pos.x - Math.sin(camYaw) * Math.cos(camPitch) * dist, player.pos.y + up + Math.sin(camPitch) * dist, player.pos.z - Math.cos(camYaw) * Math.cos(camPitch) * dist);
  camPos.y = Math.max(camPos.y, height(camPos.x, camPos.z) + 1.2);
  // niet midden in een boomstam of rots gaan staan
  for (const b of blockers) {
    if (b.top) continue;
    const dx = camPos.x - b.x, dz = camPos.z - b.z, d = Math.hypot(dx, dz), min = b.r + 1.2;
    if (d < min && d > 0.001) { camPos.x = b.x + dx / d * min; camPos.z = b.z + dz / d * min; }
  }
  // zit er grond of een rots tussen jou en de camera? Dan schuift de camera naar voren
  let clear = 1;
  const hx = player.pos.x, hy = player.pos.y + 1.2, hz = player.pos.z;
  for (let k = 1; k <= 10; k++) {
    const f = k / 10, x = hx + (camPos.x - hx) * f, y = hy + (camPos.y - hy) * f, z = hz + (camPos.z - hz) * f;
    let blocked = y < height(x, z) + 0.4;
    if (!blocked) for (const b of blockers) if (b.top && y < b.top + 0.3 && Math.hypot(x - b.x, z - b.z) < b.r + 0.4) { blocked = true; break; }
    if (blocked) { clear = Math.max(0.25, (k - 1) / 10); break; }
  }
  if (clear < 1) camPos.set(hx + (camPos.x - hx) * clear, hy + (camPos.y - hy) * clear + (1 - clear) * 1.5, hz + (camPos.z - hz) * clear);
  if (sick) { camPos.x += Math.sin(t * 1.3) * 0.25; camPos.y += Math.sin(t * 0.9) * 0.15; }
  camera.position.lerp(camPos, 1 - Math.exp(-dt * 6));
  if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.6; camera.position.y += (Math.random() - 0.5) * shake * 0.6; }
  camera.lookAt(camTarget);

  // eten, ziek zijn, herstellen
  if (state.started && state.collapsed <= 0) {
    state.food = Math.max(0, state.food - dt * 0.18);
    if (sick) { state.sick -= dt; state.health -= dt * 0.9; if (state.sick <= 0) toast('De buikpijn is vanzelf over. Dat duurde lang…'); }
    else if (state.food < 12) state.health -= dt * 0.5;
    else if (state.food > 40) state.health = Math.min(100, state.health + dt * 0.6);
    if (state.health <= 0) collapse();
  }
  if (state.collapsed > 0) {
    state.collapsed -= dt;
    if (state.collapsed <= 0) {
      state.health = 35; state.food = Math.max(state.food, 30); state.sick = 0;
      $('fade').style.opacity = 0;
      toast('Je komt langzaam weer bij. Je bent zwak. Zoek eten en neem het rustig aan.', 6);
    }
  }
  $('food').style.width = state.food + '%';
  $('health').style.width = Math.max(0, state.health) + '%';
  $('sick').style.display = sick ? 'inline' : 'none';
  $('veil').style.opacity = sick ? 1 : 0;

  // de pak-knop licht op als er iets binnen bereik is
  near = state.collapsed > 0 ? null : findNear();
  const threat = nearestThreat();
  setBtn(threat && state.hands.includes('stone') ? 'throw' : near ? (near.kind === 'turn' ? 'turn' : 'hand') : '');
  placeRadial();

  // ontdekkingen die je door rond te lopen doet
  if (Math.hypot(player.pos.x - CARCASS.x, player.pos.z - CARCASS.z) < 9 && !state.found.has('vultures')) {
    toast('Hier cirkelden de gieren boven: een karkas van een zebra. Het vlees is op… maar er liggen botten.', 6);
    discover('vultures');
  }
  const closeHerd = herd.members.some((m) => Math.hypot(m.x - player.pos.x, m.z - player.pos.z) < 13);
  if (closeHerd && herd.fleeing <= 0 && player.sneaking && tall) {
    sneakNear += dt;
    if (sneakNear > 2.5) discover('sneak');
  } else sneakNear = 0;

  // zachte tips als je even niets ontdekt
  if (state.started) {
    playTime += dt; const pt = playTime;
    if (hintStage === 0 && pt > 45 && state.found.size === 0) { hintStage = 1; toast('Je maag knort. Er groeien struiken met bessen in de buurt. Tik erop.', 5); }
    if (hintStage <= 1 && pt > 100 && !state.found.has('vultures')) { hintStage = 2; toast('Kijk eens om je heen: in de verte cirkelen gieren. Wat zou daar liggen?', 6); }
    if (hintStage <= 2 && pt > 160) { hintStage = 3; toast('Houd het oog ingedrukt en gebruik je zintuigen. Wat valt je op?', 6); }
    if (hintStage <= 3 && pt > 240 && !state.found.has('sneak')) { hintStage = 4; toast('Impala\'s zijn schichtig. Kun je dichtbij komen zonder dat ze je zien of ruiken?', 6); }
  }

  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('on'); }
}

function collapse() {
  state.collapsed = 4; state.health = 0; walkTo = null;
  $('fade').style.opacity = 0.85;
  toast('Je bent te zwak en zakt in elkaar…', 4);
}

function frame() {
  requestAnimationFrame(frame);   // eerst: een fout in één beeld mag het spel niet stilzetten
  const dt = Math.min(clock.getDelta(), 1 / 20);
  clock.elapsedTime += dt;
  try { update(dt); } catch (e) { console.error(e); }
  renderer.render(scene, camera);
}

$('startBtn').onclick = () => {
  $('intro').classList.remove('open');
  state.started = true; sound.start();
  toast('Je bent alleen. Je hebt honger. Kijk om je heen.', 5);
  const el = document.documentElement;
  // op een telefoon: volledig scherm en liggend vastzetten (lukt op Android; op een iPhone vraagt het scherm je te draaien)
  if (matchMedia('(pointer: coarse)').matches && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  }
};

renderHands();
player.update(0.016, dir, { speed: 1 });
camYaw = Math.atan2(42 - player.pos.x, -12 - player.pos.z);   // begin met de kudde in beeld
frame();

// voor testen
window.__game = {
  state, player, herd, hyenas, leopard, things, camera, renderer, discover, throwAt, turnStone, knap, cutMeat, tapAt, pickUp, openRadial,
  setCam: (y, p, d) => { camYaw = y; camPitch = p; if (d) camDist = d; }, setDay: (p) => { dayP = p; }, setSense,
  screenOf: (t) => { const a = anchorOf(t); return a && [a.x, a.y]; },
};
