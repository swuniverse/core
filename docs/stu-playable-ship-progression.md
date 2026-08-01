# STU-basierte spielbare Schiffe/Rümpfe (Föderation/Klingonen)

Quelle: STU-Dump `/Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump`, Tabellen `stu_rumps`, `stu_rump_costs`, `stu_rumps_buildingfunction`, `stu_rumps_module_level`.

Scope dieser Übersicht: `is_buildable = true`, `is_npc = false`, Kategorien Jäger/Runabout bis Frachter, gefiltert auf Föderations-/Klingonen-Ableitungen. Andere STU-Fraktionen (Romulaner, Cardassianer, Ferengi, Kazon, etc.) sind bewusst nicht im Zielscope.

## Offene Mapping-Entscheidung

SWU-Namen sind dort eingetragen, wo sie aus unseren Research-Namen naheliegen. Einträge mit STU-Namen in Klammern sollten vor Import final bestätigt/umbenannt werden.

## Jäger/Runabout

| STU-ID | STU-Rumpf | SWU-Vorschlag | Fraktion | Rolle | Werft/Gebäude | Research-Gating | Hull | Schild | Cargo | Crew | Modulklassen | Default-Kosten/Module |
|---:|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| 1103 | NuQ'duj | TIE-Jäger (Klingon NuQ'duj) | Imperium/Klingonen | Phaser | Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 35 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 1×11101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10801, 1×10731 |
| 1203 | K'Pak | TIE-Abfangjäger (Klingon K'Pak) | Imperium/Klingonen | Puls | Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 35 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10801, 1×11731 |
| 1403 | K'toch | K'toch-Runabout | Imperium/Klingonen | Forschung | Jägerwerft, Raumhafen/Hangar | per Rumpf-Forschung + passende Werft | 155 | 155 | 35 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10801, 1×10731 |
| 1503 | Saqghom | Saqghom Kolonieschiff | Imperium/Klingonen | Kolonie | Raumhafen/Hangar, Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 10 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 30×2, 12×21, 100×5, 12×4 |
| 1101 | Raider | A-Wing Abfangjäger | Rebellen/Föderation | Phaser | Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 35 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 1×11101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10701, 1×10801 |
| 1201 | Peregrine | X-Wing Jäger | Rebellen/Föderation | Puls | Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 35 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×11701, 1×10801 |
| 1401 | Danube | Danube-Runabout | Rebellen/Föderation | Forschung | Jägerwerft, Raumhafen/Hangar | per Rumpf-Forschung + passende Werft | 155 | 155 | 35 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10701, 1×10801 |
| 1491 | Venture | Venture-Runabout | Rebellen/Föderation | Forschung | Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 35 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 1×10101, 1×10201, 1×10301, 1×10401, 1×10501, 1×10601, 1×10701, 1×10801 |
| 1501 | Icarus | Icarus Kolonieschiff | Rebellen/Föderation | Kolonie | Raumhafen/Hangar, Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 10 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 30×2, 12×21, 100×5, 12×4 |

## Fregatte

| STU-ID | STU-Rumpf | SWU-Vorschlag | Fraktion | Rolle | Werft/Gebäude | Research-Gating | Hull | Schild | Cargo | Crew | Modulklassen | Default-Kosten/Module |
|---:|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| 2203 | Rek'toc | Munificent-Fregatte | Imperium/Klingonen | Puls | Fregattenwerft | per Rumpf-Forschung + passende Werft | 410 | 410 | 55 | 4 | 1–3 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 2303 | Na'ket | Na'ket | Imperium/Klingonen | Torpedo | Fregattenwerft | per Rumpf-Forschung + passende Werft | 410 | 410 | 105 | 4 | 1–3 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 2101 | Saber | Consular-Fregatte | Rebellen/Föderation | Phaser | Fregattenwerft | per Rumpf-Forschung + passende Werft | 410 | 410 | 80 | 4 | 1–3 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 2301 | Aegian | Aegian | Rebellen/Föderation | Torpedo | Fregattenwerft | per Rumpf-Forschung + passende Werft | 410 | 410 | 105 | 4 | 1–3 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |

## Eskorte

| STU-ID | STU-Rumpf | SWU-Vorschlag | Fraktion | Rolle | Werft/Gebäude | Research-Gating | Hull | Schild | Cargo | Crew | Modulklassen | Default-Kosten/Module |
|---:|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| 3103 | K'Vort'cha | Raider-Korvette | Imperium/Klingonen | Phaser | Eskortwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 95 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 3203 | B'Rel | Lancer-Fregatte | Imperium/Klingonen | Puls | Eskortwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 70 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 3403 | Rotarn | Rotarn | Imperium/Klingonen | Forschung | Eskortwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 95 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 3101 | Miranda | CR90-Korvette | Rebellen/Föderation | Phaser | Eskortwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 95 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 3201 | Defiant | DP20-Kanonenboot | Rebellen/Föderation | Puls | Eskortwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 70 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 3401 | Nova | Nova | Rebellen/Föderation | Forschung | Eskortwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 95 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 3491 | Oberth | Oberth | Rebellen/Föderation | Forschung | Eskortwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 95 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |

## Zerstörer

| STU-ID | STU-Rumpf | SWU-Vorschlag | Fraktion | Rolle | Werft/Gebäude | Research-Gating | Hull | Schild | Cargo | Crew | Modulklassen | Default-Kosten/Module |
|---:|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| 4203 | K't'inga | Arquitens-Kreuzer | Imperium/Klingonen | Puls | Zerstörerwerft | per Rumpf-Forschung + passende Werft | 1675 | 2515 | 90 | 0 | 3–5 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 4303 | Koloth | Victory-Torpedozerstörer | Imperium/Klingonen | Torpedo | Zerstörerwerft | per Rumpf-Forschung + passende Werft | 1675 | 2515 | 140 | 0 | 3–5 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 4101 | Norway | Nebulon-B Fregatte | Rebellen/Föderation | Phaser | Zerstörerwerft | per Rumpf-Forschung + passende Werft | 1675 | 2515 | 115 | 0 | 3–5 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 4301 | Steamrunner | Marauder-Korvette | Rebellen/Föderation | Torpedo | Zerstörerwerft | per Rumpf-Forschung + passende Werft | 1675 | 2515 | 140 | 0 | 3–5 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |

## Kreuzer

| STU-ID | STU-Rumpf | SWU-Vorschlag | Fraktion | Rolle | Werft/Gebäude | Research-Gating | Hull | Schild | Cargo | Crew | Modulklassen | Default-Kosten/Module |
|---:|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| 5103 | Fek'lhr | Dreadnaught-Kreuzer | Imperium/Klingonen | Phaser | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 4050 | 2700 | 140 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 5203 | Vor'cha | Victory-Kreuzer | Imperium/Klingonen | Puls | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 4050 | 2700 | 115 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 5403 | T'Acog | T'Acog | Imperium/Klingonen | Forschung | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 2700 | 2700 | 140 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 5101 | Akira | MC30c Fregatte | Rebellen/Föderation | Phaser | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 4050 | 2700 | 140 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 5191 | Excelsior | MC80-Kreuzer | Rebellen/Föderation | Phaser | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 4050 | 2700 | 140 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 5201 | Prometheus | Assault Frigate | Rebellen/Föderation | Puls | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 4050 | 2700 | 115 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 5401 | Intrepid | Intrepid | Rebellen/Föderation | Forschung | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 2700 | 2700 | 140 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 5491 | Luna | Forschungskreuzer | Rebellen/Föderation | Forschung | Kreuzerwerft | per Rumpf-Forschung + passende Werft | 2700 | 2700 | 140 | 10 | 4–6 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |

## Frachter

| STU-ID | STU-Rumpf | SWU-Vorschlag | Fraktion | Rolle | Werft/Gebäude | Research-Gating | Hull | Schild | Cargo | Crew | Modulklassen | Default-Kosten/Module |
|---:|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| 6503 | Row | Row | Imperium/Klingonen | Kolonie | Eskortwerft, Fregattenwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 155 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 6603 | Tong'duj | Tong'duj | Imperium/Klingonen | Großraumfrachter | Eskortwerft, Fregattenwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 1200 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 6703 | Jolpa'law | Jolpa'law | Imperium/Klingonen | Langstreckenfrachter | Eskortwerft, Fregattenwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 600 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 903 | K-Frachter | K-Frachter | Imperium/Klingonen | Kurzstreckenfrachter | Raumhafen/Hangar, Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 350 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 30×2, 25×21, 100×5, 20×4 |
| 905 | FK-Frachter | FK-Frachter | Imperium/Klingonen | Kurzstreckenfrachter | Raumhafen/Hangar, Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 350 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 30×2, 25×21, 100×5, 20×4 |
| 6501 | Aerie | Aerie | Rebellen/Föderation | Kolonie | Eskortwerft, Fregattenwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 155 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 6601 | Epsilon | Epsilon | Rebellen/Föderation | Großraumfrachter | Eskortwerft, Fregattenwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 1200 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 6701 | Antares | Antares | Rebellen/Föderation | Langstreckenfrachter | Eskortwerft, Fregattenwerft | per Rumpf-Forschung + passende Werft | 910 | 910 | 600 | 1 | 2–4 (Waffen/Schild/Antrieb analog) | keine Rumpf-Commodity-Kosten im Dump |
| 901 | Y-Frachter | Y-Frachter | Rebellen/Föderation | Kurzstreckenfrachter | Raumhafen/Hangar, Jägerwerft | per Rumpf-Forschung + passende Werft | 155 | 155 | 350 | 0 | 1–1 (Waffen/Schild/Antrieb analog) | 30×2, 25×21, 100×5, 20×4 |

## Nicht importieren / entfernen

- Bestehende curated Starter-/Colonizer-Klassen (`REBEL_CORVETTE_GR75`, `EMPIRE_FRIGATE_SENTINEL`, `REBEL_FREIGHTER`, `EMPIRE_FREIGHTER`, hardcoded CR90/Lambda-Colonizer) sollen entfernt bzw. durch STU-basierte Rümpfe ersetzt werden.
- NPC-Rümpfe und nicht Föderation/Klingon-STU-Fraktionen werden nicht übernommen.

