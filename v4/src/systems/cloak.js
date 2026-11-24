import * as THREE from '../../lib/three.module.js';

// De omslag: een heel antilopevel, met de haren naar buiten, dat over je schouders en je rug hangt.
// De voorpoten komen over je schouders naar voren en zijn voor je borst geknoopt; je armen blijven vrij.
// Het vel is geen los model: het is gesneden uit de rug van het lijf zelf en beweegt daardoor met elk bot mee.
// De tekening is de echte vacht van het antilopemodel (de romp ligt daar als een uitgespreid vel in de textuur).
// Maten in centimeters, in de ruststand van het model (armen wijd, +z is voor, +x is links).
const TOP = 124, HEM = 61, OFF = 1.3;
const KNOT = [0, 108.5], SHOULDER = [13.5, 121.5];
const ss = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp;

function bodyOf(rig) { let b = null; rig.model.traverse((o) => { if (o.isSkinnedMesh && /Skin_Body/.test(o.material.name)) b = o; }); return b; }
// afstand van een punt tot een lijnstuk, in het vlak van voren gezien
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], k = THREE.MathUtils.clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - a[0] - dx * k, py - a[1] - dy * k);
}

export function makeCloak(rig, furMap) {
  const body = bodyOf(rig); if (!body) return null;
  const G = body.geometry, P = G.attributes.position, N = G.attributes.normal, SI = G.attributes.skinIndex, SW = G.attributes.skinWeight, bones = body.skeleton.bones;
  const idx = (re) => bones.findIndex((b) => re.test(b.name) && !/scaleComp/.test(b.name));
  const neckish = new Set(bones.map((b, i) => (/neck|head|facial|jaw|teeth|tongue|eye/i.test(b.name) ? i : -1)).filter((i) => i >= 0));
  const legs = new Set(bones.map((b, i) => (/thigh|calf|foot|toe/i.test(b.name) ? i : -1)).filter((i) => i >= 0));
  const pelvis = idx(/^pelvis/), chest = idx(/^spine_03/);

  // de maten hieronder zijn die van het basislijf; een ander lijf (langere benen, smallere schouders) rekenen we daar eerst naar terug
  const at = (i) => new THREE.Vector3().setFromMatrixPosition(body.skeleton.boneInverses[i].clone().invert());
  const pv = at(pelvis), th0 = at(idx(/^thigh_l/)), cf = at(idx(/^calf_l/)), ua = at(idx(/^upperarm_l/));
  const kx = 20 / ua.x, ky = 34.3 / (th0.y - cf.y);
  const normY = (y) => (y > th0.y ? y - pv.y + 76.5 : 74.7 - (th0.y - y) * ky);

  // hoe ver steekt de rug uit bij de schouderbladen en bij de billen, en waar zit het borstbeen? Daartussen hangt het vel recht naar beneden
  let zBlade = 0, zButt = 0, zChest = 0;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) * kx, y = normY(P.getY(i)), z = P.getZ(i);
    if (Math.abs(x) < 13 && y > 104 && y < 118) zBlade = Math.min(zBlade, z);
    if (Math.abs(x) < 13 && y > 66 && y < 80) zButt = Math.min(zButt, z);
    if (Math.abs(x) < 3 && y > 105 && y < 112) zChest = Math.max(zChest, z);
  }
  const hang = (y) => lerp(zButt - 4.5, zBlade - OFF - 0.4, THREE.MathUtils.clamp((y - HEM) / (112 - HEM), 0, 1));

  // per hoekpunt: hoort het bij het vel (f > 0), waar ligt het, en welk stukje vacht hoort erbij
  const keep = new Float32Array(P.count), pos = new Float32Array(P.count * 3), uv = new Float32Array(P.count * 2), sw = new Float32Array(P.count * 4), si = new Uint16Array(P.count * 4);
  for (let i = 0; i < P.count; i++) {
    const rx = P.getX(i), ry = P.getY(i), x = rx * kx, y = normY(ry), z = P.getZ(i), ax = Math.abs(x), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    let wn = 0, wl = 0;
    for (let k = 0; k < 4; k++) { const b = SI.getComponent(i, k), w = SW.getComponent(i, k); if (neckish.has(b)) wn += w; if (legs.has(b)) wl += w; si[i * 4 + k] = b; sw[i * 4 + k] = w; }
    const t = (TOP - y) / (TOP - HEM), th = Math.atan2(ax, -z) * 180 / Math.PI;   // 0 = midden op de rug, 180 = midden op de borst
    // de onderrand: bij de achterpoten hangt het vel wat lager, in het midden zit de staart
    const hem = y - (HEM + 5 - 6 * Math.exp(-(((th - 52) / 16) ** 2)) - 5 * Math.exp(-((th / 9) ** 2)));
    const neck = (0.4 - wn) * 22;
    // de zijrand: over de schouders breed, achter de oksels smal, bij de heupen weer wat breder
    const thMax = lerp(lerp(118, 60, ss(t, 0.1, 0.24)), 82, ss(t, 0.42, 0.75));
    const side = z < 2.5 ? (thMax - th) * 0.26 : -9;
    // de voorpoten: twee repen van de schouders naar de knoop op het borstbeen
    const strap = z > 0 ? 3 - segDist(ax, y, SHOULDER, KNOT) : -9;
    // de arm zelf blijft vrij: alleen de bovenkant van de schouder ligt onder het vel
    const arm = ax > 16 ? Math.min((26.5 - ax) * 0.8, (ny + 0.15) * 9) : 99;
    const f = Math.min(hem, neck, arm, Math.max(side, strap), (TOP + 3 - y) * 2);
    keep[i] = f;
    // ligging: een eindje boven de huid; op de rug hangt het vel recht naar beneden in plaats van elke holte te volgen
    let px = rx + nx * OFF, py = ry + ny * OFF, pz = z + nz * OFF;
    // (aan de zijkant buigt het een beetje om je heen)
    if (z < 2.5 && y < 116) pz = lerp(pz, Math.min(pz, lerp(pz, hang(y), 0.8) + ax * ax * 0.02), ss(116 - y, 0, 8));
    // onder de heupen volgt het vel de benen niet: het hangt aan het bekken, en waaiert een beetje uit
    if (wl > 0) {
      // (een beetje wel: anders steekt je bil erdoor als je hurkt)
      let rest = 0, slot = -1;
      for (let k = 0; k < 4; k++) { if (legs.has(si[i * 4 + k])) sw[i * 4 + k] *= 0.4; rest += sw[i * 4 + k]; }
      for (let k = 0; k < 4; k++) if (si[i * 4 + k] === pelvis && sw[i * 4 + k] > 0) slot = k;
      if (slot < 0) for (let k = 0; k < 4; k++) if (sw[i * 4 + k] === 0) slot = k;
      if (slot >= 0) { if (si[i * 4 + slot] !== pelvis) { si[i * 4 + slot] = pelvis; sw[i * 4 + slot] = 0; } sw[i * 4 + slot] += 1 - rest; }
      else for (let k = 0; k < 4; k++) sw[i * 4 + k] /= rest;
      px *= 1 + 0.08 * ss(wl, 0, 0.7);
    }
    pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;
    // de vacht: de ruggengraat van het dier ligt op die van jou, de lichte buikrand komt aan de zijkanten en op de voorpoten
    if (z >= 2.5) { uv[i * 2] = (190 + (121.5 - y) * 6 + ax * 2) / 1024; uv[i * 2 + 1] = (272 + Math.sign(x) * (20 + ax * 4)) / 1024; }
    else { uv[i * 2] = (112 + THREE.MathUtils.clamp(t, -0.05, 1.05) * 380) / 1024; uv[i * 2 + 1] = (272 + Math.sign(x) * THREE.MathUtils.clamp(th / 88, 0, 1) * 158) / 1024; }
  }

  // alleen de driehoeken die het vel raken; dubbele hoekpunten (naden van het lijf) samenvoegen voor gladde schaduw
  const map = new Map(), re = new Int32Array(P.count).fill(-1), out = { p: [], u: [], f: [], w: [], s: [], i: [] };
  const add = (i) => {
    if (re[i] >= 0) return re[i];
    const key = Math.round(pos[i * 3] * 50) + '_' + Math.round(pos[i * 3 + 1] * 50) + '_' + Math.round(pos[i * 3 + 2] * 50);
    let n = map.get(key);
    if (n === undefined) {
      n = out.f.length; map.set(key, n);
      out.p.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); out.u.push(uv[i * 2], uv[i * 2 + 1]); out.f.push(keep[i]);
      for (let k = 0; k < 4; k++) { out.w.push(sw[i * 4 + k]); out.s.push(si[i * 4 + k]); }
    }
    return (re[i] = n);
  };
  const I = G.index;
  for (let k = 0; k < I.count; k += 3) {
    const a = I.getX(k), b = I.getX(k + 1), c = I.getX(k + 2);
    if (Math.max(keep[a], keep[b], keep[c]) <= 0 || Math.min(keep[a], keep[b], keep[c]) < -14) continue;
    out.i.push(add(a), add(b), add(c));
  }
  // de knoop: de twee voorpoten door elkaar gehaald, met de eindjes die naar beneden hangen
  const kz = zChest + OFF + 0.4;
  const part = (geo, x, y, z, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz); geo.rotateZ(rz); geo.translate(x / kx, y + pv.y - 76.5, z);
    const gp = geo.attributes.position, base = out.f.length, gi = geo.index;
    for (let i = 0; i < gp.count; i++) {
      out.p.push(gp.getX(i), gp.getY(i), gp.getZ(i)); out.u.push((230 + (i % 7) * 6) / 1024, (300 + (i % 5) * 7) / 1024); out.f.push(9);
      out.w.push(1, 0, 0, 0); out.s.push(chest, 0, 0, 0);
    }
    for (let i = 0; i < gi.count; i++) out.i.push(base + gi.getX(i));
  };
  part(new THREE.SphereGeometry(1, 8, 6), KNOT[0], KNOT[1], kz + 0.7, 0, 2.4, 1.8, 1.5);
  part(new THREE.ConeGeometry(1, 1, 6, 1, true), 2.2, KNOT[1] - 4.2, kz + 0.5, 0.42, 1.5, 7, 0.7);
  part(new THREE.ConeGeometry(1, 1, 6, 1, true), -2.6, KNOT[1] - 3.4, kz + 0.5, -0.6, 1.4, 5.6, 0.7);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(out.u, 2));
  g.setAttribute('edge', new THREE.Float32BufferAttribute(out.f, 1));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(out.w, 4)); g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(out.s, 4));
  g.setIndex(out.i); g.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ map: furMap, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  // de rand van het vel: niet de rand van een driehoek, maar een grillige lijn die de haren volgt
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimCol = { value: new THREE.Color(0xffd8a0) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float edge;\nvarying float vEdge;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = edge;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vEdge;\nuniform vec3 rimCol;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += rimCol * pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0) * 0.4 + diffuseColor.rgb * 0.1;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (vEdge + (sampledDiffuseColor.g - 0.45) * 1.6 < 0.0) discard;\nif (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.4, 0.3, 0.23), 0.8);');
  };
  mat.customProgramCacheKey = () => 'cloak';
  const mesh = new THREE.SkinnedMesh(g, mat);
  mesh.name = 'cloak'; mesh.castShadow = true; mesh.frustumCulled = false;
  body.parent.add(mesh); mesh.bind(body.skeleton, body.bindMatrix);
  return mesh;
}
