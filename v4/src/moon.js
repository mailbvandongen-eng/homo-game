import * as THREE from '../lib/three.module.js';

// De maan. Ze loopt dezelfde baan als de zon, van oost (+x) naar west, en blijft elke dag een stukje achter:
// in 29,5 dag van nieuwe maan via volle maan weer naar nieuwe maan. Bij wassende maan staat ze 's avonds al aan de hemel,
// bij volle maan komt ze op als de zon ondergaat, daarna komt ze elke nacht later. Rond nieuwe maan is de nacht echt donker.
const MONTH = 29.53, START = 10;   // het spel begint een paar dagen voor volle maan
const M = { dir: new THREE.Vector3(), sun: new THREE.Vector3(), phase: 0, lit: 0, up: 0, glow: 0 };
const onPath = (v, a) => v.set(Math.cos(a), Math.sin(a) * 0.86, -0.36).normalize();

// day: de hoeveelste dag · p: moment van de dag (0 = dageraad, 0,8 = de zon is onder)
export function moonAt(day, p) {
  const ts = p < 0.8 ? p / 0.8 * Math.PI : Math.PI + (p - 0.8) / 0.2 * Math.PI;
  M.phase = ((day + p + START) / MONTH % 1) * Math.PI * 2;
  onPath(M.sun, ts); onPath(M.dir, ts - M.phase);
  M.lit = (1 - Math.cos(M.phase)) / 2;                       // welk deel van de schijf verlicht is
  M.up = THREE.MathUtils.smoothstep(M.dir.y, 0.0, 0.16);     // boven de horizon
  M.glow = M.lit * M.up;                                     // hoeveel maanlicht er op het land valt
  return M;
}
