# Schiffsseite: vollständige Abdeckung STU ↔ SWU

Stand: 2026-11-23. Nur Analyse, keine Änderung am Produktcode.

## Methode und Belegregeln

- Jede Zeile nennt die Quelle (Datei und Zeile). Eine Zeile ohne belegte Bedingung steht unter „Offen“ und ist nicht geraten.
- **STU-Seite:** Templates unter `src/html/spacecraft/` und `src/html/spacecraft/system/`, PHP-Prüfungen in `src/Component/Spacecraft/` und `src/Module/Spacecraft/`.
- **SWU-Seite:** Komponenten unter `apps/frontend/src/` und die Ableitung der Systeme im Backend (`spacecraft-runtime-state.service.ts`, `getRuntimeSystemsForModule`).
- **Systemzuordnung:** Eine Entsprechung gilt als belegt, wenn Code sie explizit herstellt. Eine Zuordnung nur nach Bedeutung ist als solche gekennzeichnet (Spalte „Beleg“).
- **Korrektur zu meiner letzten Antwort:** STU hat 35 Systemtypen (`SpacecraftSystemTypeEnum`, Werte 0–34), nicht 39. Der Traktorstrahl hat auf der SWU-Seite eine Anzeige (Zustand, Entkommen, Andocken), nur kein Aktivieren.

## Teil 1: STU-Schiffsseite (Elemente und Bedingungen)

| # | Element | STU-Bedingung | Quelle |
|---|---|---|---|
| S1 | Alarmstufen-Icon | `hasComputer` | `spacecraft/spacecraft.twig` Z. ~95 |
| S2 | Schildwert (+ Regeneration) | immer; Regeneration nur wenn Schild < Max | `spacecraft.twig` Z. ~105–111 |
| S3 | Warp-Wert | `hasWarpdrive` | `spacecraft.twig` Z. ~112 |
| S4 | EPS-/Reaktor-Wert | `epssystem` (EPS vorhanden); Warp-Anteil nur mit Warpantrieb, Reaktorwert nur ohne Warpantrieb | `spacecraft.twig` Z. ~119–133 |
| S5 | Batterie-Wert | `epssystem` | `spacecraft.twig` Z. ~131–133 |
| S6 | Crew | immer | `spacecraft.twig` Z. ~136–137 |
| S7 | Konstrukt entfernen (Scrap-Icon) | `isConstruction` | `spacecraft.twig` Z. 65–66 |
| S8 | Selbstzerstörung-Icon | nicht Konstrukt | `spacecraft.twig` Z. 67–75 |
| S9 | Station demontieren | `canBeScrapped` (Station, nicht UNDER_SCRAPPING) | `spacecraft.twig` Z. 76–81, `StationWrapper.php` Z. 30 |
| S10 | Info, Kommunikation | immer | `spacecraft.twig` Z. ~144–160 |
| S11 | LSS-Filter-Icon | `hasLss` | `spacecraft.twig` Z. ~161–166 |
| S12 | Karte-Icon | `IS_MAP_BUTTON_VISIBLE`: Layer des Schiffs im Nutzer-Layer | `ShowSpacecraft.php` Z. 162–168 |
| S13 | Standby-Icon | immer | `spacecraft.twig` Z. ~167–172 |
| S14 | Reparatur-Icon | `canBeRepaired` | `spacecraft.twig` Z. ~177–183, `SpacecraftWrapper.php` Z. 200–215 |
| S15 | Modul-Icons | Bauplan vorhanden | `spacecraft.twig` Z. ~186–189 |
| S16 | Systemstatus-Icons | für **jedes installierte System** (`getSystems()`) | `spacecraft.twig` Z. ~192–196, `Spacecraft.php` Z. 423 |
| S17 | Alarmstufe-Dialog | Icon nur mit Computer (S1) | `spacecraft.twig` Z. ~95 |
| S18 | Schiffskontrolle (Tabelle) | Block immer; Zeilen je Systembedingung (siehe S19–S30) | `control/control_mid.twig` Z. 10 |
| S19 | System SHIELDS | installiert → `systemWithOnOff` (Toggle) | `control_mid.twig` Z. 15; `SpacecraftSystemTypeEnum::getGenericTemplate` |
| S20 | System PHASER | installiert; bei `isUnalerted` (Alarm grün oder kein Computer) nur Hinweis, kein Toggle | `system/PHASER.twig` Z. 1–10 |
| S21 | Torpedo-Zeile | `hasTorpedo` → Toggle (außer bei `isUnalerted`) + Anzeige; sonst nur Anzeige bei gesunder Torpedolagerung | `system/torpedoAndStorage.twig` Z. 1–29 |
| S22 | System CLOAK | installiert → `systemWithOnOff` | `control_mid.twig` Z. 19 |
| S23 | System SUBSPACE_SCANNER | installiert → `subspaceScanner.twig`, Analyse nur bei `isActivated` | `control_mid.twig` Z. 18; `subspaceScanner.twig` Z. 23 |
| S24 | System TACHYON_SCANNER | installiert → `systemWithOnOff` | `control_mid.twig` Z. 23 |
| S25 | System THOLIAN_WEB | installiert → `openSettingsWhenHealthy` (nur bei `isHealthy`) | `control_mid.twig` Z. 20; `openSettingsWhenHealthy.twig` Z. 1 |
| S26 | System BUSSARD_COLLECTOR | installiert → `openSettingsWhenHealthy` | `control_mid.twig` Z. 21 |
| S27 | System AGGREGATION_SYSTEM | installiert → `openSettingsWhenHealthy` | `control_mid.twig` Z. 22 |
| S28 | System UPLINK | installiert → `systemWithOnOff` | `control_mid.twig` Z. 24 |
| S29 | System RPG_MODULE | installiert → `systemWithOnOff`; Unsichtbarkeits-Schalter nur für Admin | `control_mid.twig` Z. 25–45 |
| S30 | System ASTRO_LABORATORY | installiert → `systemWithOnOff`; Kartographie-Link nur mit Astro-Zustand | `control_mid.twig` Z. 96; `astroStates`-Makro Z. 496–510 |
| S31 | System CONSTRUCTION_HUB | installiert → `systemWithOnOff` | `control_mid.twig` Z. 97 |
| S32 | System WARPCORE_CHARGE_TRANSFER | installiert → `openSettingsWhenHealthy` | `control_mid.twig` Z. 46 |
| S33 | Torpedo-Lager-Anzeige | `isTorpedoStorageHealthy` | `torpedoAndStorage.twig` Z. 19–22 |
| S34 | Shuttle-Start | `hasShuttleRamp` **und** gelagerte Shuttles > 0 | `control_mid.twig` Z. 47 |
| S35 | Müllverbrennung | nur NPC-Station | `control_mid.twig` Z. 66 |
| S36 | Warenkontotransfer | Station mit Handelsposten (`getTradePost`) | `control_mid.twig` Z. 77–88 |
| S37 | Konstrukt errichten | `canBuildConstruction` (Rampe heil, 5 Werkbienen, Ressourcen, Standortregeln) | `control_mid.twig` Z. 89–95, `StationUtility.php` Z. 53–75 |
| S38 | Flottenkontrolle (Aktivieren, Deaktivieren, Alarm) | nur Flottenführer | `control_mid.twig` Z. 99 |
| S39 | Angedockt-Block | `getDockedTo` | `control_mid.twig` Z. 150–160 |
| S40 | Handelstransferfenster im Angedockt-Block | `dockedOnTradepost` | `control_mid.twig` Z. ~170 |
| S41 | Informationen: Sektor scannen | immer | `control_mid.twig` Z. ~194–197 |
| S42 | Informationen: Boje setzen | `hasStoredBuoy` | `control_mid.twig` Z. 198 |
| S43 | Informationen: Astro-Kartographie | Astro-Zustand + Ziel (`astroStates`) | `control_mid.twig` Z. 209; Makro Z. 496–510 |
| S44 | Informationen: Tachyon-Scan | `isTachyonActive` / `getTachyonState` | `control_mid.twig` Z. ~210–237 |
| S45 | Informationen: Region / Verwaltungsregion | Standort hat Region bzw. Verwaltungsregion | `control_mid.twig` Z. ~238–256 |
| S46 | Informationen: Anomalien | Anomalie am Standort | `control_mid.twig` Z. ~262–266 |
| S47 | Informationen: Kolonie-Hinweis (LSS-Reichweite) | `SPACECRAFT.getLss` **und** `closescolonydistance` | `control_mid.twig` Z. ~272–279 |
| S48 | Informationen: Wurmloch-Passage | Wurmloch am Standort | `control_mid.twig` Z. ~283–300 |
| S49 | Informationen: System verlassen / einfliegen | Bedingung nicht im Detail gelesen | `control_mid.twig` Z. ~300–320 (nur grob) |
| S50 | Reaktor-Block | Reaktor-Wrapper vorhanden | `control_right.twig` Z. 7 |
| S51 | Reaktor laden | Block mit Reaktor (S50); Flottenführer-Knöpfe nur Führer | `control_right.twig` Z. 7–30 |
| S52 | Warpantrieb-Block (Zuwachs, Verteilung) | `hasWarpDrive` | `control_right.twig` Z. 33–66 |
| S53 | Warp-Signatur fälschen | `isWarpPossible` (Warpantrieb vorhanden **und** `getSystem() === null`) | `control_right.twig` Z. 70–81, `SpacecraftStateTrait.php` Z. 31–34 |
| S54 | Aktive Warp-Signatur | `warpdrivesigActive` | `control_right.twig` Z. 85–99 |
| S55 | Ersatzbatterie | `eps.getMaxBattery > 0` | `control_right.twig` Z. 107 |
| S56 | Ersatzbatterie entladen | `isEBattUseable` | `control_right.twig` Z. 116–129 |
| S57 | Batterie-Nachladung (Station) | nur Station | `control_right.twig` Z. 131–137 |
| S58 | Baufortschritt / Demontagefortschritt | laufender Bau bzw. Demontage | `control_right.twig` Z. 148–155 |
| S59 | Konstrukt-Stationstypen-Auswahl | `isConstruction` und mögliche Stationen | `control_right.twig` Z. 168–227 |
| S60 | Traktorstrahl-Block | gezogenes oder ziehendes Schiff | `control_right.twig` Z. 230–260 |
| S61 | Navigation: LSS-Schalter | `hasLss` | `control/control_nav.twig` Z. 2–11, 83–96 |
| S62 | Navigation: Bewegungsraster | `canMove` = WARPDRIVE **oder** IMPULSEDRIVE | `control_nav.twig` Z. 26, 97; `SpacecraftInteractionTrait.php` Z. 41–45 |
| S63 | NBS-Schalter | `hasNbs` | `spacecraft.twig` Z. 311–326 |
| S64 | NBS-Liste | NBS aktiv (`getNbs`) | `spacecraft.twig` Z. 327–330; `shipmacros.twig` Z. 72–81 |
| S65 | NBS aus: Hinweis | nur wenn NBS vorhanden und aus — kein Block ohne NBS | `spacecraft.twig` Z. 311–326 |
| S66 | Lagerraum | immer; Einträge nur bei Menge > 0 | `spacecraftStorage.twig` Z. 10–29 |
| S67 | Crewliste / Crew-Details | Bedingung nicht geprüft | `spacecraft/spacecraftDetails.twig` (nur Einbindung gelesen) |
| S69 | Kolonisieren-Schalter | `CAN_COLONIZE` | `spacecraft.twig` Z. ~268, `ColonizationChecker.php` Z. 18 |

## Teil 2: SWU-Schiffsseite (Elemente und Bedingungen)

| # | Element | SWU-Bedingung | Quelle |
|---|---|---|---|
| W1 | Tractor-Banner „festgehalten“ | `ship.tractor.heldBy` | `spacecraft-detail.tsx` Z. 182 |
| W2 | Tractor-Banner „hält“ | `ship.tractor.holding`; „andocken“ nur Station | `spacecraft-detail.tsx` Z. 200–230 |
| W3 | StationExpansionPanel | Station mit Rolle CONSTRUCTION | `spacecraft-detail.tsx` Z. 240–246 |
| W4 | ShipHeaderTable (Kopf) | immer | `spacecraft-detail.tsx` Z. 249 |
| W5 | Kopfzeile Koordinaten, Hülle, Schilde, Energie, Crew | immer | `ShipHeaderTable.tsx` Z. 134–186 |
| W6 | Kopfzeile Hyperantrieb | **immer** (kein Warpantrieb-Check) | `ShipHeaderTable.tsx` Z. 157–161 |
| W7 | Kopfzeile Batterie | **immer** | `ShipHeaderTable.tsx` Z. 171–175 |
| W8 | Alarmstufe-Button | **immer** (kein Computer-Check) | `ShipHeaderTable.tsx` Z. 240–252 |
| W9 | Flottenbereich | Flotte: Führung/Mitglieder; ohne Flotte: Erstellen | `ShipHeaderTable.tsx` Z. 458–520 |
| W10 | Systemstatus-Icons | für 18 feste Schlüssel (`SHIP_SYSTEMS`), wenn Schlüssel vorhanden | `ShipHeaderTable.tsx` Z. 661–664; `ship-system-presentation.ts` |
| W11 | Schnellaktionen (Aktualisieren, Info, Kommunikation, Reparatur, Navigation und Karte, Sensoren, Standby) | **alle immer** | `ShipQuickActions.tsx` Z. 27–48 |
| W12 | Reparatur-Dialog | über W11 immer erreichbar; zeigt „Keine eigenreparierbaren Schäden vorhanden“ | `ShipQuickActions.tsx` Z. 118–124; `RepairDialog.tsx` Z. 64 |
| W13 | Letzter Kampfbericht | `hasLastCombatReport` | `LastCombatReportButton.tsx` Z. 40 |
| W14 | Signaturmaskierung | `systems.WARPDRIVE` vorhanden | `ShipHeaderTable.tsx` Z. 292; `SignatureMaskButton.tsx` Z. 15 |
| W15 | Selbstzerstörung-Button | **immer** (auch bei Konstrukt) | `ShipHeaderTable.tsx` Z. 807–813 |
| W16 | ShipModulesPanel (compact) | pro vorhandenem Modul | `ShipModulesPanel.tsx` Z. 110 |
| W17 | NavigationPanel | Schiff ohne Station | `spacecraft-detail.tsx` Z. 258–265 |
| W18 | NavigationPanel: LSS-Umschalter | **immer** (kein LONG_RANGE_SENSORS-Check) | `NavigationPanel.tsx` Z. 283–300 |
| W19 | NavigationPanel: Navicomputer-Sprung | `HYPERSPACE_COIL` vorhanden, Integrität > 0, nicht im System | `NavigationPanel.tsx` Z. 274–277 |
| W20 | NavigationPanel: Bewegungsraster (Blindflug) | **immer**, ohne LSS; Richtungsknöpfe deaktiviert wenn nicht angedockt (`status !== IDLE`) | `NavigationPanel.tsx` Z. 330–415 |
| W21 | NavigationPanel: Richtungsknöpfe deaktiviert ohne Warpantrieb | nur Hyperantrieb-Zustand im Flugknopf (Z. 278) | `NavigationPanel.tsx` Z. 278 |
| W22 | StationLssPanel | Station | `spacecraft-detail.tsx` Z. 266–272 |
| W23 | ShipControlCenter (Gehäuse) | immer | `spacecraft-detail.tsx` Z. 281–287 |
| W24 | ShuttleManagementPanel | `SHUTTLE_RAMP` vorhanden oder `isShuttle`; bei 0 Shuttles Leerzustand | `ShipControlCenter.tsx` Z. 202–207; `ShuttleManagementPanel.tsx` Z. 100 |
| W25 | Ressourcenumwandlung | `RESOURCE_CONVERTER` vorhanden | `ShipControlCenter.tsx` Z. ~209 |
| W26 | Ressourcensammlung | `RESOURCE_COLLECTOR` vorhanden | `ShipControlCenter.tsx` Z. ~210 |
| W27 | Schilde-Zeile | Schlüssel `SHIELDS` vorhanden | `ShipControlCenter.tsx` Z. ~211 (`systemRow`, Z. 125–131) |
| W28 | Waffen-Zeile | Schlüssel `WEAPONS` vorhanden | `ShipControlCenter.tsx` Z. ~212 (`systemRow`) |
| W29 | Scanner-Zeilen | `SUBSPACE_SCANNER`, `TACHYON_SCANNER` vorhanden | `ShipControlCenter.tsx` Z. ~213–232 |
| W30 | Kooperationsuplink | `UPLINK` vorhanden | `ShipControlCenter.tsx` Z. ~233 |
| W31 | Beamblocker-Zeile | `BEAM_BLOCKER` vorhanden (nur Station) | `ShipControlCenter.tsx` Z. ~234–238 |
| W32 | Hyperantriebs-Notladung | `HYPERDRIVE_BOOSTER` vorhanden; deaktiviert ohne Aktivität | `ShipControlCenter.tsx` Z. 240–250 |
| W33 | Torpedo-Block | `TORPEDO_BANK` vorhanden | `ShipControlCenter.tsx` Z. ~252 |
| W34 | Astrometrie-Labor | `ASTROMETRY_LAB` vorhanden | `ShipControlCenter.tsx` Z. ~330 (laboratory) |
| W35 | Tarnung | `CLOAK` vorhanden | `ShipControlCenter.tsx` Z. 149, 325–340 |
| W36 | Peilsender | `TRACKER` vorhanden | `ShipControlCenter.tsx` Z. ~342 |
| W37 | ShipOperationsPanel (Details, Energie, Crew) | immer; Inhalte nur auf Knopfdruck | `spacecraft-detail.tsx` Z. 294–300; `ShipOperationsPanel.tsx` Z. 163, 268, 362 |
| W38 | ReactorPanel: Reaktortreibstoff und Aufladen | **immer** | `ReactorPanel.tsx` Z. 215–237 |
| W39 | ReactorPanel: Reaktorladung übertragen | `canTransferReactorCharge` (`REACTOR_CHARGE_TRANSFER` **aktiv**) | `ReactorPanel.tsx` Z. 234–243; `spacecraft-detail.tsx` Z. 311–315 |
| W40 | ReactorPanel: Warp-/EPS-Verteilung | **immer** (kein Warpantrieb-Check) | `ReactorPanel.tsx` Z. 245–300 |
| W41 | ReactorPanel: Hyperantrieb aktivieren/deaktivieren | `!inSystem` (**kein** Warpantrieb-Check) | `ReactorPanel.tsx` Z. 358–369 |
| W42 | StarMapDialog | auf Knopfdruck (W11 Karte) | `spacecraft-detail.tsx` Z. 330–334 |
| W43 | SensorOperationsPanel (LSS-Filter) | auf Knopfdruck (W11 Sensoren) | `SensorOperationsPanel.tsx` Z. 87 |
| W44 | SelfDestructPanel | auf Knopfdruck oder Zerstörung | `SelfDestructPanel.tsx` Z. 60 |
| W45 | StationScrappingPanel | Station | `spacecraft-detail.tsx` Z. 337 |
| W46 | AllianceDepotPanel | Station mit Depot-Rolle | `spacecraft-detail.tsx` Z. 340 |
| W47 | NearbySensorPanel | **immer**; ohne NBS nur Hinweis „nicht aktiv“ plus Aktivierungsknopf | `NearbySensorPanel.tsx` Z. 67–68, 584–596 |
| W48 | DockingPanel | Station oder `dockedAtId` | `DockingPanel.tsx` Z. 44 |
| W49 | StationShipManagementPanel | Station mit Rolle MANAGING_ROLES | `StationShipManagementPanel.tsx` Z. 14–16 |
| W50 | StationShipyardPanel | Station, Rolle SHIPYARD | `spacecraft-detail.tsx` Z. 355–357 |
| W51 | StationRepairPanel | Station; Queue/Selbst nur wenn relevant | `StationRepairPanel.tsx` Z. 22, 47 |
| W52 | StationTradePostPanel | Station mit Handelsposten | `StationTradePostPanel.tsx` Z. 20–31 |
| W53 | DockingPrivilegesPanel | Station | `spacecraft-detail.tsx` Z. 359 |
| W54 | WormholeRestrictionsPanel | Station; ohne Daten `null` | `WormholeRestrictionsPanel.tsx` Z. 76 |
| W55 | ShipStoragePanel | **immer** | `spacecraft-detail.tsx` Z. 362–369 |
| W56 | TradePostEntry | Handelsposten am **Standort** des Schiffs (kein Andock-Check) | `TradePostEntry.tsx` Z. 33; `trade-license-menu.service.ts` Z. 97–107 |
| W57 | FieldContextPanel: Sektor scannen | immer (bei Kontext) | `FieldContextPanel.tsx` Z. ~585 |
| W58 | FieldContextPanel: Boje setzen | **immer** | `FieldContextPanel.tsx` Z. 586–596 |
| W59 | FieldContextPanel: Bojenliste | Bojen vorhanden | `FieldContextPanel.tsx` Z. 715 |
| W60 | FieldContextPanel: Wurmlochpassage | Passagen vorhanden | `FieldContextPanel.tsx` Z. ~600 |
| W61 | FieldContextPanel: Region / Verwaltungsregion | Region vorhanden | `FieldContextPanel.tsx` Z. ~610–620 |
| W62 | FieldContextPanel: Anomalien | Anomalien vorhanden | `FieldContextPanel.tsx` Z. 640–650 |
| W63 | FieldContextPanel: Kartographie | Plan ≠ NONE, Standort mit System/Region | `FieldContextPanel.tsx` Z. 655–667, Z. 1100–1116 |
| W64 | FieldContextPanel: System verlassen | Schiff in System; ausgegraut bei `!canLeave` | `FieldContextPanel.tsx` Z. 680–698 |
| W65 | FieldContextPanel: einfliegen | Eintrittssystem vorhanden | `FieldContextPanel.tsx` Z. 700–712 |
| W66 | FieldContextPanel: Kolonieziel | Kolonieziel vorhanden; Kolonisieren-Knopf nur bei `canColonize` | `FieldContextPanel.tsx` Z. 723–759 |
| W67 | FieldContextPanel: Konstrukt errichten | `canBuild` | `FieldContextPanel.tsx` Z. 769–782 |
| W68 | FieldContextPanel: Konstrukt entfernen | Station ist eigene | `FieldContextPanel.tsx` Z. 769–778 |
| W69 | Konstrukt-Dialog | nach Klick | `FieldContextPanel.tsx` Z. 940–949 |
| W70 | SpacecraftMessageBar | immer | `spacecraft-detail.tsx` Z. 181 |
| W71 | CommunicationDrawer | auf Knopfdruck | `ShipQuickActions.tsx` Z. 126 |
| W72 | Schiffs-Name (Umbenennen) | immer | `ShipHeaderTable.tsx` Z. 793–806 |
| W73 | Schiffs-Standby-Schalter | immer | `ShipQuickActions.tsx` Z. 66–75 |
| W74 | Torpedo-Lager-Anzeige (Storage) | siehe W33 | — |

## Teil 3: Systemtypen (35 STU) ↔ Laufzeit-Schlüssel (28 SWU)

Belegarten:
- **Code:** SWU-Ableitung in `getRuntimeSystemsForModule` (Modulkategorie/Modulname → Schlüssel) entspricht einem STU-Systemtyp, der in `ModuleSpecialAbilityEnum::getSystemType` oder dem Namen der Typen gleichlautet.
- **Name:** nur Gleichheit der deutschen Bezeichnung oder eindeutige Bedeutung; keine Code-Verbindung beidseitig.
- **nicht belegt:** kein Gegenstück gefunden.

| STU-Systemtyp | SWU-Schlüssel | Beleg | STU-Anzeige | SWU-Anzeige | Bewertung |
|---|---|---|---|---|---|
| HULL | — | nicht belegt | Kopfzeile (Hülle) | Kopfzeile Hülle (W5) | ✅ als Wert, kein Systemsymbol |
| EPS | EPS | Code (`energieverteiler`) | Batterie- und Energie-Zeile (S4, S55) | ReactorPanel + Energie-Zeile (W38, W5) | ⚠️ Energie-Zeile immer, STU nur mit EPS |
| IMPULSEDRIVE | SUBLIGHT_DRIVE | Code (`SUBLIGHT_DRIVE`-Kategorie) | Bewegungsraster (S62) | Impuls-Icon im Kopf nicht, keine Schaltung; Raster immer (W20) | ❌ Raster ohne Antrieb sichtbar |
| WARPCORE | REACTOR | Code (`REACTOR`-Kategorie) | Reaktor-Block (S50) | ReactorPanel immer (W38) | ⚠️ drei STU-Reaktortypen, eine SWU-Kategorie; siehe Offen |
| COMPUTER | COMPUTER | Code (Systemschlüssel, `STARTUP_ACTIVE_SYSTEMS`) | Alarm-Icon (S1, S17) | Alarm-Button immer (W8) | ❌ Alarmstufe ohne Computer |
| PHASER | WEAPONS | Code (`ENERGY_WEAPON`/`WEAPONS`) | Schalter, bei grün gesperrt (S20) | Waffen-Zeile (W28), Schalten ohne Alarmprüfung | ❌ bei grüner Alarmstufe in SWU schaltbar |
| TORPEDO | TORPEDO_BANK | Code (`TORPEDO_BANK`/`PROJECTILE`) | Schalter, bei grün gesperrt (S21) | Torpedo-Block (W33), Schalten ohne Alarmprüfung | ❌ wie PHASER |
| CLOAK | CLOAK | Code (`tarnvorrichtung`) | Schalter (S22) | Tarnung (W35) | ✅ (Kopfzeile fehlt, siehe unten) |
| LSS | LONG_RANGE_SENSORS | Code (`SENSORS`) | LSS-Schalter, LSS-Filter (S11, S61) | LSS-Schalter immer (W18), Sensor-Panel über Knopf (W43) | ❌ LSS-Schalter immer |
| NBS | SHORT_RANGE_SENSORS | Code (`SENSORS`) | NBS-Schalter (S63) | NBS-Block immer (W47) | ❌ NBS-Block immer |
| WARPDRIVE | WARPDRIVE | Code (`HYPERDRIVE`) | Warp-Block, Signatur (S52–S54) | Kopfzeile Hyperantrieb immer (W6), Schalter immer (W41), Signatur nur mit Warpantrieb (W14) | ❌ Kopfzeile und Schalter immer sichtbar |
| SHIELDS | SHIELDS | Code (`SHIELDS`) | Schalter (S19) | Schilde-Zeile (W27) | ✅ |
| TACHYON_SCANNER | TACHYON_SCANNER | Code (`gravitationswellenscanner`) | Schalter (S24) | Scanner-Zeile (W29) | ✅ |
| LIFE_SUPPORT | LIFE_SUPPORT | Code (Standardsystem) | nur Kopfsymbol (S16) | Kopfsymbol (W10) | ✅ |
| TRACTOR_BEAM | TRACTOR_BEAM | Code (`TRACTOR_BEAM`) | Block bei Halten/Ziehen (S60) | Banner bei Halten/Ziehen (W1, W2); **kein Aktivieren** (kein Endpunkt, `grep` ohne Treffer) | ➖ Aktivierung fehlt |
| TROOP_QUARTERS | — | nicht belegt | nur Kopfsymbol (S16) | nicht vorhanden | ➖ |
| DEFLECTOR | DEFLECTOR | Code (Standardsystem, außer Kleinschiff) | nur Kopfsymbol (S16) | Kopfsymbol (W10) | ✅ |
| ASTRO_LABORATORY | ASTROMETRY_LAB | Code (`astrometrie-labor`) | Schalter, Kartographie (S30, S43) | Labor-Schalter (W34) | ✅ (Kopfsymbol fehlt) |
| SUBSPACE_SCANNER | SUBSPACE_SCANNER | Code (`hyperraumfeldscanner`) | Scanner (S23) | Scanner-Zeile (W29) | ✅ |
| MATRIX_SCANNER | MATRIX_SCANNER | Code (`matrixsensoren`) | nur Kopfsymbol und Subraum-Einstellung (S16) | Kopfsymbol (W10), Feldkontext (W57) | ⚠️ keine Schaltung im Schiffs-Template |
| TORPEDO_STORAGE | TORPEDO_BANK | nicht belegt (zwei STU-Typen, ein SWU-Schlüssel) | Lageranzeige (S33) | Torpedo-Block (W33) | ⚠️ zusammengefasst |
| SHUTTLE_RAMP | SHUTTLE_RAMP | Code (`shuttlerampe`) | Start nur mit gelagerten Shuttles (S34) | Shuttle-Panel auch ohne Shuttles (W24) | ⚠️ Leerzustand statt Ausblenden |
| BEAM_BLOCKER | BEAM_BLOCKER | Code (Station) | kein Schiffs-Template gefunden | Zeile nur Station (W31) | ? (siehe Offen) |
| CONSTRUCTION_HUB | — | nicht belegt | Schalter (S31) | nicht vorhanden; Stationsausbau nur über Rolle CONSTRUCTION (W3) | ➖ |
| UPLINK | UPLINK | Code (Station, Sensorrolle) | Schalter (S28) | Uplink-Panel (W30) | ✅ |
| FUSION_REACTOR | REACTOR | nicht belegt (drei STU-Typen) | Reaktor-Block (S50) | ReactorPanel (W38) | ⚠️ siehe Offen |
| TRANSWARP_COIL | HYPERSPACE_COIL | nicht belegt | Transwarp-Block (Template `TRANSWARP_COIL.twig`, Schalter Start) | Navicomputer-Sprung (W19) | ⚠️ Funktion unterschiedlich, Entsprechung nicht belegt |
| TRACKER | TRACKER | Code (`peilsender`; STU `HIROGEN_TRACKER`→TRACKER) | Tracker-Block (`TRACKER.twig`, Bedingung `tracker` und Ziel, `control_right.twig`) | Peilsender-Block (W36) | ✅ (Code-Mapping beidseitig vorhanden) |
| THOLIAN_WEB | — | nicht belegt | Schalter bei gesund (S25) | nicht vorhanden | ➖ |
| RPG_MODULE | — | nicht belegt | Schalter, Admin-Unsichtbarkeit (S29) | nicht vorhanden auf Schiffsseite | ➖ |
| SINGULARITY_REACTOR | REACTOR | nicht belegt (drei STU-Typen) | Reaktor-Block (S50) | ReactorPanel (W38) | ⚠️ siehe Offen |
| BUSSARD_COLLECTOR | RESOURCE_COLLECTOR | Code (`ressourcen-kollektor`); STU-Zuordnung über `ModuleSpecialAbilityEnum::BUSSARD_COLLECTOR` | Schalter bei gesund (S26) | Sammel-Panel (W26) | ⚠️ Modulzuordnung nicht beidseitig belegt |
| AGGREGATION_SYSTEM | RESOURCE_CONVERTER | Code (`molekular-raffinerie`); STU `ModuleSpecialAbilityEnum::AGGREGATION_SYSTEM` | Schalter bei gesund (S27) | Umwandlungs-Panel (W25) | ⚠️ Modulzuordnung nicht beidseitig belegt |
| WARPDRIVE_BOOSTER | HYPERDRIVE_BOOSTER | Code (`hyperantriebs-notladegerät`); STU `WARPDRIVE_BOOST` | Booster-Knopf (Template `WARPDRIVE_BOOSTER.twig`) | Notladung (W32) | ⚠️ Modulzuordnung nicht beidseitig belegt |
| WARPCORE_CHARGE_TRANSFER | REACTOR_CHARGE_TRANSFER | Code (`hypermaterie-transferkoppler`); STU `WARPCORE_CHARGE_TRANSFER` | Schalter bei gesund (S32) | Reaktorladung übertragen bei **aktivem** System (W39) | ⚠️ SWU verlangt Aktivität, STU Gesundheit |

Schlüssel der SWU ohne STU-Entsprechung: keine. Alle 28 SWU-Schlüssel sind oben zugeordnet (`RESOURCE_*`, `HYPERSPACE_COIL`, `HYPERDRIVE_BOOSTER` usw.).

Schlüssel der SWU, die in der **Kopfzeile fehlen** (`SHIP_SYSTEMS` enthält 18 von 28): ASTROMETRY_LAB, CLOAK, TRACTOR_BEAM, REACTOR_CHARGE_TRANSFER, HYPERDRIVE_BOOSTER, HYPERSPACE_COIL, TRACKER, RESOURCE_COLLECTOR, RESOURCE_CONVERTER, SHUTTLE_RAMP. STU zeigt alle installierten Systeme im Kopf (S16).

## Teil 4: Zusammenfassung der Abweichungen (verifiziert)

Immer sichtbar, STU blendet aus:
1. Schnellaktion Reparatur (W11, W12)
2. Schnellaktion Navigation und Karte (W11, W42)
3. Schnellaktion Sensoren / LSS-Filter (W11, W43)
4. LSS-Schalter im Navigationspanel (W18)
5. Bewegungsraster ohne Antrieb (W20; STU S62)
6. NBS-Block ohne NBS (W47; STU S63–S65)
7. Boje setzen (W58; STU S42)
8. Hyperantrieb in der Kopfzeile (W6; STU S3)
9. Batterie in der Kopfzeile (W7; STU S5)
10. Hyperantrieb-Schalter im Reaktorpanel (W41; STU S52)
11. Warp-Verteilung im Reaktorpanel (W40; STU S52)
12. Alarmstufe-Button ohne Computer (W8; STU S1, S17)
13. Selbstzerstörung bei Konstrukt (W15; STU S7–S8)
14. Shuttle-Panel ohne Shuttles (W24; STU S34)
15. Reaktorpanel-Block ohne Reaktor (W38; STU S50–S51) — STU-Bedingung über den Reaktor-Wrapper gelesen, SWU-Verhalten ohne Reaktor nicht getestet
16. Handelsposten ohne Andocken (W56; STU S36, S40)

Schaltbar, STU sperrt:
17. Waffen bei grüner Alarmstufe (W28; STU S20)
18. Torpedos bei grüner Alarmstufe (W33; STU S21)

Fehlt auf SWU-Seite:
19. Traktorstrahl-Aktivierung (W1, W2; STU S60)
20. Kopfsymbole für 10 SWU-Systeme (siehe Teil 3)
21. Müllverbrennung (STU S35) — NPC-Station, SWU ohne Entsprechung
22. Truppenquartier, Konstrukt-Hub, Tholianisches Netz, RPG-Modul (Teil 3)
23. Konstrukt-Stationstypen-Auswahl (STU S59) — SWU hat nur die Stationsausbau-Auswahl (W3), Vergleich der Optionen nicht geprüft

Auf SWU-Seite ohne belegte STU-Entsprechung:
24. Schiffs-Nachrichtenleiste (W70) — STU-Entsprechung nicht geprüft.

Kein Befund (passt): Tarnung (W35), Schilde (W27), Tachyon-Scanner (W29), Subraumscanner (W29), Uplink (W30), Peilsender (W36), Lagerraum (W55), Werft (W50), Dockkontrolle (W53), Wurmlochpassage (W60).

## Teil 5: Offen (nicht belegt, bitte entscheiden oder klären)

1. **Modulstammdaten STU:** Die Zuordnung Modul → Systemtyp steht nur in der STU-Datenbank (`stu-db-data` ist ein PostgreSQL-Datenverzeichnis). Ohne laufenden Server lässt sich nicht prüfen, welches STU-Modul welchen SWU-Modulnamen entspricht. Die mit „nicht belegt“ markierten Zeilen brauchen diesen Abgleich.
2. **Reaktortypen:** STU hat drei Reaktorsysteme (WARPCORE, FUSION_REACTOR, SINGULARITY_REACTOR), SWU eine Kategorie REACTOR. Welche STU-Reaktoren auf SWU-Modulen liegen, ist nicht belegt.
3. **Torpedolager:** STU trennt TORPEDO und TORPEDO_STORAGE, SWU hat einen Schlüssel TORPEDO_BANK.
4. **Warpfunktion Transwarp:** STU TRANSWARP_COIL und SWU HYPERSPACE_COIL sind unterschiedlich benannt und funktional nicht gleich beschrieben. Entsprechung nicht belegt.
5. **BEAM_BLOCKER:** In STU fand ich kein Schiffs-Template, das ihn zeigt. SWU zeigt ihn an Stationen. Ob STU ihn an Stationen anders zeigt, habe ich nicht geprüft.
6. **Systemzustände im Detail:** Die Templates für TRACKER (113 Zeilen) und subspaceScanner (138 Zeilen) habe ich nur in den Bedingungen gelesen, nicht vollständig.
7. **STU-Kolonie-Hinweis (S47):** Bedingungen gelesen, Inhalt nicht vollständig verglichen.
8. **SWU-Nachrichtenleiste (W70):** Inhalt und STU-Entsprechung nicht geprüft.
9. **Flottenbereich (W9):** STU-Beitritts-UI auf der Schiffsseite nicht geprüft.
10. **Schiffs-Modul-Icons (S15, W16):** Bedingung in STU gelesen, SWU-Leerzustand nicht am Schiff ohne Module getestet.

## Genauigkeit der Quellenangaben

- Zeilen mit `~` sind Näherungen aus der Grep-Ausgabe, nicht gelesen. Die Aussage ist geprüft, die genaue Zeile nicht.
- Nicht im Detail gelesen (nur Einbindung oder Grobbedingung): S49, S67, W57–W66 (Zeilen aus Suchtreffern, nicht vollständig gelesen), W70, W71, W72–W74.
- Die Zeilen W19 bis W21 und W38 bis W41 sind aus `NavigationPanel.tsx` und `ReactorPanel.tsx` direkt gelesen.

## Hinweis zur Vollständigkeit

Diese Liste deckt alle Elemente ab, die ich über die Templates und Komponenten der Schiffsseite finden konnte. Eine absolute Vollständigkeit ist nicht garantiert, weil STU-Views mehrere Templates kombinieren und einige Templates nur über Bedingungen eingebunden werden, die ich in den Listen oben nicht jede einzeln geprüft habe. Die Liste der offenen Punkte ist deshalb der ehrliche Rest.
