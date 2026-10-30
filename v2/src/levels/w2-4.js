// Wereld 2 · Level 4: het vuur. Een grot in Zuid-Afrika, rond 1 miljoen jaar geleden.
// Nieuw: de fakkel (licht in het donker, dieren schrikken van een zwaai), kampvuren als checkpoint.
// Ontmoeting met Paranthropus robustus. Eindbaas: een leeuw.
export default {
  id: '2-4', world: 2, name: 'Het vuur',
  species: 'Homo erectus', place: 'Swartkrans en de Wonderwerk-grot (Zuid-Afrika)', era: 'circa 1 miljoen jaar geleden',
  theme: 'cave', music: 'fire', look: 'erectus', tool: 'torch', fire: true, phys: { walk: 158, run: 255 },
  width: 212, height: 15,
  dark: { from: 14, to: 186 },
  outside: { from: 186 },
  outsideTheme: 'dusk',
  boss: 'lion',
  arena: { x1: 150, x2: 178, trigger: 153, gate: 149, gateRows: [3, 4, 5, 6, 7, 8, 9, 10], exit: 179, exitRows: [3, 4, 5, 6, 7, 8, 9, 10], ceil: 11 },
  fact: 'In de Wonderwerk-grot zijn as en verbrande botten gevonden van circa 1 miljoen jaar oud: het oudste breed aanvaarde bewijs dat mensen vuur gebruikten. Ook in Swartkrans liggen verbrande botten, maar daar wordt nog over gediscussieerd. Vuur gaf warmte, licht, bescherming en gekookt eten.',
  build(b) {
    b.ent('start', 3, 3);
    b.rock(12, 11, 175, 4);
    b.ground(0, 40);
    b.ent('meet', 7, 3, { species: 'robustus', offsets: [0, 40], sizes: [1, 0.8] });
    b.ent('light', 13, 11);
    // De grot in, met de fakkel
    b.bones(16, 4, 4);
    b.ent('bat', 22, 3, { alt: 4 }); b.ent('stalactite', 26, 11);
    b.ent('checkpoint', 30, 3);
    b.ent('hyena', 36, 3);
    b.rock(39, 3, 2, 2);
    b.crumble(41, 2, 6); b.bones(41, 4, 6);
    b.ground(47, 75);
    b.ent('leopard', 55, 3);
    b.ent('stalactite', 60, 11); b.ent('stalactite', 64, 11);
    b.rock(67, 3, 2, 3); b.ent('artifact', 68, 8, { id: 'a1', name: 'Verbrand bot' });
    b.ent('bat', 71, 3, { alt: 5 });
    b.ent('checkpoint', 74, 3);
    b.ground(76, 80, 1); b.thorns(76, 1, 5);
    b.ground(81, 110);
    b.crack(86, 3, 1, 4);
    b.ent('hyena', 92, 3, { fast: true }); b.ent('hyena', 97, 3, { fast: true, dir: 1 });
    b.rock(101, 5, 2, 1); b.rock(104, 7, 2, 1); b.ent('artifact', 105, 9, { id: 'a2', name: 'As uit Wonderwerk' });
    b.ent('stalactite', 108, 11);
    b.water(111, 124);
    b.rock(113, 1, 3, 2); b.rock(117, 1, 3, 2); b.rock(121, 1, 3, 2);
    b.ground(125, 178);
    b.ent('leopard', 133, 3);
    b.ent('checkpoint', 140, 3);
    b.ent('fig', 144, 4);
    b.rock(145, 3, 1, 2); b.ent('artifact', 145, 6, { id: 'a3', name: 'Vuursteen-schrabber' });
    // Arena van de leeuw
    b.rock(155, 6, 2, 1); b.rock(172, 6, 2, 1);
    b.ent('light', 158, 11); b.ent('light', 170, 11);
    b.ent('boss', 174, 3);
    b.rock(179, 3, 1, 8);
    // Naar buiten, de schemering in
    b.ground(179, 211);
    b.ent('finish', 194, 3);
  },
};
