import * as THREE from '../lib/three.module.js';
import { variantsOf } from './assets.js';
import { AREA } from './eras/index.js';
import { shape } from './relief.js';

// Het land van één gebied. Twee vormen: 'rift' (savanne met een rivier erdoor) en 'lake' (een oever met een meer in het noorden).
// Welke vorm, en waar de vaste bomen, het hoge gras en de poelen liggen, staat in het gebiedsbestand.
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
const START = AREA.start || [2, -6], HILL = AREA.hill || [-40, -30], POOLS = AREA.pools || [], ISLE = AREA.island || null;
// rift: het midden van de rivier. lake: de waterlijn; alles ten noorden daarvan is meer.
export function riverZ(x) { return LAKE ? 62 + 9 * Math.sin(x * 0.02) + 4 * Math.sin(x * 0.055 + 1) : 38 * Math.sin(x * 0.011) + 14 * Math.sin(x * 0.027 + 1.3) + 55; }

export function riverDist(x, z) { return LAKE ? Math.max(0, riverZ(x) - z) : Math.abs(z - riverZ(x)); }
// welke kant op is het droge? (voor dieren die te dicht bij het water komen)
export function awayZ(x, z) { return LAKE || z < riverZ(x) ? -1 : 1; }
export function poolAt(x, z) { for (const p of POOLS) if (Math.hypot(x - p[0], z - p[1]) < p[2]) return p; return null; }
// te diep om te waden
export function deep(x, z) { return LAKE && height(x, z) < -1.0; }

function lakeHeight(x, z) {
  let h = 2.2 + (fbm(x * 0.006 + 10, z * 0.006 + 3) - 0.5) * 12;
  if (h < 1.6) h = 1.6 - (1.6 - h) * 0.12;
  h += (fbm(x * 0.04, z * 0.04, 2) - 0.5) * 0.9;
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
  if (AREA.hill) { const kd = Math.hypot(x - HILL[0], z - HILL[1]); if (kd < 22) h += Math.cos(kd / 22 * Math.PI / 2) ** 2 * 7; }
  return h;
}

// Het glooiende land, als formule. Het spel zelf vraagt de hoogte aan height(): die leest het raster hieronder.
function baseHeight(x, z) {
  if (LAKE) return lakeHeight(x, z);
  let h = 2.2 + (fbm(x * 0.006 + 10, z * 0.006 + 3) - 0.5) * 14;
  // lage plekken vlak afronden: alleen de rivier staat onder water
  if (h < 1.6) h = 1.6 - (1.6 - h) * 0.12;
  h += (fbm(x * 0.04, z * 0.04, 2) - 0.5) * 0.9;
  // de rivierbedding
  const d = riverDist(x, z);
  const bed = d < 7 ? -1.6 : d < 18 ? -1.6 + (d - 7) / 11 * 1.6 : 0;
  const bank = THREE.MathUtils.smoothstep(d, 4, 26);
  h = h * bank + bed + (1 - bank) * 0.6;
  // de wanden van de Riftvallei aan de rand
  const r = Math.max(Math.abs(x), Math.abs(z));
  if (r > WALK - 25) h += Math.pow((r - (WALK - 25)) / 30, 2) * 14 * (0.7 + fbm(x * 0.02, z * 0.02) * 0.6);
  // een rotsheuvel om vanaf te kijken
  const kx = x + 40, kz = z + 30, kd = Math.sqrt(kx * kx + kz * kz);
  if (kd < 22) h += Math.cos(kd / 22 * Math.PI / 2) ** 2 * 7;
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


export function buildWorld(scene, A) {
  const R = rng(7), STEEP = 0.8;

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
  const pos = geo.attributes.position, cols = [], mix = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = GRID[i];
    pos.setY(i, h);
    // hoeveel verdord gras en hoeveel kort groen gras; de rest is kale droge grond
    const n = fbm(x * 0.03 + 5, z * 0.03, 3), n2 = fbm(x * 0.11, z * 0.11, 2), d = riverDist(x, z);
    let grass = THREE.MathUtils.clamp((n - 0.22) * 2.6 + (n2 - 0.5) * 0.8, 0, 1), green = THREE.MathUtils.clamp((n - 0.55) * 3 + (d < 18 ? (1 - d / 18) * 0.8 : 0), 0, 1);
    if (d < 9) { grass *= d / 9; green *= d / 9; }
    if (h > 9) { const k = THREE.MathUtils.clamp(1 - (h - 9) / 5, 0, 1); grass *= k; green *= k; }
    // op een steile wand ligt geen aarde: daar zie je de kale rots
    const bare = THREE.MathUtils.smoothstep(steep(x, z), 0.75, 1.25);
    mix.push(grass * (1 - bare), green * (1 - bare), bare);
    // licht kleurverschil: natter en donkerder bij het water
    const wet = d < 12 ? (1 - d / 12) * 0.35 : 0, v = 0.92 + (n2 - 0.5) * 0.16 - wet;
    cols.push(v, v * (1 - wet * 0.1), v * (1 - wet * 0.2));
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.setAttribute('aMix', new THREE.Float32BufferAttribute(mix, 3));
  geo.computeVertexNormals();
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * SIZE / 4, uv.getY(i) * SIZE / 4);
  const gmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, normalMap: A.tex.dry_ground_01_nor, normalScale: new THREE.Vector2(1.2, 1.2) });
  gmat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tBare: { value: A.tex.dry_ground_01_diff }, tDry: { value: A.tex.withered_grass_diff }, tGreen: { value: A.tex.sparse_grass_diff }, tRock: { value: A.tex.dry_ground_rocks_diff } });
    sh.vertexShader = 'attribute vec3 aMix; varying vec3 vMix; varying vec2 vW; varying vec3 vFace;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMix = aMix; vW = position.xz; vFace = vec3(position.y, normal.x, normal.z);');
    sh.fragmentShader = 'uniform sampler2D tBare, tDry, tGreen, tRock; varying vec3 vMix; varying vec2 vW; varying vec3 vFace;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      // elke foto op twee schalen, zodat je geen herhaling ziet
      vec2 u1 = vW / 4.0, u2 = vW / 13.0 + vec2(0.37, 0.71);
      float big = texture2D(tRock, vW / 37.0).g;
      vec3 bare = mix(texture2D(tBare, u1).rgb, texture2D(tRock, u2).rgb, 0.45);
      vec3 dry = mix(texture2D(tDry, u1 * 0.8).rgb, texture2D(tDry, u2).rgb, 0.4);
      vec3 grn = texture2D(tGreen, u1 * 0.9).rgb;
      vec3 g = mix(bare, dry, smoothstep(0.0, 1.0, vMix.x + (big - 0.5) * 0.6));
      g = mix(g, grn, min(1.0, vMix.y * 0.85 + ${(LK.green || 0).toFixed(2)}));
      // een steile wand: kale rots, van opzij bekeken (anders rekt de foto uit), met lagen en scheuren
      if (vMix.z > 0.01) {
        float ax = abs(vFace.y), az = abs(vFace.z);
        vec2 r1 = vec2(vW.x, vFace.x * 1.6) / 3.1, r2 = vec2(vW.y, vFace.x * 1.6) / 3.1;
        vec3 rk = (texture2D(tRock, r1).rgb * az + texture2D(tRock, r2).rgb * ax) / max(0.001, ax + az);
        float lum = dot(rk, vec3(0.3, 0.59, 0.11));
        float layer = 0.82 + 0.18 * sin(vFace.x * 7.0 + big * 9.0);
        rk = mix(rk, vec3(lum), 0.45) * vec3(0.78, 0.74, 0.72) * layer;
        g = mix(g, rk, smoothstep(0.0, 1.0, vMix.z + (big - 0.5) * 0.3));
      }
      // Oost-Afrikaanse grond is warmer en roder dan deze foto's
      diffuseColor.rgb *= g * vec3(${(LK.ground || [1.12, 0.93, 0.74]).map((v) => v.toFixed(2)).join(', ')});`);
  };
  const ground = new THREE.Mesh(geo, gmat);
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- water ----------
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ color: 0x3a5a50, transparent: true, opacity: 0.88, roughness: 0.08, metalness: 0.1, normalMap: A.tex.withered_grass_nor, normalScale: new THREE.Vector2(0.15, 0.15) }));
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
  const acaciaSpots = [];
  function acacia(x, z, s) {
    // evenveel trekkingen als de oude, getekende boom: zo blijft de rest van de wereld op zijn plek
    R(); const nb = 3 + Math.floor(R() * 2); for (let i = 0; i < nb * 35 + 10; i++) R();
    if (steep(x, z) > STEEP) return;   // op een wand staat niets
    acaciaSpots.push([x, z, s * 0.85, (x * 12.9898 + z * 78.233) % 6.28]);
    blockers.push({ x, z, r: Math.max(0.3, 0.3 * s) });   // iets ruimer dan de dunne stam: de reus en de dekking rekenen ermee
  }
  for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 10)) acacia(x, z, 0.8 + R() * 0.6); }
  AREA.trees.forEach(([x, z, s]) => acacia(x, z, s));
  const leafMat = (map, tint) => {
    const m = new THREE.MeshStandardMaterial({ map, color: tint, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, emissive: 0x1a2408 });
    // bladeren laten licht door: beide kanten krijgen licht van boven, anders is de onderkant zwart
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;');
      // fijne blaadjes verdwijnen op afstand uit de verkleinde textuur: dekking versterken
      sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a = min(1.0, diffuseColor.a * 2.5);\n#include <alphatest_fragment>');
    };
    return m;
  };
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

  // ---------- rotsen: gescande granieten keien uit Zuid-Afrika ----------
  const rockVariants = [...variantsOf(A.models.namaqualand_boulder_02), ...variantsOf(A.models.namaqualand_boulder_05), ...variantsOf(A.models.namaqualand_rocks_01)];
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
  for (let i = 0; i < 55; i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 9)) rock(x, z, 0.4 + R() * 1.6); }
  for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = 6 + R() * 14; const x = HILL[0] + Math.cos(a) * d, z = HILL[1] + Math.sin(a) * d, s = 0.8 + R() * 1.8; if (!LAKE || AREA.hill) rock(x, z, s); }
  for (let i = 0; i < 6; i++) rock(START[0] - 5 + R() * 10, START[1] + 4 + R() * 6, 0.3 + R() * 0.5);   // keien bij de start
  // een rotskop: grote keien op en tegen elkaar, om op te klimmen en ver te kijken (eigen willekeur: de rest van de wereld blijft op zijn plek)
  const RK = rng(23);
  const FAM = rockVariants.map((v, i) => i).filter((i) => i < variantsOf(A.models.namaqualand_boulder_02).length + variantsOf(A.models.namaqualand_boulder_05).length && i >= variantsOf(A.models.namaqualand_boulder_02).length);
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
  const dm = new THREE.Object3D();
  function instance(v, spots, shadow = true) {
    for (const part of v.parts) for (const cell of perCell(spots, 220)) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, cell.length);
      cell.forEach(([x, z, k, ry, sink = 0.1], i) => { dm.position.set(x, height(x, z) - sink * k * v.size.y, z); dm.rotation.set(0, ry, 0); dm.scale.setScalar(k); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
      im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere();
      scene.add(shadow ? casts(im) : im);
    }
  }
  rockVariants.forEach((v, i) => rockSpots[i].length && instance(v, rockSpots[i]));

  // ---------- struiken, dood hout en takken ----------
  const bushVariants = variantsOf(A.models.wild_rooibos_bush);
  const bushSpots = bushVariants.map(() => []);
  for (let i = 0; i < 90; i++) {
    const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (!ok(x, z, 8)) continue;
    const vi = Math.floor(R() * bushVariants.length), v = bushVariants[vi];
    const bh = 1.0 + R() * 0.9;
    const ry = R() * 6.28; if (steep(x, z) > STEEP) continue;
    bushSpots[vi].push([x, z, bh / v.size.y, ry, 0.02]);
    if (bh > 1.2) cover.push({ x, z, r: Math.max(v.size.x, v.size.z) * bh / v.size.y * 0.35 });
  }
  bushVariants.forEach((v, i) => bushSpots[i].length && instance(v, bushSpots[i]));
  const logs = variantsOf(A.models.dead_tree_trunk), twigs = variantsOf(A.models.dry_branches_medium_01);
  const logSpots = [], twigSpots = twigs.map(() => []);
  for (let i = 0; i < 16; i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 8)) { const sp = [x, z, 1.1 + R() * 0.5, R() * 6.28, 0.15]; if (steep(x, z) < STEEP) logSpots.push(sp); } }
  for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 6)) { const ti = Math.floor(R() * twigs.length), sp = [x, z, 0.8 + R() * 0.6, R() * 6.28, 0.05]; if (steep(x, z) < STEEP) twigSpots[ti].push(sp); } }
  instance(logs[0], logSpots);
  twigs.forEach((v, i) => twigSpots[i].length && instance(v, twigSpots[i], false));


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
          diffuseColor.rgb = mix(diffuseColor.rgb * 1.4, lum * vec3(2.9, 2.35, 1.2), ${(dry * (dry > 0.5 ? LK.dry || 1 : 1)).toFixed(2)});`);
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
  scatter(grassMat(0.25, 0.8), 16000, [3, 4, 5, 6, 7], () => {
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
  scatter(grassMat(0.15, 0.15), 2500, [0, 1, 2], () => {
    const x = (R() - 0.5) * 2 * WALK, side = R() < 0.5 ? -1 : 1, off = 6 + R() * 4;
    // langs een meer staat het riet op het strand en met de voeten in het water
    return [x, riverZ(x) + (LAKE ? (side < 0 ? -off * 0.6 : off - 6) : side * off), 1.2 + R() * 0.6];
  });

  const fogBase = new THREE.Color(), GREY = new THREE.Color(), sky = { cloud: 0, rain: 0, wind: 0.25 };
  return {
    sun, uniforms, water, hemi, sky,
    // p: moment van de dag (0 = dageraad, 0,4 = middag, 0,75 = zonsondergang, 0,9 = nacht)
    update(t, focus, p, senses) {
      uniforms.uTime.value = t;
      for (const im of shadowCells) { const c = im.boundingSphere.center; im.castShadow = Math.hypot(c.x - focus.x, c.z - focus.z) < im.boundingSphere.radius + 36; }
      const k = dayLook(p);
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
