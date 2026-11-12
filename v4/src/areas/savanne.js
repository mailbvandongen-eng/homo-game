// Gebied 1 van Homo habilis: een stuk Riftvallei in Oost-Afrika, ruwweg 1,8 miljoen jaar geleden.
// Alles wat dit gebied maakt tot wat het is staat hier als gegevens: waar de groep slaapt, wat er groeit en ligt,
// welke dieren er leven (zie species.js voor hun tijd en plaats) en wat de groep van je vraagt.
// De motor bouwt hier de wereld van. Plekken zijn [x, z] in meters; 'river' is de afstand tot het midden van de rivier.
export const savanne = {
  id: 'savanne', name: 'De savanne', terrain: 'rift', ma: 1.8, region: 'Oost-Afrika', playable: true, next: 'water',
  home: { x: -8, z: -14 },                 // de slaapboom
  start: [2, -6],                          // hier begin je
  trees: [[-8, -14, 1.75], [14, -20, 1], [-30, 10, 1.1], [40, 50, 1.3]],   // vaste acacia's: [x, z, maat]
  tallGrass: [[20, -5, 11], [44, 10, 9], [60, -25, 12], [-15, 20, 8], [85, 30, 10], [-60, 15, 10], [10, -55, 9]],   // hier kun je je verstoppen: [x, z, straal]
  carcass: { x: -70, z: -78 },             // het oude karkas waar de hyena's op afkomen
  fauna: ['impala', 'zebra', 'gazelle', 'hyena', 'sabre', 'leopard', 'puffadder', 'giant', 'vulture', 'hominin'],
  herd: { species: 'impala', at: [42, -12], n: 9 },
  zebras: { at: [-42, -30] },
  sabres: { lair: [-60, 10] },             // hun leger ligt in het hoge gras
  leopard: { tree: [40, 50], branchY: 2.8 },   // zijn boom staat bij de rivier
  birds: [[6, -14], [-20, 8], [30, -40], [60, 20], [-50, -50], [15, 35]],
  giant: {                                 // de ronde van de reuzenolifant: [x, z, wat hij er doet]
    route: [[95, -125, 'eat'], [142, -72, 'pass'], [128, -12, 'eat'], [105, { river: -13 }, 'drink'], [66, -30, 'eat'], [44, -92, 'eat'], [-8, -132, 'pass'], [58, -152, 'eat']],
    grave: [96, { river: -15 }],           // hier valt hij aan het eind van de droogte
  },
  // grondstoffen
  stones: [[5, -9, 'lava'], [-2, -3, 'quartz'], [8, -4, 'sand'], [30, 25, 'sand'], [-45, -60, 'lava'], [-66, -70, 'quartz'], [-38, -26, 'sand'], [22, -48, 'lava'], [62, 12, 'quartz'], [-20, 44, 'sand']],
  riverStones: [-130, -95, -60, -28, 12, 48, 85, 120],   // rolstenen langs de oever, op deze x
  flatStones: [[-6, -12, 'grubs'], [16, -8, 'scorpion'], [-30, -20, 'grubs'], [-58, -66, 'grubs'], [-75, -64, 'hammer'], [28, 18, 'scorpion'], [62, -30, 'grubs']],
  bones: [[-70.5, -77], [-68, -79.5]],
  // planten: [x, z, aantal trossen]
  redBerries: [[9, 1], [-25, 30], [55, -40]],
  berries: [[-14, -22], [24, -32], [70, 15, 4], [-50, -40], [95, -60, 5], [-92, 2, 6]],   // dichtbij klein, ver weg rijk
  leaves: [-6, 40, -55],                   // bitterblad groeit alleen bij het water, op deze x
  outro: {
    title: 'De groep trekt verder',
    text: ['Je kunt nu wat de groep hier nodig had: een scherpe rand slaan, een hyena op afstand houden, meer dragen dan je handen aankunnen en jezelf warm houden.',
      'De struiken raken leeg en het gras verdort. Tor wijst naar het noorden, waar het water blijft staan.'],
  },
  // g: de spelcontext (state, has, carries, player, hyenas, sabres)
  missions: (g) => [
  { id: 'flake', who: 'kem', ask: 'Kem rukt met zijn tanden aan een pees. Het lukt niet.', end: 'Kem voelt aan de scherpe rand en grijnst.', title: 'Maak een snijsteen', why: 'Met tanden en nagels krijg je geen huid open. Een scherpe rand wel.', done: () => !!g.state.knapped, steps: [
    { t: 'Pak twee keien: in elke hand één', ok: () => g.state.hands[0] === 'stone' && g.state.hands[1] === 'stone' },
    { t: 'Tik op een hand en sla de keien tegen elkaar tot er een scherf afspringt', ok: () => !!g.state.knapped }] },
  { id: 'hyena', who: 'ibo', ask: 'Ibo wijst naar de vlakte en kruipt weg. De hyena\'s!', end: 'Ibo durft weer onder de boom vandaan.', title: 'Verjaag een hyena', why: 'Elke avond komen ze dichter bij de slaapboom.', done: () => g.state.found.has('hyena'), steps: [
    { t: 'Pak een kei', ok: () => g.has('stone') },
    { t: 'Wacht op de hyena\'s: ze komen in de schemering', ok: () => g.has('stone') && g.hyenas.list.some((h) => Math.hypot(h.x - g.player.pos.x, h.z - g.player.pos.z) < 30) },
    { t: 'Houd Gooi vast, mik en laat los', ok: () => g.state.found.has('hyena') }] },
  { id: 'bag', who: 'kem', ask: 'Kem heeft zijn armen vol. Alles valt.', end: 'Kem trekt aan het draagvel. Hij wil er ook een.', tag: 'hide', title: 'Maak een draagvel', why: 'Met twee handen draag je twee dingen. In een geknoopte huid past veel meer.', needs: 'flake', done: () => !!g.state.bag, steps: [
    { t: 'Neem een snijsteen mee', ok: () => g.carries('flake') || g.carries('hide') },
    { t: 'Zoek een vers gedood dier: let op zebra\'s die wegstuiven', ok: () => g.carries('hide') || (g.carries('flake') && g.sabres.kill && Math.hypot(g.sabres.kill.x - g.player.pos.x, g.sabres.kill.z - g.player.pos.z) < 14) },
    { t: 'Wacht tot de roofdieren weg zijn en tik op Snijd: eerst vlees, dan de huid', ok: () => g.carries('hide') },
    { t: 'Houd huid en snijsteen vast, tik op de huid en kies het draagvel', ok: () => !!g.state.bag }] },
  { id: 'cloak', who: 'tor', shiver: true, ask: 'Tor zit ineengedoken. Hij rilt.', end: 'Tor voelt aan het vel om je schouders en knikt.', tag: 'hide', title: 'Een vel om je schouders', why: 'De nachten worden koud, en kou vreet energie.', needs: 'flake', done: () => g.state.cloak, steps: [
    { t: 'Neem een snijsteen mee', ok: () => g.carries('flake') || g.carries('hide') },
    { t: 'Zoek een vers gedood dier: let op zebra\'s die wegstuiven', ok: () => g.carries('hide') || (g.carries('flake') && g.sabres.kill && Math.hypot(g.sabres.kill.x - g.player.pos.x, g.sabres.kill.z - g.player.pos.z) < 14) },
    { t: 'Wacht tot de roofdieren weg zijn en tik op Snijd: eerst vlees, dan de huid', ok: () => g.carries('hide') },
    { t: 'Houd huid en snijsteen vast, tik op de huid en kies de omslag', ok: () => g.state.cloak }] },
],
};
