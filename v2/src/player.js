import { TILE, PHYS, MAX_STONES } from './config.js';
import { moveBody, T } from './level.js';
import { groundShadow } from './art.js';
import { drawRig, drawRigBack, rigLook, gamePose } from './rig.js';

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
    this.buffs = { speed: 0, jump: 0, shield: 0, drunk: 0, dizzy: 0 };   // effecten van eten
    this.throwAnim = 0;
    this.anim = 0;
    this.sx = 1; this.sy = 1;   // vervorming bij springen en landen
    this.dead = false;
    this.deadT = 0;
    this.auto = 0;              // automatisch lopen (finish)
    this.hang = null;           // vastgegrepen liaan
    this.ropePos = 0;           // hoe ver langs de liaan je hangt
    this.bar = null;            // hand-over-hand aan een hangtak
    this.ledge = null;          // aan een rand hangen
    this.climbing = false;      // rotswand of boomstam beklimmen
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
    if (!game.banner?.hold) for (const k in this.buffs) if (this.buffs[k] > 0) this.buffs[k] = Math.max(0, this.buffs[k] - dt);
    if (this.dead) {
      this.deadT += dt;
      if (this.deadT > 0.45) { this.vy = Math.min(this.vy + PHYS.gravDown * dt, PHYS.maxFall); this.y += this.vy * dt; }
      return;
    }
    const map = game.map;
    let dir = input.left ? -1 : input.right ? 1 : 0;
    if (this.auto) dir = this.auto;
    this.regrab = Math.max(0, this.regrab - dt);
    this.lastLianaT = Math.max(0, (this.lastLianaT || 0) - dt);
    if (this.hang) return this.swing(dt, dir, input, game);
    if (this.bar) return this.barMove(dt, dir, input, game);
    if (this.ledge) return this.ledgeMove(dt, dir, input, game);
    if (this.climbing) return this.climbMove(dt, dir, input, game);
    // Klimmen beginnen: omhoog (of omlaag) terwijl je voor een rotswand of klimplant staat
    if ((input.up || (input.down && !this.onGround)) && this.regrab <= 0 && this.onClimb(map) && !this.auto) {
      this.climbing = true; this.vx = 0; this.vy = 0; this.jumping = false; this.onGround = false;
      game.audio.play('grab'); return;
    }

    // Rennen ontstaat vanzelf als je een richting vasthoudt.
    if (dir !== 0 && dir === Math.sign(this.vx || dir)) this.holdTime += dt; else if (this.onGround) this.holdTime = 0;
    const B = this.buffs, fast = B.speed > 0 ? 1.35 : B.drunk > 0 ? 0.8 : 1;
    const max = (this.auto ? PHYS.walk * 0.8 : (this.holdTime >= PHYS.runDelay ? PHYS.run : PHYS.walk)) * fast;

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
      this.vy = -(PHYS.jumpV + speedBonus) * (B.jump > 0 ? 1.2 : 1);
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
        for (let k = -3; k <= 3; k++) if (map.get(r.groundX + k, r.groundY) === tile) map.bounce.set(map.idx(r.groundX + k, r.groundY), tile === T.SPRING ? 1.0 : 1.2);
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

    // Grijpen in de lucht: hangtak boven je, of een rand voor je
    if (!this.onGround && this.regrab <= 0 && !this.dead && !this.auto) {
      if (this.tryBar(map, game)) return;
      if (this.tryLedge(map, dir || (Math.abs(this.vx) > 40 ? Math.sign(this.vx) : 0), game)) return;
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

  // Slingeren aan een liaan. Je hangt waar je de liaan raakt (ropePos) en kunt langs het touw klimmen of zakken.
  grab(liana, dist) {
    this.hang = liana; liana.held = true;
    // Je glijdt meteen naar het onderste stuk: zo slinger je altijd aan (bijna) het hele touw
    this.ropePos = Math.max(TILE * 1.4, Math.min(liana.len, Math.max(dist, liana.len - TILE * 1.2)));
    const len = this.ropePos;
    liana.omega = (this.vx * Math.cos(liana.angle) - this.vy * Math.sin(liana.angle) * 0.3) / len;
    this.vx = 0; this.vy = 0; this.jumping = false; this.onGround = false;
    this.sx = 1.15; this.sy = 0.88;
  }

  release(game, jump, dir) {
    const L = this.hang, len = this.ropePos, tv = L.omega * len;
    if (jump) {
      // Je vliegt mee met de vaart van de slinger, plus een klein zetje: niet meer dan dat
      let vx = tv * Math.cos(L.angle) + this.face * 40;
      if (vx * this.face < 150) vx = this.face * 150;
      this.vx = Math.max(-PHYS.run * 1.15, Math.min(PHYS.run * 1.15, vx));
      this.vy = Math.min(0, -tv * Math.sin(L.angle)) * 0.7 - PHYS.lianaJump;
      this.holdTime = PHYS.runDelay; this.jumping = true; this.sx = 0.8; this.sy = 1.2;
      game.audio.play('jump');
    } else { this.vx = tv * Math.cos(L.angle) * 0.6 + (dir || 0) * 60; this.vy = 40; }
    L.held = false; this.hang = null; this.regrab = 0.35;
    this.lastLiana = L; this.lastLianaT = 1.0;   // dezelfde liaan niet meteen weer pakken
  }

  swing(dt, dir, input, game) {
    const L = this.hang;
    // Langs het touw klimmen of zakken
    if (input.up) this.ropePos = Math.max(TILE * 1.4, this.ropePos - 95 * dt);
    if (input.down) {
      this.ropePos += 110 * dt;
      if (this.ropePos > L.len) return this.release(game, false, dir);   // onderaan: loslaten
    }
    const len = this.ropePos;
    L.omega += (-(1700 / len) * Math.sin(L.angle) + dir * 1.9) * dt;
    L.omega *= 1 - 0.35 * dt;
    const lim = 1.05; L.angle += L.omega * dt;
    if (Math.abs(L.angle) > lim) { L.angle = Math.sign(L.angle) * lim; L.omega *= -0.2; }   // verder kan een liaan niet
    if (dir) this.face = dir; else if (Math.abs(L.omega) > 0.3) this.face = Math.sign(L.omega);
    const hx = L.ax + Math.sin(L.angle) * len, hy = L.ay + Math.cos(L.angle) * len;
    this.x = hx - this.w / 2; this.y = hy + 9;   // handen precies aan de liaan
    // Voeten raken de grond: dan sta je
    const map = game.map;
    if (map.solidAt(Math.floor(this.cx / TILE), Math.floor((this.y + this.h) / TILE))) { L.held = false; this.hang = null; this.regrab = 0.4; this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h; this.onGround = true; this.vx = 0; return; }
    this.anim += dt * 4;
    this.ease(dt);
    if (input.jumpSolid ?? input.jump) this.release(game, true, dir);
  }

  ease(dt) {
    this.sx += (1 - this.sx) * Math.min(1, dt * 12); this.sy += (1 - this.sy) * Math.min(1, dt * 12);
    this.invuln = Math.max(0, this.invuln - dt); this.throwAnim = Math.max(0, this.throwAnim - dt);
  }

  // ---- Hand-over-hand aan een hangtak ----
  tryBar(map, game) {
    if (this.vy < -420) return false;
    const cx = Math.floor(this.cx / TILE), hy = this.y - 8;
    for (const cy of [Math.floor(hy / TILE), Math.floor(hy / TILE) + 1]) {
      if (map.get(cx, cy) !== T.BAR) continue;
      const top = cy * TILE;
      if (hy < top - 6 || hy > top + 14) continue;
      this.bar = { cy }; this.y = top + 4 + 9; this.vx = 0; this.vy = 0; this.jumping = false; this.sx = 1.1; this.sy = 0.9;
      game.audio.play('grab');
      return true;
    }
    return false;
  }
  barMove(dt, dir, input, game) {
    const map = game.map, sp = 78;
    this.vx = 0;
    if (dir) {
      this.face = dir;
      const nx = this.cx + dir * sp * dt, ahead = Math.floor((nx + dir * 4) / TILE);
      const blocked = map.solidAt(Math.floor((dir > 0 ? this.x + this.w + 1 : this.x - 1) / TILE), Math.floor((this.y + 10) / TILE));
      if (map.get(ahead, this.bar.cy) === T.BAR && !blocked) { this.x += dir * sp * dt; this.vx = dir * sp; this.anim += dt * 7; this.barPush = 0; }
      else {
        // Aan het eind van de tak doorduwen: met een zwaai loslaten
        this.barPush = (this.barPush || 0) + dt;
        if (this.barPush > 0.15) { this.bar = null; this.regrab = 0.35; this.vx = dir * 170; this.vy = -120; this.barPush = 0; return; }
      }
    }
    this.ease(dt);
    if ((input.jumpSolid ?? input.jump) || input.down) { this.bar = null; this.regrab = 0.35; this.vy = input.down ? 30 : -220; this.vx = dir * 110; this.jumping = false; }
  }

  // ---- Aan een rand hangen en jezelf optrekken ----
  tryLedge(map, dir, game) {
    if (!dir || this.vy < -80) return false;
    const fx = dir > 0 ? Math.floor((this.x + this.w + 3) / TILE) : Math.floor((this.x - 3) / TILE);
    const hy = this.y - 6, ox = Math.floor(this.cx / TILE);
    for (const cy of [Math.floor(hy / TILE), Math.floor(hy / TILE) + 1]) {
      if (!map.solidAt(fx, cy) || map.solidAt(fx, cy - 1) || map.solidAt(fx, cy - 2) || map.solidAt(ox, cy - 1)) continue;
      const top = cy * TILE;
      if (hy < top - 12 || hy > top + 12) continue;
      this.ledge = { fx, cy, dir, up: 0 };
      this.x = dir > 0 ? fx * TILE - this.w : (fx + 1) * TILE;
      this.y = top + 9; this.vx = 0; this.vy = 0; this.face = dir; this.jumping = false;
      game.audio.play('grab');
      return true;
    }
    return false;
  }
  ledgeMove(dt, dir, input, game) {
    const L = this.ledge;
    this.ease(dt);
    if (L.up > 0) {
      L.up += dt;
      if (L.up > 0.26) {
        this.x = L.dir > 0 ? L.fx * TILE + 1 : (L.fx + 1) * TILE - this.w - 1;
        this.y = L.cy * TILE - this.h; this.ledge = null; this.onGround = true; this.vy = 0; this.vx = L.dir * 40;
        this.sx = 1.12; this.sy = 0.9;
      }
      return;
    }
    if (input.up || input.jump || dir === L.dir) { L.up = 0.001; game.audio.play('jump'); }
    else if (input.down || dir === -L.dir) { this.ledge = null; this.regrab = 0.4; this.vx = dir * 60; }
  }

  // ---- Rotswand of boomstam beklimmen ----
  onClimb(map) {
    const cx = Math.floor(this.cx / TILE);
    for (const yy of [this.y + 10, this.y + this.h - 6]) { const t = map.get(cx, Math.floor(yy / TILE)); if (t === T.CLIMB || t === T.VINE) return true; }
    return false;
  }
  climbMove(dt, dir, input, game) {
    const map = game.map;
    this.vx = dir * 60; this.vy = input.up ? -88 : input.down ? 95 : 0;
    if (dir) this.face = dir;
    this.lookK = (this.lookK || 0) + (dir - (this.lookK || 0)) * Math.min(1, dt * 10);
    const r = moveBody(this, dt, map);
    if (input.up || input.down || dir) this.anim += dt * 8;
    this.ease(dt);
    if (input.jumpSolid ?? input.jump) {
      this.climbing = false; this.vy = -PHYS.jumpV * 0.85; this.vx = (dir || this.face) * 170; this.regrab = 0.3; this.jumping = true;
      game.audio.play('jump'); return;
    }
    if (r.landed && input.down) { this.climbing = false; this.onGround = true; return; }
    if (!this.onClimb(map)) {
      this.climbing = false; this.regrab = 0.25;
      // Bovenaan over de rand klauteren
      if (input.up) { this.vy = -360; this.vx = (dir || this.face) * 110; this.jumping = false; }
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
    const look = rigLook(this.look), hanging = !!(this.hang || this.bar || this.ledge), air = !this.onGround && !this.cheer && !hanging && !this.climbing;
    if (!air && !this.dead && !hanging) groundShadow(c, this.cx, this.bottom, 15 * this.look.size, 0.3);
    const speed = Math.abs(this.vx);
    const st = {
      time, seed: (this.phase || 0) + this.x * 0.003, dead: this.dead, hang: this.hang ? this.hang.omega : 0, rope: !!this.hang, cheer: this.cheer,
      bar: !!this.bar, ledge: this.ledge ? this.ledge.up : null, climb: this.climbing, activity: this.activity,
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
    if (this.shiver && !this.dead) c.translate(Math.round(Math.sin(time * 70) * 1.2), 0);
    if (this.buffs?.drunk > 0 && !this.dead) { c.translate(0, -20); c.rotate(Math.sin(time * 2.6) * 0.16); c.translate(0, 20); }
    c.scale(this.face * this.sx * S, this.sy * S);
    const tool = this.tool || (this.throwAnim > 0.08 ? 'stone' : null);
    if (this.climbing) { c.scale(this.face, 1); // rug naar de camera: niet spiegelen
      drawRigBack(c, look, this.anim * 1.3, this.lookK || 0, time); c.restore(); return; }
    drawRig(c, look, gamePose(st), {
      tool, time, blink: this.blinkT < 0, eyes: this.dead ? 'closed' : null,
      mouth: this.cheer || this.invuln > 1 ? 'open' : null, chew: !!this.look.crest,
    });
    c.restore();
  }
}

function line(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
