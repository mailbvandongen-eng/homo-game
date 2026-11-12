// Tijdperk 1: Homo habilis, Oldowan. Oost-Afrika, ruwweg 2,4 tot 1,65 miljoen jaar geleden.
// Alles wat bij dit tijdperk hoort staat hier: wie je bent, waar je bent, en wat de groep van je vraagt.
// 'zeker' geeft per onderdeel aan hoe stevig het staat: vast (vondsten), aannemelijk (afgeleid) of gok (spelkeuze).
import { savanne } from '../areas/savanne.js';
import { water } from '../areas/water.js';

export const habilis = {
  id: 'habilis', ma: [2.4, 1.65], region: 'Oost-Afrika', species: 'Homo habilis', tradition: 'Oldowan', when: 'ca. 2,4 – 1,65 miljoen jaar geleden', where: 'Oost-Afrika (Riftvallei)',
  playable: true,
  zeker: {
    vast: ['afslagen en kernen van keien (Oldowan)', 'snijsporen op botten: vlees van grote dieren', 'botten gekraakt voor merg', 'grote katten, hyena\'s, zebra-achtigen en de reuzenolifant Palaeoloxodon recki in hetzelfde landschap'],
    aannemelijk: ['aas halen bij de prooi van grote katten', 'eten delen in een kleine groep', 'stenen gooien om roofdieren op afstand te houden', 'honing, eieren, bessen en bladeren als voedsel', 'knollen opgraven met een aangepunte stok (hout blijft zelden bewaard)', 'vis grijpen in opdrogende poelen (meervalresten met snijsporen, Koobi Fora)', 'slapen in of bij bomen'],
    gok: ['een huid als draagvel', 'een huid om de schouders tegen de kou', 'bitterblad als geneesmiddel', 'namen en vaste rollen in de groep'],
  },
  areas: [savanne, water],
};
