import * as THREE from '../../lib/three.module.js';
import { ROCKS, heldMesh } from '../items.js';
import { ICON, ITEM_ICON } from '../icons.js';
import { $, toast } from '../engine/ui.js';

// Wat je draagt: twee handen, het draagvel en de huid om je schouders.
export function initCarry(G) {
  const { state, player, scene, sound, discover } = G;
  // Elke kei heeft een soort en onthoudt hoe vaak erop geslagen is: state.rock loopt gelijk met state.hands.
  const C = { nextRock: null, lastRock: null, bagOpen: false };
  function renderHands() {
    C.lastRock = null;
    for (const i of [0, 1]) {
      if (state.hands[i] !== 'stone') { if (state.rock[i]) C.lastRock = state.rock[i]; state.rock[i] = null; }
      else if (!state.rock[i]) { state.rock[i] = C.nextRock || { type: 'lava', hits: 0 }; C.nextRock = null; }
    }
    for (const i of [0, 1]) {
      const it = state.hands[i], css = state.rock[i] ? `filter:${ROCKS[state.rock[i].type].css} drop-shadow(0 2px 3px #0008)` : '';
      $('hand' + i).classList.toggle('empty', !it);
      $('hand' + i).innerHTML = it ? `<span class="it" style="${css}">${ITEM_ICON[it]}</span>` : `<span class="palm">${ICON.hand}</span>`;
    }
    for (const [grp, i] of [[player.heldL, 0], [player.held, 1]]) {
      grp.clear(); const m = heldMesh(state.hands[i], state.rock[i]); if (m) grp.add(m);
    }
  }
  function freeHand() { return state.hands[1] === null ? 1 : state.hands[0] === null ? 0 : -1; }
  function handsFull() {
    toast('Je handen zijn vol. Leg eerst iets neer: tik op een hand.');
    for (const i of [0, 1]) { const h = $('hand' + i); h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake'); }
  }
  for (const i of [0, 1]) $('hand' + i).onclick = () => { if (C.bagOpen) stow(i); else if (state.hands[i]) { G.hints.did.hand = true; G.openRadial({ hand: i }); } };

  // ---------- draagvel en omslag ----------
  // Een huid met gaatjes langs de rand, dichtgeknoopt met een reep vel: vijf dingen erin, en je handen vrij.
  // De tas is geen venster: het vel vouwt open boven je handen en het spel loopt gewoon door.
  const BAG_SPOTS = [[22, 30], [50, 20], [77, 32], [34, 66], [66, 68]];
  function renderBag() {
    $('bagBtn').style.display = state.bag ? '' : 'none';
    if (!state.bag) return;
    $('bag').classList.toggle('open', C.bagOpen);
    $('bagBtn').classList.toggle('on', C.bagOpen);
    $('bagBtn').innerHTML = `${ICON.bag}<em>${state.bag.filter(Boolean).length || ''}</em>`;
    $('bagSpots').innerHTML = state.bag.map((e, k) => `<button data-k="${k}" class="${e ? '' : 'none'}" style="left:${BAG_SPOTS[k][0]}%;top:${BAG_SPOTS[k][1]}%;transform:translate(-50%,-50%) rotate(${(k * 37) % 24 - 12}deg);${e && e.rock ? 'filter:' + ROCKS[e.rock.type].css : ''}">${e ? ITEM_ICON[e.it] : ''}</button>`).join('');
    $('bagSpots').querySelectorAll('button').forEach((b) => { b.onclick = () => unstow(+b.dataset.k); });
  }
  function stow(i) {
    const it = state.hands[i]; if (!it) return;
    if (it === 'torch') { toast('Een brandende tak stop je niet weg.', 3); return; }
    const k = state.bag.indexOf(null);
    if (k < 0) { const el = $('bag'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
    state.bag[k] = { it, rock: state.rock[i] }; state.hands[i] = null; renderHands(); renderBag();
  }
  function unstow(k) {
    const e = state.bag[k]; if (!e) return;
    let h = freeHand(), back = null;
    if (h < 0) { h = 1; back = { it: state.hands[1], rock: state.rock[1] }; state.hands[1] = null; renderHands(); }   // handen vol: wisselen met je rechterhand
    state.bag[k] = back; C.nextRock = e.rock || null; state.hands[h] = e.it; renderHands(); renderBag();
  }
  function makeBag(i) {
    if (state.bag || state.hands[i] !== 'hide') return;
    state.hands[i] = null; state.bag = [null, null, null, null, null]; renderHands(); renderBag(); sound.good(); discover('bag');
    toast('Je prikt gaatjes langs de rand en rijgt er een reep vel doorheen. Een draagvel! Het hangt naast je handen.', 7);
  }
  let cloakMesh = null;
  function wearHide(i) {
    if (state.cloak || state.hands[i] !== 'hide') return;
    state.hands[i] = null; state.cloak = true; renderHands(); sound.good(); discover('cloak');
    toast('Je slaat de huid om je schouders en knoopt de poten voor je borst. Warm. Zo houd je het vol in de kou.', 7);
    putCloak();
  }
  function putCloak() {
    if (cloakMesh) return;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#e4dac6'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2a2420';
    for (let n = 0; n < 7; n++) { x.beginPath(); x.moveTo(n * 10 + 2, 0); x.quadraticCurveTo(n * 10 + 9, 32, n * 10 + 1, 64); x.lineTo(n * 10 + 5, 64); x.quadraticCurveTo(n * 10 + 13, 32, n * 10 + 6, 0); x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    cloakMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.21, 0.4, 12, 1, true, Math.PI - 2.2, 4.4), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    cloakMesh.castShadow = true; scene.add(cloakMesh);
  }
  const cloakAt = new THREE.Vector3();
  function cloakTick() {
    if (!cloakMesh || !player.rig) return;
    player.rig.bone('spine_02').getWorldPosition(cloakAt);
    cloakMesh.position.copy(cloakAt); cloakMesh.position.y += 0.13; cloakMesh.rotation.set(player.sneaking ? 0.5 : 0.08, player.yaw, 0, 'YXZ');
  }
  $('bagBtn').onclick = () => { C.bagOpen = !C.bagOpen; G.closeRadial(); renderBag(); };
  function dropCloak() { if (cloakMesh) { scene.remove(cloakMesh); cloakMesh = null; } }
  // een vrije hand vullen (false als je handen vol zijn)
  function giveHand(it) { const h = freeHand(); if (h < 0) { handsFull(); return false; } state.hands[h] = it; renderHands(); return true; }
  return Object.assign(C, { renderHands, freeHand, handsFull, giveHand, renderBag, stow, unstow, makeBag, wearHide, putCloak, dropCloak, cloakTick });
}
