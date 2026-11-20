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
| **Dieren algemeen** | Eén model per soort: geen jong/volwassen, geen man/vrouw. Gedrag is per soort apart geschreven (`predators.js`, `hunt.js`, `beast.js`, `actors.js`) in plaats van één gedeelde basis (zien, horen, ruiken, vluchten, kudde). | 3 |
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
- **Je lijf** (`engine/controls.js`): tik rechts in beeld = springen (`fingerTap()` en `bodyTap()` in `main.js`).
  Voorbij 60% van het beeld is dat altijd zo, ook als daar iets ligt; alleen een knop, een hand of open keuzes
  gaan voor. In het midden (45–60%) spring je tenzij je precies op een ding tikt. Dingen aantikken doe je links. Snel omlaag vegen links = bukken,
  omhoog = opstaan (`FLICK_MS`, `FLICK_PX`); tijdens zo'n veeg zet de stuurduim geen stap. Langzaam duwen blijft lopen.
- **Keuzes bij een hand of ding** (`placeRadial`): ronde knoppen in een boog boven de plek, binnen het beeld.
- **Eten**: de tekstmeldingen zijn weg. `taste()` in `main.js` laat `sound.voice('hm' | 'ugh')` horen, met een
  pauze (20 s na "hm", 8 s na "ugh") zodat het niet bij elke hap klinkt. De stem wordt gemaakt met een
  stembandtoon en drie mondklanken (formanten); er zijn geen geluidsbestanden bij gekomen.
- **Test** `/root/tools/pw/v4touch.js`: echte aanrakingen in de testmodus, op vijf liggende schermformaten.

- **Geven aan de groep** gaat alleen nog vanzelf binnen vijf meter van de slaapboom (`GIVE_R`; was negen).
  De dichtste bessenstruik staat op tien meter: daar nam Ibo de bes al uit je hand.

Wat nog niet goed is:

- De stem is gemaakt, niet opgenomen. Hoe menselijk hij klinkt is alleen met oren te beoordelen.
- Bij de rode bes en het bitterblad stond eerst een zin (je wordt ziek; de pijn zakt). Die is weg. Je merkt het
  nu aan het "ugh", aan je lijf en aan de ontdekking in "Wat je weet".
- Niet op een echte telefoon geprobeerd. De testmachine tekent één beeld per seconde; voor tikken en vegen zet de
  test het tekenen tijdelijk uit, anders komt geen enkele tik op tijd aan.

## 10. Wat in fase 4 is gebouwd (wereld, 14-11-2026)

- **Reliëf** (`relief.js`, per gebied in `relief: [...]`): drie vormen. Een `breuk` is een wand met een hoge en een
  lage kant en een puinhelling (`gaps`) waar je wel omhoog kunt. Een `geul` is een droge bedding. Een `kop` is een
  rotskop met een vlakke top. `height()` in `world.js` telt het reliëf bij het land op; `nearRelief()` zegt of een
  punt erin ligt.
- **Botsingen** (`hominin.js`): een wand houdt je tegen en je glijdt erlangs. Om een kei loop je heen. Op een kei tot
  1,6 m spring je (`LEDGE`); de sprong meet zelf hoe hoog en hoe ver. Een aarden wand spring je niet op: daar is de
  puinhelling voor. Dieren gebruiken dezelfde regels (`animal.js`).
- **Voeten** (`footik.js`): na de loopbeweging zet het spel elke voet op de grond onder díé voet. Het bekken zakt
  mee, het andere been buigt, de voet kantelt met de helling. Alleen bij de speler. Op vlakke grond verandert niets.
- **Weer** (`systems/weather.js`): hoort bij het droge seizoen. Droge dagen zijn helder. Op de laatste droge dag
  trekt het dicht en steekt de wind op, in de nacht begint de regen, de ochtend erna klaart het op. Wolken, licht,
  nevel, gras en regenstrepen volgen `world.sky`. `weather.force = {cloud, rain, wind}` zet het weer vast (tests).
  De hoge vlakte heeft meer wind (`weather: { wind }` in het gebied).
- **Geluid** (`audio.js`): `sound.listen()` weet waar je staat en kijkt; `sound.from(dier).growl()` laat een geluid
  van links of rechts komen, zachter en doffer op afstand. Rivier en vuur hoor je aanzwellen. Regen, harde wind en
  onweer horen bij het weer. Voetstappen verschillen per ondergrond (`groundAt()`: aarde, gras, hoog gras, modder,
  water, rots).
- **Ver weg** (`rig.js`, `FAR`): dieren verder dan 45 m rekenen hun beweging om het beeld uit, verder dan 95 m om
  de twee beelden. Dat scheelt meer dan de helft van het rekenwerk voor die dieren.
- **Controle**: de testmodus meldt een fout als een vaste plek van een gebied in of tegen het reliëf ligt.
- **Tests**: `/root/tools/pw/v4relief.js [gebied]` en `/root/tools/pw/v4wereld.js [gebied]`.

Wat nog niet goed is:

- Bomen, struiken en keien hebben geen eenvoudiger versie voor in de verte. Een beeld telt nog 600.000 tot 750.000
  driehoeken; het doel voor een telefoon is 450.000. Daarvoor zijn lichtere modellen nodig.
- De voeten van dieren en van de groep volgen het land niet; alleen die van de speler.
- De grond wordt niet nat of donker in de regen, en er liggen geen plassen.
- Geluid is gemaakt, niet opgenomen, en het is niet met oren beoordeeld. Links en rechts is gemeten.
- Niet op een echte telefoon geprobeerd.

## 11. Wat in fase 5 is gebouwd (gameplay, eerste deel, 16-11-2026)

**Vrij een gebied kiezen.** Menu → *Kies een gebied*. Elk gebied bewaart zijn eigen stand (`slots` in `save.js`):
dag, handen, tas, missies. Wat je weet (ontdekkingen, vondsten, steensoorten) gaat mee naar een gebied waar je nog
niet was. *Opnieuw beginnen* wist alleen het gebied waar je bent. Een oud bewaard spel blijft werken. Trek je via
de slotkaart verder naar een gebied waar je al speelde, dan ga je daar verder waar je was.

**Handen, tas, eten en maken uit `main.js`.** `systems/carry.js` (handen, draagvel, omslag), `systems/food.js`
(eten, proeven, bot kraken), `systems/craft.js` (afslag, vuistbijl, graafstok), `systems/knowledge.js` (boekje en
kennisblad). `main.js` ging van 1357 naar ongeveer 1180 regels.

**Dorst** (`systems/thirst.js`). Een vierde streepje: Water. Het zakt in ruim een dag van vol naar leeg; in de
middaghitte en als je rent ruim twee keer zo snel, in de regen bijna niet. Onder 30 hoor je een droge kuch, onder
12 loop je langzamer, bij 0 gaat je gezondheid achteruit. Drinken doe je met de actieknop aan de rivier of het
meer. Stilstaand water in een poel maakt ziek (één keer proberen, daarna biedt het spel het alleen nog aan als je
bijna omvalt).

**Waterzak.** Bij een vers gedood dier kun je met iets scherps de maag eruit snijden (één per dier). Aan de
rivier vul je hem; daarna drink je eruit, stop je hem in het draagvel of breng je hem naar de groep (de groep
drinkt, jij houdt de lege maag). Nieuwe missie in de savanne: *Water voor Tor*. In de kennisbasis staat dit bij
*onzeker*: zo'n zak vergaat, dragen is niet te bewijzen.

**Kennisblad.** *Wat je weet* heeft nu twee bladen: *Jouw boekje* en *Hoe zeker is dit?*. Het tweede toont per
soort wat vaststaat, wat aannemelijk is, wat onzeker is en wat onze invulling is (uit `zeker` in `eras/*.js`).

**Ruiken.** Zebra's en de gewonde gazelle ruiken je nu op 20 m als de wind van jou naar hen waait (`animal.js`).
Bij roofdieren staat ruiken bewust uit: zij komen al op je af.

**Niet gebouwd, met reden.** Net en mand: touw is pas aangetoond bij neanderthalers, vlechtwerk nog later. Ze
passen niet bij *Homo habilis* en *Homo erectus* en schuiven naar tijdperk 3–4.

**Werkt nog niet / open.**
- De groep heeft geen eigen dorst; water brengen telt mee in de balk Groep.
- Voorwerpen combineren is nog per geval geschreven (`crafts()` in `main.js`).
- Alleen de savanne heeft een watermissie; de andere gebieden hebben wel dorst en de waterzak.
- Niet op een echte telefoon geprobeerd; het geluid van drinken is niet beluisterd.

Tests: `/root/tools/pw/v4kies.js` (gebied kiezen) en `/root/tools/pw/v4dorst.js` (dorst, waterzak, kennisblad).

## 12. Missieoverzicht: hoe andere spellen het doen (17-11-2026, ontwerp, nog niet gebouwd)

Vraag van Bob: meerdere missies tegelijk, in een subtiel overzicht in plaats van een tekstblok dat het stuur blokkeert.

**Wat andere spellen doen**
- *Zelda: Breath of the Wild*: missies staan in een logboek achter een knop (hoofd-, zij- en heiligdommissies). Je kiest er één om te volgen; die krijgt een punt op de kaart. Tijdens het spelen staat er geen missietekst in beeld.
- *Ancestors: The Humankind Odyssey* (zelfde onderwerp): geen missies en geen kaart, alles via beeld en geluid. Recensenten vonden dat te onduidelijk; de maker raadde zelf aan de hulp aan te laten. Les: helemaal niets tonen werkt niet.
- Spellen met veel missies (World of Warcraft-hulpjes, Typewriter): veel missies mogen open staan, maar **één wordt gevolgd**. Alleen die staat in beeld, klein, met de huidige stap. De rest zit in een la.
- Algemene regel uit ontwerpgidsen: begin met een leeg beeld en zet er alleen iets in dat steeds nodig is.
- Uit eigen kennis (niet opgezocht): *Genshin Impact* en *The Witcher 3* tonen de gevolgde missie als één of twee kleine regels aan de rand, weg van de duimen, en laten die vervagen.

**Voorstel voor Oersprong**
1. **Meerdere missies tegelijk.** Iedereen die iets vraagt, mag je aannemen. Niets hoeft te worden afgezegd.
2. **In beeld: één kleine regel**, bovenaan in het midden, alleen de huidige stap van de gevolgde missie ("Pak een tak"). Hij vangt geen aanraking op, verschijnt als de stap verandert en vervaagt na een paar tellen. Een klein stipje blijft staan als teken dat er iets loopt.
3. **Overzicht achter één tik** op dat stipje: een smalle lijst met per missie de naam, wie het vroeg en de stappen met vinkjes. Tik op een missie om die te volgen. Het spel staat dan stil, zoals bij het menu.
4. **De wereld wijst de weg.** Wie de missie gaf, wijst of kijkt de goede kant op; het doel zelf valt op (rook, gieren, een kale boom). Geen pijlen of kaartpunten.
5. Een stap die klaar is geeft een kort geluid en een vinkje, geen scherm.

## 13. Vormgeving van vensters, knoppen en iconen (17-11-2026 ontwerp; gebouwd 18-11-2026, keuze E)

**Stand 18-11:** gebouwd en live. Afwijkingen van het ontwerp: de naam van de vrager staat niet meer in het missieoverzicht (het gezicht is genoeg); alleen meldingen die vaak terugkomen zijn teken + woord geworden (handen vol, mis, geen kei, dof, heet, genoeg hout, te diep, honger, alleen botten, niet in de tas), verhalende meldingen blijven een zin.

**Uitgangspunten** (akkoord van Bob): vensters passen bij de wereld; knoppen staan niet in de weg en verschijnen
alleen als er iets kan; zo min mogelijk tekst; iconen uit één gedownloade set (voorkeur game-icons.net, CC BY 3.0,
vermelding in `v4/assets/CREDITS.md`); de vier balken worden kleine tekens die vervagen als alles goed is.

**Idee van Bob:** de binnenkant van een rendierhuid, tekst gekrast met een steen.
Kanttekening: rendieren leefden niet in Oost-Afrika; in deze gebieden wordt het de huid van een antilope of zebra.
Krassen met een steen past pas vanaf *Homo erectus* (de gekraste schelp van Trinil).

**Alternatieven**
- A. *De huid.* Binnenkant van een vel, opgespannen met pennen; tekens in houtskool en oker. Per gebied het dier dat daar leeft.
- B. *De grond.* Je hurkt: de tas is het vel dat openligt met de echte voorwerpen erop; missies liggen als voorwerpen naast wie erom vroeg. Bijna geen tekst nodig.
- C. *De rotswand.* Een vlakke steen bij het kamp waar alles op komt te staan; het boekje groeit het hele spel door.
- D. *Het natte zand.* Met een vinger getekend bij het water; bij sluiten veegt het weg.
- E. *Het materiaal groeit mee met de mens.* Habilis: grond en losse voorwerpen (B). Erectus: huid bij het vuur, houtskool (A). Neanderthaler: oker op huid. Moderne mens: schildering op de rotswand (C). De vensters vertellen zo zelf het verhaal van het spel.

**Voorkeur:** E. Voor de twee tijdperken die er nu zijn betekent dat: B voor habilis, A voor erectus.

**Missieoverzicht zonder tekstblok:** per missie het gezicht van wie het vroeg, daarnaast het icoon van wat hij wil, en kerfjes voor de stappen. Eén regel tekst alleen bij de missie die je aantikt.

**Letters:** koppen in een gedownload lettertype dat op houtskool lijkt (vrije licentie); gewone tekst blijft een rustige, goed leesbare letter. Echt gekraste letters lezen slecht op een telefoon.

## 14. Wat in fase 5b stap 3 is gebouwd (vinden en eten, 18-11-2026)

**De wereld wijst de weg.** Elke missiestap die om een ding of plek vraagt heeft `find` (kei, tak, bot, blad, plant,
dood hout, rook, prooi, poel, kudde, zwarte rots). `spotOf()` in `main.js` zoekt het dichtstbijzijnde. Wie de missie gaf
draait zich ernaartoe en strekt zijn arm (`group.js`, `pointArm`), als je bij hem staat en het ding niet al voor je
voeten ligt. Het ding zelf schittert tot 60 m ver. Geen pijlen, geen tekst.

**Takken en dode bomen.** Onder elke vaste acacia en onder één op de drie andere ligt een tak; na de regen liggen er
nieuwe. Dode bomen zijn hoger, kaal en gebleekt, met afgebroken takken aan de voet.

**Meer eten** (`forage.js`; de plekken staan in het gebiedsbestand: `fruitTrees`, `oldCarcasses`, `tubers`):
- vijgenbosjes: elke ochtend drie vijgen op vaste plekken;
- baobabs: één vrucht per dag, in de droogte staat de boom kaal en liggen er drie; kraken met een kei;
- oude karkassen met gieren erboven (sinds fase 5d zitten ze 's nachts in een boom en landt er overdag één bij de botten; zie `vultures.js`): het vlees is op, in de botten zit merg; na drie droge dagen of na de regen ligt er weer een bot;
- knolplanten ook op het droge land (graven met de stok);
- vaker een nest met eieren of een bijennest, en meer honing;
- geen bessenstruik meer bij de slaapboom.

**Eerlijk:** de vijg is een gewone vijg (model) als vervanger voor de wilde vijg. Marula en losse noten zijn niet
gebouwd: er is geen bruikbaar model gevonden. In het hoogland stonden een boom, een tak en een graasplek van de kudde
in de rivier; die zijn verplaatst.

**Controle:** `v4forage.js` (alle vier gebieden).

## 15. Wat in fase 5b stap 4 is gebouwd (de groep doet mee, 18-11-2026)

**Zelf eten zoeken.** Wie kan lopen (niet de oude, niet het kind) gaat overdag om de beurt op pad: naar een
bessenstruik of een vijgenbosje binnen 75 m van het kamp, over droog land. Hij plukt echt (de struik raakt leger, de
vijg is weg), draagt het in zijn hand terug en de groep eet: het teken Groep stijgt een beetje (bes 2,5, vijg 3). Er
is er steeds maar één weg, met een halve minuut tot bijna een minuut ertussen. De laatste bessen aan een struik laten ze hangen en ze
plukken niet voor je neus weg. Niet 's nachts, niet bij gevaar, niet als de groep vol zit.

**Vlees halen.** Snijd je vlees van een dier, dan komt de dichtstbijzijnde volwassene aanrennen, snijdt zelf een stuk
en draagt het naar het kamp (Groep +30). Zo levert één dier meer op dan jij alleen kunt dragen.

**Eerlijk:** in de savanne en bij het water kan alleen Kem lopen, dus daar helpt één persoon. Wie op pad is, kun je
onderweg een missie laten geven; hij loopt dan wel door. De groep redt het hiermee niet alleen: het teken zakt
langzamer, maar jij blijft nodig.

**Controle:** `v4groep.js` (alle vier gebieden).

## 16. Wat in fase 5b stap 5 is gebouwd (hyena's met een reden, 18-11-2026)

**Wanneer ze komen.** Hyena's liggen en zwerven bij hun karkas. Ze komen alleen op je af als er een reden is: je
staat bij hun prooi (binnen 16 m), je draagt een bot, je staat bij vlees dat los ligt, het is nacht en je bent alleen,
of je bent gewond (gezondheid onder 40) en buiten het kamp. Is er geen reden, dan laten ze je met rust, ook op 25 m.

**Eerst waarschuwen.** Wie hun aandacht trekt, krijgt eerst een hyena die stilstaat en gromt. Daarna draaien ze om je
heen. Pas een hyena die je ruim drie seconden heeft gewaarschuwd, waagt een uitval. Zonder waarschuwing wordt er niet
gebeten.

**Durf.** Staat er iemand van de groep binnen 9 m, of ben je in het kamp, dan blijven ze op 9,5 m en bijten ze niet;
na twaalf seconden druipen ze af. Uitzondering: je bent gewond, of je staat bij hun prooi of bij het vlees dat ze
willen. Alleen ben je dus kwetsbaar, samen niet.

**Vlees stelen.** Ligt er vlees los op de grond (buiten het kamp, binnen 70 m), dan sluipt de dichtstbijzijnde hyena
erheen, pakt het en rent weg met het vlees zichtbaar in de bek. Sta je erbij, dan dreigt hij eerst.

**Om het kamp.** Na vlees voor de groep ruiken ze het twee minuten lang: twee hyena's komen op een ring buiten het
veilige gebied om het kamp draaien en giechelen. Hetzelfde in een nacht zonder vuur. Brandt het vuur, dan is het
veilige gebied 26 m in plaats van 11 m. Loop je alleen met een bot het kamp uit, dan dreigen ze.

**Eerlijk:** dicht bij de oerolifant komen ze niet (dat was al zo). De luipaard en de sabeltandkatten zijn niet
veranderd; die hadden al een reden (nacht bij de bomen, hun eigen prooi).

## 17. Wat in fase 5b stap 6 is gebouwd (moe zonder donker, lichter begin, 18-11-2026)

**Wat er donker was.** Twee dingen maakten het beeld donker terwijl je liep: de rode waas om het beeld bij weinig
gezondheid, en het bijna zwarte beeld als je instortte. Beide zijn weg. Het beeld wordt alleen nog donker in de nacht
en als je gaat slapen.

**Moe.** Hoe moe je bent volgt uit je lijf: honger (voeding onder 22), dorst (water onder 18) of weinig gezondheid
(onder 40); de ergste van de drie telt. Je merkt het zo:
- je loopt tot 30% trager, en rennen lukt steeds minder; wie echt moe is, kan alleen nog lopen;
- je hijgt (adem in, adem uit; sneller als je loopt);
- je loopt voorovergebogen met je hoofd omlaag en je borst gaat op en neer;
- het teken met de longen knippert naast de andere tekens; de rand laat zien hoe moe.
Eten, drinken of herstellen: het gaat vanzelf over.

**Instorten.** Is je gezondheid op, dan val je achterover en blijf je vier tellen liggen. Daarna krabbel je op met
gezondheid 35. Het beeld blijft open; je ziet wat er om je heen gebeurt.

**Lichter begin.** Je begint met voeding 70 (was 55) en water 85 (was 75). Op dag 1 zakken voeding en water op 55% van
de gewone snelheid, op dag 2 op 75%, vanaf dag 3 gewoon. Zo is er tijd om het land te leren kennen.

**Eerlijk:** gezondheid was bij de start al 100 en kan niet hoger. Het teken Groep zakt even snel als eerst; daar helpt
de groep nu zelf bij (§15). Ziek zijn (buikpijn) is niet veranderd.

## 18. Fase 5c — elk gebied een eigen land (ontwerp, 18-11-2026)

**Wat er mis was.** De vier gebieden deelden één landformule: dezelfde heuvels (zelfde ruis), dezelfde rivier, dezelfde
70 acacia's en 55 keien op dezelfde plek (zelfde willekeur), dezelfde reuzenolifant met bijna dezelfde ronde, en het kamp
in drie van de vier gebieden binnen 40 meter van hetzelfde punt. Alleen "hoog" had een eigen kleur.

**Wat een gebied nu zelf bepaalt** (in het gebiedsbestand, onder `land`):

| Sleutel | Wat |
|---|---|
| `land.shift`, `land.amp`, `land.rough` | een ander stuk van de ruis, hoe hoog de heuvels zijn, hoe ruw de grond |
| `land.river` | de loop en de breedte van de rivier (of `terrain: 'lake'`) |
| `land.seed` | de willekeur voor alles wat gestrooid wordt: bomen, keien en struiken staan in elk gebied ergens anders |
| `land.flora` | welke bomen en struiken er groeien en hoeveel: `[{ model, n, size, near }]` |
| `land.rocks` | welke keien (familie en tint) en hoeveel |
| `land.ground` | de vier grondfoto's (kaal, droog, groen, rots) en de tint |
| `land.sky` | tint van licht, nevel en lucht |
| `camp` | hoe het kamp eruitziet: `boom`, `palmen`, `overhang` of `kring` |
| `hill` | alleen een heuvel als het gebied er een noemt |

**De vier landen.**

| Gebied | Land | Kamp | Groeit er | Alleen hier |
|---|---|---|---|---|
| savanne | glooiende grassavanne, brede rivier | onder de oude schermacacia | schermacacia's, baobabs, vijgen | de reuzenolifant |
| water | vlakke, lichte oever van een zakkend meer; zand en gebarsten modder | op een zandrug tussen palmen, het meer in zicht | dadelpalmen, waaierpalmen, rietvelden | nijlpaarden in het meer |
| berg | zwart lavaland onder de vulkaan: ruw, kaal, as en basalt | onder een overhangende rotswand | kandelaarbomen (euphorbia), boomaloë's, dode stammen | de rokende berg, stoom uit de grond |
| hoog | koel, groen hoogland met nevel; een smalle beek, bemoste rotsen | een open kring van keien bij een rotspunt | jeneverbes, wilde olijf, graspollen | het verre uitzicht over de rand |

**Volgorde.** (1) motor + land + kamp + planten per gebied; (2) eigen grote dieren per gebied; (3) trekken binnen een
gebied (de groep breekt op naar een volgende kampplek); (4) missies die je het land in sturen.

**Modellen** (zie `v4/assets/CREDITS.md`): PlantCatalog (CC BY 4.0) dadelpalm, waaierpalm, kandelaarboom; Poly Haven (CC0)
boomaloë, olijfachtige boom, maanrots (als basalt), bemoste keien, rotswanden; Valery.Li (CC BY) jeneverbes.

### 18a. Wat van stap 1 is gebouwd (land, 18-11-2026)

De tabel hierboven was het ontwerp. Dit is wat er staat:

- **Sleutels in `land`** (gelezen in `world.js`): `seed`, `shift`, `amp`, `freq`, `fine`, `river`, `acacias`, `logs`, `twigs`,
  `flora` (per soort: `model`, `n`, `tall`, `near: 'water'|'dry'`, `reach`, `patch`, `clump`, `at` voor vaste plekken, `each` voor
  een set losse pollen), `rocks` (`models`, `tint`, `n`, `big`), `rocksAt`, `props` (grote losse rotsstukken met botsing en dekking),
  `bush`, `ground` (`bare`, `dry`, `green`, `rock`, `shore`, `wall`), `grass`, `sky`. Extra foto's staan in `textures`,
  eigen woorden in `words`, de tekst bij het kamp in `looks.tree`.
- **Geen sleutel `camp`.** Het kamp is opgebouwd uit dezelfde bouwstenen: palmen op vaste plekken (water), drie rotsstukken als
  wand (berg), een rij keien en een bosje (hoog), plus een lage bult (`relief`, soort `rug`).
- **Een heuvel alleen als het gebied `hill` noemt.** Berg en hoog hadden een `hill` voor de reus, maar de heuvel lag altijd op de plek van de savanne. Nu ligt hij waar het gebied hem zet.
- **Niets schuift over vaste plekken.** Alles wat gestrooid wordt, blijft weg van de vaste plekken uit het gebiedsbestand (`clear()`).
- **Afwijkingen van het ontwerp.** Geen wilde olijf (geen goed model): op de hoge vlakte staan jeneverbessen en rozetten op een stam.
  De wand bij de berg hangt niet over; het zijn drie rotsblokken naast elkaar. De rotspunt en "het verre uitzicht" op de hoge vlakte zijn niet gebouwd.
  De eigen dieren staan in §19.
- **Vervangers** (staan zo in CREDITS.md): Europese en Californische waaierpalm voor de doumpalm, Canarische dadelpalm voor de wilde dadelpalm,
  westelijke jeneverbes voor de Afrikaanse, kokerboom-rozet voor de reuzenlobelia.
- **Prestaties.** Driehoeken bij de start: savanne 692 duizend (was gelijk), water 694, berg rond 860, hoog 811. De controle waarschuwt vanaf 450 en keurt af boven 900: berg zit daar dicht tegenaan.
- **Controleren:** `node /root/tools/pw/v4land.js <gebied> [abcdef]` maakt schermfoto's van het kamp van zes kanten.

## 19. Fase 5c — elk gebied een eigen groot dier (18-11-2026)

**Wat er mis was.** De reuzenolifant liep in alle vier de gebieden bijna dezelfde ronde. Wie een ander gebied koos, zag hetzelfde dier.

**Wat er nu is.** `giant.js` is vervangen door `beast.js` (gedeeld: ronde, afdrukken, kudde, zintuigen, raken, sterven) en `beasts.js`
(per soort: model, maat, snelheid, bewegingen, teksten). Elke soort heeft één eigen regel die je moet leren:
- **Nijlpaarden (water)**: de plek en het uur. Overdag is het water van hen, 's avonds het pad naar het gras. De gevaarlijkste plek is tussen het dier en het water.
- **Neushoorn (berg)**: de wind. Onder de wind kom je tot op een paar meter; boven de wind ruikt hij je op 34 m. Zijn aanval is recht: opzij springen werkt, wegrennen niet.
- **Giraffen (hoog)**: zij zijn de uitkijk. Ze doen jou niets (behalve een trap van dichtbij), maar hun blik wijst een roofdier aan dat jij nog niet ziet.
- **Reuzenolifant (savanne)**: ongewijzigd.

**Modellen** (Sketchfab, CC BY, zie CREDITS.md): nijlpaard, witte neushoorn en giraf van nu als vervanger voor *Hippopotamus gorgops*, *Ceratotherium* en *Giraffa jumae*.
Eerlijk gelabeld in `species.js`. Het nijlpaard is groter gemaakt (schofthoogte 1,75 m). Het neushoornmodel kan alleen lopen en rennen: het grazen
(kop naar de grond, oren, staart) beweegt het spel zelf.

**Volgers.** Dieren die meelopen houden een plek naast en achter de voorste. Blijft er een achter een rots haken, dan loopt het er met een boog omheen
(gevonden in de test: een giraf stond op de hoge vlakte een hele ronde lang achter een kei).

**Nog niet goed.** De ogen van het nijlpaard staan zoals bij het dier van nu (bij *gorgops* stonden ze hoger). De vlekken van de giraf zijn die van nu.
De hyena's reageren niet op de nijlpaarden, de neushoorn of de giraffen; alleen de reuzenolifant houdt ze op afstand.

## 20. Fase 5d stap 6 — steen slaan met twee handen (19-11-2026)

**Wat er mis was.** Je sloeg staand, met één hand, in de lucht. Zo maakt niemand een snijsteen.

**Wat er nu is.** Je knielt op je rechterknie. De kern ligt in je linkerhand op je linkerbovenbeen, de klopsteen zit in je rechterhand.
Elke klap is: uithalen, schuin langs de rand slaan, doorzwaaien. Splinters in de kleur van de steen springen naar rechts weg.
Zit de kern in je rechterhand, dan wisselen je handen eerst. De vuistbijl kost meer klappen en de kern draait tussendoor.

**Hoe.** `hominin.js`: `strike()` start het knielen, `knapStep()` loopt door de opname (knielen, zitten, opstaan) en door de fasen van de slag,
`knapPose()` zet de stenen op hun plek. `armik.js` rekent schouder en elleboog terug vanuit de hand. Alle maten staan bovenin in `KNAP`.
`craft.js` vraagt alleen nog om een klap (`blow`) en krijgt een seintje op het moment dat de stenen elkaar raken.

**Eerlijk.** Alleen het knielen is een opname. De slag met de armen is gestuurd door het spel. De vingers sluiten niet om de steen.

**Bekend.** `v4erectus.js` loopt vast bij "kaarten": die test zoekt nog de kijkkaarten die in stap 1 zijn verdwenen. De delen ervoor (vuistbijl, vuur, braden) kloppen.

## 21. Fase 5d stap 7 — diep water is een grens (19-11-2026)

**Wat er mis was.** De rivier was overal even ondiep: je liep er dwars doorheen. In het meer hield het op bij een onzichtbare lijn, met het woord "Te diep".

**De regel** (overal dezelfde, `hominin.js`): `depth(x, z)` in `world.js` zegt hoe diep het water staat.
- tot je knie: je loopt bijna gewoon (hooguit een vijfde trager);
- tot je middel: je waadt, steeds trager (tot ruim een derde van je loopsnelheid), armen omhoog;
- dieper: je komt niet verder en stapt zelf terug naar ondieper water (`retreat`, ruim een seconde, langs de helling van de bodem).
De maten hangen aan je lengte: *Homo erectus* komt dus iets verder dan *Homo habilis*.

**De rivier.** De bedding is in het midden verdiept tot ongeveer twee meter water. De oevers zijn gelijk gebleven: drinken en water halen gaat als altijd.
Op één plek per gebied (`ford`: savanne x −70, berg x −60, hoog x 20) ligt de bodem hoog: daar is het 0,6 m diep en kun je naar de overkant.
Die plek ligt bewust niet recht voor het kamp: bij het kamp drink je veilig.

**Zien zonder woorden.** Het water krijgt zijn kleur uit een kaart van de diepte (512 × 512 punten, kost geen driehoeken): diep is donker en ondoorzichtig, ondiep licht.
De doorwaadbare plek zie je als een lichte band tussen twee donkere stukken.

**Krokodillen.** `shore.js` werkt nu ook in een rivier: aan weerskanten van de doorwaadbare plek ligt er één in het diepe. Hetzelfde gedrag als in het meer
(loeren, sluipen, uitvallen, wegzakken na een worp). Het krokodilmodel wordt daarom in elk gebied geladen (0,7 MB).

**Eerlijk.** Waden is geen opname maar de loopbeweging, trager, met zelf gestuurde armen. Het water spat niet op en maakt geen kringen om je benen.
Dieren en groepsgenoten kennen de regel niet; zij komen niet in het diepe omdat hun routes aan de zuidoever blijven.


## 22. Vier oude punten opgeruimd: gier, nest, vlinders, kind (19-11-2026)

Uit eerdere stappen stond nog open wat we zelf hadden gemaakt of omgevormd. Dat is vervangen door echte bronnen.

- **De staande gier.** Het model heeft botten maar geen bewegingen. De eigen bewegingen (pikken, hippen, kop draaien)
  zijn eruit. Er staan nu acht opgenomen bewegingen in `assets/anims/griffon.json`: staan, lopen, drie keer eten met
  de kop naar de grond en roepen van een roodborst; poetsen en rusten van een zwaan. Ze zijn overgezet op de botten
  van de gier (`/root/tools/homo-assets/scripts/rtb.js`). Gemeten in het spel: de kop gaat bij het eten van 0,69 naar
  0,31 m. Eerlijk: het zijn bewegingen van andere vogels, en de vleugels van dit model kunnen niet open.
- **Het nest.** In één op de vijf grote acacia's ligt een nest van takken boven op de kruin (`world.js`, `NEST`).
  Het model is een nest van een visarend (vervanger). Gieren vliegen er voor de nacht twee keer zo ver voor om;
  de eerste zit in het nest, de tweede ernaast.
- **De vlinders.** Drie soorten in plaats van één: scans van een echte Afrikaanse monarch, een page en een witje
  (de laatste twee verwant). Alle drie hangen aan het skelet van één geanimeerde monarch; vliegen, landen, zitten en
  opvliegen zijn de bewegingen van dat model.
- **Het kind.** Geen omgevormde volwassene meer. Het is een eigen model van een kind van ongeveer vijf jaar, gemaakt
  met de gegevens van MakeHuman (CC0). Een script zet het in de rusthouding van de volwassene en hangt het aan
  hetzelfde skelet (`kid_build.py`, `kid_bind.py`, daarna `glbrest.mjs`: Blender schuift bij het wegschrijven de
  draaiing van enkele botten naar hun kind, en dan vallen de bewegingen om). Zo doet het kind alles wat de groten
  doen: lopen, rennen, zitten, slapen, eten, wijzen. Eerlijk: het is het kind van een moderne mens. Een poging om het
  hoofd ouder te maken (lager voorhoofd, mond naar voren) zag er onnatuurlijk uit en is niet gebruikt.
  Het draagt een omslag van leer om de heupen.

Testen: `v4gier.js`, `v4gier2.js`, `v4gier3.js`, `v4nest.js`, `v4vlinder.js`, `v4kind.js`, `v4kind2.js`.

## 23. Fase 5c stap 2 — de groep trekt rond (19-11-2026)

**Wat er was.** De groep zat het hele spel op één plek. Het land droogde in een kring om het kamp uit, maar niemand ging weg.

**Wat er nu is.** Elk gebied heeft drie kampplekken (`camps` in het gebiedsbestand), elk met een eigen omgeving: eigen
rotsen, bomen en keien (`site`, `stones`). `systems/trek.js` weet waar het kamp nu ligt en verhuist alles wat erbij hoort.

- **Wanneer.** Na twee dagen op een plek (`STAY`), bij het wakker worden. Niet als het gaat regenen (dan groeit alles
  terug), niet met een zieke, niet als een missie op deze plek moet gebeuren, en alleen als jij bij de groep sliep.
- **Zonder woorden.** De voorste draait zich naar de nieuwe plek, wijst en roept. Dan loopt de groep in een rij: wie goed
  kan lopen voorop, dan het kind, dan de oudste. De voorste houdt in als de rij uit elkaar valt. Blijf je achter, dan roept
  hij opnieuw, uit de richting waar de rij loopt. De pijl aan de schermrand wijst naar het nieuwe kamp. Bij aankomst klinkt
  het geluid van thuiskomen.
- **Het vuur gaat mee.** Wat brandt of gloeit, draagt de voorste als brandend hout. Op de oude plek blijft een koude
  kring van keien met as liggen. Op de nieuwe plek brandt het vuur klein verder.
- **Het land.** Wat de groep achterlaat blijft kaal tot de regen komt (`state.left`); rond het nieuwe kamp hangt alles nog.
- **Slapen.** De slaapplekken worden op de nieuwe plek opnieuw gekozen (`group.beds`): rond het vuur als dat er is,
  anders op de vlakste vrije kant.
- **Bewaren.** Kampplek, dag van aankomst en de kale plekken worden bewaard. Trekt de groep weg omdat ze honger heeft,
  dan vind je haar terug op de volgende plek.
- **De weg.** Rechtuit lopen ging mis: onder de rokende berg liep de voorste tegen de rotswand en bleef daar staan.
  Nu zoekt het spel vooraf een route over een raster van het land (`systems/route.js`): om rotsen en stammen heen,
  en door water alleen als het niet anders kan.
- **Vangnet.** Komt de rij ergens niet doorheen, dan staat de groep na een ruime tijd vanzelf op de nieuwe plek.

Het werk stond sinds 18-11 op een aparte branch, van vóór de tekstloze herstelronde. Het is op de huidige stand gezet;
de opbreekkaart en de titel "Nieuw kamp" zijn vervallen. De namen en beschrijvingen van de plekken staan nog in de
gebiedsbestanden (de controles in de testmodus gebruiken ze), maar het spel toont ze niet.

Testen: `v4trek.js [gebied] [snel]` (opbreken, wijzen, lopen, aankomen, vuur, slaapplekken, nacht, bewaren, kwijtraken).

## 24. De sterrenhemel van toen (20-11-2026)

Bob merkte op dat mensen in de steentijd de hemel goed kenden en er hun nederzettingen naar richtten. Dat klopt voor de late steentijd. Voor dit spel (1,8 tot 1,4 miljoen jaar geleden) geldt iets anders: sterren bewegen, en in die tijd zijn de heldere sterren gemiddeld ruim twintig graden verschoven. De sterrenbeelden van nu bestonden dus nog niet. Wat wel hetzelfde was: de Melkweg, het draaien van de hemel, en opkomen in het oosten en ondergaan in het westen.

Gebouwd:
- `stars.py` rekent elke ster uit de HYG-catalogus terug: plaats min snelheid maal tijd, helderheid uit de nieuwe afstand. Controle: Canopus was toen de helderste ster en Ascella stond rond 1,4 miljoen jaar geleden vlakbij; dat past bij wat sterrenkundigen daarover schrijven.
- `stars.js` tekent de sterren als punten (grootte en kleur per ster) en de Melkweg als foto op een bol. De bol draait één keer per dag om de pool; de pool staat zo hoog als de breedtegraad van het gebied (Olduvai −3°, Turkana 4°, Melka Kunture 9°).
- Sterren komen in de schemer één voor één: de helderste eerst. Wolken doven ze.

Niet gedaan / eerlijk:
- De stand van de aardas (precessie, 26.000 jaar) is voor die tijd niet te weten; de pool staat waar hij nu staat.
- Sterren zonder gemeten afstand staan stil. Sterren die toen nog niet bestonden of feller waren, zijn niet gecorrigeerd.
- De sterren schijnen door dunne wolkenslierten heen. Er is geen maan aan de hemel getekend en er zijn geen planeten.
- De groep doet nog niets met de sterren.

