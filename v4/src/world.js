import * as THREE from '../lib/three.module.js';

// Proefstuk Riftvallei: één stuk savanne met een rivier, acacia's, rotsen en hoog gras.
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
export function riverZ(x) { return 38 * Math.sin(x * 0.011) + 14 * Math.sin(x * 0.027 + 1.3) + 55; }

export function riverDist(x, z) { return Math.abs(z - riverZ(x)); }

export function height(x, z) {
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

// Hoog gras: hier kun je je verstoppen
export const TALL_GRASS = [
  [20, -5, 11], [44, 10, 9], [60, -25, 12], [-15, 20, 8], [85, 30, 10], [-60, 15, 10], [10, -55, 9],
];
export function tallGrassAt(x, z) {
  for (const [px, pz, r] of TALL_GRASS) { const dx = x - px, dz = z - pz; if (dx * dx + dz * dz < r * r) return true; }
  return false;
}

// Botsingen met bomen en rotsen: eenvoudige cirkels
export const blockers = [];

function grassColor(x, z, h) {
  const n = fbm(x * 0.03 + 5, z * 0.03, 3);
  const dry = new THREE.Color(0xc9a659), green = new THREE.Color(0x8a9a48), dirt = new THREE.Color(0x9c7a52), mud = new THREE.Color(0x6b5a40);
  const c = dry.clone().lerp(green, THREE.MathUtils.clamp((n - 0.4) * 2.2, 0, 1));
  const d = riverDist(x, z);
  if (d < 16) c.lerp(green, 0.5 * (1 - d / 16));
  if (d < 9) c.lerp(mud, 1 - d / 9);
  if (h > 9) c.lerp(dirt, THREE.MathUtils.clamp((h - 9) / 6, 0, 0.8));
  return c;
}

export function buildWorld(scene) {
  const R = rng(7);

  // ---------- lucht en nevel ----------
  const skyGeo = new THREE.SphereGeometry(600, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x6f9cc8) }, mid: { value: new THREE.Color(0xf2d39a) }, low: { value: new THREE.Color(0xe8b47a) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff0d0) }, cloud: { value: new THREE.Color(0xffffff) }, uTime: { value: 0 },
    },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    // verloop van de lucht, een zon met gloed en wolkenslierten
    fragmentShader: `uniform vec3 top, mid, low, sunCol, cloud, sunDir; uniform float uTime; varying vec3 vp;
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
          float cl = smoothstep(0.52, 0.8, fbm(uv)) * smoothstep(0.0, 0.25, y);
          vec3 cc = mix(cloud, sunCol, pow(sd, 6.0) * 0.6);
          c = mix(c, cc, cl * 0.75);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  scene.fog = new THREE.Fog(0xe9cf9c, 45, 230);

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
  const seg = 240;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
    pos.setY(i, h);
    const c = grassColor(x, z, h); cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  // fijne korrel op de grond, zodat hij van dichtbij scherp en niet glad oogt
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * SIZE / 5, uv.getY(i) * SIZE / 5);
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: groundTexture() }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- water ----------
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshPhongMaterial({ color: 0x4f8a8c, transparent: true, opacity: 0.82, shininess: 90, specular: 0xfff2d0 }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER - 0.35;
  scene.add(water);

  const ok = (x, z, minRiver = 12) => riverDist(x, z) > minRiver && Math.max(Math.abs(x), Math.abs(z)) < WALK - 8 && Math.hypot(x - 2, z + 8) > 8;

  // Bomen en rotsen bewegen niet: ze worden straks samengevoegd tot één geheel (veel sneller op een telefoon)
  const statics = new THREE.Group();

  // ---------- acacia's ----------
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a4030, flatShading: true });
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x5f7a32, flatShading: true });
  const crownMat2 = new THREE.MeshLambertMaterial({ color: 0x748c3a, flatShading: true });
  function acacia(x, z, s) {
    const g = new THREE.Group(), y = height(x, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.32 * s, 4.2 * s, 6), trunkMat);
    trunk.position.y = 2.1 * s; trunk.rotation.z = (R() - 0.5) * 0.25;
    trunk.castShadow = true; g.add(trunk);
    for (let k = 0; k < 2; k++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.14 * s, 2 * s, 5), trunkMat);
      br.position.set((k ? 0.6 : -0.6) * s, 4.2 * s, 0); br.rotation.z = (k ? -0.7 : 0.7); g.add(br);
    }
    // de platte paraplukroon van een acacia: een paar losse plukken blad naast elkaar
    const cm = R() < 0.5 ? crownMat : crownMat2;
    const n = 5 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.28 + R() * 0.5, d = k === 0 ? 0 : (1.4 + R() * 1.2) * s;
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), k % 3 === 2 ? crownMat2 : cm);
      c.scale.set((1.6 + R() * 0.8) * s, (0.45 + R() * 0.2) * s, (1.5 + R() * 0.8) * s);
      c.position.set(Math.cos(a) * d, (4.9 + R() * 0.6) * s, Math.sin(a) * d); c.rotation.y = R() * 6;
      g.add(c);
    }
    // takken naar de plukken toe
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + R(), br = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.11 * s, 1.8 * s, 5), trunkMat);
      br.position.set(Math.cos(a) * 0.6 * s, 4.3 * s, Math.sin(a) * 0.6 * s); br.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); g.add(br);
    }
    g.position.set(x, y - 0.1, z); g.rotation.y = R() * 6;
    statics.add(g);
    blockers.push({ x, z, r: 0.5 * s });
  }
  for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 10)) acacia(x, z, 0.8 + R() * 0.6); }
  [[-8, -14, 1.2], [14, -20, 1], [-30, 10, 1.1], [40, 50, 1.3]].forEach(([x, z, s]) => acacia(x, z, s));

  // ---------- rotsen ----------
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x9a8a78, flatShading: true });
  function rock(x, z, s) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    m.scale.set(1, 0.55 + R() * 0.4, 0.8 + R() * 0.4);
    m.position.set(x, height(x, z) + s * 0.15, z); m.rotation.set(R(), R() * 6, R());
    statics.add(m);
    if (s > 0.7) blockers.push({ x, z, r: s * 0.85, top: height(x, z) + s * 0.75 });   // rotsen: met hoogte, voor de camera
  }
  for (let i = 0; i < 55; i++) { const x = (R() - 0.5) * 2 * WALK, z = (R() - 0.5) * 2 * WALK; if (ok(x, z, 9)) rock(x, z, 0.4 + R() * 1.6); }
  for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = 6 + R() * 14; rock(-40 + Math.cos(a) * d, -30 + Math.sin(a) * d, 0.8 + R() * 1.8); }
  for (let i = 0; i < 6; i++) rock(-3 + R() * 10, -2 + R() * 6, 0.3 + R() * 0.5);   // keien bij de start

  scene.add(mergeStatic(statics));

  // ---------- gras dat meebeweegt in de wind ----------
  const uniforms = { uTime: { value: 0 } };
  function tuftGeo(h, n) {
    const p = [], c = [];
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI + 0.3, w = 0.07, lean = 0.12;
      const ox = Math.cos(a) * w, oz = Math.sin(a) * w, tx = Math.cos(a + 1.57) * lean, tz = Math.sin(a + 1.57) * lean;
      p.push(-ox, 0, -oz, ox, 0, oz, tx, h * (0.75 + 0.25 * ((k * 7) % 3) / 2), tz);
      c.push(0.72, 0.68, 0.5, 0.72, 0.68, 0.5, 1.05, 1.05, 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  }
  function grassMat(color, sway) {
    const m = new THREE.MeshLambertMaterial({ color, vertexColors: true, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uniforms.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
        vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
        float w = sin(uTime * 1.6 + ip.x * 0.15 + ip.y * 0.1) * 0.6 + sin(uTime * 3.1 + ip.x * 0.7) * 0.25;
        transformed.x += w * ${sway.toFixed(2)} * position.y;
        transformed.z += w * ${(sway * 0.5).toFixed(2)} * position.y;`);
      // gras krijgt licht van boven, niet van de bladzijde
      sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
      // en beide kanten van een sprietje krijgen hetzelfde licht (anders is de achterkant zwart)
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;');
    };
    return m;
  }
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  function scatter(geo, mat, count, place) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    let n = 0, tries = 0;
    while (n < count && tries++ < count * 6) {
      const p = place(); if (!p) continue;
      const [x, z, s] = p;
      dummy.position.set(x, height(x, z) - 0.05, z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.setScalar(s); dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      tint.copy(grassColor(x, z, 0)).offsetHSL((R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.08);
      mesh.setColorAt(n, tint); n++;
    }
    mesh.count = n; mesh.receiveShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  scatter(tuftGeo(0.55, 4), grassMat(0xffffff, 0.12), 20000, () => {
    const x = (R() - 0.5) * 2 * (WALK + 10), z = (R() - 0.5) * 2 * (WALK + 10);
    if (riverDist(x, z) < 6) return null;
    if (fbm(x * 0.05, z * 0.05, 2) < 0.38) return null;   // plukjes, geen tapijt
    return [x, z, 0.7 + R() * 0.8];
  });
  const tallCol = new THREE.Color(0xd8b866);
  const tall = scatter(tuftGeo(1.5, 5), grassMat(0xffffff, 0.16), 7000, () => {
    const [px, pz, r] = TALL_GRASS[Math.floor(R() * TALL_GRASS.length)];
    const a = R() * 6.28, d = Math.sqrt(R()) * r;
    return [px + Math.cos(a) * d, pz + Math.sin(a) * d, 0.8 + R() * 0.5];
  });
  for (let i = 0; i < tall.count; i++) { tall.getColorAt(i, tint); tint.lerp(tallCol, 0.6); tall.setColorAt(i, tint); }
  // riet langs de rivier
  scatter(tuftGeo(1.3, 3), grassMat(0x9fb070, 0.1), 3500, () => {
    const x = (R() - 0.5) * 2 * WALK, z = riverZ(x) + (R() < 0.5 ? -1 : 1) * (6 + R() * 4);
    return [x, z, 0.8 + R() * 0.6];
  });

  const fogBase = new THREE.Color();
  return {
    sun, uniforms, water, hemi,
    // p: moment van de dag (0 = dageraad, 0,4 = middag, 0,75 = zonsondergang, 0,9 = nacht)
    update(t, focus, p, senses) {
      uniforms.uTime.value = t;
      const k = dayLook(p);
      skyMat.uniforms.top.value.copy(k.top); skyMat.uniforms.mid.value.copy(k.mid); skyMat.uniforms.low.value.copy(k.low);
      skyMat.uniforms.sunCol.value.copy(k.sun).multiplyScalar(Math.min(1, k.sunI / 2));
      skyMat.uniforms.cloud.value.copy(k.mid).lerp(k.top, 0.2).offsetHSL(0, -0.1, 0.08);
      skyMat.uniforms.uTime.value = t;
      fogBase.copy(k.fog);
      if (senses) fogBase.lerp(SENSE_FOG, 0.6);
      scene.fog.color.copy(fogBase);
      scene.fog.far = senses ? 120 : 230;
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
