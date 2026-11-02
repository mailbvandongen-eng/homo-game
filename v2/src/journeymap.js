// De reiskaart: een kronkelpad door de werelden, van Oost-Afrika via Dmanisi en Java naar Europa,
// de IJstijd en Homo sapiens. Swipen om te schuiven, tikken om te kiezen.
import { hash, ell, bake, crown, cloud, leafBlob, plankBoard, logSlice } from './title.js';

const MH = 180, MW = 1250;
// Plek van elk level op de kaart (in kaartpixels) en de wereldborden
const NODES = {
  '1-1': [44, 122], '1-2': [96, 92], '1-3': [150, 128], '1-4': [218, 96],
  '2-1': [286, 126], '2-2': [352, 82], '2-3': [430, 124], '2-4': [500, 90],
  '3-1': [578, 128], '3-2': [632, 86], '3-3': [690, 116], '3-4': [748, 88],
  '4-1': [800, 128], '4-2': [848, 92], '4-3': [892, 118], '4-4': [938, 92],
  '5-1': [992, 122], '5-2': [1044, 90], '5-3': [1100, 126], '5-4': [1160, 92],
};
const NEXT = [1214, 124];   // extra afleveringen: nog op slot
const SIGNS = [[20, 52, '1 · Homo habilis', 'Oost-Afrika'], [268, 46, '2 · Homo erectus', 'Afrika uit'], [560, 46, '3 · Homo heidelbergensis', 'Europa'], [786, 46, '4 · Neanderthalers', 'De IJstijd'], [966, 40, '5 · Homo sapiens', 'Wij'], [1190, 150, 'Extra', 'binnenkort']];

// Ondergrond per x: savanne → bergen → zee → rode woestijn → groen Europa → sneeuw
const BANDS = [[0, ['#c8c068', '#b8b05a', '#d6ce78']], [300, ['#9ab868', '#88a85a', '#acc678']], [470, ['#c89a5a', '#b8884c', '#d6aa6a']], [548, ['#86bc5c', '#74aa4e', '#98ca6a']], [770, ['#e8f0f4', '#d4e2ea', '#f6fafc']], [915, ['#c8c2a8', '#b4ae94', '#d8d4be']], [962, ['#d8c08a', '#c8ae78', '#e6d09a']], [1076, ['#9ab868', '#88a85a', '#acc678']], [1112, ['#d8dcd0', '#c4c8bc', '#eceee6']], [1196, ['#c8c8c0', '#b4b4ac', '#dcdcd4']]];
function groundAt(x, y) {
  let i = 0; while (i < BANDS.length - 1 && x >= BANDS[i + 1][0] - 12 + ((y * 7) % 5) * 3 + (((x + y) % 2) ? 4 : 0)) i++;
  const p = BANDS[i][1], n = hash(Math.floor(x / 3), Math.floor(y / 3));
  return n > 0.82 ? p[2] : n < 0.18 ? p[1] : p[0];
}

function bakeMap() {
  const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const c = cv.getContext('2d');
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { c.fillStyle = groundAt(x, y); c.fillRect(x, y, 1, 1); }
  const water = (cx, cy, rx, ry, seed) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const d = (x / rx) ** 2 + (y / ry) ** 2 + (hash(x >> 2, (y >> 2) + seed) - 0.5) * 0.25; if (d < 1) { c.fillStyle = d > 0.8 ? '#7ac0d8' : (x + y * 3 + seed) % 11 === 0 ? '#9ad4e8' : '#3e8ab4'; c.fillRect(cx + x, cy + y, 1, 1); } } };
  const mountain = (x, y, w, h, snow) => { for (let i = 0; i < h; i++) { const hw = Math.round(w * i / h); for (let k = -hw; k <= hw; k++) { c.fillStyle = snow && i < h * 0.3 ? (k < 0 ? '#ffffff' : '#d8e4ec') : k < 0 ? '#9a8a74' : '#7a6c5a'; c.fillRect(x + k, y - h + i, 1, 1); } } c.fillStyle = '#5e5242'; c.fillRect(x - w, y, w * 2, 1); };
  const acacia = (x, y, s = 1) => { c.fillStyle = '#5a4a30'; c.fillRect(x, y - 6 * s, 1, 6 * s); ell(c, x, y - 7 * s, 6 * s, 2 * s, '#4e7a34'); ell(c, x - 1, y - 8 * s, 4 * s, 1, '#6e9a44'); };
  const tree = (x, y, cols) => { c.fillStyle = '#4e3a24'; c.fillRect(x, y - 3, 1, 3); ell(c, x, y - 5, 3, 3, cols[0]); ell(c, x - 1, y - 6, 1, 1, cols[1]); };
  const pine = (x, y, snow) => { for (let i = 0; i < 8; i++) { const w = Math.floor(i / 2) + 1; c.fillStyle = snow && i % 3 === 0 ? '#ffffff' : '#2e5a3a'; c.fillRect(x - w, y - 9 + i, w * 2 + 1, 1); } c.fillStyle = '#4e3a24'; c.fillRect(x, y - 1, 1, 2); };
  const cave = (x, y) => { ell(c, x, y - 6, 12, 8, '#8a7a64'); ell(c, x - 2, y - 9, 8, 4, '#a89878'); ell(c, x + 2, y - 3, 4, 4, '#1e140c'); };
  // Wereld 1: Riftvallei-rand, Turkanameer, Olduvai-kloof, acacia's, grot
  for (let x = 60; x < 250; x++) { const y = Math.round(60 - (x - 60) * 0.12 + Math.sin(x * 0.2) * 2); c.fillStyle = '#9a7a4a'; c.fillRect(x, y, 1, 3); c.fillStyle = '#7a5a34'; c.fillRect(x, y + 3, 1, 1); }
  water(176, 70, 9, 26, 1);
  for (let i = 0; i < 26; i++) { const x = 84 + i, y = 104 + Math.round(Math.sin(i * 0.5) * 3); c.fillStyle = '#6a4a2a'; c.fillRect(x, y, 1, 2); c.fillStyle = '#a07a4a'; c.fillRect(x, y - 1, 1, 1); }
  for (let i = 0; i < 18; i++) acacia(Math.round(10 + hash(i, 1) * 240), Math.round(70 + hash(i, 2) * 105), hash(i, 3) > 0.7 ? 2 : 1);
  for (let i = 0; i < 6; i++) tree(Math.round(130 + hash(i, 4) * 40), Math.round(130 + hash(i, 5) * 40), ['#3e7a34', '#6aa848']);   // galerijbos
  cave(218, 104);
  // Wereld 2: bergen van Dmanisi, zee met vulkaaneiland (Java), rode rotsen met grot (Wonderwerk)
  mountain(330, 96, 18, 34, true); mountain(362, 92, 22, 42, true); mountain(392, 100, 14, 26, true);
  water(430, 140, 34, 30, 2); water(410, 112, 26, 16, 3);
  ell(c, 432, 128, 16, 9, '#5a8a40'); for (let i = 0; i < 14; i++) { const w = Math.round(i * 0.9) + 1; c.fillStyle = i < 3 ? '#e8602a' : '#6a5a4e'; c.fillRect(442 - w, 108 + i, w * 2, 1); }
  for (let i = 0; i < 4; i++) { const r = 2 + i; ell(c, 442 + i * 2, 100 - i * 7, r, Math.max(1, r - 1), i < 2 ? '#b8b0a8' : '#d8d4d0'); }
  for (const [px, py] of [[424, 134], [420, 128], [448, 134]]) { c.fillStyle = '#5a4a30'; c.fillRect(px, py - 5, 1, 5); for (const d of [-1, 1]) { c.fillStyle = '#3e8a34'; c.fillRect(px + d, py - 6, d * 3, 1); c.fillRect(px + d * 3, py - 5, d, 1); } }
  for (let i = 0; i < 6; i++) { const x = 470 + i * 12, h = 6 + Math.round(hash(i, 6) * 8); c.fillStyle = '#a85a34'; c.fillRect(x, 70 - h + i * 3, 10, h); c.fillStyle = '#c8784a'; c.fillRect(x, 70 - h + i * 3, 10, 2); }
  cave(500, 98);
  for (let i = 0; i < 8; i++) acacia(Math.round(266 + hash(i, 7) * 50), Math.round(110 + hash(i, 8) * 60));
  // Wereld 3: krijtkust met zee, heuvels van Atapuerca, de put, het meer van Schöningen
  for (let x = 548; x < 640; x++) { const top = 150 + Math.round(Math.sin(x * 0.1) * 3); c.fillStyle = '#f4f2ea'; c.fillRect(x, top, 1, 6); c.fillStyle = '#d8d6ce'; c.fillRect(x, top + 4, 1, 2); c.fillStyle = '#3e8ab4'; c.fillRect(x, top + 6, 1, MH); }
  for (const [hx, hy, w] of [[620, 70, 30], [660, 64, 26], [700, 74, 22]]) { ell(c, hx, hy, w, 10, '#6aa04a'); ell(c, hx - 6, hy - 3, Math.round(w * 0.6), 5, '#82b85a'); }
  ell(c, 690, 124, 7, 4, '#3a2e22'); ell(c, 690, 124, 5, 2, '#140c08');
  water(756, 116, 18, 9, 4); for (let i = 0; i < 9; i++) { c.fillStyle = '#5a7a34'; c.fillRect(738 + i * 4, 106 + (i % 3), 1, 4); }
  for (let i = 0; i < 22; i++) { const x = Math.round(556 + hash(i, 9) * 210), y = Math.round(80 + hash(i, 10) * 64); if (Math.abs(x - 690) < 12 && Math.abs(y - 124) < 8) continue; hash(i, 11) > 0.6 ? pine(x, y, false) : tree(x, y, ['#3e7a34', '#78b04e']); }
  // Wereld 4: besneeuwde steppe, een bevroren rivier, de Denisova-grot in de bergen, de rots van Gibraltar
  for (let i = 0; i < 12; i++) { const x = Math.round(778 + hash(i, 12) * 120), y = Math.round(70 + hash(i, 13) * 100); if (Math.abs(x - 892) < 16 && Math.abs(y - 112) < 14) continue; pine(x, y, true); }
  for (let i = 0; i < 40; i++) { const x = 816 + i, y = 110 + Math.round(Math.sin(i * 0.25) * 6); c.fillStyle = '#b8dcec'; c.fillRect(x, y, 1, 4); c.fillStyle = '#ffffff'; c.fillRect(x, y, 1, 1); }
  mountain(892, 120, 20, 40, true); ell(c, 892, 116, 4, 4, '#1e140c');
  ell(c, 808, 152, 10, 6, '#6a4a30'); ell(c, 817, 147, 5, 5, '#6a4a30'); c.fillStyle = '#6a4a30'; for (const lx of [-7, -3, 3, 7]) c.fillRect(808 + lx, 156, 2, 5); c.fillRect(821, 148, 2, 8);
  c.fillStyle = '#f4f0e0'; c.fillRect(819, 153, 4, 1); c.fillRect(822, 151, 1, 2); c.fillStyle = '#4a3020'; c.fillRect(802, 144, 12, 2);
  for (let x = 920; x < 958; x++) { const top = 60 + Math.round(Math.abs(x - 934) * 1.4); for (let y = top; y < 112; y++) { c.fillStyle = (x + y) % 9 === 0 ? '#a8a294' : x < 934 ? '#e0dccc' : '#c4beae'; c.fillRect(x, y, 1, 1); } }
  water(944, 150, 26, 18, 5);
  // Wereld 5: het Atlasgebergte (Jebel Irhoud), de kust van Blombos, de koude steppe (Kostenki), de Chauvet-grot
  mountain(1000, 70, 16, 26, false); mountain(1020, 66, 12, 20, false);
  for (let i = 0; i < 7; i++) acacia(Math.round(966 + hash(i, 20) * 60), Math.round(100 + hash(i, 21) * 70));
  water(1050, 176, 30, 26, 6); water(1062, 40, 18, 22, 7);
  cave(1036, 72);
  for (let i = 0; i < 6; i++) tree(Math.round(1072 + hash(i, 22) * 34), Math.round(70 + hash(i, 23) * 90), ['#3e7a34', '#6aa848']);
  for (let i = 0; i < 6; i++) pine(Math.round(1116 + hash(i, 24) * 30), Math.round(60 + hash(i, 25) * 40), true);
  ell(c, 1100, 152, 9, 6, '#7a6a54'); ell(c, 1100, 150, 6, 3, '#9a8a70');   // hut van mammoetbotten
  c.fillStyle = '#f4f0e0'; for (const dx of [-8, -4, 0, 4, 8]) c.fillRect(1100 + dx, 146 + Math.abs(dx) / 2, 1, 6);
  mountain(1160, 128, 22, 44, false); ell(c, 1160, 120, 5, 5, '#1e140c');
  c.fillStyle = '#b8402a'; c.fillRect(1150, 104, 2, 3); c.fillRect(1149, 103, 1, 1); c.fillRect(1151, 102, 1, 1); c.fillRect(1153, 103, 1, 1);   // handafdruk
  c.globalAlpha = 0.4; c.fillStyle = '#ffffff'; for (let y = 0; y < MH; y++) for (let x = 1196 + (y % 2); x < MW; x += 2) if (hash(x >> 3, y >> 2) > 0.45) c.fillRect(x, y, 1, 1); c.globalAlpha = 1;
  // Wolkjes die over de kaart drijven (vast)
  cloud(c, 140, 20, 12); cloud(c, 380, 16, 10); cloud(c, 650, 22, 14);
  return cv;
}

// Pad door alle punten (Catmull-Rom), als reeks punten
function trail(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), i]); }
  }
  return out;
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
.mpin{position:absolute;margin:-52px 0 0 -9px;font:900 20px system-ui;color:#ffe46a;text-shadow:0 2px 0 #3a1e0c,2px 0 #3a1e0c,-2px 0 #3a1e0c;animation:pinbob 1s ease-in-out infinite;pointer-events:none}
@keyframes pinbob{50%{transform:translateY(-5px)}}
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
    const map = bakeMap(), pts = [[6, 140], ...levels.map(L => NODES[L.id] || [0, 0]), NEXT];
    this.path = trail(pts); this.map = map;
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
    // Het pad: begaan stuk is een zandpad, de rest een vage stippellijn
    for (const [x, y, seg] of this.path) { const open = seg < done; c.fillStyle = open ? '#5a3c20' : '#00000033'; c.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); }
    for (const [x, y, seg] of this.path) { const open = seg < done; if (!open && (Math.round(x) % 6) > 2) continue; c.fillStyle = open ? '#f2d89a' : '#fff6dc99'; c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
    // Knopen
    this.inner.querySelectorAll('.mnode,.mpin,.msign').forEach(n => n.remove());
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
    const cur = done - 1, [px, py] = NODES[this.levels[cur].id], pin = document.createElement('div'); pin.className = 'mpin'; pin.textContent = '▼'; pin.style.left = px * k + 'px'; pin.style.top = py * k + 'px'; this.inner.appendChild(pin);
    this.k = k;
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
    if (scroll) { const [x] = NODES[L.id]; this.scroll.scrollLeft = x * this.k - this.scroll.clientWidth / 2; }
  }
}
