import * as THREE from '../lib/three.module.js';
import { height, blockers, WALK, riverDist, tallGrassAt, rng, WIND, mergeStatic } from './world.js';
import { rimify } from './hominin.js';

// losse onderdelen die samen bewegen, samenvoegen tot één stuk
const merged = (...parts) => { const g = new THREE.Group(); parts.forEach((p) => g.add(p)); return mergeStatic(g); };

const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

// De hoofdpersoon staat in hominin.js
export { Hominin } from './hominin.js';

// ---------- impala's ----------
// Glad, met randlicht, net als de hoofdpersoon. Eén materiaal voor alle impala's; de kleur zit in de hoekpunten.
const IMP = rimify(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8, metalness: 0 }), 0xffd8a0, 0.4);
// onderdelen met elk hun eigen kleur samenvoegen tot één stuk
function vc(...parts) { const m = merged(...parts); m.material = IMP; m.castShadow = true; m.receiveShadow = false; return m; }
const P = (color, geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); return m;
};
const SPH = (r) => new THREE.SphereGeometry(r, 12, 9);
const COAT = 0xc0703c, FLANK = 0xd8a06a, BELLY = 0xf4ece0, DARK = 0x1e140e, BACK = 0x9a5028, HOOF = 0x2a2018;

// Een poot in twee delen: boven (draait aan het lijf) en onder (de knie of hak), met een hoefje
function legParts(color, upLen, loLen, thick) {
  const hip = new THREE.Group();
  hip.add(vc(P(color, new THREE.CylinderGeometry(thick, thick * 0.6, upLen, 8), 0, -upLen / 2, 0), P(color, SPH(thick * 1.25), 0, -0.02, 0, 1, 1.6, 1.2)));
  const knee = new THREE.Group(); knee.position.y = -upLen; hip.add(knee);
  knee.add(vc(P(color, new THREE.CylinderGeometry(thick * 0.5, thick * 0.38, loLen, 6), 0, -loLen / 2, 0), P(color, SPH(thick * 0.55), 0, 0, 0),
    P(HOOF, new THREE.CylinderGeometry(thick * 0.42, thick * 0.5, 0.06, 6), 0, -loLen - 0.02, 0.01)));
  return { hip, knee };
}

function impalaModel(male) {
  const g = new THREE.Group();
  // lijf: drie kleuren zoals een echte impala (rood-bruine rug, lichte flanken, witte buik) en zwarte strepen achter
  g.add(vc(
    P(BACK, SPH(0.27), 0, 1.04, 0.0, 0.9, 0.85, 2.15),
    P(FLANK, SPH(0.27), 0, 0.96, 0.0, 0.98, 0.8, 2.05),
    P(COAT, SPH(0.24), 0, 1.0, 0.36, 1, 1.05, 1.1), P(COAT, SPH(0.25), 0, 1.0, -0.36, 1, 1.05, 1.15),
    P(BELLY, SPH(0.22), 0, 0.86, 0, 1, 0.6, 1.9),
    ...[-1, 1].map((k) => P(DARK, new THREE.BoxGeometry(0.02, 0.3, 0.035), k * 0.2, 0.95, -0.5, 1, 1, 1, 0.15, 0, 0)),
  ));
  // nek en kop
  const neck = new THREE.Group(); neck.position.set(0, 1.1, 0.52); g.add(neck);
  neck.add(vc(P(COAT, new THREE.CylinderGeometry(0.075, 0.12, 0.5, 8), 0, 0.25, 0), P(COAT, SPH(0.11), 0, 0.02, 0, 1, 1, 1.1),
    P(BELLY, new THREE.CylinderGeometry(0.05, 0.08, 0.4, 6), 0, 0.22, 0.05)));
  neck.rotation.x = 0.45;
  const head = new THREE.Group(); head.position.y = 0.52; neck.add(head);
  const hp = [
    P(COAT, SPH(0.09), 0, 0, 0, 0.95, 0.95, 1.1), P(COAT, new THREE.CylinderGeometry(0.045, 0.07, 0.24, 8), 0, -0.02, 0.15, 1, 1, 1, Math.PI / 2 - 0.25, 0, 0),
    ...[-1, 1].map((k) => P(COAT, SPH(0.06), k * 0.08, 0.1, -0.03, 0.35, 1.5, 0.6, 0, 0, -k * 0.6)),
    P(DARK, SPH(0.03), 0, -0.04, 0.27, 1.1, 0.8, 0.8),
    ...[-1, 1].map((k) => P(DARK, SPH(0.018), k * 0.06, 0.03, 0.07)),
    ...[-1, 1].map((k) => P(DARK, SPH(0.02), k * 0.12, 0.18, -0.03, 0.4, 0.8, 0.5)),
    ...[-1, 1].map((k) => P(BELLY, SPH(0.026), k * 0.06, 0.035, 0.06, 1, 0.8, 0.5)),
  ];
  if (male) {
    // lier-vormige hoorns met ribbels
    for (const k of [-1, 1]) for (let i = 0; i < 6; i++) {
      const t = i / 5;
      hp.push(P(DARK, new THREE.CylinderGeometry(0.018 * (1 - t * 0.6), 0.022 * (1 - t * 0.5), 0.09, 5), k * (0.04 + Math.sin(t * 3) * 0.05), 0.12 + t * 0.4, -0.06 - t * 0.12 + Math.sin(t * 4) * 0.04, 1, 1, 1, -0.4 + t * 0.6, 0, -k * (0.25 - t * 0.5)));
    }
  }
  head.add(vc(...hp));
  const tail = new THREE.Group(); tail.position.set(0, 1.08, -0.62); g.add(tail);
  tail.add(vc(P(BELLY, new THREE.CylinderGeometry(0.04, 0.03, 0.28, 6), 0, -0.14, 0), P(DARK, new THREE.BoxGeometry(0.015, 0.22, 0.03), 0, -0.15, -0.025)));
  tail.rotation.x = -2.4;
  const legs = [];
  for (const [x, z, hind] of [[-0.14, 0.42, 0], [0.14, 0.42, 0], [-0.14, -0.42, 1], [0.14, -0.42, 1]]) {
    const L = legParts(hind ? COAT : FLANK, hind ? 0.44 : 0.4, hind ? 0.42 : 0.44, hind ? 0.075 : 0.06);
    L.hip.position.set(x, 0.92, z); L.hind = hind; g.add(L.hip); legs.push(L);
  }
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
      // ruiken: waait de wind van jou naar het dier, dan ruikt het je van ver
      const smell = dist < 48 && ((m.x - p.x) * WIND.x + (m.z - p.z) * WIND.z) / dist > 0.6;
      if (this.fleeing <= 0) {
        if (dist < range) m.aware += dt * (1 - dist / range) * 1.4 * (0.4 + notice);
        if (smell) { m.aware += dt * (1 - dist / 48) * 0.9; m.smelled = true; }
        if (dist >= range && !smell) m.aware -= dt * 0.12;
        if (dist < 4) m.aware = 2;
        m.aware = Math.max(0, m.aware);
      }
      maxAware = Math.max(maxAware, m.aware);
    }
    // onrust is besmettelijk: als één schrikt, kijkt de rest op
    if (maxAware > 1 && this.fleeing <= 0) {
      this.fleeing = 7;
      // hebben ze je geroken, of gezien?
      const first = this.members.reduce((a, b) => (b.aware > a.aware ? b : a));
      const seen = Math.hypot(p.x - first.x, p.z - first.z) < 34 * notice;
      ui.flee(!seen && first.smelled);
    }
    this.alarm = Math.min(1, maxAware);

    if (this.fleeing > 0) {
      this.fleeing -= dt;
      if (this.fleeing <= 0) {
        // ergens anders tot rust komen
        for (const m of this.members) { m.aware = 0; m.smelled = false; }
        this.home.set(this.members[0].x, this.members[0].z);
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
    // vier poten met knieën: in galop gaan de voorpoten en achterpoten samen
    const off = gallop ? [0, 0.3, Math.PI, Math.PI + 0.3] : [0, Math.PI, Math.PI, 0];
    const mv = Math.min(1, m.speed);
    m.legs.forEach((L, i) => {
      const p = m.phase + off[i], sw = Math.sin(p) * a * mv;
      L.hip.rotation.x = sw + (L.hind ? 0.12 : -0.05);
      // voorpoot buigt naar achteren bij het optillen, achterpoot (hak) naar voren
      const lift = Math.max(0, Math.cos(p)) * (gallop ? 1.3 : 0.8) * mv;
      L.knee.rotation.x = L.hind ? -0.25 - lift * 0.6 : 0.05 + lift;
    });
    // staart omhoog bij gevaar (de witte onderkant als waarschuwing)
    m.tail.rotation.x = -2.4 + (m.look > 0.5 || gallop ? 1.4 : Math.sin(performance.now() / 200) * 0.2);
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
  const m = mergeStatic(g);
  m.position.set(x, height(x, z), z); m.rotation.y = 0.6;
  scene.add(m);
  return m;
}
