// Tijdperk 1: Homo habilis, Oldowan. Oost-Afrika, ruwweg 2,4 tot 1,65 miljoen jaar geleden.
// Alles wat bij dit tijdperk hoort staat hier: wie je bent, waar je bent, en wat de groep van je vraagt.
// 'zeker' geeft per onderdeel aan hoe stevig het staat: vast (vondsten), aannemelijk (afgeleid) of gok (spelkeuze).
export const habilis = {
  id: 'habilis', species: 'Homo habilis', tradition: 'Oldowan', when: 'ca. 2,4 – 1,65 miljoen jaar geleden', where: 'Oost-Afrika (Riftvallei)',
  playable: true,
  zeker: {
    vast: ['afslagen en kernen van keien (Oldowan)', 'snijsporen op botten: vlees van grote dieren', 'botten gekraakt voor merg', 'grote katten, hyena\'s, zebra-achtigen en de reuzenolifant Palaeoloxodon recki in hetzelfde landschap'],
    aannemelijk: ['aas halen bij de prooi van grote katten', 'eten delen in een kleine groep', 'stenen gooien om roofdieren op afstand te houden', 'honing, eieren, bessen en bladeren als voedsel', 'slapen in of bij bomen'],
    gok: ['een huid als draagvel', 'een huid om de schouders tegen de kou', 'bitterblad als geneesmiddel', 'namen en vaste rollen in de groep'],
  },
  areas: [{
    id: 'savanne', name: 'De savanne', next: 'water',
    // g: de spelcontext (state, has, carries, player, hyenas, sabres)
    missions: (g) => [
  { id: 'flake', who: 'kem', ask: 'Kem rukt met zijn tanden aan een pees. Het lukt niet.', end: 'Kem voelt aan de scherpe rand en grijnst.', title: 'Maak een snijsteen', why: 'Met tanden en nagels krijg je geen huid open. Een scherpe rand wel.', done: () => !!g.state.knapped, steps: [
    { t: 'Pak twee keien: in elke hand één', ok: () => g.state.hands[0] === 'stone' && g.state.hands[1] === 'stone' },
    { t: 'Tik op een hand en sla de keien tegen elkaar tot er een scherf afspringt', ok: () => !!g.state.knapped }] },
  { id: 'hyena', who: 'ibo', ask: 'Ibo wijst naar de vlakte en kruipt weg. De hyena\'s!', end: 'Ibo durft weer onder de boom vandaan.', title: 'Verjaag een hyena', why: 'Elke avond komen ze dichter bij de slaapboom.', done: () => g.state.found.has('hyena'), steps: [
    { t: 'Pak een kei', ok: () => g.has('stone') },
    { t: 'Wacht op de hyena\'s: ze komen in de schemering', ok: () => g.has('stone') && g.hyenas.list.some((h) => Math.hypot(h.x - g.player.pos.x, h.z - g.player.pos.z) < 30) },
    { t: 'Houd de vuist vast, mik en laat los', ok: () => g.state.found.has('hyena') }] },
  { id: 'bag', who: 'kem', ask: 'Kem heeft zijn armen vol. Alles valt.', end: 'Kem trekt aan het draagvel. Hij wil er ook een.', tag: 'hide', title: 'Maak een draagvel', why: 'Met twee handen draag je twee dingen. In een geknoopte huid past veel meer.', needs: 'flake', done: () => !!g.state.bag, steps: [
    { t: 'Neem een snijsteen mee', ok: () => g.carries('flake') || g.carries('hide') },
    { t: 'Zoek een vers gedood dier: let op zebra\'s die wegstuiven', ok: () => g.carries('hide') || (g.carries('flake') && g.sabres.kill && Math.hypot(g.sabres.kill.x - g.player.pos.x, g.sabres.kill.z - g.player.pos.z) < 14) },
    { t: 'Wacht tot de roofdieren weg zijn en snijd met de vuist: eerst vlees, dan de huid', ok: () => g.carries('hide') },
    { t: 'Houd huid en snijsteen vast, tik op de huid en kies het draagvel', ok: () => !!g.state.bag }] },
  { id: 'cloak', who: 'tor', shiver: true, ask: 'Tor zit ineengedoken. Hij rilt.', end: 'Tor voelt aan het vel om je schouders en knikt.', tag: 'hide', title: 'Een vel om je schouders', why: 'De nachten worden koud, en kou vreet energie.', needs: 'flake', done: () => g.state.cloak, steps: [
    { t: 'Neem een snijsteen mee', ok: () => g.carries('flake') || g.carries('hide') },
    { t: 'Zoek een vers gedood dier: let op zebra\'s die wegstuiven', ok: () => g.carries('hide') || (g.carries('flake') && g.sabres.kill && Math.hypot(g.sabres.kill.x - g.player.pos.x, g.sabres.kill.z - g.player.pos.z) < 14) },
    { t: 'Wacht tot de roofdieren weg zijn en snijd met de vuist: eerst vlees, dan de huid', ok: () => g.carries('hide') },
    { t: 'Houd huid en snijsteen vast, tik op de huid en kies de omslag', ok: () => g.state.cloak }] },
],
  }, { id: 'water', name: 'Bij het water', playable: false }],
};
