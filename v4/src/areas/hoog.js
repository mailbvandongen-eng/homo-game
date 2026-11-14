// Gebied 2 van Homo erectus: de hoge vlakte. Het Ethiopische hoogland, ruwweg 1,4 miljoen jaar geleden
// (vindplaatsen als Melka Kunture aan de Awash en Gadeb). Hoger, groener en kouder dan de vlakte onder de rokende berg.
// De groep heeft het vuur meegedragen. Nieuw hier: zelf een vuurplaats bouwen, goede steen van ver halen
// (zwart vulkanisch glas, obsidiaan) en een dier moe lopen in de hitte van de middag.
export const hoog = {
  id: 'hoog', name: 'De hoge vlakte', terrain: 'rift', ma: 1.4, region: 'Oost-Afrika', playable: true,
  intro: 'Dagen lopen, steeds hoger. Het vuur ging mee.',
  home: { x: -100, z: -26 },               // het nieuwe kamp, onder een brede acacia niet ver van de rivier
  start: [-96, -20],
  // het reliëf van dit gebied (zie relief.js): een breuktrap in het zuiden en een rotskop in het noordoosten
  relief: [
    { kind: 'breuk', path: [[-70, 118], [-28, 132], [20, 124], [58, 138]], h: 3.6, up: 1, gaps: [0.5] },
    { kind: 'kop', at: [105, -145], r: 12, h: 3.4, rocks: 8 },
  ],
  hill: [-30, -130],
  cold: 2.2,                               // hoe hard een nacht zonder vuur of huid aan je vreet (laagland: 1,5)
  // hoe het land eruitziet: groener gras, koelere grond en meer nevel dan in het laagland
  look: { ground: [0.74, 0.98, 0.56], green: 0.7, dry: 0.25, lush: 0.27, fog: [34, 185], mist: [0xcfd8d4, 0.4] },
  trees: [[-100, -26, 1.75], [-128, 4, 1.2], [-62, -64, 1.1], [-20, -10, 1.3], [24, 34, 1.2], [70, -30, 1.1], [112, 30, 1.3], [-140, -90, 1], [40, -120, 1.1], [130, -90, 1], [-70, 60, 1.1]],
  tallGrass: [[22, 36, 11], [-56, -4, 9], [74, -34, 10], [-130, -60, 9], [100, 6, 9], [-10, -150, 10], [140, -60, 9]],
  carcass: { x: 96, z: -122 },
  fauna: ['gazelle', 'zebra', 'hyena', 'sabre', 'leopard', 'puffadder', 'giant', 'vulture', 'hominin'],
  herd: { species: 'gazelle', at: [-34, -80], n: 9, persist: true },   // deze kudde kun je moe lopen
  zebras: { at: [60, -80] },
  sabres: { lair: [22, 36] },              // precies langs de weg naar de zwarte rotsen
  leopard: { tree: [70, -30], branchY: 2.8 },
  birds: [[-98, -30], [-60, -66], [-18, -12], [26, 30], [72, -28], [110, 28]],
  giant: {
    route: [[-150, -130, 'eat'], [-140, -90, 'eat'], [-128, 4, 'eat'], [-140, { river: -13 }, 'drink'], [-62, -64, 'eat'], [40, -120, 'eat'], [130, -90, 'eat'], [60, -155, 'pass']],
    grave: [-136, { river: -15 }],
  },
  models: ['oldtree', 'lengai', 'handaxe'],
  // het vuur is meegedragen: het gloeit in een stuk hout bij het kamp. De kring van stenen moet je zelf leggen.
  fire: { source: [-95.5, -29.5], carried: true, hearth: [-95, -22], build: 6, wood: [[-112, -44], [-74, -30], [-118, -6]], volcano: [330, -330], quiet: true },
  // De zwarte rotsen: een oude lavastroom van vulkanisch glas, ver naar het oosten langs de rivier.
  outcrop: { at: [132, 58], type: 'obsidian', n: 7 },
  // Wat hier voor het oprapen ligt is korrelig en zacht. Goede steen moet van ver komen.
  stones: [[-93, -33, 'sand'], [-106, -18, 'sand'], [-89, -15, 'sand'], [-110, -34, 'sand'], [-84, -27, 'sand'], [-99, -40, 'sand'], [-116, -24, 'sand'], [-92, -8, 'sand'],
    [-60, -50, 'sand'], [-20, -30, 'sand'], [30, -60, 'sand'], [70, 10, 'sand'], [-40, -100, 'sand']],
  riverStones: [-150, -120, -90, -60, -20, 20, 60, 95],
  riverRock: ['sand'],
  flatStones: [[-90, -38, 'grubs'], [-70, -12, 'scorpion'], [-120, -40, 'grubs'], [-30, -60, 'grubs'], [20, -20, 'scorpion'], [80, -60, 'grubs']],
  bones: [[95.5, -121], [98, -123.5]],
  branches: [[-98.5, -23], [-126, 6], [-60, -62], [-22, -8]],
  redBerries: [[-80, -8], [-40, -40], [50, -10]],
  berries: [[-108, -40], [-84, -44], [-66, 2, 4], [-130, -20], [-10, -70, 5], [44, 16, 6], [90, -40]],
  leaves: [-120, -40, 30],
  looks: {
    gazelle: { name: 'Gazellen', look: 'Slanke antilopen met gebogen hoorns. Ze rennen veel harder dan jij. Maar na een stuk rennen staan ze stil en hijgen.', hint: 'Zij raken hun warmte kwijt door te hijgen. Jij zweet, en loopt gewoon door.' },
  },
  outro: {
    title: 'Verder naar het noorden',
    text: ['Je bouwt nu zelf een plek voor het vuur, waar je ook bent. Je weet waar goede steen ligt en draagt hem dagen mee. En je loopt een dier moe, midden op de dag, als de grote katten slapen.',
      'Wie dat kan, hoeft nergens te blijven. De groep volgt de rivieren naar het noorden. Hun kinderen, en de kinderen daarvan, lopen Afrika uit.'],
    fine: 'Hier houdt het verhaal van Homo erectus voorlopig op. De tocht naar Azië en Europa is nog in de maak. Je kunt hier vrij blijven rondlopen.',
  },
  // g: de spelcontext (state, has, carries, player, group, fire, herd, dayP)
  missions: (g) => {
    const F = () => g.fire(), H = () => g.herd(), found = (id) => g.state.found.has(id);
    const near = (p, r) => Math.hypot(p[0] - g.player.pos.x, p[1] - g.player.pos.z) < r;
    const black = () => g.state.rock.some((r) => r && r.type === 'obsidian') || !!(g.state.bag && g.state.bag.some((e) => e && e.rock && e.rock.type === 'obsidian'));
    const hot = () => { const p = g.dayP(); return p > 0.25 && p < 0.62; };
    return [
      { id: 'camp', who: 'tor', shiver: true, ask: 'Oru zet het gloeiende hout neer. Hij rilt. Hier is nog geen plek voor het vuur.', end: 'Het vuur brandt in de nieuwe kring. Oru gaat er dicht bij zitten. Dit is nu het kamp.', title: 'Bouw een vuurplaats',
        why: 'De groep heeft het vuur de hele tocht gedragen. Het gloeit nog. Maar op de kale grond waait het uit. Tussen stenen blijft het branden.', done: () => found('camp'), steps: [
          { t: 'Pak een kei', ok: () => found('camp') || F().ring > 0 || g.has('stone') },
          { t: 'Leg zes keien in een kring op de kale plek', ok: () => found('camp') || F().built },
          { t: 'Steek een tak aan bij het gloeiende hout', ok: () => found('camp') || g.has('torch') },
          { t: 'Leg de brandende tak in de kring', ok: () => found('camp') }] },
      { id: 'glass', who: 'kem', ask: 'Dak slaat op een kei. De kei valt in gruis. Hij gooit hem boos weg.', end: 'Dak voelt aan de rand en trekt snel zijn vinger terug. Zo scherp was nog geen steen.', title: 'Haal zwarte steen',
        why: 'De keien hier zijn te zacht. Ver naar het oosten, langs de rivier, liggen zwarte rotsen. Die steen breekt als geen andere. Kijk onderweg uit bij het hoge gras.', done: () => found('glass'), steps: [
          { t: 'Volg de rivier naar het oosten, tot de zwarte rotsen', ok: () => found('glass') || black() || near([132, 58], 16) },
          { t: 'Pak een zwarte steen', ok: () => found('glass') || black() },
          { t: 'Sla er een scherf of een vuistbijl van', ok: () => found('glass') }] },
      { id: 'run', who: 'bala', ask: 'Bala wijst naar de gazellen. Dan naar de zon. Ze lacht en strekt haar benen.', end: 'Bala draagt het vlees het kamp in. Vandaag eet iedereen, en niemand hoefde te wachten op de katten.', title: 'Loop een gazelle moe',
        why: 'Een gazelle is sneller dan jij. Maar in de hitte moet ze steeds stilstaan om te hijgen. Jij zweet en loopt door. Geef haar geen rust.', done: () => found('runcut'), steps: [
          { t: 'Wacht tot de zon hoog staat', ok: () => found('run') || hot() || H().heat > 0.3 },
          { t: 'Jaag de gazellen op en blijf erachteraan', ok: () => found('run') || H().heat > 0.3 || !!H().spent },
          { t: 'Geef ze geen rust, tot er één niet meer kan', ok: () => found('run') || !!H().spent },
          { t: 'Sla toe met een kei of je vuistbijl', ok: () => found('run') },
          { t: 'Snijd het vlees los', ok: () => found('runcut') }] },
    ];
  },
};
