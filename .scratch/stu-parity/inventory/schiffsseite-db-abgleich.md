# Schiffssysteme: Abgleich mit der STU-Datenbank (core-stu-db-1)

Stand: 2026-11-23. Ausschließlich lesende Abfragen (`psql`, Benutzer `stu`, Datenbank `stu_db`). Keine Änderung an Daten oder Code.

## Quellen und Belegarten

- **STU-Datenbank:** Tabelle `stu_modules` (293 Module), `stu_modules_specials` (Spezialfähigkeiten je Modul).
- **STU-Code (Ableitung der Systeme beim Bau):** `Module/Spacecraft/Lib/Creation/SpacecraftSystemCreation.php`, `Component/Spacecraft/SpacecraftModuleTypeEnum.php`, `Component/Spacecraft/ModuleSpecialAbilityEnum.php`.
- **SWU-Fabrikation:** `game-data/data/fabrication/stu-fabrication.yaml` (172 Einträge, 165 Module). Einträge tragen `stuModuleId` und `stuRawName`.
- **SWU-Ableitung der Laufzeitsysteme:** `spacecraft-runtime-state.service.ts` (`getRuntimeSystemsForModule`, `getAvailableSystems`), Modul-Kategorie aus `shipyardType` (`shipbuilding-core.service.ts`).

Belegart je Zuordnung:
- **ID+Name:** Der SWU-Eintrag zeigt über `stuModuleId` auf eine existierende STU-Modul-ID, und `stuRawName` ist der Name dieses Moduls.
- **Name:** `stuRawName` existiert als Name in der STU-Datenbank, aber nicht unter derselben ID.
- **Code:** Die Zuordnung steht im STU- oder SWU-Code.
- **nicht vorhanden:** Die Datenbank oder der Katalog hat dazu nichts.

## Ergebnisse der Messung

- SWU-Module mit STU-ID, die in der Datenbank existiert: **160 Einträge**. Davon haben **113 denselben Namen** wie das STU-Modul, **36 sind umbenannt** (z. B. „Durastahl-Panzerung“ ↔ „Duranium-Hüllenpanzerung“).
- SWU-Einträge mit STU-ID, die **nicht in der Datenbank existiert**: **11**. Das sind genau die Spezialsysteme in der ID-Reihe 19001–19070.
- Module, auf denen beide Seiten gleichzeitig ein System tragen (ID-Verbindung): Die Paare sind über alle Module eindeutig, siehe Tabelle unten.
- STU-Module mit Spezialfähigkeit: 57. Davon ist nur die Panzerung (Spezialfähigkeit 17) über die ID mit SWU verbunden. Die übrigen Spezialsysteme sind nur über den Namen verbunden.

## Tabelle: alle 35 STU-Systemtypen

Spalte „STU-DB“: Anzahl Module in `stu_modules`, mit Herkunft (Modultyp `type`, Systemtyp-Spalte `system_type` oder Spezialfähigkeit `special_id`).
Spalte „SWU-baubar“: Anzahl Fabrikationseinträge, die auf den SWU-Laufzeitschlüssel zeigen.

| # | STU-Systemtyp | STU-DB | SWU-Schlüssel | SWU-baubar | Belegart | Bemerkung |
|---|---|---|---|---|---|---|
| 0 | HULL | 0 (kein Systemtyp in Modulen) | — | — | — | Hülle als Kopfwert auf beiden Seiten |
| 1 | EPS | 12 (Modultyp 3) | EPS | 6 | ID+Name, 5/5 gleich | |
| 2 | IMPULSEDRIVE | 12 (Modultyp 4) | SUBLIGHT_DRIVE | 12 | ID, 12/12 gleich | |
| 3 | WARPCORE | 12 (Modultyp 5, ohne Fusion/Singularität) | REACTOR | 12 | ID, 12/12 gleich | |
| 4 | COMPUTER | 12 (Modultyp 6) | COMPUTER | 6 | ID, 6/6 gleich | 6 STU-Computer ohne SWU-Gegenstück |
| 5 | PHASER | 75 (Modultyp 7) | WEAPONS | 24 | ID, 23/23 gleich | |
| 6 | TORPEDO | 25 (Modultyp 8) | TORPEDO_BANK | 18 | ID, 18/18 gleich | |
| 7 | CLOAK | 7 (Spezial 1) | CLOAK | 1 | Name (Tarnvorrichtung ↔ Tarnfeld-Generator) | |
| 8 | LSS | 12 (Modultyp 10) | LONG_RANGE_SENSORS | 6 | ID (LSS+NBS gemeinsam) | |
| 9 | NBS | (dieselben 12 Module wie LSS) | SHORT_RANGE_SENSORS | 6 | ID (LSS+NBS gemeinsam) | Im Code: Sensormodul setzt immer NBS |
| 10 | WARPDRIVE | 12 (Modultyp 11) | WARPDRIVE | 12 | ID, 12/12 gleich | |
| 11 | SHIELDS | 30 (Modultyp 2) | SHIELDS | 18 | ID, 17 verbunden | 1 SWU-Schild ohne STU-ID |
| 12 | TACHYON_SCANNER | 4 (Spezial 4) | TACHYON_SCANNER | 1 | Name (Tachyon-Scanner ↔ Gravitationswellenscanner) | |
| 13 | LIFE_SUPPORT | Standardsystem | LIFE_SUPPORT (Standard) | — | Code | Beide Seiten: immer vorhanden |
| 14 | TRACTOR_BEAM | Standardsystem (STU: alle Nicht-Shuttles) | TRACTOR_BEAM | **0** | Code | SWU: nur Modul „Standard-Traktorstrahl“ im Katalog, nicht baubar |
| 15 | TROOP_QUARTERS | 3 (Spezial 5, Name „Crewtransport-Modul“) | — | 0 (Crewtransport-Modul → SPECIAL) | Name | SWU kein eigener Schlüssel |
| 16 | DEFLECTOR | Standardsystem (STU: alle Nicht-Shuttles) | DEFLECTOR (Standard, außer Kleinschiff) | — | Code | |
| 17 | ASTRO_LABORATORY | 1 (Spezial 6) | ASTROMETRY_LAB | 1 | Name (Astrometrie-Labor, identisch) | |
| 18 | SUBSPACE_SCANNER | 9 (Spezial 7, „Subraumfeldscanner“) | SUBSPACE_SCANNER | 1 | Name ⚠️ (SWU: „Hyperraumfeldscanner“, in DB nicht vorhanden) | |
| 19 | MATRIX_SCANNER | 10 (Spezial 8) | MATRIX_SCANNER | 1 | Name (Matrixsensoren, identisch) | |
| 20 | TORPEDO_STORAGE | 3 (Spezial 9, „Torpedotransport-Modul“) | SPECIAL (generisch) | 1 | Name ⚠️ (SWU: „Torpedotransportmodul“, ohne Bindestrich) | |
| 21 | SHUTTLE_RAMP | 3 (Spezial 10) | SHUTTLE_RAMP | 1 | Name (Shuttlerampe, identisch) | |
| 22 | BEAM_BLOCKER | Standardsystem (STU: Station) | BEAM_BLOCKER (Station) | — | Code | |
| 23 | CONSTRUCTION_HUB | Standardsystem (STU: Werftrumpf) | — | 0 | Code | SWU hat keinen Schlüssel |
| 24 | UPLINK | Standardsystem (STU: Sensorrolle) | UPLINK (Station Sensor) | — | Code | |
| 25 | FUSION_REACTOR | 1 (Modultyp 5, Systemtyp 25) | — | 0 | nicht vorhanden | Kein SWU-Eintrag |
| 26 | TRANSWARP_COIL | 1 (Spezial 11, „Transwarp-Spule“) | HYPERSPACE_COIL | 1 | Name (SWU-Eintrag „Hyperraum-Spule“, stuRawName „Transwarp-Spule“) | Funktion anders: STU Transwarpstart, SWU Navicomputer-Sprung |
| 27 | TRACKER | 1 (Spezial 12, „Marker“) | TRACKER | **0** | Code (Modul „Peilsender“) | Nicht baubar in SWU-Fabrikation |
| 28 | THOLIAN_WEB | 1 (Spezial 13, „Netzspinner“) | — | 0 | nicht vorhanden | |
| 29 | RPG_MODULE | 1 (Spezial 2, „RPG-Modul“) | — | 0 | nicht vorhanden | |
| 30 | SINGULARITY_REACTOR | 6 (Modultyp 5, Systemtyp 30) | — | 0 | nicht vorhanden | |
| 31 | BUSSARD_COLLECTOR | **0** (keine Module in DB) | RESOURCE_COLLECTOR | 1 | nur SWU-Seite | SWU-Eintrag „Ressourcen-Kollektor“ mit STU-Name, der in der DB fehlt |
| 32 | AGGREGATION_SYSTEM | **0** (keine Module in DB) | RESOURCE_CONVERTER | 1 | nur SWU-Seite | SWU-Eintrag „Molekular-Raffinerie“, der STU-Name fehlt in der DB |
| 33 | WARPDRIVE_BOOSTER | **0** (keine Module in DB) | HYPERDRIVE_BOOSTER | 1 | nur SWU-Seite | SWU-Eintrag „Hyperantriebs-Notladegerät“ ohne STU-ID |
| 34 | WARPCORE_CHARGE_TRANSFER | **0** (keine Module in DB) | REACTOR_CHARGE_TRANSFER | **0** | nicht vorhanden | Auf beiden Seiten nicht installierbar |

## SWU-Schlüssel ohne STU-Gegenstück

- Keiner außer den oben genannten Fällen. SWU hat keine Systeme, die auf keinen STU-Typ abbildbar wären.
- Gegenprobe: SWU-Schlüssel mit Anzeige in Teil 3 der Matrix (`schiffsseite-vollabdeckung.md`) bleiben gültig.

## Korrekturen zu früheren Aussagen

1. **Torpedo:** Ich hatte in der Zwischenauswertung „Mehrfach-Torpedorampe → WEAPONS“ abgeleitet. Das gilt nur für den Modulkatalog. Die Fabrikation ordnet Torpedorampen über `shipyardType` als `TORPEDO_BANK` ein, 18 Module. Der Torpedoblock hat also eine Quelle.
2. **Transwarp:** In der Matrix stand „Entsprechung nicht belegt“. Jetzt belegt: SWU-Eintrag mit `stuRawName = Transwarp-Spule`. Die Funktion unterscheidet sich trotzdem (STU Transwarpstart gegen SWU Navicomputer-Sprung).
3. **Reaktoren:** Fusions- und Singularitätsreaktor (7 STU-Module) haben keinen SWU-Eintrag. Die Matrix sagte „nicht belegt“, jetzt ist klar: sie fehlen auf SWU-Seite.
4. **Bussard, Aggregation, Warpbooster, Warpkern-Ladungstransfer:** In der STU-Datenbank gibt es dafür keine Module. Sie sind dort nicht installierbar. Die SWU-Gegenstücke sind also nicht mit der STU-Datenbank abgleichbar.

## Offen

1. **Stammdaten-Abweichung:** 11 SWU-Einträge verweisen auf IDs (19001–19070), die in `stu_modules` nicht existieren. Ob die STU-Datenbank des Spielservers eine andere Version ist als die Datenquelle von SWU, habe ich nicht geprüft.
2. **Name „Hyperraumfeldscanner“:** Kein Modul dieses Namens in der STU-Datenbank. Die Datenbank hat „Subraumfeldscanner“. Ob das derselbe Modultyp ist, ist nach den Daten nicht zu entscheiden.
3. **Torpedotransport:** SWU „Torpedotransportmodul“, DB „Torpedotransport-Modul“. Nur die Schreibweise unterscheidet sich, die Zuordnung ist sehr wahrscheinlich, aber nicht durch eine ID belegt.
4. **Standardsysteme in STU:** Die Liste (DEFLECTOR, TRACTOR_BEAM, LIFE_SUPPORT, BEAM_BLOCKER, CONSTRUCTION_HUB, UPLINK) stammt aus dem Code, nicht aus der Datenbank. In der Datenbank sind sie nicht gespeichert.

## Nachtrag: Klärung der offenen Punkte

Bestätigt durch den Projektinhaber:
- SWU „Hyperraumscanner“ (stuRawName „Hyperraumfeldscanner“) = STU „Subraumfeldscanner“ (9 Module in der DB). Zuordnung SUBSPACE_SCANNER ist damit per Name belegt.
- SWU „Torpedotransportmodul“ = STU „Torpedotransport-Modul“ (3 Module in der DB, Spezialfähigkeit 9). Die Entsprechung ist bestätigt, SWU bildet das aber nur auf die generische Kategorie SPECIAL ab (kein eigener Schlüssel für TORPEDO_STORAGE).

### Die 11 SWU-Einträge mit STU-ID, die in der Datenbank fehlt

Alle 11 sind Spezialsysteme (Fabrikation, `queueType: MODULE`), ID-Bereich 19001–19070. Keine dieser IDs existiert in `stu_modules`.

| SWU-Eintrag | stuRawName | Name in STU-DB | SWU-Schlüssel |
|---|---|---|---|
| 19001 Tarnfeld-Generator | Tarnvorrichtung | vorhanden (7 Module) | CLOAK |
| 19003 Gravitationswellenscanner | Tachyon-Scanner | vorhanden (4 Module) | TACHYON_SCANNER |
| 19005 Crewtransport-Modul | Crewtransport-Modul | vorhanden (3 Module) | SPECIAL (generisch) |
| 19006 Astrometrie-Labor | Astrometrie-Labor | vorhanden (1 Modul) | ASTROMETRY_LAB |
| 19007 Hyperraumscanner | Hyperraumfeldscanner | = Subraumfeldscanner (bestätigt) | SUBSPACE_SCANNER |
| 19008 Matrixsensoren | Matrixsensoren | vorhanden (10 Module) | MATRIX_SCANNER |
| 19009 Torpedotransportmodul | Torpedotransportmodul | = Torpedotransport-Modul (bestätigt) | SPECIAL (generisch) |
| 19010 Shuttlerampe | Shuttlerampe | vorhanden (3 Module) | SHUTTLE_RAMP |
| 19011 Ressourcen-Kollektor | Ressourcen-Kollektor | **nicht in der DB** | RESOURCE_COLLECTOR |
| 19012 Molekular-Raffinerie | Molekular-Raffinerie | **nicht in der DB** | RESOURCE_CONVERTER |
| 19070 Hyperraum-Spule | Transwarp-Spule | vorhanden (1 Modul) | HYPERSPACE_COIL |

Ergebnis: Für 9 der 11 Einträge bestätigt der Name die Zuordnung. Für 19011 und 19012 gibt es in der STU-Datenbank keinen Gegenstand (Suche nach Ressourc-, Kollektor-, Raffin-, Molekul-Mustern ohne Treffer).

### Übrige Punkte

- **Traktorstrahl:** STU setzt das System per Code auf allen Nicht-Shuttles (`getDefaultSystems`). In der DB gibt es kein Traktor-Modul (Suche ohne Treffer). SWU hat „Standard-Traktorstrahl“ nur im Modulkatalog (`game-data/data/modules/tractor-beam.yaml`), ohne Fabrikationseintrag. Der Traktorstrahl ist bei SWU nicht baubar, also auch nicht vorhanden. Das ist eine echte Regelabweichung.
- **Werfthub (CONSTRUCTION_HUB):** STU setzt ihn bei Rümpfen mit Kategorie STATION und Rolle SHIPYARD (`SpacecraftRump::isShipyard`). In der DB gibt es dafür 5 Rümpfe mit Rolle „Werft“. SWU hat keinen Schlüssel dafür, der Schiffsbau läuft über das Kolonie-Gebäude. Eine STU-only Funktion.
- **Ablenkschirm und Lebenserhaltung:** Standard auf beiden Seiten (STU Code: alle Nicht-Shuttles; SWU `getAvailableSystems`: Lebenserhaltung immer, Ablenkschirm außer Kleinschiff).
- **Beamblocker und Uplink:** Standard auf beiden Seiten für die jeweilige Stations- bzw. Sensorrolle.
- **Fusions- und Singularitätsreaktor:** Kein SWU-Eintrag in der Fabrikation (Suche nach Fusion und Singularität ohne Treffer).
- **Hyperantriebs-Notladegerät (SWU) und Sondenboje (SWU):** Haben keine STU-ID. In der DB gibt es weder ein Notladegerät-Modul noch eine Sondenboje als Systemmodul. Die Sondenboje ist SWU-eigen und kein Systemmodul.

## ID-Brüche bereinigt (2026-11-23, nicht committet)

Ursache: Die 11 Einträge (`source: swu-special-curated`) trugen in `stuModuleId` die STU-**Waren-ID**. STU hat für diese Spezialsysteme keine einzelne Modul-ID, sondern eine Modulzeile je Rumpfrolle (z. B. Tarnvorrichtung: Ware 19001, Module 19101–19701). Die richtige Verbindung steht in `stuSourceCommodityId`.

Änderung in `game-data/data/fabrication/stu-fabrication.yaml` (Submodul `game-data`), 16 Zeilen:
- 9 Einträge (19001, 19003, 19005–19010, 19070): `stuModuleId` entfernt; `stuSourceCommodityId` bleibt und zeigt auf eine existierende STU-Ware.
- 19007: `stuRawName` von „Hyperraumfeldscanner“ auf „Subraumfeldscanner“ (STU-Warenname, bestätigt).
- 19011 Ressourcen-Kollektor und 19012 Molekular-Raffinerie: `stuModuleId`, `stuSourceCommodityId` und `stuRawName` entfernt. In STU gibt es sie weder als Ware noch als Modul.

Wirkung auf das Spiel: keine. `stuModuleId` wird zur Laufzeit nicht gelesen; Modulwerte laufen über `outputCommodityId`.

Prüfungen: Game-Data-Tests im Backend 40/40 grün. Der Validator meldet 15 bestehende Fehler in `ship-building` (Rumpf- und Crewwerte); keiner betrifft die geänderten Einträge.
