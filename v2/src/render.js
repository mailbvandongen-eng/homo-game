import { TILE } from './config.js';
import { T } from './level.js';
import { leafCluster, frond, WIND, bakeTree, drawBakedTree } from './art.js';

const CHUNK = 16; // tegels per voorgetekend stuk
// Welke bomen bij welk landschap horen
const PAL_OF = { forest: 'forest', java: 'java', dmanisi: 'dmanisi', coast: 'temperate', lake: 'temperate', hills: 'hills' };
const KIND_OF = { forest: 'broad', java: 'jungle', dmanisi: 'broad', coast: 'broad', lake: 'broad', hills: 'broad' };

// Deterministische "willekeur" zodat het landschap elke keer hetzelfde is.
export function hash(a, b = 0) { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }

// ---------------- Achtergrond ----------------
const THEMES = {
  gorge: {
    sky: ['#4f9fd0', '#a9d4d8', '#f7d49a'], sun: '#fff0b8',
    far: '#c68a5a', farTop: '#dcae7c', mid: '#b5774a', midDark: '#8d9a52', near: '#9aa65a', acacia: '#5d6f3c',
    mesa: true,
  },
  forest: {
    sky: ['#6fb7cf', '#b8dcc8', '#e9e2a8'], sun: '#fff6cc',
    far: '#86a88e', farTop: '#9cbc9f', mid: '#4f7a45', midDark: '#3f6a3a', near: '#5f8f45', acacia: '#3d6136',
    forest: true, jungle: true,
  },
  cave: { cave: true },
  coast: {
    sky: ['#7aa6c4', '#c2d6dc', '#ece6cc'], sun: '#fff6dc',
    far: '#e4e0d2', farTop: '#ffffff', mid: '#93a874', midDark: '#6f8a58', near: '#88a260', acacia: '#4a6a3c', mesa: true,
  },
  hills: {
    sky: ['#6aa6d0', '#bcd8dc', '#f2dcaa'], sun: '#fff0c0',
    far: '#b89c78', farTop: '#d2bc96', mid: '#a6a066', midDark: '#7e8a4c', near: '#9a9a58', acacia: '#56683a',
  },
  lake: {
    sky: ['#6c9cc0', '#bcd2d4', '#e6dcb8'], sun: '#fff4d0',
    far: '#7e9488', farTop: '#9cb0a2', mid: '#6e8e58', midDark: '#58784a', near: '#6c8c50', acacia: '#3e5e34', forest: true,
  },
  grassland: {
    sky: ['#6aaad6', '#bfdcd2', '#f6dc9c'], sun: '#fff2b8',
    far: '#a9b5a2', farTop: '#c2cab6', mid: '#c4b46a', midDark: '#a89a52', near: '#b8a85c', acacia: '#6a7a40',
  },
  dmanisi: {
    sky: ['#7aaed0', '#c4d8dc', '#e8e2c8'], sun: '#fffbe0',
    far: '#8c9aa8', farTop: '#f2f4f6', mid: '#7f9460', midDark: '#66804c', near: '#89a05e', acacia: '#4e6a3c',
    snow: true, forest: true,
  },
  java: {
    sky: ['#5f9fc0', '#b6d6c6', '#f0d8a8'], sun: '#fff0c0',
    far: '#7a8e86', farTop: '#93a69c', mid: '#4f7f48', midDark: '#3e6a3c', near: '#5a8c46', acacia: '#2f5a32',
    forest: true, volcano: true, jungle: true,
  },
  dusk: {
    sky: ['#3a4a7a', '#c97a6a', '#f2b064'], sun: '#ffd28a',
    far: '#6a5a6a', farTop: '#8a7080', mid: '#7a6a48', midDark: '#5e5238', near: '#6e6040', acacia: '#3a3020',
  },
  savanna: {
    sky: ['#5fb3d9', '#9fd6dc', '#f6e2a8'], sun: '#fff4c4',
    far: '#9cb6b4', farTop: '#b9cdc4', mid: '#9fb46c', midDark: '#7f9a55', near: '#86a64c', acacia: '#5a7840',
  },
};

export class Renderer {
  constructor() { this.chunks = new Map(); this.k = 1; this.mapVersion = -1; }

  setResolution(k) { if (Math.abs(k - this.k) > 0.001) { this.k = k; this.chunks.clear(); this.trees = new Map(); } }

  // Gebakken bomen, bewaard per soort/variant/resolutie
  tree(kind, palette, seed, height, haze = 0, hazeColor = '#c8d8d0') {
    if (!this.trees) this.trees = new Map();
    const key = kind + palette + seed + '|' + height + '|' + haze + hazeColor;
    let T = this.trees.get(key);
    if (!T) { T = bakeTree({ kind, palette, seed, height, haze, hazeColor }, Math.min(2.5, this.k)); this.trees.set(key, T); }
    return T;
  }
  levelTree(c, d, theme, time) {
    const pal = PAL_OF[theme] || 'savanna';
    const kind = KIND_OF[theme] || 'acacia';
    const T = this.tree(kind, pal, Math.floor(d.x / 7) % 5, 150);
    drawBakedTree(c, T, d.x, d.y, (d.scale || 1) * 0.95, time);
  }
  bigTree(c, d, time) {
    const T = this.tree('broad', 'forest', 2 + Math.floor(d.x / 11) % 3, Math.round(d.height * 32 * 1.55));
    drawBakedTree(c, T, d.x, d.y, 1, time);
  }

  drawSky(c, th, camX, viewW, viewH, time) {
    const g = c.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
    c.fillStyle = g; c.fillRect(0, 0, viewW, viewH);

    // Zon met gloed
    const sx = viewW * 0.78 - camX * 0.02, sy = viewH * 0.2;
    const glow = c.createRadialGradient(sx, sy, 4, sx, sy, 140);
    glow.addColorStop(0, '#fff8d8cc'); glow.addColorStop(0.3, '#ffeeb055'); glow.addColorStop(1, '#ffeeb000');
    c.fillStyle = glow; c.fillRect(sx - 140, sy - 140, 280, 280);
    c.fillStyle = th.sun; c.beginPath(); c.arc(sx, sy, 24, 0, Math.PI * 2); c.fill();
    // Zonnestralen: zachte, langzaam draaiende lichtbundels
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = time * 0.03 + i * 0.9 + Math.sin(time * 0.2 + i) * 0.05, len = viewH * 1.4, w = 0.07 + (i % 3) * 0.03;
      const g2 = c.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
      g2.addColorStop(0, 'rgba(255,240,200,0.06)'); g2.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a - w) * len, sy + Math.sin(a - w) * len); c.lineTo(sx + Math.cos(a + w) * len, sy + Math.sin(a + w) * len); c.closePath(); c.fill();
    }
    c.restore();
  }

  background(c, theme, camX, camY, viewW, viewH, levelH, time) {
    const th = THEMES[theme] || THEMES.savanna;
    if (th.cave) return caveBackground(c, camX, camY, viewW, viewH, time);
    // Lucht, zon en zonnestralen veranderen nauwelijks: voorgetekend en af en toe ververst
    const k = c.getTransform().a, key = theme + '|' + Math.round(viewW) + '|' + Math.round(viewH) + '|' + k.toFixed(2);
    const sc = this.skyCache;
    if (!sc || sc.key !== key || time - sc.t > 0.2 || Math.abs(sc.camX - camX) > 40) {
      const cv = sc && sc.key === key ? sc.cv : document.createElement('canvas');
      cv.width = Math.ceil(viewW * k); cv.height = Math.ceil(viewH * k);
      const cc = cv.getContext('2d'); cc.setTransform(k, 0, 0, k, 0, 0);
      this.drawSky(cc, th, camX, viewW, viewH, time);
      this.skyCache = { cv, key, t: time, camX };
    }
    c.drawImage(this.skyCache.cv, 0, 0, viewW, viewH);
    // Vogelzwerm in V-vorm die af en toe overvliegt
    { const cyc = 26, t = (time % cyc) / cyc, fx = -100 + t * (viewW + 300), fy = viewH * 0.18 + Math.sin(time * 0.3) * 10;
      c.strokeStyle = 'rgba(40,50,60,0.55)'; c.lineWidth = 1.4; c.lineCap = 'round';
      for (let k = 0; k < 9; k++) { const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1, bx = fx - row * 14, by = fy + side * row * 8, f = Math.sin(time * 9 + k) * 3;
        c.beginPath(); c.moveTo(bx - 6, by - f); c.quadraticCurveTo(bx - 2, by - 3, bx, by); c.quadraticCurveTo(bx + 2, by - 3, bx + 6, by - f); c.stroke(); } }

    // Wolken
    for (let i = 0; i < 7; i++) {
      const span = viewW + 300;
      const x = ((hash(i, 1) * span * 3 - camX * 0.06 - time * (4 + i)) % span + span) % span - 150;
      const y = 30 + hash(i, 2) * viewH * 0.3;
      cloud(c, x, y, 0.6 + hash(i, 3) * 0.6);
    }

    // Lagen staan ten opzichte van het gewone maaiveld en bewegen verticaal trager mee dan de camera.
    const ref = levelH - viewH, groundWorld = levelH - 3 * TILE;
    const yOf = (f, h) => groundWorld - h - ref - (camY - ref) * f;

    // Verre breukrand van de Riftvallei
    if (th.volcano) volcano(c, viewW * 0.62 - camX * 0.04, yOf(0.05, 120), time);
    // Extra verre bergrug, bijna opgelost in de nevel
    ridge(c, camX * 0.05, viewW, yOf(0.05, 132), 30, 0.0022, 2, mixHex(th.far, th.sky[1], 0.55), mixHex(th.far, th.sky[1], 0.45), th.mesa);
    ridge(c, camX * 0.1, viewW, yOf(0.1, 112), 46, 0.0035, 7, th.far, th.farTop, th.mesa);
    haze(c, viewW, yOf(0.1, 70), th.sky[2]);
    if (th.snow) snowCaps(c, camX * 0.1, viewW, yOf(0.1, 112), 46, 0.0035, 7);
    // Middenheuvels met acacia's
    const midY = yOf(0.3, 70);
    ridge(c, camX * 0.3, viewW, midY, 20, 0.006, 3, th.mid, th.mid, th.mesa);
    for (let i = Math.floor(camX * 0.3 / 230) - 1; i < (camX * 0.3 + viewW) / 230 + 1; i++) {
      if (hash(i, 9) < (th.forest ? 0.05 : 0.35)) continue;
      const wx = i * 230 + hash(i, 4) * 120, x = wx - camX * 0.3;
      // Bomen in de verte: zelfde techniek, maar vervaagd in de nevel
      const pal = PAL_OF[theme] || 'savanna';
      const kind = KIND_OF[theme] || 'acacia';
      const T = this.tree(kind, pal, 10 + (i & 3), 90, 0.42, th.sky[1]);
      drawBakedTree(c, T, x, midY + 8 - ridgeH(wx, 20, 0.006, 3), (th.forest ? 0.9 : 0.7) + hash(i, 5) * 0.35, time + i);
    }
    // Dichtbij: struikenrand
    const nearY = yOf(0.55, 30);
    ridge(c, camX * 0.55, viewW, nearY, 9, 0.012, 11, th.near, th.midDark);
    for (let i = Math.floor(camX * 0.55 / 140) - 1; i < (camX * 0.55 + viewW) / 140 + 1; i++) {
      const wx = i * 140 + hash(i, 6) * 80, x = wx - camX * 0.55;
      const by = nearY + 4 - ridgeH(wx, 9, 0.012, 11), bs = 0.8 + hash(i, 7) * 0.6;
      bush(c, x, by, bs, th.midDark);
      leafCluster(c, x + 4, by - 6 * bs, 20 * bs, 7 * bs, { n: 9, size: 6, colors: [th.midDark, th.near, mixHex(th.near, '#ffffff', 0.2)], time, seed: i, sway: 0.25 });
    }
    // Bos: schuine lichtbundels door het bladerdak en hangende slingerplanten
    if (th.jungle && !this.lite) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 260 - camX * 0.4) % (viewW + 300) + viewW + 300) % (viewW + 300) - 150, a = 0.08 + 0.04 * Math.sin(time * 0.5 + i);
        const g3 = c.createLinearGradient(bx, 0, bx + 120, viewH); g3.addColorStop(0, `rgba(255,250,210,${a})`); g3.addColorStop(1, 'rgba(255,250,210,0)');
        c.fillStyle = g3; c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + 40, 0); c.lineTo(bx + 190, viewH); c.lineTo(bx + 110, viewH); c.closePath(); c.fill();
      }
      c.restore();
      c.strokeStyle = mixHex(th.midDark, '#000000', 0.2); c.lineWidth = 2.2;
      for (let i = Math.floor(camX * 0.6 / 90) - 1; i < (camX * 0.6 + viewW) / 90 + 1; i++) {
        if (hash(i, 41) < 0.45) continue;
        const vx = i * 90 + hash(i, 42) * 50 - camX * 0.6, len = 60 + hash(i, 43) * 120, sw = Math.sin(time * 1.2 + i) * 6;
        c.beginPath(); c.moveTo(vx, -5); c.quadraticCurveTo(vx + sw, len * 0.5, vx + sw * 1.6, len); c.stroke();
        c.fillStyle = mixHex(th.midDark, '#000000', 0.1);
        for (let k = 1; k < 6; k++) { const ly = len * k / 6, lx = vx + sw * 1.6 * (k / 6) * (k / 6); c.beginPath(); c.ellipse(lx + (k % 2 ? 4 : -4), ly, 4.5, 2, k % 2 ? 0.5 : -0.5, 0, Math.PI * 2); c.fill(); }
      }
    }
    // Grote kudde in de verte, met stofwolk (alleen op open vlaktes)
    if (!th.forest) {
      const span = 3200, herdX = ((1200 - camX * 0.3 + time * 10) % span + span) % span - 500;
      const hy = midY + 4 - ridgeH(herdX + camX * 0.3, 20, 0.006, 3);
      const dust = c.createRadialGradient(herdX + 120, hy - 6, 10, herdX + 120, hy - 6, 170);
      dust.addColorStop(0, 'rgba(230,205,160,0.35)'); dust.addColorStop(1, 'rgba(230,205,160,0)');
      c.fillStyle = dust; c.fillRect(herdX - 60, hy - 90, 360, 120);
      for (let k = 0; k < 16; k++) antelope(c, herdX + (k % 8) * 30 + hash(k) * 16 + (k > 7 ? 14 : 0), hy + (k > 7 ? 5 : 0) + hash(k, 1) * 3, 0.42 + (k > 7 ? 0.06 : 0), time * 1.6 + k);
    }
  }

  // Voorgrond: donkere gras- en bladsilhouetten onderaan het beeld (voor de speler, maar laag genoeg)
  foreground(c, theme, camX, viewW, viewH, time) {
    const th = THEMES[theme] || THEMES.savanna;
    const col = th.cave ? '#120d0a' : th.fg || '#1d2a14';
    c.save(); c.globalAlpha = 0.88;
    c.fillStyle = col;
    const f = 1.35, step = 18;
    for (let i = Math.floor(camX * f / step) - 2; i < (camX * f + viewW) / step + 2; i++) {
      const x = i * step - camX * f, h = 10 + hash(i, 3) * 20, bend = Math.sin(time * 1.6 + i * 0.7) * 5;
      if (hash(i, 9) < (th.cave ? 0.75 : 0.35)) continue;
      if (th.cave) { c.beginPath(); c.moveTo(x - 8, viewH + 2); c.lineTo(x + 1, viewH - h * 0.9); c.lineTo(x + 9, viewH + 2); c.closePath(); c.fill(); continue; }
      c.beginPath(); c.moveTo(x - 6, viewH + 2); c.bezierCurveTo(x - 5, viewH - h * 0.5, x + bend * 0.6 - 3, viewH - h * 0.8, x + bend + 2, viewH - h); c.bezierCurveTo(x + bend * 0.4 + 3, viewH - h * 0.6, x + 4, viewH - h * 0.3, x + 7, viewH + 2); c.closePath(); c.fill();
    }
    // Bos: bladerdak dat over de bovenrand van het beeld hangt
    if (th.jungle && !this.lite) {
      for (let i = Math.floor(camX * f / 70) - 1; i < (camX * f + viewW) / 70 + 1; i++) {
        const x = i * 70 + hash(i, 51) * 40 - camX * f;
        leafCluster(c, x, -4 + hash(i, 52) * 8, 40, 16, { n: 14, size: 13, colors: [col, mixHex(col, '#2a4a20', 0.4), mixHex(col, '#3a5a28', 0.5)], time, seed: i * 2.3, sway: 0.16 });
      }
    }
    for (let i = Math.floor(camX * f / 520) - 1; i < (camX * f + viewW) / 520 + 1; i++) {
      if (th.cave || hash(i, 21) < 0.45) continue;
      const x = i * 520 + hash(i, 22) * 200 - camX * f, sway = Math.sin(time * 1.3 + i) * 0.06;
      c.save(); c.translate(x, viewH + 6); c.rotate(-0.5 + sway);
      for (let k = 0; k < 5; k++) { c.rotate(0.24); c.beginPath(); c.ellipse(0, -30, 7, 30, 0, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    c.restore();
  }

  // Zwevend stuifmeel / stofjes in de lucht, en een zachte vignet
  atmosphere(c, theme, camX, camY, viewW, viewH, time) {
    if (this.lite) return;
    const th = THEMES[theme] || THEMES.savanna;
    c.save();
    for (let i = 0; i < 26; i++) {
      const px = ((hash(i, 31) * 2000 - camX * (0.6 + hash(i, 32) * 0.6) + time * (6 + hash(i, 33) * 10)) % (viewW + 40) + viewW + 40) % (viewW + 40) - 20;
      const py = ((hash(i, 34) * viewH + Math.sin(time * 0.7 + i) * 14 - camY * 0.3 - time * 4) % viewH + viewH) % viewH;
      c.globalAlpha = 0.25 + 0.25 * Math.sin(time * 2 + i);
      c.fillStyle = th.cave ? '#d0c0a0' : '#fff6d8'; c.beginPath(); c.arc(px, py, th.cave ? 0.9 : 1.3, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    // Vignet: één keer voorgetekend per schermmaat
    const k = c.getTransform().a, key = (th.cave ? 'c' : 'o') + Math.round(viewW) + 'x' + Math.round(viewH) + k.toFixed(2);
    if (!this.vigCache || this.vigCache.key !== key) {
      const cv = document.createElement('canvas'); cv.width = Math.ceil(viewW * k / 2); cv.height = Math.ceil(viewH * k / 2);
      const vc = cv.getContext('2d'); vc.scale(k / 2, k / 2);
      const v = vc.createRadialGradient(viewW / 2, viewH * 0.45, viewH * 0.35, viewW / 2, viewH * 0.5, viewW * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, th.cave ? 'rgba(0,0,0,0.45)' : 'rgba(30,20,10,0.22)');
      vc.fillStyle = v; vc.fillRect(0, 0, viewW, viewH);
      this.vigCache = { cv, key };
    }
    c.drawImage(this.vigCache.cv, 0, 0, viewW, viewH);
    c.restore();
  }

  // Onder het maaiveld een donkere kloof, zodat kuilen diep ogen (in wereldcoördinaten, klopt ook bij inzoomen)
  pits(c, camX, viewW, levelH) {
    const top = levelH - 3 * TILE + 6;
    const g = c.createLinearGradient(0, top - 6, 0, top + 104);
    g.addColorStop(0, '#6b4a2e'); g.addColorStop(0.25, '#3e2a1b'); g.addColorStop(1, '#120c08');
    c.fillStyle = g; c.fillRect(camX - 10, top, viewW + 20, levelH - top + 200);
  }

  // Rivierwater: oppervlak met golfjes, van voren getekend zodat dingen erin "zakken"
  water(c, map, camX, viewW, levelH, time) {
    this.liquid(c, map, camX, viewW, levelH, time, T.WATER);
    this.liquid(c, map, camX, viewW, levelH, time, T.LAVA);
  }

  liquid(c, map, camX, viewW, levelH, time, kind) {
    const lava = kind === T.LAVA;
    const a = Math.max(0, Math.floor(camX / TILE) - 1), b = Math.min(map.w - 1, Math.ceil((camX + viewW) / TILE) + 1);
    let run = null;
    const flush = () => {
      if (!run) return;
      const { x1, x2, y } = run;
      const g = c.createLinearGradient(0, y, 0, levelH);
      if (lava) { g.addColorStop(0, '#ffcf5a'); g.addColorStop(0.15, '#ff7a22'); g.addColorStop(0.6, '#c2321a'); g.addColorStop(1, '#5a140c'); }
      else { g.addColorStop(0, '#3f9fb0cc'); g.addColorStop(0.3, '#2a6f86dd'); g.addColorStop(1, '#123744f0'); }
      c.fillStyle = g;
      c.beginPath(); c.moveTo(x1, levelH + 10);
      for (let x = x1; x <= x2; x += 6) c.lineTo(x, y + Math.sin(x * 0.05 + time * 3) * 1.6);
      c.lineTo(x2, levelH + 10); c.closePath(); c.fill();
      if (!lava) {
        // Lichtreflectie net onder het oppervlak en schuim langs de randen
        const rg = c.createLinearGradient(0, y, 0, y + 26); rg.addColorStop(0, 'rgba(220,250,255,0.35)'); rg.addColorStop(1, 'rgba(220,250,255,0)');
        c.fillStyle = rg; c.fillRect(x1, y, x2 - x1, 26);
        c.fillStyle = 'rgba(255,255,255,0.75)';
        for (const ex of [x1, x2]) for (let k = 0; k < 4; k++) { const fx = ex + (ex === x1 ? 1 : -1) * (3 + k * 5), fy = y + Math.sin(time * 4 + k) * 1.5; c.beginPath(); c.arc(fx, fy, 2.6 - k * 0.5, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,0.18)';
        for (let x = x1 + 20; x < x2 - 10; x += 53) { const o = Math.sin(time * 0.8 + x) * 8; c.beginPath(); c.ellipse(x + o, y + 14 + (x % 5) * 3, 12, 1.2, 0, 0, Math.PI * 2); c.fill(); }
      }
      c.strokeStyle = lava ? '#fff0a0' : '#c8f0f0aa'; c.lineWidth = 1.5; c.beginPath();
      for (let x = x1; x <= x2; x += 6) c.lineTo(x, y + Math.sin(x * 0.05 + time * 3) * 1.6);
      c.stroke();
      if (lava) {
        for (let x = x1 + 12; x < x2; x += 41) { const ph = (time * 1.3 + x * 0.07) % 1; c.fillStyle = `rgba(255,220,120,${1 - ph})`; c.beginPath(); c.arc(x + (x % 7), y + 4 - ph * 10, 2 + ph * 3, 0, Math.PI * 2); c.fill(); }
        const glow = c.createLinearGradient(0, y - 60, 0, y); glow.addColorStop(0, 'rgba(255,120,40,0)'); glow.addColorStop(1, 'rgba(255,120,40,0.25)');
        c.fillStyle = glow; c.fillRect(x1, y - 60, x2 - x1, 60);
      } else {
        c.fillStyle = '#e8ffff66';
        for (let x = x1 + 10; x < x2; x += 37) { const o = (time * 18 + x) % 37; c.fillRect(x + o * 0.3, y + 6 + (x % 3) * 4, 8, 1.4); }
      }
      run = null;
    };
    for (let cx = a; cx <= b; cx++) {
      let top = -1;
      for (let cy = 0; cy < map.h; cy++) if (map.get(cx, cy) === kind) { top = cy; break; }
      if (top < 0) { flush(); continue; }
      const y = top * TILE + 8;
      if (run && run.y === y && run.x2 === cx * TILE) run.x2 = (cx + 1) * TILE;
      else { flush(); run = { x1: cx * TILE, x2: (cx + 1) * TILE, y }; }
    }
    flush();
  }

  // ---------------- Tegels (in stukken voorgetekend) ----------------
  tiles(c, map, camX, camY, viewW, viewH) {
    if (map !== this.mapRef || map.version !== this.mapVersion) { this.chunks.clear(); this.mapRef = map; this.mapVersion = map.version; }
    const first = Math.floor(camX / (CHUNK * TILE)), last = Math.floor((camX + viewW) / (CHUNK * TILE));
    for (let i = first; i <= last; i++) {
      if (i < 0 || i * CHUNK >= map.w) continue;
      let ch = this.chunks.get(i);
      if (!ch) { ch = this.buildChunk(map, i); this.chunks.set(i, ch); }
      c.drawImage(ch, i * CHUNK * TILE, 0, ch.width / this.k, ch.height / this.k);
    }
  }

  buildChunk(map, index) {
    const cv = document.createElement('canvas');
    const k = this.k;
    cv.width = Math.ceil(CHUNK * TILE * k) + 2; cv.height = Math.ceil(map.h * TILE * k);
    const c = cv.getContext('2d');
    c.scale(k, k);
    c.translate(-index * CHUNK * TILE, 0);
    const x0 = index * CHUNK - 1, x1 = Math.min(map.w, (index + 1) * CHUNK + 1);
    for (let cy = 0; cy < map.h; cy++) for (let cx = x0; cx < x1; cx++) {
      const t = map.get(cx, cy);
      if (cx < 0 || cx >= map.w) continue;
      const theme = map.level.outside && cx >= map.level.outside.from ? (map.level.outsideTheme || 'savanna') : map.level.theme;
      if (t === T.GROUND) groundTile(c, map, cx, cy, theme);
      else if (t === T.ROCK) rockTile(c, map, cx, cy);
      else if (t === T.BRANCH) branchTile(c, map, cx, cy);
      else if (t === T.THORNS) (theme === 'cave' ? stalagmiteTile : thornTile)(c, cx, cy);
      else if (t === T.MUD) mudTile(c, map, cx, cy);
      else if (t === T.CLAY) clayTile(c, map, cx, cy);
    }
    return cv;
  }

  // Planten op de grond die bewegen: grasplukjes, varens en struikjes. Ze buigen weg van de speler.
  plants(c, map, camX, viewW, time, player) {
    if (this.plantMap !== map) {
      this.plantMap = map; this.plantList = [];
      const theme = map.level.theme;
      if (theme !== 'cave') for (let cx = 0; cx < map.w; cx++) for (let cy = 1; cy < map.h; cy++) {
        const t = map.get(cx, cy), up = map.get(cx, cy - 1);
        if (t !== T.GROUND) continue;
        if (up !== T.EMPTY && up !== T.BRANCH) break;
        const r = hash(cx, cy * 3 + 1), lush = theme === 'forest' || theme === 'java';
        const kind = lush && r > 0.72 ? 'fern' : r > 0.94 ? 'bush' : r > (lush ? 0.4 : 0.5) ? 'tuft' : null;
        if (kind) this.plantList.push({ x: cx * TILE + 6 + hash(cx, 5) * 20, y: cy * TILE + 1, kind, seed: cx * 1.7 });
        break;
      }
    }
    const pcx = player ? player.cx : -1e9, pb = player ? player.bottom : 0;
    for (const P of this.plantList) {
      if (P.x < camX - 40 || P.x > camX + viewW + 40) continue;
      const d = P.x - pcx, near = Math.abs(d) < 26 && Math.abs(P.y - pb) < 30 ? (1 - Math.abs(d) / 26) * Math.sign(d || 1) : 0;
      if (P.kind === 'tuft') {
        for (let j = 0; j < 6; j++) {
          const h = 9 + hash(P.seed, j) * 9, lean = (j - 2.5) * 0.12 + Math.sin(time * 2.2 + P.seed + j * 0.4) * 0.12 + near * 0.9 + WIND.push * 1.2, bx = P.x + j * 1.8 - 5;
          c.fillStyle = j % 2 ? '#6ea43a' : '#94c84c';
          c.beginPath(); c.moveTo(bx, P.y); c.quadraticCurveTo(bx + lean * h * 0.4, P.y - h * 0.6, bx + lean * h, P.y - h); c.quadraticCurveTo(bx + 1 + lean * h * 0.3, P.y - h * 0.5, bx + 1.6, P.y); c.closePath(); c.fill();
        }
      } else if (P.kind === 'fern') {
        for (let k = 0; k < 5; k++) frond(c, P.x, P.y, 20 + hash(P.seed, k) * 8, -Math.PI / 2 + (k - 2) * 0.5, k % 2 ? '#4f8a36' : '#6aa844', time, P.seed + k, near * 0.6);
      } else {
        leafCluster(c, P.x, P.y - 8, 14, 9, { n: 12, size: 6, colors: ['#3c6228', '#5a8a38', '#8cbc50'], time, seed: P.seed, sway: 0.25, push: near * 0.5 });
      }
    }
  }

  // Tegels die bewegen of veranderen worden elk beeld getekend.
  dynamicTiles(c, map, camX, viewW, time) {
    const a = Math.max(0, Math.floor(camX / TILE) - 1), b = Math.min(map.w - 1, Math.ceil((camX + viewW) / TILE) + 1);
    for (let cy = 0; cy < map.h; cy++) for (let cx = a; cx <= b; cx++) {
      const t = map.get(cx, cy), i = map.idx(cx, cy);
      if (t === T.CRUMBLE) {
        const s = map.crumble.get(i);
        if (s && s.gone) continue;
        const shake = s ? Math.sin(time * 70) * 1.5 * Math.min(1, s.t * 3) : 0;
        crumbleTile(c, cx * TILE + shake, cy * TILE);
      } else if (t === T.BUMP) {
        const anim = map.bounce.get(i) || 0;
        bumpTile(c, cx * TILE, cy * TILE - Math.sin(anim / 0.2 * Math.PI) * 8, map.bumpItems.has(i), time);
      } else if (t === T.SPRING) {
        const anim = map.bounce.get(i) || 0;
        springTile(c, cx * TILE, cy * TILE, anim, time);
      } else if (t === T.CRACK) {
        crackTile(c, cx * TILE, cy * TILE);
      } else if (t === T.BOUNCY) {
        bouncyTile(c, map, cx, cy, map.bounce.get(i) || 0, time);
      }
    }
  }
}

function cloud(c, x, y, s) {
  c.fillStyle = '#fffaf0d0';
  c.beginPath();
  c.ellipse(x, y, 46 * s, 13 * s, 0, 0, Math.PI * 2);
  c.ellipse(x - 20 * s, y - 6 * s, 22 * s, 14 * s, 0, 0, Math.PI * 2);
  c.ellipse(x + 8 * s, y - 12 * s, 26 * s, 18 * s, 0, 0, Math.PI * 2);
  c.ellipse(x + 30 * s, y - 4 * s, 20 * s, 12 * s, 0, 0, Math.PI * 2);
  c.fill();
}

function ridgeH(wx, amp, freq, seed) {
  return (Math.sin(wx * freq + seed) * 0.6 + Math.sin(wx * freq * 2.3 + seed * 2) * 0.3 + Math.sin(wx * freq * 5.1 + seed) * 0.1) * amp + amp;
}

function ridge(c, offset, viewW, baseY, amp, freq, seed, color, top, mesa = false) {
  // mesa: vlakke toppen en gelaagde wanden, zoals de Olduvai-kloof
  const hAt = x => { const h = ridgeH(x + offset, amp, freq, seed); return mesa ? Math.min(h, amp * 1.25) : h; };
  c.fillStyle = color;
  c.beginPath(); c.moveTo(-10, 2000);
  for (let x = -10; x <= viewW + 20; x += 12) c.lineTo(x, baseY - hAt(x));
  c.lineTo(viewW + 20, 2000); c.closePath(); c.fill();
  if (mesa) {
    c.save(); c.clip();
    for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#00000014' : '#ffffff12'; c.fillRect(-10, baseY - amp * 2.6 + k * 11, viewW + 30, 5 + (k % 3) * 2); }
    c.restore();
    c.strokeStyle = top; c.lineWidth = 3; c.beginPath();
    for (let x = -10; x <= viewW + 20; x += 12) c.lineTo(x, baseY - hAt(x) + 2);
    c.stroke();
    return;
  }
  if (top !== color) {
    c.strokeStyle = top; c.lineWidth = 3; c.beginPath();
    for (let x = -10; x <= viewW + 20; x += 12) c.lineTo(x, baseY - ridgeH(x + offset, amp, freq, seed) + 2);
    c.stroke();
  }
}

export function acacia(c, x, y, s, color) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = color; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(2, -30); c.lineTo(-14, -48); c.moveTo(2, -30); c.lineTo(18, -50); c.stroke();
  c.fillStyle = color;
  c.beginPath(); c.ellipse(0, -54, 44, 10, 0, 0, Math.PI * 2); c.ellipse(-14, -58, 22, 8, 0, 0, Math.PI * 2); c.ellipse(16, -59, 24, 8, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

function bush(c, x, y, s, color) {
  c.fillStyle = color;
  c.beginPath(); c.ellipse(x, y, 22 * s, 11 * s, 0, Math.PI, 0); c.ellipse(x + 14 * s, y, 14 * s, 8 * s, 0, Math.PI, 0); c.fill();
}

function antelope(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#8a6a48';
  c.beginPath(); c.ellipse(0, -14, 14, 6, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(10, -16); c.lineTo(16, -28); c.lineTo(20, -27); c.lineTo(15, -14); c.fill();
  c.strokeStyle = '#8a6a48'; c.lineWidth = 2.4;
  for (const lx of [-9, -5, 6, 10]) { c.beginPath(); c.moveTo(lx, -10); c.lineTo(lx + Math.sin(t * 6 + lx) * 2, 0); c.stroke(); }
  c.strokeStyle = '#4a3a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(17, -28); c.quadraticCurveTo(15, -36, 19, -38); c.stroke();
  c.restore();
}

// ---------------- Tegeltekeningen ----------------
function solidish(map, cx, cy) { const t = map.get(cx, cy); return t === T.GROUND || t === T.ROCK; }

function groundTile(c, map, cx, cy, theme) {
  if (theme === 'cave') return caveFloorTile(c, map, cx, cy);
  const x = cx * TILE, y = cy * TILE;
  const above = map.get(cx, cy - 1);
  const topOpen = above !== T.GROUND && above !== T.ROCK && above !== T.CRUMBLE && above !== T.BUMP && above !== T.MUD && above !== T.CLAY;
  // Hoe diep onder het oppervlak (voor kleurverloop)
  let depth = 0; while (depth < 6 && map.get(cx, cy - depth - 1) === T.GROUND) depth++;
  const soil = ['#a8743f', '#966536', '#83582f', '#734d2a', '#654427', '#5a3d24', '#513722'][depth];
  c.fillStyle = soil; c.fillRect(x, y, TILE + 0.5, TILE + 0.5);
  // Steentjes en strepen in de aarde
  for (let k = 0; k < 3; k++) {
    const r = hash(cx * 3 + k, cy);
    if (r < 0.45) continue;
    const px = x + 4 + hash(cx, cy * 7 + k) * 24, py = y + (topOpen ? 12 : 4) + hash(cx * 5 + k, cy) * (topOpen ? 16 : 24);
    c.fillStyle = r > 0.85 ? '#c9a77a' : '#00000022';
    c.beginPath(); c.ellipse(px, py, 2 + r * 2.5, 1.4 + r * 1.5, 0, 0, Math.PI * 2); c.fill();
  }
  if (hash(cx, cy * 13) > 0.93 && !topOpen) { // fossiel botje in de grond
    c.strokeStyle = '#e2d3ae88'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + 9, y + 17); c.lineTo(x + 22, y + 14); c.stroke();
  }
  const leftOpen = !solidish(map, cx - 1, cy), rightOpen = !solidish(map, cx + 1, cy);
  if (leftOpen) { c.fillStyle = '#3d2a1a55'; c.fillRect(x, y, 3, TILE); }
  if (rightOpen) { c.fillStyle = '#3d2a1a55'; c.fillRect(x + TILE - 3, y, 3, TILE); }
  // Gelaagde aarde: golvende strepen
  if (depth >= 1) { c.fillStyle = '#ffffff10'; c.beginPath(); c.moveTo(x, y + 12); for (let i = 0; i <= 4; i++) c.lineTo(x + i * 8, y + 12 + Math.sin((cx * 4 + i) * 0.9 + cy) * 2.5); c.lineTo(x + TILE, y + 16); c.lineTo(x, y + 16); c.closePath(); c.fill(); }
  if (topOpen) {
    // Volle graslaag met golvende onderrand, licht van boven en plukjes sprieten
    c.fillStyle = '#4e7a28';
    c.beginPath(); c.moveTo(x - (leftOpen ? 3 : 0), y - 1);
    for (let i = 0; i <= 8; i++) c.lineTo(x + i * 4, y + 11 + Math.sin(cx * 3.1 + i * 1.3) * 2.6 + (i % 2) * 1.5);
    c.lineTo(x + TILE + (rightOpen ? 3 : 0), y - 1); c.closePath(); c.fill();
    const gg = c.createLinearGradient(0, y - 2, 0, y + 9); gg.addColorStop(0, '#b6dc68'); gg.addColorStop(0.5, '#86b844'); gg.addColorStop(1, '#649a34');
    c.fillStyle = gg; c.beginPath(); c.moveTo(x - (leftOpen ? 3 : 0), y - 1);
    for (let i = 0; i <= 8; i++) c.lineTo(x + i * 4, y + 7 + Math.sin(cx * 2.3 + i * 1.7) * 1.8);
    c.lineTo(x + TILE + (rightOpen ? 3 : 0), y - 1); c.closePath(); c.fill();
    c.fillStyle = '#d4ef8c'; c.fillRect(x, y - 1, TILE + 0.5, 1.5);
    // Sprieten in plukjes
    for (let k = 0; k < 3; k++) {
      const gx = x + 4 + k * 11 + hash(cx, k) * 4, n = 3 + Math.floor(hash(cx * 3, k) * 3);
      for (let j = 0; j < n; j++) {
        const h = 5 + hash(cx + j, k * 7) * 7, lean = (j - n / 2) * 1.6;
        c.fillStyle = j % 2 ? '#7cb23e' : '#9cc94e';
        c.beginPath(); c.moveTo(gx + j * 1.6 - 1.2, y + 1); c.quadraticCurveTo(gx + j * 1.6 + lean * 0.4, y - h * 0.6, gx + j * 1.6 + lean, y - h); c.quadraticCurveTo(gx + j * 1.6 + lean * 0.3 + 1, y - h * 0.5, gx + j * 1.6 + 1.4, y + 1); c.closePath(); c.fill();
      }
    }
    const fl = hash(cx, 77);
    if (fl > 0.82) {
      // Bloemetje of paddenstoeltje
      const fx = x + 8 + hash(cx, 79) * 16;
      if (fl > 0.94) { c.fillStyle = '#e8dcc0'; c.fillRect(fx - 0.8, y - 5, 1.6, 5); c.fillStyle = '#c0583a'; c.beginPath(); c.ellipse(fx, y - 5, 3.4, 2.2, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(fx - 1, y - 6, 0.6, 0, Math.PI * 2); c.fill(); }
      else { c.strokeStyle = '#5e8a32'; c.lineWidth = 1; c.beginPath(); c.moveTo(fx, y); c.lineTo(fx, y - 7); c.stroke(); const col = hash(cx, 78) > 0.5 ? '#f3d55b' : '#f4f0e0'; c.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(fx + Math.cos(a) * 1.8, y - 7 + Math.sin(a) * 1.8, 1.3, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#c87a28'; c.beginPath(); c.arc(fx, y - 7, 1, 0, Math.PI * 2); c.fill(); }
    }
    // Overhangende graskrul aan open zijkanten
    if (leftOpen) { c.fillStyle = '#5e8e30'; c.beginPath(); c.ellipse(x - 1, y + 5, 4.5, 7, 0.3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#8cbc45'; c.beginPath(); c.ellipse(x, y + 2, 4, 4, 0, 0, Math.PI * 2); c.fill(); }
    if (rightOpen) { c.fillStyle = '#5e8e30'; c.beginPath(); c.ellipse(x + TILE + 1, y + 5, 4.5, 7, -0.3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#8cbc45'; c.beginPath(); c.ellipse(x + TILE, y + 2, 4, 4, 0, 0, Math.PI * 2); c.fill(); }
  }
}

function rockTile(c, map, cx, cy) {
  const x = cx * TILE, y = cy * TILE;
  const up = map.get(cx, cy - 1) === T.ROCK, down = map.get(cx, cy + 1) === T.ROCK, left = map.get(cx - 1, cy) === T.ROCK, right = map.get(cx + 1, cy) === T.ROCK;
  const g = c.createLinearGradient(x, y, x + TILE, y + TILE);
  g.addColorStop(0, '#c4b291'); g.addColorStop(0.5, '#a8967a'); g.addColorStop(1, '#887861');
  c.fillStyle = g;
  const r = 7;
  c.beginPath();
  c.roundRect(x + (left ? 0 : 1), y + (up ? 0 : 1), TILE - (left ? 0 : 1) - (right ? 0 : 1) + 0.5, TILE - (up ? 0 : 1) - (down ? 0 : 1) + 0.5,
    [up || left ? 0 : r, up || right ? 0 : r, down || right ? 0 : r, down || left ? 0 : r]);
  c.fill();
  if (!up) { c.fillStyle = '#ddd0ae'; c.fillRect(x + (left ? 0 : 5), y + 1, TILE - (left ? 0 : 5) - (right ? 0 : 5), 3); }
  if (!down) { c.fillStyle = '#6b5d4a'; c.fillRect(x + (left ? 0 : 5), y + TILE - 4, TILE - (left ? 0 : 5) - (right ? 0 : 5), 3); }
  c.strokeStyle = '#6f624e88'; c.lineWidth = 1.2;
  c.beginPath();
  const h1 = hash(cx, cy), h2 = hash(cy, cx);
  c.moveTo(x + 6 + h1 * 10, y + 8); c.lineTo(x + 12 + h2 * 8, y + 16); c.lineTo(x + 9 + h1 * 12, y + 24);
  c.stroke();
  if (!up && map.get(cx, cy - 1) === T.EMPTY && h1 > 0.5) { c.fillStyle = '#88a84a'; c.beginPath(); c.ellipse(x + 8 + h2 * 16, y + 2, 6, 2.5, 0, 0, Math.PI * 2); c.fill(); }
}

function branchTile(c, map, cx, cy) {
  const x = cx * TILE, y = cy * TILE;
  const left = map.get(cx - 1, cy) === T.BRANCH, right = map.get(cx + 1, cy) === T.BRANCH;
  c.fillStyle = '#4c3220'; c.beginPath(); c.roundRect(x + (left ? 0 : 2), y + 1, TILE - (left ? 0 : 2) - (right ? 0 : 2) + 0.5, 10, left || right ? 2 : 5); c.fill();
  c.fillStyle = '#7d5434'; c.fillRect(x + (left ? 0 : 3), y + 2, TILE - (left ? 0 : 3) - (right ? 0 : 3) + 0.5, 5);
  c.strokeStyle = '#4c322055'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6, y + 5); c.lineTo(x + 16, y + 6); c.moveTo(x + 20, y + 4); c.lineTo(x + 28, y + 5); c.stroke();
  c.fillStyle = '#6f9a3b';
  c.beginPath(); c.ellipse(x + 10, y - 1, 8, 4, -0.3, 0, Math.PI * 2); c.ellipse(x + 24, y, 7, 3.5, 0.3, 0, Math.PI * 2); c.fill();
  if (!left) { c.strokeStyle = '#4c3220'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 4, y + 9); c.lineTo(x - 2, y + 18); c.stroke(); }
}

function thornTile(c, cx, cy) {
  const x = cx * TILE, y = cy * TILE;
  c.fillStyle = '#4f5f2b'; c.beginPath(); c.ellipse(x + 16, y + 26, 16, 12, 0, Math.PI, 0); c.fill();
  c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.6; c.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const a = Math.PI + (i + 0.5) / 9 * Math.PI, x1 = x + 16 + Math.cos(a) * 12, y1 = y + 26 + Math.sin(a) * 9; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x + 16 + Math.cos(a) * 19, y + 26 + Math.sin(a) * 15); c.stroke(); }
  c.fillStyle = '#c23b3b'; for (const [dx, dy] of [[8, 20], [22, 18], [15, 23]]) { c.beginPath(); c.arc(x + dx, y + dy, 2, 0, Math.PI * 2); c.fill(); }
}

function crumbleTile(c, x, y) {
  c.fillStyle = '#d4a865'; c.beginPath(); c.roundRect(x + 1, y + 1, TILE - 2, TILE - 6, 5); c.fill();
  c.fillStyle = '#e8c88c'; c.fillRect(x + 4, y + 2, TILE - 8, 3);
  c.fillStyle = '#a77d45'; c.fillRect(x + 4, y + TILE - 8, TILE - 8, 3);
  c.strokeStyle = '#7e5a2c'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(x + 9, y + 2); c.lineTo(x + 13, y + 11); c.lineTo(x + 8, y + 18); c.moveTo(x + 13, y + 11); c.lineTo(x + 22, y + 15); c.lineTo(x + 25, y + 24); c.stroke();
}

function bumpTile(c, x, y, full, time) {
  c.fillStyle = full ? '#5b5f66' : '#857a68';
  c.beginPath(); c.roundRect(x + 1, y + 1, TILE - 2, TILE - 2, 8); c.fill();
  c.fillStyle = full ? '#7c828c' : '#9c907c'; c.fillRect(x + 5, y + 3, TILE - 10, 4);
  c.fillStyle = full ? '#3e4148' : '#6c624f'; c.fillRect(x + 5, y + TILE - 6, TILE - 10, 3);
  if (full) {
    // Glinsterende vuursteen-ader: dit blok geeft iets
    c.fillStyle = '#2d3036'; c.beginPath(); c.moveTo(x + 9, y + 10); c.lineTo(x + 22, y + 9); c.lineTo(x + 25, y + 19); c.lineTo(x + 15, y + 24); c.lineTo(x + 8, y + 18); c.closePath(); c.fill();
    const s = (Math.sin(time * 5) + 1) / 2;
    c.fillStyle = `rgba(255,248,210,${0.4 + s * 0.6})`;
    c.beginPath(); c.moveTo(x + 18, y + 11); c.lineTo(x + 19.5, y + 14); c.lineTo(x + 23, y + 15); c.lineTo(x + 19.5, y + 16); c.lineTo(x + 18, y + 19); c.lineTo(x + 16.5, y + 16); c.lineTo(x + 13, y + 15); c.lineTo(x + 16.5, y + 14); c.closePath(); c.fill();
  }
}

function springTile(c, x, y, anim, time) {
  const sq = anim > 0 ? Math.sin(anim / 0.3 * Math.PI) * 0.35 : 0;
  c.save(); c.translate(x + TILE / 2, y + TILE); c.scale(1 + sq * 0.6, 1 - sq);
  c.fillStyle = '#7a4a2a';
  c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-15, -22, -6, -30); c.lineTo(-3, -40); c.lineTo(3, -40); c.lineTo(6, -30); c.quadraticCurveTo(15, -22, 17, 0); c.closePath(); c.fill();
  c.fillStyle = '#b06f3e';
  c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-12, -20, -4, -28); c.lineTo(-1, -38); c.lineTo(2, -38); c.lineTo(4, -28); c.quadraticCurveTo(10, -20, 12, 0); c.closePath(); c.fill();
  c.fillStyle = '#5b351d';
  for (const [dx, dy] of [[-6, -10], [4, -16], [-2, -22], [6, -6]]) { c.beginPath(); c.ellipse(dx, dy, 2, 1.4, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
  // Pijltje omhoog als hint
  c.fillStyle = `rgba(255,240,180,${0.35 + Math.sin(time * 4) * 0.25})`;
  c.beginPath(); c.moveTo(x + 16, y - 20); c.lineTo(x + 11, y - 13); c.lineTo(x + 21, y - 13); c.closePath(); c.fill();
}

// ---------------- Voorwerpen ----------------
export function drawPickup(c, p, time) {
  const bob = Math.sin(time * 3 + p.x * 0.05) * 2.5;
  c.save(); c.translate(p.x, p.y + bob);
  if (p.type === 'bone') {
    c.rotate(Math.sin(time * 2 + p.x) * 0.25);
    c.strokeStyle = '#5a4630'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke();
    for (const d of [-7, 7]) { c.fillStyle = '#5a4630'; c.beginPath(); c.arc(d, -2.4, 3.6, 0, Math.PI * 2); c.arc(d, 2.4, 3.6, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#f6ecd2'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke();
    for (const d of [-7, 7]) { c.fillStyle = '#f6ecd2'; c.beginPath(); c.arc(d, -2.4, 2.4, 0, Math.PI * 2); c.arc(d, 2.4, 2.4, 0, Math.PI * 2); c.fill(); }
  } else if (p.type === 'fig') {
    c.fillStyle = '#3b1830'; c.beginPath(); c.ellipse(0, 1, 8, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8c3a6b'; c.beginPath(); c.ellipse(0, 1, 6.5, 7.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c86a9a'; c.beginPath(); c.ellipse(-2, -2, 2, 3, -0.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5e8a32'; c.beginPath(); c.ellipse(3, -8, 5, 2.4, -0.5, 0, Math.PI * 2); c.fill();
  } else if (p.type === 'flint') {
    flintIcon(c, 0, 0, 1);
    c.fillStyle = '#fff6c8'; c.font = 'bold 9px system-ui'; c.textAlign = 'center'; c.fillText('+3', 0, -12); c.textAlign = 'left';
  } else if (p.type === 'artifact') {
    const glow = c.createRadialGradient(0, 0, 2, 0, 0, 20);
    glow.addColorStop(0, '#fff3b0aa'); glow.addColorStop(1, '#fff3b000');
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
    c.rotate(Math.sin(time * 2) * 0.15);
    artifactIcon(c, 0, 0, 1.15, true);
  }
  c.restore();
}

export function flintIcon(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#1f2125'; c.beginPath(); c.moveTo(-7, 2); c.lineTo(-3, -7); c.lineTo(5, -6); c.lineTo(8, 2); c.lineTo(1, 7); c.closePath(); c.fill();
  c.fillStyle = '#5d6470'; c.beginPath(); c.moveTo(-5, 1); c.lineTo(-2, -5); c.lineTo(4, -4.5); c.lineTo(6, 1); c.lineTo(1, 5); c.closePath(); c.fill();
  c.fillStyle = '#aab3c0'; c.beginPath(); c.moveTo(-2, -4); c.lineTo(2, -4); c.lineTo(0, -1); c.closePath(); c.fill();
  c.restore();
}

export function artifactIcon(c, x, y, s, found) {
  // Oldowan-hakwerktuig: ronde kei met een paar afslagen
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = found ? '#3a2a14' : '#00000055';
  c.beginPath(); c.ellipse(0, 0, 9, 7.5, 0.2, 0, Math.PI * 2); c.fill();
  if (found) {
    c.fillStyle = '#d9b25a'; c.beginPath(); c.ellipse(0, 0, 7.5, 6, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2d98c'; c.beginPath(); c.moveTo(1, -6); c.lineTo(7, -2); c.lineTo(3, 1); c.closePath(); c.fill();
    c.fillStyle = '#a8812f'; c.beginPath(); c.moveTo(3, 1); c.lineTo(7, -2); c.lineTo(6, 4); c.closePath(); c.fill();
  }
  c.restore();
}

export function drawTree(c, x, y, s, time = 0) {
  // Acacia in het speelveld (achter de tegels)
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#5b3c26'; c.lineCap = 'round';
  c.lineWidth = 9; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4, -40, -2, -80); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.moveTo(-1, -70); c.lineTo(-30, -104); c.moveTo(0, -78); c.lineTo(28, -110); c.moveTo(-2, -80); c.lineTo(2, -112); c.stroke();
  // Platte acaciakruin van losse, wapperende blaadjes
  const cols = ['#3c6228', '#5a8a38', '#8cbc50'], sd = x * 0.013;
  c.fillStyle = '#3c6228'; c.beginPath(); c.ellipse(0, -110, 58, 9, 0, 0, Math.PI * 2); c.fill();
  leafCluster(c, -30, -116, 34, 9, { n: 18, size: 9, colors: cols, time, seed: sd, flat: true, sway: 0.22 });
  leafCluster(c, 28, -118, 38, 9, { n: 18, size: 9, colors: cols, time, seed: sd + 3, flat: true, sway: 0.22 });
  leafCluster(c, 0, -122, 50, 9, { n: 22, size: 10, colors: cols, time, seed: sd + 6, flat: true, sway: 0.2 });
  c.restore();
}

export function drawCampfire(c, x, y, lit, time) {
  c.save(); c.translate(x, y);
  // Stenen kring
  c.fillStyle = '#8b8170';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(-14 + i * 5.6, -2 - (i % 2), 4, 3, 0, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#5a3a22'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-10, -3); c.lineTo(9, -9); c.moveTo(10, -3); c.lineTo(-9, -9); c.stroke();
  if (lit) {
    for (let i = 0; i < 3; i++) {
      const f = Math.sin(time * 12 + i * 2) * 2, h = 18 + i * -4 + Math.sin(time * 9 + i) * 3;
      c.fillStyle = ['#ff8a2a', '#ffc23d', '#fff2a0'][i];
      c.beginPath(); c.moveTo(-8 + i * 3, -6); c.quadraticCurveTo(-6 + f, -h, 0 + f * 0.5, -h - 6); c.quadraticCurveTo(6 + f, -h, 8 - i * 3, -6); c.closePath(); c.fill();
    }
    const glow = c.createRadialGradient(0, -10, 2, 0, -10, 46); glow.addColorStop(0, '#ffb24a44'); glow.addColorStop(1, '#ffb24a00');
    c.fillStyle = glow; c.beginPath(); c.arc(0, -10, 46, 0, Math.PI * 2); c.fill();
  } else {
    c.fillStyle = '#ffffff55'; c.font = 'bold 10px system-ui'; c.textAlign = 'center';
    c.globalAlpha = 0.5 + Math.sin(time * 3) * 0.3; c.fillText('▲', 0, -18); c.textAlign = 'left';
  }
  c.restore();
}

export function drawShelter(c, x, y) {
  // Afdak van takken en huiden bij de finish
  c.save(); c.translate(x, y);
  c.strokeStyle = '#5b3c26'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-40, 0); c.lineTo(10, -70); c.moveTo(40, 0); c.lineTo(4, -72); c.stroke();
  c.fillStyle = '#9a6e45'; c.beginPath(); c.moveTo(-34, -6); c.lineTo(8, -66); c.lineTo(30, -6); c.closePath(); c.fill();
  c.fillStyle = '#7a5434'; c.beginPath(); c.moveTo(-20, -6); c.lineTo(7, -46); c.lineTo(18, -6); c.closePath(); c.fill();
  c.fillStyle = '#3a2618'; c.beginPath(); c.moveTo(-8, -6); c.lineTo(6, -30); c.lineTo(12, -6); c.closePath(); c.fill();
  c.restore();
}

function bouncyTile(c, map, cx, cy, anim, time) {
  // Verende acaciatak: buigt door en veert na
  const x = cx * TILE, y = cy * TILE;
  const left = map.get(cx - 1, cy) === T.BOUNCY, right = map.get(cx + 1, cy) === T.BOUNCY;
  const sag = anim > 0 ? Math.sin((0.45 - anim) / 0.45 * Math.PI * 3) * (anim / 0.45) * 7 : Math.sin(time * 2 + cx) * 0.8;
  const yy = y + 2 + sag * (left && right ? 1 : 0.6);
  c.fillStyle = '#3f2a1a'; c.beginPath(); c.roundRect(x - (left ? 1 : -2), yy, TILE + (left ? 1 : -2) + (right ? 1 : -2), 10, 4); c.fill();
  c.fillStyle = '#9a6a3c'; c.fillRect(x + (left ? 0 : 3), yy + 2, TILE - (left ? 0 : 3) - (right ? 0 : 3), 4);
  c.fillStyle = '#c99a5a'; c.fillRect(x + (left ? 0 : 4), yy + 2, TILE - (left ? 0 : 4) - (right ? 0 : 4), 1.5);
  c.fillStyle = '#7fb043';
  c.beginPath(); c.ellipse(x + 8, yy - 2, 9, 4.5, -0.4, 0, Math.PI * 2); c.ellipse(x + 23, yy - 3, 9, 4.5, 0.4, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#a7d35c'; c.beginPath(); c.ellipse(x + 15, yy - 5, 6, 3, 0, 0, Math.PI * 2); c.fill();
  if (!left) { c.strokeStyle = '#3f2a1a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + 2, yy + 6); c.quadraticCurveTo(x - 6, yy + 30, x - 4, y + 70); c.stroke(); }
  if (!right) {
    // pijltje omhoog als hint
    c.fillStyle = `rgba(255,240,180,${0.35 + Math.sin(time * 4) * 0.25})`;
    c.beginPath(); c.moveTo(x + 4, yy - 20); c.lineTo(x - 1, yy - 13); c.lineTo(x + 9, yy - 13); c.closePath(); c.fill();
  }
}

// Liaan aan een overhangende tak
export function drawLiana(c, L, time) {
  const ex = L.ax + Math.sin(L.angle) * L.len, ey = L.ay + Math.cos(L.angle) * L.len;
  // Tak waar hij aan hangt
  c.strokeStyle = '#4c3220'; c.lineWidth = 10; c.lineCap = 'round';
  c.beginPath(); c.moveTo(L.ax - 70, L.ay - 26); c.quadraticCurveTo(L.ax - 20, L.ay - 2, L.ax + 40, L.ay - 8); c.stroke();
  c.fillStyle = '#5d8a3c';
  for (const [dx, dy, r] of [[-60, -30, 26], [-20, -16, 30], [30, -16, 26], [5, -30, 22]]) { c.beginPath(); c.ellipse(L.ax + dx, L.ay + dy, r, r * 0.45, 0, 0, Math.PI * 2); c.fill(); }
  // De liaan zelf: licht gebogen touw met blaadjes
  const mx = (L.ax + ex) / 2 - Math.cos(L.angle) * L.omega * 6, my = (L.ay + ey) / 2 + Math.sin(L.angle) * L.omega * 6;
  c.strokeStyle = '#3e5a22'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(L.ax, L.ay); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
  c.strokeStyle = '#7fae3e'; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(L.ax, L.ay); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
  for (let i = 1; i < 6; i++) {
    const t = i / 6, px = (1 - t) * (1 - t) * L.ax + 2 * (1 - t) * t * mx + t * t * ex, py = (1 - t) * (1 - t) * L.ay + 2 * (1 - t) * t * my + t * t * ey;
    c.fillStyle = i % 2 ? '#6f9a3b' : '#8fbf4a';
    c.beginPath(); c.ellipse(px + (i % 2 ? 5 : -5), py, 5, 2.4, i % 2 ? 0.5 : -0.5, 0, Math.PI * 2); c.fill();
  }
  if (!L.held) {
    // Handvat-lus onderaan; knippert zacht als hint
    c.strokeStyle = `rgba(255,236,160,${0.5 + Math.sin(time * 5) * 0.3})`; c.lineWidth = 2;
    c.beginPath(); c.arc(ex, ey + 3, 6, 0, Math.PI * 2); c.stroke();
  }
}

// Grot in een rotswand: hier wacht de stam
export function drawCave(c, x, y, time) {
  c.save(); c.translate(x, y);
  const g = c.createLinearGradient(0, -260, 0, 0); g.addColorStop(0, '#b3a07c'); g.addColorStop(1, '#7c6b52');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-170, 0); c.quadraticCurveTo(-180, -120, -120, -200); c.quadraticCurveTo(-40, -280, 60, -250);
  c.quadraticCurveTo(170, -230, 220, -130); c.quadraticCurveTo(250, -60, 250, 0); c.closePath(); c.fill();
  c.strokeStyle = '#6a5a44'; c.lineWidth = 2;
  for (const [a, b, d, e] of [[-120, -150, -80, -120], [60, -210, 100, -170], [150, -120, 190, -90], [-60, -230, -20, -215]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }
  c.fillStyle = '#88a84a'; c.beginPath(); c.ellipse(-60, -262, 50, 12, -0.2, 0, Math.PI * 2); c.ellipse(70, -252, 60, 12, 0.15, 0, Math.PI * 2); c.fill();
  // Opening met warm licht van binnen
  c.fillStyle = '#1b130e';
  c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-14, -110, 60, -120); c.quadraticCurveTo(130, -110, 130, 0); c.closePath(); c.fill();
  const glow = c.createRadialGradient(60, -10, 5, 60, -10, 110); glow.addColorStop(0, 'rgba(120,96,70,0.55)'); glow.addColorStop(1, 'rgba(120,96,70,0)');
  c.fillStyle = glow; c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-14, -110, 60, -120); c.quadraticCurveTo(130, -110, 130, 0); c.closePath(); c.fill();
  // Handafdrukken op de wand (rotskunst-hint)
  c.fillStyle = '#9b4a2c88';
  for (const [hx, hy] of [[-100, -90], [165, -70]]) { c.beginPath(); c.ellipse(hx, hy, 6, 8, 0, 0, Math.PI * 2); c.fill(); for (let f = 0; f < 4; f++) { c.beginPath(); c.ellipse(hx - 5 + f * 3.4, hy - 11, 1.4, 3.5, 0, 0, Math.PI * 2); c.fill(); } }
  c.restore();
}

// Voorraadplek: een hoop keien met vuursteen (checkpoint in de tijd vóór vuur)
export function drawStoneCache(c, x, y, active, time) {
  c.save(); c.translate(x, y);
  const stones = [[-14, -4, 7], [-3, -5, 8], [9, -4, 7], [-8, -12, 6], [4, -13, 6], [-2, -19, 5]];
  for (const [sx, sy, r] of stones) {
    c.fillStyle = '#5d554a'; c.beginPath(); c.ellipse(sx, sy, r + 1, r * 0.8 + 1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#a69a85'; c.beginPath(); c.ellipse(sx - 1, sy - 1, r, r * 0.75, 0, 0, Math.PI * 2); c.fill();
  }
  if (active) {
    // Bovenop een glanzende vuursteen-afslag
    c.fillStyle = '#2a2c30'; c.beginPath(); c.moveTo(-5, -24); c.lineTo(0, -32); c.lineTo(6, -25); c.lineTo(1, -21); c.closePath(); c.fill();
    c.fillStyle = `rgba(207,224,255,${0.6 + Math.sin(time * 4) * 0.3})`; c.beginPath(); c.moveTo(-1, -29); c.lineTo(2, -27); c.lineTo(0, -25); c.closePath(); c.fill();
  } else {
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.45 + Math.sin(time * 3) * 0.3;
    c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('▲', 0, -26); c.textAlign = 'left';
  }
  c.restore();
}

// Bij de finish: verzamelde vruchten, knollen en stenen werktuigen op een groot blad
export function drawFoodCache(c, x, y) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#5f8a36'; c.beginPath(); c.ellipse(0, -2, 26, 6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#79a743'; c.beginPath(); c.ellipse(-4, -3, 20, 4, 0, 0, Math.PI * 2); c.fill();
  for (const [fx, fy] of [[-12, -7], [-5, -9], [2, -7], [-8, -13]]) { c.fillStyle = '#7c3360'; c.beginPath(); c.arc(fx, fy, 4, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#b07a48'; c.beginPath(); c.ellipse(12, -7, 7, 3.5, 0.4, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#9a8f7c'; c.beginPath(); c.ellipse(22, -4, 5, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2a2c30'; c.beginPath(); c.moveTo(26, -3); c.lineTo(31, -9); c.lineTo(34, -3); c.closePath(); c.fill();
  c.restore();
}

function roundTree(c, x, y, s, dark, light, time = 0) {
  // Boom in het galerijbos: hoge stam met ronde, bewegende kruin
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#3a2c1e'; c.fillRect(-4, -70, 8, 70);
  c.fillStyle = dark; c.beginPath(); c.arc(0, -84, 28, 0, Math.PI * 2); c.arc(-22, -72, 18, 0, Math.PI * 2); c.arc(22, -74, 20, 0, Math.PI * 2); c.fill();
  leafCluster(c, 0, -86, 34, 24, { n: 16, size: 9, colors: [dark, mixHex(dark, light, 0.5), light], time, seed: x * 0.01, sway: 0.2 });
  c.restore();
}

export function drawBigTree(c, x, groundY, topY, time = 0) {
  // Reusachtige boom in het speelveld: de takken (tegels) hangen eraan
  c.save();
  const g = c.createLinearGradient(x - 22, 0, x + 22, 0);
  g.addColorStop(0, '#3e2b1b'); g.addColorStop(0.45, '#6b4a2e'); g.addColorStop(1, '#35251a');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x - 30, groundY); c.quadraticCurveTo(x - 18, groundY - 30, x - 16, groundY - 60);
  c.lineTo(x - 14, topY + 20); c.lineTo(x + 14, topY + 20); c.lineTo(x + 16, groundY - 60); c.quadraticCurveTo(x + 18, groundY - 30, x + 30, groundY); c.closePath(); c.fill();
  c.strokeStyle = '#2c1f14'; c.lineWidth = 2;
  for (let yy = groundY - 40; yy > topY + 40; yy -= 46) { c.beginPath(); c.moveTo(x - 8, yy); c.quadraticCurveTo(x - 2, yy - 14, x + 6, yy - 22); c.stroke(); }
  const cols = ['#2f5a2c', '#4a7a3a', '#7aaa52'], sd = x * 0.01;
  c.fillStyle = '#2a4c26'; c.beginPath(); c.ellipse(x, topY - 4, 96, 40, 0, 0, Math.PI * 2); c.fill();
  leafCluster(c, x - 52, topY + 4, 46, 30, { n: 34, size: 12, colors: cols, time, seed: sd, sway: 0.16 });
  leafCluster(c, x + 54, topY, 50, 32, { n: 36, size: 12, colors: cols, time, seed: sd + 2, sway: 0.16 });
  leafCluster(c, x, topY - 22, 60, 36, { n: 44, size: 13, colors: cols, time, seed: sd + 4, sway: 0.14 });
  c.restore();
}

function caveBackground(c, camX, camY, viewW, viewH, time) {
  const g = c.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#2a2220'); g.addColorStop(0.6, '#3a2f29'); g.addColorStop(1, '#1d1714');
  c.fillStyle = g; c.fillRect(0, 0, viewW, viewH);
  // Verre rotszuilen en druipsteen, twee lagen
  for (const [f, col, w] of [[0.2, '#30282380', 90], [0.45, '#40352d', 60]]) {
    c.fillStyle = col;
    for (let i = Math.floor(camX * f / 170) - 1; i < (camX * f + viewW) / 170 + 1; i++) {
      const x = i * 170 + hash(i, f * 10) * 80 - camX * f, h = 60 + hash(i, 3) * 90;
      c.beginPath(); c.moveTo(x - w / 2, 0); c.lineTo(x + w / 2, 0); c.lineTo(x + 6, h); c.closePath(); c.fill();
      const h2 = 40 + hash(i, 5) * 70;
      c.beginPath(); c.moveTo(x - w / 2 + 40, viewH); c.lineTo(x + w / 2 + 40, viewH); c.lineTo(x + 46, viewH - h2); c.closePath(); c.fill();
    }
  }
  // Glinsterende mineralen
  for (let i = 0; i < 18; i++) {
    const x = ((hash(i, 7) * 3000 - camX * 0.3) % (viewW + 40) + viewW + 40) % (viewW + 40) - 20, y = hash(i, 8) * viewH;
    c.fillStyle = `rgba(200,220,255,${0.15 + 0.15 * Math.sin(time * 2 + i)})`; c.fillRect(x, y, 2, 2);
  }
}

function caveFloorTile(c, map, cx, cy) {
  const x = cx * TILE, y = cy * TILE;
  const above = map.get(cx, cy - 1);
  const topOpen = above !== T.GROUND && above !== T.ROCK && above !== T.CRUMBLE && above !== T.BUMP && above !== T.MUD && above !== T.CLAY;
  let depth = 0; while (depth < 4 && map.get(cx, cy - depth - 1) === T.GROUND) depth++;
  c.fillStyle = ['#6a5a4a', '#5a4c3f', '#4c4036', '#41372f', '#382f29'][depth]; c.fillRect(x, y, TILE + 0.5, TILE + 0.5);
  for (let k = 0; k < 3; k++) { const r = hash(cx * 3 + k, cy); if (r < 0.4) continue; c.fillStyle = r > 0.8 ? '#8a7a66' : '#00000026'; c.beginPath(); c.ellipse(x + 4 + hash(cx, cy * 7 + k) * 24, y + 6 + hash(cx * 5 + k, cy) * 22, 2 + r * 2, 1.5 + r, 0, 0, Math.PI * 2); c.fill(); }
  if (topOpen) { c.fillStyle = '#8c7b66'; c.fillRect(x, y, TILE + 0.5, 4); c.fillStyle = '#a8977f'; c.fillRect(x, y, TILE + 0.5, 1.5); }
}

function stalagmiteTile(c, cx, cy) {
  const x = cx * TILE, y = cy * TILE;
  for (const [dx, h, w] of [[6, 22, 7], [16, 30, 8], [26, 18, 6]]) {
    c.fillStyle = '#4a4036'; c.beginPath(); c.moveTo(x + dx - w, y + TILE); c.lineTo(x + dx + w, y + TILE); c.lineTo(x + dx, y + TILE - h); c.closePath(); c.fill();
    c.fillStyle = '#9a8a72'; c.beginPath(); c.moveTo(x + dx - w + 3, y + TILE); c.lineTo(x + dx, y + TILE); c.lineTo(x + dx, y + TILE - h + 4); c.closePath(); c.fill();
  }
}

function crackTile(c, x, y) {
  // Gebarsten rots: duidelijk anders dan gewone rots, met lichte barsten
  c.fillStyle = '#8f7f68'; c.beginPath(); c.roundRect(x + 1, y + 1, TILE - 2, TILE - 2, 5); c.fill();
  c.fillStyle = '#a8977c'; c.fillRect(x + 4, y + 3, TILE - 8, 3);
  c.strokeStyle = '#3e3428'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x + 6, y + 4); c.lineTo(x + 14, y + 14); c.lineTo(x + 10, y + 22); c.lineTo(x + 16, y + 29); c.moveTo(x + 14, y + 14); c.lineTo(x + 26, y + 10); c.moveTo(x + 21, y + 18); c.lineTo(x + 28, y + 26); c.stroke();
  c.strokeStyle = '#e8d8b0'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(x + 7, y + 4); c.lineTo(x + 15, y + 13); c.stroke();
}

function snowCaps(c, offset, viewW, baseY, amp, freq, seed) {
  // Besneeuwde toppen van de Kaukasus in de verte
  c.fillStyle = '#f4f6f8';
  for (let x = -10; x <= viewW + 20; x += 12) {
    const h = (Math.sin((x + offset) * freq + seed) * 0.6 + Math.sin((x + offset) * freq * 2.3 + seed * 2) * 0.3 + Math.sin((x + offset) * freq * 5.1 + seed) * 0.1) * amp + amp;
    if (h > amp * 1.55) { c.beginPath(); c.moveTo(x - 7, baseY - h + 9); c.lineTo(x, baseY - h - 1); c.lineTo(x + 7, baseY - h + 9); c.closePath(); c.fill(); }
  }
}

function volcano(c, x, y, time) {
  // Rokende vulkaan in de verte (Java)
  const vg = c.createLinearGradient(x - 120, 0, x + 120, 0); vg.addColorStop(0, '#6e7a76'); vg.addColorStop(0.55, '#55605c'); vg.addColorStop(1, '#3e4846');
  c.fillStyle = vg;
  c.beginPath(); c.moveTo(x - 190, y + 40); c.quadraticCurveTo(x - 80, y - 40, x - 30, y - 118); c.lineTo(x + 30, y - 118); c.quadraticCurveTo(x + 80, y - 40, x + 190, y + 40); c.closePath(); c.fill();
  // Gloeiende lavastroompjes langs de flank
  c.strokeStyle = `rgba(255,120,50,${0.45 + Math.sin(time * 2) * 0.15})`; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 8, y - 116); c.quadraticCurveTo(x - 24, y - 70, x - 40, y - 30); c.moveTo(x + 10, y - 116); c.quadraticCurveTo(x + 26, y - 80, x + 52, y - 40); c.stroke();
  const cg = c.createRadialGradient(x, y - 120, 2, x, y - 120, 60); cg.addColorStop(0, 'rgba(255,150,70,0.6)'); cg.addColorStop(1, 'rgba(255,150,70,0)');
  c.fillStyle = cg; c.beginPath(); c.arc(x, y - 120, 60, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 6; i++) {
    const t = (time * 0.15 + i / 6) % 1;
    c.fillStyle = `rgba(110,110,115,${0.45 * (1 - t)})`;
    c.beginPath(); c.arc(x + Math.sin(i * 2 + time * 0.3) * 20 + t * 60, y - 130 - t * 120, 16 + t * 34, 0, Math.PI * 2); c.fill();
  }
}

function mixHex(a, b, t) {
  const p = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const A = p(a.slice(0, 7)), B = p(b.slice(0, 7));
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function haze(c, viewW, y, color) {
  // Nevelband aan de horizon: verre dingen vervagen
  const g = c.createLinearGradient(0, y - 70, 0, y + 50);
  g.addColorStop(0, mixHex(color, '#ffffff', 0.2) + '00'); g.addColorStop(0.55, mixHex(color, '#ffffff', 0.25) + '66'); g.addColorStop(1, mixHex(color, '#ffffff', 0.2) + '00');
  c.fillStyle = g; c.fillRect(0, y - 70, viewW, 120);
}

function mudTile(c, map, cx, cy) {
  // Nat slik: donker, glanzend, met plasjes
  const x = cx * TILE, y = cy * TILE;
  c.fillStyle = '#5a4430'; c.fillRect(x, y, TILE + 0.5, TILE + 0.5);
  c.fillStyle = '#3e2e20'; c.fillRect(x, y + 10, TILE + 0.5, TILE - 10);
  c.fillStyle = '#6e5640'; c.fillRect(x, y, TILE + 0.5, 5);
  c.fillStyle = 'rgba(200,220,230,0.45)'; c.fillRect(x, y, TILE + 0.5, 1.4);
  if (hash(cx, cy) > 0.4) { c.fillStyle = 'rgba(150,180,200,0.45)'; c.beginPath(); c.ellipse(x + 8 + hash(cx, 3) * 16, y + 3, 6, 1.4, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#2e2218'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + 5 + hash(cx, k) * 22, y + 14 + hash(k, cx) * 14, 1.6, 0, Math.PI * 2); c.fill(); }
}

function clayTile(c, map, cx, cy) {
  // Kleiwand: zachte, gelaagde aarde (speren blijven erin steken)
  const x = cx * TILE, y = cy * TILE;
  const up = map.get(cx, cy - 1) === T.CLAY, left = map.get(cx - 1, cy) === T.CLAY, right = map.get(cx + 1, cy) === T.CLAY;
  c.fillStyle = '#a0683e'; c.fillRect(x, y, TILE + 0.5, TILE + 0.5);
  for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#b07448' : '#8a5634'; c.fillRect(x, y + 3 + k * 8 + Math.sin(cx + k) * 1.5, TILE + 0.5, 3); }
  c.strokeStyle = '#5a3a20'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6 + hash(cx, cy) * 10, y + 4); c.quadraticCurveTo(x + 10, y + 16, x + 4 + hash(cy, cx) * 14, y + 28); c.stroke();
  if (!left) { c.fillStyle = '#6e4428'; c.fillRect(x, y, 3, TILE); }
  if (!right) { c.fillStyle = '#6e4428'; c.fillRect(x + TILE - 3, y, 3, TILE); }
  if (!up) { c.fillStyle = '#86b044'; c.fillRect(x, y - 1, TILE + 0.5, 4); c.fillStyle = '#b4d868'; c.fillRect(x, y - 1, TILE + 0.5, 1.4); }
}
