import * as THREE from '../../lib/three.module.js';

// Het weer hoort bij het seizoen. Droge dagen zijn helder met wat wind. Op de laatste droge dag pakken de wolken
// zich samen en trekt de wind aan; in de nacht begint het te regenen en de ochtend daarna regent het uit.
export const DRY_DAYS = 5;
const ss = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp;
const hash = (n) => { const s = Math.sin(n * 127.1 + 31.7) * 43758.5453; return s - Math.floor(s); };

// p: moment van de dag (0 = dageraad, 0,8 = begin van de nacht). base: wat bij het gebied hoort (hoogland: meer wind).
export function weatherAt(day, rainDay, p, base = {}) {
  const dry = day - 1 - rainDay, calm = 0.08 + hash(day) * 0.28, breeze = (base.wind || 0.2) + hash(day + 50) * 0.25;
  const w = { cloud: calm, rain: 0, wind: breeze + Math.sin(p * 20 + day) * 0.06 };
  if (dry >= DRY_DAYS - 1) {
    // de regen komt eraan
    const build = ss(p, 0.3, 0.72);
    w.cloud = lerp(calm, 0.95, build); w.wind = lerp(breeze, 0.9, build); w.rain = ss(p, 0.8, 0.9) * 0.8;
  } else if (dry === 0 && day > 1) {
    // de ochtend na de regen: het regent uit en klaart op
    const clear = ss(p, 0.12, 0.45);
    w.cloud = lerp(0.95, calm + 0.15, clear); w.rain = 0.85 * (1 - ss(p, 0.03, 0.26)); w.wind = lerp(0.6, breeze, clear);
  }
  return w;
}

const N = 2200, S = 34, H = 20;

export class Weather {
  constructor(scene, base) {
    this.base = base || {}; this.now = { cloud: 0.15, rain: 0, wind: 0.25 }; this.force = null; this.first = true; this.thunderT = 20;
    // regen: korte strepen in een blok om de camera heen, die met de wind mee schuin vallen
    // elke streep is een smal plaatje van vier hoekpunten (lijnen van één beeldpunt zie je op een telefoon niet)
    const pos = new Float32Array(N * 12), end = new Float32Array(N * 4), edge = new Float32Array(N * 4), idx = new Uint16Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = Math.random() * S, y = Math.random() * H, z = Math.random() * S;
      for (let j = 0; j < 4; j++) { pos.set([x, y, z], i * 12 + j * 3); end[i * 4 + j] = j >> 1; edge[i * 4 + j] = j % 2 ? 1 : -1; }
      idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    geo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.uni = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSlant: { value: new THREE.Vector2() }, uAlpha: { value: 0 }, uCol: { value: new THREE.Color(0xcfd8e0) } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uni, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      vertexShader: `attribute float aEnd, aEdge; uniform float uTime; uniform vec3 uCam; uniform vec2 uSlant; varying float vA;
        void main(){
          vec3 p = position;
          float speed = 15.0 + fract(p.x * 7.31 + p.z * 3.17) * 7.0;
          p.y = mod(p.y - uTime * speed, ${H.toFixed(1)});
          p.xz += uSlant * (${H.toFixed(1)} - p.y);
          p.xz = uCam.xz + mod(p.xz - uCam.xz, ${S.toFixed(1)}) - ${(S / 2).toFixed(1)};
          p.y += uCam.y - ${(H * 0.45).toFixed(1)};
          p += vec3(-uSlant.x, 1.0, -uSlant.y) * aEnd * 0.6;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          mv.x += aEdge * (0.006 + 0.0012 * -mv.z);
          vA = smoothstep(${(S / 2).toFixed(1)}, ${(S / 2 - 6).toFixed(1)}, length(p.xz - uCam.xz)) * (0.35 + aEnd * 0.65);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: 'uniform float uAlpha; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol, uAlpha * vA); }',
    });
    this.rain = new THREE.Mesh(geo, mat); this.rain.frustumCulled = false; this.rain.visible = false; this.rain.renderOrder = 5;
    scene.add(this.rain);
  }

  // elke frame. night: 0..1; cam: de plek van de camera; wind: de richting van de wind
  update(dt, t, { day, rainDay, p, night, cam, wind }) {
    const want = this.force || weatherAt(day, rainDay, p, this.base), k = this.first || this.force ? 1 : 1 - Math.exp(-dt * 0.35);
    this.first = false;
    for (const n of ['cloud', 'rain', 'wind']) this.now[n] += (THREE.MathUtils.clamp(want[n] ?? this.now[n], 0, 1) - this.now[n]) * k;
    const w = this.now, on = w.rain > 0.02;
    this.rain.visible = on;
    if (on) {
      this.rain.geometry.setDrawRange(0, Math.ceil(N * Math.min(1, w.rain * 1.15)) * 6);
      this.uni.uTime.value = t; this.uni.uCam.value.copy(cam);
      this.uni.uSlant.value.set(wind.x, wind.z).multiplyScalar(0.08 + w.wind * 0.3);
      this.uni.uAlpha.value = (0.42 - night * 0.24) * Math.min(1, w.rain * 3);
    }
    return w;
  }
}
