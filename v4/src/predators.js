import * as THREE from '../lib/three.module.js';
import { height, WALK, riverDist, awayZ, rng } from './world.js';
import { turn, step } from './animal.js';
import { Rig } from './rig.js';
import { heldMesh } from './items.js';

const R = rng(55);

// ---------- hyena's ----------
// Een groepje bij het karkas. Ze komen alleen ergens op af als er iets te halen valt: vlees of een bot dat je draagt,
// vlees dat ergens los ligt, een verse prooi, de geur van vlees in het kamp, of een kamp zonder vuur in de nacht.
// Bij de groep durven ze niet. Ze bijten alleen wie alleen is, wie gewond is of wie bij hun prooi staat,
// en altijd dreigen ze eerst: kop omlaag, grommen, om je heen draaien. Een steen laat ze terugdeinzen.
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), headAt = new THREE.Vector3();
export class Hyenas {
  constructor(scene, home, A) {
    this.scene = scene; this.home = home; this.list = []; this.rushT = 4; this.scanT = 0; this.lure = null;
    for (let i = 0; i < 3; i++) {
      // echt model met animaties (Animal Animator, CC BY 4.0); het kijkt naar +x, dus een kwartslag draaien
      const rig = new Rig(A, 'hyena', { scale: 0.5 + i * 0.03, facing: -Math.PI / 2 });
      const m = { g: rig.root, rig };
      const a = i * 2.1;
      const h = { ...m, kind: 'hyena', i, x: home.x + Math.cos(a) * 6, z: home.z + Math.sin(a) * 6, yaw: R() * 6, speed: 0, phase: R() * 6, state: 'rest', t: R() * 5, carry: null, warn: 0, warnT: 0, bore: 0, bored: 0, stay: 0, dir: i ? 1 : -1, head: rig.bone('head') };
      scene.add(m.g); this.list.push(h);
    }
  }
  get threats() { return this.list.filter((h) => h.state === 'curious' || h.state === 'windup' || h.state === 'rush'); }
  // de waarschuwing: hij blijft staan, kop omlaag, en gromt. Pas daarna draait hij om je heen
  warnFrom(h, game) { h.state = 'curious'; h.t = 0; h.warn = 0; h.warnT = 1.4; h.bore = 0; game.sound.from(h).growl(); }

  // Meestal schrikt een geraakte hyena en druipt af. Maar met de troep om zich heen, of in het donker, wordt er soms een kwaad.
  hit(h, game) {
    const pack = this.list.filter((o) => o !== h && o.state !== 'flee' && Math.hypot(o.x - h.x, o.z - h.z) < 15).length;
    this.hits = (this.hits || 0) + 1;
    if (this.hits > 1 && !h.angry && !window.__sure && R() < 0.18 + 0.12 * Math.min(2, pack) + 0.2 * game.night) {
      h.angry = true; h.state = 'windup'; h.t = 1.1; game.sound.from(h).growl();
      game.toast('Raak! Maar deze schrikt niet. Hij gromt, zet zijn nekharen op… en komt op je af!', 5);
      return;
    }
    h.angry = false; game.toast('Raak! De hyena jankt en maakt zich uit de voeten.', 4);
    h.state = 'flee'; h.t = 12; h.lure = null; game.sound.from(h).yelp();
    for (const o of this.list) if (o !== h && o.state !== 'flee') { o.state = 'retreat'; o.t = 6; o.lure = null; }
    game.discover('hyena');
  }

  update(dt, game) {
    const p = game.player.pos, night = game.night, st = game.state, camp = game.camp, safe = game.campSafe;
    // vlees ruiken ze van ver: wie buit draagt, wordt gevolgd (ook in je draagvel ruikt vlees)
    const holdsMeat = game.carries('meat'), holdsBone = holdsMeat || st.hands.includes('bone');
    const range = 14 + night * 22 + (holdsMeat ? 16 : 0);
    const nearHome = dist(p, this.home), inCamp = dist(p, camp) < safe, hurt = st.health < 40;
    // vlees dat ergens los ligt, buiten het kamp: daar sluipt er één op af
    if ((this.scanT -= dt) < 0) {
      this.scanT = 1; this.lure = null; let best = 70;
      for (const t of game.things) {
        if (t.item !== 'meat' || t.gone || t.kind !== 'pick' || dist(t, camp) < safe + 2) continue;
        const dl = Math.min(...this.list.map((h) => dist(h, t)));
        if (dl < best) { best = dl; this.lure = t; }
      }
      if (this.lure && !this.list.some((h) => h.state === 'sneak')) {
        const h = this.list.filter((o) => ['rest', 'roam', 'prowl'].includes(o.state)).sort((a, b) => dist(a, this.lure) - dist(b, this.lure))[0];
        if (h) { h.state = 'sneak'; h.lure = this.lure; }
      }
    }
    const atLure = !!this.lure && dist(p, this.lure) < 6;
    // wie durven ze aan? Niet wie bij de groep staat, tenzij hij gewond is of bij hun prooi komt
    const company = inCamp || game.group.list.some((m) => m.sick <= 0 && dist(m, p) < 9);
    const dare = !company || hurt || nearHome < 12 || atLure;
    // is er iets te halen bij jou?
    const reason = holdsBone || nearHome < 16 || atLure || (night > 0.5 && !company) || (hurt && !inCamp);
    // de geur van vlees in het kamp, of een nacht zonder vuur: dan komen er twee om het kamp heen draaien
    const campLure = game.campMeat > 0 || (night > 0.45 && !game.lit);
    for (const h of this.list) {
      const d = dist(p, h) || 0.01;
      h.t -= dt; h.bored -= dt;
      let tx = 0, tz = 0, spd = 0, run = false, face = null;
      const interested = reason && d < range && h.bored <= 0 && !inCamp && st.collapsed <= 0 && !(st.sleeping > 0) && !game.shield && !(h.state !== 'rush' && h.state !== 'windup' && game.player.hiddenFrom(h.x, h.z));
      switch (h.state) {
        case 'rest': case 'roam':
          if (h.t < 0 || !h.goal) { if (h.t < 0) { h.state = h.state === 'rest' && R() < 0.6 ? 'roam' : 'rest'; h.t = 3 + R() * 6; } h.goal = { x: this.home.x + (R() - 0.5) * (20 + night * 8), z: this.home.z + (R() - 0.5) * (20 + night * 8) }; }
          if (h.state === 'roam') { const gx = h.goal.x - h.x, gz = h.goal.z - h.z, gd = Math.hypot(gx, gz); if (gd > 1) { tx = gx / gd; tz = gz / gd; spd = gd > 30 ? 3.2 : 1.6; } }
          if (interested) { this.warnFrom(h, game); if (!this.warned) { this.warned = true; game.toast('Hyena\'s! Ze giechelen en komen dichterbij. Heb je een steen?', 5); } }
          else if (campLure && h.i < 2 && h.bored <= 0) { h.state = 'prowl'; h.stay = 20; h.t = 6; }
          break;
        case 'prowl': {
          // om het kamp heen, net buiten bereik van de groep: lopen, stilstaan en kijken, weer lopen
          const ring = safe + 5 + h.i * 2.5, a = Math.atan2(h.x - camp.x, h.z - camp.z) + h.dir * 0.4;
          const gx = camp.x + Math.sin(a) * ring - h.x, gz = camp.z + Math.cos(a) * ring - h.z, gd = Math.hypot(gx, gz), off = Math.abs(dist(h, camp) - ring);
          h.stay -= dt;
          if (h.t < 0) { h.look = !h.look && off < 4; h.t = h.look ? 2.5 + R() * 3 : 6 + R() * 6; if (h.look && R() < 0.5) game.sound.from(h).giggle(); if (!h.look && R() < 0.3) h.dir = -h.dir; }
          if (h.look && off < 4) face = camp; else { tx = gx / gd; tz = gz / gd; spd = off > 8 ? 3.4 : 1.5; }
          if (interested) this.warnFrom(h, game);
          else if (!campLure && h.stay < 0) { h.state = 'roam'; h.t = 4; h.goal = null; }
          break;
        }
        case 'sneak': {
          // laag en stil naar het vlees; pakken en wegwezen
          const L = h.lure;
          if (!L || L.gone || dist(L, camp) < safe) { h.state = 'roam'; h.t = 2; h.lure = null; break; }
          const gd = dist(h, L);
          if (atLure && L === this.lure && d < 11 && interested) { this.warnFrom(h, game); break; }   // jij staat erbij: eerst dreigen
          if (gd > 0.9) { tx = (L.x - h.x) / gd; tz = (L.z - h.z) / gd; spd = gd > 16 ? 3.2 : 1.5; }
          else { game.removeThing(L); h.carry = 'meat'; h.quiet = !L.byPlayer; h.lure = null; this.lure = null; h.state = 'flee'; h.t = 10; game.sound.from(h).giggle(); }
          break;
        }
        case 'curious': {
          h.warn += dt;
          if (h.warnT > 0) { h.warnT -= dt; face = p; break; }
          // in een boog om je heen: dichtbij als ze durven, anders op afstand
          const want = dare ? 6.5 : 9.5, ang = Math.atan2(h.x - p.x, h.z - p.z) + h.dir * 0.3;
          const gx = p.x + Math.sin(ang) * want - h.x, gz = p.z + Math.cos(ang) * want - h.z, gd = Math.hypot(gx, gz);
          tx = gx / gd; tz = gz / gd; spd = gd > 3 ? Math.min(3.5, gd * 1.2) : 1.5;
          if (R() < dt * 0.4) game.sound.from(h).giggle();
          if (inCamp) { h.state = 'prowl'; h.stay = 20; h.t = 3; break; }   // bij de groep durven ze niet: ze blijven om het kamp hangen
          if (!interested && d > range + 6) { h.state = 'roam'; h.t = 2; }
          // er valt niets te halen en bijten durven ze niet: na een tijdje druipen ze af
          if (!dare && !holdsBone && (h.bore += dt) > 12) { h.state = 'roam'; h.t = 4; h.bored = 25; }
          break;
        }
        case 'windup':   // kop omlaag: hij gaat zo aanvallen
          spd = 0; h.yaw = turn(h.yaw, Math.atan2(p.x - h.x, p.z - h.z), dt * 8);
          if (h.t < 0) { h.state = 'rush'; h.t = h.angry ? 4.5 : 2.5; }
          break;
        case 'rush':
          tx = (p.x - h.x) / d; tz = (p.z - h.z) / d; spd = 7.5; run = true;
          if (d < 1.3) {
            h.state = 'retreat'; h.t = 8; h.angry = false;
            const stole = game.bite(h, 12);
            if (stole) { h.carry = stole; h.quiet = false; h.state = 'flee'; h.t = 14; }
          } else if (h.t < 0) { h.state = 'retreat'; h.t = 4; h.angry = false; }
          break;
        case 'retreat': case 'flee':
          tx = (h.x - p.x) / d; tz = (h.z - p.z) / d; spd = h.state === 'flee' ? 8 : 5; run = true;
          if (h.t < 0) { h.state = 'roam'; h.t = 3; if (h.carry) { if (!h.quiet) game.toast(h.carry === 'meat' ? 'De hyena is er met je vlees vandoor.' : 'De hyena heeft het bot meegenomen. Er liggen er meer bij het karkas.'); h.carry = null; } }
          break;
      }
      if (face) h.yaw = turn(h.yaw, Math.atan2(face.x - h.x, face.z - h.z), dt * 5);
      step(h, tx, tz, spd, dt, 5, run ? 7 : 3, h.state === 'curious' && h.warnT <= 0 ? p : null);
      const lim = WALK - 8; h.x = THREE.MathUtils.clamp(h.x, -lim, lim); h.z = THREE.MathUtils.clamp(h.z, -lim, lim);
      if (riverDist(h.x, h.z) < 7) h.z += awayZ(h.x, h.z) * dt * 4;
      this.pose(h, dt, run);
    }
    // wie al een tijd dreigt, waagt een uitval. Maar alleen als ze je aandurven
    const ready = this.list.filter((h) => h.state === 'curious' && h.warn > 3.5);
    if (ready.length && dare) {
      this.rushT -= dt * (0.6 + night);
      if (this.rushT < 0) {
        const h = ready[Math.floor(R() * ready.length)];
        h.state = 'windup'; h.t = 0.9; game.sound.from(h).whoop();
        this.rushT = 5 + R() * 4;
      }
    } else if (!this.list.some((h) => h.state === 'curious')) this.rushT = 3;
  }

  pose(h, dt, run) {
    h.g.position.set(h.x, height(h.x, h.z), h.z);
    h.g.rotation.y = h.yaw;
    // welke animatie past bij wat hij doet?
    const near = Math.hypot(h.x - this.home.x, h.z - this.home.z) < 5;
    if (h.state === 'windup') h.rig.play('Lunge', { fade: 0.15, speed: 1.6, once: true });
    else if (h.state === 'curious' && h.warnT > 0) h.rig.play('Lunge', { fade: 0.25, speed: 0.9, once: true });   // dreigen
    else if (run || h.speed > 3.5) h.rig.play('Run', { fade: 0.2, speed: Math.max(0.6, h.speed / 7) });
    else if (h.speed > 0.25) h.rig.play('Walk', { fade: 0.3, speed: Math.max(0.5, h.speed / 1.5) });
    else if (h.state === 'rest' && near) h.rig.play('Eat', { fade: 0.5 });   // knagen op een bot bij het karkas
    else h.rig.play('Idle', { fade: 0.4 });
    h.rig.update(dt);
    // wat hij gepakt heeft, draagt hij in zijn bek
    if (h.carry !== (h.loot ? h.loot.userData.item : null)) {
      if (h.loot) { this.scene.remove(h.loot); h.loot = null; }
      if (h.carry) { h.loot = heldMesh(h.carry); h.loot.userData.item = h.carry; h.loot.traverse((o) => { o.castShadow = true; }); this.scene.add(h.loot); }
    }
    if (h.loot && h.head) { h.head.getWorldPosition(headAt); h.loot.position.set(headAt.x + Math.sin(h.yaw) * 0.22, headAt.y - 0.1, headAt.z + Math.cos(h.yaw) * 0.22); h.loot.rotation.y = h.yaw + 1.57; }
  }
}

// ---------- luipaard ----------
// Overdag ligt hij in zijn boom. In de schemering komt hij naar beneden en besluipt je van achteren.
// Kijk hem recht aan en hij aarzelt; een steen jaagt hem terug de boom in.
export class Leopard {
  constructor(scene, tree, A) {
    this.tree = tree;
    // echt model met een renbeweging (GremorySaiyan, CC BY 4.0); kijkt naar +x
    const rig = new Rig(A, 'leopard', { scale: 0.024, facing: -Math.PI / 2 });
    // ogen die 's nachts oplichten
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc8ff70, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
    const eyes = new THREE.Group();
    for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeMat); e.position.x = k * 0.05; eyes.add(e); }
    scene.add(eyes);
    const m = { g: rig.root, rig, eyeMat, eyes, head: rig.bone('Bip01_Head') };
    Object.assign(this, m, { kind: 'leopard', x: tree.x, z: tree.z, yaw: 0, speed: 0, phase: 0, state: 'tree', t: 0, watched: 0, cool: 0, y: 0 });
    scene.add(m.g);
  }
  get threat() { return ['stalk', 'freeze', 'pounce'].includes(this.state); }

  hit(game) {
    this.state = 'flee'; this.t = 6; this.cool = 40; game.sound.from(this).growl();
    game.toast('Raak! Het luipaard springt weg en vlucht naar zijn boom.');
    game.discover('leopard');
  }

  update(dt, game, cam) {
    const p = game.player.pos, night = game.night, d = Math.hypot(p.x - this.x, p.z - this.z) || 0.01;
    const homeD = Math.hypot(p.x - this.tree.x, p.z - this.tree.z);
    this.t -= dt; this.cool = Math.max(0, this.cool - dt);
    const active = night > 0.25 && homeD < 50 && this.cool <= 0 && game.state.collapsed <= 0 && !game.shield;
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
        if (facing) { this.state = 'freeze'; this.watched = 0; game.sound.from(this).growl(); }
        if (d < 4.5) { this.state = 'pounce'; this.t = 0.6; game.sound.from(this).growl(); }
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
    step(this, tx, tz, spd, dt, 6, run ? 8 : 3);
    // in de boom liggen, of naar beneden springen / naar boven klimmen
    const branch = this.tree.branchY, gy = height(this.x, this.z);
    let y = gy;
    if (this.state === 'tree') { this.x = this.tree.x + 0.1; this.z = this.tree.z + 0.1; y = gy + branch; this.yaw = 1.2; }
    if (this.state === 'down') y = gy + branch * Math.max(0, this.t / 1.2);
    if (this.state === 'up') { this.x = this.tree.x + 0.1; this.z = this.tree.z + 0.1; y = gy + branch * (1 - Math.max(0, this.t / 1.2)); }
    this.g.position.set(this.x, y - crouch * 0.12, this.z);
    this.g.rotation.y = this.yaw;
    // het model kan alleen rennen: langzaam afgespeeld is het sluipen, stilgezet is het loeren of liggen
    const rest = this.state === 'tree' || this.state === 'freeze' || this.speed < 0.15;
    if (rest) this.rig.freeze('Principal', this.state === 'tree' ? 0.55 : 0.1);
    else this.rig.play('Principal', { fade: 0.2, speed: run ? Math.min(1.4, this.speed / 8) : Math.max(0.22, this.speed / 7) });
    this.rig.update(dt);
    // ogen bij de kop
    if (this.head) {
      this.head.getWorldPosition(this.eyes.position);
      this.eyes.position.x += Math.sin(this.yaw) * 0.1; this.eyes.position.z += Math.cos(this.yaw) * 0.1; this.eyes.position.y += 0.02;
      this.eyes.rotation.y = this.yaw;
    }
    this.eyeMat.opacity = Math.max(night, game.state.sensing ? 1 : 0) * (this.state === 'tree' && !game.state.sensing ? 0.4 : 1);
  }
}

// ---------- een steen gooien ----------
export class Throws {
  constructor(scene) { this.scene = scene; this.list = []; }
  // dur: hoe lang de steen onderweg is. Een harde worp is kort onderweg en vliegt dus vlak; een zachte gaat met een boog.
  throw(from, target, onArrive, mesh, dur) {
    const m = mesh || new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), new THREE.MeshLambertMaterial({ color: 0x8a7c6c, flatShading: true }));
    m.castShadow = true; this.scene.add(m);
    const to = { x: target.x, z: target.z };
    dur = dur || Math.max(0.4, Math.hypot(to.x - from.x, to.z - from.z) / 20);
    this.list.push({ m, from: from.clone(), target, to, t: 0, dur, arc: Math.max(0.2, 12 * dur * dur / 8), onArrive });
  }
  update(dt) {
    for (const s of this.list) {
      s.t += dt;
      // richt een beetje mee als het doel beweegt
      s.to.x += (s.target.x - s.to.x) * Math.min(1, dt * 6); s.to.z += (s.target.z - s.to.z) * Math.min(1, dt * 6);
      const k = Math.min(1, s.t / s.dur), ty = height(s.to.x, s.to.z) + (s.target.free ? 0.15 : 0.7);
      s.m.position.set(s.from.x + (s.to.x - s.from.x) * k, s.from.y + (ty - s.from.y) * k + 4 * k * (1 - k) * s.arc, s.from.z + (s.to.z - s.from.z) * k);
      s.m.rotation.x += dt * 14; s.m.rotation.z += dt * 9;
      if (k >= 1) { s.done = true; this.scene.remove(s.m); s.onArrive(s.to.x, s.to.z); }
    }
    this.list = this.list.filter((s) => !s.done);
  }
}

