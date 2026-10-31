// Wereld 3 · Level 3: de Sima de los Huesos, de "put van de botten".
// Nieuw: een diepe afdaling door een donkere schacht, met richels, brokkelrots, druipsteen, vleermuizen en holenberen.
export default {
  id: '3-3', world: 3, name: 'De put van de botten',
  species: 'Homo heidelbergensis', place: 'Sima de los Huesos, Atapuerca', era: 'circa 430.000 jaar geleden',
  theme: 'cave', music: 'deep', look: 'heidelbergensis', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 176, height: 40,
  dark: { from: 8, to: 150 },
  outside: { from: 150 }, outsideTheme: 'hills', finishScene: 'shelter',
  fact: 'Onderin de Sima de los Huesos liggen botten van minstens 28 mensen, en van meer dan 160 holenberen. Tussen de mensenbotten lag één handbijl van rode kwartsiet, bijgenaamd "Excalibur". Sommige onderzoekers denken dat de doden hier bewust zijn neergelegd; anderen denken aan een ongeluk of aan water dat ze meevoerde.',
  build(b) {
    // Alles is rots; de gangen worden uitgehakt
    b.rock(0, 0, 176, 40);
    b.ent('start', 3, 33);
    b.clear(0, 30, 33, 39);             // ingang bovenin
    b.ent('light', 4, 40); b.ent('light', 20, 40);
    b.bones(8, 34, 3);
    // A · De schacht: richels links en rechts, steeds dieper
    b.clear(18, 44, 4, 36);
    b.rock(18, 29, 6, 1); b.rock(35, 25, 7, 1); b.rock(18, 21, 7, 1); b.crumble(29, 17, 6); b.rock(36, 13, 6, 1); b.rock(18, 9, 9, 1);
    b.ent('bat', 30, 26, { alt: 3 }); b.ent('bat', 26, 15, { alt: 3 });
    b.ent('stalactite', 34, 36); b.ent('stalactite', 24, 32);
    b.bones(20, 30, 3); b.bones(40, 26, 3); b.bones(20, 22, 3); b.bones(40, 14, 3);
    b.ent('artifact', 21, 10, { id: 'a1', name: 'Berentand' });
    b.ent('light', 31, 40);
    b.ent('bear', 41, 3);
    // B · De gang onderin, naar de botkamer
    b.clear(44, 120, 3, 9);
    b.ent('checkpoint', 48, 3);
    b.rock(56, 3, 2, 2); b.ent('stalactite', 62, 9); b.ent('stalactite', 66, 9);
    b.water(70, 82, 3); b.rock(71, 1, 4, 2); b.rock(77, 1, 4, 2);
    b.ent('bat', 76, 3, { alt: 3 });
    b.ent('bear', 92, 3, { dir: -1 });
    b.crack(100, 3, 1, 4);
    b.ent('fig', 96, 4);
    // C · De botkamer met Excalibur
    b.clear(104, 120, 3, 14);
    b.rock(106, 6, 3, 1); b.rock(111, 9, 3, 1); b.rock(116, 12, 3, 1);
    b.ent('artifact', 117, 13, { id: 'a2', name: 'Excalibur' });
    b.bones(106, 7, 3); b.bones(111, 10, 3);
    b.ent('light', 112, 40);
    b.ent('checkpoint', 121, 3);
    // D · Omhoog naar buiten: rotstreden en een brokkelbrug
    b.clear(120, 150, 3, 16);
    b.rock(125, 3, 4, 3); b.rock(129, 3, 4, 6); b.rock(133, 3, 3, 9); b.crumble(136, 11, 8);
    b.ent('bat', 134, 8, { alt: 3 });
    b.ent('artifact', 142, 15, { id: 'a3', name: 'Rode kwartsiet' });
    b.rock(144, 3, 6, 12);
    b.clear(144, 175, 15, 39);
    b.ground(144, 175, 15);
    b.ent('finish', 156, 15);
  },
};
