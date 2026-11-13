// Tijdperk 2: Homo erectus, Acheuléen. Oost-Afrika, ruwweg 1,5 miljoen jaar geleden.
// Een andere groep, honderdduizenden jaren na die van Tor: langer, met lange benen, en met twee nieuwe dingen:
// de vuistbijl (rondom bewerkt, niet zomaar een scherf) en vuur. Dat vuur maak je niet: je vindt het en houdt het in leven.
// 'zeker' geeft per onderdeel aan hoe stevig het staat, in vier treden:
//   vast = vastgesteld door vondsten · aannemelijk = sterk aannemelijk, afgeleid uit vondsten
//   onzeker = onderzoekers zijn het oneens of bewijs ontbreekt · artistiek = onze eigen invulling voor het spel
// 'beeld' zegt eerlijk hoe goed het model van de mens zelf past (zie ook species.js).
import { berg } from '../areas/berg.js';
import { hoog } from '../areas/hoog.js';

export const erectus = {
  id: 'erectus', ma: [1.9, 0.11], region: 'Oost-Afrika', species: 'Homo erectus', tradition: 'Acheuléen',
  when: 'vanaf ca. 1,9 miljoen jaar geleden; vuistbijlen vanaf ca. 1,76 miljoen', where: 'Oost-Afrika, later Eurazië',
  playable: true,
  body: { height: 1.6, speed: 1.15, shape: 'erectus' },      // langer en met langere benen: een loper (habilis: 1,35 m)
  tech: ['axe', 'fire'],                   // wat in dit tijdperk te ontdekken valt
  // De groep. De eerste drie hebben een vaste rol in het spel: tor = de oudste, kem = de helper die meeloopt, ibo = het kind.
  group: [
    { id: 'tor', name: 'Oru', k: 0.99, spot: [2.8, -1.6], grey: true },
    { id: 'kem', name: 'Dak', k: 0.95, spot: [-2.4, 2.2], tint: 0xe8d2c0 },
    { id: 'ibo', name: 'Mio', k: 0.6, spot: [1.0, -3.0], child: true, tint: 0xfff0e0 },
    { id: 'sen', name: 'Sen', k: 0.9, woman: true, spot: [-3.0, -1.4], tint: 0xf0dcc8, look: 'Sen kent elke struik en elke knol in de wijde omtrek. Ze kijkt lang in de vlammen.', hint: 'Zij is degene die vlees boven het vuur houdt.' },
    { id: 'bala', name: 'Bala', k: 0.86, woman: true, spot: [3.4, 2.0], tint: 0xdcc4b0, look: 'Bala is de sterkste loper van de groep. Ze ziet een gier eerder dan wie ook.', hint: 'Met meer mensen zie je meer, draag je meer en schrik je meer af.' },
  ],
  // Teksten uit de motor die nog de oude groep noemen, krijgen hier hun nieuwe naam.
  words: [['Kleine Ibo', 'Kleine Mio'], ['Tor', 'Oru'], ['Kem', 'Dak'], ['Ibo', 'Mio'], ['de slaapboom', 'het kamp'], ['De slaapboom', 'Het kamp']],
  zeker: {
    vast: ['vuistbijlen: keien die rondom en aan twee kanten bewerkt zijn (Acheuléen, vanaf ca. 1,76 miljoen jaar, Kokiselei bij het Turkanameer)',
      'een lang lichaam met lange benen en korte armen (de jongen van Nariokotome, ca. 1,6 miljoen jaar)',
      'snijsporen en gekraakte botten van grote dieren',
      'goede steen ver meedragen: obsidiaan van Balchit in de werktuigen van Melka Kunture, kilometers verderop (Ethiopisch hoogland, vanaf ca. 1,5 miljoen jaar)', 'sabeltandkatten, hyena\'s en de reuzenolifant in hetzelfde landschap'],
    aannemelijk: ['vuur meenemen van een natuurlijke brand en brandend houden: verkleurde aarde en verhitte stenen bij Koobi Fora en Chesowanja (ca. 1,5 miljoen jaar) wijzen erop, onomstreden is vuurgebruik pas vanaf ca. 1 miljoen jaar (Wonderwerkgrot)',
      'weinig lichaamshaar en zweten: lang kunnen lopen in de hitte', 'op de grond slapen in plaats van in bomen', 'grotere groepen dan bij Homo habilis', 'hout hakken en bewerken met een vuistbijl (slijtsporen van hout op vuistbijlen)',
      'een dier moe lopen in de middaghitte (uithoudingsjacht): het past bij het lange, zwetende lichaam, maar vondsten die het bewijzen zijn er niet'],
    onzeker: ['vlees braden in deze tijd (de kookhypothese)', 'gloeiend hout dagenlang meedragen naar een nieuw kamp', 'vuur dat roofdieren op afstand houdt'],
    artistiek: ['een vaste stookplaats met een kring van stenen', 'namen en vaste rollen in de groep', 'huidskleur, beharing, gezicht en stem', 'de kleuren en strepen van uitgestorven dieren'],
  },
  beeld: { past: 'aangepast', note: 'Er bestaat geen vrij model van Homo erectus. Het lichaam is een model van een neanderthaler dat is omgevormd: langere benen, een smaller lijf, slankere armen en benen en een lage, lange schedel met een zware wenkbrauwboog. Huid, haar en gezichtstrekken blijven een invulling.' },
  areas: [berg, hoog],
};
