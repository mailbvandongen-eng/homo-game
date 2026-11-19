import * as THREE from '../lib/three.module.js';
import { variantsOf } from './assets.js';
import { AREA } from './eras/index.js';
import { shape } from './relief.js';

// Het land van één gebied. Twee vormen: 'rift' (land met een rivier erdoor) en 'lake' (een oever met een meer in het noorden).
// Welke vorm, en waar de vaste bomen, het hoge gras en de poelen liggen, staat in het gebiedsbestand.
// Onder 'land' staat daar ook wat dit gebied tot een eigen land maakt: de glooiing, de loop van de rivier, wat er groeit,
// welke steen er ligt, de grond en het licht. Zonder 'land' krijg je de savanne.
// Alle maten in meters. Het midden van de kaart is (0, 0); je kunt tot WALK meter van het midden lopen.
export const SIZE = 440;
export const WALK = 175;
export const WATER = 0;

// ---------- ruis ----------
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); f *= 2; amp *= 0.5; }
  return s;
}

// Een vaste "willekeur" zodat de wereld elke keer hetzelfde is
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ---------- vorm van het land ----------
export const LAKE = AREA.terrain === 'lake';
// hoe het land eruitziet kan per gebied verschillen (grondkleur, groen, nevel)
const LK = AREA.look || {}, FOG = LK.fog || [45, 230], MIST = LK.mist ? [new THREE.Color(LK.mist[0]), LK.mist[1]] : null;
const START = AREA.start || [2, -6], HILL = AREA.hill || null, POOLS = AREA.pools || [], ISLE = AREA.island || null;
// land: shift = een ander stuk van de ruis (andere heuvels en dalen), amp = hoe hoog, freq = hoe breed, fine = hoe ruw de grond is,
// river = [z, uitslag, golf, begin, uitslag, golf, begin]: twee bochten over elkaar
const LAND = AREA.land || {}, NS = LAND.shift || [0, 0], AMP = LAND.amp || (LAKE ? 12 : 14), FREQ = LAND.freq || 0.006, FINE = LAND.fine || 0.9;
const RV = LAND.river || [55, 38, 0.011, 0, 14, 0.027, 1.3];
const GT = LAND.ground || {}, SKY = LAND.sky || {}, GR = LAND.grass || {};
// Alle vaste plekken uit het gebiedsbestand (stenen, bomen, het kamp ...): wat het land zelf strooit, blijft daar vanaf.
const KEEP = [];
(function walk(v, d) {
  if (v == null || typeof v !== 'object' || d > 3) return;
  if (Array.isArray(v)) { if (typeof v[0] === 'number' && typeof v[1] === 'number' && v.length < 5) KEEP.push([v[0], v[1]]); else v.forEach((e) => walk(e, d + 1)); return; }
  if (Number.isFinite(v.x) && Number.isFinite(v.z)) { KEEP.push([v.x, v.z]); return; }
  for (const k of Object.keys(v)) if (!['look', 'land', 'outro', 'riverStones', 'leaves', 'island', 'weather'].includes(k)) walk(v[k], d + 1);
})(AREA, 0);
const clear = (x, z, r = 3.5) => !KEEP.some((q) => Math.abs(q[0] - x) < r && Math.abs(q[1] - z) < r && Math.hypot(q[0] - x, q[1] - z) < r);
// rift: het midden van de rivier. lake: de waterlijn; alles ten noorden daarvan is meer.
export function riverZ(x) { return LAKE ? 62 + 9 * Math.sin(x * 0.02) + 4 * Math.sin(x * 0.055 + 1) : RV[1] * Math.sin(x * RV[2] + RV[3]) + RV[4] * Math.sin(x * RV[5] + RV[6]) + RV[0]; }

export function riverDist(x, z) { return LAKE ? Math.max(0, riverZ(x) - z) : Math.abs(z - riverZ(x)); }
// welke kant op is het droge? (voor dieren die te dicht bij het water komen)
export function awayZ(x, z) { return LAKE || z < riverZ(x) ? -1 : 1; }
export function poolAt(x, z) { for (const p of POOLS) if (Math.hypot(x - p[0], z - p[1]) < p[2]) return p; return null; }
// Zwemmen kan niemand: water is een grens. depth() is hoe diep het water staat (0 = droog).
export function depth(x, z) { return Math.max(0, WATER - 0.35 - height(x, z)); }
// De doorwaadbare plek van de rivier: alleen hier ligt de bodem hoog genoeg om over te steken (het meer heeft er geen).
export const FORD = LAKE ? null : { x: AREA.ford ?? 30, w: 7 };

function lakeHeight(x, z) {
  let h = 2.2 + (fbm(x * FREQ + 10 + NS[0], z * FREQ + 3 + NS[1]) - 0.5) * AMP;
  if (h < 1.6) h = 1.6 - (1.6 - h) * 0.12;
  h += (fbm(x * 0.04 + NS[0], z * 0.04 + NS[1], 2) - 0.5) * FINE;
  const s = z - riverZ(x);   // meters het meer in
  // een vlak, modderig strand dat langzaam het water in loopt; verderop wordt het diep
  if (s < 0) h = -0.35 + (h + 0.35) * THREE.MathUtils.smoothstep(-s, 0, 24);
  else h = Math.max(-2.8, -0.35 - s * 0.055);
  // poelen die achterblijven als het meer zakt
  for (const [px, pz, r] of POOLS) {
    const d = Math.hypot(x - px, z - pz);
    if (d < r * 1.6) h += (-0.72 - h) * (1 - THREE.MathUtils.smoothstep(d, r * 0.45, r * 1.6));
  }
  // de zandbank, met een ondiepe drempel ernaartoe
  if (ISLE) {
    const iz = riverZ(ISLE.x) + ISLE.river, d = Math.hypot(x - ISLE.x, z - iz);
    if (d < ISLE.r + 8) h = Math.max(h, 0.7 - (d / ISLE.r) ** 2 * 1.3);
    if (z > riverZ(ISLE.x) - 2 && z < iz) h = Math.max(h, -0.66 - Math.max(0, Math.abs(x - ISLE.x) - 3) * 0.45);
  }
  // de wanden van de Riftvallei: niet in het meer
  const r = Math.max(Math.abs(x), -z);
  if (r > WALK - 25) h += Math.pow((r - (WALK - 25)) / 30, 2) * 14 * (0.7 + fbm(x * 0.02, z * 0.02) * 0.6);
  if (HILL) { const kd = Math.hypot(x - HILL[0], z - HILL[1]); if (kd < 22) h += Math.cos(kd / 22 * Math.PI / 2) ** 2 * 7; }
  return h;
}

// Het glooiende land, als formule. Het spel zelf vraagt de hoogte aan height(): die leest het raster hieronder.
function baseHeight(x, z) {
  if (LAKE) return lakeHeight(x, z);
  let h = 2.2 + (fbm(x * FREQ + 10 + NS[0], z * FREQ + 3 + NS[1]) - 0.5) * AMP;
  // lage plekken vlak afronden: alleen de rivier staat onder water
  if (h < 1.6) h = 1.6 - (1.6 - h) * 0.12;
  h += (fbm(x * 0.04 + NS[0], z * 0.04 + NS[1], 2) - 0.5) * FINE;
  // de rivierbedding
  const d = riverDist(x, z);
  const bed = d < 7 ? -1.6 : d < 18 ? -1.6 + (d - 7) / 11 * 1.6 : 0;
  const bank = THREE.MathUtils.smoothstep(d, 4, 26);
  h = h * bank + bed + (1 - bank) * 0.6;
  // het midden is te diep om te staan; alleen bij de doorwaadbare plek ligt de bodem hoger
  const off = THREE.MathUtils.smoothstep(Math.abs(x - FORD.x), FORD.w, FORD.w + 10);
  h += (1 - THREE.MathUtils.smoothstep(d, 2.5, 8.5)) * (0.05 - off * 1.45);
  // de wanden van de Riftvallei aan de rand
  const r = Math.max(Math.abs(x), Math.abs(z));
  if (r > WALK - 25) h += Math.pow((r - (WALK - 25)) / 30, 2) * 14 * (0.7 + fbm(x * 0.02, z * 0.02) * 0.6);
  // een rotsheuvel om vanaf te kijken: alleen waar het gebied er een noemt
  if (HILL) { const kd = Math.hypot(x - HILL[0], z - HILL[1]); if (kd < 22) h += Math.cos(kd / 22 * Math.PI / 2) ** 2 * 7; }
  return h;
}

// ---------- het raster ----------
// De hoogte van het land ligt vast in een raster, één punt per hoekpunt van het getekende land.
// height() rekent tussen die punten precies zoals het land getekend wordt: je voeten staan dus altijd óp de grond, ook op een steile wand.
export const RELIEF = AREA.relief || [];
export const SEG = 256, CELL = SIZE / SEG;
const GRID = new Float32Array((SEG + 1) * (SEG + 1));
for (let j = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) {
  const x = i * CELL - SIZE / 2, z = j * CELL - SIZE / 2;
  GRID[j * (SEG + 1) + i] = shape(RELIEF, x, z, baseHeight(x, z), vnoise);
}
export function height(x, z) {
  const gx = Math.min(SEG - 1e-4, Math.max(0, (x + SIZE / 2) / CELL)), gz = Math.min(SEG - 1e-4, Math.max(0, (z + SIZE / 2) / CELL));
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, k = j * (SEG + 1) + i;
  const a = GRID[k], d = GRID[k + 1], b = GRID[k + SEG + 1], c = GRID[k + SEG + 2];
  // elk vak is twee driehoeken, met de schuine lijn van b naar d
  return fx + fz <= 1 ? a + (d - a) * fx + (b - a) * fz : c + (b - c) * (1 - fx) + (d - c) * (1 - fz);
}
// Hoe steil het land hier is: meters omhoog per meter vooruit (1 = 45 graden)
export function steep(x, z) {
  const e = CELL * 0.6;
  return Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
}
// Te steil om tegenop te lopen
export const CLIMB = 1.15;

// Grote keien: daar kun je op staan. Elke kei heeft een hoogtekaartje van zijn bovenkant, gemeten aan het model.
const solids = [];
function profile(v) {
  if (v.prof) return v.prof;
  const G = 14, top = new Float32Array(G * G).fill(-1);
  for (const part of v.parts) {
    const p = part.geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const cx = Math.min(G - 1, Math.max(0, Math.floor((p.getX(i) / v.size.x + 0.5) * G))), cz = Math.min(G - 1, Math.max(0, Math.floor((p.getZ(i) / v.size.z + 0.5) * G)));
      if (p.getY(i) > top[cz * G + cx]) top[cz * G + cx] = p.getY(i);
    }
  }
  return (v.prof = { G, top });
}
function rockTop(s, x, z) {
  const dx = x - s.x, dz = z - s.z;
  if (dx * dx + dz * dz > s.r2) return -1e9;
  const lx = (dx * s.cos - dz * s.sin) / s.k, lz = (dx * s.sin + dz * s.cos) / s.k, { G, top } = s.prof;
  const gx = (lx / s.sx + 0.5) * G - 0.5, gz = (lz / s.sz + 0.5) * G - 0.5;
  if (gx < -0.5 || gz < -0.5 || gx > G - 0.5 || gz > G - 0.5) return -1e9;
  const i = Math.min(G - 2, Math.max(0, Math.floor(gx))), j = Math.min(G - 2, Math.max(0, Math.floor(gz))), fx = Math.min(1, Math.max(0, gx - i)), fz = Math.min(1, Math.max(0, gz - j));
  const a = top[j * G + i], b = top[j * G + i + 1], c = top[(j + 1) * G + i], d = top[(j + 1) * G + i + 1];
  if (Math.min(a, b, c, d) < 0) return -1e9;   // naast de kei
  return s.base + (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) * s.k;
}
// Waar je voeten op staan: de grond, of de bovenkant van een grote kei
export function surface(x, z) {
  let h = height(x, z);
  for (const s of solids) { const t = rockTop(s, x, z); if (t > h) h = t; }
  return h;
}

// Hoog gras: hier kun je je verstoppen
export const TALL_GRASS = AREA.tallGrass;
// Waar loop je op? (voor het geluid van je voeten)
export function groundAt(x, z) {
  const h = height(x, z);
  if (h < WATER - 0.4) return 'water';
  if (surface(x, z) > h + 0.1 || steep(x, z) > 0.75) return 'rots';
  if (h < WATER - 0.05 || riverDist(x, z) < 5) return 'modder';
  const n = fbm(x * 0.03 + 5, z * 0.03, 3), n2 = fbm(x * 0.11, z * 0.11, 2);
  return (n - 0.22) * 2.6 + (n2 - 0.5) * 0.8 > 0.45 ? 'gras' : 'aarde';
}
export function tallGrassAt(x, z) {
  for (const [px, pz, r] of TALL_GRASS) { const dx = x - px, dz = z - pz; if (dx * dx + dz * dz < r * r) return true; }
  return false;
}

// Botsingen met bomen en rotsen: eenvoudige cirkels
export const blockers = [];
// waar je gebukt achter kunt wegduiken: grote rotsen en dichte struiken
export const cover = [];


// blad: uitgeknipt uit een foto, met licht van boven op beide kanten
export function leafMat(map, tint) {
  const m = new THREE.MeshStandardMaterial({ map, color: tint, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, emissive: 0x1a2408 });
  // bladeren laten licht door: beide kanten krijgen licht van boven, anders is de onderkant zwart
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;');
    // fijne blaadjes verdwijnen op afstand uit de verkleinde textuur: dekking versterken
    sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a = min(1.0, diffuseColor.a * 2.5);\n#include <alphatest_fragment>');
  };
  return m;
}
// waar de acacia's staan: [x, z, maat] (onder een boom ligt wel eens een tak)
export const TREES = [];
// boomtoppen waar een gier kan zitten: plek, hoogte, en of er twee naast elkaar passen
export const PERCHES = [];
export const NEST = { w: 2.1, y: -0.3 };   // het gierennest: breedte in meters, en hoe ver het in de kruin zakt

export function buildWorld(scene, A) {
  const R = rng(LAND.seed || 7), STEEP = 0.8, OWN = !!LAND.seed;   // een gebied met een eigen land strooit anders

  // ---------- lucht en nevel ----------
  const skyGeo = new THREE.SphereGeometry(600, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x6f9cc8) }, mid: { value: new THREE.Color(0xf2d39a) }, low: { value: new THREE.Color(0xe8b47a) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff0d0) }, cloud: { value: new THREE.Color(0xffffff) }, uTime: { value: 0 }, cover: { value: 0 },
      tSky: { value: A.sky }, skyMix: { value: 1 }, skyTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    // verloop van de lucht, een zon met gloed en wolkenslierten
    fragmentShader: `uniform vec3 top, mid, low, sunCol, cloud, sunDir, skyTint; uniform float uTime, skyMix, cover; uniform sampler2D tSky; varying vec3 vp;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        float y = vp.y;
        vec3 c = y > 0.0 ? mix(mid, top, pow(clamp(y*2.2,0.0,1.0), 0.7)) : low;
        float sd = max(dot(normalize(vp), normalize(sunDir)), 0.0);
        c += sunCol * (pow(sd, 8.0) * 0.35 + pow(sd, 90.0) * 0.6 + smoothstep(0.9993, 0.9997, sd) * 2.0);
        if (y > 0.0) {
          vec2 uv = vp.xz / (y + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.002);
          float cl = smoothstep(0.52 - cover * 0.5, 0.8 - cover * 0.42, fbm(uv)) * smoothstep(0.0, 0.25 - cover * 0.2, y);
          vec3 cc = mix(cloud, sunCol, pow(sd, 6.0) * 0.6 * (1.0 - cover)) * (1.0 - cover * 0.38 * smoothstep(0.35, 0.9, fbm(uv * 1.7 + 4.0)));
          c = mix(c, cc, cl * (0.75 + cover * 0.22));
        }
        // overdag: de echte luchtfoto (een veld in Zuid-Afrika), 's avonds en 's nachts het verloop hierboven
        vec3 d = normalize(vp);
        vec2 suv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);
        vec3 photo = texture2D(tSky, suv).rgb * skyTint;
        c = mix(c, photo, skyMix);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  scene.fog = new THREE.Fog(0xe9cf9c, FOG[0], FOG[1]);
  scene.environment = A.env;   // licht en weerspiegeling uit de luchtfoto

  // ---------- licht: lage middagzon ----------
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x8a6a3a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 160;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
  sun.userData.offset = new THREE.Vector3(-55, 60, -35);
  scene.add(sun, sun.target);

  // ---------- het land ----------
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = [], mix = [], shoreMix = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = GRID[i];
    pos.setY(i, h);
    // hoeveel verdord gras en hoeveel kort groen gras; de rest is kale droge grond
    const n = fbm(x * 0.03 + 5, z * 0.03, 3), n2 = fbm(x * 0.11, z * 0.11, 2), d = riverDist(x, z);
    let grass = THREE.MathUtils.clamp((n - 0.22) * 2.6 + (n2 - 0.5) * 0.8, 0, 1), green = THREE.MathUtils.clamp((n - 0.55) * 3 + (d < 18 ? (1 - d / 18) * 0.8 : 0), 0, 1);
    if (d < 9) { grass *= d / 9; green *= d / 9; }
    grass *= GT.grass ?? 1; green *= GT.greenK ?? 1;
    if (h > 9) { const k = THREE.MathUtils.clamp(1 - (h - 9) / 5, 0, 1); grass *= k; green *= k; }
    // op een steile wand ligt geen aarde: daar zie je de kale rots
    const bare = THREE.MathUtils.smoothstep(steep(x, z), 0.75, 1.25);
    mix.push(grass * (1 - bare), green * (1 - bare), bare);
    // een eigen grond langs het water (modder die opdroogt en barst): ook rond de poelen
    if (GT.shore) {
      let e = d; for (const q of POOLS) e = Math.min(e, Math.max(0, Math.hypot(x - q[0], z - q[1]) - q[2]));
      shoreMix.push((1 - THREE.MathUtils.smoothstep(e + (n2 - 0.5) * 8, GT.shoreW * 0.45, GT.shoreW)) * (1 - bare));
    }
    // licht kleurverschil: natter en donkerder bij het water
    const wet = d < 12 ? (1 - d / 12) * 0.35 : 0, v = 0.92 + (n2 - 0.5) * 0.16 - wet;
    cols.push(v, v * (1 - wet * 0.1), v * (1 - wet * 0.2));
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.setAttribute('aMix', new THREE.Float32BufferAttribute(mix, 3));
  if (GT.shore) geo.setAttribute('aShore', new THREE.Float32BufferAttribute(shoreMix, 1));
  geo.computeVertexNormals();
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * SIZE / 4, uv.getY(i) * SIZE / 4);
  const gmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, normalMap: A.tex.dry_ground_01_nor, normalScale: new THREE.Vector2(1.2, 1.2) });
  gmat.onBeforeCompile = (sh) => {
    // de foto's van de grond: kaal, verdord gras, groen gras en rots. Een gebied kan er eigen foto's voor kiezen.
    const T = (n, std) => ({ value: A.tex[(n || std) + '_diff'] }), WALL = GT.wall || [0.45, 0.78, 0.74, 0.72];
    Object.assign(sh.uniforms, { tBare: T(GT.bare, 'dry_ground_01'), tDry: T(GT.dry, 'withered_grass'), tGreen: T(GT.green, 'sparse_grass'), tRock: T(GT.rock, 'dry_ground_rocks'), tShore: T(GT.shore, 'dry_ground_01') });
    sh.vertexShader = `attribute vec3 aMix; ${GT.shore ? 'attribute float aShore; varying float vShore;' : ''} varying vec3 vMix; varying vec2 vW; varying vec3 vFace;\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvMix = aMix; vW = position.xz; vFace = vec3(position.y, normal.x, normal.z);${GT.shore ? ' vShore = aShore;' : ''}`);
    sh.fragmentShader = `uniform sampler2D tBare, tDry, tGreen, tRock, tShore; ${GT.shore ? 'varying float vShore;' : ''} varying vec3 vMix; varying vec2 vW; varying vec3 vFace;\n` + sh.fragmentShader.replace('#include <map_fragment>', `
      // elke foto op twee schalen, zodat je geen herhaling ziet
      vec2 u1 = vW / 4.0, u2 = vW / 13.0 + vec2(0.37, 0.71);
      float big = texture2D(tRock, vW / 37.0).g;
      ${GT.bare ? `// een eigen grondfoto: ook gedraaid en groter, anders zie je van boven een ruitjespatroon
      vec2 u3 = vec2(vW.x * 0.8 - vW.y * 0.6, vW.x * 0.6 + vW.y * 0.8) / 10.3;
      vec3 bare = mix(mix(texture2D(tBare, u1).rgb, texture2D(tBare, u3).rgb, 0.3 + big * 0.5), mix(texture2D(tRock, u2).rgb, texture2D(tRock, u3 * 0.37).rgb, 0.5), ${(GT.rockMix ?? 0.3).toFixed(2)});` : 'vec3 bare = mix(texture2D(tBare, u1).rgb, texture2D(tRock, u2).rgb, 0.45);'}
      vec3 dry = mix(texture2D(tDry, u1 * 0.8).rgb, texture2D(tDry, u2).rgb, 0.4);
      vec3 grn = texture2D(tGreen, u1 * 0.9).rgb;
      vec3 g = mix(bare, dry, smoothstep(0.0, 1.0, vMix.x + (big - 0.5) * 0.6));
      g = mix(g, grn, min(1.0, vMix.y * 0.85 + ${(LK.green || 0).toFixed(2)}));
      ${GT.shore ? 'g = mix(g, mix(texture2D(tShore, vW / 5.0).rgb, texture2D(tShore, u2).rgb, 0.3), smoothstep(0.0, 1.0, vShore + (big - 0.5) * 0.3));' : ''}
      // een steile wand: kale rots, van opzij bekeken (anders rekt de foto uit), met lagen en scheuren
      if (vMix.z > 0.01) {
        float ax = abs(vFace.y), az = abs(vFace.z);
        vec2 r1 = vec2(vW.x, vFace.x * 1.6) / 3.1, r2 = vec2(vW.y, vFace.x * 1.6) / 3.1;
        vec3 rk = (texture2D(tRock, r1).rgb * az + texture2D(tRock, r2).rgb * ax) / max(0.001, ax + az);
        float lum = dot(rk, vec3(0.3, 0.59, 0.11));
        float layer = 0.82 + 0.18 * sin(vFace.x * 7.0 + big * 9.0);
        rk = mix(rk, vec3(lum), ${WALL[0].toFixed(2)}) * vec3(${WALL.slice(1).map((v) => v.toFixed(2)).join(', ')}) * layer;
        g = mix(g, rk, smoothstep(0.0, 1.0, vMix.z + (big - 0.5) * 0.3));
      }
      // Oost-Afrikaanse grond is warmer en roder dan deze foto's
      diffuseColor.rgb *= g * vec3(${(LK.ground || [1.12, 0.93, 0.74]).map((v) => v.toFixed(2)).join(', ')});`);
  };
  const ground = new THREE.Mesh(geo, gmat);
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- water ----------
  // diep water is donkerder en je ziet de bodem niet meer: zo zie je zonder woorden waar je niet verder kunt
  const WN = 512, wpix = new Uint8Array(WN * WN * 4);
  for (let j = 0; j < WN; j++) for (let i = 0; i < WN; i++) {
    const k = THREE.MathUtils.smoothstep(depth((i + 0.5) / WN * SIZE - SIZE / 2, SIZE / 2 - (j + 0.5) / WN * SIZE), 0.4, 1.15), c = 255 * (1 - k * 0.62);
    wpix.set([c, c, Math.min(255, c * 1.04), 255 * (0.86 + k * 0.14)], (j * WN + i) * 4);
  }
  const wmap = new THREE.DataTexture(wpix, WN, WN); wmap.magFilter = wmap.minFilter = THREE.LinearFilter; wmap.needsUpdate = true;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ color: 0x3a5a50, transparent: true, opacity: 1, map: wmap, roughness: 0.08, metalness: 0.1, normalMap: A.tex.withered_grass_nor, normalScale: new THREE.Vector2(0.15, 0.15) }));
  water.material.normalMap = A.tex.withered_grass_nor.clone(); water.material.normalMap.repeat.set(SIZE / 6, SIZE / 6);
  water.rotation.x = -Math.PI / 2; water.position.y = WATER - 0.35;
  scene.add(water);

  const ok = (x, z, minRiver = 12) => riverDist(x, z) > minRiver && Math.max(Math.abs(x), Math.abs(z)) < WALK - 8 && Math.hypot(x - START[0], z - START[1] + 2) > 8 && !POOLS.some((p) => Math.hypot(x - p[0], z - p[1]) < p[2] * 1.6 + 2);


  // Veel dezelfde dingen (bomen, keien, gras) tekenen we per vak van de kaart.
  // Een vak dat buiten beeld ligt, of buiten het bereik van de schaduw, kost dan niets.
  // De schaduw van de zon reikt maar een klein stuk om je heen: vakken die verder weg liggen doen daar niet aan mee.
  const shadowCells = [];
  const casts = (im) => { shadowCells.push(im); return im; };
  function perCell(spots, CELL = 70) {
    const cells = new Map();
    for (const sp of spots) { const k = Math.floor(sp[0] / CELL) + ',' + Math.floor(sp[1] / CELL); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(sp); }
    return [...cells.values()];
  }

  // ---------- acacia's ----------
  // een schermacacia als model (Sketchfab, zie assets/CREDITS.md), op elke plek herhaald met een eigen maat en draaiing
  const acaciaSpots = [], nestSpots = [];
  function acacia(x, z, s) {
    // evenveel trekkingen als de oude, getekende boom: zo blijft de rest van de wereld op zijn plek
    R(); const nb = 3 + Math.floor(R() * 2); for (let i = 0; i < nb * 35 + 10; i++) R();
    if (steep(x, z) > STEEP) return;   // op een wand staat niets
    acaciaSpots.push([x, z, s * 0.85, (x * 12.9898 + z * 78.233) % 6.28]);
    TREES.push([x, z, s]);
    // in één op de vijf grote acacia's ligt een gierennest boven op de kruin
    const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1, nest = s >= 0.95 && h < 0.2;
    PERCHES.push({ x, z, y: height(x, z) - 0.1 + 6.45 * s * 0.85, wide: true, n: 0, nest });
    if (nest) nestSpots.push([x, height(x, z) - 0.1 + 6.45 * s * 0.85, z, h * 31.4]);
    blockers.push({ x, z, r: Math.max(0.3, 0.3 * s) });   // iets ruimer dan de dunne stam: de reus en de dekking rekenen ermee
  }
  for (let i = 0; i < (LAND.acacias ?? 70); i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 10) && (!OWN || clear(x, z, 5))) acacia(x, z, 0.8 + R() * 0.6); }
  AREA.trees.forEach(([x, z, s]) => acacia(x, z, s));
  const am = new THREE.Object3D();
  A.models.acacia.updateMatrixWorld(true);
  A.models.acacia.traverse((o) => {
    if (!o.isMesh) return;
    const leaf = o.material.alphaTest > 0, geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const mat = leaf ? leafMat(o.material.map, 0xd0e0a8) : o.material;
    for (const cell of perCell(acaciaSpots)) {
      const im = new THREE.InstancedMesh(geo, mat, cell.length);
      cell.forEach(([x, z, k, ry], i) => { am.position.set(x, height(x, z) - 0.1, z); am.rotation.set(0, ry, 0); am.scale.setScalar(k); am.updateMatrix(); im.setMatrixAt(i, am.matrix); });
      im.castShadow = true; im.receiveShadow = !leaf; im.computeBoundingSphere(); scene.add(casts(im));
    }
  });
  // het nest: een brede krans van takken (model, zie assets/CREDITS.md) met dezelfde krans kleiner erin als bodem
  if (nestSpots.length) A.models.nest.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld), im = new THREE.InstancedMesh(geo, o.material, nestSpots.length * 2);
    nestSpots.forEach(([x, y, z, ry], i) => {
      for (let k = 0; k < 2; k++) { am.position.set(x, y + NEST.y - k * 0.05, z); am.rotation.set(0, ry + k * 2, 0); am.scale.set(NEST.w * (k ? 0.5 : 1), NEST.w * (k ? 0.45 : 0.8), NEST.w * (k ? 0.5 : 1)); am.updateMatrix(); im.setMatrixAt(i * 2 + k, am.matrix); }
    });
    im.castShadow = true; im.computeBoundingSphere(); scene.add(casts(im));
  });

  // ---------- rotsen: gescande granieten keien uit Zuid-Afrika ----------
  // welke steen er ligt kan per gebied verschillen: 'model' of 'model:2' (alleen die ene kei uit het model), met een eigen tint
  const RS = LAND.rocks || {}, FAM = [];
  const tinted = (parts, tint) => { if (!tint) return parts; const c = new THREE.Color(tint); return parts.map((q) => { const mat = q.mat.clone(); mat.color.multiply(c); return { ...q, mat }; }); };
  const rockVariants = (RS.models || ['namaqualand_boulder_02', 'namaqualand_boulder_05', 'namaqualand_rocks_01']).flatMap((spec) => {
    const [name, pick] = spec.split(':'), all = variantsOf(A.models[name]);
    return (pick ? [all[+pick]] : all).map((v) => ({ ...v, parts: tinted(v.parts, RS.tint), fam: name === (RS.fam || 'namaqualand_boulder_05') }));
  });
  rockVariants.forEach((v, i) => v.fam && FAM.push(i));
  const rockSpots = rockVariants.map(() => []);
  // fam: alleen keien van één soort steen (voor een rotskop of een wand uit één stuk); up: zoveel meter boven de grond (op andere keien)
  function rock(x, z, s, rnd = R, fam = null, up = 0) {
    const vi = fam ? fam[Math.floor(rnd() * fam.length)] : Math.floor(rnd() * rockVariants.length), v = rockVariants[vi], ry = rnd() * 6.28;
    const k = (s * 2) / Math.max(v.size.x, v.size.z);   // zo groot als de oude rots
    if (!fam && steep(x, z) > STEEP) return;
    const sink = 0.1 - up / (k * v.size.y);
    rockSpots[vi].push([x, z, k, ry, sink]);
    if (s > 0.7) {
      // rock: je loopt er niet doorheen maar je kunt erop (zie surface); de cirkel is er voor de dieren en de camera
      blockers.push({ x, z, r: s * 0.9, top: height(x, z) + up + v.size.y * k * 0.9, rock: true });
      solids.push({ x, z, k, cos: Math.cos(ry), sin: Math.sin(ry), sx: v.size.x, sz: v.size.z, r2: (Math.hypot(v.size.x, v.size.z) * k / 2) ** 2, base: height(x, z) - sink * k * v.size.y, prof: profile(v) });
    }
    if (s > 0.7 && v.size.y * k > 0.8) cover.push({ x, z, r: s * 0.9 });
  }
  for (let i = 0; i < (RS.n ?? 55); i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 9) && (!OWN || clear(x, z, 4))) rock(x, z, 0.4 + R() * (RS.big || 1.6)); }
  if (HILL) for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = 6 + R() * 14; const x = HILL[0] + Math.cos(a) * d, z = HILL[1] + Math.sin(a) * d, s = 0.8 + R() * 1.8; if (!OWN || clear(x, z, 4)) rock(x, z, s); }
  for (let i = 0; i < 6; i++) rock(START[0] - 5 + R() * 10, START[1] + 4 + R() * 6, 0.3 + R() * 0.5);   // keien bij de start
  // een rotskop: grote keien op en tegen elkaar, om op te klimmen en ver te kijken (eigen willekeur: de rest van de wereld blijft op zijn plek)
  const RK = rng(23);
  for (const f of RELIEF) if (f.kind === 'kop') {
    const n = f.rocks || 6;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + RK() * 0.6, d = i ? (0.14 + RK() * 0.3) * f.r : 0;
      rock(f.at[0] + Math.cos(a) * d, f.at[1] + Math.sin(a) * d, i ? 1.7 + RK() * 1.8 : 4, RK, FAM);
    }
    // en een paar die boven op de andere liggen
    for (let i = 0; i < Math.ceil(n * 0.6); i++) {
      const a = RK() * 6.28, d = (0.03 + RK() * 0.2) * f.r, x = f.at[0] + Math.cos(a) * d, z = f.at[1] + Math.sin(a) * d;
      rock(x, z, 1.6 + RK() * 1.6, RK, FAM, Math.max(0, surface(x, z) - height(x, z)) * 0.75);
    }
  }
  // langs een breuk steken keien uit de wand en ligt er puin aan de voet
  for (const f of RELIEF) if (f.kind === 'breuk') for (let i = 1; i < f.path.length; i++) {
    const [ax, az] = f.path[i - 1], [bx, bz] = f.path[i], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L * (f.up || 1), nz = (bx - ax) / L * (f.up || 1);
    for (let t = 3; t < L; t += 3.5 + RK() * 5) {
      const off = -2.2 + RK() * 3, x = ax + (bx - ax) * t / L + nx * off, z = az + (bz - az) * t / L + nz * off, s = off < -1 ? 0.35 + RK() * 0.5 : 0.9 + RK() * 1.3;
      if (steep(x - nx * off, z - nz * off) > 0.7) rock(x, z, s, RK, FAM);   // niet op de puinhelling
    }
  }
  // keien die het gebied zelf op een vaste plek legt (een windscherm bij het kamp): [x, z, maat]
  for (const [x, z, sz] of LAND.rocksAt || []) rock(x, z, sz, RK, FAM);
  const dm = new THREE.Object3D();
  function instance(v, spots, shadow = true, CELL = 220) {
    for (const part of v.parts) for (const cell of perCell(spots, CELL)) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, cell.length);
      cell.forEach(([x, z, k, ry, sink = 0.1], i) => { dm.position.set(x, height(x, z) - sink * k * v.size.y, z); dm.rotation.set(0, ry, 0); dm.scale.setScalar(k); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
      im.castShadow = shadow; im.receiveShadow = !part.leaf; im.computeBoundingSphere();
      scene.add(shadow ? casts(im) : im);
    }
  }
  rockVariants.forEach((v, i) => rockSpots[i].length && instance(v, rockSpots[i]));

  // ---------- struiken, dood hout en takken ----------
  const BU = LAND.bush || {};
  const bushVariants = variantsOf(A.models.wild_rooibos_bush).map((v) => ({ ...v, parts: tinted(v.parts, BU.tint) }));
  const bushSpots = bushVariants.map(() => []);
  for (let i = 0; i < (BU.n ?? 90); i++) {
    const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (!ok(x, z, 8) || (OWN && !clear(x, z, 4))) continue;
    const vi = Math.floor(R() * bushVariants.length), v = bushVariants[vi];
    const bh = 1.0 + R() * 0.9;
    const ry = R() * 6.28; if (steep(x, z) > STEEP) continue;
    bushSpots[vi].push([x, z, bh / v.size.y, ry, 0.02]);
    if (bh > 1.2) cover.push({ x, z, r: Math.max(v.size.x, v.size.z) * bh / v.size.y * 0.35 });
  }
  bushVariants.forEach((v, i) => bushSpots[i].length && instance(v, bushSpots[i]));
  const logs = variantsOf(A.models.dead_tree_trunk), twigs = variantsOf(A.models.dry_branches_medium_01);
  const logSpots = [], twigSpots = twigs.map(() => []);
  for (let i = 0; i < (LAND.logs ?? 16); i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 8) && (!OWN || clear(x, z, 4))) { const sp = [x, z, 1.1 + R() * 0.5, R() * 6.28, 0.15]; if (steep(x, z) < STEEP) logSpots.push(sp); } }
  for (let i = 0; i < (LAND.twigs ?? 40); i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 6)) { const ti = Math.floor(R() * twigs.length), sp = [x, z, 0.8 + R() * 0.6, R() * 6.28, 0.05]; if (steep(x, z) < STEEP) twigSpots[ti].push(sp); } }
  instance(logs[0], logSpots);
  twigs.forEach((v, i) => twigSpots[i].length && instance(v, twigSpots[i], false));

  // ---------- wat alleen hier groeit ----------
  // Elk gebied heeft zijn eigen bomen en planten (land.flora). Per soort: model, hoeveel (n), hoe hoog (tall: [van, tot]),
  // en waar: overal, bij het water (near: 'water', reach: [van, tot] meter van de waterlijn) of juist op het droge (near: 'dry').
  // patch: [aantal, straal] zet ze in bosjes; clump: zoveel bij elkaar op één plek; at: vaste plekken [x, z, hoogte].
  // each: het model bevat losse planten naast elkaar (pollen, struikjes) in plaats van één boom.
  const FR = rng((LAND.seed || 7) + 101), HOME = AREA.home || { x: START[0], z: START[1] };
  // een geladen boom als één geheel, de voet van de stam op (0, 0, 0); blad krijgt het bladmateriaal van de wereld
  function whole(root, tint) {
    root.updateMatrixWorld(true);
    const parts = [], box = new THREE.Box3(), mats = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); box.union(geo.boundingBox);
      const leaf = o.material.transparent || o.material.alphaTest > 0;
      if (leaf && !mats.has(o.material)) mats.set(o.material, leafMat(o.material.map, tint || 0xd8e0c0));
      parts.push({ geo, mat: leaf ? mats.get(o.material) : o.material, leaf });
    });
    // het midden van de stam: de onderste punten van het hout
    const size = box.getSize(new THREE.Vector3());
    let n = 0, cx = 0, cz = 0;
    for (const q of parts) { if (q.leaf) continue; const pos = q.geo.attributes.position; for (let i = 0; i < pos.count; i++) if (pos.getY(i) < box.min.y + size.y * 0.05) { cx += pos.getX(i); cz += pos.getZ(i); n++; } }
    if (!n) { cx = (box.min.x + box.max.x) / 2; cz = (box.min.z + box.max.z) / 2; n = 1; }
    parts.forEach((q) => q.geo.translate(-cx / n, -box.min.y, -cz / n));
    return { parts, size };
  }
  const leafy = (v, tint) => ({ ...v, parts: v.parts.map((q) => (q.mat.transparent || q.mat.alphaTest > 0 ? { ...q, mat: leafMat(q.mat.map, tint || 0xd8e0c0), leaf: true } : q)) });
  for (const F of LAND.flora || []) {
    const V = F.each ? variantsOf(A.models[F.model]).map((v) => leafy(v, F.tint)) : [whole(A.models[F.model], F.tint)];
    if (F.bark) for (const v of V) v.parts = v.parts.map((q) => (q.leaf ? q : tinted([q], F.bark)[0]));
    const spots = V.map(() => []), mine = [], [t0, t1] = F.tall, gap = F.gap ?? 3, block = F.block ?? 0;
    const put = (x, z, tall) => {
      const vi = Math.floor(FR() * V.length), k = tall / V[vi].size.y;
      spots[vi].push([x, z, k, FR() * 6.28, F.sink ?? 0.02]); mine.push([x, z]);
      if (block) blockers.push({ x, z, r: block * tall / t1 });
      if (F.cover) cover.push({ x, z, r: F.cover * tall / t1 });
      if (F.twigs) { TREES.push([x, z, 1]); PERCHES.push({ x, z, y: height(x, z) + tall * 0.9, wide: false, n: 0 }); }
    };
    const free = (x, z, g = gap) => height(x, z) > 0.25 && steep(x, z) < (F.steep ?? 0.5) && Math.max(Math.abs(x), Math.abs(z)) < WALK - 4 && clear(x, z, F.clear ?? 4.5) && Math.hypot(x - HOME.x, z - HOME.z) > (F.home ?? 9)
      && !POOLS.some((q) => Math.hypot(x - q[0], z - q[1]) < q[2] * 1.5 + 1) && !mine.some((q) => Math.hypot(q[0] - x, q[1] - z) < g) && (!block || !blockers.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + block + 0.8));
    for (const [x, z, tall] of F.at || []) put(x, z, tall || t1);
    // bosjes: een paar plekken waar de soort bij elkaar staat
    const groves = [];
    if (F.patch) for (let i = 0, tries = 0; i < F.patch[0] && tries < 400; tries++) {
      const x = (FR() - 0.5) * 2 * (WALK - 20), z = (FR() - 0.5) * 2 * (WALK - 20);
      if (riverDist(x, z) > (F.minRiver ?? 14) && height(x, z) > 0.5 && !groves.some((q) => Math.hypot(q[0] - x, q[1] - z) < F.patch[1] * 1.6)) { groves.push([x, z]); i++; }
    }
    for (let i = 0, tries = 0; i < (F.n || 0) && tries < F.n * 40; tries++) {
      let x = (FR() - 0.5) * 2 * WALK, z = (FR() - 0.5) * 2 * WALK;
      if (groves.length) { const q = groves[Math.floor(FR() * groves.length)], a = FR() * 6.28, d = Math.sqrt(FR()) * F.patch[1]; x = q[0] + Math.cos(a) * d; z = q[1] + Math.sin(a) * d; }
      else if (F.near === 'water') { const off = F.reach[0] + FR() * (F.reach[1] - F.reach[0]); z = riverZ(x) + (LAKE || FR() < 0.5 ? -off : off); }
      if (F.near === 'dry' && riverDist(x, z) < (F.reach ? F.reach[0] : 40)) continue;
      if (F.high != null && height(x, z) < F.high) continue;
      if (riverDist(x, z) < (F.minRiver ?? 8) || !free(x, z)) continue;
      put(x, z, t0 + FR() * (t1 - t0)); i++;
      // een paar bij elkaar: zo groeien palmen en jonge bomen
      for (let c = 1, ct = 0; c < (F.clump || 1) && ct < 12; ct++) {
        const a = FR() * 6.28, d = gap * (0.45 + FR() * 0.5), cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
        if (riverDist(cx, cz) < (F.minRiver ?? 8) || !free(cx, cz, gap * 0.4)) continue;
        put(cx, cz, (t0 + FR() * (t1 - t0)) * (0.7 + FR() * 0.3)); c++;
      }
    }
    V.forEach((v, i) => spots[i].length && instance(v, spots[i], F.shadow !== false, F.each ? 110 : 70));
  }
  // blikvangers: één groot stuk rots op een vaste plek (een wand achter het kamp). Je loopt er niet doorheen.
  for (const P of LAND.props || []) {
    const v = variantsOf(A.models[P.model])[P.pick || 0], k = P.tall / v.size.y, ry = P.ry || 0, [x, z] = P.at, parts = tinted(v.parts, P.tint);
    for (const q of parts) {
      const m = new THREE.Mesh(q.geo, q.mat); m.position.set(x, height(x, z) - (P.sink || 0.08) * P.tall, z); m.rotation.y = ry; m.scale.setScalar(k);
      m.castShadow = m.receiveShadow = true; scene.add(m);
    }
    const lx = v.size.x * k, lz = v.size.z * k, long = Math.max(lx, lz), short = Math.min(lx, lz), r = short * 0.42, n = Math.max(1, Math.ceil((long - short) / (r * 1.2)) + 1);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1) - 0.5) * (long - short), ax = lx >= lz ? u : 0, az = lx >= lz ? 0 : u;
      blockers.push({ x: x + ax * Math.cos(ry) + az * Math.sin(ry), z: z - ax * Math.sin(ry) + az * Math.cos(ry), r });
    }
    cover.push({ x, z, r: short * 0.5 });
  }

  // ---------- gras dat meebeweegt in de wind ----------
  const uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };
  // twee gekruiste kaartjes met een foto van een gescande graspol (8 soorten in één atlas)
  const cardGeo = (() => {
    const a = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), b = a.clone().rotateY(Math.PI / 2);
    const g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) g.setAttribute(k, new THREE.Float32BufferAttribute([...a.attributes[k].array, ...b.attributes[k].array], k === 'uv' ? 2 : 3));
    g.setIndex([...a.index.array, ...Array.from(b.index.array, (i) => i + 4)]);
    return g;
  })();
  function grassMat(sway, dry) {
    const m = new THREE.MeshLambertMaterial({ map: A.tex.grass_atlas, alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uWind = uniforms.uWind;
      sh.vertexShader = 'uniform float uTime, uWind; attribute float aTile;\n' + sh.vertexShader
        .replace('#include <uv_vertex>', `#include <uv_vertex>
          vMapUv = vec2((mod(aTile, 4.0) + uv.x) / 4.0, 0.5 - floor(aTile / 4.0) * 0.5 + uv.y * 0.5);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
          float w = (sin(uTime * 1.6 + ip.x * 0.15 + ip.y * 0.1) * 0.6 + sin(uTime * 3.1 + ip.x * 0.7) * 0.25) * uWind + (uWind - 1.0) * 0.55;
          transformed.x += w * ${sway.toFixed(2)} * position.y * position.y;
          transformed.z += w * ${(sway * 0.5).toFixed(2)} * position.y * position.y;`)
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;')
        // het gescande gras is groen; de savanne is droog en goudgeel
        .replace('#include <map_fragment>', `#include <map_fragment>
          float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
          diffuseColor.rgb = mix(diffuseColor.rgb * 1.4, lum * vec3(${(GR.gold || [2.9, 2.35, 1.2]).map((v) => v.toFixed(2)).join(', ')}), ${(dry * (dry > 0.5 ? LK.dry || 1 : 1)).toFixed(2)});`);
    };
    return m;
  }
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  function scatter(mat, count, tiles, place) {
    const all = [];
    let n = 0, tries = 0;
    while (n < count && tries++ < count * 6) {
      const p = place(); if (!p) continue;
      const [x, z, s] = p;
      all.push([x, z, s, R() * 6.28, tiles[Math.floor(R() * tiles.length)], (R() - 0.5) * 0.04, (R() - 0.5) * 0.1, (R() - 0.5) * 0.12]); n++;
    }
    for (const cell of perCell(all, 110)) {
      const mesh = new THREE.InstancedMesh(cardGeo.clone(), mat, cell.length);
      const tileAttr = new Float32Array(cell.length);
      cell.forEach(([x, z, s, ry, tile, dh, ds, dl], i) => {
        dummy.position.set(x, height(x, z) - 0.03, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix); tileAttr[i] = tile;
        mesh.setColorAt(i, tint.setRGB(1, 1, 1).offsetHSL(dh, ds, dl));
      });
      mesh.geometry.setAttribute('aTile', new THREE.InstancedBufferAttribute(tileAttr, 1));
      mesh.receiveShadow = true; mesh.computeBoundingSphere(); mesh.boundingSphere.radius += 1.5;   // het gras wuift
      scene.add(mesh);
    }
  }
  // kort gras: pollen, niet overal
  scatter(grassMat(0.25, 0.8), GR.short ?? 16000, [3, 4, 5, 6, 7], () => {
    const x = (R() - 0.5) * 2 * (WALK + 10), z = (R() - 0.5) * 2 * (WALK + 10);
    if (riverDist(x, z) < 6) return null;
    if (fbm(x * 0.05, z * 0.05, 2) < (LK.lush || 0.4) || steep(x, z) > STEEP) return null;
    return [x, z, 0.5 + R() * 0.5];
  });
  // hoog gras om je in te verstoppen: hoge pollen met pluimen
  scatter(grassMat(0.18, 0.85), 6500, [0, 1, 2, 6, 7], () => {
    const [px, pz, r] = TALL_GRASS[Math.floor(R() * TALL_GRASS.length)];
    const a = R() * 6.28, d = Math.sqrt(R()) * r;
    return [px + Math.cos(a) * d, pz + Math.sin(a) * d, 1.3 + R() * 0.7];
  });
  // groen riet langs de rivier
  scatter(grassMat(0.15, 0.15), GR.reed ?? 2500, [0, 1, 2], () => {
    const x = (R() - 0.5) * 2 * WALK, side = R() < 0.5 ? -1 : 1, off = 6 + R() * 4;
    // rietbedden: op sommige stukken oever staat het dicht en hoog, daartussen is de oever open
    if (GR.beds && fbm(x * 0.035 + 3, 7.7, 2) < GR.beds) return null;
    // langs een meer staat het riet op het strand en met de voeten in het water
    return [x, riverZ(x) + (LAKE ? (side < 0 ? -off * (GR.beds ? 1.2 : 0.6) : off - 6) : side * off), (1.2 + R() * 0.6) * (GR.reedTall || 1)];
  });

  const fogBase = new THREE.Color(), GREY = new THREE.Color(), sky = { cloud: 0, rain: 0, wind: 0.25 };
  return {
    sun, uniforms, water, hemi, sky,
    // p: moment van de dag (0 = dageraad, 0,4 = middag, 0,75 = zonsondergang, 0,9 = nacht)
    update(t, focus, p, senses) {
      uniforms.uTime.value = t;
      for (const im of shadowCells) { const c = im.boundingSphere.center; im.castShadow = Math.hypot(c.x - focus.x, c.z - focus.z) < im.boundingSphere.radius + 36; }
      const k = dayLook(p);
      // het eigen licht van dit gebied (as in de lucht, ijle berglucht)
      if (SUN_TINT) { k.sun.multiply(SUN_TINT); k.sunI *= SKY.sunI || 1; k.hemiI *= SKY.hemiI || 1; }
      // het weer: wolken maken de lucht grijs, het licht vlak en de schaduwen zwak; regen trekt een sluier over het land
      const cl = sky.cloud, wet = sky.rain;
      uniforms.uWind.value = 0.55 + sky.wind * 1.9;
      skyMat.uniforms.cover.value = cl;
      if (cl > 0.01) {
        const lum = (c) => c.r * 0.3 + c.g * 0.55 + c.b * 0.15;
        for (const key of ['top', 'mid', 'low', 'fog', 'hemiSky']) { const v = lum(k[key]) * (key === 'top' ? 1.25 : 0.92); k[key].lerp(GREY.setRGB(v * 0.95, v * 0.98, v * 1.04), cl * 0.8); }
        k.sun.lerp(GREY.setRGB(0.85, 0.88, 0.92), cl * 0.6); k.sunI *= 1 - cl * 0.72; k.hemiI *= 1 + cl * 0.12 - wet * 0.18;
      }
      skyMat.uniforms.top.value.copy(k.top); skyMat.uniforms.mid.value.copy(k.mid); skyMat.uniforms.low.value.copy(k.low);
      skyMat.uniforms.sunCol.value.copy(k.sun).multiplyScalar(Math.min(1, k.sunI / 2));
      skyMat.uniforms.cloud.value.copy(k.mid).lerp(k.top, 0.2).offsetHSL(0, -0.1, 0.08);
      skyMat.uniforms.uTime.value = t;
      const dayK = p < 0.1 ? THREE.MathUtils.smoothstep(p, 0.02, 0.1) : p < 0.62 ? 1 : 1 - THREE.MathUtils.smoothstep(p, 0.62, 0.74);
      skyMat.uniforms.skyMix.value = dayK * (senses ? 0.4 : 1) * (1 - Math.min(1, cl * 1.25));
      skyMat.uniforms.skyTint.value.setRGB(1, 1, 1).lerp(k.sun, 0.25);
      if (SKY.tint) skyMat.uniforms.skyTint.value.multiply(SKY_TINT);
      scene.environmentIntensity = (0.15 + 0.85 * dayK) * (senses ? 0.5 : 1);
      fogBase.copy(k.fog);
      if (MIST) fogBase.lerp(MIST[0], MIST[1] * (0.35 + 0.65 * dayK));
      if (senses) fogBase.lerp(SENSE_FOG, 0.6);
      scene.fog.color.copy(fogBase);
      scene.fog.far = senses ? 120 : FOG[1] * (1 - wet * 0.5); scene.fog.near = FOG[0] * (1 - wet * 0.6);
      sun.color.copy(k.sun); sun.intensity = k.sunI * (senses ? 0.45 : 1);
      hemi.color.copy(k.hemiSky); hemi.groundColor.copy(k.hemiGround); hemi.intensity = k.hemiI * (senses ? 0.6 : 1);
      // de zon komt op in het oosten (+x) en gaat onder in het westen; 's nachts schijnt de maan
      const day = p < 0.8, a = day ? p / 0.8 : (p - 0.8) / 0.2;
      const elev = Math.max(0.12, Math.sin(a * Math.PI)) * (day ? 1 : 0.8), az = a * Math.PI;
      sun.userData.offset.set(Math.cos(az) * 80 * Math.cos(elev), Math.sin(elev) * 80 + 6, -30);
      sun.position.copy(focus).add(sun.userData.offset); sun.target.position.copy(focus);
      skyMat.uniforms.sunDir.value.copy(sun.userData.offset).normalize();
      water.material.color.copy(k.water).offsetHSL(0, 0, Math.sin(t * 0.7) * 0.01);
    },
  };
}

// Een textuur met zand, steentjes en vlekjes (wordt vermenigvuldigd met de kleur van de grond)
function groundTexture() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), R = rng(3);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // naadloze ruis: vier hoeken mengen
    const v = 0.5 * (fbm(x / 22, y / 22, 3) + fbm((x + N) / 22, (y + N) / 22, 3));
    const grain = R();
    let b = 205 + v * 50 + (grain - 0.5) * 34;
    if (grain > 0.985) b -= 60;   // steentjes
    if (grain < 0.01) b += 25;
    const i = (y * N + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, b)); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Alle losse stukken van een groep samenvoegen tot één mesh met kleuren per hoekpunt
export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const pos = [], nor = [], uvs = [], col = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);   // draait ook de normalen mee
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, c = o.material.color;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      if (n) nor.push(n.getX(i), n.getY(i), n.getZ(i)); else nor.push(0, 1, 0);
      if (uv) uvs.push(uv.getX(i), uv.getY(i)); else uvs.push(0, 0);
      col.push(c.r, c.g, c.b);
    }
    g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ---------- de kleuren van de dag ----------
const C = (h) => new THREE.Color(h);
const SENSE_FOG = C(0x4a5a6a);
const SUN_TINT = SKY.sun ? C(SKY.sun) : null, SKY_TINT = SKY.tint ? new THREE.Color(...SKY.tint) : null;
const DAY = [
  { p: 0.00, top: C(0x3a4a78), mid: C(0xe8a07a), low: C(0x8a6a5a), fog: C(0xc8988a), sun: C(0xffb080), sunI: 1.2, hemiSky: C(0x9aa8d8), hemiGround: C(0x6a4a3a), hemiI: 0.7, water: C(0x5a6a8a) },
  { p: 0.12, top: C(0x6a98c8), mid: C(0xf2d8a8), low: C(0xe0b88a), fog: C(0xe6d2a8), sun: C(0xffe0b0), sunI: 2.3, hemiSky: C(0xcfe0ff), hemiGround: C(0x8a6a3a), hemiI: 1.05, water: C(0x4f8a8c) },
  { p: 0.40, top: C(0x5a8cc8), mid: C(0xd8e0d8), low: C(0xe0c89a), fog: C(0xdcd6c0), sun: C(0xfff2dc), sunI: 2.8, hemiSky: C(0xd8e8ff), hemiGround: C(0x8a7040), hemiI: 1.15, water: C(0x4a8a90) },
  { p: 0.62, top: C(0x6f9cc8), mid: C(0xf2d39a), low: C(0xe8b47a), fog: C(0xe9cf9c), sun: C(0xffe2b0), sunI: 2.6, hemiSky: C(0xcfe0ff), hemiGround: C(0x8a6a3a), hemiI: 1.1, water: C(0x4f8a8c) },
  { p: 0.74, top: C(0x5a6aa0), mid: C(0xf0905a), low: C(0xb86a4a), fog: C(0xe0906a), sun: C(0xff8a4a), sunI: 2.0, hemiSky: C(0xc8a0b8), hemiGround: C(0x6a4030), hemiI: 0.85, water: C(0x6a6a7a) },
  { p: 0.80, top: C(0x2a2e58), mid: C(0x8a5a6a), low: C(0x4a3a4a), fog: C(0x5a4a5a), sun: C(0xb0a0d0), sunI: 0.5, hemiSky: C(0x6a70a8), hemiGround: C(0x3a2e30), hemiI: 0.55, water: C(0x3a4a5a) },
  { p: 0.88, top: C(0x0e1430), mid: C(0x24304e), low: C(0x1a1e2e), fog: C(0x222a40), sun: C(0x9ab0e8), sunI: 0.55, hemiSky: C(0x5a6aa8), hemiGround: C(0x24202a), hemiI: 0.5, water: C(0x26344a) },
  { p: 0.96, top: C(0x1a2244), mid: C(0x3a3a5a), low: C(0x2a2a3a), fog: C(0x3a3a50), sun: C(0x9ab0e8), sunI: 0.5, hemiSky: C(0x6a70a8), hemiGround: C(0x302830), hemiI: 0.5, water: C(0x2e3a50) },
  { p: 1.00, top: C(0x3a4a78), mid: C(0xe8a07a), low: C(0x8a6a5a), fog: C(0xc8988a), sun: C(0xffb080), sunI: 1.2, hemiSky: C(0x9aa8d8), hemiGround: C(0x6a4a3a), hemiI: 0.7, water: C(0x5a6a8a) },
];
const LOOK = { top: C(0), mid: C(0), low: C(0), fog: C(0), sun: C(0), hemiSky: C(0), hemiGround: C(0), water: C(0), sunI: 0, hemiI: 0 };
function dayLook(p) {
  let i = 0; while (i < DAY.length - 2 && DAY[i + 1].p <= p) i++;
  const a = DAY[i], b = DAY[i + 1], f = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1);
  for (const key of ['top', 'mid', 'low', 'fog', 'sun', 'hemiSky', 'hemiGround', 'water']) LOOK[key].copy(a[key]).lerp(b[key], f);
  LOOK.sunI = a.sunI + (b.sunI - a.sunI) * f; LOOK.hemiI = a.hemiI + (b.hemiI - a.hemiI) * f;
  return LOOK;
}

// De wind waait de hele dag uit het oosten: van +x naar -x (een beetje schuin)
export const WIND = new THREE.Vector3(-1, 0, 0.25).normalize();
