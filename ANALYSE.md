# Analyse van het spel (fase 1 van de herontwikkeling)

Stand: 12 november 2026, versie `v4/` (three.js, zonder bouwstap). Dit is de inventaris waarmee de
herontwikkeling begint. Hij is gemaakt door de code te lezen én het spel te draaien en te meten
(`?dev=1` → Controles, en de meetscripts in `/root/tools/pw`).

Back-up van de versie vóór de herontwikkeling: git-tag `backup-voor-herontwikkeling-2026-11-12`.
Ontwikkelen gebeurt op de branch `ontwikkel`; alleen geteste fasen gaan naar `main` (en dus naar het spel dat online staat).

## 1. Wat goed werkt (blijft)

| Onderdeel | Waarom het blijft |
|---|---|
| Tijdperk en gebied als gegevens (`eras/`, `areas/`) | Een nieuw gebied is een bestand; de motor leest missies, dieren, plekken en uiterlijk daaruit. `tools/check-eras.mjs` bewaakt tijd en plaats van elke soort. |
| Missies uit de groep (`systems/missions.js`) | Vraag → doen → terugbrengen → verder trekken. Vier gebieden, veertien missies, alle met een testbot uit te spelen. |
| Bewaren (`save.js`, `systems/persist.js`) | Klein, één plek, versie-vast. |
| Gescande natuur (Poly Haven, CC0) | Keien, struiken, dood hout, grond en lucht zijn foto-echt. |
| Dag en nacht, seizoen, weerlicht | Licht, lucht en mist volgen de dag; de nacht maakt roofdieren gevaarlijker. |
| Zintuigen (ruiken, luisteren, sporen) | Eigen spelidee, past bij het onderwerp. |
| Vuur (`fire.js`) | Vinden, dragen, voeden, bewaren: inhoudelijk het sterkste systeem. |
| Geluid (`audio.js`) | Werkt zonder bestanden en zonder vertraging. Blijft als basis, moet rijker (zie 3). |
| Testbots (Playwright) | Elke missieketen wordt automatisch uitgespeeld. |

## 2. Wat verbeterd moet worden

| Onderdeel | Probleem (gemeten of gezien) | Fase |
|---|---|---|
| Prestaties | Bij de start van deze fase: **1,5 miljoen driehoeken per beeld** en ~390 tekenopdrachten. Oorzaak: niets werd buiten beeld weggelaten (alle bomen, gras en dieren altijd getekend, plus nog eens voor de schaduw). Nu 0,4–0,9 miljoen (zie 6). Nog te doen: verre bomen en dieren eenvoudiger tekenen (LOD), mens-model uit minder losse delen. | 1 (deels klaar), 4 |
| `main.js` | 1400 regels: bediening, camera, handen, tas, gooien, eten en de spelronde in één bestand. Splitsen in `engine/` (invoer, camera) en `systems/` (handen, tas, eten) vóór de nieuwe bediening erin komt. | 2 |
| Bediening | Joystick en kijkvlak werken, maar bukken/springen gaat met veegbewegingen (drempels zijn "een eerste gok"), zoom bestaat (knijpen, muiswiel) maar is nergens in te stellen, geen instelbare gevoeligheid, geen instellingenscherm. | 2 (klaar, zie 7) |
| Knoppen | Woordknoppen zijn duidelijk maar kaal; geen eenheid met tas en missiekaart; geen contextmenu bij meer dan één mogelijke handeling. | 2 |
| Tas | Werkt, maar handen wisselen, neerleggen en combineren zijn verspreid over losse knoppen. Draagvermogen groeit maar één keer (draagvel). | 2, 5 |
| Botsingen | Alleen cirkels (`blockers`) op een hoogteveld. Betrouwbaar, maar je kunt nergens op of onderdoor. | 4 |
| Geluid | Alles is gesynthetiseerd; niet ruimtelijk (geen links/rechts, geen afstand per bron); voetstappen klinken overal hetzelfde. | 4 |
| Kennisbasis | Had drie treden (vast / aannemelijk / gok). Nu vier (zie 6). Nog niet in het spel zelf te lezen. | 1 (klaar), 5 |

## 3. Wat opnieuw ontworpen moet worden

| Onderdeel | Waarom | Fase |
|---|---|---|
| **De mens** | Eén model voor alles: een neanderthaler van Sketchfab, verkleind. Voor *Homo habilis* klopt dat niet (te groot brein, te korte armen, verkeerd gezicht), voor *Homo erectus* ook niet (te breed). Het model bestaat uit ~20 losse delen (duur om te tekenen). Kinderen en ouderen zijn hetzelfde model, geschaald. Bewegingen komen uit een algemene bibliotheek; voeten volgen het terrein niet. | 3 |
| **Reuzenolifant** | Afrikaanse olifant × 2. *Palaeoloxodon recki* had een andere schedel en andere slagtanden. | 3 |
| **Pofadder, impala, krokodil, meerval** | Cobra-model, gazelle-model en twee dieren uit losse vormen. | 3 |
| **Dieren algemeen** | Eén model per soort: geen jong/volwassen, geen man/vrouw. Gedrag is per soort apart geschreven (`predators.js`, `hunt.js`, `giant.js`, `actors.js`) in plaats van één gedeelde basis (zien, horen, ruiken, vluchten, kudde). | 3 |
| **Terrein** | Eén hoogteveld van 440 m met 200 × 200 vakken: glooiend, maar geen kloven, richels of overhangen. Gebieden verschillen vooral in kleur en inrichting. | 4 |
| **Camera** | Zoom (knijpen, muiswiel) en botsing met grond en rotsen bestonden al, maar zaten verweven in `main.js`; gevoeligheid niet instelbaar. *(Eerdere versie van deze analyse zei ten onrechte "geen zoom, geen botsing".)* | 2 (klaar, zie 7) |

## 4. Wat ontbreekt

- Instellingenscherm (gevoeligheid, geluid, kwaliteit). *(fase 2: gebouwd)*
- Klimmen, kruipen, zwemmen, vallen, dragen-als-houding (nu: staan, lopen, rennen, bukken, springen, gooien, rapen).
- Voeten op het terrein (IK) en overgangen tussen alle bewegingen.
- Ruimtelijk geluid, voetstappen per ondergrond.
- Weer als spelsysteem (regen en wind bestaan alleen als sfeer in het seizoen).
- Draagmiddelen na het draagvel (net, mand, waterzak) en water dragen.
- Combineren van voorwerpen als algemene handeling (nu per geval geschreven).
- Kwaliteitstrappen voor trage telefoons. *(fase 2: gebouwd)*
- Kennisscherm in het spel (wat is vast, wat is onzeker).

## 5. Technische beperkingen (eerlijk)

1. **Browser en telefoon.** Geen bouwstap, geen native code. Realistisch licht en veel detail moeten binnen
   ongeveer 0,5 miljoen driehoeken en 250 tekenopdrachten per beeld blijven om op een gewone telefoon soepel te lopen.
2. **Modellen.** We maken geen modellen in een tekenprogramma met een kunstenaar erbij; we zoeken vrije
   modellen (Sketchfab CC BY, Poly Haven CC0) en passen ze met scripts aan. Voor uitgestorven soorten
   (*H. habilis*, *P. recki*) bestaan weinig vrije, geanimeerde modellen. Waar geen passend model is,
   blijft het huidige staan **met het label "vervangend model"** in de kennisbasis en in de testmodus.
   Dat wordt niet verzwegen.
3. **Testbrowser.** De automatische tests draaien zonder videokaart (ongeveer 1 beeld per seconde).
   Beelden per seconde zijn daar dus niet te meten; driehoeken en tekenopdrachten wel. Hoe het op een
   echte telefoon aanvoelt (vingers, snelheid) kan alleen op een echte telefoon beoordeeld worden.
4. **Opslag in de browser.** Voortgang staat in `localStorage` van het toestel; wissen van browsergegevens wist het spel.

## 6. Wat in fase 1 is gebouwd

- **Back-up en ontwikkelbranch** (zie boven).
- **Testmodus** `?dev=1` (zie README): gebied en missie kiezen, instellingen, scenario's uit
  `v4/test_scenarios.json`, automatische controles, eigen opslag (`homo-save-dev`) zodat het echte spel
  nooit wordt overschreven. Gewone spelers laden er geen byte van.
- **Fouten worden zichtbaar.** Een model of beweging die ontbreekt gaf vroeger alleen een regel in de
  console; nu staat het in de controles. Een bestand dat niet laadt geeft een melding in plaats van een eeuwig laadscherm.
- **Prestaties.** Bomen, keien, struiken en gras worden per vak van de kaart getekend (buiten beeld = niet tekenen);
  dieren en mensen worden buiten beeld overgeslagen; schaduw alleen van wat dichtbij staat; tanden, ogen en
  wimpers alleen dichtbij; de rook van een vuur is één tekenopdracht in plaats van één per wolkje. Gemeten bij de start van elk gebied:

  | Gebied | Driehoeken vóór | Driehoeken nu | Tekenopdrachten nu |
  |---|---|---|---|
  | Savanne | 1.509.000 | ± 690.000 | ± 235 |
  | Water | – | ± 420.000 | ± 390 |
  | Berg | – | ± 855.000 | ± 370 |
  | Hoge vlakte | – | ± 600.000 | ± 330 |

  Het doel (450.000 / 260) is nog niet gehaald; de controle meldt dat als "let op". De rest komt met
  eenvoudiger modellen op afstand (fase 3 en 4).
- **Kennisbasis met vier treden**: vastgesteld · sterk aannemelijk · onzeker · artistieke invulling
  (`eras/*.js`), en per dier hoe goed het model past: reconstructie · verwant · vervanger (`species.js`).
  `tools/check-eras.mjs` en de testmodus melden elke vervanger.

## 7. Wat in fase 2 is gebouwd (interface en bediening)

> De knoppen en de bediening van je lijf zijn op 13-11-2026 opnieuw ontworpen: zie §9. Menu, instellingen en `engine/controls.js` zijn gebleven.

- **Eén knoppensysteem** (`.key` in `index.html`): alle knoppen zijn rechthoekige woordknoppen in dezelfde stijl.
  Rechtsonder staan bij elkaar: `Buk`/`Sta op`, `Spring`, de grote actieknop, `Meer`, de twee handen en `Tas`.
  Rechtsboven alleen `Menu`. De ronde icoonknoppen en het knopje met de drie puntjes zijn weg.
- **Geen veegbewegingen meer.** Bukken en springen zijn knoppen. Slepen over het beeld is alleen nog rondkijken.
- **Contextmenu `Meer`.** De grote knop doet het meest voor de hand liggende; kan er meer (een scherf slaan,
  een bot kraken, hout op het vuur), dan verschijnt `Meer` met de andere keuzes als woorden.
- **Handen en tas.** Tik op een hand voor wat je ermee kunt (bekijken, eten, maken, in de tas, neerleggen).
  `Tas` is een woordknop met het aantal erin.
- **Menu** (`systems/menu.js`): het spel staat stil. Verder spelen · Wat je weet · Instellingen · Opnieuw beginnen.
- **Instellingen** (`engine/settings.js`, bewaard in `homo-settings`; in de testmodus apart): rondkijken
  langzaam–snel, geluid uit–hard, beeld vanzelf/laag/gewoon/hoog, knoppen klein/gewoon/groot.
  Op "vanzelf" zakt het beeld één trap als het spel vijf seconden onder 24 beelden per seconde blijft.
- **Invoer en camera uit `main.js`** naar `engine/controls.js` (joystick met dood midden, kijken, knijpen/wiel,
  cameraplaatsing met botsing).
- **Controles** in de testmodus: groep "Bediening" (knoppen aanwezig, minstens 44 px, in beeld, niet over elkaar).
- **Test** `/root/tools/pw/v4menu.js` (telefoonformaat, aanraking): 24 controles.

Nog niet gedaan in fase 2: handen, tas en eten staan nog in `main.js` (1320 regels). Dat verhuist in fase 5,
samen met de nieuwe draagmiddelen, zodat het maar één keer verbouwd wordt. Hoe de knoppen onder echte duimen
aanvoelen is alleen op een echte telefoon te beoordelen.

## 8. Wat in fase 3 is gebouwd (mens en dieren)

Er bestaan geen vrije, geanimeerde modellen van *Homo habilis*, *Homo erectus*, *Palaeoloxodon recki* of een pofadder.
Daarom is er een eigen gereedschap gebouwd dat een bestaand model **omvormt** naar een andere soort, met behoud van
botten en bewegingen:

- **`v4/src/shape.js`** vormt een model om bij het laden: botten langer, korter, dikker of dunner maken (met de
  bewegingen erbij omgerekend), de huid plaatselijk verschuiven (schedel, wenkbrauwboog, kaak), langs een lijn
  uittrekken en buigen (slagtanden, hoorns) of juist wegknijpen (hoornloos), en een andere huid opleggen.
- **`v4/src/shapes.js`** bevat de recepten, met de maten uit de literatuur als uitgangspunt.

| Soort | Was | Is nu |
|---|---|---|
| *Homo habilis* (speler, groep, vreemden) | neanderthaler, verkleind | omgevormd: kortere benen, langere armen, kleine hersenpan, gezicht naar voren; eigen vorm voor man, vrouw en kind |
| *Homo erectus* | dezelfde neanderthaler | omgevormd: lange benen, smal lijf, lage lange schedel, zware wenkbrauwboog; man, vrouw en kind |
| Reuzenolifant *P. recki* | Afrikaanse olifant × 2 | omgevormd: hoge korte schedel met wal, kleinere oren, langere poten, lange rechte slagtanden; ruim 4 m |
| Impala | gazelle | omgevormd: groter, rammen met liervormige hoorns, ooien zonder hoorns, een jong in elke kudde |
| Pofadder | cobra die zich opricht | omgevormd: kort en dik, brede kop, eigen huid met V-banden. Nieuw gedrag: blijft liggen, blaast zich op, haalt uit |
| Krokodil | bollen en kegels | echt model (CC BY), staart zwaait; verwant aan *Crocodylus anthropophagus* |
| Meerval | een bol met een kegel | echt model met botten dat zwemt (CC0); een verwante meerval, geen *Clarias* |

In `species.js` is een trede bijgekomen: **aangepast** (een verwant model dat wij zelf hebben omgevormd). Er staat
bij elk dier eerlijk wat nog niet klopt (bijvoorbeeld: de impala draagt nog de vacht van de gazelle). Geen enkel dier
heeft nog het label "vervanger".

**Gedeelde basis voor diergedrag: `v4/src/animal.js`.** Hoe een dier je opmerkt (zien, sluipen, dekking, ruiken met
de wind) staat nu op één plek, met per soort een regel met getallen (`SENSES`). Ook de stap "op snelheid komen,
draaien, vooruit" is één functie (`step`) in plaats van acht kopieën. Kudde, zebra's, hyena's, sabeltandkatten,
luipaard, reus, gewonde gazelle en vreemden gebruiken dit. Het gedrag zelf (grazen, loeren, jagen) blijft per soort.

Nog **niet** gedaan in fase 3, en dus niet beloofd:

- Voeten die het terrein volgen. Het terrein is nu zo glooiend dat het weinig opvalt; het hoort bij het reliëf van fase 4.
- Hyena's, zebra's, sabeltandkatten en het luipaard ruiken je niet (alleen de kudde doet dat). De regel bestaat (`smell`), maar
  aanzetten verandert de moeilijkheid en hoort bij de gameplay van fase 5.
- Het krokodilmodel heeft geen botten: de bek staat altijd open en de poten bewegen niet.
- Jong en volwassen bestaat bij de mensen en de impala's, nog niet bij de andere dieren.

## 9. Herontwerp mobiele besturing en feedback (13-11-2026)

Een gerichte opdracht tussen fase 3 en 4: alleen de bediening op de telefoon en de reacties bij het eten.

- **Knoppen** (`.rb` in `index.html`): rond, halfdoorzichtig, aardekleuren, een teken in plaats van een woord
  (`icons.js`; de naam staat in `aria-label`). Ze staan in een boog rechtsonder: de grote knop `#doBtn` (80 px) en
  maximaal drie kleinere `#alt0`–`#alt2` (54 px). `updateAction()` in `main.js` toont alleen wat `actionOptions()`
  nu teruggeeft; een knop komt zacht op en verdwijnt weer. Kan er meer dan in de boog past, dan opent de laatste
  knop de rest. De knoppen `Buk`, `Spring` en `Meer` bestaan niet meer.
- **Je lijf** (`engine/controls.js`): tik rechts in beeld = springen (`bodyTap()` in `main.js`: niet op of vlak
  naast een knop, hand of menu, en niet als de tik iets in de wereld raakt). Snel omlaag vegen links = bukken,
  omhoog = opstaan (`FLICK_MS`, `FLICK_PX`); tijdens zo'n veeg zet de stuurduim geen stap. Langzaam duwen blijft lopen.
- **Keuzes bij een hand of ding** (`placeRadial`): ronde knoppen in een boog boven de plek, binnen het beeld.
- **Eten**: de tekstmeldingen zijn weg. `taste()` in `main.js` laat `sound.voice('hm' | 'ugh')` horen, met een
  pauze (20 s na "hm", 8 s na "ugh") zodat het niet bij elke hap klinkt. De stem wordt gemaakt met een
  stembandtoon en drie mondklanken (formanten); er zijn geen geluidsbestanden bij gekomen.
- **Test** `/root/tools/pw/v4touch.js`: echte aanrakingen in de testmodus, op vijf liggende schermformaten.

Wat nog niet goed is:

- De stem is gemaakt, niet opgenomen. Hoe menselijk hij klinkt is alleen met oren te beoordelen.
- Bij de rode bes en het bitterblad stond eerst een zin (je wordt ziek; de pijn zakt). Die is weg. Je merkt het
  nu aan het "ugh", aan je lijf en aan de ontdekking in "Wat je weet".
- Niet op een echte telefoon geprobeerd. De testmachine tekent één beeld per seconde; voor tikken en vegen zet de
  test het tekenen tijdelijk uit, anders komt geen enkele tik op tijd aan.
