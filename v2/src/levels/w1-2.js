// Wereld 1 · Level 2: de rivier in de Olduvai-kloof.
// Nieuw: water, drijvende stammen, krokodillen en nijlpaarden. Ontmoeting met Paranthropus boisei.
export default {
  id: '1-2', world: 1, name: 'De rivierkloof',
  species: 'Homo habilis', place: 'Olduvai-kloof, Tanzania', era: 'circa 1,8 miljoen jaar geleden',
  theme: 'gorge', music: 'gorge',
  width: 232, height: 15,
  fact: 'In 1959 vond Mary Leakey in de Olduvai-kloof een schedel van Paranthropus boisei. Kort daarna volgden daar de eerste fossielen van Homo habilis. Beide soorten leefden er in dezelfde tijd.',
  build(b) {
    b.ent('start', 3, 6);

    // A · Van de rand van de kloof naar beneden
    b.ground(0, 14, 6);
    b.bones(5, 7, 4);
    b.ground(15, 16, 5); b.ground(17, 18, 4);
    b.ground(19, 30, 3);
    b.ent('tree', 22, 3, { scale: 0.9 });
    b.bump(24, 6, 'bone'); b.bump(25, 6, 'flint');
    b.ent('hyena', 28, 3);

    // B · Stapstenen: eerste kennismaking met water
    b.water(31, 42);
    b.rock(33, 1, 4, 2); b.bones(33, 4, 4);
    b.rock(38, 1, 4, 2); b.bones(38, 4, 4);
    b.ground(43, 60, 3);
    b.ent('snake', 52, 3);
    b.ent('flint', 49, 4);
    b.ent('tree', 57, 3, { scale: 1 });

    // C · Drijvende stammen met een rotseiland in het midden
    b.water(61, 80);
    b.ent('log', 62, 2, { from: 61, to: 68, len: 4, speed: 42 });
    b.rock(69, 0, 3, 3);
    b.ent('log', 73, 2, { from: 72, to: 80, len: 4, speed: 48, offset: 0.6 });
    b.bones(63, 5, 3, { arc: 0.5 });
    b.ent('artifact', 76, 7, { id: 'a1', name: 'Snijsteen' });
    b.ground(81, 96, 3);
    b.ent('vulture', 88, 3, { alt: 5 });

    // D · Rust en een ontmoeting met een andere soort
    b.ent('checkpoint', 97, 3);
    b.ground(97, 120, 3);
    b.ent('meet', 106, 3, { species: 'boisei', offsets: [0, 44, 78], sizes: [1, 0.95, 0.7] });
    b.ent('fig', 101, 5);
    b.ent('tree', 113, 3, { scale: 1.1 });

    // E · Krokodillen als vlot, met een eilandje halverwege
    b.water(121, 146);
    b.ent('croc', 122, 2, { from: 121, to: 132, speed: 40, dir: 1 });
    b.rock(133, 0, 2, 3);
    b.bones(133, 4, 2);
    b.ent('croc', 136, 2, { from: 135, to: 146, speed: 46, dir: -1, offset: 0.7 });
    b.ground(147, 152, 3);

    // F · Nijlpaardenpoel: wacht tot ze bovenkomen
    b.water(153, 165);
    b.ent('hippo', 156, 2, { delay: 0.2 });
    b.ent('hippo', 160, 2, { delay: 1.4 });
    b.ent('hippo', 164, 2, { delay: 2.6 });
    b.ent('artifact', 160, 7, { id: 'a2', name: 'Kernsteen' });
    b.bones(155, 5, 2); b.bones(163, 5, 2);
    b.ground(166, 190, 3);
    b.ent('hyena', 176, 3, { fast: true });
    b.ent('hyena', 181, 3, { fast: true, dir: 1 });
    b.thorns(185, 3, 1);
    b.ent('checkpoint', 173, 3);

    // G · Omhoog uit de kloof: verende tak, rotswand, brokkelpad
    b.bouncy(191, 2, 2);
    b.rock(194, 0, 4, 8);
    b.bones(194, 9, 3);
    b.crumble(198, 7, 6);
    b.ent('artifact', 201, 10, { id: 'a3', name: 'Botsplijter' });
    b.ground(204, 231, 8);
    b.ent('finish', 209, 8);
  },
};
