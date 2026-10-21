# STU→SWU-Paritätsinventur: Handel, Karte, Datenbank, Welt-Inhalte

Stand: 2026-10-21. Erstellt als reine Lese-Inventur, ohne Änderungen am Produktcode.

Referenzen:
- STU: `st-universe/core/src` (Module Trade, Database, Starmap, NPC, Communication/Quest, Component Trade/Database/Map/StarSystem/Anomaly/Quest/Faction, Lib Map/Pirate, Tick/Maintenance, Orm/Entity, `src/html/*`).
- SWU: `swuniverse/core` (`apps/backend/src/modules/*`, `apps/frontend/src/*`, `packages/shared`).
- Berücksichtigt: `CONTEXT.md`, `docs/adr/0002`, `docs/adr/0003`, `.scratch/stu-systemdatenbank-und-kolonie-scans`, `.scratch/grafischer-systemeintrag-nach-astrometrie`, `.scratch/stu-messpunkt-systemkartographie`, `.scratch/datenbank-statistiken`, `.scratch/alliance-stu-parity/map.md`, `stu-swu-ui-parity-audit.md`.

Legende SWU-Stand: **vollständig**, **teilweise**, **fehlt**, **geplant** (offenes Ticket in `.scratch`), **bewusst abweichend** (ADR/Spec/Glossar). Mit **(?)** markierte Einträge habe ich nicht vollständig verifiziert.

---

## 1. Übersicht

| Bereich | Einschätzung |
|---|---|
| **Handel** | **Fehlt vollständig.** SWU hat weder Handelsposten, Warenkonten, Lizenzen, Angebote, Netzwerktransfers, Basishandel, Deals, Auktionen noch Lotterie. Es gibt auch keine Stationen und kein Docking, an die STU Handelsposten bindet. Vorhanden sind nur Vorbereitungen: die Ware „Aurodium“ (umbenanntes STU-Latinum in `game-data/data/commodities/stu-commodity-map.yaml`), das Flag `isTradeOnly` an Waren, ein unbenutzter `tradeModifier` an Fraktionen, der Beziehungstyp „Handelsabkommen“ ohne Wirkung und der Hub-Platzhalter „Handelsstationen – Stationsnetz wird aufgebaut“. In `alliance-stu-parity/map.md` sind Handelsposten ausdrücklich als „späterer Integrationspunkt“ benannt. |
| **Karte** | **Grundgerüst vorhanden, Spielregeln fehlen größtenteils.** Ebenen, Sektoren, Nebel des Krieges (`ExplorationState`), Systemraster, Hyperrouten, Wurmlochanzeige, Live-Kontakte (eigene, Allianz- und Partnerschiffe), LSS-Modi und messpunktbasierte Kartographie sind umgesetzt. Es fehlen Feldtyp-Konsequenzen beim Flug (Energiekosten und Schaden je Feldtyp, Deflektor), alle Feldeffekt-Handler, Anomalien und Ionenstürme, betretbare Wurmlöcher, Regionen als spielerseitiges Konzept, Subraumspuren sowie die Overlays Territorium, Unpassierbar, Effekte und Sensorabdeckung auf der Sternenkarte. |
| **Datenbank** | **Weitgehend umgesetzt.** Vorhanden sind Schiffsrümpfe, Sternensysteme, Planeten- und Systemtypen mit Entdeckung und Prestige, der geschützte Systemeintrag mit Kolonie-Scans, sechs Ranglisten, Siedlerliste, Prestigehistorie und Statistiken. Es fehlen die Kategorien Regionen, Handelsposten, Stationsrümpfe und RPG-Schiffe, die Warenübersicht mit Lagerorten, sieben weitere Ranglisten, die Piratenrunde, die NPC-Liste und die Belohnungen für vollständige Kategorien. |
| **Welt-Inhalte** | **Fehlt nahezu vollständig.** SWU hat keine NPC-Spielerkonten (nur `ShipClassDef.isNpc`), keine Quests, keine Piraten-KI mit Zorn, Runden und Schutz und keine NPC-Werkzeuge. Die Admin-Seiten zu Schiffen und Bauplänen decken einen Teil des NPC-Schiffserstellers ab. Fraktionen: Die zwei Fraktionen statt zehn sind **bewusst abweichend** (`CONTEXT.md`). |

Ticket-Status passt nicht zum Code: `.scratch/grafischer-systemeintrag-nach-astrometrie/issues/01–03` und `.scratch/stu-systemdatenbank-und-kolonie-scans/issues/01–08` stehen noch auf `ready-for-agent`. Laut Code und Commits sind sie aber weitgehend umgesetzt, darunter `DatabaseSystemDetailPage`, `SystemRasterMap`, `SystemContextPanel`, `ColonyScans`, die Commits `b496498` und `d118865` sowie die Kartographie-Tickets (alle `resolved`). Das ist als Aufräumpaket D0 aufgenommen.

---

## 2. Feature-Tabelle

### 2.1 Handel (STU `Module/Trade`, `Component/Trade`, Spacecraft-Handelsmenü)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Handelsposten als Entität (Name, Beschreibung, Netzwerk, Level, Transferkapazität, Lager, Stationsbindung) | `Orm/Entity/TradePost.php`, `Component/Station/StationUtility.php` (Posten beim Stationsbau) | fehlt | – | Setzt Stationen voraus, die es in SWU nicht gibt (siehe Schiff/Station-Bereich). |
| Handelsposten-Info und Schiffsliste am Posten | `Trade/View/ShowTradePostInfo`, `ShowShiplist`, `html/trade/tradePostInfo.twig` | fehlt | – | |
| Postennamen ändern (Eigentümer) | `Trade/Action/ChangeTradePostName` | fehlt | – | |
| Warenkonten-Übersicht (alle Konten je Posten, freier Platz) | `Trade/View/ShowAccounts`, `Lib/TradeAccountWrapper.php`, `Lib/TradePostStorageManager.php` | fehlt | – | Zentrale Handelsseite in STU (`trade.php`). |
| Waren Schiff → Konto / Konto → Schiff | `Spacecraft/Action/TransferToAccount`, `TransferFromAccount`, `Spacecraft/View/ShowTradeMenu*` | fehlt | (Transferlogik zwischen Schiffen und Kolonien: `spacecraft/transfer.service.ts`) | Wiederverwendbar ist die Transferkosten-Logik in `transfer-cost.ts`. |
| Handelslizenz kaufen (am Posten, gegen Ware laut Lizenzbedingung) | `Ship/Action/BuyTradeLicense`, `Ship/View/ShowTradeMenuPayment` | fehlt | – | |
| Lizenzbedingungen festlegen (Ware, Menge, 1–365 Tage) | `Trade/Action/CreateLicense`, `View/ShowLicenseMenu`, `Orm/Entity/TradeLicenseInfo.php` | fehlt | – | |
| Lizenz verlängern und Lizenzliste/-info | `Trade/Action/RenewTradeLicense`, `View/ShowLicenseList`, `ShowLicenseInfo` | fehlt | – | |
| Angebot erstellen (Warentausch, bis 99 Stück, Duplikatsperre über Verhältnis, Kontoplatz) | `Trade/Action/CreateOffer`, `View/ShowOfferMenu*` | fehlt | – | Regeln: gleiche Ware verboten, kontogebundene oder nicht handelbare Ware verboten, gleichwertiges Angebot mit Verhältnis auf 2 Nachkommastellen verboten. |
| Angebot zurückziehen | `Trade/Action/CancelOffer` | fehlt | – | |
| Angebot annehmen (n-fach, Kontoplatz, verlassener Posten) | `Trade/Action/TakeOffer`, `View/ShowTakeOffer` | fehlt | – | |
| Angebotssuche (Angebot, Nachfrage, beides) und Angebote je Ware | `Trade/Action/SearchOffers/*`, `View/ShowOfferCommodity` | fehlt | – | |
| Transfer zwischen Posten im selben Netzwerk (Transferkapazität je Spieler und Posten) | `Trade/Action/TransferCommodities`, `View/ShowTransferMenu`, `Orm/Entity/TradeTransfer.php` | fehlt | – | |
| Handels-Shoutbox je Netzwerk | `Trade/Action/AddShoutBoxEntry`, `View/ShowShoutBox*` | fehlt | – | |
| Basishandel (NPC-Kurs gegen Latinum/Aurodium, Kauf −10 / Verkauf +10, Kursdiagramme, Diagrammlimit) | `Trade/Action/BasicTradeBuy`, `BasicTradeSell`, `SetBasicTradeChartLimit`, `View/ShowBasicTrade`, `Orm/Entity/BasicTrade.php` | fehlt | – | Die vorhandene SVG-Chart-Komponente `components/database/StackedAreaChart.tsx` ließe sich wiederverwenden. |
| Deals (Ferengi-Sonderangebote, Sofortkauf) | `Trade/View/ShowDeals`, `Action/DealsTakeOffer`, `Orm/Entity/Deals.php`, `NPC/Action/CreateDeal`, `Tick/Process/NewDealsInformation.php` | fehlt | – | Benötigt einen NPC-Posten (STU: `DEALS_FERG_TRADEPOST_ID=2`). |
| Deal-Auktionen (Bieten, Zuschlag abholen) | `Trade/Action/DealsBidAuction`, `DealsTakeAuction`, `Orm/Entity/AuctionBid.php` | fehlt | – | |
| Orion-Sklavenhandel / Orion-Auktion | `Trade/View/ShowOrionSlaveTrade`, `Action/OrionBidAuction`, `OrionDeleteAuction`, `Maintenance/OrionSlaveTrade.php` | fehlt | – | Inhaltlich Star-Trek-spezifisch, siehe NEEDS-DECISION. |
| Lotterie (Lose mit Latinum, Periodenende, Gewinn-Bauplan) | `Trade/View/ShowLottery`, `Action/BuyLotteryTickets`, `Lib/LotteryFacade.php`, `Maintenance/EndLotteryPeriod.php` | fehlt | – | Setzt die Ferengi-Lizenz voraus. |
| Piratenschutz mit Prestige kaufen | `Trade/Action/PirateProtection`, `Lib/Pirate/Component/PirateWrathManager::setProtectionTimeoutFromPrestige` | fehlt | – | Hängt von Piraten (W-Pakete) und Ferengi-Lizenz ab. |
| Wartung: alte Angebote und Lizenzen löschen | `Maintenance/OldTradeOffersDeletion.php`, `OldTradeLicenseDeletion.php` | fehlt | – | |
| Postenzerstörung und Kontolöschung räumen Handel ab | `Spacecraft/Lib/Destruction/Handler/TradepostDestruction.php`, `Component/Player/Deletion/Handler/TradepostDeletionHandler.php` | fehlt | – | |
| Handelsabkommen (Beziehungstyp) wirkt auf Handel | STU-Allianzbeziehungen | teilweise | `modules/alliance/*` | Beziehungstyp existiert, Handelswirkung fehlt (Integrationspunkt laut `alliance-stu-parity/map.md`). |
| Fraktions-Handelsmodifikator | – (SWU-eigen) | teilweise (?) | `faction/faction.service.ts` (`tradeModifier: 1`) | Wert ist definiert, wird aber nirgends gelesen. |

### 2.2 Karte (STU `Module/Starmap`, `Lib/Map`, `Component/Map`, `Component/Anomaly`, `Component/StarSystem`)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Ebenenauswahl | `html/view/map.twig`, `Orm/Entity/Layer.php` | teilweise | `starmap.controller.ts` `GET layers`, `starmap.service.ts#getLayers`, `pages/starmap.tsx` | STU zeigt nur Ebenen, die der Spieler kennt (`UserLayer`, `hasSeen`, 403 sonst). SWU filtert nur `isHidden`. |
| Persönlicher Nebel (erkundete Felder) | `Orm/Entity/UserMap.php`, `Starmap/Lib/ExploreableStarMap.php` | vollständig | `starmap/exploration.service.ts`, `entities/exploration-state.entity.ts`, `GET layers/:id/fields` | SWU unterscheidet TERRAIN und FULL. |
| Sektoransicht und Sektornavigation (Richtungstasten, 20 Felder je Sektor) | `Starmap/View/ShowSection`, `RefreshSection`, `Lib/MapSectionHelper.php`, `html/map/starmapSection*.twig` | teilweise | `components/starmap/StarmapControlPanel.tsx` (Sektorauswahl), `StarmapCanvas.tsx` (Zoom/Pan) | Canvas statt Sektortabelle. Tastaturnavigation nicht gefunden (?). |
| Feld per Koordinate anzeigen | `Starmap/View/ShowByPosition` | teilweise (?) | `StarmapControlPanel` „Feld anklicken“ | Direkter Koordinatensprung nicht gefunden. |
| Echtzeitkarte: eigene Schiffe, Allianzschiffe, geteilte Partnerschiffe | `Starmap/View/ShowUserStarmapRealtime` | vollständig | `spacecraft.controller` `starmap-contacts`, `shared-live-positions`, `StarmapShipOverlay.tsx`, `StarmapContactPanel.tsx` | Umgesetzt über `alliance-stu-parity` (resolved). |
| Echtzeitkarte: eigene und Allianz-Stationen | wie oben | fehlt | – | Es gibt keine Stationen. |
| Overlay Sensorabdeckung und Sensorkontakte | `ShowUserStarmapRealtime::buildSensorCoverage` | teilweise | Kontakte ja, Abdeckung nein | |
| Overlays Territorium, Unpassierbar, Feldeffekte auf der Sternenkarte | `html/view/map.twig` (Checkboxen), `Lib/Map/VisualPanel/Layer/DataProvider/Border/*` | teilweise | LSS hat `TERRITORY`/`IMPASSABLE`/`effects` (`spacecraft.service.ts` ~Z. 424, `LssMap.tsx`). Die Sternenkarte zeigt nur Raster und Schiffe. | `influence.service.ts` und `GET layers/:id/influence/...` existieren, das Frontend nutzt sie nicht. |
| Aktualisieren und Einpassen | `map.twig` | teilweise | Zoom +/− vorhanden, Kontakte aktualisieren sich automatisch (30 s / WS) | „Einpassen“-Knopf nicht gefunden (?). |
| Sternenkarte als Bild bzw. Datenexport | `Starmap/View/ShowUserStarmapImage`, `ShowUserStarmapData` | fehlt | (nur Admin-Layer-Export) | |
| Kartenzyklus (vollständig kartierte Ebene wird zu `LAYER_EXPLORED`) | `Maintenance/MapCycle.php`, `MapEnum::MAPTYPE_LAYER_EXPLORED` | fehlt | – | |
| Feldtyp-Energiekosten beim Flug | `Movement/Component/Consequence/PostFlight/DeflectorConsequence.php` (`getEnergyCosts`) | teilweise | `spacecraft.service.ts#navigate` nutzt `shipClass.flightEnergyCost × Distanz`, `flyGalaxy` verbraucht Warpantrieb. `galaxy_field_types.energyCost` wird nur angezeigt. | Regelabweichung. |
| Feldschaden und Spezialschaden, Deflektor | `DeflectorConsequence.php`, `Route/FlightRoute.php` (Warnung vor Spezialschaden), `MapFieldType.damage/x_damage*` | fehlt | `field.damage` wird nur zur Messpunktauswahl gelesen (`spacecraft.service.ts` ~Z. 665) | |
| Feldeffekt-Handler (Warp/Reaktor/EPS-Leck, Tarnung unbrauchbar, Schildstörung, NFS-Cooldown, Regenerationschance) | `Component/Map/Effects/Type/*`, `Lib/Map/FieldTypeEffectEnum.php`, `PostFlight/FieldTypeEffectConsequence.php` | fehlt | Effekte sind nur Daten: `galaxy-field-type.entity.ts#effects`, Admin-Editor `starmap-admin-fullmap/ValuePanel.tsx`, Anzeige in `FieldContextPanel.tsx` | |
| Passive Feldeffekte (LSS-Störung, versteckte/verzerrte Signaturen, keine Subraumspuren, Treffer-/Ausweichstörung, Energiewaffen ±, kein Stationsbau, kein Messpunkt, keine Piraten/Anomalien) | `FieldTypeEffectEnum` (Beschreibungen und `getFlightDestinationInfo`) | fehlt | – | Ob die Messpunktauswahl `NO_MEASUREPOINT` beachtet, ist nicht verifiziert (?). Gefiltert wird nur `damage<=0`. |
| Unpassierbare Felder | `MapFieldType.passable` | vollständig | `spacecraft.service.ts` („not passable“) | |
| Nebel (Feldtypen) | STU-Feldtypen | teilweise / bewusst (?) | Migrationen `20260907160000-grade-tactical-nebula-density`, `20260907170000-remove-tactical-nebulae` | Feldtypen sind importiert (`stu-field-types-seed.json`). Die taktische Galaxie hat Nebel entfernt. Ohne Effekt-Handler bleiben Nebel kosmetisch. |
| Regionen (Kartenregion, Verwaltungsregion, Superpower-Siedlungen) | `Orm/Entity/MapRegion.php`, `MapRegionSettlement.php`, `MapEnum::ADMIN_REGION_*` | teilweise | `entities/map-region.entity.ts`, Admin-CRUD `admin/regions`, `adminRegionKey` im LSS-Feld | Spielerseitig ohne Wirkung. |
| Regionsinfo am Feld | `Spacecraft/View/ShowRegionInfo`, `html/database/regioninfo.twig` | fehlt | – | |
| Regionskartographie | `AstronomicalEntry.region_id`, `Spacecraft/Action/AstroMapping` | bewusst abweichend (vorerst) | `STU_PRESTIGE.CARTOGRAPHY_REGION` ist definiert, aber unbenutzt | Spec `stu-messpunkt-systemkartographie`: „STU-Kartenregionen bleiben außerhalb dieses Vorhabens“. |
| Systemkartographie (Messpunkte, Finalisierung) | `Spacecraft/Action/AstroMapping`, `AstronomicalEntry`, `Flight/AstroMappingConsequence`, `PostFlightAstroMappingConsequence` | vollständig, mit dokumentierter Abweichung | `spacecraft/cartography-plan.service.ts` | ADR-0003. Crew-XP-Belohnung fehlt (Glossar). |
| Wurmlöcher anzeigen | `Orm/Entity/WormholeEntry.php` | vollständig | `wormhole.service.ts`, `StarmapCanvas.tsx` | |
| Wurmloch betreten/verlassen, Zugangsbeschränkungen | `Spacecraft/Action/EnterWormhole`, `LeaveWormhole`, `AddWormholeRestriction`, `DeleteWormholeRestriction`, `View/ShowWormholeControl*`, `WormholeRestriction.php` | fehlt | `wormhole.service.ts#findExitsAt` existiert, wird aber nicht aufgerufen | Benannter Integrationspunkt in `alliance-stu-parity/map.md`. |
| Subraumspuren (Flugsignaturen) | `Lib/Map/VisualPanel/Layer/DataProvider/Subspace/*`, `Orm/Entity/FlightSignature.php`, `Maintenance/OldFlightSignatureDeletion.php` | fehlt | `spacecraft-scan.service.ts` liefert `fadedSignatures`/`buoys` als Platzhalter | Überschneidung mit dem Schiffsbereich (Sensorik). |
| Signaturzählung je Feld (LSS) | `SpacecraftCountDataProvider*` | teilweise | `spacecraft.service.ts#countFieldSignatures` | Feldeffekte `NO_/DUBIOUS_SPACECRAFT_COUNT` fehlen. |
| Anomalie-Framework (Erzeugung, Tick, Verschwinden, Anzeige-Ebene) | `Component/Anomaly/AnomalyCreation.php`, `AnomalyHandling.php`, `Tick/Spacecraft/ManagerComponent/AnomalyProcessing.php`, `AnomalyCreationCheck.php`, `AnomalyLayerRenderer` | fehlt | `colony-environment-scan.service.ts` liefert `anomalies: []` | Bilder liegen in `st-universe/assets/anomalies`. |
| Subraumellipse (Masse-abhängig, Systemschaden) | `Component/Anomaly/Type/SubspaceEllipseHandler.php` | fehlt | – | |
| Ionensturm (Bewegung, Ausbreitung, Rumpfschaden, Schild- und Antriebsausfall) | `Component/Anomaly/Type/IonStorm/*` | fehlt | – | |
| Saisonale Anomalien (Adventstür, Osterei) | `AdventDoorHandler.php`, `EasterEggHandler.php`, `html/anomaly/*` | fehlt | – | |
| Tholianisches Netz, Bojen, Transwarp | `Ship/Action/TholianWeb`, `DropBuoy`/`TakeBuoy`, `Transwarp` | fehlt | – | Gehört eher zum Schiffsbereich, hier nur als Querverweis. |
| Sternensystemerzeugung | `Component/StarSystem/StarSystemCreation.php`, `GenerateEmptySystems.php` | vollständig / bewusst abweichend | `starmap/generator/*`, `starmap-admin.service.ts` | SWU-eigener Star-Wars-Generator mit Presets. |

### 2.3 Datenbank (STU `Module/Database`, `Component/Database`, `html/view/database.twig`)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Hub mit Gruppen (Schiffe & Stationen, Karte, Wichtige Orte, Highscores, Sonstiges) | `html/view/database.twig` | vollständig (Struktur) | `pages/database.tsx` (`groups`) | Gruppe „Schiffe & Technik“ statt „Schiffe & Stationen“. |
| Kategorie Schiffsrümpfe mit `???`-Maskierung und Entdeckung beim Scan | `DatabaseCategoryTypeEnum::SHIPRUMP`, `View/Category`, `html/database/shiprump.twig` | vollständig | `database.service.ts#getShipClasses/Detail`, `ship-class-discovery.service.ts` | NPC-Rümpfe sind ausgeschlossen (`isNpc:false`). |
| Kategorie RPG-Schiffe | `RPGSHIP` | fehlt | – | Hängt an NPC/RPG-Inhalten. |
| Kategorie Stationsrümpfe | `STATIONRUMP` | fehlt | – | Keine Stationen. `STU_PRESTIGE.SCAN_STATION_HULL` ist definiert, aber unbenutzt. |
| Kategorie Handelsposten | `TRADEPOST`, `html/database/poiinfo.twig` | fehlt (Platzhalter) | `database.tsx` „Handelsstationen – Stationsnetz wird aufgebaut“ | |
| Kategorie Regionen | `REGION`, `html/database/regioninfo.twig` | fehlt (Platzhalter) | `database.tsx` „Regionen – Kartierung wird aufgebaut“ | |
| Kategorie Planetentypen | `COLONY_CLASS`, `planettype.twig` | vollständig | `getPlanetTypes`, `celestial-class-discovery.service.ts` | |
| Kategorie Sternensystemtypen | `STAR_SYSTEM_TYPE`, `starsystemtype.twig` | vollständig | `getSystemTypes`, `system-type-discovery.service.ts` | |
| Kategorie Sternensysteme und Systemeintrag (geschützt, Raster, Kolonie-Scans) | `STARSYSTEM`, `html/database/starsystem.twig`, `View/ShowColonySurface` | vollständig (Ticket-Status veraltet) | `GET database/systems[/:id]`, `DatabaseSystemDetailPage`, `SystemRasterMap.tsx`, `ColonyScans.tsx` | ADR-0002/0003. Specs `stu-systemdatenbank-…` und `grafischer-systemeintrag-…` sind offen geführt (siehe D0). |
| Ebenenfilter in Kategorien (nur bekannte Ebenen) | `View/Category` (`getKnownByUser`) | teilweise | `database.tsx` hat ein Auswahlfeld „Kartenebene“ | Ohne Konzept „bekannte Ebenen“ (siehe K5). |
| Entdeckungspunkte je Kategorie und Prestigelog | `Lib/CreateDatabaseEntry.php`, `DatabaseCategory.points` | vollständig / bewusst abweichend | `STU_PRESTIGE.*`, `prestige.service.ts` | SWU vergibt feste Prestigewerte statt Kategoriepunkten. |
| Award bei vollständiger Kategorie (je Ebene) | `CreateDatabaseEntry::checkForCategoryCompletion`, `DatabaseCategoryAward.php` | fehlt | – | Setzt ein Award-System voraus (anderer Bereich). |
| Erfolgsmeldung „Neuer Datenbankeintrag“ | `Component/Database/AchievementManager.php` | teilweise (?) | Discovery-Services geben `prestigeAwarded` zurück | Ob eine Toast- oder Ereignismeldung erscheint, ist nicht verifiziert. |
| Rangliste: beste Entdecker | `DiscovererRating` / `topDiscover.twig` | vollständig | `rankings/discoveries` | |
| Rangliste: beste Forscher | `ResearchRanking` | vollständig | `rankings/research` | |
| Rangliste: beste RPG-Schreiber | `RpgRanking` (`knPostRepository->getRpgVotesTop10`) | fehlt | – | Holonet-Bewertungen existieren (`HOLONET_POSITIVE_RATING`), Basis wäre also vorhanden. |
| Rangliste: meistgehasste Siedler der Kazon (Piratenzorn) | `PirateWrathRanking` | fehlt | – | Hängt von Piraten ab. |
| Rangliste: Vielflieger (anonym) | `FlightRanking`, `Lib/DatabaseTopListFlights.php` | fehlt | Ein Ereigniszähler „geflogene Felder“ existiert nur aggregiert (`statistics`) | Benötigt Zählung je Spieler bzw. Schiff oder Flugsignaturen. |
| Rangliste: Ausbilder (Crew) | `CrewRanking` | vollständig | `rankings/crew-training` | |
| Rangliste: Söhne des Nagus (Latinum) | `LatinumRanking` | fehlt | – | Wäre in SWU Aurodium-Besitz (Kolonie, Schiff, Konto). |
| Rangliste: aktivste Handelsposten | `TradePostActivity`, `Lib/DatabaseTopActivTradePost.php` | fehlt | – | Hängt vom Handel ab. |
| Rangliste: Architekten / Produzenten | `ColonyWorthRanking`, `ColonyProductionWorthRanking` | vollständig | `rankings/colony-worth`, `colony-production` | |
| Rangliste: beste Arbeitgeber (zufriedene Arbeiter) | `SatisfiedWorkerRanking` | fehlt | – | Hängt vom Kolonie-Bereich ab (Zufriedenheit). |
| Spionage-Rangliste | `SpyRanking` | fehlt (?) | – | Im STU-Hub nicht verlinkt, daher niedrige Priorität. |
| Crew-Verwaltung (Datenbank → Crew) | `View/ShowCrewManagement`, `Action/DismissCrew` | fehlt (?) | – | Gehört zum Crew-Bereich, hier nur als Querverweis. |
| Piratenrunde | `View/ShowPirateRound`, `html/database/pirateRound.twig` | fehlt | – | |
| Prestigehistorie | `View/ShowPrestigeLog` | vollständig | `GET database/prestige-history` | |
| Siedlerliste | `View/UserList` | vollständig | `GET database/settlers` | |
| NPCs & Administratoren | `View/NPCList` | fehlt | – | Es gibt keine NPC-Konten. |
| Statistiken | `View/ShowStatistics`, `Lib/GraphInfo.php` | vollständig | `statistics/*`, `StatisticsView.tsx` | Spec `datenbank-statistiken` mit allen Tickets resolved. Bewusste Abweichungen: Fraktion statt NPC-Schiffe, Holonet statt KN. |
| Warenübersicht (eigene Waren aufsummiert) und Lagerorte je Ware (Schiff, Kolonie, Konto, Angebot, Torpedolager) | `View/CommoditiesOverview`, `View/ShowCommoditiesLocations`, `html/database/commoditiesOverview.twig`, `commodityLocations.twig` | fehlt | `GET database/commodities` liefert nur den statischen Katalog und wird im Frontend nicht genutzt | |
| Crew-Rassen-Moderation | `ModerateCrewRace`, `UpdateCrewRaceModeration` | nicht relevant | – | Admin- und Feature-Flag-Funktion. |
| History-Events-Karte im Hub | `database.twig` `HISTORY_EVENT_MAP` | fehlt (?) | – | Querverweis auf den History-Bereich. |

### 2.4 Welt-Inhalte: NPC, Quests, Piraten, Fraktionen

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| NPC-Spielerkonten (ID < 100, `isNpc`) | `User::isNpc`, `UserConstants` | fehlt | Nur `ShipClassDef.isNpc` | Grundlage für Quests, Deals, Piraten und NPC-Liste. |
| NPC-Übersicht, Einstellungen, Log | `NPC/View/Overview`, `ShowNPCSettings`, `NPCLog`, `Orm/Entity/NPCLog.php` | fehlt | – | |
| NPC-Schiffsersteller und Bauplan-Ersteller | `NPC/View/ShowShipCreator`, `ShowBuildplanCreator`, `ShowMemberRumpInfo` | teilweise | `pages/admin-ships.tsx`, `spacecraft.controller` `admin/buildplans`, `admin/spawn` | Nur für Admins, nicht für NPC-Rollen. |
| NPC-Spielerliste und Spielerdetails | `NPC/View/ShowPlayerList`, `ShowPlayerDetails` | teilweise | `pages/admin-users.tsx` | |
| NPC-Werkzeuge | `NPC/View/ShowTools` | fehlt (?) | – | Inhalt nicht im Detail geprüft. |
| Quests anlegen, beenden, Log (NPC) | `NPC/Action/CreateNPCQuest`, `EndNPCQuest`, `AddQuestLogEntry`, `View/ShowNPCQuests`, `Orm/Entity/NPCQuest*.php` | fehlt | – | Quest hat Fraktionsfilter, Prestige-, Waren-, Schiffs- und Award-Belohnung, Bewerbungsfrist, Freigabepflicht, Teilnehmermaximum und RPG-Plot. |
| Quest-Teilnehmer einladen, ausschließen, Bewerbung annehmen oder ablehnen (NPC) | `NPC/Action/InviteQuestUsers`, `ExcludeQuestUsers`, `AcceptQuestApplication`, `RejectQuestApplication` | fehlt | – | |
| Quests spielerseitig: Liste, Detail, Bewerbung, Einladung annehmen oder ablehnen, Belohnung mit Koloniewahl abholen | `Communication/View/ShowQuestList`, `ShowQuest`, `ShowQuestColonySelection`, `Action/ApplyForQuest`, `AcceptQuestInvitation`, `RejectQuestInvitation`, `ClaimQuestReward`, `Game/Lib/View/Provider/MaindeskProvider.php` | fehlt | – | Maindesk-Hinweis inklusive. |
| Piraten-Erzeugung und -Setup (Baupläne, Flotten) | `Lib/Pirate/PirateCreation.php`, `Orm/Entity/PirateSetup*.php` | fehlt | – | |
| Piraten-Tick mit Verhalten (fliegen, verstecken, Freund suchen, Kolonie ausrauben, angreifen, Rage, Unterstützung rufen, Phalanx angreifen, Alarm Rot, Schilde senken) | `Module/Tick/Pirate/*`, `Lib/Pirate/Behaviour/*`, `Lib/Pirate/Component/*` | fehlt | – | |
| Piraten-Reaktionen (auf Angriff, Scan, Abfangen, Traktor, Beamen) | `Lib/Pirate/PirateReaction.php`, `PirateReactionTriggerEnum.php` | fehlt | – | |
| Piratenzorn je Spieler (500–2000, Abbau in der Wartung, Schutz-Timeout) | `Lib/Pirate/Component/PirateWrathManager.php`, `Maintenance/PirateWrathDecreaser.php`, `Orm/Entity/PirateWrath.php` | fehlt | – | |
| Piratenrunde (Start, Ende, Prestige-Pool, Fraktionssieger, Spielerbeitrag) | `Maintenance/BeginPirateRound.php`, `Tick/Process/EndPirateRound.php`, `PirateRound.php`, `UserPirateRound.php` | fehlt | – | Nutzt Superpower-Verwaltungsregionen. |
| Feldeffekt „Keine Piraten“ | `FieldTypeEffectEnum::NO_PIRATES` | teilweise | nur Admin-Editor | |
| Fraktionen (10 spielbar bzw. NPC, wählbar, Spielerlimit, Startforschung, Startgebäude, Startfeld, Willkommensnachricht, Nahkampfwert, Warenboni) | `Orm/Entity/Faction.php`, `Component/Faction/FactionEnum.php`, `Module/Index/Action/Register` | bewusst abweichend / teilweise | `modules/faction/*` (2 Fraktionen, Farben, Heimatzone, Starterschiff, Multiplikatoren), `pages/onboarding.tsx` | Glossar: genau Rebellenallianz und Imperium. Spielerlimit, Willkommensnachricht und Warenboni fehlen (siehe F1). |

---

## 3. Vorgeschlagene Arbeitspakete

Größen: **S** = klein, **M** = ein Agentendurchlauf, **L** wird immer in Teilpakete geteilt. Ein Paket umfasst jeweils Backend, Frontend und Tests.

### D: Datenbank

**D0 – Ticketstatus der Systemdatenbank-Specs abgleichen (S)**
- Beschreibung: Für `.scratch/stu-systemdatenbank-und-kolonie-scans/issues/01–08` und `.scratch/grafischer-systemeintrag-nach-astrometrie/issues/01–03` gegen Code und Tests prüfen, ob die Akzeptanzkriterien erfüllt sind. Danach den Status auf `resolved` setzen oder Restlücken als Kommentar festhalten. Vorher keine neuen Tickets in diesem Bereich anlegen.
- STU: –. Abhängigkeiten: keine.

**D1 – Warenübersicht und Lagerorte je Ware (M)**
- Beschreibung: Neuer Hub-Eintrag „Warenübersicht“ unter „Sonstiges“. Er zeigt alle eigenen Waren, aufsummiert über Kolonien und Schiffe (später auch Handelskonten, Angebote und Torpedolager). Ein Klick auf eine Ware listet ihre Lagerorte mit Links zu Kolonie bzw. Schiff.
- STU: `Module/Database/View/CommoditiesOverview`, `ShowCommoditiesLocations`, `html/database/commoditiesOverview.twig`, `commodityLocations.twig`, `Lib/StorageWrapper.php`.
- Abhängigkeiten: keine. Bekommt Erweiterungspunkte für T3 (Konten) und T4 (Angebote).

**D2 – Fehlende Ranglisten ohne Fremdabhängigkeit (M)**
- Beschreibung: „Die 10 bestbewerteten RPG-Schreiber“ auf Basis der Holonet-Bewertungen und „Die 10 Söhne des Nagus“ als Aurodium-Besitz (Kolonie- und Schiffslager, später Konten). Dazu die Hub-Gliederung „Siedler / Schiffe (anonym) / Handel / Kolonien“ wie in STU.
- STU: `Database/View/RpgRanking`, `LatinumRanking`, `html/database/highscores/topRpg.twig`, `topLatinum.twig`.
- Abhängigkeiten: Holonet-Bewertungen (vorhanden).
- NEEDS-DECISION: Zählt das RPG-Ranking alle Holonet-Beiträge oder nur RPG-markierte? SWU kennt kein RPG-Flag (?).

**D3 – Vielflieger-Rangliste (S)**
- Beschreibung: Geflogene Felder je Schiff bzw. Spieler zählen (an `FLOWN_FIELDS_EVENT` in `flyGalaxy`/`navigate` anbinden) und eine anonyme Top-10-Liste zeigen.
- STU: `Database/View/FlightRanking`, `Lib/DatabaseTopListFlights.php`, `Maintenance/TopFlightsReward.php`.
- Abhängigkeiten: alternativ K9 (Flugsignaturen).
- NEEDS-DECISION: Eigener Zähler oder Ableitung aus Flugsignaturen (K9)? Soll die STU-Wartungsbelohnung `TopFlightsReward` übernommen werden?

**D4 – Datenbankkategorie Regionen (S)**
- Beschreibung: Aus dem Platzhalter wird eine Kategorie mit `???`-Maskierung. Regionsbeschreibungen kommen aus `map_region`. Entdeckt wird zunächst beim Betreten eines Regionsfelds; mit K8b durch Regionskartographie.
- STU: `DatabaseCategoryTypeEnum::REGION`, `html/database/regioninfo.twig`, `Orm/Entity/MapRegion.php`.
- Abhängigkeiten: K8a.
- NEEDS-DECISION: Was erzeugt den Regions-Datenbankeintrag (Betreten oder Regionskartographie)?

**D5 – Award bei vollständiger Kategorie (M)**
- Beschreibung: Ist eine Datenbankkategorie (optional je Ebene) vollständig entdeckt, wird ein Award vergeben. Dazu eine Meldung „Neuer Datenbankeintrag“.
- STU: `Module/Database/Lib/CreateDatabaseEntry.php`, `Orm/Entity/DatabaseCategoryAward.php`, `Component/Database/AchievementManager.php`.
- Abhängigkeiten: Award-System (anderer Bereich).
- NEEDS-DECISION: Gibt es Awards in SWU? Falls nein, Ersatz durch Prestige-Bonus?

**D6 – Kategorien Stationsrümpfe und Handelsposten (S)**
- Beschreibung: Datenbankkategorien analog zu Schiffsrümpfen bzw. als POI-Liste.
- STU: `STATIONRUMP`, `TRADEPOST`, `poiinfo.twig`.
- Abhängigkeiten: Stationen (Schiff/Station-Bereich), T1.

**D7 – NPC- & Admin-Liste (S)**
- STU: `Database/View/NPCList`, `html/database/npcList.twig`.
- Abhängigkeiten: W1.

### K: Karte

**K1 – Feldtyp-Flugkosten und Feldschaden mit Deflektor (M)**
- Beschreibung: Jeder Flugschritt verbraucht `energyCost` des Ziel-Feldtyps. Feldschaden trifft den Deflektor bzw. die Schilde, bei Ausfall den Rumpf. Spezialschaden beschädigt ein Schiffssystem. Die Routenplanung warnt vor gefährlichen Feldern.
- STU: `Spacecraft/Lib/Movement/Component/Consequence/PostFlight/DeflectorConsequence.php`, `Route/FlightRoute.php`, `Orm/Entity/MapFieldType.php`.
- Abhängigkeiten: Schiffssysteme und Schaden (Schiffsbereich).
- NEEDS-DECISION: Ersetzt der Feldtyp-Wert `shipClass.flightEnergyCost`, oder gilt die Summe? Bisherige SWU-Abweichung bewusst?

**K2 – Feldeffekte, Teil 1: Lecks und Ausfälle (M)**
- Beschreibung: Handler für `WARPDRIVE_LEAK`, `REACTOR_LEAK`, `EPS_LEAK`, `CLOAK_UNUSEABLE`, `SHIELD_MALFUNCTION`, `NFS_MALFUNCTION_COOLDOWN` und `REGENERATION_CHANCE`, beim Einflug und je Tick. Dazu Zielhinweise vor dem Flug.
- STU: `Component/Map/Effects/EffectHandling.php`, `Effects/Type/*`, `Lib/Map/FieldTypeEffectEnum.php`, `PostFlight/FieldTypeEffectConsequence.php`.
- Abhängigkeiten: K1 (Flugpipeline).

**K3 – Feldeffekte, Teil 2: Sensorik und Kampf (M)**
- Beschreibung: `LSS_MALFUNCTION`, `NO_SPACECRAFT_COUNT`, `DUBIOUS_SPACECRAFT_COUNT`, `NO_SUBSPACE_LINES`, `HIT_CHANCE_INTERFERENCE`, `EVADE_CHANCE_INTERFERENCE`, `ENERGY_WEAPON_BUFF/NERF`, `NO_MEASUREPOINT` (Messpunktauswahl in `spacecraft.service.ts`) und `NO_STATION_CONSTRUCTION`.
- STU: wie K2, außerdem `Lib/Map/VisualPanel/Layer/DataProvider/Spacecraftcount/*`.
- Abhängigkeiten: Kampfbereich (`combat.service.ts`), K9 für Subraumspuren.

**K4 – Overlays der Sternenkarte (M)**
- Beschreibung: Umschalter für Territorium/Einfluss (`GET layers/:id/influence`, Allianzfarbe laut `alliance-stu-parity` Ticket 06), Unpassierbar, Feldeffekte und Sensorabdeckung. Dazu die Knöpfe „Einpassen“ und „Aktualisieren“.
- STU: `html/view/map.twig`, `Starmap/View/ShowUserStarmapRealtime.php` (`buildSensorCoverage`), `Lib/Map/VisualPanel/Layer/DataProvider/Border/*`.
- Abhängigkeiten: keine (Einfluss-Service ist vorhanden).

**K5 – Ebenen-Kenntnis und Kartenzyklus (M)**
- Beschreibung: Je Spieler bekannte Ebenen (`UserLayer`) einführen. Die Ebenen-API und die Datenbank-Ebenenfilter zeigen nur noch bekannte Ebenen. Ist eine Ebene vollständig kartiert, wechselt sie in den Status „explored“.
- STU: `Orm/Entity/UserLayer.php`, `Starmap/View/ShowSection::hasSeen`, `Maintenance/MapCycle.php`, `MapEnum`.
- Abhängigkeiten: keine.
- NEEDS-DECISION: Wie wird eine Ebene bekannt (Start, Wurmloch, Quest)? Soll der Zyklus den persönlichen Nebel der Ebene wieder zurücksetzen (Neuerkundung) wie in STU?

**K6 – Sternenkarte als Bild exportieren (S)**
- STU: `Starmap/View/ShowUserStarmapImage`, `ShowUserStarmapData`.
- Abhängigkeiten: keine. Niedrige Priorität.

**K7 – Wurmloch betreten und verlassen, Zugangsbeschränkungen (M)**
- Beschreibung: Am Wurmlocheingang kann ein Schiff die Ebene bzw. Position wechseln. Beschränkungen sind je Spieler, Allianz oder Fraktion möglich und werden über die zentrale Beziehungsauflösung geprüft.
- STU: `Spacecraft/Action/EnterWormhole`, `LeaveWormhole`, `AddWormholeRestriction`, `DeleteWormholeRestriction`, `View/ShowWormholeControl*`, `Orm/Entity/WormholeRestriction.php`, `Component/Map/WormholeEntryTypeEnum.php`.
- Abhängigkeiten: `wormhole.service.ts#findExitsAt`, Allianz-Beziehungsauflösung (vorhanden), K5 (Ebene wird bekannt).
- NEEDS-DECISION: Wer verwaltet die Beschränkungen in SWU? In STU der Stationsbetreiber, und SWU hat keine Stationen.

**K8a – Regionsinfo am Feld (S)**
- Beschreibung: Feldkontext und LSS zeigen Karten- und Verwaltungsregion mit Beschreibung an.
- STU: `Spacecraft/View/ShowRegionInfo`, `html/database/regioninfo.twig`.
- Abhängigkeiten: keine.

**K8b – Regionskartographie (M)**
- Beschreibung: Messpunkt-Kartographie für Regionen, analog zu ADR-0003, mit `STU_PRESTIGE.CARTOGRAPHY_REGION` = 5.
- STU: `AstronomicalEntry.region_id`, `Spacecraft/Action/AstroMapping`.
- Abhängigkeiten: K8a, `cartography-plan.service.ts`.
- NEEDS-DECISION: Bisher bewusst ausgeschlossen. Soll es aufgenommen werden (neue ADR)?

**K9 – Subraumspuren und Flugsignaturen (M)**
- Beschreibung: Flugsignaturen bei der Bewegung speichern, im LSS als Subraumspuren-Ebene anzeigen (eigene, Allianz und allgemein), in der Wartung löschen und `fadedSignatures` füllen.
- STU: `Orm/Entity/FlightSignature.php`, `Lib/Map/VisualPanel/Layer/DataProvider/Subspace/*`, `Render/SubspaceLayerRenderer.php`, `Maintenance/OldFlightSignatureDeletion.php`.
- Abhängigkeiten: Schiffsbereich (Sensorik, Tarnung).

**K10a – Anomalie-Framework mit Subraumellipse (M)**
- Beschreibung: Entität Anomalie (Typ, Ort, Restticks, Daten, Eltern/Kinder), Erzeugungsprüfung und Verarbeitung im Haupttick, Anzeige im LSS bzw. Feldkontext und Assets. Erster Typ ist die Subraumellipse.
- STU: `Component/Anomaly/*`, `Orm/Entity/Anomaly.php`, `AnomalyType.php`, `Tick/Spacecraft/ManagerComponent/AnomalyProcessing.php`, `AnomalyCreationCheck.php`, `PostFlight/AnomalyConsequence.php`, Assets `st-universe/assets/anomalies`.
- Abhängigkeiten: Tick (`tick.service.ts`), Schiffsschaden.

**K10b – Ionensturm (M)**
- Beschreibung: Ausbreitung, Bewegung und Intensität. Schiffe im Sturm erhalten Rumpfschaden, Schildausfall und Antriebsausfall; beim Einflug 20 % Schaden.
- STU: `Component/Anomaly/Type/IonStorm/*`.
- Abhängigkeiten: K10a.

**K10c – Saisonale Anomalien (S)**
- STU: `AdventDoorHandler.php`, `EasterEggHandler.php`, `html/anomaly/*`.
- Abhängigkeiten: K10a.
- NEEDS-DECISION: Gewünscht? Belohnungen dafür?

### T: Handel

Querschnitts-Voraussetzung: STU bindet Handelsposten an Stationen und den Kontenzugriff an angedockte bzw. im selben Feld befindliche Schiffe. SWU hat weder Stationen noch Docking.

NEEDS-DECISION (übergreifend):
- (a) NPC-Handelsposten als eigene Feldobjekte vorab einführen und spielerbetriebene Posten später an Stationen binden?
- (b) Handelsnetzwerke je Fraktion, je Region oder frei?
- (c) Zahlungsmittel Aurodium bestätigen?

**T1 – Handels-Domänenmodell und NPC-Handelsposten (M)**
- Beschreibung: Entitäten für Handelsposten (Name, Beschreibung, Netzwerk, Transferkapazität, Lagerlimit, Ort, Eigentümer), Warenkonto je Spieler und Posten, Lizenz, Lizenzbedingung, Angebot und Transfer, mit Migration und Seed einiger NPC-Posten. Dazu eine schreibgeschützte Seite `/trade` mit Postenliste und eigenen Konten sowie Posteninfo inklusive Schiffen vor Ort.
- STU: `Orm/Entity/TradePost.php`, `TradeLicense*.php`, `TradeOffer.php`, `TradeTransfer.php`, `Storage.php`, `Trade/View/ShowAccounts`, `ShowTradePostInfo`, `ShowShiplist`, `Lib/TradeAccountWrapper.php`, `TradePostStorageManager.php`.
- Abhängigkeiten: W1 (Eigentümer der NPC-Posten).

**T2 – Lizenzen: Bedingungen, Kauf, Verlängerung, Ablauf (M)**
- Beschreibung: Der Eigentümer legt Ware, Menge und Dauer (1–365 Tage) fest. Ein Schiff am Posten kauft bzw. verlängert eine Lizenz aus dem Schiffslager oder dem Konto. Abgelaufene Lizenzen werden in der Wartung gelöscht. Lizenzliste und Lizenzinfo.
- STU: `Trade/Action/CreateLicense`, `RenewTradeLicense`, `View/ShowLicense*`, `Ship/Action/BuyTradeLicense`, `Ship/View/ShowTradeMenuPayment`, `Maintenance/OldTradeLicenseDeletion.php`.
- Abhängigkeiten: T1.

**T3 – Warenkonto ↔ Schiff (M)**
- Beschreibung: Handelsmenü im Schiffsdetail, wenn das Schiff auf dem Postenfeld steht. Waren ins Konto und aus dem Konto übertragen, mit Lizenzprüfung, Kontolimit und Transferenergie. Erweitert D1 um Kontenbestände.
- STU: `Spacecraft/Action/TransferToAccount`, `TransferFromAccount`, `Spacecraft/View/ShowTradeMenu`, `ShowTradeMenuTransfer`.
- Abhängigkeiten: T1, T2, `transfer.service.ts`/`transfer-cost.ts`.
- NEEDS-DECISION: Feld-Kopräsenz oder Docking als Voraussetzung?

**T4a – Angebote erstellen, auflisten und zurückziehen (M)**
- Beschreibung: Regeln aus STU übernehmen: keine gleiche Ware, Mengen ≥ 1, höchstens 99 Angebote, Kürzung auf den Bestand, Sperre für gleichwertige Angebote, Kontoplatz, Sperre bei verlassenem Posten. Waren gehen in eine Angebotsreserve.
- STU: `Trade/Action/CreateOffer`, `CancelOffer`, `View/ShowOfferMenu*`.
- Abhängigkeiten: T3.

**T4b – Angebote annehmen und suchen (M)**
- Beschreibung: n-fache Annahme mit Kontoplatzprüfung. Suche nach Angebot, Nachfrage oder beidem und Angebote je Ware. Benachrichtigung des Anbieters über eine Ereignis- oder Handelsnachricht.
- STU: `Trade/Action/TakeOffer`, `SearchOffers/*`, `View/ShowTakeOffer`, `ShowOfferCommodity`, `Maintenance/OldTradeOffersDeletion.php`.
- Abhängigkeiten: T4a, Nachrichtenordner (`messaging/message-folder.ts`).

**T5 – Transfers im Handelsnetzwerk (S)**
- Beschreibung: Kontowaren an einen anderen Posten desselben Netzwerks senden, begrenzt durch die Transferkapazität je Spieler, Posten und Zeitraum sowie den Zielplatz.
- STU: `Trade/Action/TransferCommodities`, `View/ShowTransferMenu`.
- Abhängigkeiten: T3.

**T6 – Handels-Shoutbox je Netzwerk (S)**
- STU: `Trade/Action/AddShoutBoxEntry`, `View/ShowShoutBox*`, `Orm/Entity/TradeShoutbox.php`.
- Abhängigkeiten: T1.

**T7 – Basishandel mit Kursdiagramm (M)**
- Beschreibung: Am NPC-Posten Waren gegen Aurodium kaufen oder verkaufen. Der Kurs verschiebt sich je Handel um −10 bzw. +10, mit Schutz gegen einen zwischenzeitlich geänderten Kurs. Diagramm der letzten Kurse mit einstellbarem Limit.
- STU: `Trade/Action/BasicTradeBuy`, `BasicTradeSell`, `SetBasicTradeChartLimit`, `View/ShowBasicTrade`, `Lib/BasicTradeAccountWrapper.php`, `TradeEnum`.
- Abhängigkeiten: T3, `StackedAreaChart.tsx` (oder ein einfaches Liniendiagramm).
- NEEDS-DECISION: Startkurse und Warenliste?

**T8a – Deals: Sofortangebote des NPC-Händlers (M)**
- STU: `Trade/View/ShowDeals`, `Action/DealsTakeOffer`, `NPC/Action/CreateDeal`, `Tick/Process/NewDealsInformation.php`, `Orm/Entity/Deals.php`, `Lib/DealAccountWrapper.php`.
- Abhängigkeiten: T3, W1.
- NEEDS-DECISION: Welche SWU-Entsprechung für die Ferengi (z. B. Hutten oder Handelsföderation)? Können Deals auch Schiffe oder Baupläne enthalten?

**T8b – Deal-Auktionen (M)**
- STU: `Trade/Action/DealsBidAuction`, `DealsTakeAuction`, `Orm/Entity/AuctionBid.php`.
- Abhängigkeiten: T8a.

**T9 – Lotterie (S)**
- STU: `Trade/View/ShowLottery`, `Action/BuyLotteryTickets`, `Lib/LotteryFacade.php`, `Maintenance/EndLotteryPeriod.php`, `Orm/Entity/LotteryTicket.php`, `LotteryWinnerBuildplan.php`.
- Abhängigkeiten: T8a (Lizenz beim NPC-Händler).
- NEEDS-DECISION: Gewünscht?

**T10 – Orion-Sklavenhandel bzw. -Auktion (M)**
- STU: `Trade/View/ShowOrionSlaveTrade`, `Action/OrionBidAuction`, `OrionDeleteAuction`, `Maintenance/OrionSlaveTrade.php`, `Orm/Entity/OrionAuction*.php`.
- NEEDS-DECISION: Streichen (Star-Trek-spezifisch, inhaltlich heikel) oder als SWU-Äquivalent umsetzen? Empfehlung: bewusst abweichend dokumentieren.

**T11 – Handelsranglisten, Kontolöschung und Postenzerstörung (S)**
- Beschreibung: Rangliste „Die 10 aktivsten Handelsposten“. Aurodium aus Konten fließt in die Rangliste aus D2 ein. Bei Kontolöschung bzw. Postenverlust werden Konten, Angebote und Lizenzen bereinigt.
- STU: `Database/View/TradePostActivity`, `Lib/DatabaseTopActivTradePost.php`, `Component/Player/Deletion/Handler/TradepostDeletionHandler.php`, `Spacecraft/Lib/Destruction/Handler/TradepostDestruction.php`.
- Abhängigkeiten: T4b, D2.

**T12 – Spielerbetriebene Handelsposten an Stationen (L, aufteilen sobald Stationen existieren)**
- Beschreibung: Stationsbau erzeugt einen Posten; Postennamen ändern; Level, Kapazität und Lager; Dock-PM-Autolesen.
- STU: `Component/Station/StationUtility.php`, `Trade/Action/ChangeTradePostName`, `Station/Action/ToggleDockPmAutoRead`.
- Abhängigkeiten: Stationen und Docking (Schiff/Station-Bereich), T1–T5.

**T13 – Wirkung des Handelsabkommens und des Fraktions-Handelsmodifikators (S)**
- Beschreibung: Lizenzrabatt bzw. -freiheit für Partner mit Handelsabkommen über die zentrale Beziehungsauflösung. `tradeModifier` wirkt auf Basishandelskurse.
- Abhängigkeiten: T2, T7.
- NEEDS-DECISION: Welche konkrete Wirkung? STU bindet das Handelsabkommen nicht direkt an Handel (?), es wäre also eine SWU-Erweiterung.

### W: Welt-Inhalte

**W1 – NPC-Spielerkonten (M)**
- Beschreibung: Flag `isNpc` am Benutzer (bzw. reservierter ID-Bereich) und NPC-Berechtigung. NPCs werden aus Ranglisten, Statistiken, Siedlerliste und Entdeckungs-Prestige ausgeschlossen. Seed der System-NPCs (Händler, Piraten).
- STU: `User::isNpc`, `UserConstants`, `Module/Database/Lib/CreateDatabaseEntry.php` (Prestige nur für Nicht-NPC), `Database/View/NPCList`.
- Abhängigkeiten: `auth/user.entity.ts`, `statistics/statistic-metrics.ts`, `database.service.ts`.

**W2 – NPC-Werkzeuge (M)**
- Beschreibung: NPC-Bereich mit Übersicht, Einstellungen, NPC-Log und Spielerliste bzw. -details. Schiffs- und Bauplanersteller für NPC-Rollen, dafür die Admin-Funktionen aus `admin-ships.tsx` und `admin/buildplans` wiederverwenden.
- STU: `Module/NPC/View/*`, `Orm/Entity/NPCLog.php`.
- Abhängigkeiten: W1.

**W3 – Quests NPC-seitig (M)**
- Beschreibung: Datenmodell Quest, Teilnehmer und Log. Quest erstellen mit Fraktionen, Belohnungen (Prestige, Waren, Schiffe, Award), Bewerbungsfrist, Freigabepflicht und Teilnehmermaximum. Einladen, Ausschließen, Bewerbungen annehmen oder ablehnen, Logeinträge schreiben, Quest beenden.
- STU: `NPC/Action/CreateNPCQuest`, `EndNPCQuest`, `AddQuestLogEntry`, `InviteQuestUsers`, `ExcludeQuestUsers`, `AcceptQuestApplication`, `RejectQuestApplication`, `NPC/View/ShowNPCQuests`, `Orm/Entity/NPCQuest*.php`, `Component/Quest/QuestUserModeEnum.php`.
- Abhängigkeiten: W1.
- NEEDS-DECISION: Quests an einen RPG-Plot binden (STU `plot_id`)? SWU hat Holonet, aber keine Plots (?).

**W4 – Quests spielerseitig (M)**
- Beschreibung: Questliste und Detail, Bewerbung mit allen STU-Fehlerfällen, Einladung annehmen oder ablehnen, Belohnung mit Koloniewahl abholen, Hinweis auf dem Dashboard.
- STU: `Communication/View/ShowQuestList`, `ShowQuest`, `ShowQuestColonySelection`, `Communication/Action/ApplyForQuest`, `AcceptQuestInvitation`, `RejectQuestInvitation`, `ClaimQuestReward`, `Game/Lib/View/Provider/MaindeskProvider.php`.
- Abhängigkeiten: W3, Dashboard.

**W5 – Piraten-Grundlagen: NPC-Fraktion, Setup, Spawn, Zorn (M)**
- Beschreibung: Piraten-NPC, Setups mit Bauplänen und Spawn-Logik. Zorn je Spieler (Standard 1000, Bereich 500–2000), Erhöhung durch Auslöser, Abbau in der Wartung.
- STU: `Lib/Pirate/PirateCreation.php`, `Lib/Pirate/Component/PirateWrathManager.php`, `Maintenance/PirateWrathDecreaser.php`, `Orm/Entity/PirateSetup*.php`, `PirateWrath.php`.
- Abhängigkeiten: W1, Schiffsbaupläne.
- NEEDS-DECISION: SWU-Entsprechung der Kazon (z. B. Schwarze Sonne oder Piratenbanden)?

**W6a – Piraten-Tick: Bewegung (M)**
- Beschreibung: Verhalten FLY, HIDE, SEARCH_FRIEND und DO_NOTHING mit Wahrscheinlichkeiten, sichere Flugroute, Fallenerkennung, EPS nachladen, Feldeffekt `NO_PIRATES`.
- STU: `Module/Tick/Pirate/*`, `Lib/Pirate/Behaviour/FlyBehaviour.php`, `HideBehaviour.php`, `SearchFriendBehaviour.php`, `Lib/Pirate/Component/PirateFlight.php`, `PirateNavigation.php`, `SafeFlightRoute.php`, `TrapDetection.php`, `MoveOnLayer.php`, `ReloadMinimalEps.php`.
- Abhängigkeiten: W5, K3 (`NO_PIRATES` als Teil der Effektliste).

**W6b – Piraten-Tick: Aggression (M)**
- Beschreibung: Verhalten ATTACK_SHIP, RUB_COLONY, ASSAULT_PHALANX, RAGE, CALL_FOR_SUPPORT, GO_ALERT_RED und DEACTIVATE_SHIELDS. Zielwahl gewichtet nach Zorn.
- STU: `Lib/Pirate/Behaviour/*` (übrige), `Lib/Pirate/Component/PirateAttack.php`.
- Abhängigkeiten: W6a, Kampfbereich (`combat.service.ts`, Koloniebeschuss).

**W7 – Piraten-Reaktionen (M)**
- Beschreibung: Reaktionen auf Angriff, Scan, Abfangen (vorher und nachher), Unterstützungsruf, Rage, Traktor und Beamen, jeweils mit Zornänderung.
- STU: `Lib/Pirate/PirateReaction.php`, `PirateReactionMetadata.php`, `PirateReactionTriggerEnum.php`.
- Abhängigkeiten: W6b. Hooks in Scan, Intercept und Transfer (`spacecraft-scan.service.ts`, `hyperdrive-disruption.service.ts`, `transfer.service.ts`).

**W8 – Piratenrunde mit Datenbankansicht und Zorn-Rangliste (M)**
- Beschreibung: Rundenstart und -ende mit Prestige-Pool, Spielerbeitrag (zerstörte Schiffe, Prestige) und Fraktionssieger. Datenbankansicht „Piraten-Runde“ und Rangliste „meistgehasste Siedler“.
- STU: `Maintenance/BeginPirateRound.php`, `Tick/Process/EndPirateRound.php`, `Lib/Pirate/Component/PirateRoundManager.php`, `Database/View/ShowPirateRound`, `PirateWrathRanking`, `Orm/Entity/PirateRound.php`, `UserPirateRound.php`.
- Abhängigkeiten: W6b, Verwaltungsregionen (K8a bzw. Admin-Regionen).

**W9 – Piratenschutz gegen Prestige (S)**
- Beschreibung: Mindestens 1 Prestige einsetzen, um einen Schutz-Timeout zu setzen.
- STU: `Trade/Action/PirateProtection`, `PirateWrathManager::setProtectionTimeoutFromPrestige`, `Lib/Pirate/Component/PirateProtection.php`.
- Abhängigkeiten: W5. In STU ist zusätzlich die Lizenz beim NPC-Händler nötig (T8a).
- NEEDS-DECISION: Lizenz als Voraussetzung beibehalten?

**F1 – Fraktionsattribute ergänzen (S)**
- Beschreibung: Wählbarkeit bzw. Spielerlimit je Fraktion, Willkommensnachricht nach Wahl, Startforschung und Startgebäude als Daten, Prüfung ob die vorhandenen Multiplikatoren tatsächlich wirken.
- STU: `Orm/Entity/Faction.php`, `Module/Index/Action/Register/Register.php`, `Component/Faction/FactionEnum.php`.
- Abhängigkeiten: Onboarding (`pages/onboarding.tsx`, `modules/onboarding`).
- NEEDS-DECISION: Spielerlimit bzw. Balancing-Sperre bei Fraktionsungleichgewicht gewünscht? Die Zahl der Fraktionen bleibt bewusst bei zwei.

---

## Empfohlene Reihenfolge (grob)

1. D0, D1, K4, K8a: sofort umsetzbar, ohne Fremdabhängigkeit.
2. K1 → K2 → K3: Flugregeln, Voraussetzung für Anomalien und Piraten.
3. W1: NPC-Konten, Voraussetzung für Handel mit NPC-Posten, Quests und Piraten.
4. Klärung der Handels-NEEDS-DECISIONs, danach T1 → T2 → T3 → T4a → T4b → T5/T6/T7 → T8a/T8b → T11.
5. K10a/K10b, K5, K7, K9.
6. W3/W4 (Quests), W5–W9 (Piraten).
7. T12 und D6 erst nach Einführung von Stationen und Docking (Schiff/Station-Bereich).
