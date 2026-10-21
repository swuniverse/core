# STU→SWU-Paritätsinventur: Schiffe und Stationen

Stand: 2026-10-21. Nur Bestandsaufnahme, kein Produktcode geändert.

Abkürzungen:

- `STU/` = `/Users/TMUNDIN/git/github.com/st-universe/core/src/`
- `BE/` = `apps/backend/src/modules/`
- `FE/` = `apps/frontend/src/`
- `SH/` = `packages/shared/src/lib/`
- `GD/` = `game-data/data/`

Bewertet wurden Funktion und Spielregeln sowie UI/UX (Layout, Informationsdichte, Icons). Maßstab ist die funktionale Parität für Spieler, nicht die Gleichheit des Quellcodes. Was ADRs, `CONTEXT.md` oder bestehende Specs abweichend festlegen, ist als „bewusst abweichend“ markiert. Unsichere Bewertungen tragen den Vermerk **(unsicher)**.

---

## 1. Übersicht: Was SWU schon hat

**Datenmodell.** Die Entity `BE/spacecraft/entities/spacecraft.entity.ts` enthält Hülle, Schilde, EPS, Batterie, Reaktorleistung, Reaktortreibstoff, Hyperantrieb (`warpdrive`), Ausweichchance, Reaktorsplit mit Auto-Übertrag, Alarmstufe, Betriebsmodus (Standby), LSS-Modus, Flottenbezug und die JSONB-Laufzeitsysteme `runtimeSystems`. `SH/spacecraft/index.ts` definiert 13 Laufzeitsysteme: SHIELDS, REACTOR, EPS, WARPDRIVE, SUBLIGHT_DRIVE, LRS, NBS, COMPUTER, WEAPONS, TORPEDO_BANK, SPECIAL, ASTROMETRY_LAB und LIFE_SUPPORT. Daneben gibt es eigene Tabellen für Fracht, Torpedolager, Module, Wracks, Schiffslogbuch, Notrufe, Scanergebnisse und Kolonie-Scans.

**Bewegung.** Vorhanden sind Systemflug orthogonal mit EPS-Kosten aus `flightEnergyCost`, Galaxieflug mit Hyperantriebskosten, Systemeintritt und -austritt sowie der „Warp“ zwischen Systemen. Der Warp ist eine SWU-eigene Mechanik mit Flugzeit und `IN_FLIGHT` (siehe Abschnitt 2.2). Ohne LRS ist nur ein Blindflug über ein Feld möglich. Antriebe werden beim Flug automatisch aktiviert. Die Bewegung zählt in die Statistik, entdeckt die Galaxie und erledigt die Kartographie-Messpunkte beim Anflug.

**Systeme und Energie.** Systeme lassen sich schalten, mit Crew-Prüfung und den STU-Sonderregeln für NBS, LRS, Labor und Alarmstufe Rot. Die Alarmstufen Grün, Gelb und Rot schalten passende Systeme mit. Weiter vorhanden: Standby („Energieverbrauch minimieren“), Reaktorverteilung EPS↔Hyperantrieb, Reaktor laden (Deuterium), Ersatzbatterie entladen, Energiefluss- und EPS-Verbrauchsansicht, Brownout-Abschaltung sowie Schildregeneration im Tick.

**Sensorik.** Vorhanden sind LSS-Karte mit Filtern (Territorium, Unpassierbar, Kartographie), Sektor-Scan, Systemfeldscan, Zielscan, Kolonie-Oberflächenscan mit Kolonie-Scan-Archiv (ADR-0002) und messpunktbasierte Astrometrie (ADR-0003).

**Interaktion auf demselben Feld (NBS-Liste).** Vorhanden sind Angriff, Scan, Abfangen (aus dem Hyperraum zwingen), Nachricht, Warentransfer Schiff↔Schiff in beide Richtungen sowie Crew- und Torpedotransfer Schiff↔Schiff. Fremde Schiffe dürfen nur nach Haltungsprüfung über den `relationshipResolver` beliefert werden. Wrackbergung (Fracht) ist ebenfalls vorhanden.

**Kolonie-Interaktion.** Beamen von Waren, Crew und Torpedos, Landen, Kolonisieren, Koloniebotschaft und Kolonieangriff (nur Backend). Über die Kolonieseite: Orbitalmanagement, Verteidigen, Blockieren, Shuttletransfer, Reparatur, Umrüstung und Demontage in der Werft.

**Kampf.** `BE/combat/combat.engine.ts` rechnet einen STU-artigen Angriffszyklus mit Energie- und Projektilphase, Waffe-gegen-Schild-Tabelle, Ausweichen, Ionen-Systemausfall und Modulschaden. Der Kampfbericht wird als Dialog angezeigt. Bei Zerstörung entsteht ein Wrack mit Fracht und Torpedos, ein Notruf endet.

**Kommunikation.** Vorhanden sind Rundruf (Broadcast), Schiffslogbuch (CRUD), Notruf mit globaler Liste und Koloniebotschaft lesen.

**Sonstiges.** Selbstzerstörung, Umbenennen, Flotten (nur Backend: erstellen, beitreten, verlassen, auflösen beim Verlassen des Leaders) und Admin-Spawn bzw. -Baupläne.

**UI.** Die Schiffsdetailseite (`FE/pages/spacecraft-detail.tsx`) besteht aus dem STU-artigen Schiffskopf (`ShipHeaderTable`) mit Werten, Alarm-Icon, Selbstzerstörung und Umbenennen. Darunter folgen eine Iconleiste mit Schnellaktionen (`ShipQuickActions`), die Modul-Iconleiste, eine Systemstatus-Iconleiste, Navigation mit LSS, Feld- und Kolonie-Kontext, Reaktor, Lager und NBS-Liste. Die Schiffsliste (`FE/pages/spacecraft.tsx`) ist eine einfache Tabelle mit Klasse, Name, Alarm, x|y, Hülle, Schilden, Energie und Crew.

**Kurzfazit.** Der Kern von Einzelschiff, Bewegung, Energie, Sensorik, Transfer und Kampf ist da und folgt in vielen Details den STU-Regeln. Vier Blöcke fehlen komplett:

1. **Stationen** (Bau, Module, Werft, Andocken, Docking-Rechte, Reparatur, Demontage, Sensoren)
2. **Traktorstrahl, Tarnung und Tachyon**
3. **Flotten-UI und Flottenflug**
4. **Entern, Übernahme, Rettungskapseln und Crew-Ränge**

Dazu kommen die Alarmreaktion (Auto-Angriff beim Einflug), Feldeffekte und Anomalien beim Flug sowie einige Spezialsysteme (Bussard-Kollektor, Aggregationssystem, Subraum-Sensor, Tracker, Transwarp, Warpkern-Boost, Bojen, Wurmlöcher, Netzemitter). Die Schiffsliste ist deutlich weniger dicht als in STU.

---

## 2. Feature-Tabelle

Legende SWU-Stand: **vorhanden** · **teilweise** · **fehlt** · **bewusst abweichend**

### 2.1 Schiffsdetail: Kopf, Basisaktionen, UI

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Schiffskopf mit Koordinaten, Hülle, Schilden (+Regeneration), EPS (+Zuwachs, Verbrauch/Reaktor), Crew (akt./min/max) | `html/spacecraft/spacecraft.twig` (Kopftabelle), `View/ShowSpacecraft` | teilweise | `FE/components/spacecraft/ShipHeaderTable.tsx` | Werte sind da. Die STU-Info-Tooltips (Regeneration je 15 min, Zuwachs, Verbrauch/Reaktornutzung direkt in der Zelle) sind nur teilweise vorhanden, das Audit nennt die Dichte als offenen P1-Punkt. **(unsicher, Feinabgleich nötig)** |
| Umbenennen | `Spacecraft/Action/ChangeName` | vorhanden | `PUT /spacecraft/:id`, `ShipHeaderTable` RenameForm | — |
| Aktualisieren, Schiffsinformationen, Kommunikation, LSS-Filter, Karte, Standby | `spacecraft.twig` Z.144–180, `View/ShowSpacecraftDetails`, `ShowShipCommunication`, `ShowLSSFilter` | vorhanden | `ShipQuickActions.tsx`, `ShipOperationsPanel.tsx`, `CommunicationDrawer.tsx`, `SensorOperationsPanel.tsx` | Icons entsprechen STU (`update0`, `info1`, `msg1`, `lss_button1`, `map1`, `shutdown1`). |
| Reparaturoptionen (Eigenreparatur mit Ersatzteilen/Systemkomponenten) | `Spacecraft/Action/Selfrepair`, `View/ShowRepairOptions`, `html/ship/repairoptions.twig` | fehlt | — | SWU repariert nur in der Kolonie-Werft und passiv mit 1 % Modulintegrität je Tick (`spacecraft.service.ts processTick`). Der STU-Button `rep1.png` fehlt. |
| Alarmstufen-Dialog | `View/ShowAlertLevel`, `showshipalvl.twig`, `Action/Set{Green,Yellow,Red}Alert` | vorhanden | `PATCH :id/alert-state`, `spacecraft-alert.service.ts`, `ShipHeaderTable` | Die Systemkopplung entspricht STU. |
| Modul-Iconleiste (20 px, Tooltip) | `spacecraft.twig` Z.186–189 | vorhanden | `ShipModulesPanel.tsx` (compact) | — |
| Systemzustands-Iconleiste mit Status und Cooldown | `spacecraft.twig` Z.190–200, `html/spacecraft/system/*.twig` | teilweise | `ShipHeaderTable.tsx` (Systemstatus), `ShipControlCenter.tsx` | Die STU-Systemeinstellungsfenster (`View/ShowSystemSettings`: Bussard, Aggregation, Subraum, Warpkern-Transfer, Netz) fehlen, weil diese Systeme fehlen. |
| Kampflog einsehen | `spacecraft.twig` Z.10 (`showFightLog`) | teilweise | `CombatReportDialog.tsx` | SWU zeigt den Bericht direkt nach dem Angriff. Ein persistentes „letztes Kampflog“ am Schiff fehlt. **(unsicher)** |
| Selbstzerstörung (mit Code-Bestätigung) | `Action/SelfDestruct`, `View/ShowSelfDestruct`, `selfdestruct.twig` | vorhanden | `spacecraft-destruction.service.ts`, `SelfDestructPanel.tsx` | Folgen wie Prestige, Rettungskapseln, Crew-Evakuierung und Historie fehlen, siehe 2.9. |
| Schiffslager-Hover in Listen | `View/ShowSpacecraftStorage`, `spacecraftStorage.twig` | teilweise | `ShipStoragePanel.tsx` | In der Detailansicht vorhanden. Der STU-Hover über dem Schiffbild in der Liste fehlt. |
| Mülleimer (Waren entsorgen) | `Action/RemoveWaste`, `View/ShowWasteMenu`, `waste.twig` | fehlt | — | In der Kolonie gibt es eine Müllverbrennung, am Schiff nicht. |
| Crewmanagement-Fenster (Slots, Positionen, Details, umbenennen, befördern) | `Action/AssignCrewSlot`, `RenameCrew`, `RenameCrewman`, `PromoteCrew`, `View/ShowCrewAssignmentManagement`, `ShowCrewmanDetails`, `html/spacecraft/crewAssignment*.twig` | teilweise | `spacecraft-crew.service.ts getAssignedCrew`, `ShipOperationsPanel.tsx` (Crewliste) | SWU zeigt die Crew nur als Liste. Es fehlen Zuweisung zu Positionen, Umbenennen, Ränge mit Beförderung und Expertise. `CONTEXT.md`: Crew-XP fehlt. |
| Regioninfo (Admin-Region des Feldes) | `View/ShowRegionInfo`, `html/ship/regioninfo.twig` | fehlt | `adminRegionKey` liegt in den LocalMap-Daten (`spacecraft.service.ts`) | Die Daten sind vorhanden, die Anzeige fehlt. **(unsicher)** |

### 2.2 Bewegung und Navigation

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Flug in 4 Richtungen und per Zielkoordinate, orthogonal | `Action/MoveShip`, `Lib/Movement/ShipMover.php`, `control_nav.twig` (B_MOVE_*) | vorhanden | `navigate`, `flyGalaxy`, `NavigationPanel.tsx`, `DirectionalControls.tsx` | — |
| Pre-Flight-Checks (Crew, EPS, Warpdrive, Antrieb aktivierbar, blockiert) | `Movement/Component/PreFlight/Condition/*` | teilweise | `assertSystemsForFlight`, `activateDriveForFlight`, `assertEnoughCrew` | „Blocked“ (Traktor, Netz) fehlt, weil Traktor und Netz fehlen. |
| Flugfolgen während des Flugs: Alarmstufe, Dock, Traktor, Reparatur- oder Umrüstabbruch, Takeover, Netz, Astro | `Movement/Component/Consequence/Flight/*` | teilweise | `navigate` (Astro-Abbruch via `resetFinishingForSpacecraft`) | Nur der Astro-Abbruch ist da. Abdocken, Traktor-Energie, Reparaturabbruch und Takeover-Abbruch fehlen. |
| Folgen nach dem Flug: Feldtyp-Effekte und Schaden, Deflektor, Anomalien, Traktor, Tracker | `Movement/Component/Consequence/PostFlight/*` | fehlt | `galaxy-field.entity.ts` hat `damage`/`effectFlags`, wird beim Flug nicht angewandt | Plan-Doku „Post-flight consequences“ ist als offen markiert (`docs/swu-spacecraft-implementation-plan.md`). Ein Deflektor-System existiert in SWU nicht. |
| Flugsignaturen (Spuren für Sektor- und Tachyon-Scan) | `Movement/Component/FlightSignatureCreator.php` | fehlt | `spacecraft-scan.service.ts` liefert `signatures: []` | Das Audit nennt als P3, dass zuerst ein echtes Signaturmodell gebraucht wird. |
| Hyperraumflug zwischen Systemen als Zeitflug (`IN_FLIGHT` + `arrivalAt`) | STU: Warp ist feldweiser Galaxieflug ohne Flugzeit | bewusst abweichend **(unsicher)** | `warp()`, `processMovement` | Weder ADR noch CONTEXT dokumentieren diese SWU-Mechanik. Eine Produktentscheidung, ob sie bleibt, steht aus (siehe Paket WP-NAV-3). |
| System betreten und verlassen | `Action/EnterStarSystem`, `LeaveStarSystem` | vorhanden | `enter-system`, `leave-system` | — |
| Wurmloch betreten und verlassen, Wurmlochrechte | `Action/EnterWormhole`, `LeaveWormhole`, `AddWormholeRestriction`, `DeleteWormholeRestriction`, `View/ShowWormholeControl`, `ShowWormholeRestrictions`, `Component/Ship/Wormhole/*` | fehlt | `starmap/entities/wormhole.entity.ts` (nur Weltdaten und Admin) | Wurmlöcher liegen in der Karte, sind aber nicht flugfähig. Die Allianz-Spec hält dazu einen Integrationsvertrag für Zugangsprivilegien fest (`.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`). |
| Transwarp (Langsprung mit Spule) | `Ship/Action/Transwarp`, `TranswarpCoilShipSystem.php`, `system/TRANSWARP_COIL.twig` | fehlt | — | Star-Wars-Pendant unklar. Die Hyperraumrouten der Starmap bieten sich an. NEEDS-DECISION. |
| Warpantrieb-Boost | `Action/WarpdriveBoost`, `WarpdriveBoosterShipSystem.php` | fehlt | — | — |
| Abfangen (Ziel aus dem Warp ziehen) | `Action/InterceptShip`, `Lib/Interaction/InterceptShipCore.php` | vorhanden | `hyperdrive-disruption.service.ts`, NBS-Aktion | STU fängt auch Flotten ab und löst eine Alarmreaktion aus. In SWU nur Einzelschiff. |
| Schiffsflug als Flotte | `Movement/FlightCompany*.php`, `ShipMover` | fehlt | — | Siehe 2.6 Flotten. |
| Kolonie landen und Shuttle starten | `Ship/Action/LandShuttle`, `Spacecraft/Action/StartShuttle`, `StoreShuttle`, `html/spacecraft/shuttleManagement.twig` | teilweise | `colony-orbit.service.ts transferShuttles`, `landShip`, `FieldContextPanel` (Landen) | Shuttles werden in SWU als Ware transferiert. Shuttles als eigenständige Schiffe starten oder aufnehmen (`START_SHUTTLE`/`STORE_SHUTTLE`, Shuttle-Rampe als System) fehlt. |

### 2.3 Systeme, Energie, Crew-Betrieb

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Systeme an und aus | `Action/ActivateSystem`, `DeactivateSystem`, `Component/Spacecraft/System/SpacecraftSystemManager.php` | vorhanden | `toggleSystem`, `ShipControlCenter.tsx` | Nur die 13 SWU-Systeme. Die STU-Typen in `Component/Spacecraft/System/Type/` sind weitgehend nicht abgebildet, z. B. Cloak, Tractor, Tachyon, Subspace, Matrix, Tracker, Bussard, Aggregation, Webemitter, Uplink, Troop Quarters, Beam Blocker, Construction Hub und Shuttle Ramp. |
| Startup und Shutdown (Standby) | `Lib/Auxiliary/SpacecraftStartup/Shutdown.php`, `Action/StandBy` | vorhanden | `PATCH :id/operating-mode`, `spacecraft-mode.util.ts` | — |
| Reaktor laden, Reaktorsplit, Auto-Übertrag, Ersatzbatterie entladen | `Action/LoadReactor`, `SplitReactorOutput`, `UnloadBattery`, `Station/Action/ToggleBatteryReload` | vorhanden | `spacecraft-engineering.service.ts`, `ReactorPanel.tsx` | „Batterie automatisch nachladen“ (`B_TOGGLE_BATT_RELOAD`) ist in STU ein Stationsschalter und fehlt, weil Stationen fehlen. |
| EPS-Transfer Schiff→Schiff | `Action/EpsTransfer`, `View/ShowEpsTransfer`, `showshipetransfer.twig` | fehlt | NBS `actions.energyTransfer: false` | Der Flag ist schon vorbereitet. |
| Warpkern-Ladungstransfer | `Action/TransferWarpcoreCharge`, `View/ShowWarpcoreChargeTransfer`, `WarpCoreTransferShipSystem.php` | fehlt | — | — |
| Torpedotyp wählen, Torpedos laden und entladen | `Action/SelectTorpedo`, `Lib/SpacecraftManagement/Manager/ManageTorpedo*.php` | vorhanden | `spacecraft-torpedo.service.ts`, `TorpedoPanel.tsx`, Orbitalmanagement | — |
| Brownout bzw. Systemabschaltung im Tick | `Tick/Spacecraft/Handler/EnergyConsumeHandler.php`, `SystemDeactivationHandler.php`, `EpsSystemCheckHandler.php` | teilweise | `spacecraft-resource-flow.service.ts handleBrownout` | Die UI-Mitteilung bei Abschaltung ist laut Plan-Doku offen. **(unsicher, ob inzwischen per SPACECRAFT_EVENT gelöst)** |
| Lebenserhaltung und Crew-Limit (Crew stirbt oder verlässt das Schiff) | `Tick/Spacecraft/Handler/LifeSupportCheckHandler.php`, `ManagerComponent/CrewLimitations.php` | teilweise | LIFE_SUPPORT-Systemschlüssel, `spacecraft-crew.service.ts` | Die Crew-Prüfung blockiert Aktionen. Crewverlust oder Desertion bei fehlender Lebenserhaltung oder über dem Limit fehlt. |
| Hülle senkt sich im Tick (unbemannt bzw. Wrack) | `ManagerComponent/LowerHull.php` | fehlt **(unsicher)** | — | — |
| Shuttlerampe, Crewtransport- und Torpedotransportmodul (Spezialmodule) | `GD/ship-building/stu-special-module-audit.md` | fehlt | — | Laut Audit nicht als baubare Items verdrahtet. |

### 2.4 Sensorik und Aufklärung

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| NBS-Liste (Schiffe, Stationen, Trümmerfelder auf dem Feld) | `html/spacecraft/nbsListBody.twig`, `nbsTrumfieldBody.twig`, `Lib/Ui/*` | teilweise | `getNearby`, `NearbySensorPanel.tsx` | Schiffe und Wracks sind da. Stationen und getarnte Kontakte fehlen. STU-Icons für NBS, LRS, Waffen, Tarnung und Torpedos je Eintrag sind nur teilweise vorhanden. |
| LSS-Karte mit Filtermodi | `Action/SetLSSMode`, `SetLSSModeBorder`, `View/ShowLSSFilter`, `lssFilter.twig` | vorhanden | `lss-mode`, `LssMap.tsx`, `SensorOperationsPanel.tsx` | — |
| Sektor-Scan | `View/ShowSectorScan`, `sectorScan.twig` | teilweise | `sector-scan`, `spacecraft-scan.service.ts` | Signaturen und Bojen sind leer (`signatures: []`, `buoys: []`). |
| Zielscan (fremdes Schiff) | `View/ShowScan`, `showshipscan.twig` | vorhanden | `nearby/:targetId/scan`, `TargetScanDialog.tsx` | — |
| Kolonie-Oberflächenscan | `View/ShowColonyScan`, `colonyscan.twig` | vorhanden | `colony-scan`, `ColonyScanDialog.tsx`, ADR-0002 | — |
| Astrometrie (Messpunkte, Finalisierung) | `Ship/Action/AstroMapping`, `View/ShowAstroEntry`, `Component/Ship/AstronomicalMappingStateEnum.php` | bewusst abweichend | `cartography-plan.service.ts`, ADR-0003 | Das Startfeld ist ausgeschlossen. Crew-XP fehlen (`CONTEXT.md`). |
| Tachyon-Scan (getarnte Schiffe aufdecken) | `Action/DoTachyonScan`, `TachyonScannerShipSystem.php` | fehlt | — | Braucht Tarnung. |
| Subraumanalyse (Flugspuren verfolgen) | `Action/DoSubspaceAnalysis`, `SubspaceSensorShipSystem.php`, `MatrixScannerShipSystem.php`, `system/subspaceScanner.twig` | fehlt | — | Braucht Flugsignaturen. |
| Tracker (Ziel markieren und verfolgen) | `Ship/Action/TrackShip`, `DeactivateTrackingDevice`, `AttackTrackedShip`, `TrackerShipSystem.php`, `Lib/Interaction/TrackerDeviceManager.php` | fehlt | — | — |
| Bojen setzen, lesen, aufnehmen | `Action/DropBuoy`, `TakeBuoy`, `View/ShowAnalyseBuoy`, `Ship/View/ShowBuoyList` | fehlt | — | — |
| Anomalie-Hinweis im Navigationsbereich | `control_nav.twig` (Anomalie-Icon), `Tick/.../AnomalyProcessing.php` | fehlt | — | Das Audit nennt dies als P3. |

### 2.5 Interaktion, Transfer, Andocken

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Warentransfer Schiff↔Kolonie | `Lib/Transfer/Strategy/CommodityTransferStrategy.php`, `html/transfer/*` | vorhanden | `transfer.service.ts`, `FieldContextPanel` (beamen), `CargoPanel.tsx` | — |
| Warentransfer Schiff↔Schiff | dito | vorhanden | `cargo/ship-transfer`, `TransferDialog.tsx` | Die Haltungsregeln sind umgesetzt (Spec `beziehungswirkungen`). |
| Crewtransfer Schiff↔Kolonie und Schiff↔Schiff | `TroopTransferStrategy.php`, `Lib/Crew/TroopTransferUtility.php` | vorhanden | `crew/load|unload`, `crew/ship-transfer` | — |
| Torpedotransfer | `TorpedoTransferStrategy.php` | vorhanden | `torpedoes/ship-transfer`, `TorpedoPanel.tsx` | — |
| Interaktions-Checks (Schild, Tarnung, Warp, Urlaub, NPC, Blockade, Ionensturm) | `Lib/Interaction/InteractionCheckType.php` | teilweise | `transfer.service.ts shipTransferBlockReason` | Schild, Warp, Feld und Haltung werden geprüft. Es fehlen Urlaubsmodus (`EXPECT_TARGET_NO_VACATION`), Tarnung, Traktor, Blockade und Ionensturm. Der Urlaubsmodus existiert in SWU (`auth/user.entity.ts`). |
| Traktorstrahl (aktivieren, entkommen, gezogenes Schiff andocken) | `Action/ActivateTractorBeam`, `DeactivateTractorBeam`, `Ship/Action/EscapeTractorBeam`, `Station/Action/DockTractoredShip`, `TractorBeamShipSystem.php` | fehlt | `GD/modules/tractor-beam.yaml` (Moduldaten), NBS `tractor: false` | Module sind in den Spieldaten, aber kein Laufzeitsystem. |
| Andocken und Abdocken an Station, Flotte andocken | `Ship/Action/DockShip`, `UndockShip`, `Station/Action/DockFleet`, `UndockStationShip`, `UndockAllShips`, `Component/Station/Dock/*` | fehlt | Migration `rename-spacecraft-docked-status-to-idle` | Status DOCKED wurde bewusst entfernt, bis Stationen kommen (Audit). |
| Handel am Handelsposten (Warenkonto) | `Action/TransferToAccount`, `TransferFromAccount`, `View/ShowTradeMenu*`, `Ship/Action/BuyTradeLicense` | fehlt | — | Gehört zum Bereich **Handel**. |
| Wrackbergung: Waren | Trümmerfeld (`nbsTrumfieldBody.twig`, `Destruction/Handler/TransformToTrumfield.php`) | vorhanden | `wrecks/:wreckId/recover-cargo`, `NearbySensorPanel` | Torpedos aus dem Wrack und das Verfallen des Wracks **(unsicher)**. |
| Rettungskapseln bergen, fremde Crew ablegen | `Action/SalvageEmergencyPods`, `DumpForeignCrewman`, `Ship/Action/SalvageCrew`, `Lib/Crew/LaunchEscapePods.php` | fehlt | — | Siehe 2.9. |
| Nachricht, Rundruf, Logbuch, Notruf | `Action/SendBroadcast`, `AddShipLog`, `EditSpacecraftLog`, `DeleteSpacecraftLog`, `StartEmergency`, `StopEmergency`, `View/ShowBroadcastResponse` | vorhanden | `spacecraft-communication.service.ts`, `CommunicationDrawer.tsx` | — |
| Ressourcen sammeln (Mining über Feld) | `Ship/Action/Mining/GatherResources.php`, `Component/Ship/Mining/*`, Zustand `GATHER_RESOURCES` | fehlt | — | — |
| Bussard-Kollektor und Aggregationssystem (Ressourcen sammeln bzw. umwandeln im Tick) | `BussardCollectorShipSystem.php`, `AggregationSystemShipSystem.php`, `Tick/Spacecraft/Handler/BussardCollectorHandler.php`, `AggregationSystemHandler.php`, `html/ship/bussardcollector.twig`, `aggregationsystem.twig` | fehlt | — | — |

### 2.6 Flotten und Schiffsliste

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Flotte erstellen, beitreten, verlassen, auflösen | `Ship/Action/CreateFleet`, `JoinFleet`, `LeaveFleet`, `DeleteFleet`, NBS `B_JOIN_FLEET_NBS` | teilweise | `fleets/create`, `fleets/:id/join`, `:id/leave-fleet` (nur Backend) | Es gibt keine Frontend-Nutzung. Zum Auflösen wird der Leader entfernt, eine eigene Aktion fehlt. |
| Flotte umbenennen, Leader wechseln, fixieren, ausblenden, Priorität, Sichtbarkeit | `RenameFleet`, `ChangeFleetFleader`, `ChangeFleetFixation`, `HideFleet`, `PriorizeFleet`, `ToggleFleetVisibility`, `ShowFleet` | fehlt | — | — |
| Flotten-Alarmstufe | `FleetAlertGreen`, `FleetAlertYellow`, `FleetAlertRed` | fehlt | — | — |
| Flottenflug (alle Schiffe ziehen mit) | `Movement/FlightCompany.php` | fehlt | — | — |
| Schiffsliste mit Flottengruppen, Einzelschiffen und Formular | `Ship/View/ShowShiplistFleet`, `ShowShiplistSingles`, `html/view/shiplist.twig`, `shiplistFleetform.twig` | fehlt | `FE/pages/spacecraft.tsx` (nur „Einzelschiffe“) | — |
| Schiffslisten-Spalten: Alarm-Icon, Ebene, x\|y mit Systemkoordinate, Hülle (Farbe), Schilde (aktiv, +Regeneration), EPS mit Zuwachs und Verbrauch, Hyperantrieb mit Zuwachs, Reaktorladung, Ersatzbatterie, Crew-Ampel, System-Icons (NBS, LRS, Waffen, Tarnung, Torpedos), Status-Icon, Andock-Icon, Lager-Hover | `html/shiplistmacros.twig` | teilweise | `FE/pages/spacecraft.tsx` | SWU zeigt Klasse, Name mit Alarmpunkt, x\|y, Hülle, Schilde, Energie und Crew. Es fehlen Ebene, Systemkoordinate, Hyperantrieb, Reaktor, Batterie, Crew-Ampel, System-Icons, Zustands-Icon und Lager-Hover. Das Audit nennt dies als P1. |
| Stationsliste | `html/view/stationList.twig` | fehlt | — | Braucht Stationen. |

### 2.7 Kampf

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Schiff angreifen (Energie- und Projektilphase, ein Zyklus) | `Action/AttackSpacecraft`, `Lib/Battle/SpacecraftAttackCycle.php`, `Weapon/*` | vorhanden | `combat.service.ts attack`, `combat.engine.ts` | Fehlende Interaktions-Checks siehe 2.5. |
| Kampfparteien: Flotte gegen Flotte und Mitverteidiger | `Lib/Battle/Party/*`, `AttackMatchup.php` | fehlt | — | SWU kämpft nur 1 gegen 1. Flottenmitglieder und alarmierte Schiffe am Feld schießen nicht mit. |
| Alarmreaktion (Gelb/Rot greift einfliegende Feinde an, Trojan-Horse-Hinweis) | `Lib/Battle/AlertDetection/*`, `AlertLevelBasedReaction.php`, `Flight/AlertStateConsequence.php` | fehlt | — | Alarmstufen schalten in SWU nur Systeme und haben keine taktische Wirkung. Die Haltung ist dafür vorhanden (`CONTEXT.md`). |
| Kolonie bzw. Gebäude angreifen | `Action/AttackBuilding`, `ShipAttack auf Orbit/Feld` | teilweise | `POST /combat/attack-colony` (nur Backend) | Ein UI-Einstieg fehlt, `FieldContextPanel` hat keinen Angriffsknopf. Die Feldwahl (Gebäude gezielt) ist unklar. **(unsicher)** |
| Getarntes Ziel angreifen, getracktes Ziel angreifen | `Ship/Action/AttackTrackedShip`, `control_*` „Getarntes Ziel angreifen“ | fehlt | — | Braucht Tarnung und Tracker. |
| Kolonieverteidigung und -blockade durch Schiffe | `Ship/Action/ColonyDefending`, `ColonyBlocking` | vorhanden | `colony-orbit.service.ts`, `ColoniesPage.tsx` | In STU direkt vom Schiff aus (`B_START_DEFENDING` im `control_*`), in SWU nur in der Kolonieansicht. Ein Schiffseinstieg fehlt (UI). |
| Kampfunfähigkeit, Ionen-Systemausfall | `EXPECT_SOURCE_ENABLED`, Damage-Lib | teilweise | `combat.engine.ts disableRandomSystem` | — |
| Schadensmodell (Hülle, Schild, Systeme, Schadensarten) | `Lib/Damage/*`, `Spacecraft/Lib/Damage/*` | teilweise | `combat.engine.ts applyDamage` | Nach Doku vorhanden. Die feinere STU-Systemschadensauswahl **(unsicher)**. |
| Tholianisches Netz (Netzemitter) | `Ship/Action/TholianWeb`, `WebEmitterShipSystem.php`, `TholianWebWeaponPhase.php` | fehlt | — | Ohne Star-Wars-Pendant, Kandidat für bewusst weglassen. NEEDS-DECISION. |

### 2.8 Entern und Übernahme

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Enterkommando (Truppen kämpfen gegen Crew) | `Action/BoardShip`, `Lib/CloseCombat/*`, `TroopQuartersShipSystem.php` | fehlt | NBS `boarding: false` | — |
| Übernahme unbemannter Schiffe (mehrere Runden) | `Action/StartTakeover`, `StopTakeover`, `Lib/Interaction/ShipTakeoverManager.php`, `Tick/.../FinishedTakeoverHandler.php` | fehlt | — | — |

### 2.9 Zerstörung und Folgen

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Trümmerfeld bzw. Wrack | `Destruction/Handler/TransformToTrumfield.php`, `LeaveIntactModules.php` | teilweise | `spacecraft-destruction.service.ts finalizeInManager` | Das Wrack trägt Fracht und Torpedos. Intakte Module bleiben nicht erhalten. |
| Crew-Evakuierung, Rettungskapseln | `Handler/CrewEvacuation.php`, `Lib/Crew/LaunchEscapePods.php`, `Tick/.../EscapePodHandling.php` | fehlt | — | Die zugewiesene Crew geht verloren. **(unsicher: was mit `crew_assignment` passiert)** |
| Prestige für Zerstörung, Historie | `Handler/PrestigeGain.php`, `HistoryEntryCreation.php` | teilweise | `GameEventService.recordSpacecraft` | Ein globales Ereignis ist da. Prestige für den Sieger fehlt. **(unsicher)** |
| Traktor, Tracker und Takeover bereinigen | `Handler/ClearTractor*`, `ResetTrackerDevices`, `CancelTakeover` | fehlt | — | Entfällt, solange die Systeme fehlen. |

### 2.10 Stationen

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Konstrukt bauen (Workbees vom Schiff) | `Ship/Action/BuildConstruction`, `ConstructionHubShipSystem.php` | fehlt | — | — |
| Station ausbauen (Rumpfwahl, Module, Ortsbeschränkung, Limits) | `Station/Action/BuildStation`, `View/ShowStationCosts`, `stationCost.twig`, `Component/Station/StationLocationEnum.php`, `StationUtility.php`, `Tick/.../StationConstructionHandler.php` | fehlt | — | Ortsbeschränkung: überall, über, in oder außerhalb eines Systems. |
| Stationsansicht (Info, Schiffsliste, Sensorscan, Systemsensorscan) | `Station/View/ShowStation`, `ShowStationInfo`, `ShowStationShiplist`, `ShowSensorScan`, `ShowSystemSensorScan`, `html/station/*` | fehlt | — | — |
| Dockingrechte (Spieler, Allianz, Fraktion; Verbot vor Erlaubnis) | `Station/Action/AddDockPrivilege`, `DeleteDockPrivilege`, `View/ShowDockingPrivileges`, `ShowDockingControl`, `Component/Station/Dock/DockPrivilegeUtility.php` | fehlt | — | Ein Integrationsvertrag existiert in der Allianz-Spec. |
| Dock-PM automatisch gelesen | `Station/Action/ToggleDockPmAutoRead` | fehlt | — | — |
| Stationswerft (Schiffe bauen) | `Station/Action/BuildShipyardShip`, `html/station/shipyardOptions.twig` | fehlt | — | In SWU baut nur die Kolonie-Werft. |
| Stationsreparatur von Schiffen (Queue, abbrechen, reaktivieren) | `Station/Action/RepairShip`, `CancelShipRepair`, `ReactivateShipRepair`, `View/ShowShipRepair` | fehlt | Kolonie-Werft hat das Pendant (`colony-shipyard.service.ts`) | — |
| Station repariert sich selbst, passive Reparatur | `Station/Action/StationRepair`, `Tick/.../StationPassiveRepairHandler.php` | fehlt | — | — |
| Schiffsmanagement an der Station (Crew, Batterie, Reaktor, Torpedos) | `Station/Action/ManageShips`, `View/ShowShipManagement`, `Lib/SpacecraftManagement/*` | fehlt | Kolonie-Pendant: Orbitalmanagement | Die Manager-Logik ließe sich vom Orbitalmanagement wiederverwenden. |
| Shuttle-Management an der Station | `Station/Action/ManageShuttles`, `View/ShowShuttleManagement` | fehlt | — | — |
| Demontage (Scrapping) | `Station/Action/Scrapping`, `View/ShowScrapping`, Zustand `UNDER_SCRAPPING` | fehlt | — | Für Schiffe gibt es die Kolonie-Demontage. |
| Ressourcenumwandlung | `Station/Action/TransformResources` | fehlt | — | — |
| Allianzdepot | `Station/Action/AddToAlliance`, `DeleteFromAlliance` | fehlt | Integrationsvertrag `allianz-infrastruktur-spec.md` | `CONTEXT.md` definiert **Allianzdepot**. |
| Stationsrollen (Depot klein/groß, Werft, Sensor, Außenposten, Basis) | `Component/Spacecraft/SpacecraftRumpRoleEnum.php` | fehlt | `GD/ship-building/ship-classes.yaml` (keine Stationsklassen) | Braucht SWU-Namen und eine Rumpfauswahl. |

### 2.11 Modulbildschirm und Umrüstung (Schnittstelle zum Kolonie-Bereich)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Modulbildschirm mit Gradientwerten und Addons | `Lib/ModuleScreen/*`, `Lib/ModuleRumpWrapper/*`, `html/ship/construction/moduleScreen.twig` | vorhanden | `PanelShipyard.tsx` (Kolonie-Inventur) | Siehe `inventory/colony.md`. |
| Umrüstung (Retrofit) mit Abbruch beim Flug | `Component/Ship/Retrofit/CancelRetrofit.php`, `Flight/RetrofitConsequence.php` | teilweise | `retrofit-queue` | Ob Flug die Umrüstung bzw. Reparatur abbricht, ist ungeklärt **(unsicher)**. |
| Freie Modul-Installation am Schiff (`modules/install`, `level-up`, `DELETE`) | kein STU-Pendant | bewusst abweichend? **(unsicher)** | `spacecraft.controller.ts` Z.629–655 | Keine Frontend-Nutzung. Wirkt wie eine Altlast, die die Werft-Regeln umgeht. Prüfen, ob sie entfernt oder admin-only werden soll (WP-CLEAN-1). |

### 2.12 Sonstiges, Events, NPC

| Feature | STU-Quelle | SWU-Stand | Notiz |
|---|---|---|---|
| Adventstür, Osterei | `Action/OpenAdventDoor`, `OpenEasterEgg` | fehlt | Saisonevent. Kandidat für bewusst weglassen. |
| RPG-Modul unsichtbar | `Action/SetRpgModuleInvisibility`, `RPGShipSystem.php` | fehlt | Nur für Rollenspiel. Niedrige Priorität. |
| Falsche Warpsignatur | `Ship/Action/FakeWarpSignature` | fehlt | Braucht Signaturen. |
| Uplink (Fremdcrew auf eigenem Schiff) | `UplinkShipSystem.php` | fehlt | — |
| Beam-Blocker | `BeamBlockerShipSystem.php` | fehlt | — |
| Kolonisierung | `Ship/Action/Colonize`, `View/ShowColonization` | vorhanden | `BE/colonization/*`, `ColonizationDialog.tsx` |

---

## 3. Vorgeschlagene Arbeitspakete

Konventionen: Größe **S** passt bequem in einen Agentendurchlauf, **M** ist ein voller Durchlauf. Größere Themen sind in Pakete der Größe M aufgeteilt. „Abh.“ nennt Abhängigkeiten, auch zu anderen Bereichen. Wo eine Produktentscheidung fehlt, steht **NEEDS-DECISION** mit der offenen Frage.

### A. Schiffsliste und Schiffsdetail-UI

**WP-UI-1 Schiffsliste auf STU-Dichte bringen (M)**
Die Tabelle in `FE/pages/spacecraft.tsx` erhält folgende Spalten:

- Alarm-Icon (`alertX_1.png`)
- Ebenen-Icon
- x\|y plus Systemkoordinate in Klammern
- Hüllenfarbe
- Schilde mit Aktiv-Stil und +Regeneration
- EPS mit Zuwachs und (Verbrauch/Reaktor)
- Hyperantrieb mit Zuwachs
- Reaktorladung und Ersatzbatterie
- Crew-Ampel
- System-Icons für NBS, LRS, Waffen und Torpedos
- Lager-Hover am Schiffbild

Die Werte kommen per DTO-Erweiterung aus `GET /spacecraft` (`findAllByUser`); sie sind in `energy-flow` und `runtimeSystems` vorhanden.
STU: `html/shiplistmacros.twig`, `html/view/shiplist.twig`, `Ship/View/ShowShiplistSingles`.
Abh.: keine. Entscheidung: nein. Signaturen bewusst nicht anzeigen (Audit).

**WP-UI-2 Schiffskopf-Feinabgleich (S)**
Die Info-Tooltips und Zusatzwerte aus `spacecraft.twig` übernehmen: Schildregeneration je Tick, EPS-Zuwachs (Verbrauch/Reaktor) mit Klick auf die EPS-Nutzung, Crew (min/max). Die Kartenabstände auf dem Desktop verdichten (Audit P1).
STU: `html/spacecraft/spacecraft.twig` Z.40–100.
Abh.: keine.

**WP-UI-3 Kolonie-Aktionen am Schiff (S)**
Im `FieldContextPanel` „Kolonie verteidigen“ und „Kolonie blockieren“ samt Beenden-Knopf ergänzen, wie `B_START_DEFENDING`/`B_START_BLOCKING` in `control_mid.twig`. Dazu ein Einstieg „Kolonie angreifen“ für den vorhandenen Endpunkt `/combat/attack-colony`.
STU: `html/spacecraft/control/control_mid.twig`, `Ship/Action/ColonyDefending`, `ColonyBlocking`, `Spacecraft/Action/AttackBuilding`.
Abh.: keine (Backend vorhanden).
**NEEDS-DECISION:** Soll der Kolonieangriff wie in STU auf ein gewähltes Gebäude bzw. Feld zielen (`AttackBuilding`) oder beim heutigen Ganz-Kolonie-Angriff bleiben?

**WP-UI-4 Regioninfo und Kampflog-Link (S)**
Regioninfo-Dialog aus `adminRegionKey`. „Letzten Kampfbericht anzeigen“ am Schiff, dafür den letzten Bericht persistieren oder aus dem Ereignis holen.
STU: `Spacecraft/View/ShowRegionInfo`, `regioninfo.twig`, `spacecraft.twig` Z.10.
Abh.: keine. **(unsicher, ob gewünscht)**

### B. Flotten

**WP-FLEET-1 Flotten-UI und Verwaltung (M)**
Die Schiffsliste in Flottengruppen und Einzelschiffe aufteilen, wie `shiplistFleetform.twig`. Dazu: Flotte erstellen vom Schiff, Beitritt aus der NBS-Liste (`B_JOIN_FLEET_NBS`), Flotte verlassen, auflösen, umbenennen und Leader wechseln. Backend-Ergänzungen: delete, rename, change-leader. Das Flottenstatus-Icon kommt in den Schiffskopf.
STU: `Ship/Action/{CreateFleet,JoinFleet,LeaveFleet,DeleteFleet,RenameFleet,ChangeFleetFleader}`, `Ship/View/ShowShiplistFleet`, `html/shiplistFleetform.twig`.
Abh.: WP-UI-1 empfohlen (gemeinsame Tabelle).

**WP-FLEET-2 Flottenflug und Flotten-Alarmstufe (M)**
Bewegt sich der Leader, ziehen alle Flottenschiffe auf demselben Feld mit, mit Einzelprüfung von Crew, EPS und Antrieb. Wer nicht mitkann, wird abgehängt. Das entspricht `FlightCompany` und `ShipMover`. Dazu die Flotten-Alarmstufe Grün/Gelb/Rot und die Fixierung (`ChangeFleetFixation`).
STU: `Spacecraft/Lib/Movement/FlightCompany*.php`, `ShipMover.php`, `Ship/Action/FleetAlert*`, `ChangeFleetFixation`.
Abh.: WP-FLEET-1.

**WP-FLEET-3 Flottenpflege (S)**
Ausblenden, Priorisieren (Reihenfolge) und Sichtbarkeit umschalten.
STU: `HideFleet`, `PriorizeFleet`, `ToggleFleetVisibility`, `ShowFleet`.
Abh.: WP-FLEET-1.

### C. Navigation und Flugfolgen

**WP-NAV-1 Feldeffekte und Schaden beim Flug (M)**
Nach dem Flug `damage`/`effectFlags` des Zielfeldes anwenden: Hüllen- bzw. Systemschaden und Effekte wie Ionensturm oder Nebel, die Schilde oder Sensoren stören. Ein Deflektor-Äquivalent prüfen.
STU: `Movement/Component/Consequence/PostFlight/{FieldTypeEffectConsequence,DeflectorConsequence}.php`, `Lib/Damage/*`.
Abh.: keine.
**NEEDS-DECISION:** Bekommt SWU ein eigenes Deflektor-System, oder übernimmt das Schildsystem die Deflektorrolle?

**WP-NAV-2 Flugsignaturen und Sektor-Scan-Signaturen (M)**
Beim Verlassen eines Feldes eine Flugsignatur speichern (Schiff, Rumpf, Richtung, Zeit, Tarnung). Daraus die `signatures` und `fadedSignatures` im Sektor-Scan befüllen, ebenso den Kolonie-Sektor-Scan aus dem Kolonie-Inventar.
STU: `Movement/Component/FlightSignatureCreator.php`, `Component/Ship/FlightSignatureVisibilityEnum.php`, `html/spacecraft/sectorScan.twig`.
Abh.: keine. Grundlage für WP-SENS-2, WP-CLOAK-2 und Falsche Warpsignatur.

**WP-NAV-3 Hyperraumflug-Modell klären (S, Doku/ADR)**
SWU nutzt für den Sprung zwischen Systemen einen Zeitflug (`IN_FLIGHT`, `arrivalAt`, Cooldown 3). STU kennt keinen Zeitflug. Die Entscheidung als ADR dokumentieren und Fluganzeige bzw. Abbruch daran ausrichten.
STU: `Spacecraft/Action/MoveShip`, `Lib/Movement/ShipMover.php`.
Abh.: keine.
**NEEDS-DECISION:** Bleibt der zeitbasierte Hyperraumsprung als bewusste SWU-Abweichung, oder wird er auf den feldweisen STU-Galaxieflug zurückgeführt? Und wie verhält er sich zu Transwarp (WP-NAV-5) und Hyperraumrouten?

**WP-NAV-4 Wurmlöcher befliegbar machen (M)**
Wurmloch betreten und verlassen, mit Ausgang (auch zufällig) nach `wormhole.entity.ts`. Danach die Wurmlochrechte nach dem Integrationsvertrag für Zugangsprivilegien.
STU: `Spacecraft/Action/{EnterWormhole,LeaveWormhole,AddWormholeRestriction,DeleteWormholeRestriction}`, `View/ShowWormholeControl`, `ShowWormholeRestrictions`, `Component/Ship/Wormhole/*`.
Abh.: Starmap (Wurmloch-Daten vorhanden). Die Rechte hängen am Allianz-Integrationsvertrag.
**NEEDS-DECISION:** Sind spielergesteuerte Wurmlochrechte in STU an eine Station am Wurmloch gebunden? **(unsicher)** Gibt es in SWU Wurmlöcher überhaupt als Spielmechanik?

**WP-NAV-5 Transwarp und Warpantrieb-Boost (S–M)**
Spezialsysteme für Langsprung bzw. Boost.
STU: `Ship/Action/Transwarp`, `Spacecraft/Action/WarpdriveBoost`, `TranswarpCoilShipSystem.php`, `WarpdriveBoosterShipSystem.php`.
Abh.: WP-NAV-3, Spezialmodul-Fabrikation (Kolonie-Bereich).
**NEEDS-DECISION:** Gibt es ein Star-Wars-Pendant, etwa Hyperraumrouten-Sprung, oder werden beide Systeme bewusst weggelassen?

### D. Traktorstrahl, Tarnung, Sensorik

**WP-TRACT-1 Traktorstrahl-Kern (M)**
Laufzeitsystem `TRACTOR_BEAM` aus den vorhandenen Moduldaten (`GD/modules/tractor-beam.yaml`). Aktivieren auf ein Ziel am Feld, Deaktivieren, Flug mit gezogenem Schiff (Zusatzkosten), Entkommen (`EscapeTractorBeam`) und Interaktions-Checks (`EXPECT_SOURCE_UNTRACTORED`). NBS-Flag `tractor`.
STU: `Spacecraft/Action/{ActivateTractorBeam,DeactivateTractorBeam}`, `Ship/Action/EscapeTractorBeam`, `TractorBeamShipSystem.php`, `Movement/Component/Consequence/Flight/TractorConsequence.php`, `PostFlight/PostFlightTractorConsequence.php`.
Abh.: keine. Andocken gezogener Schiffe folgt in WP-STAT-3.
**NEEDS-DECISION:** Dürfen fremde bzw. feindliche Schiffe gezogen werden, und welche Haltung ist dafür nötig? STU erlaubt es mit Schildprüfung.

**WP-CLOAK-1 Tarnvorrichtung (M)**
Laufzeitsystem `CLOAK` aus dem vorhandenen Spezialmodul „Tarnvorrichtung“ (`GD/modules/special.yaml`). Getarnte Schiffe erscheinen nicht in NBS, LSS, Sternkarte oder Sichtbarkeitsdienst. Tarnung schließt Schilde und Waffen aus. Interaktions-Checks. ADR-0003 erwähnt bereits, dass Tarnung das Astrometrie-Labor deaktiviert.
STU: `CloakShipSystem.php`, `InteractionCheckType` (`UNCLOAKED`), `html/shiplistmacros.twig` (Tarn-Icon).
Abh.: `starmap-visibility.service.ts` (Allianz-Infrastruktur).
**NEEDS-DECISION:** Wer darf tarnen? Nach Fraktion (Imperium oder beide) bzw. nach Klasse?

**WP-CLOAK-2 Tachyon-Scan und Angriff auf getarnte Ziele (S–M)**
Tachyon-Scanner deckt getarnte Schiffe am oder um das Feld auf, `fadedSignatures.cloaked`. „Getarntes Ziel angreifen“.
STU: `Spacecraft/Action/DoTachyonScan`, `TachyonScannerShipSystem.php`.
Abh.: WP-CLOAK-1, WP-NAV-2.

**WP-SENS-1 Bojen (S)**
Boje setzen (mit Text), lesen bzw. analysieren, aufnehmen. Anzeige im Sektor-Scan (`buoys`).
STU: `Spacecraft/Action/{DropBuoy,TakeBuoy}`, `View/ShowAnalyseBuoy`, `Ship/View/ShowBuoyList`, `html/ship/analysebuoy.twig`.
Abh.: keine.

**WP-SENS-2 Subraumanalyse und Tracker (M)**
Subraum- bzw. Matrixsensor verfolgt Flugsignaturen. Tracker markiert ein Ziel und meldet dessen Position im Tick. Dazu „getracktes Ziel angreifen“.
STU: `Spacecraft/Action/DoSubspaceAnalysis`, `Ship/Action/{TrackShip,DeactivateTrackingDevice,AttackTrackedShip}`, `SubspaceSensorShipSystem.php`, `TrackerShipSystem.php`, `Tick/Spacecraft/Handler/TrackerDeviceHandler.php`.
Abh.: WP-NAV-2, Spezialmodul-Fabrikation.

**WP-SENS-3 Anomalien (L → aufteilen)**
Anomalieerzeugung und -verarbeitung im Tick, Hinweis im Navigationsbereich, Effekte beim Flug.
STU: `Tick/Spacecraft/ManagerComponent/{AnomalyCreationCheck,AnomalyProcessing}.php`, `PostFlight/AnomalyConsequence.php`, `html/anomaly/*`.
Abh.: WP-NAV-1. Gehört vermutlich teilweise zum Bereich **Starmap/Tick**.
**NEEDS-DECISION:** Welche Anomalietypen soll SWU haben?

### E. Energie, Transfer, Wartung

**WP-ENG-1 EPS-Transfer Schiff→Schiff (S)**
Energie an ein Schiff am selben Feld übertragen, mit Haltungsprüfung wie beim Warentransfer. NBS-Flag `energyTransfer`.
STU: `Spacecraft/Action/EpsTransfer`, `View/ShowEpsTransfer`, `html/ship/showshipetransfer.twig`.
Abh.: keine.

**WP-ENG-2 Interaktions-Checks vervollständigen (S)**
Eine zentrale Prüfung für alle Feld-Interaktionen: Transfer, Angriff, Scan, Abfangen, Kommunikation, Bergung. Ergänzt werden Ziel im Urlaubsmodus, Quelle oder Ziel kampfunfähig und blockierte Kolonie. Traktor, Tarnung und Ionensturm kommen hinzu, sobald die Systeme existieren.
STU: `Lib/Interaction/{InteractionCheckType,InteractionCheckerBuilderFactory}.php`, `Lib/Interaction/Member/*`.
Abh.: keine. Erweiterbar durch WP-TRACT-1 und WP-CLOAK-1.

**WP-ENG-3 Eigenreparatur am Schiff (M)**
Reparaturoptionen-Dialog: ein beschädigtes System wählen, Ersatzteile (Commodity 10001 existiert) bzw. Systemkomponenten verbrauchen, Erfolgschance, Zustand `REPAIR_ACTIVE`. Gesperrt während Astro-Finalisierung oder Flug. Die heutige passive 1-%-Reparatur je Tick gegen STU (`REPAIR_PASSIVE`, `RepairActions.php`) prüfen.
STU: `Spacecraft/Action/Selfrepair`, `View/ShowRepairOptions`, `Component/Spacecraft/Repair/*`, `Tick/Spacecraft/ManagerComponent/RepairActions.php`, `html/ship/repairoptions.twig`.
Abh.: keine.
**NEEDS-DECISION:** Soll die heutige passive Modulreparatur (1 % je Tick überall) bleiben? STU repariert passiv nur unter Bedingungen.

**WP-ENG-4 Schiffsmülleimer (S)**
Waren aus dem Schiffslager entsorgen.
STU: `Spacecraft/Action/RemoveWaste`, `View/ShowWasteMenu`, `html/spacecraft/waste.twig`.
Abh.: keine.

**WP-ENG-5 Warpkern-Ladungstransfer (S)**
STU: `Spacecraft/Action/TransferWarpcoreCharge`, `View/ShowWarpcoreChargeTransfer`, `WarpCoreTransferShipSystem.php`, `html/spacecraft/warpcoreChargeTransfer.twig`.
Abh.: Spezialmodul-Fabrikation. Niedrige Priorität.

**WP-ENG-6 Brownout- und Crew-Folgen im Tick (S–M)**
Lebenserhaltung: bei Ausfall oder Überbelegung verlässt bzw. verliert das Schiff Crew. Hüllenverfall bei unbemannten Schiffen. Abschaltmeldungen sichtbar machen.
STU: `Tick/Spacecraft/Handler/{LifeSupportCheckHandler,SystemDeactivationHandler,EpsSystemCheckHandler}.php`, `ManagerComponent/{CrewLimitations,LowerHull}.php`.
Abh.: keine.

### F. Ressourcen sammeln

**WP-RES-1 Mining (S–M)**
Ressourcen am Feld bzw. Asteroiden sammeln, Zustand `GATHER_RESOURCES`, Abbruch beim Flug.
STU: `Ship/Action/Mining/GatherResources.php`, `Component/Ship/Mining/*`.
Abh.: Feld-Ressourcendaten (Starmap).
**NEEDS-DECISION:** Welche Felder bzw. Waren sind abbaubar? Ist Mining in SWU gewollt?

**WP-RES-2 Bussard-Kollektor und Aggregationssystem (M)**
Systemeinstellungsfenster, Tick-Handler.
STU: `BussardCollectorShipSystem.php`, `AggregationSystemShipSystem.php`, `Tick/Spacecraft/Handler/{BussardCollectorHandler,AggregationSystemHandler}.php`, `View/ShowSystemSettings/*`, `html/ship/{bussardcollector,aggregationsystem}.twig`.
Abh.: Spezialmodul-Fabrikation (Kolonie-Bereich), WP-RES-1 optional.

### G. Kampf

**WP-COMBAT-1 Alarmreaktion beim Einflug (M)**
Fliegt ein Schiff auf ein Feld, auf dem Schiffe mit Alarmstufe Gelb oder Rot stehen und die Haltung **Feind** ist (bei Rot auch Neutral, nach STU-Regel), greifen diese automatisch an. Alarmstufe Gelb ohne Tarnung erhält einen Trojan-Horse-Hinweis.
STU: `Spacecraft/Lib/Battle/AlertDetection/*`, `AlertLevelBasedReaction.php`, `Movement/Component/Consequence/Flight/AlertStateConsequence.php`.
Abh.: WP-COMBAT-2 empfohlen. Haltungsdienst (Allianz, vorhanden).

**WP-COMBAT-2 Mehrparteienkampf (Flotte und Mitverteidiger) (M)**
Angreifer und Verteidiger kämpfen als Parteien: Flotte des Angreifers und Flotte bzw. alarmierte Schiffe des Verteidigers am Feld. Der Kampfbericht wird für mehrere Schiffe erweitert.
STU: `Lib/Battle/Party/*`, `AttackMatchup.php`, `SpacecraftAttackCycle.php`.
Abh.: WP-FLEET-1.

**WP-COMBAT-3 Zerstörungsfolgen (S–M)**
Prestige für die Zerstörung, intakte Module ins Trümmerfeld, Historieneintrag, Crew-Evakuierung (Basis für WP-CREW-3).
STU: `Spacecraft/Lib/Destruction/Handler/{PrestigeGain,LeaveIntactModules,HistoryEntryCreation,CrewEvacuation}.php`.
Abh.: Prestige-Modul (vorhanden).

### H. Crew

**WP-CREW-1 Crewmanagement am Schiff (M)**
Crew-Fenster mit Positionen bzw. Slots (`CrewAssignment.slot` existiert), Zuweisung, Crewman-Details, Umbenennen.
STU: `Spacecraft/Action/{AssignCrewSlot,RenameCrew,RenameCrewman}`, `View/{ShowCrewAssignmentManagement,ShowCrewmanDetails,ShowRenameCrew}`, `html/spacecraft/crewAssignment*.twig`.
Abh.: Crew-Modell im Kolonie-Bereich (`colony/entities/crew*.ts`).

**WP-CREW-2 Ränge, Expertise und Beförderung (M)**
Crew-Erfahrung bzw. Expertise, Ränge mit Limits, Beförderung. Damit schließt sich auch die in `CONTEXT.md` genannte Lücke bei Crew-XP für Messpunkte.
STU: `Spacecraft/Action/PromoteCrew`, `Orm` `UserCrewRank`, `Component/Spacecraft/Crew/*`.
Abh.: WP-CREW-1.
**NEEDS-DECISION:** Ränge und Expertise übernehmen oder eine vereinfachte Variante?

**WP-CREW-3 Rettungskapseln (M)**
Bei Zerstörung oder Selbstzerstörung startet die Crew in Rettungskapseln. Fremde können sie bergen (`SalvageEmergencyPods`), der Besitzer findet sie wieder („Ort verschollener Crew“ aus dem Kolonie-Inventar). Dazu fremde Crew ablegen.
STU: `Spacecraft/Lib/Crew/LaunchEscapePods.php`, `Spacecraft/Action/{SalvageEmergencyPods,DumpForeignCrewman}`, `Ship/Action/SalvageCrew`, `Tick/.../EscapePodHandling.php`.
Abh.: WP-COMBAT-3.

**WP-CREW-4 Entern und Übernahme (L → 2× M)**
(a) Enterkommando mit Truppenkampf (`BoardShip`, `CloseCombatUtil`, Truppenquartiere).
(b) Übernahme unbemannter Schiffe über mehrere Runden (`StartTakeover`, `StopTakeover`, `ShipTakeoverManager`, `FinishedTakeoverHandler`), mit Abbruch bei Flug.
Abh.: WP-CREW-1, WP-ENG-2.
**NEEDS-DECISION:** Soll Entern bzw. Übernahme in SWU spielbar sein, auch fraktionsübergreifend?

### I. Stationen (großer Block, aufgeteilt)

**WP-STAT-0 Stationsmodell und Produktentscheidung (S, Doku/ADR)**
Klären, ob Stationen ein `Spacecraft`-Typ werden (STU: `SpacecraftTypeEnum` Ship/Station) oder eine eigene Entity. Ebenso Stationsrollen mit SWU-Namen, Ortsregeln, Limits und den Bezug zu den Allianz-Integrationsverträgen (Depot, Dockrechte).
STU: `Component/Spacecraft/{SpacecraftTypeEnum,SpacecraftRumpRoleEnum}.php`, `Component/Station/*`, `Orm/Entity/Station*`.
Abh.: `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md` (Integrationsverträge).
**NEEDS-DECISION:** Will SWU spielereigene Stationen? Welche Rollen (Depot, Werft, Sensor, Außenposten, Basis) und welche Star-Wars-Namen?

**WP-STAT-1 Konstrukt und Stationsbau (M)**
Vom Schiff ein Konstrukt mit Workbees bzw. Shuttles errichten. Ausbau zur Station: Rumpfwahl, Pflichtmodule im Lager, Bau über Ticks (`UNDER_CONSTRUCTION`). Konstrukt entfernen.
STU: `Ship/Action/BuildConstruction`, `Station/Action/BuildStation`, `View/ShowStationCosts`, `Tick/Spacecraft/Handler/StationConstructionHandler.php`, `ConstructionHubShipSystem.php`.
Abh.: WP-STAT-0.

**WP-STAT-2 Stationsansicht und -liste (M)**
Detailansicht wie beim Schiff (Kopf, Lager, Module, NBS), Stationsliste, Stationsinfo, Sensorscan und Systemsensorscan.
STU: `Station/View/{ShowStation,ShowStationInfo,ShowStationShiplist,ShowSensorScan,ShowSystemSensorScan}`, `html/station/*`, `html/view/stationList.twig`.
Abh.: WP-STAT-1.

**WP-STAT-3 Andocken und Dockingrechte (M)**
Andocken bzw. Abdocken von Schiffen, Flotten und gezogenen Schiffen. Alle abdocken. Dockingrechte für Spieler, Allianz und Fraktion, wobei ein Verbot vor einer Erlaubnis gilt (Integrationsvertrag). Dock-PM automatisch lesen. Abdocken beim Flug. Andock-Icon in der Schiffsliste.
STU: `Ship/Action/{DockShip,UndockShip}`, `Station/Action/{DockFleet,DockTractoredShip,UndockStationShip,UndockAllShips,AddDockPrivilege,DeleteDockPrivilege,ToggleDockPmAutoRead}`, `Component/Station/Dock/*`, `Flight/DockConsequence.php`.
Abh.: WP-STAT-1. WP-TRACT-1 für gezogene Schiffe.

**WP-STAT-4 Stationsdienste: Schiffsmanagement, Reparatur, Batterie (M)**
Schiffsmanagement für angedockte Schiffe, Logik aus dem Orbitalmanagement bzw. `Lib/SpacecraftManagement` wiederverwenden. Schiffsreparatur-Queue (abbrechen, reaktivieren). Stationsselbstreparatur und passive Reparatur. Batterie-Nachladen-Schalter.
STU: `Station/Action/{ManageShips,ManageShuttles,RepairShip,CancelShipRepair,ReactivateShipRepair,StationRepair,ToggleBatteryReload}`, `Lib/SpacecraftManagement/*`, `Tick/.../StationPassiveRepairHandler.php`.
Abh.: WP-STAT-3.

**WP-STAT-5 Stationswerft (M)**
Schiffe an einer Werftstation bauen, mit Bauplan und Modulbildschirm aus der Kolonie-Werft.
STU: `Station/Action/BuildShipyardShip`, `html/station/shipyardOptions.twig`.
Abh.: WP-STAT-2, Kolonie-Werft (vorhanden).

**WP-STAT-6 Demontage, Ressourcenumwandlung, Allianzdepot (M)**
Station abwracken (`UNDER_SCRAPPING`), Ressourcen umwandeln, Station als Allianzdepot zuordnen bzw. lösen (Integrationsvertrag).
STU: `Station/Action/{Scrapping,TransformResources,AddToAlliance,DeleteFromAlliance}`, `View/ShowScrapping`.
Abh.: WP-STAT-2, Allianz-Spec.

### J. Shuttles

**WP-SHUT-1 Shuttles als Schiffe starten und aufnehmen (M)**
Shuttlerampe als System. Shuttle aus dem Lager als eigenständiges Schiff starten, Shuttle am Feld aufnehmen, Shuttle in der Rampe landen. Dazu die fehlenden Spezialmodule (Shuttlerampe 19010, Crewtransport 19005, Torpedotransport 19009) als Fabrikationsitems.
STU: `Spacecraft/Action/{StartShuttle,StoreShuttle}`, `Ship/Action/LandShuttle`, `ShuttleRampShipSystem.php`, `html/spacecraft/shuttleManagement.twig`, `GD/ship-building/stu-special-module-audit.md`.
Abh.: Spezialmodul-Fabrikation (Kolonie-Bereich).
**NEEDS-DECISION:** Bleiben Shuttles reine Lagerware (heutiges SWU) oder werden sie startbare Schiffe?

### K. Aufräumen und Weglassen

**WP-CLEAN-1 Freie Modulinstallation am Schiff prüfen (S)**
`POST :id/modules/install`, `level-up` und `DELETE :id/modules/:moduleId` umgehen die Werft- und Umrüstregeln und werden vom Frontend nicht genutzt. Entfernen oder auf Admin beschränken.
Abh.: keine.
**NEEDS-DECISION:** Bestätigen, dass Module ausschließlich über Werft bzw. Umrüstung geändert werden.

**WP-CLEAN-2 Bewusst weggelassene STU-Features dokumentieren (S, Doku)**
Kandidaten: tholianisches Netz, Adventstür und Osterei, RPG-Modul, Uplink, Beam-Blocker, Falsche Warpsignatur, Handelslizenz am Schiff (sofern nicht im Handelsbereich).
**NEEDS-DECISION:** Welche davon bekommen ein Star-Wars-Pendant, welche werden weggelassen?

### Empfohlene Reihenfolge

1. Schnelle Gewinne ohne Entscheidungsbedarf: WP-UI-1, WP-UI-2, WP-ENG-1, WP-ENG-2, WP-ENG-4, WP-SENS-1, WP-FLEET-1
2. Kern-Taktik: WP-FLEET-2, WP-TRACT-1, WP-NAV-2, WP-COMBAT-3, WP-COMBAT-2, WP-COMBAT-1
3. Nach Entscheidungen: WP-NAV-3, WP-CLOAK-1, WP-CLOAK-2, WP-ENG-3, WP-CREW-1, WP-CREW-2, WP-CREW-3
4. Großer Block Stationen: WP-STAT-0, dann WP-STAT-1 bis WP-STAT-6
5. Spezialsysteme: WP-NAV-4, WP-NAV-5, WP-SENS-2, WP-RES-1, WP-RES-2, WP-SHUT-1, WP-CREW-4

### Abhängigkeiten zu anderen Bereichen

- **Handel:** Warenkonto am Handelsposten (`TransferToAccount`, `TransferFromAccount`, `ShowTradeMenu`, `BuyTradeLicense`) gehört dorthin.
- **Kolonie/Werft/Fabrikation:** Spezialmodule (Tarnung, Traktor, Shuttlerampe, Tracker, Bussard, Transwarp) müssen fabrizierbar sein, siehe `inventory/colony.md` und `GD/ship-building/stu-special-module-audit.md`.
- **Allianz:** Haltung (vorhanden), Integrationsverträge für Depot, Dock- und Wurmlochrechte, Sichtbarkeitsdienst (Tarnung muss dort ausblenden).
- **Starmap/Tick:** Anomalien, Feldeffekte, Wurmloch-Daten, abbaubare Feldressourcen.

### Unsicherheiten

- Ob Flug in SWU laufende Werft-Reparaturen bzw. Umrüstungen abbricht (STU `RepairConsequence`/`RetrofitConsequence`), wurde nicht geprüft.
- Prestige bzw. Historie bei Zerstörung und der Verbleib der Crew-Zuweisungen bei Zerstörung wurden nur oberflächlich geprüft.
- Ob Brownout-Meldungen inzwischen im UI ankommen, ist unklar. Die Plan-Doku vom 2026-08-06 sagt „offen“.
- Die STU-Systeme Uplink, Beam-Blocker, RPG, Webemitter und Advent wurden nur aus Dateinamen bewertet, nicht im Detail gelesen.
- Der zeitbasierte Hyperraumsprung ist als „bewusst abweichend (unsicher)“ geführt, weil er nirgends dokumentiert ist.
