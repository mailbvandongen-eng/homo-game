import * as THREE from '../lib/three.module.js';
import { height, WALK, riverZ, blockers } from './world.js';
import { Vultures, turn } from './actors.js';
import { Rig } from './rig.js';
import { HOME } from './group.js';

// De reus: een oude stier van de reuzenolifant Palaeoloxodon recki, ruim vier meter hoog.
// Hij trekt elke dag zijn ronde door het oosten en zuiden en laat een spoor van afdrukken achter.
// Je kunt hem niet doden. Wel volgen: waar hij eet vallen vruchten, en bij hem durven de hyena's niet te komen.
// Kom je te dichtbij, dan waarschuwt hij en valt hij aan. Aan het eind van de droogte bezwijkt hij bij de rivier,
// en dan ligt er meer vlees dan de groep ooit zag. Met de regen komt er een nieuwe stier.
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SCALE = 2.23, WALK_V = 1.3, CHARGE_V = 7;
// zijn ronde: [x, z, wat hij er doet]
// zijn ronde en de plek waar hij valt komen uit het gebiedsbestand
const atZ = (x, z) => (typeof z === 'number' ? z : riverZ(x) + z.river);
let ROUTE = [], GRAVE = { x: 0, z: 0 };
export const DEATH_DRY = 3;                     // op de zoveelste droge dag bezwijkt hij
const PRINTS = 230, STEP = 1.7;

export class Giant {
  constructor(scene, A, plan) {
    ROUTE = plan.route.map(([x, z, what]) => [x, atZ(x, z), what]); GRAVE = { x: plan.grave[0], z: atZ(...plan.grave) };
    this.scene = scene; this.kind = 'giant';
    this.rig = new Rig(A, 'elephant', { scale: SCALE }); this.g = this.rig.root; scene.add(this.g);
    // afdrukken: donkere kuilen in het stof, die oplichten als je je zintuigen gebruikt
    const geo = new THREE.CircleGeometry(0.4, 12); geo.rotateX(-Math.PI / 2);
    this.printMat = new THREE.MeshBasicMaterial({ color: 0x1c1712, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.prints = new THREE.InstancedMesh(geo, this.printMat, PRINTS);
    this.prints.count = 0; this.prints.frustumCulled = false; this.prints.renderOrder = 2; scene.add(this.prints);
    this.spots = []; this.pn = 0; this.walked = 0; this.dummy = new THREE.Object3D();
    this.block = { x: 0, z: 0, r: 1.5, beast: true }; blockers.push(this.block);
    this.vultures = new Vultures(scene, GRAVE.x, GRAVE.z, A);
    // de kies die overblijft als de regen het karkas heeft opgeruimd
    const mm = new THREE.MeshLambertMaterial({ color: 0xe6dcc4, flatShading: true });
    this.molar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), mm); base.scale.set(1, 0.5, 0.55); base.position.y = 0.1; this.molar.add(base);
    const rm = new THREE.MeshLambertMaterial({ color: 0x6e5a42 });
    for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.15 - Math.abs(i - 3) * 0.02), rm); r.position.set(-0.132 + i * 0.044, 0.19 - Math.abs(i - 3) * 0.008, 0); this.molar.add(r); }
    this.molar.rotation.set(0.25, 0.7, 0.15); this.molar.visible = false; scene.add(this.molar);
    this.fruit = []; this.seen = false; this.warned = false; this.shieldT = 0; this.stepT = 0; this.checkT = 0;
    this.spawn(4, true);
  }

  // een (nieuwe) stier neerzetten, met een spoor dat al een eind achter hem ligt
  spawn(at = 0, first = false) {
    const [x, z] = ROUTE[at];
    Object.assign(this, { x, z, yaw: 0, speed: 0, wp: (at + 1) % ROUTE.length, state: 'roam', t: 0, dead: false, meat: 0, cuts: 0, calm: 0, spot: null });
    this.g.rotation.set(0, 0, 0); this.g.visible = true; this.block.r = 1.5;
    this.prints.count = 0; this.spots = []; this.pn = 0; this.molar.visible = first ? false : this.molar.visible;
    for (const b of this.vultures.birds) b.g.visible = false;
    for (let i = 0; i < 2600; i++) this.roam(0.2, 0, null);   // ruim acht minuten vooruit lopen
    this.place();
  }
  get alive() { return !this.dead; }
  get threat() { return this.state === 'warn' || this.state === 'charge'; }

  // ---------- zijn ronde ----------
  roam(dt, night, game) {
    this.t -= dt;
    if (this.state === 'stop') {
      if (this.t < 0) {
        if (this.doing === 'eat' && game) this.dropFruit(game);
        this.state = 'roam'; this.wp = (this.wp + 1) % ROUTE.length;
      }
      return this.walk(0, dt);
    }
    if (night > 0.6) return this.walk(0, dt);   // 's nachts staat hij te dommelen
    const [wx, wz, what] = ROUTE[this.wp], d = Math.hypot(wx - this.x, wz - this.z);
    if (d < 4) {
      if (what === 'pass') this.wp = (this.wp + 1) % ROUTE.length;
      else { this.state = 'stop'; this.doing = what; this.t = what === 'eat' ? 22 : 16; }
      return this.walk(0, dt);
    }
    this.yaw = turn(this.yaw, Math.atan2(wx - this.x, wz - this.z), dt * 0.7);
    this.walk(WALK_V, dt);
  }
  walk(spd, dt) {
    this.speed += (spd - this.speed) * (1 - Math.exp(-dt * 2.5));
    const dx = Math.sin(this.yaw) * this.speed * dt, dz = Math.cos(this.yaw) * this.speed * dt;
    this.x += dx; this.z += dz;
    // om bomen en rotsen heen
    for (const b of blockers) {
      if (b === this.block) continue;
      const ox = this.x - b.x, oz = this.z - b.z, d = Math.hypot(ox, oz), min = b.r + 1.5;
      if (d < min && d > 0.001) { this.x = b.x + ox / d * min; this.z = b.z + oz / d * min; }
    }
    const lim = WALK - 12; this.x = THREE.MathUtils.clamp(this.x, -lim, lim);
    this.z = THREE.MathUtils.clamp(this.z, -lim, riverZ(this.x) - 8);
    // elke paar passen een afdruk, links en rechts
    this.walked += Math.hypot(dx, dz);
    if (this.walked > STEP) {
      this.walked = 0;
      const k = this.pn % 2 ? 0.75 : -0.75, px = this.x + Math.cos(this.yaw) * k, pz = this.z - Math.sin(this.yaw) * k, i = this.pn++ % PRINTS;
      this.dummy.position.set(px, height(px, pz) + 0.05, pz); this.dummy.rotation.set(0, this.yaw, 0); this.dummy.scale.set(1, 1, 1.15); this.dummy.updateMatrix();
      this.prints.setMatrixAt(i, this.dummy.matrix); this.prints.count = Math.min(this.pn, PRINTS); this.prints.instanceMatrix.needsUpdate = true;
      this.spots[i] = { x: px, z: pz };
    }
  }
  // waar hij aan een boom heeft staan trekken, liggen daarna vruchten
  dropFruit(game) {
    this.fruit = this.fruit.filter((t) => !t.gone);
    while (this.fruit.length > 6) game.removeThing(this.fruit.shift());
    for (let i = 0; i < 3; i++) {
      const a = this.yaw + 2.2 + i * 0.9, t = game.drop('berry', this.x + Math.sin(a) * 3.2, this.z + Math.cos(a) * 3.2, true);
      if (t) this.fruit.push(t);
    }
    if (dist(this, game.player.pos) < 40) { game.murmur('De reus heeft de boom leeggeschud. Waar hij stond, liggen vruchten in het stof.', 5); game.discover('fruit'); }
  }

  // ---------- elke stap ----------
  update(dt, game, t) {
    const p = game.player.pos, night = game.night, d = dist(this, p) || 0.01;
    this.printMat.color.setHex(game.state.sensing ? 0xffe9a8 : 0x1c1712); this.printMat.opacity = game.state.sensing ? 0.9 : 0.42;
    this.checkT -= dt;
    if (this.checkT < 0) {
      this.checkT = 0.5;
      if (!game.state.found.has('track') && this.spots.some((s) => s && dist(s, p) < 2.5)) {
        game.murmur('Een afdruk zo groot als een nest, en nog een, en nog een. De randen zijn scherp: dit spoor is vers.', 6); game.discover('track');
      }
    }
    if (this.dead) return this.updateDead(dt, game, t, d);
    const awake = game.state.collapsed <= 0 && game.state.sleeping <= 0;
    const sneak = game.player.sneaking, hid = game.player.hiddenFrom(this.x, this.z), near = hid ? 4 : sneak ? 8 : 20, close = hid ? 3 : sneak ? 4.5 : 11;
    this.calm = Math.max(0, this.calm - dt);
    if (d < 48 && !this.seen) { this.seen = true; game.murmur('Daar staat hij. Een stier zo hoog als een boom, met slagtanden langer dan jij. De grond trilt als hij loopt.', 7); game.sound.rumble(1); }
    // bij de reus durven de hyena's niet te komen
    game.shield = d < 34;
    for (const h of game.hyenas.list) {
      if (dist(h, this) < 38 && ['curious', 'windup', 'rush'].includes(h.state)) { h.state = 'retreat'; h.t = 6; game.sound.yelp(); this.shieldT = 9; }
    }
    if (game.shield && game.hyenas.list.some((h) => dist(h, p) < 45 && h.state !== 'rest')) {
      this.shieldT += dt;
      if (this.shieldT > 8 && !game.state.found.has('shield')) { game.murmur('De hyena\'s blijven op afstand. Zo dicht bij de reus durven ze niet te komen.', 6); game.discover('shield'); }
    }
    let anim = null;
    switch (this.state) {
      case 'roam': case 'stop':
        this.roam(dt, night, game);
        if (awake && this.calm <= 0 && d < near) {
          this.state = 'watch'; this.t = 0; game.sound.rumble(0.8);
          if (!this.warned) { this.warned = true; game.toast('De reus draait zijn kop naar je toe en zet zijn oren wijd uit. Niet dichterbij komen.', 5); }
        }
        break;
      case 'watch':
        this.t += dt; this.walk(0, dt); this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 0.9);
        if (!awake || d > near + 7) { this.state = 'roam'; this.t = 0; }
        else if (d < close || this.t > 6) this.anger(game);
        break;
      case 'warn':
        this.t -= dt; this.walk(0, dt); this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 1.2);
        anim = 'warn';
        if (this.t < 0) {
          if (awake && d < 27) { this.state = 'charge'; this.t = 7; game.sound.trumpet(1); }
          else { this.end(12, game); game.toast('De reus schudt zijn kop en laat het erbij. Deze keer.', 4); }
        }
        break;
      case 'charge': {
        this.t -= dt; this.yaw = turn(this.yaw, Math.atan2(p.x - this.x, p.z - this.z), dt * 1.3);
        const bx = this.x, bz = this.z;
        this.walk(CHARGE_V, dt);
        // staat er een boom of rots in de weg? Dan dreunt hij ertegenaan
        const fx = this.x + Math.sin(this.yaw) * 1.6, fz = this.z + Math.cos(this.yaw) * 1.6;
        const bonk = this.speed > 3 && blockers.some((b) => b !== this.block && b.r >= 0.3 && Math.hypot(fx - b.x, fz - b.z) < b.r + 1.3 && Math.hypot(this.x - bx, this.z - bz) < this.speed * dt * 0.8);
        if (awake && d < 2.9) {
          game.bite(this, 38, true);
          const k = 1 / d; game.player.vel.set((p.x - this.x) * k * 15, 0, (p.z - this.z) * k * 15); game.player.vy = 4.5; game.player.onGround = false;
          game.quake(0.9); this.end(25, game);
        } else if (bonk) {
          game.sound.thud(); game.quake(d < 25 ? 0.6 : 0); this.end(30, game);
          game.toast('De reus dreunt tegen het hout. Hij schudt zijn kop en druipt af.', 5);
        } else if (this.t < 0 || !awake || dist(this, HOME) < 34) { this.end(20, game); if (awake) game.toast('De reus geeft het op en draait zich om. Je hart bonkt in je keel.', 5); }
        break;
      }
    }
    this.place();
    // welke beweging hoort erbij?
    const R = this.rig;
    if (anim === 'warn') R.play('05_Attack', { fade: 0.3, speed: 1.5 });
    else if (this.state === 'charge' || this.speed > 2.6) R.play('03_Run', { fade: 0.3, speed: Math.max(0.7, this.speed / 4.1) });
    else if (this.speed > 0.15) R.play('02_Walk', { fade: 0.5, speed: Math.max(0.4, this.speed / 1.36) });
    else if (this.state === 'stop') R.play('04_Eating', { fade: 0.8 });
    else R.play('01_Idle', { fade: 0.8 });
    R.update(dt);
    // zijn stappen hoor en voel je van ver
    if (this.speed > 0.4) {
      this.stepT -= dt * (this.speed > 2.6 ? 3.2 : 1.1);
      if (this.stepT < 0) {
        this.stepT = 1; const v = Math.max(0, 1 - d / 60);
        if (v > 0) { game.sound.stomp(v * (this.speed > 2.6 ? 1 : 0.6)); if (d < 26) game.quake((this.speed > 2.6 ? 0.35 : 0.12) * (1 - d / 26)); }
      }
    }
    if (d < 70 && Math.random() < dt * 0.05) game.sound.rumble(Math.max(0.2, 1 - d / 70));
  }
  anger(game) {
    this.state = 'warn'; this.t = 2.4; game.sound.trumpet(0.8);
    game.toast('Hij trompettert en stampt! Ren, of zorg dat er een boom tussen jullie staat!', 5);
  }
  end(calm, game) { this.state = 'roam'; this.calm = calm; this.t = 0; game.discover('giant'); }
  place() {
    this.g.position.set(this.x, height(this.x, this.z), this.z); this.g.rotation.y = this.yaw;
    this.block.x = this.x; this.block.z = this.z;
  }
  danger() { return this.dead ? 0 : { watch: 0.3, warn: 0.75, charge: 1 }[this.state] || 0; }

  // ---------- het einde van de droogte ----------
  // Geeft de tekst voor het ochtendbericht terug (of null als er niets te melden is)
  newDay(dry, rain, game) {
    if (rain) {
      if (!this.dead) return null;
      // de regen spoelt alles weg; alleen een kies blijft liggen, en een nieuwe stier vindt het spoor
      if (game.hyenas.home === this.spot) game.hyenas.home = game.sabres.kill || game.carcass;
      this.molar.position.set(GRAVE.x + 1, height(GRAVE.x + 1, GRAVE.z) + 0.02, GRAVE.z); this.molar.visible = true;
      this.spawn(0); this.seen = false;
      return 'Van de gevallen reus liggen alleen nog botten bij de rivier. In het zuiden dreunt de grond alweer: er is een nieuwe stier.';
    }
    if (!this.dead && dry >= DEATH_DRY) { this.die(); return 'Tor wijst naar het oosten, naar de rivier. Daar cirkelen meer gieren dan hij ooit zag. De oude reus is gevallen.'; }
    if (this.dead) return this.meat > 0 ? 'Bij de rivier in het oosten ligt de reus nog. Er zit meer vlees aan dan jullie op kunnen.' : null;
    if (dry === 1 && !this.seen) return 'Ibo voelde vannacht de grond trillen. In het oosten liggen afdrukken zo groot als een nest.';
    return null;
  }
  die() {
    Object.assign(this, { dead: true, state: 'dead', meat: 12, cuts: 0, speed: 0, x: GRAVE.x, z: GRAVE.z, yaw: 2.4, spot: { x: GRAVE.x, z: GRAVE.z } });
    // op zijn zij, de poten opzij
    this.g.position.set(this.x, height(this.x, this.z) + 1.05, this.z); this.g.rotation.set(0, this.yaw, 1.5);
    this.rig.freeze('01_Idle', 0.1); this.rig.update(0.3);
    // het lijf ligt naast het punt waar zijn poten stonden
    this.body = { x: this.x - Math.cos(this.yaw) * 2, z: this.z + Math.sin(this.yaw) * 2 };
    this.block.x = this.body.x; this.block.z = this.body.z; this.block.r = 1.3;
    this.vultures.center.set(this.body.x, height(this.body.x, this.body.z), this.body.z);
    this.vultures.birds.forEach((b, i) => { b.g.visible = true; b.h = 24 + i * 3; b.r = 10 + i * 2.5; });
  }
  updateDead(dt, game, t, d) {
    game.shield = false;
    this.vultures.update(dt, t);
    if (d < 30 && !this.found) { this.found = true; game.toast('De reus ligt op zijn zij in het stof. Zoveel vlees… en nog niemand die het heeft opengemaakt.', 7); }
  }
  cut(game) {
    if (!game.state.hands.includes('flake')) { game.toast('De huid is dikker dan je duim. Zonder scherpe afslag kom je er niet doorheen.', 5); return; }
    if (!game.giveHand('meat')) return;
    this.meat--; this.cuts++; game.sound.eat(); game.discover('cut'); game.discover('feast');
    game.toast(this.meat > 0 ? 'Je snijdt een lap vlees uit de flank. Er zit nog voor dagen aan.' : 'Je snijdt het laatste goede vlees los. De rest is voor de gieren.', 4);
    game.kemHelps(null, this);
    if (this.cuts === 2) setTimeout(() => game.event('hyenas', this.spot), 20000);
  }

  // ---------- wat de rest van het spel wil weten ----------
  lookTargets(p) {
    const out = [];
    if (this.dead) out.push({ look: 'giantdead', x: this.body.x, z: this.body.z, high: height(this.body.x, this.body.z) + 1.2 });
    else out.push({ look: 'giant', x: this.x, z: this.z, high: height(this.x, this.z) + 3 });
    if (this.molar.visible) out.push({ look: 'molar', find: 'molar', x: this.molar.position.x, z: this.molar.position.z });
    // de dichtstbijzijnde afdrukken
    let best = null, bd = 30;
    for (const s of this.spots) { if (!s) continue; const k = dist(s, p); if (k < bd) { bd = k; best = s; } }
    if (best) out.push({ look: 'track', x: best.x, z: best.z });
    return out;
  }
}
