// Een landmissie: iemand in de groep heeft afdrukken gezien en wil weten wat daar loopt.
// Jij volgt het spoor het land in tot je het dier van dichtbij ziet, en komt terug. Meer niet: je hoeft niets te doden of te dragen.
// o: { who, kind, near (zo dichtbij moet je komen), ask, end, title, why, follow }
export function trackMission(g, o) {
  const key = 'tracked_' + o.kind;
  const watch = () => {
    const b = g.beast(), p = g.player.pos;
    if (b && !g.state.found.has(key) && b.members.some((m) => Math.hypot(m.x - p.x, m.z - p.z) < o.near)) g.state.found.add(key);
  };
  const seen = () => g.state.found.has(key);
  return { id: 'track', who: o.who, ask: o.ask, end: o.end, title: o.title, why: o.why, watch, done: seen, steps: [
    { t: 'Zoek de afdrukken van het dier', find: 'track', ok: () => g.state.found.has('track') || seen() },
    { t: o.follow, find: 'beast', ok: seen }] };
}
