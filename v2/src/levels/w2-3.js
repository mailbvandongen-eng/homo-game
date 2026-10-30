// Wereld 2 · Level 3: de vulkanen van Java.
// Nieuw: lava, vallende vulkaanbommen (schaduw = waarschuwing), meerijden op een Stegodon, varanen, makaken.
export default {
  id: '2-3', world: 2, name: 'De vulkanen van Java',
  species: 'Homo erectus', place: 'Sangiran en Trinil, Java (Indonesië)', era: 'circa 1,5 miljoen – 500.000 jaar geleden',
  theme: 'java', music: 'java', look: 'erectus', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 236, height: 16,
  bombs: [{ from: 98, to: 116, every: 2.4 }, { from: 160, to: 200, every: 1.9 }],
  fact: 'In 1891 vond de Nederlander Eugène Dubois bij Trinil op Java de "Javamens": de eerste erectus-fossielen ooit. In de collectie ligt ook een zoetwaterschelp met een zigzaglijn, gekrast door erectus zo’n 500.000 jaar geleden. Die schelp is nu te zien in Naturalis in Leiden.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 30);
    b.ent('tree', 8, 3, { scale: 1 });
    b.bones(5, 4, 3);
    b.ent('baboon', 15, 6, { skin: 'macaque' }); b.branch(14, 5, 3);
    b.ent('varaan', 22, 3);
    b.crack(27, 3, 1, 3); b.rock(27, 6, 1, 2);
    // Eerste lavageul met stenen
    b.lava(31, 42);
    b.rock(33, 1, 3, 2); b.rock(37, 1, 3, 2); b.rock(41, 1, 2, 2);
    b.bones(33, 4, 2); b.bones(37, 4, 2);
    b.ground(43, 58);
    b.ent('varaan', 50, 3);
    b.ent('checkpoint', 56, 3);
    // Vulkaanbommen en een Stegodon die je over de lava draagt
    b.ground(59, 70);
    b.ent('artifact', 66, 7, { id: 'a1', name: 'Zigzagschelp' }); b.rock(65, 3, 2, 3);
    b.lava(71, 96);
    b.ent('stegodon', 72, 2, { from: 71, to: 96, speed: 72 });
    b.bones(76, 8, 4); b.bones(88, 8, 4);
    b.ground(97, 116);
    b.ent('baboon', 105, 7, { skin: 'macaque', dir: -1 }); b.branch(104, 6, 3);
    b.ent('varaan', 110, 3);
    // De Solo-rivier met krokodillen
    b.ent('checkpoint', 114, 3);
    b.water(117, 140);
    b.ent('croc', 118, 2, { from: 117, to: 127, speed: 40 });
    b.rock(128, 0, 2, 3);
    b.ent('croc', 131, 2, { from: 130, to: 140, speed: 44, dir: -1, offset: 0.6 });
    b.ent('artifact', 129, 7, { id: 'a2', name: 'Dubois-tand' });
    b.ground(141, 158);
    b.crack(146, 3, 1, 4);
    b.ent('varaan', 152, 3);
    // Lavaveld onder vallende bommen: springen op rotsen
    b.lava(159, 200);
    const heights = [3, 4, 3, 4, 4, 3, 4, 3, 4, 3];
    heights.forEach((h, i) => b.rock(161 + i * 4, 0, 2, h));
    b.bouncy(177, 3, 2); b.ent('artifact', 178, 10, { id: 'a3', name: 'Sangiran-steen' });
    b.bones(165, 5, 2); b.bones(181, 5, 2); b.bones(193, 5, 2);
    b.ground(201, 235);
    b.ent('tree', 208, 3, { scale: 1.1 });
    b.ent('finish', 214, 3);
  },
};
