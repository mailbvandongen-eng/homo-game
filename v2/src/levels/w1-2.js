// Wereld 1 · Level 2: de rivier in de Olduvai-kloof.
// Hoofdidee: het water. Leren (stenen, één trage stam), oefenen (snelle stammen, rotswand, brokkelrots),
// verrassing (krokodillen en nijlpaarden als levende platforms), finale (brokkelbrug over de rivier).
export default {
  id: '1-2', world: 1, name: 'De rivierkloof',
  species: 'Homo habilis', place: 'Olduvai-kloof, Tanzania', era: 'circa 1,8 miljoen jaar geleden',
  theme: 'gorge', music: 'gorge',
  width: 232, height: 15,
  fact: 'In 1959 vond Mary Leakey in de Olduvai-kloof een schedel van Paranthropus boisei. Kort daarna volgden daar de eerste fossielen van Homo habilis. Beide soorten leefden er in dezelfde tijd.',
  build(b) {
    b.ent('start', 3, 6);

    // 1 · LEREN: water is gevaarlijk. Eerst stenen in het water, dan één trage stam.
    b.ground(0, 12, 6); b.bones(5, 7, 4);
    b.ground(13, 14, 5); b.ground(15, 16, 4); b.ground(17, 30, 3);
    b.ent('tree', 20, 3, { scale: 0.9 });
    b.bump(22, 6, 'bone'); b.bump(23, 6, 'flint');
    b.ent('hyena', 27, 3);
    b.water(31, 38);
    b.rock(33, 1, 3, 2); b.bones(33, 4, 3);          // rotseilandje: veilig overstappen
    b.ground(39, 46);
    b.ent('snake', 43, 3); b.bones(42, 6, 3, { arc: 0.6 });
    b.water(47, 56);
    b.ent('log', 48, 2, { from: 47, to: 56, len: 4, speed: 30 });   // één trage stam
    b.bones(49, 5, 4);

    // 2 · OEFENEN: snellere stammen, een gier erboven, dan een rotswand op en een brokkelbrug
    b.ground(57, 62);
    b.bump(60, 6, 'berry');
    b.water(63, 80);
    b.ent('log', 64, 2, { from: 63, to: 70, len: 4, speed: 42 });
    b.rock(71, 0, 3, 3);
    b.ent('artifact', 72, 6, { id: 'a1', name: 'Snijsteen' });
    b.ent('log', 75, 2, { from: 74, to: 80, len: 4, speed: 50, offset: 0.6 });
    b.ent('vulture', 77, 3, { alt: 6 });
    b.ground(81, 91);
    b.ent('checkpoint', 83, 3);
    b.ent('hyena', 88, 3, { fast: true });
    b.climb(92, 3, 1, 5, 'rock'); b.rock(93, 3, 2, 5);   // nieuw: klim de rotswand op
    b.ground(95, 103, 8);
    b.ent('hyena', 100, 8);
    b.crumble(104, 7, 6); b.bones(104, 9, 6);          // nieuw: brokkelrots, niet blijven staan
    b.ground(110, 132, 3);

    // 3 · VERRASSING: even rust bij Paranthropus, dan "platforms" die leven
    b.ent('meet', 115, 3, { species: 'boisei', offsets: [0, 44, 78], sizes: [1, 0.95, 0.7] });
    b.ent('tree', 128, 3, { scale: 1.1 });
    b.bump(125, 6, 'flower');
    b.water(133, 150);
    b.ent('croc', 134, 2, { from: 133, to: 141, speed: 40, dir: 1 });   // krokodil: draagt je, maar hapt af en toe
    b.rock(142, 0, 2, 3); b.bones(142, 4, 2);
    b.ent('croc', 145, 2, { from: 144, to: 150, speed: 46, dir: -1, offset: 0.7 });
    b.ground(151, 154);
    b.bump(152, 6, 'flint');
    b.water(155, 167);
    b.ent('hippo', 157, 2, { delay: 0.2 }); b.ent('hippo', 161, 2, { delay: 1.4 }); b.ent('hippo', 165, 2, { delay: 2.6 });
    b.ent('artifact', 161, 7, { id: 'a2', name: 'Kernsteen' });
    b.ground(168, 180);
    b.ent('checkpoint', 170, 3);
    b.ent('hyena', 177, 3);
    b.bump(173, 7, 'fig');                              // opladen voor de finale

    // 4 · FINALE: brokkelrots en een snelle stam over de rivier, met een gier
    b.water(181, 200);
    b.crumble(182, 4, 4); b.bones(182, 6, 4);        // snel eroverheen rennen
    b.rock(187, 0, 2, 4);                              // vaste pilaar: hier wacht je op de stam
    b.ent('log', 190, 2, { from: 189, to: 196, len: 3, speed: 55 });
    b.ent('vulture', 192, 3, { alt: 7 });
    b.crumble(197, 3, 3); b.bones(197, 5, 3);
    b.ground(201, 218, 3);
    b.ent('hyena', 207, 3, { fast: true }); b.ent('hyena', 212, 3, { fast: true, dir: 1 });
    b.bouncy(216, 2, 2);                                // verende tak: omhoog de kloof uit
    b.climb(218, 3, 1, 5, 'rock'); b.rock(219, 3, 1, 5);
    b.ground(220, 231, 8);
    b.ent('artifact', 222, 11, { id: 'a3', name: 'Botsplijter' });
    b.ent('finish', 226, 8);
  },
};
