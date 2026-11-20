# Masterplan Homo-spel

Eén doorlopend 3D-overlevingsspel in de browser, van *Homo habilis* tot de moderne mens. Je beleeft de ontwikkeling door te doen, niet door te lezen. Dit document is de leidraad voor de bouw; het oude `CAMPAIGN_PLAN.md` hoort bij het platformspel en geldt niet voor `v4/`.

Stand: november 2026. Het spel staat in `v4/` en draait op GitHub Pages.

---

## 1. Huidige architectuur

**Techniek.** Three.js (r187) als losse ES-modules, geen bouwstap. `v4/index.html` bevat de schermlaag (balken, handen, tas, kaarten) en alle CSS. De uitrol (`.github/workflows/deploy.yml`) hernoemt `v4/src` naar `v4/src-<versie>` en schrijft `v4/version.json`, zodat een telefoon nooit oude en nieuwe bestanden mengt.

| Bestand | Regels | Wat het doet |
|---|---|---|
| `main.js` | ~1300 | Spelstaat, lus, invoer (aanraking, muis, toetsen), camera, handen en tas, steen slaan, gooien, dag en nacht, boekje |
| `engine/ui.js` | 18 | **Nieuw:** de schermlaag: melding, grote titel, kaart. Weet niets van het spel |
| `systems/` | 335 | **Nieuw:** `missions.js` (missies, roepen, verder trekken), `season.js` (droge seizoen, nieuwe dag), `hints.js` (aanwijzingen), `body.js` (wat je lijf laat merken), `persist.js` (bewaren en verdergaan) |
| `world.js` | 461 | Terrein (rivier of meeroever met poelen en zandbank, naar het gebied), bomen, gras, licht, lucht |
| `hominin.js`, `rig.js` | 465 | De speler: model, animaties, lopen, sluipen, klimmen, gooien |
| `group.js` | 124 | De drie groepsgenoten (Tor, Kem, Ibo) bij de slaapboom |
| `predators.js` | 249 | Hyena's bij het karkas |
| `hunt.js` | 241 | Sabeltandkatten en hun jacht, de verse prooi |
| `encounters.js` | 473 | Luipaard, pofadder, vreemden, gewonde gazelle |
| `beast.js` | 510 | Het grote dier van een gebied: ronde, kudde, zintuigen, aanval, sterven |
| `beasts.js` | 119 | Per soort wat anders is: reuzenolifant, nijlpaard, neushoorn, giraf |
| `shore.js` | 169 | De oever: krokodillen, meervallen in de poelen, knollen onder de korst |
| `life.js`, `actors.js` | 438 | Kuddes, vogels, gieren, klein leven |
| `animal.js` | 40 | **Nieuw:** de gedeelde basis voor alle dieren: opmerken (zien, sluipen, dekking, wind) en de loopstap |
| `shape.js`, `shapes.js` | 290 | **Nieuw:** een model omvormen naar een andere soort (botten, huid, hoorns, slagtanden) en de recepten per soort |
| `items.js` | 289 | Alle teksten en gegevens van voorwerpen, dieren, vondsten |
| `audio.js` | 188 | Geluid, volledig gesynthetiseerd |
| `assets.js`, `icons.js` | 120 | Laden van modellen, pictogrammen |
| `eras/`, `save.js` | 64 | **Nieuw:** tijdperken en gebieden als gegevens; bewaren en verdergaan |

**Sterk.** De wereld, de besturing op een telefoon, de dieren met eigen gedrag, de zintuigen, het geluid en de rustige schermlaag werken en zijn getest (Playwright-tests in `/root/tools/pw/v4*.js`).

**Zwak.** `main.js` is nog te groot (invoer, camera, handen en tas, gooien en gevaar zitten er nog in). Wereld en dieren zijn in code vastgelegd in plaats van in gegevens. Er zijn twee gebieden. Alles (26 MB) wordt in één keer geladen. Tot deze stap ging bij het sluiten van de pagina alles verloren.

---

## 2. Nieuwe architectuur

Uitgangspunt: **de motor weet niets van een tijdperk; een tijdperk is een map met gegevens.** We verbouwen in kleine stappen terwijl het spel blijft werken, geen herschrijving.

```
v4/src/
  engine/      lus, invoer, camera, geluid, opslag, laden   (weet niets van geschiedenis)
  systems/     honger en gezondheid, dragen, maken, missies, groep, gevaar, dag en seizoen
  eras/
    index.js   de zeven tijdperken in spelvolgorde
    habilis.js wie je bent, wat vaststaat, welke gebieden
    ...
  areas/       per gebied: terrein, planten, dieren, grondstoffen, missies
  species/     dieren: model, gedrag, wanneer en waar ze leefden
  things/      grondstoffen, gereedschap, voedsel
```

Afspraken:

- **Een gebied is een gegevensbestand**: welk terrein, welke dieren (met aantallen en plekken), welke grondstoffen, welke missies, en wat het volgende gebied is. De motor bouwt daar de wereld van.
- **Elke soort draagt zijn eigen tijd en plaats.** Een gebied kan alleen soorten plaatsen waarvan tijd en werelddeel kloppen; een test controleert dat. Zo kan er nooit per ongeluk een mammoet op de Afrikaanse savanne staan.
- **Techniek is een gevolg van handelen.** Geen technologieboom. Een techniek ontstaat als je de juiste dingen bij elkaar brengt (kei op kei → afslag). Wat je kunt, staat in `state.known`; wat je kunt hangt af van het soort mens (`era`).
- **Missies komen uit de groep**, per gebied een handvol, elk rond één nieuwe vaardigheid. Alle missies klaar → de groep trekt verder.
- **Laden per gebied.** Modellen en geluiden van een gebied worden pas opgehaald als je er komt.
- **Opslag met versienummer**, zodat een oude opslag bij een nieuwe versie netjes wordt omgezet of genegeerd, nooit het spel breekt.

### Spelvolgorde

Dit is een spelvolgorde, geen stamboom: soorten leefden deels naast elkaar en zijn niet simpelweg uit elkaar voortgekomen.

| # | Mens | Techniek | Tijd | Waar | Kern van het spel |
|---|---|---|---|---|---|
| 1 | *Homo habilis* | Oldowan | ca. 2,4–1,65 mln jaar | Oost-Afrika | Aas, afslagen, in de groep blijven |
| 2 | *Homo erectus* | Acheuléen | ca. 1,9 mln – 110.000 jaar | Afrika → Azië | Vuistbijl, lange tochten, vuur leren beheersen |
| 3 | *Homo neanderthalensis* | Midden-Paleolithicum | ca. 400.000–40.000 jaar | Europa, West-Azië | IJstijd, speren, grootwildjacht, berkenpek |
| 4 | *Homo sapiens* | Laat-Paleolithicum | ca. 50.000–12.000 jaar | Europa/Azië | Naald, speerwerper, kunst, hond |
| 5 | Boeren | Neolithicum | vanaf ca. 9500 v.Chr. | Vruchtbare Halvemaan → Europa | Zaaien, vee, aardewerk, dorp |
| 6 | Arbeiders | Industriële revolutie | ca. 1760–1840 | Groot-Brittannië | Stoom, fabriek, stad |
| 7 | Moderne mens | Nu en straks | — | Wereld | Open; nader te bepalen |

### Zekerheid

Bij elk tijdperk houden we vier treden bij: **vastgesteld** (vondsten), **sterk aannemelijk** (afgeleid uit vondsten), **onzeker** (onderzoekers zijn het oneens of bewijs ontbreekt) en **artistieke invulling** (onze keuze voor het spel). In de code: `zeker: { vast, aannemelijk, onzeker, artistiek }`. De tabel hieronder is de oude driedeling; de actuele lijst staat in de bestanden zelf. Per dier staat in `species.js` bovendien hoe goed het model past (`beeld`: reconstructie, verwant of vervanger). De volgorde van de tijdperken is een tijdlijn, geen rechte stamboom: soorten leefden naast elkaar en wie van wie afstamt is deels onzeker. Voor het huidige tijdperk staat dat in `eras/habilis.js`:

| Vaststaat | Aannemelijk | Spelkeuze (speculatief) |
|---|---|---|
| Afslagen en kernen van keien | Aas halen bij de prooi van grote katten | Een huid als draagvel |
| Snijsporen op botten van grote dieren | Eten delen in een kleine groep | Een huid om de schouders tegen de kou |
| Botten gekraakt voor merg | Stenen gooien naar roofdieren | Bitterblad als geneesmiddel |
| Sabeltandkatten, hyena's, zebra-achtigen en de reuzenolifant *Palaeoloxodon recki* in hetzelfde landschap | Honing, eieren, bessen, bladeren; slapen in bomen | Namen en vaste rollen in de groep |

Kanttekeningen die we eerlijk meenemen: wie de Oldowan-werktuigen maakte is niet zeker (*Homo habilis* is de gangbare kandidaat; de oudste werktuigen zijn ouder dan de soort). Huiden vergaan, dus draagvel en omslag zijn niet te bewijzen; ze blijven in het spel omdat dragen de speler richting geeft, maar ze worden nergens als feit gebracht. Vuur komt pas bij *Homo erectus* en ook daar als iets wat je eerst alleen vindt en bewaart, niet maakt.

---

## 0. Herontwikkeling (vanaf 12 november 2026) — gaat vóór alles hieronder

Het spel moet aanvoelen als een volwaardige game: realistisch landschap, anatomisch juiste mensen en dieren
per soort, een bediening die op een telefoon vanzelf gaat, en een testmodus waarmee elk gebied en elke missie
direct te openen is. **Er komen geen nieuwe tijdperken of gebieden bij tot deze basis staat** (Dmanisi en stap I wachten).

Werkwijze: ontwikkelen op de branch `ontwikkel`; een fase gaat pas naar `main` (en online) als alle tests slagen
en het spel speelbaar is. Back-up van vóór de herontwikkeling: tag `backup-voor-herontwikkeling-2026-11-12`.
De inventaris waarmee dit begon staat in [`ANALYSE.md`](ANALYSE.md).

| Fase | Wat | Stand |
|---|---|---|
| 1 | **Analyse en fundament**: inventaris, back-up en branch, knelpunten, testmodus `?dev=1`, scenario's, automatische controles, kennisbasis met vier treden | **klaar** (prestatiedoel deels: zie ANALYSE §6) |
| 2 | **Interface en bediening**: invoer en camera uit `main.js` (`engine/controls.js`); joystick en camera met instelbare gevoeligheid en zoom; één knoppensysteem met woordknoppen (Buk, Spring, actie, Meer, handen, Tas); contextmenu; menu met pauze; instellingenscherm met beeldkwaliteit | **klaar** (handen/tas/eten uit `main.js` halen schuift naar fase 5; zie ANALYSE §7). Op 13-11-2026 zijn de woordknoppen vervangen door ronde knoppen met een teken, tik rechts = springen, veeg links omlaag = bukken, en een stem bij het eten: zie ANALYSE §9 |
| 3 | **Mens en dieren**: een gereedschap dat modellen omvormt (`shape.js`, `shapes.js`); eigen vorm voor *Homo habilis* en *Homo erectus* (man, vrouw, kind); reuzenolifant, impala (ram, ooi, jong) en pofadder omgevormd; krokodil en meerval als echt model; gedeelde basis voor diergedrag (`animal.js`) | **klaar** (voeten op het terrein schuift naar fase 4; zie ANALYSE §8) |
| 4 | **Wereld**: reliëf, kloven en klimbare rotsen; voeten die het terrein volgen; botsingen; licht en weer; ruimtelijk geluid en voetstappen per ondergrond; LOD | **klaar** (14-11-2026; LOD alleen voor het rekenen aan dieren, niet voor bomen en struiken; zie ANALYSE §10) |
| 5 | **Gameplay**: handen, tas en eten als eigen systeem (`systems/`); missies verdiepen; draagmiddelen (net, mand, waterzak); overleven; kennisscherm in het spel | **eerste deel klaar** (16-11-2026): vrij een gebied kiezen met eigen voortgang per gebied; handen, tas, eten en maken staan in `systems/`; dorst en drinken; de waterzak en de missie *Water voor Tor*; het blad *Hoe zeker is dit?*; zebra's en de gewonde gazelle ruiken je. **Net en mand komen niet in deze twee tijdperken**: touw en vlechtwerk zijn pas veel later aangetoond en horen bij tijdperk 3–4. Nog te doen: meer missies per gebied, voorwerpen combineren als één regel; zie ANALYSE §11 |
| 6 | **Kwaliteitscontrole**: elk gebied en scenario door de controles zonder "let op"; telefoonproef; licenties en bronnen nagelopen | |

### Fase 5b — speelbaarheid (opdracht van Bob, 17-11-2026)

Na proefspelen op de telefoon. Dit geldt voor **alle gebieden en beide tijdperken**, niet alleen voor de plek
waar het opviel. Volgorde van bouwen = volgorde van de tabel.

| # | Wat | Waarom | Stand |
|---|---|---|---|
| 1 | **Tekst uit de weg van het stuur.** Geen tekst of balk die een aanraking opvangt op de linkerhelft; streepjes korter | de missieregel blokkeerde het sturen | **klaar** (regel bovenaan midden, vangt niets op) |
| 2 | **Missies duidelijker.** Meerdere missies tegelijk; een subtiel missieoverzicht in plaats van een groot tekstblok | zie ANALYSE §12 | **klaar**: meerdere tegelijk, overzicht achter het teken rechtsboven (spel staat stil), vinkje + geluid bij een stap, per missie het gezicht van wie het vroeg (plaatje van het echte model) en een teken van wat hij wil. De wereld wijst de weg: wie het vroeg kijkt en wijst naar wat je zoekt, en dat ding schittert van ver (elke stap heeft `find`) |
| 3 | **Vinden wat een missie vraagt.** Losse takken onder bomen, dode bomen herkenbaar, iemand uit de groep wijst de kant op | "Pak een tak" terwijl er nergens een tak ligt | **klaar** (18-11): een tak onder elke vaste acacia en onder één op de drie andere (ook bij het kamp; na de regen liggen er nieuwe); dode bomen zijn hoger, kaal en gebleekt, met afgebroken takken aan de voet; de gever van de missie wijst |
| 4 | **Meer eten in het land.** Botten met merg bij oude karkassen (gieren), vruchten onder bomen, noten kraken, knollen, meer eieren en honing; bessenstruik weg bij de slaapboom | alleen bessen is te mager | **klaar** (18-11, `forage.js`): per gebied twee vijgenbosjes (elke ochtend drie vijgen), drie baobabs (vrucht kraken met een kei; in de droogte staat hij kaal en liggen er drie), oude karkassen met gieren en mergbotten, knolplanten op het droge (graven met de stok), vaker een nest of bijen, meer honing. **Niet gebouwd:** marula en losse noten (geen bruikbaar model gevonden) |
| 5 | **De groep doet zelf mee.** Volwassenen zoeken overdag zelf eten; bij een karkas draagt iemand mee | de groep stond te wachten naast een struik | **klaar** (18-11, `group.js`): overdag gaat om de beurt één volwassene zelf op pad naar een struik of vijgenbosje bij het kamp, plukt, draagt het in zijn hand terug en de groep eet (teken Groep stijgt een beetje). Snijd je vlees van een dier, dan komt er iemand aanrennen die zelf een stuk snijdt en naar het kamp draagt. Niet 's nachts, niet bij gevaar, de oude en het kind blijven |
| 6 | **Roofdieren met een reden.** Hyena's komen alleen als er iets te halen is, waarschuwen eerst, bijten alleen wie alleen of gewond is of bij hun prooi staat | hyena's liepen doelloos rond of beten zonder aanleiding | **klaar** (18-11, `predators.js`): hyena's blijven bij hun karkas tot er iets te halen is; eerst grommen en omcirkelen, dan pas een uitval; niet bij wie iemand naast zich heeft; los vlees stelen ze, bij vlees in het kamp of een nacht zonder vuur draaien er twee om het kamp. Zie ANALYSE §16 |
| 7 | **Moe zonder donker.** Moe merk je aan je lijf (trager, hijgen, niet rennen); donker is alleen de nacht | het beeld werd zwart tijdens het lopen | **klaar** (18-11): geen zwart beeld en geen rode waas meer. Moe = trager, niet rennen, hijgen, voorovergebogen, knipperend teken (longen). Wie instort, valt en krabbelt op in beeld. Zie ANALYSE §17 |
| 8 | **Minder zwaar begin.** Voeding en water zakken de eerste dagen langzamer | het spel is te zwaar | **klaar** (18-11): start met voeding 70 en water 85; op dag 1 zakken ze op 55% van de snelheid, op dag 2 op 75% |

| 9 | **Vormgeving uit de wereld.** Vensters van materiaal uit de tijd, iconen uit één gedownloade set (game-icons.net, CC BY 3.0), zo min mogelijk tekst, knoppen alleen als er iets kan, streepjes als kleine tekens | zie ANALYSE §13; keuze E: het materiaal groeit mee (habilis de grond, erectus de binnenkant van een huid) | **klaar** (18-11): alle iconen uit game-icons.net, vensters van grond of huid, koppen in Cabin Sketch, vier ronde tekens met leeglopende rand in plaats van balken, korte meldingen met teken + woord voor wat vaak gebeurt. De lange verhalende meldingen blijven tekst |

Vaste regels die hieruit volgen (gelden ook voor alles wat later komt):
- Wat een missie vraagt, is in dat gebied te vinden zonder zoeken naar een speld.
- Geen gevolg zonder zichtbare oorzaak: een dier valt niet aan zonder waarschuwing, het beeld verandert niet zonder reden die je ziet.
- De groep is geen publiek: wie kan lopen, doet iets.
- Geen tekst op de plek van een duim.
- Geen zelfgetekende iconen: alles uit dezelfde set, een ontbrekend icoon wordt uit die set afgeleid.
- Een venster is van iets uit de wereld van dat tijdperk gemaakt.

### Fase 5c — de groep trekt, elk gebied een eigen land (opdracht van Bob, 18-11-2026)

Bob zag dat alle beelden op elkaar leken: vier gebieden op dezelfde kaart, met dezelfde boom, dezelfde olifant
en dezelfde heuvel, en het kamp bijna op dezelfde plek. "Jagers-verzamelaars trekken toch rond? Nu zijn ze altijd daar. Dodelijk saai."

Twee uitgangspunten, die voor alles gelden wat nog komt:
- **Bij elke keuze over de omgeving en het spel: de beste, mooiste en meest uitgebreide optie.** Hoeveel werk het kost, telt niet mee.
- **Deze mensen trekken rond.** Een gebied is een andere plek, geen andere opdracht op dezelfde plek.

| # | Wat | Stand |
|---|---|---|
| 1 | **Elk gebied een eigen land.** Eigen vorm van het terrein, eigen kampplek (niet steeds een slaapboom), eigen bomen en planten, eigen grond, licht en lucht, eigen dieren en eigen blikvanger. Op één schermfoto bij het kamp zie je welk gebied het is | **land klaar** (18-11): elk gebied heeft een eigen terrein, rivierloop, kampplek, planten, keien, grond en licht (zie hieronder). **Dieren klaar** (18-11): elk gebied heeft zijn eigen grote dier met een eigen les (zie hieronder) |
| 2 | **Trekken binnen een gebied.** De groep blijft niet het hele seizoen op één plek: als het eten of het water opraakt, breekt ze op naar een volgende kampplek verderop | **klaar** (19-11): drie kampplekken per gebied, de groep loopt er in een rij heen, het vuur gaat mee, zonder woorden (zie hieronder) |
| 3 | **Missies sturen je het land in.** Al in de eerste minuten weg van het kamp, naar wat dit gebied bijzonder maakt | |

Hoe de vier gebieden nu van elkaar verschillen (stap 1, land):

| Gebied | Kamp | Land | Planten en keien |
|---|---|---|---|
| De savanne | de slaapboom, een oude acacia bij de heuvel | droge, vlakke grasvlakte | schermacacia's, baobabs, granieten keien |
| Bij het water | een lage zandrug tussen hoge palmen, het meer in zicht | vlak, zand, gebarsten modder langs het water, veel riet | waaierpalmen, palmbosjes aan de oever, lichte keien |
| Onder de rokende berg | tegen een donkere rotswand | ruw, donkere lavagrond, grijze lucht, kort geel gras | kandelaarbomen, boomaloë's, dode stammen, zwartgrijze keien |
| De hoge vlakte | een bult in het gras, een rij keien tegen de wind, een bosje jeneverbes | steile ruggen, groen, nevel, koel licht | jeneverbessen in bosjes, rozetten op een stam, graspollen, keien met mos, vijgen (geen baobabs) |

Het grote dier per gebied (stap 1, dieren; `beast` in het gebiedsbestand, gedrag in `v4/src/beast.js`, soorten in `beasts.js`):

| Gebied | Dier | Wat het doet | Wat je ervan leert |
|---|---|---|---|
| De savanne | de reuzenolifant (één oude stier) | loopt zijn ronde van boom naar boom, schudt vruchten los, houdt roofdieren op afstand | volg hem op afstand |
| Bij het water | drie nijlpaarden (*Hippopotamus gorgops*) | liggen overdag in het meer, grazen van de late middag tot de ochtend op het land langs een vast pad | blijf uit hun water en ga nooit tussen hen en het water staan |
| Onder de rokende berg | een neushoorn (*Ceratotherium*) | graast alleen; ziet slecht, ruikt scherp, rent rechtuit | let op de wind; spring opzij |
| De hoge vlakte | drie giraffen (*Giraffa jumae*) | eten van de boomkruinen, zien je van ver en gaan ervandoor | waar zij alle drie naar kijken, loopt een roofdier |

Alleen de reus en het oude nijlpaard sterven in de droogte (vlees, daarna een kies of een kromme tand als vondst).

De kampplekken (stap 2; `camps` in het gebiedsbestand, het trekken zelf in `v4/src/systems/trek.js`):

| Gebied | Eerste plek | Tweede plek | Derde plek |
|---|---|---|---|
| De savanne | de slaapboom bij de heuvel | de oude baobab in het westen | de keienkop in het oosten, met een vijg |
| Bij het water | de palmen op de zandrug | de rotskop in het droge land, ver van het meer | de grote vijg aan de westoever |
| Onder de rokende berg | de donkere wand | de rand van de kloof, achter een scheve rots | de rotskop met kokerbomen, dicht bij de berg |
| De hoge vlakte | de bult met de jeneverbes | de kom onder de heuvel, bij de gazellen | bij de zwarte rotsen (het glas) |

De groep blijft twee dagen op een plek en breekt dan 's ochtends op, behalve als het gaat regenen, als er iemand ziek is
of als een missie op die plek moet gebeuren. Alles gaat zonder woorden: de voorste wijst en roept, de groep loopt in een
rij, de pijl aan de schermrand wijst naar het nieuwe kamp. Het vuur gaat mee. Wat de groep achterlaat blijft kaal tot de regen.
Eerlijk: de namen en beschrijvingen van de plekken staan nog in de gebiedsbestanden, maar het spel toont ze niet.

Een gebied beschrijft zijn land in het eigen bestand onder `land` (zie ANALYSE §18). De savanne heeft geen `land` en is niet veranderd.

Vaste regel erbij: twee gebieden delen nooit dezelfde blikvanger (boom, dier, heuvel) op dezelfde plek.

### Fase 5d — herstelronde (opdracht van Bob, 18-11-2026) — gaat vóór stap 2 en 3 van fase 5c

Na proefspelen: mensen lagen in doodshouding ín de grond bij de slaapboom, het scherm stond vol tekst,
je ging te snel dood en gieren en vlinders waren zelfgemaakte flappen. Bob: "Maak het niet te moeilijk.
Maar maak je er zeker niet makkelijk vanaf."

Volgorde van bouwen = volgorde van de tabel. Elke stap wordt eerst getest en dan pas uitgerold.

| # | Wat | Hoe | Klaar als |
|---|---|---|---|
| 1 | **Een tekstloos spel.** Alle tekst uit het spelbeeld | Weg: meldingen (`toast`, `murmur`), woorden bij tekens (`note`), titels, dagkaart, missiekaarten en missieregel, uitlegbalk (`#hint`), kijkteksten, woorden bij knoppen. In de plaats: wat je ziet en hoort. Besturing leer je door een bewegend duimteken; een missie krijg je doordat iemand uit de groep wijst of het voordoet; het missieoverzicht toont gezicht + teken + vinkjes; een nieuwe dag en een nieuw seizoen zie je aan licht, lucht en land. Tekst blijft alleen buiten het spel: menu, instellingen en het kennisblad | een controle telt nul zichtbare letters tijdens het spelen, in elk gebied en beide tijdperken; elke missie is zonder tekst te halen |
| 2 | **Minder snel dood** (het midden tussen World of Warcraft en een overlevingsspel) | Zie *Regels voor leven en dood* hieronder | drie fouten achter elkaar overleef je altijd; twee speldagen zonder eten of drinken overleef je; de rivier lest je dorst |
| 3 | **De slaapplek.** Niemand meer in doodshouding of in de grond | Echte slaapanimaties uit een echte bron: op de zij met opgetrokken knieën, en zittend tegen de stam. De groep ligt dicht bij elkaar, het kind tegen een volwassene; één volwassene zit rechtop en waakt. *Homo habilis* slaapt in de boom (nest op een dikke tak of in een vork), *Homo erectus* op de grond bij het vuur. Elke slaper heeft een vaste plek die vooraf op de grond of de tak ligt; het optillen achteraf en de doodsanimatie gaan eruit. Wie eten krijgt, komt overeind, pakt het aan en eet zichtbaar. Geldt voor elke kampplek in elk gebied | foto bij nacht in elk gebied en beide tijdperken: niemand door de grond of zwevend, geen gespreide armen en benen; een bot brengen laat iemand opstaan en eten |
| 4 | **Gieren.** Echt model, juist gedrag | Een echt giermodel met vliegen, lopen en eten. 's Nachts zijn ze uit de lucht (ze zitten in een boom); ze stijgen op halverwege de ochtend en landen voor de schemer. Bij een kadaver zitten en lopen gieren op de grond en eten het leeg als je wacht. Een steen jaagt ze weg: ze hippen een paar meter weg en komen terug. **Losse stenen liggen overal** in elk gebied om op te rapen en te gooien | 's nachts geen gier in de lucht; een worp jaagt de gieren van het kadaver; in elk gebied ligt binnen korte afstand een steen |
| 5 | **Een echt kind en echte vlinders** | Het kind krijgt eigen verhoudingen (groter hoofd, korter been, ronder lijf) in plaats van een verkleinde volwassene, bij beide soorten. Vlinders krijgen echte vleugels (model of foto-textuur uit een echte bron), anders gaan ze eruit | kind naast volwassene op de foto klopt met de verhoudingen van een kind; geen zelfgemaakte vormen meer in de controles |
| 6 | **Steen slaan met twee handen** | Zoals de Oldowan-techniek: gehurkt, de kern in de ene hand op het bovenbeen, een klopsteen in de andere, een schampende slag op de rand; de scherf springt zichtbaar weg. Dat vraagt dus twee stenen. De vuistbijl van *Homo erectus* kost meer slagen en hij draait de steen tussendoor. Echte animatie zoeken; lukt dat niet, dan een bestaande slagbeweging omgevormd en eerlijk gelabeld | op de foto twee handen, twee stenen, gehurkt; scherf valt op de grond |
| 7 | **Diep water is een grens** | Overal dezelfde regel, ook in de rivieren: tot de knie loop je gewoon, tot het middel waad je traag met een waadbeweging, dieper ga je niet (zwemmen kan niemand). Zonder tekst: diep water is donkerder en je personage stapt zelf terug. Oversteken doe je op een ondiepe plek, en daar liggen de krokodillen | in elk gebied kom je nergens kopje-onder; elke rivier heeft een doorwaadbare plek |

**Regels voor leven en dood** (stap 2):

- **Uithoudingsvermogen.** Lopen en draven kost niets: *Homo* kon de hele dag door. Alleen sprinten kost adem, en die is in een paar tellen terug.
- **Honger en dorst** zakken over ongeveer twee speldagen, maken je niet traag en doden nooit. Leeg zijn zet alleen het herstel vanzelf stil. In stromend water drink je vanzelf; sappig eten lest ook dorst.
- **Vanzelf herstellen** doe je tot de helft, langzaam en alleen uit gevaar.
- **Eten geneest de rest**, direct bij elke hap: vlees en merg veel, knollen en vijgen gemiddeld, bessen weinig.
- **Groene blaadjes zijn voor wonden**: ze genezen je volledig en stoppen gif. Bewaar ze in je tas.
- **Schade per treffer** (van 100): hyena 8 · slang 12 plus gif · luipaard en krokodil 22 · sabeltandkat en grote dieren 30.
- **Drie tellen onkwetsbaar** na een treffer.
- **Gif** vreet langzaam door tot je blaadjes gebruikt, maar stopt bij een kwart leven.
- **Neervallen is niet dood**: je wordt zwak wakker bij de groep en bent kwijt wat je droeg. Je voortgang blijft.

**Stand (19-11-2026):** alle zeven stappen zijn gebouwd en getest in alle vier de gebieden. Fase 5d is klaar; daarna volgt fase 5c stap 2 (trekken).

- Stap 3, wat er nog niet is: er ligt geen nest in de boom; *Homo habilis* slaapt bij de stam.
- Stap 4, eerlijk over het beeld: in de lucht is het een vliegend model met vleugelslag, op de grond en in de boom
  een staande vale gier (een echt model, maar zonder eigen bewegingen). Pikken, stappen, hippen en de kop draaien
  maken we zelf met de botten. De vleugels van het staande model kunnen maar half open; bij opstijgen en landen
  wisselt het spel van model. Testen: `v4gier.js [gebied]` en `v4gierreus.js`.
- Stap 5, eerlijk over het beeld (bijgewerkt 19-11): het kind is nu een eigen model, een mensenkind van ongeveer vijf
  jaar uit de gegevens van MakeHuman (CC0), aan het skelet van de volwassene gehangen zodat het alles meedoet. Het is
  het kind van een moderne mens ("aangepast"), geen kind van *Homo habilis*; het draagt een omslag van leer. Er zijn
  drie vlinders: scans van echte vlinders (Afrikaanse monarch, een page en een witje; de laatste twee verwant) op het
  skelet en met de bewegingen van een geanimeerde monarch. Testen: `v4kind.js`, `v4kind2.js` en `v4vlinder.js [gebied]`.
- Bijgewerkt 19-11, gieren: de staande gier beweegt nu met bewegingen die zijn overgezet van een roodborst en een zwaan
  (eten met de kop naar de grond, poetsen, roepen, lopen, rusten); de vleugels van dat model kunnen niet open. In één
  op de vijf grote acacia's ligt een nest van takken (model van een visarendnest, vervanger) waar de gieren slapen.
- Stap 6, eerlijk over het beeld: het knielen, zitten op één knie en opstaan is een opgenomen beweging
  (`Fixing_Kneeling`). Een opname van steen slaan bestaat niet in een vrije bron: de armen stuurt het spel daarom
  zelf (`armik.js`). De linkerhand houdt de kern op het linkerbovenbeen, de rechterhand haalt uit en slaat schuin
  langs de rand; splinters springen weg en blijven even liggen (`chips.js`). Bij de vuistbijl draait de linkerhand
  de kern vóór elke slag een stuk door. Lopen breekt het slaan af: je maakt de klap af en staat op.
  Testen: `v4knap.js [gebied] [bijl] [foto]`.
- Stap 7, de regel: tot je knie (0,28 × je lengte) loop je bijna gewoon, tot je middel (0,55 × je lengte) waad je steeds
  trager, dieper kom je niet: je personage stopt en stapt zelf een stuk terug. Diep water is donker en je ziet de bodem
  niet. Elke rivier is in het midden twee meter diep, behalve op één plek (`ford` in het gebiedsbestand): daar ligt de
  bodem hoog en is het water licht. Aan weerskanten van die plek ligt een krokodil in het diepe. Eerlijk over het
  beeld: er is geen opname van waden. Het is de gewone loopbeweging, trager, met de armen omhoog en uit elkaar
  (zelf gestuurd). Testen: `v4wade.js [gebied] [foto]`.

Het trekken (fase 5c stap 2) is daarna tekstloos afgemaakt (19-11); zie fase 5c.

Vaste regels die hieruit volgen (ze vervangen "de lange verhalende meldingen blijven tekst" uit fase 5b):
- Het spel vertelt niets in woorden. Wat de speler moet weten, ziet of hoort hij.
- Behoeften maken je zwak, gevaar maakt je dood, en gevaar geeft altijd een tweede kans.
- Een houding of beweging is die van het echte gedrag: geen animatie lenen die iets anders betekent.
- Dieren zijn er alleen op het uur waarop ze er echt zijn.

Regels die voor elke fase gelden:
- Het spel blijft na elke fase speelbaar; bestaande functies verdwijnen niet zonder vervanging.
- Elke wijziging wordt in het draaiende spel bekeken, ook op telefoonformaat.
- Een tijdelijke oplossing krijgt een label (in `species.js`: `beeld: 'vervanger'`) en staat in de controles tot ze vervangen is. Een omgevormd model heet `'aangepast'`, met erbij wat nog niet klopt.
- Bronnen en licenties van alle modellen, beelden en geluiden staan in `v4/assets/CREDITS.md`.
- Nieuwe gebieden, missies en dieren worden vanzelf zichtbaar in de testmodus; een scenario erbij is een blokje in `v4/test_scenarios.json`.

---

## 3. Ontwikkelplan

Elke stap is af en speelbaar voordat de volgende begint.

| Stap | Wat | Hangt af van | Stand |
|---|---|---|---|
| A | Tijdperken en gebieden als gegevens; missies uit het gebiedsbestand | — | **klaar** |
| B | Bewaren en verdergaan, opnieuw beginnen | A | **klaar** |
| C | Gebied als gegevens: dieren, grondstoffen en planten van de savanne in `areas/savanne.js` (terrein en begroeiing volgen bij stap E) | A | **klaar** |
| D | Overgang: de groep trekt verder (slotkaart → *Trek mee* → het nieuwe gebied wordt geladen; handen, tas, kennis en dag gaan mee) | B, C | **klaar** |
| E | **Gebied 2: bij het water** (nog *Homo habilis*), volledig speelbaar | D | **klaar**, wacht op proefspelen |
| F | `main.js` opsplitsen in `engine/` en `systems/` | C (gaandeweg) | **eerste ronde klaar**: schermlaag, missies, seizoen, aanwijzingen, lijf en opslag staan los. Elk systeem is `initX(G)` en krijgt één gedeeld object `G` uit `main.js`. Volgt gaandeweg: invoer en camera naar `engine/`, handen en tas, gooien, gevaar naar `systems/` |
| G | Soortcontrole: `node tools/check-eras.mjs` legt tijd en plaats van elke soort (`species.js`) tegen het gebied | C | **klaar** |
| H | Tijdperk 2: *Homo erectus* — nieuw lichaam, vuistbijl, vuur, grotere groep | E, F | **twee gebieden klaar** (`eras/erectus.js`, `areas/berg.js`, `areas/hoog.js`, `fire.js`), wacht op proefspelen. Volgt: het derde gebied, uit Afrika (Dmanisi) |
| I | Tijdperken 3–4 | H | |
| J | Tijdperken 5–7: een fundamenteel ander spel (zie §5) — eerst apart ontwerpen | I | |

Later, los hiervan: proloog, controller, geluid bijstellen.

**Tijdperk 2, onder de rokende berg** (gebouwd, `eras/erectus.js` + `areas/berg.js` + `fire.js`): na het watergebied springt het spel honderdduizenden jaren vooruit (*Verder in de tijd*). Een andere groep van vijf (Oru, Dak, Mio, Sen, Bala), een langer lichaam (1,60 m) dat sneller loopt; wat je weet gaat mee, wat je droeg niet. Vier missies, elk rond één nieuwe vaardigheid: een **vuistbijl** slaan (twee keien, zes klappen rondom; snijdt als een afslag en hakt bovendien takken van dode bomen), **vuur halen** (een tak in de smeulende stam houden waar de bliksem insloeg, en de brandende tak naar de kring van stenen dragen voordat hij op is; in het water dooft hij, in de tas kan hij niet, hyena's deinzen ervoor terug), het vuur **de nacht door houden** (elke tak is brandtijd; overdag houdt de groep het zelf aan, 's nachts niet; uit = as die nog even gloeit, daarna opnieuw halen) en **vlees braden** (vult meer dan rauw en is voor de groep meer waard). Een brandend vuur geeft licht, houdt de kou weg en houdt hyena's op ruime afstand van het kamp. Vormgeving: gescande modellen waar het kan (vuistbijl uit Olduvai, de Ol Doinyo Lengai als rokende berg, dode bomen, keien), vlammen als flakkerende tongen; missieteksten op B1-niveau, steeds vanuit een groepsgenoot met een probleem. Vuur maken kan niemand: dat is de historische keuze (zie `zeker` in `eras/erectus.js`: vuur bewaren is *aannemelijk*, braden en de stenen kring zijn *gok*).

**Tijdperk 2, de hoge vlakte** (gebouwd, `areas/hoog.js`): de groep trekt de bergen in en draagt het vuur mee als gloeiend hout. Drie missies, weer elk rond één vaardigheid: een **vuurplaats bouwen** (zes keien in een kring; pas dan blijft het vuur branden), **zwarte steen** halen bij de rotsen ver langs de rivier (obsidiaan: breekt in minder klappen en is het doel van een lange tocht langs het hoge gras) en een **gazelle moe lopen** in de hitte van de middag (de kudde blijft bestaan en wordt heter zolang je haar opjaagt; rust koelt af; de zwakste blijft staan). Het gebied ziet er anders uit door gegevens (`look`: grondkleur, groen, nevel) en niet door nieuwe code per gebied. Zekerheid: obsidiaan bij Melka Kunture is *vast*, de uithoudingsjacht *aannemelijk*, vuur meedragen een *gok*. Volgt: het derde gebied, buiten Afrika (Dmanisi, 1,8 miljoen jaar): kouder, andere dieren, zorg voor een oude groepsgenoot zonder tanden.

**Gebied 2, bij het water** (gebouwd, `areas/water.js` + `shore.js`): een meeroever in de droge tijd. Het land is kaal, struiken staan alleen nog ver weg. Nieuw voedsel: knollen onder de harde korst (alleen los te wrikken met een graafstok: een tak waar je met een afslag een punt aan schraapt) en meervallen in de poelen die het zakkende meer achterlaat (wie rechtop door de poel plonst, jaagt ze weg; gebukt kun je ze grijpen). Nieuw gevaar: krokodillen die als een boomstam drijven en toeslaan zodra je bij hen in het water staat; een kei laat ze wegzakken. Het meer is te diep om over te steken, behalve over één ondiepe drempel tussen het riet naar een zandbank. Missies: *Maak een graafstok*, *Grijp een meerval* en het noodgeval *Bitterblad voor Tor*: het blad groeit alleen nog op de zandbank, wees terug voor het donker. De zon is de klok, er verschijnt geen teller en er sterft niemand; wie te laat is, kost de groep een nacht en probeert het de volgende dag opnieuw.

Nog niet gebouwd uit het eerste ontwerp, mogelijk later: schelpdieren, nijlpaard, merg kraken als missie. Testen: `/root/tools/pw/v4water.js`; het gebied direct openen kan met `?gebied=water`.

---

## 4. Wat blijft

Dit werkt en wordt niet weggehaald; elke verbouwing wordt hieraan getoetst.

- De 3D-wereld met camera hoog achter de speler, draaien en knijpen om te kijken.
- Besturing op een telefoon: duim om te lopen, tikken om iets te doen, vegen om te bukken, staan en springen; vanzelf rennen bij gevaar.
- Twee handen als inventaris; later het draagvel met vijf plekken. Geen vensters.
- Steen slaan op de platte steen, afslagen, karkas snijden, stenen gooien met richten.
- Honger, gezondheid en groep als drie rustige balken die alleen verschijnen als je stilstaat.
- Zintuigen: stilstaan laat zien en horen wat er in de buurt is.
- De groep bij de slaapboom: eten delen, slapen, dag en nacht, seizoen en kou.
- Missies via roepende groepsgenoten, met markering, titel en stappen; nooit een keuzescherm.
- Dieren met eigen gedrag: hyena's, sabeltandkatten met jacht, luipaard, pofadder, vreemden, gazellen, zebra's, en per gebied een groot dier (reuzenolifant, nijlpaarden, neushoorn, giraffen).
- Het boekje met ontdekkingen en missies.
- Gesynthetiseerd geluid, weinig tekst.
- De versiecontrole en uitrol via GitHub Pages.

---

## 5. Prioriteiten

De route, vastgesteld met Bob op 12 november 2026. Er wordt nooit aan een later tijdperk gebouwd zolang een eerder punt niet af en speelbaar is.

| # | Ontwikkeling | Stand |
|---|---|---|
| 1 | Architectuur geschikt maken voor het volledige spel (stappen A, C, F, G) | A, C en G klaar; F (`main.js` opsplitsen) eerste ronde klaar, de rest gaat gaandeweg mee |
| 2 | Het huidige *Homo habilis*-spel afmaken: savanne rond, overgang "de groep trekt verder" (stap D) | **klaar** |
| 3 | Watergebied volledig speelbaar (stap E) | **klaar**, wacht op proefspelen door Bob |
| 4 | Opslaan en laden (stap B) | basis klaar; groeit mee met elk nieuw gebied |
| 5 | *Homo erectus* en nieuwe technieken (stap H) | twee gebieden **klaar**: vuistbijl, vuur halen en bewaren, braden; vuurplaats bouwen, obsidiaan, uithoudingsjacht; wacht op proefspelen door Bob |
| 6 | Neanderthalers en ijstijd | |
| 7 | *Homo sapiens* en complexe jacht | |
| 8 | Landbouw en nederzettingen | eerst ontwerpen |
| 9 | Industriële en moderne tijd | eerst ontwerpen |

### Landbouw en industrie zijn een ander spel

Tot en met punt 7 speel je één mens die overleeft: zoeken, maken, jagen, bij de groep blijven. Vanaf de landbouw klopt dat niet meer. De vraag verschuift van *hoe kom ik de dag door* naar *hoe houden we dit met zijn allen in stand*: voorraad, oogst en misoogst, werk verdelen, bezit, ziekte, later loon, machine en stad. Dat wordt **geen opgeblazen versie van het verzamelspel** met meer voorwerpen en grotere tassen.

Wat wel vaststaat: het blijft dezelfde wereld en dezelfde manier van kijken en aanraken, en je blijft een mens tussen mensen, geen hand uit de lucht. Hoe productie, organisatie en samenleving speelbaar worden, ontwerpen we apart voordat er iets van gebouwd wordt. De motor moet dat alleen niet in de weg zitten: daarom horen honger, dragen en missies in `systems/` en niet in de motor zelf, zodat een tijdperk andere systemen kan aanzetten.

Bij elke stap: testen op telefoonformaat, regressietests draaien, pas dan uitrollen.
