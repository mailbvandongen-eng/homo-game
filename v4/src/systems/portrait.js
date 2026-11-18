import * as THREE from '../../lib/three.module.js';

// Het gezicht van een groepslid, als plaatje. Geen tekening: we zetten het echte model even apart in rustig licht,
// kijken hem recht aan en bewaren wat we zien. Zo lijkt het plaatje altijd op wie er in het spel rondloopt.
const S = 192;

export function initPortrait(G) {
  const { renderer } = G;
  const rt = new THREE.WebGLRenderTarget(S, S), sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(22, 1, 0.05, 20);
  const sun = new THREE.DirectionalLight(0xffe6c4, 1.7);
  sc.add(new THREE.HemisphereLight(0xfff2e0, 0x7a5a44, 1.1), sun);
  const buf = new Uint8Array(S * S * 4), head = new THREE.Vector3(), fwd = new THREE.Vector3(), side = new THREE.Vector3();
  const srgb = new Uint8Array(256).map((_, i) => { const c = i / 255; return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)); });
  const cache = new Map();

  return function face(m) {
    if (cache.has(m.id)) return cache.get(m.id);
    const root = m.rig.root, home = root.parent, bone = m.rig.bone('head');
    if (!bone || !home) return '';
    sc.add(root); root.updateMatrixWorld(true);
    bone.getWorldPosition(head); root.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); side.set(fwd.z, 0, -fwd.x);
    const k = m.k || 1;
    head.y += 0.05 * k;
    cam.position.copy(head).addScaledVector(fwd, 0.95 * k).addScaledVector(side, 0.3 * k); cam.position.y += 0.06 * k;
    cam.lookAt(head); cam.updateMatrixWorld(true);
    sun.position.copy(head).addScaledVector(fwd, 2).addScaledVector(side, -1.6); sun.position.y += 1.4; sun.target.position.copy(head); sc.add(sun.target);
    const old = renderer.getRenderTarget(), col = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(sc, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
    renderer.setRenderTarget(old); renderer.setClearColor(col, a);
    home.add(root);
    // de pixels staan ondersteboven en in lineair licht
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = ((S - 1 - y) * S + x) * 4, o = (y * S + x) * 4;
      img.data[o] = srgb[buf[i]]; img.data[o + 1] = srgb[buf[i + 1]]; img.data[o + 2] = srgb[buf[i + 2]]; img.data[o + 3] = buf[i + 3];
    }
    ctx.putImageData(img, 0, 0);
    const url = cv.toDataURL('image/png');
    cache.set(m.id, url);
    return url;
  };
}
