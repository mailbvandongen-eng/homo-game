import { TILE } from './config.js';

// Tegelsoorten
export const T = {
  EMPTY: 0,
  GROUND: 1,   // aarde met gras
  ROCK: 2,     // rotsblok
  BRANCH: 3,   // tak: alleen van bovenaf stevig
  CRUMBLE: 4,  // brokkelrots: stort in als je erop staat
  BUMP: 5,     // vuursteenknol: stoot er van onderen tegen
  SPRING: 6,   // termietenheuvel: lanceert je omhoog
  THORNS: 7,   // doornstruik: doet pijn, niet stevig
  BOUNCY: 8,   // verende tak: van bovenaf stevig en lanceert je
};

const SOLID = new Set([T.GROUND, T.ROCK, T.CRUMBLE, T.BUMP, T.SPRING]);

// Bouwt een level uit een definitie. Coördinaten in de definitie zijn
// (kolom, hoogte vanaf de onderkant) zodat "y = 3" drie tegels boven de bodem is.
export function buildLevel(def) {
  const w = def.width, h = def.height;
  const tiles = new Uint8Array(w * h);
  const entities = [];
  const bumps = new Map();
  const row = y => h - 1 - y;
  const set = (x, y, code) => { if (x >= 0 && x < w && y >= 0 && y < h) tiles[row(y) * w + x] = code; };
  const fill = (x1, x2, y1, y2, code) => { for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) set(x, y, code); };
  const at = (x, y) => ({ x: x * TILE + TILE / 2, y: (h - y) * TILE });  // midden-onder van de tegel

  const b = {
    ground: (x1, x2, top = 3) => fill(x1, x2, 0, top - 1, T.GROUND),
    rock: (x, y, cw = 1, ch = 1) => fill(x, x + cw - 1, y, y + ch - 1, T.ROCK),
    stairs: (x, y, steps, dir = 1) => { for (let i = 0; i < steps; i++) fill(x + i * dir, x + i * dir, y, y + i, T.ROCK); },
    branch: (x, y, cw) => fill(x, x + cw - 1, y, y, T.BRANCH),
    crumble: (x, y, cw = 1) => fill(x, x + cw - 1, y, y, T.CRUMBLE),
    bump: (x, y, item = 'bone') => { set(x, y, T.BUMP); bumps.set(row(y) * w + x, item); },
    spring: (x, y) => set(x, y, T.SPRING),
    thorns: (x, y, cw = 1) => fill(x, x + cw - 1, y, y, T.THORNS),
    bouncy: (x, y, cw = 2) => fill(x, x + cw - 1, y, y, T.BOUNCY),
    ent: (type, x, y, opts = {}) => entities.push({ type, ...at(x, y), ...opts }),
    bones: (x, y, n = 1, opts = {}) => {
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0;
        const lift = opts.arc ? Math.sin(t * Math.PI) * opts.arc : 0;
        const p = at(x + i * (opts.dx ?? 1), y);
        entities.push({ type: 'bone', x: p.x, y: p.y - TILE * 0.25 - lift * TILE });
      }
    },
  };
  def.build(b);

  const start = entities.find(e => e.type === 'start') || at(2, 3);
  return { ...def, w, h, tiles, entities, bumps, start, pxW: w * TILE, pxH: h * TILE };
}

export class TileMap {
  constructor(level) {
    this.level = level;
    this.w = level.w; this.h = level.h;
    this.tiles = level.tiles.slice();
    this.bumpItems = new Map(level.bumps);
    this.crumble = new Map();   // index -> {t, gone, respawn}
    this.bounce = new Map();    // index -> animatietijd (stoten / veren)
    this.version = 0;           // verhoogd als de statische tegellaag verandert
  }
  idx(cx, cy) { return cy * this.w + cx; }
  get(cx, cy) {
    if (cx < 0 || cx >= this.w) return T.ROCK;          // onzichtbare wanden links en rechts
    if (cy < 0 || cy >= this.h) return T.EMPTY;          // boven en onder: open (kuilen!)
    return this.tiles[cy * this.w + cx];
  }
  solidAt(cx, cy) {
    const t = this.get(cx, cy);
    if (t === T.CRUMBLE) { const s = this.crumble.get(this.idx(cx, cy)); return !(s && s.gone); }
    return SOLID.has(t);
  }
  oneWayAt(cx, cy) { const t = this.get(cx, cy); return t === T.BRANCH || t === T.BOUNCY; }

  update(dt, game) {
    for (const [i, s] of this.crumble) {
      if (!s.gone) {
        s.t += dt;
        if (s.t > 0.5) {
          s.gone = true; s.respawn = 4;
          game.fx.debris((i % this.w) * TILE + TILE / 2, Math.floor(i / this.w) * TILE + TILE / 2);
          game.audio.play('crumble');
        }
      } else {
        s.respawn -= dt;
        const cx = i % this.w, cy = Math.floor(i / this.w);
        if (s.respawn <= 0 && !game.player.overlapsTile(cx, cy)) this.crumble.delete(i);
      }
    }
    for (const [i, t] of this.bounce) { const n = t - dt; if (n <= 0) this.bounce.delete(i); else this.bounce.set(i, n); }
  }

  touchCrumble(cx, cy) {
    const i = this.idx(cx, cy);
    if (this.get(cx, cy) === T.CRUMBLE && !this.crumble.has(i)) this.crumble.set(i, { t: 0, gone: false, respawn: 0 });
  }
}

// Verplaatst een rechthoek (x, y = linksboven) door de tegelwereld, eerst horizontaal dan verticaal.
export function moveBody(body, dt, map, opts = {}) {
  const res = { wall: 0, ceil: false, landed: false, groundX: -1, groundY: -1, headX: -1, headY: -1 };
  const prevBottom = body.y + body.h;

  body.x += body.vx * dt;
  if (body.vx !== 0) {
    const dir = Math.sign(body.vx);
    const edge = dir > 0 ? body.x + body.w : body.x;
    const cx = Math.floor((dir > 0 ? edge - 0.001 : edge) / TILE);
    const y1 = Math.floor((body.y + 0.5) / TILE), y2 = Math.floor((body.y + body.h - 0.5) / TILE);
    for (let cy = y1; cy <= y2; cy++) {
      if (map.solidAt(cx, cy)) {
        body.x = dir > 0 ? cx * TILE - body.w : (cx + 1) * TILE;
        body.vx = 0; res.wall = dir; break;
      }
    }
  }

  body.y += body.vy * dt;
  const x1 = Math.floor((body.x + 0.5) / TILE), x2 = Math.floor((body.x + body.w - 0.5) / TILE);
  if (body.vy > 0) {
    const bottom = body.y + body.h, cy = Math.floor(bottom / TILE);
    let best = -1;
    for (let cx = x1; cx <= x2; cx++) {
      const solid = map.solidAt(cx, cy);
      const oneway = !opts.ignoreOneWay && map.oneWayAt(cx, cy) && prevBottom <= cy * TILE + 0.5;
      if (solid || oneway) {
        // Kies de tegel die het dichtst bij het midden ligt (voor veren/brokkels).
        const mid = body.x + body.w / 2;
        if (best < 0 || Math.abs((cx + 0.5) * TILE - mid) < Math.abs((best + 0.5) * TILE - mid)) best = cx;
      }
    }
    if (best >= 0) {
      body.y = cy * TILE - body.h; body.vy = 0;
      res.landed = true; res.groundX = best; res.groundY = cy;
    }
  } else if (body.vy < 0) {
    const cy = Math.floor(body.y / TILE);
    for (let cx = x1; cx <= x2; cx++) {
      if (map.solidAt(cx, cy)) {
        body.y = (cy + 1) * TILE; body.vy = 0;
        res.ceil = true;
        const mid = body.x + body.w / 2;
        if (res.headX < 0 || Math.abs((cx + 0.5) * TILE - mid) < Math.abs((res.headX + 0.5) * TILE - mid)) { res.headX = cx; res.headY = cy; }
      }
    }
  }
  return res;
}

// Staat er iets stevigs direct onder dit punt?
export function groundBelow(map, x, y) {
  const cx = Math.floor(x / TILE), cy = Math.floor((y + 1) / TILE);
  return map.solidAt(cx, cy) || map.oneWayAt(cx, cy);
}
