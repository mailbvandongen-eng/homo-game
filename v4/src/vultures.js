import * as THREE from '../lib/three.module.js';
import { height, PERCHES } from './world.js';
import { Rig } from './rig.js';

// Gieren. Overdag cirkelen ze boven een karkas en landen ze erbij om te eten; 's nachts zitten ze in een boom.
// - ze stijgen halverwege de ochtend op, als de lucht warm wordt, en zoeken voor de schemer een boom
// - ligt er vlees en is er niemand in de buurt, dan landen ze allemaal en eten ze het langzaam op
// - bij oude botten landt er maar één
// - kom je dichtbij, dan hippen ze weg en wachten ze; een steen jaagt ze de lucht in. Daarna komen ze terug
// In de lucht is het een vliegend model (met vleugelslag). Op de grond en in de boom is het een staande vale gier:
// dat model heeft botten maar geen bewegingen, dus het pikken, stappen en hippen maken we hier zelf.

// wat de gieren van de wereld weten: het uur van de dag en waar jij bent (main.js vult dit elk beeld in)
export const SKY = { dayP: 0.12, x: 0, z: 0, sneak: false, sound: null };
export const FLOCKS = [];
const RISE = 0.2, ROOST = 0.62;          // tussen deze uren zijn ze in de lucht
const TALL = 0.055, FOOT = 0.54;         // maat van de staande gier, en hoe ver zijn tenen onder zijn midden zitten
const SPAN = [0.62, 1.1];                // maat van de vliegende gier: echt (bij de grond) en iets groter (hoog, zodat je ze van ver ziet)
const BONES = { body: 'Bone_14', tail: 'Bone_007_18', back: 'Bone_001_7', neck: 'Bone_002_6', head: 'Bone_003_2', wl: 'Bone_030_10', wr: 'Bone_032_13', ll: 'Bone_012_30', lr: 'Bone_013_43' };
const UP = new THREE.Vector3(0, 1, 0), SIDE = new THREE.Vector3(), FWD = new THREE.Vector3();
const toward = (v, to, step) => (Math.abs(to - v) <= step ? to : v + Math.sign(to - v) * step);
const turnTo = (yaw, to, step) => { const d = Math.atan2(Math.sin(to - yaw), Math.cos(to - yaw)); return yaw + Math.max(-step, Math.min(step, d)); };
const hear = (b, r) => SKY.sound && Math.hypot(SKY.x - b.x, SKY.z - b.z) < r;

// alle gieren die nu op de grond staan: daar kun je een steen naar gooien
export function groundBirds() { const out = []; for (const f of FLOCKS) if (f.on) for (const b of f.birds) if (b.state === 'ground') out.push(b); return out; }
// een steen die ergens neerkomt: wie er vlakbij staat, hipt weg
export function scareBirds(x, z, r = 7) { for (const f of FLOCKS) if (f.on) f.scareAt(x, z, r); }

export class Vultures {
  // bones: liggen hier oude botten? Dan staat er overdag één gier bij
  constructor(scene, x, z, A, n = 4, { bones = true, on = true } = {}) {
    this.scene = scene; this.A = A; this.bones = bones; this.on = on; this.source = null; this.eatT = 0;
    this.center = new THREE.Vector3(x, height(x, z), z);
    this.birds = [];
    for (let i = 0; i < n; i++) {
      const rig = new Rig(A, 'vulture', { scale: 1, facing: Math.PI }), g = rig.root;
      rig.model.traverse((o) => { if (o.isMesh) { o.receiveShadow = false; o.castShadow = false; } });
      rig.play('Armature', { speed: 0 }); g.rotation.order = 'YXZ'; g.visible = on;
      scene.add(g);
      const b = { flock: this, i, fr: rig, gr: null, state: 'fly', goal: 'soar', x, y: this.center.y, z, yaw: 0, a: i / n * 6.28, r: 7 + i * 2.5, r0: 7 + i * 2.5, h0: 18 + i * 3, v: 3 + i * 0.25,
        cx: x, cz: z, flap: 3 + i * 3.1, burst: 0, wait: 0, anchor: null, final: null, e: 0, w: 0, hy: 0, step: 0, hopY: 0, sub: 'eat', ec: 1 + i, down: false, flare: 8 + i * 5, shy: 0, idle: 0, to: null, wing: 0 };
      b.y += b.h0;
      this.birds.push(b);
    }
    FLOCKS.push(this);
    // begint het spel buiten hun uren, dan zitten ze al in de boom
    if (on && !this.active(0)) for (const b of this.birds) { b.anchor = this.perchFor(b); this.settle(b, 'roost'); }
  }
  active(i) { return SKY.dayP > RISE + i * 0.006 && SKY.dayP < ROOST - i * 0.006; }
  // de hele groep laten zien of verbergen (de gieren van het grote dier komen pas als het dood is)
  show(on, { h, r } = {}) {
    this.on = on;
    for (const b of this.birds) {
      this.free(b); b.fr.root.visible = false; if (b.gr) b.gr.root.visible = false;
      if (!on) continue;
      if (h) { b.h0 = h + b.i * 3; b.r0 = r + b.i * 2.5; }
      Object.assign(b, { state: 'fly', goal: 'soar', cx: this.center.x, cz: this.center.z, r: b.r0, y: this.center.y + b.h0, final: null, burst: 0, wait: 0 });
      b.fr.root.visible = true;
    }
  }

  // ---------- plekken ----------
  // de dichtstbijzijnde boomtop waar nog plaats is; staat er geen boom in de buurt, dan slapen ze op de grond
  perchFor(b) {
    let best = null, bd = 170;
    for (const p of PERCHES) { if (p.n >= (p.wide ? 2 : 1)) continue; const d = Math.hypot(p.x - this.center.x, p.z - this.center.z); if (d < bd) { bd = d; best = p; } }
    if (!best) { const s = this.spot(b, 4); return s && { ...s, roost: true }; }
    const off = best.wide ? (best.n ? -1 : 1) * 1.1 : 0, a = best.x * 1.3;
    best.n++;
    return { x: best.x + Math.cos(a) * off, z: best.z + Math.sin(a) * off, y: best.y, perch: best, roost: true };
  }
  free(b) { if (b.anchor && b.anchor.perch) b.anchor.perch.n--; b.anchor = null; }
  // een plek op de grond rond het karkas (niet in het water)
  spot(b, R) {
    const C = this.center;
    for (let k = 0; k < 6; k++) {
      const a = b.i * 2.4 + 0.7 + k * 1.05, x = C.x + Math.cos(a) * R, z = C.z + Math.sin(a) * R;
      if (height(x, z) < 0.15) continue;
      // ze landen een paar passen verderop en lopen dan naar het vlees
      const lx = C.x + Math.cos(a) * (R + 2.6), lz = C.z + Math.sin(a) * (R + 2.6), far = height(lx, lz) > 0.15;
      return { x: far ? lx : x, z: far ? lz : z, y: height(far ? lx : x, far ? lz : z), eat: { x, z }, cx: C.x, cz: C.z };
    }
    return null;
  }

  // ---------- van de lucht naar de grond en terug ----------
  ground(b) {
    if (!b.gr) {
      const rig = b.gr = new Rig(this.A, 'griffon', { scale: TALL, facing: -2.62 });
      rig.model.position.y = FOOT; rig.B = {};
      for (const k in BONES) rig.B[k] = rig.hold(rig.bone(BONES[k]));
      this.scene.add(rig.root);
    }
    return b.gr;
  }
  settle(b, state) {
    const A = b.anchor;
    Object.assign(b, { state, x: A.x, y: A.y, z: A.z, final: null, hopY: 0, e: 0, w: 0.9, hy: 0, idle: 0, shy: 0 });
    b.fr.root.visible = false; this.ground(b).root.visible = this.on;
    if (state === 'ground') { b.sub = 'walk'; b.to = A.eat; b.home = A; }
  }
  takeoff(b, wait = 0) {
    if (hear(b, 45)) SKY.sound.flutter();
    this.free(b);
    b.a = -b.yaw; b.r = 2; b.cx = b.x - Math.cos(b.a) * b.r; b.cz = b.z - Math.sin(b.a) * b.r; b.y += 0.3 + b.hopY;
    Object.assign(b, { state: 'fly', goal: 'soar', burst: 7, final: null, wait, hopY: 0 });
    if (b.gr) b.gr.root.visible = false;
    b.fr.root.visible = this.on;
  }
  // een steen raakt deze gier: hij vliegt op, de anderen schrikken mee
  hit(b) { if (hear(b, 60)) SKY.sound.squawk(); this.takeoff(b, 25); this.scareAt(b.x, b.z, 7); }
  scareAt(x, z, r) { for (const b of this.birds) if (b.state === 'ground' && Math.hypot(b.x - x, b.z - z) < r) this.hop(b, x, z, 6); }
  // weghippen van een punt, met de vleugels half open
  hop(b, fx, fz, shy) {
    let a = Math.atan2(b.x - fx, b.z - fz);
    for (const da of [0, 0.9, -0.9]) {
      const x = b.x + Math.sin(a + da) * 7, z = b.z + Math.cos(a + da) * 7;
      if (height(x, z) > 0.2) { b.sub = 'hop'; b.to = { x, z }; b.shy = Math.max(b.shy, shy); b.idle = 0; return; }
    }
    this.takeoff(b, 15);
  }

  update(dt, t) {
    if (!this.on) return;
    const src = this.source && this.source.meat > 0 && this.source.open !== false ? this.source : null;
    if (src) { const q = src.body || src; this.center.set(q.x, height(q.x, q.z), q.z); }
    const C = this.center, want = src ? this.birds.length : this.bones ? 1 : 0;
    const canLand = Math.hypot(SKY.x - C.x, SKY.z - C.z) > 16;
    let eating = 0;
    for (const b of this.birds) {
      const active = this.active(b.i);
      b.wait -= dt;
      if (b.state === 'roost') { if (active) this.takeoff(b, 6); else this.roost(b, dt, t); }
      else if (b.state === 'fly') this.fly(b, dt, t, active, canLand && b.i < want, src);
      else if (this.walk(b, dt, t, active && b.i < want, src) && src) eating++;
    }
    // samen eten ze het karkas leeg: een stuk vlees per vijf minuten per gier, van een reus doen ze langer
    if (eating) { this.eatT += dt * eating; if (this.eatT > (src.body ? 600 : 300)) { this.eatT = 0; src.meat--; } }
  }

  fly(b, dt, t, active, mayLand, src) {
    const C = this.center, g = b.fr.root;
    if (b.final) {
      // het laatste stuk: recht naar de plek, de vleugels breed en de poten naar voren
      const F = b.final, A = b.anchor; F.t += dt / 1.6;
      const k = Math.min(1, F.t), e = 1 - (1 - k) * (1 - k);
      b.x = F.x + (A.x - F.x) * e; b.z = F.z + (A.z - F.z) * e; b.y = F.y + (A.y + 0.25 - F.y) * e;
      b.yaw = turnTo(b.yaw, Math.atan2(A.x - F.x, A.z - F.z), dt * 3);
      b.fr.current.time = (b.fr.current.time + dt * 2.4) % 2.5;
      g.position.set(b.x, b.y, b.z); g.rotation.set(-0.5 * k, b.yaw, 0); g.scale.setScalar(SPAN[0]);
      b.fr.update(0);
      if (k >= 1) this.settle(b, A.roost ? 'roost' : 'ground');
      return;
    }
    // waar wil hij heen?
    if (!active && b.goal !== 'perch') { this.free(b); b.anchor = this.perchFor(b); if (b.anchor) b.goal = 'perch'; }
    else if (active && b.goal === 'perch') { this.free(b); b.goal = 'soar'; }
    else if (active && b.goal === 'soar' && mayLand && b.wait <= 0 && Math.hypot(b.cx - C.x, b.cz - C.z) < 3) { b.anchor = this.spot(b, src && src.body ? 3.4 : 1.7); if (b.anchor) b.goal = 'land'; }
    else if (b.goal === 'land' && (!mayLand || Math.hypot(b.anchor.cx - C.x, b.anchor.cz - C.z) > 4)) { b.anchor = null; b.goal = 'soar'; b.wait = 10; }
    const A = b.goal === 'soar' ? null : b.anchor;
    const tx = A ? A.x : C.x, tz = A ? A.z : C.z, tr = A ? 3 : b.r0, ty = A ? A.y + 2.6 : C.y + b.h0 + Math.sin(t * 0.5 + b.i * 1.6) * 1.2;
    // zijn eigen cirkel schuift mee naar het doel: zo vliegt hij erheen in plaats van te verspringen
    const cd = Math.hypot(tx - b.cx, tz - b.cz), cs = Math.min(cd, dt * 5);
    if (cd > 0.001) { b.cx += (tx - b.cx) / cd * cs; b.cz += (tz - b.cz) / cd * cs; }
    b.r = toward(b.r, tr, dt * 1.3);
    const ox = b.x, oz = b.z, da = Math.min(1.3, Math.max(0.2, b.v / b.r));
    b.a += dt * da;
    b.x = b.cx + Math.cos(b.a) * b.r; b.z = b.cz + Math.sin(b.a) * b.r;
    const floor = height(b.x, b.z);
    b.y = Math.max(toward(b.y, ty, dt * (ty > b.y ? 2 : 2.4)), Math.min(ty, floor + 2));
    if (A && cd < 0.5 && b.r < 3.3 && b.y < A.y + 3.2) b.final = { x: b.x, y: b.y, z: b.z, t: 0 };
    const mx = b.x - ox, mz = b.z - oz;
    if (mx * mx + mz * mz > 1e-8) b.yaw = turnTo(b.yaw, Math.atan2(mx, mz), dt * 4);
    // meestal zweven ze op de warme lucht; af en toe twee trage vleugelslagen. Klimmen en dalen kost wel slagen
    b.burst -= dt;
    const low = b.y - floor < 9;
    if (b.burst > 0 || (A && low)) b.fr.current.time = (b.fr.current.time + dt * 1.7) % 2.5;
    else { b.flap -= dt; if (b.flap < -5) b.flap = 6 + Math.random() * 9; b.fr.current.time = b.flap < 0 ? -b.flap % 2.5 : 0; }
    g.position.set(b.x, b.y, b.z); g.rotation.set(b.burst > 0 ? -0.25 : 0, b.yaw, Math.min(0.5, da * 0.8) + Math.sin(t * 0.7 + b.a) * 0.06);
    g.scale.setScalar(SPAN[0] + (SPAN[1] - SPAN[0]) * Math.max(0, Math.min(1, (b.y - floor - 2) / 12)));
    b.fr.update(0);
  }

  // op de grond: lopen, eten, opkijken, weghippen. Geeft terug of hij nu eet
  walk(b, dt, t, stay, src) {
    const C = this.center, px = SKY.x - b.x, pz = SKY.z - b.z, pd = Math.hypot(px, pz);
    if (!stay || Math.hypot(b.home.cx - C.x, b.home.cz - C.z) > 4) { this.takeoff(b, 4); return false; }
    if (pd < 4.5) { this.takeoff(b, 20); return false; }
    if (pd < (SKY.sneak ? 5.5 : 9.5) && b.sub !== 'hop') this.hop(b, SKY.x, SKY.z, 3);
    if (b.state !== 'ground') return false;
    let eT = 0, wT = 0, hyT = 0, eats = false;
    if (b.sub === 'walk' || b.sub === 'hop') {
      const hop = b.sub === 'hop', dx = b.to.x - b.x, dz = b.to.z - b.z, d = Math.hypot(dx, dz), sp = hop ? 3.4 : 0.9;
      b.yaw = turnTo(b.yaw, Math.atan2(dx, dz), dt * (hop ? 9 : 4));
      if (d > 0.2) { const s = Math.min(d, sp * dt); b.x += dx / d * s; b.z += dz / d * s; b.step += dt * (hop ? 9 : 7); }
      else if (hop) { b.sub = 'wait'; b.idle = 0; }
      else { b.sub = b.to === b.home.eat ? 'eat' : 'wait'; b.idle = 0; }
      b.hopY = hop ? Math.abs(Math.sin(b.step)) * 0.32 : 0; wT = hop ? 1 : 0;
    } else if (b.sub === 'wait') {
      // op afstand wachten tot je weg bent
      b.yaw = turnTo(b.yaw, Math.atan2(px, pz), dt * 2); b.shy -= dt; b.idle += dt; b.hopY = 0; hyT = Math.sin(t * 0.7 + b.i) * 0.5;
      if (b.shy <= 0 && pd > 14 && Math.hypot(SKY.x - b.home.eat.x, SKY.z - b.home.eat.z) > 11) { b.sub = 'walk'; b.to = b.home.eat; }
      else if (b.idle > 45) { this.takeoff(b, 15); return false; }
    } else {
      // eten: een paar tellen rukken met de kop omlaag, dan even opkijken
      b.yaw = turnTo(b.yaw, Math.atan2(C.x - b.x, C.z - b.z), dt * 2); b.hopY = 0;
      if ((b.ec -= dt) < 0) { b.down = !b.down; b.ec = b.down ? (src ? 2.5 + Math.random() * 3 : 1.5 + Math.random() * 1.5) : (src ? 0.8 + Math.random() * 1.6 : 2 + Math.random() * 4); }
      eT = b.down ? 1 : 0; eats = b.down;
      if (!b.down) hyT = Math.sin(t * 1.3 + b.i * 2) * 0.7;
      // af en toe ruzie om het beste stuk: vleugels uit
      if (src && (b.flare -= dt) < 0) { b.flare = 10 + Math.random() * 16; b.wing = 1.3; if (hear(b, 35)) SKY.sound.squawk(0.5); }
      if (b.wing > 0) { b.wing -= dt; wT = 1; eT = 0.2; }
    }
    b.y = height(b.x, b.z);
    b.e += (eT - b.e) * Math.min(1, dt * 5); b.w += (wT - b.w) * Math.min(1, dt * 6); b.hy += (hyT - b.hy) * Math.min(1, dt * 4);
    this.pose(b, dt, b.e + (b.e > 0.8 ? Math.sin(t * 9 + b.i) * 0.07 : 0), b.sub === 'walk' ? Math.sin(b.step) : 0, 0);
    return eats;
  }

  roost(b, dt, t) {
    // in de boom: stil, de kop tussen de schouders. Ver weg hoeft dat niet elk beeld opnieuw
    b.w += (0 - b.w) * Math.min(1, dt * 3);
    if (b.idle > 3 && Math.hypot(SKY.x - b.x, SKY.z - b.z) > 90) return;
    b.idle += dt;
    this.pose(b, dt, 0, 0, 0.5 + 0.5 * Math.sin(t * 0.21 + b.i * 2));
  }

  // de stand van de staande gier: e = kop omlaag (eten), step = poten, sleep = kop ingetrokken
  pose(b, dt, e, step, sleep) {
    const rig = b.gr, B = rig.B, g = rig.root;
    g.position.set(b.x, b.y + b.hopY, b.z); g.rotation.y = b.yaw; g.updateMatrixWorld(true);
    rig.update(dt);
    const side = rig.side(SIDE), fwd = FWD.set(Math.sin(b.yaw), 0, Math.cos(b.yaw));
    rig.bend(B.body, side, 0.75 * e); rig.bend(B.tail, side, 0.75 * e);
    rig.bend(B.back, side, 0.4 * e); rig.bend(B.neck, side, 0.4 * e + 0.4 * sleep);
    rig.bend(B.head, UP, b.hy);
    rig.bend(B.wl, fwd, 0.9 * b.w); rig.bend(B.wr, fwd, -0.9 * b.w);
    rig.bend(B.ll, side, -0.6 * step); rig.bend(B.lr, side, 0.6 * step);
  }
}
