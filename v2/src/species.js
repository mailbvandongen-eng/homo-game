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
};
