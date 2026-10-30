import { TILE, VIEW_ROWS, STEP, START_LIVES, MAX_HEARTS, MAX_STONES, PHYS } from './config.js';
import { buildLevel, TileMap, moveBody, T } from './level.js';
import { Player } from './player.js';
import { ENEMY_TYPES } from './enemies.js';
import { Fx, star } from './fx.js';
import { PAD_RADIUS } from './input.js';
import { Renderer, drawPickup, drawTree, drawStoneCache, drawFoodCache, drawLiana, drawCave, flintIcon, artifactIcon } from './render.js';
import { PLATFORM_TYPES } from './platforms.js';
import { SPECIES } from './species.js';

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Game {
  constructor(canvas, input, audio, ui) {
    this.cv = canvas; this.c = canvas.getContext('2d', { alpha: false });
    this.input = input; this.audio = audio; this.ui = ui;
    this.renderer = new Renderer();
    this.fx = new Fx();
    this.state = 'title';     // title | intro | play | paused | dying | complete | gameover
    this.time = 0; this.acc = 0; this.last = 0;
    this.camX = 0; this.camY = 0; this.look = 0; this.zoom = 1;
    this.shakeT = 0; this.shakeA = 0;
    this.debug = new URLSearchParams(location.search).has('debug');
    addEventListener('resize', () => this.resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2.5);
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.scale = H / (VIEW_ROWS * TILE);
    this.viewW = W / this.scale; this.viewH = VIEW_ROWS * TILE;
    this.renderer.setResolution(Math.min(3, this.scale * dpr));
    // Touchknoppen (css-pixels), rekening houdend met veilige randen van de telefoon
    const cs = getComputedStyle(document.documentElement);
    const safeL = parseFloat(cs.getPropertyValue('--sal')) || 0, safeR = parseFloat(cs.getPropertyValue('--sar')) || 0, safeB = parseFloat(cs.getPropertyValue('--sab')) || 0;
    this.safe = { l: Math.max(12, safeL), t: Math.max(10, parseFloat(cs.getPropertyValue('--sat')) || 0) };
    const u = Math.max(0.8, Math.min(1.25, H / 400));
    const by = H - 62 * u - safeB * 0.5;
    // Touch: links een zwevende joystick (overal in de linkerhelft), rechts is alles springen.
    // De getekende knoppen zijn alleen hulplijnen in de hoeken.
    this.input.layout = {
      split: W * 0.45,
      pad: { x: safeL + 74 * u, y: H - 66 * u - safeB * 0.5, r: 34 * u },
      jump: { x: W - safeR - 64 * u, y: H - 64 * u - safeB * 0.5, r: 38 * u },
      throw: { x: W - safeR - 150 * u, y: H - 50 * u - safeB * 0.5, r: 27 * u },
      pause: { x: W - safeR - 30, y: 30, r: 20 },
    };
  }

  // ---------------- Levels ----------------
  load(def, keepStats = false) {
    this.def = def;
    this.level = buildLevel(def);
    this.map = new TileMap(this.level);
    if (!keepStats) { this.lives = START_LIVES; }
    this.bonesTotal = keepStats ? this.bonesTotal : 0;
    this.checkpoint = null;
    this.artifacts = new Set();
    this.levelTime = 0;
    this.finishing = null;
    this.spawnAll();
    this.player = new Player(this.level.start.x, this.level.start.y);
    this.hearts = MAX_HEARTS; this.stones = 3; this.bones = 0;
    this.snapCamera();
  }

  spawnAll(fromCheckpoint = false) {
    const L = this.level;
    this.enemies = []; this.stonesFlying = [];
    if (!fromCheckpoint) { this.pickups = []; this.decor = []; this.fires = []; this.meets = []; this.met = new Set(); this.banner = null; }
    this.platforms = L.entities.filter(e => PLATFORM_TYPES[e.type]).map(e => new PLATFORM_TYPES[e.type](e));
    for (const e of L.entities) {
      if (ENEMY_TYPES[e.type]) {
        const en = new ENEMY_TYPES[e.type](e.x, e.y, e);
        en.spawnX = e.x;
        this.enemies.push(en);
      } else if (!fromCheckpoint) {
        if (['bone', 'fig', 'flint', 'artifact'].includes(e.type)) this.pickups.push({ ...e, taken: false });
        else if (e.type === 'checkpoint') this.fires.push({ ...e, lit: false });
        else if (e.type === 'tree' || e.type === 'finish' || e.type === 'sign') this.decor.push({ ...e });
        else if (e.type === 'meet') {
          // Een groepje van een andere soort: vriendelijk, ze doen hun eigen ding
          const sp = SPECIES[e.species];
          const group = (e.offsets || [0, 40, 76]).map((dx, i) => {
            const n = new Player(e.x + dx, e.y, { ...sp.look, size: (sp.look.size || 1) * (e.sizes?.[i] ?? 1) });
            n.face = -1; n.phase = i * 2.1; n.idle = e.idle?.[i] || 'chew';
            return n;
          });
          this.meets.push({ ...e, group, seen: false });
        }
      }
    }
    // Lianen beginnen altijd weer stil
    this.lianas = L.entities.filter(e => e.type === 'liana').map(e => ({ ax: e.x, ay: e.y, len: (e.len || 4) * TILE, angle: 0, omega: 0, held: false }));
    this.finish = L.entities.find(e => e.type === 'finish');
    if (this.finish && !fromCheckpoint) {
      // De stam wacht bij de grot: oudere, volwassenen en een kind
      const f = this.finish;
      this.npcs = [
        new Player(f.x + 92, f.y, { fur: '#7a6a5a', hair: '#9a948a', skin: '#b98a66', size: 0.95 }),
        new Player(f.x + 150, f.y, { fur: '#9a6844', hair: '#4a2e1c', skin: '#c99a6c', size: 0.93 }),
        new Player(f.x + 182, f.y, { fur: '#8f6040', hair: '#6a4028', skin: '#d0a070', size: 0.68 }),
        new Player(f.x + 222, f.y, { fur: '#6e4a30', hair: '#3a2416', skin: '#a8744d', size: 1.06 }),
      ];
      this.npcs.forEach((n, i) => { n.face = i === 0 ? 1 : -1; n.phase = i * 1.7; });
    }
  }

  start(def) {
    this.load(def);
    this.state = 'intro'; this.introT = 0;
    this.audio.playSong(def.music || 'savanna');
  }

  respawn() {
    const p = this.checkpoint || this.level.start;
    this.spawnAll(true);
    this.map = new TileMap(this.level);
    this.player.reset(p.x, p.y);
    this.hearts = MAX_HEARTS; this.stones = Math.max(this.stones, 3);
    this.snapCamera();
    this.state = 'intro'; this.introT = 0.6;
    this.audio.playSong(this.def.music || 'savanna');
  }

  snapCamera() {
    const p = this.player;
    this.look = 0;
    this.camX = Math.max(0, Math.min(this.level.pxW - this.viewW, p.cx - this.viewW * 0.38));
    this.camY = Math.max(0, Math.min(this.level.pxH - this.viewH, p.y - this.viewH * 0.55));
  }

  // ---------------- Spelregels ----------------
  hurt(fromX) {
    const p = this.player;
    if (p.invuln > 0 || p.dead) return;
    this.hearts--;
    if (p.hang) { p.hang.held = false; p.hang = null; p.regrab = 0.5; }
    if (this.hearts <= 0) return this.die();
    p.invuln = PHYS.hurtInvuln;
    const dir = Math.sign(p.cx - fromX) || -p.face;
    p.vx = dir * 200; p.vy = -330; p.onGround = false; p.jumping = false;
    this.audio.play('hurt'); this.shake(5);
  }

  die() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true; p.deadT = 0; p.vy = -560; p.vx = 0;
    if (p.hang) { p.hang.held = false; p.hang = null; }
    this.hearts = 0;
    this.state = 'dying'; this.dieT = 0;
    this.audio.stopSong(); this.audio.play('die');
  }

  throwStone() {
    if (this.stones <= 0) { this.fx.text(this.player.cx, this.player.y - 6, 'geen stenen'); return; }
    if (this.stonesFlying.length >= 2) return;
    const p = this.player;
    this.stones--;
    this.stonesFlying.push({ x: p.cx + p.face * 10 - 5, y: p.y + 10, w: 10, h: 10, vx: p.face * 400 + p.vx * 0.35, vy: -240, bounces: 0, life: 1.6, spin: 0 });
    p.throwAnim = 0.25;
    this.audio.play('throw');
  }

  hitHead(cx, cy) {
    const t = this.map.get(cx, cy), i = this.map.idx(cx, cy);
    if (t === T.BUMP) {
      this.map.bounce.set(i, 0.2);
      this.audio.play('bump');
      // Vijanden die op het blok staan schrikken weg
      for (const e of this.enemies) if (!e.fleeing && Math.abs(e.cx - (cx + 0.5) * TILE) < 24 && Math.abs(e.y + e.h - cy * TILE) < 4) e.scare(Math.sign(e.cx - (cx + 0.5) * TILE) || 1, this);
      const item = this.map.bumpItems.get(i);
      if (item) {
        this.map.bumpItems.delete(i);
        const x = (cx + 0.5) * TILE, y = cy * TILE;
        if (item === 'bone') { this.addBones(1); this.fx.sparkle(x, y - 10); this.fx.text(x, y - 14, '+1'); }
        else this.pickups.push({ type: item, x, y: y - 14, taken: false, pop: 0.3 });
      }
    } else this.audio.play('bump');
  }

  addBones(n) {
    this.bones += n; this.bonesTotal += n;
    this.audio.play('bone');
    if (this.bonesTotal >= 100) { this.bonesTotal -= 100; this.lives++; this.audio.play('oneup'); this.fx.text(this.player.cx, this.player.y - 10, '1 UP!', '#9cf27a'); }
  }

  shake(a) { this.shakeT = 0.25; this.shakeA = a; }

  // ---------------- Lus ----------------
  frame(now) {
    const dt = Math.min(0.25, (now - (this.last || now)) / 1000);
    this.last = now;
    this.acc += dt;
    let first = true;
    while (this.acc >= STEP) {
      this.step(STEP, first);
      this.acc -= STEP; first = false;
    }
    this.draw();
  }

  step(dt, readInput) {
    const inp = readInput ? this.input.read() : { ...this.lastInput, jump: false, throw: false, pause: false };
    this.lastInput = inp;
    this.time += dt;
    if (inp.pause && (this.state === 'play' || this.state === 'intro')) { this.ui.pause(); return; }
    if (this.state === 'title' || this.state === 'paused' || this.state === 'complete' || this.state === 'gameover') {
      if (this.state === 'title') this.camX = (this.camX + dt * 40) % Math.max(1, (this.level?.pxW || 4000) - this.viewW);
      this.fx.update(dt);
      return;
    }
    if (this.state === 'intro') {
      this.introT += dt;
      if (this.introT > 1.4) this.state = 'play';
    }
    this.map.update(dt, this);
    const p = this.player;
    if (this.state === 'play' && this.finishing === null) this.levelTime += dt;
    for (const pl of this.platforms) pl.update(dt, this);
    if (p.platform && p.onGround && !p.hang) { p.x += p.platform.dx; p.y += p.platform.dy; }
    p.update(dt, this.state === 'play' ? inp : { left: false, right: false, jumpHeld: false, jump: false, throw: false }, this);
    this.landOnPlatforms(p);

    if (this.state === 'dying') {
      this.dieT += dt;
      if (this.dieT > 2.2) {
        this.lives--;
        if (this.lives <= 0) { this.state = 'gameover'; this.ui.gameOver(); }
        else this.respawn();
      }
      this.fx.update(dt);
      return;
    }

    // In een kuil gevallen
    if (p.y > this.level.pxH + 40) { this.hearts = 0; this.die(); return; }
    // In het water gevallen
    const wy = Math.floor((p.bottom - 14) / TILE);
    if (!p.onGround && this.map.get(Math.floor(p.cx / TILE), wy) === T.WATER && this.map.get(Math.floor(p.cx / TILE), wy - 1) !== T.WATER) {
      this.fx.splash(p.cx, wy * TILE + 8); this.audio.play('splash'); this.hearts = 0; this.die(); p.vy = -200; return;
    }
    // Bek van de krokodil
    for (const pl of this.platforms) { const hz = pl.hazard?.(); if (hz && overlap(p, hz)) this.hurt(hz.x + hz.w / 2); }

    // Doornen
    const tx1 = Math.floor((p.x + 3) / TILE), tx2 = Math.floor((p.x + p.w - 3) / TILE), ty1 = Math.floor((p.y + 8) / TILE), ty2 = Math.floor((p.y + p.h - 2) / TILE);
    for (let cx = tx1; cx <= tx2; cx++) for (let cy = ty1; cy <= ty2; cy++) if (this.map.get(cx, cy) === T.THORNS && p.y + p.h > cy * TILE + 14) this.hurt(p.cx - p.vx);

    this.updateEnemies(dt);
    this.updateStones(dt);
    this.updatePickups(dt);

    // Voorraadplek met stenen = checkpoint (habilis kende nog geen vuur)
    for (const f of this.fires) if (!f.lit && Math.abs(p.cx - f.x) < 26 && Math.abs(p.bottom - f.y) < 40) {
      f.lit = true; this.checkpoint = { x: f.x, y: f.y };
      this.stones = Math.max(this.stones, 5);
      this.audio.play('checkpoint'); this.fx.sparkle(f.x, f.y - 16, '#cfe0ff'); this.fx.text(f.x, f.y - 40, 'Voorraadplek!');
    }

    // Ontmoetingen met andere soorten
    for (const m of this.meets) {
      for (const n of m.group) { n.face = Math.sign(p.cx - n.cx) || -1; n.anim += dt * 2; }
      if (!m.seen && Math.abs(p.cx - m.x) < 220) {
        m.seen = true; this.met.add(m.species);
        this.banner = { sp: SPECIES[m.species], t: 0 };
        this.audio.play('meet'); this.ui.met?.(m.species);
      }
    }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 7) this.banner = null; }

    // Finish: even naar de groep lopen, dan het eindscherm
    if (this.finish && this.finishing === null && p.cx > this.finish.x && p.onGround) {
      this.finishing = 0; p.auto = 1; this.input.enabled = false;
      this.audio.stopSong(); this.audio.play('win');
      for (const n of this.npcs) { n.cheer = 1; n.face = Math.sign(p.cx - n.cx) || -1; }
    }
    if (this.finishing !== null) {
      this.finishing += dt;
      if (p.auto && p.cx > this.finish.x + 58) { p.auto = 0; p.cheer = 1; p.face = 1; }
      // Feest: blaadjes en vonken boven de groep
      if (Math.random() < dt * 14) {
        const x = this.finish.x + 60 + Math.random() * 200, y = this.finish.y - 90 - Math.random() * 40;
        this.fx.sparkle(x, y, ['#ffe27a', '#ff9c5a', '#9cf27a', '#fff6dc'][Math.floor(Math.random() * 4)]);
      }
      if (this.finishing > 3.6 && this.state === 'play') { this.state = 'complete'; this.input.enabled = true; this.ui.complete(this.results()); }
    }
    for (const n of this.npcs || []) {
      n.hop = n.cheer ? Math.abs(Math.sin(this.time * 7 + n.phase)) * 12 : 0;
      if (n.cheer && n !== p) n.anim += dt * 6;
    }
    p.hop = p.cheer ? Math.abs(Math.sin(this.time * 7)) * 12 : 0;

    this.updateLianas(dt);

    this.updateCamera(dt);
    this.fx.update(dt);
    if (this.shakeT > 0) this.shakeT -= dt;
    p.prevBottom = p.bottom;
  }

  results() {
    return {
      bones: this.bones, bonesMax: this.level.entities.filter(e => e.type === 'bone').length + [...this.level.bumps.values()].filter(v => v === 'bone').length,
      artifacts: this.artifacts.size, time: this.levelTime, def: this.def, met: [...this.met],
    };
  }

  updateEnemies(dt) {
    const p = this.player;
    const left = this.camX - 64, right = this.camX + this.viewW + 64;
    for (const e of this.enemies) {
      if (e.gone) continue;
      if (!e.active) { if (e.x + e.w > left && e.x < right) e.active = true; else continue; }
      e.update(dt, this);
      if (e.y > this.level.pxH + 64) { e.gone = true; continue; }
      if (!e.harmful() || p.dead) continue;
      const hb = e.hitbox();
      if (!overlap(p, hb)) continue;
      const fromAbove = p.vy > 0 && (p.prevBottom ?? p.bottom) <= hb.y + 10;
      if (fromAbove && e.stompable) {
        e.scare(Math.sign(e.cx - p.cx) || p.face, this);
        p.bounceOff(this.lastInput?.jumpHeld);
        p.y = hb.y - p.h;
        this.audio.play('stomp');
      } else this.hurt(e.cx);
    }
    this.enemies = this.enemies.filter(e => !e.gone);
  }

  updateStones(dt) {
    for (const s of this.stonesFlying) {
      s.life -= dt; s.spin += dt * 18;
      s.vy = Math.min(s.vy + 1500 * dt, 700);
      const vyBefore = s.vy;
      const r = moveBody(s, dt, this.map, { ignoreOneWay: true });
      if (r.wall) { s.life = 0; this.fx.dust(s.x + 5, s.y + 5, 0, 2); this.audio.play('hit'); }
      if (r.landed) { s.bounces++; s.vy = -vyBefore * 0.45; s.vx *= 0.7; if (s.bounces > 1) s.life = 0; }
      if (r.ceil) s.vy = 60;
      for (const e of this.enemies) {
        if (e.fleeing || !e.active) continue;
        if (overlap(s, e.hitbox())) { e.scare(Math.sign(s.vx) || 1, this); s.life = 0; this.audio.play('hit'); break; }
      }
      for (const pl of this.platforms) { const hz = pl.hazard?.() || (pl.headX && pl.state === 'warn' ? { x: pl.headX() - 4, y: pl.top - 26, w: 38, h: 34 } : null); if (hz && overlap(s, hz)) { pl.scare?.(this); s.life = 0; this.audio.play('hit'); } }
      if (this.map.get(Math.floor((s.x + 5) / TILE), Math.floor((s.y + 8) / TILE)) === T.WATER) { this.fx.splash(s.x + 5, s.y + 6, 4); s.life = 0; }
      if (s.y > this.level.pxH) s.life = 0;
    }
    this.stonesFlying = this.stonesFlying.filter(s => s.life > 0);
  }

  updatePickups(dt) {
    const p = this.player;
    const box = { x: p.x - 4, y: p.y - 4, w: p.w + 8, h: p.h + 8 };
    for (const k of this.pickups) {
      if (k.taken) continue;
      if (k.pop > 0) { k.pop -= dt; k.y -= 70 * dt; continue; }
      if (!overlap(box, { x: k.x - 9, y: k.y - 9, w: 18, h: 18 })) continue;
      k.taken = true;
      if (k.type === 'bone') { this.addBones(1); this.fx.sparkle(k.x, k.y, '#fff6dc'); }
      else if (k.type === 'fig') {
        this.audio.play('heart'); this.fx.sparkle(k.x, k.y, '#ff9ccf');
        if (this.hearts < MAX_HEARTS) { this.hearts++; this.fx.text(k.x, k.y - 10, '+♥', '#ff9ccf'); }
        else { this.addBones(5); this.fx.text(k.x, k.y - 10, '+5'); }
      } else if (k.type === 'flint') {
        this.stones = Math.min(MAX_STONES, this.stones + 3);
        this.audio.play('flint'); this.fx.sparkle(k.x, k.y, '#cfe0ff'); this.fx.text(k.x, k.y - 10, '+3 stenen');
      } else if (k.type === 'artifact') {
        this.artifacts.add(k.id ?? k.x);
        this.audio.play('artifact'); this.fx.sparkle(k.x, k.y, '#ffe27a'); this.fx.sparkle(k.x, k.y, '#ffffff');
        this.fx.text(k.x, k.y - 14, k.name || 'Artefact!', '#ffe27a');
      }
    }
  }

  // Landen op boomstammen, krokodillenruggen en nijlpaarden
  landOnPlatforms(p) {
    if (p.hang || p.dead) { p.platform = null; return; }
    const prev = p.prevBottom ?? p.bottom;
    let landed = null;
    if (p.vy >= 0) for (const pl of this.platforms) {
      if (!pl.standable()) continue;
      const [a, b] = pl.standX ? pl.standX() : [pl.x, pl.x + pl.w];
      if (p.x + p.w - 4 < a || p.x + 4 > b) continue;
      if (p.bottom >= pl.top && prev <= pl.top + 6 + Math.max(0, pl.dy)) { landed = pl; break; }
    }
    if (landed) {
      if (!p.onGround) { p.sx = 1.15; p.sy = 0.87; }
      p.y = landed.top - p.h; p.vy = 0; p.onGround = true; p.jumping = false;
    }
    p.platform = landed;
  }

  updateLianas(dt) {
    const p = this.player;
    for (const L of this.lianas) {
      if (!L.held) {
        L.omega += (-(1700 / L.len) * Math.sin(L.angle) + Math.sin(this.time * 1.3 + L.ax) * 0.25) * dt;
        L.omega *= 1 - 0.8 * dt;
        L.angle += L.omega * dt;
      }
      if (p.hang || p.regrab > 0 || p.onGround || p.dead) continue;
      const ex = L.ax + Math.sin(L.angle) * L.len, ey = L.ay + Math.cos(L.angle) * L.len;
      // Grijpen: een punt op het onderste deel van de liaan raakt je handen of bovenlijf (ruim, voor iedereen)
      const box = { x: p.x - 16, y: p.y - 14, w: p.w + 32, h: p.h * 0.7 + 14 };
      for (let t = 0.3; t <= 1.001; t += 0.05) {
        const px = L.ax + (ex - L.ax) * t, py = L.ay + (ey - L.ay) * t;
        if (px > box.x && px < box.x + box.w && py > box.y && py < box.y + box.h) {
          L.len = Math.max(TILE * 1.5, Math.hypot(p.cx - L.ax, p.y - 9 - L.ay));
          L.angle = Math.atan2(p.cx - L.ax, p.y - 9 - L.ay);
          p.grab(L); this.audio.play('grab'); break;
        }
      }
    }
  }

  updateCamera(dt) {
    if (this.finishing !== null) {
      // Inzoomen op de juichende stam
      this.zoom += (1.5 - this.zoom) * Math.min(1, dt * 2.5);
      const vw = this.viewW / this.zoom, vh = this.viewH / this.zoom;
      const tx = this.finish.x + 140 - vw / 2, ty = this.finish.y - 70 - vh / 2;
      this.camX += (tx - this.camX) * Math.min(1, dt * 3);
      this.camY += (ty - this.camY) * Math.min(1, dt * 3);
      this.camX = Math.max(0, Math.min(this.level.pxW - vw, this.camX));
      this.camY = Math.max(0, Math.min(this.level.pxH - vh, this.camY));
      return;
    }
    this.zoom = 1;
    const p = this.player;
    const targetLook = Math.abs(p.vx) > 40 ? Math.sign(p.vx) * this.viewW * 0.12 : this.look;
    this.look += (targetLook - this.look) * Math.min(1, dt * 2.2);
    const tx = p.cx - this.viewW * 0.42 + this.look;
    this.camX += (tx - this.camX) * Math.min(1, dt * 9);
    // Verticaal alleen bijsturen buiten een rustige zone
    const top = this.camY + this.viewH * 0.28, bottom = this.camY + this.viewH * 0.62;
    let ty = this.camY;
    if (p.y < top) ty = p.y - this.viewH * 0.28;
    else if (p.bottom > bottom && p.onGround) ty = p.bottom - this.viewH * 0.62;
    else if (p.bottom > this.camY + this.viewH * 0.8) ty = p.bottom - this.viewH * 0.8;
    this.camY += (ty - this.camY) * Math.min(1, dt * 5);
    this.camX = Math.max(0, Math.min(this.level.pxW - this.viewW, this.camX));
    this.camY = Math.max(0, Math.min(this.level.pxH - this.viewH, this.camY));
  }

  // ---------------- Tekenen ----------------
  draw() {
    const c = this.c, kb = this.scale * this.dpr, k = kb * (this.zoom || 1);
    if (!this.level) { c.fillStyle = '#15252a'; c.fillRect(0, 0, this.cv.width, this.cv.height); return; }
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = (Math.random() - 0.5) * this.shakeA; sy = (Math.random() - 0.5) * this.shakeA; }
    const camX = Math.round((this.camX + sx) * k) / k, camY = Math.round((this.camY + sy) * k) / k;

    c.setTransform(kb, 0, 0, kb, 0, 0);
    this.renderer.background(c, this.level.theme, camX, camY, this.viewW, this.viewH, this.level.pxH, this.time);

    c.setTransform(k, 0, 0, k, -camX * k, -camY * k);
    const vis = (x, m = 120) => x > camX - m && x < camX + this.viewW + m;
    this.renderer.pits(c, camX, this.viewW, this.level.pxH);
    for (const d of this.decor) if (d.type === 'tree' && vis(d.x, 200)) drawTree(c, d.x, d.y, d.scale || 1);
    if (this.finish && vis(this.finish.x, 420)) drawCave(c, this.finish.x + 150, this.finish.y, this.time);
    this.renderer.tiles(c, this.map, camX, camY, this.viewW, this.viewH);
    this.renderer.dynamicTiles(c, this.map, camX, this.viewW, this.time);
    for (const d of this.decor) if (d.type === 'sign' && vis(d.x)) drawSign(c, d.x, d.y, d.text);
    for (const f of this.fires) if (vis(f.x)) drawStoneCache(c, f.x, f.y, f.lit, this.time);
    if (this.finish && vis(this.finish.x, 420)) drawFoodCache(c, this.finish.x + 122, this.finish.y);
    for (const L of this.lianas) if (vis(L.ax, 200)) drawLiana(c, L, this.time);
    for (const k2 of this.pickups) if (!k2.taken && vis(k2.x)) drawPickup(c, k2, this.time);
    if (this.npcs && this.finish && vis(this.finish.x, 420)) for (const n of this.npcs) n.draw(c, this.time + n.x);
    for (const m of this.meets) if (vis(m.x, 200)) for (const n of m.group) n.draw(c, this.time + n.phase);
    for (const pl of this.platforms) if (vis(pl.x, 140)) pl.draw(c, this.time);
    for (const e of this.enemies) if (e.active || vis(e.x)) e.draw(c, this.time);
    for (const s of this.stonesFlying) {
      c.save(); c.translate(s.x + 5, s.y + 5); c.rotate(s.spin);
      c.fillStyle = '#2a2c30'; c.beginPath(); c.moveTo(-5, 1); c.lineTo(-2, -5); c.lineTo(4, -4); c.lineTo(5, 2); c.lineTo(0, 5); c.closePath(); c.fill();
      c.fillStyle = '#7d8590'; c.beginPath(); c.arc(-1, -1, 2, 0, Math.PI * 2); c.fill(); c.restore();
    }
    if (this.state !== 'title') this.player.draw(c, this.time);
    this.renderer.water(c, this.map, camX, this.viewW, this.level.pxH, this.time);
    this.fx.draw(c);
    if (this.debug) this.drawDebug(c);

    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.state !== 'title') { this.drawHud(c); this.drawTouch(c); }
    if (this.state === 'intro' && this.introT < 1.4) this.drawIntro(c);
    if (this.banner && this.state === 'play') this.drawBanner(c);
  }

  drawDebug(c) {
    c.strokeStyle = '#0f0'; c.lineWidth = 1;
    const p = this.player; c.strokeRect(p.x, p.y, p.w, p.h);
    c.strokeStyle = '#f00'; for (const e of this.enemies) { const h = e.hitbox(); c.strokeRect(h.x, h.y, h.w, h.h); }
  }

  drawBanner(c) {
    const b = this.banner, sp = b.sp;
    const a = Math.min(1, b.t * 4, (7 - b.t) * 2);
    const w = Math.min(520, this.W - 40), x = (this.W - w) / 2, y = this.safe.t + 44;
    c.globalAlpha = a;
    c.font = '13px system-ui, sans-serif';
    const lines = wrap(c, sp.text, w - 28);
    const h = 58 + lines.length * 17;
    c.fillStyle = '#10221fe6'; c.beginPath(); c.roundRect(x, y, w, h, 14); c.fill();
    c.strokeStyle = '#f6cf7588'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#f6cf75'; c.font = '800 11px system-ui, sans-serif'; c.fillText('ONTMOETING · ' + sp.when.toUpperCase(), x + 14, y + 20);
    c.fillStyle = '#fff1c4'; c.font = '900 18px system-ui, sans-serif'; c.fillText(sp.name, x + 14, y + 42);
    const nameW = c.measureText(sp.name).width;
    c.fillStyle = '#cfe1c8'; c.font = 'italic 13px system-ui, sans-serif'; c.fillText(sp.nick, x + 24 + nameW, y + 42);
    c.fillStyle = '#e8e2c8'; c.font = '13px system-ui, sans-serif';
    lines.forEach((l, i) => c.fillText(l, x + 14, y + 62 + i * 17));
    c.globalAlpha = 1;
  }

  drawIntro(c) {
    const a = Math.min(1, (1.4 - this.introT) * 3, this.introT * 4);
    c.globalAlpha = a;
    c.textAlign = 'center';
    c.fillStyle = '#0d1a1ccc'; c.fillRect(0, this.H * 0.36, this.W, 74);
    c.fillStyle = '#f6cf75'; c.font = '800 13px system-ui, sans-serif'; c.fillText(`WERELD ${this.def.world} · LEVEL ${this.def.id}`, this.W / 2, this.H * 0.36 + 26);
    c.fillStyle = '#fff1c4'; c.font = '900 28px system-ui, sans-serif'; c.fillText(this.def.name, this.W / 2, this.H * 0.36 + 58);
    c.textAlign = 'left'; c.globalAlpha = 1;
  }

  drawHud(c) {
    const sl = this.safe.l, st = this.safe.t;
    const pill = (x, y, w) => { c.fillStyle = '#0f1d1fa8'; c.beginPath(); c.roundRect(x, y, w, 30, 15); c.fill(); };
    c.font = '800 15px system-ui, sans-serif'; c.textBaseline = 'middle';
    // Hartjes en levens
    pill(sl, st, 136);
    for (let i = 0; i < MAX_HEARTS; i++) heart(c, sl + 18 + i * 22, st + 15, i < this.hearts);
    miniHead(c, sl + 90, st + 15);
    c.fillStyle = '#fff1c4'; c.fillText('×' + this.lives, sl + 102, st + 16);
    // Botjes
    pill(sl + 144, st, 72);
    c.save(); c.translate(sl + 162, st + 15); c.scale(0.8, 0.8); drawPickup(c, { type: 'bone', x: 0, y: 0 }, 0); c.restore();
    c.fillStyle = '#fff1c4'; c.fillText(String(this.bonesTotal).padStart(2, '0'), sl + 178, st + 16);
    // Stenen
    pill(sl + 224, st, 60);
    flintIcon(c, sl + 242, st + 15, 1);
    c.fillStyle = this.stones ? '#fff1c4' : '#ff9b8a'; c.fillText(String(this.stones), sl + 256, st + 16);
    // Artefacten
    pill(sl + 292, st, 84);
    for (let i = 0; i < 3; i++) artifactIcon(c, sl + 312 + i * 24, st + 15, 1, i < this.artifacts.size);
    c.textBaseline = 'alphabetic';
  }

  drawTouch(c) {
    if (!this.input.touchMode || this.state === 'complete' || this.state === 'gameover') return;
    const L = this.input.layout, pad = this.input.pad();
    const ring = (x, y, r, active) => {
      if (active) { c.fillStyle = 'rgba(255,241,196,0.16)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = active ? 'rgba(255,241,196,0.6)' : 'rgba(255,255,255,0.26)'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    };
    const icon = (alpha, fn) => { c.save(); c.globalAlpha = alpha; c.fillStyle = '#fff6dc'; fn(); c.restore(); };
    const chevron = (x, y, d, sz) => { c.beginPath(); c.moveTo(x + d * sz * 0.5, y); c.lineTo(x - d * sz * 0.3, y - sz * 0.55); c.lineTo(x - d * sz * 0.3, y + sz * 0.55); c.closePath(); c.fill(); };

    // Joystick: in rust een vage hint in de hoek; bij aanraken verschijnt hij onder je duim
    if (pad) {
      const R = PAD_RADIUS, dx = Math.max(-R, Math.min(R, pad.x - pad.ox)), dir = this.input.padDir();
      ring(pad.ox, pad.oy, R, false);
      icon(0.35, () => { chevron(pad.ox - R + 12, pad.oy, -1, 10); chevron(pad.ox + R - 12, pad.oy, 1, 10); });
      c.fillStyle = dir ? 'rgba(246,207,117,0.45)' : 'rgba(255,255,255,0.25)';
      c.beginPath(); c.arc(pad.ox + dx, pad.oy, 18, 0, Math.PI * 2); c.fill();
    } else {
      ring(L.pad.x, L.pad.y, L.pad.r, false);
      icon(0.3, () => { chevron(L.pad.x - L.pad.r * 0.45, L.pad.y, -1, L.pad.r * 0.32); chevron(L.pad.x + L.pad.r * 0.45, L.pad.y, 1, L.pad.r * 0.32); });
    }
    // Springen en gooien
    const J = L.jump, jumping = this.input.held('jump');
    ring(J.x, J.y, J.r, jumping);
    icon(jumping ? 0.8 : 0.35, () => { const r = J.r; c.beginPath(); c.moveTo(J.x, J.y - r * 0.42); c.lineTo(J.x - r * 0.36, J.y + r * 0.08); c.lineTo(J.x + r * 0.36, J.y + r * 0.08); c.closePath(); c.fill(); c.fillRect(J.x - r * 0.12, J.y + r * 0.05, r * 0.24, r * 0.32); });
    const Th = L.throw, throwing = this.input.held('throw');
    ring(Th.x, Th.y, Th.r, throwing);
    c.save(); c.globalAlpha = throwing ? 0.9 : 0.45; flintIcon(c, Th.x, Th.y, Th.r / 15); c.restore();
    if (this.stones > 0) { c.fillStyle = 'rgba(255,241,196,0.7)'; c.font = '800 11px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(String(this.stones), Th.x + Th.r * 0.75, Th.y - Th.r * 0.6); c.textAlign = 'left'; }
    // Pauze
    const P = L.pause;
    ring(P.x, P.y, P.r, false);
    icon(0.55, () => { c.fillRect(P.x - 6, P.y - 7, 4, 14); c.fillRect(P.x + 2, P.y - 7, 4, 14); });

    // Uitleg tijdens de eerste seconden van het eerste level
    if (this.def?.id === '1-1' && this.levelTime < 7 && this.state === 'play') {
      const a = Math.min(1, (7 - this.levelTime) / 1.5) * 0.85;
      c.save(); c.globalAlpha = a; c.font = '700 13px system-ui, sans-serif'; c.textAlign = 'center';
      c.fillStyle = '#0f1d1fb0';
      const tip = (x, y, t) => { const w = c.measureText(t).width + 18; c.beginPath(); c.roundRect(x - w / 2, y - 15, w, 22, 11); c.fill(); c.fillStyle = '#fff1c4'; c.fillText(t, x, y); c.fillStyle = '#0f1d1fb0'; };
      tip(this.W * 0.22, this.H * 0.5, '← Sleep hier om te lopen →');
      tip(this.W * 0.75, this.H * 0.5, 'Tik hier om te springen');
      c.restore();
    }
  }

}

function wrap(c, text, maxW) {
  const out = []; let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (c.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function heart(c, x, y, full) {
  c.save(); c.translate(x, y);
  c.fillStyle = full ? '#ff5d6c' : '#ffffff30';
  c.beginPath(); c.moveTo(0, 7); c.bezierCurveTo(-11, -1, -6, -10, 0, -4); c.bezierCurveTo(6, -10, 11, -1, 0, 7); c.fill();
  if (full) { c.fillStyle = '#ffc2c8'; c.beginPath(); c.arc(-3.5, -3, 1.8, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

function miniHead(c, x, y) {
  c.fillStyle = '#c18a5f'; c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5d3a25'; c.beginPath(); c.arc(x - 1, y - 3, 6, Math.PI, 0); c.fill();
  c.fillStyle = '#1d1410'; c.beginPath(); c.arc(x + 3, y, 1.2, 0, Math.PI * 2); c.fill();
}

function drawSign(c, x, y, text) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#5b3c26'; c.fillRect(-2, -30, 4, 30);
  c.font = '700 9px system-ui, sans-serif';
  const w = Math.max(40, c.measureText(text).width + 12);
  c.fillStyle = '#8a5f3a'; c.beginPath(); c.roundRect(-w / 2, -48, w, 20, 4); c.fill();
  c.fillStyle = '#fff1c4'; c.textAlign = 'center'; c.fillText(text, 0, -35); c.textAlign = 'left';
  c.restore();
}
