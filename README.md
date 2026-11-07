# homo-game

## Campagneopzet

De complete levelopzet staat in [CAMPAIGN_PLAN.md](./CAMPAIGN_PLAN.md). Daarin staan de hoofdroute, richtduur per level, vijandcadans en gedrag, landschapsopbouw, baasregels en speciale afleveringen.

**Status:** level 1 (Homo habilis in de Riftvallei) is speelbaar: een grotintro, drie kleine hyena’s, een eindbaas die drie steeninslagen nodig heeft en een Oldowan-vrijspeelscherm. De app heeft originele procedurele muziek en instelbare geluidseffecten. Levels 2–5 en de speciale afleveringen staan nog in het bouwplan.

## Nieuwe versie (in ontwikkeling): `v2/`

Een volledige herbouw als platformspel: strakke besturing (variabele springhoogte, vanzelf rennen, grote touchknoppen), levels opgebouwd uit tegels, vijanden met duidelijk gedrag en verzamelobjecten. Speel hem op `/homo-game/v2/`.

- `v2/src/config.js` — natuurkunde en afmetingen
- `v2/src/levels/` — één bestand per level (bouwfuncties: `ground`, `rock`, `branch`, `crumble`, `bump`, `spring`, `thorns`, `ent`, `bones`)
- `v2/src/enemies.js` — hyena, slang, gier, wrattenzwijn, baviaan, luipaard, vleermuis, stalactiet
- `v2/src/boss.js` — eindbaas wereld 1: reuzenhyena (Pachycrocuta)
- `v2/src/platforms.js` — boomstammen, krokodillen, nijlpaarden
- `v2/src/species.js` — teksten bij ontmoetingen met andere soorten
- `v2/STAMBOOM.md` — plan voor alle werelden en soorten, met bronnen

Wereld 1 (Homo habilis) is compleet: 1-1 Eerste stappen, 1-2 De rivierkloof, 1-3 Het galerijbos, 1-4 De grot van de reuzenhyena.

Wereld 2 (Homo erectus) is compleet: 2-1 De eerste handbijl (Kokiselei), 2-2 Buiten Afrika (Dmanisi), 2-3 De vulkanen van Java, 2-4 Het vuur (Swartkrans/Wonderwerk). Nieuw: handbijl, gebarsten rots, stormloop, wind, lava, vulkaanbommen, Stegodon, fakkel en kampvuren, eindbaas leeuw.

Wereld 3 (Homo heidelbergensis) is compleet: 3-1 De krijtkust (Boxgrove), 3-2 De heuvels van Atapuerca, 3-3 De put van de botten (Sima de los Huesos), 3-4 De speren van Schöningen. Nieuw: slik, rollende rotsblokken, holenberen, neushoorns, verticale grot, werpspeer die in kleiwanden blijft steken, eindbaas Homotherium.
- `v2/src/player.js`, `game.js`, `render.js`, `audio.js`, `input.js`
- `?debug` achter de URL toont de botsingsvakken

## 3D-proefstuk (v4): `v4/`

Een proef met een heel andere opzet: een 3D-wereld met de camera hoog achter de hoofdpersoon (ergens tussen GTA 2 en GTA 5 in). Je loopt vrij rond, onderzoekt en overleeft, in plaats van naar een finish te rennen. Speel hem op `/homo-game/v4/`. Het spel in `v2/` en `v3/` is niet aangeraakt.

- Eén stuk Riftvallei met *Homo habilis*: rivier, acacia's, rotsen, hoog gras, een kudde impala's en gieren boven een karkas
- Oppakken, bekijken, proeven: paarse bessen (goed), rode bessen (ziek), bitterblad (geneest), botten openslaan met een kei (merg)
- Voeding en gezondheid; ben je te zwak, dan zak je in elkaar en kom je zwak weer bij (geen game over)
- Sluipen: gebukt in hoog gras zien de impala's je minder snel; kom je te dichtbij, dan vlucht de kudde
- Zes ontdekkingen in het boekje, met zachte tips als je even vastzit
- Telefoon: duimstick links, rechts vegen om rond te kijken. Computer: WASD/pijltjes, Shift, C, E en de muis
- `v4/src/world.js` landschap, gras en licht · `actors.js` hoofdpersoon, impala's, gieren · `items.js` vondsten en ontdekkingen · `main.js` besturing, camera en spelregels
- `v4/lib/three.module.js` is three.js r187 (MIT), gebundeld en verkleind

## Pixelversie (v3): `v3/` — het hoofdspel

`/homo-game/` stuurt door naar `v3/`. De allereerste versie staat nog in `legacy/`.

Dezelfde game (levels, besturing en gameplay uit `v2/src`) met een andere tekenlaag: `v2/src/pixelmode.js`.
De pagina `v3/index.html` zet `window.PIXEL_MODE = true` en laadt `../v2/src/main.js`.

- Interne resolutie ~300 px hoog, vergroot met hele pixels; tegels van 24x24
- Tegels, lucht, heuvels, water/lava, duisternis en HUD handgemaakt in pixels per landschap (paletten in `PAL`)
- Figuren, dieren en bomen: hun vectortekening wordt omgezet naar pixels (harde rand, minder kleuren, 1px omlijning)
- Teksten, knoppen en banners op een scherp overlay-canvas (`#ui`)

- Viervoeters en eindbazen zijn handgemaakte pixelsprites uit `v2/src/pixelanimals.js` (één generator, per soort eigen bouw)
