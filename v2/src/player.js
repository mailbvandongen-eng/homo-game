import { TILE, PHYS, MAX_STONES } from './config.js';
import { moveBody, T } from './level.js';
import { groundShadow } from './art.js';
import { drawRig, rigLook, gamePose } from './rig.js';

export class Player {
  constructor(x, y, look = null) {
    this.w = 22; this.h = 44;
    // Uiterlijk (voor stamleden): vachtkleur, huid, haar en grootte
    this.look = { fur: '#8a5a39', skin: '#c18a5f', limb: '#a8744d', hair: '#5d3a25', size: 1, ...look };
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x - this.w / 2; this.y = y - this.h;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.onGround = true;
    this.coyote = 0; this.buffer = 0;
    this.holdTime = 0;          // hoe lang je al dezelfde kant op loopt (voor rennen)
    this.jumping = false;
    this.invuln = 0;
    this.throwAnim = 0;
    this.anim = 0;
    this.sx = 1; this.sy = 1;   // vervorming bij springen en landen
    this.dead = false;
    this.deadT = 0;
    this.auto = 0;              // automatisch lopen (finish)
    this.hang = null;           // vastgegrepen liaan
    this.regrab = 0;
    this.cheer = 0;             // juichen bij de finish
  }

  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }
  get running() { return this.holdTime >= PHYS.runDelay && Math.abs(this.vx) > PHYS.walk * 0.9; }

  overlapsTile(cx, cy) {
    return this.x < (cx + 1) * TILE && this.x + this.w > cx * TILE && this.y < (cy + 1) * TILE && this.y + this.h > cy * TILE;
  }

  update(dt, input, game) {
    if (this.dead) {
      this.deadT += dt;
      if (this.deadT > 0.45) { this.vy = Math.min(this.vy + PHYS.gravDown * dt, PHYS.maxFall); this.y += this.vy * dt; }
      return;
    }
    const map = game.map;
    let dir = input.left ? -1 : input.right ? 1 : 0;
    if (this.auto) dir = this.auto;
    this.regrab = Math.max(0, this.regrab - dt);
    if (this.hang) return this.swing(dt, dir, input, game);

    // Rennen ontstaat vanzelf als je een richting vasthoudt.
    if (dir !== 0 && dir === Math.sign(this.vx || dir)) this.holdTime += dt; else if (this.onGround) this.holdTime = 0;
    const max = this.auto ? PHYS.walk * 0.8 : (this.holdTime >= PHYS.runDelay ? PHYS.run : PHYS.walk);

    if (dir !== 0) {
      this.face = dir;
      const turning = this.vx !== 0 && Math.sign(this.vx) !== dir;
      const slick = this.onGround && this.groundTile === T.MUD;
      const a = (!this.onGround ? PHYS.airAccel : turning ? PHYS.skid : PHYS.accel) * (slick ? 0.3 : 1);
      const before = Math.abs(this.vx);
      this.vx += dir * a * dt;
      // Nooit sneller dan het maximum; zat je erboven (na rennen), dan rustig afremmen.
      const limit = Math.max(max, before - PHYS.friction * 0.5 * dt);
      if (Math.abs(this.vx) > limit) this.vx = Math.sign(this.vx) * limit;
      if (turning && this.onGround && Math.abs(this.vx) > 90) {
        this.skidding = true;
        if (Math.random() < 0.5) game.fx.dust(this.cx, this.bottom, -dir, 1);
      } else this.skidding = false;
    } else {
      this.skidding = false;
      const f = (this.onGround ? PHYS.friction : PHYS.friction * 0.25) * (this.onGround && this.groundTile === T.MUD ? 0.1 : 1);
      const s = Math.abs(this.vx) - f * dt;
      this.vx = s <= 0 ? 0 : Math.sign(this.vx) * s;
    }

    // Springen met buffer en coyote-tijd
    if (input.jump) this.buffer = PHYS.buffer; else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? PHYS.coyote : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0 && !this.auto) {
      const speedBonus = Math.abs(this.vx) / PHYS.run * PHYS.runJumpBonus;
      this.vy = -(PHYS.jumpV + speedBonus);
      this.onGround = false; this.jumping = true;
      this.buffer = 0; this.coyote = 0;
      this.sx = 0.8; this.sy = 1.22;
      game.audio.play('jump');
      game.fx.dust(this.cx, this.bottom, 0, 4);
    }

    // Variabele springhoogte: loslaten = sneller terug.
    let g = PHYS.gravDown;
    if (this.vy < 0) g = (input.jumpHeld || !this.jumping) ? PHYS.gravUp : PHYS.gravCut;
    this.vy = Math.min(this.vy + g * dt, PHYS.maxFall);

    const wasGround = this.onGround;
    const vyBefore = this.vy;
    const r = moveBody(this, dt, map);

    // Hoekcorrectie: hoofd stoot net tegen een rand → schuif er langs.
    if (r.ceil && vyBefore < 0) {
      const left = r.headX * TILE, right = left + TILE;
      const nudge = 7;
      if (this.x + this.w - left <= nudge && !map.solidAt(r.headX - 1, r.headY)) { this.x = left - this.w; this.vy = vyBefore; }
      else if (right - this.x <= nudge && !map.solidAt(r.headX + 1, r.headY)) { this.x = right; this.vy = vyBefore; }
      else { game.hitHead(r.headX, r.headY); this.jumping = false; }
    }

    // Randhulp: net te laag tegen een rand aan? Dan stap je er alsnog op.
    if (r.wall && this.vy >= 0 && !r.landed) {
      const cx = r.wall > 0 ? Math.floor((this.x + this.w + 1) / TILE) : Math.floor((this.x - 1) / TILE);
      const cy = Math.floor((this.y + this.h - 1) / TILE), top = cy * TILE;
      if (this.y + this.h - top <= 18 && !map.solidAt(cx, cy - 1) && !map.solidAt(cx, cy - 2)) {
        this.y = top - this.h; this.x += r.wall * 3; this.vy = 0; r.landed = true; r.groundX = cx; r.groundY = cy;
      }
    }
    this.onGround = r.landed;
    if (r.landed) {
      this.jumping = false;
      const tile = map.get(r.groundX, r.groundY);
      this.groundTile = tile;
      if (tile === T.MUD && Math.abs(this.vx) > 60 && Math.random() < dt * 10) game.fx.splat(this.cx - this.face * 6, this.bottom - 2, '#4a3220', 2);
      if (tile === T.SPRING || tile === T.BOUNCY) {
        this.vy = -(tile === T.SPRING ? PHYS.springV : PHYS.branchV) * (input.jumpHeld ? 1.1 : 1);
        this.onGround = false; this.jumping = false;
        this.sx = 0.75; this.sy = 1.3;
        for (let k = -2; k <= 2; k++) if (map.get(r.groundX + k, r.groundY) === tile) map.bounce.set(map.idx(r.groundX + k, r.groundY), 0.45);
        game.audio.play('spring');
      } else {
        if (tile === T.CRUMBLE) map.touchCrumble(r.groundX, r.groundY);
        if (!wasGround) {
          const impact = Math.min(1, vyBefore / PHYS.maxFall);
          this.sx = 1 + 0.25 * impact; this.sy = 1 - 0.25 * impact;
          if (impact > 0.4) game.fx.dust(this.cx, this.bottom, 0, 3 + Math.round(impact * 4));
          if (impact > 0.25) game.audio.play('land');
        }
      }
    }

    if (this.onGround && Math.abs(this.vx) > 10) {
      const before = Math.floor(this.anim / Math.PI);
      this.anim += dt * Math.abs(this.vx) / 15;
      if (Math.floor(this.anim / Math.PI) !== before) game.audio.play('step');
      if (this.running && Math.random() < dt * 12) game.fx.dust(this.cx - this.face * 8, this.bottom, -this.face, 1);
    } else if (this.onGround) this.anim = 0;

    this.sx += (1 - this.sx) * Math.min(1, dt * 12);
    this.sy += (1 - this.sy) * Math.min(1, dt * 12);
    this.invuln = Math.max(0, this.invuln - dt);
    this.throwAnim = Math.max(0, this.throwAnim - dt);

    if (input.throw && !this.auto) game.throwStone();
  }

  // Slingeren aan een liaan: een slinger met lengte len rond het ophangpunt.
  grab(liana) {
    const len = liana.len;
    this.hang = liana; liana.held = true;
    // Neem de vaart mee in de slinger.
    liana.omega = (this.vx * Math.cos(liana.angle) - this.vy * Math.sin(liana.angle) * 0.3) / len;
    this.vx = 0; this.vy = 0; this.jumping = false; this.onGround = false;
    this.sx = 1.15; this.sy = 0.88;
  }

  swing(dt, dir, input, game) {
    const L = this.hang, len = L.len;
    // Zwaartekracht op de slinger, plus zelf "pompen" met links/rechts
    L.omega += (-(1700 / len) * Math.sin(L.angle) + dir * 2.6) * dt;
    L.omega *= 1 - 0.2 * dt;
    L.angle = Math.max(-1.25, Math.min(1.25, L.angle + L.omega * dt));
    if (dir) this.face = dir; else if (Math.abs(L.omega) > 0.3) this.face = Math.sign(L.omega);
    const hx = L.ax + Math.sin(L.angle) * len, hy = L.ay + Math.cos(L.angle) * len;
    this.x = hx - this.w / 2; this.y = hy + 9;   // handen precies aan de liaan
    this.anim += dt * 4;
    this.sx += (1 - this.sx) * Math.min(1, dt * 12); this.sy += (1 - this.sy) * Math.min(1, dt * 12);
    this.invuln = Math.max(0, this.invuln - dt);
    if (input.jump) {
      // Loslaten: snelheid langs de slingerbaan plus een sprong omhoog
      const tv = L.omega * len;
      let vx = tv * Math.cos(L.angle) + this.face * 70;
      if (vx * this.face < 205) vx = this.face * 205;   // altijd een fatsoenlijke zwaai in de kijkrichting
      this.vx = Math.max(-PHYS.run * 1.3, Math.min(PHYS.run * 1.3, vx));
      this.vy = Math.min(0, -tv * Math.sin(L.angle)) - PHYS.lianaJump;
      this.holdTime = PHYS.runDelay;
      L.held = false; this.hang = null; this.regrab = 0.35; this.jumping = true;
      this.sx = 0.8; this.sy = 1.2;
      game.audio.play('jump');
    }
  }

  bounceOff(held) {
    this.vy = -(held ? PHYS.stompBounceHeld : PHYS.stompBounce);
    this.onGround = false; this.jumping = true;
    this.sx = 0.85; this.sy = 1.15;
  }

  // ---------- tekenen ----------
  // Getekende pop met skelet (rig.js): houding volgt de toestand van het spel.
  draw(c, time) {
    if (this.invuln > 0 && !this.dead && Math.floor(time * 16) % 2 === 0) return;
    const look = rigLook(this.look), air = !this.onGround && !this.cheer, hanging = !!this.hang;
    if (!air && !this.dead && !hanging) groundShadow(c, this.cx, this.bottom, 15 * this.look.size, 0.3);
    const speed = Math.abs(this.vx);
    const st = {
      time, seed: (this.phase || 0) + this.x * 0.003, dead: this.dead, hang: hanging ? this.hang.omega : 0, cheer: this.cheer,
      air, vy: this.vy, skid: this.skidding, speed: this.onGround ? speed : 0, phase: this.anim,
      run: Math.min(1, Math.max(0, (speed - PHYS.walk * 0.7) / (PHYS.run - PHYS.walk * 0.7))),
      throwK: this.throwAnim > 0 ? 1 - this.throwAnim / 0.25 : 0,
    };
    // Knipperen af en toe
    this.blinkT = (this.blinkT ?? 2 + Math.random() * 3) - 1 / 60;
    if (this.blinkT < -0.12) this.blinkT = 2.5 + Math.random() * 3.5;
    const S = 0.44 * this.look.size;
    c.save();
    c.translate(Math.round(this.cx), Math.round(this.bottom - (this.hop || 0) + (hanging ? 7 : 0)));
    if (this.dead) { c.translate(0, -22); c.rotate(Math.min(this.deadT * 6, Math.PI)); c.translate(0, 22); }
    c.scale(this.face * this.sx * S, this.sy * S);
    const tool = this.tool || (this.throwAnim > 0.08 ? 'stone' : null);
    drawRig(c, look, gamePose(st), {
      tool, time, blink: this.blinkT < 0, eyes: this.dead ? 'closed' : null,
      mouth: this.cheer || this.invuln > 1 ? 'open' : null, chew: !!this.look.crest,
    });
    c.restore();
  }
}

function line(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
