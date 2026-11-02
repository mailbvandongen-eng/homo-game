// Wereld 4 · Level 3: de Denisova-grot in het Altaj-gebergte.
// Nieuw: buiten is het ijskoud, binnen in de grot warm je op. Met de fakkel door het donker. Ontmoeting met de Denisovanen.
export default {
  id: '4-3', world: 4, name: 'De Denisova-grot',
  species: 'Neanderthaler (Homo neanderthalensis)', place: 'Denisova-grot, Altaj-gebergte (Siberië)', era: 'circa 50.000 jaar geleden',
  theme: 'cave', music: 'cave', look: 'neanderthalensis', tool: 'torch', fire: true, cold: true, coldTime: 40, phys: { walk: 152, run: 245 },
  width: 214, height: 15,
  dark: { from: 18, to: 186 },
  outside: { from: 188 },
  outsideTheme: 'snow',
  shelters: [[18, 186]],
  fact: 'In de Denisova-grot woonden afwisselend Neanderthalers en Denisovanen, soms misschien tegelijk. Uit een vingerbotje haalden onderzoekers in 2010 het DNA van een onbekende mensensoort. Later vonden ze een botje van "Denny", een meisje met een Neanderthaler als moeder en een Denisovaan als vader.',
  build(b) {
    b.ent('start', 3, 3);
    b.rock(16, 11, 172, 4);
    b.ground(0, 40);
    b.ent('checkpoint', 7, 3);
    b.ent('light', 17, 11);
    // De grot in
    b.bones(20, 4, 4);
    b.ent('bat', 25, 3, { alt: 4 }); b.ent('stalactite', 29, 11);
    b.ent('hyena', 36, 3);
    b.rock(39, 3, 2, 2);
    b.crumble(41, 2, 6); b.bones(41, 4, 6);
    b.ground(47, 84);
    b.ent('checkpoint', 50, 3);
    b.ent('stalactite', 57, 11); b.ent('stalactite', 61, 11);
    b.crack(65, 3, 1, 4);
    b.rock(69, 3, 2, 3); b.ent('artifact', 70, 8, { id: 'a1', name: 'Naald van bot' });
    b.ent('bat', 74, 3, { alt: 5 });
    b.bump(78, 6, 'shroom');
    // De Denisovanen, bij hun vuur
    b.ent('light', 92, 11); b.ent('light', 100, 11);
    b.ground(85, 112);
    b.ent('meet', 90, 3, { species: 'denisova', offsets: [0, 36, 70], sizes: [1, 0.96, 0.72] });
    b.ent('checkpoint', 104, 3);
    // Diep in de grot: de holenbeer en een ondergrondse poel
    b.water(113, 126);
    b.rock(115, 1, 3, 2); b.rock(119, 1, 3, 2); b.rock(123, 1, 3, 2);
    b.ground(127, 186);
    b.ent('bear', 138, 3);
    b.ent('stalactite', 146, 11); b.ent('stalactite', 150, 11);
    b.rock(155, 3, 2, 2); b.rock(158, 5, 2, 2); b.ent('artifact', 159, 9, { id: 'a2', name: 'Stenen armband' });
    b.ent('checkpoint', 165, 3);
    b.ent('hyena', 172, 3, { fast: true });
    b.rock(178, 3, 1, 3); b.ent('artifact', 178, 8, { id: 'a3', name: 'Het vingerbotje' });
    b.bump(170, 6, 'berry');
    // Naar buiten, de sneeuw in
    b.ground(187, 213);
    b.ent('checkpoint', 190, 3);
    b.ent('finish', 198, 3);
  },
};
