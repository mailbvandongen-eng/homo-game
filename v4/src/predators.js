import * as THREE from '../lib/three.module.js';
import { height, WALK, riverDist, rng } from './world.js';
import { vc, P, SPH, legParts, turn } from './actors.js';

const R = rng(55);

// ---------- modellen ----------
// Gevlekte hyena: hoge schouders, lage achterkant, ronde oren, donkere snuit en vlekken
function hyenaModel() {
  const TAN = 0xb89a6a, SPOT = 0x3a2a1e, MUZ = 0x2a1e16, MANE = 0x6a5440;
  const g = new THREE.Group();
  const spots = [];
  for (let i = 0; i < 18; i++) {
    const t = R() * 2 - 1, a = R() * 2.4 - 1.2, side = R() < 0.5 ? -1 : 1;
    spots.push(P(SPOT, SPH(0.035), side * Math.cos(a) * 0.21, 0.72 + Math.sin(a) * 0.17 + t * 0.06, t * 0.42, 0.5, 1, 1));
  }
  const body = new THREE.Group(); g.add(body);
  body.add(vc(
    P(TAN, SPH(0.24), 0, 0.72, 0, 0.9, 0.85, 1.9),
    P(TAN, SPH(0.25), 0, 0.8, 0.3, 1, 1.05, 1.05), P(TAN, SPH(0.21), 0, 0.64, -0.36, 1, 1, 1.05),
    P(MANE, new THREE.BoxGeometry(0.05, 0.08, 0.55), 0, 1.0, 0.2, 1, 1, 1, -0.2, 0, 0),
    ...spots,
  ));
  body.rotation.x = -0.12;   // voor hoger dan achter
  const neck = new THREE.Group(); neck.position.set(0, 0.9, 0.48); g.add(neck);
  neck.add(vc(P(TAN, new THREE.CylinderGeometry(0.11, 0.15, 0.32, 8), 0, 0.12, 0.04, 1, 1, 1, 0.9, 0, 0), P(MANE, new THREE.BoxGeometry(0.05, 0.08, 0.3), 0, 0.2, -0.02, 1, 1, 1, 0.9, 0, 0)));
  const head = new THREE.Group(); head.position.set(0, 0.18, 0.2); neck.add(head);
  head.add(vc(
    P(TAN, SPH(0.13), 0, 0, 0, 1, 0.95, 1.05),
    P(MUZ, new THREE.CylinderGeometry(0.06, 0.09, 0.2, 8), 0, -0.04, 0.16, 1, 1, 1, Math.PI / 2, 0, 0),
    P(MUZ, SPH(0.04), 0, -0.02, 0.26),
    ...[-1, 1].map((k) => P(TAN, SPH(0.06), k * 0.1, 0.11, -0.03, 0.9, 1, 0.35)),
    ...[-1, 1].map((k) => P(MUZ, SPH(0.018), k * 0.06, 0.04, 0.1)),
  ));
  const tail = new THREE.Group(); tail.position.set(0, 0.68, -0.58); g.add(tail);
  tail.add(vc(P(TAN, new THREE.CylinderGeometry(0.03, 0.025, 0.25, 6), 0, -0.12, 0), P(SPOT, SPH(0.05), 0, -0.26, 0, 1, 1.6, 1)));
  tail.rotation.x = -2.6;
  const legs = [];
  for (const [x, z, hind] of [[-0.13, 0.36, 0], [0.13, 0.36, 0], [-0.13, -0.38, 1], [0.13, -0.38, 1]]) {
    const L = legParts(hind ? TAN : TAN, hind ? 0.3 : 0.38, hind ? 0.3 : 0.36, 0.07);
    L.hip.position.set(x, hind ? 0.62 : 0.76, z); L.hind = hind; g.add(L.hip); legs.push(L);
  }
  g.scale.setScalar(1.05);
  return { g, neck, head, legs, tail };
}

// Luipaard: lang en laag, goudgeel met rozetten, een lange staart
function leopardModel() {
  const GOLD = 0xd8a850, ROS = 0x2a1e12, WHITE = 0xf2e8d8;
  const g = new THREE.Group();
  const spots = [];
  for (let i = 0; i < 34; i++) {
    const t = R() * 2 - 1, a = R() * 2.6 - 1.3, side = R() < 0.5 ? -1 : 1;
    spots.push(P(ROS, new THREE.TorusGeometry(0.03, 0.009, 4, 8), side * Math.cos(a) * 0.19, 0.58 + Math.sin(a) * 0.14, t * 0.5, 1, 1, 1, 0, Math.PI / 2, 0));
  }
  g.add(vc(
    P(GOLD, SPH(0.21), 0, 0.58, 0, 0.95, 0.85, 2.5),
    P(WHITE, SPH(0.17), 0, 0.5, 0.02, 0.95, 0.6, 2.2),
    ...spots,
  ));
  const neck = new THREE.Group(); neck.position.set(0, 0.64, 0.5); g.add(neck);
  neck.add(vc(P(GOLD, new THREE.CylinderGeometry(0.09, 0.13, 0.26, 8), 0, 0.06, 0.05, 1, 1, 1, 1.1, 0, 0)));
  const head = new THREE.Group(); head.position.set(0, 0.1, 0.18); neck.add(head);
  head.add(vc(
    P(GOLD, SPH(0.12), 0, 0, 0, 1.05, 0.9, 1),
    P(WHITE, SPH(0.06), 0, -0.05, 0.1, 1.2, 0.8, 1),
    P(ROS, SPH(0.022), 0, -0.01, 0.15, 1.2, 0.8, 1),
    ...[-1, 1].map((k) => P(GOLD, SPH(0.04), k * 0.09, 0.1, -0.02, 1, 1, 0.4)),
    ...Array.from({ length: 8 }, (_, i) => P(ROS, SPH(0.012), Math.cos(i) * 0.08, 0.06 + Math.sin(i * 2) * 0.02, -0.02 + (i % 3) * 0.03)),
  ));
  // ogen die 's nachts oplichten
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc8ff70, toneMapped: false, transparent: true, opacity: 0 });
  for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), eyeMat); e.position.set(k * 0.05, 0.03, 0.1); head.add(e); }
  const tail = new THREE.Group(); tail.position.set(0, 0.6, -0.5); g.add(tail);
  const tparts = [];
  for (let i = 0; i < 7; i++) tparts.push(P(i === 6 ? ROS : GOLD, SPH(0.035 - i * 0.002), 0, -i * 0.025, -i * 0.11, 1, 1, 1.8));
  tail.add(vc(...tparts));
  const legs = [];
  for (const [x, z, hind] of [[-0.12, 0.38, 0], [0.12, 0.38, 0], [-0.12, -0.38, 1], [0.12, -0.38, 1]]) {
    const L = legParts(GOLD, 0.27, 0.27, 0.07);
    L.hip.position.set(x, 0.58, z); L.hind = hind; g.add(L.hip); legs.push(L);
  }
  return { g, neck, head, legs, tail, eyeMat };
}

// Lopen of rennen op vier poten
function gait(m, dt, speed, run, crouch = 0) {
  m.phase += dt * (run ? 11 : 6) * (speed > 0.2 ? 1 : 0);
  const a = (run ? 0.85 : 0.45) * Math.min(1, speed);
  const off = run ? [0, 0.3, Math.PI, Math.PI + 0.3] : [0, Math.PI, Math.PI, 0];
  m.legs.forEach((L, i) => {
    const p = m.phase + off[i];
    L.hip.rotation.x = Math.sin(p) * a - crouch * (L.hind ? -0.6 : 0.5);
    const lift = Math.max(0, Math.cos(p)) * (run ? 1.2 : 0.7) * Math.min(1, speed);
    L.knee.rotation.x = (L.hind ? -0.2 - lift * 0.6 : lift) + crouch * (L.hind ? -0.9 : 1.0);
  });
  m.g.rotation.x = run ? Math.sin(m.phase) * 0.08 : 0;
}

// ---------- hyena's ----------
// Een groepje bij het karkas. Overdag lui, 's nachts brutaal. Ze komen nieuwsgierig dichterbij,
// giechelen, en dan waagt er één een uitval. Een steen laat ze terugdeinzen.
export class Hyenas {
  constructor(scene, home) {
    this.home = home; this.list = []; this.mood = 0; this.rushT = 4;
    for (let i = 0; i < 3; i++) {
      const m = hyenaModel();
      const a = i * 2.1;
      const h = { ...m, kind: 'hyena', x: home.x + Math.cos(a) * 6, z: home.z + Math.sin(a) * 6, yaw: R() * 6, speed: 0, phase: R() * 6, state: 'rest', t: R() * 5, carry: null };
      scene.add(m.g); this.list.push(h);
    }
  }
  get threats() { return this.list.filter((h) => h.state === 'curious' || h.state === 'windup' || h.state === 'rush'); }

  hit(h, game) {
    h.state = 'flee'; h.t = 12; game.sound.yelp();
    for (const o of this.list) if (o !== h && o.state !== 'flee') { o.state = 'retreat'; o.t = 6; }
    game.discover('hyena');
  }

  update(dt, game) {
    const p = game.player.pos, night = game.night;
    const range = 14 + night * 22;
    const nearHome = Math.hypot(p.x - this.home.x, p.z - this.home.z);
    const holdsBone = game.state.hands.includes('bone');
    for (const h of this.list) {
      const d = Math.hypot(p.x - h.x, p.z - h.z) || 0.01;
      h.t -= dt;
      let tx = 0, tz = 0, spd = 0, run = false;
      const interested = d < range && (nearHome < 30 || holdsBone || night > 0.5) && game.state.collapsed <= 0;
      switch (h.state) {
        case 'rest': case 'roam':
          if (h.t < 0 || !h.goal) { if (h.t < 0) { h.state = h.state === 'rest' && R() < 0.6 ? 'roam' : 'rest'; h.t = 3 + R() * 6; } h.goal = { x: this.home.x + (R() - 0.5) * (20 + night * 50), z: this.home.z + (R() - 0.5) * (20 + night * 50) }; }
          if (h.state === 'roam') { const gx = h.goal.x - h.x, gz = h.goal.z - h.z, gd = Math.hypot(gx, gz); if (gd > 1) { tx = gx / gd; tz = gz / gd; spd = 1.6; } }
          if (interested) { h.state = 'curious'; h.t = 0; if (!this.warned) { this.warned = true; game.toast('Hyena\'s! Ze giechelen en komen dichterbij. Heb je een steen?', 5); } game.sound.giggle(); }
          break;
        case 'curious': {
          // in een boog om je heen, op een paar meter afstand
          const want = 6.5, ang = Math.atan2(h.x - p.x, h.z - p.z) + dt * 0.5;
          const gx = p.x + Math.sin(ang) * want - h.x, gz = p.z + Math.cos(ang) * want - h.z, gd = Math.hypot(gx, gz);
          if (gd > 0.3) { tx = gx / gd; tz = gz / gd; spd = Math.min(3.5, gd * 1.5); }
          if (R() < dt * 0.4) game.sound.giggle();
          if (!interested && d > range + 6) { h.state = 'roam'; h.t = 2; }
          break;
        }
        case 'windup':   // kop omlaag: hij gaat zo aanvallen
          spd = 0; h.yaw = turn(h.yaw, Math.atan2(p.x - h.x, p.z - h.z), dt * 8);
          if (h.t < 0) { h.state = 'rush'; h.t = 2.5; }
          break;
        case 'rush':
          tx = (p.x - h.x) / d; tz = (p.z - h.z) / d; spd = 7.5; run = true;
          if (d < 1.3) {
            h.state = 'retreat'; h.t = 8;
            const stole = game.bite(h, 12);
            if (stole) { h.carry = stole; h.state = 'flee'; h.t = 14; }
          } else if (h.t < 0) { h.state = 'retreat'; h.t = 4; }
          break;
        case 'retreat': case 'flee':
          tx = (h.x - p.x) / d; tz = (h.z - p.z) / d; spd = h.state === 'flee' ? 8 : 5; run = true;
          if (h.t < 0) { h.state = 'roam'; h.t = 3; if (h.carry) { game.toast('De hyena heeft het bot meegenomen. Er liggen er meer bij het karkas.'); h.carry = null; } }
          break;
      }
      h.speed += (spd - h.speed) * (1 - Math.exp(-dt * 5));
      if (spd > 0) h.yaw = turn(h.yaw, Math.atan2(tx, tz), dt * (run ? 7 : 3));
      else if (h.state === 'curious') h.yaw = turn(h.yaw, Math.atan2(p.x - h.x, p.z - h.z), dt * 4);
      h.x += Math.sin(h.yaw) * h.speed * dt; h.z += Math.cos(h.yaw) * h.speed * dt;
      const lim = WALK - 8; h.x = THREE.MathUtils.clamp(h.x, -lim, lim); h.z = THREE.MathUtils.clamp(h.z, -lim, lim);
      if (riverDist(h.x, h.z) < 7) h.z += (h.z > 0 ? 1 : -1) * dt * 4;
      this.pose(h, dt, run);
    }
    // af en toe waagt de brutaalste een uitval
    const curious = this.list.filter((h) => h.state === 'curious');
    if (curious.length) {
      this.rushT -= dt * (0.6 + night);
      if (this.rushT < 0) {
        const h = curious[Math.floor(R() * curious.length)];
        h.state = 'windup'; h.t = 0.9; game.sound.whoop();
        this.rushT = 5 + R() * 4;
      }
    } else this.rushT = 3;
  }

  pose(h, dt, run) {
    h.g.position.set(h.x, height(h.x, h.z) + (run ? Math.abs(Math.sin(h.phase)) * 0.12 : 0), h.z);
    h.g.rotation.y = h.yaw;
    const resting = h.state === 'rest' && h.speed < 0.2;
    gait(h, dt, h.speed, run, resting ? 0.6 : 0);
    if (resting) h.g.position.y -= 0.2;
    const down = h.state === 'windup' ? 0.7 : h.state === 'curious' ? 0.25 : 0;
    h.neck.rotation.x += (down - h.neck.rotation.x) * (1 - Math.exp(-dt * 6));
    h.tail.rotation.x = -2.6 + (h.state === 'flee' ? -0.4 : h.state === 'curious' ? 0.6 : 0);
  }
}

// ---------- luipaard ----------
// Overdag ligt hij in zijn boom. In de schemering komt hij naar beneden en besluipt je van achteren.
// Kijk hem recht aan en hij aarzelt; een steen jaagt hem terug de boom in.
export class Leopard {
  constructor(scene, tree) {
    this.tree = tree;
    const m = leopardModel();
    Object.assign(this, m, { kind: 'leopard', x: tree.x, z: tree.z, yaw: 0, speed: 0, phase: 0, state: 'tree', t: 0, watched: 0, cool: 0, y: 0 });
    scene.add(m.g);
  }
  get threat() { return ['stalk', 'freeze', 'pounce'].includes(this.state); }

  hit(game) {
    this.state = 'flee'; this.t = 6; this.cool = 40; game.sound.growl();
    game.toast('Raak! Het luipaard springt weg en vlucht naar zijn boom.');
    game.discover('leopard');
  }

  update(dt, game, cam) {
    const p = game.player.pos, night = game.night, d = Math.hypot(p.x - this.x, p.z - this.z) || 0.01;
    const homeD = Math.hypot(p.x - this.tree.x, p.z - this.tree.z);
    this.t -= dt; this.cool = Math.max(0, this.cool - dt);
    const active = night > 0.25 && homeD < 50 && this.cool <= 0 && game.state.collapsed <= 0;
    let tx = 0, tz = 0, spd = 0, run = false, crouch = 0;
    // kijk je hem aan? (de camera wijst ongeveer zijn kant op en hij is dichtbij)
    const look = new THREE.Vector3(); cam.getWorldDirection(look);
    const toX = this.x - cam.position.x, toZ = this.z - cam.position.z, tl = Math.hypot(toX, toZ) || 1;
    const facing = (look.x * toX + look.z * toZ) / (Math.hypot(look.x, look.z) * tl) > 0.82 && d < 22;
    switch (this.state) {
      case 'tree':
        if (active) { this.state = 'down'; this.t = 1.2; }
        break;
      case 'down':
        if (this.t < 0) { this.state = 'prowl'; this.t = 3; }
        break;
      case 'prowl':
        // rondsluipen bij de boom, tot hij jou opmerkt
        if (!active) { this.state = 'home'; break; }
        if (this.t < 0) { this.goal = { x: this.tree.x + (R() - 0.5) * 24, z: this.tree.z + (R() - 0.5) * 24 }; this.t = 4 + R() * 4; }
        if (this.goal) { const gx = this.goal.x - this.x, gz = this.goal.z - this.z, gd = Math.hypot(gx, gz); if (gd > 1) { tx = gx / gd; tz = gz / gd; spd = 1.4; } }
        if (d < 30) { this.state = 'stalk'; game.sound.alarm(); if (!this.warned) { this.warned = true; game.toast('Vogels slaan alarm… Er sluipt iets rond. Kijk om je heen!', 5); } }
        break;
      case 'stalk':
        // laag door het gras naar je toe, vooral als je de andere kant op kijkt
        tx = (p.x - this.x) / d; tz = (p.z - this.z) / d; spd = facing ? 0 : 2.4; crouch = 1;
        if (facing) { this.state = 'freeze'; this.watched = 0; game.sound.growl(); }
        if (d < 4.5) { this.state = 'pounce'; this.t = 0.6; game.sound.growl(); }
        if (!active && d > 20) this.state = 'home';
        break;
      case 'freeze':
        // je kijkt hem aan: hij verstijft, en als je blijft kijken trekt hij zich terug
        crouch = 1; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 4);
        if (facing) this.watched += dt; else { this.state = 'stalk'; }
        if (this.watched > 2.5) {
          this.state = 'home'; this.cool = 25;
          game.toast('Het luipaard aarzelt… en sluipt weg. Je hebt hem gezien, dus zijn verrassing is weg.', 5);
          game.discover('leopard');
        }
        break;
      case 'pounce':
        tx = (p.x - this.x) / d; tz = (p.z - this.z) / d; spd = 11; run = true;
        if (d < 1.4) { game.bite(this, 35, true); this.state = 'home'; this.cool = 30; }
        else if (this.t < 0) this.state = 'stalk';
        break;
      case 'flee': case 'home': {
        const gx = this.tree.x - this.x, gz = this.tree.z - this.z, gd = Math.hypot(gx, gz);
        if (gd > 1) { tx = gx / gd; tz = gz / gd; spd = this.state === 'flee' ? 9 : 5; run = true; }
        else { this.state = 'up'; this.t = 1.2; }
        break;
      }
      case 'up':
        if (this.t < 0) this.state = 'tree';
        break;
    }
    this.speed += (spd - this.speed) * (1 - Math.exp(-dt * 6));
    if (spd > 0) this.yaw = turn(this.yaw, Math.atan2(tx, tz), dt * (run ? 8 : 3));
    this.x += Math.sin(this.yaw) * this.speed * dt; this.z += Math.cos(this.yaw) * this.speed * dt;
    // in de boom liggen, of naar beneden springen / naar boven klimmen
    const branch = this.tree.branchY, gy = height(this.x, this.z);
    let y = gy;
    if (this.state === 'tree') { this.x = this.tree.x + 0.6; this.z = this.tree.z; y = gy + branch; this.yaw = 1.2; }
    if (this.state === 'down') y = gy + branch * Math.max(0, this.t / 1.2);
    if (this.state === 'up') { this.x = this.tree.x + 0.6; this.z = this.tree.z; y = gy + branch * (1 - Math.max(0, this.t / 1.2)); }
    this.g.position.set(this.x, y, this.z);
    this.g.rotation.y = this.yaw;
    gait(this, dt, this.speed, run, crouch * 0.8 + (this.state === 'tree' ? 1 : 0));
    if (this.state === 'tree') { this.g.position.y -= 0.25; this.legs.forEach((L) => { L.hip.rotation.x = L.hind ? -1.2 : 1.2; }); }
    this.neck.rotation.x = crouch ? 0.3 : this.state === 'tree' ? 0.2 : 0;
    this.tail.rotation.x = 0.2 + Math.sin(performance.now() / (crouch ? 180 : 600)) * (crouch ? 0.25 : 0.1);
    this.tail.rotation.y = Math.sin(performance.now() / 700) * 0.3;
    this.eyeMat.opacity = Math.max(night, game.state.sensing ? 1 : 0) * (this.state === 'tree' && !game.state.sensing ? 0.4 : 1);
  }
}

// ---------- een steen gooien ----------
export class Throws {
  constructor(scene) { this.scene = scene; this.list = []; }
  throw(from, target, onArrive) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), new THREE.MeshLambertMaterial({ color: 0x8a7c6c, flatShading: true }));
    m.castShadow = true; this.scene.add(m);
    const to = { x: target.x, z: target.z };
    this.list.push({ m, from: from.clone(), target, to, t: 0, dur: 0.45, onArrive });
  }
  update(dt) {
    for (const s of this.list) {
      s.t += dt;
      // richt een beetje mee als het doel beweegt
      s.to.x += (s.target.x - s.to.x) * Math.min(1, dt * 6); s.to.z += (s.target.z - s.to.z) * Math.min(1, dt * 6);
      const k = Math.min(1, s.t / s.dur), ty = height(s.to.x, s.to.z) + 0.7;
      s.m.position.set(s.from.x + (s.to.x - s.from.x) * k, s.from.y + (ty - s.from.y) * k + Math.sin(k * Math.PI) * 1.6, s.from.z + (s.to.z - s.from.z) * k);
      s.m.rotation.x += dt * 14; s.m.rotation.z += dt * 9;
      if (k >= 1) { s.done = true; this.scene.remove(s.m); s.onArrive(s.to.x, s.to.z); }
    }
    this.list = this.list.filter((s) => !s.done);
  }
}

