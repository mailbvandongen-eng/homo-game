// Voortgang bewaren in de browser. Eén plek, met een versienummer, zodat een oud bewaard spel
// nooit een nieuwere versie laat vastlopen: wat niet past wordt overgeslagen.
// Testmodus (?dev=1): een eigen bewaarplek, zodat testen het echte spel van een speler nooit overschrijft.
export const DEV = typeof location !== 'undefined' && /[?&]dev=1\b/.test(location.search);
const KEY = DEV ? 'homo-save-dev' : 'homo-save', VERSION = 1;
// Elk gebied houdt zijn eigen voortgang (slots). Zo kies je vrij een gebied en ga je daar verder waar je was.
const raw = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.version === VERSION && d.era ? d : null; } catch (e) { return null; } };
const put = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } };
const bare = (d) => { const c = { ...d }; delete c.slots; return c; };
const slotsOf = (d) => (d ? { ...(d.fresh ? {} : { [d.area]: bare(d) }), ...(d.slots && typeof d.slots === 'object' ? d.slots : {}), ...(d.fresh ? {} : { [d.area]: bare(d) }) } : {});
export const Save = {
  read() {
    if (typeof location === 'undefined' || /[?&]nieuw\b/.test(location.search)) return null;
    return raw();
  },
  write(d) { const now = { version: VERSION, at: Date.now(), ...d }; return put({ ...now, slots: { ...slotsOf(raw()), [d.area]: bare(now) } }); },
  clear() { try { localStorage.removeItem(KEY); } catch (e) { /* privémodus */ } },
  // de voortgang per gebied: { savanne: {...}, water: {...} }
  slots() { return slotsOf(raw()); },
  // naar een ander gebied: verder waar je daar was, of er nieuw beginnen met wat je al weet
  go(era, area) {
    const slots = slotsOf(raw()), s = slots[area];
    if (s) return put({ ...s, slots });
    const all = Object.values(slots), join = (k) => [...new Set(all.flatMap((x) => (Array.isArray(x[k]) ? x[k] : [])))];
    return put({ version: VERSION, at: Date.now(), era, area, fresh: true, known: join('known'), found: join('found'), finds: join('finds'), rockKnown: join('rockKnown'), past: [...new Set([...join('past'), ...join('missions')])], slots });
  },
  // dit gebied opnieuw, vanaf de eerste dag; de andere gebieden blijven zoals ze zijn
  reset(era, area) {
    const slots = slotsOf(raw()); delete slots[area];
    if (!Object.keys(slots).length) return this.clear();
    return put({ version: VERSION, at: Date.now(), era, area, fresh: true, slots });
  },
};
