# homo-game

## Campagneopzet

De complete levelopzet staat in [CAMPAIGN_PLAN.md](./CAMPAIGN_PLAN.md). Daarin staan de hoofdroute, richtduur per level, vijandcadans en gedrag, landschapsopbouw, baasregels en speciale afleveringen.

**Status:** level 1 (Homo habilis in de Riftvallei) is speelbaar: een grotintro, drie kleine hyena’s, een eindbaas die drie steeninslagen nodig heeft en een Oldowan-vrijspeelscherm. De app heeft originele procedurele muziek en instelbare geluidseffecten. Levels 2–5 en de speciale afleveringen staan nog in het bouwplan.

## Nieuwe versie (in ontwikkeling): `v2/`

Een volledige herbouw als platformspel: strakke besturing (variabele springhoogte, vanzelf rennen, grote touchknoppen), levels opgebouwd uit tegels, vijanden met duidelijk gedrag en verzamelobjecten. Speel hem op `/homo-game/v2/`.

- `v2/src/config.js` — natuurkunde en afmetingen
- `v2/src/levels/` — één bestand per level (bouwfuncties: `ground`, `rock`, `branch`, `crumble`, `bump`, `spring`, `thorns`, `ent`, `bones`)
- `v2/src/enemies.js` — hyena, slang, gier, wrattenzwijn
- `v2/src/player.js`, `game.js`, `render.js`, `audio.js`, `input.js`
- `?debug` achter de URL toont de botsingsvakken
