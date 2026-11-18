import * as THREE from '../lib/three.module.js';
import { height, steep, blockers, leafMat, TREES, rng } from './world.js';
import { AREA } from './eras/index.js';
import { ICON } from './icons.js';
import { heldMesh, boneMesh } from './items.js';
import { plantMesh, digTuber } from './shore.js';
import { Vultures, carcass } from './actors.js';

// Wat het land zelf te eten en te rapen geeft, buiten de bessenstruiken om:
// - vruchtbomen: onder een bosje vijgen liggen elke ochtend rijpe vijgen; de baobab laat zijn vruchten vallen als hij kaal staat
// - takken onder de acacia's (na de regen liggen er weer nieuwe)
// - oude karkassen met gieren erboven: het vlees is op, maar in de botten zit merg
// - knolplanten op het droge land: met een graafstok wrik je ze los
// Waar alles staat, staat in het gebiedsbestand (fruitTrees, oldCarcasses, tubers).
const KIND = {
  fig: { model: 'fig', tall: 3.6, block: 0.25, look: 'figtree', n: 3, ring: [1.3, 2.9], clump: [[0, 0, 1], [1.7, 0.7, 0.8], [-1.1, 1.3, 0.86]], tint: 0xc8dca0, label: 'Pak de vijg' },
  baobab: { model: 'baobab', tall: 12, block: 2.1, look: 'baobab', n: 3, ring: [3.6, 5.2], tint: 0xd0e0a8, label: 'Pak de vrucht' },
};

// een geladen boom als losse onderdelen, de voet van de stam op (0, 0, 0); blad krijgt het bladmateriaal van de wereld
const built = {}, UP = new THREE.Vector3(0, 1, 0);
function treeParts(A, K) {
  if (built[K.model]) return built[K.model];
  const root = A.models[K.model]; root.updateMatrixWorld(true);
  const parts = [], box = new THREE.Box3(), mats = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); box.union(geo.boundingBox);
    const name = o.material.name, blade = /leaf_\d/.test(name);
    if (blade && !mats.has(o.material)) mats.set(o.material, leafMat(o.material.map, K.tint));
    parts.push({ geo, mat: blade ? mats.get(o.material) : o.material, blade, green: /leaf|lf_stk/.test(name), bark: /bark/.test(name) });
  });
  // het midden van de stam: de onderste punten van de bast
  const bark = parts.find((q) => q.bark) || parts[0], pos = bark.geo.attributes.position, size = box.getSize(new THREE.Vector3());
  let n = 0, cx = 0, cz = 0;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < box.min.y + size.y * 0.06) { cx += pos.getX(i); cz += pos.getZ(i); n++; }
  parts.forEach((q) => { q.geo.translate(-cx / n, -box.min.y, -cz / n); q.geo.computeBoundingSphere(); });
  return (built[K.model] = { parts, k: K.tall / size.y });
}

export class Forage {
  constructor(scene, A, things) {
    this.scene = scene; this.things = things; this.trees = []; this.plants = []; this.vultures = []; this.old = []; this.laid = []; this.cullT = 0;
    const free = (x, z, r) => height(x, z) > 0.3 && steep(x, z) < 0.3 && !blockers.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + r);
    const lay = (item, x, z, mesh, label, extra) => {
      mesh.position.set(x, height(x, z) + 0.06, z); mesh.traverse((o) => { o.castShadow = item === 'fig' || item === 'baobab'; }); scene.add(mesh);
      const t = { kind: 'pick', item, x, z, mesh, label, lies: true, ...extra }; things.push(t); this.laid.push(t); return t;
    };

    // ---------- vruchtbomen ----------
    (AREA.fruitTrees || []).forEach(([x, z, kind, s = 1], i) => {
      const K = KIND[kind], T = treeParts(A, K), green = [], all = [];
      // een vijg groeit als een bosje van een paar stammen bij elkaar; een baobab staat alleen
      const stems = (K.clump || [[0, 0, 1]]).map(([dx, dz, ks], j) => {
        const tx = x + dx * s, tz = z + dz * s;
        blockers.push({ x: tx, z: tz, r: K.block * s * ks });
        return new THREE.Matrix4().compose(new THREE.Vector3(tx, height(tx, tz) - 0.12, tz), new THREE.Quaternion().setFromAxisAngle(UP, (x * 0.7 + z * 0.3 + j * 2.1) % 6.28), new THREE.Vector3().setScalar(T.k * s * ks));
      });
      // één tekenopdracht per onderdeel, ook als het bosje uit meer stammen bestaat
      for (const q of T.parts) {
        const m = new THREE.InstancedMesh(q.geo, q.mat, stems.length);
        stems.forEach((M, j) => m.setMatrixAt(j, M));
        m.castShadow = q.blade || q.bark; m.receiveShadow = !q.blade; m.computeBoundingSphere(); scene.add(m); all.push(m);
        if (q.green) green.push(m);
      }
      // de plekken waar een vrucht kan liggen: steeds dezelfde, zodat je weet waar je zoeken moet
      const R = rng(977 + i * 131), fruit = [];
      for (let k = 0, tries = 0; k < K.n && tries < 40; tries++) {
        const a = R() * 6.283, r = (K.ring[0] + R() * (K.ring[1] - K.ring[0])) * s, fx = x + Math.cos(a) * r, fz = z + Math.sin(a) * r;
        if (!free(fx, fz, 0.4) || fruit.some((f) => Math.hypot(f.x - fx, f.z - fz) < 0.8)) continue;
        const m = heldMesh(kind); m.scale.setScalar(kind === 'fig' ? 1.5 : 1.25); m.rotation.y = a * 3;
        fruit.push(lay(kind, fx, fz, m, K.label)); k++;
      }
      this.trees.push({ look: K.look, kind, x, z, high: height(x, z) + K.tall * s * 0.3, green, fruit, all, far: kind === 'fig' ? 120 : 1e9 });
    });

    // ---------- takken onder de acacia's ----------
    // onder elke vaste boom, en onder ongeveer één op de drie andere (één op de twee waar minder bomen staan)
    const fixed = new Set(AREA.trees.map(([x, z]) => x + ',' + z));
    TREES.forEach(([x, z, s], i) => {
      if (!fixed.has(x + ',' + z) && i % (AREA.land ? 2 : 3)) return;
      if (things.some((t) => t.item === 'branch' && Math.hypot(t.x - x, t.z - z) < 4.5)) return;
      const R = rng(4111 + i * 17);
      for (let tries = 0; tries < 8; tries++) {
        const a = R() * 6.283, r = 1.6 + R() * 1.4 * s, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r;
        if (!free(bx, bz, 0.5)) continue;
        const m = heldMesh('branch'); m.scale.setScalar(1.5); m.rotation.set(0, a * 2.3, Math.PI / 2);
        lay('branch', bx, bz, m, 'Pak de tak');
        break;
      }
    });

    // ---------- oude karkassen ----------
    for (const [x, z] of AREA.oldCarcasses || []) {
      const c = carcass(scene, x, z); c.rotation.y = x * 0.9;
      this.vultures.push(new Vultures(scene, x, z, A, 2));
      for (const [dx, dz] of [[1.3, 0.7], [-0.9, 1.4]]) { const m = boneMesh(); m.rotation.y = x + dx; lay('bone', x + dx, z + dz, m, 'Pak het bot').mesh.position.y += 0.02; }
      this.old.push({ look: 'oldcarcass', x, z });
    }

    // ---------- knolplanten ----------
    for (const [x, z] of AREA.tubers || []) {
      const g = plantMesh(); g.position.set(x, height(x, z), z); g.rotation.y = x * 1.3; scene.add(g);
      this.plants.push({ look: 'tuberplant', g, x, z, left: 1 });
    }
    this.dress(0); this.stock(0, true);
  }

  // ---------- wat het spel wil weten ----------
  lookTargets() { return [...this.trees, ...this.old, ...this.plants.filter((p) => p.left > 0)]; }
  // wat de vuist doet als je er vlak naast staat: graven met de stok
  action(game) {
    const p = game.player.pos;
    const plant = game.state.hands.includes('stick') && this.plants.find((q) => q.left > 0 && Math.hypot(q.x - p.x, q.z - p.z) < 2.8);
    return plant ? { mode: 'dig', icon: ICON.dig, run: () => game.player.playOnce('Interact', { speed: 1.6, at: 0.5, onAt: () => digTuber(plant, game) }) } : null;
  }
  update(dt, t, eye) {
    for (const v of this.vultures) v.update(dt, t);
    // kleine dingen op de grond teken je niet van ver
    if (eye && (this.cullT -= dt) < 0) { this.cullT = 0.4; for (const q of this.laid) q.mesh.visible = Math.hypot(q.x - eye.x, q.z - eye.z) < 60;
      for (const T of this.trees) { const on = Math.hypot(T.x - eye.x, T.z - eye.z) < T.far; if (on !== T.on) { T.on = on; for (const m of T.all) m.visible = on && (T.bare ? !T.green.includes(m) : true); } }
    }
  }

  back(t) { if (t.gone) { t.gone = false; this.scene.add(t.mesh); } }
  // hoe de bomen erbij staan: in de droogte verliest de baobab zijn blad
  dress(dry) { for (const T of this.trees) if (T.kind === 'baobab') { T.bare = dry >= 2; for (const m of T.green) m.visible = !T.bare; } }
  // wat er 's ochtends onder de bomen ligt: vijgen elke dag; de baobab laat pas veel vallen als hij kaal staat
  stock(dry, first) {
    for (const T of this.trees) {
      const n = T.kind === 'fig' ? T.fruit.length : dry >= 2 ? T.fruit.length : 1;
      T.fruit.forEach((f, i) => { if (i < n) this.back(f); else if (first) { f.gone = true; this.scene.remove(f.mesh); } });
    }
  }
  newDay(dry, rain) {
    this.dress(dry); this.stock(dry);
    for (const p of this.plants) { p.left = 1; p.g.scale.setScalar(1); p.g.rotation.z = 0; }
    // na de regen liggen er weer takken; aan een oud karkas vind je na een paar dagen opnieuw een bot
    for (const t of this.things) {
      if (!t.lies || !t.gone) continue;
      if ((t.item === 'branch' && rain) || (t.item === 'bone' && (rain || dry === 3))) this.back(t);
    }
  }
}
