// Wereld 5 · Level 1: Jebel Irhoud in Marokko. Je speelt een vroege Homo sapiens.
// Nieuw: de oudste sapiens die we kennen, in een droog heuvelland met grazers, een luipaard en bavianen in de rotsen.
export default {
  id: '5-1', world: 5, name: 'De eerste sapiens',
  species: 'Vroege Homo sapiens', place: 'Jebel Irhoud, Marokko', era: 'circa 300.000 jaar geleden',
  theme: 'hills', music: 'hills', look: 'sapiens', tool: 'spear', fire: true, phys: { walk: 158, run: 255 },
  width: 222, height: 15,
  fact: 'In een oude grot bij Jebel Irhoud in Marokko vonden onderzoekers schedels, tanden en stenen werktuigen van ongeveer 300.000 jaar oud. Het gezicht leek al op het onze, maar de schedel was nog langgerekt. Het zijn de oudste resten van Homo sapiens die we kennen. Onze soort ontstond dus niet op één plek, maar verspreid over heel Afrika.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 30);
    b.ent('checkpoint', 8, 3);
    b.ent('tree', 13, 3, { scale: 0.9 }); b.ent('tree', 24, 3, { scale: 0.7 });
    b.bump(18, 6, 'berry');
    b.bones(20, 5, 4);
    // A · Droge bedding met een slang
    b.ent('snake', 27, 3);
    b.ground(31, 34, 5); b.ground(35, 60);
    b.ent('warthog', 46, 3);
    b.bump(40, 6, 'berry');
    b.rock(52, 3, 2, 3); b.ent('artifact', 53, 8, { id: 'a1', name: 'Levallois-punt' }); b.rock(53, 6, 1, 1);
    b.ent('checkpoint', 58, 3);
    // B · Kloof met rotsblokken en een vallende steen
    b.rock(64, 1, 2, 3); b.rock(69, 1, 2, 4); b.rock(74, 1, 2, 3);
    b.bones(64, 6, 2); b.bones(69, 7, 2); b.bones(74, 6, 2);
    b.ground(77, 110);
    b.ent('boulder', 92, 12, { every: 2.4 });
    b.bump(84, 6, 'honey');
    b.ent('hyena', 100, 3);
    // C · De rotswand met bavianen
    b.ground(111, 120, 6); b.climb(121, 6, 1, 5, 'rock'); b.ground(122, 140, 11);
    b.ent('baboon', 128, 11); b.ent('baboon', 136, 11, { dir: -1 });
    b.bones(126, 13, 4);
    b.rock(138, 13, 2, 1); b.ent('artifact', 139, 15, { id: 'a2', name: 'Verbrande vuursteen' });
    b.crumble(141, 10, 4);
    b.ground(145, 150, 7); b.ground(151, 221);
    b.ent('checkpoint', 154, 3);
    // D · Grazers op de vlakte: spring op de rotsen
    b.ent('stampede', 160, 3, { count: 8, every: 0.55 });
    b.rock(163, 3, 2, 3); b.rock(175, 3, 2, 3); b.rock(187, 3, 2, 3);
    b.bones(163, 7, 2); b.bones(175, 7, 2); b.bones(187, 7, 2);
    b.ent('leopard', 196, 3);
    b.rock(201, 3, 2, 3); b.ent('artifact', 202, 8, { id: 'a3', name: 'Schedel van Jebel Irhoud' }); b.rock(202, 6, 1, 1);
    b.bump(192, 6, 'flower');
    b.ent('checkpoint', 198, 3);
    b.ent('finish', 210, 3);
  },
};
