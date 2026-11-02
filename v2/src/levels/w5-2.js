// Wereld 5 · Level 2: de Blombos-grot aan de kust van Zuid-Afrika.
// Nieuw: schelpdieren aan de kust, drijfhout over de branding, en de oudste kunst: oker met krassen en kralen van schelpjes.
export default {
  id: '5-2', world: 5, name: 'De Blombos-grot',
  species: 'Homo sapiens', place: 'Blombos-grot, kust van Zuid-Afrika', era: 'circa 75.000 jaar geleden',
  theme: 'coast', music: 'coast', look: 'sapiens', tool: 'spear', fire: true, phys: { walk: 158, run: 255 },
  width: 226, height: 17,
  fact: 'In de Blombos-grot, hoog boven de zee in Zuid-Afrika, vonden onderzoekers stukjes rode oker met ingekraste ruitjes, kralen van slakkenhuisjes met gaatjes en een "verfpot" van een schelp. Ze zijn zo\'n 75.000 jaar oud. Het laat zien dat mensen toen al symbolen maakten en zich versierden. De bewoners aten veel schelpdieren, vis en zeehonden.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 26);
    b.ent('checkpoint', 8, 3);
    b.ent('tree', 12, 3, { scale: 0.8 });
    b.bones(15, 5, 3);
    b.bump(20, 6, 'berry');
    // A · Rotsen in de branding
    b.water(27, 42, 2);
    b.rock(29, 1, 3, 3); b.rock(34, 1, 3, 4); b.rock(39, 1, 2, 3);
    b.bones(29, 6, 3); b.bones(34, 7, 3); b.bones(39, 6, 2);
    b.ground(43, 74);
    b.ent('checkpoint', 46, 3);
    b.ent('snake', 54, 3);
    b.rock(60, 3, 2, 3); b.ent('artifact', 61, 8, { id: 'a1', name: 'Kralen van slakkenhuisjes' }); b.rock(61, 6, 1, 1);
    // B · Drijfhout over een inham
    b.water(75, 88);
    b.ent('log', 76, 2, { from: 75, to: 88, len: 3, speed: 46 });
    b.bones(78, 6, 4);
    b.ground(89, 120);
    b.bump(104, 6, 'berry');
    b.bump(95, 6, 'honey');
    // C · Omhoog naar de grot in de kalksteenrots
    b.climb(110, 3, 1, 6, 'rock'); b.ground(111, 120, 9);
    b.ent('checkpoint', 113, 9);
    b.ent('boulder', 118, 15, { every: 2.4 });
    b.crumble(121, 8, 4); b.ground(125, 140, 9);
    b.ent('leopard', 133, 9);
    b.rock(138, 9, 2, 3); b.ent('artifact', 139, 14, { id: 'a2', name: 'Oker met ingekraste ruitjes' }); b.rock(139, 12, 1, 1);
    b.ground(141, 146, 6); b.ground(147, 150, 3); b.ground(151, 225);
    b.ent('checkpoint', 154, 3);
    // D · Langs de kust: hyena's en nog een inham
    b.ent('hyena', 164, 3);
    b.bump(170, 6, 'shroom');
    b.water(176, 186); b.ent('log', 177, 2, { from: 176, to: 186, len: 3, speed: 50, offset: 0.4 });
    b.ground(187, 225);
    b.ent('hyena', 196, 3, { fast: true });
    b.rock(201, 3, 2, 3); b.ent('artifact', 202, 8, { id: 'a3', name: 'Verfpot van een schelp' }); b.rock(202, 6, 1, 1);
    b.ent('checkpoint', 204, 3);
    b.ent('finish', 214, 3);
  },
};
