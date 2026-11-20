import { WALK, height, steep, blockers } from '../world.js';

// Een looproute over het land, om rotsen, stammen en water heen. De groep loopt hem als ze naar een nieuw kamp trekt (zie trek.js).
// Het land wordt een raster van vakjes van twee meter. Een vakje met een rots of stam erin is dicht; water en steile
// hellingen kosten veel, zodat de route er alleen doorheen gaat als het niet anders kan (de doorwaadbare plek in de rivier).
const CELL = 2, N = Math.ceil(WALK * 2 / CELL), at = (i) => -WALK + (i + 0.5) * CELL, cell = (v) => Math.max(0, Math.min(N - 1, Math.floor((v + WALK) / CELL)));

function grid() {
  const cost = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = at(i), z = at(j), h = height(x, z), s = steep(x, z);
    cost[j * N + i] = 1 + (h < 0.25 ? 30 : 0) + (s > 0.45 ? (s - 0.45) * 40 : 0);
  }
  for (const b of blockers) {
    if (!(b.r > 0) || b.beast) continue;
    const r = b.r + 0.9, i0 = cell(b.x - r), i1 = cell(b.x + r), j0 = cell(b.z - r), j1 = cell(b.z + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(at(i) - b.x, at(j) - b.z) < r + CELL * 0.5) cost[j * N + i] = Infinity;
  }
  return cost;
}
// het dichtstbijzijnde open vakje (een kamp ligt soms vlak tegen een rots)
function open(cost, x, z) {
  const ci = cell(x), cj = cell(z);
  for (let r = 0; r < 8; r++) for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    if (i < 0 || j < 0 || i >= N || j >= N || Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
    if (cost[j * N + i] < 9) return j * N + i;
  }
  return cj * N + ci;
}
function leg(cost, a, b) {
  const s = open(cost, a[0], a[1]), e = open(cost, b[0], b[1]), ei = e % N, ej = (e - ei) / N;
  const g = new Float32Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1), heap = [];
  const push = (n, f) => { heap.push([f, n]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) { heap[0] = last; let k = 0; for (;;) { let m = k; const l = k * 2 + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
    return top[1];
  };
  g[s] = 0; push(s, 0);
  while (heap.length) {
    const n = pop(); if (n === e) break;
    const i = n % N, j = (n - i) / N;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const x = i + di, y = j + dj; if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const m = y * N + x, c = cost[m]; if (c === Infinity) continue;
      if (di && dj && (cost[j * N + x] === Infinity || cost[y * N + i] === Infinity)) continue;   // niet schuin langs een hoek schuren
      const ng = g[n] + c * (di && dj ? 1.414 : 1);
      if (ng < g[m]) { g[m] = ng; from[m] = n; push(m, ng + Math.hypot(x - ei, y - ej)); }
    }
  }
  if (from[e] < 0 && e !== s) return [b];   // geen weg gevonden: rechtuit (de groep heeft een vangnet, zie trek.js)
  const cells = []; for (let n = e; n >= 0; n = from[n]) cells.push(n);
  cells.reverse();
  // rechttrekken: een punt mag weg als je van het vorige naar het volgende vrij en droog kunt lopen
  const P = cells.map((n) => [at(n % N), at((n - n % N) / N), cost[n]]);
  const clear = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]), k = Math.ceil(d / (CELL * 0.5)); for (let t = 0; t <= k; t++) { if (cost[cell(p[1] + (q[1] - p[1]) * t / k) * N + cell(p[0] + (q[0] - p[0]) * t / k)] > 1.5) return false; } return true; };
  const out = []; let k = 0;
  while (k < P.length - 1) {
    let m = k + 1;
    if (P[k][2] <= 1.5) for (let t = Math.min(P.length - 1, k + 60); t > k + 1; t--) if (clear(P[k], P[t])) { m = t; break; }
    out.push([P[m][0], P[m][1]]); k = m;
  }
  out.push(b);
  return out;
}
// from: waar ze nu staan · stops: de punten waarlangs ze gaan, het laatste is het nieuwe kamp
export function route(from, stops) {
  const cost = grid(), out = []; let a = from;
  for (const s of stops) { out.push(...leg(cost, a, s)); a = s; }
  return out;
}
