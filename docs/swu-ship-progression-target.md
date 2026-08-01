# Ziel-Übersicht: SWU-Schiffsprogression auf STU-Rumpf-Basis

Ziel: Die technische Progression bleibt an STU-Rumpfkategorien, Werften, Modulklassen und Kosten orientiert, aber im Spiel werden keine STU-Namen angezeigt. Stattdessen verwenden wir Star-Wars-typische Schiffsnamen pro Fraktion.

## Grundregeln

- Nur spielbare Progression: keine NPC-Rümpfe.
- Aktive Zielklassen sind die 36 Einträge aus `game-data/data/ship-building/ship-classes.yaml` (`generatedFrom: stu-rumps-swu-progression-v1`). STU-Kandidaten aus `docs/stu-playable-ship-progression.md`, die nicht in `ship-classes.yaml` stehen, werden hier nicht als baubare Zielklassen geführt.
- Jede SWU-Schiffsklasse referenziert genau einen STU-Rumpf über `stuRumpId`. STU-ID und STU-Rumpfname bleiben interne Herkunftsdaten; im UI wird ausschließlich der SWU-Name aus `ship-classes.yaml` angezeigt.
- `category` ist die technische SWU-Bau-/UI-Kategorie aus `ship-classes.yaml`; `role` ist die Rollen-/Ausrüstungslogik. Shuttles und Starter-Colonizer sind technisch `category: FIGHTER` mit `role: SHUTTLE` oder `role: COLONIZER`, nicht `category: SHUTTLE`.
- `Crew` wird als `crewMin-crewMax` aus `ship-classes.yaml` dokumentiert. `crewMin` folgt dem STU-`baseCrew` aus `stu-rump-stats.yaml`; `crewMax` ist der SWU-Kapazitätswert der Klasse.
- `Module/Kosten` dokumentiert die aktuelle Bauquelle: `buildCosts` aus `ship-classes.yaml` für die Klasse und, bei Hangar-Schiffen, die Start-/Defaultdaten aus `ship-class-hangar.yaml`.

## Hangar- und Modul-Policy

- Alle Hangar-Einträge aus `ship-class-hangar.yaml` verwenden `airfieldFunctionId: 4`, `startEnergyCost: 90`, `buildEnergyCost: 90`, `defaultTorpedoCommodityId: null`, `defaultTorpedoAmount: 0`.
- Fighter/Shuttle-Hangar-Bauten haben keine freie Modulwahl beim Hangarbau. Sie erhalten feste Level-1-Defaultmodule aus `ship-class-hangar.yaml`:
  - X-Wing: `10201,10301,10401,10501,11701,10801`.
  - A-Wing, LAAT, U-Wing: `10201,10301,10401,10501,10701,10801`.
  - TIE-Jäger: `10201,10301,10401,10501,10801,11731`.
  - TIE-Abfangjäger, Lambda-Shuttle: `10201,10301,10401,10501,10801,10731`.
- Kleine Hangar-Colonizer/Frachter haben keine Defaultmodule (`defaultModuleCommodityIds: []`) und verwenden Rohstoffkosten:
  - Colonizer: `30×2, 12×21, 100×5, 12×4`.
  - Frachter: `30×2, 25×21, 100×5, 20×4`.
- STU-Rumpf-Modulregeln definieren Pflichtkategorien und Klassenkompatibilität. Level-1-Hangar-Rümpfe verlangen je 1 Modul in `HULL`, `SHIELDS`, `EPS`, `SUBLIGHT_DRIVE`, `REACTOR`, `COMPUTER`, `ENERGY_WEAPON`, `TORPEDO_BANK`, `HYPERDRIVE`, `SENSORS`; die tatsächlich automatisch eingesetzten Hangar-Defaultmodule sind aber die expliziten Commodity-IDs aus `ship-class-hangar.yaml`.
- Für größere Werftschiffe werden keine Defaultmodule erzwungen; Modulkompatibilität und Forschung laufen über `stu-rump-module-rules.yaml` und Modul-Fabrication. Modul-Freischaltung: STU-Klasse 2→Bundle Stufe I, 3-4→Stufe II, 5→Stufe III, 6→Stufe IV; Föderationsmodule sind Rebellen-exklusiv, klingonische Module Imperium-exklusiv, sonst neutral.

## Rebellenallianz

| STU-ID | STU-Rumpf | SWU-Key | Zielname im Spiel | Category | Role | Gebäude laut STU | Crew | Module/Kosten |
|---:|---|---|---|---|---|---|---:|---|
| 1201 | Peregrine | `REBEL_FIGHTER_X_WING` | X-Wing Jäger | FIGHTER | FIGHTER | Jägerwerft | 0-2 | Klassenkosten: `1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×11701, 1×10801`; Hangar-Defaultmodule: `10201,10301,10401,10501,11701,10801` |
| 1101 | Raider | `REBEL_FIGHTER_A_WING` | A-Wing Abfangjäger | FIGHTER | INTERCEPTOR | Jägerwerft | 0-2 | Klassenkosten: `1×11101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10701, 1×10801`; Hangar-Defaultmodule: `10201,10301,10401,10501,10701,10801` |
| 1401 | Danube | `REBEL_SHUTTLE_LAAT` | LAAT Shuttle | FIGHTER | SHUTTLE | Jägerwerft, Raumhafen/Hangar | 0-2 | Klassenkosten: `1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10701, 1×10801`; Hangar-Defaultmodule: `10201,10301,10401,10501,10701,10801` |
| 1491 | Venture | `REBEL_SHUTTLE_U_WING` | U-Wing Transporter | FIGHTER | SHUTTLE | Jägerwerft | 0-2 | Klassenkosten: `1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10701, 1×10801`; Hangar-Defaultmodule: `10201,10301,10401,10501,10701,10801` |
| 1501 | Icarus | `REBEL_COLONIZER_ICARUS` | GR-75 Kolonietransporter | FIGHTER | COLONIZER | Raumhafen/Hangar, Jägerwerft | 0-1 | Hangar-Rohstoffkosten: `30×2, 12×21, 100×5, 12×4`; keine Defaultmodule |
| 901 | Y-Frachter | `REBEL_FREIGHTER_YT` | YT-1300 Frachter | FREIGHTER | FREIGHTER | Raumhafen/Hangar, Jägerwerft | 0-14 | Hangar-Rohstoffkosten: `30×2, 25×21, 100×5, 20×4`; keine Defaultmodule |
| 2101 | Saber | `REBEL_FRIGATE_CONSULAR` | Consular-Fregatte | FRIGATE | PHASER | Fregattenwerft | 4-8 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 2301 | Aegian | `REBEL_FRIGATE_PELTA` | Pelta-Fregatte | FRIGATE | TORPEDO | Fregattenwerft | 4-9 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 3101 | Miranda | `REBEL_ESCORT_HAMMERHEAD` | Hammerhead-Korvette | ESCORT | PHASER | Eskortwerft | 1-5 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 3201 | Defiant | `REBEL_CORVETTE_CR90` | CR90 Korvette | CORVETTE | PULSE | Eskortwerft | 1-4 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 3401 | Nova | `REBEL_SCOUT_HWK_290` | HWK-290 Aufklärer | ESCORT | SCOUT | Eskortwerft | 1-5 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 3491 | Oberth | `REBEL_SCOUT_VCX_100` | VCX-100 Aufklärer | ESCORT | SCOUT | Eskortwerft | 1-5 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 4101 | Norway | `REBEL_DESTROYER_DREADNOUGHT` | Dreadnought-Kreuzer | DESTROYER | PHASER | Zerstörerwerft | 0-5 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 4301 | Steamrunner | `REBEL_DESTROYER_MC75` | MC75 Sternkreuzer | DESTROYER | TORPEDO | Zerstörerwerft | 0-6 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 5101 | Akira | `REBEL_CRUISER_NEBULON_B` | Nebulon-B Fregatte | CRUISER | PHASER | Kreuzerwerft | 10-16 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 5201 | Prometheus | `REBEL_CRUISER_MC80` | MC80 Sternkreuzer | CRUISER | PULSE | Kreuzerwerft | 10-15 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 5191 | Excelsior | `REBEL_CRUISER_VENATOR` | Venator-Klasse Kreuzer | CRUISER | PHASER | Kreuzerwerft | 10-16 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 6501 | Aerie | `REBEL_COLONIZER_CR90` | CR90 Kolonieschiff | FREIGHTER | COLONIZER | Eskortwerft, Fregattenwerft | 1-8 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule; `shuttleSlots: 5` |
| 6601 | Epsilon | `REBEL_FREIGHTER_BFF1` | BFF-1 Massenfrachter | FREIGHTER | FREIGHTER | Eskortwerft, Fregattenwerft | 1-49 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 6701 | Antares | `REBEL_FREIGHTER_GR75` | GR-75 Frachter | FREIGHTER | FREIGHTER | Eskortwerft, Fregattenwerft | 1-25 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |

## Galaktisches Imperium

| STU-ID | STU-Rumpf | SWU-Key | Zielname im Spiel | Category | Role | Gebäude laut STU | Crew | Module/Kosten |
|---:|---|---|---|---|---|---|---:|---|
| 1203 | K'Pak | `EMPIRE_FIGHTER_TIE_LN` | TIE-Jäger | FIGHTER | FIGHTER | Jägerwerft | 0-2 | Klassenkosten: `1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10801, 1×11731`; Hangar-Defaultmodule: `10201,10301,10401,10501,10801,11731` |
| 1103 | NuQ'duj | `EMPIRE_FIGHTER_TIE_INTERCEPTOR` | TIE-Abfangjäger | FIGHTER | INTERCEPTOR | Jägerwerft | 0-2 | Klassenkosten: `1×11101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10801, 1×10731`; Hangar-Defaultmodule: `10201,10301,10401,10501,10801,10731` |
| 1403 | K'toch | `EMPIRE_SHUTTLE_LAMBDA` | Lambda-Klasse Shuttle | FIGHTER | SHUTTLE | Jägerwerft, Raumhafen/Hangar | 0-2 | Klassenkosten: `1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10801, 1×10731`; Hangar-Defaultmodule: `10201,10301,10401,10501,10801,10731` |
| 1503 | Saqghom | `EMPIRE_COLONIZER_SENTINEL` | Sentinel-Klasse Kolonieschiff | FIGHTER | COLONIZER | Raumhafen/Hangar, Jägerwerft | 0-1 | Hangar-Rohstoffkosten: `30×2, 12×21, 100×5, 12×4`; keine Defaultmodule |
| 903 | K-Frachter | `EMPIRE_FREIGHTER_GOZANTI` | Gozanti-Frachter | FREIGHTER | FREIGHTER | Raumhafen/Hangar, Jägerwerft | 0-14 | Hangar-Rohstoffkosten: `30×2, 25×21, 100×5, 20×4`; keine Defaultmodule |
| 2303 | Na'ket | `EMPIRE_FRIGATE_LANCER` | Lancer-Fregatte | FRIGATE | TORPEDO | Fregattenwerft | 4-9 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 2203 | Rek'toc | `EMPIRE_FRIGATE_MUNIFICENT` | Munificent-Fregatte | FRIGATE | PULSE | Fregattenwerft | 4-7 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 3103 | K'Vort'cha | `EMPIRE_ESCORT_ARQUITENS` | Arquitens-Korvette | ESCORT | PHASER | Eskortwerft | 1-5 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 3203 | B'Rel | `EMPIRE_CORVETTE_RAIDER` | Raider-Korvette | CORVETTE | PULSE | Eskortwerft | 1-4 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 4203 | K't'inga | `EMPIRE_DESTROYER_INTERDICTOR` | Interdictor-Kreuzer | DESTROYER | PULSE | Zerstörerwerft | 0-4 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 4303 | Koloth | `EMPIRE_DESTROYER_PRAETOR` | Praetor-Klasse Sternzerstörer | DESTROYER | TORPEDO | Zerstörerwerft | 0-6 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 5103 | Fek'lhr | `EMPIRE_CRUISER_VINDICATOR` | Vindicator-Kreuzer | CRUISER | PHASER | Kreuzerwerft | 10-16 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 5203 | Vor'cha | `EMPIRE_CRUISER_IMPERIAL` | Imperial-I Sternenzerstörer | CRUISER | PULSE | Kreuzerwerft | 10-15 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 6503 | Row | `EMPIRE_COLONIZER_LAMBDA_SETTLEMENT` | Lambda-Klasse Siedlungsschiff | FREIGHTER | COLONIZER | Eskortwerft, Fregattenwerft | 1-8 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule; `shuttleSlots: 5` |
| 6603 | Tong'duj | `EMPIRE_FREIGHTER_HEAVY` | Imperialer Bulk-Frachter | FREIGHTER | FREIGHTER | Eskortwerft, Fregattenwerft | 1-49 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |
| 6703 | Jolpa'law | `EMPIRE_FREIGHTER_IMPERIAL` | Sienar-Flottenfrachter | FREIGHTER | FREIGHTER | Eskortwerft, Fregattenwerft | 1-25 | `buildCosts: []`; keine Rumpf-Commodity-Kosten im STU-Dump; keine erzwungenen Defaultmodule |

## Korrekturen gegenüber der alten Übersicht

- `LAAT Shuttle` wird aufgenommen: `REBEL_SHUTTLE_LAAT`, STU `1401 Danube`.
- `T-6 Shuttle` wird entfernt: keine aktive Klasse in `ship-classes.yaml`; der zweite Rebellen-Shuttle ist `REBEL_SHUTTLE_U_WING` / STU `1491 Venture`.
- `X-Wing Jäger` ist kein frei bestückbarer Hangarbau: Hangar-Defaultmodule sind fest `10201,10301,10401,10501,11701,10801`.
- `Y-Wing Bomber`, `B-Wing Sternenjäger`, `TIE Bomber`, `TIE Defender`, `TIE Reaper`, `Executor-Klasse Supersternzerstörer`, `Imperial-II Sternenzerstörer` werden hier nicht als aktive Zielklassen geführt, weil sie nicht in der aktuellen `ship-classes.yaml`-Quelle stehen.
- Alte Namensvorschläge werden auf YAML-Namen korrigiert: `DP20 Kanonenboot`→`CR90 Korvette`, `Sphyrna-Klasse Hammerhead`→`Venator-Klasse Kreuzer`, `Baleen-Klasse Frachter`→`GR-75 Frachter`, `Gallofree Schwertransporter`→`BFF-1 Massenfrachter`, `Gozanti-Kreuzer`→`Gozanti-Frachter`, `Victory-I/II`→`Interdictor-Kreuzer`/`Praetor-Klasse Sternzerstörer`, `Dreadnaught-Klasse Schwerer Kreuzer`→`Vindicator-Kreuzer`.

## Umsetzungshinweise

- `ship-classes.yaml` bleibt die konkrete Klassenquelle für Key, finalen SWU-Namen, `category`, `role`, Crew und Klassenkosten.
- `ship-class-hangar.yaml` bleibt die konkrete Hangarquelle für `airfieldFunctionId`, Start-/Bauenergie, Hangar-Rumpf-Commodity, Defaultmodule und Hangar-Rohstoffkosten.
- `stu-rump-stats.yaml` und `stu-rump-module-rules.yaml` bleiben die STU-Herkunftsquellen für Rumpfbasiswerte, Crew-Minimum, Modulklasse und Modulkompatibilität.
