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
};
