// Voortgang bewaren in de browser. Eén plek, met een versienummer, zodat een oud bewaard spel
// nooit een nieuwere versie laat vastlopen: wat niet past wordt overgeslagen.
// Testmodus (?dev=1): een eigen bewaarplek, zodat testen het echte spel van een speler nooit overschrijft.
export const DEV = typeof location !== 'undefined' && /[?&]dev=1\b/.test(location.search);
const KEY = DEV ? 'homo-save-dev' : 'homo-save', VERSION = 1;
export const Save = {
  read() {
    try {
      if (/[?&]nieuw\b/.test(location.search)) return null;
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      return d && d.version === VERSION && d.era ? d : null;
    } catch (e) { return null; }
  },
  write(d) { try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, at: Date.now(), ...d })); return true; } catch (e) { return false; } },
  clear() { try { localStorage.removeItem(KEY); } catch (e) { /* privémodus */ } },
};
