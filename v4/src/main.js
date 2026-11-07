import * as THREE from '../lib/three.module.js';
import { buildWorld, height, tallGrassAt } from './world.js';
import { Hominin, Herd, Vultures, carcass } from './actors.js';
import { ITEMS, DISCOVERIES, placeItems, heldMesh } from './items.js';

const $ = (id) => document.getElementById(id);

// ---------- scène ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 700);
const world = buildWorld(scene);
const player = new Hominin(scene);
const herd = new Herd(scene, 42, -12, 9);
const CARCASS = { x: -70, z: -78 };
const vultures = new Vultures(scene, CARCASS.x, CARCASS.z);
carcass(scene, CARCASS.x, CARCASS.z);
const things = placeItems(scene);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 70 : 55;   // staand scherm: wat ruimer kijken
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- toestand ----------
const state = {
  food: 55, health: 100, sick: 0, bag: [null, null, null], known: new Set(), found: new Set(),
  started: false, collapsed: 0,
};

// ---------- meldingen ----------
let toastTimer = 0;
function toast(text, sec = 4) { $('toast').textContent = text; $('toast').classList.add('on'); toastTimer = sec; }
const ui = { toast };

function discover(id) {
  if (state.found.has(id)) return;
  state.found.add(id);
  const d = DISCOVERIES.find((x) => x.id === id);
  setTimeout(() => toast('Ontdekt: ' + d.text, 5), 900);
  $('journalBtn').textContent = `Ontdekt ${state.found.size}/${DISCOVERIES.length}`;
  if (state.found.size === DISCOVERIES.length) setTimeout(() => toast('Je hebt alles in dit proefstuk ontdekt. Zo begon het: kijken, proberen en onthouden.', 8), 7000);
}

// ---------- tas ----------
function renderBag() {
  $('bag').innerHTML = '';
  state.bag.forEach((it, i) => {
    const s = document.createElement('button');
    s.className = 'slot' + (it ? '' : ' empty');
    s.innerHTML = it ? `<span><b style="background:${ITEMS[it].color}"></b>${ITEMS[it].name}</span>` : '';
    if (it) s.onclick = () => openItem(i);
    $('bag').appendChild(s);
  });
  const first = state.bag.find(Boolean);
  player.held.clear();
  const m = heldMesh(first); if (m) player.held.add(m);
}
function addToBag(item) {
  const i = state.bag.indexOf(null);
  if (i < 0) { toast('Je handen zijn vol. Laat eerst iets vallen (tik op je tas).'); return false; }
  state.bag[i] = item; renderBag(); return true;
}

function closeCard() { $('cardScreen').classList.remove('open'); }
$('cardScreen').addEventListener('pointerdown', (e) => { if (e.target.id === 'cardScreen') closeCard(); });

function openItem(i) {
  const it = state.bag[i], def = ITEMS[it], known = state.known.has(it);
  const card = $('card');
  card.innerHTML = `<div class="eyebrow">Bekijken</div><h2>${def.name}</h2><p>${def.look}</p>
    <p class="${known ? 'know' : 'q'}">${known ? def.known : def.unknown}</p><div class="row" id="cardRow"></div>`;
  const row = card.querySelector('#cardRow');
  const btn = (label, fn, alt) => { const b = document.createElement('button'); b.className = 'btn' + (alt ? ' alt' : ''); b.textContent = label; b.onclick = fn; row.appendChild(b); };
  if (it === 'berry' || it === 'redberry' || it === 'leaf') btn(known ? 'Eet' : 'Proef', () => { closeCard(); eat(i); });
  if (it === 'bone') {
    btn('Knaag eraan', () => { closeCard(); toast('Je knaagt aan het bot. Er zit geen vlees meer aan… maar het klinkt hol.'); player.action = 0.5; });
    if (state.bag.includes('stone')) btn('Sla open met de kei', () => { closeCard(); crack(i); });
  }
  if (it === 'stone' && state.bag.includes('bone')) btn('Sla op het bot', () => { closeCard(); crack(state.bag.indexOf('bone')); });
  btn('Laat vallen', () => { state.bag[i] = null; renderBag(); closeCard(); }, true);
  btn('Sluit', closeCard, true);
  $('cardScreen').classList.add('open');
}

function eat(i) {
  const it = state.bag[i];
  state.bag[i] = null; renderBag(); player.action = 0.5;
  if (it === 'berry') {
    state.food = Math.min(100, state.food + 15);
    toast(state.known.has(it) ? 'Mmm, zoet. (+voeding)' : 'Je proeft voorzichtig… zoet! Lekker.');
    state.known.add(it); discover('berry');
  } else if (it === 'redberry') {
    state.food = Math.min(100, state.food + 5);
    toast('Ze smaken wat vreemd… Na een tijdje krijg je buikpijn. Je wordt ziek.', 5);
    state.sick = 75; state.known.add(it); discover('redberry');
  } else if (it === 'leaf') {
    if (state.sick > 0) {
      state.sick = 0; state.known.add(it); discover('leaf');
      toast('Bah, wat bitter! Maar… je buikpijn zakt. Je voelt je beter.', 5);
    } else {
      toast('Bah, wat bitter! Daar word je niet vol van. Waar zou dit goed voor zijn?', 5);
    }
  }
}

function crack(boneSlot) {
  state.bag[boneSlot] = null; renderBag(); player.action = 0.5;
  state.food = Math.min(100, state.food + 40);
  state.known.add('bone'); state.known.add('stone');
  toast('Krak! Het bot breekt open. Binnenin zit vet, zacht merg. Heerlijk en voedzaam!', 5);
  discover('marrow');
}

$('journalBtn').onclick = () => {
  $('card').innerHTML = `<div class="eyebrow">Wat je weet</div><h2>Ontdekkingen</h2><ul>${DISCOVERIES.map((d) => state.found.has(d.id) ? `<li>${d.text}</li>` : '<li class="no">… nog niet ontdekt</li>').join('')}</ul><div class="row"><button class="btn alt" id="cj">Sluit</button></div>`;
  $('cj').onclick = closeCard;
  $('cardScreen').classList.add('open');
};

// ---------- besturing ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyC') toggleSneak();
  if (e.code === 'KeyE' || e.code === 'Space') doAction();
  if (e.code === 'Escape') closeCard();
});
addEventListener('keyup', (e) => keys.delete(e.code));

const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const look = { id: null, lx: 0, ly: 0, last: -9 };
let camYaw = Math.PI, camPitch = 0.42;
const ring = document.querySelector('#joy .ring'), knob = document.querySelector('#joy .knob');
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && joy.id === null) {
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
    ring.style.display = knob.style.display = 'block';
    ring.style.left = knob.style.left = e.clientX + 'px'; ring.style.top = knob.style.top = e.clientY + 'px';
    $('joyHint').style.display = 'none';
  } else if (look.id === null) {
    look.id = e.pointerId; look.lx = e.clientX; look.ly = e.clientY;
  }
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), max = 60;
    if (d > max) { dx *= max / d; dy *= max / d; }
    joy.x = dx / max; joy.y = dy / max;
    knob.style.left = joy.ox + dx + 'px'; knob.style.top = joy.oy + dy + 'px';
  } else if (e.pointerId === look.id) {
    camYaw -= (e.clientX - look.lx) * 0.006;
    camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - look.ly) * 0.003, 0.15, 0.95);
    look.lx = e.clientX; look.ly = e.clientY; look.last = clock.elapsedTime;
  }
});
const endPointer = (e) => {
  if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; ring.style.display = knob.style.display = 'none'; }
  if (e.pointerId === look.id) look.id = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function toggleSneak() { player.sneaking = !player.sneaking; $('sneakBtn').classList.toggle('on', player.sneaking); }
$('sneakBtn').onclick = toggleSneak;
$('doBtn').onclick = () => doAction();

// ---------- wat is er dichtbij om te doen? ----------
let near = null;
const marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 24), new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.8, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; scene.add(marker);

function findNear() {
  let best = null, bd = 2.3;
  for (const t of things) {
    if (t.gone || (t.bush && t.bush.left <= 0)) continue;
    const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function doAction() {
  if (!near || state.collapsed > 0) return;
  if (!addToBag(near.item)) return;
  player.action = 0.5;
  if (near.kind === 'pick') { near.gone = true; scene.remove(near.mesh); }
  else {
    const b = near.bush; b.left--;
    const show = Math.ceil(b.berries.length * b.left / b.max);
    b.berries.forEach((m, k) => { m.visible = k < show; });
    if (near.item === 'leaf') b.g.scale.y = 0.6 + 0.8 * b.left / b.max;
  }
  const def = ITEMS[near.item];
  toast(state.known.has(near.item) ? def.name + ' in je tas.' : `${def.name}. Tik erop in je tas om het te bekijken.`);
}

// ---------- hoofdlus ----------
// eigen klok: tijd in seconden sinds de start
const clock = { elapsedTime: 0, last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } };
const dir = new THREE.Vector3(), camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
let hintStage = 0, sneakNear = 0, playTime = 0;

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
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);   // vooruit
  if (mag > 0.05) {
    // vooruit = waar de camera heen kijkt, rechts = rechts in beeld
    dir.set(fx * -iy - fz * ix, 0, fz * -iy + fx * ix).normalize().multiplyScalar(mag);
  } else dir.set(0, 0, 0);

  const sick = state.sick > 0;
  player.update(dt, dir, { speed: sick ? 0.6 : state.food < 15 ? 0.8 : 1, sick });
  herd.update(dt, player, ui);
  vultures.update(dt, t);
  world.update(t, player.pos);

  // camera hoog achter de speler; draait langzaam mee als je loopt
  if (player.speed > 1 && t - look.last > 1.2 && look.id === null) {
    let d = player.yaw - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    camYaw += d * dt * 0.9 * Math.min(1, player.speed / 3);
  }
  const dist = 7.5, up = 1.0;
  camTarget.set(player.pos.x + Math.sin(camYaw) * 2.2, player.pos.y + up, player.pos.z + Math.cos(camYaw) * 2.2);
  camPos.set(player.pos.x - Math.sin(camYaw) * Math.cos(camPitch) * dist, player.pos.y + up + Math.sin(camPitch) * dist, player.pos.z - Math.cos(camYaw) * Math.cos(camPitch) * dist);
  camPos.y = Math.max(camPos.y, height(camPos.x, camPos.z) + 1.2);
  if (sick) { camPos.x += Math.sin(t * 1.3) * 0.25; camPos.y += Math.sin(t * 0.9) * 0.15; }
  camera.position.lerp(camPos, 1 - Math.exp(-dt * 6));
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

  // dingen in de buurt
  near = state.collapsed > 0 ? null : findNear();
  $('doBtn').disabled = !near;
  $('doBtn').textContent = near ? near.label : 'Niets hier';
  marker.visible = !!near;
  if (near) { marker.position.set(near.x, height(near.x, near.z) + 0.05, near.z); marker.material.opacity = 0.5 + Math.sin(t * 5) * 0.3; }

  // ontdekkingen die je door rond te lopen doet
  if (Math.hypot(player.pos.x - CARCASS.x, player.pos.z - CARCASS.z) < 9) {
    if (!state.found.has('vultures')) { toast('Hier cirkelden de gieren boven: een karkas van een zebra. Het vlees is op… maar er liggen botten.', 6); discover('vultures'); }
  }
  const closeHerd = herd.members.some((m) => Math.hypot(m.x - player.pos.x, m.z - player.pos.z) < 13);
  if (closeHerd && herd.fleeing <= 0 && player.sneaking && tallGrassAt(player.pos.x, player.pos.z)) {
    sneakNear += dt;
    if (sneakNear > 2.5) discover('sneak');
  } else sneakNear = 0;

  // zachte tips als je even niets ontdekt
  if (state.started) {
    playTime += dt; const t = playTime;
    if (hintStage === 0 && t > 45 && state.found.size === 0) { hintStage = 1; toast('Je maag knort. Er groeien struiken met bessen in de buurt.', 5); }
    if (hintStage <= 1 && t > 100 && !state.found.has('vultures')) { hintStage = 2; toast('Kijk eens om je heen: in de verte cirkelen gieren. Wat zou daar liggen?', 6); }
    if (hintStage <= 2 && t > 160 && !state.found.has('sneak')) { hintStage = 3; toast('Impala\'s zijn schichtig. Kun je dichtbij komen zonder dat ze je zien?', 6); }
  }

  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('on'); }
}

function collapse() {
  state.collapsed = 4; state.health = 0;
  $('fade').style.opacity = 0.85;
  toast('Je bent te zwak en zakt in elkaar…', 4);
}

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  clock.elapsedTime += dt;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

$('startBtn').onclick = () => {
  $('intro').classList.remove('open');
  state.started = true;
  toast('Je bent alleen. Je hebt honger. Kijk om je heen.', 5);
  const el = document.documentElement;
  if (matchMedia('(pointer: coarse)').matches && el.requestFullscreen) el.requestFullscreen().catch(() => {});
};

renderBag();
player.update(0.016, dir, { speed: 1 });
camYaw = Math.atan2(42 - player.pos.x, -12 - player.pos.z);   // begin met de kudde in beeld
frame();

// voor testen
window.__game = { state, player, herd, things, camera, setCam: (y, p) => { camYaw = y; camPitch = p; }, discover };
