// Gebied 1 van Homo erectus: de vlakte onder een rokende berg, Oost-Afrika, ruwweg 1,5 miljoen jaar geleden.
// Dezelfde Riftvallei als die van Homo habilis, honderdduizenden jaren later. De krokodil van toen is er niet meer,
// de sabeltandkat nog wel. Nieuw: een plek waar het na een blikseminslag blijft smeulen,
// dode bomen om hout van te hakken en een kring van stenen bij het kamp waar het vuur moet komen.
export const berg = {
  id: 'berg', name: 'Onder de rokende berg', terrain: 'rift', ma: 1.5, region: 'Oost-Afrika', playable: true,
  intro: 'Veel later. Een andere groep, met langere benen.',
  home: { x: 10, z: -26 },                 // het kamp: de groep slaapt op de grond, in de luwte van een donkere rotswand
  start: [14, -20],
  ford: -60,                               // op deze x kun je de rivier doorwaden; overal elders is hij te diep
  // Dit land: ruw en donker. Zwarte lavagrond met as, kandelaarbomen en kokerbomen, kale stammen en overal donkere keien.
  land: {
    seed: 23, shift: [140, 33], amp: 17, fine: 1.3, river: [48, 42, 0.012, 0.5, 9, 0.033, 2.0], acacias: 10, logs: 22, twigs: 60,
    flora: [
      { model: 'cand1', n: 14, tall: [4, 7.5], block: 0.6, gap: 9, near: 'dry', reach: [30] },
      { model: 'cand21', n: 14, tall: [3.6, 7], block: 0.6, gap: 9, near: 'dry', reach: [30] },
      { model: 'cand6', n: 13, tall: [4, 7.5], block: 0.6, gap: 9, near: 'dry', reach: [30] },
      { model: 'quiver_tree_01', n: 16, tall: [3, 5], block: 0.4, gap: 8, twigs: true },
      { model: 'dead_quiver_trunk', n: 26, tall: [1.5, 2.8], block: 0.25, gap: 5 },
    ],
    rocks: { tint: 0x6a6462, n: 90, big: 2.0 },
    // de wand achter het kamp: de wind komt uit het oosten, de rots staat in het westen en houdt de warmte van het vuur vast
    props: [
      { model: 'namaqualand_cliff_02', at: [-2, -27], tall: 6.2, ry: Math.PI / 2 + 0.12, tint: 0x6e6866 },
      { model: 'rock_face_01', at: [2.5, -39.5], tall: 4.4, ry: 0.9, tint: 0x6e6866 },
      { model: 'mountainside', at: [-0.5, -13.5], tall: 5.2, ry: -1.9, tint: 0x6e6866 },
    ],
    bush: { n: 35, tint: 0xb4aa94 },
    ground: { bare: 'burned_ground_01', rock: 'dark_rock', grass: 0.42, greenK: 0.5, wall: [0.6, 0.52, 0.5, 0.49] },
    grass: { short: 8000, gold: [2.5, 2.3, 1.8] },
    sky: { tint: [0.88, 0.85, 0.84], sun: 0xf4e8dc, sunI: 0.94 },
  },
  textures: ['burned_ground_01_diff', 'dark_rock_diff'],
  look: { ground: [1.0, 0.92, 0.86], fog: [48, 235], mist: [0xa39a92, 0.26] },
  words: [['bij de boom', 'in het kamp'], ['naar de boom', 'naar het kamp'], ['onder de boom', 'in het kamp'], ['rond de boom', 'rond het kamp']],
  looks: { tree: { name: 'Het kamp', look: 'Een hoge wand van donkere steen. Hij houdt de wind tegen en blijft \'s nachts lang warm. Hier slaapt de groep, op de grond.', hint: 'Breng eten mee, en kom terug voor het donker wordt.' } },
  // De groep trekt rond (zie systems/trek.js en de uitleg in savanne.js): van de wand naar de rand van de kloof, dan naar de rotskop. Het vuur gaat mee.
  camps: [
    { id: 'wand', name: 'De donkere wand', intro: 'De hoge wand van donkere steen. Na de regen staat het gras er weer.',
      go: 'Bij de rotskop is alles opgegeten. Oru wijst terug over de as, naar de donkere wand. Daar is het na de regen weer groen.' },
    { id: 'kloof', name: 'De rand van de kloof', at: [-100, -36],
      look: { name: 'Het kamp', look: 'Een vlak stuk as met een scheve rots erachter. Een paar stappen verder valt de grond weg in een diepe kloof. Hier slaapt de groep nu.', hint: 'Breng eten mee, en kom terug voor het donker wordt.' },
      intro: 'Een vlakke plek achter een scheve rots. Verderop valt de grond weg in de kloof.',
      go: 'Rond de wand is het land kaal. Oru schept de gloed in een stuk schors en wijst naar het westen, waar de grond openscheurt. Aan de rand van die kloof is een goede plek.',
      stones: [[-95, -40, 'lava'], [-104, -31, 'quartz'], [-97, -28, 'lava']],
      site: {
        props: [{ model: 'rock_face_01', at: [-107.5, -37.5], tall: 4.2, ry: 1.75, tint: 0x6e6866 }],
        flora: [{ model: 'cand21', n: 0, tall: [3.6, 7], block: 0.6, home: 0, at: [[-104, -46.5, 6.4], [-109, -27.5, 5.2]] }] } },
    { id: 'kop', name: 'De rotskop', at: [-122, -128],
      look: { name: 'Het kamp', look: 'Een vlakke plek onder een bult van zwarte keien, met een paar kokerbomen ervoor. Vanaf hier zie je de berg roken. Hier slaapt de groep nu.', hint: 'Breng eten mee, en kom terug voor het donker wordt.' },
      intro: 'Zwarte keien op een bult, met kokerbomen ervoor. De rokende berg lijkt hier dichtbij.',
      go: 'Ook bij de kloof is het eten op. De groep loopt verder, de berg tegemoet. Onder een bult van zwarte keien staan kokerbomen. Daar is beschutting.',
      stones: [[-117, -124, 'lava'], [-126, -122, 'quartz'], [-118, -133, 'lava']],
      site: { flora: [{ model: 'quiver_tree_01', n: 0, tall: [3, 5], block: 0.4, twigs: true, home: 0, at: [[-114, -136, 4.6], [-128.5, -121, 3.8], [-112.5, -121.5, 4.2]] }] } },
  ],
  // het reliëf van dit gebied (zie relief.js): een diepe kloof naar de rivier en een rotskop in het noordwesten
  relief: [
    { kind: 'geul', path: [[-155, -60], [-132, -40], [-124, -12]], w: 4.5, d: 4.6, lift: 3.4 },
    { kind: 'kop', at: [-135, -140], r: 12, h: 3, rocks: 7 },
  ],
  hill: [-70, -110],                       // de heuvel waar de bliksem insloeg
  trees: [[36, 44, 1.3], [-34, -6, 1.1], [58, -40, 1], [-84, 36, 1.2], [-10, -96, 1], [110, -20, 1.1]],
  tallGrass: [[26, -2, 10], [-64, 14, 12], [60, -36, 9], [-22, -58, 10], [-14, 22, 8], [92, 24, 10], [-100, -50, 10]],
  carcass: { x: 80, z: -70 },
  fauna: ['impala', 'zebra', 'gazelle', 'hyena', 'sabre', 'leopard', 'puffadder', 'rhino', 'vulture', 'hominin'],
  herd: { species: 'impala', at: [46, -4], n: 9 },
  zebras: { at: [-44, -24] },
  sabres: { lair: [-64, 14] },
  leopard: { tree: [36, 44], branchY: 2.8 },
  birds: [[14, -28], [-30, -4], [40, -44], [70, 16], [-56, -60], [20, 30]],
  // De neushoorn graast alleen, tussen de kale bomen. Hij ziet slecht en ruikt scherp: de wind komt hier uit het oosten.
  beast: {
    kind: 'rhino',
    route: [[-24, -62, 'eat'], [-10, -100, 'eat'], [30, -110, 'eat'], [60, -70, 'eat'], [70, -20, 'pass'], [105, { river: -13 }, 'drink'], [110, -20, 'eat'], [40, -60, 'pass']],
  },
  // vuur: waar het smeult, waar het moet branden, waar dood hout ligt en de berg aan de horizon
  models: ['oldtree', 'lengai', 'handaxe', 'cand1', 'cand21', 'cand6', 'quiver_tree_01', 'dead_quiver_trunk', 'namaqualand_cliff_02', 'rock_face_01', 'mountainside'],   // dode boom, de vulkaan aan de horizon, een echte vuistbijl uit Olduvai
  fire: { source: [-56, -94], hearth: [15, -21], wood: [[-3, -42], [-38, -70], [40, -16], [-88, -47], [-112, -22], [-108, -118], [-134, -118]], volcano: [-290, -390] },
  // grondstoffen
  stones: [[16, -31, 'lava'], [6, -20, 'quartz'], [21, -15, 'sand'], [8, -36, 'lava'], [-20, -40, 'lava'], [40, -52, 'quartz'], [-48, -82, 'lava'], [-64, -98, 'lava'], [62, 10, 'sand'], [-30, 30, 'quartz']],
  riverStones: [-130, -95, -60, -28, 12, 48, 85, 120],
  flatStones: [[13, -35, 'grubs'], [30, -20, 'scorpion'], [-16, -30, 'grubs'], [70, -60, 'grubs'], [-44, -50, 'scorpion'], [50, 20, 'grubs']],
  bones: [[79.5, -69], [82, -71.5]],
  branches: [[11.5, -23], [-32, -4], [56, -38]],
  redBerries: [[23, -12], [-30, 20], [64, -50]],
  // wat het land zelf geeft: vruchtbomen [x, z, soort], oude karkassen met merg in de botten, knolplanten (graven met een stok)
  fruitTrees: [[-4, 44, 'fig'], [70, 59, 'fig'], [43, -63, 'baobab'], [-24, -58, 'baobab'], [96, -34, 'baobab']],
  oldCarcasses: [[-33, -11], [22, -110], [120, 10]],
  tubers: [[28, -6], [-10, -48], [52, -26], [-30, 10], [80, -30]],
  berries: [[-8, -52], [37, -55], [76, 6, 4], [-46, -44], [100, -66, 5], [-96, -6, 6]],
  leaves: [-10, 36, -60],
  outro: {
    title: 'Het vuur gaat mee',
    text: ['Je kunt nu wat deze groep groot maakt: een kei rondom bewerken tot een vuistbijl, vuur halen waar het smeult en het brandend houden, nacht na nacht.',
      'Wie vuur heeft, kan verder. Naar hoger land, waar de nachten koud zijn. Oru pakt een dik stuk gloeiend hout in as en bladeren. Het vuur gaat mee.'],
    fine: 'Hier houdt het verhaal van Homo erectus voorlopig op. Je kunt hier vrij blijven rondlopen.',
    go: 'Trek mee, de bergen in',
  },
  next: 'hoog',
  // g: de spelcontext (state, has, carries, player, group, fire)
  missions: (g) => {
    const F = () => g.fire(), near = (p, r) => Math.hypot(p[0] - g.player.pos.x, p[1] - g.player.pos.z) < r;
    return [
      { id: 'axe', who: 'kem', ask: 'Dak wil een dikke tak doorhakken. Zijn scherf breekt in tweeën.', end: 'Dak hakt de tak in één klap door. Hij lacht en houdt de bijl stevig vast.', title: 'Maak een vuistbijl',
        why: 'Een scherf is te klein voor zwaar werk. Dak heeft een steen nodig die zijn hele hand vult en aan alle kanten snijdt.', done: () => g.state.found.has('axe'), steps: [
          { t: 'Pak twee keien', find: 'stone', ok: () => g.state.found.has('axe') || (g.state.hands[0] === 'stone' && g.state.hands[1] === 'stone') },
          { t: 'Tik op een kei in je hand en kies de vuistbijl', ok: () => g.state.found.has('axe') || g.state.rock.some((r) => r && r.shape > 0) },
          { t: 'Blijf slaan tot de bijl klaar is', ok: () => g.state.found.has('axe') }] },
      { id: 'fire', who: 'tor', shiver: true, ask: 'Oru rilt van de kou. Hij wijst naar de rook in de verte.', end: 'Het vuur brandt. Oru warmt zijn handen en iedereen komt erbij zitten.', title: 'Haal vuur',
        why: 'De bliksem heeft een boom geraakt. Daar gloeit het nog. Breng het vuur naar het kamp, dan heeft iedereen het warm.', done: () => g.state.found.has('hearth'), steps: [
          { t: 'Pak een tak', find: 'branch', ok: () => g.state.found.has('hearth') || g.carries('branch') || g.has('torch') },
          { t: 'Loop naar de rook', find: 'smoke', ok: () => g.state.found.has('hearth') || g.has('torch') || (g.carries('branch') && near(F().source, 9)) },
          { t: 'Steek je tak aan in de gloed', ok: () => g.state.found.has('hearth') || g.has('torch') },
          { t: 'Breng de brandende tak snel naar de stenen in het kamp', ok: () => g.state.found.has('hearth') }] },
      { id: 'keep', who: 'ibo', needs: 'fire', ask: 'Het vuur wordt klein. Mio kijkt bang naar het donker.', end: 'De zon komt op en het vuur brandt nog. Mio legt er zelf een takje op.', title: 'Houd het vuur aan',
        why: 'Zonder hout gaat het vuur uit. Dan is het weer koud en donker, en moet je helemaal terug naar de rook.', done: () => g.state.found.has('keep'), steps: [
          { t: 'Hak takken van een dode boom met je vuistbijl', find: 'deadwood', ok: () => g.state.found.has('keep') || g.carries('branch') || F().fuel > 500 },
          { t: 'Leg hout op het vuur tot de vlammen hoog zijn', ok: () => g.state.found.has('keep') || F().fuel > 500 },
          { t: 'Ga slapen bij het vuur', ok: () => g.state.found.has('keep') }] },
      { id: 'roast', who: 'sen', needs: 'fire', ask: 'Sen kauwt en kauwt op een stuk rauw vlees. Ze kijkt naar het vuur.', end: 'Sen deelt het warme vlees uit. Zelfs de oude Oru kan het eten.', title: 'Braad vlees',
        why: 'Rauw vlees is taai. Boven het vuur wordt het zacht en lekker, en je hebt er langer genoeg aan.', done: () => g.state.found.has('roast'), steps: [
          { t: 'Haal vlees van een dood dier', find: 'kill', ok: () => g.state.found.has('roast') || g.carries('meat') },
          { t: 'Houd het vlees bij het vuur', ok: () => g.state.found.has('roast') }] },
    ];
  },
};
