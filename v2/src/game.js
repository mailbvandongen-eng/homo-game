import { TILE, VIEW_ROWS, STEP, START_LIVES, MAX_HEARTS, MAX_STONES, PHYS, applyPhys } from './config.js';
import { buildLevel, TileMap, moveBody, T } from './level.js';
import { Player } from './player.js';
import { ENEMY_TYPES } from './enemies.js';
import { Fx, star } from './fx.js';
import { PAD_RADIUS } from './input.js';
import { Renderer, drawPickup, drawTree, drawCampfire, drawStoneCache, drawFoodCache, drawLiana, drawCave, drawBigTree, drawShelter, flintIcon, artifactIcon } from './render.js';
import { PLATFORM_TYPES } from './platforms.js';
import { SPECIES } from './species.js';
import { GiantHyena, Lion } from './boss.js';
import { Stalactite, Gnu } from './enemies.js';

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
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
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
    this.bossBeaten = false;
    this.bonesTotal = keepStats ? this.bonesTotal : 0;
    this.checkpoint = null;
    this.artifacts = new Set();
    this.levelTime = 0;
    this.finishing = null;
    this.spawnAll();
    applyPhys(def.phys);
    this.player = new Player(this.level.start.x, this.level.start.y, def.look ? SPECIES[def.look].look : null);
    this.player.tool = def.tool || null;
    this.bombT = 2;
    this.hearts = MAX_HEARTS; this.stones = 3; this.bones = 0;
    this.snapCamera();
  }

  spawnAll(fromCheckpoint = false) {
    const L = this.level;
    this.enemies = []; this.stonesFlying = []; this.projectiles = [];
    this.arenaOn = false; this.boss = null;
    if (!fromCheckpoint) { this.pickups = []; this.decor = []; this.fires = []; this.meets = []; this.met = new Set(); this.banner = null; }
    this.stampedes = [];
    if (fromCheckpoint) for (const e of L.entities) if (e.type === 'stampede') this.stampedes.push({ ...e, started: false, spawned: 0, t: 0 });
    this.platforms = L.entities.filter(e => PLATFORM_TYPES[e.type]).map(e => new PLATFORM_TYPES[e.type](e));
    for (const e of L.entities) {
      if (ENEMY_TYPES[e.type]) {
        const en = new ENEMY_TYPES[e.type](e.x, e.y, e);
        en.spawnX = e.x;
        this.enemies.push(en);
      } else if (!fromCheckpoint) {
        if (['bone', 'fig', 'flint', 'artifact', 'handaxe'].includes(e.type)) this.pickups.push({ ...e, taken: false });
        else if (e.type === 'stampede') this.stampedes.push({ ...e, started: false, spawned: 0, t: 0 });
        else if (e.type === 'checkpoint') this.fires.push({ ...e, lit: false });
        else if (e.type === 'tree' || e.type === 'bigtree' || e.type === 'finish' || e.type === 'sign') this.decor.push({ ...e });
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
    const be = L.entities.find(e => e.type === 'boss');
    if (be && !this.bossBeaten) {
      const A = L.arena;
      const Boss = L.boss === 'lion' ? Lion : GiantHyena;
      this.boss = new Boss(be.x, be.y, { x1: A.x1 * TILE, x2: (A.x2 + 1) * TILE, ceil: (L.h - A.ceil) * TILE });
      this.enemies.push(this.boss);
    }
    this.finish = L.entities.find(e => e.type === 'finish');
    if (this.finish && !fromCheckpoint) {
      // De stam wacht bij de grot: oudere, volwassenen en een kind
      const f = this.finish, base = this.def.look ? SPECIES[this.def.look].look : {}, sz = base.size || 1;
      this.npcs = [
        new Player(f.x + 92, f.y, { ...base, fur: '#7a6a5a', hair: '#9a948a', skin: '#b98a66', size: sz * 0.95 }),
        new Player(f.x + 150, f.y, { ...base, fur: '#9a6844', hair: '#4a2e1c', skin: '#c99a6c', size: sz * 0.93 }),
        new Player(f.x + 182, f.y, { ...base, fur: '#8f6040', hair: '#6a4028', skin: '#d0a070', size: sz * 0.68 }),
        new Player(f.x + 222, f.y, { ...base, fur: '#6e4a30', hair: '#3a2416', skin: '#a8744d', size: sz * 1.06 }),
      ];
      this.npcs.forEach((n, i) => { n.face = i === 0 ? 1 : -1; n.phase = i * 1.7; });
    }
  }

  start(def) {
    this.load(def);
    this.state = 'intro'; this.introT = 0;
    this.audio.playSong(def.music || 'savanna');
    this.audio.setAmbience(def.theme); this.audio.setSpace(def.theme === 'cave' ? 'cave' : 'open');
  }

  respawn() {
    const p = this.checkpoint || this.level.start;
    this.spawnAll(true);
    this.map = new TileMap(this.level);
    if (this.bossBeaten) { const A = this.level.arena; this.setColumn(A.exit, A.exitRows, T.EMPTY); }
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
    if (this.player.tool) return this.swing();
    if (this.stones <= 0) { this.fx.text(this.player.cx, this.player.y - 6, 'geen stenen'); return; }
    if (this.stonesFlying.length >= 2) return;
    const p = this.player;
    this.stones--;
    this.stonesFlying.push({ x: p.cx + p.face * 10 - 5, y: p.y + 10, w: 10, h: 10, vx: p.face * 400 + p.vx * 0.35, vy: -240, bounces: 0, life: 1.6, spin: 0 });
    p.throwAnim = 0.25;
    this.audio.play('throw');
  }

  // Handbijl of fakkel: korte zwaai voor je. Verjaagt dieren, breekt gebarsten rots, slaat vruchten weg.
  swing() {
    const p = this.player;
    if ((p.swingCd || 0) > 0) return;
    const torch = p.tool === 'torch', reach = torch ? 46 : 36;
    p.swingCd = 0.38; p.throwAnim = 0.25;
    const box = { x: p.face > 0 ? p.x + p.w - 6 : p.x - reach + 6, y: p.y - 4, w: reach, h: p.h + 4 };
    this.audio.play(torch ? 'whoosh' : 'swing');
    for (const e of this.enemies) {
      if (e.fleeing || !e.active) continue;
      if (!overlap(box, e.hitbox())) continue;
      if (e.isBoss) e.scare(p.face, this); else if (!e.immune) e.scare(p.face, this);
      this.audio.play('hit');
    }
    for (const pl of this.platforms) { const hz = pl.hazard?.() || (pl.headX && pl.state === 'warn' ? { x: pl.headX() - 4, y: pl.top - 26, w: 38, h: 34 } : null); if (hz && overlap(box, hz)) pl.scare?.(this); }
    for (const q of this.projectiles) if (overlap(box, q)) { q.life = 0; this.fx.splat(q.x + 6, q.y + 6); }
    const x1 = Math.floor(box.x / TILE), x2 = Math.floor((box.x + box.w) / TILE), y1 = Math.floor(box.y / TILE), y2 = Math.floor((box.y + box.h - 1) / TILE);
    for (let cx = x1; cx <= x2; cx++) for (let cy = y1; cy <= y2; cy++) if (this.map.get(cx, cy) === T.CRACK) {
      this.map.tiles[cy * this.map.w + cx] = T.EMPTY;
      this.fx.debris(cx * TILE + 16, cy * TILE + 16); this.audio.play('break'); this.shake(3);
    }
    if (torch) this.fx.sparkle(box.x + box.w / 2, p.y + 6, '#ffb24a');
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
    p.swingCd = Math.max(0, (p.swingCd || 0) - dt);
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
    const liquid = this.map.get(Math.floor(p.cx / TILE), wy);
    if (!p.onGround && (liquid === T.WATER || liquid === T.LAVA) && this.map.get(Math.floor(p.cx / TILE), wy - 1) !== liquid) {
      if (liquid === T.LAVA) { this.fx.sparkle(p.cx, wy * TILE + 8, '#ff8a2a'); this.fx.sparkle(p.cx, wy * TILE + 4, '#ffd36a'); this.audio.play('sizzle'); }
      else { this.fx.splash(p.cx, wy * TILE + 8, 22); this.fx.ripple(p.cx, wy * TILE + 8, 3); this.audio.play('splash'); }
      this.hearts = 0; this.die(); p.vy = -200; return;
    }
    this.updateWind(dt);
    this.updateStampedes(dt);
    this.updateBombs(dt);
    // Bek van de krokodil
    for (const pl of this.platforms) { const hz = pl.hazard?.(); if (hz && overlap(p, hz)) this.hurt(hz.x + hz.w / 2); }

    // Doornen
    const tx1 = Math.floor((p.x + 3) / TILE), tx2 = Math.floor((p.x + p.w - 3) / TILE), ty1 = Math.floor((p.y + 8) / TILE), ty2 = Math.floor((p.y + p.h - 2) / TILE);
    for (let cx = tx1; cx <= tx2; cx++) for (let cy = ty1; cy <= ty2; cy++) if (this.map.get(cx, cy) === T.THORNS && p.y + p.h > cy * TILE + 14) this.hurt(p.cx - p.vx);

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateArena();
    this.updateStones(dt);
    this.updatePickups(dt);

    // Voorraadplek met stenen = checkpoint (habilis kende nog geen vuur)
    for (const f of this.fires) if (!f.lit && Math.abs(p.cx - f.x) < 26 && Math.abs(p.bottom - f.y) < 40) {
      f.lit = true; this.checkpoint = { x: f.x, y: f.y };
      this.stones = Math.max(this.stones, 5);
      if (this.def.fire) { this.audio.play('ignite'); this.fx.sparkle(f.x, f.y - 16, '#ffb24a'); this.fx.text(f.x, f.y - 40, 'Kampvuur aangestoken!'); }
      else { this.audio.play('checkpoint'); this.fx.sparkle(f.x, f.y - 16, '#cfe0ff'); this.fx.text(f.x, f.y - 40, 'Voorraadplek!'); }
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
      if (e.fleeing || p.dead) continue;
      if (!e.harmful() && !e.isBoss && !e.stompable) continue;
      const hb = e.hitbox();
      if (!overlap(p, hb)) continue;
      const fromAbove = p.vy > 0 && (p.prevBottom ?? p.bottom) <= hb.y + 10;
      if (fromAbove && e.isBoss) {
        // Op de baas springen: raak als hij versuft is, anders veer je er zonder schade af
        if (!e.stomp(this)) this.audio.play('bump');
        p.bounceOff(true); p.y = hb.y - p.h;
      } else if (fromAbove && e.stompable) {
        e.scare(Math.sign(e.cx - p.cx) || p.face, this);
        p.bounceOff(this.lastInput?.jumpHeld);
        p.y = hb.y - p.h;
        this.audio.play('stomp');
      } else if (e.harmful()) this.hurt(e.cx);
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
        if (overlap(s, e.hitbox())) { if (!e.immune) e.scare(Math.sign(s.vx) || 1, this); s.life = 0; this.audio.play('hit'); this.fx.dust(s.x + 5, s.y + 5, 0, 2); break; }
      }
      for (const pl of this.platforms) { const hz = pl.hazard?.() || (pl.headX && pl.state === 'warn' ? { x: pl.headX() - 4, y: pl.top - 26, w: 38, h: 34 } : null); if (hz && overlap(s, hz)) { pl.scare?.(this); s.life = 0; this.audio.play('hit'); } }
      const st = this.map.get(Math.floor((s.x + 5) / TILE), Math.floor((s.y + 8) / TILE));
      if (st === T.WATER || st === T.LAVA) { this.fx.splash(s.x + 5, s.y + 6, 4); this.fx.ripple(s.x + 5, Math.floor((s.y + 8) / TILE) * TILE + 8); s.life = 0; this.audio.play('plip'); }
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
      // De handbijl pak je ook als je eroverheen springt (hij is te belangrijk om te missen)
      const kb = k.type === 'handaxe' ? { x: k.x - 14, y: k.y - 220, w: 28, h: 232 } : { x: k.x - 9, y: k.y - 9, w: 18, h: 18 };
      if (!overlap(box, kb)) continue;
      k.taken = true;
      if (k.type === 'bone') { this.addBones(1); this.fx.sparkle(k.x, k.y, '#fff6dc'); }
      else if (k.type === 'fig') {
        this.audio.play('heart'); this.fx.sparkle(k.x, k.y, '#ff9ccf');
        if (this.hearts < MAX_HEARTS) { this.hearts++; this.fx.text(k.x, k.y - 10, '+♥', '#ff9ccf'); }
        else { this.addBones(5); this.fx.text(k.x, k.y - 10, '+5'); }
      } else if (k.type === 'flint') {
        this.stones = Math.min(MAX_STONES, this.stones + 3);
        this.audio.play('flint'); this.fx.sparkle(k.x, k.y, '#cfe0ff'); this.fx.text(k.x, k.y - 10, '+3 stenen');
      } else if (k.type === 'handaxe') {
        p.tool = 'axe'; this.toolFound = true;
        this.audio.play('artifact'); this.fx.sparkle(k.x, k.y, '#ffe27a');
        this.banner = { sp: { name: 'Handbijl', nick: '"Acheuléen"', when: 'circa 1,76 miljoen jaar geleden', text: 'Je hebt een handbijl! Druk op de actieknop (X of de knop rechts) om te hakken: dieren schrikken weg en gebarsten rots breekt. Handbijlen waren eeuwenlang het belangrijkste gereedschap van erectus.' }, t: 0 };
      } else if (k.type === 'artifact') {
        this.artifacts.add(k.id ?? k.x);
        this.audio.play('artifact'); this.fx.sparkle(k.x, k.y, '#ffe27a'); this.fx.sparkle(k.x, k.y, '#ffffff');
        this.fx.text(k.x, k.y - 14, k.name || 'Artefact!', '#ffe27a');
      }
    }
  }

  // Windstoten (Dmanisi): rustig → waarschuwing (wervelende blaadjes) → stoot die je opzij duwt
  windState(z) {
    const t = (this.time + (z.offset || 0)) % (z.period || 5);
    return t < 2.4 ? 'calm' : t < 3.1 ? 'warn' : 'gust';
  }
  updateWind(dt) {
    const p = this.player, W = this.level.wind;
    if (!W || p.dead || p.hang) return;
    for (const z of W) {
      if (p.cx < z.from * TILE || p.cx > z.to * TILE) continue;
      const st = this.windState(z);
      if (st === 'gust') {
        const force = (z.strength || 520) * (p.onGround ? 1 : 1.35);
        p.vx = Math.max(-330, Math.min(330, p.vx + z.dir * force * dt));
        if (Math.random() < dt * 30) this.fx.add({ kind: 'wind', x: this.camX + (z.dir > 0 ? -10 : this.viewW + 10), y: this.camY + Math.random() * this.viewH, vx: z.dir * (500 + Math.random() * 200), vy: 0, life: 1.2, max: 1.2, r: 1, g: 0 });
      }
      if (st === 'warn' && Math.random() < dt * 12) this.fx.add({ kind: 'leaf', x: this.camX + Math.random() * this.viewW, y: this.camY + this.viewH * (0.3 + Math.random() * 0.4), vx: z.dir * 90, vy: -20, life: 0.8, max: 0.8, r: 2, g: 30 });
      if (st !== z.last) { if (st === 'warn') this.audio.play('windwarn'); if (st === 'gust') this.audio.play('wind'); z.last = st; }
    }
  }

  // Stormende kudde gnoes: eerst gerommel en een waarschuwing, dan rennen ze van links door het beeld
  updateStampedes(dt) {
    const p = this.player;
    for (const s of this.stampedes) {
      if (!s.started) { if (p.cx > s.x) { s.started = true; s.t = -1.6; this.audio.play('rumble'); this.shake(4); this.fx.text(p.cx, p.y - 30, 'Een kudde gnoes! Klim omhoog!', '#ffd07a'); } continue; }
      s.t += dt;
      if (s.t > 0 && s.spawned < (s.count || 10) && s.t > s.spawned * (s.every || 0.55)) {
        s.spawned++;
        const x = this.camX - 60;
        let y = null; const cx = Math.floor(x / TILE);
        for (let cy = 0; cy < this.map.h; cy++) if (this.map.solidAt(cx, cy)) { y = cy * TILE; break; }
        if (y !== null) this.enemies.push(new Gnu(x, y));
        if (Math.random() < 0.5) this.shake(2);
      }
    }
  }

  // Vulkaanbommen (Java): vallen met een schaduw als waarschuwing
  updateBombs(dt) {
    const B = this.level.bombs, p = this.player;
    if (!B || p.dead) return;
    const z = B.find(b => p.cx > b.from * TILE && p.cx < b.to * TILE);
    if (!z) return;
    this.bombT -= dt;
    if (this.bombT > 0) return;
    this.bombT = z.every || 2.2;
    const x = p.cx + p.vx * 0.8 + (Math.random() - 0.4) * 160;
    let gy = null;
    for (let cy = 0; cy < this.map.h; cy++) { const cx = Math.floor(x / TILE); if (this.map.solidAt(cx, cy) || this.map.get(cx, cy) === T.LAVA) { gy = cy * TILE; break; } }
    if (gy === null) return;
    const s = new Stalactite(x, 0, { ceil: this.camY - 30, falling: true, skin: 'bomb' });
    s.groundY = gy; s.active = true; s.timer = 1.0;
    this.enemies.push(s);
  }

  // Gegooide vruchten van bavianen
  updateProjectiles(dt) {
    const p = this.player;
    for (const q of this.projectiles) {
      q.life -= dt; q.spin += dt * 10;
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      const cx = Math.floor((q.x + q.w / 2) / TILE), cy = Math.floor((q.y + q.h / 2) / TILE);
      if (this.map.solidAt(cx, cy)) { q.life = 0; this.fx.splat(q.x + 6, q.y + 6); }
      else if (!p.dead && overlap(p, q)) { q.life = 0; this.fx.splat(q.x + 6, q.y + 6); this.hurt(q.x); }
    }
    this.projectiles = this.projectiles.filter(q => q.life > 0 && q.y < this.level.pxH + 50);
  }

  // Bossarena: achter je gaat de doorgang dicht; na de overwinning gaat de uitgang open
  setColumn(col, rows, code) {
    for (const y of rows) { const cy = this.level.h - 1 - y; this.map.tiles[cy * this.map.w + col] = code; }
    this.map.version++;
  }
  updateArena() {
    const A = this.level.arena, p = this.player;
    if (!A || !this.boss || this.arenaOn || this.bossBeaten) return;
    if (p.cx > A.trigger * TILE && p.onGround) {
      this.arenaOn = true;
      this.setColumn(A.gate, A.gateRows, T.ROCK);
      this.boss.active = true; this.boss.wake(this);
      this.audio.playSong('boss');
    }
  }
  bossDefeated(b) {
    const A = this.level.arena;
    this.bossBeaten = true; this.arenaOn = false;
    this.setColumn(A.exit, A.exitRows, T.EMPTY);
    this.setColumn(A.gate, A.gateRows, T.EMPTY);
    this.audio.stopSong(); this.audio.play('win');
    this.fx.text(b.cx, b.y - 20, 'Verjaagd!', '#ffe27a');
    setTimeout(() => { if (this.state === 'play') this.audio.playSong(this.def.music); }, 2500);
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
        L.omega += (-(1700 / L.len) * Math.sin(L.angle) + Math.sin(this.time * 1.3 + L.ax) * 0.05) * dt;
        L.omega *= 1 - 1.6 * dt;
        L.angle += L.omega * dt;
      }
      if (p.hang || p.regrab > 0 || p.onGround || p.dead) continue;
      const ex = L.ax + Math.sin(L.angle) * L.len, ey = L.ay + Math.cos(L.angle) * L.len;
      // Grijpen: een punt op het onderste deel van de liaan raakt je handen of bovenlijf (ruim, voor iedereen)
      const box = { x: p.x - 22, y: p.y - 16, w: p.w + 44, h: p.h * 0.75 + 16 };
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
    if (this.arenaOn) {
      const A = this.level.arena, a = A.x1 * TILE - 8, b = (A.x2 + 1) * TILE + 8;
      this.camX = b - a <= this.viewW ? (a + b) / 2 - this.viewW / 2 : Math.max(a, Math.min(b - this.viewW, this.camX));
    }
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
    if (this.level.outside) {
      // Buiten de grot: daglicht en savanne
      const sx = (this.level.outside.from * TILE - camX) * (this.zoom || 1);
      if (sx < this.viewW) { c.save(); c.beginPath(); c.rect(Math.max(0, sx), 0, this.viewW + 10, this.viewH); c.clip(); this.renderer.background(c, this.level.outsideTheme || 'savanna', camX, camY, this.viewW, this.viewH, this.level.pxH, this.time); c.restore(); }
    }

    c.setTransform(k, 0, 0, k, -camX * k, -camY * k);
    const vis = (x, m = 120) => x > camX - m && x < camX + this.viewW + m;
    this.renderer.pits(c, camX, this.viewW, this.level.pxH);
    for (const d of this.decor) if (d.type === 'tree' && vis(d.x, 200)) drawTree(c, d.x, d.y, d.scale || 1);
    for (const d of this.decor) if (d.type === 'bigtree' && vis(d.x, 260)) drawBigTree(c, d.x, d.y, d.y - d.height * TILE);
    if (this.finish && vis(this.finish.x, 420)) (this.def.finishScene === 'shelter' ? drawShelter(c, this.finish.x + 190, this.finish.y) : drawCave(c, this.finish.x + 150, this.finish.y, this.time));
    this.renderer.tiles(c, this.map, camX, camY, this.viewW, this.viewH);
    this.renderer.dynamicTiles(c, this.map, camX, this.viewW, this.time);
    for (const d of this.decor) if (d.type === 'sign' && vis(d.x)) drawSign(c, d.x, d.y, d.text);
    for (const f of this.fires) if (vis(f.x)) (this.def.fire ? drawCampfire : drawStoneCache)(c, f.x, f.y, f.lit, this.time);
    if (this.finish && vis(this.finish.x, 420)) drawFoodCache(c, this.finish.x + 122, this.finish.y);
    for (const L of this.lianas) if (vis(L.ax, 200)) drawLiana(c, L, this.time);
    for (const k2 of this.pickups) if (!k2.taken && vis(k2.x)) {
      if (k2.type === 'handaxe') { c.save(); const gl = c.createRadialGradient(k2.x, k2.y, 2, k2.x, k2.y, 22); gl.addColorStop(0, '#fff3b0aa'); gl.addColorStop(1, '#fff3b000'); c.fillStyle = gl; c.fillRect(k2.x - 22, k2.y - 22, 44, 44); toolIcon(c, 'axe', k2.x, k2.y + Math.sin(this.time * 3) * 2.5, 1.5, this.time); c.restore(); }
      else drawPickup(c, k2, this.time);
    }
    if (this.npcs && this.finish && vis(this.finish.x, 420)) for (const n of this.npcs) n.draw(c, this.time + n.x);
    for (const m of this.meets) if (vis(m.x, 200)) for (const n of m.group) n.draw(c, this.time + n.phase);
    for (const pl of this.platforms) if (vis(pl.x, 140)) pl.draw(c, this.time);
    for (const e of this.enemies) if (e.active || vis(e.x)) e.draw(c, this.time);
    for (const s of this.stonesFlying) {
      c.save(); c.translate(s.x + 5, s.y + 5); c.rotate(s.spin);
      c.fillStyle = '#2a2c30'; c.beginPath(); c.moveTo(-5, 1); c.lineTo(-2, -5); c.lineTo(4, -4); c.lineTo(5, 2); c.lineTo(0, 5); c.closePath(); c.fill();
      c.fillStyle = '#7d8590'; c.beginPath(); c.arc(-1, -1, 2, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const q of this.projectiles) {
      c.save(); c.translate(q.x + 6, q.y + 6); c.rotate(q.spin);
      c.fillStyle = '#7a3e10'; c.beginPath(); c.arc(0, 0, 6.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8902e'; c.beginPath(); c.arc(0, 0, 5.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd07a'; c.beginPath(); c.arc(-1.6, -1.6, 1.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5e8a32'; c.fillRect(-1, -8, 2, 3); c.restore();
    }
    if (this.state !== 'title') this.player.draw(c, this.time);
    this.renderer.water(c, this.map, camX, this.viewW, this.level.pxH, this.time);
    this.fx.draw(c);
    if (this.debug) this.drawDebug(c);

    // Voorgrond-silhouetten en lucht-sfeer (in schermcoördinaten)
    c.setTransform(kb, 0, 0, kb, 0, 0);
    const fgTheme = this.level.outside && this.player.cx > this.level.outside.from * TILE ? (this.level.outsideTheme || 'savanna') : this.level.theme;
    if (this.state !== 'title') this.renderer.foreground(c, fgTheme, camX, this.viewW, this.viewH, this.time);
    this.drawDarkness(c, camX, camY, k);
    c.setTransform(kb, 0, 0, kb, 0, 0);
    this.renderer.atmosphere(c, fgTheme, camX, camY, this.viewW, this.viewH, this.time);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.state !== 'title') { this.drawHud(c); this.drawTouch(c); }
    if (this.arenaOn && this.boss) this.drawBossBar(c);
    if (this.state === 'intro' && this.introT < 1.4) this.drawIntro(c);
    if (this.banner && this.state === 'play') this.drawBanner(c);
    if (this.level.wind && this.state === 'play') for (const z of this.level.wind) {
      if (this.player.cx < z.from * TILE || this.player.cx > z.to * TILE) continue;
      const st = this.windState(z); if (st === 'calm') continue;
      c.save(); c.globalAlpha = st === 'warn' ? 0.5 + Math.sin(this.time * 20) * 0.4 : 0.9;
      c.fillStyle = '#10221fd0'; c.beginPath(); c.roundRect(this.W / 2 - 46, this.safe.t + 40, 92, 26, 13); c.fill();
      c.fillStyle = '#e8f4ff'; c.font = '800 13px system-ui, sans-serif'; c.textAlign = 'center';
      c.fillText((z.dir > 0 ? 'WIND →' : '← WIND'), this.W / 2, this.safe.t + 58); c.textAlign = 'left'; c.restore();
    }
  }

  drawDebug(c) {
    c.strokeStyle = '#0f0'; c.lineWidth = 1;
    const p = this.player; c.strokeRect(p.x, p.y, p.w, p.h);
    c.strokeStyle = '#f00'; for (const e of this.enemies) { const h = e.hitbox(); c.strokeRect(h.x, h.y, h.w, h.h); }
  }

  // Grotten zijn donker: alleen rond de speler en bij lichtbundels zie je iets
  drawDarkness(c, camX, camY, k) {
    const D = this.level.dark;
    if (!D) return;
    const px = this.player.cx / TILE;
    const amt = 0.84 * Math.max(0, Math.min(1, (px - D.from) / 4, (D.to - px) / 4));
    if (amt <= 0.01 && this.state !== 'title') return;
    const W = this.cv.width, H = this.cv.height;
    if (!this.darkCv || this.darkCv.width !== W || this.darkCv.height !== H) { this.darkCv = document.createElement('canvas'); this.darkCv.width = W; this.darkCv.height = H; }
    const d = this.darkCv.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = `rgba(6,5,8,${this.state === 'title' ? 0.6 : amt})`; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    d.setTransform(k, 0, 0, k, -camX * k, -camY * k);
    const hole = (x, y, r, a = 1) => { const g = d.createRadialGradient(x, y, r * 0.15, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
    const p = this.player;
    hole(p.cx, p.y + 18, p.tool === 'torch' ? 235 + Math.sin(this.time * 9) * 6 : 165);
    if (this.def.fire) for (const f of this.fires) if (f.lit) hole(f.x, f.y - 20, 190);
    for (const L of this.level.entities) if (L.type === 'light') {
      const g = d.createLinearGradient(L.x - 50, 0, L.x + 50, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.moveTo(L.x - 22, 0); d.lineTo(L.x + 22, 0); d.lineTo(L.x + 60, this.level.pxH); d.lineTo(L.x - 60, this.level.pxH); d.closePath(); d.fill();
    }
    if (this.boss && !this.boss.gone) hole(this.boss.cx, this.boss.y + 20, 120, 0.8);
    for (const pk of this.pickups) if (!pk.taken && pk.type === 'artifact') hole(pk.x, pk.y, 40, 0.8);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.darkCv, 0, 0); c.restore();
    // Lichtbundels krijgen een zachte gloed
    c.save(); c.setTransform(k, 0, 0, k, -camX * k, -camY * k); c.globalCompositeOperation = 'lighter';
    for (const L of this.level.entities) if (L.type === 'light') {
      const g = c.createLinearGradient(L.x - 40, 0, L.x + 40, 0);
      g.addColorStop(0, 'rgba(255,230,170,0)'); g.addColorStop(0.5, 'rgba(255,230,170,0.08)'); g.addColorStop(1, 'rgba(255,230,170,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(L.x - 18, 0); c.lineTo(L.x + 18, 0); c.lineTo(L.x + 55, this.level.pxH); c.lineTo(L.x - 55, this.level.pxH); c.closePath(); c.fill();
    }
    c.restore();
  }

  drawBossBar(c) {
    const b = this.boss, w = Math.min(320, this.W - 120), x = (this.W - w) / 2, y = this.H - 34 - (this.input.touchMode ? 0 : 0);
    const top = this.safe.t + 44;
    c.fillStyle = '#10221fd8'; c.beginPath(); c.roundRect(x, top, w, 34, 12); c.fill();
    c.fillStyle = '#f6cf75'; c.font = '800 12px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText(b.title || 'EINDBAAS', this.W / 2, top + 14);
    for (let i = 0; i < b.maxHits; i++) {
      const bx = this.W / 2 + (i - (b.maxHits - 1) / 2) * 30;
      c.fillStyle = i < b.maxHits - b.hits ? '#ff6b4a' : '#ffffff30';
      c.beginPath(); c.roundRect(bx - 12, top + 20, 24, 8, 4); c.fill();
    }
    c.textAlign = 'left';
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
    if (this.player.tool) { toolIcon(c, this.player.tool, sl + 242, st + 15, 1, this.time); c.fillStyle = '#fff1c4'; c.fillText('∞', sl + 256, st + 16); }
    else { flintIcon(c, sl + 242, st + 15, 1); c.fillStyle = this.stones ? '#fff1c4' : '#ff9b8a'; c.fillText(String(this.stones), sl + 256, st + 16); }
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
    c.save(); c.globalAlpha = throwing ? 0.9 : 0.45; if (this.player.tool) toolIcon(c, this.player.tool, Th.x, Th.y, Th.r / 15, this.time); else flintIcon(c, Th.x, Th.y, Th.r / 15); c.restore();
    if (this.stones > 0 && !this.player.tool) { c.fillStyle = 'rgba(255,241,196,0.7)'; c.font = '800 11px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(String(this.stones), Th.x + Th.r * 0.75, Th.y - Th.r * 0.6); c.textAlign = 'left'; }
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

function toolIcon(c, tool, x, y, s, time) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (tool === 'axe') {
    c.rotate(-0.5);
    c.fillStyle = '#3a3226'; c.beginPath(); c.moveTo(0, -9); c.quadraticCurveTo(8, -1, 1, 10); c.quadraticCurveTo(-7, -1, 0, -9); c.fill();
    c.fillStyle = '#c9b183'; c.beginPath(); c.moveTo(0, -7.5); c.quadraticCurveTo(6, -1, 1, 8); c.quadraticCurveTo(-5, -1, 0, -7.5); c.fill();
    c.fillStyle = '#efe0b8'; c.beginPath(); c.moveTo(0, -4); c.lineTo(2.5, 0); c.lineTo(0, 3); c.closePath(); c.fill();
  } else {
    c.strokeStyle = '#6a4228'; c.lineWidth = 3; c.beginPath(); c.moveTo(3, 9); c.lineTo(-1, -2); c.stroke();
    const f = Math.sin(time * 14);
    c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(-6, -1); c.quadraticCurveTo(-4 + f, -9, -2, -12); c.quadraticCurveTo(1 + f, -8, 3, -1); c.closePath(); c.fill();
    c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(-3.5, -2); c.quadraticCurveTo(-2.5, -6, -1.5, -7); c.quadraticCurveTo(0, -5, 1, -2); c.closePath(); c.fill();
  }
  c.restore();
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
