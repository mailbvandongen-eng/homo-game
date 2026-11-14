import * as THREE from '../lib/three.module.js';
import { height, blockers } from './world.js';
import { ICON } from './icons.js';
import { variantsOf } from './assets.js';

// Vuur. Je kunt het niet maken: je vindt het waar de bliksem insloeg, draagt het op een tak naar het kamp
// en houdt het daar in leven met hout. Dit bestand kent drie plekken:
// - de smeulende stam (source): daar vat een tak vlam
// - de kring van stenen bij het kamp (hearth): daar brandt het vuur, zolang er hout op ligt
// - dode bomen (wood): daar hak je takken af met een vuistbijl
// In een nieuw kamp is het anders: daar ligt het meegedragen, gloeiende hout (carried) en moet je de kring zelf leggen (build).
// Tijden zijn in seconden speeltijd.
const BRANCH = 240;   // zo lang brandt één tak in het vuur
const MAX = 960;      // meer hout past er niet op
const EMBER = 200;    // zo lang blijft de as gloeien nadat de vlammen weg zijn
const TORCH = 170;    // zo lang brandt een tak in je hand
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function softTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Een heel geladen model als één voorwerp, met de voet op (0, 0, 0). Bij foot staat het midden van de stam op nul
// (en niet het midden van de kroon), zodat een boom niet naast zijn plek staat.
function whole(root, foot) {
  root.updateMatrixWorld(true);
  const parts = [], box = new THREE.Box3();
  root.traverse((o) => { if (!o.isMesh) return; const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); box.union(geo.boundingBox); parts.push({ geo, mat: o.material }); });
  const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  if (foot) {
    const big = parts.reduce((m, q) => (q.geo.attributes.position.count > m.geo.attributes.position.count ? q : m)), pos = big.geo.attributes.position;
    let n = 0, x = 0, z = 0;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < box.min.y + size.y * 0.05) { x += pos.getX(i); z += pos.getZ(i); n++; }
    if (n) { c.x = x / n; c.z = z / n; }
  }
  parts.forEach((q) => q.geo.translate(-c.x, -box.min.y, -c.z));
  return { parts, size };
}
// Een voorwerp van zo'n model, k keer zo groot; mat maakt van elk materiaal een ander (bijvoorbeeld verkoold)
function make(v, k, mat) {
  const g = new THREE.Group();
  for (const q of v.parts) { const m = new THREE.Mesh(q.geo, mat ? mat(q.mat) : q.mat); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  g.scale.setScalar(k); return g;
}
const tinted = (hex) => { const seen = new Map(); return (m) => { if (!seen.has(m)) { const c = m.clone(); c.color.setHex(hex); c.roughness = 1; seen.set(m, c); } return seen.get(m); }; };
const glowSprite = (inner, outer) => new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(inner, outer), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));

// Een rookpluim: wolkjes die opstijgen, groter en ijler worden en weer onderaan beginnen.
// Alle wolkjes van één pluim gaan in één keer naar de videokaart (vlakjes die naar de camera draaien).
class Smoke {
  constructor(scene, x, y, z, { n, rise, top, size, color, drift = 0.25, dense = 0.5, fog = true }) {
    this.x = x; this.y = y; this.z = z; this.rise = rise; this.top = top; this.size = size; this.drift = drift; this.dense = dense; this.k = 1;
    this.puffs = [];
    for (let i = 0; i < n; i++) this.puffs.push({ a: i / n, w: Math.random() * 6.28 });
    if (!n) return;
    const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
    geo.instanceCount = n;
    this.aPuff = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPuff', this.aPuff); geo.setAttribute('aAlpha', this.aAlpha);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(color) } }]),
      vertexShader: `attribute vec4 aPuff; attribute float aAlpha; varying vec2 vUv; varying float vA;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv; vA = aAlpha;
          vec4 mvPosition = viewMatrix * vec4(aPuff.xyz, 1.0);
          mvPosition.xy += position.xy * aPuff.w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying float vA;
        #include <fog_pars_fragment>
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float a = 0.9 * (1.0 - smoothstep(0.0, 1.0, d)) * vA;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
      transparent: true, depthWrite: false, fog,
    });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  update(dt, t) {
    if (!this.mesh) return;
    const P = this.aPuff.array, A = this.aAlpha.array; let any = false;
    this.puffs.forEach((p, i) => {
      p.a = (p.a + dt * this.rise / this.top) % 1;
      const h = p.a * this.top, sway = h * this.drift;
      P[i * 4] = this.x - sway + Math.sin(t * 0.4 + p.w) * (0.2 + h * 0.04); P[i * 4 + 1] = this.y + h; P[i * 4 + 2] = this.z + sway * 0.25 + Math.cos(t * 0.3 + p.w) * (0.2 + h * 0.04);
      P[i * 4 + 3] = this.size * (0.35 + p.a * 1.4);
      A[i] = this.k * Math.min(1, p.a * 6) * (1 - p.a) * this.dense; if (A[i] > 0.01) any = true;
    });
    this.aPuff.needsUpdate = true; this.aAlpha.needsUpdate = true; this.mesh.visible = any;
  }
}

// Vlammen: een paar tongen die flakkeren en zwaaien, daarboven gloeiende flarden die opstijgen en doven, vonken en een gloed.
const HOT = new THREE.Color(1, 0.7, 0.2), RED = new THREE.Color(1, 0.22, 0.03);
// één vlamtong: druppelvormig, van rood aan de rand naar geelwit in de kern
function tongueTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  x.globalCompositeOperation = 'lighter';
  // zachte bollen op elkaar gestapeld: breed en geelwit onderin, smal en rood naar de punt
  for (let i = 0; i < 26; i++) {
    const a = i / 25, y = 104 - a * 92, r = 4 + 20 * Math.pow(1 - a, 0.8) * Math.min(1, 0.45 + a * 3);
    const g = x.createRadialGradient(32, y, 0, 32, y, r), k = 0.3 * (1 - a * 0.75);
    g.addColorStop(0, `rgba(255,${Math.round(225 - a * 150)},${Math.round(130 - a * 125)},${k})`);
    g.addColorStop(0.55, `rgba(255,${Math.round(140 - a * 95)},${Math.round(30 - a * 26)},${k * 0.6})`);
    g.addColorStop(1, 'rgba(255,40,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function flames(size) {
  const g = new THREE.Group(), tongues = [], list = [], sparks = [];
  const tex = flames.tex || (flames.tex = softTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)')), ttex = flames.ttex || (flames.ttex = tongueTex());
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ttex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    s.center.set(0.5, 0.12); const a = i * 2.4, r = i ? (0.1 + (i % 2) * 0.09) * size : 0; s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.add(s); tongues.push({ s, w: i * 1.9, h: i ? 0.62 + (i % 3) * 0.12 : 1 });
  }
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    g.add(s); list.push({ s, ph: i / 7, w: i * 2.4, sp: 0.7 + (i % 4) * 0.1 });
  }
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffb050, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    g.add(s); sparks.push({ s, ph: i / 6, w: i * 1.7 });
  }
  const glow = glowSprite('rgba(255,170,70,0.75)', 'rgba(255,120,30,0)');
  glow.position.y = 0.4 * size; g.add(glow);
  g.userData = { tongues, list, sparks, glow, size };
  return g;
}
function flicker(g, t, k) {
  g.visible = k > 0.02;
  if (!g.visible) return;
  const { tongues, list, sparks, glow, size } = g.userData, big = 0.5 + 0.5 * k;
  for (const q of tongues) {
    const f = 0.82 + Math.sin(t * 9 + q.w) * 0.12 + Math.sin(t * 21 + q.w * 2.3) * 0.08;
    q.s.scale.set(size * big * 0.62 * q.h * (1.1 - f * 0.15), size * k * 1.25 * q.h * f, 1);
    q.s.material.rotation = Math.sin(t * 4.3 + q.w) * 0.1 + Math.sin(t * 11 + q.w * 3) * 0.05;
  }
  for (const q of list) {
    const a = (t * q.sp + q.ph) % 1, r = (1 - a) * 0.14 * size * big;
    q.s.position.set(Math.sin(q.w + t * 3.1) * r, size * k * (0.45 + a * 0.95), Math.cos(q.w * 1.7 + t * 2.3) * r);
    const w = size * big * (0.08 + 0.2 * (1 - a));
    q.s.scale.set(w, w * 1.8, 1);
    q.s.material.color.copy(HOT).lerp(RED, Math.min(1, a * 1.25));
    q.s.material.opacity = Math.min(1, a * 9) * Math.pow(1 - a, 1.3) * 0.5;
  }
  for (const q of sparks) {
    const a = (t * 0.42 + q.ph) % 1;
    q.s.position.set(Math.sin(q.w + t * 1.9 + a * 5) * 0.32 * size, size * k * (0.5 + a * 2.6), Math.cos(q.w * 2 + t * 1.3 + a * 4) * 0.32 * size);
    q.s.scale.setScalar(0.06 * size); q.s.material.opacity = (1 - a) * 0.9;
  }
  glow.scale.setScalar(size * (1.5 + k * 1.1) * (1 + Math.sin(t * 9) * 0.05)); glow.material.opacity = 0.12 + k * 0.2 + Math.sin(t * 13) * 0.03;
}

export class Fire {
  constructor(scene, cfg, dayLen, A) {
    this.dayLen = dayLen; this.fuel = 0; this.ember = 0; this.torchT = 0; this.lastP = null; this.told = {}; this.t = 0; this.wasLit = false;
    this.source = cfg.source; this.S = { x: cfg.source[0], z: cfg.source[1] }; this.H = { x: cfg.hearth[0], z: cfg.hearth[1] };
    const sy = height(this.S.x, this.S.z), hy = height(this.H.x, this.H.z);
    this.carried = !!cfg.carried; this.need = cfg.build || 0; this.ring = 0;
    const sm = this.carried ? 0.34 : 1;   // het meegedragen hout is maar een klein stuk

    const logV = variantsOf(A.models.dead_tree_trunk)[0], twigV = variantsOf(A.models.dry_branches_medium_01);
    const treeV = A.models.oldtree ? whole(A.models.oldtree, true) : null;
    const rockV = ['namaqualand_rocks_01', 'namaqualand_boulder_05', 'namaqualand_boulder_02'].flatMap((n) => variantsOf(A.models[n]));
    const char = tinted(0x3a322c);

    // de plek van de inslag: zwartgeblakerde grond, een verkoolde boom die nog overeind staat, en ervoor de afgebroken stam die smeult
    const burnt = new THREE.Mesh(new THREE.CircleGeometry(10 * (this.carried ? 0.16 : 1), 24), new THREE.MeshLambertMaterial({ map: softTex('rgba(34,29,26,0.95)', 'rgba(34,29,26,0)'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    burnt.rotation.x = -Math.PI / 2; burnt.position.set(this.S.x, sy + 0.06, this.S.z); scene.add(burnt);
    const src = new THREE.Group(), long = Math.max(logV.size.x, logV.size.z), alongX = logV.size.x >= logV.size.z, lk = 4.6 * sm / long;
    const log = make(logV, lk, char); log.position.y = -0.12 * logV.size.y * lk; src.add(log);
    const top = logV.size.y * lk * 0.82;
    this.embers = [];
    for (const [d, w] of [[-1.5, 0.7], [-0.6, 1.0], [0.3, 0.8], [1.2, 1.1], [1.9, 0.6]]) {
      const e = glowSprite('rgba(255,96,20,0.95)', 'rgba(255,60,0,0)'); e.position.set(alongX ? d * sm : 0.05, top * (0.75 + w * 0.2), alongX ? 0.05 : d * sm); e.userData.k = this.carried ? 0.5 : 1; src.add(e); this.embers.push({ e, w });
    }
    this.srcFlame = flames(this.carried ? 0.3 : 0.95); this.srcFlame.position.set(alongX ? 0.2 : 0, top * 0.9, alongX ? 0 : 0.2); src.add(this.srcFlame);
    if (!this.carried) twigV.forEach((v, i) => { const t = make(v, 1.1, char); t.position.set(Math.cos(i * 2.3) * 2.6, 0, Math.sin(i * 2.3) * 2.2); t.rotation.y = i * 1.9; src.add(t); });
    src.position.set(this.S.x, sy, this.S.z); src.rotation.y = 0.7; scene.add(src);
    blockers.push({ x: this.S.x, z: this.S.z, r: this.carried ? 0.4 : 0.9 });
    if (treeV && !this.carried) {
      const tx = this.S.x - 3.4, tz = this.S.z - 2.2, t = make(treeV, 7.5 / treeV.size.y, char);
      t.position.set(tx, height(tx, tz) - 0.15, tz); t.rotation.y = 2.1; scene.add(t); blockers.push({ x: tx, z: tz, r: 0.45 });
    }
    this.srcSmoke = new Smoke(scene, this.S.x, sy + 0.8 * sm, this.S.z, this.carried ? { n: 7, rise: 1.1, top: 6, size: 1.3, color: 0x8a847c, dense: 0.4 } : { n: 26, rise: 2.6, top: 55, size: 9, color: 0x4a4642, drift: 0.3, dense: 0.8 });
    this.srcLight = new THREE.PointLight(0xff6a20, 0, 14, 2); this.srcLight.position.set(this.S.x, sy + 1.2 * (this.carried ? 0.5 : 1), this.S.z); scene.add(this.srcLight);

    // de vuurplaats bij het kamp: een kring van keien om een bed van as
    const ring = new THREE.Group();
    this.ringStones = [];
    for (let i = 0; i < 11; i++) {
      const v = rockV[(i * 5 + 1) % rockV.length], a = i / 11 * 6.283 + (i % 2) * 0.08, w = 0.3 + (i * 7 % 4) * 0.035;
      let k = w / Math.max(v.size.x, v.size.z); if (v.size.y * k > 0.34) k = 0.34 / v.size.y;
      const st = make(v, k); st.position.set(Math.cos(a) * 0.82, -0.3 * v.size.y * k, Math.sin(a) * 0.82); st.rotation.y = i * 2.1; ring.add(st); this.ringStones.push(st);
    }
    const ash = new THREE.Mesh(new THREE.CircleGeometry(1.25, 20), new THREE.MeshLambertMaterial({ map: softTex('rgba(30,27,25,0.96)', 'rgba(30,27,25,0)'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    ash.rotation.x = -Math.PI / 2; ash.position.y = 0.04; ring.add(ash); this.ash = ash;
    if (this.need) {
      // nog geen kring: alleen een kale plek, platgetrapt en schoongeveegd
      const bare = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshLambertMaterial({ map: softTex('rgba(150,120,88,0.9)', 'rgba(150,120,88,0)'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      bare.rotation.x = -Math.PI / 2; bare.position.y = 0.03; ring.add(bare);
    }
    this.showRing();
    this.logs = new THREE.Group();
    const wood = tinted(0x7a6654);
    for (let i = 0; i < 4; i++) { const v = twigV[i % twigV.length], l = make(v, 1.0 / Math.max(v.size.x, v.size.z), wood); l.rotation.y = i * 1.2 + 0.3; l.position.set(Math.cos(i * 1.6) * 0.1, 0.04 + i * 0.03, Math.sin(i * 1.6) * 0.1); this.logs.add(l); }
    ring.add(this.logs);
    this.coals = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), new THREE.MeshBasicMaterial({ map: softTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), color: 0xff4a10, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.coals.rotation.x = -Math.PI / 2; this.coals.position.y = 0.16; ring.add(this.coals);
    this.flame = flames(1.3); this.flame.position.y = 0.12; ring.add(this.flame);
    ring.position.set(this.H.x, hy, this.H.z); scene.add(ring);
    blockers.push({ x: this.H.x, z: this.H.z, r: 0.85, top: hy + 0.3 });
    this.smoke = new Smoke(scene, this.H.x, hy + 1, this.H.z, { n: 8, rise: 1.6, top: 12, size: 2.6, color: 0x9a948c });
    this.light = new THREE.PointLight(0xff8a3a, 0, 30, 1.6); this.light.position.set(this.H.x, hy + 1.1, this.H.z); scene.add(this.light);
    this.torchLight = new THREE.PointLight(0xff9a48, 0, 20, 1.6); scene.add(this.torchLight);
    this.torchFlame = flames(0.3); this.torchFlame.visible = false; scene.add(this.torchFlame);

    // dode bomen: kaal, grijs en droog. Hier hak je hout.
    this.wood = [];
    cfg.wood.forEach(([x, z], i) => {
      if (treeV) { const t = make(treeV, (5.6 + (i % 3) * 0.9) / treeV.size.y); t.position.set(x, height(x, z) - 0.15, z); t.rotation.y = x * 0.37; scene.add(t); }
      blockers.push({ x, z, r: 0.5 });
      this.wood.push({ x, z, cool: 0 });
    });

    // de berg aan de horizon: een vulkaan uit de Grote Slenk (hoogtekaart en satellietfoto van de Ol Doinyo Lengai), met een rookpluim.
    // Te ver om heen te lopen; hij hoort bij het landschap. Onderaan lost hij op in de nevel.
    if (cfg.volcano && A.models.lengai) {
      const quiet = !!cfg.quiet;   // een berg die slaapt: geen rook
      const [vx, vz] = cfg.volcano, V = whole(A.models.lengai), peak = new THREE.Vector3(0, -1e9, 0), v = new THREE.Vector3();
      for (const q of V.parts) { const pos = q.geo.attributes.position; for (let i = 0; i < pos.count; i++) if (pos.getY(i) > peak.y) peak.fromBufferAttribute(pos, i); }
      const kx = 0.115, ky = kx * 1.45, H = V.size.y * ky;
      this.volU = { map: { value: null }, fogCol: { value: new THREE.Color(0xffffff) }, H: { value: H }, sun: { value: new THREE.Vector3(0.55, 0.55, 0.35).normalize() } };
      const grp = new THREE.Group();
      for (const q of V.parts) {
        q.geo.translate(-peak.x, 0, -peak.z); q.geo.scale(kx, ky, kx); q.geo.computeVertexNormals();
        const mat = new THREE.ShaderMaterial({
          uniforms: { ...this.volU, map: { value: q.mat.map } },
          vertexShader: 'varying vec2 vUv; varying float vH; varying vec3 vN; void main() { vUv = uv; vH = position.y; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: `uniform sampler2D map; uniform vec3 fogCol; uniform float H; uniform vec3 sun; varying vec2 vUv; varying float vH; varying vec3 vN;
            void main() {
              vec3 c = texture2D(map, vUv).rgb * (0.5 + 0.75 * max(dot(normalize(vN), sun), 0.0)) * min(1.0, dot(fogCol, vec3(0.3, 0.6, 0.1)) * 1.5);
              float k = smoothstep(0.03, 0.6, vH / H);
              gl_FragColor = vec4(mix(fogCol, c, 0.25 + k * 0.55), smoothstep(0.1, 0.42, vH / H));
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`,
          transparent: true,
        });
        mat.uniforms.fogCol = this.volU.fogCol;
        grp.add(new THREE.Mesh(q.geo, mat));
      }
      grp.position.set(vx, -14, vz); scene.add(grp);
      this.volSmoke = new Smoke(scene, vx, H - 22, vz, { n: quiet ? 0 : 10, rise: 3.5, top: 140, size: 80, color: 0x6a645e, drift: 0.5, fog: false });
    }
    this.scene = scene;
  }

  get lit() { return this.fuel > 0; }
  // ligt de kring er? (in een kamp waar hij er al lag: altijd)
  get built() { return this.ring >= this.need; }
  showRing() {
    const n = this.need ? Math.round(this.ringStones.length * Math.min(1, this.ring / this.need)) : this.ringStones.length;
    // de stenen komen er om en om bij, zodat het van begin af aan een kring is
    this.ringStones.forEach((st, i) => { st.visible = (i * 7) % this.ringStones.length < n; });
    this.ash.visible = this.built;
  }
  get state() { return this.fuel > 0 ? 'lit' : this.ember > 0 ? 'ember' : 'cold'; }
  // warm genoeg om de kou van de nacht niet te voelen
  warm(p) { return this.lit && dist(p, this.H) < 14; }
  lookTargets() {
    return [{ look: this.carried ? 'firecarried' : 'firesource', x: this.S.x, z: this.S.z, fire: 'source' }, { look: !this.built ? 'hearthspot' : this.fuel > 0 ? 'hearthlit' : this.ember > 0 ? 'hearthember' : 'hearth', x: this.H.x, z: this.H.z, fire: 'hearth' },
      ...this.wood.map((w) => ({ look: 'deadwood', x: w.x, z: w.z, fire: 'wood', wood: w }))];
  }
  // Wat kun je hier nu doen met wat je in je handen hebt? Geeft het icoon terug, of null.
  canUse(t, s) {
    const H = s.hands, has = (it) => H.includes(it);
    if (t.fire === 'source') return has('branch') || has('stick') ? ICON.fire : null;
    if (t.fire === 'wood') return has('axe') ? ICON.chop : ICON.hand;
    if (!this.built) return has('stone') ? ICON.drop : has('torch') ? ICON.fire : null;
    if (has('torch')) return ICON.fire;
    if (this.lit && has('meat')) return ICON.fire;
    if (has('branch') || has('stick')) return ICON.fire;
    return null;
  }
  // hetzelfde in één of twee woorden, voor op de knop
  verb(t, s) {
    const has = (it) => s.hands.includes(it);
    if (t.fire === 'source') return 'Steek aan';
    if (t.fire === 'wood') return has('axe') ? 'Hak' : 'Trek';
    if (!this.built) return has('stone') ? 'Leg neer' : 'Steek aan';
    if (has('torch')) return 'Steek aan';
    if (this.lit && has('meat')) return 'Braad';
    return 'Leg erop';
  }
  use(t, game) {
    if (t.fire === 'source') return this.kindle(game);
    if (t.fire === 'wood') return this.chop(t.wood, game);
    const H = game.state.hands;
    if (!this.built) return this.layStone(game);
    if (H.includes('torch')) return this.lightHearth(game);
    if (this.lit && H.includes('meat')) return this.roast(game);
    return this.feed(game);
  }
  // de knop: sta je ernaast met het goede ding in je hand, dan doet hij het
  action(game) {
    const p = game.player.pos, s = game.state, H = s.hands;
    const run = (t, speed = 1.6) => () => game.player.playOnce('Interact', { speed, at: 0.5, onAt: () => this.use(t, game) });
    const T = this.lookTargets();
    if (dist(p, this.S) < 3.6 && this.canUse(T[0], s)) return { mode: 'fire', word: this.verb(T[0], s), icon: ICON.fire, run: run(T[0]) };
    if (dist(p, this.H) < 3 && !this.built) return H.includes('stone') ? { mode: 'build', icon: ICON.drop, run: run(T[1]) } : null;
    if (dist(p, this.H) < 3 && this.canUse(T[1], s) && !(this.state === 'cold' && !H.includes('torch'))) return { mode: 'fire', word: this.verb(T[1], s), icon: ICON.fire, run: run(T[1]) };
    const w = H.includes('axe') && T.find((x) => x.wood && dist(p, x) < 3);
    if (w) return { mode: 'chop', icon: ICON.chop, run: run(w, 1.3) };
    return null;
  }

  // een kei op de kale plek leggen: zes keien en de kring is rond
  layStone(game) {
    const s = game.state, i = s.hands.indexOf('stone');
    if (i < 0) { game.toast(s.hands.includes('torch') ? 'Op de kale grond waait het vuur zo uit. Leg eerst een kring van keien.' : 'Een kale plek. Hier moet het vuur komen. Maar eerst een kring van keien.', 5); return; }
    s.hands[i] = null; game.renderHands(); game.sound.thud();
    this.ring++; this.showRing();
    const left = this.need - this.ring;
    if (left > 0) { game.toast(this.ring === 1 ? 'Je legt de kei neer. Dat is één. De kring is nog lang niet rond.' : `Weer een kei. Nog ${left}.`, 4); return; }
    game.toast('De kring is rond. Nu kan het vuur erin.', 6); setTimeout(() => game.sound.good(), 600);
    game.discover('ring');
  }
  // een tak in de gloed houden
  kindle(game) {
    const s = game.state, i = s.hands.indexOf('branch') >= 0 ? s.hands.indexOf('branch') : s.hands.indexOf('stick');
    if (i < 0) { game.toast('Au, heet! Met je hand kun je geen vuur pakken.', 4); game.sound.bad(); return; }
    s.hands[i] = 'torch'; this.torchT = TORCH; this.told.low = false; game.renderHands(); game.sound.whoosh();
    game.toast(this.carried ? 'De tak vat vlam.' : s.found.has('torch') ? 'De tak vat vlam. Lopen!' : 'De tak rookt… en dan brandt hij! Snel terug naar het kamp, voor hij op is.', 6);
    s.known.add('torch'); game.discover('torch');
  }
  // met de brandende tak het vuur in de kring aansteken
  lightHearth(game) {
    const s = game.state, i = s.hands.indexOf('torch'); if (i < 0) return;
    s.hands[i] = null; game.renderHands(); game.sound.whoosh();
    const first = !s.found.has(this.need ? 'camp' : 'hearth');
    this.fuel = Math.min(MAX, this.fuel + 200); this.ember = 0;
    game.toast(first ? 'Je legt de brandende tak tussen de stenen. Vuur! Iedereen komt kijken.' : 'Het vuur brandt weer.', 7);
    if (first) s.group = Math.min(100, s.group + 20);
    setTimeout(() => game.sound.good(), 700);
    game.discover('hearth'); if (this.need) game.discover('camp');
  }
  // hout op het vuur
  feed(game) {
    const s = game.state, i = s.hands.indexOf('branch') >= 0 ? s.hands.indexOf('branch') : s.hands.indexOf('stick');
    if (i < 0) return;
    if (this.state === 'cold') { game.toast('De as is koud. Er gebeurt niets. Je moet eerst vuur halen.', 5); return; }
    if (this.fuel >= MAX - 20) { game.toast('Er ligt genoeg hout op.', 4); return; }
    const revive = this.fuel <= 0;
    s.hands[i] = null; game.renderHands(); game.sound.crack();
    this.fuel = Math.min(MAX, this.fuel + BRANCH); this.ember = 0; this.told.small = false;
    if (revive) { game.toast('Je legt de tak op de as en blaast. Rook… een vlam! Het vuur is terug.', 6); game.discover('ember'); }
    else game.toast(this.fuel > 500 ? 'De vlammen zijn hoog. Dit brandt de hele nacht.' : 'Het hout knettert. Het vuur wordt groter.', 4);
    game.discover('feed');
  }
  // vlees boven het vuur
  roast(game) {
    const s = game.state, i = s.hands.indexOf('meat'); if (i < 0 || !this.lit) return;
    s.hands[i] = 'roast'; game.renderHands(); game.sound.hiss(0.6);
    game.toast(s.found.has('roast') ? 'Het vlees sist en kleurt bruin.' : 'Het vlees sist boven het vuur. Wat ruikt dat lekker! Iedereen kijkt op.', 6);
    s.known.add('roast'); game.discover('roast');
  }
  // een tak van een dode boom hakken
  chop(w, game) {
    const s = game.state;
    if (!s.hands.includes('axe')) {
      game.sound.bad();
      game.toast(s.hands.includes('flake') ? 'Je snijdt met de scherf in de tak. Het lukt niet: de scherf is te klein.' : 'Je trekt hard aan een tak. Hij buigt, maar breekt niet. Je hebt iets zwaars en scherps nodig.', 5);
      return;
    }
    if (w.cool > 0) return;
    w.cool = 0.8; game.sound.crack(); setTimeout(() => game.sound.thud(), 250);
    if (!game.giveHand('branch')) return;
    game.toast(s.found.has('chop') ? 'Tak!' : 'Drie klappen en de tak is los. Droog hout brandt goed.', 4);
    s.known.add('axe'); game.discover('chop');
  }

  // 's ochtends: brandt het nog?
  morning(game, dayP) {
    const before = this.wasLit;
    this.advance(game, dayP);
    if (!before && !this.lit) return;
    const s = game.state;
    if (this.lit) {
      s.health = Math.min(100, s.health + 10); s.group = Math.min(100, s.group + 6);
      setTimeout(() => { game.toast('Het vuur brandt nog. Niemand had het koud, en geen dier kwam dichtbij.', 6); game.discover('keep'); }, 4200);
    } else {
      s.group = Math.max(0, s.group - 8);
      const ember = this.ember > 0;
      setTimeout(() => { game.sound.bad(); game.toast(ember ? 'Het vuur is uit. Maar de as gloeit nog. Leg er snel een tak op!' : 'Het vuur is vannacht uitgegaan. De as is koud. Je moet nieuw vuur halen.', 7); }, 4200);
    }
  }
  // de tijd die verstreken is (ook als je sliep) vreet aan het hout
  advance(game, dayP) {
    const el = this.lastP === null || !game.state.started ? 0 : ((dayP - this.lastP + 1) % 1) * this.dayLen;
    this.lastP = dayP;
    if (el <= 0) return;
    if (this.fuel > 0) {
      const left = this.fuel - el;
      // overdag houdt de groep het zelf aan de praat met sprokkelhout; 's nachts slaapt iedereen
      if (game.night < 0.3 && game.state.group > 15 && !game.state.lost) this.fuel = Math.max(Math.min(this.fuel, 120), left);
      else if (left > 0) this.fuel = left;
      else { this.fuel = 0; this.ember = Math.max(0, EMBER + left); }
    } else if (this.ember > 0) this.ember = Math.max(0, this.ember - el);
    if (game.state.hands.includes('torch')) {
      this.torchT -= el;
      if (this.torchT <= 0 || game.player.pos.y < -0.5) {
        const wet = this.torchT > 0;
        for (const i of [0, 1]) if (game.state.hands[i] === 'torch') game.state.hands[i] = null;
        game.renderHands(); game.sound.hiss(0.5);
        game.toast(wet ? 'Het water slaat over de vlam. Sssst. Uit.' : 'De tak is op. Je laat hem vallen. Het vuur is weg.', 6);
      } else if (this.torchT < 45 && !this.told.low) { this.told.low = true; game.toast('De vlam komt bij je hand. Schiet op!', 4); }
    }
  }

  snapshot() { return { fuel: Math.round(this.fuel), ember: Math.round(this.ember), ring: this.ring }; }
  restore(d) {
    this.torchT = 90; if (!d) return;
    this.ring = Math.max(0, Math.min(this.need, Math.round(+d.ring || 0))); this.showRing();
    if (!this.built) return;
    this.fuel = Math.max(0, Math.min(MAX, +d.fuel || 0)); this.ember = Math.max(0, Math.min(EMBER, +d.ember || 0)); this.lastP = null;
  }

  update(dt, game, dayP) {
    this.t += dt; const t = this.t, s = game.state, p = game.player.pos;
    this.wasLit = this.lit;
    if (s.sleeping <= 0) this.advance(game, dayP);
    for (const w of this.wood) w.cool = Math.max(0, w.cool - dt);
    // het vuur in de kring
    const k = this.fuel > 0 ? 0.35 + 0.65 * Math.min(1, this.fuel / 500) : 0;
    this.level = this.level === undefined ? k : this.level + (k - this.level) * Math.min(1, dt * 2);
    flicker(this.flame, t, this.level);
    this.coals.visible = this.fuel > 0 || this.ember > 0; this.logs.visible = this.coals.visible;
    this.coals.material.color.setHex(this.fuel > 0 ? 0xff5a14 : 0xb02a08);
    this.coals.material.opacity = 0.75 + Math.sin(t * 2.3) * 0.2;
    const fl = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 21) * 0.07;
    this.light.intensity = (this.level * 26 + (this.fuel <= 0 && this.ember > 0 ? 1.5 : 0)) * fl * (0.35 + 0.65 * game.night);
    this.smoke.k = this.fuel > 0 ? 0.8 : this.ember > 0 ? 0.35 : 0; this.smoke.update(dt, t);
    if (this.fuel > 0 && this.fuel < 110 && game.night > 0.3 && !this.told.small && dist(p, this.H) < 30) { this.told.small = true; game.toast('Het vuur wordt klein. Er moet hout op.', 5); }
    // de smeulende stam
    flicker(this.srcFlame, t, this.carried ? 0.3 + Math.sin(t * 0.7) * 0.15 : 0.55 + Math.sin(t * 0.7) * 0.2);
    for (const { e, w } of this.embers) { const g = 0.55 + 0.45 * Math.sin(t * (0.9 + w) + w * 9); e.scale.setScalar((0.5 + w * 0.35 + g * 0.15) * e.userData.k); e.material.opacity = 0.45 + g * 0.5; }
    this.srcLight.intensity = (this.carried ? 3 : 9) * fl * (0.3 + 0.7 * game.night);
    this.srcSmoke.update(dt, t);
    if (this.volSmoke) { this.volSmoke.update(dt, t); if (this.scene.fog) this.volU.fogCol.value.copy(this.scene.fog.color); }
    // de brandende tak: licht om je heen, en hyena's die terugdeinzen
    const torch = s.hands.includes('torch');
    this.torchLight.intensity = torch ? 14 * fl * (0.3 + 0.7 * game.night) : 0;
    this.torchFlame.visible = false;
    if (torch) {
      this.torchLight.position.set(p.x, p.y + 1.7, p.z);
      const hand = s.hands[0] === 'torch' ? game.player.heldL : game.player.held, coal = hand && hand.getObjectByName('coal');
      if (coal) { coal.getWorldPosition(this.torchFlame.position); flicker(this.torchFlame, t, 0.9 + Math.sin(t * 5) * 0.1); }
      for (const h of game.hyenas.list) {
        if (dist(h, p) < 10 && ['curious', 'windup', 'rush'].includes(h.state)) {
          h.state = 'retreat'; h.t = 6; game.sound.from(h).yelp();
          if (!s.found.has('scare')) { game.toast('De hyena ziet de vlam en schrikt terug!', 4); game.discover('scare'); }
        }
      }
    }
  }
}
