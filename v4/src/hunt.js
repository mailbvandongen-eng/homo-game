import * as THREE from '../lib/three.module.js';
import { height, WALK, riverDist, rng } from './world.js';
import { step, sense } from './animal.js';
import { Rig } from './rig.js';

const R = rng(91);
const clampWalk = (o) => { const lim = WALK - 10; o.x = THREE.MathUtils.clamp(o.x, -lim, lim); o.z = THREE.MathUtils.clamp(o.z, -lim, lim); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------- zebra's ----------
// Een groepje op de open vlakte. Ze grazen, kijken op en galopperen weg als jij of een roofdier te dichtbij komt.
export class Zebras {
  constructor(scene, cx, cz, A) {
    this.center = { x: cx, z: cz }; this.list = []; this.alarm = 0;
    for (let i = 0; i < 5; i++) {
      // model met animaties (NoaSeller, CC BY 4.0)
      const rig = new Rig(A, 'zebra', { scale: 0.7 + R() * 0.06 });
      const a = i * 1.3, r = 3 + R() * 6;
      const z = { kind: 'zebra', g: rig.root, rig, x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, yaw: R() * 6, speed: 0, state: 'graze', t: R() * 6, goal: null, slow: 1 };
      scene.add(rig.root); this.list.push(z);
    }
  }
  get alive() { return this.list.filter((z) => z.state !== 'dead'); }

  // iedereen vlucht weg van een punt
  scare(from, sec = 7) {
    for (const z of this.alive) { z.state = 'flee'; z.t = sec + R() * 2; z.from = from; }
    this.alarm = sec;
  }

  update(dt, game, cats) {
    const p = game.player.pos;
    this.alarm = Math.max(0, this.alarm - dt);
    // het midden van de groep schuift mee met waar ze staan
    for (const z of this.list) {
      if (z.state === 'dead') { z.rig.update(0); continue; }
      z.t -= dt;
      let tx = 0, tz = 0, spd = 0;
      if (z.state !== 'flee' && sense('zebra', z, game.player).seen) { this.scare(p, 5); game.sound.from(z).flee(); }
      if (z.state === 'flee') {
        const f = z.from, fd = Math.hypot(z.x - f.x, z.z - f.z) || 1;
        tx = (z.x - f.x) / fd; tz = (z.z - f.z) / fd; spd = 12.5 * z.slow;
        // niet de rivier in en niet van de kaart af: buig af naar het midden van de vlakte
        if (riverDist(z.x, z.z) < 14 || Math.abs(z.x) > WALK - 25 || Math.abs(z.z) > WALK - 25) { const cd = dist(z, this.center) || 1; tx += (this.center.x - z.x) / cd * 1.5; tz += (this.center.z - z.z) / cd * 1.5; }
        if (z.t < 0) { z.state = 'graze'; z.t = 2 + R() * 4; z.goal = null; this.center = { x: (this.center.x * 3 + z.x) / 4, z: (this.center.z * 3 + z.z) / 4 }; }
      } else if (z.state === 'walk') {
        const gd = dist(z, z.goal);
        if (gd < 1 || z.t < 0) { z.state = 'graze'; z.t = 4 + R() * 9; } else { tx = (z.goal.x - z.x) / gd; tz = (z.goal.z - z.z) / gd; spd = 2.2; }
      } else if (z.t < 0) {
        // naar een nieuw plekje bij de groep
        z.state = 'walk'; z.t = 8; z.goal = { x: this.center.x + (R() - 0.5) * 22, z: this.center.z + (R() - 0.5) * 22 };
      }
      step(z, tx, tz, spd, dt, 4, spd > 5 ? 5 : 2.5); clampWalk(z);
      z.g.position.set(z.x, height(z.x, z.z), z.z); z.g.rotation.set(0, z.yaw, 0);
      if (z.speed > 5) z.rig.play('Gallop', { fade: 0.2, speed: z.speed / 12 });
      else if (z.speed > 0.3) z.rig.play('Trot', { fade: 0.3, speed: Math.max(0.35, z.speed / 4) });
      else z.rig.play(z.look ? 'Idle01' : 'Eating', { fade: 0.5 });
      if (z.state === 'graze' && R() < dt * 0.15) z.look = !z.look;
      z.rig.update(dt);
    }
  }
}

// ---------- sabeltandkatten en hun prooi ----------
// Twee grote katten liggen overdag in het hoge gras. Af en toe jagen ze op de zebra's.
// Na de jacht eten ze, en dan lopen ze verzadigd weg: dan ligt er vers vlees. Maar jij bent niet de enige die dat weet.
export class Sabres {
  constructor(scene, lair, zebras, A) {
    this.lair = lair; this.zebras = zebras; this.list = []; this.kill = null; this.phase = 'rest';
    this.nextHunt = 150; this.t = 0; this.warned = false;
    for (let i = 0; i < 2; i++) {
      // model met animaties (slang107123456789, CC BY 4.0); het kijkt naar -z
      const rig = new Rig(A, 'sabre', { scale: 1.05 + i * 0.1, facing: Math.PI });
      const c = { kind: 'sabre', g: rig.root, rig, x: lair.x + i * 2.2 - 1, z: lair.z + i * 1.4, yaw: 2 + i, speed: 0, state: 'lie', t: 0, anger: 0, cool: 0 };
      scene.add(rig.root); this.list.push(c);
    }
  }
  get threats() { return this.list.filter((c) => c.state === 'warn' || c.state === 'attack'); }
  // hoe gevaarlijk is het nu voor de speler (0..1)?
  danger(p) {
    let d = 0;
    for (const c of this.list) {
      if (c.state === 'attack') d = 1; else if (c.state === 'warn') d = Math.max(d, 0.75);
      else d = Math.max(d, 0.45 * Math.max(0, 1 - dist(c, p) / 32));
    }
    return d;
  }

  // de jacht begint: sluipen naar de zebra's
  startHunt(game) {
    if (this.phase !== 'rest' || this.zebras.alive.length < 3) return false;
    this.phase = 'stalk'; this.victim = null;
    for (const c of this.list) { c.state = 'stalk'; }
    return true;
  }

  // een steen maakt zo'n kat alleen maar kwaad
  hit(c, game) {
    game.sound.from(c).roar();
    if (c.state !== 'attack') { c.state = 'attack'; c.t = 6; }
    game.toast('De steen ketst af op zijn dikke vacht. Nu is hij pas echt kwaad!', 4);
    game.discover('sabre');
  }

  update(dt, game) {
    const p = game.player.pos, Z = this.zebras;
    this.t += dt;
    // overdag, als je al even speelt, gaan ze op jacht
    if (this.phase === 'rest' && game.state.started) {
      this.nextHunt -= dt;
      if (this.nextHunt < 0 && game.night < 0.3) { if (!this.startHunt(game)) this.nextHunt = 30; }
    }
    if (this.phase === 'stalk') {
      const zc = Z.center, lead = this.list[0];
      if (dist(lead, zc) < 20 || Z.alarm > 0) {
        // de aanval: de zebra's stuiven weg, de traagste wordt gepakt
        this.phase = 'chase';
        this.victim = Z.alive.reduce((a, b) => (dist(a, lead) < dist(b, lead) ? a : b));
        Z.scare(lead, 14); this.victim.slow = 0.62;
        for (const c of this.list) c.state = 'chase';
        game.sound.from(this.list[0]).roar(0.5); game.sound.from(this.victim).bray();
        game.event('hunt', this.victim);
      }
    }
    if (this.phase === 'chase') {
      const v = this.victim;
      if (this.list.some((c) => dist(c, v) < 1.8)) {
        // gepakt
        v.state = 'dead'; v.slow = 1; v.speed = 0;
        v.g.rotation.set(0, v.yaw, Math.PI / 2); v.g.position.y = height(v.x, v.z) + 0.28;
        v.rig.freeze('Idle01', 0.1);
        this.kill = { x: v.x, z: v.z, zebra: v, meat: 4, hide: 2, age: 0, open: false, hyenaT: 45, eatT: 0 };
        this.phase = 'feed'; this.feedT = 75;
        for (const c of this.list) c.state = 'feed';
        game.sound.from(this.kill).bray(); game.event('kill', this.kill);
      }
    }
    const k = this.kill;
    if (this.phase === 'feed') {
      this.feedT -= dt;
      if (this.feedT < 0) {
        this.phase = 'leave'; k.open = true;
        for (const c of this.list) { c.state = 'leave'; }
        game.event('open', k);
      }
    }
    if (this.phase === 'leave' && this.list.every((c) => c.state === 'lie')) { this.phase = 'rest'; this.nextHunt = 330; }
    // de prooi: hyena's komen erop af en eten mee; daarna blijft er niets over
    if (k) {
      k.age += dt;
      if (k.open) {
        k.hyenaT -= dt;
        if (k.hyenaT < 0 && !k.hyenas) { k.hyenas = true; game.event('hyenas', k); }
        if (k.hyenas && game.hyenas.list.some((h) => dist(h, k) < 6 && h.state === 'rest')) {
          k.eatT += dt;
          if (k.eatT > 22 && k.meat > 0) { k.eatT = 0; k.meat--; if (k.meat === 0) game.event('gone', k); }
        }
        if (k.meat <= 0) { k.goneT = (k.goneT || 0) + dt; if (k.goneT > 50 && dist(p, k) > 30) this.clearKill(game); }
      }
    }

    for (const [i, c] of this.list.entries()) {
      const d = dist(c, p) || 0.01;
      c.t -= dt; c.cool = Math.max(0, c.cool - dt);
      let tx = 0, tz = 0, spd = 0, anim = 'Layout', aspeed = 1, face = null;
      const canSee = game.state.collapsed <= 0 && !(c.state !== 'attack' && game.player.hiddenFrom(c.x, c.z));
      // bewaken: bij de prooi op grotere afstand dan in het gras
      const guard = c.state === 'feed' ? [17, 8] : c.state === 'lie' ? [9, 4.5] : null;
      if (guard && canSee && c.cool <= 0) {
        if (d < guard[1]) { c.state = 'attack'; c.t = 6; game.sound.from(c).roar(); }
        else if (d < guard[0]) {
          c.back = c.state; c.state = 'warn'; c.t = 1.2; c.anger = 0; game.sound.from(c).roar(0.7);
          if (!this.warned) { this.warned = true; game.toast('Een sabeltandkat! Hij gromt: tot hier en niet verder. Loop rustig achteruit.', 6); }
        }
      }
      // de prooi is op of vrijgegeven: terug naar het gras
      if (c.state === 'feed' && (!k || k.open)) c.state = 'leave';
      if (c.state === 'warn' && c.back === 'feed' && (!k || k.open)) c.back = 'leave';
      switch (c.state) {
        case 'lie': anim = 'Layout'; break;
        case 'stalk': {
          const zc = Z.center, gd = dist(c, zc) || 1, side = i ? 0.5 : -0.5;
          tx = (zc.x - c.x) / gd + (zc.z - c.z) / gd * side; tz = (zc.z - c.z) / gd - (zc.x - c.x) / gd * side; spd = 2.2; anim = 'Stalker'; aspeed = 1;
          break;
        }
        case 'chase': {
          const v = this.victim, gd = dist(c, v) || 1;
          tx = (v.x - c.x) / gd; tz = (v.z - c.z) / gd; spd = 13.5; anim = 'Run'; aspeed = 1.1;
          break;
        }
        case 'feed': {
          const gx = k.x + (i ? 1.5 : -1.5), gz = k.z + (i ? 0.6 : -0.8), gd = Math.hypot(gx - c.x, gz - c.z);
          if (gd > 0.6) { tx = (gx - c.x) / gd; tz = (gz - c.z) / gd; spd = Math.min(4, gd * 2); anim = 'Trot'; }
          else { anim = 'Eating'; face = k; }
          break;
        }
        case 'warn': {
          // blijf je staan of kom je dichterbij, dan valt hij aan; loop je weg, dan kalmeert hij
          anim = c.t > 0 ? 'Roaring' : 'Growling'; face = p;
          const lim = c.back === 'feed' ? [17, 8] : [9, 4.5];
          c.anger += dt * (d < lim[0] * 0.75 ? 1 : 0.35);
          if (d < lim[1] || c.anger > 4.5) { c.state = 'attack'; c.t = 6; game.sound.from(c).roar(); }
          else if (d > lim[0] + 3) { c.state = c.back; }
          else if (R() < dt * 0.35) game.sound.from(c).roar(0.5);
          break;
        }
        case 'attack':
          tx = (p.x - c.x) / d; tz = (p.z - c.z) / d; spd = 10.5; anim = 'Run'; aspeed = 0.9;
          if (d < 1.9) {
            game.bite(c, 45, true); c.cool = 14; c.state = k && !k.open ? 'feed' : 'leave';
          } else if (c.t < 0 || !canSee) { c.cool = 6; c.state = k && !k.open ? 'feed' : 'leave'; }
          break;
        case 'leave': {
          const gx = this.lair.x + i * 2.2 - 1, gz = this.lair.z + i * 1.4, gd = Math.hypot(gx - c.x, gz - c.z);
          if (gd > 0.8) { tx = (gx - c.x) / gd; tz = (gz - c.z) / gd; spd = 3.2; anim = 'Trot'; aspeed = 0.8; }
          else c.state = 'lie';
          break;
        }
      }
      step(c, tx, tz, spd, dt, 5, spd > 6 ? 7 : 3, face); clampWalk(c);
      c.g.position.set(c.x, height(c.x, c.z), c.z); c.g.rotation.y = c.yaw;
      if (anim === 'Layout') c.rig.play('Layout', { fade: 0.5, once: true });
      else if (anim === 'Run' || anim === 'Trot' || anim === 'Stalker') c.rig.play(anim, { fade: 0.25, speed: aspeed * Math.max(0.5, c.speed / Math.max(spd, 0.1)) });
      else c.rig.play(anim, { fade: 0.35 });
      c.rig.update(dt);
    }
  }

  // er is niets meer van over: de zebra komt later als "nieuwe" terug bij de groep
  clearKill(game) {
    const v = this.kill.zebra, Z = this.zebras;
    v.state = 'graze'; v.t = 3; v.x = Z.center.x + 14; v.z = Z.center.z + 10; v.rig.mixer.stopAllAction(); v.rig.current = null;
    this.kill = null; game.event('cleared');
  }
}
