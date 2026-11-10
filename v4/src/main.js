import * as THREE from '../lib/three.module.js';
import { buildWorld, height, tallGrassAt, blockers, cover } from './world.js';
import { Hominin, Herd, Vultures, carcass } from './actors.js';
import { ITEMS, ROCKS, DISCOVERIES, LOOKS, VERDICT, FINDS, placeItems, heldMesh } from './items.js';
import { Hyenas, Leopard, Throws } from './predators.js';
import { Zebras, Sabres } from './hunt.js';
import { Group, HOME } from './group.js';
import { Glints, Motes, Birds, Butterflies, Senses } from './life.js';
import { Sound } from './audio.js';
import { loadAssets } from './assets.js';
import { ICON, ITEM_ICON } from './icons.js';
import { Encounters } from './encounters.js';
import { Giant } from './giant.js';

const $ = (id) => document.getElementById(id);
const EDIBLE = new Set(['berry', 'redberry', 'leaf', 'meat', 'egg', 'honey']);
const GIVE = ['meat', 'honey', 'bone', 'egg', 'berry', 'leaf', 'redberry'];   // wat je aan de groep kunt geven, het beste eerst
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
const vultures = new Vultures(scene, CARCASS.x, CARCASS.z, A);
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
const leopard = new Leopard(scene, { x: 40, z: 50, branchY: 2.8 }, A);   // zijn boom staat bij de rivier
const throws = new Throws(scene);
const zebras = new Zebras(scene, -42, -30, A);
const sabres = new Sabres(scene, { x: -60, z: 10 }, zebras, A);   // hun leger ligt in het hoge gras
const group = new Group(scene, A);
const enc = new Encounters(scene, A);   // wat je onderweg tegenkomt
const giant = new Giant(scene, A);      // de reuzenolifant die zijn ronde loopt

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 70 : 55;   // staand scherm: wat ruimer kijken
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- toestand ----------
const state = {
  food: 55, health: 100, sick: 0, hands: [null, null], rock: [null, null], rockKnown: new Set(), known: new Set(), found: new Set(),
  started: false, collapsed: 0, sensing: false, finds: new Set(), carcassMeat: 1,
  group: 50, day: 1, sleeping: 0, slept: false, brought: {}, starve: 0, rainDay: 0, lost: false,
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
$('swap').innerHTML = ICON.swap;
$('menuBtn').innerHTML = ICON.menu;
// geluid en het boekje zitten samen achter één klein knopje, dat vanzelf weer dichtklapt
let menuTimer = 0;
$('menuBtn').onclick = () => { const open = $('topRight').classList.toggle('open'); clearTimeout(menuTimer); if (open) menuTimer = setTimeout(() => $('topRight').classList.remove('open'), 7000); };
$('journalIcon').innerHTML = ICON.book;
const setSoundIcon = () => { $('soundBtn').innerHTML = sound.muted ? ICON.mute : ICON.sound; };
setSoundIcon();
$('soundBtn').onclick = () => { sound.setMuted(!sound.muted); setSoundIcon(); };

// ---------- je handen ----------
// Elke kei heeft een soort en onthoudt hoe vaak erop geslagen is: state.rock loopt gelijk met state.hands.
let nextRock = null, lastRock = null;
function renderHands() {
  lastRock = null;
  for (const i of [0, 1]) {
    if (state.hands[i] !== 'stone') { if (state.rock[i]) lastRock = state.rock[i]; state.rock[i] = null; }
    else if (!state.rock[i]) { state.rock[i] = nextRock || { type: 'lava', hits: 0 }; nextRock = null; }
  }
  for (const i of [0, 1]) {
    const it = state.hands[i], css = state.rock[i] ? `filter:${ROCKS[state.rock[i].type].css} drop-shadow(0 2px 3px #0008)` : '';
    $('hand' + i).classList.toggle('empty', !it);
    $('hand' + i).innerHTML = `<span class="bg" style="opacity:${it ? 0.15 : 0.5}">${ICON.hand}</span>` + (it ? `<span class="it" style="${css}">${ITEM_ICON[it]}</span>` : '');
  }
  for (const [grp, i] of [[player.heldL, 0], [player.held, 1]]) {
    grp.clear(); const m = heldMesh(state.hands[i], state.rock[i]); if (m) grp.add(m);
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
  if (target.find && !state.finds.has(target.find)) {
    state.finds.add(target.find); sound.discover();
    const f = FINDS[target.find];
    showCard(`<div class="eyebrow">Vondst</div><h2>${f.name}</h2><p>${f.text}</p><p class="know">Je vondst staat in je boekje.</p>`);
    return;
  }
  if (target.look) {
    const L = LOOKS[target.look];
    showCard(`<div class="eyebrow">Bekijken</div><h2>${L.name}</h2><p>${L.look}</p><p class="q">${L.hint}</p>`);
    return;
  }
  const it = target.item;
  let def = ITEMS[it], known = state.known.has(it);
  if (it === 'stone' && target.rock) {
    const R = ROCKS[target.rock.type], tried = state.rockKnown.has(target.rock.type);
    def = { name: R.name, look: R.look + (target.rock.hits ? ' Er zitten verse butsen in.' : ''), known: tried ? R.good : def.known + ' Maar is elke kei hetzelfde?', unknown: def.unknown };
    known = known || tried;
  }
  showCard(`<div class="eyebrow">Bekijken</div><span class="big">${ITEM_ICON[it]}</span><h2>${def.name}</h2><p>${def.look}</p>
    <p class="${known ? 'know' : 'q'}">${known ? def.known : def.unknown}</p>`);
}
$('journalBtn').onclick = () => {
  showCard(`<div class="eyebrow">Wat je weet</div><h2>Ontdekkingen</h2><ul>${DISCOVERIES.map((d) => state.found.has(d.id) ? `<li>${d.text}</li>` : '<li class="no">… nog niet ontdekt</li>').join('')}</ul>
    <h3>Vondsten</h3><ul>${Object.entries(FINDS).map(([k, f]) => state.finds.has(k) ? `<li><b>${f.name}</b>: ${f.text}</li>` : '<li class="no">… ergens verstopt</li>').join('')}</ul>`);
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
  } else if (it === 'egg') {
    state.food = Math.min(100, state.food + 20);
    toast(state.known.has(it) ? 'Je slurpt het ei leeg. Klein, maar krachtig.' : 'Je tikt het ei open en slurpt het leeg. Vet en romig: klein, maar krachtig!', 5);
    setTimeout(() => sound.good(), 600);
    state.known.add(it); discover('egg');
  } else if (it === 'honey') {
    state.food = Math.min(100, state.food + 30); state.health = Math.min(100, state.health + 8);
    toast(state.known.has(it) ? 'Honing! Zoeter bestaat niet.' : 'Je likt aan de raat… Zoet! Zoeter dan alles wat je kent. Je voelt je meteen sterker.', 5);
    setTimeout(() => sound.good(), 600);
    state.known.add(it); discover('honey');
  } else if (it === 'leaf') {
    if (state.sick > 0) {
      state.sick = 0; state.known.add(it); discover('leaf');
      toast('Bah, wat bitter! Maar… de pijn zakt. Je voelt je beter.', 5);
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
// De kei die je aantikt is de kern, de andere de klopsteen. Het kost een paar klappen, en niet elke kei breekt scherp.
function knap(i) {
  if (state.hands[i] === 'stone' && !state.rock[i]) renderHands();
  const r = state.rock[i];
  if (!r || state.hands[1 - i] !== 'stone') return;
  const R = ROCKS[r.type]; r.hits++; r.at = player.pos.clone(); player.action = 0.5;
  const again = () => knapAgain(i, r);
  if (R.crumble) {
    sound.crack();
    if (r.hits < R.crumble) { toast('Dof. Er springen korrels af, maar geen scherpe rand…', 3); again(); return; }
    state.hands[i] = null; renderHands(); state.rockKnown.add(r.type);
    toast('De kei valt in gruis uit elkaar. Deze soort is te zacht. Zoek een gladde, harde kei.', 6); discover('rock');
    return;
  }
  sound.knap();
  if (r.hits < R.hits) { toast(r.hits === 1 ? 'Tik! Een splinter, te klein om vast te houden. Nog eens.' : 'Tak! Er loopt een barst langs de rand. Bijna…', 3); again(); return; }
  state.hands[i] = 'flake'; renderHands(); state.rockKnown.add(r.type);
  toast(state.found.has('flake') ? 'Tik! Weer een scherpe afslag.' : 'Tik! Er springt een scherpe afslag van de steen af.');
  state.known.add('flake'); discover('flake');
}
// doorslaan zolang je stil blijft staan met beide keien in je handen
let knapQ = null;
function knapAgain(i, r) { knapQ = { i, r, t: 0.35 }; }
function knapTick(dt) {
  const q = knapQ; if (!q) return;
  if (state.rock[q.i] !== q.r || state.hands[1 - q.i] !== 'stone' || walkTo || q.r.at.distanceTo(player.pos) > 0.4 || state.collapsed > 0) { knapQ = null; return; }
  if (player.once) return;
  q.t -= dt;
  if (q.t <= 0) { knapQ = null; act('Interact', () => knap(q.i)); }
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
  kemHelps(null, k);
}
// iets aan de groep geven: het beste wat je in je handen hebt
function giveItem() { const it = GIVE.find((x) => state.hands.includes(x) && !(x === 'leaf' && !group.sick)) || GIVE.find((x) => state.hands.includes(x)); return it; }
function give(it = giveItem()) {
  if (!it || !state.hands.includes(it)) return;
  if (share(it)) { state.hands[state.hands.indexOf(it)] = null; renderHands(); }
}
// de groep krijgt iets: uit je hand, of omdat je het bij de boom hebt neergelegd
function share(it) {
  const r = group.give(it, predGame); if (!r) return false;
  toast(r.text, 6);
  if (r.gain === null) return false;
  state.group = THREE.MathUtils.clamp(state.group + r.gain, 0, 100);
  if (r.gain > 0) state.brought[it] = (state.brought[it] || 0) + 1;
  if (r.bad) sound.bad(); else { sound.eat(); setTimeout(() => sound.good(), 600); discover('share'); }
  return true;
}
// eten dat bij de slaapboom op de grond ligt, pakt de groep zelf
let layT = 0;
function groupTakes(dt) {
  layT -= dt; if (layT > 0) return;
  layT = 1.5;
  if (state.sleeping > 0 || state.lost) return;
  const t = things.find((x) => x.kind === 'pick' && !x.gone && ['meat', 'honey', 'bone', 'egg', 'berry'].includes(x.item) && Math.hypot(x.x - HOME.x, x.z - HOME.z) < 12);
  if (t && share(t.item)) removeThing(t);
}
// bij de groep gaan slapen: de nacht gaat voorbij
function sleep() {
  if (state.sleeping > 0) return;
  state.sleeping = 3.6; walkTo = null; $('fade').style.opacity = 1; sound.sleep();
  toast('Je kruipt dicht tegen de anderen aan. Hier ben je veilig.', 3.4);
}
function wake() {
  dayP = 0.035; state.slept = true; $('fade').style.opacity = 0;
  if (state.lost) {
    // de groep was vertrokken: dagen later vind je ze terug, mager en met lege handen
    state.lost = false; state.day++; state.group = 30; state.hands = [null, null]; renderHands();
    state.health = Math.min(state.health, 45); state.food = 30; state.sick = 0;
    player.pos.set(HOME.x + 2, 0, HOME.z + 4); player.vel.set(0, 0, 0);
    newDay('lost');
    return;
  }
  state.health = Math.min(100, state.health + 25 + state.group * 0.5); state.food = Math.max(8, state.food - 8); state.sick = 0;
  newDay('slept');
  discover('sleep');
}

// ---------- het droge seizoen ----------
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
  const gh = giant.newDay(dry, rain, predGame);   // de reus heeft zijn eigen nieuws
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
  state.lost = true; state.starve = 0; state.sleeping = 4; walkTo = null; $('fade').style.opacity = 1; sound.bad();
  toast('De groep kan niet langer wachten. Ze trekken weg, op zoek naar eten…', 3.8);
}
// loopt Kem met je mee, dan plukt of snijdt hij ook een deel
function kemHelps(t, k) {
  const m = group.helper(player.pos); if (!m) return;
  if (t && t.item === 'berry' && available(t)) { take(t); m.carry = 'berry'; }
  else if (k && k.meat > 0) { k.meat--; m.carry = 'meat'; }
  else return;
  m.busy = 2;
  const what = m.carry === 'meat' ? 'snijdt ook een lap vlees los' : 'plukt ook een handvol';
  setTimeout(() => toast(`Kem ${what}. Hij draagt het naar de boom.`, 4), 1800);
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
  take(t); nextRock = t.rock || null; state.hands[h] = t.item; renderHands(); nextRock = null;
  player.action = 0.5; sound.pick();
  if (t.bush) kemHelps(t);
}
function tasteFrom(t) { if (!available(t)) return; take(t); t.noAuto = true; eat(t.item); }   // proeven is niet ook nog plukken

// ---------- naar iets toe lopen en het dan doen ----------
let walkTo = null;
function goAndDo(t, fn, reach = 1.4) {
  if (Math.hypot(t.x - player.pos.x, t.z - player.pos.z) < reach + 0.2) { fn(); return; }
  walkTo = { x: t.x, z: t.z, fn, reach };
}

// ---------- het rondje met icoontjes ----------
let radial = null;
function closeRadial() { radial = null; $('radial').innerHTML = ''; }
function openRadial(target) {
  const opts = [];
  const hasStone = state.hands.includes('stone');
  if (target.hand !== undefined) {
    const i = target.hand, it = state.hands[i], other = state.hands[1 - i];
    opts.push({ icon: ICON.eye, fn: () => lookAt({ item: it, rock: state.rock[i] }) });
    if (EDIBLE.has(it)) opts.push({ icon: ICON.mouth, q: !state.known.has(it), fn: () => { state.hands[i] = null; renderHands(); eat(it); } });
    if ((it === 'bone' && other === 'stone') || (it === 'stone' && other === 'bone')) opts.push({ icon: ICON.crack, fn: () => act('Interact', crack) });
    if (it === 'stone' && other === 'stone') opts.push({ icon: ICON.knap, fn: () => act('Interact', () => knap(i)) });
    opts.push({ icon: ICON.drop, fn: () => { state.hands[i] = null; renderHands(); dropAt(it); } });
  } else if (target.kind === 'turn') {
    opts.push({ icon: ICON.eye, fn: () => lookAt(target) });
    opts.push({ icon: ICON.turn, fn: () => goAndDo(target, () => act('PickUp_Table', () => turnStone(target), 1.4)) });
  } else if (target.look) {
    opts.push({ icon: ICON.eye, fn: () => lookAt(target) });
    if (['hyena', 'leopard', 'sabre', 'zebra', 'wounded', 'bird', 'snake', 'stranger'].includes(target.look) && hasStone) opts.push({ icon: ICON.throw, fn: () => throwAt(target.member) });
    // snijden: zonder afslag merk je vanzelf dat het niet gaat
    const flake = state.hands.includes('flake'), cut = (fn) => () => (state.hands.includes('flake') ? act('Interact', fn) : fn());
    if (target.look === 'carcass' && flake) opts.push({ icon: ICON.cut, fn: () => goAndDo(target, cut(cutMeat)) });
    if (target.look === 'kill' && sabres.kill && sabres.kill.meat > 0) opts.push({ icon: ICON.cut, fn: () => goAndDo(target, cut(cutKill)) });
    if (target.look === 'prey' && target.enc.meat > 0) opts.push({ icon: ICON.cut, fn: () => goAndDo(target, cut(() => enc.cutPrey(target.enc, predGame)), 2.4) });
    if (target.look === 'giantdead' && giant.meat > 0) opts.push({ icon: ICON.cut, fn: () => goAndDo(target, cut(() => giant.cut(predGame)), 3.2) });
    if (target.look === 'bees' && target.enc.honey > 0) opts.push({ icon: ICON.hand, fn: () => goAndDo(target, () => act('Interact', () => enc.takeHoney(target.enc, predGame)), 2.6) });
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
function dropAt(it, rock = lastRock) {
  const t = dropAtPos(it, player.pos.x + Math.sin(player.yaw) * 0.6, player.pos.z + Math.cos(player.yaw) * 0.6, false, rock);
  if (t) t.byPlayer = true;
}
function dropAtPos(it, x, z, thrown = false, rock = null) {
  if (!['stone', 'bone', 'flake', 'meat', 'egg', 'honey', 'berry'].includes(it)) return null;
  if (it === 'stone' && !rock) rock = { type: 'lava', hits: 0 };
  const m = heldMesh(it, rock); m.position.set(x, height(x, z) + 0.08, z); if (it === 'bone') m.rotation.set(0, 0, Math.PI / 2);
  m.traverse((o) => { o.castShadow = true; }); scene.add(m);
  const t = { kind: 'pick', item: it, x, z, mesh: m, noAuto: !thrown, rock };
  things.push(t); glints.add(scene, t);
  return t;
}
function removeThing(t) { t.gone = true; scene.remove(t.mesh); }
// een vrije hand vullen (false als je handen vol zijn)
function giveHand(it) { const h = freeHand(); if (h < 0) { handsFull(); return false; } state.hands[h] = it; renderHands(); return true; }
// pijn die niet van een roofdier komt: een steek, een pik, een steen
function hurt(dmg) { if (state.collapsed > 0 || state.sleeping > 0) return; state.health -= dmg; hurtFlash(); sound.bite(); }

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
    state.hands.forEach((it, i) => { if (it) { dropAt(it, state.rock[i]); state.hands[i] = null; } }); renderHands();
    if (attacker.kind === 'sabre') { toast('De sabeltandkat slaat je tegen de grond! Je laat alles vallen. Weg hier!', 5); discover('sabre'); }
    else if (attacker.kind === 'giant') toast('De reus schept je op en smijt je door de lucht! Je laat alles vallen. Blijf uit zijn buurt!', 6);
    else toast('Het luipaard springt je vanuit het niets aan! Je laat alles vallen.', 5);
  } else toast('Au! De hyena bijt je in je been.', 3);
  return stolen;
}
// een steen gooien naar een roofdier
function throwAt(member, kind = member.kind) {
  const i = state.hands[1] === 'stone' ? 1 : state.hands.indexOf('stone');
  if (i < 0) { toast('Je hebt geen steen in je hand.'); return; }
  const rock = state.rock[i];
  state.hands[i] = null; renderHands();
  sound.whoosh();
  const from = player.pos.clone(); from.y += 1.3;
  throws.throw(from, member, (x, z) => {
    sound.thud();
    if (member.free) {
      // zomaar een worp: raakt hij toevallig iets, dan telt dat ook
      const hit = bestTargetAt(x, z, 1.8);
      if (hit) hitTarget(hit);
    } else if (Math.hypot(member.x - x, member.z - z) < 1.8) hitTarget({ m: member, kind: kind || 'gazelle' });
    else toast('Mis!');
    dropAtPos('stone', x, z, true, rock);
  }, heldMesh('stone', rock));
}
// zonder doel: de steen een eind voor je uit gooien
function throwAhead() {
  const d = 12, free = { free: true, x: player.pos.x + Math.sin(player.yaw) * d, z: player.pos.z + Math.cos(player.yaw) * d };
  player.playOnce('Spell_Simple_Shoot', { speed: 1.5, at: 0.4, slow: 0.2, onAt: () => throwAt(free, null) });
}
// wat er in de wereld gebeurt rond de jacht van de sabeltandkatten
function event(name, k) {
  if (name === 'kemgift') {
    state.group = Math.min(100, state.group + (k === 'meat' ? 30 : 8)); state.brought[k] = (state.brought[k] || 0) + 1;
    toast(k === 'meat' ? 'Kem legt zijn lap vlees bij de boom. Ibo zit er al naast.' : 'Kem deelt zijn bessen uit bij de boom.', 4); sound.good();
    return;
  }
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
const predGame = { player, state, sound, toast, discover, bite, event, hyenas, night: 0, things, throws, group, leopard, sabres, carcass: CARCASS, drop: dropAtPos, removeThing, giveHand, hurt, kemHelps, shield: false, quake: (v) => { shake = Math.max(shake, v); } };

// ---------- wat kun je aantikken? ----------
const LOOK_TARGETS = [{ look: 'carcass', x: CARCASS.x, z: CARCASS.z }, { look: 'tree', x: HOME.x, z: HOME.z }];
function targetPos(t) {
  if (t.member && t.member.g) return { x: t.member.x, y: t.member.g.position.y + 0.8, z: t.member.z };
  if (t.member) return { x: t.member.x, y: height(t.member.x, t.member.z) + 1, z: t.member.z };
  if (t.high) return { x: t.x, y: t.high, z: t.z };
  return { x: t.x, y: height(t.x, t.z) + (t.bush ? 0.7 : t.look ? 0.4 : 0.2), z: t.z };
}
function tapAt(sx, sy) {
  const cands = [...things.filter(available), ...LOOK_TARGETS, ...herd.members.map((m) => ({ look: 'gazelle', member: m })),
    ...hyenas.list.map((h) => ({ look: 'hyena', member: h })), { look: 'leopard', member: leopard },
    ...zebras.alive.map((m) => ({ look: 'zebra', member: m })), ...sabres.list.map((m) => ({ look: 'sabre', member: m })), ...group.list.map((m) => ({ look: m.id, member: m })), ...enc.lookTargets(), ...giant.lookTargets(player.pos)];
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
  if (e.code === 'KeyC') setSneak(!player.sneaking);
  if (e.code === 'KeyE' || e.code === 'KeyF') doAction();
  if (e.code === 'Space') player.jumpReq = true;
  if (e.code === 'KeyQ') setSense(true);
  if (e.code === 'Escape') { closeCard(); closeRadial(); }
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyQ') setSense(false); });

const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, t0: 0, moved: 0 };
const look = { id: null, lx: 0, ly: 0, last: -9, sx: 0, sy: 0, t0: 0, moved: 0, touch: false, pinched: false, yaw0: 0, pitch0: 0 };
// Vegen met de kijkvinger: kort en snel omlaag = bukken, omhoog = weer staan, en sta je al, dan spring je.
// Langzaam slepen blijft gewoon rondkijken. (Eerste gok voor de drempels; op een echte telefoon bijstellen.)
const FLICK = { ms: 300, px: 42, steep: 1.5 };
// De camera hangt dicht achter je schouder. Met twee vingers (of het muiswiel) zoom je in en uit; dat wordt onthouden.
const ZOOM = [2.2, 10];
let camYaw = Math.PI, camPitch = 0.26, camDist = THREE.MathUtils.clamp(+localStorage.getItem('homoV4zoom') || 4, ...ZOOM);
const pinch = { id: null, x: 0, y: 0, d0: 1, z0: 1 };
function setZoom(d) { camDist = THREE.MathUtils.clamp(d, ...ZOOM); try { localStorage.setItem('homoV4zoom', camDist.toFixed(2)); } catch (e) { /* geen opslag */ } }
const ring = document.querySelector('#joy .ring'), knob = document.querySelector('#joy .knob');
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && joy.id === null) {
    Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0, t0: performance.now(), moved: 0 });
    ring.style.left = knob.style.left = e.clientX + 'px'; ring.style.top = knob.style.top = e.clientY + 'px';
    $('joyHint').style.display = 'none';
  } else if (look.id === null) {
    Object.assign(look, { id: e.pointerId, lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), ts: e.timeStamp, moved: 0, touch: e.pointerType !== 'mouse', pinched: false, yaw0: camYaw, pitch0: camPitch });
  } else if (pinch.id === null && e.pointerType !== 'mouse') {
    // een tweede vinger erbij: knijpen om te zoomen
    Object.assign(pinch, { id: e.pointerId, x: e.clientX, y: e.clientY, d0: Math.max(20, Math.hypot(e.clientX - look.lx, e.clientY - look.ly)), z0: camDist });
    look.moved = 99; look.pinched = true;
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
  } else if (pinch.id !== null && (e.pointerId === look.id || e.pointerId === pinch.id)) {
    if (e.pointerId === look.id) { look.lx = e.clientX; look.ly = e.clientY; } else { pinch.x = e.clientX; pinch.y = e.clientY; }
    setZoom(pinch.z0 * pinch.d0 / Math.max(20, Math.hypot(pinch.x - look.lx, pinch.y - look.ly)));
    look.last = clock.elapsedTime;
  } else if (e.pointerId === look.id) {
    look.moved = Math.max(look.moved, Math.hypot(e.clientX - look.sx, e.clientY - look.sy));
    camYaw -= (e.clientX - look.lx) * 0.006;
    camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - look.ly) * 0.003, 0.04, 0.95);
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
  if (e.pointerId === pinch.id) pinch.id = null;
  if (e.pointerId === look.id) {
    if (tap(look) && e.type === 'pointerup') tapAt(e.clientX, e.clientY);
    else if (e.type === 'pointerup' && look.touch && !look.pinched) {
      const dx = e.clientX - look.sx, dy = e.clientY - look.sy;
      if (e.timeStamp - look.ts < FLICK.ms && Math.abs(dy) > FLICK.px && Math.abs(dy) > FLICK.steep * Math.abs(dx)) {
        camYaw = look.yaw0; camPitch = look.pitch0;   // het was een veeg, geen rondkijken
        flick(dy < 0);
      }
    }
    look.id = null;
    // de andere vinger van het knijpen kijkt verder rond
    if (pinch.id !== null) { Object.assign(look, { id: pinch.id, lx: pinch.x, ly: pinch.y, sx: pinch.x, sy: pinch.y, moved: 99, pinched: true }); pinch.id = null; }
  }
};
canvas.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(camDist * Math.exp(e.deltaY * 0.0012)); }, { passive: false });
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

let coverTold = false;
function setSneak(on) { player.sneaking = on; }
function flick(up) { if (!up) setSneak(true); else if (player.sneaking) setSneak(false); else player.jumpReq = true; }
$('doBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); doAction(); });
function setSense(on) {
  if (state.sensing === on) return;
  state.sensing = on; $('senseVeil').classList.toggle('on', on);
  sound.sense(on);
}

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
      if (freeHand() >= 0 && player.once) continue;   // nog bezig met bukken: zo meteen
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
  list.push(...enc.targets());
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
function bestTargetAt(x, z, r) {
  let best = null, bd = r;
  for (const t of targets()) { const d = Math.hypot(t.m.x - x, t.m.z - z); if (d < bd) { bd = d; best = t; } }
  return best;
}
function act(anim, fn, speed = 1.6) { player.playOnce(anim, { speed, at: 0.5, onAt: fn }); }
function hitTarget(t, how = 'throw') {
  if (enc.owns(t.kind)) enc.hit(t, how, predGame);
  else if (t.kind === 'hyena') hyenas.hit(t.m, predGame);
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
    if (t) { sound.thud(); hitTarget(t, armed ? 'stone' : 'fist'); }
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
  const prey = t && !t.threat && !['hyena', 'leopard'].includes(t.kind);
  if (t && stone && (!prey || t.d < 14)) return { mode: 'throw', icon: ICON.throw, danger: !prey, run: () => doThrow(t) };
  // met een kei in je hand en niets om te raken: gooien
  if (stone) return { mode: 'throw', icon: ICON.throw, run: throwAhead };
  // al het andere (snijden, kraken, omdraaien) doe je door het ding zelf aan te tikken
  return { mode: 'strike', icon: ICON.strike, run: strike };
}
// ---------- bij de groep gaat het vanzelf ----------
// Kom je met eten de kring in, dan nemen ze het van je over. Stenen en afslagen houd je zelf.
let giveT = 0, stillT = 0;
function handOver() {
  return GIVE.find((x) => state.hands.includes(x) && !(x === 'leaf' && !group.sick) && !(x === 'redberry' && state.known.has('redberry')));
}
function atHome(dt) {
  if (!state.started || state.sleeping > 0 || state.collapsed > 0) return;
  const dHome = Math.hypot(player.pos.x - HOME.x, player.pos.z - HOME.z);
  giveT -= dt;
  if (dHome < 9 && giveT <= 0 && !player.once && !state.lost) {
    const it = handOver();
    if (it) { giveT = 3.5; act('Interact', () => give(it)); return; }
  }
  // 's nachts stil bij de anderen staan: je kruipt erbij en slaapt
  if (dHome < 9 && predGame.night > 0.5 && stillT > 4 && giveT <= 0) sleep();
}
// ---------- wat je lijf en je groep je laten merken ----------
const statShow = { food: 0, health: 0, group: 0 }, statPrev = { food: 55, health: 100, group: 50 };
let bellyT = 8, cryT = 5, hungerTold = false;
function bodySignals(dt, sick, hd) {
  // de streepjes zie je alleen als er iets verandert, als het slecht gaat, of als je stilstaat en voelt hoe het met je is
  for (const [k, id, low] of [['food', 'statFood', 20], ['health', 'statHealth', 35], ['group', 'statGroup', 20]]) {
    const v = state[k];
    if (Math.abs(v - statPrev[k]) > 0.6) statShow[k] = 5;
    statPrev[k] = v; statShow[k] -= dt;
    $(id).classList.toggle('on', statShow[k] > 0 || v < low || state.sensing || (k === 'health' && sick));
  }
  $('homeRow').classList.toggle('on', state.sensing && hd > 22);
  if (!state.started || state.sleeping > 0 || state.collapsed > 0) { $('weak').style.opacity = 0; return; }
  if (state.food < 20) {
    bellyT -= dt;
    if (bellyT <= 0) { bellyT = 16 + Math.random() * 10; sound.belly(); if (!hungerTold) { hungerTold = true; toast('Je maag knort. Je moet zelf ook eten.', 4); } }
  } else hungerTold = false;
  $('weak').style.opacity = state.health < 35 ? (1 - state.health / 35) * (0.55 + 0.2 * Math.sin(clock.elapsedTime * 3)) + 0.15 : 0;
  if (state.group < 20 && hd < 45 && !state.lost) { cryT -= dt; if (cryT <= 0) { cryT = 12 + Math.random() * 8; sound.cry(1 - hd / 60); } }
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
  // een ring om een steen die je kunt omdraaien: tik erop
  const u = useTarget();
  marker.visible = !!u;
  if (u) marker.position.set(u.x, height(u.x, u.z) + 0.05, u.z);
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
  // bij gevaar ren je vanzelf voluit, ook als je de duim maar half duwt
  if (danger > 0.6 && mag > 0.3 && !player.sneaking) { const k = 1 / mag; ix *= k; iy *= k; mag = 1; }
  if (state.collapsed > 0 || state.sleeping > 0) mag = 0;
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  if (mag > 0.05) {
    walkTo = null;
    // vooruit = waar de camera heen kijkt, rechts = rechts in beeld
    dir.set(fx * -iy - fz * ix, 0, fz * -iy + fx * ix).normalize().multiplyScalar(mag);
  } else if (walkTo && state.collapsed <= 0) {
    const dx = walkTo.x - player.pos.x, dz = walkTo.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d < walkTo.reach) { const fn = walkTo.fn; walkTo = null; dir.set(0, 0, 0); fn(); }
    else dir.set(dx / d, 0, dz / d).multiplyScalar(d > 6 ? 0.9 : 0.6);
  } else dir.set(0, 0, 0);
  // sta je even stil, dan gaan je zintuigen vanzelf open; loop je weer, dan sluiten ze
  const busy = mag > 0.05 || walkTo || player.once || !player.onGround || !state.started || state.collapsed > 0 || state.sleeping > 0;
  if (busy) { stillT = 0; if (!keys.has('KeyQ') && !window.__holdSense) setSense(false); }
  else { stillT += dt; if (stillT > 2) setSense(true); }

  const sick = state.sick > 0;
  player.update(dt, dir, { speed: sick ? 0.6 : state.food < 15 ? 0.8 : 1, sick });
  // de dag
  if (state.started) dayP = (dayP + dt / DAY_LEN) % 1;
  if (state.sleeping > 0) { state.sleeping -= dt; if (state.sleeping <= 0) wake(); }
  const night = nightAmount(dayP);
  herd.update(dt, player, ui);
  predGame.night = night; predGame.danger = danger;
  hyenas.update(dt, predGame);
  leopard.update(dt, predGame, camera);
  throws.update(dt); knapTick(dt);
  zebras.update(dt, predGame);
  sabres.update(dt, predGame);
  group.update(dt, predGame);
  enc.update(dt, predGame);
  giant.update(dt, predGame, t);
  groupTakes(dt);
  atHome(dt);
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
  dg = Math.max(dg, { stalk: 0.5, freeze: 0.65, pounce: 1 }[leopard.state] || 0, enc.danger(), giant.danger());
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
    if (part === 'dawn' && !state.slept) newDay('alone');
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
  // dichtbij schuift de camera opzij, zodat je over je schouder de vlakte in kijkt
  const dist = camDist, up = 1.0, near = THREE.MathUtils.clamp((6.5 - dist) / 3.5, 0, 1);
  const sx = -Math.cos(camYaw) * 0.55 * near, sz = Math.sin(camYaw) * 0.55 * near, ahead = 2.2 + near * 3.5;
  camTarget.set(player.pos.x + sx + Math.sin(camYaw) * ahead, player.pos.y + up, player.pos.z + sz + Math.cos(camYaw) * ahead);
  camPos.set(player.pos.x + sx - Math.sin(camYaw) * Math.cos(camPitch) * dist, player.pos.y + up + Math.sin(camPitch) * dist, player.pos.z + sz - Math.cos(camYaw) * Math.cos(camPitch) * dist);
  camPos.y = Math.max(camPos.y, height(camPos.x, camPos.z) + 1.2 - near * 0.5);
  // niet midden in een boomstam of rots gaan staan
  for (const b of blockers) {
    if (b.top || b.beast) continue;
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
  // dichtbij schuift het beeld wat omhoog: zo sta je vrij van de knoppen en zie je meer grond voor je voeten
  camera.setViewOffset(innerWidth, innerHeight, 0, Math.round(innerHeight * 0.14 * near), innerWidth, innerHeight);

  // eten, ziek zijn, herstellen
  if (state.started && state.sleeping <= 0) {
    // de groep krijgt honger: zonder jou raakt het eten op
    state.group = Math.max(0, state.group - dt * 60 / DAY_LEN);
    if (state.group < 20 && groupWarn === 0) { groupWarn = 1; toast('Je groep heeft honger. Breng eten naar de slaapboom: vlees, merg of bessen.', 6); }
    if (state.group > 35) groupWarn = 0;
    // blijft het te lang leeg, dan trekt de groep verder
    if (state.group <= 0) {
      state.starve += dt;
      if (state.starve > 40 && groupWarn < 2) { groupWarn = 2; sound.sting(); toast('Er is niets meer te eten bij de boom. Breng snel iets, anders trekt de groep verder zonder jou.', 7); }
      if (state.starve > 130) groupLeaves();
    } else state.starve = 0;
  }
  if (state.started && state.collapsed <= 0 && state.sleeping <= 0) {
    state.food = Math.max(0, state.food - dt * 0.18);
    if (sick) { state.sick -= dt; state.health -= dt * 0.9; if (state.sick <= 0) toast('De pijn is vanzelf gezakt. Dat duurde lang…'); }
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
  $('group').style.width = state.group + '%'; $('dayLbl').textContent = 'Dag ' + state.day;
  // een pijltje naar de slaapboom als je ver weg bent
  const hdx = HOME.x - player.pos.x, hdz = HOME.z - player.pos.z, hd = Math.hypot(hdx, hdz);
  bodySignals(dt, sick, hd);
  if (player.sneaking && !coverTold && player.nearCover) { coverTold = true; toast('Gebukt achter een rots of struik ben je onzichtbaar voor wie aan de andere kant staat.', 6); }
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
    if (hintStage <= 2 && pt > 160) { hintStage = 3; toast('Sta eens een paar tellen stil. Je zintuigen gaan open: wat valt je op?', 6); }
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
  state, player, herd, hyenas, leopard, zebras, sabres, group, enc, giant, game: predGame, HOME, give, sleep, cutKill, season, newDay, hunt: () => sabres.startHunt(predGame), danger: () => danger, things, camera, renderer, discover, throwAt, turnStone, knap: () => { renderHands(); const i = state.hands.indexOf('stone'); if (state.rock[i]) state.rock[i].hits = 9; knap(i); }, renderHands, cutMeat, tapAt, pickUp, openRadial, lookAt, blockers, cover, flick, setSneak, still: () => stillT, FLICK,
  setCam: (y, p, d) => { camYaw = y; camPitch = p; if (d) camDist = d; }, setZoom, zoom: () => camDist,
  lookFrom: (pos, look) => { camOverride = pos ? { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) } : null; },
  // als lookFrom, maar met hoogtes ten opzichte van de grond op de plek waar je naar kijkt
  lookRel: (pos, look) => { const h = height(look[0], look[2]); camOverride = { pos: new THREE.Vector3(pos[0], pos[1] + h, pos[2]), look: new THREE.Vector3(look[0], look[1] + h, look[2]) }; }, setDay: (p) => { dayP = p; }, setSense,
  screenOf: (t) => { const a = anchorOf(t); return a && [a.x, a.y]; },
};
