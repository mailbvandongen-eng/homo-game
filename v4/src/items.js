import * as THREE from '../lib/three.module.js';
import { height, riverZ } from './world.js';

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
  bone: {
    name: 'Dijbeen', color: '#e8dcc0',
    look: 'Een groot bot van een zebra. Er zit geen vlees meer aan.',
    unknown: 'Zou er binnenin nog iets zitten?',
    known: 'Met een kei sla je het open: er zit merg in, vet en voedzaam.',
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
];

const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

// Een struik met bessen die je kunt plukken
function bush(scene, x, z, berryColor, leafColor = 0x55702e, n = 3) {
  const g = new THREE.Group();
  const leaf = lam(leafColor);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), leaf);
    m.position.set(Math.cos(i * 1.7) * 0.35, 0.45 + (i % 2) * 0.2, Math.sin(i * 1.7) * 0.35);
    m.scale.set(1, 0.8, 1); m.castShadow = true; g.add(m);
  }
  const berries = [];
  if (berryColor) {
    const bm = new THREE.MeshLambertMaterial({ color: berryColor, emissive: berryColor, emissiveIntensity: 0.25 });
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), bm);
      const a = i * 2.4, r = 0.6 + (i % 3) * 0.05;
      b.position.set(Math.cos(a) * r * 0.8, 0.35 + (i % 4) * 0.15, Math.sin(a) * r * 0.8);
      g.add(b); berries.push(b);
    }
  }
  g.position.set(x, height(x, z), z);
  scene.add(g);
  return { g, berries, left: n, max: n };
}

export function placeItems(scene) {
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
    const b = bush(scene, x, z, 0xd0302a);
    add({ kind: 'bush', item: 'redberry', x, z, bush: b, label: 'Pluk rode bessen' });
  }
  for (const [x, z] of [[-14, -22], [24, -32], [70, 15], [-50, -40]]) {
    const b = bush(scene, x, z, 0x4a2a6a);
    add({ kind: 'bush', item: 'berry', x, z, bush: b, label: 'Pluk paarse bessen' });
  }

  // bitterblad: groeit alleen bij het water
  for (const x of [-6, 40, -55]) {
    const z = riverZ(x) - 10;
    const b = bush(scene, x, z, null, 0x2e5420, 4);
    b.g.scale.set(0.8, 1.4, 0.8);
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
  if (item === 'stone') return new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), lam(c));
  if (item === 'leaf') { const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), lam(c)); m.scale.z = 0.3; return m; }
  const g = new THREE.Group(), m = lam(c);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), m); b.position.set((i % 2) * 0.06 - 0.03, Math.floor(i / 2) * 0.06, 0); g.add(b); }
  return g;
}
