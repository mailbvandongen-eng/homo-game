import * as THREE from '../lib/three.module.js';
import { height, WALK, riverZ, riverDist, blockers } from './world.js';
import { Herd, turn } from './actors.js';
import { Rig } from './rig.js';
import { HOME } from './group.js';
import { AREA } from './eras/index.js';

// Ontmoetingen onderweg: ver van de slaapboom ligt er steeds iets op je pad.
// Elke ontmoeting is een kleine keuze: een kans op eten, met een prijs.
const SNAKE = 0.016, UP = new THREE.Vector3(0, 1, 0);   // de cobra is in zijn bestand zo'n 100 eenheden lang: hier anderhalve meter
const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const ORDER = ['gazelle', 'snake', 'nest', 'bees', 'strangers'];
const FOOD = ['meat', 'honey', 'egg', 'bone'];   // wat vreemden van de grond willen oprapen
const AVOID = [[HOME.x, HOME.z, 38], [...AREA.sabres.lair, 30], [...AREA.leopard.tree, 25], [AREA.carcass.x, AREA.carcass.z, 22]];   // slaapboom, katten, luipaard, karkas

function haloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const HALO = haloTexture();
function halo(scene, color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, color, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
  s.scale.setScalar(size); s.visible = false; s.renderOrder = 5; scene.add(s);
  return s;
}

export class Encounters {
  constructor(scene, A) {
    this.scene = scene; this.A = A; this.list = []; this.cool = 25; this.n = 0; this.leoWarn = false;
  }

  // ---------- waar en wanneer ----------
  okSpot(x, z, water) {
    const lim = WALK - 15;
    if (Math.abs(x) > lim || Math.abs(z) > lim) return false;
    if (!water && riverDist(x, z) < 12) return false;
    for (const [ax, az, r] of AVOID) if (Math.hypot(x - ax, z - az) < r) return false;
    for (const b of blockers) if (Math.hypot(x - b.x, z - b.z) < b.r + 1.5) return false;
    return true;
  }
  // zoek een plek een eind voor de speler uit, in de richting waarin hij loopt
  place(kind, game) {
    const p = game.player.pos, yaw = game.player.yaw;
    if (kind === 'bees') {
      // een boom, het liefst voor je
      let best = null, bs = -1e9;
      for (const b of blockers) {
        if (b.top || b.beast) continue;
        const d = dist(b, p); if (d < 25 || d > 75 || dist(b, HOME) < 45) continue;
        const front = ((b.x - p.x) * Math.sin(yaw) + (b.z - p.z) * Math.cos(yaw)) / d, s = front * 30 - d * 0.3;
        if (s > bs) { bs = s; best = b; }
      }
      return best && { x: best.x, z: best.z, tree: best };
    }
    for (let k = 0; k < 10; k++) {
      const near = kind === 'snake', a = yaw + (Math.random() - 0.5) * (near ? 0.5 : 1.1) * (1 + k * 0.25), r = near ? 22 + Math.random() * 10 : 38 + Math.random() * 14;
      let x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (kind === 'strangers') { x = p.x + Math.sin(a) * r * 1.2; z = riverZ(x) - 9; const d = Math.hypot(x - p.x, z - p.z); if (d < 32 || d > 95) continue; }
      if (this.okSpot(x, z, kind === 'strangers')) return { x, z };
    }
    return null;
  }
  spawn(kind, x, z, game, tree) {
    const e = this['mk_' + kind](x, z, game, tree);
    e.kind = kind; e.age = 0; this.list.push(e);
    return e;
  }
  has(kind) { return this.list.some((e) => e.kind === kind); }

  update(dt, game) {
    const p = game.player.pos, s = game.state;
    // nieuwe ontmoeting: alleen ver van huis, overdag, en niet alles tegelijk
    if (s.started && s.sleeping <= 0 && s.collapsed <= 0 && dist(p, HOME) > 42 && game.night < 0.6 && this.list.length < 2 && !this.off) {
      this.cool -= dt * (game.player.speed > 1 ? 1 : 0.3);
      if (this.cool < 0) {
        for (let k = 0; k < ORDER.length; k++) {
          const kind = ORDER[(this.n + k) % ORDER.length];
          if (this.has(kind)) continue;
          const at = this.place(kind, game);
          if (at) { this.spawn(kind, at.x, at.z, game, at.tree); this.n += k + 1; break; }
        }
        this.cool = 70 + Math.random() * 50;
      }
    }
    for (const e of this.list) {
      e.age += dt;
      this['up_' + e.kind](e, dt, game);
      if (e.age > 60 && dist(e, p) > 120) e.done = true;
      if (e.done) this['rm_' + e.kind](e, game);
    }
    this.list = this.list.filter((e) => !e.done);
    this.kem(game);
  }

  // Kem loopt mee: hij ziet gevaar vaak eerder dan jij
  kem(game) {
    const k = game.group.list[1], p = game.player.pos, leo = game.leopard;
    if (!['stalk', 'freeze', 'pounce'].includes(leo.state)) this.leoWarn = false;
    if (k.state !== 'follow') return;
    if (leo.state === 'stalk' && !this.leoWarn && dist(leo, p) < 30) {
      this.leoWarn = true; k.busy = 3; game.sound.alarm();
      game.toast('Kem gromt zacht en kijkt strak achter je. Er sluipt iets!', 5);
    }
    for (const e of this.list) {
      if (e.kemSaw) continue;
      if (e.kind === 'snake' && e.state === 'lie' && dist(k, e) < 12 && dist(p, e) < 13) {
        e.kemSaw = true; e.shown = true; k.busy = 4; game.sound.hiss(1);
        game.toast('Kem blijft stokstijf staan en wijst naar de grond voor je. Daar ligt iets!', 5);
      }
      if (e.kind === 'strangers' && !e.friendly && dist(p, e) < 34 && dist(p, e) > 18) {
        e.kemSaw = true; k.busy = 3;
        game.murmur('Kem trekt aan je arm en wijst: daar zitten vreemden bij het water.', 5);
      }
    }
  }

  // ---------- de gewonde gazelle ----------
  mk_gazelle(x, z) {
    const herd = new Herd(this.scene, x, z, 1, this.A), m = herd.members[0];
    Object.assign(m, { x, z, kind: 'wounded', speed: 0, look: 0 });
    return { x, z, herd, m, stamina: 1, meat: 2, t: 0, gone: 0 };
  }
  up_gazelle(e, dt, game) {
    const m = e.m, p = game.player.pos, d = dist(m, p) || 0.01;
    e.x = m.x; e.z = m.z;
    if (e.dead) {
      e.t += dt;
      // de geur trekt hyena's aan
      if (e.t > 30 && !e.called && e.meat > 0) { e.called = true; e.spot = { x: m.x, z: m.z }; game.event('hyenas', e.spot); }
      if (e.meat <= 0) { e.gone += dt; if (e.gone > 45) e.done = true; }
      return;
    }
    if (!e.seen && d < 32) { e.seen = true; game.murmur('Daar loopt een gazelle helemaal alleen. Ze trekt met haar achterpoot…', 5); }
    const scared = d < (game.player.sneaking ? 7 : 16) && !game.player.hiddenFrom(m.x, m.z);
    let spd = 0;
    if (scared) {
      // weg van jou; maar ze wordt snel moe
      let tx = (m.x - p.x) / d, tz = (m.z - p.z) / d;
      if (riverDist(m.x, m.z) < 10) tz -= 1.5;
      const lim = WALK - 14; if (Math.abs(m.x) > lim) tx -= Math.sign(m.x) * 2; if (Math.abs(m.z) > lim) tz -= Math.sign(m.z) * 2;
      m.yaw = turn(m.yaw, Math.atan2(tx, tz), dt * 4);
      spd = e.stamina > 0.05 ? 2.3 + 2.2 * e.stamina : 0.9;
      e.stamina = Math.max(0, e.stamina - dt / 20);
      if (e.stamina <= 0.05 && !e.tired) { e.tired = true; game.toast('De gazelle kan niet meer. Ze strompelt alleen nog.', 4); game.discover('wounded'); }
    } else { e.stamina = Math.min(1, e.stamina + dt / 45); if (e.stamina > 0.5) e.tired = false; }
    m.look = scared || d < 30 ? 1 : 0;
    m.speed += (spd - m.speed) * (1 - Math.exp(-dt * 4));
    m.x += Math.sin(m.yaw) * m.speed * dt; m.z += Math.cos(m.yaw) * m.speed * dt;
    e.herd.pose(m, dt);
    m.g.rotation.z = Math.sin(m.phase) * 0.1 * Math.min(1, m.speed);   // ze hinkt
    m.g.position.y -= Math.abs(Math.sin(m.phase)) * 0.07 * Math.min(1, m.speed);
  }
  hit_gazelle(e, how, game) {
    if (e.dead) return;
    if (how === 'fist') { game.toast('Met je vuist krijg je haar niet neer. Je hebt een kei nodig.', 4); e.stamina = Math.min(1, e.stamina + 0.2); return; }
    if (how === 'throw' && e.stamina > 0.4) { e.stamina -= 0.45; game.sound.flee(); game.toast('Raak! Ze struikelt, maar hinkt door. Blijf erachteraan.', 4); return; }
    e.dead = true; e.t = 0; const m = e.m;
    m.speed = 0; m.g.rotation.set(0, m.yaw, 1.45); m.g.position.y = height(m.x, m.z) + 0.22;
    game.sound.thud(); game.discover('wounded');
    game.toast((game.state.hands.includes('flake') || game.state.hands.includes('axe')) ? 'De gazelle valt. Vlees! Snijd het los voordat iemand anders het ruikt.' : 'De gazelle valt. Vlees! Maar zonder scherpe afslag krijg je de huid niet open.', 6);
  }
  cutPrey(e, game) {
    if (!(game.state.hands.includes('flake') || game.state.hands.includes('axe'))) { game.toast('Met je handen krijg je de taaie huid niet open. Je hebt iets scherps nodig.', 5); return; }
    if (!game.giveHand('meat')) return;
    e.meat--; game.sound.eat(); game.discover('cut');
    game.toast(e.meat > 0 ? 'Je snijdt een lap vlees los. Er zit nog meer aan.' : 'Je snijdt de laatste lap vlees los.', 4);
  }
  rm_gazelle(e, game) {
    this.scene.remove(e.m.g);
    if (e.spot && game.hyenas.home === e.spot) game.hyenas.home = game.sabres.kill || game.carcass;
  }

  // ---------- de slang ----------
  mk_snake(x, z) {
    // een cobra met botten; hij kan plat liggen, zich oprichten en uithalen (zie assets/CREDITS.md)
    const rig = new Rig(this.A, 'cobra', { scale: SNAKE, facing: -Math.PI / 2 }), g = rig.root;
    rig.model.position.set(33 * SNAKE, 0, -10 * SNAKE);   // het midden van het lijf op de plek zelf
    // de botten van staart naar kop: daarlangs loopt de golf als hij wegkronkelt
    rig.chain = [['Tail_07', 'Tail_06', 'Tail_05', 'Tail_04', 'Tail_03', 'Tail_02', 'Tail_01'], ['Spine_01', 'Spine_02', 'Spine_03', 'Neck_01', 'Neck_02']].map((c) => c.map((n) => rig.bone(n)));
    rig.play('lie');
    g.position.set(x, height(x, z), z); g.rotation.y = Math.random() * 6.28; this.scene.add(g);
    return { x, z, g, rig, anim: 'lie', state: 'lie', hissT: 0, t: 0, wig: Math.random() * 6, halo: halo(this.scene, 0xff5a3a, 1.6) };
  }
  up_snake(e, dt, game) {
    const p = game.player.pos, s = game.state, d = dist(e, p) || 0.01;
    const up = e.shown || e.state === 'flee';
    e.wig += dt * (e.state === 'flee' ? 14 : up ? 3 : 0.6);
    const want = e.state === 'strike' ? 'strike' : e.state === 'lie' && e.shown ? 'alert' : 'lie';
    if (want !== e.anim) {
      e.anim = want; e.rig.play(want, { fade: want === 'strike' ? 0.12 : 0.5, once: want === 'strike' });
      if (want === 'alert') e.rig.current.setLoop(THREE.LoopPingPong, Infinity);   // heen en weer wiegen, zonder sprongetje
    }
    e.rig.update(dt);
    if (e.state === 'flee') e.rig.chain.forEach((c, k) => c.forEach((bn, i) => e.rig.bend(bn, UP, Math.sin(e.wig + (k ? i : -i) * 0.9) * 0.3)));
    e.halo.visible = (s.sensing && d < 26 || !!e.shown) && e.state === 'lie';
    e.halo.position.set(e.x, height(e.x, e.z) + 0.3, e.z); e.halo.material.opacity = e.shown && !s.sensing ? 0.35 : 0.9;
    if (e.state === 'flee') {
      e.t -= dt; e.x += Math.sin(e.g.rotation.y) * 3 * dt; e.z += Math.cos(e.g.rotation.y) * 3 * dt;
      e.g.position.set(e.x, height(e.x, e.z), e.z); e.g.scale.setScalar(Math.min(1, e.t / 1.5));
      if (e.t < 0) e.done = true;
      return;
    }
    if (e.state === 'strike') { e.t -= dt; if (e.t < 0) this.flee(e, p); return; }
    e.g.rotation.y = turn(e.g.rotation.y, Math.atan2(p.x - e.x, p.z - e.z), dt * (up ? 3 : 0.4));
    if (s.sensing && d < 14 && !e.shown) { e.shown = true; game.toast('Daar! Tussen het gras ligt een slang, precies in de kleur van de grond.', 5); game.discover('snake'); }
    // sissen hoor je alleen als je zelf stil bent
    e.hissT -= dt;
    if (d < 8 && e.hissT < 0 && (game.player.speed < 2.3 || e.shown)) {
      e.hissT = 2.2; game.sound.hiss(1 - d / 10);
      if (!e.heard && !e.shown) { e.heard = true; game.toast('Ssss… Vlak voor je sist iets. Sta stil en gebruik je zintuigen.', 5); }
    }
    if (d < 1.05 && game.player.onGround && s.collapsed <= 0 && s.sleeping <= 0) {
      game.hurt(18); s.sick = Math.max(s.sick, 70); game.discover('snake');
      game.toast(e.shown ? 'Te dichtbij! De slang bijt in je enkel. Het gif brandt. Bitterblad helpt.' : 'Au! Een slang! Je trapte er bijna op en hij bijt in je enkel. Het gif brandt. Bitterblad helpt.', 7);
      this.strike(e, p);
    }
  }
  // uithalen: even de beet laten zien, daarna maakt hij zich uit de voeten
  strike(e, at) { e.state = 'strike'; e.t = 1.1; e.g.rotation.y = Math.atan2(at.x - e.x, at.z - e.z); e.halo.visible = false; }
  flee(e, from) { e.state = 'flee'; e.t = 5; e.g.rotation.y = Math.atan2(e.x - from.x, e.z - from.z); e.halo.visible = false; }
  hit_snake(e, how, game) {
    if (e.state !== 'lie') return;
    if (how === 'fist') { game.hurt(18); game.state.sick = Math.max(game.state.sick, 70); game.toast('Met je blote hand? De slang is sneller en bijt. Het gif brandt. Bitterblad helpt.', 6); game.discover('snake'); this.strike(e, game.player.pos); return; }
    game.toast('Raak! De slang schiet weg in het gras.', 4);
    game.discover('snake'); this.flee(e, game.player.pos);
  }
  rm_snake(e) { this.scene.remove(e.g, e.halo); }

  // ---------- het nest ----------
  mk_nest(x, z, game) {
    const y = height(x, z), g = new THREE.Group(), tw = lam(0x6a5236);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.11, 5, 10), tw); ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; g.add(ring);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * 6.28, t = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5 + Math.random() * 0.3, 4), lam(i % 2 ? 0x8a6e48 : 0x574428));
      t.position.set(Math.cos(a) * 0.4, 0.12, Math.sin(a) * 0.4); t.rotation.set(1.4, a + 1.2, Math.random() * 0.5); g.add(t);
    }
    g.position.set(x, y, z); this.scene.add(g);
    const eggs = [];
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * 6.28, ex = x + Math.cos(a) * 0.13, ez = z + Math.sin(a) * 0.13;
      eggs.push(game.drop('egg', ex, ez, true));
    }
    // een grote loopvogel (zoals een trap): grijsbruin, lange nek en poten
    const bg = new THREE.Group(), body = new THREE.Group(); bg.add(body);
    const part = (geo, color, px, py, pz, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, lam(color)); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
    body.add(part(new THREE.SphereGeometry(0.3, 8, 6), 0x8a7458, 0, 0.75, 0, 0.85, 0.8, 1.35));
    body.add(part(new THREE.SphereGeometry(0.2, 7, 5), 0xd8ccb4, 0, 0.66, 0.08, 0.8, 0.7, 1.2));
    body.add(part(new THREE.ConeGeometry(0.16, 0.4, 5), 0x4a3c2c, 0, 0.82, -0.5, 1, 1, 0.5));
    const neck = new THREE.Group(); neck.position.set(0, 0.88, 0.3); body.add(neck);
    neck.add(part(new THREE.CylinderGeometry(0.05, 0.075, 0.5, 6), 0xb8ac98, 0, 0.25, 0));
    neck.add(part(new THREE.SphereGeometry(0.085, 7, 5), 0x6a5a48, 0, 0.53, 0.03, 1, 0.9, 1.3));
    const beak = part(new THREE.ConeGeometry(0.035, 0.16, 4), 0xd8b050, 0, 0.52, 0.19); beak.rotation.x = Math.PI / 2; neck.add(beak);
    const legs = [-1, 1].map((k) => { const L = new THREE.Group(); L.position.set(k * 0.11, 0.56, 0); L.add(part(new THREE.CylinderGeometry(0.022, 0.018, 0.56, 4), 0xc8b070, 0, -0.28, 0)); bg.add(L); return L; });
    this.scene.add(bg);
    const bird = { kind: 'bird', g: bg, body, neck, legs, x, z, yaw: Math.random() * 6.28, speed: 0, phase: 0, state: 'sit', t: 0, up: 0 };
    return { x, z, g, eggs, bird, sqT: 0 };
  }
  up_nest(e, dt, game) {
    const b = e.bird, p = game.player.pos, d = dist(e, p), db = dist(b, p) || 0.01;
    const left = e.eggs.filter((t) => !t.gone).length;
    let tx = 0, tz = 0, spd = 0, face = null;
    const to = (o, v) => { const dd = dist(o, b) || 0.01; tx = (o.x - b.x) / dd; tz = (o.z - b.z) / dd; spd = v; return dd; };
    b.t -= dt; e.sqT -= dt;
    const squawk = (gap) => { if (e.sqT < 0) { e.sqT = gap; game.sound.squawk(Math.max(0.2, 1 - db / 30)); } };
    switch (b.state) {
      case 'sit':
        if (d < 10 && left > 0) { b.state = 'warn'; if (!e.warned) { e.warned = true; game.toast('Een grote vogel komt overeind van haar nest en blaast naar je. Daar liggen eieren!', 5); } }
        break;
      case 'warn':
        face = p; squawk(1.8);
        if (d < 4.5) b.state = 'charge'; else if (d > 14) b.state = 'sit';
        break;
      case 'charge':
        squawk(0.9);
        if (d > 9 || game.state.collapsed > 0) { b.state = 'return'; break; }
        if (to(p, 6.4) < 1.1) {
          game.hurt(6); game.toast('De vogel pikt hard naar je benen!', 2.5); b.state = 'back'; b.t = 1.1;
        }
        break;
      case 'back': to({ x: b.x * 2 - p.x, z: b.z * 2 - p.z }, 3); if (b.t < 0) b.state = 'charge'; break;
      case 'return': if (to(e, 3.5) < 0.5) { spd = 0; b.state = left > 0 ? 'warn' : 'gone'; b.t = 20; } break;
      case 'fled':   // geraakt door een steen: ze rent een eind weg en komt later terug
        if (b.t < 0) b.state = 'return'; else if (dist(b, e) < 30) to({ x: b.x * 2 - p.x, z: b.z * 2 - p.z }, 7); else face = e;
        break;
      case 'gone':   // het nest is leeg: ze blijft er nog even bij staan en vertrekt dan
        face = e; if (b.t < 0) e.done = true;
        break;
    }
    b.speed += (spd - b.speed) * (1 - Math.exp(-dt * 6));
    if (spd > 0) b.yaw = turn(b.yaw, Math.atan2(tx, tz), dt * 7);
    else if (face) b.yaw = turn(b.yaw, Math.atan2(face.x - b.x, face.z - b.z), dt * 4);
    b.x += Math.sin(b.yaw) * b.speed * dt; b.z += Math.cos(b.yaw) * b.speed * dt;
    b.up += ((b.state === 'sit' ? 0 : 1) - b.up) * (1 - Math.exp(-dt * 5));
    b.phase += dt * b.speed * 2.6;
    b.g.position.set(b.x, height(b.x, b.z) - (1 - b.up) * 0.42, b.z); b.g.rotation.y = b.yaw;
    b.legs.forEach((L, i) => { L.rotation.x = Math.sin(b.phase + i * Math.PI) * 0.7 * Math.min(1, b.speed); });
    // nek naar voren bij de aanval, omhoog bij het waarschuwen
    b.neck.rotation.x = b.state === 'charge' ? 0.9 : b.state === 'sit' ? 0.5 : Math.sin(e.age * 6) * 0.08;
    b.body.rotation.x = b.state === 'charge' ? 0.15 : 0;
    if (left === 0 && !e.empty) { e.empty = true; if (['warn', 'charge', 'back', 'sit'].includes(b.state)) { b.state = 'return'; } }
  }
  hit_bird(e, how, game) {
    const b = e.bird;
    if (how === 'fist') { game.toast('Je slaat naar de vogel. Ze springt opzij en pikt terug!', 3); game.hurt(4); return; }
    b.state = 'fled'; b.t = 32; game.sound.squawk(1); game.sound.flutter();
    game.toast('Raak! De vogel rent krijsend weg. Snel, de eieren!', 4);
  }
  rm_nest(e, game) {
    this.scene.remove(e.g, e.bird.g);
    for (const t of e.eggs) if (!t.gone) game.removeThing(t);
  }

  // ---------- het bijennest ----------
  mk_bees(x, z, game, tree) {
    const r = tree ? 0.26 : 0.52, hx = x + r * 0.7, hz = z + r * 0.7, y = height(x, z) + 1.55;
    const hive = new THREE.Group();
    const comb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lam(0x8a6a2a)); comb.scale.set(0.9, 1.35, 0.9); comb.castShadow = true;
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), lam(0x1e1408)); hole.position.set(0.09, -0.05, 0.09);
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshLambertMaterial({ color: 0xf0b030, emissive: 0x5a3a00 })); drip.position.set(0.02, -0.28, 0.02); drip.scale.y = 1.6;
    hive.add(comb, hole, drip); hive.position.set(hx, y, hz); this.scene.add(hive);
    const N = 16, pos = new Float32Array(N * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const bees = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd040, size: 0.07, sizeAttenuation: true })); bees.frustumCulled = false; this.scene.add(bees);
    return { x: hx + 0.5, z: hz + 0.5, hx, hz, hy: y, hive, drip, bees, pos, honey: 3, angry: 0, stingT: 0, buzzT: 0, halo: halo(this.scene, 0xffb030, 1.4) };
  }
  up_bees(e, dt, game) {
    const p = game.player.pos, s = game.state, d = dist(e, p), awake = game.night < 0.45;
    e.angry = Math.max(0, e.angry - dt);
    // de zwerm: klein rondje om het nest, of een wolk om jou heen als ze boos zijn
    const chase = e.angry > 0 && d < 14, cx = chase ? p.x : e.hx, cy = chase ? p.y + 1.3 : e.hy, cz = chase ? p.z : e.hz;
    const rad = awake ? (chase ? 0.7 : 0.45) : 0.12, sp = awake ? 5 : 0.8;
    for (let i = 0; i < e.pos.length / 3; i++) {
      const a = e.age * sp * (0.7 + (i % 5) * 0.15) + i * 2.4;
      const x = cx + Math.cos(a) * rad * (0.5 + (i % 3) * 0.3), y = cy + Math.sin(a * 1.7 + i) * rad * 0.6, z = cz + Math.sin(a) * rad * (0.5 + (i % 4) * 0.2);
      const k = Math.min(1, dt * 5);
      e.pos[i * 3] += (x - e.pos[i * 3]) * (e.init ? k : 1); e.pos[i * 3 + 1] += (y - e.pos[i * 3 + 1]) * (e.init ? k : 1); e.pos[i * 3 + 2] += (z - e.pos[i * 3 + 2]) * (e.init ? k : 1);
    }
    e.init = true; e.bees.geometry.attributes.position.needsUpdate = true;
    e.drip.visible = e.honey > 0;
    e.halo.visible = s.sensing && d < 30 && e.honey > 0; e.halo.position.set(e.hx, e.hy, e.hz);
    e.buzzT -= dt;
    if (d < 9 && e.buzzT < 0) { e.buzzT = 0.45; game.sound.buzz((1 - d / 10) * (awake ? 1 : 0.25) * (e.angry > 0 ? 2 : 1)); }
    if (d < 11 && !e.seen) { e.seen = true; game.toast(awake ? 'Gezoem. Aan die stam hangt een bijennest. Daar zit honing in… en angels.' : 'Aan die stam hangt een bijennest. De bijen zitten stil in het donker.', 5); }
    if (chase && awake && s.collapsed <= 0) {
      e.stingT -= dt;
      if (e.stingT < 0) { e.stingT = 1.3; game.hurt(4); game.toast('De bijen steken! Rennen!', 2); }
    }
    if (e.honey <= 0 && e.angry <= 0 && e.age > 30) { e.empty = (e.empty || 0) + dt; if (e.empty > 60) e.done = true; }
  }
  takeHoney(e, game) {
    if (e.honey <= 0 || !game.giveHand('honey')) return;
    e.honey--;
    if (game.night < 0.45) {
      e.angry = 12; e.stingT = 0.6; game.hurt(5);
      game.toast('Je graait een raat uit het nest. De bijen storten zich op je! Zouden ze altijd zo fel zijn?', 6);
    } else { game.toast('De bijen zijn loom in het donker. Rustig breek je een raat vol honing af.', 6); game.discover('bees'); }
  }
  rm_bees(e) { this.scene.remove(e.hive, e.bees, e.halo); }

  // ---------- vreemden bij het water ----------
  mk_strangers(x, z) {
    const list = [];
    for (let i = 0; i < 2; i++) {
      const rig = new Rig(this.A, 'hominin', { scale: 1.35 / 162 * (i ? 0.93 : 1.02) });
      rig.model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); if (!/beard|hair|transparency/i.test(o.material.name)) o.material.color.multiply(new THREE.Color(i ? 0xc8a488 : 0xb89478)); } });
      const sx = x + (i ? 1.6 : -1.2), sz = z + (i ? 0.8 : -0.6);
      const m = { kind: 'stranger', rig, g: rig.root, x: sx, z: sz, sx, sz, yaw: 0, speed: 0, once: 0 };
      this.scene.add(rig.root); list.push(m);
    }
    return { x, z, list, state: 'wary', throwT: 1.5, shoutT: 0, t: 0 };
  }
  up_strangers(e, dt, game) {
    const p = game.player.pos, d = dist(e, p);
    e.throwT -= dt; e.shoutT -= dt;
    if (!e.friendly && e.state === 'wary') {
      if (d < 18) {
        if (!e.met) { e.met = true; game.toast('Vreemden bij het water! Ze springen op en schreeuwen. Dit is hun plek.', 5); }
        if (e.shoutT < 0) { e.shoutT = 2.4; game.sound.shout(Math.max(0.3, 1 - d / 25)); }
      }
      if (d < 9.5 && e.throwT < 0 && game.state.collapsed <= 0) {
        e.throwT = 2.4;
        const m = e.list.reduce((a, b) => (dist(a, p) < dist(b, p) ? a : b));
        m.once = 0.7; m.rig.play('Spell_Simple_Shoot', { fade: 0.1, speed: 1.6 });
        const from = new THREE.Vector3(m.x, height(m.x, m.z) + 1.3, m.z);
        game.sound.whoosh();
        game.throws.throw(from, p, (x, z) => {
          game.sound.thud(); game.drop('stone', x, z, true);
          if (Math.hypot(p.x - x, p.z - z) < 1.3 && p.y - height(p.x, p.z) < 0.5) { game.hurt(7); game.toast('Au! Een steen raakt je. Ze menen het. Achteruit!', 4); }
        });
      }
      // ligt er eten en ben jij op afstand? Dan komt er een kijken
      const food = game.things.find((t) => t.kind === 'pick' && !t.gone && FOOD.includes(t.item) && dist(t, e) < 22 && dist(t, p) > 9 && t.byPlayer);
      if (food) { e.state = 'fetch'; e.food = food; e.runner = e.list.reduce((a, b) => (dist(a, food) < dist(b, food) ? a : b)); }
    }
    for (const m of e.list) {
      let tx = 0, tz = 0, spd = 0, face = d < 26 ? p : null;
      const to = (o, v) => { const dd = dist(o, m) || 0.01; tx = (o.x - m.x) / dd; tz = (o.z - m.z) / dd; spd = v; return dd; };
      m.once -= dt;
      if (e.state === 'fetch' && m === e.runner) {
        if (e.food.gone || dist(e.food, p) < 6) { e.state = 'wary'; if (!e.food.gone) game.toast('Je staat te dichtbij. De vreemde durft het eten niet te pakken.', 4); }
        else if (to(e.food, 2.8) < 0.9) {
          const it = e.food.item, fx = e.food.x, fz = e.food.z;
          game.removeThing(e.food); m.once = 1.2; m.rig.play('PickUp_Table', { fade: 0.15, speed: 1.5 });
          game.drop(it === 'meat' || it === 'honey' ? 'honey' : 'flake', fx + 0.3, fz + 0.2, true);
          if (it === 'meat') game.drop('flake', fx - 0.3, fz - 0.2, true);
          e.state = 'wary'; e.friendly = true; game.sound.good(); game.discover('strangers');
          game.toast('De vreemde pakt je eten, ruikt eraan… en legt er iets voor terug. Ze schreeuwen niet meer.', 7);
        }
      } else if (dist(m, { x: m.sx, z: m.sz }) > 0.6) to({ x: m.sx, z: m.sz }, 2.2);
      m.speed += (spd - m.speed) * (1 - Math.exp(-dt * 6));
      if (spd > 0) m.yaw = turn(m.yaw, Math.atan2(tx, tz), dt * 6);
      else if (face) m.yaw = turn(m.yaw, Math.atan2(face.x - m.x, face.z - m.z), dt * 3);
      m.x += Math.sin(m.yaw) * m.speed * dt; m.z += Math.cos(m.yaw) * m.speed * dt;
      m.g.position.set(m.x, height(m.x, m.z), m.z); m.g.rotation.y = m.yaw;
      const R = m.rig;
      if (m.once <= 0) {
        if (m.speed > 0.3) R.play('Walk_Loop', { fade: 0.25, speed: m.speed / 1.25 });
        else if (!e.friendly && d < 18) R.play('Punch_Jab', { fade: 0.3, speed: 0.7 });   // dreigend zwaaien
        else if (d > 26 || e.friendly) R.play('Crouch_Idle_Loop', { fade: 0.5 });
        else R.play('Idle_Loop', { fade: 0.4 });
      }
      R.update(dt);
    }
  }
  hit_stranger(e, how, game) {
    e.throwT = 0.3; game.sound.shout(1);
    if (e.friendly) { e.friendly = false; game.toast('Dat had je niet moeten doen. De vreemden zijn weer woedend.', 5); }
    else game.toast('De vreemden krijsen en grijpen naar stenen. Met zijn tweeën zijn ze sterker dan jij.', 5);
  }
  rm_strangers(e) { for (const m of e.list) this.scene.remove(m.g); }

  // ---------- wat de rest van het spel wil weten ----------
  // dieren waar je naar kunt slaan of gooien
  targets() {
    const out = [];
    for (const e of this.list) {
      if (e.kind === 'gazelle' && !e.dead) out.push({ m: e.m, kind: 'wounded', threat: false });
      if (e.kind === 'nest' && !['sit', 'fled', 'gone'].includes(e.bird.state)) out.push({ m: e.bird, kind: 'bird', threat: e.bird.state === 'charge' || e.bird.state === 'back' });
      if (e.kind === 'snake' && e.state === 'lie' && e.shown) out.push({ m: e, kind: 'snake', threat: false });
      if (e.kind === 'strangers' && !e.friendly) for (const m of e.list) out.push({ m, kind: 'stranger', threat: false });
    }
    return out;
  }
  owns(kind) { return ['wounded', 'bird', 'snake', 'stranger'].includes(kind); }
  hit(t, how, game) {
    const e = this.list.find((x) => x.m === t.m || x.bird === t.m || x === t.m || (x.list && x.list.includes(t.m)));
    if (!e) return;
    this['hit_' + { wounded: 'gazelle', bird: 'bird', snake: 'snake', stranger: 'stranger' }[t.kind]](e, how, game);
  }
  // dingen die je kunt aantikken om te bekijken
  lookTargets() {
    const out = [];
    for (const e of this.list) {
      if (e.kind === 'gazelle') out.push(e.dead ? { look: 'prey', x: e.x, z: e.z, enc: e } : { look: 'wounded', member: e.m });
      if (e.kind === 'nest') { out.push({ look: 'bird', member: e.bird }); if (e.eggs.every((t) => t.gone)) out.push({ look: 'nest', x: e.x, z: e.z }); }
      if (e.kind === 'snake' && e.state === 'lie' && e.shown) out.push({ look: 'snake', member: e });
      if (e.kind === 'bees') out.push({ look: 'bees', x: e.hx, z: e.hz, high: e.hy, enc: e });
      if (e.kind === 'strangers') for (const m of e.list) out.push({ look: 'stranger', member: m });
    }
    return out;
  }
  // hoe spannend is het? (voor het geluid)
  danger() {
    let d = 0;
    for (const e of this.list) {
      if (e.kind === 'nest' && e.bird.state === 'charge') d = Math.max(d, 0.45);
      if (e.kind === 'bees' && e.angry > 0) d = Math.max(d, 0.45);
    }
    return d;
  }
}
