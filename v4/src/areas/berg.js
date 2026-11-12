// Gebied 1 van Homo erectus: de vlakte onder een rokende berg, Oost-Afrika, ruwweg 1,5 miljoen jaar geleden.
// Dezelfde Riftvallei als die van Homo habilis, honderdduizenden jaren later. De krokodil van toen is er niet meer,
// de sabeltandkat en de reuzenolifant nog wel. Nieuw: een plek waar het na een blikseminslag blijft smeulen,
// dode bomen om hout van te hakken en een kring van stenen bij het kamp waar het vuur moet komen.
export const berg = {
  id: 'berg', name: 'Onder de rokende berg', terrain: 'rift', ma: 1.5, region: 'Oost-Afrika', playable: true,
  intro: 'Veel later. Een andere groep, met langere benen.',
  home: { x: 10, z: -26 },                 // het kamp: de groep slaapt op de grond, onder de oude acacia
  start: [14, -20],
  hill: [-70, -110],                       // de heuvel waar de bliksem insloeg
  trees: [[10, -26, 1.75], [36, 44, 1.3], [-34, -6, 1.1], [58, -40, 1], [-84, 36, 1.2], [-10, -96, 1], [110, -20, 1.1]],
  tallGrass: [[26, -2, 10], [-64, 14, 12], [60, -36, 9], [-22, -58, 10], [-14, 22, 8], [92, 24, 10], [-100, -50, 10]],
  carcass: { x: 80, z: -70 },
  fauna: ['impala', 'zebra', 'gazelle', 'hyena', 'sabre', 'leopard', 'puffadder', 'giant', 'vulture', 'hominin'],
  herd: { species: 'impala', at: [46, -4], n: 9 },
  zebras: { at: [-44, -24] },
  sabres: { lair: [-64, 14] },
  leopard: { tree: [36, 44], branchY: 2.8 },
  birds: [[14, -28], [-30, -4], [40, -44], [70, 16], [-56, -60], [20, 30]],
  giant: {
    route: [[95, -125, 'eat'], [142, -72, 'pass'], [128, -12, 'eat'], [105, { river: -13 }, 'drink'], [110, -20, 'eat'], [58, -40, 'eat'], [-8, -132, 'pass'], [58, -152, 'eat']],
    grave: [96, { river: -15 }],
  },
  // vuur: waar het smeult, waar het moet branden, waar dood hout ligt en de berg aan de horizon
  models: ['oldtree', 'lengai', 'handaxe'],   // dode boom, de vulkaan aan de horizon, een echte vuistbijl uit Olduvai
  fire: { source: [-56, -94], hearth: [15, -21], wood: [[-3, -42], [-38, -70], [40, -16]], volcano: [-290, -390] },
  // grondstoffen
  stones: [[16, -31, 'lava'], [6, -20, 'quartz'], [21, -15, 'sand'], [3, -34, 'lava'], [-20, -40, 'lava'], [40, -52, 'quartz'], [-48, -82, 'lava'], [-64, -98, 'lava'], [62, 10, 'sand'], [-30, 30, 'quartz']],
  riverStones: [-130, -95, -60, -28, 12, 48, 85, 120],
  flatStones: [[13, -35, 'grubs'], [30, -20, 'scorpion'], [-16, -30, 'grubs'], [70, -60, 'grubs'], [-44, -50, 'scorpion'], [50, 20, 'grubs']],
  bones: [[79.5, -69], [82, -71.5]],
  branches: [[11.5, -23], [-32, -4], [56, -38]],
  redBerries: [[23, -12], [-30, 20], [64, -50]],
  berries: [[4, -37], [30, -41], [76, 6, 4], [-46, -44], [100, -66, 5], [-96, -6, 6]],
  leaves: [-10, 36, -60],
  outro: {
    title: 'Het vuur gaat mee',
    text: ['Je kunt nu wat deze groep groot maakt: een kei rondom bewerken tot een vuistbijl, vuur halen waar het smeult en het brandend houden, nacht na nacht.',
      'Wie vuur heeft, kan verder. Naar koudere streken, waar de nachten lang zijn. Groepen als deze trekken Afrika uit, tot in Azië en Europa.'],
    fine: 'Hier houdt het verhaal van Homo erectus voorlopig op. De neanderthalers zijn nog in de maak. Je kunt hier vrij blijven rondlopen.',
  },
  // g: de spelcontext (state, has, carries, player, group, fire)
  missions: (g) => {
    const F = () => g.fire(), near = (p, r) => Math.hypot(p[0] - g.player.pos.x, p[1] - g.player.pos.z) < r;
    return [
      { id: 'axe', who: 'kem', ask: 'Dak wil een dikke tak doorhakken. Zijn scherf breekt in tweeën.', end: 'Dak hakt de tak in één klap door. Hij lacht en houdt de bijl stevig vast.', title: 'Maak een vuistbijl',
        why: 'Een scherf is te klein voor zwaar werk. Dak heeft een steen nodig die zijn hele hand vult en aan alle kanten snijdt.', done: () => g.state.found.has('axe'), steps: [
          { t: 'Pak twee keien', ok: () => g.state.found.has('axe') || (g.state.hands[0] === 'stone' && g.state.hands[1] === 'stone') },
          { t: 'Tik op een kei in je hand en kies de vuistbijl', ok: () => g.state.found.has('axe') || g.state.rock.some((r) => r && r.shape > 0) },
          { t: 'Blijf slaan tot de bijl klaar is', ok: () => g.state.found.has('axe') }] },
      { id: 'fire', who: 'tor', shiver: true, ask: 'Oru rilt van de kou. Hij wijst naar de rook in de verte.', end: 'Het vuur brandt. Oru warmt zijn handen en iedereen komt erbij zitten.', title: 'Haal vuur',
        why: 'De bliksem heeft een boom geraakt. Daar gloeit het nog. Breng het vuur naar het kamp, dan heeft iedereen het warm.', done: () => g.state.found.has('hearth'), steps: [
          { t: 'Pak een tak', ok: () => g.state.found.has('hearth') || g.carries('branch') || g.has('torch') },
          { t: 'Loop naar de rook', ok: () => g.state.found.has('hearth') || g.has('torch') || (g.carries('branch') && near(F().source, 9)) },
          { t: 'Steek je tak aan in de gloed', ok: () => g.state.found.has('hearth') || g.has('torch') },
          { t: 'Breng de brandende tak snel naar de stenen in het kamp', ok: () => g.state.found.has('hearth') }] },
      { id: 'keep', who: 'ibo', needs: 'fire', ask: 'Het vuur wordt klein. Mio kijkt bang naar het donker.', end: 'De zon komt op en het vuur brandt nog. Mio legt er zelf een takje op.', title: 'Houd het vuur aan',
        why: 'Zonder hout gaat het vuur uit. Dan is het weer koud en donker, en moet je helemaal terug naar de rook.', done: () => g.state.found.has('keep'), steps: [
          { t: 'Hak takken van een dode boom met je vuistbijl', ok: () => g.state.found.has('keep') || g.carries('branch') || F().fuel > 500 },
          { t: 'Leg hout op het vuur tot de vlammen hoog zijn', ok: () => g.state.found.has('keep') || F().fuel > 500 },
          { t: 'Ga slapen bij het vuur', ok: () => g.state.found.has('keep') }] },
      { id: 'roast', who: 'sen', needs: 'fire', ask: 'Sen kauwt en kauwt op een stuk rauw vlees. Ze kijkt naar het vuur.', end: 'Sen deelt het warme vlees uit. Zelfs de oude Oru kan het eten.', title: 'Braad vlees',
        why: 'Rauw vlees is taai. Boven het vuur wordt het zacht en lekker, en je hebt er langer genoeg aan.', done: () => g.state.found.has('roast'), steps: [
          { t: 'Haal vlees van een dood dier', ok: () => g.state.found.has('roast') || g.carries('meat') },
          { t: 'Houd het vlees bij het vuur', ok: () => g.state.found.has('roast') }] },
    ];
  },
};
