// De reiskaart, zoals een wereldkaart in Mario: herkenbare gebieden per wereld, en een kronkelpad
// dat om meren heen loopt, over bruggen en ijs gaat en bergen op zigzagt. Een poppetje van de juiste
// mensensoort wandelt over het pad naar het gekozen level. Swipen om te schuiven, tikken om te kiezen.
import { hash, ell, cloud, plankBoard, logSlice } from './title.js';
import { SPECIES } from './species.js';

const MH = 180, MW = 1420;
// Plek van elk level op de kaart (in kaartpixels)
const NODES = {
  '1-1': [50, 118], '1-2': [112, 100], '1-3': [170, 70], '1-4': [236, 104],
  '2-1': [300, 120], '2-2': [356, 66], '2-3': [462, 116], '2-4': [556, 110],
  '3-1': [622, 134], '3-2': [680, 82], '3-3': [726, 110], '3-4': [792, 84],
  '4-1': [870, 96], '4-2': [938, 100], '4-3': [990, 50], '4-4': [1062, 140],
  '5-1': [1122, 120], '5-2': [1180, 152], '5-3': [1246, 84], '5-4': [1314, 102],
};
const NEXT = [1378, 120];   // extra afleveringen: nog op slot
// Tussenpunten van het pad náár elk level: om meren heen, over de kloof, bergop in bochten
const VIA = {
  '1-1': [[10, 124], [28, 130]],
  '1-2': [[70, 128], [90, 124], [102, 110]],
  '1-3': [[126, 100], [142, 96], [152, 84]],
  '1-4': [[190, 62], [212, 64], [226, 82]],
  '2-1': [[248, 124], [270, 134], [286, 130]],
  '2-2': [[318, 112], [332, 98], [340, 88], [326, 80], [342, 72]],
  '2-3': [[372, 84], [386, 104], [400, 122], [414, 130], [428, 128], [442, 124]],
  '2-4': [[480, 142], [494, 150], [510, 146], [526, 134], [540, 122]],
  '3-1': [[572, 98], [588, 94], [604, 108], [612, 124]],
  '3-2': [[640, 124], [652, 106], [664, 92]],
  '3-3': [[698, 90], [712, 102]],
  '3-4': [[740, 100], [756, 86], [774, 78]],
  '4-1': [[812, 72], [832, 66], [852, 80]],
  '4-2': [[888, 112], [902, 118], [920, 114]],
  '4-3': [[954, 88], [968, 76], [956, 64], [972, 54]],
  '4-4': [[1008, 64], [1020, 88], [1030, 110], [1044, 128]],
  '5-1': [[1080, 146], [1096, 142], [1108, 132]],
  '5-2': [[1140, 132], [1158, 146]],
  '5-3': [[1198, 140], [1210, 118], [1226, 96]],
  '5-4': [[1266, 90], [1280, 102], [1296, 110]],
  next: [[1336, 110], [1358, 118]],
};
const SIGNS = [[14, 150, '1 · Homo habilis', 'Oost-Afrika'], [262, 14, '2 · Homo erectus', 'Afrika uit'], [586, 14, '3 · Homo heidelbergensis', 'Europa'],
  [818, 150, '4 · Neanderthalers', 'De IJstijd'], [1100, 14, '5 · Homo sapiens', 'Wij'], [1350, 150, 'Extra', 'binnenkort']];

// Ondergrond per x: savanne → galerijbos → rotsheuvels → grasland → bergweide → oerwoud → rode woestijn →
// groen Europa → sneeuw → kalksteen → woestijn → fynbos → koude steppe → kalksteenkloof → mist
const BANDS = [[0, ['#c8c068', '#b8b05a', '#d6ce78']], [140, ['#7aa850', '#6a9844', '#8ab85e']], [222, ['#b8a070', '#a89060', '#c8b080']],
  [252, ['#9ab868', '#88a85a', '#acc678']], [322, ['#9aa478', '#8a946a', '#aab488']], [406, ['#4e8a3a', '#3e7a30', '#5e9a48']],
  [505, ['#c89a5a', '#b8884c', '#d6aa6a']], [572, ['#86bc5c', '#74aa4e', '#98ca6a']], [810, ['#e8f0f4', '#d4e2ea', '#f6fafc']],
  [1032, ['#c8c2a8', '#b4ae94', '#d8d4be']], [1094, ['#d8c08a', '#c8ae78', '#e6d09a']], [1162, ['#9ab868', '#88a85a', '#acc678']],
  [1200, ['#d8dcd0', '#c4c8bc', '#eceee6']], [1298, ['#c4b89c', '#b0a488', '#d4c8ac']], [1345, ['#c8c8c0', '#b4b4ac', '#dcdcd4']]];
// Grillige grens tussen twee gebieden (geen rechte strepen)
const edge = (y, i) => Math.sin(y * 0.045 + i * 1.7) * 11 + Math.sin(y * 0.12 + i * 3.1) * 6 + Math.sin(y * 0.31 + i) * 2;
function groundAt(x, y) {
  let i = 0; while (i < BANDS.length - 1 && x >= BANDS[i + 1][0] + edge(y, i) + (((x + y) % 2) ? 2 : 0)) i++;
  const p = BANDS[i][1], n = hash(Math.floor(x / 3), Math.floor(y / 3));
  return n > 0.82 ? p[2] : n < 0.18 ? p[1] : p[0];
}
const wob = (x, y, s) => Math.sin(x * 0.11 + s) * 3 + Math.sin(x * 0.037 + y * 0.05 + s) * 4;
// Zee: de zeestraat naar Java (met het eiland), de krijtkust, de straat van Gibraltar en de kust van Zuid-Afrika
function isSea(x, y) {
  // Zeestraat met het eiland Java: grillige kusten links en rechts
  if (x >= 400 + edge(y, 20) * 0.8 && x <= 507 + edge(y, 21) * 0.8) { const dx = (x - 462) / 26, dy = (y - 108) / 40; return dx * dx + dy * dy + (hash(x >> 2, y >> 2) - 0.5) * 0.18 >= 1; }
  // Straat van Gibraltar
  if (x >= 1068 + edge(y, 22) * 0.5 && x <= 1092 + edge(y, 23) * 0.5) return true;
  // Baaien aan de onderkant: krijtkust, kust bij Gibraltar, kust van Zuid-Afrika
  const bay = (x1, x2, top, s2) => x > x1 - 12 && x < x2 + 12 && y > top + wob(x, 0, s2) * 0.7 + Math.max(0, x1 - x) * 2.2 + Math.max(0, x - x2) * 2.2;
  return bay(600, 658, 150, 1) || bay(1036, 1068, 156, 2) || bay(1154, 1212, 164, 3);
}

function bakeMap() {
  const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const c = cv.getContext('2d');
  const mask = new Uint8Array(MW * MH);   // 1 = water (brug nodig), 2 = ijs
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (isSea(x, y)) { mask[y * MW + x] = 1; const shore = !isSea(x - 2, y) || !isSea(x + 2, y) || !isSea(x, y - 2) || !isSea(x, y + 2);
      px(x, y, shore ? '#9ad4e8' : (x * 3 + y * 7) % 23 === 0 ? '#7ac0d8' : y % 9 === 0 && (x + (y >> 1)) % 7 < 3 ? '#4e9ac4' : '#3e8ab4'); }
    else px(x, y, groundAt(x, y));
  }
  const water = (cx, cy, rx, ry, seed, ice) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const d = (x / rx) ** 2 + (y / ry) ** 2 + (hash(x >> 2, (y >> 2) + seed) - 0.5) * 0.25; if (d < 1) { mask[(cy + y) * MW + cx + x] = ice ? 2 : 1; px(cx + x, cy + y, ice ? (d > 0.8 ? '#e8f6fc' : (x + y) % 7 === 0 ? '#ffffff' : '#b8dcec') : d > 0.8 ? '#9ad4e8' : (x + y * 3 + seed) % 11 === 0 ? '#9ad4e8' : '#3e8ab4'); } } };
  const river = (x0, seed, w, ice, y0 = 0, y1 = MH) => { for (let y = y0; y < y1; y++) { const cx = Math.round(x0 + Math.sin(y * 0.09 + seed) * 3 + Math.sin(y * 0.031 + seed) * 4); for (let x = cx - w; x <= cx + w; x++) { mask[y * MW + x] = ice ? 2 : 1; px(x, y, Math.abs(x - cx) === w ? (ice ? '#e8f6fc' : '#9ad4e8') : ice ? ((x + y) % 6 === 0 ? '#ffffff' : '#b8dcec') : (y + x) % 9 === 0 ? '#7ac0d8' : '#3e8ab4'); } } };
  const mountain = (x, y, w, h, snow, col = ['#9a8a74', '#7a6c5a']) => { for (let i = 0; i < h; i++) { const hw = Math.round(w * i / h); for (let k = -hw; k <= hw; k++) px(x + k, y - h + i, snow && i < h * 0.3 ? (k < 0 ? '#ffffff' : '#d8e4ec') : k < 0 ? col[0] : col[1]); } c.fillStyle = '#5e5242'; c.fillRect(x - w, y, w * 2, 1); };
  const acacia = (x, y, s = 1) => { c.fillStyle = '#5a4a30'; c.fillRect(x, y - 6 * s, 1, 6 * s); ell(c, x, y - 7 * s, 6 * s, 2 * s, '#4e7a34'); ell(c, x - 1, y - 8 * s, 4 * s, 1, '#6e9a44'); };
  const tree = (x, y, cols) => { c.fillStyle = '#4e3a24'; c.fillRect(x, y - 3, 1, 3); ell(c, x, y - 5, 3, 3, cols[0]); ell(c, x - 1, y - 6, 1, 1, cols[1]); };
  const palm = (x, y) => { c.fillStyle = '#5a4a30'; c.fillRect(x, y - 9, 1, 9); for (const d of [-1, 1]) { c.fillStyle = '#2e7a2c'; c.fillRect(x + d, y - 10, d * 4, 1); c.fillRect(x + d * 4, y - 9, d, 2); c.fillRect(x + d * 2, y - 11, d * 2, 1); } };
  const pine = (x, y, snow) => { for (let i = 0; i < 8; i++) { const w = Math.floor(i / 2) + 1; c.fillStyle = snow && i % 3 === 0 ? '#ffffff' : '#2e5a3a'; c.fillRect(x - w, y - 9 + i, w * 2 + 1, 1); } c.fillStyle = '#4e3a24'; c.fillRect(x, y - 1, 1, 2); };
  const cave = (x, y, rock = ['#8a7a64', '#a89878']) => { ell(c, x, y - 6, 12, 8, rock[0]); ell(c, x - 2, y - 9, 8, 4, rock[1]); ell(c, x + 2, y - 3, 4, 4, '#1e140c'); };
  const mammoth = (x, y) => { ell(c, x, y, 7, 4, '#6a4a30'); ell(c, x + 6, y - 3, 3, 3, '#6a4a30'); c.fillStyle = '#6a4a30'; for (const lx of [-5, -2, 2, 5]) c.fillRect(x + lx, y + 3, 1, 3); c.fillRect(x + 8, y - 2, 1, 6); c.fillStyle = '#f4f0e0'; c.fillRect(x + 7, y + 1, 3, 1); };
  const near = (x, y, r = 12) => Object.values(NODES).some(([nx, ny]) => Math.abs(nx - x) < r && Math.abs(ny - y) < r);

  // ── Wereld 1: savanne, de Olduvai-kloof met rivier, het galerijbos bij het Turkanameer, rotsheuvels met de grot
  for (let x = 114; x <= 136; x++) for (let y = 0; y < MH; y++) { const e = Math.abs(x - 125 - Math.sin(y * 0.09) * 3 - Math.sin(y * 0.031) * 4); if (e < 11) px(x, y, e > 9 ? '#6a4a2a' : e > 7 ? '#8a6a44' : '#a07a4a'); }
  river(125, 0, 2, false);
  water(200, 104, 12, 24, 1);
  for (let i = 0; i < 16; i++) { const x = Math.round(8 + hash(i, 1) * 104), y = Math.round(40 + hash(i, 2) * 130); if (!near(x, y)) acacia(x, y, hash(i, 3) > 0.7 ? 2 : 1); }
  for (let i = 0; i < 30; i++) { const x = Math.round(142 + hash(i, 4) * 80), y = Math.round(30 + hash(i, 5) * 140); if (Math.abs(x - 200) < 16 && Math.abs(y - 104) < 28) continue; if (!near(x, y, 9)) tree(x, y, ['#2e6a2c', '#5a9a40']); }
  mountain(232, 96, 10, 14, false, ['#b09070', '#907054']); cave(240, 112);
  // ── Wereld 2: grasland, de bergen van Dmanisi, de zeestraat naar Java met de vulkaan, rode rotsen met de Wonderwerk-grot
  for (let i = 0; i < 8; i++) { const x = Math.round(256 + hash(i, 7) * 60), y = Math.round(90 + hash(i, 8) * 80); if (!near(x, y)) acacia(x, y); }
  mountain(312, 76, 14, 30, true); mountain(392, 62, 18, 42, true); mountain(362, 50, 16, 28, true); mountain(380, 160, 14, 26, false);
  for (let i = 0; i < 10; i++) { const x = Math.round(442 + hash(i, 9) * 40), y = Math.round(80 + hash(i, 10) * 60); if (!near(x, y, 8)) palm(x, y); }
  for (let i = 0; i < 16; i++) { const w = Math.round(i * 0.9) + 1; px(474 - w, 70 + i, i < 3 ? '#e8602a' : '#6a5a4e'); c.fillStyle = i < 3 ? '#e8602a' : '#6a5a4e'; c.fillRect(474 - w, 70 + i, w * 2, 1); }
  for (let i = 0; i < 4; i++) { const r = 2 + i; ell(c, 476 + i * 2, 62 - i * 7, r, Math.max(1, r - 1), i < 2 ? '#b8b0a8' : '#d8d4d0'); }
  for (let i = 0; i < 6; i++) { const x = 514 + i * 10, h = 6 + Math.round(hash(i, 6) * 8), y = 80 + (i % 3) * 30; c.fillStyle = '#a85a34'; c.fillRect(x, y - h, 9, h); c.fillStyle = '#c8784a'; c.fillRect(x, y - h, 9, 2); }
  cave(562, 104, ['#a85a34', '#c8784a']);
  // ── Wereld 3: krijtkust met witte kliffen, de heuvels van Atapuerca, de put, het meer van Schöningen
  for (let x = 588; x <= 670; x++) { let top = 0; while (top < MH && !isSea(x, top)) top++; if (top >= MH) continue; c.fillStyle = '#f4f2ea'; c.fillRect(x, top - 4, 1, 4); c.fillStyle = '#d8d6ce'; c.fillRect(x, top - 1, 1, 1); }   // witte krijtkliffen
  for (const [hx, hy, w] of [[662, 66, 26], [700, 60, 22], [690, 140, 20]]) { ell(c, hx, hy, w, 9, '#6aa04a'); ell(c, hx - 6, hy - 3, Math.round(w * 0.6), 4, '#82b85a'); }
  ell(c, 732, 120, 8, 5, '#3a2e22'); ell(c, 732, 120, 6, 3, '#140c08');
  water(798, 110, 16, 9, 4); for (let i = 0; i < 10; i++) { c.fillStyle = '#5a7a34'; c.fillRect(780 + i * 4, 100 + (i % 3), 1, 4); }
  for (let i = 0; i < 26; i++) { const x = Math.round(576 + hash(i, 11) * 232), y = Math.round(30 + hash(i, 12) * 115); if (near(x, y, 10) || (Math.abs(x - 798) < 20 && Math.abs(y - 110) < 12) || (Math.abs(x - 732) < 10 && Math.abs(y - 120) < 8)) continue; hash(i, 13) > 0.6 ? pine(x, y, false) : tree(x, y, ['#3e7a34', '#78b04e']); }
  // ── Wereld 4: sneeuwsteppe met mammoeten, een bevroren rivier, het Altaj-gebergte met de Denisova-grot, de rots van Gibraltar
  for (let i = 0; i < 18; i++) { const x = Math.round(812 + hash(i, 14) * 220), y = Math.round(30 + hash(i, 15) * 135); if (near(x, y, 10) || Math.abs(x - 910) < 8) continue; pine(x, y, true); }
  mammoth(846, 132); mammoth(864, 140); mammoth(892, 60);
  river(910, 2, 3, true);
  mountain(964, 84, 20, 44, true); mountain(1014, 80, 22, 50, true); mountain(990, 64, 18, 40, true); ell(c, 990, 56, 4, 3, '#1e140c');
  for (let x = 1036; x < 1066; x++) { const top = 104 + Math.round(Math.abs(x - 1050) * 1.6); for (let y = top; y < 154; y++) px(x, y, (x + y) % 9 === 0 ? '#a8a294' : x < 1050 ? '#e0dccc' : '#c4beae'); }
  // ── Wereld 5: woestijn en het Atlasgebergte, de kust van Zuid-Afrika, de koude steppe aan de Don, de Chauvet-kloof
  mountain(1112, 100, 16, 28, false, ['#c09868', '#a07c50']); mountain(1144, 104, 14, 24, false, ['#c09868', '#a07c50']);
  for (let i = 0; i < 6; i++) { const x = Math.round(1098 + hash(i, 16) * 60), y = Math.round(126 + hash(i, 17) * 30); if (!near(x, y)) acacia(x, y); }
  cave(1192, 148);
  river(1272, 4, 2, false);
  ell(c, 1246, 98, 7, 4, '#7a6a54'); ell(c, 1246, 96, 5, 2, '#9a8a70'); c.fillStyle = '#f4f0e0'; for (const dx of [-6, -3, 0, 3, 6]) c.fillRect(1246 + dx, 93 + Math.abs(dx) / 2, 1, 5);
  for (let i = 0; i < 8; i++) { const x = Math.round(1206 + hash(i, 18) * 60), y = Math.round(30 + hash(i, 19) * 130); if (!near(x, y, 10) && Math.abs(x - 1272) > 8) pine(x, y, true); }
  mountain(1318, 92, 18, 30, false, ['#d4c8ac', '#b0a488']); ell(c, 1318, 86, 4, 4, '#1e140c'); c.fillStyle = '#b8402a'; c.fillRect(1308, 76, 2, 3);
  c.globalAlpha = 0.45; c.fillStyle = '#ffffff'; for (let y = 0; y < MH; y++) for (let x = 1345 + (y % 2); x < MW; x += 2) if (hash(x >> 3, y >> 2) > 0.45) c.fillRect(x, y, 1, 1); c.globalAlpha = 1;
  cloud(c, 140, 20, 12); cloud(c, 420, 16, 10); cloud(c, 760, 22, 14); cloud(c, 1180, 18, 12);
  return { cv, mask };
}

// Pad door alle punten (Catmull-Rom). Elk punt: [x, y, level waar dit stuk naartoe leidt]
function trail(pts, segOf) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), segOf[i + 1], i]); }
  }
  out.push([...pts[pts.length - 1], segOf[pts.length - 1], pts.length - 1]);
  return out;
}

// Poppetje op de kaart: 9 bij 13 pixels, in de kleuren van de mensensoort
function walkerSprite(look, frame) {
  const cv = document.createElement('canvas'); cv.width = 9; cv.height = 13; const c = cv.getContext('2d');
  const fur = look.fur || '#5a3e28', skin = look.skin || '#8a6040', hair = look.hair || '#2a1a10';
  const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  r(3, 0, 3, 1, hair); r(2, 1, 5, 3, '#1e140c'); r(3, 1, 3, 3, skin); r(5, 2, 1, 1, '#1e140c');
  r(2, 4, 5, 5, '#1e140c'); r(3, 5, 3, 3, fur); r(1, 5, 1, 3, skin); r(7, 5, 1, 3, skin);
  if (frame) { r(2, 9, 2, 4, '#1e140c'); r(5, 9, 2, 3, '#1e140c'); r(3, 10, 1, 2, skin); }
  else { r(3, 9, 3, 4, '#1e140c'); r(4, 10, 1, 2, skin); }
  return cv;
}

const CSS = `
#mapView{position:absolute;inset:0;z-index:6;background:#2a1a0c;display:flex;flex-direction:column}
#mapView[hidden]{display:none}
#mapScroll{position:relative;flex:1;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;cursor:grab}
#mapScroll::-webkit-scrollbar{display:none}
#mapInner{position:relative;height:100%}
#mapInner canvas{position:absolute;left:0;top:0;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.mnode{position:absolute;width:38px;height:38px;margin:-19px 0 0 -19px;padding:0;border:none;border-radius:50%;background:transparent center/100% 100% no-repeat;image-rendering:pixelated;font:900 12px system-ui,sans-serif;color:#3a2210;box-shadow:none;filter:drop-shadow(0 3px 0 #0006);cursor:pointer}
.mnode.locked{filter:grayscale(1) brightness(.75) drop-shadow(0 3px 0 #0006);color:#3a3a3a}
.mnode.sel{outline:3px solid #ffe46a;outline-offset:2px}
.mnode .art{position:absolute;left:50%;top:100%;transform:translateX(-50%);font-size:10px;color:#ffe46a;text-shadow:0 1px 0 #2a1a0c,1px 0 #2a1a0c,-1px 0 #2a1a0c;white-space:nowrap;letter-spacing:1px}
.mwalker{position:absolute;pointer-events:none;image-rendering:pixelated;image-rendering:crisp-edges;z-index:3;filter:drop-shadow(0 2px 0 #0008)}
.msign{position:absolute;padding:4px 10px;background:#7a5030;border:2px solid #2a1a0c;box-shadow:inset 0 2px 0 #a8743e,0 3px 0 #0006;color:#fff3c0;font:800 12px system-ui,sans-serif;white-space:nowrap;pointer-events:none}
.msign small{display:block;font-weight:600;font-size:10px;color:#f6cf75}
.mtop{position:absolute;top:max(8px,var(--sat));left:max(10px,var(--sal));right:max(10px,var(--sar));display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none;z-index:2}
.mtop>*{pointer-events:auto}
.mtitle{padding:6px 14px;background:#7a5030;border:3px solid #2a1a0c;box-shadow:inset 0 2px 0 #a8743e,0 4px 0 #0006;color:#ffe46a;font:900 18px system-ui,sans-serif;text-shadow:0 2px 0 #3a1e0c}
.minfo{position:relative;display:flex;justify-content:center;align-items:center;gap:18px;padding:6px max(16px,var(--sar)) max(6px,var(--sab)) max(16px,var(--sal));background:#6e4624;border-top:3px solid #2a1a0c;box-shadow:inset 0 2px 0 #a8743e;color:#fff3c0;font:600 13px system-ui,sans-serif;z-index:2}
.minfo b{display:block;font-size:16px;color:#ffe46a}
.minfo .art2{color:#ffe46a;letter-spacing:2px}
.minfo button.plank{padding:10px 20px 11px;font-size:18px}
.minfo button.plank:disabled{filter:grayscale(1) opacity(.6)}
`;

export class JourneyMap {
  constructor(root, { levels, save, onPlay }) {
    this.levels = levels; this.save = save; this.onPlay = onPlay;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const el = this.el = document.createElement('div'); el.id = 'mapView'; el.hidden = true;
    el.innerHTML = `<div id="mapScroll"><div id="mapInner"><canvas></canvas></div></div>
      <div class="mtop"><div class="mtitle">De reiskaart</div><button class="plank" id="mapClose" aria-label="Sluiten">✕</button></div>
      <div class="minfo"><div><b class="mi-name"></b><span class="mi-where"></span><br><span class="art2"></span></div><button class="plank p-play" id="mapPlay">▶ Spelen</button></div>`;
    root.appendChild(el);
    this.scroll = el.querySelector('#mapScroll'); this.inner = el.querySelector('#mapInner'); this.cv = el.querySelector('canvas');
    const { cv: map, mask } = bakeMap(); this.map = map; this.mask = mask;
    // Pad: start → (tussenpunten → level) × n → extra. Per punt onthouden naar welk level het leidt.
    const pts = [[6, 120]], segOf = [0], nodePt = [];
    levels.forEach((L, i) => { for (const v of VIA[L.id] || []) { pts.push(v); segOf.push(i); } pts.push(NODES[L.id] || [0, 0]); segOf.push(i); nodePt.push(pts.length - 1); });
    for (const v of VIA.next) { pts.push(v); segOf.push(levels.length); } pts.push(NEXT); segOf.push(levels.length);
    this.path = trail(pts, segOf);
    this.nodeIdx = nodePt.map(j => this.path.findIndex(q => q[3] === j));
    this.walkFrames = {};
    el.querySelectorAll('button.plank').forEach((b, i) => { b.style.backgroundImage = `url(${plankBoard(64, 1, 18, 11 + i * 3).toDataURL()})`; });
    this.slice = logSlice(['0000000'], 9).toDataURL();
    el.querySelector('#mapClose').addEventListener('click', e => { e.preventDefault(); this.close(); });
    el.querySelector('#mapPlay').addEventListener('click', e => { e.preventDefault(); if (this.sel != null && this.sel < this.save.unlocked) this.onPlay(this.sel); });
    // Slepen met de muis; wieltje schuift horizontaal
    let drag = null;
    this.scroll.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.target.closest('button')) return; drag = { x: e.clientX, s: this.scroll.scrollLeft }; this.scroll.style.cursor = 'grabbing'; });
    addEventListener('pointermove', e => { if (drag) this.scroll.scrollLeft = drag.s - (e.clientX - drag.x); });
    addEventListener('pointerup', () => { drag = null; this.scroll.style.cursor = ''; });
    this.scroll.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { this.scroll.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    addEventListener('resize', () => { if (!this.el.hidden) this.layout(); });
  }
  open() { this.el.hidden = false; this.layout(true); }
  close() { this.el.hidden = true; }
  // Pad, knopen en borden op de juiste schaal neerzetten
  layout(center) {
    const k = this.scroll.clientHeight / MH, cv = this.cv, c = cv.getContext('2d');
    const done = Math.min(this.save.unlocked, this.levels.length);   // levels 0..done-1 zijn open
    cv.width = MW; cv.height = MH; cv.style.width = Math.round(MW * k) + 'px'; this.inner.style.width = Math.round(MW * k) + 'px';
    c.drawImage(this.map, 0, 0);
    // Het pad: begaan stuk is een zandpad (met planken over water), de rest een vage stippellijn
    const wet = (x, y) => this.mask[Math.round(y) * MW + Math.round(x)] === 1;
    for (const [x, y, seg] of this.path) { const open = seg < done, X = Math.round(x), Y = Math.round(y);
      if (wet(x, y)) { c.fillStyle = open ? '#3a2412' : '#00000044'; c.fillRect(X - 3, Y - 3, 6, 6); }
      else { c.fillStyle = open ? '#5a3c20' : '#00000033'; c.fillRect(X - 2, Y - 2, 4, 4); } }
    for (const [x, y, seg] of this.path) { const open = seg < done, X = Math.round(x), Y = Math.round(y);
      if (wet(x, y)) { if (!open) continue; c.fillStyle = X % 3 ? '#b07a44' : '#7a5030'; c.fillRect(X - 2, Y - 2, 1, 4); c.fillRect(X - 2, Y - 2, 1, 4); c.fillStyle = X % 3 ? '#c8925a' : '#8a5a34'; c.fillRect(X, Y - 2, 1, 4); continue; }
      if (!open && (X % 6) > 2) continue; c.fillStyle = open ? '#f2d89a' : '#fff6dc99'; c.fillRect(X - 1, Y - 1, 2, 2); }
    // Knopen
    this.inner.querySelectorAll('.mnode,.mwalker,.msign').forEach(n => n.remove());
    this.levels.forEach((L, i) => {
      const [x, y] = NODES[L.id] || [0, 0], b = document.createElement('button');
      b.className = 'mnode' + (i >= done ? ' locked' : ''); b.style.left = x * k + 'px'; b.style.top = y * k + 'px'; b.style.backgroundImage = `url(${this.slice})`;
      const art = this.save.best[L.id]?.artifacts || 0;
      b.innerHTML = `${L.id}${i < done ? `<span class="art">${'◆'.repeat(art)}${'◇'.repeat(3 - art)}</span>` : ''}`;
      b.setAttribute('aria-label', `${L.id} ${L.name}${i >= done ? ' (op slot)' : ''}`);
      b.addEventListener('click', e => { e.preventDefault(); this.select(i); });
      this.inner.appendChild(b);
    });
    const nb = document.createElement('button'); nb.className = 'mnode locked'; nb.style.left = NEXT[0] * k + 'px'; nb.style.top = NEXT[1] * k + 'px'; nb.style.backgroundImage = `url(${this.slice})`; nb.textContent = '★';
    nb.addEventListener('click', e => { e.preventDefault(); this.select(-1); }); this.inner.appendChild(nb);
    for (const [x, y, t, s] of SIGNS) { const d = document.createElement('div'); d.className = 'msign'; d.style.left = x * k + 'px'; d.style.top = y * k + 'px'; d.innerHTML = `${t}<small>${s}</small>`; this.inner.appendChild(d); }
    // Het poppetje
    const cur = done - 1;
    this.walker = document.createElement('canvas'); this.walker.className = 'mwalker'; this.walker.width = 9; this.walker.height = 13;
    this.walker.style.width = 9 * k * 1.25 + 'px'; this.walker.style.height = 13 * k * 1.25 + 'px'; this.inner.appendChild(this.walker);
    if (this.wpos == null) this.wpos = this.nodeIdx[cur];
    this.wtarget = this.wtarget ?? this.wpos;
    this.k = k; this.placeWalker();
    if (center || this.sel == null) this.select(this.sel ?? cur, true);
  }
  select(i, scroll) {
    this.sel = i;
    this.inner.querySelectorAll('.mnode').forEach((n, j) => n.classList.toggle('sel', j === i || (i === -1 && j === this.levels.length)));
    const name = this.el.querySelector('.mi-name'), where = this.el.querySelector('.mi-where'), art = this.el.querySelector('.art2'), play = this.el.querySelector('#mapPlay');
    if (i === -1) { name.textContent = 'Extra · De andere mensen'; where.textContent = 'Homo floresiensis en Homo naledi: komt binnenkort'; art.textContent = ''; play.disabled = true; return; }
    const L = this.levels[i], open = i < this.save.unlocked, a = this.save.best[L.id]?.artifacts || 0;
    name.textContent = `${L.id} · ${L.name}`; where.textContent = `${L.place} · ${L.era}`;
    art.textContent = open ? `${'◆'.repeat(a)}${'◇'.repeat(3 - a)} artefacten` : 'op slot: speel eerst het level ervoor';
    play.disabled = !open;
    if (scroll) { const [x] = this.path[Math.round(this.wpos)]; this.scroll.scrollLeft = x * this.k - this.scroll.clientWidth / 2; }
    if (open) this.walkTo(this.nodeIdx[i]);
  }
  // Het poppetje wandelt over het pad naar het gekozen level (de camera loopt mee)
  walkTo(target) {
    this.wtarget = target; if (this.walking) return; this.walking = true;
    let last = performance.now(), dist = 0;
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.el.hidden) { this.wpos = this.wtarget; this.walking = false; return; }
      const d = this.wtarget - this.wpos, step = Math.min(Math.abs(d), Math.max(120, Math.abs(d) * 2.2) * dt);   // ver weg: sneller lopen
      this.wpos += Math.sign(d) * step; dist += step; this.wdir = Math.sign(d) || this.wdir;
      this.placeWalker(Math.floor(dist / 5) % 2);
      const [x] = this.path[Math.round(this.wpos)], sx = x * this.k - this.scroll.scrollLeft;
      if (sx < this.scroll.clientWidth * 0.25 || sx > this.scroll.clientWidth * 0.75) this.scroll.scrollLeft += (sx - this.scroll.clientWidth / 2) * Math.min(1, dt * 4);
      if (Math.abs(this.wtarget - this.wpos) > 0.5) requestAnimationFrame(tick); else { this.wpos = this.wtarget; this.walking = false; this.placeWalker(0); }
    };
    requestAnimationFrame(tick);
  }
  placeWalker(frame = 0) {
    if (!this.walker || this.wpos == null) return;
    const q = this.path[Math.round(this.wpos)], lv = this.levels[this.sel >= 0 ? this.sel : Math.min(this.save.unlocked, this.levels.length) - 1];   // de soort van het gekozen level
    const look = (lv.look && SPECIES[lv.look]?.look) || {}, key = (lv.look || 'habilis') + frame;
    const spr = this.walkFrames[key] || (this.walkFrames[key] = walkerSprite(look, frame));
    const c = this.walker.getContext('2d'); c.clearRect(0, 0, 9, 13); c.save(); if (this.wdir < 0) { c.translate(9, 0); c.scale(-1, 1); } c.drawImage(spr, 0, 0); c.restore();
    const k = this.k || 1; this.walker.style.left = (q[0] * k - 4.5 * k * 1.25) + 'px'; this.walker.style.top = (q[1] * k - 13 * k * 1.25 - 14) + 'px';
  }
}
