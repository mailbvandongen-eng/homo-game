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
| Bediening | Joystick en kijkvlak werken, maar bukken/springen gaat met veegbewegingen (drempels zijn "een eerste gok"), geen zoom, geen instelbare gevoeligheid, geen instellingenscherm. | 2 |
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
| **Camera** | Vaste afstand en hoogte, geen zoom, geen botsing met rotsen of bomen. | 2 |

## 4. Wat ontbreekt

- Instellingenscherm (gevoeligheid, geluid, kwaliteit).
- Zoom en camerabotsing.
- Klimmen, kruipen, zwemmen, vallen, dragen-als-houding (nu: staan, lopen, rennen, bukken, springen, gooien, rapen).
- Voeten op het terrein (IK) en overgangen tussen alle bewegingen.
- Ruimtelijk geluid, voetstappen per ondergrond.
- Weer als spelsysteem (regen en wind bestaan alleen als sfeer in het seizoen).
- Draagmiddelen na het draagvel (net, mand, waterzak) en water dragen.
- Combineren van voorwerpen als algemene handeling (nu per geval geschreven).
- Kwaliteitstrappen voor trage telefoons.
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
