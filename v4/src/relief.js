// Reliëf: wat een gebied zijn eigen vorm geeft, bovenop het glooiende land.
// Het gebiedsbestand somt het op onder 'relief'. Plekken zijn [x, z] in meters.
// - geul:  { kind: 'geul', path, w, d, lift }       een droge bedding of kloof langs een lijn; w = halve breedte, d = diepte, lift = zoveel hoger ligt het land eromheen.
//                                                    Bij een diepe, smalle geul zijn de wanden te steil om te lopen: je moet er aan een eind in of uit.
// - breuk: { kind: 'breuk', path, h, up, back, gaps } een breuktrap: aan één kant van de lijn ligt het land h meter hoger (up: 1 of -1 kiest de kant).
//                                                    De wand is te steil om te lopen. gaps: plekken langs de lijn (0..1) waar een puinhelling omhoog loopt.
// - kop:   { kind: 'kop', at, r, h, rocks }          een rotskop: een bult met een stapel grote keien erop (de keien zet world.js neer).
const ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Het dichtste punt op een gebroken lijn: [afstand, kant (+1 of -1), hoe ver langs de lijn (0..1)]
export function along(path, x, z) {
  if (!path.len) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); path.len = L; }
  let best = 1e9, side = 1, u = 0, at = 0;
  for (let i = 1; i < path.length; i++) {
    const ax = path[i - 1][0], az = path[i - 1][1], dx = path[i][0] - ax, dz = path[i][1] - az, L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; side = dx * (z - az) - dz * (x - ax) >= 0 ? 1 : -1; u = (at + t * L) / path.len; }
    at += L;
  }
  return [best, side, u];
}

// h: de hoogte van het glooiende land op (x, z); terug komt de hoogte met het reliëf erin. noise(x, z) geeft 0..1.
export function shape(list, x, z, h, noise) {
  for (const f of list) {
    if (f.kind === 'kop') {
      const d = Math.hypot(x - f.at[0], z - f.at[1]);
      if (d < f.r) h += Math.cos(d / f.r * Math.PI / 2) ** 2 * f.h;
      continue;
    }
    const [dist, side, u] = along(f.path, x, z);
    const taper = ss(u, 0, 0.12) * (1 - ss(u, 0.88, 1));
    if (f.kind === 'geul') {
      const lift = f.lift || 0;
      if (dist > f.w + 3 + (lift ? 20 : 0)) continue;
      // het land eromheen ligt wat hoger (lift): zo kan de geul diep zijn zonder onder water te lopen
      h += lift * taper * (1 - ss(dist, f.w * 1.5, f.w * 1.5 + 16));
      const d = dist + (noise(x * 0.09, z * 0.09) - 0.5) * 2.4;      // de rand kronkelt
      // de bodem blijft droog: nooit lager dan een handbreed boven het water
      h = Math.max(h - f.d * taper * (1 - ss(d, f.w * 0.3, f.w)), Math.min(h, 0.3));
    } else if (f.kind === 'breuk') {
      const back = f.back || 45, s = dist * side * (f.up || 1);
      if (s < -8 || s > back) continue;
      // een puinhelling: daar is de wand breed en dus te belopen
      let face = 1.4;
      for (const g of f.gaps || []) face += 13 * (1 - ss(Math.abs(u - g) * f.path.len, 4, 11));
      const H = f.h * taper * (0.8 + 0.4 * noise(x * 0.05 + 7, z * 0.05));
      h += H * ss(s, -face / 2, face / 2) * (1 - ss(s, face / 2 + 2, back));
    }
  }
  return h;
}

// Ligt dit punt op of vlak bij reliëf? (voor de controle dat er niets van het spel in een kloof of wand staat)
export function nearRelief(list, x, z, margin = 4) {
  for (const f of list) {
    if (f.kind === 'kop') { if (Math.hypot(x - f.at[0], z - f.at[1]) < f.r + margin) return f; continue; }
    const [dist, side] = along(f.path, x, z);
    if (f.kind === 'geul' && dist < f.w + margin + (f.lift ? 8 : 0)) return f;
    if (f.kind === 'breuk' && dist * side * (f.up || 1) > -margin - 2 && dist < 8 + margin) return f;
  }
  return null;
}
