# STU→SWU-Paritätsinventur: Kolonien, Gebäude, Forschung, Waren und Wirtschaft

Stand: 2026-10-21. Nur Lesen, kein Produktcode wurde geändert.
Referenz STU: `/Users/TMUNDIN/git/github.com/st-universe/core/src` (kurz `STU/`).
Ziel SWU: `apps/backend/src/modules` (kurz `BE/`), `apps/frontend/src/pages` (kurz `FE/`), `packages/shared`, Spieldaten im Submodul `game-data/data` (kurz `GD/`).

Grundlagen: `CONTEXT.md`, ADR 0001–0003 (betreffen Allianz und Kartographie, für diesen Bereich keine bewussten Abweichungen), `stu-swu-ui-parity-audit.md` (Abschnitt „P2 – Kolonien“), `docs/buildings-by-faction.md`, `.scratch/*/spec.md` (relevant ist vor allem `events-and-message-folders`: Kolonie-Tickmeldungen kommen in den Nachrichtenordner „Kolonien“).

Bewertungen: **vorhanden**, **teilweise**, **fehlt**, **abweichend** (bewusst oder faktisch, siehe Notiz). „(?)“ heißt: nicht abschließend verifiziert.

---

## 1. Übersicht: Was SWU schon hat

SWU deckt den Kolonie-Kern breit ab:

- **Kolonieseite:** `FE/colonies/ColoniesPage.tsx` mit Hauptmenüs Informationen, Baumenü, Soziales, Gebäudeschaltung und Einstellungen. Gebäudegebundene Kontextpanels: Orbit, Hangar, Werft, Fabrikation, Verteidigung, Müll.
- **Karte:** Oberfläche, Orbit und Untergrund mit Tag-/Nacht-Terminator (`ColonyMap.tsx`, `FieldCell.tsx`). Felddialog mit Bau, Abriss, Upgrade, Terraforming, (De-)Aktivierung und Reparatur (`ColonyFieldDialog.tsx`, `BuildInspector.tsx`).
- **Gebäude:** Bau, Abriss mit Teilrückerstattung, Upgrade mit Reaktivierungsmarker, Terraforming, Einzel- und Massenschaltung mit allen sieben STU-Massenmodi (`BuildingMassActionMode` 1–7). Reparatur einzeln und gesammelt mit Vorschau. Gebäude- und Kolonielimits, Atmosphären- und Feldtypregeln, Untergrundlogistik und Orbitalwartung (`colony-construction.service.ts`, `colony-building-effects.service.ts`).
- **Tick:** Bilanz mit Abschaltkaskade (Waren-, Energie-, Wohnraum- und Vorkommensmangel), Lager-Obergrenze mit `STORAGE_FULL`, Bevölkerungswachstum nach STU-Formel, Crewausbildung, Fabrikation, Schiffsbau, Terraforming und Bauabschluss (`colony-tick-processor.service.ts`, `tick/tick.service.ts`).
- **Einstellungen:** Umbenennen, Bevölkerungslimit, Einwanderung, Koloniebotschaft (BBCode) und Aufgabe (`PanelSettings.tsx`).
- **Soziales:** Lebensstandard, Crewrechner und globale Crewübersicht (`CrewSocialSection.tsx`, `colony-social.service.ts`).
- **Verteidigung:** Schilde laden, Frequenz, Phalanx-Torpedotyp, Phalanxen im Kampf (`PanelDefense.tsx`, `colony-defense.service.ts`, `combat.service.ts`).
- **Werft:** Modulbildschirm, Baupläne, Bauqueue, Reparatur, Umrüstung, Demontage. **Hangar:** Rumpfbau und Schiffstart. **Akademie** und **Müllverbrennung** (`PanelShipyard.tsx`, `colony-shipyard.service.ts`, `PanelHangar.tsx`, `PanelCrew.tsx`, `PanelWaste.tsx`).
- **Orbit:** Orbitalmanagement, Shuttles, Landen sowie Verteidigen und Blockieren durch Schiffe (`colony-orbit.service.ts`, `OrbitalManagementPanel.tsx`).
- **Kolonisierung:** Schiffsaktion mit Begründungen, Typlimits, SWU-Zonen und Wiederbesiedlung von Ruinen (`BE/colonization/*`, `ColonizationDialog.tsx`).
- **Forschung:** Liste mit Detailmodal, Abhängigkeitsmodi AND, OR und EXCLUDE, 10er-Queue mit automatischem Pfad, Baumansicht (`BE/research/*`, `FE/research.tsx`, `FE/research-tree.tsx`).
- **Kolonieliste:** Mit Signaturen-, Crew-, Bevölkerungs-, Energie- und Lagerspalten sowie Gesamtproduktion (`ColonyOverview.tsx`). Der Audit-Punkt „Signaturen fehlen“ ist damit erledigt.

Die größten Lücken liegen in den **Spielregel-Details** von Produktion und Werft: Energiekosten, Verhalten der Queues bei Gebäudeabschaltung, Rückerstattung bei Modulabbruch, Torpedoproduktion. Dazu kommen fehlende **Forschungsabschluss-Effekte** (Meldung, Belohnungen, Koloniegrenzen), das **Subraumteleskop**, der **Sektor-Scan aus der Kolonie**, die **Warenübersicht in der Datenbank** und die **Kolonie-Sandbox**.

---

## 2. Feature-Tabelle

### 2.1 Kolonieansicht, Navigation und Information

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Kolonie-Hauptmenü (Mainscreen, Bau, Info, Optionen, Soziales, Gebäude) | `STU/Component/Colony/ColonyMenuEnum.php`, `html/colony/menu/mainscreen.twig`, `View/ShowMainscreen`, `View/ShowColony` | vorhanden | `FE/colonies/colony-navigation.ts`, `ColonyPrimaryNav.tsx` | STU-Menüs 0–5 entsprechen den SWU-Hauptansichten. Kontextmenüs werden wie in STU über Gebäudefunktionen freigeschaltet (`getBuildingContextActions`). |
| Oberflächen-, Orbit- und Untergrundraster | `Lib/ColonySurface.php`, `html/colony/component/colonySurface.twig`, `View/ShowSurface` | vorhanden | `ColonyMap.tsx`, `FieldCell.tsx`, `BE/colony/stu-colony-surface.generator.ts` | Untergrund wird pauschal als „Nacht“ gezeigt. |
| Tag-/Nacht-Terminator und Eigenrotation | `Lib/Colony/DayNight/DayNightBorder.php`, `Component/Colony/Trait/ColonyRotationTrait.php`, `management.twig` (Tageszeit, Rotationsdauer) | vorhanden | `FieldCell.tsx` (`timeState`), `PanelInfo.tsx` (Tag, Nacht, Terminator, Tagesdauer), `colony.entity.ts` `rotationFactor` | Ob Tag/Nacht spielmechanisch wirkt (z. B. auf Solarproduktion), ist in STU nicht der Fall (?). Daher keine Lücke. |
| Managementansicht (Planet, System, Vorkommen, Bevölkerung, Effekte, Produktion) | `View/ShowManagement`, `Gui/Component/ManagementProvider.php`, `EffectsProvider.php`, `management.twig` | vorhanden | `PanelInfo.tsx`, `BE/colony/colony-projection.service.ts` | SWU hat zusätzlich Ökosystem und Umgebungsscan. STU zeigt Bevölkerung als dichte Iconleiste (`bev_*`-Icons je Fraktion); SWU nutzt Label-Kacheln. Verweis auf den Systemeintrag in der Datenbank: (?). |
| EPS-Leiste und Lageranzeige | `Gui/Component/EpsBarProvider.php`, `StorageProvider.php`, `colonyEps.twig`, `colonyStorage.twig`, `View/RefreshColonyEps` | vorhanden | `SupplyDock.tsx`, `ColonyOverview.tsx` | Lager als Icon-/Mengenraster wie im Audit beschrieben. |
| Sektor-Scan aus der Kolonie (Flugsignaturen auf dem Kolonie-Feld) | `View/ShowSectorScan`, `html/colony/component/sectorscan.twig`, `FlightSignatureRepository` | teilweise | `BE/colony/colony-environment-scan.service.ts`, `PanelInfo.tsx` „Umgebungsscan“ | SWU-Umgebungsscan (5×5 um die Kolonie) zählt aktuell sichtbare Schiffe. Persistente Flugsignaturen mit Verblassen und getarnten Spuren fehlen in SWU. Abhängig vom Bereich Schiffe/Sensoren. |
| Ort verschollener Crew (Rettungskapseln, Handelsposten) | `View/ShowPodsLocations`, `orphanedcrewlocations.twig`, Link in `social.twig` | fehlt | — | SWU hat keine Rettungskapseln (keine Treffer zu `escapePod`). Abhängig von Bereich Schiffe/Crew. |
| Kolonie-Tickreport | `Tick/Colony/ColonyTick.php::sendMessages` (PM im Ordner `SPECIAL_COLONY`) | vorhanden / abweichend | `tick.service.ts` → `colonyEventService.createTickEvents`, WS `COLONY_TICK_REPORT`, `BE/messaging/colony-event.service.ts` | Strukturierte Ereignisse statt Freitext-PM. Die Überführung in den Nachrichtenordner „Kolonien“ ist in `.scratch/events-and-message-folders/spec.md` spezifiziert. Ob alle STU-Meldungstexte abgedeckt sind, siehe Zeilen zu Auswanderung und Modulfertigstellung. |
| Kolonie-Sandbox (Planungsmodus) | `Action/Sandbox/CreateSandbox`, `View/Sandbox`, `html/colony/sandbox/*.twig`, `ColonySandbox`-Entity | fehlt | — | Kein SWU-Code. Großes Feature, Produktentscheidung nötig. |
| Allianz-Kolonieoberfläche und Datenbank-Kolonieoberfläche | `html/alliance/alliancecolonysurface.twig`, `Database/View/ShowColonySurface` | teilweise (?) | Kolonie-Scans: `.scratch/stu-systemdatenbank-und-kolonie-scans` | Gehört zum Bereich Allianz/Datenbank. Wird hier nur der Vollständigkeit halber erwähnt. |

### 2.2 Gebäude

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Baumenü nach Kategorien (Soziales, Industrie, Infrastruktur, Energie) | `Component/Building/BuildMenuEnum.php`, `View/ShowBuildMenu`, `ShowBuildMenuPart`, `Gui/Component/BuildmenuProvider.php`, `buildmenues.twig`, `buildmenu.twig`, `Action/ScrollBuildMenu` | vorhanden / abweichend | `PanelBuild.tsx` (`BMCOL_LABELS`, Spalten 4/2/1/3, Tab „Alle“) | SWU: Tabs mit Kachelraster statt vier paralleler Spalten mit Blättern; Sortierung nach Bezahlbarkeit. |
| Baumenü nach Feldtyp filtern (`fid`) und nach Ware filtern (`cid`, „Baumenü nach 'X' filtern“) | `BuildmenuProvider.php` (Parameter `cid`, `fieldType`), `fieldAction.twig` Z. 214/270 | teilweise | `ColonyFieldDialog.tsx` „Baumenü öffnen“, `ColoniesPage.tsx` `highlightedFields` | SWU hebt die passenden Felder für ein gewähltes Gebäude hervor (umgekehrte Richtung). Es fehlt der Filter „nur Gebäude, die auf diesem Feld baubar sind“ beim Öffnen aus einem Feld (?). Der Warenfilter fehlt. |
| Gebäudevorschau und Auswirkungen | `buildingPreview.twig`, `buildingConsequences.twig`, `View/ShowBuilding`, `buildingInfo.twig` | vorhanden | `BuildInspector.tsx` (Baukosten, Bauzeit, Vorhanden/Benötigt, Auswirkungen, Vorschau je Feld) | |
| Bauen auf Feld | `Action/BuildOnField`, `Component/Building/BuildingManager.php`, `BuildingFinishHandler.php` | vorhanden | `colony-construction.service.ts` `build`/`buildWithManager`, `building-lifecycle.service.ts` | Ersatzbau mit Kosten- und Energieprüfung, Option „Nach Fertigstellung deaktivieren“. |
| Abriss mit Rückerstattung | `Action/RemoveBuilding`, `BuildingRemovalHandler.php` (Untergrundlogistik, Orbitalwartung, Lager-/EPS-Abzug, `isRemovable`) | vorhanden | `colony-construction.service.ts` `demolish`/`removeBuilding`/`getDemolitionRefunds` | Die Rückerstattungsquote gegenüber STU ist nicht verifiziert (?). Ob Queues beim Abriss beendet werden, siehe 2.5. |
| Gebäude-Upgrade | `Action/UpgradeBuilding`, `BuildingReactivationHandler.php` | vorhanden | `colony-construction.service.ts` `upgradeBuilding`, `reactivateAfterUpgrade`, `GD/buildings/stu-building-upgrades.yaml` | Die Reaktivierung von Orbitalgebäuden nach dem Upgrade (`handleAfterUpgradeFinish`) ist im Feld angelegt. Die vollständige Kaskade ist nicht verifiziert (?). |
| Aktivieren und Deaktivieren einzeln | `Action/ActivateBuilding`, `DeactivateBuilding`, `BuildingActivationHandler.php`, `Lib/BuildingAction.php` | vorhanden | `colony-construction.service.ts` `toggleBuilding`, `assertCanActivateBuilding`, `deactivateDependentBuildings` | |
| Massenschaltung (7 Modi) | `Action/ActivateBuildings`, `DeactivateBuildings`, `Lib/BuildingMassActionConfiguration.php`, `buildingManagement.twig` | teilweise | `colony-building-management.service.ts`, `PanelBuildingManagement.tsx` | Das Backend kann alle 7 Modi. Die UI nutzt nur Modus 2 (Auswahl). Die STU-Schaltflächen „Gebäudegruppen“ (Energie, Warenbezogen, Bevölkerungsbezogen mit Warenwahl) fehlen in der Oberfläche. |
| Gebäudereparatur (einzeln und alle) | `Action/RepairBuilding`, `Lib/Damage/ApplyBuildingDamage.php` | vorhanden | `colony-construction.service.ts` `repairBuilding`, `colony-building-management.service.ts` `repairDamagedBuildings`, `colony-damage.service.ts` | Gesammelte Reparatur mit Vorschau ist eine SWU-Erweiterung. |
| Terraforming | `Action/Terraform`, `Tick/Process/FinishTerraformingJobs.php`, `fieldAction.twig` | vorhanden | `colony-construction.service.ts` `terraformField`, Tick `checkBuildingCompletions`, `GD/terraforming` | SWU-Zielfelder (z. B. `E433`) werden nur über `terrainTileId` abgebildet. Ein Abbruch ist weder in STU noch in SWU vorhanden (?). |
| Gebäudelimits (pro Kolonie, pro Spieler) | `Building::getLimit`/`getLimitColony` | teilweise | `colony-construction.service.ts` `checkBuildingLimits` | `blimit` (Spielerlimit): (?). Laut `GD/buildings/stu-buildings.yaml` ist es meist 0. |
| Gebäudeliste nach Fraktion | STU-Gebäudedaten | abweichend (bewusst) | `docs/buildings-by-faction.md` | SWU kennt Rebellen und Imperium, aber keine neutralen Gebäude. |
| Abkürzungen der Gebäudenamen | `Component/Building/NameAbbreviations.php` | fehlt (unkritisch) | — | Nur kosmetisch, für die Kartenbeschriftung. |

### 2.3 Bevölkerung, Energie, Produktion und Lager (Tick)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Produktionsbilanz und Abschaltkaskade (Ware, Wohnraum, Energie, max. 100 Iterationen) | `Tick/Colony/ColonyTick.php` `mainLoop`/`checkStorage`/`checkLivingSpace`/`checkEnergyProduction` | vorhanden | `colony-tick-processor.service.ts` `balanceAndProduce`, `deactivateFirstMatchingField` | Ereignis `BUILDING_DEACTIVATED`. Die Reihenfolge der Auswahl (STU: erstes passendes Feld laut Repository-Sortierung) ist nicht 1:1 verifiziert (?). |
| Vorkommen-Abbau (Deposit Mining) | `ColonyDepositMiningRepository`, `ProceedStorage` | vorhanden | `colony-tick-processor.service.ts` (`depositConsumption`), `entities/colony-deposit-mining.entity.ts` | |
| Lager auffüllen bis zur Obergrenze, Meldung „Lager voll“ (abschaltbar per Nutzereinstellung) | `Tick/Colony/Component/ProceedStorage.php` | vorhanden / teilweise | `colony-tick-processor.service.ts` Z. ~428 `STORAGE_FULL` | Die STU-Nutzereinstellung `isStorageNotification` fehlt in SWU (?). |
| Einwanderung und Wachstum | `Component/Colony/ColonyPopulationCalculator.php`, `ProceedMigration::proceedImmigration` | vorhanden | `colony-tick-processor.service.ts` `calculatePopulationGrowth`/`growPopulation` | Formel identisch (freier Wohnraum/3, `bevGrowthRate`, Lebensstandard/50). |
| **Auswanderung** (Bevölkerung > Wohnraum oder > Bevölkerungslimit → Arbeitslose wandern aus, mit Meldung) | `Tick/Colony/Component/ProceedMigration.php` | fehlt | — | SWU kennt nur Wachstum: Bei Überbelegung oder einem gesenkten Limit sinkt die Bevölkerung nicht. Keine Treffer für „ausgewandert“ oder „emigrat“. |
| Crew-Limit erzwingen | `Tick/Colony/Component/LimitCrewAssignments.php` | vorhanden | `enforceLocalCrewLimit`, Ereignis `CREW_LIMIT_EXCEEDED` | |
| Forschung im Kolonie-Tick | `Tick/Colony/Component/AdvanceResearch.php` | vorhanden / abweichend | `tick.service.ts` (Produktion je Spieler aggregiert) → `research.service.ts` `processTick` | Siehe 2.6. |
| Energie: Produktion, Verbrauch, Speicher | `ColonyEpsProductionPreviewWrapper.php`, `PlanetFieldRepository::getEnergyProductionByHost` | vorhanden | `colony-stats.service.ts` `resolveEpsProc`, `calculateSummary` | |
| Produktionsvorschau je Ware | `ColonyProductionPreviewWrapper.php`, `Component/Colony/Commodity/ColonyCommodityProduction.php`, `ColonyProductionSumReducer.php` | vorhanden | `colony-stats.service.ts`, `ColonyOverview.tsx` „Gesamtproduktion“ | |
| Verbrauchsübersicht (`CommodityConsumption`) | `Lib/CommodityConsumption.php` (Reichweite in Ticks bis Lager leer) | teilweise (?) | `PanelInfo.tsx` | Nicht verifiziert, ob SWU „reicht noch X Ticks“ anzeigt. |
| Kolonie-Korrektur (Abgleich von Arbeitern, Wohnraum, Lager, EPS) | `Lib/ColonyCorrector.php` | abweichend | `colony-stats.service.ts` `syncLegacyColonySnapshot` | SWU berechnet viele Werte aus den Feldern neu. Ein Wartungs-Job ist nicht nötig (?). |
| Schildregeneration der Kolonie | STU: Kolonieschild wird über Schildbatterie und `LoadShields` geladen; `ShieldRegeneration` betrifft nur Schiffe | vorhanden | `colony-defense.service.ts` `loadShields`, `syncShieldCapacity` | |

### 2.4 Einstellungen, Soziales, Abgabe, Kolonisierung

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Umbenennen | `Action/ChangeName`, `miscellaneous.twig` | vorhanden | `colony-settings.service.ts` `rename` | |
| Einwanderung erlauben/verbieten | `Action/AllowImmigration`, `DenyImmigration` | vorhanden | `setImmigration`, `PanelSettings.tsx` | |
| Bevölkerungslimit | `Action/SetPopulationLimit` | vorhanden / teilweise | `setPopulationLimit` | Das Limit begrenzt nur das Wachstum. Die STU-Auswanderung beim Limit fehlt (siehe 2.3). |
| Koloniebotschaft (BBCode) | `Action/ChangeColonyMessage`, `ColonyMessageBbCodeParser.php`, `spacecraft/colonyMessage.twig` (für Besucher sichtbar) | vorhanden | `setColonyMessage`, `PanelInfo.tsx` `BbCodeText` | Ob fremde Schiffe im Orbit die Botschaft sehen, ist nicht verifiziert (?). |
| Kolonie aufgeben | `Action/GiveUp`, `View/ShowGiveUp`, `giveup.twig`, `Lib/ColonyResetter.php` | abweichend | `colony-abandonment.service.ts`, `PanelSettings.tsx` | SWU: Bestätigung mit vollem Namen, Startkolonie gesperrt, Ruine bleibt bestehen. Kein Rücksetzen des Spielerstatus auf UNCOLONIZED. Diese Abweichungen sind nicht als ADR festgehalten. |
| Soziales: Lebensstandard und Crewrechner | `View/ShowSocial`, `Gui/Component/SocialProvider.php`, `social.twig` | vorhanden | `CrewSocialSection.tsx`, `colony-social.service.ts` | STU zeigt einen interaktiven „Lokalen Crewrechner“ (Eingabefelder für Hypothesen). In SWU ist er nur als Anzeige vorhanden (?). |
| Kolonisierung per Schiff | `Ship/Action/Colonize`, `Lib/PlanetColonization.php`, `Component/Colony/ColonyCreation.php` | vorhanden (erweitert) | `BE/colonization/colonization.service.ts`, `ColonizationDialog.tsx` | Erfolgs-/Datenbank-Eintrag nach der Kolonisierung: (?). |
| Kolonielimits nach Typ (Planet, Mond, Asteroid) | `Component/Player/ColonyLimitCalculator.php`, `ResearchRepository::getColonyTypeLimitByUser`, `maindesk/colonyLimits.twig` | abweichend | `packages/shared/.../colonization-rules.ts`, `DashboardLowerSections.tsx` `DashboardLimits` | SWU: 1 Basisplatz + Fraktionstechs, gedeckelt bei 3/3/1. STU liest die Limits aus den Forschungsdaten ohne festen Deckel. Bewusst? Ein ADR fehlt. |
| Erste Kolonie wählen | `maindesk/colonylist.twig`, `firstColonyDialogue.twig` | abweichend (bewusst) | `FE/onboarding.tsx`, `BE/onboarding/*` | SWU-Onboarding mit Starterzonen. |
| Kolonieliste (Maindesk und Übersicht) | `html/view/colonylist.twig`, `Lib/ColonyListItem.php` | vorhanden | `ColonyOverview.tsx`, `DashboardColonies.tsx` | Die Audit-Punkte „Signaturen“ und „Planet/System kompakt“ sind erfüllt. Ein klarer Ruinenstatus in Liste und Planetbox ist laut Audit offen (?). Blockade-/Verteidigungs-Icons und Balken nicht verifiziert. |

### 2.5 Werft, Hangar, Fabrikation, Akademie, Verteidigung

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Modulbildschirm (ein Modul je Slot, Vorschau) | `View/ShowModuleScreen`, `ShowModuleScreenBuildplan`, `Lib/ModuleScreen`, `Action/BuildShip` | vorhanden / teilweise | `PanelShipyard.tsx` `ShipHullDesigner`, `colony-shipyard.service.ts` `validateModuleSelections` | Die Vorschau zeigt Basiswerte und Effekttexte, keine neu berechneten Endwerte (?). Die STU-Prüfung „mehr Spezialmodule als der Rumpf erlaubt“ fehlt (?). |
| Crew-Maximum beim Bau | `SpacecraftCrewCalculator`, `BuildShip` | teilweise | `colony-shipyard.service.ts` `calculateCrewRequired` | Die Überschreitung wird nur im Frontend rot markiert, das Backend prüft nicht. |
| Baupläne anlegen, umbenennen, löschen, wiederverwenden | `Action/CreateBuildplan`, `RenameBuildplan`, `DeleteBuildPlan`, `Lib/BuildPlanDeleter.php` | vorhanden / abweichend | `colony-shipyard.service.ts` (Signatur SHA256), Controller `:id/buildplans*` | Fehlt: Löschsperre für Pläne, die genutzt werden (`isDeletable`), Duplikatprüfung „Bauplan existiert bereits“ und Namensvalidierung (Unicode, Länge). |
| Bauplan-Tabs je Rumpf | `View/ShowBuildPlans`, `shipyardBuildplanTabs.twig` | teilweise | `PanelShipyard.tsx` (Filter je Werft und Klasse) | |
| Schiffsbau-Queue und Fertigstellung | `Action/BuildShip`, `Tick/Process/FinishShipBuildJobs.php` | vorhanden / abweichend | `colony-shipyard.service.ts` `buildShip`/`processShipBuildQueue`, `colony-ship-build-queue.entity.ts` | **Keine EPS-Kosten** (STU: `rump->getEpsCost`), **keine Sperre auf einen Auftrag je Werft**, keine Blockadeprüfung beim Bau. Ein Abbruch (SWU-Extra) erstattet kein Material. `docs/ship-build-job-followup.md` ist veraltet. |
| Modulfertigung | `Action/CreateModules`, `View/ShowModuleFab`, `Lib/ModuleQueueLib.php`, `ColonyTick::proceedModules`, `moduleFab.twig` | abweichend | `colony-fabrication.service.ts`, `PanelFabrication.tsx` | STU: mehrere Module je Auftrag, Menge wird auf EPS und Lager gekürzt, **EPS-Kosten (`ecost`)**, fertig im nächsten Kolonie-Tick nur bei aktiver Funktion. SWU: ein Auftrag je Funktion, keine EPS-Kosten, zeitbasiert, keine Aktivitätsprüfung bei Fertigstellung. |
| Modulfertigung abbrechen | `Action/CancelModuleCreation`, `View/ShowModuleCancel` | abweichend | `colony-fabrication.service.ts` `cancelFabricationQueue` | STU: Teilmengen, **100 %** Material und EPS zurück. SWU: ganzer Auftrag, 50 % Material. |
| Torpedofabrik | `Action/BuildTorpedos`, `View/ShowTorpedoFab`, `torpedoFab.twig` | abweichend | Fabrikationsqueue `TORPEDO`, Funktion 9, `GD/torpedoes/stu-torpedoes.yaml` | STU produziert sofort mit EPS-Kosten. SWU nutzt eine Zeitqueue ohne EPS. |
| Phalanx-Torpedotyp | `Action/ChangeTorpedoType` | teilweise | `colony.service.ts` `setDefenseTorpedoType`, `PanelDefense.tsx` | Die Forschungsfreigabe der Torpedotypen (`getForUser`) wird nicht geprüft (?). |
| Komponentenfertigung (Fabrikationshalle 29, Technologiezentrum 30) | `componentFab.twig` über `ShowModuleFab`, Ersatzteile über `Tick/Spacecraft/ManagerComponent/RepairActions` | fehlt | `colony-navigation.ts` listet 29/30 | `GD/fabrication/stu-fabrication.yaml` enthält **keine** Einträge für die Funktionen 29/30 (nur 9–18). Die Panels bleiben also leer. |
| Hangar und Flugfeld: Rumpf bauen, Schiff starten | `Action/BuildAirfieldRump`, `StartAirfieldShip`, `View/ShowAirfield` | vorhanden | `colony.service.ts` `buildAirfieldRump`/`startHangarShip`, `PanelHangar.tsx` | |
| Jägerwerft (Rumpf ins Lager) | `Action/BuildFighterShipyardRump`, `View/ShowFighterShipyard` | abweichend / teilweise | Funktion 5 in der Werftgruppe | SWU nutzt die normale Bauqueue. Ein eigener Rumpf-ins-Lager-Pfad fehlt (?). |
| Akademie: Crewausbildung | `Action/TrainCrew`, `View/ShowAcademy`, `academy.twig` | vorhanden / abweichend | `colony.service.ts` `queueCrewTraining`, Tick `processCrewTrainingQueue`, `PanelCrew.tsx` | Der Tick prüft nicht erneut, ob die Akademie aktiv ist und ob das Limit noch eingehalten wird. |
| Müllverbrennung | `Action/RemoveWaste`, `View/ShowWaste`, `waste.twig` | vorhanden | `colony-settings.service.ts` `discardStorage`, `PanelWaste.tsx` | Parität. |
| Demontage | `Action/DisassembleShip`, `View/ShowShipDisassembly` | abweichend | `colony.service.ts` `disassembleShip` | STU gibt einige Module, Reaktorladung und Torpedos zurück. SWU erstattet 50 % der Rumpfkosten plus Fracht und verlangt eine aktive Werft. |
| Schiffsreparatur (Queue, abbrechen, reaktivieren) | `Action/RepairShip`, `CancelShipRepair`, `ReactivateShipRepair`, `Tick/Process/FinishPassiveShipRepairJobs.php`, `RepairTaskJobs.php` | abweichend | `colony-shipyard.service.ts` `queueShipRepair`/`finishShipRepairQueue`, `cancelShipyardQueue`, `reactivateShipyardQueue` | STU repariert passiv in Schritten. SWU zahlt die Kosten vorab und repariert in einem Abschluss. Kein Erstatten beim Abbruch, keine PM an den Schiffseigner. |
| Umrüstung | `Action/RetrofitShip`, `View/ShowModuleScreenRetrofit`, `Tick/Process/FinishShipRetrofitJobs.php` | vorhanden / abweichend | `queueShipRetrofit`/`finishShipRetrofitQueue` | Keine EPS-Kosten, keine Sperre auf einen Auftrag je Werft. |
| **Queues bei Gebäude-Deaktivierung oder -Abriss** | `Module/Building/Action/BuildingFunctionActionMapper.php`, `Shipyard.php`, `ModuleFab.php`, `Academy.php`, `ShieldGenerator.php`, `ShieldBattery.php` | fehlt | `building-lifecycle.service.ts`, `colony-building-management.service.ts` | STU: Werft aus → Bau und Reparatur pausieren; Werft zerstört → Queue gelöscht; Modulfabrik aus → Aufträge storniert mit voller Rückerstattung; Akademie zerstört → Ausbildung gelöscht; Schildgenerator/-batterie aus → Schilde gekappt. In SWU berühren Deaktivierung und Abriss diese Queues nicht. |
| Schilde laden und Frequenz | `Action/LoadShields`, `ChangeFrequency`, `Component/Colony/Shields/ColonyShieldingManager.php`, `colonyShields.twig` | vorhanden | `colony.service.ts` `loadShields`/`setShieldFrequency`, `PanelDefense.tsx` | |
| Schildgenerator per Knopf aktivieren/deaktivieren | `Action/ActivateShields`, `DeactivateShields` | teilweise | Schalten nur über das Feld möglich | Nur ein Komfort-Shortcut im Verteidigungspanel. |
| Orbitalverteidigung (Phalanxen im Kampf) | `Component/Building/BuildingFunctionEnum` 26–28, Kampf-Lib | vorhanden | `combat.service.ts` `attackColony`, `colony-defense.service.ts` | Für Kampfbalance siehe Bereich Kampf. |
| Orbitalmanagement, Shuttles, Landen, Orbit-Schiffsliste | `View/ShowOrbitManagement`, `ShowShuttleManagement`, `ShowOrbitShiplist`, `Action/ManageOrbitalSpacecrafts`, `ManageOrbitalShuttles`, `LandShip` | vorhanden | `colony-orbit.service.ts`, `OrbitalManagementPanel.tsx`, `PanelOrbit.tsx` | Laut Audit P2 sollen Orbitkarten mehr Werte (Hyperantrieb, Batterie) zeigen. |
| Beamen zwischen Kolonie und Schiff | `Lib/Transfer`, `html/transfer/**`, `management.twig` (Beam-Buttons) | vorhanden | `BE/spacecraft/transfer.service.ts`, `PanelOrbit.tsx` | Torpedos von und zur Kolonie: (?). |
| **Subraumteleskop** (Kartenausschnitt der Umgebung, Teleskop-Scan) | `View/ShowSubspaceTelescope`, `ShowSubspaceTelescopeScan`, `telescope.twig`, `telescopeScan.twig`, `telescopeNavigation.twig`, Funktion 31 | fehlt | Gebäude „Hyperraum-Teleskop“ (100060100) existiert in `GD/buildings/stu-buildings.yaml` | Das Gebäude ist baubar, hat aber keine Funktion und keine UI. Abhängig von Sternenkarte und Signaturen. |

### 2.6 Forschung

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Techliste (verfügbar und erforscht, gesperrte ausgeblendet) | `Research/TechlistRetriever.php`, `html/view/research.twig` | abweichend | `research.service.ts` `getResearchState`, `FE/research.tsx` | SWU zeigt Aktiv, Warteschlange, Verfügbar und Abgeschlossen. Gesperrte nur im Baum. Keine Forschungsbilder, obwohl `researchImage()` in `FE/lib/assets.ts` existiert. Kein „Erforscht am“-Datum (?). |
| Fraktionsbindung | Abhängigkeit auf die Fraktions-Startforschung | abweichend | `research.service.ts` `isTechForFaction` (Heuristik über die letzte ID-Ziffer bzw. den Namen), `EXCLUSIVE_TECH_FACTIONS` | Die Heuristik ist fragil. Ein explizites `faction`-Feld sollte in den Daten Pflicht sein. |
| Abhängigkeitsmodi REQUIRE, REQUIRE_SOME, EXCLUDE | `Component/Research/ResearchModeEnum.php`, `TechDependency.php` | vorhanden | `areDependenciesMet`, Ausblendung bei EXCLUDE | Die Richtung der EXCLUDE-Kanten ist gegen die Daten nicht verifiziert (?). |
| Kosten in Forschungswaren, Fortschritt aus Produktion, nur eine Forschungsware je Tick | `AdvanceResearch.php` (`isCommodityAllowed`) | vorhanden / abweichend | `tick.service.ts` (über alle Kolonien aggregiert), `research.service.ts` `processTick`, `blockedReason` | SWU aggregiert je Spieler. STU rechnet je Kolonie, mit Sperre auf die erste Forschungsware. Ergebnis ähnlich. |
| Aktiv- und Warteslot | `Action/StartResearch` | abweichend (Obermenge) | `MAX_QUEUE_SIZE = 10`, `queueTarget` mit automatischem Pfad | Balance: SWU-Spieler müssen seltener eingreifen. NEEDS-DECISION unten. |
| Abbrechen | `Action/CancelResearch` (Fortschritt verloren) | abweichend | `cancelResearch` (Fortschritt bleibt erhalten) | Bewusst? Kein ADR. |
| Abschluss: PM „Forschung abgeschlossen“ | `ResearchState::finish` | fehlt | — | Kein Ereignis, keine Mitteilung. Abhängig von `events-and-message-folders`. |
| Abschluss: Belohnungsschiff (`reward_buildplan`) | `ResearchState::createRewardShip` | fehlt | — | Abhängig vom Bereich Schiffe. |
| Abschluss: Auszeichnung (`award_id`) und Gate `needed_award` | `ResearchState::checkForAward`, `TechlistRetriever` | fehlt | — | Abhängig von einem Award-System (Bereich Spieler/Profil). |
| Abschluss: Datenbankeinträge (`database_entries`) | `ResearchState::createDatabaseEntries` | fehlt | — | Abhängig vom Bereich Datenbank. |
| Rumpf- und Gebäudefreischaltung | `createShipRumpEntries`, `Building.research_id` | vorhanden | `unlock-resolver.service.ts` | |
| Kolonielimit durch Forschung (`upper_limit_colony_type/amount`) | `ResearchRepository::getColonyTypeLimitByUser`, `researchDetails.twig` | abweichend | `colonization-rules.ts` | Siehe 2.4. |
| Detailansicht | `View/ShowResearch`, `SelectedTech.php`, `researchDetails.twig` | teilweise | `research.tsx` `TechDetailModal` | Folgeforschungen nur über REQUIRE (REQUIRE_SOME fehlt). Freigeschaltete Rümpfe und Module werden nicht angezeigt. Keine Koloniegrenzen, kein Bild. |
| Header-Widget | `html/game/component/researchComponent.twig` | vorhanden (?) | `components/layout/header.tsx` | Anzeige „+Produktion“ und „+1 Warteslot“ nicht verifiziert. |
| Forschungsbaum | nur im STU-Admin (`Admin/View/ResearchTree`) | abweichend (Extra) | `FE/research-tree.tsx` | EXCLUDE- und REQUIRE_SOME-Kanten werden nicht unterschieden (STU-Admin: rot/blau). |

### 2.7 Waren und Warendatenbank

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Warenübersicht mit eigenen Gesamtmengen | `Database/View/CommoditiesOverview`, `database/commoditiesOverview.twig` | fehlt | `BE/database/database.service.ts` `getCommodities` (nur Katalog) | Keine UI in `FE/database.tsx`. |
| Lagerorte einer Ware | `Database/View/ShowCommoditiesLocations`, `commodityLocations.twig` | teilweise | `colony-commodity-locations.service.ts`, `CommodityLocationsDialog.tsx` | Nur aus einer Kolonie heraus erreichbar, nicht global aus der Datenbank. |
| Warenmodell (`sort`, `view`, `type`, `npc_commodity`, `bound`, `isBeamable`, `isTradeable`, `isSaveable`) | `Orm/Entity/Commodity.php`, `Commodity/CommodityTypeConstants.php`, `Commodity/Lib/CommodityCache.php` | teilweise | `BE/game-data/game-data.service.ts`, `GD/commodities/stu-commodity-map.yaml` | `sort`, `bound` und `npcCommodity` werden nicht gemappt, daher keine Sortierung wie in STU und keine Beam- und Handelssperren. `density` ist fest 1. |
| Ranglisten Koloniewert, Produktionswert, Forschung | `Database/View/ColonyWorthRanking`, `ColonyProductionWorthRanking`, `ResearchRanking` | vorhanden / abweichend | `database.service.ts` (`colony-worth`, `colony-production`, `research`) | Metriken vereinfacht (Gebäudezählung). |
| Rangliste zufriedene Arbeiter | `Database/View/SatisfiedWorkerRanking` | fehlt | — | |

---

## 3. Vorgeschlagene Arbeitspakete

Größen: S ≈ wenige Dateien; M ≈ ein Backend-Service plus UI plus Tests; L wurde jeweils aufgeteilt. Jedes Paket ist für einen Agentendurchlauf gedacht.

### A. Spielregeln Produktion, Werft, Fabrikation

**A1 – Queues reagieren auf Gebäudedeaktivierung und -abriss** (M)
Portierung von `BuildingFunctionActionMapper`: Werft deaktiviert → BUILD- und RETROFIT-Jobs pausieren (`PAUSED`), bei Reaktivierung fortsetzen. Werft abgerissen → Jobs stornieren, Crew zurück. Modulfabrik deaktiviert oder abgerissen → Fabrikationsaufträge stornieren mit voller Rückerstattung. Akademie abgerissen → Ausbildung stornieren. Schildgenerator oder -batterie aus → Schilde auf das neue Maximum kappen. Dazu ein Hook in `building-lifecycle.service.ts` (deactivate/clear) und im Massenschalter.
STU: `src/Module/Building/Action/{BuildingFunctionActionMapper,Shipyard,ModuleFab,Academy,ShieldGenerator,ShieldBattery}.php`, `src/Component/Building/BuildingRemovalHandler.php`.
Abhängigkeiten: keine. Vor A2/A3 umsetzen, damit die Rückerstattungslogik nur einmal entsteht.

**A2 – Modul- und Torpedofertigung nach STU-Regeln** (M)
EPS-Kosten (`ecost`) beim Auftrag. Menge auf EPS und Lager kürzen mit Meldung „X von Y“. Bestehenden Auftrag aufstocken statt nur einen Auftrag je Funktion zuzulassen. Abbruch von Teilmengen mit 100 % Material- und EPS-Rückerstattung. Fertigstellung im Kolonie-Tick nur bei aktiver Funktion. Torpedos sofort produzieren.
STU: `src/Module/Colony/Action/{CreateModules,CancelModuleCreation,BuildTorpedos}`, `src/Module/Colony/Lib/ModuleQueueLib.php`, `src/Module/Tick/Colony/ColonyTick.php::proceedModules`, `src/html/colony/menu/{moduleFab,torpedoFab}.twig`.
Abhängigkeit: A1.
**NEEDS-DECISION:** Sollen SWU-Fabrikationszeiten (`durationSeconds`) und der 50-%-Abbruch bewusst bleiben, oder gilt exakt STU (Fertigstellung im nächsten Tick, 100 % Rückerstattung, Torpedos sofort)?

**A3 – Werft: EPS-Kosten, ein Auftrag je Werft, Blockade, Crew-Maximum** (S–M)
Rumpf-`epsCost` bei Bau und Umrüstung abziehen. Höchstens ein BUILD- oder RETROFIT-Auftrag je Werftfunktion. Blockadeprüfung beim Bau. Backend-Prüfung des Crew-Maximums. Spezialmodul-Limit des Rumpfs prüfen. Dazu `docs/ship-build-job-followup.md` aktualisieren.
STU: `src/Module/Colony/Action/{BuildShip,RetrofitShip}`, `src/Module/Spacecraft/Lib/Crew/SpacecraftCrewCalculator.php` (?).
Abhängigkeit: A1.
**NEEDS-DECISION:** Bleibt der parallele Bau mehrerer Schiffe je Werft (SWU-Komfort) erlaubt?

**A4 – Baupläne härten** (S)
Löschsperre für Pläne mit gebauten oder in Bau befindlichen Schiffen. Duplikatprüfung über die Signatur mit STU-Meldung. Namensvalidierung (Länge ≤ 255, Unicode).
STU: `src/Module/Colony/Action/{CreateBuildplan,RenameBuildplan,DeleteBuildPlan}`, `src/Module/Colony/Lib/BuildPlanDeleter.php`.
Abhängigkeiten: keine.

**A5 – Schiffsreparatur passiv in Schritten** (M)
Reparatur je Tick in Schritten mit Ersatzteilverbrauch statt Vorabzahlung. Slots je Werftfeld (2 mit Reparaturstation). PM an den Schiffseigner. Abbruch und Reaktivierung wie in STU.
STU: `src/Module/Colony/Action/{RepairShip,CancelShipRepair,ReactivateShipRepair}`, `src/Module/Tick/Process/{FinishPassiveShipRepairJobs,RepairTaskJobs}.php`.
Abhängigkeiten: A1, Bereich Schiffe (Ersatzteile, Systemschäden).
**NEEDS-DECISION:** Ist die SWU-Vorabzahlung eine bewusste Vereinfachung?

**A6 – Demontage nach STU-Regel** (S)
Rückgabe einiger Module (`retrieveSomeModules`), der Reaktorladung und der Torpedos statt 50 % der Rumpfkosten. Werftpflicht prüfen.
STU: `src/Module/Colony/Action/DisassembleShip`, `src/Module/Colony/View/ShowShipDisassembly`.
Abhängigkeit: Bereich Schiffe (Reaktor, Torpedolager).
**NEEDS-DECISION:** Werftpflicht beibehalten?

**A7 – Akademie-Tick prüft Aktivität und Limit** (S)
`processCrewTrainingQueue` überspringt Ausbildung bei inaktiver Akademie und kappt Aufträge über dem Limit (STU `ColonyTickManager`).
STU: `src/Module/Tick/Colony/ColonyTickManager.php`, `src/Module/Colony/Action/TrainCrew`.
Abhängigkeiten: keine.

**A8 – Komponentenfertigung (Fabrikationshalle und Technologiezentrum)** (M)
Fabrikationsdaten für die Funktionen 29/30 in `game-data` ergänzen (Komponenten und Ersatzteile). Die Ersatzteil-Tickproduktion portieren.
STU: `src/html/colony/menu/componentFab.twig`, `src/Module/Colony/View/ShowModuleFab`, `src/Module/Tick/Spacecraft/ManagerComponent/RepairActions.php`.
Abhängigkeiten: A2, Daten-Repo `swuniverse/game-data`, A5 (Ersatzteile).
**NEEDS-DECISION:** Welche Komponenten gibt es in SWU?

**A9 – Jägerwerft: Rumpf ins Lager** (S)
Analog zum Hangar-Rumpfbau einen Endpunkt und UI für die Funktion 5 bauen, falls STU-Semantik gewünscht ist.
STU: `src/Module/Colony/Action/BuildFighterShipyardRump`, `src/Module/Colony/View/ShowFighterShipyard`, `src/html/colony/menu/fighterShipyard.twig`.
**NEEDS-DECISION:** Jäger als Lager-Rümpfe (STU) oder als normale Bauqueue (heutiges SWU)?

**A10 – Phalanx-Torpedotyp an die Forschung binden** (S)
`setDefenseTorpedoType` prüft die erlaubten Torpedotypen des Spielers.
STU: `src/Module/Colony/Action/ChangeTorpedoType`, `TorpedoTypeRepository::getForUser`.
Abhängigkeiten: keine.

### B. Bevölkerung und Tick

**B1 – Auswanderung** (S)
Port von `ProceedMigration`: Ist die Bevölkerung größer als der Wohnraum, wandert ein zufälliger Teil der Arbeitslosen aus. Wird das Bevölkerungslimit überschritten, werden die Arbeitslosen auf das Limit gekürzt. Tick-Ereignisse mit STU-Texten.
STU: `src/Module/Tick/Colony/Component/ProceedMigration.php`.
Abhängigkeiten: keine. Gleichzeitig `setPopulationLimit` prüfen.

**B2 – Lagermeldung als Nutzereinstellung** (S)
Einstellung „Lager-voll-Benachrichtigung“ (STU `isStorageNotification`) hinzufügen und im Tick berücksichtigen.
STU: `src/Module/Tick/Colony/Component/ProceedStorage.php`, `src/Module/PlayerSetting`.
Abhängigkeit: Bereich Einstellungen.

### C. Gebäude-UI

**C1 – Gebäudeschaltung: Gruppen-Schaltflächen** (S)
UI für die Modi 1, 3, 4, 5, 6 und 7 (Energieverbraucher, Energieerzeuger, Industrie, Wohnen, Warenverbraucher und -erzeuger mit Warenauswahl) in `PanelBuildingManagement.tsx`. Das Backend kann das bereits. Dazu kompakte Iconzeilen wie in STU.
STU: `src/html/colony/menu/buildingManagement.twig`, `src/Module/Colony/Lib/BuildingMassActionConfiguration.php`.
Abhängigkeiten: keine.

**C2 – Baumenü-Filter nach Feld und Ware** (S)
Wird das Baumenü aus einem Feld geöffnet, nur dort baubare Gebäude zeigen. Warenfilter „Baumenü nach 'X' filtern“ aus der Produktionsanzeige des Felddialogs.
STU: `src/Module/Colony/Lib/Gui/Component/BuildmenuProvider.php`, `src/html/colony/component/fieldAction.twig`.
Abhängigkeiten: keine.

**C3 – Schildgenerator-Schnellschalter im Verteidigungspanel** (S)
Aktivieren und Deaktivieren des einzigen Schildgenerators ohne Umweg über das Feld.
STU: `src/Module/Colony/Action/{ActivateShields,DeactivateShields}`.
Abhängigkeit: A1 (Schildkappung).

### D. Forschung

**D1 – Forschungsabschluss: Meldung und Ereignis** (S)
Bei COMPLETED eine Mitteilung im Nachrichtenordner „Kolonien“ (oder „Systemmeldungen“) senden, dazu ein WS-Ereignis.
STU: `src/Module/Research/ResearchState.php::finish`.
Abhängigkeit: `.scratch/events-and-message-folders` (Nachrichtenordner).

**D2 – Forschungsbelohnungen** (M)
Datenfelder `rewardBuildplan`, `awardId`, `neededAward` und `databaseEntries` in den `game-data`-Techs. Belohnungsschiff an der ersten Kolonie erzeugen. Auszeichnung und Datenbankeintrag vergeben. Gate für Techs, die eine Auszeichnung erfordern.
STU: `src/Module/Research/ResearchState.php`, `src/Module/Research/TechlistRetriever.php`, `src/Orm/Entity/Research.php`.
Abhängigkeiten: D1, Bereich Spieler (Awards), Bereich Datenbank, Bereich Schiffe (Schiffserzeugung).
**NEEDS-DECISION:** Gibt es in SWU Auszeichnungen und Belohnungsschiffe?

**D3 – Forschungs-UI-Parität** (S–M)
Forschungsbilder (`researchImage`). „Erforscht am“-Datum. Folgeforschungen auch über REQUIRE_SOME. Freigeschaltete Rümpfe und Module im Detailmodal. Im Baum EXCLUDE und REQUIRE_SOME farblich unterscheiden. Prüfen, ob die Dev-Schaltfläche „Tick ausführen“ für normale Spieler verborgen ist.
STU: `src/html/view/research.twig`, `src/html/research/researchDetails.twig`, `src/Module/Admin/View/ResearchTree`.
Abhängigkeiten: keine.

**D4 – Fraktionszuordnung der Techs explizit machen** (S)
`faction` in `game-data/research/{rebels,imperials}.yaml` als Pflichtfeld. Die ID- und Namensheuristik in `isTechForFaction` entfernen. Die EXCLUDE-Richtung gegen die STU-Daten prüfen.
STU: `src/Orm/Entity/ResearchDependency.php`, `Faction::getStartResearch`.
Abhängigkeit: Daten-Repo.

**D5 – Queue- und Abbruchregeln festlegen** (S)
**NEEDS-DECISION:** STU erlaubt 1 aktive Forschung + 1 Warteslot und verwirft den Fortschritt beim Abbruch. SWU erlaubt 10 Slots mit automatischem Pfad und behält den Fortschritt. Bewusst behalten (dann ADR schreiben) oder angleichen?

### E. Kolonielimits und Abgabe

**E1 – Kolonielimits aus Forschungsdaten** (M)
`upper_limit_colony_type/amount` in den Tech-Daten statt der festen Regel „1 + Fraktionstechs, Deckel 3/3/1“. Anzeige in den Forschungsdetails. Asteroid im Dashboard ausblenden, wenn das Limit 0 ist.
STU: `src/Component/Player/ColonyLimitCalculator.php`, `ResearchRepository::getColonyTypeLimitByUser`, `src/html/maindesk/colonyLimits.twig`.
Abhängigkeiten: D4, Daten-Repo.
**NEEDS-DECISION:** Ist das heutige SWU-Limitmodell bewusst? Dann ADR schreiben statt umzubauen.

**E2 – ADR „Kolonieabgabe hinterlässt Ruine“** (S, Dokumentation)
Die Abweichungen festhalten: Ruine statt Reset an den Fallback-Nutzer, Startkolonie gesperrt, Bestätigung mit Namen, kein Status UNCOLONIZED. Die Konsequenzen für Blockierer und Verteidiger im Orbit prüfen.
STU: `src/Module/Colony/Action/GiveUp`, `src/Module/Colony/Lib/ColonyResetter.php`.
Abhängigkeiten: keine.

### F. Waren und Datenbank

**F1 – Datenbank-Warenübersicht** (M)
Endpunkt mit den Gesamtmengen des Spielers über Kolonien und Schiffe. Zweispaltige Icontabelle in `FE/database.tsx`. Klick auf eine Ware öffnet die globalen Lagerorte (bestehenden `colony-commodity-locations.service.ts` ohne Koloniebindung wiederverwenden).
STU: `src/Module/Database/View/{CommoditiesOverview,ShowCommoditiesLocations}`, `src/html/database/{commoditiesOverview,commodityLocations}.twig`.
Abhängigkeit: Bereich Datenbank (`.scratch/datenbank-statistiken`).

**F2 – Warenmodell vervollständigen** (S)
`sort`, `view`, `bound` und `npcCommodity` aus der YAML mappen. Daraus `isBeamable` und `isTradeable` ableiten, in Transfer und Handel prüfen und überall nach `sort` sortieren.
STU: `src/Orm/Entity/Commodity.php`, `src/Module/Commodity/CommodityTypeConstants.php`.
Abhängigkeiten: Bereich Handel und Transfer (Durchsetzung).

**F3 – Rangliste „Zufriedene Arbeiter“** (S)
STU: `src/Module/Database/View/SatisfiedWorkerRanking`.
Abhängigkeit: Bereich Datenbank.

### G. Größere Zusatzsysteme

**G1 – Subraumteleskop (Funktion 31)** (M; mit Scan eventuell zwei Pakete)
Funktion 31 dem „Hyperraum-Teleskop“ zuordnen. Ein Kontextpanel zeigt den Sternenkarten-Ausschnitt um das System mit Navigation. Der Teleskop-Scan eines Feldes kostet EPS (Kosten in STU prüfen).
STU: `src/Module/Colony/View/{ShowSubspaceTelescope,ShowSubspaceTelescopeScan}`, `src/html/colony/menu/telescope.twig`, `src/html/colony/{telescopeNavigation,telescopeSectionTable}.twig`, `src/html/colony/component/telescopeScan.twig`.
Abhängigkeit: Bereich Sternenkarte (Kartenausschnitt-Komponente).
**NEEDS-DECISION:** Welches Wissen gibt der Teleskop-Scan preis? Wie verhält es sich zu ADR-0002 (persönliche Systementdeckung)?

**G2 – Sektor-Scan der Kolonie mit Flugsignaturen** (M)
Erfordert ein persistentes Flugsignatur-Modell (laut Audit „keine Fakezahl“). Danach eine Kolonieansicht „Sektor-Scan“.
STU: `src/Module/Colony/View/ShowSectorScan`, `src/html/colony/component/sectorscan.twig`, `FlightSignatureRepository`.
Abhängigkeit: Bereich Schiffe/Navigation (Flugsignaturen). Dieses Paket gehört eher dorthin.

**G3 – Kolonie-Sandbox** (L, aufteilen: G3a Datenmodell und Kopie der Oberfläche, G3b Bau und Abriss in der Sandbox, G3c Produktionsvorschau)
STU: `src/Module/Colony/Action/Sandbox/CreateSandbox`, `src/Module/Colony/View/Sandbox`, `src/html/colony/sandbox/*.twig`, `ColonySandbox`-Entity. `BuildingRemovalHandler` und `PlanetFieldHost` sind polymorph.
**NEEDS-DECISION:** Ist die Sandbox gewünscht?

**G4 – Verschollene Crew und Rettungskapseln** (gehört zum Bereich Schiffe/Crew)
Link „Verschollene Crew“ in der Sozialansicht, sobald es Rettungskapseln gibt.
STU: `src/Module/Colony/View/ShowPodsLocations`, `src/html/colony/component/orphanedcrewlocations.twig`.

### Empfohlene Reihenfolge

A1 → A2/A3 → B1 → C1 → D1 → A7 → A4 → C2 → D3 → F2 → F1. Die übrigen Pakete erst nach den Produktentscheidungen (A2-, A3-, A5-, A9-Fragen, D2, D5, E1, G1, G3).

### Unsicherheiten

- Die Subagent-Prüfungen zu Werft und Forschung liefen teilweise über CodeGraph auf dem Haupt-Checkout. Wichtige Fakten wurden im Worktree nachgeprüft (Endpunkte, Tick-Ablauf, Massenmodi, Fabrikationsdaten).
- Nicht verifiziert: Rückerstattungsquote beim Abriss; Upgrade-Reaktivierungskaskade; Verbrauchsreichweite in der Info-Ansicht; Torpedo-Beamen zur Kolonie; Header-Widget-Details; ob STU Torpedos tatsächlich sofort produziert (laut Subagent ja).
