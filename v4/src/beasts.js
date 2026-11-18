// Het grote dier van elk gebied. Elk land heeft zijn eigen reus, met eigen gewoontes en een eigen les:
// - savanne: de reuzenolifant loopt zijn ronde; volg hem op afstand en je vindt wat hij laat vallen
// - het meer: een groep nijlpaarden ligt overdag in het water en graast 's avonds op het land; blijf uit hun stuk water
// - de rokende berg: een neushoorn ziet slecht en ruikt scherp; alles draait om de wind
// - de hoge vlakte: giraffen zien alles van ver; waar zij naar kijken, loopt een roofdier
// Het gedrag zelf staat in beast.js. Hier staat per soort wat er anders is: model, maat, snelheid, bewegingen en teksten.
//
// ai: 'bull' = waarschuwt en valt aan · 'rhino' = ruikt je, rent rechtuit · 'shy' = kijkt, vlucht en ziet roofdieren
// anim: namen van de bewegingen in het model; bij walk en run hoort de snelheid (m/s) waarop de beweging gemaakt is
// herd: de dieren die meelopen: [maat, plek naast (x) en achter (z) de voorste, plek in het water]
export const BEASTS = {
  giant: {
    model: 'elephant', rig: { shape: 'recki', tall: 4.3 }, ai: 'bull', sense: 'giant',
    walkV: 1.3, chargeV: 7, chargeTurn: 1.3, chargeT: 7, hurry: 2.6, r: 1.5, hitR: 2.9, dmg: 30, fling: 15, warnT: 2.4, chargeD: 27,
    print: { r: 0.4, side: 0.75, step: 1.7, n: 230 },
    anim: { idle: '01_Idle', walk: ['02_Walk', 1.36], run: ['03_Run', 4.1], eat: '04_Eating', warn: ['05_Attack', 1.5] },
    shield: 34, fruit: true, dies: { meat: 12, lift: 1.05, side: 2, relic: 'molar', pose: '01_Idle', feast: 'feast' },
    looks: { alive: 'giant', dead: 'giantdead', track: 'track', high: 3 }, lesson: 'giant',
    step: 1, call: 'rumble', cry: 'trumpet',
    text: {
      seen: 'Daar staat hij. Een stier zo hoog als een boom, met slagtanden langer dan jij. De grond trilt als hij loopt.',
      watch: 'De reus draait zijn kop naar je toe en zet zijn oren wijd uit. Niet dichterbij komen.',
      anger: 'Hij trompettert en stampt! Ren, of zorg dat er een boom tussen jullie staat!',
      letgo: 'De reus schudt zijn kop en laat het erbij. Deze keer.',
      bonk: 'De reus dreunt tegen het hout. Hij schudt zijn kop en druipt af.',
      giveup: 'De reus geeft het op en draait zich om. Je hart bonkt in je keel.',
      hit: 'De reus schept je op en smijt je door de lucht! Je laat alles vallen. Blijf uit zijn buurt!',
      fruit: 'De reus heeft de boom leeggeschud. Waar hij stond, liggen vruchten in het stof.',
      shield: 'De hyena\'s blijven op afstand. Zo dicht bij de reus durven ze niet te komen.',
      track: 'Een afdruk zo groot als een nest, en nog een, en nog een. De randen zijn scherp: dit spoor is vers.',
      deadFound: 'De reus ligt op zijn zij in het stof. Zoveel vlees… en nog niemand die het heeft opengemaakt.',
      thick: 'De huid is dikker dan je duim. Zonder scherpe afslag kom je er niet doorheen.',
      cut: 'Je snijdt een lap vlees uit de flank. Er zit nog voor dagen aan.',
      cutLast: 'Je snijdt het laatste goede vlees los. De rest is voor de gieren.',
      fresh: 'Van de gevallen reus liggen alleen nog botten bij de rivier. In het zuiden dreunt de grond alweer: er is een nieuwe stier.',
      fell: 'Tor wijst naar het oosten, naar de rivier. Daar cirkelen meer gieren dan hij ooit zag. De oude reus is gevallen.',
      still: 'Bij de rivier in het oosten ligt de reus nog. Er zit meer vlees aan dan jullie op kunnen.',
      rumour: 'Ibo voelde vannacht de grond trillen. In het oosten liggen afdrukken zo groot als een nest.',
    },
  },

  // Hippopotamus gorgops: groter dan het nijlpaard van nu. Overdag in het water, van de late middag tot de vroege ochtend op het land.
  hippo: {
    model: 'hippo', rig: { scale: 1.75 / 413 }, tint: 0xb9a79d, ai: 'bull', sense: 'hippo',
    walkV: 1.15, chargeV: 6.6, chargeTurn: 1.5, chargeT: 6, hurry: 2.4, r: 1.25, hitR: 2.3, dmg: 30, fling: 9, warnT: 2.7, chargeD: 24,
    print: { r: 0.25, side: 0.5, step: 1.1, n: 520 },
    anim: { idle: 'Iddle2', walk: ['|Walk', 1.0], run: ['Walk1', 2.3], eat: 'Iddle', warn: ['Iddle1', 1.2] },
    wade: 27, out: [0.52, 0.03], leash: 46,
    herd: [{ size: 0.88, off: [3.2, -3.4], soak: [6, -2] }, { size: 0.8, off: [-2.6, -5.6], soak: [-5.5, -3] }],
    dies: { meat: 9, lift: 0.72, side: 1, relic: 'tusk', pose: 'Iddle2', feast: 'hippofeast' },
    looks: { alive: 'hippo', dead: 'hippodead', track: 'hippotrack', high: 1.4 }, lesson: 'hippo',
    step: 0.55, call: 'grunt', cry: 'bellow',
    text: {
      seen: 'Wat op grijze keien in het water lijkt, beweegt. Nijlpaarden. Eén oor draait jouw kant op.',
      seenLand: 'Nijlpaarden op het land. Ze grazen als een kudde, maar elk dier is zwaarder dan je hele groep bij elkaar.',
      watch: 'De grootste draait zich naar je toe en blijft je aankijken. Niet dichterbij komen.',
      anger: 'Hij spert zijn bek wijd open. Dat is geen gapen: hij dreigt! Maak dat je wegkomt!',
      between: 'Je staat tussen het nijlpaard en het water! Hij komt recht op je af. Opzij!',
      letgo: 'Het nijlpaard klapt zijn bek dicht en draait zich om. Deze keer.',
      bonk: 'Het nijlpaard dreunt tegen het hout en blijft suf staan. Maak dat je wegkomt.',
      giveup: 'Het nijlpaard houdt in en sjokt terug naar de anderen. Je hart bonkt in je keel.',
      hit: 'Het nijlpaard ramt je omver en bijt! Je laat alles vallen. Weg bij hun water!',
      track: 'Diepe afdrukken met vier tenen, steeds over hetzelfde pad. Hier lopen de nijlpaarden elke avond het land op.',
      deadFound: 'Het oude nijlpaard ligt op zijn zij in de modder. Zoveel vlees… en nog niemand die het heeft opengemaakt.',
      thick: 'De huid is dikker dan je duim. Zonder scherpe afslag kom je er niet doorheen.',
      cut: 'Je snijdt een lap vlees uit de flank. Er zit nog voor dagen aan.',
      cutLast: 'Je snijdt het laatste goede vlees los. De rest is voor de gieren.',
      fresh: 'Van het oude nijlpaard liggen alleen nog botten in de modder. Het meer staat weer hoog, en bij de groep in het water ligt een nieuwe stier.',
      fell: 'Tor wijst naar het oosten, langs het water. Daar cirkelen meer gieren dan hij ooit zag. Het meer is te ver gezakt voor het oude nijlpaard.',
      still: 'Aan het water in het oosten ligt het nijlpaard nog. Er zit meer vlees aan dan jullie op kunnen.',
      rumour: 'Ibo hoorde vannacht gesnuif en zware stappen. In het oosten is het gras langs het water kort gevreten.',
    },
  },

  // Ceratotherium, de voorouder van de witte neushoorn: een grazer met een brede bek. Slechte ogen, een scherpe neus.
  rhino: {
    model: 'rhino', rig: { scale: 1.75 / 1.113 }, tint: 0xa6abb4, ai: 'rhino', sense: 'rhino',
    walkV: 1.1, chargeV: 9, chargeTurn: 0.22, chargeT: 3.6, hurry: 2.6, r: 1.3, hitR: 2.3, dmg: 30, fling: 12, warnT: 1.7, chargeD: 34,
    print: { r: 0.22, side: 0.45, step: 1.2, n: 230 },
    anim: { idle: null, walk: ['Walk', 1.25], run: ['Run', 5.6], eat: null, warn: [null, 1] },
    graze: { neck: 'Neck9', head: 'Head10', tail: 'Tail178', ears: ['L_Ear130', 'R_Ear132'] },
    looks: { alive: 'rhino', track: 'rhinotrack', high: 1.5 }, lesson: 'rhino',
    step: 0.7, call: 'snort', cry: 'snort',
    text: {
      seen: 'Een grijze rug boven het gras, zo breed als een rotsblok. Een neushoorn. Hij graast met zijn kop bij de grond.',
      sniff: 'De neushoorn tilt zijn kop op en snuift. Hij ruikt je, maar hij ziet je niet. De wind verraadt je.',
      watch: 'De neushoorn draait zijn oren jouw kant op. Sta stil, of ga langzaam achteruit.',
      anger: 'Hij snuift hard en zet zich af! Spring opzij: hij rent rechtuit!',
      letgo: 'De neushoorn snuift nog eens en laat zijn kop zakken. Hij is je kwijt.',
      bonk: 'De neushoorn knalt ergens tegenaan. Hij schudt zijn kop en draaft weg.',
      dodge: 'De neushoorn dendert vlak langs je heen. Hij ziet te slecht om op tijd te draaien.',
      giveup: 'De neushoorn staat stil en draait zijn oren. Hij weet niet meer waar je bent.',
      hit: 'De neushoorn ramt je met zijn hoorn en gooit je opzij! Je laat alles vallen. Blijf uit zijn wind!',
      unseen: 'Je bent zo dichtbij dat je hem hoort kauwen. Hij merkt niets: de wind waait van hem naar jou.',
      track: 'Afdrukken met drie brede tenen, diep in de as gedrukt. Wie dit spoor maakt, is zwaar.',
      rumour: 'Tor zag gisteren een grijze rug tussen de kale bomen. Een neushoorn. Blijf uit zijn wind.',
    },
  },

  // Giraffa jumae: een grote giraf uit het vroege Pleistoceen. Schuw, met ogen die boven alles uit kijken.
  giraffe: {
    model: 'giraffe', rig: { scale: 5.4 / 2.51 }, ai: 'shy', sense: 'giraffe',
    walkV: 1.5, chargeV: 8.5, chargeTurn: 1.4, hurry: 3.2, r: 0.9, hitR: 3.1, dmg: 30, fling: 11,
    print: { r: 0.13, side: 0.3, step: 1.5, n: 420 },
    anim: { idle: '01_Idle', walk: ['02_Walk', 1.5], run: ['03_Run', 6.4], eat: '04_Eat', warn: ['05_Attack', 1] },
    herd: [{ size: 0.85, off: [4.5, -3] }, { size: 0.62, off: [-3.2, -5.5] }],
    looks: { alive: 'giraffe', track: 'giraffetrack', high: 3.6 }, lesson: 'giraffe', watchFor: 85,
    step: 0.3, call: null, cry: null,
    text: {
      seen: 'Boven de bomen steken drie lange nekken uit. Giraffen. Ze hebben jou allang gezien.',
      watch: 'De giraffen houden op met eten en kijken naar je. Alle drie.',
      flee: 'De giraffen gaan ervandoor, in een trage galop die sneller is dan hij lijkt.',
      lookout: 'De giraffen eten niet meer. Ze staan stil en kijken alle drie dezelfde kant op. Daar loopt iets wat zij niet vertrouwen.',
      hit: 'De giraffe trapt naar achteren en raakt je vol! Je laat alles vallen. Kom nooit achter die poten.',
      track: 'Afdrukken van gespleten hoeven, zo lang als je hand, met reuzenpassen ertussen. Hier liepen giraffen.',
      rumour: 'Tor zag gisteren lange nekken boven de bomen. Giraffen zien alles: let op waar ze naar kijken.',
    },
  },
};
