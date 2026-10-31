// Wereld 3 · Level 2: de heuvels van Atapuerca.
// Nieuw: rotsblokken die van hellingen rollen (spring eroverheen of hak ze kapot), holenberen.
// Ontmoeting: de Sima-mensen. Het level eindigt bij de ingang van de grot.
export default {
  id: '3-2', world: 3, name: 'De heuvels van Atapuerca',
  species: 'Homo heidelbergensis', place: 'Sierra de Atapuerca, Spanje', era: 'circa 430.000 jaar geleden',
  theme: 'hills', music: 'hills', look: 'heidelbergensis', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 236, height: 17,
  fact: 'In de Sierra de Atapuerca liggen meerdere beroemde vindplaatsen in grotten en spleten. In Gran Dolina vond men Homo antecessor (circa 850.000 jaar). In de Sima de los Huesos werd DNA gehaald uit 430.000 jaar oude botten: deze mensen hoorden bij de vroege voorouders van de Neanderthalers.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 20);
    b.ent('tree', 7, 3, { scale: 1 });
    b.bones(9, 4, 3);
    // A · Eerste helling met rollende rotsblokken
    b.ground(21, 26, 4); b.ground(27, 32, 5); b.ground(33, 48, 6);
    b.ent('boulder', 46, 6, { every: 2.8 });
    b.bones(24, 6, 2); b.bones(30, 7, 2);
    b.ent('artifact', 40, 10, { id: 'a1', name: 'Gran Dolina-afslag' }); b.rock(39, 8, 3, 1);
    b.ground(49, 72, 3);
    b.ent('bear', 60, 3);
    b.ent('fig', 52, 4);
    b.rock(66, 3, 2, 2);
    // B · Ontmoeting met de Sima-mensen
    b.ent('checkpoint', 74, 3);
    b.ground(73, 100, 3);
    b.ent('meet', 84, 3, { species: 'sima', offsets: [0, 44, 84], sizes: [1, 0.96, 0.74] });
    b.ent('tree', 95, 3, { scale: 1.15 });
    // C · Steile helling met twee bronnen van rotsblokken
    b.ground(101, 106, 4); b.ground(107, 112, 5); b.ground(113, 118, 6); b.ground(119, 140, 7);
    b.ent('boulder', 132, 7, { every: 2.4 });
    b.crack(124, 7, 1, 3); b.rock(124, 10, 1, 2);
    b.bones(108, 7, 3); b.bones(120, 9, 3);
    b.ent('artifact', 136, 11, { id: 'a2', name: 'Kwartsiet-kern' }); b.rock(134, 9, 4, 1);
    b.ground(141, 146, 5); b.ground(147, 170, 3);
    b.ent('bear', 156, 3, { dir: -1 });
    b.ent('checkpoint', 149, 3);
    // D · Rotsrichels boven een kloof, laatste rotslawine
    b.rock(170, 0, 3, 4); b.rock(174, 0, 3, 5); b.rock(178, 0, 4, 6);
    b.bones(171, 6, 2); b.bones(179, 8, 2);
    b.ground(182, 200, 6);
    b.ent('boulder', 198, 6, { every: 2.6 });
    b.ent('bear', 190, 6);
    b.ent('artifact', 186, 10, { id: 'a3', name: 'Berenklauw' });
    b.ground(201, 235, 3); b.ground(201, 203, 5); b.ground(204, 205, 4);
    b.ent('tree', 212, 3, { scale: 1 });
    b.ent('finish', 214, 3);
  },
};
