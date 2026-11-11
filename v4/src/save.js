// Voortgang bewaren in de browser. Eén plek, met een versienummer, zodat een oud bewaard spel
// nooit een nieuwere versie laat vastlopen: wat niet past wordt overgeslagen.
const KEY = 'homo-save', VERSION = 1;
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
