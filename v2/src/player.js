import { TILE, PHYS, MAX_STONES } from './config.js';
import { moveBody, T } from './level.js';

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
      const a = !this.onGround ? PHYS.airAccel : turning ? PHYS.skid : PHYS.accel;
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
      const f = this.onGround ? PHYS.friction : PHYS.friction * 0.25;
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
        }
      }
    }

    if (this.onGround && Math.abs(this.vx) > 10) {
      this.anim += dt * Math.abs(this.vx) / 15;
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
  draw(c, time) {
    if (this.invuln > 0 && !this.dead && Math.floor(time * 16) % 2 === 0) return;
    const air = !this.onGround && !this.cheer;
    const hanging = !!this.hang;
    c.save();
    c.translate(Math.round(this.cx), Math.round(this.bottom - (this.hop || 0)));
    if (this.look.size !== 1) c.scale(this.look.size, this.look.size);
    if (this.dead) { c.translate(0, -22); c.rotate(Math.min(this.deadT * 6, Math.PI)); c.translate(0, 22); }
    c.scale(this.face * this.sx, this.sy);

    const speed = Math.abs(this.vx);
    const moving = !air && speed > 10;
    const runAmt = Math.min(1, Math.max(0, (speed - PHYS.walk * 0.7) / (PHYS.run - PHYS.walk * 0.7)));
    const ph = this.anim;
    const swing = moving ? (0.55 + 0.35 * runAmt) : 0;
    const bob = moving ? -Math.abs(Math.sin(ph)) * (1.5 + runAmt * 1.5) : Math.sin(time * 2.4) * 0.6;
    let lean = moving ? 0.1 + runAmt * 0.18 : 0.04;
    if (this.skidding) lean = -0.22;
    if (air) lean = this.vy < 0 ? 0.08 : -0.02;

    c.translate(0, bob);
    const fur = this.look.fur, furDark = this.look.hair, skin = this.look.skin, limbBack = this.look.limb, outline = '#2c1d15';

    const limb = (pts, color, width) => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = outline; c.lineWidth = width + 3; line(c, pts);
      c.strokeStyle = color; c.lineWidth = width; line(c, pts);
    };
    // Benen: dij en scheen met vaste lengtes
    const leg = (side) => {
      const hip = [side * 3, -21];
      let a, bend;
      if (hanging) { a = side * 0.15 - this.hang.omega * 0.25 + Math.sin(this.anim + side) * 0.1; bend = 0.25; }
      else if (air) {
        if (this.vy < 0) { a = side > 0 ? 0.9 : -0.25; bend = side > 0 ? 1.4 : 0.4; }
        else { a = side > 0 ? 0.35 : -0.3; bend = 0.35; }
      } else if (this.skidding) { a = 0.55; bend = 0.15; }
      else if (moving) {
        const s = Math.sin(ph + (side > 0 ? 0 : Math.PI));
        a = s * swing;
        bend = Math.max(0, Math.cos(ph + (side > 0 ? 0 : Math.PI))) * (0.9 + runAmt * 0.6);
      } else { a = side * 0.08; bend = 0.05; }
      const knee = [hip[0] + Math.sin(a) * 11, hip[1] + Math.cos(a) * 11];
      const foot = [knee[0] + Math.sin(a - bend) * 11, knee[1] + Math.cos(a - bend) * 11];
      limb([hip, knee, foot], side > 0 ? skin : limbBack, 5);
      c.fillStyle = outline;
      c.beginPath(); c.ellipse(foot[0] + 2.5, foot[1] - 0.5, 4.8, 2.2, 0, 0, Math.PI * 2); c.fill();
    };
    const arm = (side) => {
      const sh = [side * 2 + 1, -35];
      let a, bend;
      if (hanging) { a = Math.PI - 0.12 * side; bend = 0; }
      else if (this.cheer) { a = Math.PI - 0.45 * side + Math.sin(time * 9 + side + this.x) * 0.35; bend = 0.3 * side; }
      else if (this.throwAnim > 0 && side > 0) {
        const t = 1 - this.throwAnim / 0.25;
        a = -2.2 + t * 3.6; bend = -0.3;
      } else if (air) {
        if (this.vy < 0) { a = side > 0 ? 2.5 : -0.9; bend = side > 0 ? 0.3 : -0.4; }
        else { a = side > 0 ? 1.9 : -1.6; bend = 0.2; }
      }
      else if (this.skidding) { a = 1.2; bend = -0.3; }
      else if (moving) { a = Math.sin(ph + (side > 0 ? Math.PI : 0)) * swing * 0.9; bend = -0.35 - runAmt * 0.7; }
      else { a = 0.1 * side + Math.sin(time * 2.4) * 0.03; bend = -0.15; }
      const elbow = [sh[0] + Math.sin(a) * 9, sh[1] + Math.cos(a) * 9];
      const hand = [elbow[0] + Math.sin(a - bend) * 9, elbow[1] + Math.cos(a - bend) * 9];
      limb([sh, elbow, hand], side > 0 ? skin : limbBack, 4.2);
      if (this.throwAnim > 0.12 && side > 0) {
        c.fillStyle = '#8d8778'; c.beginPath(); c.arc(hand[0], hand[1], 3.2, 0, Math.PI * 2); c.fill();
      }
    };

    arm(-1); leg(-1);
    c.save(); c.translate(0, -21); c.rotate(lean); c.translate(0, 21);
    // Romp
    c.fillStyle = outline;
    c.beginPath(); c.ellipse(1, -29, 10.5, 12.5, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = fur;
    c.beginPath(); c.ellipse(1, -29, 8.8, 10.8, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c99668';
    c.beginPath(); c.ellipse(4, -29, 4.5, 7, 0.15, 0, Math.PI * 2); c.fill();
    // Lendendoek
    c.fillStyle = '#6b4a2a';
    c.beginPath(); c.moveTo(-8, -22); c.quadraticCurveTo(1, -18, 10, -22); c.lineTo(9, -16); c.quadraticCurveTo(1, -12, -7, -16); c.closePath(); c.fill();
    // Hoofd
    const hy = -45;
    // Snuit: plat gezicht (rudolfensis, erectus) of vooruitstekend (habilis)
    const mz = this.look.flat ? 6.5 : 9, mw = this.look.flat ? 4.6 : 5.5;
    c.fillStyle = outline;
    c.beginPath(); c.ellipse(2, hy, this.look.flat ? 11 : 10.5, this.look.flat ? 10.6 : 10, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(mz, hy + 4, mw + 1.5, 5.5, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = skin;
    c.beginPath(); c.ellipse(2, hy, this.look.flat ? 9.4 : 8.8, this.look.flat ? 9 : 8.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d4a073';
    c.beginPath(); c.ellipse(mz, hy + 4, mw, 4.2, 0.1, 0, Math.PI * 2); c.fill();
    // Haar
    c.fillStyle = furDark;
    c.beginPath(); c.moveTo(-7, hy + 3); c.quadraticCurveTo(-9, hy - 9, 2, hy - 10); c.quadraticCurveTo(10, hy - 10, 10, hy - 4);
    c.lineTo(4, hy - 3); c.quadraticCurveTo(-1, hy - 2, -3, hy + 5); c.closePath(); c.fill();
    if (this.look.crest) {
      // Paranthropus: schedelkam en brede jukbeenderen voor enorme kauwspieren
      c.fillStyle = '#2c1d15'; c.beginPath(); c.moveTo(-8, hy - 4); c.quadraticCurveTo(-2, hy - 19, 8, hy - 10); c.lineTo(6, hy - 5); c.closePath(); c.fill();
      c.fillStyle = '#6a4630'; c.beginPath(); c.moveTo(-6, hy - 5); c.quadraticCurveTo(-1, hy - 16, 6, hy - 9); c.lineTo(5, hy - 6); c.closePath(); c.fill();
      c.fillStyle = '#2c1d15'; c.beginPath(); c.ellipse(4, hy + 4, 10.5, 7.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = skin; c.beginPath(); c.ellipse(4, hy + 4, 9, 6.2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9a6a48'; c.beginPath(); c.ellipse(1, hy + 2, 4, 3, 0, 0, Math.PI * 2); c.fill();
      const chew = Math.sin(this.anim * 6) * 1.2;
      c.fillStyle = '#5a3a26'; c.beginPath(); c.ellipse(10, hy + 7 + chew, 5, 2.2, 0, 0, Math.PI * 2); c.fill();
    }
    // Wenkbrauwboog en oog
    c.fillStyle = '#7b4f33'; c.beginPath(); c.ellipse(7, hy - 2.5, 5.5, 1.8, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff3dc'; c.beginPath(); c.ellipse(7.5, hy + 0.6, 2.4, 2.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1d1410'; c.beginPath(); c.arc(8.4, hy + 0.8, 1.3, 0, Math.PI * 2); c.fill();
    // Mond
    c.strokeStyle = '#6d3f2a'; c.lineWidth = 1.2; c.beginPath();
    if (this.cheer) { c.fillStyle = '#5a2a1c'; c.beginPath(); c.ellipse(11, hy + 6.5, 2.4, 2, 0, 0, Math.PI * 2); c.fill(); }
    else if (this.dead || this.invuln > 1) { c.arc(11, hy + 7, 1.6, 0, Math.PI * 2); } else { c.moveTo(9, hy + 6.5); c.quadraticCurveTo(11.5, hy + 7.5, 13.5, hy + 5.8); }
    c.stroke();
    // Oor
    c.fillStyle = limbBack; c.beginPath(); c.ellipse(-3, hy + 1, 2.2, 3.2, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    leg(1); arm(1);
    c.restore();
  }
}

function line(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
