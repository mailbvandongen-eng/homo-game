// Wereld 2 · Level 3: de vulkanen van Java.
// Hoofdidee: lava en vulkaanbommen. Leren (langzame bommen op vlakke grond), oefenen (pilaren boven lava),
// verrassing (op de Stegodon onder de bommen), finale (lavaveld onder een regen van bommen).
export default {
  id: '2-3', world: 2, name: 'De vulkanen van Java',
  species: 'Homo erectus', place: 'Sangiran en Trinil, Java (Indonesië)', era: 'circa 1,5 miljoen – 500.000 jaar geleden',
  theme: 'java', music: 'java', look: 'erectus', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 236, height: 16,
  bombs: [
    { from: 46, to: 60, every: 3.0 },     // leren: langzaam, op vlakke grond
    { from: 63, to: 84, every: 2.6 },     // oefenen: boven de lava
    { from: 112, to: 140, every: 2.2 },   // verrassing: terwijl je op de Stegodon rijdt
    { from: 161, to: 202, every: 1.7 },   // finale: een regen van bommen
  ],
  build(b) {
    b.ent('start', 3, 3);

    // 1 · LEREN: makaken en varanen, de eerste lavageul met brede stenen, en de eerste vulkaanbommen
    b.ground(0, 30);
    b.ent('tree', 8, 3, { scale: 1 });
    b.bones(5, 4, 3);
    b.branch(14, 5, 3); b.ent('baboon', 15, 6, { skin: 'macaque' });   // nieuw: de makaak gooit vruchten
    b.ent('varaan', 23, 3);                             // nieuw: de varaan
    b.crack(27, 3, 1, 3); b.rock(27, 6, 1, 2);
    b.lava(31, 42);
    b.rock(32, 1, 3, 2); b.rock(36, 1, 3, 2); b.rock(40, 1, 2, 2);
    b.bones(32, 4, 3); b.bones(36, 4, 3);
    b.ground(43, 62);
    b.bones(48, 4, 3); b.bones(55, 4, 3);              // bommen: kijk naar de schaduw
    b.ent('varaan', 58, 3);

    // 2 · OEFENEN: rotspilaren boven de lava, bommen, en een makaak boven je hoofd
    b.lava(63, 84);
    b.rock(65, 0, 2, 4); b.rock(69, 0, 2, 5); b.rock(73, 0, 2, 4); b.rock(77, 0, 2, 6); b.rock(81, 0, 2, 4);
    b.bones(65, 5, 2); b.bones(69, 6, 2); b.bones(73, 5, 2); b.bones(81, 5, 2);
    b.ent('artifact', 78, 8, { id: 'a1', name: 'Zigzagschelp' });
    b.branch(72, 10, 3); b.ent('baboon', 73, 11, { skin: 'macaque', dir: -1 });
    b.ground(85, 108);
    b.bump(96, 6, 'honey');
    b.ent('varaan', 100, 3, { fast: true });
    b.ent('checkpoint', 104, 3);

    // 3 · VERRASSING: de Stegodon draagt je over het lavameer, terwijl de bommen vallen
    b.lava(109, 140);
    b.ent('stegodon', 110, 2, { from: 109, to: 140, speed: 72 });
    b.bones(114, 8, 4); b.bones(130, 8, 4);
    b.ent('artifact', 125, 10, { id: 'a2', name: 'Dubois-tand' });
    b.ground(141, 160);
    b.crack(146, 3, 1, 4);
    b.ent('varaan', 152, 3);
    b.bump(157, 6, 'fig');                              // opladen voor de finale

    // 4 · FINALE: lavaveld met pilaren, een regen van bommen, en nog een makaak
    b.lava(161, 202);
    [3, 4, 3, 5, 4, 3, 5, 4, 3, 4].forEach((h, i) => b.rock(163 + i * 4, 0, 2, h));
    b.bouncy(177, 3, 2); b.ent('artifact', 178, 10, { id: 'a3', name: 'Sangiran-steen' });
    b.bones(167, 6, 2); b.bones(183, 5, 2); b.bones(195, 5, 2);
    b.branch(189, 9, 3); b.ent('baboon', 190, 10, { skin: 'macaque', dir: -1 });
    b.ground(203, 235);
    b.ent('varaan', 210, 3, { fast: true });
    b.ent('tree', 222, 3, { scale: 1.1 });
    b.ent('finish', 224, 3);
  },
};
