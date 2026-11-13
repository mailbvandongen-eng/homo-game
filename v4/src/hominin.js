import * as THREE from '../lib/three.module.js';
import { height, blockers, cover, WALK, riverDist, tallGrassAt, mergeStatic, deep } from './world.js';
import { ERA, AREA } from './eras/index.js';

// Het lichaam van dit tijdperk: lengte in meters en hoe hard je loopt (Homo habilis: klein; Homo erectus: lang, een loper)
export const BODY = { height: 1.35, speed: 1, ...ERA.body };
import { Rig } from './rig.js';

// ---------- materialen ----------
// Een vachtje: korte streepjes in een textuur, gebruikt als kleur én als reliëf
function furTexture() {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * N, y = Math.random() * N, l = 4 + Math.random() * 7, v = 170 + Math.random() * 85;
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + Math.random();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 2, y + l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 4;
  return t;
}
const FUR = furTexture();

// Randlicht: de randen van een figuur lichten warm op, zodat hij loskomt van de achtergrond
export function rimify(mat, color = 0xffd8a0, strength = 0.55) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimCol = { value: new THREE.Color(color) };
    sh.fragmentShader = 'uniform vec3 rimCol;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float rim = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
      totalEmissiveRadiance += rimCol * pow(rim, 3.0) * ${strength.toFixed(2)};`);
  };
  return mat;
}
const std = (color, opts = {}) => rimify(new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }));

// ---------- bouwstenen ----------
// Een taps toelopend lichaamsdeel dat aan zijn bovenkant draait, met een rond gewricht
function segment(len, r1, r2, mat) {
  const pivot = new THREE.Group();
  const tmp = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 12, 1), mat); cyl.position.y = -len / 2; tmp.add(cyl);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(r1, 12, 8), mat); tmp.add(joint);
  const end = new THREE.Mesh(new THREE.SphereGeometry(r2, 10, 6), mat); end.position.y = -len; tmp.add(end);
  const m = mergeMat(tmp, mat); pivot.add(m);
  const tip = new THREE.Group(); tip.position.y = -len; pivot.add(tip);
  return { pivot, tip };
}
// samenvoegen maar het eigen (glanzende) materiaal houden
function mergeMat(group, mat) {
  const m = mergeStatic(group); m.material = mat; m.geometry.deleteAttribute('color');
  m.castShadow = true; m.receiveShadow = false;
  return m;
}
function part(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); return m;
}
const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
// delen met verschillende kleuren (huid, ogen, neus) samen in één stuk; de kleur zit in de hoekpunten
const FACE = rimify(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6, metalness: 0 }));
function mergeColored(group) { const m = mergeStatic(group); m.material = FACE; m.castShadow = true; m.receiveShadow = false; return m; }

// ---------- Homo habilis ----------
// Klein (zo'n 1,25 m), lange armen, behaard, een vooruitstekend gezicht met zware wenkbrauwen.
const HOLD = 0.05;
// Houdingen van de worp, als draaiingen in het lijf van de mens zelf (x = opzij, y = omhoog, z = vooruit; de rechterarm zit aan -x):
// 0 = gewoon, 1 = uitgehaald (elleboog hoog en naar achteren, romp weggedraaid), 2 = losgelaten (arm gestrekt naar voren, romp erin)
const rot = (...steps) => steps.reduce((q, [x, y, z, a]) => q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z), a)), new THREE.Quaternion());
const TOSS = [
  ['spine_02', [rot(), rot([1, 0, 0, -0.12], [0, 1, 0, -0.55]), rot([1, 0, 0, 0.3], [0, 1, 0, 0.45])]],
  ['upperarm_r', [rot(), rot([0, 0, 1, -1.45], [0, 1, 0, -0.5]), rot([1, 0, 0, -2.2])]],
  ['lowerarm_r', [rot(), rot([0, 0, 1, -1.5]), rot()]],
  ['upperarm_l', [rot(), rot([1, 0, 0, -1.1]), rot([1, 0, 0, 0.5])]],
];
const TQ = { root: new THREE.Quaternion(), inv: new THREE.Quaternion(), q: new THREE.Quaternion(), w: new THREE.Quaternion() };   // hoe ver een ding uit de handpalm steekt (m)
export class Hominin {
  constructor(scene, A) {
    // met een geladen model: de echte (geboetseerde) mensaap van Animal Animator; anders de eigen figuur
    if (A && A.models.hominin) { this.initHuman(scene, A); this.initState(); return; }
    const fur = std(0x9a6c4c, { map: FUR, bumpMap: FUR, bumpScale: 2.5 });
    const furDark = std(0x5a3e2c, { map: FUR, bumpMap: FUR, bumpScale: 2.5 });
    const skin = std(0xb08268, { roughness: 0.65 });
    const skinDark = std(0x6e4a3a, { roughness: 0.55 });
    const eyeW = std(0xe8dcc4, { roughness: 0.3 }), iris = std(0x1a0e08, { roughness: 0.15 });

    const g = new THREE.Group();
    this.hips = new THREE.Group(); this.hips.position.y = 0.6; g.add(this.hips);
    this.hips.add(mergeMat(new THREE.Group().add(part(sph(0.15), fur, 0, 0, 0, 1.05, 0.75, 0.85)), fur));

    // romp: een lathe-vorm, breed onderaan (een trechtervormige borstkas zoals bij vroege mensachtigen)
    this.spine = new THREE.Group(); this.spine.position.y = 0.03; this.hips.add(this.spine);
    const prof = [[0.13, 0], [0.165, 0.06], [0.185, 0.15], [0.18, 0.25], [0.168, 0.32], [0.14, 0.38], [0.08, 0.425], [0.045, 0.44]].map(([r, y]) => new THREE.Vector2(r, y));
    const torsoGeo = new THREE.LatheGeometry(prof, 18);
    this.chest = new THREE.Group(); this.spine.add(this.chest);
    const torso = new THREE.Mesh(torsoGeo, fur); torso.scale.z = 0.82; torso.castShadow = true; this.chest.add(torso);
    // borst en buik met minder haar
    const front = new THREE.Group();
    front.add(part(sph(0.11), skin, 0, 0.13, 0.1, 1.15, 1.25, 0.55));
    front.add(part(sph(0.09), skin, 0, 0.29, 0.095, 1.35, 0.7, 0.45));
    this.chest.add(mergeMat(front, skin));

    // nek en hoofd
    this.neck = new THREE.Group(); this.neck.position.set(0, 0.42, 0.01); this.spine.add(this.neck);
    this.neck.add(mergeMat(new THREE.Group().add(part(new THREE.CylinderGeometry(0.045, 0.06, 0.09, 10), fur, 0, 0.03, 0)), fur));
    this.head = new THREE.Group(); this.head.position.y = 0.07; this.neck.add(this.head);
    const hFur = new THREE.Group(), hSkin = new THREE.Group(), hDark = new THREE.Group();
    hFur.add(part(sph(0.105), fur, 0, 0.1, -0.012, 0.92, 0.9, 1.06));                 // kleine hersenpan
    hFur.add(part(sph(0.03, 8, 6), fur, -0.1, 0.075, 0, 0.45, 1, 0.8));                 // oren
    hFur.add(part(sph(0.03, 8, 6), fur, 0.1, 0.075, 0, 0.45, 1, 0.8));
    hSkin.add(part(sph(0.078), skin, 0, 0.045, 0.07, 1.05, 0.85, 1.05));                // vooruitstekend gezicht
    hSkin.add(part(sph(0.055), skin, 0, 0.0, 0.072, 1.05, 0.8, 1));                      // kaak en kin
    hDark.add(part(new THREE.CapsuleGeometry(0.02, 0.1, 4, 8), furDark, 0, 0.108, 0.082, 1, 1, 1, 0, 0, Math.PI / 2));   // zware wenkbrauwen
    hDark.add(part(sph(0.024, 8, 6), skinDark, 0, 0.066, 0.138, 1.45, 0.8, 0.85));     // brede platte neus
    hDark.add(part(new THREE.CapsuleGeometry(0.012, 0.045, 4, 6), skinDark, 0, 0.022, 0.131, 1, 1, 1, 0, 0, Math.PI / 2));   // lippen
    for (const s of [-1, 1]) {
      hDark.add(part(sph(0.017, 10, 8), eyeW, s * 0.034, 0.083, 0.112));
      hDark.add(part(sph(0.011, 8, 6), iris, s * 0.034, 0.083, 0.125));
    }
    hSkin.children.slice().forEach((m) => hDark.add(m));
    this.head.add(mergeMat(hFur, fur), mergeColored(hDark));

    // armen: lang, met ellebogen en handen
    const arm = (s) => {
      const shoulder = new THREE.Group(); shoulder.position.set(s * 0.185, 0.355, -0.005); this.spine.add(shoulder);
      const up = segment(0.25, 0.058, 0.045, fur); shoulder.add(up.pivot);
      const lo = segment(0.23, 0.044, 0.034, fur); up.tip.add(lo.pivot);
      const hand = new THREE.Group(); hand.position.y = -0.005; lo.tip.add(hand);
      const hp = new THREE.Group();
      hp.add(part(sph(0.034, 10, 8), skin, 0, -0.035, 0.005, 0.85, 1.25, 0.55));
      for (let f = 0; f < 4; f++) hp.add(part(new THREE.CapsuleGeometry(0.008, 0.04, 3, 6), skin, (f - 1.5) * 0.013, -0.085, 0.008, 1, 1, 1, 0.25, 0, 0));
      hp.add(part(new THREE.CapsuleGeometry(0.009, 0.03, 3, 6), skin, -s * 0.03, -0.045, 0.02, 1, 1, 1, 0.5, 0, s * 0.6));
      hand.add(mergeMat(hp, skin));
      const held = new THREE.Group(); held.position.set(0, -0.08, 0.03); hand.add(held);
      return { shoulder, upper: up.pivot, lower: lo.pivot, held };
    };
    this.armL = arm(-1); this.armR = arm(1);
    // benen: dij, scheen en een platte voet
    const leg = (s) => {
      const th = segment(0.27, 0.074, 0.052, fur); th.pivot.position.set(s * 0.085, -0.02, 0); this.hips.add(th.pivot);
      const sh = segment(0.26, 0.05, 0.036, fur); th.tip.add(sh.pivot);
      const ankle = new THREE.Group(); sh.tip.add(ankle);
      const fp = new THREE.Group();
      fp.add(part(sph(0.04, 10, 8), skin, 0, -0.025, 0.045, 0.9, 0.5, 1.9));
      for (let k = 0; k < 4; k++) fp.add(part(sph(0.012, 6, 4), skin, (k - 1.5) * 0.016, -0.03, 0.12));
      ankle.add(mergeMat(fp, skin));
      return { hip: th.pivot, knee: sh.pivot, ankle };
    };
    this.legL = leg(-1); this.legR = leg(1);

    // wat je in je handen hebt
    this.held = this.armR.held; this.heldL = this.armL.held;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.scale.setScalar(1.1);
    scene.add(g);
    this.obj = g;
    this.initState();
  }

  // Het model: een neanderthaler (gb.prof.69, CC BY 4.0), omgevormd naar de maten van de soort die je speelt,
  // met bewegingen uit de Universal Animation Library (Quaternius, CC0), overgezet op zijn skelet.
  initHuman(scene, A) {
    // het model is in centimeters en 1,62 m lang; de vorm (shapes.js) maakt er de soort van dit tijdperk van
    const K = BODY.height / 1.35;
    this.rig = new Rig(A, 'hominin', { scale: BODY.height / 162, shape: BODY.shape, tall: BODY.height });
    const S = this.rig.scale; this.S = S;
    const act = (n) => { const a = this.rig.action(n); a.play(); a.setEffectiveWeight(0); a.timeScale = 0; return a; };
    // bewegingen die samen gemengd worden, met hun eigen snelheid (m/s) bij deze lengte
    this.loco = {
      idle: { a: act('Idle_Loop') }, cidle: { a: act('Crouch_Idle_Loop') }, air: { a: act('Jump_Loop') },
      walk: { a: act('Walk_Loop'), v: 1.25 * K }, jog: { a: act('Jog_Fwd_Loop'), v: 3.0 * K }, sprint: { a: act('Sprint_Loop'), v: 5.2 * K },
      cwalk: { a: act('Crouch_Fwd_Loop'), v: 1.0 * K },
    };
    for (const k in this.loco) this.loco[k].w = k === 'idle' ? 1 : 0;
    this.locoPhase = 0; this.once = null;
    // wat je in je handen hebt: vast aan de handbotten (het skelet is in centimeters, dus terugschalen)
    this.rig.root.updateMatrixWorld(true);
    const hold = (bone, side) => {
      const ws = bone.getWorldScale(new THREE.Vector3()).x, g = new THREE.Group();
      g.scale.setScalar(1 / ws);
      // in de handpalm: tussen de knokkels en de pols, een stukje naar de palmkant
      const sfx = side < 0 ? '_r' : '_l', loc = (n) => bone.worldToLocal(this.rig.bone(n + sfx).getWorldPosition(new THREE.Vector3()));
      const idx = loc('index_01'), pk = loc('pinky_01'), mid = loc('middle_01'), tip = loc('middle_03');
      const n = idx.clone().cross(pk).normalize(); if (n.dot(loc('thumb_03').sub(idx)) < 0) n.negate();
      g.position.copy(mid).lerp(tip, 0.25).addScaledVector(n, HOLD / ws);
      bone.add(g); return g;
    };
    this.held = hold(this.rig.bone('hand_r'), -1); this.heldL = hold(this.rig.bone('hand_l'), 1);
    scene.add(this.rig.root);
    this.obj = this.rig.root;
  }

  // Een beweging één keer afspelen bovenop de rest (slaan, gooien, oppakken, geraakt worden).
  // at: moment (0..1) waarop onAt wordt uitgevoerd, bijv. het loslaten van de steen
  playOnce(name, { speed = 1, at = 0.5, onAt = null, upto = 1, slow = 0.35 } = {}) {
    if (!this.rig) { this.action = 0.5; onAt && onAt(); return; }
    const a = this.rig.action(name); if (!a) { onAt && onAt(); return; }
    if (this.once) this.once.a.setEffectiveWeight(0);
    a.reset(); a.play(); a.timeScale = speed; a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
    this.once = { a, len: a.getClip().duration * upto, at: a.getClip().duration * at, onAt, slow };
  }

  initState() {
    this.pos = new THREE.Vector3(AREA.start[0], 0, AREA.start[1]);
    this.y = 0; this.vy = 0; this.onGround = true; this.jumpReq = false; this.landed = false;
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.phase = 0;
    this.crouch = 0;          // 0 = staan, 1 = gebukt
    this.sneaking = false;
    this.speed = 0;
    this.action = 0;          // korte animatie bij oppakken/eten
    this.idle = 0; this.lookYaw = 0; this.lookT = 2; this.time = 0;
  }

  // dir: gewenste looprichting in de wereld (lengte 0..1)
  update(dt, dir, mods) {
    // traploos: hoe verder je de stick duwt, hoe sneller (lopen tot 2,6 m/s, daarna rennen tot 5,4 m/s)
    const mag = Math.min(1, dir.length());
    let want = this.sneaking ? 1.6 * mag : mag < 0.7 ? 2.6 * mag / 0.7 : 2.6 + (mag - 0.7) / 0.3 * 2.8;
    if (this.once) want *= this.once.slow;   // tijdens slaan loop je bijna niet
    if (this.toss) want *= 0.3;              // en tijdens mikken en gooien ook niet
    const max = want * mods.speed * BODY.speed * (riverDist(this.pos.x, this.pos.z) < 6 || height(this.pos.x, this.pos.z) < -0.45 ? 0.45 : 1);
    const target = mag > 0.001 ? dir.clone().normalize().multiplyScalar(max) : dir.clone().set(0, 0, 0);
    this.vel.lerp(target, 1 - Math.exp(-dt * (this.onGround ? 6 : 1.5)));
    const px = this.pos.x, pz = this.pos.z;
    this.pos.addScaledVector(this.vel, dt);
    if (deep(this.pos.x, this.pos.z) && !deep(px, pz)) { this.pos.x = px; this.pos.z = pz; this.vel.multiplyScalar(0.3); this.tooDeep = true; }   // verder kun je niet staan
    for (const b of blockers) {
      if (b.top && this.y > b.top - 0.15) continue;   // over een lage rots heen springen
      const dx = this.pos.x - b.x, dz = this.pos.z - b.z, d = Math.hypot(dx, dz), min = b.r + 0.3;
      if (d < min && d > 0.001) { this.pos.x = b.x + dx / d * min; this.pos.z = b.z + dz / d * min; }
    }
    const lim = WALK - 4;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -lim, lim); this.pos.z = THREE.MathUtils.clamp(this.pos.z, -lim, lim);
    // springen en vallen
    const gy = Math.max(height(this.pos.x, this.pos.z), -0.9);
    this.landed = false;
    if (this.jumpReq && this.onGround && !this.sneaking) { this.vy = 5.2; this.onGround = false; }
    this.jumpReq = false;
    if (!this.onGround) {
      this.vy -= 15 * dt; this.y += this.vy * dt;
      if (this.y <= gy) { this.y = gy; this.vy = 0; this.onGround = true; this.landed = true; }
    } else this.y = gy;
    this.pos.y = this.y;

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.2) {
      const ty = Math.atan2(this.vel.x, this.vel.z);
      let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-dt * 10));
    }
    this.crouch += ((this.sneaking ? 1 : 0) - this.crouch) * (1 - Math.exp(-dt * 8));
    if (!this.rig) this.phase += dt * (2.4 + this.speed * 1.75) * (this.speed > 0.15 ? 1 : 0);
    this.action = Math.max(0, this.action - dt);
    this.time += dt;
    // stilstaan: rustig ademen en af en toe rondkijken
    this.idle = this.speed < 0.2 ? this.idle + dt : 0;
    this.lookT -= dt;
    if (this.lookT < 0) { this.lookT = 2 + Math.random() * 4; this.lookTarget = this.idle > 1.5 ? (Math.random() - 0.5) * 1.6 : 0; }
    this.lookYaw += ((this.lookTarget || 0) - this.lookYaw) * (1 - Math.exp(-dt * 2.5));
    this.pose(mods, dt);
  }

  pose(mods, dt = 1 / 60) {
    if (this.rig) return this.poseRig(mods, dt);
    const s = Math.min(1, Math.max(0, (this.speed - 2.6) / 2.8));   // 0 = lopen, 1 = rennen
    const w = Math.min(1, this.speed / 1.2);                         // 0 = stil, 1 = in beweging
    const ph = this.phase, c = this.crouch, sick = mods.sick ? 1 : 0;
    const A = (0.5 + s * 0.35) * w * (1 - c * 0.35);
    const breathe = Math.sin(this.time * 2.2) * 0.012 * (1 - w);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;

    this.hips.position.y = 0.6 - c * 0.2 + Math.abs(Math.cos(ph)) * 0.035 * w - (1 - Math.abs(Math.cos(ph))) * 0.015 * w;
    this.hips.rotation.y = Math.sin(ph) * 0.12 * w;
    this.hips.rotation.z = Math.cos(ph) * 0.04 * w;
    const lean = 0.14 + s * 0.28 + c * 0.6 + sick * 0.25;
    this.spine.rotation.x = lean;
    this.spine.rotation.y = -Math.sin(ph) * 0.18 * w;
    this.chest.scale.set(1 + breathe, 1 + breathe * 0.6, 1 + breathe);
    this.neck.rotation.x = -lean * 0.65;
    this.head.rotation.x = -lean * 0.25 + sick * 0.25;
    this.head.rotation.y = this.lookYaw;
    this.head.rotation.z = sick ? Math.sin(this.time * 2.5) * 0.08 : 0;

    // benen: de knie buigt als het been naar voren zwaait
    for (const [L, o] of [[this.legL, 0], [this.legR, Math.PI]]) {
      const p = ph + o, swing = Math.sin(p);
      L.hip.rotation.x = -swing * A - c * 1.05 - s * 0.1;
      L.knee.rotation.x = (0.1 + Math.max(0, Math.cos(p)) * 1.25) * A * 1.1 + c * 1.75;
      L.ankle.rotation.x = -(L.hip.rotation.x + L.knee.rotation.x) * 0.55 + swing * 0.15 * w;
    }
    // armen: zwaaien tegen de benen in, ellebogen licht gebogen
    for (const [Ar, o, side] of [[this.armL, Math.PI, -1], [this.armR, 0, 1]]) {
      const p = ph + o;
      Ar.shoulder.rotation.x = -Math.sin(p) * A * 0.9 + c * 0.35 - lean * 0.6;
      Ar.shoulder.rotation.z = side * (0.1 + c * 0.1);
      Ar.lower.rotation.x = -(0.25 + Math.max(0, -Math.sin(p)) * 0.6 * w + s * 0.5 + c * 0.3);
    }
    if (sick) { this.armL.shoulder.rotation.x = -0.5; this.armL.lower.rotation.x = -1.7; }   // hand op de buik
    if (this.action > 0) {
      const a = Math.sin(this.action / 0.5 * Math.PI);
      this.armR.shoulder.rotation.x = -1.3 * a - lean * 0.6; this.armR.lower.rotation.x = -0.3;
      this.spine.rotation.x += 0.45 * a; this.hips.position.y -= 0.08 * a;
    }
  }

  // Vloeiend mengen: stilstaan, lopen, joggen en sprinten tegelijk, met gewichten die meegroeien met de snelheid.
  // Alle loopbewegingen lopen in de pas (dezelfde fase), zodat er bij het overgaan niets verspringt.
  poseRig(mods, dt) {
    const r = this.rig, L = this.loco, s = this.speed, sick = mods.sick ? 1 : 0;
    r.root.position.copy(this.pos);
    r.root.rotation.y = this.yaw;
    const ss = THREE.MathUtils.smoothstep;
    const w = { idle: 0, cidle: 0, air: 0, walk: 0, jog: 0, sprint: 0, cwalk: 0 };
    if (!this.onGround) w.air = 1;
    else if (this.sneaking) { const m = ss(s, 0.1, 0.6); w.cidle = 1 - m; w.cwalk = m; }
    else {
      const m = ss(s, 0.1, 0.5); w.idle = 1 - m;
      if (s <= L.walk.v * 1.6) w.walk = m;
      else if (s <= L.jog.v) { const f = (s - L.walk.v * 1.6) / (L.jog.v - L.walk.v * 1.6); w.walk = m * (1 - f); w.jog = m * f; }
      else { const f = Math.min(1, (s - L.jog.v) / (L.sprint.v - L.jog.v)); w.jog = m * (1 - f); w.sprint = m * f; }
    }
    // gewichten zacht laten meebewegen
    const k = 1 - Math.exp(-dt * 9);
    for (const n in L) L[n].w += (w[n] - L[n].w) * k;
    // gezamenlijke fase van de loopbewegingen
    let mv = 0, V = 0, T = 0;
    for (const n of ['walk', 'jog', 'sprint', 'cwalk']) { mv += L[n].w; V += L[n].w * L[n].v; T += L[n].w * L[n].a.getClip().duration; }
    if (mv > 0.01) { V /= mv; T /= mv; this.locoPhase = (this.locoPhase + dt * Math.min(2.2, Math.max(0.5, s / V)) / T) % 1; }
    for (const n of ['walk', 'jog', 'sprint', 'cwalk']) L[n].a.time = this.locoPhase * L[n].a.getClip().duration;
    for (const n of ['idle', 'cidle', 'air']) { const a = L[n].a; a.time = (a.time + dt) % a.getClip().duration; }
    this.phase = this.locoPhase * Math.PI * 4 * (mv > 0.2 ? 1 : 0);   // voor de voetstappen: twee per ronde
    // eenmalige beweging eroverheen
    let o = 0;
    if (this.once) {
      const O = this.once, t = O.a.time;
      if (O.onAt && t >= O.at) { const f = O.onAt; O.onAt = null; f(); }
      o = Math.min(1, t / 0.12, (O.len - t) / 0.18);
      if (t >= O.len - 0.001) { O.a.setEffectiveWeight(0); O.a.stop(); this.once = null; o = 0; }
      else O.a.setEffectiveWeight(Math.max(0, o));
    }
    for (const n in L) L[n].a.setEffectiveWeight(L[n].w * (1 - o));
    r.update(dt);
    // ziek: wat voorovergebogen; stilstaand rondkijken
    const side = r.side(this._side || (this._side = new THREE.Vector3()));
    if (sick) r.bend(r.bone('spine_02'), side, 0.35);
    if (this.lookYaw && !this.once) r.bend(r.bone('head'), this._up || (this._up = new THREE.Vector3(0, 1, 0)), this.lookYaw * 0.7);
    if (this.toss) this.tossPose(dt, r);
  }

  // ---- gooien: bovenhands, met het hele lijf ----
  // windUp: uithalen en zo blijven staan (tijdens het mikken); letFly: de worp, fn loopt op het moment van loslaten
  windUp() { if (!this.toss) this.toss = { ph: 'cock', t: 0 }; }
  letFly(fn) { this.windUp(); this.toss.fn = fn; this.toss.go = true; }
  cancelToss() { this.toss = null; }
  handPos(out = new THREE.Vector3()) { return this.held ? this.held.getWorldPosition(out) : out.copy(this.pos).setY(this.pos.y + 1.4); }
  tossPose(dt, r) {
    const T = this.toss; if (!T.freeze) T.t += dt;
    if (T.ph === 'cock' && T.go && T.t > 0.22) { T.ph = 'swing'; T.t = 0; }
    else if (T.ph === 'swing' && T.t > 0.15) { T.ph = 'follow'; T.t = 0; const f = T.fn; T.fn = null; if (f) f(); }
    else if (T.ph === 'follow' && T.t > 0.55) { this.toss = null; return; }
    const ease = (x) => x * x * (3 - 2 * x);
    const [from, to, k] = T.ph === 'cock' ? [0, 1, ease(Math.min(1, T.t / 0.22))] : T.ph === 'swing' ? [1, 2, Math.min(1, T.t / 0.15) ** 1.6] : [2, 0, ease(Math.min(1, T.t / 0.55))];
    const root = r.root.getWorldQuaternion(TQ.root), inv = TQ.inv.copy(root).invert();
    for (const [name, poses] of TOSS) {
      const q = TQ.q.copy(poses[from]).slerp(poses[to], k);
      r.bendQ(r.bone(name), TQ.w.copy(root).multiply(q).multiply(inv));
    }
  }

  // Zit je gebukt vlak achter een rots of struik, dan ziet een dier op (x, z) je niet
  hiddenFrom(x, z) {
    if (!this.sneaking) return false;
    const p = this.pos, dx = p.x - x, dz = p.z - z, L = Math.hypot(dx, dz);
    if (L < 2.5) return false;
    for (const c of cover) {
      if (Math.hypot(c.x - p.x, c.z - p.z) > c.r + 2.2) continue;
      const cx = c.x - x, cz = c.z - z, f = (cx * dx + cz * dz) / (L * L);
      if (f > 0 && f < 1 && Math.abs(cx * dz - cz * dx) / L < c.r * 0.9) return true;
    }
    return false;
  }
  get nearCover() { const p = this.pos; return cover.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < c.r + 2.2); }

  // Hoe goed val je op voor een dier? 1 = normaal
  get noticeable() {
    let n = this.sneaking ? 0.35 : 1;
    if (this.speed > 4) n *= 1.6;
    if (this.speed < 0.3) n *= 0.6;
    if (tallGrassAt(this.pos.x, this.pos.z)) n *= this.sneaking ? 0.25 : 0.6;
    return n;
  }
}
