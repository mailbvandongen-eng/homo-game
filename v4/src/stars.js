import * as THREE from '../lib/three.module.js';
import { moonAt } from './moon.js';

// De sterrenhemel van toen. De sterren komen uit de HYG-catalogus: van elke ster is de plaats, de afstand en de snelheid
// teruggerekend naar de tijd van dit gebied (zie assets/CREDITS.md). De sterrenbeelden van nu bestonden nog niet;
// de Melkweg, het draaien van de hemel en de windstreken waren hetzelfde. De hemel draait om de pool in het noorden (-z):
// sterren komen op in het oosten (+x) en gaan onder in het westen.
const Q = window.__VA && window.__VA[0] !== '_' ? '?v=' + window.__VA : '';
const R = 560, TILT = new THREE.Quaternion(), TURN = new THREE.Quaternion();
const MOON_R = THREE.MathUtils.degToRad(2), BX = new THREE.Vector3(), BY = new THREE.Vector3(), BZ = new THREE.Vector3(), BM = new THREE.Matrix4();
// dezelfde wolken als in de lucht (world.js): waar een wolk hangt, zie je de sterren en de maan niet
const CLOUDS = `uniform float uTime, uCover;
  float ch(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float cn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(ch(i), ch(i+vec2(1,0)), f.x), mix(ch(i+vec2(0,1)), ch(i+vec2(1,1)), f.x), f.y); }
  float cfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * cn(p); p *= 2.03; a *= 0.5; } return s; }
  float cloudAt(vec3 d){
    if (d.y <= 0.0) return 0.0;
    vec2 uv = d.xz / (d.y + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.002);
    return smoothstep(0.52 - uCover * 0.5, 0.8 - uCover * 0.42, cfbm(uv)) * smoothstep(0.0, 0.25 - uCover * 0.2, d.y);
  }`;

// cfg: { years: hoe lang geleden, lat: breedtegraad van het gebied, turn: welk deel van de hemel 's nachts boven staat (0..1) }
export async function loadStars(scene, cfg) {
  const file = `./assets/stars/stars_${Math.round(cfg.years / 1000)}.bin`;
  const tex = (f) => new THREE.TextureLoader().loadAsync(f + Q).catch(() => { throw new Error('Kan ' + f + ' niet laden'); });
  const [buf, band, moon] = await Promise.all([
    fetch(file + Q).then((r) => { if (!r.ok) throw new Error('Kan ' + file + ' niet laden'); return r.arrayBuffer(); }),
    tex('./assets/stars/milkyway.jpg'), tex('./assets/stars/moon.jpg'),
  ]);
  return new Stars(scene, cfg, new Int16Array(buf), band, moon);
}

class Stars {
  constructor(scene, cfg, d, band, moon) {
    const n = this.count = d.length / 5, pos = new Float32Array(n * 3), mag = new Float32Array(n), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = d[i * 5] / 32767 * R; pos[i * 3 + 1] = d[i * 5 + 1] / 32767 * R; pos[i * 3 + 2] = d[i * 5 + 2] / 32767 * R;
      mag[i] = d[i * 5 + 3] / 100;
      // de kleur van de ster: van blauwwit (heet) via wit en geel naar oranje (koel)
      const ci = d[i * 5 + 4] / 100;
      if (ci < 0.3) c.setRGB(0.72, 0.82, 1).lerp(WHITE, THREE.MathUtils.clamp((ci + 0.3) / 0.6, 0, 1));
      else c.copy(WHITE).lerp(ORANGE, THREE.MathUtils.clamp((ci - 0.3) / 1.4, 0, 1));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('mag', new THREE.BufferAttribute(mag, 1)); geo.setAttribute('tint', new THREE.BufferAttribute(col, 3));
    this.uniforms = {
      uTime: { value: 0 }, uDark: { value: 0 }, uPx: { value: 1 }, tBand: { value: band }, uCover: { value: 0 },
      uMoon: { value: new THREE.Vector3(0, 1, 0) }, uMoonCos: { value: 2 }, tMoon: { value: moon }, uSunT: { value: new THREE.Vector2(1, 0) }, uPhase: { value: 0 }, uShow: { value: 0 },
    };
    moon.colorSpace = THREE.SRGBColorSpace;
    band.colorSpace = THREE.SRGBColorSpace; band.generateMipmaps = false; band.minFilter = THREE.LinearFilter;
    const common = { uniforms: this.uniforms, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      ...common,
      // heldere sterren zijn groter en komen in de schemer het eerst; vlak boven de horizon dooft de lucht ze uit
      vertexShader: `attribute float mag; attribute vec3 tint; uniform float uDark, uPx, uMoonCos; uniform vec3 uMoon; varying vec4 vc;
        ${CLOUDS}
        void main(){
          vec3 wd = normalize(mat3(modelMatrix) * position);
          float b = pow(2.512, 1.5 - mag);
          float seen = smoothstep(0.0, 0.3, uDark - 0.11 * (mag + 1.5)) * smoothstep(0.0, 0.22, wd.y + 0.02);
          seen *= (1.0 - cloudAt(wd)) * step(dot(wd, uMoon), uMoonCos);   // niet door een wolk heen, en niet voor de maan langs
          float tw = 0.86 + 0.14 * sin(uTime * (2.0 + fract(position.x * 7.31) * 3.0) + position.y * 3.7);
          vc = vec4(tint, clamp(0.3 + 0.7 * sqrt(b), 0.0, 1.0) * seen * mix(1.0, tw, smoothstep(0.6, 0.0, wd.y)));
          gl_PointSize = uPx * clamp(1.9 + 1.7 * sqrt(b), 1.9, 8.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `varying vec4 vc;
        void main(){
          float r = length(gl_PointCoord - 0.5) * 2.0;
          gl_FragColor = vec4(vc.rgb, vc.a * smoothstep(1.0, 0.25, r));
          #include <colorspace_fragment>
        }`,
    }));
    // de Melkweg: een foto van de hele hemel zonder losse sterren (NASA), in dezelfde coördinaten als de sterren
    this.band = new THREE.Mesh(new THREE.SphereGeometry(R + 15, 48, 24), new THREE.ShaderMaterial({
      ...common, side: THREE.BackSide,
      vertexShader: 'varying vec3 vd, wd; void main(){ vd = normalize(position); wd = normalize(mat3(modelMatrix) * position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tBand; uniform float uDark; varying vec3 vd, wd;
        ${CLOUDS}
        void main(){
          vec3 d = normalize(vd);
          vec2 uv = vec2(0.5 - atan(d.y, d.x) / 6.2831853, 0.5 + asin(clamp(d.z, -1.0, 1.0)) / 3.1415927);
          vec3 c = texture2D(tBand, uv).rgb;
          vec3 w = normalize(wd);
          gl_FragColor = vec4(c * 0.9, smoothstep(0.55, 1.0, uDark) * smoothstep(0.02, 0.3, w.y) * (1.0 - cloudAt(w)));
          #include <colorspace_fragment>
        }`,
    }));
    // de maan: een echte kaart van de maan (NASA) op een schijf, verlicht van de kant waar de zon staat.
    // Door het donkere deel zie je de lucht, met een zweem aardlicht; vlak boven de horizon is ze oranje, zoals in het echt.
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      ...common, blending: THREE.NormalBlending,
      vertexShader: 'varying vec2 vu; varying vec3 wd; void main(){ vu = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); wd = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D tMoon; uniform vec2 uSunT; uniform float uPhase, uShow; varying vec2 vu; varying vec3 wd;
        ${CLOUDS}
        void main(){
          float r2 = dot(vu, vu);
          if (r2 > 1.0) discard;
          vec3 n = vec3(vu, sqrt(1.0 - r2)), w = normalize(wd);
          vec2 uv = vec2(0.5 + atan(n.x, n.z) / 6.2831853, 0.5 + asin(n.y) / 3.1415927);
          vec3 L = vec3(uSunT * sin(uPhase), -cos(uPhase));
          float lit = smoothstep(-0.03, 0.14, dot(n, L));
          vec3 c = texture2D(tMoon, uv).rgb * (lit * 1.6 + 0.25) * mix(vec3(1.0, 0.58, 0.3), vec3(1.0, 0.97, 0.9), smoothstep(0.03, 0.4, w.y));
          gl_FragColor = vec4(c, uShow * smoothstep(1.0, 0.94, r2) * (1.0 - 0.92 * cloudAt(w)) * smoothstep(-0.02, 0.05, w.y) * (0.1 + 0.9 * lit));
          #include <colorspace_fragment>
        }`,
    }));
    this.moon.scale.setScalar((R - 20) * Math.tan(MOON_R)); this.moon.renderOrder = 2; this.moon.frustumCulled = false; scene.add(this.moon);
    this.points.frustumCulled = this.band.frustumCulled = false;
    this.points.renderOrder = 1;
    this.group = new THREE.Group(); this.group.add(this.band, this.points); scene.add(this.group);
    // de pool staat in het noorden, zo hoog boven de horizon als de breedtegraad
    const lat = THREE.MathUtils.degToRad(cfg.lat || 0);
    this.pole = new THREE.Vector3(0, Math.sin(lat), -Math.cos(lat));
    TILT.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -Math.cos(lat), -Math.sin(lat)), this.pole));
    this.tilt = TILT.clone(); this.turn = cfg.turn || 0; this.dark = 0;
  }

  // follow: de hemel hangt om het oog (vlak voor het tekenen)
  // p: moment van de dag (één dag = de hemel één keer rond) · night: hoe donker het is · cloud: hoeveel wolken · day: de hoeveelste dag
  follow(eye) { this.group.position.copy(eye); this.moon.position.copy(eye).addScaledVector(this.uniforms.uMoon.value, R - 20); }

  update(t, p, night, cloud, px, day) {
    const u = this.uniforms, m = moonAt(day || 1, p);
    this.dark = night * Math.max(0, 1 - cloud * 1.3);
    u.uTime.value = t; u.uCover.value = cloud;
    // de maan staat er al in de schemer; achter een dik wolkendek blijft alleen een vage vlek
    const show = THREE.MathUtils.smoothstep(night, 0.15, 0.7) * (1 - 0.8 * THREE.MathUtils.smoothstep(cloud, 0.45, 0.9));
    this.moon.visible = show > 0.01 && m.dir.y > -0.06;
    u.uShow.value = show; u.uMoonCos.value = this.moon.visible ? Math.cos(MOON_R * 1.05) : 2;
    if (this.moon.visible) {
      // de schijf kijkt naar het oog; het noorden van de maan wijst naar de hemelpool (bij de evenaar ligt de sikkel als een bootje)
      BZ.copy(m.dir).negate(); BX.crossVectors(this.pole, BZ).normalize(); BY.crossVectors(BZ, BX);
      this.moon.quaternion.setFromRotationMatrix(BM.makeBasis(BX, BY, BZ));
      u.uMoon.value.copy(m.dir); u.uPhase.value = m.phase;
      u.uSunT.value.set(m.sun.dot(BX), m.sun.dot(BY)).normalize();
    }
    this.group.visible = this.dark > 0.01;
    if (!this.group.visible) return;
    this.group.quaternion.copy(TURN.setFromAxisAngle(this.pole, -(p + this.turn) * Math.PI * 2)).multiply(this.tilt);
    // bij helder maanlicht zie je alleen de helderste sterren
    u.uDark.value = this.dark * (1 - 0.42 * m.glow); u.uPx.value = px;
  }
}
const WHITE = new THREE.Color(1, 0.98, 0.95), ORANGE = new THREE.Color(1, 0.62, 0.38);
