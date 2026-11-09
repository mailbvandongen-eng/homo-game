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
- **Onderzoeken door te tikken:** tik op iets in de wereld; er verschijnt een boogje met icoontjes: oog (bekijken), hand (pakken), mond (proeven, met een vraagteken zolang je het niet kent). Je hoofdpersoon loopt er zelf heen.
- **Twee handen in plaats van een tas** (habilis had nog geen leer): je kunt twee dingen dragen. Tik op een hand om te bekijken, eten, neerleggen of een bot met de kei open te slaan. Later in het spel kan dragen meegroeien (bladbundel, leren tas, struisvogelei).
- **De pak-knop is een hand die oplicht** als er iets binnen bereik is; dingen om te pakken glinsteren.
- **Zintuigen:** houd het oog ingedrukt (of Q). De wereld wordt stiller en donkerder; vondsten lichten op (groen = goed, rood = slecht, wit = onbekend), je ziet de hoefsporen van de kudde, de wind en de geur van het karkas.
- **Wind:** waait uit het oosten. Staat de wind van jou naar de impala's, dan ruiken ze je van ver.
- Vondsten: paarse bessen (goed), rode bessen (ziek), bitterblad (geneest), botten openslaan met een kei (merg). Twaalf ontdekkingen in het boekje, met zachte tips.
- **Gereedschap:** bij het eerste bot dat je kraakt springt er een scherpe afslag van de kei. Daarna sla je zelf afslagen (twee stenen in je handen). Met een afslag snijd je de laatste reepjes vlees van het karkas.
- **Platte stenen omdraaien:** eronder zitten larven (eten), soms een schorpioen (au) en één keer een verstopte **vondst**: de hamersteen. Vondsten staan in het boekje.
- **De groep en de slaapboom** (`v4/src/group.js`): bij de grote acacia naast het begin wachten Tor (oud), Kem (jong) en kleine Ibo (kind). De balk Groep zakt in de loop van de dag; breng vlees, botten of bessen en geef ze met de actieknop (een gevende hand). Kem eet ook rode bessen die je nog niet kent en wordt dan ziek: bitterblad helpt. 's Nachts wordt de knop een maan: slapen slaat de nacht over en je herstelt, meer naarmate de groep beter gegeten heeft (bij een volle groep krijg je een afslag). Hyena's durven niet bij de boom. Ver van huis wijst een pijltje naar de slaapboom.
- **De jacht en de race om het vlees** (`v4/src/hunt.js`): een groepje zebra's graast op de vlakte, twee sabeltandkatten liggen in het hoge gras bij de rivier. Na een paar minuten (en daarna geregeld) jagen ze: sluipen, sprint, één zebra wordt gepakt. Zolang ze eten bewaken ze de prooi: eerst brullen, dan aanvallen (stenen maken ze alleen kwaad). Zijn ze verzadigd, dan ligt het vlees vrij: de gieren verhuizen ernaartoe, en even later ook de hyena's, die de rest opeten. Met een afslag snijd je lappen vlees los (item `meat`): zelf opeten of naar de groep brengen. Wie vlees draagt, wordt door hyena's van ver geroken.
- **Het droge seizoen** (`season()` en `newDay()` in `v4/src/main.js`): elke ochtend verdorren de struiken in een steeds grotere kring rond de slaapboom (16 m per dag; de rand draagt half), dus je moet elke dag verder weg. De rijkste struiken staan ver weg, één voorbij het leger van de katten. Bitterblad bij het water blijft groen. Na vijf droge dagen komt de regen en groeit alles weer. Bij het wakker worden zie je een kaartje: wat je gisteren bracht, hoe de groep erbij zit en een aanwijzing voor vandaag. Is de groep sterk (60+), dan krijg je een afslag; bij 70+ loopt Kem een dag mee en neemt hij ook een deel mee naar de boom (bij gevaar of donker rent hij terug). Blijft de groepsbalk ruim twee minuten leeg, dan trekt de groep weg: je vindt ze twee dagen later terug, verzwakt en met lege handen. Test: `/root/tools/pw/v4season.js`.
- **Camera en zoom**: de camera hangt standaard dicht achter de schouder (afstand 4 m). Knijpen met twee vingers of het muiswiel zoomt tussen 2,2 en 10 m; de keuze wordt onthouden (`homoV4zoom` in localStorage). Dichtbij schuift de camera opzij en het beeld iets omhoog, zodat je vrij van de knoppen staat. Tests zetten de oude afstand met `__game.setZoom(7.5)`; test: `/root/tools/pw/v4zoom.js`.
- **Spanning in het geluid** (`v4/src/audio.js`): een lage dreun en een hartslag die versnellen naarmate het gevaar dichterbij is, vogels en krekels die stilvallen, gebrul, zebrageblaf, en een zacht wijsje als alles rustig is of je thuiskomt.
- **Roofdieren** (`v4/src/predators.js`):
  - *Hyena's* bij het karkas: overdag lui, 's nachts brutaal. Ze giechelen, komen in een boog om je heen, en dan waagt er één een uitval (eerst een "woep" en kop omlaag). Ze bijten en pakken je bot af. Een gegooide steen jaagt ze weg.
  - *Luipaard* in een boom bij de rivier: overdag ligt hij op een tak. In de schemering komt hij naar beneden; vogels slaan alarm en hij besluipt je van achteren. Kijk hem recht aan en hij verstijft en trekt zich terug; een steen jaagt hem de boom in. Springt hij je aan, dan laat je alles vallen. 's Nachts lichten zijn ogen op.
  - De pak-knop wordt een **rode gooi-knop** als er gevaar is en je een steen vasthoudt. Je kunt ook op een roofdier tikken en gooien kiezen.
- **Liggend:** op Android wordt het scherm liggend vastgezet; staand vraagt het spel je de telefoon te draaien.
- De camera schuift naar voren als er grond of een rots tussen jou en de camera zit.
- Voeding en gezondheid; ben je te zwak, dan zak je in elkaar en kom je zwak weer bij (geen game over).
- **Sfeer:** dag en nacht in 14 minuten (ochtend, middag, oranje avond, nacht), opgewekt geluid (wind, vogels, krekels, ritselend gras, voetstappen, hoeven), vogeltjes die opvliegen, vlinders, stof in het zonlicht.
- Telefoon: duimstick links, rechts vegen om rond te kijken. Computer: WASD/pijltjes, Shift, C, E, Q en de muis
- `v4/src/world.js` landschap, gras, licht en dag · `actors.js` hoofdpersoon, impala's, gieren · `items.js` vondsten en ontdekkingen · `life.js` vogels, vlinders, glinsteringen en zintuigen · `audio.js` geluid · `icons.js` icoontjes · `main.js` besturing, camera en spelregels
- **Gescande natuur** (Poly Haven, CC0; zie `v4/assets/CREDITS.md`): granieten keien en struiken uit Zuid-Afrika, dood hout, gras uit een scan (8 soorten pollen als foto-kaartjes, goudgeel gekleurd), acacia's met echte bast en een bladerdak van fijn rooibosblad, een grond die drie grondfoto's mengt, en overdag een echte 360°-luchtfoto die ook voor licht en weerspiegeling zorgt. `v4/src/assets.js` laadt alles voordat je kunt beginnen.
- **Hoofdpersoon:** een realistische neanderthaler (gb.prof.69, Sketchfab, CC BY 4.0), kleiner gemaakt tot 1,35 m, met bewegingen uit de Universal Animation Library van Quaternius (CC0) die op zijn skelet zijn overgezet. Stilstaan, lopen, joggen en sprinten worden vloeiend gemengd naar snelheid en lopen in de pas (geen schokken bij overgaan); gebukt sluipen, springen met zwaartekracht, en eenmalige bewegingen (slaan, gooien, oppakken, geraakt worden) eroverheen.
- **Besturing:** traploze stick; **vanzelf oppakken** door ergens tegenaan te lopen (zijn je handen vol, dan verschijnt een ruilknopje; je laat dan liever eten dan gereedschap los); een **actieknop** die zich aanpast (slaan, gooien met automatisch richten, een steen omdraaien, vlees snijden, een bot kraken, een afslag slaan) en een **springknop**. Knoppen zien eruit als keien met oker rotstekening-icoontjes.
- **Echte dieren** (Sketchfab, CC BY 4.0; makers op het startscherm en in `v4/assets/CREDITS.md`): een gescande en geboetseerde gevlekte hyena met vijf eigen animaties (rondkijken, lopen, galop, een bot kraken, dreigende uitval), een luipaard met een renbeweging (langzaam afgespeeld is het sluipen) en gazellen (in plaats van impala's) waarvan de poten in `v4/src/rig.js` via de botten zelf lopen en galopperen. `Rig` speelt animaties af en kan botten extra draaien bovenop een animatie.
- **Beeld:** scherper (tot 2x de schermpixels), schaduwen van 2048 px, een lucht met zon, gloed en wolken, een korrelige grondtextuur en acacia's met een paraplukroon
- **Hoofdpersoon** (`v4/src/hominin.js`): knieën, ellebogen, handen met vingers, een gezicht met ogen, zware wenkbrauwen en een platte neus, een vachttextuur met reliëf en randlicht. Hij ademt en kijkt rond als hij stilstaat, legt als hij ziek is een hand op zijn buik en buigt zijn knieën bij het sluipen.
- **Impala's:** drie kleuren vacht met zwarte strepen achter, knieën die buigen in galop, hoorns met ribbels bij de mannetjes, de staart omhoog bij gevaar
- Bomen, rotsen, struiken en delen van dieren zijn samengevoegd, zodat een telefoon minder hoeft te tekenen (zo'n 300 tekenopdrachten per beeld)
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
