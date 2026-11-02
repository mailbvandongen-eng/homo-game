// Wereld 1 · Level 1: springen en verjagen. Opbouw zoals bij Mario: leren, oefenen, verrassing, finale.
// Nieuw: springen, stampen, stenen gooien en de termietenheuvel. Niets anders.
// Coördinaten: (kolom, hoogte vanaf de bodem). Het gewone maaiveld ligt op hoogte 3.
export default {
  id: '1-1', world: 1, name: 'Eerste stappen',
  species: 'Homo habilis', place: 'Riftvallei, Oost-Afrika', era: 'circa 2,4 miljoen jaar geleden',
  theme: 'savanna', music: 'savanna',
  width: 210, height: 15,
  fact: 'Homo habilis betekent "handige mens". Deze vroege mensachtige sloeg scherpe afslagen van keien: Oldowan-werktuigen. Die techniek is zelfs ouder dan habilis zelf: ook eerdere mensachtigen maakten al stenen werktuigen.',
  build(b) {
    b.ent('start', 3, 3);

    // 1 · LEREN: springen, stampen, stenen gooien. Alles op vlakke grond, met ruimte.
    b.ground(0, 40);
    b.bones(6, 3, 3);
    b.rock(12, 3);                                   // klein rotsje: de eerste sprong
    b.bones(11, 5, 3, { arc: 0.8 });
    b.bump(17, 6, 'bone'); b.bump(18, 6, 'flint'); b.bump(19, 6, 'bone');   // stoot ertegen: stenen
    b.ent('tree', 9, 3, { scale: 1 });
    b.ent('hyena', 26, 3);                           // de eerste hyena: loopt naar je toe over vlakke grond
    b.bones(23, 6, 5, { arc: 0.6 });                 // botjes wijzen: spring erop
    b.rock(31, 3, 1, 2);
    b.ent('snake', 36, 3);                           // slang: niet op springen, gooi een steen of spring eroverheen
    b.bones(35, 6, 3, { arc: 0.6 });

    // 2 · OEFENEN: dezelfde dingen, maar nu met kuilen erbij
    b.bones(41, 5, 2, { arc: 0.7 });                 // eerste kuil: 2 breed
    b.ground(43, 58);
    b.ent('hyena', 52, 3);                           // hyena die bij de rand van de kuil omkeert
    b.ent('artifact', 47, 7, { id: 'a1', name: 'Hamersteen' });
    b.rock(46, 3, 2, 2);
    b.bones(59, 5, 3, { arc: 0.9 });                 // tweede kuil: 3 breed
    b.ground(62, 76);
    b.ent('hyena', 70, 3);                           // landt vlak voor een hyena: snel reageren
    b.stairs(73, 3, 3);                              // trap omhoog naar een rotsplateau
    b.ground(76, 84, 6);
    b.bones(77, 7, 4);
    b.bones(85, 8, 3, { arc: 0.6 });                 // spring van het plateau over de kuil
    b.ground(88, 106);
    b.ent('vulture', 96, 3, { alt: 5 });             // nieuw: de gier duikt van boven
    b.bump(92, 6, 'date');
    b.ent('checkpoint', 101, 3);
    b.ent('tree', 104, 3, { scale: 1.1 });

    // 3 · VERRASSING: de termietenheuvel lanceert je. Eerst veilig, dan over een brede kuil.
    b.spring(108, 3);
    b.rock(109, 8, 4, 1); b.bones(109, 9, 4);        // veilig uitproberen: hoge richel
    b.bump(111, 12, 'honey');                        // beloning voor wie nog hoger springt
    b.ground(107, 116);
    b.spring(116, 3);
    b.rock(117, 6, 5, 1);                            // zwevende richel boven een brede kuil
    b.bones(117, 8, 5);
    b.ground(124, 150);
    b.ent('artifact', 120, 9, { id: 'a2', name: 'Afslag' });
    b.spring(129, 3);
    b.thorns(131, 3, 4);                             // doornstruiken: alleen met de termietenheuvel eroverheen
    b.bones(131, 9, 5, { arc: 0.8 });
    b.rock(140, 3, 2, 3);                            // rots om op te schuilen
    b.ent('hyena', 145, 3); b.ent('hyena', 148, 3, { fast: true });   // twee hyena's tegelijk
    b.bump(137, 6, 'flint');

    // 4 · FINALE: rotspilaren boven diepe kuilen, met een gier erboven
    b.bump(149, 7, 'fig');                           // even opladen voor het laatste stuk
    b.rock(153, 0, 2, 5); b.bones(153, 6, 2);
    b.rock(158, 0, 2, 6); b.bones(158, 7, 2);
    b.rock(163, 0, 2, 5); b.bones(163, 6, 2);
    b.ent('vulture', 160, 3, { alt: 7 });
    b.rock(168, 0, 2, 4); b.bones(168, 5, 2);
    b.ground(172, 209);
    b.ent('hyena', 182, 3, { fast: true });
    b.spring(189, 3);
    b.rock(186, 11, 3, 1); b.ent('artifact', 187, 12, { id: 'a3', name: 'Oldowan-hakker' });   // verstopt boven in beeld
    b.ent('finish', 198, 3);
  },
};
