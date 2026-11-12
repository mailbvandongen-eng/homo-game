// De dieren van het spel, elk met de tijd en het werelddeel waarin ze leefden.
// ma = [oudste, jongste] in miljoenen jaren geleden (0 = leeft nog). Een gebied mag alleen soorten gebruiken
// waarvan tijd en plaats kloppen; tools/check-eras.mjs controleert dat.
// zeker: 'vast' = fossielen uit deze streek en tijd; 'aannemelijk' = verwante vorm of afgeleid.
export const SPECIES = {
  hominin: { name: 'Vreemden', latin: 'Homo habilis / Paranthropus boisei', ma: [2.4, 1.2], regions: ['Oost-Afrika'], zeker: 'vast', note: 'Meerdere mensachtigen leefden naast elkaar bij Olduvai en Koobi Fora.' },
  impala: { name: 'Impala', latin: 'Aepyceros', ma: [6, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast' },
  gazelle: { name: 'Gazelle', latin: 'Gazella / Eudorcas', ma: [5, 0], regions: ['Oost-Afrika', 'Noord-Afrika', 'West-Azië'], zeker: 'vast' },
  zebra: { name: 'Zebra', latin: 'Equus oldowayensis', ma: [2.3, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', note: 'Echte paarden (Equus) bereikten Afrika rond 2,3 miljoen jaar geleden. Het streeppatroon is een aanname.' },
  hyena: { name: 'Gevlekte hyena', latin: 'Crocuta', ma: [3.5, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', note: 'Vroege Crocuta-soorten, verwant aan de gevlekte hyena van nu.' },
  sabre: { name: 'Sabeltandkat', latin: 'Megantereon / Dinofelis / Homotherium', ma: [4.5, 1.0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast' },
  leopard: { name: 'Luipaard', latin: 'Panthera pardus', ma: [2.0, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'aannemelijk', note: 'Luipaardachtige katten zijn bekend uit Olduvai Bed I; de vroegste vondsten zijn schaars.' },
  puffadder: { name: 'Pofadder', latin: 'Bitis', ma: [2.0, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika'], zeker: 'vast', note: 'Bitis olduvaiensis is beschreven uit Olduvai.' },
  giant: { name: 'Reuzenolifant', latin: 'Palaeoloxodon recki', ma: [3.5, 0.6], regions: ['Oost-Afrika'], zeker: 'vast' },
  vulture: { name: 'Gier', latin: 'Gyps e.a.', ma: [5, 0], regions: ['Oost-Afrika', 'Zuidelijk Afrika', 'Europa', 'West-Azië'], zeker: 'aannemelijk' },
};
