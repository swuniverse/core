# Schiffsseite: Sichtbarkeit der Funktionen, STU gegen SWU

Stand: 2026-11-23. Nur Analyse, nichts umgesetzt.

## Grundprinzip

- **STU** zeigt eine Funktion nur, wenn das Schiff die Voraussetzung hat: installiertes System, Modul, Rampe, Station, Boje im Lager, Handelsposten an angedockter Station, Reparaturbedarf. Die Prüfung steht im Template (`html/spacecraft/*.twig`, `control_mid.twig`).
- **SWU** arbeitet gemischt:
  - Systeme sind korrekt: `ShipControlCenter` rendert nur Systeme, die in `runtimeSystems` existieren (`if (!state) return null`). Das entspricht STU.
  - Viele Aktionen sind dagegen fest verdrahtet und immer sichtbar, z. B. Schnellaktionen, Boje, Nahbereichssensoren. Dort ist die Sichtbarkeit nicht an die Voraussetzung gekoppelt.

## Legende

- ✅ passt zu STU
- ⚠️ Ort oder Logik weicht ab
- ❌ wird angezeigt, obwohl STU es ausblendet
- ➖ fehlt in SWU
- ? nicht im Code geprüft

## Kopf (STU `spacecraft/spacecraft.twig` Z. 36–200, SWU `ShipHeaderTable.tsx`, `ShipQuickActions.tsx`)

| Funktion | STU-Bedingung | SWU heute | Bewertung |
|---|---|---|---|
| Selbstzerstörung | nur wenn kein Konstrukt | `ShipHeaderTable` immer | ✅ |
| Konstrukt entfernen | `isConstruction` (Scrap-Icon im Kopf) | `FieldContextPanel` Z. 775, nur wenn `station.isOwn` | ⚠️ anderer Ort |
| Station demontieren | `canBeScrapped` | `StationScrappingPanel`, nur Station | ⚠️ Bedingung nicht geprüft |
| Schiffsinfo, Kommunikation | immer | Schnellaktionen, immer | ✅ |
| LSS-Filter | `hasLss` | Schnellaktion "Sensoren", immer | ❌ bei Schiffen ohne LSS |
| Karte | `IS_MAP_BUTTON_VISIBLE` | Schnellaktion "Navigation und Karte", immer | ❌ |
| Standby | immer | Schnellaktion, immer | ✅ |
| Reparaturoptionen | `canBeRepaired` | Schnellaktion "Reparaturoptionen", immer | ❌ Hauptkandidat |
| Modul-Icons | nur mit Bauplan | `ShipModulesPanel compact`, immer | ? |
| Systemstatus-Icons | pro installiertem System | `ShipHeaderTable` aus `runtimeSystems` | ✅ (Systemstatus) |
| Kampflog | nur bei Kampf | `LastCombatReportButton`, nur wenn `hasLastCombatReport` | ✅ |
| Signaturmaskierung | ? | `SignatureMaskButton`, nur mit `WARPDRIVE` | ? (Bedingung nicht gegen STU geprüft) |
| Flottenkontrolle | nur Flottenführer | `ShipHeaderTable` Flottenbereich für alle Schiffe | ⚠️ |

## Schiffskontrolle (STU `control_mid.twig` Z. 10–98, SWU `ShipControlCenter.tsx`)

| Funktion | STU-Bedingung | SWU heute | Bewertung |
|---|---|---|---|
| Systeme (Schilde, Phaser, Torpedo, Tarnung, Tachyon, Bussard, Aggregation, Uplink usw.) | pro installiertem System | pro existierendem Runtime-System | ✅ (Mechanik), ➖ (nur 13 Systeme, siehe Inventar 2.3) |
| Torpedolager | Torpedolager vorhanden | `TORPEDO_BANK` vorhanden | ✅ |
| Warpkern-Ladungstransfer | System `WARPCORE_CHARGE_TRANSFER` | `REACTOR_CHARGE_TRANSFER` | ✅ |
| Shuttle starten | `hasShuttleRamp` **und** mindestens 1 gelagertes Shuttle | `ShuttleManagementPanel` nur mit Rampe/Shuttle, zeigt bei 0 Shuttles einen Leerzustand | ⚠️ STU blendet die Zeile aus, SWU zeigt Leerzustand |
| Müllverbrennung | nur NPC-Station | ➖ fehlt | ➖ |
| Warenkontotransfer (Handel) | Station mit Handelsposten (`Station::getTradePost`) | `TradePostEntry` sobald Post am Standort | ⚠️ siehe Handel unten |
| Konstrukt errichten | `canBuildConstruction`: Rampe heil, 5 Workbees, Ressourcen, Standort erlaubt | `FieldContextPanel` Z. 780 bei `context.construction.canBuild` | ⚠️ Logik passt laut Name, Platz anders |
| Astrolabor, Konstrukt-Hub | pro System | pro System | ✅ |
| Rumpfmodule (Reaktor, Antrieb) | pro Modul | `ReactorPanel` immer | ? |
| Fleet-Control (Aktivieren/Deaktivieren/Alarm) | nur Flottenführer | Flottenbereich im Kopf | ⚠️ |
| RPG-Unsichtbarkeit | nur Admin | ➖ | ? |

## Angedockt (STU `spacecraft.twig` Z. 201–306 und `control_mid.twig` Z. 99–150, SWU `DockingPanel.tsx`)

| Funktion | STU-Bedingung | SWU heute | Bewertung |
|---|---|---|---|
| Angedockt-Block (Abdocken, zur Station wechseln) | `getDockedTo` | `DockingPanel`, nur bei `dockedAtId` | ✅ |
| Handelstransferfenster | angedockt **und** Station mit Handelsposten (`dockedOnTradePost`) | `TradePostEntry` ohne Andock-Bedingung | ⚠️ |
| Angedockte Schiffe (Station) | nur Station | `DockingPanel`, nur Station | ✅ |
| Management, Reparatur (Station) | `CAN_MANAGE`, `CAN_REPAIR` | `StationShipManagementPanel` (Rolle), `StationRepairPanel` (Station) | ✅ |
| Werft (Station) | Rumpf `isShipyard` und Konstrukt-Hub aktiv | `StationShipyardPanel`, nur Rolle SHIPYARD | ✅ (Bedingung unterschiedlich benannt) |
| Dockkontrolle | nur Station | `DockingPrivilegesPanel`, nur Station | ✅ |

## Informationen-Block (STU `control_mid.twig` Z. 180–260, SWU `FieldContextPanel.tsx` Z. 570–700)

| Funktion | STU-Bedingung | SWU heute | Bewertung |
|---|---|---|---|
| Sektor scannen | immer | immer | ✅ |
| Boje setzen | `hasStoredBuoy` | immer, Z. 586–596 | ❌ (Beispiel aus der Frage) |
| Bojenliste | Bojen vorhanden (`buoylist.twig`) | `buoys.length > 0` | ✅ |
| Wurmlochpassage | Wurmloch am Standort | `wormholePassages?.length` | ✅ |
| Region, Verwaltungsregion | Standort hat Region | `context.region` / `adminRegion` | ✅ |
| Anomalie | Anomalie am Standort | `context.anomalies` | ✅ |
| Kartographie | Astro-Zustand und Ziel (`astroStates`, `isPlannable`) | `CartographyStatus`, sobald Plan ≠ NONE | ⚠️ |
| System verlassen | nur im System | immer, ausgegraut bei `!canLeave` | ⚠️ |
| Einfliegen | Eintrittssystem | `entrySystem` | ✅ |
| Tachyon-Scan | System-Tachyon aktiv (`isTachyonActive`) | ➖ | ➖ |

## Weitere Blöcke

| Funktion | STU-Bedingung | SWU heute | Bewertung |
|---|---|---|---|
| Nahbereichssensoren (NBS) | `hasNbs` (Schiff hat NBS-System) | `NearbySensorPanel` immer, mit Aktivierungsbutton | ❌ (vermutlich; für Schiffe ohne NBS nicht getestet) |
| Lagerraum | immer | `ShipStoragePanel` immer | ✅ |
| Reaktor und Antrieb | EPS-System vorhanden | `ReactorPanel` immer | ✅ (alle Schiffe haben EPS) |
| Flugnavigation | Warpantrieb (`isWarpPossible`), LSS | `NavigationPanel` immer | ? |
| Traktorstrahl, Ziehen, Halten | Traktor-System | ➖ | ➖ |
| Schiffskommunikation, Logbuch, Rundruf, Notruf | immer | `CommunicationDrawer` | ✅ |
| Schiffsliste im Sektor (Einzelschiffe) | immer | NBS-Liste | ✅ |

## Handel im Detail

STU hängt den Handel an die Station. Ein Schiff sieht das Handelsfenster nur, wenn es an einer Station mit Handelsposten angedockt ist (`dockedOnTradePost`). Dort gibt es zwei Einstiege: "Warenkontotransfer" in der Schiffskontrolle für die Station selbst und "Handelstransferfenster öffnen" im Angedockt-Block.

SWU hängt den Handel an den Standort. `getPostAtSpacecraft` (`trade-license-menu.service.ts` Z. 97–107) liefert den Post, sobald einer am `locationId` des Schiffs liegt. Andocken gibt es in SWU noch nicht (Inventar 2.5). Der Eintrag erscheint deshalb auch ohne Andocken. Wenn der Post gesperrt ist, zeigt SWU den Eintrag mit Grund, STU blendet ihn aus.

Das ist eine Modellfrage: Solange SWU kein Andocken hat, lässt sich die STU-Regel nicht 1:1 übernehmen. Die Entscheidung liegt beim Trade-Bereich.

## Konstrukt im Detail

- STU: Der Button "Konstrukt errichten" hängt unten in der Schiffskontrolle und ist nur sichtbar, wenn `canBuildConstruction` gilt. Die Bedingung umfasst Rampe, 5 Workbees, Ressourcen und die Standortregeln aus `BuildConstruction` (kein Wurmloch, kein gesperrter Sektor, keine Station am Ort, Limit, keine Tarnung/Schilde/Warp).
- SWU: Der Bau liegt im `FieldContextPanel`, Button bei `canBuild`. Die Backend-Regeln (`station-construction.service.ts` `build`) sind vorhanden. Abweichungen vom STU-Ort und ob die Backend-Regeln identisch sind, habe ich nicht vollständig verglichen.

## Offen (nicht geprüft)

- Modul-Icons, Reaktor- und Navigations-Interna, Signaturmaskierung, Tarnung.
- Ob die 13 SWU-Systeme alle STU-Systeme abdecken, die auf der Seite erscheinen.
- Die Bedingungen von `StationScrappingPanel` und `StationRepairPanel` im Einzelnen.

## Nachprüfung der offenen Punkte (2026-11-23)

| Funktion | STU-Bedingung (Quelle) | SWU heute (Quelle) | Bewertung |
|---|---|---|---|
| Reparaturoptionen | `canBeRepaired` (`SpacecraftWrapper.php` Z. 200): unalarmiert, nicht geschildet, nicht getarnt, beschädigte Systeme vorhanden | Schnellaktion immer; `RepairDialog.tsx` zeigt dann „Keine eigenreparierbaren Schäden vorhanden“ | ❌ bestätigt |
| Karte | `IS_MAP_BUTTON_VISIBLE` nur wenn der Layer des Schiffs im Nutzer-Layer liegt (`ShowSpacecraft.php` Z. 166) | Schnellaktion „Navigation und Karte“ immer | ❌ bestätigt |
| LSS-Filter / Sensoren | `hasLss` (System LSS) | Schnellaktion „Sensoren“ immer, öffnet `SensorOperationsPanel` | ❌ bestätigt |
| Signatur (Warp-Signatur fälschen) | `isWarpPossible` = System WARPDRIVE vorhanden **und** `getSystem() === null` (`SpacecraftStateTrait.php` Z. 31) | `SignatureMaskButton` nur bei vorhandenem WARPDRIVE (`ShipHeaderTable.tsx` Z. 292) | ⚠️ Grundbedingung gleich, STU hat die zusätzliche Bedingung `getSystem() === null`, deren Bedeutung ich nicht vollständig geklärt habe |
| Navigation (Bewegungsraster) | `canMove` = WARPDRIVE **oder** IMPULSEDRIVE (`SpacecraftInteractionTrait.php` Z. 41); ohne `canMove` kein Raster | `NavigationPanel` zeigt das Raster immer, Richtungsknöpfe deaktiviert ohne aktiven Warpantrieb (Z. 278) | ⚠️ STU blendet aus, SWU zeigt deaktiviert |
| LSS-Navigationsblock | `hasLss` | `NavigationPanel` Langstreckensensor-Umschalter, immer | ⚠️ |
| Reaktor-Block | Reaktorsystem vorhanden (`control_right.twig` Z. 7) | `ReactorPanel` immer gemountet; die Teilblöcke habe ich nicht einzeln geprüft | ? |
| Modul-Icons | nur mit Bauplan (`spacecraft.twig` Z. 186) | `ShipModulesPanel` rendert pro Modul; ohne Module entsteht kein Icon | ✅ (ohne Leerblock, nicht am Schiff ohne Module getestet) |
| Tarnung-Umschalter | Systemexistenz CLOAK | `ShipControlCenter` Z. 149/325 nur bei `systems.CLOAK` | ✅ |
| NBS-Block (Nahbereichssensoren) | `hasNbs` (System NBS) | `NearbySensorPanel` immer; ohne aktive NBS steht „Nahbereichssensoren sind nicht aktiv.“ und der Aktivierungsbutton | ❌ bestätigt (Block ist immer da) |
| Traktorstrahl-Block | Traktor-System vorhanden oder Schiff gezogen/ziehend (`control_right.twig` Z. 230) | System `TRACTOR_BEAM` im Laufzeit-Schema; Block habe ich nicht geprüft | ? |
| Baufortschritt / Demontage | nur bei laufendem Bau bzw. Demontage (`control_right.twig` Z. 148–155) | Stationsausbau-Panel nur bei Rolle CONSTRUCTION, Demontage nur Station | ⚠️ unterschiedlich verteilt |

## Systemabdeckung (Namensabgleich)

STU: 39 Systemtypen (`SpacecraftSystemTypeEnum`). SWU: 28 Laufzeit-Schlüssel (`SPACECRAFT_RUNTIME_SYSTEM_KEYS`, `packages/shared/src/lib/spacecraft/index.ts` Z. 117).

Ohne Entsprechung nach Name fehlen auf der SWU-Seite:
- `TROOP_QUARTERS`
- `CONSTRUCTION_HUB`
- `THOLIAN_WEB`
- `RPG_MODULE`
- `TRANSWARP_COIL`

Eher über andere Namen abgebildet, Zuordnung von mir geschätzt, nicht verifiziert:
- `BUSSARD_COLLECTOR` ↔ `RESOURCE_COLLECTOR`
- `AGGREGATION_SYSTEM` ↔ `RESOURCE_CONVERTER`
- `ASTRO_LABORATORY` ↔ `ASTROMETRY_LAB`
- `WARPDRIVE_BOOSTER` ↔ `HYPERDRIVE_BOOSTER`
- `WARPCORE_CHARGE_TRANSFER` ↔ `REACTOR_CHARGE_TRANSFER`
- `LSS` ↔ `LONG_RANGE_SENSORS`, `NBS` ↔ `SHORT_RANGE_SENSORS`
- `IMPULSEDRIVE` ↔ `SUBLIGHT_DRIVE`

Die Reaktor-Varianten (`FUSION_REACTOR`, `SINGULARITY_REACTOR`, `WARPCORE`) habe ich nicht auf SWU-Entsprechungen geprüft.

## Ergänzter Stand

- Bestätigt als Fehler (immer sichtbar, obwohl STU ausblendet): Reparaturoptionen, Karte, LSS-Filter, NBS-Block, Boje setzen, Shuttle-Start-Zeile, Handel (Standort statt Andocken).
- Neu als Abweichung: Navigationsraster und LSS-Umschalter (ausgegraut statt ausgeblendet), Signatur-Zusatzbedingung.
- Noch offen: Reaktor-Teilblöcke, Traktor-Block, Systemzuordnung für Reaktoren und die vier fehlenden Systeme (Truppenquartier, Konstrukt-Hub, Tholianisches Netz, RPG-Modul, Transwarp-Spule).
