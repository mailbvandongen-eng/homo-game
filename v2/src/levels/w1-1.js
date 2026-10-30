// Wereld 1 · Level 1: leert lopen, springen, stampen, gooien en veren.
// Coördinaten: (kolom, hoogte vanaf de bodem). Het gewone maaiveld ligt op hoogte 3.
export default {
  id: '1-1', world: 1, name: 'Eerste stappen',
  species: 'Homo habilis', place: 'Riftvallei, Oost-Afrika', era: 'circa 2,4 miljoen jaar geleden',
  theme: 'savanna', music: 'savanna',
  width: 222, height: 15,
  fact: 'Homo habilis betekent "handige mens". Deze vroege mensachtige sloeg scherpe afslagen van keien: Oldowan-werktuigen. Die techniek is zelfs ouder dan habilis zelf: ook eerdere mensachtigen maakten al stenen werktuigen.',
  build(b) {
    b.ent('start', 3, 3);

    // A · Lopen, springen en de eerste hyena
    b.ground(0, 34);
    b.ent('tree', 8, 3, { scale: 1 });
    b.bones(6, 3, 4);
    b.rock(13, 3);
    b.bones(12, 5, 3, { arc: 0.8 });
    b.bump(17, 6, 'bone'); b.bump(18, 6, 'flint'); b.bump(19, 6, 'bone');
    b.ent('hyena', 25, 3);
    b.ent('tree', 28, 3, { scale: 0.8 });
    b.rock(31, 3, 1, 2);
    b.bones(31, 6, 1);

    // B · Kuilen en de slang
    b.bones(34, 5, 4, { arc: 0.9 });
    b.ground(37, 52);
    b.ent('snake', 44, 3);
    b.bones(43, 6, 3, { arc: 0.6 });
    b.rock(48, 3, 2, 2);
    b.bones(48, 6, 2);
    b.bones(52, 5, 4, { arc: 1 });
    b.ground(56, 80);
    b.ent('tree', 58, 3, { scale: 1.1 });
    b.ent('hyena', 61, 3);
    b.ent('hyena', 66, 3, { dir: 1 });

    // Termietenheuvel naar een hoge richel met het eerste artefact
    b.spring(70, 3);
    b.rock(72, 8, 5, 1);
    b.bones(72, 9, 4);
    b.ent('artifact', 76, 9, { id: 'a1', name: 'Hamersteen' });

    // C · Takken boven de kloof, en de gier
    b.ent('tree', 79, 3, { scale: 0.9 });
    b.branch(82, 5, 3);
    b.bones(82, 6, 3);
    b.branch(86, 6, 3);
    b.bones(86, 7, 3);
    b.ground(90, 112);
    b.ent('vulture', 97, 3, { alt: 5 });
    b.ent('fig', 99, 4);
    b.ent('checkpoint', 103, 3);
    b.ent('tree', 107, 3, { scale: 1 });

    // D · Brokkelbrug over een brede kuil
    b.crumble(113, 2, 10);
    b.bones(113, 4, 10);
    b.ent('artifact', 118, 7, { id: 'a2', name: 'Afslag' });
    b.ground(123, 150);

    // E · Het wrattenzwijn op de vlakte
    b.ent('flint', 127, 4);
    b.ent('tree', 129, 3, { scale: 0.85 });
    b.thorns(134, 3, 2);
    b.bones(133, 6, 4, { arc: 0.7 });
    b.ent('warthog', 142, 3);
    b.rock(147, 3, 1, 2);

    // F · Rotspilaren boven kuilen
    b.rock(154, 0, 2, 5);
    b.bones(154, 6, 2);
    b.rock(159, 0, 2, 6);
    b.bones(159, 7, 2);
    b.ground(163, 184);
    b.ent('hyena', 167, 3, { fast: true });
    b.spring(169, 3);
    b.bump(171, 7, 'fig'); b.bump(172, 7, 'bone'); b.bump(173, 7, 'bone');
    b.ent('artifact', 172, 8, { id: 'a3', name: 'Oldowan-hakker' });
    b.ent('vulture', 178, 3, { alt: 5 });

    // G · Verende tak en twee lianen over de kloof naar de grot van de stam
    b.ent('checkpoint', 164, 3);
    b.bouncy(185, 2, 2);
    b.bones(187, 9, 2);
    b.ent('liana', 189, 13, { len: 4 });
    b.bones(191, 10, 2, { arc: 0.5 });
    b.ent('liana', 194, 13, { len: 6 });
    b.bones(196, 10, 2, { arc: 0.5 });
    b.ground(199, 221, 5);
    b.ent('finish', 204, 5);
  },
};
