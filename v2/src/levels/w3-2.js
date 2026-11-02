// Wereld 3 · Level 2: de heuvels van Atapuerca.
// Hoofdidee: rollende rotsblokken. Leren (één bron, zachte helling), oefenen (holenbeer, steile helling met barst),
// verrassing (lawine van achteren: rennen!), finale (richels boven een kloof, blokken van voren).
// Ontmoeting: de Sima-mensen. Het level eindigt bij de ingang van de grot.
export default {
  id: '3-2', world: 3, name: 'De heuvels van Atapuerca',
  species: 'Homo heidelbergensis', place: 'Sierra de Atapuerca, Spanje', era: 'circa 430.000 jaar geleden',
  theme: 'hills', music: 'hills', look: 'heidelbergensis', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 236, height: 17,
  fact: 'In de Sierra de Atapuerca liggen meerdere beroemde vindplaatsen in grotten en spleten. In Gran Dolina vond men Homo antecessor (circa 850.000 jaar). In de Sima de los Huesos werd DNA gehaald uit 430.000 jaar oude botten: deze mensen hoorden bij de vroege voorouders van de Neanderthalers.',
  build(b) {
    b.ent('start', 3, 3);

    // 1 · LEREN: één bron van rotsblokken op een zachte helling. Spring eroverheen of hak ze kapot.
    b.ground(0, 20);
    b.ent('tree', 7, 3, { scale: 1 });
    b.bones(9, 4, 3);
    b.bump(16, 6, 'berry');
    b.ground(21, 26, 4); b.ground(27, 32, 5); b.ground(33, 48, 6);
    b.ent('boulder', 47, 6, { every: 3.2 });
    b.bones(24, 6, 2); b.bones(30, 7, 2);
    b.rock(39, 8, 3, 1); b.ent('artifact', 40, 10, { id: 'a1', name: 'Gran Dolina-afslag' });

    // 2 · OEFENEN: de holenbeer, dan een steilere helling met een barst die je moet hakken terwijl de blokken komen
    b.ground(49, 80, 3);
    b.ent('wolf', 55, 3);
    b.ent('bear', 66, 3);                               // nieuw: de holenbeer
    b.rock(61, 3, 2, 2);
    b.ent('vulture', 75, 3, { alt: 5 });
    b.ground(81, 86, 4); b.ground(87, 92, 5); b.ground(93, 98, 6); b.ground(99, 135, 7);
    b.ent('boulder', 116, 7, { every: 2.4 });
    b.crack(104, 7, 1, 3); b.rock(104, 10, 1, 2);
    b.bones(84, 6, 3); b.bones(96, 8, 3);
    b.rock(110, 9, 4, 1); b.ent('artifact', 112, 11, { id: 'a2', name: 'Kwartsiet-kern' });
    b.ent('checkpoint', 120, 7);

    // 3 · VERRASSING: even rust bij de Sima-mensen, en dan een lawine van achteren. Rennen, de helling af!
    b.ent('meet', 124, 7, { species: 'sima', offsets: [0, 44, 84], sizes: [1, 0.96, 0.74] });
    b.bump(133, 10, 'flower');
    b.ent('boulder', 137, 7, { every: 1.5, dir: 1 });
    b.ground(136, 145, 7); b.ground(146, 153, 6); b.ground(154, 161, 5); b.ground(162, 169, 4); b.ground(170, 184, 3);
    b.bones(140, 9, 3); b.bones(150, 8, 3); b.bones(158, 7, 3); b.bones(166, 6, 3);
    b.ent('bear', 176, 3, { dir: -1 });                 // onderaan wacht een beer: hak of spring, de blokken zitten achter je
    b.ent('checkpoint', 182, 3);

    // 4 · FINALE: rotsrichels boven een kloof, dan blokken van voren en een laatste beer
    b.bump(184, 6, 'fig');
    b.rock(187, 0, 3, 4); b.rock(191, 0, 3, 5); b.rock(195, 0, 4, 6);
    b.bones(188, 6, 2); b.bones(196, 8, 2);
    b.ground(199, 218, 6);
    b.ent('boulder', 216, 6, { every: 2.2 });
    b.ent('bear', 207, 6);
    b.ent('artifact', 203, 10, { id: 'a3', name: 'Berenklauw' });
    b.ground(219, 235, 3); b.ground(219, 221, 5); b.ground(222, 223, 4);
    b.ent('finish', 228, 3);
  },
};
