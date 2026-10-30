import { TILE } from './config.js';
import { T } from './level.js';

const CHUNK = 16; // tegels per voorgetekend stuk

// Deterministische "willekeur" zodat het landschap elke keer hetzelfde is.
export function hash(a, b = 0) { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }

// ---------------- Achtergrond ----------------
const THEMES = {
  gorge: {
    sky: ['#4f9fd0', '#a9d4d8', '#f7d49a'], sun: '#fff0b8',
    far: '#c68a5a', farTop: '#dcae7c', mid: '#b5774a', midDark: '#8d9a52', near: '#9aa65a', acacia: '#5d6f3c',
    mesa: true,
  },
  savanna: {
    sky: ['#5fb3d9', '#9fd6dc', '#f6e2a8'], sun: '#fff4c4',
    far: '#9cb6b4', farTop: '#b9cdc4', mid: '#9fb46c', midDark: '#7f9a55', near: '#86a64c', acacia: '#5a7840',
  },
};

export class Renderer {
  constructor() { this.chunks = new Map(); this.k = 1; this.mapVersion = -1; }

  setResolution(k) { if (Math.abs(k - this.k) > 0.001) { this.k = k; this.chunks.clear(); } }

  background(c, theme, camX, camY, viewW, viewH, levelH, time) {
    const th = THEMES[theme] || THEMES.savanna;
    const g = c.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
    c.fillStyle = g; c.fillRect(0, 0, viewW, viewH);

    // Zon met gloed
    const sx = viewW * 0.78 - camX * 0.02, sy = viewH * 0.2;
    const glow = c.createRadialGradient(sx, sy, 4, sx, sy, 140);
    glow.addColorStop(0, '#fff8d8cc'); glow.addColorStop(0.3, '#ffeeb055'); glow.addColorStop(1, '#ffeeb000');
    c.fillStyle = glow; c.fillRect(sx - 140, sy - 140, 280, 280);
    c.fillStyle = th.sun; c.beginPath(); c.arc(sx, sy, 24, 0, Math.PI * 2); c.fill();

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
    ridge(c, camX * 0.1, viewW, yOf(0.1, 112), 46, 0.0035, 7, th.far, th.farTop, th.mesa);
    // Middenheuvels met acacia's
    const midY = yOf(0.3, 70);
    ridge(c, camX * 0.3, viewW, midY, 20, 0.006, 3, th.mid, th.mid, th.mesa);
    for (let i = Math.floor(camX * 0.3 / 230) - 1; i < (camX * 0.3 + viewW) / 230 + 1; i++) {
      if (hash(i, 9) < 0.35) continue;
      const wx = i * 230 + hash(i, 4) * 120, x = wx - camX * 0.3;
      acacia(c, x, midY + 6 - ridgeH(wx, 20, 0.006, 3), 0.55 + hash(i, 5) * 0.35, th.acacia);
    }
    // Dichtbij: struikenrand
    const nearY = yOf(0.55, 30);
    ridge(c, camX * 0.55, viewW, nearY, 9, 0.012, 11, th.near, th.midDark);
    for (let i = Math.floor(camX * 0.55 / 140) - 1; i < (camX * 0.55 + viewW) / 140 + 1; i++) {
      const wx = i * 140 + hash(i, 6) * 80, x = wx - camX * 0.55;
      bush(c, x, nearY + 4 - ridgeH(wx, 9, 0.012, 11), 0.8 + hash(i, 7) * 0.6, th.midDark);
    }
    // Kudde ver weg
    const herdX = ((900 - camX * 0.3 + time * 8) % 2600 + 2600) % 2600 - 300;
    for (let k = 0; k < 4; k++) antelope(c, herdX + k * 26 + hash(k) * 10, midY + 2 - ridgeH(herdX + camX * 0.3, 20, 0.006, 3) + hash(k, 1) * 6, 0.45, time + k);
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
    const a = Math.max(0, Math.floor(camX / TILE) - 1), b = Math.min(map.w - 1, Math.ceil((camX + viewW) / TILE) + 1);
    let run = null;
    const flush = () => {
      if (!run) return;
      const { x1, x2, y } = run;
      const g = c.createLinearGradient(0, y, 0, levelH);
      g.addColorStop(0, '#3f9fb0cc'); g.addColorStop(0.3, '#2a6f86dd'); g.addColorStop(1, '#123744f0');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(x1, levelH + 10);
      for (let x = x1; x <= x2; x += 6) c.lineTo(x, y + Math.sin(x * 0.05 + time * 3) * 1.6);
      c.lineTo(x2, levelH + 10); c.closePath(); c.fill();
      c.strokeStyle = '#c8f0f0aa'; c.lineWidth = 1.5; c.beginPath();
      for (let x = x1; x <= x2; x += 6) c.lineTo(x, y + Math.sin(x * 0.05 + time * 3) * 1.6);
      c.stroke();
      c.fillStyle = '#e8ffff66';
      for (let x = x1 + 10; x < x2; x += 37) { const o = (time * 18 + x) % 37; c.fillRect(x + o * 0.3, y + 6 + (x % 3) * 4, 8, 1.4); }
      run = null;
    };
    for (let cx = a; cx <= b; cx++) {
      let top = -1;
      for (let cy = 0; cy < map.h; cy++) if (map.get(cx, cy) === T.WATER) { top = cy; break; }
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
      if (t === T.GROUND) groundTile(c, map, cx, cy);
      else if (t === T.ROCK) rockTile(c, map, cx, cy);
      else if (t === T.BRANCH) branchTile(c, map, cx, cy);
      else if (t === T.THORNS) thornTile(c, cx, cy);
    }
    return cv;
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

function groundTile(c, map, cx, cy) {
  const x = cx * TILE, y = cy * TILE;
  const above = map.get(cx, cy - 1);
  const topOpen = above !== T.GROUND && above !== T.ROCK && above !== T.CRUMBLE && above !== T.BUMP;
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
  if (topOpen) {
    // Grasrand met onregelmatige onderkant en sprietjes
    c.fillStyle = '#5c8a2e';
    c.beginPath(); c.moveTo(x, y);
    for (let i = 0; i <= 4; i++) c.lineTo(x + i * 8, y + 9 + Math.sin(cx * 3.1 + i * 1.7) * 2.5);
    c.lineTo(x + TILE, y); c.closePath(); c.fill();
    c.fillStyle = '#8cbc45'; c.fillRect(x, y, TILE + 0.5, 5);
    c.fillStyle = '#b4d965'; c.fillRect(x, y, TILE + 0.5, 1.6);
    c.strokeStyle = '#7aab3d'; c.lineWidth = 1.4; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const gx = x + 3 + i * 6.5 + hash(cx, i) * 3, h = 3 + hash(cx * 2, i) * 5;
      c.beginPath(); c.moveTo(gx, y + 1); c.lineTo(gx + (hash(i, cx) - 0.5) * 3, y - h); c.stroke();
    }
    if (hash(cx, 77) > 0.86) { c.fillStyle = hash(cx, 78) > 0.5 ? '#f3d55b' : '#f4f0e0'; c.beginPath(); c.arc(x + 16, y - 5, 2.2, 0, Math.PI * 2); c.fill(); }
    if (leftOpen) { c.fillStyle = '#8cbc45'; c.beginPath(); c.arc(x + 2, y + 3, 4, 0, Math.PI * 2); c.fill(); }
    if (rightOpen) { c.fillStyle = '#8cbc45'; c.beginPath(); c.arc(x + TILE - 2, y + 3, 4, 0, Math.PI * 2); c.fill(); }
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

export function drawTree(c, x, y, s) {
  // Acacia in het speelveld (achter de tegels)
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#5b3c26'; c.lineCap = 'round';
  c.lineWidth = 9; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4, -40, -2, -80); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.moveTo(-1, -70); c.lineTo(-30, -104); c.moveTo(0, -78); c.lineTo(28, -110); c.moveTo(-2, -80); c.lineTo(2, -112); c.stroke();
  const leaf = (lx, ly, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  leaf(0, -112, 66, 14, '#4f7434'); leaf(-28, -118, 34, 12, '#5d8a3c'); leaf(26, -120, 38, 12, '#5d8a3c'); leaf(0, -124, 28, 9, '#79a64a');
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
