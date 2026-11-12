import * as THREE from '../lib/three.module.js';
import { height, blockers, WALK, riverDist, awayZ, tallGrassAt, rng, WIND, mergeStatic } from './world.js';
import { rimify } from './hominin.js';
import { Rig } from './rig.js';

// losse onderdelen die samen bewegen, samenvoegen tot één stuk
const merged = (...parts) => { const g = new THREE.Group(); parts.forEach((p) => g.add(p)); return mergeStatic(g); };

const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

// De hoofdpersoon staat in hominin.js
export { Hominin } from './hominin.js';

// ---------- impala's ----------
// Glad, met randlicht, net als de hoofdpersoon. Eén materiaal voor alle impala's; de kleur zit in de hoekpunten.
const IMP = rimify(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8, metalness: 0 }), 0xffd8a0, 0.4);
// onderdelen met elk hun eigen kleur samenvoegen tot één stuk
export function vc(...parts) { const m = merged(...parts); m.material = IMP; m.castShadow = true; m.receiveShadow = false; return m; }
export const P = (color, geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); return m;
};
export const SPH = (r) => new THREE.SphereGeometry(r, 12, 9);
const COAT = 0xc0703c, FLANK = 0xd8a06a, BELLY = 0xf4ece0, DARK = 0x1e140e, BACK = 0x9a5028, HOOF = 0x2a2018;

// Een poot in twee delen: boven (draait aan het lijf) en onder (de knie of hak), met een hoefje
export function legParts(color, upLen, loLen, thick) {
  const hip = new THREE.Group();
  hip.add(vc(P(color, new THREE.CylinderGeometry(thick, thick * 0.6, upLen, 8), 0, -upLen / 2, 0), P(color, SPH(thick * 1.25), 0, -0.02, 0, 1, 1.6, 1.2)));
  const knee = new THREE.Group(); knee.position.y = -upLen; hip.add(knee);
  knee.add(vc(P(color, new THREE.CylinderGeometry(thick * 0.5, thick * 0.38, loLen, 6), 0, -loLen / 2, 0), P(color, SPH(thick * 0.55), 0, 0, 0),
    P(HOOF, new THREE.CylinderGeometry(thick * 0.42, thick * 0.5, 0.06, 6), 0, -loLen - 0.02, 0.01)));
  return { hip, knee };
}

export class Herd {
  // persist: deze kudde kun je moe lopen. Een antilope raakt haar warmte alleen kwijt door stil te staan en te hijgen;
  // wie haar in de middaghitte steeds weer opjaagt, krijgt haar op den duur tot stilstand.
  constructor(scene, cx, cz, n, A, { persist = false } = {}) {
    const R = rng(21);
    this.members = [];
    this.persist = persist; this.heat = 0;   // 0..1: hoe verhit de kudde is
    this.spent = null;        // de gazelle die niet meer kan
    this.kill = null;         // waar een gedode gazelle ligt, en hoeveel vlees eraan zit
    this.told = {};
    this.alarm = 0;           // 0..1: hoe onrustig de kudde is
    this.fleeing = 0;         // seconden dat de kudde nog vlucht
    this.home = new THREE.Vector2(cx, cz);
    for (let i = 0; i < n; i++) {
      // echt model (kenchoo, CC BY 4.0); het kan alleen stilstaan, de poten laten we zelf bewegen
      const rig = new Rig(A, 'gazelle', { scale: 0.21 * (0.92 + R() * 0.15) });
      const b = (n) => rig.bone(n);
      const m = {
        g: rig.root, rig, side: new THREE.Vector3(), grz: 0,
        neckB: b('Neck_'), neck2B: b('Neck.001'),
        legs: [['FrontLeg.L', 'FrontLowLeg.L', 0], ['FrontLeg.R', 'FrontLowLeg.R', 0], ['BackLeg.L', 'BackLowLeg.L', 1], ['BackLeg.R', 'BackLowLeg.R', 1]]
          .map(([t, l, hind]) => ({ top: b(t), low: b(l), hind })),
      };
      rig.play('Animation', { fade: 0 }); rig.action('Animation').time = R() * 10;
      const a = R() * 6.28, d = R() * 9;
      const it = {
        ...m, x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, yaw: R() * 6.28, speed: 0,
        graze: R() * 4, aware: 0, phase: R() * 6, look: 0, R,
        goal: null,
      };
      scene.add(m.g); this.members.push(it);
    }
  }

  update(dt, player, ui) {
    const p = player.pos, notice = player.noticeable;
    let maxAware = 0;
    for (const m of this.members) {
      const dx = p.x - m.x, dz = p.z - m.z, dist = Math.hypot(dx, dz);
      // zien en horen: dichtbij valt veel meer op
      const range = player.hiddenFrom(m.x, m.z) ? 0 : 34 * notice;
      // ruiken: waait de wind van jou naar het dier, dan ruikt het je van ver
      const smell = dist < 48 && ((m.x - p.x) * WIND.x + (m.z - p.z) * WIND.z) / dist > 0.6;
      if (this.fleeing <= 0) {
        if (dist < range) m.aware += dt * (1 - dist / range) * 1.4 * (0.4 + notice);
        if (smell) { m.aware += dt * (1 - dist / 48) * 0.9; m.smelled = true; }
        if (dist >= range && !smell) m.aware -= dt * 0.12;
        if (dist < 4 && range > 0) m.aware = 2;
        m.aware = Math.max(0, m.aware);
      }
      maxAware = Math.max(maxAware, m.aware);
    }
    // onrust is besmettelijk: als één schrikt, kijkt de rest op
    if (maxAware > 1 && this.fleeing <= 0) {
      this.fleeing = 7 - 3 * this.heat;
      // hebben ze je geroken, of gezien?
      const first = this.members.reduce((a, b) => (b.aware > a.aware ? b : a));
      const seen = Math.hypot(p.x - first.x, p.z - first.z) < 34 * notice;
      ui.flee(!seen && first.smelled);
    }
    this.alarm = Math.min(1, maxAware);

    if (this.persist) this.heatTick(dt, player, ui);
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
      if (m.down > 0) {
        // op: ze staat te trillen op haar poten en zakt door de knieën
        m.down -= dt; m.speed = 0; m.aware = 0; look = 0.2;
        if (m.down <= 0) { this.spent = null; this.heat = 0.55; ui.spent(false); }
      } else if (this.fleeing > 0) {
        // weg van de mens, met de kudde mee; bij de rand van het dal buigen ze af naar het open veld
        tx = -dx / dist; tz = -dz / dist;
        const edge = THREE.MathUtils.smoothstep(Math.max(Math.abs(m.x), Math.abs(m.z)), WALK - 60, WALK - 15), wet = THREE.MathUtils.smoothstep(22 - riverDist(m.x, m.z), 0, 14);
        if (edge > 0) { const d = Math.hypot(m.x, m.z) || 1; tx -= m.x / d * edge * 2.2; tz -= m.z / d * edge * 2.2; }
        if (wet > 0) tz += awayZ(m.x, m.z) * wet * 2;
        const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        // hoe heter, hoe trager; wie achterblijft is het eerst op
        spd = 9.5 * Math.min(1, this.fleeing / 2 + 0.3) * (1 - 0.5 * this.heat * (m === this.weak ? 1.25 : 1));
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
      if (riverDist(m.x, m.z) < 7) { m.z += awayZ(m.x, m.z) * dt * 4; }
      m.look += (look - m.look) * (1 - Math.exp(-dt * 6));
      this.pose(m, dt);
    }
  }

  // Warmte: rennen maakt heet, stilstaan koelt af. In de koelte van de ochtend en de avond loopt het nooit hoog op.
  heatTick(dt, player, ui) {
    if (this.spent) return;
    const hot = ui.hot(), was = this.heat;
    if (this.fleeing > 0) {
      this.heat = Math.min(1, this.heat + dt * (hot ? 0.046 : 0.014));
      if (!hot && !this.told.cool) { this.told.cool = true; ui.tired(-1); }
    } else this.heat = Math.max(0, this.heat - dt * (hot ? 0.004 : 0.03));
    if (!this.weak) this.weak = this.members[this.members.length - 1];
    if (was < 0.35 && this.heat >= 0.35) ui.tired(0);
    if (was < 0.7 && this.heat >= 0.7) ui.tired(1);
    if (this.heat >= 1 && this.fleeing > 0) {
      // de zwakste blijft staan; de rest rent door
      const m = this.weak; m.down = 45; this.spent = m; ui.spent(true);
    }
  }
  // een klap op de gazelle die niet meer kan
  strike(m) {
    if (m !== this.spent || m.dead) return false;
    m.dead = true; m.down = 0; this.spent = null; this.weak = null; this.heat = 0.3;
    this.members.splice(this.members.indexOf(m), 1); this.dead = m;
    this.kill = { x: m.x, z: m.z, meat: 4 };
    m.g.rotation.set(0, m.yaw, Math.PI / 2 * 0.94); m.g.position.y = height(m.x, m.z) + 0.16;
    return true;
  }

  pose(m, dt) {
    const y = height(m.x, m.z);
    if (m.down > 0) {
      // door de voorpoten gezakt, flanken die op en neer gaan
      m.sink = Math.min(1, (m.sink || 0) + dt * 1.2);
      m.g.position.set(m.x, y - 0.2 * m.sink, m.z); m.g.rotation.set(0.16 * m.sink, m.yaw, Math.sin(m.phase += dt * 14) * 0.025);
      m.rig.update(dt); return;
    }
    m.sink = 0;
    m.phase += dt * (m.speed > 4 ? 10 : 5.5) * (m.speed > 0.2 ? 1 : 0);
    const gallop = m.speed > 4, eating = m.speed < 0.2 && m.look < 0.3;
    m.g.position.set(m.x, y + (gallop ? Math.abs(Math.sin(m.phase)) * 0.22 : 0), m.z);
    m.g.rotation.y = m.yaw;
    m.g.rotation.x = gallop ? Math.sin(m.phase) * 0.08 : 0;
    m.rig.update(dt);   // eerst de eigen animatie: kop, oren, ademen
    const side = m.rig.side(m.side);
    // kop omlaag om te grazen, omhoog als hij oplet
    m.grz += ((eating ? 1 : 0) - m.grz) * (1 - Math.exp(-dt * 3));
    m.rig.bend(m.neckB, side, m.grz * 1.0 - m.look * 0.25);
    m.rig.bend(m.neck2B, side, m.grz * 0.5);
    // vier poten: in galop gaan de voorpoten en achterpoten samen
    const a = gallop ? 0.75 : 0.4, mv = Math.min(1, m.speed);
    const off = gallop ? [0, 0.3, Math.PI, Math.PI + 0.3] : [0, Math.PI, Math.PI, 0];
    m.legs.forEach((L, i) => {
      const p = m.phase + off[i];
      m.rig.bend(L.top, side, Math.sin(p) * a * mv);
      // voorpoot buigt naar achteren bij het optillen, achterpoot (hak) naar voren
      const lift = Math.max(0, Math.cos(p)) * (gallop ? 1.2 : 0.7) * mv;
      m.rig.bend(L.low, side, L.hind ? -lift * 0.7 : lift);
    });
  }
}

export function turn(a, b, k) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * Math.min(1, k); }

// ---------- gieren die boven een karkas cirkelen ----------
export class Vultures {
  constructor(scene, x, z, A) {
    this.center = new THREE.Vector3(x, height(x, z), z);
    this.birds = [];
    for (let i = 0; i < 4; i++) {
      const rig = new Rig(A, 'vulture', { scale: 1.1, facing: Math.PI }), g = rig.root;
      rig.model.traverse((o) => { if (o.isMesh) { o.receiveShadow = false; o.castShadow = false; } });   // ze cirkelen hoog: hun schaduw valt nergens in beeld
      rig.play('Armature', { speed: 0 });
      scene.add(g);
      this.birds.push({ g, rig, a: i / 4 * 6.28, r: 7 + i * 2.5, h: 18 + i * 3, sp: 0.25 + i * 0.04, flap: 3 + i * 3.1 });
    }
  }
  update(dt, t) {
    for (const b of this.birds) {
      b.a += dt * b.sp;
      b.g.position.set(this.center.x + Math.cos(b.a) * b.r, this.center.y + b.h + Math.sin(t * 0.5 + b.a) * 1.2, this.center.z + Math.sin(b.a) * b.r);
      b.g.rotation.set(0, -b.a, 0.35 + Math.sin(t * 0.7 + b.a) * 0.06);
      // meestal zweven ze op de warme lucht; af en toe twee trage vleugelslagen
      b.flap -= dt; if (b.flap < -5) b.flap = 6 + Math.random() * 9;
      b.rig.current.time = b.flap < 0 ? -b.flap % 2.5 : 0;
      if (b.g.visible) b.rig.update(0);
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
