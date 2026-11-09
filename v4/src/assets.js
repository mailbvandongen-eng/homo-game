import * as THREE from '../lib/three.module.js';
import { GLTFLoader, HDRLoader } from '../lib/three-addons.js';

// Gescande natuur van Poly Haven (CC0): keien, struiken, dood hout, grond- en bastfoto's en een luchtfoto.
// Alles wordt geladen voordat het spel begint; onProgress krijgt een getal van 0 tot 1.
// dieren met botten en animaties (Sketchfab, CC BY 4.0, zie assets/CREDITS.md)
const ANIMALS = ['hyena', 'leopard', 'gazelle', 'hominin', 'sabre', 'zebra'];
const MODELS = [...ANIMALS, 'namaqualand_boulder_02', 'namaqualand_boulder_05', 'namaqualand_rocks_01', 'wild_rooibos_bush', 'shrub_03', 'dead_tree_trunk', 'dry_branches_medium_01'];
const TEXTURES = [
  ['dry_ground_01_diff', true], ['dry_ground_01_nor', false], ['withered_grass_diff', true], ['withered_grass_nor', false],
  ['sparse_grass_diff', true], ['dry_ground_rocks_diff', true], ['fever_tree_bark_diff', true], ['fever_tree_bark_nor', false],
  ['grass_atlas', true], ['leaf_top', true], ['leaf_side', true],
];

export async function loadAssets(renderer, onProgress = () => {}) {
  const total = MODELS.length + TEXTURES.length + 2;
  let done = 0;
  const tick = (x) => { onProgress(++done / total); return x; };
  const tl = new THREE.TextureLoader(), gl = new GLTFLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const tex = Promise.all(TEXTURES.map(([n, srgb]) => tl.loadAsync(`./assets/tex/${n}.webp`).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return tick([n, t]);
  })));
  const anims = {};
  const models = Promise.all(MODELS.map((n) => gl.loadAsync(`./assets/models/${n}.glb`).then((g) => { anims[n] = g.animations; return tick([n, g.scene]); })));
  const hdr = new HDRLoader().loadAsync('./assets/mpumalanga_veld_1k.hdr').then((t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    // omgevingslicht voor glanzende en ruwe materialen
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(t).texture; pm.dispose();
    return tick({ sky: t, env });
  });

  // bewegingen voor de hoofdpersoon (overgezet uit de Universal Animation Library)
  const moves = fetch('./assets/anims/hominin.json').then((r) => r.json()).then((j) => tick(j.map((c) => THREE.AnimationClip.parse(c))));
  const [T, M, H, MV] = await Promise.all([tex, models, hdr, moves]);
  anims.hominin = MV;
  return { tex: Object.fromEntries(T), models: Object.fromEntries(M), anims, sky: H.sky, env: H.env };
}

// De varianten in een geladen model (bijv. vijf verschillende struiken naast elkaar). Per variant de onderdelen
// (bijv. takjes en blad) met hun vorm al in de juiste stand, midden-onderaan op (0, 0, 0), zodat we ze kunnen herhalen.
export function variantsOf(root) {
  root.updateMatrixWorld(true);
  const tops = root.children.length === 1 && !root.children[0].isMesh && root.children[0].children.length > 1 ? root.children[0].children : root.children;
  return tops.map((top) => {
    const parts = [], box = new THREE.Box3();
    top.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.computeBoundingBox();
      box.union(geo.boundingBox); parts.push({ geo, mat: o.material });
    });
    const off = new THREE.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    parts.forEach((p) => p.geo.translate(off.x, off.y, off.z));
    return { name: top.name, parts, size: box.getSize(new THREE.Vector3()) };
  }).filter((v) => v.parts.length);
}
