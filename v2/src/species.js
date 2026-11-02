// Mensachtigen die je in het spel tegenkomt. Teksten zijn bewust voorzichtig
// geformuleerd: waar de wetenschap het niet zeker weet, zeggen we dat ook.
export const SPECIES = {
  habilis: {
    name: 'Homo habilis', nick: '"Handige mens"',
    when: 'circa 2,4 – 1,6 miljoen jaar geleden', where: 'Oost-Afrika',
    text: 'Maakte Oldowan-werktuigen: scherpe afslagen van keien, waarmee ook vlees van botten werd gesneden. Of habilis een directe voorouder van latere mensen is, staat niet vast.',
    look: {},
  },
  boisei: {
    name: 'Paranthropus boisei', nick: '"Notenkraker-mens"',
    when: 'circa 2,3 – 1,2 miljoen jaar geleden', where: 'Oost-Afrika',
    text: 'Leefde tegelijk en op dezelfde plekken als Homo habilis. Enorme kiezen en een kam op de schedel voor sterke kauwspieren. At vooral grassen, zegges en knollen. Een zijtak die uitstierf, geen voorouder van ons.',
    look: { fur: '#4a3326', hair: '#2a1a10', skin: '#7a5236', limb: '#6a4630', crest: true, size: 1.02 },
  },
  rudolfensis: {
    name: 'Homo rudolfensis', nick: '"Mens van het Rudolfmeer"',
    when: 'circa 2,4 – 1,8 miljoen jaar geleden', where: 'Oost-Afrika (Turkanameer)',
    text: 'Leefde tegelijk met habilis, onder meer bij het Turkanameer (vroeger Rudolfmeer). Groter brein en een plat, lang gezicht. Bekendste vondst: schedel KNM-ER 1470 uit 1972. Of het echt een aparte soort is, wordt nog steeds besproken.',
    look: { fur: '#7a5a3e', hair: '#3e2a1a', skin: '#b07c52', limb: '#946240', flat: true, size: 1.06 },
  },
  robustus: {
    name: 'Paranthropus robustus', nick: '"Robuuste mensaap-mens"',
    when: 'circa 2 – 1 miljoen jaar geleden', where: 'Zuid-Afrika',
    text: 'Leefde in Zuid-Afrika tegelijk met vroege Homo, onder meer bij Swartkrans. Net als boisei: grote kiezen en een schedelkam. In Swartkrans ligt ook een schedel van robustus met twee gaatjes: tandafdrukken van een luipaard.',
    look: { fur: '#5a3e2c', hair: '#2e1d12', skin: '#8a6040', limb: '#74503a', crest: true, size: 0.98 },
  },
  heidelbergensis: {
    name: 'Homo heidelbergensis', nick: '"Mens van Heidelberg"',
    when: 'circa 700.000 – 200.000 jaar geleden', where: 'Afrika en Europa',
    text: 'Groot en sterk, met een flink brein. Genoemd naar een kaak uit Mauer bij Heidelberg (1907). Welke fossielen bij deze soort horen wordt veel besproken; sommigen gebruiken voor de Afrikaanse vormen de naam Homo bodoensis.',
    look: { fur: '#7a5638', hair: '#2e1c10', skin: '#b88660', limb: '#946646', flat: true, size: 1.18, tall: true },
  },
  antecessor: {
    name: 'Sporen van Homo antecessor', nick: '"Pionier"',
    when: 'circa 850.000 jaar geleden', where: 'Happisburgh, Engeland',
    text: 'In 2013 spoelde de zee bij Happisburgh voetafdrukken bloot van een groepje volwassenen en kinderen, ongeveer 850.000 jaar oud. Mogelijk van Homo antecessor, bekend uit Atapuerca. Binnen een paar weken had de zee ze weer weggespoeld; ze zijn alleen gefotografeerd.',
    look: {},
  },
  sima: {
    name: 'De Sima-mensen', nick: '"Vroege Neanderthaler-lijn"',
    when: 'circa 430.000 jaar geleden', where: 'Atapuerca, Spanje',
    text: 'Uit hun botten is DNA gehaald, het oudste menselijke DNA dat we kennen. Daaruit blijkt dat ze bij de vroege voorouders van de Neanderthalers horen. Ze hadden al een paar typische Neanderthaler-kenmerken, zoals in hun gebit en kaak.',
    look: { fur: '#6e4c34', hair: '#3a2214', skin: '#c49470', limb: '#9a6a4a', flat: true, size: 1.08 },
  },
  erectus: {
    name: 'Homo erectus', nick: '"Rechtopgaande mens"',
    when: 'circa 1,9 miljoen – 110.000 jaar geleden', where: 'Afrika en Azië',
    text: 'Lang, met lange benen: gebouwd om ver te lopen. Leefde een tijd tegelijk met habilis. De eerste mensensoort die buiten Afrika voorkomt, en later de maker van handbijlen. In wereld 2 speel je als erectus!',
    look: { fur: '#7a5236', hair: '#2e1d12', skin: '#a8754e', limb: '#8f6040', flat: true, size: 1.2, tall: true },
  },
  neanderthalensis: {
    name: 'Neanderthaler', nick: 'Homo neanderthalensis',
    when: 'circa 400.000 – 40.000 jaar geleden', where: 'Europa en West-Azië',
    text: 'Gedrongen en sterk, met een grote neus en een brein zo groot als het onze. Maakte fijne stenen werktuigen, lijm van berkenpek, sieraden van arendsklauwen en verf van oker. Sommigen hadden rood haar. In wereld 4 speel je als Neanderthaler!',
    look: { fur: '#6a4a34', hair: '#7a3a1e', skin: '#d0a07a', limb: '#a87a58', flat: true, size: 1.12 },
  },
  denisova: {
    name: 'Denisovanen', nick: '"Mensen van de Denisova-grot"',
    when: 'circa 300.000 – 30.000 jaar geleden', where: 'Azië: Siberië, Tibet, China',
    text: 'Bekend van een vingerbotje, tanden en DNA uit de Denisova-grot in Siberië. In die grot lag ook een botje van een meisje met een Neanderthaler als moeder en een Denisovaan als vader. Een kaak uit Tibet en de schedel van Harbin ("Homo longi") horen er waarschijnlijk bij.',
    look: { fur: '#5e4430', hair: '#2a1a10', skin: '#b08058', limb: '#8e6444', flat: true, size: 1.1 },
  },
  sapiens: {
    name: 'Homo sapiens', nick: '"Wijze mens": wij',
    when: 'vanaf circa 300.000 jaar geleden', where: 'eerst Afrika, daarna de hele wereld',
    text: 'Slanker, met een hoog voorhoofd en een kin. Rond 45.000 jaar geleden kwamen sapiens en Neanderthalers elkaar in Europa tegen en kregen soms samen kinderen. Daarom zit in de meeste mensen buiten Afrika nog 1 à 2 procent Neanderthaler-DNA.',
    look: { fur: '#5a4030', hair: '#1e140c', skin: '#8a5a3a', limb: '#6e4630', size: 1.1, tall: true },
  },
};
