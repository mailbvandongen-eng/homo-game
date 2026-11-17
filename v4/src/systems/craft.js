import { ROCKS } from '../items.js';
import { toast } from '../engine/ui.js';

// Maken met je handen: een afslag, een vuistbijl, een graafstok.
export function initCraft(G) {
  const { state, player, sound, discover, renderHands } = G;
  // twee stenen tegen elkaar slaan: één wordt een scherpe afslag
  // De kei die je aantikt is de kern, de andere de klopsteen. Het kost een paar klappen, en niet elke kei breekt scherp.
  function knap(i) {
    if (state.hands[i] === 'stone' && !state.rock[i]) renderHands();
    const r = state.rock[i];
    if (!r || state.hands[1 - i] !== 'stone') return;
    const R = ROCKS[r.type]; r.hits++; r.at = player.pos.clone(); player.action = 0.5;
    const again = () => knapAgain(i, r);
    if (R.crumble) {
      sound.crack();
      if (r.hits < R.crumble) { toast('Dof. Er springen korrels af, maar geen scherpe rand…', 3); again(); return; }
      state.hands[i] = null; renderHands(); state.rockKnown.add(r.type);
      toast('De kei valt in gruis uit elkaar. Deze soort is te zacht. Zoek een gladde, harde kei.', 6); discover('rock');
      return;
    }
    sound.knap();
    if (r.hits < R.hits) { toast(r.hits === 1 ? 'Tik! Een splinter, te klein om vast te houden. Nog eens.' : 'Tak! Er loopt een barst langs de rand. Bijna…', 3); again(); return; }
    state.hands[i] = 'flake'; renderHands(); state.rockKnown.add(r.type); state.knapped = true;
    if (r.type === 'obsidian' && !state.found.has('glass')) toast('Tik! Een scherf zo dun dat je erdoorheen kijkt. De rand snijdt al als je hem aanraakt.', 7);
    else toast(state.found.has('flake') ? 'Tik! Weer een scherpe afslag.' : 'Tik! Er springt een scherpe afslag van de steen af.');
    state.known.add('flake'); discover('flake'); if (r.type === 'obsidian') discover('glass');
  }
  // Een vuistbijl: niet één scherf eraf slaan, maar de kei zelf rondom bewerken tot hij een punt en twee snijkanten heeft.
  // Dat kost veel meer klappen, en alleen een harde kei houdt het uit.
  const AXE_SAY = ['Tak! Er springt een stuk af. Draai de kei en sla weer.', 'Nu de andere kant. De rand wordt dunner.', 'Er komt een punt aan.', 'Kleine tikjes nu. De rand wordt scherp.', 'Nog één keer…'];
  function knapAxe(i) {
    if (state.hands[i] === 'stone' && !state.rock[i]) renderHands();
    const r = state.rock[i];
    if (!r || state.hands[1 - i] !== 'stone') return;
    const R = ROCKS[r.type]; r.shape = (r.shape || 0) + 1; r.at = player.pos.clone(); player.action = 0.5;
    const again = () => knapAgain(i, r, knapAxe);
    if (R.crumble) {
      sound.crack();
      if (r.shape < R.crumble) { toast('Dof. Er springen korrels af, maar geen scherpe rand…', 3); again(); return; }
      state.hands[i] = null; renderHands(); state.rockKnown.add(r.type);
      toast('De kei valt in gruis uit elkaar. Deze soort is te zacht. Zoek een gladde, harde kei.', 6); discover('rock');
      return;
    }
    sound.knap();
    const need = R.axe || 6;
    if (r.shape < need) { toast(AXE_SAY[r.shape - 1 + 6 - need], 3); again(); return; }
    state.hands[i] = 'axe'; state.rock[i] = null; renderHands(); state.rockKnown.add(r.type); state.knapped = true;
    if (r.type === 'obsidian') discover('glass');
    toast(r.type === 'obsidian' ? 'Een vuistbijl van zwart glas. De randen glimmen. Zo scherp was er nog geen.' : state.found.has('axe') ? 'Weer een vuistbijl. Zwaar en scherp.' : 'Klaar! Een punt, twee scherpe kanten, en hij past precies in je hand. Je hebt een vuistbijl.', 7);
    state.known.add('axe'); discover('axe');
  }
  // doorslaan zolang je stil blijft staan met beide keien in je handen
  let knapQ = null;
  function knapAgain(i, r, fn = knap) { knapQ = { i, r, t: 0.35, fn }; }
  function knapTick(dt) {
    const q = knapQ; if (!q) return;
    if (state.rock[q.i] !== q.r || state.hands[1 - q.i] !== 'stone' || G.walking || q.r.at.distanceTo(player.pos) > 0.4 || state.collapsed > 0) { knapQ = null; return; }
    if (player.once) return;
    q.t -= dt;
    if (q.t <= 0) { knapQ = null; G.act('Interact', () => q.fn(q.i)); }
  }
  // met een afslag een punt aan een tak schrapen: de graafstok
  function makeStick(i) {
    if (state.hands[i] !== 'branch' || !G.sharp()) return;
    state.hands[i] = 'stick'; renderHands(); sound.knap();
    toast(state.found.has('stick') ? 'Je schraapt weer een punt aan een tak.' : 'Je schraapt de bast weg en snijdt het uiteinde schuin af. Een stok met een punt!', 6);
    state.known.add('branch'); state.known.add('stick'); discover('stick');
  }
  return { knap, knapAxe, knapTick, makeStick };
}
