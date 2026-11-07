import * as THREE from '../lib/three.module.js';
import { height, blockers, WALK, riverDist, tallGrassAt, rng } from './world.js';

const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const shadowAll = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

// Een ledemaat dat draait om zijn bovenkant
function limb(len, r, mat) {
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 6), mat);
  m.position.y = -len / 2; pivot.add(m);
  return pivot;
}

// ---------- de hoofdpersoon: Homo habilis ----------
// Klein (zo'n 1,2 m), lange armen, behaard, nog een beetje voorovergebogen.
export class Hominin {
  constructor(scene) {
    const fur = lam(0x5a3e2b), skin = lam(0x8a6248), dark = lam(0x2a1c14);
    const g = new THREE.Group();
    this.hips = new THREE.Group(); this.hips.position.y = 0.62; g.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.34, 3, 8), fur);
    body.position.y = 0.26; body.scale.set(1, 1, 0.8); this.torso.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), skin);
    belly.position.set(0, 0.2, 0.08); belly.scale.set(1, 1.1, 0.7); this.torso.add(belly);
    this.head = new THREE.Group(); this.head.position.y = 0.6; this.torso.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), fur); skull.scale.set(0.95, 1, 1.05); this.head.add(skull);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), skin); face.position.set(0, -0.03, 0.08); face.scale.set(1, 1, 0.9); this.head.add(face);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skin); muzzle.position.set(0, -0.07, 0.15); muzzle.scale.set(1.2, 0.8, 1); this.head.add(muzzle);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), dark); brow.position.set(0, 0.03, 0.15); this.head.add(brow);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), dark); eye.position.set(s * 0.045, 0, 0.17); this.head.add(eye);
    }
    this.armL = limb(0.42, 0.055, fur); this.armL.position.set(-0.24, 0.44, 0); this.torso.add(this.armL);
    this.armR = limb(0.42, 0.055, fur); this.armR.position.set(0.24, 0.44, 0); this.torso.add(this.armR);
    this.legL = limb(0.42, 0.07, fur); this.legL.position.set(-0.1, 0.02, 0); this.hips.add(this.legL);
    this.legR = limb(0.42, 0.07, fur); this.legR.position.set(0.1, 0.02, 0); this.hips.add(this.legR);
    for (const leg of [this.legL, this.legR]) { const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.2), skin); foot.position.set(0, -0.54, 0.05); leg.add(foot); }
    // wat je in je hand hebt
    this.held = new THREE.Group(); this.held.position.y = -0.55; this.armR.add(this.held);
    shadowAll(g);
    g.scale.setScalar(1.15);
    scene.add(g);
    this.obj = g;
    this.pos = new THREE.Vector3(2, 0, -6);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.phase = 0;
    this.crouch = 0;          // 0 = staan, 1 = gebukt
    this.sneaking = false;
    this.speed = 0;
    this.action = 0;          // korte animatie bij oppakken/eten
  }

  // dir: gewenste looprichting in de wereld (lengte 0..1)
  update(dt, dir, mods) {
    const want = this.sneaking ? 1.6 : dir.length() > 0.85 ? 5.4 : 2.6;
    const max = want * mods.speed * (riverDist(this.pos.x, this.pos.z) < 6 ? 0.45 : 1);
    const target = dir.clone().multiplyScalar(max);
    this.vel.lerp(target, 1 - Math.exp(-dt * 8));
    this.pos.addScaledVector(this.vel, dt);
    // botsen met bomen en rotsen
    for (const b of blockers) {
      const dx = this.pos.x - b.x, dz = this.pos.z - b.z, d = Math.hypot(dx, dz), min = b.r + 0.3;
      if (d < min && d > 0.001) { this.pos.x = b.x + dx / d * min; this.pos.z = b.z + dz / d * min; }
    }
    const lim = WALK - 4;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -lim, lim); this.pos.z = THREE.MathUtils.clamp(this.pos.z, -lim, lim);
    this.pos.y = Math.max(height(this.pos.x, this.pos.z), -0.9);

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.2) {
      const ty = Math.atan2(this.vel.x, this.vel.z);
      let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-dt * 10));
    }
    this.crouch += ((this.sneaking ? 1 : 0) - this.crouch) * (1 - Math.exp(-dt * 8));
    this.phase += dt * (2.2 + this.speed * 1.9) * (this.speed > 0.15 ? 1 : 0);
    this.action = Math.max(0, this.action - dt);
    this.pose(mods);
  }

  pose(mods) {
    const s = Math.min(1, this.speed / 5.4), w = Math.min(1, this.speed / 1.2);
    const sw = Math.sin(this.phase), c = this.crouch;
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
    this.hips.position.y = 0.62 - c * 0.2 + Math.abs(Math.cos(this.phase)) * 0.05 * w;
    this.torso.rotation.x = 0.18 + s * 0.25 + c * 0.55 + (mods.sick ? 0.2 : 0);
    this.torso.rotation.z = mods.sick ? Math.sin(performance.now() / 400) * 0.08 : 0;
    this.head.rotation.x = -(0.12 + s * 0.2 + c * 0.45);
    const amp = (0.55 + s * 0.4) * w * (1 - c * 0.4);
    this.legL.rotation.x = sw * amp - c * 0.6; this.legR.rotation.x = -sw * amp - c * 0.6;
    this.armL.rotation.x = -sw * amp * 0.8 + 0.1; this.armR.rotation.x = sw * amp * 0.8 + 0.1;
    if (this.action > 0) { const a = Math.sin(this.action / 0.5 * Math.PI); this.armR.rotation.x = -1.2 * a; this.torso.rotation.x += 0.5 * a; }
    this.armL.rotation.z = -0.12; this.armR.rotation.z = 0.12;
  }

  // Hoe goed val je op voor een dier? 1 = normaal
  get noticeable() {
    let n = this.sneaking ? 0.35 : 1;
    if (this.speed > 4) n *= 1.6;
    if (this.speed < 0.3) n *= 0.6;
    if (tallGrassAt(this.pos.x, this.pos.z)) n *= this.sneaking ? 0.25 : 0.6;
    return n;
  }
}

// ---------- impala's ----------
function impalaModel(male) {
  const coat = lam(0xa8643a), belly = lam(0xeadcc4), dark = lam(0x2a1c14), back = lam(0x8a4c2a);
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 3, 8), coat);
  body.rotation.x = Math.PI / 2; body.position.y = 0.95; g.add(body);
  const top = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 3, 6), back);
  top.rotation.x = Math.PI / 2; top.position.y = 1.08; top.scale.set(1, 1, 0.6); g.add(top);
  const under = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 3, 6), belly);
  under.rotation.x = Math.PI / 2; under.position.y = 0.84; under.scale.set(1.15, 1, 0.8); g.add(under);
  const neck = new THREE.Group(); neck.position.set(0, 1.08, 0.48); g.add(neck);
  const nm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.45, 3, 6), coat); nm.position.y = 0.25; neck.add(nm);
  neck.rotation.x = 0.45;
  const head = new THREE.Group(); head.position.y = 0.55; neck.add(head);
  const hm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.22, 3, 6), coat); hm.rotation.x = Math.PI / 2 - 0.3; hm.position.z = 0.1; head.add(hm);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), coat); ear.position.set(s * 0.09, 0.1, -0.02); ear.rotation.z = -s * 0.8; head.add(ear);
    if (male) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.5, 5), dark);
      horn.position.set(s * 0.05, 0.28, -0.08); horn.rotation.set(-0.5, 0, -s * 0.2); head.add(horn);
    }
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 5), belly); tail.position.set(0, 1.0, -0.68); tail.rotation.x = -2.4; g.add(tail);
  const legs = [];
  for (const [x, z] of [[-0.15, 0.4], [0.15, 0.4], [-0.15, -0.42], [0.15, -0.42]]) {
    const l = limb(0.7, 0.045, coat); l.position.set(x, 0.85, z); g.add(l); legs.push(l);
  }
  shadowAll(g);
  return { g, neck, head, legs, tail };
}

export class Herd {
  constructor(scene, cx, cz, n) {
    const R = rng(21);
    this.members = [];
    this.alarm = 0;           // 0..1: hoe onrustig de kudde is
    this.fleeing = 0;         // seconden dat de kudde nog vlucht
    this.home = new THREE.Vector2(cx, cz);
    for (let i = 0; i < n; i++) {
      const m = impalaModel(i === 0 || i === 4);
      const a = R() * 6.28, d = R() * 9;
      const it = {
        ...m, x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, yaw: R() * 6.28, speed: 0,
        graze: R() * 4, aware: 0, phase: R() * 6, look: 0, R,
        goal: null,
      };
      m.g.scale.setScalar(0.92 + R() * 0.15);
      scene.add(m.g); this.members.push(it);
    }
  }

  update(dt, player, ui) {
    const p = player.pos, notice = player.noticeable;
    let maxAware = 0;
    for (const m of this.members) {
      const dx = p.x - m.x, dz = p.z - m.z, dist = Math.hypot(dx, dz);
      // zien en horen: dichtbij valt veel meer op
      const range = 34 * notice;
      if (this.fleeing <= 0) {
        if (dist < range) m.aware += dt * (1 - dist / range) * 1.4 * (0.4 + notice);
        else m.aware -= dt * 0.12;
        if (dist < 4) m.aware = 2;
        m.aware = Math.max(0, m.aware);
      }
      maxAware = Math.max(maxAware, m.aware);
    }
    // onrust is besmettelijk: als één schrikt, kijkt de rest op
    if (maxAware > 1 && this.fleeing <= 0) {
      this.fleeing = 7;
      ui.toast('De impala\'s schrikken en vluchten!');
    }
    this.alarm = Math.min(1, maxAware);

    if (this.fleeing > 0) {
      this.fleeing -= dt;
      if (this.fleeing <= 0) {
        // ergens anders tot rust komen
        for (const m of this.members) m.aware = 0;
        this.home.set(this.members[0].x, this.members[0].z);
        ui.toast('De kudde is in de verte weer gaan grazen.');
      }
    }

    for (const m of this.members) {
      const dx = p.x - m.x, dz = p.z - m.z, dist = Math.hypot(dx, dz) || 1;
      let tx = 0, tz = 0, spd = 0, look = 0;
      if (this.fleeing > 0) {
        // weg van de mens, met de kudde mee
        tx = -dx / dist; tz = -dz / dist; spd = 9.5 * Math.min(1, this.fleeing / 2 + 0.3);
        m.graze = 0;
      } else if (m.aware > 0.45) {
        // alert: kop omhoog, kijken naar wat daar beweegt
        look = 1; spd = 0;
        m.yaw = turn(m.yaw, Math.atan2(dx, dz), dt * 3);
      } else {
        // rustig grazen en af en toe een paar stappen
        m.graze -= dt;
        if (!m.goal || m.graze < 0) {
          const a = m.R() * 6.28, d = m.R() * 10;
          m.goal = { x: this.home.x + Math.cos(a) * d, z: this.home.y + Math.sin(a) * d };
          m.graze = 3 + m.R() * 6;
        }
        const gx = m.goal.x - m.x, gz = m.goal.z - m.z, gd = Math.hypot(gx, gz);
        if (gd > 0.8 && m.graze < 2.5) { tx = gx / gd; tz = gz / gd; spd = 1.1; }
        look = m.aware > 0.2 ? 0.6 : 0;
      }
      // niet op elkaar lopen
      for (const o of this.members) if (o !== m) {
        const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz);
        if (od < 1.6 && od > 0.01) { m.x += ox / od * (1.6 - od) * 0.5; m.z += oz / od * (1.6 - od) * 0.5; }
      }
      m.speed += (spd - m.speed) * (1 - Math.exp(-dt * 5));
      if (spd > 0) m.yaw = turn(m.yaw, Math.atan2(tx, tz), dt * (this.fleeing > 0 ? 6 : 2));
      m.x += Math.sin(m.yaw) * m.speed * dt; m.z += Math.cos(m.yaw) * m.speed * dt;
      const lim = WALK - 10; m.x = THREE.MathUtils.clamp(m.x, -lim, lim); m.z = THREE.MathUtils.clamp(m.z, -lim, lim);
      // niet de rivier in
      if (riverDist(m.x, m.z) < 7) { m.z += (m.z > 0 ? 1 : -1) * dt * 4; }
      m.look += (look - m.look) * (1 - Math.exp(-dt * 6));
      this.pose(m, dt);
    }
  }

  pose(m, dt) {
    const y = height(m.x, m.z);
    m.phase += dt * (m.speed > 4 ? 11 : 5) * (m.speed > 0.2 ? 1 : 0);
    const gallop = m.speed > 4, eating = m.speed < 0.2 && m.look < 0.3;
    m.g.position.set(m.x, y + (gallop ? Math.abs(Math.sin(m.phase)) * 0.35 : 0), m.z);
    m.g.rotation.y = m.yaw;
    m.g.rotation.x = gallop ? Math.sin(m.phase) * 0.12 : 0;
    // kop omlaag om te grazen, omhoog als hij oplet
    const graze = eating ? 1 : 0;
    m.neck.rotation.x += ((graze ? 2.2 : 0.35 - m.look * 0.3) - m.neck.rotation.x) * (1 - Math.exp(-dt * 4));
    m.head.rotation.x = graze ? -0.2 + Math.sin(performance.now() / 300 + m.phase) * 0.15 : 0;
    const a = gallop ? 0.9 : 0.45;
    m.legs[0].rotation.x = Math.sin(m.phase) * a * Math.min(1, m.speed);
    m.legs[1].rotation.x = Math.sin(m.phase + (gallop ? 0.3 : Math.PI)) * a * Math.min(1, m.speed);
    m.legs[2].rotation.x = Math.sin(m.phase + (gallop ? Math.PI : Math.PI)) * a * Math.min(1, m.speed);
    m.legs[3].rotation.x = Math.sin(m.phase + (gallop ? Math.PI + 0.3 : 0)) * a * Math.min(1, m.speed);
    m.tail.rotation.x = -2.4 + (m.look > 0.5 || gallop ? 1.2 : Math.sin(performance.now() / 200) * 0.2);
  }
}

function turn(a, b, k) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * Math.min(1, k); }

// ---------- gieren die boven een karkas cirkelen ----------
export class Vultures {
  constructor(scene, x, z) {
    this.center = new THREE.Vector3(x, height(x, z), z);
    this.birds = [];
    const mat = lam(0x3a2e26), neckMat = lam(0xd8c0a8);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.6, 3, 6), mat); body.rotation.x = Math.PI / 2; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), neckMat); head.position.z = 0.6; g.add(head);
      const wings = [];
      for (const s of [-1, 1]) {
        const w = new THREE.Group(); w.position.x = s * 0.15;
        const wm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.6), mat); wm.position.x = s * 0.8; w.add(wm);
        g.add(w); wings.push(w);
      }
      g.scale.setScalar(1.4);
      scene.add(g);
      this.birds.push({ g, wings, a: i / 4 * 6.28, r: 7 + i * 2.5, h: 18 + i * 3, sp: 0.25 + i * 0.04 });
    }
  }
  update(dt, t) {
    for (const b of this.birds) {
      b.a += dt * b.sp;
      b.g.position.set(this.center.x + Math.cos(b.a) * b.r, this.center.y + b.h + Math.sin(t * 0.5 + b.a) * 1.2, this.center.z + Math.sin(b.a) * b.r);
      b.g.rotation.set(0, -b.a, 0.35);
      for (const [k, w] of b.wings.entries()) w.rotation.z = (k ? -1 : 1) * (0.08 + Math.sin(t * 1.3 + b.a * 3) * 0.06);
    }
  }
}

// Een karkas van een zebra: alleen nog botten en wat vel
export function carcass(scene, x, z) {
  const g = new THREE.Group(), bone = lam(0xe8dcc0), hide = lam(0x6a4a34);
  const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 1.4, 2, 5), bone); spine.rotation.z = Math.PI / 2; spine.position.y = 0.35; g.add(spine);
  for (let i = 0; i < 7; i++) {
    for (const s of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 4, 8, Math.PI * 0.8), bone);
      rib.position.set(-0.5 + i * 0.16, 0.32, 0); rib.rotation.set(0, Math.PI / 2, s > 0 ? 0.2 : Math.PI - 0.2); g.add(rib);
    }
  }
  const skull = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 3, 6), bone); skull.rotation.z = Math.PI / 2 - 0.3; skull.position.set(1.05, 0.15, 0.1); g.add(skull);
  const skin = new THREE.Mesh(new THREE.CircleGeometry(0.9, 7), hide); skin.rotation.x = -Math.PI / 2; skin.position.set(0.2, 0.03, 0.5); g.add(skin);
  g.position.set(x, height(x, z), z); g.rotation.y = 0.6;
  shadowAll(g);
  scene.add(g);
  return g;
}
