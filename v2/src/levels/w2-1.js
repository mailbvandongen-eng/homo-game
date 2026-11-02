// Wereld 2 · Level 1: de eerste handbijl. Je speelt nu Homo erectus: langer en sneller.
// Hoofdidee: de handbijl en de lange benen. Leren (hakken), oefenen (kuilen van 4: aanloop nemen),
// verrassing (kudde van achteren, dan van voren), finale (alles samen).
export default {
  id: '2-1', world: 2, name: 'De eerste handbijl',
  species: 'Homo erectus', place: 'Kokiselei, West-Turkana (Kenia)', era: 'circa 1,76 miljoen jaar geleden',
  theme: 'grassland', music: 'plains', look: 'erectus', phys: { walk: 158, run: 255 },
  width: 236, height: 15,
  fact: 'Bij Kokiselei in Kenia zijn de oudste bekende handbijlen gevonden, circa 1,76 miljoen jaar oud. En bij het Turkanameer vond Kamoya Kimeu in 1984 de "Turkana-jongen": een bijna compleet skelet van een jonge erectus, met lange benen zoals wij.',
  build(b) {
    b.ent('start', 3, 3);

    // 1 · LEREN: de handbijl. Hak door gebarsten rots, verjaag een hyena van dichtbij.
    b.ground(0, 56);
    b.ent('tree', 7, 3, { scale: 1 });
    b.bones(5, 4, 3);
    b.rock(12, 3, 2, 1); b.ent('handaxe', 13, 4);
    b.crack(19, 3, 1, 3); b.rock(19, 6, 1, 3);          // een muur: alleen met de bijl erdoor
    b.bones(21, 4, 3);
    b.ent('hyena', 28, 3);
    b.crack(33, 3, 2, 2); b.ent('fig', 33, 6);          // achter de barst: een beloning
    b.ent('snake', 40, 3);
    b.bump(45, 6, 'bone'); b.bump(46, 6, 'flint'); b.bump(47, 6, 'bone');
    b.rock(52, 3, 2, 2); b.bones(52, 6, 2);

    // 2 · OEFENEN: lange benen. Kuilen van 4 breed: neem een aanloop.
    b.bones(57, 6, 4, { arc: 1 });
    b.ground(61, 82);
    b.crack(66, 3, 1, 2); b.rock(66, 5, 1, 4);
    b.ent('artifact', 71, 7, { id: 'a1', name: 'Handbijl uit Kokiselei' }); b.rock(70, 3, 2, 3);
    b.ent('warthog', 77, 3);                            // nieuw: het wrattenzwijn stormt op je af
    b.bones(83, 6, 4, { arc: 1 });
    b.ground(87, 104);
    b.ent('vulture', 94, 3, { alt: 5 });
    b.bump(90, 6, 'date');
    b.ent('checkpoint', 100, 3);

    // 3 · VERRASSING: een kudde gnoes van achteren. Klim op de rotsen. Daarna een kleine kudde van voren.
    b.ground(105, 160);
    b.ent('stampede', 108, 3, { count: 12, every: 0.45 });
    b.rock(111, 3, 2, 3); b.rock(122, 3, 2, 3); b.rock(133, 3, 3, 3); b.rock(144, 3, 2, 3);
    b.bones(116, 4, 4); b.bones(127, 4, 4); b.bones(138, 4, 4);
    b.ent('artifact', 123, 8, { id: 'a2', name: 'Turkana-steen' });
    b.ent('stampede', 146, 3, { count: 5, every: 0.6, from: 'front' });
    b.rock(149, 3, 2, 3); b.bones(149, 7, 2);
    b.bump(152, 6, 'honey');

    // 4 · FINALE: alles samen. Hakken, rennen en springen.
    b.bones(161, 6, 4, { arc: 1 });
    b.ground(165, 186);
    b.crack(170, 3, 1, 4);
    b.ent('hyena', 175, 3, { fast: true }); b.ent('hyena', 180, 3, { fast: true, dir: 1 });
    b.bones(187, 6, 4, { arc: 1 });
    b.ground(191, 235);
    b.crack(196, 6, 3, 1); b.bump(197, 9, 'fig');
    b.ent('vulture', 199, 3, { alt: 6 });
    b.ent('warthog', 206, 3);
    b.rock(210, 3, 1, 2); b.rock(211, 3, 1, 3); b.rock(212, 3, 1, 4);
    b.ent('artifact', 212, 8, { id: 'a3', name: 'Kernsteen' });
    b.ent('tree', 220, 3, { scale: 1.1 });
    b.ent('finish', 226, 3);
  },
};
