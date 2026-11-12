// De dieren van het spel, elk met de tijd en het werelddeel waarin ze leefden.
// ma = [oudste, jongste] in miljoenen jaren geleden (0 = leeft nog). Een gebied mag alleen soorten gebruiken
// waarvan tijd en plaats kloppen; tools/check-eras.mjs controleert dat.
// zeker: 'vast' = fossielen uit deze streek en tijd; 'aannemelijk' = verwante vorm of afgeleid.
// beeld: hoe goed het model in het spel bij de soort past.
//   'reconstructie' = gemaakt als deze (uitgestorven) soort · 'verwant' = een levende verwant die er sterk op lijkt
//   'vervanger' = een ander dier dat de plek inneemt tot er een eigen model is (staat op de lijst voor fase 3)
export const SPECIES = {
  hominin: { name: 'Vreemden', latin: 'Homo habilis / Paranthropus boisei', ma: [2.4, 1.2], regions: ['Oost-Afrika'], zeker: 'vast', beeld: 'vervanger', beeldNote: 'Model van een neanderthaler, verkleind.', note: 'Meerdere mensachtigen leefden naast elkaar bij Olduvai en Koobi Fora.' },
  impala: { name: 'Impala', latin: 'Aepyceros', ma: [6, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', beeld: 'vervanger', beeldNote: 'Het model is een gazelle; een impala is groter, met liervormige hoorns.' },
  gazelle: { name: 'Gazelle', latin: 'Gazella / Eudorcas', ma: [5, 0], regions: ['Oost-Afrika', 'Noord-Afrika', 'West-Azië'], zeker: 'vast', beeld: 'verwant', beeldNote: 'Model van een gazelle van nu.' },
  zebra: { name: 'Zebra', latin: 'Equus oldowayensis', ma: [2.3, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', beeld: 'verwant', beeldNote: 'Model van een zebra van nu. Equus oldowayensis was groter; het streeppatroon is een aanname.', note: 'Echte paarden (Equus) bereikten Afrika rond 2,3 miljoen jaar geleden. Het streeppatroon is een aanname.' },
  hyena: { name: 'Gevlekte hyena', latin: 'Crocuta', ma: [3.5, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', beeld: 'verwant', beeldNote: 'Model van de gevlekte hyena van nu.', note: 'Vroege Crocuta-soorten, verwant aan de gevlekte hyena van nu.' },
  sabre: { name: 'Sabeltandkat', latin: 'Megantereon / Dinofelis / Homotherium', ma: [4.5, 1.0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', beeld: 'reconstructie', beeldNote: 'Model van een sabeltandkat, niet van één bepaalde soort.' },
  leopard: { name: 'Luipaard', latin: 'Panthera pardus', ma: [2.0, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'aannemelijk', beeld: 'verwant', beeldNote: 'Model van een luipaard van nu.', note: 'Luipaardachtige katten zijn bekend uit Olduvai Bed I; de vroegste vondsten zijn schaars.' },
  puffadder: { name: 'Pofadder', latin: 'Bitis', ma: [2.0, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', beeld: 'vervanger', beeldNote: 'Het model is een cobra-achtige slang; een pofadder is kort en dik, met een brede kop.', note: 'Bitis olduvaiensis is beschreven uit Olduvai.' },
  giant: { name: 'Reuzenolifant', latin: 'Palaeoloxodon recki', ma: [3.5, 0.6], regions: ['Oost-Afrika'], zeker: 'vast', beeld: 'vervanger', beeldNote: 'Het model is een Afrikaanse olifant, ruim twee keer vergroot. Palaeoloxodon recki had een hoge, korte schedel met een wal op het voorhoofd en langere, rechtere slagtanden.' },
  croc: { name: 'Krokodil', latin: 'Crocodylus anthropophagus', ma: [1.9, 1.7], regions: ['Oost-Afrika'], zeker: 'vast', beeld: 'vervanger', beeldNote: 'Getekend uit eenvoudige vormen, geen echt model; Crocodylus anthropophagus had richels boven de ogen.', note: 'Beschreven uit Olduvai; bijtsporen op botten van mensachtigen uit dezelfde lagen.' },
  catfish: { name: 'Meerval', latin: 'Clarias', ma: [5, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika', 'Noord-Afrika'], zeker: 'vast', beeld: 'vervanger', beeldNote: 'Getekend uit eenvoudige vormen, geen echt model.', note: 'Meervalresten met snijsporen bij Koobi Fora (ca. 1,95 miljoen jaar).' },
  vulture: { name: 'Gier', latin: 'Gyps e.a.', ma: [5, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika', 'Europa', 'West-Azië'], zeker: 'aannemelijk', beeld: 'verwant', beeldNote: 'Model van een Himalayagier (Gyps); verwant aan de Afrikaanse gieren.' },
};
