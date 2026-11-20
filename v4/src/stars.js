import * as THREE from '../lib/three.module.js';

// De sterrenhemel van toen. De sterren komen uit de HYG-catalogus: van elke ster is de plaats, de afstand en de snelheid
// teruggerekend naar de tijd van dit gebied (zie assets/CREDITS.md). De sterrenbeelden van nu bestonden nog niet;
// de Melkweg, het draaien van de hemel en de windstreken waren hetzelfde. De hemel draait om de pool in het noorden (-z):
// sterren komen op in het oosten (+x) en gaan onder in het westen.
const Q = window.__VA && window.__VA[0] !== '_' ? '?v=' + window.__VA : '';
const R = 560, TILT = new THREE.Quaternion(), TURN = new THREE.Quaternion();

// cfg: { years: hoe lang geleden, lat: breedtegraad van het gebied, turn: welk deel van de hemel 's nachts boven staat (0..1) }
export async function loadStars(scene, cfg) {
  const file = `./assets/stars/stars_${Math.round(cfg.years / 1000)}.bin`;
  const [buf, band] = await Promise.all([
    fetch(file + Q).then((r) => { if (!r.ok) throw new Error('Kan ' + file + ' niet laden'); return r.arrayBuffer(); }),
    new THREE.TextureLoader().loadAsync('./assets/stars/milkyway.jpg' + Q).catch(() => { throw new Error('Kan assets/stars/milkyway.jpg niet laden'); }),
  ]);
  return new Stars(scene, cfg, new Int16Array(buf), band);
}

class Stars {
  constructor(scene, cfg, d, band) {
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
    this.uniforms = { uTime: { value: 0 }, uDark: { value: 0 }, uPx: { value: 1 }, tBand: { value: band } };
    band.colorSpace = THREE.SRGBColorSpace; band.generateMipmaps = false; band.minFilter = THREE.LinearFilter;
    const common = { uniforms: this.uniforms, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      ...common,
      // heldere sterren zijn groter en komen in de schemer het eerst; vlak boven de horizon dooft de lucht ze uit
      vertexShader: `attribute float mag; attribute vec3 tint; uniform float uTime, uDark, uPx; varying vec4 vc;
        void main(){
          vec3 wd = normalize(mat3(modelMatrix) * position);
          float b = pow(2.512, 1.5 - mag);
          float seen = smoothstep(0.0, 0.3, uDark - 0.11 * (mag + 1.5)) * smoothstep(0.0, 0.22, wd.y + 0.02);
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
        void main(){
          vec3 d = normalize(vd);
          vec2 uv = vec2(0.5 - atan(d.y, d.x) / 6.2831853, 0.5 + asin(clamp(d.z, -1.0, 1.0)) / 3.1415927);
          vec3 c = texture2D(tBand, uv).rgb;
          gl_FragColor = vec4(c * 0.9, smoothstep(0.55, 1.0, uDark) * smoothstep(0.02, 0.3, normalize(wd).y));
          #include <colorspace_fragment>
        }`,
    }));
    this.points.frustumCulled = this.band.frustumCulled = false;
    this.points.renderOrder = 1;
    this.group = new THREE.Group(); this.group.add(this.band, this.points); scene.add(this.group);
    // de pool staat in het noorden, zo hoog boven de horizon als de breedtegraad
    const lat = THREE.MathUtils.degToRad(cfg.lat || 0);
    this.pole = new THREE.Vector3(0, Math.sin(lat), -Math.cos(lat));
    TILT.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -Math.cos(lat), -Math.sin(lat)), this.pole));
    this.tilt = TILT.clone(); this.turn = cfg.turn || 0; this.dark = 0;
  }

  // p: moment van de dag (één dag = de hemel één keer rond) · night: hoe donker het is · cloud: hoeveel wolken
  update(t, eye, p, night, cloud, px) {
    this.dark = night * Math.max(0, 1 - cloud * 1.3);
    this.group.visible = this.dark > 0.01;
    if (!this.group.visible) return;
    this.group.position.copy(eye);
    this.group.quaternion.copy(TURN.setFromAxisAngle(this.pole, -(p + this.turn) * Math.PI * 2)).multiply(this.tilt);
    this.uniforms.uTime.value = t; this.uniforms.uDark.value = this.dark; this.uniforms.uPx.value = px;
  }
}
const WHITE = new THREE.Color(1, 0.98, 0.95), ORANGE = new THREE.Color(1, 0.62, 0.38);
