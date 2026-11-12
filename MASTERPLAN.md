# Masterplan Homo-spel

Eén doorlopend 3D-overlevingsspel in de browser, van *Homo habilis* tot de moderne mens. Je beleeft de ontwikkeling door te doen, niet door te lezen. Dit document is de leidraad voor de bouw; het oude `CAMPAIGN_PLAN.md` hoort bij het platformspel en geldt niet voor `v4/`.

Stand: november 2026. Het spel staat in `v4/` en draait op GitHub Pages.

---

## 1. Huidige architectuur

**Techniek.** Three.js (r187) als losse ES-modules, geen bouwstap. `v4/index.html` bevat de schermlaag (balken, handen, tas, kaarten) en alle CSS. De uitrol (`.github/workflows/deploy.yml`) hernoemt `v4/src` naar `v4/src-<versie>` en schrijft `v4/version.json`, zodat een telefoon nooit oude en nieuwe bestanden mengt.

| Bestand | Regels | Wat het doet |
|---|---|---|
| `main.js` | ~1535 | Spelstaat, lus, invoer (aanraking, muis, toetsen), camera, handen en tas, steen slaan, gooien, missies, aanwijzingen, dag en nacht, seizoen, boekje, opslag |
| `world.js` | 425 | Terrein, rivier, bomen, gras, licht, lucht |
| `hominin.js`, `rig.js` | 465 | De speler: model, animaties, lopen, sluipen, klimmen, gooien |
| `group.js` | 124 | De drie groepsgenoten (Tor, Kem, Ibo) bij de slaapboom |
| `predators.js` | 249 | Hyena's bij het karkas |
| `hunt.js` | 241 | Sabeltandkatten en hun jacht, de verse prooi |
| `encounters.js` | 473 | Luipaard, pofadder, vreemden, gewonde gazelle |
| `giant.js` | 257 | De reuzenolifant en zijn dagelijkse ronde |
| `life.js`, `actors.js` | 438 | Kuddes, vogels, gieren, klein leven |
| `items.js` | 289 | Alle teksten en gegevens van voorwerpen, dieren, vondsten |
| `audio.js` | 188 | Geluid, volledig gesynthetiseerd |
| `assets.js`, `icons.js` | 120 | Laden van modellen, pictogrammen |
| `eras/`, `save.js` | 64 | **Nieuw:** tijdperken en gebieden als gegevens; bewaren en verdergaan |

**Sterk.** De wereld, de besturing op een telefoon, de dieren met eigen gedrag, de zintuigen, het geluid en de rustige schermlaag werken en zijn getest (Playwright-tests in `/root/tools/pw/v4*.js`).

**Zwak.** `main.js` is te groot en weet alles. Wereld en dieren zijn in code vastgelegd in plaats van in gegevens. Er is één gebied. Alles (26 MB) wordt in één keer geladen. Tot deze stap ging bij het sluiten van de pagina alles verloren.

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

Bij elk tijdperk houden we bij wat **vaststaat** (vondsten), wat **aannemelijk** is (afgeleid) en wat een **spelkeuze** is. Voor het huidige tijdperk staat dat in `eras/habilis.js`:

| Vaststaat | Aannemelijk | Spelkeuze (speculatief) |
|---|---|---|
| Afslagen en kernen van keien | Aas halen bij de prooi van grote katten | Een huid als draagvel |
| Snijsporen op botten van grote dieren | Eten delen in een kleine groep | Een huid om de schouders tegen de kou |
| Botten gekraakt voor merg | Stenen gooien naar roofdieren | Bitterblad als geneesmiddel |
| Sabeltandkatten, hyena's, zebra-achtigen en de reuzenolifant *Palaeoloxodon recki* in hetzelfde landschap | Honing, eieren, bessen, bladeren; slapen in bomen | Namen en vaste rollen in de groep |

Kanttekeningen die we eerlijk meenemen: wie de Oldowan-werktuigen maakte is niet zeker (*Homo habilis* is de gangbare kandidaat; de oudste werktuigen zijn ouder dan de soort). Huiden vergaan, dus draagvel en omslag zijn niet te bewijzen; ze blijven in het spel omdat dragen de speler richting geeft, maar ze worden nergens als feit gebracht. Vuur komt pas bij *Homo erectus* en ook daar als iets wat je eerst alleen vindt en bewaart, niet maakt.

---

## 3. Ontwikkelplan

Elke stap is af en speelbaar voordat de volgende begint.

| Stap | Wat | Hangt af van | Stand |
|---|---|---|---|
| A | Tijdperken en gebieden als gegevens; missies uit het gebiedsbestand | — | **klaar** |
| B | Bewaren en verdergaan, opnieuw beginnen | A | **klaar** |
| C | Gebied als gegevens: dieren, grondstoffen en planten van de savanne in `areas/savanne.js` (terrein en begroeiing volgen bij stap E) | A | **klaar** |
| D | Overgang: de groep trekt verder (einde savanne → tocht → nieuw gebied), laden per gebied | B, C | |
| E | **Gebied 2: bij het water** (nog *Homo habilis*), volledig speelbaar | D | |
| F | `main.js` opsplitsen in `engine/` en `systems/` | C (gaandeweg) | |
| G | Soortcontrole: `node tools/check-eras.mjs` legt tijd en plaats van elke soort (`species.js`) tegen het gebied | C | **klaar** |
| H | Tijdperk 2: *Homo erectus* — nieuw lichaam, vuistbijl, vuur, grotere groep | E, F | |
| I | Tijdperken 3–4 | H | |
| J | Tijdperken 5–7: een fundamenteel ander spel (zie §5) — eerst apart ontwerpen | I | |

Later, los hiervan: proloog, controller, geluid bijstellen.

**Gebied 2, bij het water** (ontwerp, nog te bouwen): rivier en meeroever in de droge tijd. Nieuw voedsel (knollen opgraven met een stok, schelpdieren, vis in opdrogende poelen), nieuw gevaar (krokodil, nijlpaard), nieuwe grondstof (betere steen in de rivierbedding). Missies: een graafstok maken, merg kraken met de hamersteen, de drinkplaats veilig leren gebruiken, en een noodgeval: iemand is ziek, haal het blad vóór het donker. De zon is de klok, er verschijnt geen teller en er sterft niemand; wie te laat is, probeert het de volgende dag opnieuw.

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
- Dieren met eigen gedrag: hyena's, sabeltandkatten met jacht, luipaard, pofadder, vreemden, gazellen, zebra's, de reuzenolifant.
- Het boekje met ontdekkingen en missies.
- Gesynthetiseerd geluid, weinig tekst.
- De versiecontrole en uitrol via GitHub Pages.

---

## 5. Prioriteiten

De route, vastgesteld met Bob op 12 november 2026. Er wordt nooit aan een later tijdperk gebouwd zolang een eerder punt niet af en speelbaar is.

| # | Ontwikkeling | Stand |
|---|---|---|
| 1 | Architectuur geschikt maken voor het volledige spel (stappen A, C, F, G) | A klaar; C is de volgende |
| 2 | Het huidige *Homo habilis*-spel afmaken: savanne rond, overgang "de groep trekt verder" (stap D) | |
| 3 | Watergebied volledig speelbaar (stap E) | ontwerp staat in §3 |
| 4 | Opslaan en laden (stap B) | basis klaar; groeit mee met elk nieuw gebied |
| 5 | *Homo erectus* en nieuwe technieken (stap H) | |
| 6 | Neanderthalers en ijstijd | |
| 7 | *Homo sapiens* en complexe jacht | |
| 8 | Landbouw en nederzettingen | eerst ontwerpen |
| 9 | Industriële en moderne tijd | eerst ontwerpen |

### Landbouw en industrie zijn een ander spel

Tot en met punt 7 speel je één mens die overleeft: zoeken, maken, jagen, bij de groep blijven. Vanaf de landbouw klopt dat niet meer. De vraag verschuift van *hoe kom ik de dag door* naar *hoe houden we dit met zijn allen in stand*: voorraad, oogst en misoogst, werk verdelen, bezit, ziekte, later loon, machine en stad. Dat wordt **geen opgeblazen versie van het verzamelspel** met meer voorwerpen en grotere tassen.

Wat wel vaststaat: het blijft dezelfde wereld en dezelfde manier van kijken en aanraken, en je blijft een mens tussen mensen, geen hand uit de lucht. Hoe productie, organisatie en samenleving speelbaar worden, ontwerpen we apart voordat er iets van gebouwd wordt. De motor moet dat alleen niet in de weg zitten: daarom horen honger, dragen en missies in `systems/` en niet in de motor zelf, zodat een tijdperk andere systemen kan aanzetten.

Bij elke stap: testen op telefoonformaat, regressietests draaien, pas dan uitrollen.
