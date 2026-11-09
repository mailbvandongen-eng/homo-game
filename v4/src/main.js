import * as THREE from '../lib/three.module.js';
import { buildWorld, height, tallGrassAt, blockers } from './world.js';
import { Hominin, Herd, Vultures, carcass } from './actors.js';
import { ITEMS, DISCOVERIES, LOOKS, VERDICT, FINDS, placeItems, heldMesh } from './items.js';
import { Hyenas, Leopard, Throws } from './predators.js';
import { Zebras, Sabres } from './hunt.js';
import { Group, HOME } from './group.js';
import { Glints, Motes, Birds, Butterflies, Senses } from './life.js';
import { Sound } from './audio.js';
import { loadAssets } from './assets.js';
import { ICON, ITEM_ICON } from './icons.js';

const $ = (id) => document.getElementById(id);
const EDIBLE = new Set(['berry', 'redberry', 'leaf', 'meat']);
const GIVE = ['meat', 'bone', 'berry', 'leaf', 'redberry'];   // wat je aan de groep kunt geven, het beste eerst
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
const player = new Hominin(scene, A);
const herd = new Herd(scene, 42, -12, 9, A);
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
const hyenas = new Hyenas(scene, CARCASS, A);
const leopard = new Leopard(scene, { x: 40, z: 50, branchY: 5.3 }, A);   // zijn boom staat bij de rivier
const throws = new Throws(scene);
const zebras = new Zebras(scene, -42, -30, A);
const sabres = new Sabres(scene, { x: -60, z: 10 }, zebras, A);   // hun leger ligt in het hoge gras
const group = new Group(scene, A);

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
  group: 50, day: 1, sleeping: 0, slept: false,
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
$('doBtn').innerHTML = ICON.strike;
$('jumpBtn').innerHTML = ICON.jump;
$('swap').innerHTML = ICON.swap;
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
  } else if (it === 'meat') {
    state.food = Math.min(100, state.food + 35);
    toast(state.known.has(it) ? 'Rauw en taai, maar het vult enorm.' : 'Je scheurt er een stuk af. Rauw, taai… en het vult enorm!', 5);
    setTimeout(() => sound.good(), 700);
    state.known.add(it); discover('meat');
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
// met een afslag een lap vlees van de verse prooi snijden
function cutKill() {
  const k = sabres.kill; if (!k || k.meat <= 0) return;
  if (!state.hands.includes('flake')) { toast('Met je handen krijg je de taaie huid niet open. Je hebt iets scherps nodig.', 5); return; }
  const h = freeHand();
  if (h < 0) { handsFull(); return; }
  k.meat--; state.hands[h] = 'meat'; renderHands(); sound.eat();
  toast(k.meat > 0 ? 'Je snijdt een lap vlees los. Er zit nog meer aan… maar hoe lang ben je hier nog alleen?' : 'Je snijdt de laatste lap vlees los.', 5);
  discover('kill'); discover('cut');
}
// iets aan de groep geven: het beste wat je in je handen hebt
function giveItem() { const it = GIVE.find((x) => state.hands.includes(x) && !(x === 'leaf' && !group.sick)) || GIVE.find((x) => state.hands.includes(x)); return it; }
function give() {
  const it = giveItem(); if (!it) return;
  const r = group.give(it, predGame); if (!r) return;
  toast(r.text, 6);
  if (r.gain === null) return;
  state.hands[state.hands.indexOf(it)] = null; renderHands();
  state.group = THREE.MathUtils.clamp(state.group + r.gain, 0, 100);
  if (r.bad) sound.bad(); else { sound.eat(); setTimeout(() => sound.good(), 600); discover('share'); }
}
// bij de groep gaan slapen: de nacht gaat voorbij
function sleep() {
  if (state.sleeping > 0) return;
  state.sleeping = 3.6; walkTo = null; $('fade').style.opacity = 1; sound.sleep();
  toast('Je kruipt dicht tegen de anderen aan. Hier ben je veilig.', 3.4);
}
function wake() {
  dayP = 0.035; state.day++; state.slept = true;
  const g = state.group;
  state.health = Math.min(100, state.health + 25 + g * 0.5); state.food = Math.max(8, state.food - 8); state.sick = 0;
  $('fade').style.opacity = 0;
  if (g >= 60) {
    const h = freeHand();
    if (h >= 0) { state.hands[h] = 'flake'; renderHands(); state.known.add('flake'); }
    toast(`Dag ${state.day}. De groep heeft goed gegeten en is sterk.` + (h >= 0 ? ' Kem heeft een scherpe afslag voor je geslagen.' : ''), 7);
  } else if (g >= 25) toast(`Dag ${state.day}. Iedereen is er nog. Maar de magen knorren alweer.`, 6);
  else toast(`Dag ${state.day}. De groep is zwak van de honger. Kleine Ibo huilt. Vandaag móét je iets vinden.`, 7);
  discover('sleep');
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
function tasteFrom(t) { if (!available(t)) return; take(t); t.noAuto = true; eat(t.item); }   // proeven is niet ook nog plukken

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
    opts.push({ icon: ICON.turn, fn: () => goAndDo(target, () => act('PickUp_Table', () => turnStone(target), 1.4)) });
  } else if (target.look) {
    opts.push({ icon: ICON.eye, fn: () => lookAt(target) });
    if (['hyena', 'leopard', 'sabre', 'zebra'].includes(target.look) && hasStone) opts.push({ icon: ICON.throw, fn: () => throwAt(target.member) });
    if (target.look === 'carcass' && state.hands.includes('flake')) opts.push({ icon: ICON.cut, fn: () => goAndDo(target, cutMeat) });
    if (target.look === 'kill' && state.hands.includes('flake')) opts.push({ icon: ICON.cut, fn: () => goAndDo(target, cutKill) });
  } else {
    opts.push({ icon: ICON.eye, fn: () => lookAt(target) });
    opts.push({ icon: ICON.hand, fn: () => goAndDo(target, () => grab(target)) });
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
function dropAtPos(it, x, z, thrown = false) {
  if (it !== 'stone' && it !== 'bone' && it !== 'flake' && it !== 'meat') return;
  const m = heldMesh(it); m.position.set(x, height(x, z) + 0.08, z); if (it === 'bone') m.rotation.set(0, 0, Math.PI / 2);
  m.traverse((o) => { o.castShadow = true; }); scene.add(m);
  const t = { kind: 'pick', item: it, x, z, mesh: m, noAuto: !thrown };
  things.push(t); glints.add(scene, t);
}

// ---------- gevaar ----------
function hurtFlash() { const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = 1; void h.offsetWidth; h.style.transition = 'opacity .9s'; h.style.opacity = 0; shake = 0.5; }
let shake = 0;
// een roofdier bijt: gezondheid omlaag; een hyena pakt je bot af, een luipaard laat je alles vallen
function bite(attacker, dmg, big) {
  if (state.collapsed > 0 || state.sleeping > 0) return null;
  state.health -= dmg; hurtFlash(); sound.bite(); walkTo = null;
  player.playOnce('Hit_Chest', { speed: 1, slow: 0.5 });
  let stolen = null;
  const loot = ['meat', 'bone'].find((x) => state.hands.includes(x));
  if (attacker.kind === 'hyena' && loot) {
    stolen = loot; state.hands[state.hands.indexOf(loot)] = null; renderHands();
    toast(loot === 'meat' ? 'De hyena bijt je en rukt het vlees uit je hand!' : 'De hyena bijt je en rukt het bot uit je hand!', 4);
  } else if (big) {
    state.hands.forEach((it, i) => { if (it) { dropAt(it); state.hands[i] = null; } }); renderHands();
    if (attacker.kind === 'sabre') { toast('De sabeltandkat slaat je tegen de grond! Je laat alles vallen. Weg hier!', 5); discover('sabre'); }
    else toast('Het luipaard springt je vanuit het niets aan! Je laat alles vallen.', 5);
  } else toast('Au! De hyena bijt je in je been.', 3);
  return stolen;
}
// een steen gooien naar een roofdier
function throwAt(member, kind = member.kind) {
  const i = state.hands.indexOf('stone');
  if (i < 0) { toast('Je hebt geen steen in je hand.'); return; }
  state.hands[i] = null; renderHands();
  sound.whoosh();
  const from = player.pos.clone(); from.y += 1.3;
  throws.throw(from, member, (x, z) => {
    sound.thud();
    if (Math.hypot(member.x - x, member.z - z) < 1.8) hitTarget({ m: member, kind: kind || 'gazelle' });
    else toast('Mis!');
    dropAtPos('stone', x, z, true);
  });
}
// wat er in de wereld gebeurt rond de jacht van de sabeltandkatten
function event(name, k) {
  const far = k ? Math.hypot(k.x - player.pos.x, k.z - player.pos.z) : 0;
  if (name === 'hunt') { sound.sting(); toast(far < 60 ? 'De zebra\'s stuiven uit elkaar. Iets jaagt op ze!' : 'In de verte stuiven zebra\'s weg in een stofwolk. Iets jaagt daar…', 5); }
  if (name === 'kill') {
    vultures.center.set(k.x, height(k.x, k.z), k.z); LOOK_TARGETS.push({ look: 'kill', x: k.x, z: k.z, kill: k });
    setTimeout(() => toast('De gieren draaien al boven een nieuwe plek. Daar ligt vers vlees. Maar van wie is het nu nog?', 6), 9000);
  }
  if (name === 'open') {
    for (const [dx, dz] of [[1.6, 0.9], [-1.2, 1.5]]) dropAtPos('bone', k.x + dx, k.z + dz, true);
    if (far < 90) toast('De sabeltandkatten zijn verzadigd en sjokken weg. Nu is het vlees van wie het eerst komt.', 6);
  }
  if (name === 'hyenas') { hyenas.home = k; sound.whoop(); if (far < 70) toast('Gegiechel in de verte: de hyena\'s hebben het vlees geroken.', 5); }
  if (name === 'gone' && far < 40) toast('De hyena\'s hebben het laatste vlees verslonden.', 4);
  if (name === 'cleared') {
    hyenas.home = CARCASS; vultures.center.set(CARCASS.x, height(CARCASS.x, CARCASS.z), CARCASS.z);
    const i = LOOK_TARGETS.findIndex((t) => t.look === 'kill'); if (i >= 0) LOOK_TARGETS.splice(i, 1);
  }
  if (name === 'home') {
    sound.home();
    const loot = state.hands.some((h) => GIVE.includes(h) && h !== 'leaf');
    toast(loot ? 'Kleine Ibo rent je tegemoet: hij heeft gezien dat je iets bij je hebt!' : 'Kleine Ibo rent je tegemoet. Je bent weer bij de groep.', 4);
  }
}
const predGame = { player, state, sound, toast, discover, bite, event, hyenas, night: 0 };

// ---------- wat kun je aantikken? ----------
const LOOK_TARGETS = [{ look: 'carcass', x: CARCASS.x, z: CARCASS.z }, { look: 'tree', x: HOME.x, z: HOME.z }];
function targetPos(t) {
  if (t.member && t.member.g) return { x: t.member.x, y: t.member.g.position.y + 0.8, z: t.member.z };
  if (t.member) return { x: t.member.x, y: height(t.member.x, t.member.z) + 1, z: t.member.z };
  return { x: t.x, y: height(t.x, t.z) + (t.bush ? 0.7 : t.look ? 0.4 : 0.2), z: t.z };
}
function tapAt(sx, sy) {
  const cands = [...things.filter(available), ...LOOK_TARGETS, ...herd.members.map((m) => ({ look: 'gazelle', member: m })),
    ...hyenas.list.map((h) => ({ look: 'hyena', member: h })), { look: 'leopard', member: leopard },
    ...zebras.alive.map((m) => ({ look: 'zebra', member: m })), ...sabres.list.map((m) => ({ look: 'sabre', member: m })), ...group.list.map((m) => ({ look: m.id, member: m }))];
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
  if (e.code === 'KeyE' || e.code === 'KeyF') doAction();
  if (e.code === 'Space') player.jumpReq = true;
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
$('doBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); doAction(); });
$('jumpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); player.jumpReq = true; });
function setSense(on) {
  if (state.sensing === on) return;
  state.sensing = on; $('senseBtn').classList.toggle('on', on); $('senseVeil').classList.toggle('on', on);
  sound.sense(on);
}
const sb = $('senseBtn');
sb.addEventListener('pointerdown', (e) => { e.preventDefault(); sb.setPointerCapture(e.pointerId); setSense(true); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) sb.addEventListener(ev, () => setSense(false));
sb.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- vanzelf oppakken ----------
// Loop ergens tegenaan en het gaat in een vrije hand (bij een struik: één keer per keer dat je ertegenaan loopt).
// Zijn je handen vol, dan verschijnt er een ruilknopje bij het ding.
const touching = new Set();
let swapTarget = null;
function grab(t) { if (state.collapsed > 0) return; player.playOnce('PickUp_Table', { speed: 1.9, at: 0.45, onAt: () => pickUp(t) }); }
function autoPickup() {
  for (const t of things) {
    if (!available(t) || t.kind === 'turn') { touching.delete(t); continue; }
    const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z), r = t.bush ? 1.25 : 0.85;
    if (t.noAuto) { if (d > 1.8) t.noAuto = false; continue; }   // net neergelegd: pas weer oppakken als je even weg bent geweest
    if (d < r && player.onGround) {
      if (touching.has(t)) continue;
      touching.add(t);
      if (freeHand() >= 0) grab(t); else swapTarget = t;
    } else { touching.delete(t); if (swapTarget === t) swapTarget = null; }
  }
  // het ruilknopje bij het ding
  const sw = $('swap');
  if (swapTarget && available(swapTarget)) {
    const a = anchorOf(swapTarget);
    if (a) { sw.style.display = 'grid'; sw.style.left = a.x + 'px'; sw.style.top = (a.y - 40) + 'px'; } else sw.style.display = 'none';
  } else { sw.style.display = 'none'; swapTarget = null; }
}
$('swap').onclick = () => {
  const t = swapTarget; if (!t) return;
  // welke hand laat je los? Liever eten dan gereedschap (een kei of afslag heb je nog nodig)
  const food = (x) => EDIBLE.has(x), H = state.hands;
  const i = food(H[0]) && !food(H[1]) ? 0 : food(H[1]) && !food(H[0]) ? 1 : 1;
  const it = H[i]; H[i] = null; renderHands(); dropAt(it);
  swapTarget = null; grab(t);
};

// ---------- de actieknop: wat er gebeurt hangt af van wat er om je heen is ----------
const fwdOf = () => [Math.sin(player.yaw), Math.cos(player.yaw)];
function targets() {
  const list = hyenas.list.filter((h) => h.state !== 'flee').map((h) => ({ m: h, kind: 'hyena', threat: hyenas.threats.includes(h) }));
  if (!['tree', 'up', 'down'].includes(leopard.state)) list.push({ m: leopard, kind: 'leopard', threat: leopard.threat });
  for (const g of herd.members) list.push({ m: g, kind: 'gazelle', threat: false });
  for (const z of zebras.alive) list.push({ m: z, kind: 'zebra', threat: false });
  for (const c of sabres.list) list.push({ m: c, kind: 'sabre', threat: sabres.threats.includes(c) });
  return list;
}
// het beste doel: een aanvaller (van welke kant ook), anders iets wat ongeveer voor je staat
function bestTarget(range = 18) {
  const [fx, fz] = fwdOf();
  let best = null, bs = -1e9;
  for (const t of targets()) {
    const dx = t.m.x - player.pos.x, dz = t.m.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d > range) continue;
    const front = (dx * fx + dz * fz) / (d || 1);
    if (!t.threat && front < 0.45) continue;
    const score = (t.threat ? 100 : 0) - d + front * 3;
    if (score > bs) { bs = score; best = { ...t, d }; }
  }
  return best;
}
function act(anim, fn, speed = 1.6) { player.playOnce(anim, { speed, at: 0.5, onAt: fn }); }
function hitTarget(t) {
  if (t.kind === 'hyena') hyenas.hit(t.m, predGame);
  else if (t.kind === 'leopard') leopard.hit(predGame);
  else if (t.kind === 'sabre') sabres.hit(t.m, predGame);
  else if (t.kind === 'zebra') { if (zebras.alarm <= 0) { zebras.scare(player.pos, 8); sound.flee(); sound.bray(); toast('Raak! De zebra\'s galopperen weg. Zo vang je er nooit een.'); } }
  else if (herd.fleeing <= 0) { herd.fleeing = 7; sound.flee(); toast('Raak! Maar de gazellen zijn veel sneller dan jij.'); }
}
// slaan: met een steen of bot in je hand een harde klap, anders met je vuist
function strike() {
  const armed = state.hands.some((h) => h === 'stone' || h === 'bone');
  player.playOnce(armed ? 'Sword_Attack' : 'Punch_Cross', { speed: armed ? 1.5 : 1.3, at: armed ? 0.42 : 0.4, slow: 0.25, onAt: () => {
    sound.whoosh();
    const t = bestTarget(2.6);
    if (t) { sound.thud(); hitTarget(t); }
  } });
}
function doThrow(t) {
  player.yaw = Math.atan2(t.m.x - player.pos.x, t.m.z - player.pos.z);
  player.playOnce('Spell_Simple_Shoot', { speed: 1.5, at: 0.4, slow: 0.2, onAt: () => throwAt(t.m, t.kind) });
}
function useTarget() {
  let best = null, bd = 1.8;
  for (const t of things) if (t.kind === 'turn' && available(t)) { const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z); if (d < bd) { bd = d; best = t; } }
  return best;
}
function actionContext() {
  if (state.collapsed > 0 || state.sleeping > 0) return null;
  const H = state.hands, stone = H.includes('stone');
  const t = bestTarget();
  if (t && t.d < 2.6) return { mode: 'strike', icon: ICON.strike, danger: true, run: strike };
  const prey = t && (t.kind === 'gazelle' || t.kind === 'zebra' || (t.kind === 'sabre' && !t.threat));
  if (t && stone && (!prey || t.d < 14)) return { mode: 'throw', icon: ICON.throw, danger: !prey, run: () => doThrow(t) };
  const u = useTarget();
  if (u) return { mode: 'turn', icon: ICON.turn, ready: true, at: u, run: () => act('PickUp_Table', () => turnStone(u), 1.4) };
  if (H.includes('flake') && state.carcassMeat > 0 && Math.hypot(player.pos.x - CARCASS.x, player.pos.z - CARCASS.z) < 3) return { mode: 'cut', icon: ICON.cut, ready: true, run: () => act('Interact', cutMeat) };
  // bij de groep: geven wat je bij je hebt, en 's nachts slapen
  const dHome = Math.hypot(player.pos.x - HOME.x, player.pos.z - HOME.z);
  if (dHome < 9 && giveItem() && group.nearest(player.pos).d < 3) return { mode: 'give', icon: ICON.give, ready: true, run: () => act('Interact', give) };
  const k = sabres.kill;
  if (k && k.meat > 0 && Math.hypot(player.pos.x - k.x, player.pos.z - k.z) < 3) return { mode: 'cutkill', icon: ICON.cut, ready: H.includes('flake'), run: () => (H.includes('flake') ? act('Interact', cutKill) : cutKill()) };
  if (dHome < 7 && predGame.night > 0.5) return { mode: 'sleep', icon: ICON.sleep, ready: true, run: sleep };
  if (H.includes('bone') && stone) return { mode: 'crack', icon: ICON.crack, ready: true, run: () => act('Interact', crack) };
  if (H[0] === 'stone' && H[1] === 'stone') return { mode: 'knap', icon: ICON.knap, ready: true, run: () => act('Interact', knap) };
  return { mode: 'strike', icon: ICON.strike, run: strike };
}
let ctx = null, btnMode = '';
// drukt je terwijl hij nog bezig is (bijv. bukken), dan volgt de actie zodra hij klaar is
let pendingAction = 0;
function doAction() { if (player.once) { pendingAction = 1.2; return; } if (ctx) ctx.run(); }
function updateAction() {
  ctx = actionContext();
  const mode = ctx ? ctx.mode + (ctx.danger ? '!' : '') + (ctx.ready ? '+' : '') : '';
  if (mode !== btnMode) {
    btnMode = mode;
    $('doBtn').innerHTML = ctx ? ctx.icon : ICON.strike;
    $('doBtn').classList.toggle('danger', !!(ctx && ctx.danger));
    $('doBtn').classList.toggle('ready', !!(ctx && ctx.ready));
  }
  marker.visible = !!(ctx && ctx.at);
  if (marker.visible) marker.position.set(ctx.at.x, height(ctx.at.x, ctx.at.z) + 0.05, ctx.at.z);
}
const marker = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 28), new THREE.MeshBasicMaterial({ color: 0xe39a4a, transparent: true, opacity: 0.8, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; scene.add(marker);

// de gazellen schrikken
const ui = {
  toast,
  flee(smelled) {
    sound.flee();
    if (smelled) { toast('Ze hebben je geroken! De wind waaide van jou naar hen toe.', 5); discover('wind'); }
    else toast('De gazellen zien je en vluchten!');
  },
};

// ---------- hoofdlus ----------
// eigen klok: tijd in seconden sinds de start
const clock = { elapsedTime: 0, last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } };
const dir = new THREE.Vector3(), camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
let camOverride = null;
let hintStage = 0, sneakNear = 0, playTime = 0, dayP = 0.12, lastPart = '', stepPhase = 0, danger = 0, groupWarn = 0, chased = false;

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
  if (state.collapsed > 0 || state.sleeping > 0) mag = 0;
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
  if (state.sleeping > 0) { state.sleeping -= dt; if (state.sleeping <= 0) wake(); }
  const night = nightAmount(dayP);
  herd.update(dt, player, ui);
  predGame.night = night;
  hyenas.update(dt, predGame);
  leopard.update(dt, predGame, camera);
  throws.update(dt);
  zebras.update(dt, predGame);
  sabres.update(dt, predGame);
  group.update(dt, predGame);
  // bij de slaapboom durven de hyena's niet: de groep schreeuwt en gooit stenen
  for (const h of hyenas.list) {
    if (Math.hypot(h.x - HOME.x, h.z - HOME.z) < 11 && ['curious', 'windup', 'rush'].includes(h.state)) {
      h.state = 'retreat'; h.t = 6; sound.yelp();
      if (!chased) { chased = true; toast('De groep schreeuwt en gooit stenen: de hyena\'s durven niet dichterbij.', 5); }
    }
  }
  // hoe spannend is het nu? Dat hoor je aan het geluid
  let dg = sabres.danger(player.pos);
  for (const h of hyenas.list) dg = Math.max(dg, h.state === 'windup' || h.state === 'rush' ? 0.8 : h.state === 'curious' ? 0.4 : 0);
  dg = Math.max(dg, { stalk: 0.5, freeze: 0.65, pounce: 1 }[leopard.state] || 0);
  if (state.collapsed > 0 || state.sleeping > 0) dg = 0;
  danger += (dg - danger) * (1 - Math.exp(-dt * (dg > danger ? 3 : 0.6)));
  herd.members.forEach((m, i) => senses.track(i, m.x, m.z, m.yaw));
  vultures.update(dt, t);

  world.update(t, player.pos, dayP, state.sensing);
  renderer.toneMappingExposure = (state.sensing ? 0.8 : 1.05) + night * 0.25;
  const part = partOfDay(dayP);
  if (state.started && part !== lastPart && lastPart) {
    if (part === 'evening') toast('De zon zakt. De groep wacht bij de slaapboom. In de schemering gaan de roofdieren op jacht…', 6);
    if (part === 'night') toast('Het is nacht. Bij de slaapboom ben je veilig; daarbuiten niet.', 5);
    if (part === 'dawn' && !state.slept) { state.day++; toast(`Dag ${state.day}. Je hebt de nacht alleen doorgebracht. De groep heeft op je gewacht.`, 6); }
    if (part === 'day') state.slept = false;
  }
  lastPart = part;

  const tall = tallGrassAt(player.pos.x, player.pos.z);
  glints.update(t, player, state.sensing, verdict);
  motes.update(dt, t, player.pos, night);
  birds.update(dt, t, player, sound);
  butterflies.update(t, night, player.pos);
  senses.update(dt, t, state.sensing, player.pos, sabres.kill || CARCASS);
  sound.tick(dt, { night, move: player.speed, tall, senses: state.sensing, danger });
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
  if (camOverride) { camera.position.copy(camOverride.pos); camTarget.copy(camOverride.look); }   // alleen voor tests
  if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.6; camera.position.y += (Math.random() - 0.5) * shake * 0.6; }
  camera.lookAt(camTarget);

  // eten, ziek zijn, herstellen
  if (state.started && state.sleeping <= 0) {
    // de groep krijgt honger: zonder jou raakt het eten op
    state.group = Math.max(0, state.group - dt * 60 / DAY_LEN);
    if (state.group < 20 && groupWarn === 0) { groupWarn = 1; toast('Je groep heeft honger. Breng eten naar de slaapboom: vlees, merg of bessen.', 6); }
    if (state.group > 35) groupWarn = 0;
  }
  if (state.started && state.collapsed <= 0 && state.sleeping <= 0) {
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
  $('group').style.width = state.group + '%';
  // een pijltje naar de slaapboom als je ver weg bent
  const hdx = HOME.x - player.pos.x, hdz = HOME.z - player.pos.z, hd = Math.hypot(hdx, hdz);
  $('homeRow').style.visibility = hd > 22 ? 'visible' : 'hidden';
  if (hd > 22) {
    $('homeDist').textContent = Math.round(hd) + ' m';
    $('homeDir').style.transform = `rotate(${Math.atan2(hdx * -fz + hdz * fx, hdx * fx + hdz * fz)}rad)`;
  }
  $('sick').style.display = sick ? 'inline' : 'none';
  $('veil').style.opacity = sick ? 1 : 0;

  // de pak-knop licht op als er iets binnen bereik is
  if (state.collapsed <= 0) autoPickup();
  updateAction();
  if (pendingAction > 0) { pendingAction -= dt; if (!player.once) { pendingAction = 0; doAction(); } }
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
    if (hintStage <= 1 && pt > 100 && !state.found.has('vultures') && !sabres.kill) { hintStage = 2; toast('Kijk eens om je heen: in de verte cirkelen gieren. Wat zou daar liggen?', 6); }
    if (hintStage <= 2 && pt > 160) { hintStage = 3; toast('Houd het oog ingedrukt en gebruik je zintuigen. Wat valt je op?', 6); }
    if (hintStage <= 3 && pt > 240 && !state.found.has('sneak')) { hintStage = 4; toast('Gazellen zijn schichtig. Kun je dichtbij komen zonder dat ze je zien of ruiken?', 6); }
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
  const dt = Math.min(clock.getDelta(), window.__dtCap || 1 / 20);   // __dtCap: alleen voor trage testbrowsers
  clock.elapsedTime += dt;
  try { update(dt); } catch (e) { console.error(e); }
  renderer.render(scene, camera);
}

$('startBtn').onclick = () => {
  $('intro').classList.remove('open');
  state.started = true; sound.start();
  toast('Je groep heeft honger, en jij ook. Zoek eten en breng het voor het donker naar de slaapboom.', 7);
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
  state, player, herd, hyenas, leopard, zebras, sabres, group, HOME, give, sleep, cutKill, hunt: () => sabres.startHunt(predGame), danger: () => danger, things, camera, renderer, discover, throwAt, turnStone, knap, cutMeat, tapAt, pickUp, openRadial,
  setCam: (y, p, d) => { camYaw = y; camPitch = p; if (d) camDist = d; },
  lookFrom: (pos, look) => { camOverride = pos ? { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) } : null; },
  // als lookFrom, maar met hoogtes ten opzichte van de grond op de plek waar je naar kijkt
  lookRel: (pos, look) => { const h = height(look[0], look[2]); camOverride = { pos: new THREE.Vector3(pos[0], pos[1] + h, pos[2]), look: new THREE.Vector3(look[0], look[1] + h, look[2]) }; }, setDay: (p) => { dayP = p; }, setSense,
  screenOf: (t) => { const a = anchorOf(t); return a && [a.x, a.y]; },
};
