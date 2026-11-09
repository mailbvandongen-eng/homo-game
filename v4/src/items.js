import * as THREE from '../lib/three.module.js';
import { height, riverZ } from './world.js';
import { variantsOf } from './assets.js';

let SHRUBS = [];   // gescande struiken (Poly Haven, CC0)

// Wat je kunt vinden. "unknown" zie je zolang je het nog niet geprobeerd hebt.
export const ITEMS = {
  stone: {
    name: 'Kei', color: '#9a8a78',
    look: 'Een vuistgrote kei. Hard en zwaar, hij past precies in je hand.',
    unknown: 'Wat zou je hiermee kunnen doen?',
    known: 'Hiermee kun je botten openslaan.',
  },
  berry: {
    name: 'Paarse bessen', color: '#6a3a8a',
    look: 'Kleine donkere bessen aan een doornige struik. Ze ruiken zoet.',
    unknown: 'Je weet nog niet of je ze kunt eten.',
    known: 'Zoet en goed. Hier word je een beetje verzadigd van.',
  },
  redberry: {
    name: 'Rode bessen', color: '#d0302a',
    look: 'Glanzende felrode bessen. Ze zien er heerlijk uit.',
    unknown: 'Je weet nog niet of je ze kunt eten.',
    known: 'Hier werd je ziek van! Laat ze staan.',
  },
  leaf: {
    name: 'Bitterblad', color: '#3c6a2a',
    look: 'Donkergroene bladeren van een struik bij het water. Ze ruiken scherp.',
    unknown: 'Je weet nog niet wat dit doet.',
    known: 'Vies bitter, maar als je ziek bent, helpt het.',
  },
  flake: {
    name: 'Scherpe afslag', color: '#b8a890',
    look: 'Een dun, vlijmscherp scherfje steen. Pas op je vingers!',
    unknown: 'Wat zou je hiermee kunnen snijden?',
    known: 'Hiermee snijd je vlees van een karkas. Zo begon het gereedschap: de Oldowan-cultuur.',
  },
  bone: {
    name: 'Dijbeen', color: '#e8dcc0',
    look: 'Een groot bot van een zebra. Er zit geen vlees meer aan.',
    unknown: 'Zou er binnenin nog iets zitten?',
    known: 'Met een kei sla je het open: er zit merg in, vet en voedzaam.',
  },
  meat: {
    name: 'Rauw vlees', color: '#a83a32',
    look: 'Een flinke lap vers vlees van een zebra. Het ruikt sterk. Jij bent niet de enige die dat ruikt…',
    unknown: 'Dit is veel meer eten dan bessen. Opeten, of naar de groep brengen?',
    known: 'Vlees vult enorm. Maar hyena\'s ruiken het van ver en komen erop af.',
  },
  egg: {
    name: 'Ei', color: '#e8dcc0',
    look: 'Een groot, gespikkeld ei. Nog warm van het nest.',
    unknown: 'Zou je dit kunnen eten?',
    known: 'Klein, maar vet en krachtig. De moeder geeft ze niet zomaar af.',
  },
  honey: {
    name: 'Honingraat', color: '#e8a020',
    look: 'Een stuk raat, zwaar van de honing. Het plakt aan je vingers en ruikt naar bloemen.',
    unknown: 'Het ruikt zoet. Heel zoet.',
    known: 'Het zoetste en krachtigste eten dat er is. De groep is er dol op.',
  },
};

// Ontdekkingen: dit is wat je in het proefstuk kunt leren
export const DISCOVERIES = [
  { id: 'berry', text: 'Paarse bessen zijn zoet en goed om te eten.' },
  { id: 'redberry', text: 'Van rode bessen word je ziek.' },
  { id: 'leaf', text: 'Bitterblad helpt als je ziek bent.' },
  { id: 'vultures', text: 'Gieren in de lucht wijzen naar een karkas.' },
  { id: 'marrow', text: 'In botten zit merg. Met een kei kraak je ze open.' },
  { id: 'sneak', text: 'Gebukt in het hoge gras zien dieren je niet zo snel.' },
  { id: 'wind', text: 'Dieren ruiken je als de wind van jou naar hen toe waait.' },
  { id: 'flake', text: 'Als je twee stenen hard tegen elkaar slaat, springt er een scherpe afslag af.' },
  { id: 'cut', text: 'Met een scherpe afslag snijd je de laatste reepjes vlees van een karkas.' },
  { id: 'grubs', text: 'Onder stenen zitten larven: klein, maar voedzaam.' },
  { id: 'hyena', text: 'Hyena\'s deinzen terug als je stenen naar ze gooit.' },
  { id: 'leopard', text: 'Een luipaard besluipt je van achteren. Kijk hem recht aan, of gooi een steen.' },
  { id: 'share', text: 'Wie eten deelt, heeft een groep. En een groep houdt je in leven.' },
  { id: 'sleep', text: 'Samen bij de slaapboom ben je \'s nachts veilig.' },
  { id: 'kill', text: 'Waar grote katten gejaagd hebben, blijft vlees achter. Wie het eerst komt…' },
  { id: 'meat', text: 'Vlees vult veel meer dan bessen. Maar de geur lokt hyena\'s.' },
  { id: 'drought', text: 'In de droge tijd raken de struiken dichtbij leeg. Verderop hangt nog fruit.' },
  { id: 'rain', text: 'Na de droogte komt de regen, en alles groeit weer.' },
  { id: 'wounded', text: 'Een gewond dier is niet snel moe, maar wel eerder dan jij. Blijf volgen.' },
  { id: 'snake', text: 'Een slang hoor je alleen als je zelf stil bent. Je zintuigen laten hem zien.' },
  { id: 'egg', text: 'In een nest liggen eieren: vet en krachtig. Maar de moeder verdedigt ze.' },
  { id: 'honey', text: 'Honing is het zoetste eten dat er is.' },
  { id: 'bees', text: 'Bijen steken overdag. In de schemering zijn ze loom: dan haal je de honing.' },
  { id: 'strangers', text: 'Vreemden zijn niet altijd vijanden. Wie iets geeft, krijgt iets terug.' },
  { id: 'sabre', text: 'Een sabeltandkat jaag je niet weg. Wacht tot hij verzadigd is.' },
];

// Verstopte vondsten: zoals archeologen ze nu vinden
export const FINDS = {
  hammer: { name: 'Hamersteen', text: 'Een ronde kei vol putjes en krasjes. Hiermee werden afslagen van andere stenen geslagen. Archeologen vinden zulke hamerstenen tussen de oudste werktuigen van Oost-Afrika, zoals in de Olduvaikloof.' },
};

// Dingen die je alleen kunt bekijken
export const LOOKS = {
  carcass: { name: 'Karkas van een zebra', look: 'Leeuwen hebben hier gegeten, daarna de hyena\'s en de gieren. Het vlees is op.', hint: 'Maar de grote botten zijn nog heel…' },
  hyena: { name: 'Gevlekte hyena', look: 'Sterke kaken die zelfs botten kraken. Hyena\'s jagen zelf, maar stelen ook graag van anderen.', hint: 'Ze zijn brutaal als ze met meer zijn. Een steen maakt indruk.' },
  leopard: { name: 'Luipaard', look: 'Hij ligt lui op een tak. Overdag slaapt hij; in de schemering gaat hij jagen.', hint: 'In de grot van Swartkrans ligt een schedel van een jonge mensachtige met twee gaatjes erin: precies de tanden van een luipaard.' },
  flatstone: { name: 'Platte steen', look: 'Een platte steen, half in de grond. Wat zou eronder zitten?', hint: 'Je kunt hem omdraaien.' },
  gazelle: { name: 'Gazellen', look: 'Slanke antilopen met gebogen hoorns. Ze grazen in een groep en kijken steeds op.', hint: 'Ze zijn snel en schichtig. Te voet haal je ze nooit in.' },
  zebra: { name: 'Zebra\'s', look: 'Gestreepte paarden van de vlakte. Ze grazen samen: veel ogen zien meer dan twee.', hint: 'Voor jou zijn ze te snel en te sterk. Maar er zijn jagers die ze wel aankunnen…' },
  sabre: { name: 'Sabeltandkat', look: 'Een zware kat met hoektanden als messen. Overdag ligt hij in het hoge gras; soms gaat hij op jacht.', hint: 'Met die tanden kan hij niet alles van de botten krijgen. Er blijft altijd iets over.' },
  kill: { name: 'Verse prooi', look: 'Een zebra, net gedood. De buik is open, het vlees is nog warm.', hint: 'Met je handen krijg je de taaie huid niet open. Je hebt iets scherps nodig.' },
  wounded: { name: 'Gewonde gazelle', look: 'Ze loopt alleen en trekt met een achterpoot. De kudde heeft haar achtergelaten.', hint: 'Ze is nog steeds sneller dan jij. Maar voor hoe lang?' },
  prey: { name: 'Gazelle', look: 'Ze ligt stil in het gras. Dit is meer vlees dan je in dagen hebt gezien.', hint: 'Zonder iets scherps krijg je de huid niet open. En de geur verspreidt zich al.' },
  bird: { name: 'Trap', look: 'Een zware loopvogel, bijna zo hoog als je heup. Ze broedt op de grond.', hint: 'Ze valt alles aan wat bij haar nest komt. Een steen maakt indruk.' },
  nest: { name: 'Leeg nest', look: 'Een kuiltje met takjes en dons. De eieren zijn weg.', hint: 'Volgend seizoen broedt ze ergens anders.' },
  snake: { name: 'Pofadder', look: 'Dik, traag en precies de kleur van droog gras. Hij vlucht niet: hij blijft liggen en vertrouwt op zijn schutkleur.', hint: 'Loop er met een boog omheen. Of jaag hem weg met een steen.' },
  bees: { name: 'Bijennest', look: 'Een nest wilde bijen aan een boomstam. Er druipt honing uit.', hint: 'Overdag verdedigen ze het fel. Maar bijen vliegen niet in het donker…' },
  stranger: { name: 'Vreemden', look: 'Ze lijken op jullie, maar je kent ze niet. Een andere groep, bij hun eigen water.', hint: 'Ze verjagen je met stenen. Tenzij je laat zien dat je niets kwaads wilt: leg eten neer en ga op afstand staan.' },
  tree: { name: 'De slaapboom', look: 'Een oude acacia met een brede kroon. Hier slaapt je groep, al zolang je je kunt herinneren.', hint: 'Breng eten mee, en kom terug voor het donker wordt.' },
  tor: { name: 'Tor', look: 'De oudste van de groep. Zijn haar is grijs en hij loopt moeilijk, maar hij weet waar het water blijft staan als het droog is.', hint: 'Hij kan zelf niet meer ver lopen om eten te zoeken.' },
  kem: { name: 'Kem', look: 'Jong en nieuwsgierig. Kem slaat graag stenen tegen elkaar en eet alles wat je meebrengt.', hint: 'Echt alles. Ook wat je zelf nog niet kent.' },
  ibo: { name: 'Kleine Ibo', look: 'Het kind van de groep. Hij rent je tegemoet als je terugkomt.', hint: 'Hij heeft altijd honger.' },
};

// Wat je ervan weet, als kleur bij de zintuigen: goed, slecht of nog onbekend
export const VERDICT = { berry: 'good', redberry: 'bad', leaf: 'good', bone: 'good', stone: 'good', flake: 'good', meat: 'good', egg: 'good', honey: 'good' };

const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

// Een struik met bessen die je kunt plukken
function bush(scene, x, z, berryColor, leafColor = 0xffffff, n = 3) {
  const g = new THREE.Group();
  const v = SHRUBS[Math.abs(Math.round(x * 7 + z * 3)) % SHRUBS.length];
  const k = 1.15 / v.size.y, rad = Math.max(v.size.x, v.size.z) * k * 0.35;
  const mats = [];
  for (const part of v.parts) {
    const mat = part.mat.clone(); mat.color = new THREE.Color(leafColor); mats.push(mat);
    const m = new THREE.Mesh(part.geo, mat); m.scale.setScalar(k); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  let berries = null;
  if (berryColor) {
    // alle bessen in één keer tekenen; minder tonen = de struik raakt leeg
    const bm = new THREE.MeshStandardMaterial({ color: berryColor, roughness: 0.25, emissive: berryColor, emissiveIntensity: 0.15 });
    berries = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), bm, 14);
    const d = new THREE.Object3D();
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, r = rad * (0.85 + (i % 3) * 0.12);
      d.position.set(Math.cos(a) * r, 0.35 + (i % 4) * 0.16, Math.sin(a) * r); d.updateMatrix();
      berries.setMatrixAt(i, d.matrix);
    }
    g.add(berries);
  }
  g.position.set(x, height(x, z), z); g.rotation.y = x;
  scene.add(g);
  return { g, berries, left: n, max: n, mats, green: new THREE.Color(leafColor), dry: 0 };
}

export function placeItems(scene, A) {
  SHRUBS = variantsOf(A.models.shrub_03);
  const things = [];
  const add = (t) => { things.push(t); return t; };

  // losse keien bij de start en verderop
  const stoneMat = lam(0x8a7c6c);
  for (const [x, z] of [[5, -9], [-2, -3], [30, 25], [-45, -60], [-66, -70]]) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), stoneMat);
    m.scale.set(1.2, 0.8, 1); m.position.set(x, height(x, z) + 0.1, z); m.castShadow = true; scene.add(m);
    add({ kind: 'pick', item: 'stone', x, z, mesh: m, label: 'Pak de kei' });
  }

  // bessenstruiken
  for (const [x, z] of [[9, 1], [-25, 30], [55, -40]]) {
    const b = bush(scene, x, z, 0xd0302a, 0xd8e0b0);
    add({ kind: 'bush', item: 'redberry', x, z, bush: b, label: 'Pluk rode bessen' });
  }
  // dichtbij kleine struiken, ver weg (en voorbij het leger van de katten) de rijke
  for (const [x, z, n] of [[-14, -22], [24, -32], [70, 15, 4], [-50, -40], [95, -60, 5], [-92, 2, 6]]) {
    const b = bush(scene, x, z, 0x3a1a5a, 0xe8f0c8, n || 3);
    if (n) b.g.scale.setScalar(1 + (n - 3) * 0.12);
    add({ kind: 'bush', item: 'berry', x, z, bush: b, label: 'Pluk paarse bessen' });
  }

  // bitterblad: groeit alleen bij het water
  for (const x of [-6, 40, -55]) {
    const z = riverZ(x) - 10;
    const b = bush(scene, x, z, null, 0x5a8a40, 4);
    b.g.scale.set(0.9, 1.3, 0.9);
    add({ kind: 'bush', item: 'leaf', x, z, bush: b, label: 'Pluk bitterblad' });
  }

  // botten bij het karkas
  const boneMat = lam(0xe8dcc0);
  for (const [x, z] of [[-70.5, -77], [-68, -79.5]]) {
    const m = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), boneMat); shaft.rotation.z = Math.PI / 2; m.add(shaft);
    for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), boneMat); k.position.x = s * 0.32; m.add(k); }
    m.position.set(x, height(x, z) + 0.08, z); m.rotation.y = x; m.traverse((o) => { o.castShadow = true; });
    scene.add(m);
    add({ kind: 'pick', item: 'bone', x, z, mesh: m, label: 'Pak het bot' });
  }

  // platte stenen: eronder zitten larven, soms een schorpioen, en één keer de hamersteen
  const flatMat = lam(0x9c8e7c);
  for (const [x, z, under] of [[-6, -12, 'grubs'], [16, -8, 'scorpion'], [-30, -20, 'grubs'], [-58, -66, 'grubs'], [-75, -64, 'hammer'], [28, 18, 'scorpion'], [62, -30, 'grubs']]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.14, 7), flatMat);
    m.position.set(x, height(x, z) + 0.04, z); m.rotation.set(0.05, x, 0.04); m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    add({ kind: 'turn', look: 'flatstone', x, z, mesh: m, under });
  }

  return things;
}

// Een klein voorwerpje in je hand
export function heldMesh(item) {
  if (!item) return null;
  const c = new THREE.Color(ITEMS[item].color);
  if (item === 'bone') {
    const g = new THREE.Group(), m = lam(c);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 6), m); g.add(s);
    for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), m); e.position.y = k * 0.24; g.add(e); }
    g.rotation.x = Math.PI / 2;
    return g;
  }
  if (item === 'meat') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), lam(c)); m.scale.set(1.25, 0.5, 0.8);
    const fat = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), lam(new THREE.Color('#e8d0b8'))); fat.scale.set(1.3, 0.4, 0.6); fat.position.set(0.05, 0.035, 0.03);
    return new THREE.Group().add(m, fat);
  }
  if (item === 'stone') return new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), lam(c));
  if (item === 'flake') { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), lam(c)); m.scale.set(1, 0.35, 1.4); return m; }
  if (item === 'egg') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), lam(c)); m.scale.set(1, 1.3, 1); return m; }
  if (item === 'honey') { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.12), new THREE.MeshLambertMaterial({ color: c, emissive: 0x4a2c00, flatShading: true })); return m; }
  if (item === 'leaf') { const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), lam(c)); m.scale.z = 0.3; return m; }
  const g = new THREE.Group(), m = lam(c);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), m); b.position.set((i % 2) * 0.06 - 0.03, Math.floor(i / 2) * 0.06, 0); g.add(b); }
  return g;
}
