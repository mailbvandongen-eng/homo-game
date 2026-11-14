import { WIND, steep } from './world.js';

// zo steil (meters omhoog per meter) dat een dier er niet op of af gaat; het kijkt WALL_AHEAD meter voor zijn neus
const WALL = 0.75, WALL_AHEAD = 1.3;

// De gedeelde basis voor alle dieren: hoe een dier jou opmerkt (zien, ruiken) en hoe het zich verplaatst.
// Elke soort heeft zijn eigen gedrag (grazen, loeren, jagen), maar ze merken je op en bewegen via deze ene plek.
// Zo klopt het overal op dezelfde manier: sluipen, dekking en wind werken voor elk dier volgens dezelfde regels.

export function turn(a, b, k) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * Math.min(1, k); }

// Hoe scherp elke soort is, in meters.
// - see: zo ver ziet het dier een mens die rechtop loopt; sneak: als je sluipt; hid: als je achter iets zit of in hoog gras
// - notice: het bereik schaalt mee met hoe opvallend je bent (stilstaan, bukken, gras) in plaats van met twee vaste treden
// - smell: zo ver ruikt het dier je als de wind van jou naar het dier waait (ontbreekt = het ruikt je in het spel niet)
// - close: een tweede, kleinere kring (de reus: binnen 'see' wordt hij onrustig, binnen 'close' valt hij aan)
export const SENSES = {
  herd: { see: 34, notice: true, smell: 48 },          // de kudde (impala's, gazellen): scherpe ogen en een goede neus
  zebra: { see: 14, sneak: 7 },
  gazelle: { see: 16, sneak: 7 },                       // het gewonde dier dat alleen loopt
  giant: { see: 20, sneak: 8, hid: 4, close: { see: 11, sneak: 4.5, hid: 3 } },
};
const reach = (S, player, hid) => (hid ? S.hid || 0 : S.notice ? S.see * player.noticeable : player.sneaking ? S.sneak : S.see);

// Wat merkt dit dier (op plek a) van de speler?
// d: afstand · hid: je zit in dekking · sight: zo ver ziet het je nu · seen · smelled · close: je bent binnen de kleine kring
export function sense(kind, a, player) {
  const S = SENSES[kind]; if (!S) throw new Error('geen zintuigen bekend voor: ' + kind);
  const p = player.pos, d = Math.hypot(p.x - a.x, p.z - a.z), hid = player.hiddenFrom(a.x, a.z), sight = reach(S, player, hid);
  const smelled = !!S.smell && d < S.smell && ((a.x - p.x) * WIND.x + (a.z - p.z) * WIND.z) / d > 0.6;
  return { d, hid, sight, seen: d < sight, smelled, close: !!S.close && d < reach(S.close, player, hid) };
}

// Eén stap lopen: snelheid bijtrekken naar spd, draaien naar de richting (tx, tz) en vooruit.
// accel: hoe snel het dier op snelheid komt; rate: hoe snel het draait. Staat het stil en is er iets om naar te kijken (face), dan draait het daarheen.
export function step(m, tx, tz, spd, dt, accel, rate, face = null, faceRate = 4) {
  m.speed += (spd - m.speed) * (1 - Math.exp(-dt * accel));
  // m.wallT: het dier liep net tegen een wand of de rand van een kloof en loopt er een stukje langs
  const want = Math.atan2(tx, tz) + (m.wallT > 0 ? m.wallSide * 1.5 : 0);
  if (spd > 0) m.yaw = turn(m.yaw, want, dt * rate);
  else if (face) m.yaw = turn(m.yaw, Math.atan2(face.x - m.x, face.z - m.z), dt * faceRate);
  if (m.wallT > 0) m.wallT -= dt;
  const sx = Math.sin(m.yaw), sz = Math.cos(m.yaw), d = m.speed * dt;
  // geen dier gaat een wand op of af
  if (d > 1e-4 && steep(m.x + sx * WALL_AHEAD, m.z + sz * WALL_AHEAD) > WALL && steep(m.x, m.z) < WALL) {
    if (!(m.wallT > 0)) m.wallSide = Math.random() < 0.5 ? -1 : 1;
    m.wallT = 1.6; m.speed *= Math.exp(-dt * 6);
    return;
  }
  m.x += sx * d; m.z += sz * d;
}
