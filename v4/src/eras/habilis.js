// Tijdperk 1: Homo habilis, Oldowan. Oost-Afrika, ruwweg 2,4 tot 1,65 miljoen jaar geleden.
// Alles wat bij dit tijdperk hoort staat hier: wie je bent, waar je bent, en wat de groep van je vraagt.
// 'zeker' geeft per onderdeel aan hoe stevig het staat, in vier treden:
//   vast = vastgesteld door vondsten · aannemelijk = sterk aannemelijk, afgeleid uit vondsten
//   onzeker = onderzoekers zijn het oneens of bewijs ontbreekt · artistiek = onze eigen invulling voor het spel
// 'beeld' zegt eerlijk hoe goed het model van de mens zelf past (zie ook species.js).
import { savanne } from '../areas/savanne.js';
import { water } from '../areas/water.js';

export const habilis = {
  id: 'habilis', ma: [2.4, 1.65], region: 'Oost-Afrika', species: 'Homo habilis', tradition: 'Oldowan', when: 'ca. 2,4 – 1,65 miljoen jaar geleden', where: 'Oost-Afrika (Riftvallei)',
  playable: true,
  body: { height: 1.35, speed: 1, shape: 'habilis' },
  zeker: {
    vast: ['afslagen en kernen van keien (Oldowan)', 'snijsporen op botten: vlees van grote dieren', 'botten gekraakt voor merg', 'grote katten, hyena\'s, zebra-achtigen en de reuzenolifant Palaeoloxodon recki in hetzelfde landschap'],
    aannemelijk: ['aas halen bij de prooi van grote katten', 'eten delen in een kleine groep', 'stenen gooien om roofdieren op afstand te houden', 'honing, eieren, bessen en bladeren als voedsel', 'knollen opgraven met een aangepunte stok (hout blijft zelden bewaard)', 'vis grijpen in opdrogende poelen (meervalresten met snijsporen, Koobi Fora)', 'slapen in of bij bomen'],
    onzeker: ['wie de Oldowan-werktuigen maakte: Homo habilis is de gangbare kandidaat, maar de oudste werktuigen zijn ouder dan de soort', 'een huid als draagvel (huiden vergaan; dragen is niet te bewijzen)', 'een huid om de schouders tegen de kou', 'bitterblad als geneesmiddel (mensapen doen het; bij vroege mensen is het niet aangetoond)'],
    artistiek: ['namen en vaste rollen in de groep', 'huidskleur, beharing, gezicht en stem', 'de kleuren en strepen van uitgestorven dieren', 'het precieze landschap: het is een beeld van de Riftvallei, geen kaart van één vindplaats'],
  },
  beeld: { past: 'aangepast', note: 'Er bestaat geen vrij model van Homo habilis. Het lichaam is een model van een neanderthaler dat is omgevormd: kortere benen, langere armen, een kleinere hersenpan en een gezicht dat naar voren steekt. Huid, haar en gezichtstrekken blijven een invulling.' },
  areas: [savanne, water],
};
