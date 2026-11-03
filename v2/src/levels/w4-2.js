// Wereld 4 · Level 2: het Neanderdal in de winter.
// Nieuw: een bevroren rivier met ijsschotsen, een holenbeer, een rotswand om te beklimmen.
export default {
  id: '4-2', world: 4, name: 'Het Neanderdal',
  species: 'Neanderthaler (Homo neanderthalensis)', place: 'Het Neanderdal bij Düsseldorf, Duitsland', era: 'circa 50.000 jaar geleden',
  theme: 'snow', music: 'ice', look: 'neanderthalensis', tool: 'spear', fire: true, cold: true, coldTime: 44, phys: { walk: 152, run: 245 },
  width: 226, height: 15,
  fact: 'In 1856 vonden steenhouwers in een grot in het Neanderdal een schedeldak en botten. Het werd de eerste mensensoort die wetenschappers als uitgestorven herkenden: de Neanderthaler. In 2010 bleek uit DNA dat Neanderthalers en wij samen kinderen hebben gekregen.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 24);
    b.ent('tree', 13, 3, { scale: 1 }); b.ent('tree', 21, 3, { scale: 0.8 });
    b.bump(17, 6, 'berry');
    // A · De bevroren rivier: ijsschotsen en een rotseilandje
    b.water(25, 44);
    b.ent('log', 26, 2, { from: 25, to: 33, len: 3, speed: 40, ice: true });
    b.rock(34, 1, 2, 2);
    b.ent('log', 37, 2, { from: 36, to: 44, len: 3, speed: 46, ice: true, offset: 0.5 });
    b.bones(28, 6, 4); b.bones(38, 6, 4);
    b.ground(45, 80);
    // B · De holenbeer en takken erboven
    b.branch(51, 6, 3); b.branch(57, 8, 3); b.bones(57, 10, 3);
    b.ent('bear', 62, 3);
    b.branch(65, 7, 3); b.ent('artifact', 66, 9, { id: 'a1', name: 'Arendsklauw-sieraad' });
    b.ent('checkpoint', 74, 3);
    // C · Omhoog langs de rotswand van het dal
    b.ground(81, 90, 5); b.ground(91, 100, 7);
    b.climb(101, 7, 1, 6, 'rock'); b.ground(102, 120, 12);
    b.bump(85, 8, 'shroom');
    b.ent('wolf', 112, 12);
    b.bones(105, 14, 4);
    b.crumble(121, 11, 5);
    b.ground(126, 140, 6);
    b.ent('hyena', 137, 6);
    // D · IJs met een wolharige neushoorn
    b.ground(141, 144, 4); b.mud(145, 164);
    b.rock(150, 3, 2, 3); b.bones(150, 7, 2);
    b.ent('rhino', 160, 3, { skin: 'woolly' });
    b.bump(146, 7, 'redcap');
    b.ground(165, 225);
    b.ent('checkpoint', 168, 3);
    b.rock(176, 3, 2, 2); b.rock(178, 5, 2, 2); b.ent('artifact', 179, 9, { id: 'a2', name: 'Rode oker' });
    b.ent('bear', 188, 3);
    b.rock(194, 3, 1, 4); b.ent('artifact', 194, 9, { id: 'a3', name: 'Botgereedschap (lissoir)' }); b.bones(196, 5, 3);
    b.bump(203, 6, 'flower');
    // Extra vijanden: de moeilijkheid stijgt per wereld
    b.ent('wolf', 70, 3, { fast: true }); b.ent('wolf', 95, 7); b.ent('wolf', 198, 3); b.ent('hyena', 206, 3, { fast: true });
    b.ent('finish', 212, 3);
  },
};
