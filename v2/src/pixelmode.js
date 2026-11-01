// Pixelversie (v3): dezelfde game, andere tekenlaag.
// - Lage interne resolutie (~300 px hoog), vergroot met hele, scherpe pixels
// - Tegels, lucht, heuvels en HUD handgemaakt in pixels (vast palet, 1px omlijning, dithering)
// - Figuren en dieren: hun bestaande tekening wordt per beeld omgezet naar pixels
//   (harde randen, minder kleuren, 1px omlijning). Zo hebben alle soorten en dieren meteen hun animaties.
import { TILE } from './config.js';
import { T, TileMap } from './level.js';
import { drawPickup, drawStoneCache, drawCampfire, drawFoodCache, drawLiana, drawCave, drawShelter, flintIcon, artifactIcon } from './render.js';
import { drawFlyingSpear, drawFootprints, toolIcon } from './game.js';
import { drawAnimal } from './pixelanimals.js';

export const PS = 0.75;           // pixels per wereldeenheid
const PT = TILE * PS;             // 24 pixels per tegel
const INK = '#1a0f08';

// ---------- Paletten per landschap ----------
const SAV_DIRT = ['#b07a44', '#94643a', '#784e2e', '#5e3c24', '#d8b07a'];
const PAL = {
  savanna: { sky: ['#5ea8d0', '#78bcd8', '#98cede', '#bcdcd8', '#e6dcb0'], far: ['#94b4b0', '#aec6be'], mid: ['#8aa860', '#a2bc6c', '#6e8c4c'], near: ['#76984a', '#5e7e3c'], grass: ['#b4dc68', '#8cbc44', '#64962e', '#4a7424'], dirt: SAV_DIRT, tree: ['acacia', 'savanna'] },
  gorge: { sky: ['#4f9fd0', '#78b8d8', '#a9d4d8', '#d6dcc0', '#f7d49a'], far: ['#c68a5a', '#e0b282'], mesa: true, mid: ['#b5774a', '#c88a58', '#8a5a34'], near: ['#9aa65a', '#7e8a46'], grass: ['#b4dc68', '#8cbc44', '#64962e', '#4a7424'], dirt: ['#b8784a', '#9a6240', '#7c4c30', '#5e3824', '#e0b080'], tree: ['acacia', 'savanna'] },
  forest: { sky: ['#6fb7cf', '#88c4d4', '#b8dcc8', '#d8e4c0', '#e9e2a8'], far: ['#86a88e', '#9cbc9f'], mid: ['#4f7a45', '#62904f', '#3f6a3a'], near: ['#4a7a3a', '#3a6430'], grass: ['#9ccc5a', '#74a83e', '#548a2e', '#3c6c22'], dirt: ['#8a6040', '#745034', '#5e3e28', '#48301e', '#b08a5a'], tree: ['broad', 'forest'], jungle: true },
  grassland: { sky: ['#6aaad6', '#84bcd8', '#bfdcd2', '#e0e0c0', '#f6dc9c'], far: ['#a9b5a2', '#c2cab6'], mid: ['#c4b46a', '#d4c47a', '#a89a52'], near: ['#b8a85c', '#9a8c48'], grass: ['#d4dc78', '#b0c050', '#8a9c3c', '#6a7c2e'], dirt: SAV_DIRT, tree: ['acacia', 'savanna'] },
  dmanisi: { sky: ['#7aaed0', '#94c0d8', '#c4d8dc', '#dcdcd0', '#e8e2c8'], far: ['#8c9aa8', '#f2f4f6'], snow: true, mid: ['#7f9460', '#94a870', '#66804c'], near: ['#89a05e', '#6e8a4c'], grass: ['#b0d070', '#88b04c', '#64903a', '#4a722c'], dirt: SAV_DIRT, tree: ['broad', 'dmanisi'] },
  java: { sky: ['#5f9fc0', '#7cb4cc', '#b6d6c6', '#d8d8b4', '#f0d8a8'], far: ['#7a8e86', '#93a69c'], volcano: true, mid: ['#4f7f48', '#5e9454', '#3e6a3c'], near: ['#5a8c46', '#447438'], grass: ['#98d060', '#70b044', '#4e9032', '#367024'], dirt: ['#7a5844', '#644636', '#50382a', '#3c2a20', '#a08060'], tree: ['jungle', 'java'], jungle: true },
  dusk: { sky: ['#3a4a7a', '#6a5a8a', '#a86a7a', '#c97a6a', '#f2b064'], far: ['#6a5a6a', '#8a7080'], mid: ['#7a6a48', '#8a7a58', '#5e5238'], near: ['#6e6040', '#544a30'], grass: ['#a8a058', '#888040', '#686030', '#4c4824'], dirt: ['#8a6040', '#704e34', '#5a3e2a', '#44301e', '#a88058'], tree: ['acacia', 'savanna'] },
  coast: { sky: ['#7aa6c4', '#94b8cc', '#c2d6dc', '#dcdcd0', '#ece6cc'], far: ['#e4e0d2', '#ffffff'], mesa: true, mid: ['#93a874', '#a6b884', '#6f8a58'], near: ['#88a260', '#6c884c'], grass: ['#b0d470', '#88b44c', '#64923a', '#4a742c'], dirt: SAV_DIRT, tree: ['broad', 'temperate'] },
  hills: { sky: ['#6aa6d0', '#88bcd8', '#bcd8dc', '#dcd8c0', '#f2dcaa'], far: ['#b89c78', '#d2bc96'], mid: ['#a6a066', '#b8b278', '#7e8a4c'], near: ['#9a9a58', '#7c7c44'], grass: ['#c8cc70', '#a4ac50', '#808a3c', '#646c2e'], dirt: ['#b88a50', '#9c7240', '#7e5a32', '#604426', '#dcb880'], tree: ['broad', 'hills'] },
  lake: { sky: ['#6c9cc0', '#88b0cc', '#bcd2d4', '#d8d6c4', '#e6dcb8'], far: ['#7e9488', '#9cb0a2'], mid: ['#6e8e58', '#80a068', '#58784a'], near: ['#6c8c50', '#56763e'], grass: ['#a8d070', '#80b04c', '#5e903a', '#46702c'], dirt: SAV_DIRT, tree: ['broad', 'temperate'] },
  cave: { cave: true, sky: ['#1a1412', '#221a17', '#2a211d', '#30261f', '#382c24'], floor: ['#a8977f', '#8c7b66', '#6a5a4a', '#4c4036', '#382f29'] },
};
const ROCK = ['#d6cab0', '#b0a288', '#8a7c66', '#64584a'];

// ---------- Hulp: pixelsprites uit een masker ----------
const dither = (x, y) => (x + y) % 2 === 0;
function bake(w, h, fn, outline = INK) {
  const cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2;
  const c = cv.getContext('2d'), grid = [];
  for (let y = 0; y < h; y++) { grid[y] = []; for (let x = 0; x < w; x++) grid[y][x] = fn(x, y); }
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? grid[y][x] : null;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const v = at(x, y);
    if (v) { c.fillStyle = v; c.fillRect(x + 1, y + 1, 1, 1); }
    else if (outline && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) { c.fillStyle = outline; c.fillRect(x + 1, y + 1, 1, 1); }
  }
  return cv;
}
function hash(a, b = 0) { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

// ---------- Vector-naar-pixel ----------
// Tekent fn (in wereldcoördinaten) in een klein kladvlak, maakt de randen hard, beperkt de kleuren
// en zet er een omlijning van 1 pixel omheen.
function pixelize(img) {
  const d = img.data, w = img.width, h = img.height, n = w * h;
  const solid = new Uint8Array(n), dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3];
    if (a >= 140) {
      solid[i] = 1; d[i * 4 + 3] = 255;
      for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.min(255, Math.round(d[i * 4 + k] / 14) * 14);
      dark[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) < 150 ? 1 : 0;
    } else d[i * 4 + 3] = 0;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (solid[i]) continue;
    const nb = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && solid[yy * w + xx] && !dark[yy * w + xx];
    if (nb(x - 1, y) || nb(x + 1, y) || nb(x, y - 1) || nb(x, y + 1)) { d[i * 4] = 26; d[i * 4 + 1] = 15; d[i * 4 + 2] = 8; d[i * 4 + 3] = 255; }
  }
  return img;
}

class PixelView {
  constructor(game) {
    this.g = game;
    this.scratch = document.createElement('canvas'); this.sc = this.scratch.getContext('2d', { willReadFrequently: true });
    this.outCv = document.createElement('canvas'); this.oc = this.outCv.getContext('2d');
    this.cache = new Map(); this.chunks = new Map(); this.tiles = new Map(); this.objCache = new WeakMap(); this.nullCtx = null;
    this.ui = document.getElementById('ui');
    this.uc = this.ui ? this.ui.getContext('2d') : null;
    this.build();
  }

  resize() {
    const g = this.g, dpr = devicePixelRatio || 1, Hdev = innerHeight * dpr;
    this.n = Math.max(1, Math.ceil(Hdev / 330));
    this.H = Math.floor(Hdev / this.n); this.W = Math.floor(innerWidth * dpr / this.n);
    g.cv.width = this.W; g.cv.height = this.H;
    g.viewW = this.W / PS; g.viewH = this.H / PS;
    if (this.ui) { this.ui.width = Math.round(innerWidth * dpr); this.ui.height = Math.round(innerHeight * dpr); }
    this.chunks.clear();
  }

  // ---------- Vaste pixelsprites ----------
  build() {
    this.heart = [true, false].map(full => bake(9, 8, (x, y) => {
      const m = inEll(x, y, 2.2, 2.4, 2.3, 2.3) || inEll(x, y, 6.2, 2.4, 2.3, 2.3) || (y >= 2 && y - 2 <= 4 - Math.abs(x - 4) * 1.1 && y < 8 && Math.abs(x - 4) <= (8 - y));
      if (!m) return null;
      if (!full) return '#5a4a48';
      return (x === 2 && y === 1) || (x === 1 && y === 2) ? '#ffd0d4' : y > 4 ? '#c03040' : '#ff5a68';
    }));
    this.head = bake(9, 9, (x, y) => {
      if (!inEll(x, y, 4, 4.5, 4, 4)) return null;
      if (y < 3 || (x < 2 && y < 6)) return '#4a2c18';
      if (x === 6 && y === 4) return '#120a04';
      return x > 5 ? '#e0b088' : '#c48c5e';
    });
    this.font = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111', x: '000101010101000' };
  }

  // Cache: een vector-tekening één keer omzetten naar pixels
  cached(key, x, y, w, h, fn) {
    let e = this.cache.get(key);
    if (!e) {
      const pw = Math.ceil(w * PS) + 4, ph = Math.ceil(h * PS) + 4;
      const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.setTransform(PS, 0, 0, PS, 2 - x * PS, 2 - y * PS); fn(c);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.putImageData(pixelize(c.getImageData(0, 0, pw, ph)), 0, 0);
      e = { cv, ox: x * PS - 2, oy: y * PS - 2 };
      this.cache.set(key, e);
    }
    return e;
  }

  // Boom: het kader wordt uit de boom zelf berekend, zodat de kruin nooit wordt afgesneden
  cachedTree(key, Tr, x, y, s) {
    let x1 = Tr.tx, y1 = Tr.ty, x2 = Tr.tx + Tr.tw, y2 = Tr.ty + Tr.th;
    for (const m of Tr.masses) { x1 = Math.min(x1, m.x - 8); y1 = Math.min(y1, m.y - 8); x2 = Math.max(x2, m.x + m.w + 8); y2 = Math.max(y2, m.y + m.h + 8); }
    return this.cached(key, x + x1 * s, y + y1 * s, (x2 - x1) * s, (y2 - y1) * s, cc => {
      cc.save(); cc.translate(x, y); cc.scale(s, s);
      cc.drawImage(Tr.trunk, Tr.tx, Tr.ty, Tr.tw, Tr.th);
      for (const m of Tr.masses) cc.drawImage(m.cv, m.x, m.y, m.w, m.h);
      cc.restore();
    });
  }

  // Bewegende figuur, maar hooguit ~12x per seconde opnieuw omgezet (zoals echte pixel-animatie).
  // Tussendoor wordt het laatste beeld op de nieuwe plek gezet. Dat spaart veel rekenwerk (en houdt de muziek strak).
  liveObj(c, obj, x, y, w, h, fn, fps = 12) {
    let m = this.objCache.get(obj);
    const now = this.g.time;
    const rx = x - (obj.x ?? 0), ry = y - (obj.y ?? obj.top ?? 0);
    if (!m || now - m.t >= 1 / fps || now < m.t || m.face !== obj.face || m.dir !== obj.dir) {
      if (!m) { m = { cv: document.createElement('canvas') }; this.objCache.set(obj, m); }
      const ox = Math.floor(x * PS) - 2, oy = Math.floor(y * PS) - 2;
      this.live(this.nullCtx, x, y, w, h, fn);
      const pw = this.lastW, ph = this.lastH;
      if (m.cv.width < pw || m.cv.height < ph) { m.cv.width = Math.max(pw, m.cv.width); m.cv.height = Math.max(ph, m.cv.height); }
      const mc = m.cv.getContext('2d'); mc.clearRect(0, 0, m.cv.width, m.cv.height); mc.drawImage(this.outCv, 0, 0, pw, ph, 0, 0, pw, ph);
      Object.assign(m, { t: now, pw, ph, ox: ox - Math.round(((obj.x ?? 0) - 0) * PS), oy: oy - Math.round((obj.y ?? obj.top ?? 0) * PS), face: obj.face, dir: obj.dir });
    }
    c.drawImage(m.cv, 0, 0, m.pw, m.ph, Math.round((obj.x ?? 0) * PS) + m.ox, Math.round((obj.y ?? obj.top ?? 0) * PS) + m.oy, m.pw, m.ph);
  }

  // Elk beeld opnieuw: een bewegende figuur omzetten naar pixels en tekenen
  live(c, x, y, w, h, fn) {
    const ox = Math.floor(x * PS) - 2, oy = Math.floor(y * PS) - 2;
    const pw = Math.ceil(w * PS) + 5, ph = Math.ceil(h * PS) + 5;
    if (pw <= 0 || ph <= 0 || pw > 900 || ph > 700) return;
    if (this.scratch.width < pw || this.scratch.height < ph) { this.scratch.width = Math.max(pw, this.scratch.width); this.scratch.height = Math.max(ph, this.scratch.height); this.sc = this.scratch.getContext('2d', { willReadFrequently: true }); }
    if (this.outCv.width < pw || this.outCv.height < ph) { this.outCv.width = Math.max(pw, this.outCv.width); this.outCv.height = Math.max(ph, this.outCv.height); }
    const sc = this.sc;
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, pw, ph);
    sc.setTransform(PS, 0, 0, PS, -ox, -oy);
    fn(sc);
    sc.setTransform(1, 0, 0, 1, 0, 0);
    this.oc.clearRect(0, 0, pw, ph);
    this.oc.putImageData(pixelize(sc.getImageData(0, 0, pw, ph)), 0, 0);
    this.lastW = pw; this.lastH = ph;
    if (c) c.drawImage(this.outCv, 0, 0, pw, ph, ox, oy, pw, ph);
  }

  // ---------- Tegels (24x24) ----------
  tileSprite(key, fn) { let t = this.tiles.get(key); if (!t) { t = bake(PT, PT, fn, null); this.tiles.set(key, t); } return t; }

  groundTile(theme, top, depth, seed, left, right) {
    const p = PAL[theme] || PAL.savanna;
    if (p.cave) return this.tileSprite(`cave|${top}|${depth}|${seed % 3}|${left}|${right}`, (x, y) => {
      const f = p.floor;
      if (top && y < 3) return y === 0 ? f[0] : f[1];
      if ((x * 7 + y * 5 + seed) % 19 === 0) return f[0];
      if ((x * 3 + y * 11 + seed) % 23 === 0) return f[4];
      const base = Math.min(4, 2 + depth + (y > 14 ? 1 : 0));
      return (left && x === 0) || (right && x === PT - 1) ? f[4] : dither(x, y) && y > 12 ? f[base] : f[Math.max(2, base - (y < 12 ? 1 : 0))];
    });
    return this.tileSprite(`g|${theme}|${top}|${Math.min(depth, 3)}|${seed % 4}|${left}|${right}`, (x, y) => {
      const gr = p.grass, dt = p.dirt;
      if (top) {
        const edge = 8 + ((x * 7 + seed) % 4 === 0 ? 2 : 0) + ((x * 3 + seed) % 5 === 0 ? 1 : 0) - ((x * 5 + seed) % 7 === 0 ? 1 : 0);
        if (y === 0) return gr[0];
        if (y < 4) return dither(x, y) ? gr[0] : gr[1];
        if (y < edge) return y === edge - 1 ? gr[3] : dither(x, y) ? gr[1] : gr[2];
        if ((left && x === 0) || (right && x === PT - 1)) return dt[3];
      } else if ((left && x === 0) || (right && x === PT - 1)) return dt[3];
      if ((x * 11 + y * 5 + seed) % 29 === 0) return dt[4];
      if ((x * 3 + y * 7 + seed) % 21 === 0) return dt[3];
      const d = Math.min(3, depth + (top ? 0 : 1));
      const a = dt[Math.min(2, d - (top ? 0 : 1))] || dt[0], b = dt[Math.min(3, d)];
      return (y + depth * 6 > 14 && dither(x, y)) ? b : a;
    });
  }
  rockTile(up, down, left, right, seed) {
    return this.tileSprite(`r|${up}|${down}|${left}|${right}|${seed % 3}`, (x, y) => {
      if ((!up && y === 0) || (!down && y === PT - 1) || (!left && x === 0) || (!right && x === PT - 1)) return INK;
      if ((!up && y < 3) || (!left && x < 3 && !(y > PT - 4 && !down))) return ROCK[0];
      if ((!down && y > PT - 4) || (!right && x > PT - 4)) return ROCK[2];
      const crack = (seed === 0 && Math.abs(x - 8 - (y >> 2)) < 1 && y > 5 && y < 17) || (seed === 1 && Math.abs(y - 12 - ((x - 10) >> 1)) < 1 && x > 8 && x < 18);
      if (crack) return ROCK[3];
      return (x * 5 + y * 3 + seed) % 13 === 0 ? ROCK[2] : ROCK[1];
    });
  }
  branchTile(left, right, bouncy) {
    return this.tileSprite(`b|${left}|${right}|${bouncy}`, (x, y) => {
      const wood = bouncy ? ['#c89a5a', '#9a6a3c', '#6e4a28'] : ['#a07040', '#7a5434', '#54381e'];
      if (y >= 3 && y <= 10) {
        if ((!left && x === 0) || (!right && x === PT - 1) || y === 3 || y === 10) return INK;
        return y < 6 ? wood[0] : y < 9 ? wood[1] : wood[2];
      }
      if (y < 3 && ((x >= 3 && x <= 9) || (x >= 14 && x <= 19)) && y >= 1 - (x % 3 === 0 ? 1 : 0)) return y === 0 ? '#a6d45c' : '#6a9a3a';
      return null;
    });
  }
  thornTile(cave) {
    return this.tileSprite(`t|${cave}`, (x, y) => {
      if (cave) { for (const [cx, h, w] of [[6, 14, 4], [14, 20, 5], [20, 11, 3]]) if (y >= PT - h && Math.abs(x - cx) <= w * (y - (PT - h)) / h) return x < cx ? '#a8977f' : '#6a5a4a'; return null; }
      if (inEll(x, y, 12, 20, 11, 9) && y < PT) return (x * 3 + y) % 5 === 0 ? '#c23b3b' : y < 16 ? '#6a7a34' : '#4a5a24';
      if (y >= 8 && y < 14 && (x + y) % 4 === 0 && Math.abs(x - 12) < 10) return '#3a2a1a';
      return null;
    });
  }
  mudTile(seed) { return this.tileSprite(`m|${seed % 3}`, (x, y) => y === 0 ? '#a8b8c0' : y < 4 ? '#6e5640' : (x * 7 + y * 3 + seed) % 17 === 0 ? '#2e2218' : y < 10 ? '#5a4430' : '#3e2e20'); }
  clayTile(up, left, right, seed) {
    return this.tileSprite(`c|${up}|${left}|${right}|${seed % 2}`, (x, y) => {
      if (!up && y < 3) return y === 0 ? '#b4d868' : '#86b044';
      if ((!left && x === 0) || (!right && x === PT - 1)) return '#5a3a20';
      if ((x + seed * 5) % 11 === 0 && (y % 9) < 5) return '#5a3a20';
      return [ '#b07448', '#a0683e', '#8a5634'][Math.floor((y + 2) / 8) % 3];
    });
  }

  barTile(l, r, seed) {
    return this.tileSprite(`bar|${l}|${r}|${seed % 2}`, (x, y) => {
      if (y >= 2 && y <= 6 && (l || x >= 2) && (r || x <= PT - 3)) { if (y === 2 || y === 6 || (!l && x === 2) || (!r && x === PT - 3)) return INK; return y === 3 ? '#a87c4c' : y === 4 ? '#7a5434' : '#5a3c24'; }
      if (seed % 2 && x >= 14 && x <= 15 && y > 6 && y < 6 + 10 - Math.abs(x - 14) * 2) return '#4e7a30';
      if (!l && x >= 0 && x <= 4 && y >= 0 && y <= 3) return '#6a9a3a';
      return null;
    });
  }
  climbTile(up, seed, vine) {
    return this.tileSprite(`clb|${up}|${seed % 3}|${vine}`, (x, y) => {
      if (vine) {
        const a = Math.abs(x - (6 + Math.round(Math.sin(y * 0.3) * 2))) <= 1, b = Math.abs(x - (18 + Math.round(Math.cos(y * 0.3) * 2))) <= 1, d = Math.abs(y - (x * 0.8 + 3)) < 1 && x > 4 && x < 20;
        if (a || b || d) return '#3e5e26';
        if ((x * 7 + y * 5 + seed) % 23 === 0 || ((x + 2) % 9 === 0 && (y + 3) % 8 === 0)) return '#7ab042';
        return null;
      }
      if (!up && y < 2) return y === 0 ? '#a6c868' : '#7a9a44';
      for (const [hx, hy] of [[5, 5], [17, 10], [8, 17], [19, 21]]) {
        if (Math.abs(x - hx) <= 3 && y === hy) return '#c4b494';
        if (Math.abs(x - hx) <= 3 && y === hy + 1) return '#4e4436';
      }
      return (x * 3 + y * 7 + seed) % 13 === 0 ? '#66594a' : y % 8 === 0 ? '#6e624f' : '#82745e';
    });
  }

  buildChunk(map, index, theme) {
    const CH = 16, cv = document.createElement('canvas'); cv.width = CH * PT; cv.height = map.h * PT;
    const c = cv.getContext('2d');
    const solidish = (cx, cy) => { const t = map.get(cx, cy); return t === T.GROUND || t === T.ROCK || t === T.MUD || t === T.CLAY; };
    for (let cy = 0; cy < map.h; cy++) for (let i = 0; i < CH; i++) {
      const cx = index * CH + i; if (cx >= map.w) continue;
      const t = map.get(cx, cy), x = i * PT, y = cy * PT, s = Math.floor(hash(cx, cy) * 12);
      const th = map.level.outside && cx >= map.level.outside.from ? (map.level.outsideTheme || 'savanna') : theme;
      if (t === T.GROUND) {
        const up = map.get(cx, cy - 1), top = !(up === T.GROUND || up === T.ROCK || up === T.MUD || up === T.CLAY || up === T.CRUMBLE || up === T.BUMP);
        let depth = 0; while (depth < 3 && map.get(cx, cy - depth - 1) === T.GROUND) depth++;
        c.drawImage(this.groundTile(th, top, depth, s, !solidish(cx - 1, cy), !solidish(cx + 1, cy)), x - 1, y - 1);
      } else if (t === T.ROCK) c.drawImage(this.rockTile(map.get(cx, cy - 1) === T.ROCK, map.get(cx, cy + 1) === T.ROCK, map.get(cx - 1, cy) === T.ROCK, map.get(cx + 1, cy) === T.ROCK, s % 3), x - 1, y - 1);
      else if (t === T.BRANCH) c.drawImage(this.branchTile(map.get(cx - 1, cy) === T.BRANCH, map.get(cx + 1, cy) === T.BRANCH, false), x - 1, y - 1);
      else if (t === T.THORNS) c.drawImage(this.thornTile(theme === 'cave'), x - 1, y - 1);
      else if (t === T.MUD) c.drawImage(this.mudTile(s), x - 1, y - 1);
      else if (t === T.BAR) c.drawImage(this.barTile(map.get(cx - 1, cy) === T.BAR, map.get(cx + 1, cy) === T.BAR, s), x - 1, y - 1);
      else if (t === T.CLIMB) c.drawImage(this.climbTile(map.get(cx, cy - 1) === T.CLIMB, s, false), x - 1, y - 1);
      else if (t === T.VINE) c.drawImage(this.climbTile(true, s, true), x - 1, y - 1);
      else if (t === T.CLAY) c.drawImage(this.clayTile(map.get(cx, cy - 1) === T.CLAY, map.get(cx - 1, cy) === T.CLAY, map.get(cx + 1, cy) === T.CLAY, s), x - 1, y - 1);
    }
    // Grassprietjes boven de bovenste tegels (steken boven de tegel uit)
    for (let cy = 1; cy < map.h; cy++) for (let i = 0; i < CH; i++) {
      const cx = index * CH + i; if (cx >= map.w || map.get(cx, cy) !== T.GROUND || map.get(cx, cy - 1) !== T.EMPTY) continue;
      const th = map.level.outside && cx >= map.level.outside.from ? (map.level.outsideTheme || 'savanna') : theme, p = PAL[th] || PAL.savanna;
      if (p.cave) continue;
      for (let k = 0; k < 6; k++) {
        const bx = i * PT + 2 + Math.floor(hash(cx, k) * 20), h = 2 + Math.floor(hash(cx * 3, k) * 4), y = cy * PT;
        c.fillStyle = p.grass[2]; c.fillRect(bx, y - h, 1, h); c.fillStyle = p.grass[0]; c.fillRect(bx, y - h, 1, 1);
        if (hash(cx, k + 9) > 0.92) { c.fillStyle = hash(cx, k) > 0.5 ? '#f3d55b' : '#f4f0e0'; c.fillRect(bx - 1, y - h - 2, 3, 1); c.fillRect(bx, y - h - 3, 1, 3); c.fillStyle = '#c87a28'; c.fillRect(bx, y - h - 2, 1, 1); }
      }
    }
    return cv;
  }

  // ---------- Rotswand met grot (finish) ----------
  // Gelaagde rots met een grillige top, begroeiing, scheuren en een donkere, onregelmatige grotopening.
  cliff(theme) {
    const key = 'cliff|' + theme;
    if (this.tiles.has(key)) return this.tiles.get(key);
    const W = 300, H = 210, mx = 150, mw = 46, mh = 78;
    const rock = ['#cbb894', '#b8a37e', '#a68f6a', '#937c5a', '#7c674a', '#5e4e38'];
    const topY = x => { const n = Math.sin(x * 0.045) * 10 + Math.sin(x * 0.13 + 1) * 4 + Math.sin(x * 0.31) * 2; return 26 + n + (x < 50 ? (50 - x) * 1.6 : 0); };
    const leftX = y => 6 + Math.max(0, (60 - y) * 0.2) + Math.round(Math.sin(y * 0.09) * 5) + (y > H - 40 ? -(y - (H - 40)) * 0.15 : 0);
    const mouthEdge = (x, y) => { const dx = (x - mx) / (mw + Math.sin(y * 0.4) * 3), dy = (H - y) / (mh + Math.sin(x * 0.3) * 4); return dx * dx + dy * dy; };
    const cv = bake(W, H, (x, y) => {
      const t = topY(x);
      if (y < t - 6) return null;
      if (x < leftX(y)) return null;
      // Begroeiing bovenop
      if (y < t) { const tuft = (x * 7) % 5 < 2 ? 6 : 3; return y >= t - tuft ? ((x + y) % 3 === 0 ? '#9ccc5a' : '#6a9a3a') : null; }
      if (y < t + 3) return y < t + 1 ? '#86b044' : '#5a7a34';
      // Grotopening
      const m = mouthEdge(x, y);
      if (y > H - mh - 8 && m < 1) {
        if (m > 0.86) return '#3a2a1e';
        if (m > 0.62) return dither(x, y) ? '#22170f' : '#2e2016';
        return m > 0.35 ? '#160e09' : '#0e0805';
      }
      // Schaduw onder de overhang boven de grot
      if (y > H - mh - 16 && m < 1.5 && m >= 1) return (x + y) % 2 ? rock[4] : rock[5];
      // Gesteentelagen met dithered overgangen; licht van links
      const band = Math.floor((y + Math.sin(x * 0.05) * 4 + x * 0.06) / 13);
      let tone = 1 + (band % 3) + (y > H - 30 ? 1 : 0);
      if (x < leftX(y) + 5) tone = Math.max(0, tone - 1);
      if (x > W - 40) tone = Math.min(5, tone + 1);
      const frac = ((y + Math.sin(x * 0.05) * 4 + x * 0.06) % 13);
      if (frac < 1.5) return rock[Math.min(5, tone + 1)];
      if (frac < 3 && dither(x, y)) return rock[Math.min(5, tone + 1)];
      // Scheuren
      const cr = [[60, 0.5], [210, -0.3], [250, 0.2], [100, 0.1]];
      for (const [cx0, sl] of cr) { const cx1 = cx0 + (y - 40) * sl + Math.sin(y * 0.2) * 2; if (y > 40 && y < 150 && Math.abs(x - cx1) < 0.8) return rock[5]; }
      // Handafdrukken (rotskunst) in oker
      for (const [hx, hy] of [[78, 120], [222, 108]]) if (inEll(x, y, hx, hy, 3.5, 4.5) || (y >= hy - 10 && y <= hy - 5 && (x - hx + 4) % 2 === 0 && x >= hx - 4 && x <= hx + 3)) return '#a85a34';
      return (x * 7 + y * 13) % 41 === 0 ? rock[0] : rock[tone];
    });
    // Losse keien aan de voet
    const c = cv.getContext('2d');
    const boulder = bake(16, 10, (x, y) => inEll(x, y, 8, 6, 7.5, 5) ? (y < 4 ? rock[0] : y < 7 ? rock[2] : rock[4]) : null);
    c.drawImage(boulder, 18, H - 9); c.drawImage(boulder, 92, H - 9); c.drawImage(boulder, 210, H - 8);
    // Struik bovenop
    const bush = bake(26, 14, (x, y) => (inEll(x, y, 8, 9, 8, 5) || inEll(x, y, 17, 8, 8, 6)) ? (y < 5 ? '#9ccc5a' : y < 9 ? '#6a9a3a' : '#46702c') : null);
    c.drawImage(bush, 200, Math.round(topY(212)) - 16); c.drawImage(bush, 90, Math.round(topY(100)) - 14);
    this.tiles.set(key, cv);
    return cv;
  }

  // ---------- Achtergrond ----------
  background(c, theme, camX, camY, time) {
    const p = PAL[theme] || PAL.savanna, W = this.W, H = this.H, g = this.g;
    const bh = Math.ceil(H * 0.62 / p.sky.length);
    for (let i = 0; i < p.sky.length; i++) { c.fillStyle = p.sky[i]; c.fillRect(0, i * bh, W, bh + 1); }
    c.fillStyle = p.sky[p.sky.length - 1]; c.fillRect(0, p.sky.length * bh, W, H);
    for (let i = 1; i < p.sky.length; i++) { c.fillStyle = p.sky[i]; for (let x = i % 2; x < W; x += 2) c.fillRect(x, i * bh - 1, 1, 1); c.fillStyle = p.sky[i - 1]; for (let x = (i + 1) % 2; x < W; x += 2) c.fillRect(x, i * bh, 1, 1); }
    if (p.cave) return this.caveBg(c, camX, time);
    // Zon met stralenkrans
    const sx = Math.round(W * 0.78 - camX * 0.02), sy = Math.round(H * 0.16);
    c.fillStyle = '#ffe8a0'; for (let a = 0; a < 20; a++) { const ang = a / 20 * 6.28 + time * 0.05; c.fillRect(sx + Math.round(Math.cos(ang) * 19), sy + Math.round(Math.sin(ang) * 19), 2, 2); }
    c.fillStyle = '#fff6d0'; for (let y = -12; y <= 12; y++) { const w = Math.round(Math.sqrt(144 - y * y)); c.fillRect(sx - w, sy + y, w * 2, 1); }
    // Wolken
    if (!this.clouds) this.clouds = [36, 52, 28].map(w => bake(w, 14, (x, y) => (inEll(x, y, w * 0.3, 8, w * 0.25, 5) || inEll(x, y, w * 0.55, 6, w * 0.24, 6) || inEll(x, y, w * 0.78, 9, w * 0.2, 4.5)) ? (y > 10 ? '#b8d2dc' : y > 7 ? (dither(x, y) ? '#e2eef2' : '#b8d2dc') : y > 4 ? '#e2eef2' : '#ffffff') : null, null));
    for (let i = 0; i < 6; i++) { const span = W + 80, x = Math.round(((hash(i) * span * 3 - camX * 0.06 - time * (2 + i)) % span + span) % span) - 60; c.drawImage(this.clouds[i % 3], x, 10 + Math.round(hash(i, 2) * H * 0.22)); }
    // Lagen heuvels
    const ground = (g.level.pxH - 3 * TILE) * PS, ref = (g.level.pxH * PS - H), cy = camY * PS;
    const yOf = (f, h) => Math.round(ground - h - ref - (cy - ref) * f);
    if (p.volcano) this.volcano(c, Math.round(W * 0.6 - camX * 0.03), yOf(0.05, 70), time);
    this.ridge(c, camX * PS * 0.1, yOf(0.1, 70), 34, 0.012, p.far, p.mesa, 3);
    if (p.snow) this.snow(c, camX * PS * 0.1, yOf(0.1, 70), 34, 0.012, 3);
    this.ridge(c, camX * PS * 0.3, yOf(0.3, 40), 14, 0.02, [p.mid[0], p.mid[1]], p.mesa, 7);
    // Bomen in de verte (gepixelde versies van de echte bomen, met nevel)
    for (let i = Math.floor(camX * 0.3 / 230) - 1; i < (camX * 0.3 + g.viewW) / 230 + 1; i++) {
      if (hash(i, 9) < (p.jungle ? 0.05 : 0.35)) continue;
      const T2 = g.renderer.tree(p.tree[0], p.tree[1], 10 + (i & 3), 90, 0.42, p.sky[2]);
      const wx = i * 230 + hash(i, 4) * 120, s = 0.75 + hash(i, 5) * 0.3;
      const e = this.cachedTree(`bt|${p.tree[0]}|${p.tree[1]}|${i & 3}|${p.sky[2]}|${s.toFixed(2)}`, T2, 0, 0, s);
      c.drawImage(e.cv, Math.round((wx - camX * 0.3) * PS + e.ox), yOf(0.3, 30) + Math.round(e.oy));
    }
    this.ridge(c, camX * PS * 0.55, yOf(0.55, 16), 6, 0.04, p.near, false, 11);
    if (p.jungle) {
      c.fillStyle = p.near[1];
      for (let i = Math.floor(camX * PS * 0.6 / 60) - 1; i < (camX * PS * 0.6 + W) / 60 + 1; i++) { if (hash(i, 41) < 0.5) continue; const x = Math.round(i * 60 + hash(i, 42) * 30 - camX * PS * 0.6), len = 30 + Math.round(hash(i, 43) * 70); c.fillRect(x, 0, 2, len); for (let k = 8; k < len; k += 9) c.fillRect(x + (k % 2 ? 2 : -3), k, 3, 2); }
    } else {
      // Jagers met speren achter een hert (erectus en latere mensen)
      const look = g.def.look;
      if (look === 'erectus' || look === 'heidelbergensis') {
        const span2 = 2600, hx2 = Math.round(((400 - camX * PS * 0.3 + time * 22) % span2 + span2) % span2) - 300, hy2 = yOf(0.3, 32), f = Math.floor(time * 8) % 2;
        // hert
        c.fillStyle = '#7a5a3c'; const dx0 = hx2 + 70;
        c.fillRect(dx0, hy2 - 7, 9, 4); c.fillRect(dx0 + 8, hy2 - 10, 2, 4); c.fillRect(dx0 + 9, hy2 - 11, 3, 2);
        c.fillStyle = '#5a4028'; c.fillRect(dx0 + 9, hy2 - 14, 1, 3); c.fillRect(dx0 + 11, hy2 - 14, 1, 3); c.fillRect(dx0 + 8, hy2 - 15, 1, 1); c.fillRect(dx0 + 12, hy2 - 15, 1, 1);
        c.fillStyle = '#7a5a3c'; c.fillRect(dx0 + (f ? 0 : 1), hy2 - 3, 1, 3); c.fillRect(dx0 + (f ? 7 : 6), hy2 - 3, 1, 3);
        // jagers
        for (let k = 0; k < 4; k++) {
          const x = hx2 + k * 14 + (k % 2) * 3, y = hy2, ff = (f + k) % 2;
          c.fillStyle = '#5a4434'; c.fillRect(x + 1, y - 10, 2, 2); c.fillRect(x + 1, y - 8, 2, 4); c.fillRect(x + (ff ? 0 : 1), y - 4, 1, 4); c.fillRect(x + (ff ? 3 : 2), y - 4, 1, 4);
          c.fillStyle = '#8a6a44'; for (let q = 0; q < 6; q++) c.fillRect(x + 3 + q, y - 8 - Math.floor(q / 2), 1, 1);
        }
      }
      // Grote kudde in de verte
      const span = 2400, hx = Math.round(((900 - camX * PS * 0.3 + time * 6) % span + span) % span) - 300, hy = yOf(0.3, 34);
      c.fillStyle = '#8a6a48';
      for (let k = 0; k < 14; k++) { const x = hx + (k % 7) * 18 + (k > 6 ? 8 : 0), y = hy + (k > 6 ? 3 : 0), st = Math.floor(time * 6 + k) % 2; c.fillRect(x, y - 5, 9, 4); c.fillRect(x + 8, y - 8, 2, 4); c.fillRect(x + 9, y - 9, 3, 2); c.fillRect(x + 1 + st, y - 1, 1, 3); c.fillRect(x + 6 - st, y - 1, 1, 3); }
    }
  }
  ridge(c, off, base, amp, freq, cols, mesa, seed) {
    for (let x = 0; x < this.W; x++) {
      const wx = x + off;
      let h = (Math.sin(wx * freq + seed) * 0.6 + Math.sin(wx * freq * 2.7 + seed) * 0.25 + 0.85) * amp;
      if (mesa) h = Math.min(h, amp * 1.15);
      const y = Math.round(base - h);
      c.fillStyle = cols[0]; c.fillRect(x, y, 1, this.H - y);
      c.fillStyle = cols[1]; c.fillRect(x, y, 1, mesa ? 2 : 1);
      if (mesa) { c.fillStyle = '#0000001c'; for (let k = 6; k < 40; k += 7) c.fillRect(x, y + k, 1, 2); }
    }
  }
  snow(c, off, base, amp, freq, seed) {
    c.fillStyle = '#f4f6f8';
    for (let x = 0; x < this.W; x++) { const wx = x + off, h = (Math.sin(wx * freq + seed) * 0.6 + Math.sin(wx * freq * 2.7 + seed) * 0.25 + 0.85) * amp; if (h > amp * 1.35) c.fillRect(x, Math.round(base - h), 1, Math.round((h - amp * 1.35) * 1.6) + 2); }
  }
  volcano(c, x, y, time) {
    for (let r = 0; r < 70; r++) { const w = 18 + r * 1.6; c.fillStyle = r < 4 ? '#ff7a3a' : r % 9 === 0 ? '#4e5a56' : '#5e6a66'; c.fillRect(x - Math.round(w), y - 70 + r, Math.round(w * 2), 1); }
    // Rookpluimen als pixelwolkjes die opstijgen en uitdunnen (dither)
    for (let i = 0; i < 6; i++) {
      const t = (time * 0.12 + i / 6) % 1, r = Math.round(4 + t * 12), cx = Math.round(x + t * 34 + Math.sin(i * 2 + time) * 3), cy = Math.round(y - 74 - t * 80);
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
        if (xx * xx + yy * yy > r * r) continue;
        if (t > 0.45 && (xx + yy) % 2) continue;
        if (t > 0.75 && (xx % 2 || yy % 2)) continue;
        c.fillStyle = yy < -r / 3 ? '#9a9aa0' : '#76767e'; c.fillRect(cx + xx, cy + yy, 1, 1);
      }
    }
  }
  caveBg(c, camX, time) {
    for (const [f, col, step, wv] of [[0.2, '#2a221e', 110, 40], [0.45, '#352b25', 80, 26]]) {
      c.fillStyle = col;
      for (let i = Math.floor(camX * PS * f / step) - 1; i < (camX * PS * f + this.W) / step + 1; i++) {
        const x = Math.round(i * step + hash(i, f * 10) * 40 - camX * PS * f), h = 30 + Math.round(hash(i, 3) * 60);
        for (let k = 0; k < h; k++) { const w = Math.round(wv * (1 - k / h) / 2); c.fillRect(x - w, k, w * 2, 1); }
        const h2 = 20 + Math.round(hash(i, 5) * 40);
        for (let k = 0; k < h2; k++) { const w = Math.round(wv * 0.8 * (k / h2) / 2) + 1; c.fillRect(x + 30 - w, this.H - h2 + k, w * 2, 1); }
      }
    }
    for (let i = 0; i < 16; i++) { const x = Math.round(((hash(i, 7) * 2000 - camX * PS * 0.3) % (this.W + 20) + this.W + 20) % (this.W + 20)), y = Math.round(hash(i, 8) * this.H); if (Math.sin(time * 2 + i) > 0.3) { c.fillStyle = '#b8c8e0'; c.fillRect(x, y, 1, 1); } }
  }

  // ---------- Hoofdtekening ----------
  draw() {
    const g = this.g, c = g.c;
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    if (!g.level) { c.fillStyle = '#15252a'; c.fillRect(0, 0, this.W, this.H); return; }
    let sx = 0, sy = 0;
    if (g.shakeT > 0) { sx = (Math.random() - 0.5) * g.shakeA; sy = (Math.random() - 0.5) * g.shakeA; }
    const camX = g.camX + sx, camY = g.camY + sy, cpx = Math.round(camX * PS), cpy = Math.round(camY * PS);
    const L = g.level, t = g.time;
    // Achtergrond (met buitenstuk voor grotlevels)
    this.background(c, L.theme, camX, camY, t);
    if (L.outside) { const ox = Math.round(L.outside.from * TILE * PS - cpx); if (ox < this.W) { c.save(); c.beginPath(); c.rect(Math.max(0, ox), 0, this.W, this.H); c.clip(); this.background(c, L.outsideTheme || 'savanna', camX, camY, t); c.restore(); } }
    c.save(); c.translate(-cpx, -cpy);
    const vis = (x, m = 120) => x > camX - m && x < camX + g.viewW + m;
    // Kloofdiepte onder het maaiveld
    const pitTop = Math.round((L.pxH - 3 * TILE + 8) * PS);
    for (const [k, col] of [[0, '#4a3420'], [6, '#2e2014'], [16, '#1a120c'], [30, '#0c0806']]) { c.fillStyle = col; c.fillRect(cpx, pitTop + k, this.W, this.H); }
    // Bomen en finish-decor (één keer gepixeld)
    for (const d of g.decor) if ((d.type === 'tree' || d.type === 'bigtree') && vis(d.x, 420)) {
      const big = d.type === 'bigtree';
      const e = this.cachedTree(`${d.type}|${d.x}|${L.id}`, big ? g.renderer.bigTreeSpec(d) : g.renderer.levelTreeSpec(d, L.theme), d.x, d.y, big ? 1 : (d.scale || 1) * 0.95);
      c.drawImage(e.cv, Math.round(e.ox), Math.round(e.oy));
    }
    if (g.finish && vis(g.finish.x, 480)) {
      const f = g.finish, shelter = g.def.finishScene === 'shelter';
      if (!shelter) { const cl = this.cliff(L.theme); c.drawImage(cl, Math.round(f.x * PS) + 30, Math.round(f.y * PS) - cl.height + 3); }
      const e = this.cached(`fin|${L.id}`, f.x - 40, f.y - 300, 480, 304, cc => { if (shelter) drawShelter(cc, f.x + 190, f.y); drawFoodCache(cc, f.x + 122, f.y); });
      c.drawImage(e.cv, Math.round(e.ox), Math.round(e.oy));
    }
    // Tegels
    const theme = L.theme, CH = 16;
    if (this.mapRef !== g.map || this.mapVer !== g.map.version) { this.chunks.clear(); this.mapRef = g.map; this.mapVer = g.map.version; }
    for (let i = Math.floor(camX / (CH * TILE)); i <= Math.floor((camX + g.viewW) / (CH * TILE)); i++) {
      if (i < 0 || i * CH >= g.map.w) continue;
      let ch = this.chunks.get(i); if (!ch) { ch = this.buildChunk(g.map, i, theme); this.chunks.set(i, ch); }
      c.drawImage(ch, i * CH * PT, 0);
    }
    this.dynamicTiles(c, g.map, camX, t);
    // Checkpoints, lianen, voorwerpen
    for (const f of g.fires) if (vis(f.x)) this.live(c, f.x - 30, f.y - 60, 60, 64, cc => (g.def.fire ? drawCampfire : drawStoneCache)(cc, f.x, f.y, f.lit, t));
    for (const Ln of g.lianas) if (vis(Ln.ax, 200)) { const r = Ln.len + 30; this.live(c, Ln.ax - r, Ln.ay - 40, r * 2, r + 46, cc => drawLiana(cc, Ln, t)); }
    for (const k of g.pickups) if (!k.taken && vis(k.x)) {
      const e = this.cached(`pk|${k.type}`, -24, -24, 48, 48, cc => k.type === 'handaxe' ? toolIcon(cc, 'axe', 0, 0, 1.5, 0) : drawPickup(cc, { type: k.type, x: 0, y: 0 }, 0));
      c.drawImage(e.cv, Math.round(k.x * PS + e.ox), Math.round(k.y * PS + e.oy + Math.sin(t * 3 + k.x * 0.05) * 2));
    }
    // Figuren: stam, ontmoetingen, platforms, dieren, speler
    const fig = (o, drawFn, mx = 46, top = 60, bot = 6, fps = 12) => this.liveObj(c, o, o.x - mx, o.y - top, o.w + mx * 2, o.h + top + bot, drawFn, fps);
    if (g.npcs && g.finish && vis(g.finish.x, 420)) for (const n of g.npcs) fig(n, cc => n.draw(cc, t + n.x), 40, 40, 4);
    for (const m of g.meets) if (vis(m.x, 200)) { if (m.trace) this.live(c, m.x - 70, m.y - 10, 150, 14, cc => drawFootprints(cc, m.x, m.y)); for (const n of m.group) fig(n, cc => n.draw(cc, t + n.phase), 40, 40, 4); }
    for (const pl of g.platforms) if (vis(pl.x, 160)) { if (pl.kind === 'spear') this.live(c, pl.x - 10, pl.top - 12, pl.w + 20, 24, cc => pl.draw(cc, t)); else this.liveObj(c, pl, pl.x - 90, pl.top - 50, (pl.w || 100) + 180, 140, cc => pl.draw(cc, t), 10); }
    for (const e of g.enemies) if (e.active || vis(e.x)) { if (drawAnimal(c, e, PS, t)) continue; const big = e.isBoss ? 130 : 46; fig(e, cc => e.draw(cc, t), big, big + 20, 8); }
    for (const s of g.stonesFlying) { c.fillStyle = INK; c.fillRect(Math.round((s.x + 1) * PS), Math.round((s.y + 1) * PS), 7, 7); c.fillStyle = '#7d8590'; c.fillRect(Math.round((s.x + 2) * PS), Math.round((s.y + 2) * PS), 5, 5); c.fillStyle = '#c0c8d0'; c.fillRect(Math.round((s.x + 2) * PS), Math.round((s.y + 2) * PS), 2, 2); }
    for (const s of g.spears) this.live(c, s.x - 10, s.y - 20, s.w + 20, 40, cc => drawFlyingSpear(cc, s));
    for (const q of g.projectiles) { const x = Math.round((q.x + 6) * PS), y = Math.round((q.y + 6) * PS); c.fillStyle = INK; c.fillRect(x - 3, y - 3, 7, 7); c.fillStyle = '#e8902e'; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = '#ffd07a'; c.fillRect(x - 2, y - 2, 2, 2); }
    if (g.state !== 'title') { const p = g.player; if (!p.dead && p.onGround) { c.fillStyle = '#0000003a'; c.fillRect(Math.round((p.cx - 12) * PS), Math.round(p.bottom * PS) - 1, Math.round(24 * PS), 2); } fig(p, cc => p.draw(cc, t), 46, 48, 8, 15); }
    this.water(c, g.map, camX, t);
    this.particles(c);
    c.restore();
    // Voorgrond-gras, duisternis, HUD
    if (!PAL[L.theme]?.cave && g.state !== 'title') this.foreground(c, camX);
    this.darkness(c, cpx, cpy, t);
    if (g.state !== 'title') this.hud(c);
    this.drawUI(cpx, cpy);
  }

  dynamicTiles(c, map, camX, time) {
    const a = Math.max(0, Math.floor(camX / TILE) - 1), b = Math.min(map.w - 1, Math.ceil((camX + this.g.viewW) / TILE) + 1);
    for (let cy = 0; cy < map.h; cy++) for (let cx = a; cx <= b; cx++) {
      const t = map.get(cx, cy), i = map.idx(cx, cy), x = cx * PT, y = cy * PT;
      if (t === T.CRUMBLE) {
        const s = map.crumble.get(i); if (s && s.gone) continue;
        const sh = s ? Math.round(Math.sin(time * 70) * Math.min(1, s.t * 3)) : 0;
        c.drawImage(this.tileSprite('crumble', (px, py) => (py === 0 || py === PT - 1 || px === 0 || px === PT - 1) ? INK : (Math.abs(px - 8 - (py >> 2)) < 1 && py < 14) || (Math.abs(py - 13 - ((px - 9) >> 1)) < 1 && px > 9 && px < 20) ? '#7e5a2c' : py < 4 ? '#ecc88c' : py > PT - 5 ? '#a77d45' : '#d4a865'), x - 1 + sh, y - 1);
      } else if (t === T.BUMP) {
        const full = map.bumpItems.has(i), an = map.bounce.get(i) || 0, off = -Math.round(Math.sin(an / 0.2 * Math.PI) * 6);
        const spark = full && Math.floor(time * 3) % 2 === 0;
        c.drawImage(this.tileSprite(`bump|${full}|${spark}`, (px, py) => {
          if (py === 0 || py === PT - 1 || px === 0 || px === PT - 1) return INK;
          if (!full) return py < 4 ? '#b0a48e' : py > PT - 5 ? '#6c624f' : '#8a7e6a';
          if (inEll(px, py, 12, 12, 7, 6)) return spark && px === 14 && py === 10 ? '#ffffff' : spark && (px === 14 || py === 10) && Math.abs(px - 14) + Math.abs(py - 10) < 3 ? '#fff8c0' : '#2d3036';
          return py < 4 ? '#8a909c' : py > PT - 5 ? '#3e4148' : '#5b5f66';
        }), x - 1, y - 1 + off);
      } else if (t === T.SPRING) {
        const an = map.bounce.get(i) || 0, sq = an > 0 ? Math.round(TileMap.wobble(an, 1.0) * 7) : 0;
        const spr = this.tileSprite('spring', (px, py) => { const w = 3 + py * 0.42; if (Math.abs(px - 12) > w || py < 0) return null; return (px * 3 + py * 5) % 11 === 0 ? '#5b351d' : px < 12 ? '#c8804a' : '#a0663a'; });
        c.drawImage(spr, x - 1 - Math.round(sq * 0.4), y - 1 + sq, PT + 2 + Math.round(sq * 0.8), PT + 2 - sq);
      } else if (t === T.BOUNCY) {
        const an = map.bounce.get(i) || 0, l = map.get(cx - 1, cy) === T.BOUNCY, r = map.get(cx + 1, cy) === T.BOUNCY;
        // Natrillen: het uiteinde zwiept het verst
        const sag = an > 0 ? Math.round(TileMap.wobble(an, 1.2) * (r ? 5 : 8)) : 0;
        c.drawImage(this.branchTile(l, r, true), x - 1, y - 1 + sag);
      } else if (t === T.CRACK) {
        c.drawImage(this.tileSprite('crack', (px, py) => (py === 0 || py === PT - 1 || px === 0 || px === PT - 1) ? INK : (Math.abs(px - 5 - (py >> 1)) < 1 && py < 12) || (Math.abs(py - 11 - ((px - 10) >> 1)) < 1 && px > 9) || (Math.abs(px - 15 + (py >> 2)) < 1 && py > 11) ? '#3e3428' : py < 3 ? '#b8a68a' : '#8f7f68'), x - 1, y - 1);
      }
    }
  }

  water(c, map, camX, time) {
    const a = Math.max(0, Math.floor(camX / TILE) - 1), b = Math.min(map.w - 1, Math.ceil((camX + this.g.viewW) / TILE) + 1);
    for (let cx = a; cx <= b; cx++) {
      let top = -1, kind = 0;
      for (let cy = 0; cy < map.h; cy++) { const tt = map.get(cx, cy); if (tt === T.WATER || tt === T.LAVA) { top = cy; kind = tt; break; } }
      if (top < 0) continue;
      const lava = kind === T.LAVA, x0 = cx * PT, y0 = top * PT + 6, yb = map.h * PT;
      const col = lava ? ['#fff0a0', '#ffb040', '#ff6a22', '#c2321a', '#5a140c'] : ['#e8ffff', '#7ed0e0', '#3f9fb0', '#2a6f86', '#123744'];
      c.fillStyle = col[2]; c.fillRect(x0, y0 + 2, PT, 10); c.fillStyle = col[3]; c.fillRect(x0, y0 + 12, PT, 16); c.fillStyle = col[4]; c.fillRect(x0, y0 + 28, PT, yb - y0);
      for (let px = 0; px < PT; px++) { const wx = x0 + px, w = Math.round(Math.sin(wx * 0.18 + time * 3) * 1.2); c.fillStyle = col[1]; c.fillRect(wx, y0 + w, 1, 3); c.fillStyle = col[0]; if ((wx + Math.floor(time * 6)) % 7 === 0) c.fillRect(wx, y0 + w, 1, 1); }
      if (!lava && (cx * 5 + Math.floor(time * 2)) % 9 === 0) { c.fillStyle = '#c8f0f8'; c.fillRect(x0 + 6, y0 + 8, 6, 1); }
      if (lava && (cx * 3 + Math.floor(time * 4)) % 7 === 0) { c.fillStyle = '#ffd36a'; c.fillRect(x0 + 10, y0 - 2 - Math.floor(time * 8) % 4, 2, 2); }
    }
  }

  particles(c) {
    for (const p of this.g.fx.parts) {
      if (p.life <= 0) continue;
      const x = Math.round(p.x * PS), y = Math.round(p.y * PS), a = p.life / p.max;
      let col = '#e8d6ae', s = 2;
      if (p.kind === 'dust') { s = a > 0.5 ? 3 : 2; col = '#e8d6ae'; }
      else if (p.kind === 'star') col = '#ffe27a';
      else if (p.kind === 'spark') { col = p.color || '#fff2a8'; s = 1; }
      else if (p.kind === 'rock') col = '#9b7d55';
      else if (p.kind === 'drop') col = p.color || '#bfeaf0';
      else if (p.kind === 'bubble') { c.fillStyle = '#e8ffff'; c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y - 1, 1, 1); c.fillRect(x, y + 1, 1, 1); continue; }
      else if (p.kind === 'ripple') { const k = 1 - a, w = Math.round(4 + k * 30); c.fillStyle = '#e8ffff'; c.fillRect(x - w, y, Math.max(1, Math.round(w * 0.4)), 1); c.fillRect(x + w - Math.round(w * 0.4), y, Math.max(1, Math.round(w * 0.4)), 1); continue; }
      else if (p.kind === 'wind') { c.fillStyle = '#ffffffaa'; c.fillRect(x - (p.vx > 0 ? 18 : 0), y, 18, 1); continue; }
      else if (p.kind === 'leaf') col = '#9ab35a';
      c.fillStyle = col; c.fillRect(x - (s >> 1), y - (s >> 1), s, s);
    }
  }

  foreground(c, camX) {
    c.fillStyle = '#1c2a12';
    for (let i = Math.floor(camX * PS * 1.3 / 5) - 1; i < (camX * PS * 1.3 + this.W) / 5 + 1; i++) { if (hash(i, 9) < 0.5) continue; const x = Math.round(i * 5 - camX * PS * 1.3), h = 3 + Math.round(hash(i, 3) * 8); c.fillRect(x, this.H - h, 1, h); c.fillRect(x + 1, this.H - h + 3, 1, h - 3); }
  }

  // Duisternis in grotten: getrapte, gedithered lichtcirkel rond de speler en lichtbundels
  darkness(c, cpx, cpy, time) {
    const g = this.g, D = g.level.dark;
    if (!D) return;
    const px = g.player.cx / TILE;
    const amt = Math.max(0, Math.min(1, (px - D.from) / 4, (D.to - px) / 4));
    if (amt <= 0.02) return;
    if (!this.dk || this.dk.width !== this.W || this.dk.height !== this.H) { this.dk = document.createElement('canvas'); this.dk.width = this.W; this.dk.height = this.H; this.dkc = this.dk.getContext('2d');
      const pc = document.createElement('canvas'); pc.width = 2; pc.height = 2; const pcc = pc.getContext('2d'); pcc.fillStyle = '#000'; pcc.fillRect(0, 0, 1, 1); pcc.fillRect(1, 1, 1, 1); this.checker = this.dkc.createPattern(pc, 'repeat'); }
    const d = this.dkc;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, this.W, this.H);
    d.fillStyle = `rgba(6,5,8,${0.9 * amt})`; d.fillRect(0, 0, this.W, this.H);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => {
      d.fillStyle = this.checker; d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill();
      d.fillStyle = '#000'; d.beginPath(); d.arc(x, y, r * 0.72, 0, Math.PI * 2); d.fill();
    };
    const p = g.player, torch = p.tool === 'torch';
    hole(Math.round(p.cx * PS - cpx), Math.round((p.y + 18) * PS - cpy), (torch ? 170 : 120) * (1 + Math.sin(time * 9) * (torch ? 0.02 : 0)));
    if (g.def.fire) for (const f of g.fires) if (f.lit) hole(Math.round(f.x * PS - cpx), Math.round((f.y - 20) * PS - cpy), 140);
    if (g.boss && !g.boss.gone) hole(Math.round(g.boss.cx * PS - cpx), Math.round((g.boss.y + 20) * PS - cpy), 90);
    for (const pk of g.pickups) if (!pk.taken && pk.type === 'artifact') hole(Math.round(pk.x * PS - cpx), Math.round(pk.y * PS - cpy), 26);
    for (const Lt of g.level.entities) if (Lt.type === 'light') {
      const x = Math.round(Lt.x * PS - cpx);
      d.fillStyle = this.checker; d.beginPath(); d.moveTo(x - 20, 0); d.lineTo(x + 20, 0); d.lineTo(x + 50, this.H); d.lineTo(x - 50, this.H); d.closePath(); d.fill();
    }
    c.drawImage(this.dk, 0, 0);
  }

  // Pixel-HUD: hartjes, levens, botjes, stenen/gereedschap, artefacten
  hud(c) {
    const g = this.g, x0 = 4, y0 = 4;
    const panel = (x, w) => { c.fillStyle = INK; c.fillRect(x, y0, w, 15); c.fillStyle = '#2a3a34'; c.fillRect(x + 1, y0 + 1, w - 2, 13); };
    const num = (s, x, y) => { c.fillStyle = '#fff6dc'; for (const ch of s) { const gl = this.font[ch]; if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') c.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1); x += 4; } };
    const hearts = 5;
    panel(x0, hearts * 10 + 34);
    for (let i = 0; i < hearts; i++) c.drawImage(this.heart[i < g.hearts ? 0 : 1], x0 + 3 + i * 10, y0 + 3);
    c.drawImage(this.head, x0 + hearts * 10 + 4, y0 + 2);
    num('x' + g.lives, x0 + hearts * 10 + 16, y0 + 5);
    let x = x0 + hearts * 10 + 38;
    panel(x, 34); const bone = this.cached('hud|bone', -14, -10, 28, 20, cc => drawPickup(cc, { type: 'bone', x: 0, y: 0 }, 0)); c.drawImage(bone.cv, x + 2 + Math.round(bone.ox + 10), y0 + 7 + Math.round(bone.oy)); num(String(g.bonesTotal).padStart(2, '0'), x + 22, y0 + 5);
    x += 38;
    panel(x, 26);
    const tool = g.player.tool, ic = this.cached('hud|' + (tool || 'flint'), -14, -14, 28, 28, cc => tool ? toolIcon(cc, tool, 0, 0, 1, 0) : flintIcon(cc, 0, 0, 1));
    c.drawImage(ic.cv, x + 1 + Math.round(ic.ox + 8), y0 + 7 + Math.round(ic.oy));
    if (tool) { c.fillStyle = '#fff6dc'; c.fillRect(x + 16, y0 + 7, 2, 2); c.fillRect(x + 19, y0 + 7, 2, 2); c.fillRect(x + 18, y0 + 6, 1, 4); } else num(String(g.stones), x + 16, y0 + 5);
    x += 30;
    panel(x, 40);
    for (let i = 0; i < 3; i++) {
      if (i < g.artifacts.size) { const e = this.cached('hud|art', -12, -12, 24, 24, cc => artifactIcon(cc, 0, 0, 1, true)); c.drawImage(e.cv, x + 4 + i * 12 + Math.round(e.ox + 8), y0 + 7 + Math.round(e.oy)); }
      else { c.fillStyle = '#1a2622'; c.fillRect(x + 5 + i * 12, y0 + 4, 8, 7); c.fillStyle = '#4a5a54'; c.fillRect(x + 6 + i * 12, y0 + 5, 6, 5); }
    }
  }

  // Knoppen, banners en zwevende teksten op een scherp overlay-canvas
  drawUI(cpx, cpy) {
    const g = this.g, u = this.uc;
    if (!u) return;
    const dpr = devicePixelRatio || 1;
    u.setTransform(1, 0, 0, 1, 0, 0); u.clearRect(0, 0, this.ui.width, this.ui.height);
    u.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = this.n / dpr;   // pixel → css
    u.font = 'bold 12px system-ui, sans-serif'; u.textAlign = 'center';
    for (const tx of g.fx.texts) {
      const x = (tx.x * PS - cpx) * k, y = (tx.y * PS - cpy) * k;
      u.globalAlpha = Math.min(1, tx.life * 2); u.fillStyle = '#1a0f08'; u.fillText(tx.str, x + 1, y + 1); u.fillStyle = tx.color; u.fillText(tx.str, x, y);
    }
    u.globalAlpha = 1; u.textAlign = 'left';
    g.drawUI(u);
  }
}

export function installPixel(game) {
  const P = new PixelView(game);
  game.pixel = P;
  const baseResize = game.resize.bind(game);
  game.resize = () => { baseResize(); P.resize(); };
  game.draw = () => P.draw();
  game.resize();
  return P;
}
