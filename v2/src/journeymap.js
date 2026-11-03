// De reiskaart: een wereldkaart van toen, in de stijl van een Mario-wereldkaart. Landmassa's met kliffen,
// zee met golfjes en rotsjes, bergen, bossen, woestijnen en meren. In de ijstijd lag de zeespiegel lager:
// Groot-Brittannië hing aan Europa vast en Sumatra, Java en Borneo vormden samen Sundaland.
// Elk level ligt op de plek van de echte vondsten. Een poppetje wandelt over het pad naar het gekozen level.
import { hash, ell, cloud, plankBoard, logSlice } from './title.js';
import { SPECIES } from './species.js';

const S = 8, LON0 = -20, LAT0 = 68, MW = 144 * S, MH = 108 * S;   // lengte -20..124, breedte 68..-40
const P = (lon, lat) => [Math.round((lon - LON0) * S), Math.round((LAT0 - lat) * S)];

// Vindplaatsen (lengte, breedte). Een paar zijn een tikje verschoven zodat de knoppen niet overlappen.
const SITES = {
  '1-1': [40, 9.5], '1-2': [35.3, -3], '1-3': [36.6, 3.6], '1-4': [32, -12],
  '2-1': [33.2, 7], '2-2': [44.3, 41.3], '2-3': [110.9, -7.2], '2-4': [23.6, -27.8],
  '3-1': [-0.7, 50.9], '3-2': [-4.5, 43], '3-3': [-1.5, 40.5], '3-4': [10.9, 52.4],
  '4-1': [34, 45.4], '4-2': [6.6, 50.6], '4-3': [84.7, 51.4], '4-4': [-5.3, 36.3],
  '5-1': [-8.9, 31.9], '5-2': [21.2, -33.9], '5-3': [39, 51.4], '5-4': [4.4, 44.6],
};
const EXTRA = [121, -8.5];   // Flores: Homo floresiensis (nog op slot)
// Route náár elk level, over land: langs de Nijl, door de Levant, over de landbrug naar Sundaland...
const VIA = {
  '1-1': [[43, 4], [42, 7]],
  '1-2': [[38, 4], [37.5, 0], [36.5, -2]],
  '1-3': [[34, -2.5], [34.5, 1], [35.6, 2.4]],
  '1-4': [[37.5, 0.5], [36.3, -6], [34.8, -9.5]],
  '2-1': [[31.2, -9], [30.8, -2], [31.5, 3], [32.5, 5.5]],
  '2-2': [[31.8, 11], [32.5, 16], [31.8, 21], [32.2, 26], [32.9, 30], [35.5, 32.5], [37, 36], [40.5, 38.5], [42.5, 40.5]],
  '2-3': [[47, 37.5], [52, 34], [58, 31], [64, 29], [70, 27], [78, 26], [86, 25], [93, 23], [97, 18], [100.3, 12], [101.5, 6], [102.5, 2], [104.5, -1.5], [107, -4.5]],
  '2-4': [[106, -3], [101.8, 4], [99.5, 14], [92, 24], [80, 26], [68, 28], [58, 28], [50, 23], [45, 17], [43.4, 13], [40.5, 9], [37.5, 2], [36.8, -6], [33.8, -15], [29.8, -21], [26, -25.5]],
  '3-1': [[25, -20], [27.5, -10], [30.5, 0], [31.8, 10], [32.4, 20], [32.4, 27], [33, 30.3], [35.4, 33.5], [36.2, 36.4], [33, 38.5], [28.5, 40.6], [26, 41.6], [22.5, 43], [18, 45], [13, 46.8], [7.5, 47.6], [3, 48.8], [1.2, 50]],
  '3-2': [[0.5, 48.5], [-0.5, 46], [-2, 44.2]],
  '3-3': [[-4, 41.6], [-3, 40.6]],
  '3-4': [[0.8, 42.5], [3.5, 45.5], [6, 48.5], [8.5, 50.8]],
  '4-1': [[15, 51], [21, 50], [27, 48.5], [31.5, 47]],
  '4-2': [[29, 49.5], [22, 51.6], [15.5, 52.5], [10, 51.5]],
  '4-3': [[11, 53.5], [20, 54.5], [30, 55], [42, 55.5], [55, 55.5], [66, 54.8], [76, 53]],
  '4-4': [[78, 49.5], [68, 48.5], [58, 48.5], [47.5, 48], [40, 47.5], [32.5, 47.5], [26.5, 46.5], [20, 45.6], [13, 45.6], [7, 44.6], [2.5, 42.2], [-1, 39.5], [-3.5, 37.8]],
  '5-1': [[-5.7, 35.6], [-7, 34.2], [-8, 33]],
  '5-2': [[-6, 28], [-3, 22], [0, 16], [5, 11], [11, 6.5], [15, 1], [17, -6], [18.5, -13], [20, -21], [21, -27], [20.5, -31.5]],
  '5-3': [[23.5, -28], [28, -20], [31.5, -10], [33.5, -1], [33.3, 10], [32.6, 20], [32.5, 27], [33, 30.3], [35.5, 33.5], [37.5, 37], [41, 40], [42.5, 44], [40.5, 48]],
  '5-4': [[33, 50.5], [24, 50], [15, 48.5], [9.5, 46.5], [6, 45.2]],
};
const SIGNS = [[43, -16, '1 · Homo habilis', 'Oost-Afrika'], [60, 14, '2 · Homo erectus', 'Afrika uit'], [-17, 50, '3 · Homo heidelbergensis', 'Europa'],
  [44, 57, '4 · Neanderthalers', 'De IJstijd'], [-18, 25, '5 · Homo sapiens', 'Wij'], [112, -15, 'Extra', 'binnenkort']];

// ── Landmassa's (lengte, breedte) ──
const LANDS = [
  // Afrika
  [[-6, 35.8], [-2, 35.1], [3, 36.8], [10, 37.3], [11, 35.5], [10.5, 34], [15, 32.2], [20, 30.8], [20.5, 32.5], [25, 31.8], [29, 31], [32.3, 31.3], [32.5, 29.8], [33.5, 27.5], [35.5, 24], [37.2, 21], [38.5, 18], [39.5, 15.5], [41.5, 13.5], [43.3, 12.5], [44.5, 10.4], [47, 11.1], [51.2, 11.8], [51, 10.4], [49.5, 7], [47.5, 4.5], [44, 1.5], [41.5, -1.5], [40, -3.5], [39.2, -6.5], [39.8, -10], [40.5, -14.5], [37, -17.5], [35.3, -22], [33, -25.8], [32.5, -28.5], [30.5, -31], [27, -33.8], [22, -34.1], [20, -34.8], [18.4, -34.2], [18, -32], [16.5, -28.6], [15, -26.6], [14.5, -23], [12, -18], [11.8, -15.5], [13.6, -12], [13, -8.6], [12.2, -6], [9.5, -2], [9.5, 1], [9.8, 3], [8.5, 4.5], [6, 4.3], [4, 6.3], [1.5, 6.1], [-2, 4.8], [-4.5, 5.2], [-7.5, 4.4], [-10.5, 6.5], [-13.3, 8.5], [-15.5, 11.3], [-16.8, 13.5], [-17.3, 14.7], [-16.5, 16.5], [-16.2, 19.5], [-17, 21], [-16, 24], [-14.5, 26], [-13, 27.8], [-10, 29.5], [-9.6, 30.4], [-9.8, 32], [-8.5, 33.3], [-6.8, 34.1]],
  // Madagaskar
  [[44, -25], [47, -25], [50.5, -15.5], [49.3, -12], [47, -15], [44, -17], [43.3, -22]],
  // Eurazië met Arabië en India
  [[-5.6, 36], [-6.3, 36.8], [-8.9, 37], [-8.8, 40], [-9.3, 43], [-8, 43.7], [-2, 43.4], [-1.3, 44.5], [-1.2, 46], [-2.5, 47.3], [-4.7, 48], [-1.6, 48.7], [1.5, 50], [2.5, 51.1], [4, 51.8], [5, 53], [8, 53.6], [8.5, 55.5], [8.2, 57], [10.5, 57.7], [10.5, 56], [12.5, 54.5], [14, 54], [18, 54.8], [21, 55.5], [21.5, 57], [24, 57.5], [24, 59.4], [28, 60], [30, 62], [35, 64], [42, 66], [60, 69], [125, 69],
    [125, 40], [121.5, 39], [118, 39], [121.5, 37], [120, 34], [122, 30], [120, 26], [117, 23.5], [113, 22], [110, 21], [108, 21.5], [106.5, 20], [106, 17], [108.5, 15], [109.2, 12], [107, 10.5], [105, 8.7], [104.8, 10.5], [103, 10.8], [101, 12.7], [100, 13.5], [99.2, 10], [100.3, 7.2], [102, 6], [103.4, 3.5], [104.2, 1.4], [103.5, 1.3], [101.3, 2.8], [100.3, 5], [98.3, 8], [98.5, 13], [97.6, 16.5], [94.5, 16], [94, 19.5], [92, 21.5], [90, 22], [88, 21.6], [86.5, 20], [84.5, 18.5], [82, 16.3], [80.2, 15.5], [80.3, 13], [79.8, 10.3], [78.3, 8.5], [77.2, 8], [76.3, 9.5], [74.8, 12.8], [73.5, 16], [72.8, 19], [72.6, 21.5], [70, 22.5], [68.5, 23.5], [66.5, 25.3], [62, 25.2], [57.3, 25.8], [56.4, 26.2], [56, 24.3], [58.5, 23.6], [59.8, 22.5], [57.8, 19], [55, 17], [52, 15.7], [49, 14.2], [45, 12.8], [43.5, 12.7], [42.8, 14.5], [42.6, 16.5], [41, 19.5], [39.2, 21.5], [38.3, 24], [36.6, 26], [35, 28], [34.9, 29.5], [34.3, 27.8], [33.5, 28.5], [32.5, 29.9], [32.3, 31.3],
    [34.5, 31.5], [35, 33], [35.9, 35], [36, 36.6], [34, 36.3], [32, 36.1], [30, 36.2], [28.2, 36.7], [27, 37.6], [26.3, 39.5], [26, 40.6], [24, 40.8], [23, 39.8], [23.5, 38], [22.5, 36.5], [21.5, 37.5], [21, 38.5], [19.5, 40.2], [19.5, 41.8], [16, 43.5], [13.6, 45.6], [12.3, 45.3], [13.5, 43.6], [16, 41.4], [18.5, 40.2], [17.2, 39.5], [16.6, 38.5], [15.6, 38], [16, 39.4], [15.6, 40.1], [14, 40.9], [12, 41.8], [10.5, 43], [8.8, 44.4], [7.5, 43.8], [5, 43.3], [3, 43.2], [3.2, 41.9], [1, 41], [0.2, 40], [-0.3, 39], [0.1, 38.6], [-0.7, 37.6], [-2.1, 36.7], [-4.4, 36.7]],
  // Groot-Brittannië, via Doggerland vast aan Europa
  [[-5.7, 50.1], [-3, 50.6], [1.4, 51.2], [3, 51.4], [5, 53.5], [3, 54.5], [0, 54.5], [-1.5, 55.5], [-2, 57], [-1.8, 57.6], [-4, 58.6], [-5, 58.6], [-6.2, 56.8], [-5, 55], [-3.2, 54.6], [-3.2, 53.4], [-4.6, 53.2], [-4.3, 52.2], [-5.3, 51.7], [-3.2, 51.4]],
  // Sundaland: Sumatra, Java en Borneo, met droog gevallen zeebodem ertussen
  [[95.3, 5.6], [97.5, 5.2], [100, 2.5], [103.5, 1.3], [104.5, 1.6], [109, 1.5], [111, 2.5], [113, 3.3], [116, 6.5], [119, 5.2], [118, 1], [117.5, -1], [116.4, -3.6], [114.5, -3.8], [114.6, -8.4], [110, -8.4], [106, -7.1], [105.2, -6.8], [104.5, -5.9], [102, -4], [101, -2.5], [99, 0.2], [97.5, 2.5]],
  // Flores en Sri Lanka
  [[119.8, -8.3], [122.8, -8.1], [122.9, -8.9], [119.8, -8.9]],
  [[79.8, 9.8], [81.8, 7.5], [81.2, 6.2], [80, 6]],
  // Sicilië, Sardinië, Corsica, Kreta
  [[12.4, 38.1], [15.6, 38.3], [15.1, 36.7]], [[8.4, 41.2], [9.8, 41], [9.6, 39], [8.4, 39]], [[23.5, 35.6], [26.3, 35.3], [24, 35]],
];
const WATERS = [
  // Zwarte Zee en Kaspische Zee
  [[28, 41.5], [33, 42], [36, 41.6], [41.5, 41.5], [41.7, 42.6], [39, 44.3], [36.6, 45.1], [35.4, 44.5], [33.5, 44.4], [32, 45.4], [30.6, 46.4], [29.6, 45.3], [28.6, 44], [27.8, 42.5]],
  [[47, 45.5], [50, 46.8], [53, 46.8], [53, 45], [51.3, 44.5], [50.5, 44], [52, 42], [53, 41], [53.8, 38], [53.9, 37.2], [51, 36.7], [49, 37.6], [48.8, 38.9], [49.5, 40.3], [48, 42], [47.5, 43]],
];
// Meren in Afrika (midden, straal in graden) en de Nijl
const LAKES = [[33, -1, 1.5, 1.4], [36.1, 3.8, 0.35, 1.2], [29.6, -6.2, 0.35, 2.6], [34.4, -11.8, 0.35, 2.2], [14, 13.2, 1.3, 1.1]];
const NILE = [[33, 0.6], [32.4, 3.5], [31.6, 9.5], [32.6, 15.6], [33.6, 17.5], [32, 20], [31.4, 24], [32.7, 26.4], [31.3, 30], [31, 31.3]];
// Gebergten: lengte, breedte, grootte, sneeuw
const MOUNTAINS = [[-5, 32, 1.6], [-1, 33, 1.3], [3, 34.3, 1.1], [7.5, 46.3, 1.4, 1], [11, 46.8, 1.5, 1], [0.5, 42.6, 1.1, 1], [42, 42.8, 1.4, 1], [46.5, 42, 1.2, 1],
  [51, 31, 1.3], [55, 29, 1.2], [76, 33.5, 1.8, 1], [82, 30, 2, 1], [87, 28.5, 2.2, 1], [92, 28, 1.8, 1], [86, 50.5, 1.6, 1], [89, 49.5, 1.4, 1],
  [38.5, 9.2, 1.3], [37.4, 11.6, 1.2], [37.3, -3.1, 1.2, 1], [29.5, -29, 1.2], [24, 46, 1.1], [101, 25, 1.4], [70, 38, 1.5, 1]];

// Soort landschap op een plek (palet: gewoon, donker, licht)
function biome(lon0, lat0) {
  // Grillige grenzen: de plek een beetje verschuiven met golvende ruis
  const lon = lon0 + Math.sin(lat0 * 0.35 + lon0 * 0.1) * 2.2 + Math.sin(lat0 * 1.1) * 0.8, lat = lat0 + Math.sin(lon0 * 0.3 + lat0 * 0.07) * 1.8 + Math.sin(lon0 * 0.9) * 0.6;
  if (lat > 58 && lon < 64) return ['#eef4f8', '#d2e0ea', '#ffffff'];                                    // ijskap
  if (lat > 55) return ['#4a7a40', '#3a6a34', '#5a8a4c'];                                                // taiga
  if ((lat > 17 && lat < 31 && lon < 33) || (lon > 34.5 && lon < 58 && lat > 13 && lat < 31) || (lon >= 58 && lon < 71 && lat > 24 && lat < 31)) return ['#ecc878', '#dcb060', '#f8dc98'];   // woestijn
  if (lon > 77 && lon < 101 && lat > 29 && lat < 39) return ['#b0a080', '#a09070', '#c0b090'];          // Tibet
  if ((lon > 9 && lon < 29 && lat > -5 && lat < 5) || (lon > 95 && lat < 12) || (lon > -12 && lon < 8 && lat > 4 && lat < 9)) return ['#2e8030', '#1e6e24', '#40923c'];   // regenwoud
  if (lon > 16 && lon < 26 && lat > -28 && lat < -19) return ['#dcbc74', '#ccaa60', '#e8cc88'];       // Kalahari
  if (lat < 17 && lat > -18 && lon < 52) return ['#ccc45c', '#b8b04a', '#dcd474'];                       // savanne
  if (lat <= -18) return ['#a8bc60', '#98ac50', '#b8cc70'];                                              // zuidelijk Afrika
  if (lon > 28 && lon < 82 && lat > 43 && lat < 56) return ['#cccc84', '#bcbc72', '#dcdc96'];            // steppe
  if (lon > 66 && lon < 93 && lat < 29) return ['#9cb45c', '#8ca44c', '#acc46c'];                        // India
  if (lat < 44 && lon < 46) return ['#a4bc5c', '#94ac4c', '#b4cc6c'];                                    // Middellandse Zee
  return ['#6cb44c', '#5ca440', '#7cc45c'];                                                              // groen
}

function bakeMap() {
  // 1 · Land en water als masker, met grillige kusten
  const mcv = document.createElement('canvas'); mcv.width = MW; mcv.height = MH; const mc = mcv.getContext('2d');
  mc.fillStyle = '#000'; mc.fillRect(0, 0, MW, MH);
  const poly = (pts, col) => { mc.fillStyle = col; mc.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? mc.lineTo(x, y) : mc.moveTo(x, y); }); mc.closePath(); mc.fill(); };
  for (const L of LANDS) poly(L, '#fff');
  for (const W of WATERS) poly(W, '#000');
  for (const [lo, la, rx, ry] of LAKES) { const [x, y] = P(lo, la); mc.fillStyle = '#000'; mc.beginPath(); mc.ellipse(x, y, rx * S, ry * S, 0, 0, Math.PI * 2); mc.fill(); }
  mc.strokeStyle = '#000'; mc.lineWidth = 2; mc.beginPath(); NILE.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? mc.lineTo(x, y) : mc.moveTo(x, y); }); mc.stroke();
  const raw = mc.getImageData(0, 0, MW, MH).data, land = new Uint8Array(MW * MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const jx = Math.round((hash(x >> 3, y >> 3) - 0.5) * 4), jy = Math.round((hash((x >> 3) + 7, (y >> 3) + 3) - 0.5) * 4);
    const sx = Math.max(0, Math.min(MW - 1, x + jx)), sy = Math.max(0, Math.min(MH - 1, y + jy));
    land[y * MW + x] = raw[(sy * MW + sx) * 4] > 128 ? 1 : 0;
  }
  const isLand = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && land[y * MW + x] === 1;
  // 2 · Pixels: land met textuur, donkere rand, kliffen aan de zuidkant, schuim en golfjes in de zee
  const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const c = cv.getContext('2d');
  const img = c.createImageData(MW, MH), d = img.data, mask = new Uint8Array(MW * MH);
  const put = (i, hex) => { const n = parseInt(hex.slice(1), 16); d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255; };
  const CL = 6;   // klifhoogte
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    if (land[i]) {
      const edge = !isLand(x - 1, y) || !isLand(x + 1, y) || !isLand(x, y - 1) || !isLand(x, y + 1);
      const b = biome(LON0 + x / S, LAT0 - y / S), n = hash(x >> 1, y >> 1);
      put(i, edge ? '#24401a' : n > 0.86 ? b[2] : n < 0.12 ? b[1] : ((x >> 1) + (y >> 1)) % 7 === 0 && n > 0.5 ? b[1] : b[0]);
      continue;
    }
    mask[i] = 1;
    let up = 0; for (let k = 1; k <= CL; k++) if (isLand(x, y - k)) { up = k; break; }
    if (up) {   // klif: oker met verticale strepen, donker onderaan
      let full = true; for (let k = 1; k < up; k++) if (isLand(x, y - k)) full = false;
      put(i, up === CL ? '#5a3418' : up === 1 ? '#e8a858' : x % 5 === 0 ? '#9a5c2c' : (x + up) % 5 === 2 ? '#d89850' : '#c07a3c');
      continue;
    }
    const nearLand = isLand(x - 2, y) || isLand(x + 2, y) || isLand(x, y - CL - 1) || isLand(x, y + 2) || isLand(x - 1, y - CL - 1) || isLand(x + 1, y - CL - 1);
    put(i, nearLand ? '#c8e4ff' : (y % 10 === 0 && ((x + (y >> 1) * 3) % 14) < 5) ? '#78a8f0' : (x * 7 + y * 13) % 97 === 0 ? '#90b8f8' : '#4878e0');
  }
  c.putImageData(img, 0, 0);
  // 3 · Versiering
  const at = (lon, lat) => P(lon, lat);
  const nearSite = (x, y, r = 14) => Object.values(SITES).some(([lo, la]) => { const [sx, sy] = P(lo, la); return Math.abs(sx - x) < r && Math.abs(sy - y) < r; });
  const mountain = (x, y, s, snow) => { const h = Math.round(9 * s), w = Math.round(8 * s);
    for (let i = 0; i <= h; i++) { const hw = Math.round(w * i / h); for (let k = -hw; k <= hw; k++) { c.fillStyle = k === -hw || k === hw ? '#3a2a1a' : snow && i < h * 0.35 ? (k < 0 ? '#ffffff' : '#c8d8e8') : k < 0 ? '#b8946c' : '#8a6a4a'; c.fillRect(x + k, y - h + i, 1, 1); } }
    c.fillStyle = '#3a2a1a'; c.fillRect(x - w, y, w * 2 + 1, 1); };
  const bush = (x, y, col) => { ell(c, x, y, 4, 4, '#1e3a14'); ell(c, x, y, 3, 3, col); c.fillStyle = '#ffffff55'; c.fillRect(x - 2, y - 2, 2, 1); };
  const acacia = (x, y) => { c.fillStyle = '#5a4028'; c.fillRect(x, y - 4, 1, 4); ell(c, x, y - 5, 5, 2, '#1e3a14'); ell(c, x, y - 5, 4, 1, '#5a8a34'); };
  const pine = (x, y, snow) => { for (let i = 0; i < 7; i++) { const w = Math.floor(i / 2) + 1; c.fillStyle = i === 6 ? '#1e3a14' : snow && i % 3 === 0 ? '#ffffff' : '#2e5a34'; c.fillRect(x - w, y - 7 + i, w * 2 + 1, 1); } c.fillStyle = '#4e3a24'; c.fillRect(x, y, 1, 1); };
  const palm = (x, y) => { c.fillStyle = '#6a4a2a'; c.fillRect(x, y - 6, 1, 6); for (const dd of [-1, 1]) { c.fillStyle = '#2a7a2a'; c.fillRect(x + dd, y - 7, dd * 4, 1); c.fillRect(x + dd * 4, y - 6, dd, 2); } };
  const rock = (x, y) => { ell(c, x, y, 3, 2, '#5a6a7a'); ell(c, x - 1, y - 1, 2, 1, '#e8eef4'); };
  const mammoth = (x, y) => { ell(c, x, y, 5, 3, '#5a3a24'); ell(c, x + 4, y - 2, 2, 2, '#5a3a24'); c.fillStyle = '#5a3a24'; for (const lx of [-3, -1, 1, 3]) c.fillRect(x + lx, y + 2, 1, 2); c.fillStyle = '#f4f0e0'; c.fillRect(x + 5, y, 2, 1); };
  // bossen, savannes, palmen en dennen: verspreid over het land, niet op de vindplaatsen
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(hash(i, 41) * MW), y = Math.floor(hash(i, 42) * MH);
    if (!isLand(x, y) || !isLand(x, y + 6) || !isLand(x - 4, y) || !isLand(x + 4, y) || nearSite(x, y)) continue;
    const lon = LON0 + x / S, lat = LAT0 - y / S, b = biome(lon, lat)[0], r = hash(i, 43);
    if (b === '#2e8030') { if (lon > 95 && r < 0.4) palm(x, y); else bush(x, y, r < 0.5 ? '#2e8a34' : '#3e9a3c'); }
    else if (b === '#ccc45c' && r < 0.35) acacia(x, y);
    else if (b === '#6cb44c' && r < 0.45) bush(x, y, '#4ea03c');
    else if (b === '#a4bc5c' && r < 0.2) bush(x, y, '#6a9a3c');
    else if (b === '#4a7a40' && r < 0.6) pine(x, y, false);
    else if (b === '#eef4f8' && r < 0.12) pine(x, y, true);
    else if ((b === '#ecc878' || b === '#dcbc74') && r < 0.06) { ell(c, x, y, 3, 2, '#b8884c'); ell(c, x - 1, y - 1, 2, 1, '#d8a868'); }
    else if (b === '#cccc84' && r < 0.04) mammoth(x, y);
  }
  // rotsjes in zee, vlak bij de kust
  for (let i = 0; i < 700; i++) { const x = Math.floor(hash(i, 51) * MW), y = Math.floor(hash(i, 52) * MH); if (mask[y * MW + x] && !isLand(x, y - 10) && (isLand(x + 14, y) || isLand(x - 14, y) || isLand(x, y + 14))) rock(x, y); }
  // de Riftvallei: een kloof door Oost-Afrika
  for (const [a, b2] of [[[39.8, 13], [38.6, 7]], [[38.6, 7], [36.2, 1]], [[36.2, 1], [35.8, -5]], [[35.8, -5], [34.6, -9]]]) { const [x1, y1] = at(...a), [x2, y2] = at(...b2), n = Math.hypot(x2 - x1, y2 - y1);
    for (let t = 0; t < n; t++) { const x = Math.round(x1 + (x2 - x1) * t / n), y = Math.round(y1 + (y2 - y1) * t / n); c.fillStyle = '#7a4a24'; c.fillRect(x - 1, y, 3, 1); c.fillStyle = '#4a2a14'; c.fillRect(x, y, 1, 1); } }
  for (const [lo, la, s, snow] of MOUNTAINS) { const [x, y] = at(lo, la); mountain(x, y, s, snow); }
  // de vulkaan op Java
  { const [x, y] = at(110.4, -6.9); mountain(x, y, 1.1); c.fillStyle = '#e8602a'; c.fillRect(x - 1, y - 10, 3, 2); for (let k = 0; k < 3; k++) ell(c, x + 2 + k * 2, y - 14 - k * 5, 2 + k, 2 + k, '#d8d4d0'); }
  cloud(c, 160, 40, 14); cloud(c, 700, 120, 16); cloud(c, 980, 300, 14); cloud(c, 260, 700, 16);
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
#mapScroll{position:relative;flex:1;overflow:auto;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:none;cursor:grab}
#mapScroll::-webkit-scrollbar{display:none}
#mapInner{position:relative;height:100%}
#mapInner canvas{position:absolute;left:0;top:0;touch-action:pan-x pan-y;image-rendering:pixelated;image-rendering:crisp-edges}
.mnode{position:absolute;width:32px;height:32px;margin:-16px 0 0 -16px;padding:0;border:none;border-radius:50%;background:transparent center/100% 100% no-repeat;image-rendering:pixelated;font:900 12px system-ui,sans-serif;color:#3a2210;box-shadow:none;filter:drop-shadow(0 3px 0 #0006);cursor:pointer}
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
.mworlds{display:flex;gap:6px}
.mworlds button{width:42px;height:42px;padding:0;margin:0;border-radius:50%;background:#7a5030;border:3px solid #2a1a0c;box-shadow:inset 0 2px 0 #a8743e,0 3px 0 #0006;color:#fff3c0;font:900 18px system-ui,sans-serif}
.mworlds button.on{background:#f6c94c;color:#3a2210}
.mworlds button.lock{filter:grayscale(1) opacity(.6)}
.minfo .marrow{width:44px;height:44px;padding:0;margin:0;font-size:20px}
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
      <div class="mtop"><div class="mtitle">De reiskaart</div><div class="mworlds">${[1, 2, 3, 4, 5].map(w => `<button data-w="${w}" aria-label="Wereld ${w}">${w}</button>`).join('')}</div><button class="plank" id="mapClose" aria-label="Sluiten">✕</button></div>
      <div class="minfo"><button class="plank marrow" id="mapPrev" aria-label="Vorig level">◀</button><div><b class="mi-name"></b><span class="mi-where"></span><br><span class="art2"></span></div><button class="plank marrow" id="mapNext" aria-label="Volgend level">▶</button><button class="plank p-play" id="mapPlay">▶ Spelen</button></div>`;
    root.appendChild(el);
    this.scroll = el.querySelector('#mapScroll'); this.inner = el.querySelector('#mapInner'); this.cv = el.querySelector('canvas');
    // Pad: start → (tussenpunten → level) × n. Per punt onthouden naar welk level het leidt.
    const pts = [P(44, 2)], segOf = [0], nodePt = [];
    levels.forEach((L, i) => { for (const v of VIA[L.id] || []) { pts.push(P(...v)); segOf.push(i); } pts.push(P(...(SITES[L.id] || [0, 0]))); segOf.push(i); nodePt.push(pts.length - 1); });
    this.path = trail(pts, segOf);
    this.nodeIdx = nodePt.map(j => this.path.findIndex(q => q[3] === j));
    this.walkFrames = {};
    el.querySelectorAll('button.plank').forEach((b, i) => { b.style.backgroundImage = `url(${plankBoard(64, 1, 18, 11 + i * 3).toDataURL()})`; });
    this.slice = logSlice(['0000000'], 9).toDataURL();
    el.querySelector('#mapClose').addEventListener('click', e => { e.preventDefault(); this.close(); });
    // Levelkiezer: een wereld kiezen, of het vorige/volgende level. De kaart schuift er vanzelf heen.
    el.querySelectorAll('.mworlds button').forEach(b => b.addEventListener('click', e => { e.preventDefault();
      const w = +b.dataset.w, idx = this.levels.map((L, i) => i).filter(i => this.levels[i].world === w);
      const open = idx.filter(i => i < this.save.unlocked); this.select(open.length ? open[open.length - 1] : idx[0], 'smooth'); }));
    el.querySelector('#mapPrev').addEventListener('click', e => { e.preventDefault(); this.select(Math.max(0, (this.sel ?? 0) - 1), 'smooth'); });
    el.querySelector('#mapNext').addEventListener('click', e => { e.preventDefault(); this.select(Math.min(this.levels.length - 1, (this.sel ?? 0) + 1), 'smooth'); });
    el.querySelector('#mapPlay').addEventListener('click', e => { e.preventDefault(); if (this.sel != null && this.sel < this.save.unlocked) this.onPlay(this.sel); });
    // Slepen met de muis; wieltje schuift horizontaal
    let drag = null;
    this.scroll.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.target.closest('button')) return; drag = { x: e.clientX, y: e.clientY, s: this.scroll.scrollLeft, t: this.scroll.scrollTop }; this.scroll.style.cursor = 'grabbing'; });
    addEventListener('pointermove', e => { if (drag) { this.scroll.scrollLeft = drag.s - (e.clientX - drag.x); this.scroll.scrollTop = drag.t - (e.clientY - drag.y); } });
    addEventListener('pointerup', () => { drag = null; this.scroll.style.cursor = ''; });
    
    addEventListener('resize', () => { if (!this.el.hidden) this.layout(); });
  }
  open() { if (!this.map) { const r = bakeMap(); this.map = r.cv; this.mask = r.mask; } this.el.hidden = false; this.layout(true); }
  close() { this.el.hidden = true; }
  // Pad, knopen en borden op de juiste schaal neerzetten
  layout(center) {
    const k = Math.max(this.scroll.clientHeight / 210, this.scroll.clientWidth / MW), cv = this.cv, c = cv.getContext('2d');   // ongeveer 26 breedtegraden in beeld
    const done = Math.min(this.save.unlocked, this.levels.length);   // levels 0..done-1 zijn open
    cv.width = MW; cv.height = MH; cv.style.width = Math.round(MW * k) + 'px'; cv.style.height = Math.round(MH * k) + 'px'; this.inner.style.width = Math.round(MW * k) + 'px'; this.inner.style.height = Math.round(MH * k) + 'px';
    this.drawPaths();
    // Knopen
    this.inner.querySelectorAll('.mnode,.mwalker,.msign').forEach(n => n.remove());
    this.levels.forEach((L, i) => {
      const [x, y] = P(...(SITES[L.id] || [0, 0])), b = document.createElement('button');
      b.className = 'mnode' + (i >= done ? ' locked' : ''); b.style.left = x * k + 'px'; b.style.top = y * k + 'px'; b.style.backgroundImage = `url(${this.slice})`;
      const art = this.save.best[L.id]?.artifacts || 0;
      b.innerHTML = `${L.id}${i < done ? `<span class="art">${'◆'.repeat(art)}${'◇'.repeat(3 - art)}</span>` : ''}`;
      b.setAttribute('aria-label', `${L.id} ${L.name}${i >= done ? ' (op slot)' : ''}`);
      b.addEventListener('click', e => { e.preventDefault(); this.select(i); });
      this.inner.appendChild(b);
    });
    const nb = document.createElement('button'); nb.className = 'mnode locked'; const [ex, ey] = P(...EXTRA); nb.style.left = ex * k + 'px'; nb.style.top = ey * k + 'px'; nb.style.backgroundImage = `url(${this.slice})`; nb.textContent = '★';
    nb.addEventListener('click', e => { e.preventDefault(); this.select(-1); }); this.inner.appendChild(nb);
    for (const [lo, la, t, s] of SIGNS) { const [x, y] = P(lo, la), d = document.createElement('div'); d.className = 'msign'; d.style.left = x * k + 'px'; d.style.top = y * k + 'px'; d.innerHTML = `${t}<small>${s}</small>`; this.inner.appendChild(d); }
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
    if (this.levels[i] && this.levels[i].world !== this.shownWorld) this.drawPaths();
    // Wereldknoppen bijwerken
    this.el.querySelectorAll('.mworlds button').forEach(b => { const w = +b.dataset.w; b.classList.toggle('on', w === L.world); b.classList.toggle('lock', !this.levels.some((Q, j) => Q.world === w && j < this.save.unlocked)); });
    if (scroll) { const [x, y] = P(...SITES[L.id]); this.scroll.scrollTo({ left: x * this.k - this.scroll.clientWidth / 2, top: y * this.k - this.scroll.clientHeight / 2, behavior: scroll === 'smooth' ? 'smooth' : 'auto' }); }
    this.follow = scroll !== 'smooth';   // na een sprong met de kiezer niet meteen terugschuiven naar het poppetje
    if (open) this.walkTo(this.nodeIdx[i]);
  }
  // Kaart + paden. Alleen de route van de gekozen wereld is een zandpad; andere werelden zijn vage stippels.
  drawPaths() {
    const c = this.cv.getContext('2d'), done = Math.min(this.save.unlocked, this.levels.length);
    const W = this.levels[this.sel >= 0 ? this.sel : done - 1]?.world; this.shownWorld = W;
    const wet = (x, y) => this.mask[Math.round(y) * MW + Math.round(x)] === 1;
    c.drawImage(this.map, 0, 0);
    const mine = seg => this.levels[seg]?.world === W;
    for (const [x, y, seg] of this.path) { if (mine(seg)) continue; const X = Math.round(x), Y = Math.round(y); if ((X + Y) % 6 > 1) continue;
      c.fillStyle = seg < done ? '#fff4c8aa' : '#00000030'; c.fillRect(X, Y, 2, 2); }
    for (const [x, y, seg] of this.path) { if (!mine(seg)) continue; const open = seg < done, X = Math.round(x), Y = Math.round(y);
      if (!open) { if ((X + Y) % 7 < 3) { c.fillStyle = '#00000050'; c.fillRect(X - 1, Y - 1, 3, 3); } continue; }
      c.fillStyle = wet(x, y) ? '#3a2412' : '#7a4a20'; c.fillRect(X - 3, Y - 3, 7, 7); }
    for (const [x, y, seg] of this.path) { if (!mine(seg) || seg >= done) continue; const X = Math.round(x), Y = Math.round(y);
      c.fillStyle = wet(x, y) ? ((X + Y) % 4 < 2 ? '#c8904c' : '#9a6430') : '#f8e4a8'; c.fillRect(X - 2, Y - 2, 5, 5); }
  }
  // Het poppetje wandelt over het pad naar het gekozen level (de camera loopt mee)
  walkTo(target) {
    this.wtarget = target; if (this.walking) return; this.walking = true;
    let last = performance.now(), dist = 0;
    const tick = now => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (this.el.hidden) { this.wpos = this.wtarget; this.walking = false; return; }
      const d = this.wtarget - this.wpos, step = Math.min(Math.abs(d), Math.max(120, Math.abs(d) * 2.2) * dt);   // ver weg: sneller lopen
      this.wpos += Math.sign(d) * step; dist += step; this.wdir = Math.sign(d) || this.wdir;
      this.placeWalker(Math.floor(dist / 5) % 2);
      const [x, y] = this.path[Math.round(this.wpos)], sx = x * this.k - this.scroll.scrollLeft, sy = y * this.k - this.scroll.scrollTop;
      const W = this.scroll.clientWidth, H = this.scroll.clientHeight, f = Math.min(1, dt * 4);
      if (this.follow !== false) { if (sx < W * 0.3 || sx > W * 0.7) this.scroll.scrollLeft += (sx - W / 2) * f;
        if (sy < H * 0.3 || sy > H * 0.7) this.scroll.scrollTop += (sy - H / 2) * f; }
      if (Math.abs(this.wtarget - this.wpos) > 0.5) requestAnimationFrame(tick); else { this.wpos = this.wtarget; this.walking = false; this.placeWalker(0); }
    };
    requestAnimationFrame(tick);
  }
  placeWalker(frame = 0) {
    if (!this.walker || this.wpos == null) return;
    const q = this.path[Math.max(0, Math.min(this.path.length - 1, Math.round(this.wpos)))], lv = this.levels[this.sel >= 0 ? this.sel : Math.min(this.save.unlocked, this.levels.length) - 1];   // de soort van het gekozen level
    const look = (lv.look && SPECIES[lv.look]?.look) || {}, key = (lv.look || 'habilis') + frame;
    const spr = this.walkFrames[key] || (this.walkFrames[key] = walkerSprite(look, frame));
    const c = this.walker.getContext('2d'); c.clearRect(0, 0, 9, 13); c.save(); if (this.wdir < 0) { c.translate(9, 0); c.scale(-1, 1); } c.drawImage(spr, 0, 0); c.restore();
    const k = this.k || 1; this.walker.style.left = (q[0] * k - 4.5 * k * 1.25) + 'px'; this.walker.style.top = (q[1] * k - 13 * k * 1.25 - 14) + 'px';
  }
}
