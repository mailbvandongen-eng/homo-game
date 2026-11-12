// De tijdlijn van het spel. Dit is een spelvolgorde, geen stamboom: soorten leefden deels naast elkaar,
// en een overgang is een sprong in de tijd naar een andere groep, niet één mens die verandert.
// Een nieuw tijdperk toevoegen = een bestand zoals habilis.js maken en het hier inhangen.
import { habilis } from './habilis.js';
import { erectus } from './erectus.js';
import { Save } from '../save.js';

export const ERAS = [
  habilis,
  erectus,
  { id: 'neanderthal', species: 'Homo neanderthalensis', tradition: 'Middenpaleolithicum (Moustérien)', when: 'ca. 400.000 – 40.000 jaar geleden', where: 'Europa en West-Azië', playable: false },
  { id: 'sapiens', species: 'Homo sapiens', tradition: 'Laatpaleolithicum', when: 'soort vanaf ca. 300.000 jaar geleden; Laatpaleolithicum ca. 50.000 – 12.000', where: 'Afrika, daarna de hele wereld', playable: false },
  { id: 'neolithic', species: 'Homo sapiens', tradition: 'Neolithische revolutie', when: 'vanaf ca. 11.700 jaar geleden', where: 'Vruchtbare Halvemaan, later Europa', playable: false },
  { id: 'industrial', species: 'Homo sapiens', tradition: 'Industriële revolutie', when: 'ca. 1760 – 1840', where: 'Noordwest-Europa', playable: false },
  { id: 'modern', species: 'Homo sapiens', tradition: 'Moderne en toekomstige mens', when: 'nu en later', where: 'overal', playable: false },
];
// Waar je bent staat in het bewaarde spel. Een gebied wisselen = bewaren en de pagina opnieuw opbouwen,
// zodat de wereld altijd uit één gebiedsbestand komt en er niets van het vorige blijft hangen.
const saved = Save.read();
// ?gebied=water: alleen om te testen; begint zonder bewaard spel in dat gebied (in welk tijdperk het ook ligt)
const pick = typeof location !== 'undefined' && /[?&]gebied=(\w+)/.exec(location.search);
export const ERA = ERAS.find((e) => e.playable && (pick ? e.areas.some((a) => a.playable && a.id === pick[1]) : saved && e.id === saved.era)) || habilis;   // het tijdperk dat nu gespeeld wordt
export const AREA = ERA.areas.find((a) => a.playable && (pick ? a.id === pick[1] : saved && a.id === saved.area)) || ERA.areas[0];
