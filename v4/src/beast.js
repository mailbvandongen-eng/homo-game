import * as THREE from '../lib/three.module.js';
import { height, WALK, riverZ, blockers } from './world.js';
import { Vultures } from './actors.js';
import { Rig } from './rig.js';
import { turn, sense } from './animal.js';
import { HOME } from './group.js';
import { BEASTS } from './beasts.js';

// Het grote dier van het gebied (zie beasts.js): de reuzenolifant, de nijlpaarden, de neushoorn of de giraffen.
// Elk loopt een eigen ronde uit het gebiedsbestand en laat een spoor van afdrukken achter. Je kunt ze niet doden.
// Wat je wel kunt: hun gewoontes leren. Wie dat doet, heeft er iets aan; wie het niet doet, loopt gevaar.
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const atZ = (x, z) => (typeof z === 'number' ? z : riverZ(x) + z.river);
export const DEATH_DRY = 3;                     // op de zoveelste droge dag bezwijkt het oude dier (alleen soorten met 'dies')
const UPV = new THREE.Vector3(0, 1, 0), SIDE = new THREE.Vector3(), FWD = new THREE.Vector3();

// een eigen tint over de huid van het model (het nijlpaard is in het model te roze)
const TINTS = new Map();
function tint(rig, hex) {
  rig.model.traverse((o) => {
    if (!o.isMesh) return;
    let m = TINTS.get(o.material.uuid);
    if (!m) { m = o.material.clone(); m.color.multiply(new THREE.Color(hex)); TINTS.set(o.material.uuid, m); TINTS.set(m.uuid, m); }
    o.material = m;
  });
}

// wat overblijft als de regen het karkas heeft opgeruimd: een kies van de olifant, een hoektand van het nijlpaard
function relic(kind) {
  const g = new THREE.Group(), bone = new THREE.MeshLambertMaterial({ color: 0xe6dcc4, flatShading: true });
  if (kind === 'molar') {
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), bone); base.scale.set(1, 0.5, 0.55); base.position.y = 0.1; g.add(base);
    const rm = new THREE.MeshLambertMaterial({ color: 0x6e5a42 });
    for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.15 - Math.abs(i - 3) * 0.02), rm); r.position.set(-0.132 + i * 0.044, 0.19 - Math.abs(i - 3) * 0.008, 0); g.add(r); }
    g.rotation.set(0.25, 0.7, 0.15);
  } else {
    // een kromme tand: een kegel die we langs een boog buigen
    const geo = new THREE.ConeGeometry(0.045, 0.5, 9, 10), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = pos.getY(i) / 0.5 + 0.5; pos.setZ(i, pos.getZ(i) + k * k * 0.16); }
    geo.computeVertexNormals();
    const tusk = new THREE.Mesh(geo, bone); tusk.rotation.set(0, 0, Math.PI / 2); tusk.position.y = 0.05; g.add(tusk);
    g.rotation.y = 0.7;
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export class Beast {
  constructor(scene, A, plan) {
    const P = BEASTS[plan.kind]; if (!P) throw new Error('groot dier bestaat niet: ' + plan.kind);
    this.P = P; this.T = P.text; this.kind = plan.kind; this.scene = scene; this.hitText = P.text.hit;
    this.route = plan.route.map(([x, z, what]) => [x, atZ(x, z), what]);
    this.grave = plan.grave ? { x: plan.grave[0], z: atZ(...plan.grave) } : null;
    const make = (size = 1) => {
      const rig = new Rig(A, P.model, P.rig.shape ? P.rig : { ...P.rig, scale: P.rig.scale * size });
      if (P.tint) tint(rig, P.tint);
      scene.add(rig.root);
      const block = { x: 0, z: 0, r: P.r * size, beast: true }; blockers.push(block);
      const G = P.graze, gb = G && { neck: rig.hold(rig.bone(G.neck)), head: rig.hold(rig.bone(G.head)), tail: rig.hold(rig.bone(G.tail)), ears: G.ears.map((e) => rig.hold(rig.bone(e))) };
      return { rig, g: rig.root, block, size, gb, x: 0, z: 0, yaw: 0, speed: 0, walked: 0, pn: 0, up: 0 };
    };
    Object.assign(this, make());
    this.herd = (P.herd || []).map((h) => Object.assign(make(h.size), { off: h.off, soak: h.soak, moving: false }));
    this.members = [this, ...this.herd];
    // afdrukken: donkere kuilen in het stof, die oplichten als je je zintuigen gebruikt
    const geo = new THREE.CircleGeometry(P.print.r, 12); geo.rotateX(-Math.PI / 2);
    this.printMat = new THREE.MeshBasicMaterial({ color: 0x1c1712, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.prints = new THREE.InstancedMesh(geo, this.printMat, P.print.n);
    this.prints.count = 0; this.prints.frustumCulled = false; this.prints.renderOrder = 2; scene.add(this.prints);
    this.spots = []; this.pn = 0; this.dummy = new THREE.Object3D();
    if (P.dies) {
      this.vultures = new Vultures(scene, this.grave.x, this.grave.z, A);
      this.relic = relic(P.dies.relic); this.relic.visible = false; scene.add(this.relic);
    }
    this.fruit = []; this.seen = false; this.said = {}; this.shieldT = 0; this.stepT = 0; this.checkT = 0; this.homeT = 0; this.dayP = 0.3; this.threatAt = null; this.nearT = 0;
    this.spawn(P.out ? 0 : Math.min(4, this.route.length - 1), true);
  }

  // een (nieuw) dier neerzetten, met een spoor dat al een eind achter hem ligt
  spawn(at = 0, first = false) {
    const [x, z] = this.route[at], P = this.P;
    Object.assign(this, { x, z, yaw: 0, speed: 0, wp: (at + 1) % this.route.length, state: 'roam', t: 0, dead: false, meat: 0, cuts: 0, calm: 0, spot: null, soaking: false, face: null, homeT: 0 });
    this.g.rotation.set(0, 0, 0); this.g.visible = true; this.block.r = P.r;
    this.herd.forEach((f, i) => { f.x = x + 3 + i * 3; f.z = z - 3 - i * 2; f.speed = 0; });
    this.prints.count = 0; this.spots = []; this.pn = 0;
    if (this.vultures) for (const b of this.vultures.birds) b.g.visible = false;
    if (first && this.relic) this.relic.visible = false;
    // ruim acht minuten vooruit lopen; wie overdag in het water ligt, maakt eerst zijn avondronde en loopt dan terug
    const day = this.dayP;
    if (P.out) this.dayP = P.out[0] + 0.1;
    for (let i = 0; i < 2600; i++) this.roam(0.2, 0, null);
    this.dayP = day;
    if (P.out) for (let i = 0; i < 4000 && !this.soaking; i++) this.roam(0.2, 0, null);
    for (let i = 0; i < 150; i++) this.follow(0.2);
    this.place();
  }
  get alive() { return !this.dead; }
  get threat() { return this.state === 'warn' || this.state === 'charge'; }
  get soakSpot() { return { x: this.route[0][0], z: this.route[0][1] }; }
  next() { this.wp = this.wp + 1 >= this.route.length ? (this.P.out ? 1 : 0) : this.wp + 1; }

  // ---------- de ronde ----------
  roam(dt, night, game) {
    const P = this.P;
    this.t -= dt; this.face = null;
    if (P.out) {
      // overdag in het water; van de late middag tot de vroege ochtend op het land
      const out = this.homeT <= 0 && (this.dayP > P.out[0] || this.dayP < P.out[1]);
      if (!out) {
        const s = this.soakSpot, d = dist(s, this);
        this.soaking = d < 3; this.state = 'roam'; this.wp = 1;
        if (this.soaking) return this.walk(this, 0, dt);
        this.yaw = turn(this.yaw, Math.atan2(s.x - this.x, s.z - this.z), dt * 0.8);
        return this.walk(this, P.walkV * (this.homeT > 0 ? 2.4 : 1.25), dt);
      }
      this.soaking = false; if (this.wp === 0) this.wp = 1;
    }
    if (this.state === 'stop') {
      if (this.t < 0) {
        if (this.doing === 'eat' && P.fruit && game) this.dropFruit(game);
        this.state = 'roam'; this.next();
      }
      return this.walk(this, 0, dt);
    }
    if (night > 0.6 && !P.out) return this.walk(this, 0, dt);   // 's nachts staat hij te dommelen
    const [wx, wz, what] = this.route[this.wp], d = Math.hypot(wx - this.x, wz - this.z);
    if (d < 4) {
      if (what === 'pass') this.next();
      else { this.state = 'stop'; this.doing = what; this.t = what === 'eat' ? 22 : 16; }
      return this.walk(this, 0, dt);
    }
    this.yaw = turn(this.yaw, Math.atan2(wx - this.x, wz - this.z), dt * 0.7);
    this.walk(this, P.walkV, dt);
  }
  // één dier (de voorste of een volger) een stap laten zetten
  walk(m, spd, dt) {
    const P = this.P;
    if (P.wade && spd > P.hurry && height(m.x, m.z) < -0.7) spd *= 0.6;   // door diep water gaat het trager
    m.speed += (spd - m.speed) * (1 - Math.exp(-dt * 2.5));
    const dx = Math.sin(m.yaw) * m.speed * dt, dz = Math.cos(m.yaw) * m.speed * dt;
    m.x += dx; m.z += dz;
    // om bomen en rotsen heen, en niet door elkaar
    for (const b of blockers) {
      if (b === m.block) continue;
      const ox = m.x - b.x, oz = m.z - b.z, d = Math.hypot(ox, oz), min = b.r + m.block.r;
      if (d < min && d > 0.001) { m.x = b.x + ox / d * min; m.z = b.z + oz / d * min; }
    }
    const lim = WALK - 12; m.x = THREE.MathUtils.clamp(m.x, -lim, lim);
    m.z = THREE.MathUtils.clamp(m.z, -lim, riverZ(m.x) + (P.wade || -8));
    // elke paar passen een afdruk, links en rechts (niet onder water)
    m.walked += Math.hypot(dx, dz);
    if (m.walked > P.print.step * m.size) {
      m.walked = 0;
      const k = (m.pn++ % 2 ? 1 : -1) * P.print.side * m.size, px = m.x + Math.cos(m.yaw) * k, pz = m.z - Math.sin(m.yaw) * k, y = height(px, pz);
      if (y < -0.3) return;
      const i = this.pn++ % P.print.n;
      this.dummy.position.set(px, y + 0.05, pz); this.dummy.rotation.set(0, m.yaw, 0); this.dummy.scale.set(m.size, 1, 1.15 * m.size); this.dummy.updateMatrix();
      this.prints.setMatrixAt(i, this.dummy.matrix); this.prints.count = Math.min(this.pn, P.print.n); this.prints.instanceMatrix.needsUpdate = true;
      this.spots[i] = { x: px, z: pz };
    }
  }
  // de volgers houden hun plek naast en achter de voorste; in het water heeft elk zijn eigen ligplek
  follow(dt) {
    const hold = this.state === 'watch' || this.state === 'warn' || this.state === 'charge' || this.state === 'lookout' || this.dead, s = this.soakSpot;
    const c = Math.cos(this.yaw), sn = Math.sin(this.yaw), fast = this.speed > this.P.hurry;
    for (const f of this.herd) {
      let sx = f.x, sz = f.z;
      if ((this.soaking || this.dead || (this.P.out && hold && f.inWater)) && f.soak) { sx = s.x + f.soak[0]; sz = s.z + f.soak[1]; }
      else if (!hold) { sx = this.x + c * f.off[0] + sn * f.off[1]; sz = this.z - sn * f.off[0] + c * f.off[1]; }
      const dx = sx - f.x, dz = sz - f.z, d = Math.hypot(dx, dz);
      let spd = 0;
      if (d > (f.moving ? 0.7 : 2.4)) {
        f.moving = true; spd = Math.min(fast ? this.P.chargeV : this.P.walkV * 1.6, Math.max(this.P.walkV * 0.7, d * 0.8));
        // wie achter een rots of boom blijft haken, loopt er met een boog omheen
        f.tryT = (f.tryT || 0) + dt;
        if (f.tryT > 2) { if (Math.hypot(f.x - (f.tx ?? f.x), f.z - (f.tz ?? f.z)) < spd * 0.6) { f.round = 5; f.side = -(f.side || 1); } f.tryT = 0; f.tx = f.x; f.tz = f.z; }
        f.round = Math.max(0, (f.round || 0) - dt);
        f.yaw = turn(f.yaw, Math.atan2(dx, dz) + (f.round > 0 ? 1.35 * f.side : 0), dt * (fast || f.round > 0 ? 2.4 : 1.4));
      } else {
        f.moving = false;
        if (this.face) f.yaw = turn(f.yaw, Math.atan2(this.face.x - f.x, this.face.z - f.z), dt * 0.9);
      }
      this.walk(f, spd, dt);
      f.inWater = height(f.x, f.z) < -0.5;
    }
  }
  // waar de reus aan een boom heeft staan trekken, liggen daarna vruchten
  dropFruit(game) {
    this.fruit = this.fruit.filter((t) => !t.gone);
    while (this.fruit.length > 6) game.removeThing(this.fruit.shift());
    for (let i = 0; i < 3; i++) {
      const a = this.yaw + 2.2 + i * 0.9, t = game.drop('berry', this.x + Math.sin(a) * 3.2, this.z + Math.cos(a) * 3.2, true);
      if (t) this.fruit.push(t);
    }
    if (dist(this, game.player.pos) < 40) { game.murmur(this.T.fruit, 5); game.discover('fruit'); }
  }
  // één keer zeggen (de eerste keer dat iets gebeurt)
  once(key, game, sec = 5, how = 'toast') { if (this.said[key] || !this.T[key]) return false; this.said[key] = true; game[how](this.T[key], sec); return true; }

  // ---------- elke stap ----------
  update(dt, game, t) {
    const P = this.P, T = this.T, p = game.player.pos, night = game.night, d = dist(this, p) || 0.01;
    if (game.dayP !== undefined) this.dayP = game.dayP;
    this.printMat.color.setHex(game.state.sensing ? 0xffe9a8 : 0x1c1712); this.printMat.opacity = game.state.sensing ? 0.9 : 0.42;
    this.checkT -= dt;
    if (this.checkT < 0) {
      this.checkT = 0.5;
      if (!this.said.track && this.spots.some((s) => s && dist(s, p) < 2.5)) { this.said.track = true; game.murmur(T.track, 6); game.discover('track'); }
      if (P.ai === 'shy') this.threatAt = this.predator(game);
    }
    if (this.dead) return this.updateDead(dt, game, t, d);
    const awake = game.state.collapsed <= 0 && game.state.sleeping <= 0;
    const S = sense(P.sense, this, game.player);
    this.calm = Math.max(0, this.calm - dt); this.homeT = Math.max(0, this.homeT - dt);
    if (d < 48 && !this.seen) { this.seen = true; game.murmur(!this.soaking && T.seenLand ? T.seenLand : T.seen, 7); if (P.call) game.sound[P.call](1); }
    // bij de reus durven de hyena's niet te komen
    game.shield = !!P.shield && d < P.shield;
    if (P.shield) {
      for (const h of game.hyenas.list) {
        if (dist(h, this) < P.shield + 4 && ['curious', 'windup', 'rush'].includes(h.state)) { h.state = 'retreat'; h.t = 6; game.sound.from(h).yelp(); this.shieldT = 9; }
      }
      if (game.shield && game.hyenas.list.some((h) => dist(h, p) < 45 && h.state !== 'rest')) {
        this.shieldT += dt;
        if (this.shieldT > 8 && !game.state.found.has('shield')) { game.murmur(T.shield, 6); game.discover('shield'); }
      }
    }
    this.mode = null; this.kicker = null;
    if (P.ai === 'bull') this.bull(dt, game, S, d, awake, night);
    else if (P.ai === 'rhino') this.rhino(dt, game, S, d, awake, night);
    else this.shy(dt, game, S, d, awake, night);
    this.follow(dt);
    this.place();
    // welke beweging hoort erbij?
    const mode = this.mode || (this.state === 'stop' ? this.doing : this.soaking ? 'soak' : null);
    for (const m of this.members) this.animate(m, dt, m === this.kicker ? 'warn' : mode === 'warn' && m !== this ? null : mode, t);
    // zware stappen hoor en voel je van ver
    if (this.speed > 0.4) {
      const fast = this.speed > P.hurry;
      this.stepT -= dt * (fast ? 3.2 : 1.1);
      if (this.stepT < 0) {
        this.stepT = 1; const v = Math.max(0, 1 - d / 60) * P.step;
        if (v > 0) { game.sound.from(this).stomp(v * (fast ? 1 : 0.6)); if (d < 26 && P.step > 0.5) game.quake((fast ? 0.35 : 0.12) * P.step * (1 - d / 26)); }
      }
    }
    if (P.call && d < 70 && Math.random() < dt * 0.05) game.sound.from(this)[P.call](Math.max(0.2, 1 - d / 70));
  }
  animate(m, dt, mode, t) {
    const P = this.P, a = P.anim, R = m.rig, k = Math.sqrt(m.size);
    if (mode === 'warn' && a.warn[0]) R.play(a.warn[0], { fade: 0.3, speed: a.warn[1] });
    else if (m.speed > P.hurry) R.play(a.run[0], { fade: 0.3, speed: Math.max(0.7, m.speed / a.run[1] / k) });
    else if (m.speed > 0.15) R.play(a.walk[0], { fade: 0.5, speed: Math.max(0.4, m.speed / a.walk[1] / k) });
    else if (mode === 'eat' && a.eat) R.play(a.eat, { fade: 0.8 });
    else if (a.idle) R.play(a.idle, { fade: 0.8 });
    else R.rest(0.6);
    R.update(dt);
    if (P.graze) this.graze(m, dt, mode, t);
  }
  // De neushoorn heeft in het model alleen lopen en rennen. Staat hij stil, dan staat hij in zijn ruststand (kop bij de grond: grazen)
  // en bewegen wij zijn nek, kop, oren en staart: kauwen, opkijken, snuiven.
  graze(m, dt, mode, t) {
    const R = m.rig, still = Math.max(0, 1 - m.speed / 0.6);
    const alert = this.state === 'watch' || this.state === 'warn' ? 1 : mode === 'eat' ? 0 : 0.45;
    m.up += (alert - m.up) * (1 - Math.exp(-dt * 2.2));
    if (still <= 0) return;
    R.side(SIDE); FWD.set(Math.sin(m.yaw), 0, Math.cos(m.yaw));
    const toss = mode === 'warn' ? Math.sin(t * 11) * 0.13 : 0, chew = (1 - m.up) * Math.sin(t * 5.2) * 0.02;
    R.bend(m.gb.neck, SIDE, (-0.34 * m.up + 0.26 * (1 - m.up) + toss + chew) * still);
    R.bend(m.gb.head, SIDE, (-0.2 * m.up + 0.16 * (1 - m.up) + toss * 0.6 + 0.0001) * still);
    R.bend(m.gb.tail, FWD, Math.sin(t * 2.6) * 0.3 * still);
    m.gb.ears.forEach((e, i) => R.bend(e, UPV, (Math.sin(t * 1.7 + i * 2.1) > 0.82 ? 0.35 : 0.0001) * (i ? -1 : 1) * still));
  }

  // ---------- de reus en het nijlpaard: waarschuwen, dan aanvallen ----------
  bull(dt, game, S, d, awake, night) {
    const P = this.P, T = this.T, p = game.player.pos;
    switch (this.state) {
      case 'roam': case 'stop':
        this.roam(dt, night, game);
        if (!awake || this.calm > 0) break;
        // wie tussen een nijlpaard en het water staat, staat op zijn vluchtweg
        if (P.out && !this.soaking && d < 26 && p.z > this.z + 2 && Math.abs(p.x - this.x) < 11 && height(this.x, this.z) > -0.3) {
          this.state = 'charge'; this.t = P.chargeT; this.fromWater = false; this.homeT = 60; this.said.between = false; this.once('between', game, 5);
          game.sound.from(this)[P.cry](1); game.discover('hippopath');
        } else if (d < S.sight) {
          this.state = 'watch'; this.t = 0; game.sound.from(this)[P.call](0.8); this.once('watch', game, 5);
        }
        break;
      case 'watch':
        this.t += dt; this.walk(this, 0, dt); this.face = p; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 0.9);
        if (!awake || d > S.sight + 7) { this.state = 'roam'; this.t = 0; }
        else if (S.close || this.t > 6) { this.state = 'warn'; this.t = P.warnT; game.sound.from(this)[P.cry](0.8); game.toast(T.anger, 5); }
        break;
      case 'warn':
        this.t -= dt; this.walk(this, 0, dt); this.face = p; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 1.2);
        this.mode = 'warn';
        if (this.t < 0) {
          if (awake && d < P.chargeD) { this.state = 'charge'; this.t = P.chargeT; this.fromWater = this.soaking || height(this.x, this.z) < -0.3; this.soaking = false; game.sound.from(this)[P.cry](1); }
          else { this.end(12, game); game.toast(T.letgo, 4); }
        }
        break;
      case 'charge': {
        this.t -= dt; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * P.chargeTurn);
        const bonk = this.rush(dt);
        if (awake && d < P.hitR) this.strike(game, p, d, 25);
        else if (bonk) { game.sound.from(this).thud(); game.quake(d < 25 ? 0.6 * P.step : 0); this.end(30, game); game.toast(T.bonk, 5); }
        else if (this.t < 0 || !awake || dist(this, HOME) < 34 || (P.leash && this.fromWater && dist(this, this.soakSpot) > P.leash)) { this.end(20, game); if (awake) game.toast(T.giveup, 5); }
        break;
      }
    }
  }
  // voluit rennen; geeft terug of hij ergens tegenaan dreunt (een boom of rots in de weg)
  rush(dt) {
    const bx = this.x, bz = this.z, P = this.P;
    this.walk(this, P.chargeV, dt);
    const fx = this.x + Math.sin(this.yaw) * (P.r + 0.1), fz = this.z + Math.cos(this.yaw) * (P.r + 0.1);
    return this.speed > 3 && blockers.some((b) => !b.beast && b.r >= 0.3 && Math.hypot(fx - b.x, fz - b.z) < b.r + P.r - 0.2 && Math.hypot(this.x - bx, this.z - bz) < this.speed * dt * 0.8);
  }
  strike(game, p, d, calm) {
    const P = this.P, from = this.kicker || this, k = 1 / (dist(from, p) || 0.01);
    game.bite(this, P.dmg, true);
    game.player.vel.set((p.x - from.x) * k * P.fling, 0, (p.z - from.z) * k * P.fling); game.player.vy = 4.5; game.player.onGround = false;
    game.quake(0.9); this.end(calm, game);
  }
  end(calm, game) { this.state = 'roam'; this.calm = calm; this.t = 0; game.discover(this.P.lesson); }

  // ---------- de neushoorn: slechte ogen, een scherpe neus, en rechtuit ----------
  rhino(dt, game, S, d, awake, night) {
    const P = this.P, T = this.T, p = game.player.pos, aware = S.seen || S.smelled;
    switch (this.state) {
      case 'roam': case 'stop':
        this.roam(dt, night, game);
        if (!awake || this.calm > 0) break;
        if (aware) {
          this.state = 'watch'; this.t = 0; this.lost = 0; game.sound.from(this).snort(0.7);
          this.once(S.seen ? 'watch' : 'sniff', game, 6);
        } else if (d < 13) {
          // zo dichtbij, en hij merkt niets: dan sta je goed in de wind
          this.nearT += dt;
          if (this.nearT > 3.5 && this.once('unseen', game, 6, 'murmur')) game.discover('rhino');
        } else this.nearT = 0;
        break;
      case 'watch':
        this.t += dt; this.walk(this, 0, dt); this.face = p; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 0.6);
        this.lost = aware ? 0 : this.lost + dt;
        if (!awake || this.lost > 3.5) { this.end(4, game); if (awake) game.toast(T.letgo, 4); }
        else if (S.close || this.t > 5.5 || (S.seen && this.t > 2.5)) { this.state = 'warn'; this.t = P.warnT; game.sound.from(this).snort(1); game.toast(T.anger, 5); }
        break;
      case 'warn':
        this.t -= dt; this.walk(this, 0, dt); this.face = p; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 1.6);
        this.mode = 'warn';
        if (this.t < 0) {
          if (awake && d < P.chargeD) { this.state = 'charge'; this.t = P.chargeT; this.minD = d; this.past = false; game.sound.from(this).snort(1); }
          else { this.end(10, game); game.toast(T.letgo, 4); }
        }
        break;
      case 'charge': {
        // hij draait bijna niet bij: wie opzij springt, ziet hem voorbij denderen
        this.t -= dt; this.minD = Math.min(this.minD, d);
        const ahead = (p.x - this.x) * Math.sin(this.yaw) + (p.z - this.z) * Math.cos(this.yaw);
        if (!this.past && ahead < -2) { this.past = true; this.t = Math.min(this.t, 0.9); }
        if (!this.past) this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * P.chargeTurn);
        const bonk = this.rush(dt);
        if (awake && d < P.hitR) this.strike(game, p, d, 22);
        else if (bonk) { game.sound.from(this).thud(); game.quake(d < 25 ? 0.5 : 0); this.end(25, game); game.toast(T.bonk, 5); }
        else if (this.t < 0 || !awake || dist(this, HOME) < 34) {
          this.end(16, game);
          if (awake && this.minD < 7) { game.toast(T.dodge, 5); game.discover('dodge'); } else if (awake) game.toast(T.giveup, 5);
        }
        break;
      }
    }
  }

  // ---------- de giraffen: kijken, vluchten, en zien wat jij niet ziet ----------
  // het dichtstbijzijnde roofdier dat rondsluipt of jaagt
  predator(game) {
    let best = null, bd = this.P.watchFor;
    const see = (o) => { const k = dist(o, this); if (k < bd) { bd = k; best = o; } };
    for (const h of game.hyenas.list) if (['sneak', 'prowl', 'curious', 'windup', 'rush'].includes(h.state)) see(h);
    for (const c of game.sabres.list) if (['stalk', 'chase', 'attack', 'warn'].includes(c.state)) see(c);
    const L = game.leopard; if (L && ['prowl', 'stalk', 'freeze', 'pounce'].includes(L.state)) see(L);
    return best;
  }
  flee(from, game) {
    // naar de plek op hun ronde die het verst van het gevaar ligt
    let best = this.wp, bs = -1e9;
    this.route.forEach(([x, z], i) => { const s = Math.hypot(x - from.x, z - from.z) - Math.hypot(x - this.x, z - this.z) * 0.6; if (s > bs) { bs = s; best = i; } });
    this.wp = best; this.state = 'flee'; this.t = 9; game.sound.from(this).stomp(0.5);
  }
  shy(dt, game, S, d, awake, night) {
    const P = this.P, p = game.player.pos, pred = this.threatAt;
    const tame = !awake || this.calm > 0;
    // wie toch achter de poten komt, krijgt een trap
    if (!tame && this.state !== 'kick') {
      const m = this.members.find((o) => o.speed < 2 && dist(o, p) < P.hitR * o.size);
      if (m) { this.state = 'kick'; this.t = 0.55; this.who = m; game.sound.from(m).stomp(0.6); }
    }
    switch (this.state) {
      case 'roam': case 'stop':
        this.roam(dt, night, game);
        if (pred) { this.state = 'lookout'; this.t = 0; }
        else if (!tame && S.seen) { this.state = 'watch'; this.t = 0; this.once('watch', game, 5); }
        break;
      case 'lookout':
        this.t += dt; this.walk(this, 0, dt);
        if (!pred) { this.state = 'roam'; this.t = 0; break; }
        this.face = pred; this.yaw = turn(this.yaw, Math.atan2(pred.x - this.x, pred.z - this.z), dt * 0.8);
        if (this.t > 2.5 && d < 75 && awake && this.once('lookout', game, 7, 'murmur')) game.discover('lookout');
        if (dist(pred, this) < 28) this.flee(pred, game);
        else if (!tame && d < S.sight * 0.55) { this.flee(p, game); this.once('flee', game, 5); game.discover('giraffe'); }
        break;
      case 'watch':
        this.t += dt; this.walk(this, 0, dt); this.face = p; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 0.8);
        if (pred) { this.state = 'lookout'; this.t = 0; }
        else if (tame || d > S.sight + 6) { this.state = 'roam'; this.t = 0; }
        else if (d < S.sight * 0.55) { this.flee(p, game); this.once('flee', game, 5); game.discover('giraffe'); }
        break;
      case 'flee': {
        this.t -= dt;
        const [wx, wz] = this.route[this.wp], gd = Math.hypot(wx - this.x, wz - this.z);
        this.yaw = turn(this.yaw, Math.atan2(wx - this.x, wz - this.z), dt * P.chargeTurn);
        this.walk(this, P.chargeV, dt);
        if (this.t < 0 || gd < 7) { this.state = 'roam'; this.t = 0; this.calm = Math.max(this.calm, 5); }
        break;
      }
      case 'kick': {
        const m = this.who; this.kicker = m; this.t -= dt; this.walk(this, 0, dt);
        // met de achterkant naar je toe
        m.yaw = turn(m.yaw, Math.atan2(m.x - p.x, m.z - p.z), dt * 5);
        if (this.t < 0) {
          if (awake && dist(m, p) < P.hitR * m.size + 0.8) this.strike(game, p, d, 6);
          this.flee(p, game); game.discover('giraffe');
        }
        break;
      }
    }
  }

  place() {
    for (const m of this.members) {
      if (m === this && this.dead) continue;
      m.g.position.set(m.x, height(m.x, m.z), m.z); m.g.rotation.y = m.yaw; m.block.x = m.x; m.block.z = m.z;
    }
  }
  danger() { return this.dead || this.P.ai === 'shy' ? 0 : { watch: 0.3, warn: 0.75, charge: 1 }[this.state] || 0; }

  // ---------- het einde van de droogte ----------
  // Geeft de tekst voor het ochtendbericht terug (of null als er niets te melden is)
  newDay(dry, rain, game) {
    const T = this.T, D = this.P.dies;
    if (rain) {
      if (!this.dead) return null;
      // de regen spoelt alles weg; alleen een kies of een tand blijft liggen, en een nieuw dier neemt zijn plek in
      if (game.hyenas.home === this.spot) game.hyenas.home = game.sabres.kill || game.carcass;
      const G = this.grave; this.relic.position.set(G.x + 1, height(G.x + 1, G.z) + 0.02, G.z); this.relic.visible = true;
      this.spawn(0); this.seen = false; this.found = false;
      return T.fresh;
    }
    if (D && !this.dead && dry >= DEATH_DRY) { this.die(); return T.fell; }
    if (this.dead) return this.meat > 0 ? T.still : null;
    if (dry === 1 && !this.seen) return T.rumour;
    return null;
  }
  die() {
    const G = this.grave, D = this.P.dies;
    Object.assign(this, { dead: true, state: 'dead', meat: D.meat, cuts: 0, speed: 0, x: G.x, z: G.z, yaw: 2.4, spot: { x: G.x, z: G.z }, soaking: false });
    // op zijn zij, de poten opzij
    this.g.position.set(this.x, height(this.x, this.z) + D.lift, this.z); this.g.rotation.set(0, this.yaw, 1.5);
    this.rig.freeze(D.pose, 0.1); this.rig.update(0.3);
    // het lijf ligt naast het punt waar zijn poten stonden
    this.body = { x: this.x - Math.cos(this.yaw) * D.side, z: this.z + Math.sin(this.yaw) * D.side };
    this.block.x = this.body.x; this.block.z = this.body.z; this.block.r = this.P.r * 0.87;
    this.vultures.center.set(this.body.x, height(this.body.x, this.body.z), this.body.z);
    this.vultures.birds.forEach((b, i) => { b.g.visible = true; b.h = 24 + i * 3; b.r = 10 + i * 2.5; });
  }
  updateDead(dt, game, t, d) {
    game.shield = false;
    this.vultures.update(dt, t);
    // de anderen blijven in het water
    this.follow(dt);
    for (const m of this.herd) { m.g.position.set(m.x, height(m.x, m.z), m.z); m.g.rotation.y = m.yaw; m.block.x = m.x; m.block.z = m.z; this.animate(m, dt, 'soak', t); }
    if (d < 30 && !this.found) { this.found = true; game.toast(this.T.deadFound, 7); }
  }
  cut(game) {
    const T = this.T;
    if (!(game.state.hands.includes('flake') || game.state.hands.includes('axe'))) { game.toast(T.thick, 5); return; }
    if (!game.giveHand('meat')) return;
    this.meat--; this.cuts++; game.sound.eat(); game.discover('cut'); game.discover(this.P.dies.feast);
    game.toast(this.meat > 0 ? T.cut : T.cutLast, 4);
    game.kemHelps(null, this);
    if (this.cuts === 2) setTimeout(() => game.event('hyenas', this.spot), 20000);
  }

  // ---------- wat de rest van het spel wil weten ----------
  lookTargets(p) {
    const out = [], L = this.P.looks;
    if (this.dead) out.push({ look: L.dead, carcass: true, x: this.body.x, z: this.body.z, high: height(this.body.x, this.body.z) + 1.2 });
    for (const m of this.members) if (!(m === this && this.dead)) out.push({ look: L.alive, x: m.x, z: m.z, high: Math.max(-0.1, height(m.x, m.z)) + L.high * m.size });
    if (this.relic && this.relic.visible) out.push({ look: this.P.dies.relic, find: this.P.dies.relic, x: this.relic.position.x, z: this.relic.position.z });
    // de dichtstbijzijnde afdrukken
    let best = null, bd = 30;
    for (const s of this.spots) { if (!s) continue; const k = dist(s, p); if (k < bd) { bd = k; best = s; } }
    if (best) out.push({ look: L.track, x: best.x, z: best.z });
    return out;
  }
}
