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
  erectus: {
    name: 'Homo erectus', nick: '"Rechtopgaande mens"',
    when: 'circa 1,9 miljoen – 110.000 jaar geleden', where: 'Afrika en Azië',
    text: 'Lang, met lange benen: gebouwd om ver te lopen. Leefde een tijd tegelijk met habilis. De eerste mensensoort die buiten Afrika voorkomt, en later de maker van handbijlen. In wereld 2 speel je als erectus!',
    look: { fur: '#7a5236', hair: '#2e1d12', skin: '#a8754e', limb: '#8f6040', flat: true, size: 1.2, tall: true },
  },
};
