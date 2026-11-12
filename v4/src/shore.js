import * as THREE from '../lib/three.module.js';
import { height, riverZ } from './world.js';
import { AREA } from './eras/index.js';
import { ICON } from './icons.js';
import { turn } from './actors.js';

// De oever van het meer: krokodillen in het water, meervallen in de poelen en knollen onder de korst.
// Elk van de drie vraagt iets anders van je: afstand houden, stil zijn, of het goede gereedschap.
const SURF = -0.35;   // het wateroppervlak
const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// een krokodil van ruim drie meter; y = 0 is de waterlijn als hij loert
function crocMesh() {
  const g = new THREE.Group(), skin = lam('#4c4a33'), dark = lam('#35341f'), part = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
  const ball = new THREE.SphereGeometry(0.5, 9, 6);
  part(ball, skin, 0, -0.1, 0, 0.66, 0.36, 2.1);            // romp
  part(ball, skin, 0, -0.06, 1.25, 0.44, 0.26, 0.9);        // kop
  part(ball, skin, 0, -0.1, 1.75, 0.26, 0.14, 0.8);         // snuit
  const tail = part(new THREE.ConeGeometry(0.2, 1.7, 6), skin, 0, -0.12, -1.75, 1, 1, 0.5); tail.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) part(new THREE.ConeGeometry(0.05, 0.09, 4), dark, s * 0.09, 0.09 - Math.abs(i - 3) * 0.008, -1.3 + i * 0.26, 1, 1, 1);   // de rij bulten
  for (const s of [-1, 1]) { part(ball, dark, s * 0.13, 0.07, 1.1, 0.12, 0.11, 0.14); part(new THREE.SphereGeometry(0.5, 6, 4), new THREE.MeshBasicMaterial({ color: 0xc8b450 }), s * 0.15, 0.09, 1.13, 0.05, 0.05, 0.06); }   // ogen
  g.traverse((o) => { o.castShadow = true; });
  return g;
}
function fishMesh() {
  const g = new THREE.Group(), c = lam('#3c3b33');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 5), c); body.scale.set(0.2, 0.13, 0.75); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), c); tail.rotation.x = -Math.PI / 2; tail.scale.x = 0.25; tail.position.z = -0.44; g.add(tail);
  return g;
}
function plantMesh() {
  const g = new THREE.Group(), leaf = lam('#5e7d38'), dark = lam('#4a6a2e');
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3, l = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 4), i % 2 ? leaf : dark);
    l.scale.set(0.3, 0.035, 0.52); l.position.set(Math.sin(a) * 0.24, 0.07 + (i % 2) * 0.03, Math.cos(a) * 0.24); l.rotation.set(-0.25, a, 0, 'YXZ'); g.add(l);
  }
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4), lam('#9a8058')); mound.scale.set(0.5, 0.1, 0.5); g.add(mound);   // de gebarsten korst
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export class Shore {
  constructor(scene) {
    const S = AREA.shore;
    this.crocs = S.crocs.map(([x, s]) => {
      const z = riverZ(x) + s, g = crocMesh(); scene.add(g);
      return { kind: 'croc', g, x, z, home: { x, z }, yaw: Math.PI, state: 'lurk', t: Math.random() * 6, dip: 0.07, a: Math.random() * 6 };
    });
    this.fish = [];
    for (const [px, pz, r] of AREA.pools) for (let i = 0; i < 2; i++) {
      const g = fishMesh(); scene.add(g);
      this.fish.push({ look: 'catfish', g, pool: [px, pz, r], a: i * 3.3 + px, dir: i ? -1 : 1, x: px, z: pz, hide: 0 });
    }
    this.plants = S.tubers.map(([x, z]) => {
      const g = plantMesh(); g.position.set(x, height(x, z), z); g.rotation.y = x * 1.3; scene.add(g);
      return { look: 'tuberplant', g, x, z, left: 1 };
    });
    // riet in het water wijst de ondiepe drempel naar de zandbank aan
    const I = AREA.island;
    if (I) {
      const mat = lam('#6f8a3c'), z0 = riverZ(I.x), n = Math.floor((I.river - I.r) / 2.2);
      for (let i = 0; i <= n; i++) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
        const x = I.x + s * (3.6 + (k % 2) * 0.35), z = z0 + i * 2.2 + k * 0.3, h = 1.1 + ((i * 7 + k * 3) % 5) * 0.14;
        const r = new THREE.Mesh(new THREE.ConeGeometry(0.035, h, 4), mat); r.position.set(x, SURF + h / 2 - 0.25, z); r.rotation.z = (k - 1.5) * 0.06; scene.add(r);
      }
    }
    this.told = false; this.splashT = 0;
  }

  // ---------- wat het spel wil weten ----------
  lookTargets() {
    return [...this.crocs.filter((c) => c.state !== 'sink').map((c) => ({ look: 'croc', member: c })), ...this.fish.filter((f) => f.hide <= 0), ...this.plants.filter((p) => p.left > 0)];
  }
  targets() { return this.crocs.filter((c) => c.state !== 'sink').map((c) => ({ m: c, kind: 'croc', threat: c.state !== 'lurk' })); }
  owns(kind) { return kind === 'croc'; }
  danger() { let d = 0; for (const c of this.crocs) d = Math.max(d, c.state === 'lunge' ? 1 : c.state === 'stalk' ? 0.65 : 0); return d; }
  // wat de vuist doet als je ergens vlak naast staat
  action(game) {
    const p = game.player.pos, H = game.state.hands;
    const plant = H.includes('stick') && this.plants.find((q) => q.left > 0 && dist(q, p) < 2.8);
    if (plant) return { mode: 'dig', icon: ICON.dig, run: () => game.player.playOnce('Interact', { speed: 1.6, at: 0.5, onAt: () => this.dig(plant, game) }) };
    const f = H.includes(null) && this.fish.find((q) => q.hide <= 0 && dist(q, p) < 2.6);
    if (f) return { mode: 'take', icon: ICON.hand, run: () => game.player.playOnce('Interact', { speed: 1.6, at: 0.5, onAt: () => this.grab(f, game) }) };
    return null;
  }
  // een worp of een klap
  hit(t, how, game) {
    const c = t.m;
    if (how === 'fist') { game.toast('Je vuist ketst af op zijn pantser.', 3); c.state = 'lunge'; c.t = 0.45; return; }
    this.sink(c, 50); game.sound.thud(); game.discover('croc');
    game.toast('Raak! De krokodil zakt weg onder water. Even is de weg vrij.', 4);
  }
  sink(c, sec) { c.state = 'sink'; c.t = sec; c.moved = false; }

  // een knol loswrikken
  dig(p, game) {
    if (p.left <= 0) return;
    if (!game.state.hands.includes('stick')) { game.toast('De korst is keihard. Met je vingers kom je er niet doorheen.', 4); return; }
    if (!game.giveHand('tuber')) return;
    p.left = 0; p.g.scale.setScalar(0.5); p.g.rotation.z = 0.5; game.sound.crack();
    game.toast(game.state.found.has('tuber') ? 'Je wrikt weer een knol los.' : 'Je steekt de punt onder de korst en wrikt. De grond breekt open: een dikke, bleke knol!', 5);
    game.discover('tuber');
  }
  // een meerval grijpen
  grab(f, game) {
    if (f.hide > 0) return;
    if (dist(f, game.player.pos) > 3.2) { game.toast('Hij is net buiten bereik gegleden.', 3); return; }
    if (!game.giveHand('fish')) return;
    f.hide = 1e9; f.g.visible = false; game.sound.thud();
    game.toast(game.state.found.has('fish') ? 'Hebbes! Weer een meerval.' : 'Je handen schieten het water in. Glad, kronkelend… hebbes! Een meerval.', 5);
    game.discover('fish');
  }
  newDay() {
    for (const p of this.plants) { p.left = 1; p.g.scale.setScalar(1); p.g.rotation.z = 0; }
    for (const f of this.fish) f.hide = 0;
  }

  update(dt, game) {
    const P = game.player, p = P.pos, s = game.state, awake = s.started && s.sleeping <= 0 && s.collapsed <= 0;
    const atWater = p.z - riverZ(p.x) > -3.5;   // in het meer, of op de rand ervan
    const wet = (x, z, min) => z - riverZ(x) >= min && height(x, z) < -0.42;
    for (const c of this.crocs) {
      const d = dist(c, p); c.t -= dt;
      let dip = 0.07, spd = 0, want = c.yaw;
      if (c.state === 'lurk') {
        // hij drijft: een boomstam die heel langzaam draait
        c.a += dt * 0.12; want = c.a; spd = 0.12;
        if (dist(c, c.home) > 3) want = Math.atan2(c.home.x - c.x, c.home.z - c.z);
        if (awake && atWater && d < 15) { c.state = 'stalk'; c.t = 0; if (!this.told) { this.told = true; game.sound.sting(); game.toast('Die boomstam in het water… beweegt.', 4); } }
      } else if (c.state === 'stalk') {
        want = Math.atan2(p.x - c.x, p.z - c.z); spd = 2.1; dip = 0.04;
        if (!awake || !atWater || d > 24) { c.state = 'lurk'; c.t = 4; }
        else if (d < 3.4) { c.state = 'lunge'; c.t = 0.45; c.yaw = want; game.sound.thud(); }
      } else if (c.state === 'lunge') {
        want = Math.atan2(p.x - c.x, p.z - c.z); spd = 9; dip = -0.16;
        if (d < 1.5 && awake) { game.bite(c, 28, true); this.sink(c, 18); }
        else if (c.t <= 0) this.sink(c, 6);
      } else {
        // onder water: halverwege duikt hij ergens anders weer op
        dip = 0.9;
        if (!c.moved && c.t < 4) { c.moved = true; c.x = c.home.x; c.z = c.home.z; }
        if (c.t <= 0) { c.state = 'lurk'; c.t = 3; }
      }
      c.yaw = turn(c.yaw, want, dt * (c.state === 'lurk' ? 0.5 : 4));
      const nx = c.x + Math.sin(c.yaw) * spd * dt, nz = c.z + Math.cos(c.yaw) * spd * dt;
      if (c.state === 'lunge' ? nz - riverZ(nx) > -2.5 : wet(nx, nz, 0.8)) { c.x = nx; c.z = nz; }
      c.dip += (dip - c.dip) * Math.min(1, dt * (c.state === 'sink' ? 2.5 : 6));
      c.g.visible = c.dip < 0.8;
      c.g.position.set(c.x, Math.max(SURF, height(c.x, c.z) + 0.25) - c.dip, c.z);
      c.g.rotation.set(c.state === 'lunge' ? -0.25 : 0, c.yaw, 0, 'YXZ');
    }
    // meervallen: wie rechtop door de poel plonst, ziet ze niet meer terug
    this.splashT -= dt;
    for (const f of this.fish) {
      const [px, pz, r] = f.pool, dp = Math.hypot(p.x - px, p.z - pz);
      if (f.hide > 0) { f.hide -= dt; f.g.visible = false; continue; }
      if (awake && dp < r + 0.4 && (!P.sneaking || !P.onGround) && P.speed > 0.6) {
        f.hide = 25; f.g.visible = false;
        if (this.splashT <= 0) { this.splashT = 20; game.sound.thud(); game.toast('Plons! De vissen schieten weg in de modder.', 4); }
        continue;
      }
      if (dist(f, p) > 4) f.a += dt * 0.14 * f.dir;   // dichtbij hangt hij stil
      const want = Math.atan2(Math.cos(f.a) * f.dir, -Math.sin(f.a) * f.dir);
      f.x = px + Math.cos(f.a) * r * 0.3; f.z = pz + Math.sin(f.a) * r * 0.3;
      f.g.visible = true; f.g.position.set(f.x, SURF - 0.02 + Math.sin(f.a * 9) * 0.015, f.z); f.g.rotation.y = want;
    }
  }
}
