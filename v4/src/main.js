import * as THREE from '../lib/three.module.js';
import { rigDetail } from './rig.js';
import { buildWorld, height, tallGrassAt, blockers, cover, surface, steep, groundAt, riverDist, WIND, PERCHES, FORD, LAKE, depth, riverZ } from './world.js';
import { Hominin, Herd, carcass } from './actors.js';
import { KNAP } from './hominin.js';
import { Vultures, SKY, FLOCKS, groundBirds, scareBirds } from './vultures.js';
import { DISCOVERIES, LOOKS, VERDICT, FINDS, placeItems, heldMesh } from './items.js';
import { Hyenas, Leopard, Throws } from './predators.js';
import { Zebras, Sabres } from './hunt.js';
import { Group, HOME } from './group.js';
import { ERAS, ERA, AREA } from './eras/index.js';
import { Save, DEV } from './save.js';
import { Glints, Motes, Birds, Butterflies, Senses } from './life.js';
import { Sound } from './audio.js';
import { loadAssets } from './assets.js';
import { ICON } from './icons.js';
import { Encounters } from './encounters.js';
import { Beast } from './beast.js';
import { BEASTS } from './beasts.js';
import { Shore, digTuber } from './shore.js';
import { Fire } from './fire.js';
import { $, toast, note, need, sign, title, closeCard, uiTick } from './engine/ui.js';
import { initControls } from './engine/controls.js';
import { lowerAuto } from './engine/settings.js';
import { initMenu } from './systems/menu.js';
import { initMissions } from './systems/missions.js';
import { initSeason } from './systems/season.js';
import { Weather } from './systems/weather.js';
import { initHints } from './systems/hints.js';
import { initBody } from './systems/body.js';
import { initPersist } from './systems/persist.js';
import { initCarry } from './systems/carry.js';
import { Forage } from './forage.js';
import { initFood } from './systems/food.js';
import { initCraft } from './systems/craft.js';
import { Chips } from './chips.js';
import { initThirst } from './systems/thirst.js';
import { initKnowledge } from './systems/knowledge.js';

const GIVE_BACK = { waterbag: 'pouch' };   // wat je terugkrijgt als de groep het leeg heeft
const EDIBLE = new Set(['roast', 'berry', 'redberry', 'leaf', 'meat', 'egg', 'honey', 'tuber', 'fish', 'fig']);
const GIVE = ['roast', 'meat', 'honey', 'fish', 'waterbag', 'hide', 'bone', 'egg', 'baobab', 'tuber', 'fig', 'berry', 'leaf', 'redberry'];   // wat je aan de groep kunt geven, het beste eerst
const DAY_LEN = 14 * 60;   // één dag en nacht duurt 14 minuten

// ---------- scène ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// scherp beeld: tot 2x de schermpixels (meer kost veel rekenkracht en zie je nauwelijks)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));   // de instellingen (systems/menu.js) stellen dit bij
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

// eerst de gescande natuur laden; daarna begint het spel vanzelf
const loading = document.getElementById('loading'); loading.className = 'hud stat on'; loading.style.setProperty('--c', '#f3e6cb'); loading.style.setProperty('--v', 0);
const A = await loadAssets(renderer, (f) => { loading.style.setProperty('--v', Math.round(f * 100)); }, [...new Set([...(AREA.models || []), BEASTS[AREA.beast.kind].model, ...(FORD ? ['croc'] : [])])], AREA.textures).catch((e) => {
  // nooit stil blijven hangen op 'Laden…': zeg wat er mis is
  loading.textContent = e.message + '. Controleer je verbinding en laad de pagina opnieuw.'; loading.style.maxWidth = '80vw';
  throw e;
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 700);
const world = buildWorld(scene, A);
const player = new Hominin(scene, A);
const HERD_NAME = AREA.herd.species === 'impala' ? 'impala\'s' : 'gazellen';
const herd = new Herd(scene, AREA.herd.at[0], AREA.herd.at[1], AREA.herd.n, A, { persist: !!AREA.herd.persist, species: AREA.herd.species });
const CARCASS = AREA.carcass;
const vultures = new Vultures(scene, CARCASS.x, CARCASS.z, A);
carcass(scene, CARCASS.x, CARCASS.z);
const things = placeItems(scene, A, AREA);
const forage = new Forage(scene, A, things);   // vruchtbomen, takken onder de bomen, oude karkassen, knollen
const glints = new Glints(scene, things);
const motes = new Motes(scene);
const bushes = things.filter((t) => t.bush).map((t) => [t.x, t.z, t.bush.g]);
const birds = new Birds(scene, AREA.birds);
const butterflies = new Butterflies(scene, bushes, A);
const senses = new Senses(scene);
const sound = new Sound();
const hyenas = new Hyenas(scene, CARCASS, A);
const leopard = new Leopard(scene, { x: AREA.leopard.tree[0], z: AREA.leopard.tree[1], branchY: AREA.leopard.branchY }, A);
const throws = new Throws(scene);
const chips = new Chips(scene);
const zebras = new Zebras(scene, AREA.zebras.at[0], AREA.zebras.at[1], A);
const sabres = new Sabres(scene, { x: AREA.sabres.lair[0], z: AREA.sabres.lair[1] }, zebras, A);
const group = new Group(scene, A);
const enc = new Encounters(scene, A);   // wat je onderweg tegenkomt
const beast = new Beast(scene, A, AREA.beast);      // het grote dier van dit gebied (zie beasts.js)
const shore = AREA.shore || FORD ? new Shore(scene, A) : null;   // de oever: krokodillen, meervallen, knollen
const fire = AREA.fire ? new Fire(scene, AREA.fire, DAY_LEN, A) : null;   // vuur: vinden, dragen, brandend houden
// wat er in dit tijdperk te ontdekken valt, en of je iets scherps in je hand hebt (een afslag of een vuistbijl)
const ERA_IX = ERAS.indexOf(ERA), DISC = DISCOVERIES.filter((d) => (!d.era || ERAS.findIndex((e) => e.id === d.era) <= ERA_IX) && (!d.beast || d.beast === beast.kind));
const sharp = () => state.hands.includes('flake') || state.hands.includes('axe');

// De maat van het beeld volgt het scherm. Een telefoon meldt na draaien of volledig scherm niet altijd (op tijd) een
// resize, dus de lus kijkt elk beeld of de maat nog klopt; de stijl van het canvas laten we aan de CSS.
let sizeW = 0, sizeH = 0;
function resize() {
  sizeW = innerWidth; sizeH = innerHeight;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 70 : 55;   // staand scherm: wat ruimer kijken
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- toestand ----------
const state = {
  food: 70, water: 85, health: 100, sick: 0, hands: [null, null], rock: [null, null], rockKnown: new Set(), known: new Set(), found: new Set(),
  started: false, collapsed: 0, sensing: false, finds: new Set(), carcassMeat: 1,
  past: [], group: 50, day: 1, sleeping: 0, slept: false, brought: {}, given: new Set(), bag: null, cloak: false, starve: 0, rainDay: 0, lost: false,
};
const verdict = { get: (it) => (state.known.has(it) ? VERDICT[it] : null) };

// ---------- meldingen ----------

function discover(id) {
  if (state.found.has(id)) return;
  state.found.add(id);
  const d = DISCOVERIES.find((x) => x.id === id);
  setTimeout(() => sound.discover(), 1400);
  if (DISC.every((x) => state.found.has(x.id))) setTimeout(() => murmur('Je hebt alles in dit proefstuk ontdekt. Zo begon het: kijken, proberen en onthouden.', 8), 7500);
}

// ---------- wat de onderdelen van elkaar mogen weten ----------
// Systemen (systems/) krijgen dit ene object mee. Wat pas verderop in dit bestand ontstaat, wordt op het moment van gebruik opgehaald.
const G = {
  state, player, scene, renderer, things, hyenas, sabres, group, beast, shore, forage, fire, herd, sound, closeRadial, openRadial, dropAt, act, sharp, discover, carcassNear, hiveNear, spotOf,
  get predGame() { return predGame; }, get dayP() { return dayP; }, set dayP(v) { dayP = v; }, get danger() { return danger; }, get aim() { return aim; },
  chips(type, big, dust) { const at = player.knapPoint(); chips.burst(at, new THREE.Vector3(-Math.cos(player.yaw), 0, Math.sin(player.yaw)), type, big, dust); },
  get camYaw() { return cam.yaw; }, get camera() { return camera; }, set camTurn(v) { cam.turnTo = v; }, get clock() { return clock; }, stopWalk() { walkTo = null; }, get walking() { return !!walkTo; },
};
let homeShown = false;
const carry = initCarry(G), { renderHands, freeHand, handsFull, giveHand, renderBag, stow, unstow, makeBag, wearHide, putCloak, cloakTick } = carry;
Object.assign(G, carry);
const { eat, crack, crackFruit, cutMeat, heal, heard, tasteAt } = initFood(G);
const { knap, knapAxe, knapTick, makeStick, knapStart, axeStart } = initCraft(G);
const thirst = G.thirst = initThirst(G);
const { journal, knowledge } = initKnowledge(G, DISC);
const hints = G.hints = initHints(G), { did, hintTick } = hints;
const { has, carries, MISSIONS, NEXT, mission, offerOf, accept, complete, missionInfo, endCard, travel, questTick, murmur } = G.missions = initMissions(G);
const { season, newDay, groupLeaves } = initSeason(G);
player.rig.always = true;   // de speler beweegt elk beeld, ook als de camera even ver weg staat
const weather = new Weather(scene, AREA.weather);   // wolken, wind en regen   // het droge seizoen en de nieuwe dag
G.season = season;

// ---------- het menu en de instellingen ----------
const menu = initMenu({ sound, renderer, world, journal: () => journal(), restart: () => G.restart(), goArea: (e, a) => G.goArea(e, a) });

// ---------- je handen, je tas, eten en maken: zie systems/carry.js, food.js en craft.js ----------

// ---------- een vondst ----------
// Wat je vindt, komt in je boekje (in het menu); in het spel zelf hoor je het en zie je het teken.
function found(f) { toast('Vondst: ' + f.name); sign(ICON.book, 3, 'good'); }
function lookAt(target) {
  if (!target.find || state.finds.has(target.find)) return;
  state.finds.add(target.find); sound.discover(); found(FINDS[target.find]);
}

// ---------- eten en doen ----------
// met een afslag een lap vlees van de verse prooi snijden
function cutKill() {
  const k = sabres.kill; if (!k || k.meat <= 0) return;
  if (!sharp()) { need('flake', 'Met je handen krijg je de taaie huid niet open. Je hebt iets scherps nodig.'); return; }
  const h = freeHand();
  if (h < 0) { handsFull(); return; }
  k.meat--; state.hands[h] = 'meat'; renderHands(); sound.eat();
  toast(k.meat > 0 ? 'Je snijdt een lap vlees los. Er zit nog meer aan… maar hoe lang ben je hier nog alleen?' : 'Je snijdt de laatste lap vlees los.', 5);
  discover('kill'); discover('cut');
  kemHelps(null, k); group.fetch(k, predGame);
}
// met een afslag de huid van de prooi snijden
function cutHide() {
  const k = sabres.kill; if (!k || !k.hide) return;
  if (!sharp()) { need('flake', 'Met je handen krijg je de taaie huid niet los. Je hebt iets scherps nodig.'); return; }
  const h = freeHand();
  if (h < 0) { handsFull(); return; }
  k.hide -= 1; state.hands[h] = 'hide'; renderHands(); sound.eat(); killLook(k);
  toast('Je snijdt langs de buik en de poten en trekt een groot stuk huid los. Zwaar, stug en warm.', 5);
  discover('cut'); discover('hide');
}
// zo ziet een gedode prooi eruit: bloed op de grond, een open flank met ribben; zonder huid rood en kaal
let killMesh = null;
// een vlek met een grillige, zachte rand (bloed op de grond, de open flank)
function blotTex(inner, outer, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) {
    const a = rnd() * 6.28, d = i ? 10 + rnd() * 20 : 0, cx = 64 + Math.cos(a) * d, cy = 64 + Math.sin(a) * d, rad = i ? 16 + rnd() * 20 : 34;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, inner); g.addColorStop(0.55, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const POOL_TEX = blotTex('rgba(52,7,5,0.9)', 'rgba(58,9,6,0.6)', 7), WOUND_TEX = blotTex('rgba(74,10,8,1)', 'rgba(96,16,12,0.95)', 23);
function killLook(k) {
  if (killMesh) { scene.remove(killMesh); killMesh = null; }
  if (!k) return;
  const g = new THREE.Group(), yaw = k.zebra ? k.zebra.yaw : 0;
  // het dier ligt op zijn zij naast de plek waar het stond: de wond hoort op de flank, niet erboven
  let cx = k.x, cz = k.z, top = 0.34;
  if (k.zebra) {
    k.zebra.g.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(k.zebra.g), c = box.getCenter(new THREE.Vector3());
    cx = c.x; cz = c.z; top = THREE.MathUtils.clamp(box.max.y - height(cx, cz), 0.2, 0.5);
  }
  // bloed: een donkere, grillige vlek die in de grond trekt, half onder het lijf
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: POOL_TEX, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  pool.rotation.x = -Math.PI / 2; pool.scale.set(1.9, 1.5, 1); pool.position.set(0.1, 0.02, 0.25); pool.renderOrder = -1; g.add(pool);
  // de open flank: een platte, donkerrode plek die net boven de huid uitkomt; zonder huid ligt meer bloot
  const open = k.hide ? 1 : 1.7;
  const wound = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ map: WOUND_TEX, color: 0x8a8080, transparent: true, depthWrite: false }));
  wound.scale.set(0.95 * open, 0.2, 0.75); wound.position.y = top - 0.03; wound.renderOrder = 2; g.add(wound);
  // ribben: lage, vuilwitte bogen die net door het vlees steken
  const bone = new THREE.MeshLambertMaterial({ color: 0xb9a78c });
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 5, 10, Math.PI), bone);
    r.rotation.y = Math.PI / 2 + (i - 1.5) * 0.07; r.position.set((-0.2 + i * 0.13) * open, top - 0.045, 0); r.scale.set(1, 0.38, 1); g.add(r);
  }
  g.position.set(cx, height(cx, cz), cz); g.rotation.y = yaw + Math.PI / 2; scene.add(g); killMesh = g;
}
// iets aan de groep geven: het beste wat je in je handen hebt
function giveItem() { const it = GIVE.find((x) => state.hands.includes(x) && !(x === 'leaf' && !group.sick)) || GIVE.find((x) => state.hands.includes(x)); return it; }
function give(it = giveItem()) {
  if (!it || !state.hands.includes(it)) return;
  if (share(it)) { state.hands[state.hands.indexOf(it)] = GIVE_BACK[it] || null; renderHands(); }
}
// de groep krijgt iets: uit je hand, of omdat je het bij de boom hebt neergelegd
function share(it) {
  const r = group.give(it, predGame); if (!r) return false;
  toast(r.text, 6);
  if (r.gain === null) return false;
  state.group = THREE.MathUtils.clamp(state.group + r.gain, 0, 100);
  if (r.gain > 0) { state.brought[it] = (state.brought[it] || 0) + 1; state.given.add(it); if (it === 'meat' || it === 'roast') predGame.campMeat = 120; }
  if (r.bad) sound.bad(); else { sound.eat(); setTimeout(() => sound.good(), 600); discover('share'); }
  return true;
}
// eten dat bij de slaapboom op de grond ligt, pakt de groep zelf
let layT = 0;
function groupTakes(dt) {
  layT -= dt; if (layT > 0) return;
  layT = 1.5;
  if (state.sleeping > 0 || state.lost) return;
  const t = things.find((x) => x.kind === 'pick' && !x.gone && ['meat', 'honey', 'hide', 'bone', 'egg', 'berry', 'fish', 'tuber', 'fig', 'baobab'].includes(x.item) && Math.hypot(x.x - HOME.x, x.z - HOME.z) < 6);
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
  state.health = Math.min(100, state.health + 25 + state.group * 0.5); state.food = Math.max(8, state.food - 8); state.water = Math.max(25, state.water - 10); state.sick = 0;
  newDay('slept');
  discover('sleep');
  if (fire) fire.morning(predGame, dayP);
}

// loopt Kem met je mee, dan plukt of snijdt hij ook een deel
function kemHelps(t, k) {
  const m = group.helper(player.pos); if (!m) return;
  if (t && t.item === 'berry' && available(t)) { take(t); group.setCarry(m, 'berry'); }
  else if (k && k.meat > 0) { k.meat--; group.setCarry(m, 'meat'); }
  else return;
  m.busy = 2;
  const what = m.carry === 'meat' ? 'snijdt ook een lap vlees los' : 'plukt ook een handvol';
  setTimeout(() => murmur(`Kem ${what}. Hij draagt het naar de boom.`, 4), 1800);
}
// De groep zoekt zelf ook eten. Waar: een bessenstruik of een vijg niet te ver van het kamp, over droog land te bereiken.
// De laatste bessen aan een struik laten ze hangen, en ze plukken niet voor je neus weg.
function dryPath(a, b) { for (let i = 1; i < 12; i++) { const k = i / 12; if (height(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k) < 0.25) return false; } return true; }
function foodSpot() {
  const far = (t, o) => Math.hypot(t.x - o.x, t.z - o.z);
  const c = things.filter((t) => ((t.bush && t.item === 'berry' && t.bush.left > 1) || (t.item === 'fig' && t.lies && !t.gone)) && far(t, HOME) < 75 && far(t, player.pos) > 7 && dryPath(HOME, t))
    .sort((a, b) => far(a, HOME) - far(b, HOME)).slice(0, 3);
  const t = c[Math.floor(Math.random() * c.length)];
  return t ? { x: t.x, z: t.z, t } : null;
}
function groupTake(job) {
  if (job.kill) { if (job.kill.meat <= 0) return null; job.kill.meat--; return 'meat'; }
  const t = job.t; if (!available(t) || (t.bush && t.bush.left <= 1)) return null;
  take(t); return t.item;
}
// een platte steen omdraaien: hij kantelt over zijn rand en valt ondersteboven naast zijn kuil
const turning = [];
function turnTick(dt) {
  for (let i = turning.length - 1; i >= 0; i--) {
    const q = turning[i], m = q.m, r = 0.46; q.t = Math.min(1, q.t + dt / 0.9);
    const a = Math.PI * (q.t < 0.5 ? 0.9 * q.t : 0.45 + 2.2 * (q.t - 0.5) ** 2), yaw = m.rotation.y;   // traag optillen, dan valt hij
    const k = r * (Math.cos(a) - 1);
    m.position.x = q.x + Math.cos(yaw) * k; m.position.z = q.z - Math.sin(yaw) * k;
    m.position.y = height(m.position.x, m.position.z) + 0.04 + r * Math.sin(a);
    m.rotation.z = 0.04 + a;
    if (q.t >= 1) { turning.splice(i, 1); sound.thud?.(); }
  }
}
function turnStone(t) {
  if (t.gone) return;
  did.turn = true;
  t.gone = true; player.action = 0.5; sound.pick();
  turning.push({ m: t.mesh, x: t.mesh.position.x, z: t.mesh.position.z, t: 0 });
  if (t.under === 'grubs') {
    state.food = Math.min(100, state.food + 10); heal('grubs'); sound.eat();
    toast('Larven! Dikke witte larven onder de steen. Je eet ze op: knapperig en voedzaam.', 5);
    discover('grubs');
  } else if (t.under === 'scorpion') {
    hurt(6); sound.bad();
    toast('Au! Een schorpioen steekt je in je hand. Dat doet pijn, maar het zakt weer.', 5);
  } else if (FINDS[t.under]) {
    state.finds.add(t.under); sound.discover();
    const f = FINDS[t.under];
    found(f);
  }
}
// De wereld wijst de weg: waar is het dichtstbijzijnde van wat een missiestap vraagt? Wie de missie gaf wijst erheen,
// en het ding zelf schittert van verder weg. Geen pijl, geen streep op de grond.
let wanted = null;
function spotOf(kind) {
  if (wanted) wanted.wanted = false;
  wanted = null;
  const p = player.pos, pts = (l) => l.map((q) => ({ x: q[0], z: q[1] }));
  const near = (list) => { let b = null, bd = 1e9; for (const o of list) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd) { bd = d; b = o; } } return b; };
  if (['stone', 'branch', 'bone'].includes(kind)) { wanted = near(things.filter((t) => t.kind === 'pick' && t.item === kind && !t.gone)); if (wanted) wanted.wanted = true; return wanted; }
  if (kind === 'leaf') return near(things.filter((t) => t.bush && t.item === 'leaf' && t.bush.left > 0));
  if (kind === 'plant') return near([...forage.plants, ...(shore ? shore.plants : [])].filter((q) => q.left > 0));
  if (kind === 'deadwood') return fire ? near(fire.wood) : null;
  if (kind === 'smoke') return fire ? fire.S : null;
  if (kind === 'kill') return near([sabres.kill, herd.kill].filter((k) => k && k.meat > 0));
  if (kind === 'pool') return near(pts(AREA.pools || []));
  if (kind === 'herd') return near(herd.members);
  if (kind === 'outcrop') return AREA.outcrop ? { x: AREA.outcrop.at[0], z: AREA.outcrop.at[1] } : null;
  return null;
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
  take(t); carry.nextRock = t.rock || null; state.hands[h] = t.item; renderHands(); carry.nextRock = null;
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

// wat je kunt maken met wat je in hand i hebt (en wat er in je andere hand ligt)
function crafts(i) {
  const out = [], it = state.hands[i], other = state.hands[1 - i];
  if (!it) return out;
    if ((it === 'bone' && other === 'stone') || (it === 'stone' && other === 'bone')) out.push({ t: 'Kraak het bot', icon: ICON.crack, fn: () => act('Interact', crack) });
    if ((it === 'baobab' && other === 'stone') || (it === 'stone' && other === 'baobab')) out.push({ t: 'Kraak de vrucht', icon: ICON.crack, fn: () => act('Interact', crackFruit) });
    if (it === 'stone' && other === 'stone') out.push({ t: 'Sla een scherf', icon: ICON.knap, fn: () => knapStart(i) });
    if (it === 'stone' && other === 'stone' && ERA.tech && ERA.tech.includes('axe')) out.push({ t: 'Maak een vuistbijl', icon: ICON.axe, q: !state.known.has('axe'), fn: () => axeStart(i) });
    const edge = other === 'flake' || other === 'axe';
    if ((it === 'branch' && edge) || (it === 'flake' && other === 'branch')) out.push({ t: 'Schraap een punt', icon: ICON.point, fn: () => act('Interact', () => makeStick(it === 'branch' ? i : 1 - i)) });
    if (it === 'hide' && edge && !state.bag) out.push({ t: 'Maak een draagvel', icon: ICON.bag, fn: () => act('Interact', () => makeBag(i)) });
    if (it === 'hide' && edge && !state.cloak) out.push({ t: 'Sla om je schouders', icon: ICON.cloak, fn: () => act('Interact', () => wearHide(i)) });
  return out;
}
// ---------- de keuzes bij een ding: een boogje ronde knoppen erboven, elk met een teken ----------
let radial = null;
function closeRadial() { radial = null; $('radial').innerHTML = ''; }
function openRadial(target) {
  const opts = [];
  const hasStone = state.hands.includes('stone');
  if (target.more) opts.push(...target.more);
  else if (target.hand !== undefined) {
    const i = target.hand, it = state.hands[i];
    if (EDIBLE.has(it)) opts.push({ t: state.known.has(it) ? 'Eet' : 'Proef', icon: it === 'leaf' && state.known.has(it) ? ICON.wound : ICON.mouth, q: !state.known.has(it), fn: () => { state.hands[i] = null; renderHands(); eat(it); } });
    if (it === 'waterbag') opts.push({ t: 'Drink', icon: ICON.drink, fn: () => thirst.drinkBag(i) });
    if (it === 'pouch' && thirst.waterAt() === 'river') opts.push({ t: 'Vul met water', icon: ICON.fill, fn: () => act('PickUp_Table', () => thirst.fill(i), 1.4) });
    opts.push(...crafts(i));
    if (state.bag && it !== 'torch' && state.bag.includes(null)) opts.push({ t: 'Stop in je tas', icon: ICON.stow, fn: () => stow(i) });
    opts.push({ t: 'Leg neer', icon: ICON.drop, fn: () => { state.hands[i] = null; renderHands(); dropAt(it); } });
  } else if (target.kind === 'turn') {
    opts.push({ t: 'Draai om', icon: ICON.turn, fn: () => goAndDo(target, () => act('PickUp_Table', () => turnStone(target), 1.4)) });
  } else if (target.look) {
    if (target.find && !state.finds.has(target.find)) opts.push({ t: 'Bekijk', icon: ICON.eye, fn: () => lookAt(target) });
    if (['hyena', 'leopard', 'sabre', 'zebra', 'wounded', 'bird', 'snake', 'stranger', 'croc', 'gazelle'].includes(target.look) && hasStone) opts.push({ t: 'Gooi', icon: ICON.throw, fn: () => quickThrow(target.member) });
    // snijden: zonder afslag merk je vanzelf dat het niet gaat
    const flake = sharp(), cut = (fn) => () => (sharp() ? act('Interact', fn) : fn());
    if (target.look === 'carcass' && flake) opts.push({ t: 'Snijd vlees', icon: ICON.cut, fn: () => goAndDo(target, cut(cutMeat)) });
    if (target.look === 'kill' && sabres.kill && sabres.kill.meat > 0) opts.push({ t: 'Snijd vlees', icon: ICON.cut, fn: () => goAndDo(target, cut(cutKill)) });
    if (target.look === 'kill' && sabres.kill && sabres.kill.hide) opts.push({ t: 'Haal het vel eraf', icon: ICON.hide, fn: () => goAndDo(target, cut(cutHide)) });
    if (target.look === 'kill' && sabres.kill && !sabres.kill.noPouch) opts.push({ t: 'Snijd de maag eruit', icon: ICON.fill, q: !state.known.has('pouch'), fn: () => goAndDo(target, cut(() => thirst.cutPouch(sabres.kill))) });
    if (target.look === 'herdkill' && !herd.kill.noPouch) opts.push({ t: 'Snijd de maag eruit', icon: ICON.fill, q: !state.known.has('pouch'), fn: () => goAndDo(target, cut(() => thirst.cutPouch(herd.kill)), 2.2) });
    if (target.look === 'prey' && !target.enc.noPouch) opts.push({ t: 'Snijd de maag eruit', icon: ICON.fill, q: !state.known.has('pouch'), fn: () => goAndDo(target, cut(() => thirst.cutPouch(target.enc)), 2.4) });
    if (target.look === 'herdkill' && herd.kill.meat > 0) opts.push({ t: 'Snijd vlees', icon: ICON.cut, fn: () => goAndDo(target, cut(cutHerd), 2.2) });
    if (target.look === 'prey' && target.enc.meat > 0) opts.push({ t: 'Snijd vlees', icon: ICON.cut, fn: () => goAndDo(target, cut(() => enc.cutPrey(target.enc, predGame)), 2.4) });
    if (target.carcass && beast.meat > 0) opts.push({ t: 'Snijd vlees', icon: ICON.cut, fn: () => goAndDo(target, cut(() => beast.cut(predGame)), 3.2) });
    if (target.look === 'catfish') opts.push({ t: 'Grijp', icon: ICON.hand, fn: () => goAndDo(target, () => act('Interact', () => shore.grab(target, predGame)), 1.6) });
    if (target.look === 'tuberplant') opts.push({ t: 'Graaf', icon: ICON.dig, fn: () => goAndDo(target, () => act('Interact', () => digTuber(target, predGame)), 1.5) });
    if (target.fire) { const ic = fire.canUse(target, state); if (ic) opts.push({ t: fire.verb(target, state), icon: ic, fn: () => goAndDo(target, () => act('Interact', () => fire.use(target, predGame), target.fire === 'wood' ? 1.3 : 1.6), 2.4) }); }
    if (target.look === 'bees' && target.enc.honey > 0) opts.push({ t: 'Pak honing', icon: ICON.hand, fn: () => goAndDo(target, () => act('Interact', () => enc.takeHoney(target.enc, predGame)), 2.6) });
  } else {
    opts.push({ t: 'Pak', icon: ICON.hand, fn: () => goAndDo(target, () => grab(target)) });
    if (EDIBLE.has(target.item)) opts.push({ t: state.known.has(target.item) ? 'Eet' : 'Proef', icon: ICON.mouth, q: !state.known.has(target.item), fn: () => goAndDo(target, () => tasteFrom(target)) });
  }
  radial = { target, buttons: [] };
  $('radial').innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button');
    b.className = 'rb'; b.innerHTML = o.icon || ICON.hand; b.setAttribute('aria-label', o.t); if (o.q) b.classList.add('new');
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.onclick = (e) => { e.stopPropagation(); closeRadial(); o.fn(); };
    $('radial').appendChild(b); radial.buttons.push(b);
  }
  placeRadial();
}
const v3 = new THREE.Vector3();
function anchorOf(target) {
  if (target.more) { const r = $('alt2').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - 10, up: true }; }
  if (target.hand !== undefined) { const r = $('hand' + target.hand).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - 10, up: true }; }
  const p = targetPos(target); v3.set(p.x, p.y, p.z).project(camera);
  if (v3.z > 1) return null;
  return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight };
}
function placeRadial() {
  if (!radial) return;
  const tg = radial.target, a = anchorOf(tg);
  if (!a || (tg.item && !available(tg)) || (tg.hand !== undefined && !state.hands[tg.hand])) { closeRadial(); return; }
  // een boog boven het ding, van links naar rechts; bij meer knoppen wordt de boog ruimer, zodat ze elkaar niet raken
  const n = radial.buttons.length, step = n > 1 ? Math.min(0.7, 2.8 / (n - 1)) : 0, R = n > 1 ? Math.max(78, 32 / Math.sin(step / 2)) : 0;
  const span = (n - 1) * step, low = R * Math.cos(span / 2);
  const cx = Math.max(R * Math.sin(span / 2) + 34, Math.min(innerWidth - R * Math.sin(span / 2) - 34, a.x));
  const cy = Math.max(R + 34, (a.up ? a.y - 26 : a.y - 58) + low);
  radial.buttons.forEach((b, k) => { const g = -span / 2 + k * step; b.style.left = (cx + R * Math.sin(g)) + 'px'; b.style.top = (cy - R * Math.cos(g)) + 'px'; });
}

// iets neerleggen: een kei of bot komt weer in de wereld te liggen; eten laat je gewoon vallen
function dropAt(it, rock = carry.lastRock) {
  if (it === 'torch') { sound.hiss(0.4); toast('De tak valt in het zand en dooft.', 4); return; }
  const t = dropAtPos(it, player.pos.x + Math.sin(player.yaw) * 0.6, player.pos.z + Math.cos(player.yaw) * 0.6, false, rock);
  if (t) t.byPlayer = true;
}
function dropAtPos(it, x, z, thrown = false, rock = null) {
  if (!['stone', 'bone', 'flake', 'meat', 'egg', 'honey', 'hide', 'berry', 'branch', 'stick', 'tuber', 'fish', 'axe', 'roast', 'pouch', 'waterbag', 'fig', 'baobab'].includes(it)) return null;
  if (it === 'stone' && !rock) rock = { type: 'lava', hits: 0 };
  const m = heldMesh(it, rock); m.position.set(x, height(x, z) + 0.08, z); if (it === 'bone' || it === 'branch' || it === 'stick') m.rotation.set(0, 0, Math.PI / 2);
  m.traverse((o) => { o.castShadow = true; }); scene.add(m);
  const t = { kind: 'pick', item: it, x, z, mesh: m, noAuto: !thrown, rock };
  things.push(t); glints.add(scene, t);
  return t;
}
function removeThing(t) { t.gone = true; scene.remove(t.mesh); }
// pijn die niet van een roofdier komt: een steek, een pik, een steen
// Na een treffer ben je drie tellen niet te raken: tijd om weg te komen, en nooit twee beten achter elkaar.
let guard = 0, sinceHit = 99;
function hurt(dmg) { if (state.collapsed > 0 || state.sleeping > 0 || guard > 0) return; guard = 3; sinceHit = 0; state.health -= dmg; hurtFlash(); sound.bite(); }

// ---------- gevaar ----------
function hurtFlash() { const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = 1; void h.offsetWidth; h.style.transition = 'opacity .9s'; h.style.opacity = 0; cam.shake = 0.5; }
// een roofdier bijt: gezondheid omlaag; een hyena pakt je bot af, een luipaard laat je alles vallen
function bite(attacker, dmg, big) {
  if (state.collapsed > 0 || state.sleeping > 0 || guard > 0) return null;
  guard = 3; sinceHit = 0;
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
    else if (attacker.kind === 'croc') toast('De krokodil schiet uit het water en klapt zijn kaken om je been! Je rukt je los. Weg van het water!', 6);
    else if (attacker.hitText) toast(attacker.hitText, 6);
    else toast('Het luipaard springt je vanuit het niets aan! Je laat alles vallen.', 5);
  } else toast('Au! De hyena bijt je in je been.', 3);
  return stolen;
}
// een steen gooien naar een roofdier
function throwAt(member, kind = member.kind, dur) {
  const i = state.hands[1] === 'stone' ? 1 : state.hands.indexOf('stone');
  if (i < 0) { need('stone', 'Geen kei'); return; }
  const rock = state.rock[i];
  state.hands[i] = null; renderHands();
  sound.whoosh();
  const from = player.toss ? player.handPos() : player.pos.clone().setY(player.pos.y + 1.3);
  throws.throw(from, member, (x, z) => {
    sound.thud();
    if (member.free) {
      // zomaar een worp: raakt hij toevallig iets, dan telt dat ook
      const hit = bestTargetAt(x, z, 1.8);
      if (hit) hitTarget(hit);
    } else if (Math.hypot(member.x - x, member.z - z) < 1.8) hitTarget({ m: member, kind: kind || 'gazelle' });
    else note('throw', 'Mis');
    scareBirds(x, z);
    dropAtPos('stone', x, z, true, rock);
  }, heldMesh('stone', rock), dur);
}
// ---------- mikken en gooien ----------
// Houd de vuist vast: je haalt uit en een ring laat zien waar de kei neerkomt. Schuif opzij om te richten en omhoog of omlaag
// voor harder of zachter; loslaten is gooien. Een korte tik gooit meteen naar wat voor je staat, maar minder zuiver.
const RANGE = [4, 26];
const aimRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.22, 36), new THREE.MeshBasicMaterial({ color: 0xf4f2ec, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }));
aimRing.rotation.x = -Math.PI / 2; aimRing.visible = false; aimRing.renderOrder = 3; scene.add(aimRing);
const aimArc = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3)), new THREE.LineBasicMaterial({ color: 0xf4f2ec, transparent: true, opacity: 0.8, depthTest: false }));
aimArc.frustumCulled = false; aimArc.visible = false; scene.add(aimArc);
let aim = null;
const clampRange = (d) => Math.max(RANGE[0], Math.min(RANGE[1], d));
const flight = (d) => d / (11 + 13 * (d - RANGE[0]) / (RANGE[1] - RANGE[0]));   // hoe verder, hoe harder en vlakker de worp
// hoe snel een dier beweegt, om een rennend doel een stukje voor te kunnen gooien
const seenAt = new WeakMap();
function trackTargets(dt) {
  for (const t of targets()) {
    const o = seenAt.get(t.m);
    if (o) { o.vx = (t.m.x - o.x) / dt; o.vz = (t.m.z - o.z) / dt; o.x = t.m.x; o.z = t.m.z; } else seenAt.set(t.m, { x: t.m.x, z: t.m.z, vx: 0, vz: 0 });
  }
}
function aimStart(src, m) {
  if (aim || player.toss || player.once || !state.hands.includes('stone')) return false;
  if (state.hands[1] !== 'stone') { state.hands.reverse(); state.rock.reverse(); renderHands(); }   // gooien doe je met rechts
  if (!m) { const t = bestTarget(RANGE[1]); m = t && t.m; }
  let yaw = cam.yaw, dist = 12;
  if (m) {
    let v = seenAt.get(m); if (!v || Math.hypot(v.vx, v.vz) > 14) v = { vx: 0, vz: 0 };
    const T = flight(clampRange(Math.hypot(m.x - player.pos.x, m.z - player.pos.z))) + 0.3;
    const x = m.x + v.vx * T - player.pos.x, z = m.z + v.vz * T - player.pos.z;
    yaw = Math.atan2(x, z); dist = clampRange(Math.hypot(x, z));
  }
  aim = { yaw, dist, t0: performance.now(), moved: 0, src, cam: cam.yaw };
  player.windUp();
  return true;
}
function aimMove(dx, dy) {
  if (!aim) return;
  aim.moved += Math.abs(dx) + Math.abs(dy);
  aim.yaw -= dx * 0.005; aim.dist = clampRange(aim.dist - dy * 0.07);
}
function aimTick(dt) {
  if (aim && (!state.hands.includes('stone') || player.once || state.collapsed > 0 || state.sleeping > 0)) { aim = null; player.cancelToss(); }
  aimRing.visible = aimArc.visible = !!aim && (performance.now() - aim.t0 > 200 || aim.moved > 12);
  if (!aim) return;
  // met de toetsen mik je door rond te kijken; op een aanraakscherm draait de camera rustig mee met waar je mikt
  if (aim.src === 'key') { aim.yaw += cam.yaw - aim.cam; aim.cam = cam.yaw; }
  else cam.yaw += Math.atan2(Math.sin(aim.yaw - cam.yaw), Math.cos(aim.yaw - cam.yaw)) * Math.min(1, dt * 2.5);
  player.yaw = aim.yaw;
  const P = player.pos, x = P.x + Math.sin(aim.yaw) * aim.dist, z = P.z + Math.cos(aim.yaw) * aim.dist, y = height(x, z);
  aimRing.position.set(x, y + 0.07, z);
  const T = flight(aim.dist), arc = Math.max(0.2, 12 * T * T / 8), a = aimArc.geometry.attributes.position, y0 = P.y + 1.6;
  for (let i = 0; i < 24; i++) { const k = i / 23; a.setXYZ(i, P.x + (x - P.x) * k, y0 + (y + 0.15 - y0) * k + 4 * k * (1 - k) * arc, P.z + (z - P.z) * k); }
  a.needsUpdate = true;
}
function aimRelease(cancel) {
  if (!aim) return;
  const a = aim; aim = null;
  if (cancel) { player.cancelToss(); return; }
  did.throw = true;
  const quick = performance.now() - a.t0 < 280 && a.moved < 12;
  const spread = window.__sure ? 0 : (quick ? 0.1 : 0.025) * a.dist, ra = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * spread;
  const to = { free: true, x: player.pos.x + Math.sin(a.yaw) * a.dist + Math.cos(ra) * rr, z: player.pos.z + Math.cos(a.yaw) * a.dist + Math.sin(ra) * rr };
  player.yaw = a.yaw;
  player.letFly(() => throwAt(to, null, flight(a.dist)));
}
// meteen gooien, zonder mikken: naar dit dier, of anders naar wat voor je staat
function quickThrow(m) { if (aimStart('tap', m)) aimRelease(); }
// wat er in de wereld gebeurt rond de jacht van de sabeltandkatten
function event(name, k) {
  // iemand uit de groep komt terug met wat hij zelf vond, of met vlees van het dier waar jij sneed
  if (name === 'gift') {
    state.group = Math.min(100, state.group + (k === 'meat' ? 30 : k === 'fig' ? 3 : 2.5));
    if (k === 'meat') { predGame.campMeat = 120; state.brought.meat = (state.brought.meat || 0) + 1; if (Math.hypot(HOME.x - player.pos.x, HOME.z - player.pos.z) < 25) sound.good(); }
    return;
  }
  if (name === 'kemgift') {
    state.group = Math.min(100, state.group + (k === 'meat' ? 30 : 8)); state.brought[k] = (state.brought[k] || 0) + 1; if (k === 'meat') predGame.campMeat = 120;
    murmur(k === 'meat' ? 'Kem legt zijn lap vlees bij de boom. Ibo zit er al naast.' : 'Kem deelt zijn bessen uit bij de boom.', 4); sound.good();
    return;
  }
  const far = k ? Math.hypot(k.x - player.pos.x, k.z - player.pos.z) : 0;
  if (name === 'hunt') { sound.sting(); murmur(far < 60 ? 'De zebra\'s stuiven uit elkaar. Iets jaagt op ze!' : 'In de verte stuiven zebra\'s weg in een stofwolk. Iets jaagt daar…', 5, 'hide'); }
  if (name === 'kill') {
    vultures.center.set(k.x, height(k.x, k.z), k.z); vultures.source = k; LOOK_TARGETS.push({ look: 'kill', x: k.x, z: k.z, kill: k }); killLook(k);
    setTimeout(() => murmur('De gieren draaien al boven een nieuwe plek. Daar ligt vers vlees. Maar van wie is het nu nog?', 6, 'hide'), 9000);
  }
  if (name === 'open') {
    for (const [dx, dz] of [[1.6, 0.9], [-1.2, 1.5]]) dropAtPos('bone', k.x + dx, k.z + dz, true);
    if (far < 90) murmur('De sabeltandkatten zijn verzadigd en sjokken weg. Nu is het vlees van wie het eerst komt.', 6, 'hide');
  }
  if (name === 'hyenas') { hyenas.home = k; sound.whoop(); if (far < 70) murmur('Gegiechel in de verte: de hyena\'s hebben het vlees geroken.', 5, 'hide'); }
  if (name === 'gone' && far < 40) murmur('De hyena\'s hebben het laatste vlees verslonden.', 4, 'hide');
  if (name === 'cleared') {
    hyenas.home = CARCASS; vultures.source = null; vultures.center.set(CARCASS.x, height(CARCASS.x, CARCASS.z), CARCASS.z);
    const i = LOOK_TARGETS.findIndex((t) => t.look === 'kill'); if (i >= 0) LOOK_TARGETS.splice(i, 1);
    killLook(null);
  }
  if (name === 'home') {
    sound.home();
    const loot = state.hands.some((h) => GIVE.includes(h) && h !== 'leaf');
    murmur(loot ? 'Kleine Ibo rent je tegemoet: hij heeft gezien dat je iets bij je hebt!' : 'Kleine Ibo rent je tegemoet. Je bent weer bij de groep.', 4);
  }
}
const predGame = { camp: HOME, campSafe: 11, campMeat: 0, lit: false, player, state, sound, toast, need, murmur, carries, discover, bite, event, hyenas, night: 0, things, throws, group, leopard, sabres, carcass: CARCASS, drop: dropAtPos, removeThing, giveHand, renderHands, hurt, kemHelps, foodSpot, groupTake, dryPath, shield: false, quake: (v) => { cam.shake = Math.max(cam.shake, v); } };

// ---------- wat kun je aantikken? ----------
const LOOK_TARGETS = [{ look: 'carcass', x: CARCASS.x, z: CARCASS.z }, { look: 'tree', x: HOME.x, z: HOME.z }];
if (AREA.outcrop) LOOK_TARGETS.push({ look: 'outcrop', x: AREA.outcrop.at[0], z: AREA.outcrop.at[1], high: height(...AREA.outcrop.at) + 1.6 });
Object.assign(LOOKS, AREA.looks);
function targetPos(t) {
  if (t.member && t.member.g) return { x: t.member.x, y: t.member.g.position.y + 0.8, z: t.member.z };
  if (t.member) return { x: t.member.x, y: height(t.member.x, t.member.z) + 1, z: t.member.z };
  if (t.high) return { x: t.x, y: t.high, z: t.z };
  return { x: t.x, y: height(t.x, t.z) + (t.bush ? 0.7 : t.look ? 0.4 : 0.2), z: t.z };
}
const lastTap = { t: null, at: 0 };
// geeft terug of de tik ergens over ging (een ding, een dier, of een open keuze die dichtgaat)
function tapAt(sx, sy, reach = 56) {
  const wasOpen = !!radial;
  const cands = [...things.filter(available), ...LOOK_TARGETS, ...herd.members.map((m) => ({ look: 'gazelle', member: m })),
    ...hyenas.list.map((h) => ({ look: 'hyena', member: h })), { look: 'leopard', member: leopard },
    ...zebras.alive.map((m) => ({ look: 'zebra', member: m })), ...sabres.list.map((m) => ({ look: 'sabre', member: m })), ...group.list.map((m) => ({ look: m.id, member: m })), ...enc.lookTargets(), ...beast.lookTargets(player.pos), ...(shore ? shore.lookTargets() : []), ...forage.lookTargets(), ...(fire ? fire.lookTargets() : [])];
  let best = null, bd = reach;
  for (const c of cands) {
    const p = targetPos(c);
    if (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) > (c.look ? 90 : 35)) continue;
    v3.set(p.x, p.y, p.z).project(camera); if (v3.z > 1) continue;
    const d = Math.hypot((v3.x + 1) / 2 * innerWidth - sx, (1 - v3.y) / 2 * innerHeight - sy);
    if (d < bd || (reach > 50 && d < 150 && !best && (c.carcass || ['kill', 'prey', 'carcass', 'herdkill'].includes(c.look)) && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 5)) { bd = Math.min(bd, d); best = c; }
  }
  // dubbeltik op een platte steen: meteen omdraaien
  const now = performance.now();
  if (best && best.kind === 'turn' && lastTap.t === best && now - lastTap.at < 500) {
    closeRadial(); lastTap.t = null; goAndDo(best, () => act('PickUp_Table', () => turnStone(best), 1.4)); return true;
  }
  lastTap.t = best; lastTap.at = now; if (best) did.tap = true;
  if (best && best.member && best.member.kind === 'member' && best.member.id === 'tor' && mission.over && NEXT) { closeRadial(); sound.pick(); goAndDo(best.member, endCard, 3.2); return true; }
  if (best && best.member && best.member.kind === 'member' && offerOf(best.member) && best.member.calling) { closeRadial(); sound.pick(); const g = best.member; goAndDo(g, () => accept(g), 3.2); return true; }
  if (best) { openRadial(best); sound.pick(); } else closeRadial();
  return !!best || wasOpen;
}
// Een tik met je vinger is op elke plek steeds hetzelfde. Rechts (voorbij 60% van het beeld) is je lijf: je springt, altijd,
// ook als daar iets ligt. In het midden spring je ook, tenzij je precies op een ding tikt. Links tik je dingen aan.
// Niet op een knop of hand (een duim die er net naast komt bedoelt de knop), niet tijdens het mikken, niet met de muis.
const JUMP_ZONE = 0.6, MID_ZONE = 0.45;
function bodyTap(x, y) {
  if (!state.started || aim || menu.open || x < innerWidth * MID_ZONE) return false;
  for (const el of document.querySelectorAll('#pad .rb.show, #pad .hand, #bagBtn, #swap, #menuBtn')) {
    const r = el.getBoundingClientRect();
    if (r.width && x > r.left - 14 && x < r.right + 14 && y > r.top - 14 && y < r.bottom + 14) return false;
  }
  return true;
}
function fingerTap(x, y) {
  if (!bodyTap(x, y)) { if (x < innerWidth * MID_ZONE) tapAt(x, y); return; }   // vlak naast een knop: niets, ook geen keuzes
  if (radial) { closeRadial(); return; }   // open keuzes: de tik sluit ze
  if (x >= innerWidth * JUMP_ZONE || !tapAt(x, y, 34)) jump();
}

const clock = { elapsedTime: 0, last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } };
// ---------- besturing ----------
// Toetsen, stuurduim, kijkvinger en camera zitten in engine/controls.js; hier staat alleen wat een toets in het spel betekent.
const C = initControls({ canvas: renderer.domElement, camera, clock, player, tap: (x, y, by) => { if (by && by.touch) fingerTap(x, y); else tapAt(x, y); },
  // kort omlaag vegen met je stuurduim: bukken; omhoog: weer opstaan
  swipe: (d) => { if (state.started && !menu.open) setSneak(d === 'down'); }, wheel: (dy) => { if (!aim) return false; aim.dist = clampRange(aim.dist - dy * 0.012); aim.moved = 99; return true; } });
const { keys, cam } = C;
addEventListener('keydown', (e) => {
  if (e.repeat || menu.open) return;
  if (e.code === 'KeyC') setSneak(!player.sneaking);
  if (e.code === 'KeyE' || e.code === 'KeyF') { if (!(ctx && ctx.mode === 'throw' && aimStart('key'))) doAction(); }
  if (e.code === 'Space') jump();
  if (e.code === 'KeyQ') setSense(true);
  if (e.code === 'Escape') { closeCard(); closeRadial(); }
});
addEventListener('keyup', (e) => { if (e.code === 'KeyQ') setSense(false); if (e.code === 'KeyE' || e.code === 'KeyF') aimRelease(); });

let coverTold = false;
function setSneak(on) { player.sneaking = on; }
// springen uit een bukhouding: eerst sta je op
function jump() { if (player.sneaking) setSneak(false); player.jumpReq = true; did.jump = true; }
// de grote knop: tikken is doen; met een kei in je hand is vasthouden mikken en loslaten gooien
const aimPtr = { id: null, x: 0, y: 0 };
$('doBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!prim) return;
  if (prim.mode === 'stand') prim.run();
  else if (prim.mode === 'throw' && aimStart('touch')) { Object.assign(aimPtr, { id: e.pointerId, x: e.clientX, y: e.clientY }); $('doBtn').setPointerCapture(e.pointerId); }
  else doAction();
});
$('doBtn').addEventListener('pointermove', (e) => { if (e.pointerId !== aimPtr.id) return; aimMove(e.clientX - aimPtr.x, e.clientY - aimPtr.y); aimPtr.x = e.clientX; aimPtr.y = e.clientY; });
for (const ev of ['pointerup', 'pointercancel']) $('doBtn').addEventListener(ev, (e) => { if (e.pointerId !== aimPtr.id) return; aimPtr.id = null; aimRelease(ev === 'pointercancel'); });
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
    if (a) {
      // niet over de knoppen rechtsonder heen: dan schuift het ruilknopje erboven
      const pad = $('pad').getBoundingClientRect(), arc = $('act').getBoundingClientRect(); let y = a.y - 52;
      if (a.x + 30 > pad.left && y + 30 > pad.top) y = pad.top - 36;
      if (a.x + 30 > arc.left - 80 && y + 30 > arc.top - 84) y = arc.top - 116;
      sw.style.display = 'block'; sw.style.left = a.x + 'px'; sw.style.top = y + 'px';
    } else sw.style.display = 'none';
  } else { sw.style.display = 'none'; swapTarget = null; }
}
$('swap').innerHTML = ICON.swap;
$('swap').addEventListener('pointerdown', (e) => e.stopPropagation());
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
  for (const b of groundBirds()) list.push({ m: b, kind: 'vulture', threat: false });
  if (shore) list.push(...shore.targets());
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
  else if (shore && shore.owns(t.kind)) shore.hit(t, how, predGame);
  else if (t.kind === 'hyena') hyenas.hit(t.m, predGame);
  else if (t.kind === 'leopard') leopard.hit(predGame);
  else if (t.kind === 'vulture') t.m.flock.hit(t.m);
  else if (t.kind === 'sabre') sabres.hit(t.m, predGame);
  else if (t.kind === 'zebra') { if (zebras.alarm <= 0) { zebras.scare(player.pos, 8); sound.flee(); sound.bray(); toast('Raak! De zebra\'s galopperen weg. Zo vang je er nooit een.'); } }
  else if (t.m === herd.spent) strikeSpent(t.m, how);
  else if (herd.fleeing <= 0) { herd.fleeing = 7; sound.flee(); toast(herd.persist ? 'Raak! De gazellen stuiven weg. Erachteraan!' : `Raak! Maar de ${HERD_NAME} zijn veel sneller dan jij.`); }
}
// de gazelle die je moe hebt gelopen: één harde klap
function strikeSpent(m, how) {
  if (how === 'fist') { need('stone', 'Met je vuist lukt het niet. Je hebt een kei of je vuistbijl nodig.'); return; }
  if (!herd.strike(m)) return;
  const k = herd.kill;
  LOOK_TARGETS.push({ look: 'herdkill', x: k.x, z: k.z }); vultures.center.set(k.x, height(k.x, k.z), k.z); vultures.source = k;
  sound.sting(); setTimeout(() => sound.good(), 900);
  toast('Eén klap en het is voorbij. Je hebt een gazelle gevangen, alleen met je benen en je adem.', 8);
  state.group = Math.min(100, state.group + 10);
  discover('run');
}
// vlees van de gazelle snijden
function cutHerd() {
  const k = herd.kill; if (!k || k.meat <= 0) return;
  if (!sharp()) { need('flake', 'Met je handen krijg je de taaie huid niet open. Je hebt iets scherps nodig.'); return; }
  const h = freeHand();
  if (h < 0) { handsFull(); return; }
  k.meat--; state.hands[h] = 'meat'; renderHands(); sound.eat();
  toast(k.meat > 0 ? 'Je snijdt een lap vlees los. Er zit nog meer aan.' : 'Je snijdt de laatste lap vlees los.', 5);
  discover('cut'); discover('runcut');
  group.fetch(k, predGame);
}
// slaan: met een steen of bot in je hand een harde klap, anders met je vuist
function strike() {
  const armed = state.hands.some((h) => h === 'stone' || h === 'bone' || h === 'stick' || h === 'axe');
  player.playOnce(armed ? 'Sword_Attack' : 'Punch_Cross', { speed: armed ? 1.5 : 1.3, at: armed ? 0.42 : 0.4, slow: 0.25, onAt: () => {
    sound.whoosh();
    const t = bestTarget(2.6);
    if (t) { sound.thud(); hitTarget(t, armed ? 'stone' : 'fist'); }
  } });
}
function useTarget() {
  let best = null, bd = 1.8;
  for (const t of things) if (t.kind === 'turn' && available(t)) { const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z); if (d < bd) { bd = d; best = t; } }
  return best;
}
// een dood dier waar je naast staat en waar nog iets af te snijden valt
function carcassNear() {
  const P = player.pos, near = (t, r) => Math.hypot(t.x - P.x, t.z - P.z) < r, cut = (fn) => () => (sharp() ? act('Interact', fn) : fn());
  const k = sabres.kill;
  if (k && near(k, 3.2) && (k.meat > 0 || k.hide || !k.noPouch)) return { run: cut(k.meat > 0 ? cutKill : k.hide ? cutHide : () => thirst.cutPouch(k)) };
  if (herd.kill && herd.kill.meat > 0 && near(herd.kill, 3)) return { run: cut(cutHerd) };
  const prey = enc.lookTargets().find((t) => t.look === 'prey' && t.enc.meat > 0 && near(t, 3));
  if (prey) return { run: cut(() => enc.cutPrey(prey.enc, predGame)) };
  const gd = beast.lookTargets(player.pos).find((t) => t.carcass && beast.meat > 0 && near(t, 5));
  if (gd) return { run: cut(() => beast.cut(predGame)) };
  if (state.carcassMeat > 0 && sharp() && near(CARCASS, 3)) return { run: cut(cutMeat) };
  return null;
}
function hiveNear(r) {
  return enc.lookTargets().find((t) => t.look === 'bees' && t.enc.honey > 0 && Math.hypot(t.x - player.pos.x, t.z - player.pos.z) < r);
}
// Alles wat je hier en nu kunt doen, het meest voor de hand liggende eerst. Het eerste komt op de grote knop,
// de rest in een boogje erboven. Slaan zonder dat er iets te raken valt ('idle') krijgt geen knop.
function actionOptions() {
  const out = [];
  if (state.collapsed > 0 || state.sleeping > 0) return out;
  const H = state.hands, stone = H.includes('stone');
  const t = bestTarget();
  if (t && t.d < 2.6) out.push({ mode: 'strike', danger: true, run: strike });
  const prey = t && !t.threat && !['hyena', 'leopard'].includes(t.kind);
  if (t && stone && (!prey || t.d < 14)) out.push({ mode: 'throw', danger: !prey, run: () => quickThrow(t.m) });
  // naast een dood dier: snijden (eerst het vlees, dan de huid)
  const body = carcassNear();
  if (body) out.push({ mode: 'cut', run: body.run });
  // naast een bijennest: graaien naar de honing
  const hive = hiveNear(3.6);
  if (hive && H.includes(null)) out.push({ mode: 'take', run: () => goAndDo(hive, () => act('Interact', () => enc.takeHoney(hive.enc, predGame)), 2.6) });
  // aan de oever: graven met de stok, of een vis grijpen
  const sh = (shore && shore.action(predGame)) || forage.action(predGame);
  if (sh) out.push(sh);
  // aan het water: drinken, of de waterzak vullen
  const dr = thirst.option();
  if (dr) out.push(dr);
  // bij het vuur of een dode boom: aansteken, hout erop, braden, hakken
  const fa = fire && fire.action(predGame);
  if (fa) out.push(fa);
  // met een kei in je hand en niets om te raken: gooien
  if (stone && !out.some((o) => o.mode === 'throw')) out.push({ mode: 'throw', run: () => quickThrow() });
  // wat je met je twee handen kunt maken
  const seen = new Set();
  for (const i of [1, 0]) for (const c of crafts(i)) if (!seen.has(c.t)) { seen.add(c.t); out.push({ mode: 'craft', word: c.t, icon: c.icon, run: c.fn }); }
  // en anders: slaan
  if (!out.some((o) => o.mode === 'strike')) out.push({ mode: 'strike', idle: !t || t.d > 6, run: strike });
  return out;
}
let options = [];
function actionContext() { return actionOptions()[0] || null; }
// ---------- bij de groep gaat het vanzelf ----------
// Kom je met eten de kring in, dan nemen ze het van je over. Stenen en afslagen houd je zelf.
// Alleen echt in de kring (de dichtste bessenstruik staat op tien meter van de boom: daar pluk je voor jezelf).
const GIVE_R = 5;
let giveT = 0, stillT = 0, senseK = 0, lastLook = [0, 0];
function handOver() {
  return GIVE.find((x) => state.hands.includes(x) && !(x === 'meat' && fire && fire.lit) && !(x === 'leaf' && !group.sick) && !(x === 'redberry' && state.known.has('redberry')));
}
function atHome(dt) {
  if (!state.started || state.sleeping > 0 || state.collapsed > 0) return;
  const dHome = Math.hypot(player.pos.x - HOME.x, player.pos.z - HOME.z);
  giveT -= dt;
  if (dHome < GIVE_R && giveT <= 0 && !player.once && !state.lost) {
    const it = handOver();
    if (it) { giveT = 3.5; act('Interact', () => give(it)); return; }
  }
  // 's nachts stil bij de anderen staan: je kruipt erbij en slaapt
  if (dHome < 9 && predGame.night > 0.5 && stillT > 4 && giveT <= 0) sleep();
}
const bodySignals = initBody(G);
let ctx = null, btnMode = '';
// drukt je terwijl hij nog bezig is (bijv. bukken), dan volgt de actie zodra hij klaar is
let pendingAction = 0;
function doAction() { if (player.once) { pendingAction = 1.2; return; } if (ctx) ctx.run(); }
// De knoppen rechts: de grote knop is wat nu het meest voor de hand ligt, de kleinere eromheen zijn wat er nog meer kan.
// Een knop is er alleen als er iets te doen valt. Past het niet in drie, dan zit de rest achter de laatste (drie stippen).
const DO_LONG = { strike: 'Sla', throw: 'Gooi je kei', cut: 'Snijd', take: 'Pak', dig: 'Graaf', drink: 'Drink', fill: 'Vul met water', fire: 'Vuur', build: 'Leg neer', chop: 'Hak', stand: 'Sta op' };
const DO_ICON = { strike: ICON.strike, throw: ICON.throw, cut: ICON.cut, take: ICON.hand, dig: ICON.dig, drink: ICON.drink, fill: ICON.fill, fire: ICON.fire, build: ICON.drop, chop: ICON.chop, stand: ICON.stand };
const STAND = { mode: 'stand', run: () => setSneak(false) };
const nameOf = (o) => o.word || DO_LONG[o.mode], iconOf = (o) => o.icon || DO_ICON[o.mode];
let prim = null; const alts = [null, null, null];
function showBtn(el, o) {
  el.classList.toggle('show', !!o);
  const key = o ? o.mode + (o.word || '') : '';
  if (!o || el.dataset.key === key) return;
  el.dataset.key = key; el.dataset.mode = o.mode; el.innerHTML = o.more ? ICON.menu : iconOf(o); el.setAttribute('aria-label', o.more ? 'Meer' : nameOf(o));
}
[0, 1, 2].forEach((k) => {
  $('alt' + k).onclick = () => {
    const o = alts[k]; if (!o) return;
    if (o.more) { if (radial && radial.target.more) closeRadial(); else openRadial({ more: o.more.map((m) => ({ t: nameOf(m), icon: iconOf(m), fn: m.run })) }); }
    else if (o.mode === 'stand' || !player.once) o.run();
  };
});
function updateAction() {
  options = actionOptions(); ctx = options[0] || null;
  const shown = options.filter((o, k) => !(o.mode === 'strike' && (o.idle || (k > 0 && !o.danger))));
  if (player.sneaking && state.started && state.collapsed <= 0 && state.sleeping <= 0) shown.push(STAND);
  prim = shown[0] || null;
  const rest = shown.slice(1);
  if (rest.length > 3) rest.splice(2, rest.length, { mode: 'more', more: rest.slice(2) });
  for (const k of [0, 1, 2]) { alts[k] = rest[k] || null; showBtn($('alt' + k), alts[k]); }
  if (!alts[2] && radial && radial.target.more) closeRadial();
  showBtn($('doBtn'), prim);
  const mode = prim ? (prim.danger ? '!' : '') + (prim.ready ? '+' : '') : '';
  if (mode !== btnMode) {
    btnMode = mode;
    $('doBtn').classList.toggle('danger', !!(prim && prim.danger));
    $('doBtn').classList.toggle('ready', !!(prim && prim.ready));
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
    else if (!herd.persist || herd.heat < 0.2) toast(`De ${HERD_NAME} zien je en vluchten!`);
  },
  // is het heet genoeg om een dier moe te lopen? Alleen als de zon hoog staat
  hot: () => dayP > 0.25 && dayP < 0.62,
  tired(k) {
    if (k < 0) toast('Het is nu koel. Zo worden de gazellen niet moe. Kom terug als de zon hoog staat.', 6);
    else if (k === 0) toast('Ze rennen minder ver dan net. Hun flanken gaan snel op en neer. Erachteraan!', 5);
    else toast('Eén gazelle blijft achter. Haar tong hangt uit haar bek. Niet stoppen nu!', 5);
  },
  spent(down) {
    if (down) { sound.good(); toast('Ze staat stil. Haar poten trillen. Ze kan niet meer. Sla toe, voor ze weer op adem is!', 7); discover('spent'); }
    else toast('De gazelle is op adem gekomen en rent weg. Je was er bijna.', 5);
  },
};

// ---------- hoofdlus ----------
// eigen klok: tijd in seconden sinds de start
const dir = new THREE.Vector3();
let deepTold = false;
let weary = 0, pantT = 0, breath = 100, winded = false;
let hintStage = 0, sneakNear = 0, playTime = 0, dayP = 0.12, lastPart = '', stepPhase = 0, danger = 0, groupWarn = 0, chased = false;

function partOfDay(p) { return p < 0.06 ? 'dawn' : p < 0.7 ? 'day' : p < 0.8 ? 'evening' : p < 0.97 ? 'night' : 'dawn'; }
function nightAmount(p) { return p < 0.72 ? (p < 0.04 ? 1 - p / 0.04 : 0) : p < 0.82 ? (p - 0.72) / 0.1 : p < 0.97 ? 1 : 1 - (p - 0.97) / 0.03; }

function update(dt) {
  const t = clock.elapsedTime;
  // invoer → looprichting ten opzichte van de camera
  let [ix, iy, mag] = C.stick();
  // bij gevaar ren je vanzelf voluit, ook als je de duim maar half duwt
  if (danger > 0.6 && mag > 0.3 && !player.sneaking) { const k = 1 / mag; ix *= k; iy *= k; mag = 1; }
  if (state.collapsed > 0 || state.sleeping > 0) mag = 0;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
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
  // rondkijken telt ook als bezig: alleen wie echt stil is, merkt meer op
  const looking = Math.abs(cam.yaw - lastLook[0]) + Math.abs(cam.pitch - lastLook[1]) > 1e-4; lastLook = [cam.yaw, cam.pitch];
  senseK += ((state.sensing ? 1 : 0) - senseK) * Math.min(1, dt * (state.sensing ? 0.7 : 3));
  const busy = mag > 0.05 || looking || aim || walkTo || player.once || !player.onGround || !state.started || state.collapsed > 0 || state.sleeping > 0;
  if (busy) { stillT = 0; if (!keys.has('KeyQ') && !window.__holdSense) setSense(false); }
  else { stillT += dt; if (stillT > 3.5) setSense(true); }

  const sick = state.sick > 0;
  // Adem: lopen en draven kun je de hele dag, alleen voluit rennen kost adem. Is die op, dan draaf je even tot je weer kunt.
  // Honger en dorst maken je niet traag.
  const sprinting = state.started && player.speed > 4.3;
  breath = Math.max(0, Math.min(100, breath + dt * (sprinting ? -100 / 28 : player.speed > 2.8 ? 100 / 12 : 100 / 6)));
  if (breath <= 0) winded = true; else if (breath > 45) winded = false;
  weary += ((winded ? 0.42 : 0) - weary) * Math.min(1, dt * 2);
  player.update(dt, dir, { speed: sick ? 0.6 : 1 - weary * 0.3, sick, weary }); cloakTick();
  if (weary > 0.25 && state.collapsed <= 0 && state.sleeping <= 0 && (pantT -= dt * (1 + player.speed * 0.3)) <= 0) { pantT = 1.9 - weary * 0.6; sound.pant(0.5 + weary * 0.5); }
  if (player.tooDeep) { player.tooDeep = false; if (!deepTold) { deepTold = true; note('water', 'Te diep', 3); } }
  // de dag
  if (state.started && !devFlags.noTime) dayP = (dayP + dt / DAY_LEN) % 1;
  if (state.sleeping > 0) { state.sleeping -= dt; if (state.sleeping <= 0) wake(); }
  const night = nightAmount(dayP);
  herd.update(dt, player, ui);
  predGame.night = night; predGame.dayP = dayP; predGame.danger = danger;
  predGame.lit = !!(fire && fire.lit); predGame.campSafe = predGame.lit ? 26 : 11; predGame.campMeat = Math.max(0, predGame.campMeat - dt);
  const pred = !devFlags.noPred;
  if (pred) hyenas.update(dt, predGame);
  if (pred) leopard.update(dt, predGame, camera);
  throws.update(dt); chips.update(dt); knapTick(dt); turnTick(dt); hintTick(dt); questTick(dt); saveTick(dt); trackTargets(dt); aimTick(dt);
  zebras.update(dt, predGame);
  if (pred) sabres.update(dt, predGame);
  group.update(dt, predGame);
  enc.update(dt, predGame);
  beast.update(dt, predGame, t);
  if (shore) shore.update(dt, predGame);
  forage.update(dt, t, camera.position);
  if (fire) fire.update(dt, predGame, dayP);
  groupTakes(dt);
  atHome(dt);
  // bij de slaapboom durven de hyena's niet: de groep schreeuwt en gooit stenen
  for (const h of hyenas.list) {
    if (Math.hypot(h.x - HOME.x, h.z - HOME.z) < predGame.campSafe && ['curious', 'windup', 'rush', 'sneak'].includes(h.state)) {
      h.state = 'retreat'; h.t = 6; sound.from(h).yelp();
      if (!chased) { chased = true; murmur('De groep schreeuwt en gooit stenen: de hyena\'s durven niet dichterbij.', 5); }
    }
  }
  // hoe spannend is het nu? Dat hoor je aan het geluid
  let dg = sabres.danger(player.pos);
  for (const h of hyenas.list) dg = Math.max(dg, h.state === 'windup' || h.state === 'rush' ? 0.8 : h.state === 'curious' ? 0.4 : (h.state === 'prowl' || h.state === 'sneak') && Math.hypot(h.x - player.pos.x, h.z - player.pos.z) < 25 ? 0.2 : 0);
  dg = Math.max(dg, { stalk: 0.5, freeze: 0.65, pounce: 1 }[leopard.state] || 0, enc.danger(), beast.danger(), shore ? shore.danger() : 0);
  if (state.collapsed > 0 || state.sleeping > 0) dg = 0;
  danger += (dg - danger) * (1 - Math.exp(-dt * (dg > danger ? 3 : 0.6)));
  herd.members.forEach((m, i) => senses.track(i, m.x, m.z, m.yaw));
  SKY.dayP = dayP; SKY.x = player.pos.x; SKY.z = player.pos.z; SKY.sneak = player.sneaking; SKY.sound = sound;
  vultures.update(dt, t);

  const sky = weather.update(dt, t, { day: state.day, rainDay: state.rainDay, p: dayP, night, cam: camera.position, wind: WIND });
  world.sky.cloud = sky.cloud; world.sky.rain = sky.rain; world.sky.wind = sky.wind;
  world.update(t, player.pos, dayP, state.sensing);
  renderer.toneMappingExposure = 1.05 - 0.12 * senseK + night * 0.25;
  const part = partOfDay(dayP);
  if (state.started && part !== lastPart && lastPart) {
    if (part === 'evening') toast('De zon zakt. De groep wacht bij de slaapboom. In de schemering gaan de roofdieren op jacht…', 6);
    if (part === 'night' && !mission.active.some((e) => e.m.late)) toast('Het is nacht. Bij de slaapboom ben je veilig; daarbuiten niet.', 5);
    if (part === 'dawn' && !state.slept) newDay('alone');
    if (part === 'day') state.slept = false;
  }
  lastPart = part;

  const tall = tallGrassAt(player.pos.x, player.pos.z);
  glints.update(t, player, state.sensing, verdict, senseK);
  motes.update(dt, t, player.pos, night);
  birds.update(dt, t, player, sound);
  butterflies.update(t, night, player.pos);
  senses.update(dt, t, state.sensing, player.pos, sabres.kill || CARCASS, senseK);
  // geluid: je hoort met de oren van je mens, in de richting waarin je kijkt
  sound.listen(player.pos.x, player.pos.z, cam.yaw);
  const rd = riverDist(player.pos.x, player.pos.z), rs = riverDist(player.pos.x, player.pos.z + 1) < rd ? 1 : -1;
  sound.tick(dt, { night, move: player.speed, tall, senses: state.sensing, danger, weather: sky,
    river: { d: rd, x: player.pos.x, z: player.pos.z + rs * Math.max(rd, 0.5) }, fire: fire && fire.lit ? { x: fire.H.x, z: fire.H.z, k: 1 } : null });
  // voetstappen: elke ondergrond klinkt anders
  if (Math.floor(player.phase / Math.PI) !== stepPhase) {
    stepPhase = Math.floor(player.phase / Math.PI);
    if (player.speed > 0.5 && player.onGround) sound.step(tall ? 'hoog' : groundAt(player.pos.x, player.pos.z), player.sneaking ? 0.4 : 0.7 + Math.min(0.6, player.speed / 9));
  }
  // neerkomen: een bons; van hoog vallen doet pijn
  if (player.landed) { sound.thud(); if (player.fell > 3) hurt(Math.min(25, 6 + (player.fell - 3) * 8)); }

  C.place(dt, t, sick);

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
    const ease = state.day <= 1 ? 0.55 : state.day === 2 ? 0.75 : 1;   // de eerste dagen heb je de tijd om het land te leren kennen
    thirst.tick(dt, { ease, heat: Math.max(0, 1 - Math.abs(dayP - 0.4) / 0.22) * (1 - sky.cloud * 0.5), rain: sky.rain, running: player.speed > 4.5, off: devFlags.noHunger });
    if (!devFlags.noHunger) state.food = Math.max(0, state.food - dt * 0.06 * ease * (predGame.night > 0.6 && !state.cloak && !(fire && fire.warm(player.pos)) ? AREA.cold || 1.5 : 1));   // kou vreet energie
    // Honger, dorst en gif doden je niet. Gif vreet aan je tot een kwart; met een lege maag of een droge keel herstel je niet.
    // Vanzelf kom je terug tot de helft, langzaam en alleen als het rustig is. De rest geneest eten; bitterblad geneest alles.
    guard -= dt; sinceHit += dt;
    if (sick) { state.sick -= dt; if (state.health > 25) state.health = Math.max(25, state.health - dt * 0.5); }
    else if (state.health < 50 && state.food > 0 && state.water > 0 && danger < 0.3 && sinceHit > 10) state.health = Math.min(50, state.health + dt * 0.3);
    if (state.health <= 0) collapse();
  }
  if (state.collapsed > 0) {
    state.collapsed -= dt;
    if (state.collapsed < 3.2) $('fade').style.opacity = 1;
    if (state.collapsed <= 0) {
      // de groep heeft je gevonden en naar de slaapplek gedragen: je wordt daar zwak wakker
      state.health = 30; state.food = Math.max(state.food, 20); state.water = Math.max(state.water, 20); state.sick = 0; guard = 3; breath = 100; winded = false;
      player.pos.set(HOME.x + 2, 0, HOME.z + 4); player.vel.set(0, 0, 0);
      $('fade').style.opacity = 0; player.rise();
      toast('Je komt langzaam weer bij, bij de groep. Je bent zwak.', 6);
    }
  }
  $('dayLbl').textContent = state.day;
  // een pijltje naar de slaapboom als je ver weg bent
  const hdx = HOME.x - player.pos.x, hdz = HOME.z - player.pos.z, hd = Math.hypot(hdx, hdz);
  bodySignals(dt, sick, hd, weary, breath);
  if (player.sneaking && !coverTold && player.nearCover) { coverTold = true; murmur('Gebukt achter een rots of struik ben je onzichtbaar voor wie aan de andere kant staat.', 6); }
  // moet je naar huis (avond, nacht, of eten voor de groep in je handen), dan wijst een pijl aan de schermrand de weg
  const homeward = ['evening', 'night'].includes(partOfDay(dayP)) || !!handOver() || state.sensing;
  homeShown = state.started && hd > 22 && homeward && state.sleeping <= 0 && state.collapsed <= 0;
  $('homeEdge').style.display = homeShown ? 'flex' : 'none';
  if (hd > 22) {
    const ang = Math.atan2(hdx * -fz + hdz * fx, hdx * fx + hdz * fz);
    $('homeDist').textContent = Math.round(hd) + ' m';
    $('homeDir').style.transform = `rotate(${ang}rad)`;
    if (homeShown) {
      const e = $('homeEdge');
      e.style.transform = `translate(${innerWidth / 2 + Math.sin(ang) * innerWidth * 0.38}px, ${innerHeight / 2 - Math.cos(ang) * innerHeight * 0.3}px)`;
      $('homeEdgeDir').style.transform = `rotate(${ang}rad)`; 
    }
  }
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
  }

  uiTick(dt);
}

// Neervallen: je raakt kwijt wat je in je handen had (het blijft daar liggen) en wordt zwak wakker bij de groep.
// Wat je weet, wat je gemaakt hebt en wat in je tas zit, blijft.
function collapse() {
  state.collapsed = 5; state.health = 0; walkTo = null;
  state.hands.forEach((it, i) => { if (it) { dropAt(it, state.rock[i]); state.hands[i] = null; } }); renderHands();
  player.fall();
  toast('Je zakt in elkaar…', 4);
}

// de testmodus (?dev=1) kan dingen stilzetten; in het gewone spel staat alles hier uit
const devFlags = { noPred: false, noTime: false, noHunger: false, onError: null };
let slowT = 0, slowN = 0;
function frame() {
  requestAnimationFrame(frame);   // eerst: een fout in één beeld mag het spel niet stilzetten
  const raw = clock.getDelta(), dt = Math.min(raw, window.__dtCap || 1 / 20);   // __dtCap: alleen voor trage testbrowsers
  if (innerWidth !== sizeW || innerHeight !== sizeH) resize();
  if (mission.viewing && !$('cardScreen').classList.contains('open')) mission.viewing = false;
  if (menu.open || mission.viewing) { renderer.render(scene, camera); return; }   // menu of missieoverzicht open: het spel staat stil
  clock.elapsedTime += dt;
  // Loopt het spel vijf tellen lang te traag, dan gaat het beeld (bij 'Vanzelf') een trap lager. Niet in de testbrowser: die is altijd traag.
  if (state.started && playTime > 8 && !navigator.webdriver) {
    if (raw > 0.5) slowT = slowN = 0; else { slowT += raw; slowN++; }
    if (slowT > 5) { if (slowN / slowT < 24) lowerAuto(); slowT = slowN = 0; }
  }
  try { update(dt); } catch (e) { console.error(e); if (devFlags.onError) devFlags.onError(e); }
  rigDetail(camera.position);
  renderer.render(scene, camera);
}

// geen beginscherm: zodra alles geladen is sta je in de savanne. Geluid en volledig scherm mogen pas na de eerste aanraking.
function begin() {
  if (state.started) return;
  loading.remove(); state.started = true;
  restore(Save.read());
  // de testmodus wordt alleen opgehaald met ?dev=1; een gewone speler laadt er niets van
  if (DEV) import('./dev/dev.js').then((m) => m.initDev({ G, A, devFlags, renderer, camera, height, setNextRock: (r) => { carry.nextRock = r; }, makeCloak: putCloak, dropCloak: carry.dropCloak }));
}
const { snapshot, restore, saveTick } = initPersist(G);
G.snapshot = snapshot;
function firstTouch() {
  removeEventListener('pointerdown', firstTouch, true); removeEventListener('keydown', firstTouch, true);
  window.__played = true; sound.start();
  const el = document.documentElement;
  // op een telefoon: volledig scherm en liggend vastzetten (lukt op Android; op een iPhone vraagt het scherm je te draaien)
  if (matchMedia('(pointer: coarse)').matches && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  }
}
addEventListener('pointerdown', firstTouch, true); addEventListener('keydown', firstTouch, true);

renderHands();
player.update(0.016, dir, { speed: 1 });
cam.yaw = Math.atan2(AREA.herd.at[0] - player.pos.x, AREA.herd.at[1] - player.pos.z);   // begin met de kudde in beeld
player.yaw = cam.yaw;   // en je kijkt met hem mee, over zijn rug
frame();
begin();

// voor testen
window.__game = { W: { FORD, LAKE, depth, riverZ }, walk: (x, z) => { walkTo = { x, z, fn() {}, reach: 0.8 }; }, stopWalk: () => { walkTo = null; }, get walking() { return !!walkTo; }, KNAP, chips, knapStart, axeStart, vultures, FLOCKS, butterflies, body: () => ({ breath, winded, guard, sinceHit }), setBreath: (v) => { breath = v; }, collapse, hurt, bite, scene, giveHand, eat, crackFruit, forage, thirst, journal, knowledge, shore, fire, knapAxe, knapAt: knap, hitTarget, endCard, travel, NEXT, AREA, dayP: () => dayP, makeStick, begin, bestTarget, renderBag, stow, unstow, makeBag, wearHide, mission, MISSIONS, Save, snapshot, restore, ERA, ERAS, killLook, accept, complete, offerOf, missionInfo, missions: G.missions, title, screenOf: (o) => { const q = targetPos({ member: o }); v3.set(q.x, q.y, q.z).project(camera); return [(v3.x + 1) / 2 * innerWidth, (1 - v3.y) / 2 * innerHeight]; }, camYaw: () => cam.yaw, aim: () => aim, aimStart, aimMove, aimRelease, quickThrow, hints: () => [hints.cur && hints.cur.id, [...hints.seen]], actionContext,
  state, player, herd, hyenas, leopard, zebras, sabres, group, enc, beast, game: predGame, HOME, give, sleep, cutKill, season, newDay, hunt: () => sabres.startHunt(predGame), danger: () => danger, things, camera, renderer, discover, throwAt, turnStone, knap: () => { renderHands(); const i = state.hands.indexOf('stone'); if (state.rock[i]) state.rock[i].hits = 9; knap(i); }, renderHands, cutMeat, tapAt, pickUp, openRadial, lookAt, blockers, cover, setSneak, still: () => stillT,
  setCam: (y, p, d) => { cam.yaw = y; cam.pitch = p; if (d) cam.dist = d; }, setZoom: C.setZoom, zoom: () => cam.dist, C, jump, sound, world, weather, menu, closeCard, clockT: () => clock.elapsedTime, actionContext, actionOptions, heard, tasteAt, bodyTap, prim: () => prim, alts: () => alts,
  lookFrom: (pos, look) => { cam.override = pos ? { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) } : null; },
  // als lookFrom, maar met hoogtes ten opzichte van de grond op de plek waar je naar kijkt
  lookRel: (pos, look) => { const h = height(look[0], look[2]); cam.override = { pos: new THREE.Vector3(pos[0], pos[1] + h, pos[2]), look: new THREE.Vector3(look[0], look[1] + h, look[2]) }; }, setDay: (p) => { dayP = p; }, setSense,
  screenOf: (t) => { const a = anchorOf(t); return a && [a.x, a.y]; },
  land: { height, surface, steep, blockers, groundAt, PERCHES },
};
