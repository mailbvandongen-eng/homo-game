// Gebied 2 van Homo habilis: de oever van een meer in de Riftvallei, in de droge tijd. Ruwweg 1,8 miljoen jaar geleden.
// Het meer zakt en laat poelen achter waarin meervallen gevangen zitten; onder de harde korst zitten knollen.
// Zulke oevers zijn bekend van Olduvai en Koobi Fora: daar liggen stenen werktuigen tussen botten van vis en krokodil.
// Plekken zijn [x, z] in meters; 'river' is de afstand tot de waterlijn (positief = het meer in).
const near = (p, x, z, r) => Math.hypot(p.pos.x - x, p.pos.z - z) < r;
const POOLS = [[18, 58, 6], [-34, 42, 5.5], [52, 56, 6]];
export const water = {
  id: 'water', name: 'Bij het water', terrain: 'lake', ma: 1.8, region: 'Oost-Afrika', playable: true,
  intro: 'Het meer zakt. Wat achterblijft, is van wie het vindt.',
  home: { x: -6, z: 14 },
  start: [-4, 18],
  trees: [[-6, 14, 1.75], [30, -10, 1], [-50, -20, 1.1], [70, -50, 1.3], [-90, 30, 1.2], [110, 10, 1], [10, -80, 1.1]],
  tallGrass: [[-100, -10, 12], [30, -45, 10], [80, -70, 11], [-40, -90, 10], [-70, 34, 9], [104, 34, 9], [5, -40, 8]],
  pools: POOLS,                             // poelen op het strand: [x, z, straal]
  island: { x: 70, river: 26, r: 9 },      // de zandbank in het meer; je kunt er op één plek heen waden
  carcass: { x: -90, z: -70 },
  fauna: ['impala', 'zebra', 'hyena', 'sabre', 'leopard', 'puffadder', 'giant', 'vulture', 'hominin', 'croc', 'catfish'],
  herd: { species: 'impala', at: [50, -20], n: 8 },
  zebras: { at: [-50, -60] },
  sabres: { lair: [-100, -10] },
  leopard: { tree: [70, -50], branchY: 2.8 },
  birds: [[-4, 16], [28, -8], [-48, -18], [60, 40], [-30, 36], [100, 20]],
  giant: {
    route: [[100, -120, 'eat'], [140, -60, 'pass'], [125, 0, 'eat'], [112, { river: -13 }, 'drink'], [44, -34, 'eat'], [-20, -105, 'eat'], [60, -150, 'eat']],
    grave: [-75, { river: -15 }],
  },
  // de oever: [x, afstand het meer in] voor krokodillen, [x, z] voor planten met een knol
  shore: {
    crocs: [[64, 7], [20, 6], [-40, 7]],
    tubers: [[-20, -4], [12, -22], [44, 6], [-58, 8], [82, -22], [-30, -48], [26, 28], [-8, 40]],
  },
  stones: [[-1, 20, 'lava'], [-10, 9, 'quartz'], [2, 10, 'sand'], [34, -14, 'quartz'], [-46, -24, 'lava'], [-84, -66, 'quartz'], [60, -8, 'sand'], [84, 30, 'lava'], [-70, 20, 'sand'], [67, 91, 'quartz']],
  riverStones: [-120, -80, -48, -12, 30, 62, 78, 115],
  flatStones: [[-12, 20, 'grubs'], [22, -4, 'scorpion'], [-44, -10, 'grubs'], [58, 22, 'grubs'], [-82, -58, 'scorpion'], [96, -30, 'grubs']],
  bones: [[-90.5, -69], [-88, -71.5]],
  branches: [[-3, 17.5], [32, -8], [-48, -17], [72, -47], [-88, 33], [108, 12], [12, -78]],   // rechte takken onder de acacia's
  redBerries: [[40, 12]],
  berries: [[-62, -30, 4], [92, -92, 5], [22, -84, 4]],   // het land is droog: struiken alleen nog ver weg
  leaves: [[68, { river: 24 }], [73, { river: 28 }]],     // bitterblad groeit alleen nog op de zandbank
  outro: {
    title: 'De regens blijven uit',
    text: ['Je kunt nu wat de groep hier nodig had: eten uit de grond wrikken, een vis grijpen in een poel en door het water waden zonder gegrepen te worden.',
      'Het meer zakt verder. Aan de overkant van de vlakte stijgt rook op uit een berg. Wie daar ooit heen trekt, is groter en loopt verder dan jij.'],
    fine: 'Hier houdt het verhaal van Homo habilis op. Homo erectus is nog in de maak. Je kunt hier vrij blijven rondlopen.',
  },
  // g: de spelcontext (state, has, carries, player, group, night)
  missions: (g) => {
    const tor = () => g.group.list.find((m) => m.id === 'tor');
    const inPool = () => POOLS.some(([x, z, r]) => near(g.player, x, z, r));
    return [
      { id: 'stick', who: 'kem', ask: 'Kem krabt in de harde grond. Zijn nagels breken.', end: 'Kem weegt de graafstok in zijn hand en loopt meteen weg, de vlakte op.', title: 'Maak een graafstok',
        why: 'Onder de grond zit eten dat niet verdort. Maar de korst is te hard voor vingers.', done: () => g.state.found.has('tuber'), steps: [
          { t: 'Zoek een rechte tak onder een acacia', ok: () => g.carries('branch') || g.state.found.has('stick') },
          { t: 'Houd tak en snijsteen vast, tik op de tak en schraap er een punt aan', ok: () => g.state.found.has('stick') },
          { t: 'Zoek een plant met brede bladeren en wrik met de stok de knol los', ok: () => g.state.found.has('tuber') }] },
      { id: 'fish', who: 'ibo', ask: 'Ibo plonst door een poel. Alles schiet weg.', end: 'Ibo houdt de vis met twee handen vast en wil hem niet meer loslaten.', title: 'Grijp een meerval',
        why: 'Het zakkende meer laat poelen achter. De vissen daarin kunnen nergens heen.', done: () => g.state.found.has('fish'), steps: [
          { t: 'Loop naar een poel op het strand', ok: () => g.state.found.has('fish') || POOLS.some(([x, z, r]) => near(g.player, x, z, r + 9)) },
          { t: 'Buk voor je het water in gaat: wie plonst, jaagt ze weg', ok: () => g.state.found.has('fish') || (g.player.sneaking && inPool()) },
          { t: 'Tik op de vis en grijp hem', ok: () => g.state.found.has('fish') }] },
      // het noodgeval: de zon is de klok. Niemand sterft; ben je te laat, dan wordt het een zware nacht en ga je morgen weer.
      { id: 'sick', who: 'kem', ask: 'Kem trekt aan je arm. Tor ligt krom van de buikpijn.', end: 'Tor zit weer rechtop. Kem laat je arm niet meer los.', title: 'Bitterblad voor Tor', needs: 'stick', here: true,
        why: 'Tor heeft van het stilstaande water gedronken. Bitterblad helpt, maar het groeit alleen nog op de zandbank in het meer. Wees terug voor het donker.',
        when: () => g.dayP() < 0.45, onStart: () => { tor().sick = 9999; },
        late: () => g.night() > 0.75, lateText: 'Het is donker. Tor kreunt de hele nacht en niemand slaapt. Morgen moet het lukken.',
        done: () => tor().sick <= 0, steps: [
          { t: 'Neem een kei mee en loop naar de zandbank in het meer', ok: () => g.carries('leaf') || near(g.player, 70, 60, 26) },
          { t: 'Waad erheen tussen het riet, waar het ondiep is. Let op wat drijft', ok: () => g.carries('leaf') || near(g.player, 70, 93, 9) },
          { t: 'Pluk bitterblad', ok: () => g.carries('leaf') },
          { t: 'Breng het blad naar de slaapboom', ok: () => tor().sick <= 0 }] },
    ];
  },
};
