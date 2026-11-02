// Wereld 2 · Level 4: het vuur. Een grot in Zuid-Afrika, rond 1 miljoen jaar geleden.
// Hoofdidee: de fakkel in het donker. Leren (licht, dieren schrikken), oefenen (luipaard, stalactieten),
// verrassing (een roedel hyena's in het donker), finale (de leeuw). Kampvuren zijn checkpoints.
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

    // 1 · LEREN: de fakkel geeft licht, en dieren schrikken van een zwaai
    b.bones(16, 4, 4);
    b.ent('bat', 22, 3, { alt: 4 }); b.ent('stalactite', 27, 11);
    b.bump(31, 6, 'berry');
    b.ent('hyena', 35, 3);                              // zwaai met de fakkel: hij rent weg
    b.rock(39, 3, 2, 2);
    b.crumble(41, 2, 6); b.bones(41, 4, 6);
    b.ground(47, 79);

    // 2 · OEFENEN: een luipaard in het donker, een rij stalactieten, een doornkuil
    b.ent('leopard', 54, 3);
    b.ent('stalactite', 59, 11); b.ent('stalactite', 63, 11); b.ent('stalactite', 67, 11);
    b.rock(70, 3, 2, 3); b.ent('artifact', 71, 8, { id: 'a1', name: 'Verbrand bot' });
    b.ent('bat', 75, 3, { alt: 5 });
    b.ground(80, 83, 1); b.thorns(80, 1, 4);
    b.ground(84, 110);
    b.crack(89, 3, 1, 4);
    b.ent('bat', 94, 3, { alt: 5 });
    b.ent('checkpoint', 98, 3);

    // 3 · VERRASSING: een roedel hyena's in het donker. Zwaai, of vlucht omhoog.
    b.ent('hyena', 103, 3, { fast: true }); b.ent('hyena', 108, 3, { fast: true, dir: 1 }); b.ent('hyena', 112, 3);
    b.rock(104, 5, 2, 1); b.rock(107, 7, 2, 1); b.ent('artifact', 108, 9, { id: 'a2', name: 'As uit Wonderwerk' });
    b.water(111, 124);
    b.rock(112, 1, 3, 2); b.rock(116, 1, 3, 2); b.rock(120, 1, 3, 2);
    b.ent('stalactite', 117, 11);
    b.ground(125, 178);
    b.ent('leopard', 133, 3);
    b.ent('checkpoint', 140, 3);
    b.bump(143, 6, 'fig');                              // opladen voor de leeuw
    b.rock(146, 3, 1, 2); b.ent('artifact', 146, 6, { id: 'a3', name: 'Vuursteen-schrabber' });

    // 4 · FINALE: de arena van de leeuw
    b.rock(155, 6, 2, 1); b.rock(172, 6, 2, 1);
    b.ent('light', 158, 11); b.ent('light', 170, 11);
    b.ent('boss', 174, 3);
    b.rock(179, 3, 1, 8);
    b.ground(179, 211);
    b.ent('finish', 194, 3);
  },
};
