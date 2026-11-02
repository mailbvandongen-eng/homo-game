// Wereld 2 · Level 2: buiten Afrika. Dmanisi in Georgië, op een heuvel tussen twee rivieren.
// Hoofdidee: de wind. Leren (wind tegen op vlakke grond), oefenen (wind tegen boven kuilen),
// verrassing (wind mee over een kloof van 7 breed), finale (alles samen).
export default {
  id: '2-2', world: 2, name: 'Buiten Afrika',
  species: 'Homo erectus', place: 'Dmanisi, Georgië', era: 'circa 1,8 miljoen jaar geleden',
  theme: 'dmanisi', music: 'dmanisi', look: 'erectus', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 232, height: 17,
  wind: [
    { from: 44, to: 66, dir: -1, strength: 420, period: 5.5 },               // leren: wind tegen op vlakke grond
    { from: 70, to: 98, dir: -1, strength: 480, period: 5.5, offset: 1 },    // oefenen: wind tegen boven kuilen
    { from: 146, to: 160, dir: 1, strength: 520, period: 5 },                // verrassing: wind mee over een brede kloof
    { from: 174, to: 202, dir: -1, strength: 480, period: 5, offset: 2 },    // finale
  ],
  build(b) {
    b.ent('start', 3, 3);

    // 1 · LEREN: de wolf, de rotswand, en de eerste windstoten op vlakke grond
    b.ground(0, 34);
    b.ent('tree', 9, 3, { scale: 0.9 });
    b.bones(6, 4, 3);
    b.bump(14, 6, 'berry');
    b.ent('wolf', 19, 3);                               // nieuw: de wolf, sneller dan een hyena
    b.climb(22, 3, 1, 7, 'rock'); b.ground(23, 40, 10);
    b.bones(26, 11, 4);
    b.ent('wolf', 33, 10);
    b.ground(41, 43, 9); b.ground(44, 66, 7);
    b.bump(55, 10, 'flint');
    b.bones(47, 8, 3); b.bones(58, 8, 3);

    // 2 · OEFENEN: wind tegen boven kuilen. Wacht op de stilte, dan springen.
    b.bones(67, 9, 3, { arc: 0.8 });
    b.ground(70, 80, 7); b.ent('wolf', 76, 7);
    b.bones(81, 9, 3, { arc: 0.8 });
    b.ground(84, 90, 7); b.ent('wolf', 88, 7, { fast: true });
    b.crumble(85, 10, 3); b.ent('artifact', 86, 12, { id: 'a1', name: 'Dmanisi-afslag' });
    b.bones(91, 9, 3, { arc: 0.8 });
    b.ground(94, 100, 7);
    b.ent('vulture', 96, 7, { alt: 5 });
    b.ent('checkpoint', 98, 7);
    b.ground(101, 106, 4);
    b.water(107, 122);
    b.ent('log', 108, 2, { from: 107, to: 114, len: 4, speed: 44 });
    b.rock(115, 0, 2, 3);
    b.ent('log', 118, 2, { from: 117, to: 122, len: 3, speed: 52, offset: 0.5 });

    // 3 · VERRASSING: de sabeltandkat, en dan wind in je rug over een kloof van 7 breed
    b.ground(123, 152);
    b.rock(129, 3, 2, 2); b.bones(129, 6, 2);
    b.ent('sabre', 135, 3);                             // nieuw: de sabeltandkat ligt op de loer
    b.crack(140, 3, 1, 3); b.rock(140, 6, 1, 3);
    b.bump(144, 6, 'honey');
    b.ent('sign', 147, 3, { text: 'Wacht op de wind in je rug, en spring!' });
    b.bones(153, 7, 7, { arc: 1.4 });
    b.ent('artifact', 157, 10, { id: 'a2', name: 'Basaltkern' });
    b.ground(160, 172);

    // 4 · FINALE: wind tegen, kuilen, snelle wolven en een sabeltandkat bij het kamp
    b.bones(173, 5, 3, { arc: 0.8 });
    b.ground(176, 186); b.ent('wolf', 181, 3, { fast: true });
    b.bump(178, 6, 'fig');
    b.bones(187, 5, 3, { arc: 0.8 });
    b.ground(190, 198); b.ent('wolf', 195, 3, { fast: true });
    b.bones(199, 6, 3, { arc: 0.8 });
    b.ground(202, 231, 5);
    b.rock(205, 5, 1, 2); b.ent('artifact', 205, 8, { id: 'a3', name: 'Schraapsteen' });
    b.crack(208, 5, 1, 3); b.rock(208, 8, 1, 2);
    b.ent('sabre', 215, 5);
    b.ent('finish', 222, 5);
  },
};
