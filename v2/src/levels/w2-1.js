// Wereld 2 · Level 1: de eerste handbijl. Je speelt nu Homo erectus: langer en sneller.
// Nieuw: de handbijl (hakken), gebarsten rots, en een stormende kudde gnoes.
export default {
  id: '2-1', world: 2, name: 'De eerste handbijl',
  species: 'Homo erectus', place: 'Kokiselei, West-Turkana (Kenia)', era: 'circa 1,76 miljoen jaar geleden',
  theme: 'grassland', music: 'plains', look: 'erectus', phys: { walk: 158, run: 255 },
  width: 236, height: 15,
  fact: 'Bij Kokiselei in Kenia zijn de oudste bekende handbijlen gevonden, circa 1,76 miljoen jaar oud. En bij het Turkanameer vond Kamoya Kimeu in 1984 de "Turkana-jongen": een bijna compleet skelet van een jonge erectus, met lange benen zoals wij.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 60);
    b.ent('tree', 7, 3, { scale: 1 });
    b.bones(5, 4, 3);
    // De handbijl ligt op een rotsje: daarna kun je hakken
    b.rock(12, 3, 2, 1);
    b.ent('handaxe', 13, 4);
    b.crack(19, 3, 1, 3); b.rock(19, 6, 1, 3);
    b.bones(21, 4, 3);
    b.ent('hyena', 27, 3);
    b.crack(32, 3, 2, 2); b.ent('fig', 33, 6);
    b.ent('snake', 38, 3);
    b.bump(42, 6, 'bone'); b.bump(43, 6, 'bone'); b.bump(44, 6, 'bone');
    b.ent('vulture', 48, 3, { alt: 5 });
    b.rock(52, 3, 2, 2); b.bones(52, 6, 2);
    b.ent('tree', 56, 3, { scale: 1.1 });
    // kuilen
    b.ground(64, 90);
    b.bones(61, 5, 3, { arc: 0.8 });
    b.ent('warthog', 74, 3);
    b.crack(80, 3, 1, 2); b.rock(80, 5, 1, 4);
    b.ent('artifact', 85, 7, { id: 'a1', name: 'Handbijl uit Kokiselei' });
    b.rock(84, 3, 2, 3);
    b.ent('checkpoint', 92, 3);
    b.ground(91, 110);

    // De stormloop: klim op de rotsen terwijl de kudde onder je door raast
    b.ent('stampede', 98, 3, { count: 12, every: 0.45 });
    b.rock(101, 3, 2, 3); b.bones(101, 7, 2);
    b.ground(111, 150);
    b.rock(113, 3, 3, 3);
    b.rock(124, 3, 2, 3);
    b.rock(134, 3, 3, 3);
    b.rock(144, 3, 2, 3);
    b.bones(118, 4, 4); b.bones(129, 4, 3); b.bones(139, 4, 3);
    b.ent('artifact', 125, 8, { id: 'a2', name: 'Turkana-steen' });

    // Na de kudde: hakken en springen
    b.ent('checkpoint', 152, 3);
    b.ground(151, 172);
    b.crack(158, 3, 1, 4);
    b.ent('hyena', 163, 3, { fast: true }); b.ent('hyena', 167, 3, { fast: true, dir: 1 });
    b.ground(176, 196);
    b.bones(172, 5, 3, { arc: 0.8 });
    b.crack(182, 6, 3, 1); b.bump(183, 9, 'fig');
    b.ent('vulture', 186, 3, { alt: 5 });
    b.rock(190, 3, 1, 2); b.rock(191, 3, 1, 3); b.rock(192, 3, 1, 4);
    b.ent('artifact', 192, 8, { id: 'a3', name: 'Kernsteen' });
    b.ground(199, 235);
    b.ent('stampede', 200, 3, { count: 5, every: 0.7 });
    b.rock(205, 3, 3, 3);
    b.ent('tree', 212, 3, { scale: 1.1 });
    b.ent('finish', 216, 3);
  },
};
