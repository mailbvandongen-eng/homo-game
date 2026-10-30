// Wereld 2 · Level 2: buiten Afrika. Dmanisi in Georgië, op een heuvel tussen twee rivieren.
// Nieuw: windstoten, wolven, de sabeltandkat Megantereon.
export default {
  id: '2-2', world: 2, name: 'Buiten Afrika',
  species: 'Homo erectus', place: 'Dmanisi, Georgië', era: 'circa 1,8 miljoen jaar geleden',
  theme: 'dmanisi', music: 'dmanisi', look: 'erectus', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 232, height: 17,
  wind: [
    { from: 40, to: 90, dir: -1, strength: 480, period: 5.5 },
    { from: 150, to: 200, dir: -1, strength: 420, period: 5.5, offset: 2 },
  ],
  fact: 'In Dmanisi zijn vijf schedels van erectus gevonden, de oudste mensen buiten Afrika. Eén van hen had al zijn tanden verloren en leefde daarna nog jaren. Hij kon waarschijnlijk alleen overleven doordat anderen voor hem zorgden.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 34);
    b.ent('tree', 9, 3, { scale: 0.9 });
    b.bones(6, 4, 3);
    b.ent('wolf', 18, 3);
    b.ground(23, 34, 5); b.ground(27, 34, 7);
    b.bones(28, 8, 4);
    b.crack(33, 7, 1, 3);
    // Windvlakte: wacht op de stilte, of ren met de wind mee
    b.ground(35, 60, 7);
    b.ent('wolf', 44, 7); b.ent('wolf', 50, 7, { dir: 1 });
    b.thorns(54, 7, 1);
    b.ground(64, 92, 7);
    b.bones(60, 9, 4, { arc: 0.6 });
    b.crumble(69, 10, 4); b.ent('artifact', 71, 12, { id: 'a1', name: 'Dmanisi-afslag' });
    b.ent('vulture', 78, 7, { alt: 5 });
    b.ent('checkpoint', 88, 7);
    // Afdaling naar de rivier
    b.ground(93, 96, 5); b.ground(97, 100, 3);
    b.water(101, 116);
    b.ent('log', 102, 2, { from: 101, to: 108, len: 4, speed: 44 });
    b.rock(109, 0, 2, 3);
    b.ent('log', 112, 2, { from: 111, to: 116, len: 3, speed: 52, offset: 0.5 });
    b.ground(117, 140);
    // De sabeltandkat ligt op de loer
    b.ent('sabre', 128, 3);
    b.rock(124, 3, 2, 2); b.bones(124, 6, 2);
    b.crack(134, 3, 1, 3); b.rock(134, 6, 1, 3);
    b.ent('fig', 138, 4);
    b.ent('checkpoint', 142, 3);
    b.ground(141, 150);
    // Tweede windvlakte met kuilen
    b.ground(154, 166, 3); b.ground(170, 182, 3); b.ground(186, 200, 3);
    b.bones(151, 5, 3, { arc: 0.8 }); b.bones(167, 5, 3, { arc: 0.8 }); b.bones(183, 5, 3, { arc: 0.8 });
    b.ent('wolf', 160, 3, { fast: true }); b.ent('wolf', 176, 3, { fast: true });
    b.branch(174, 7, 3); b.ent('artifact', 175, 9, { id: 'a2', name: 'Basaltkern' });
    b.ent('sabre', 194, 3);
    // Naar het kamp op de heuvel
    b.ground(201, 231, 5); b.rock(201, 3, 1, 2);
    b.ent('artifact', 205, 8, { id: 'a3', name: 'Schraapsteen' });
    b.crack(207, 5, 1, 3); b.rock(207, 8, 1, 2);
    b.ent('finish', 212, 5);
  },
};
