# Abgleich Handel, Sternenkarte, Datenbank, Welt-Inhalte (2026-11-17)

Prüfgrundlage: STU `st-universe/core/src` (Templates, Views, Actions, `Public/static/js/userStarmap.js`) gegen den aktuellen SWU-Code (`apps/frontend/src`, `apps/backend/src/modules`, `packages/shared`). Den Ticketstatus habe ich nicht übernommen, sondern im Code nachgeprüft. Pfade ohne Präfix: STU = `st-universe/core/src/…`, SWU = `swuniverse/core/…`.

## Zusammenfassung

Funktional ist der Handel weitgehend vollständig. Es gibt Warenkonten, Lizenzen (Kauf, Verlängerung, Bedingungen), Tauschangebote (erstellen, suchen, annehmen, zurückziehen), Netztransfers, Basishandel mit Kursdiagramm, Hutten-Deals mit Auktionen, Lotterie, Shoutbox, Spielerposten und das Handelsmenü am Schiff. Die Lücken liegen fast ausschließlich in der Informationsdichte. Die STU-Warenkontobox ist das zentrale Bedienelement mit Standort, Lizenzanzahl, Lizenzliste, Angebotsreserve, Schwarzem Brett und Gebühreninfo. In SWU ist sie auf eine Bestandsliste reduziert, und die Angebots- und Deal-Tabellen zeigen weniger Kontext.

Die Sternenkarte hat die STU-Kartenschalter. Feldinfo und Tooltip sind aber deutlich ärmer: Es fehlen Gebietsbesitzer (Spieler/Allianz), Handelsposten mit Lizenzkonditionen, Region, Feldeffekttexte, „Unpassierbar“ und Schiffswerte wie Schilde, EPS und Antrieb.

In der Datenbank stimmen Hub, Kategorien, Ranglisten, Warenübersicht und Statistiken strukturell. Es fehlen fast alle Detailansichten der Einträge (Rumpfdetails, Planetentyp, Systemtyp, Regionskarte). Die Backend-Endpunkte für Schiffs- und Stationsrumpfdetails existieren, werden vom Frontend aber nicht aufgerufen. Die Siedlerliste hat keine Suche, keine Sortierung, keine Seitenaufteilung und keine Allianzspalte.

Die Kategorie RPG-Schiffe und die Crew-Übersicht der Datenbank fehlen. Die NPC-Werkzeuge sind nur teilweise durch Admin-Seiten ersetzt; das ist nach der Scope-Leitplanke weitgehend gewollt.

Gesamturteil: Die Spielmechanik ist nahezu auf STU-Stand, die Oberfläche liegt bei etwa 70 % der STU-Informationsdichte.

## Seitenabgleich

| STU-Seite/Template | SWU-Seite/Komponente | Status | Abweichung konkret |
|---|---|---|---|
| `html/view/trade.twig`: Startseite mit Aktionsmenü, Suche (Posten, Ware, drei Suchknöpfe) und Angebotsliste | `apps/frontend/src/pages/trade.tsx` (Tabs), `components/trade/TradeMarketTab.tsx` | kleine Abweichung | Startseite ist in SWU „Warenkonten“, die Angebotssuche liegt im Tab „Angebote“. Angebotsliste: Der Postenname ist reiner Text, es gibt keinen Info-Link und keinen Klick-Filter auf Posten oder Ware. Kein PM-/Profil-Link zum Anbieter, eigenes Angebot ist nicht direkt löschbar (nur Text „Eigenes Angebot“). Dafür gibt es Seitenaufteilung und Warenfilter-Icons. |
| `html/trade/tradeAccounts.twig` (Warenkonten) | `pages/trade.tsx` `AccountsTab` | große Abweichung | Siehe „Große Abweichungen“ 1. |
| `html/trade/tradeOfferMenu.twig`, `newOfferMenu/newOffer.twig` | `components/trade/TradeOffersTab.tsx` `NewOfferDialog` | kleine Abweichung | In STU startet man über den Klick auf eine Kontoware. SWU hat einen Dialog mit Postenwahl und zeigt Verhältnis, Reserve und Kürzung vorab. Die STU-UI-Regel für NPC-Posten fehlt: Wer dort nicht Latinum anbietet, kann nur Latinum verlangen (`View/ShowOfferMenuNewOffer/ShowOfferMenuNewOffer.php` `IS_LATINUM`/`IS_NPC_POST`). SWU erlaubt jede handelbare Ware (`apps/backend/src/modules/trade/trade-offer.service.ts` `getOptions`). |
| `html/trade/offerByCommodity.twig` (Angebote je Ware im Konto) | `TradeOffersTab.tsx` („Meine Angebote“ je Posten) | gleich | Gruppierung je Posten statt je Ware. Spalten Gibt, Verlangt, Anzahl, Reserve und Zurückziehen sind vorhanden. |
| `html/trade/takeOffer.twig` | `TradeMarketTab.tsx` `TakeOfferDialog` | kleine Abweichung | STU zeigt den Bestand der verlangten Ware am Posten und den freien Lagerraum. SWU zeigt stattdessen das serverseitige Maximum (`maxTake`) und eine Vorschau. |
| `html/trade/newOfferMenu/transfer.twig` (Netztransfer) | `components/trade/TradeNetworkTransferDialog.tsx` | gleich | Zielposten mit freiem Lager, Menge und Kürzungshinweis sind vorhanden. Die Transferkapazität steht in der Kontobox. |
| `html/trade/tradePostInfo.twig` (Posteninfo-Popup) | `pages/trade.tsx` `PostInfo` | kleine Abweichung | SWU zeigt zusätzlich Beschreibung, Stufe und Betreiber. Es fehlen das Stationsbild und die Anzahl ausgestellter Lizenzen. |
| `html/trade/tradePostShipList.twig` (eigene Schiffe am Posten mit Laderaum) | `PostInfo` „Eigene Schiffe vor Ort“ | kleine Abweichung | Nur Namenslinks, ohne Rumpfbild und belegten Laderaum. |
| `html/trade/license/list.twig` (ausgestellte Lizenzen: Siedler, Kaufdatum, Ablauf) | `components/trade/TradeLicensePanel.tsx` `OwnerLicenseAdmin` | kleine Abweichung | Nur für den Eigentümer, ohne Kaufdatum und ohne PM-Link. In STU darf jeder Lizenzinhaber die Liste sehen (`Module/Trade/View/ShowLicenseList/ShowLicenseList.php`). Das ist eine PO-Entscheidung in tmw-T2. |
| `html/trade/license/info.twig` (Gebühren, Restlaufzeit, Gebühr zuletzt geändert, verlängern) | `TradeLicensePanel.tsx` | kleine Abweichung | Ohne „Gebühr zuletzt geändert“ und ohne Rest-Tage. Gezeigt wird „gültig bis“. |
| `html/trade/license/menu.twig` (Gebühr einstellen) | `TradeLicensePanel.tsx`, `components/spacecraft/StationTradePostPanel.tsx` | gleich | Ware, Menge und Tage sind einstellbar. |
| `html/trade/basictrades.twig` | `components/trade/BasicTradeTab.tsx`, `BasicTradeLineChart.tsx` | kleine Abweichung | Je Konto fehlen Stationsbild, Lagerraum (über/unter Limit) und Standort. Die Diagrammgrenze ist eine feste Auswahl (5–100) statt einer freien Zahl. Die Diagramme laufen je Netz. Die Spaltenköpfe „Kurs Kaufen/Verkaufen“ und ihre Tooltips sind durch „1 Aurodium → n“ ersetzt. |
| `html/trade/deals.twig` (Deals, Auktionen, beendete Auktionen) | `components/trade/TradeDealsTab.tsx` | große Abweichung | Siehe „Große Abweichungen“ 4. |
| `html/trade/lottery.twig` | `components/trade/TradeLotteryTab.tsx` | kleine Abweichung | Es fehlen die aktuelle Gewinnchance in % und die Tabelle „Vergangene Ziehungen“ (Zeitraum, Lose). SWU zeigt dafür den möglichen Jackpot und die letzte Ziehung mit Gewinner. |
| `html/trade/shoutbox.twig`, `shoutBoxEntries.twig` | `components/trade/TradeShoutboxTab.tsx` | gleich | Eigener Tab mit allen lizenzierten Netzen statt Popup aus der Kontobox. |
| `html/spacecraft/trademenu.twig`, `ship/trademenupayment.twig` | `components/trade/TradeMenuDialog.tsx`, `TradePostEntry.tsx`, `TradeLicensePanel.tsx` | gleich | Zwei Spalten statt Moduswechsel, ohne den globalen „max“-Knopf; die Menge ist mit dem vollen Bestand vorbelegt. Ohne Lizenz führt der Weg über Posteninfo und Lizenzkauf. |
| `html/trade/orionSlaveTrade.twig` | – | fehlt (gewollt) | Inhaltlich heikel, laut `map.md` Leitplanke 2 entfallen. |
| `Trade/Action/PirateProtection` (Kazon-NAP in `deals.twig`) | – | fehlt (gewollt) | Piraten sind out of scope (`map.md` Leitplanke 3). |
| `Trade/Action/ChangeTradePostName` (in der Kontobox) | `StationTradePostPanel.tsx`, `PATCH trade/posts/:id` | kleine Abweichung | Umbenennen geht nur in der Stationsansicht, nicht in der Kontobox. |
| `html/view/map.twig` und `Public/static/js/userStarmap.js` (Galaxiekarte) | `pages/starmap.tsx`, `components/starmap/*` | große Abweichung | Siehe „Große Abweichungen“ 2. |
| `html/map/starmapSection*.twig` (`ShowSection`/`ShowByPosition`, Kartenausschnitt aus dem Schiff) | `FieldContextPanel.tsx` → `/starmap?layer&x&y` | gleich | Zentrierung über URL statt Popup-Ausschnitt mit Pfeilnavigation. |
| `html/view/database.twig` (Hub) | `pages/database.tsx` `groups`, `components/database/DatabaseProgress.tsx` | kleine Abweichung | Es fehlen „RPG-Schiffe“ (Kategorie `RPGSHIP`), „Crew“ (`ShowCrewManagement`) und der Block „History Events“ (`HISTORY_EVENT_MAP`). Neu sind „Höchstes Prestige“ und die Fortschrittsbox. Piratenrunde und Kazon-Ranking fehlen gewollt. |
| `html/database/databasecategory.twig` (Kategorielisten mit `???`) | `database.tsx` `ShipClasses`, `PlanetTypes`, `SystemTypes`, `Regions`, `Systems`, `TradePosts` | große Abweichung | Siehe „Große Abweichungen“ 3. Die Listen selbst sind vorhanden, bei Rümpfen aber ohne Bild. |
| `html/database/shiprump.twig` (Rumpfdetails), `planettype.twig`, `starsystemtype.twig`, `regioninfo.twig` (Regionskarte) | – | fehlt | Siehe „Große Abweichungen“ 3. |
| `html/database/starsystem.twig` (Systemeintrag mit Raster und Kolonie-Scans) | `database.tsx` `DatabaseSystemDetailPage`, `components/database/ColonyScans.tsx` | gleich | Durch ADR-0002/0003 geschützt. |
| `html/database/poiinfo.twig` (Handelsposten-Eintrag, in STU leer) | `database.tsx` `TradePosts` | kleine Abweichung | Andere Logik, siehe Kleine Abweichungen. |
| `html/database/commoditiesOverview.twig`, `commodityLocations.twig` | `database.tsx` `CommodityOverview` | gleich | Eine Lagerorttabelle mit Typspalte statt fünf getrennter Tabellen mit Schiffsbildern. Kolonie, Schiff, Torpedolager, Warenkonto und Angebotsreserve sind abgedeckt. |
| `html/database/userList.twig` (Siedlerliste) | `database.tsx` `Settlers` | große Abweichung | Siehe „Große Abweichungen“ 5. |
| `html/database/npcList.twig` | `database.tsx` `NpcsAndAdmins` | gleich | Getrennt in NPCs und Administratoren, mit PM-Link. Suche und Sortierung fehlen wie bei der Siedlerliste. |
| `html/database/prestigeLog.twig` | `database.tsx` `PrestigeHistory` | gleich | – |
| `html/database/highscores/*.twig` (10 Ranglisten) | `database.tsx` `RankingView`, `GET database/rankings/:key` | kleine Abweichung | Nur eine Tabelle: ohne Avatar, ohne PM-Link, ohne Erklärtext je Liste und ohne Tooltip mit dem Datum des Punktestands (`topDiscover.twig`). Der eigene Punktestand ist vorhanden. Piratenzorn fehlt gewollt. |
| `html/statistics.twig` und `Database/View/ShowStatistics` | `components/database/StatisticsView.tsx`, `apps/backend/src/modules/statistics/statistic-metrics.ts` | kleine Abweichung | Andere Graphen: Fraktionsreihen statt „bemannt/NPC“-Schiffe, kein System-Anteil bei geflogenen Feldern, zusätzlich Kolonien, Allianzen, Prestige und Kampf. Bewusst laut Spec `datenbank-statistiken`. |
| `html/anomaly/standardAnomaly.twig`, `adventDoor.twig`, `easterEgg.twig` | `components/starmap/AnomalyMarker.tsx`, `components/spacecraft/OpenSeasonalAnomalyButton.tsx`, `modules/anomaly/*` | gleich | Saisonal mit SW-Ersatz (Lebenstag/Frühlings-Kapseln). |
| `html/npc/*.twig` (NPC-Bereich: Werkzeuge, Schiffs- und Bauplanersteller, Log, Spielerdetails, Einstellungen, Quests) | `pages/admin-ships.tsx`, `admin-awards.tsx`, `admin-trade-deals.tsx`, `admin-users.tsx`, `admin-factions.tsx` | große Abweichung (weitgehend gewollt) | Siehe „Große Abweichungen“ 6. |

## Große Abweichungen

### 1. Warenkontobox ohne STU-Kontext (Kernseite des Handels)

- **STU:** `src/html/trade/tradeAccounts.twig` zeigt je Konto eine Box mit diesen Elementen:
  - Stationsbild.
  - Raster „Waren lagernd“; ein Klick öffnet Angebot erstellen oder Transferieren.
  - Raster „Waren in Angeboten“; ein Klick öffnet die Angebote je Ware.
  - Standort mit Knopf „Schiffe vor Ort“.
  - Handelsnetz mit Rassenicon und Link „Schwarzes Brett“.
  - Transferkapazität frei und je Tag.
  - Lagerraum, rot oder grün je nach Überfüllung, „pro Siedler“.
  - „Ausgestellte Lizenzen n (Liste anzeigen)“.
  - „Handelslizenz Gebühren: Anzeigen/Bearbeiten“.
  - Umbenennen für eigene Posten.
- **SWU:** `apps/frontend/src/pages/trade.tsx` `AccountsTab` zeigt nur:
  - Postenname als Link.
  - Belegung im Format `x / Limit`.
  - Transferkapazität.
  - Eine Warenliste mit „Transferieren“.

  Es fehlen Standort, Netz, Shoutbox-Link, Angebotsreserve je Konto, Lizenzanzahl und -liste, Gebührenanzeige, Überfüllungsfärbung und der Direkteinstieg „Angebot erstellen“ aus der Kontoware. Diese Daten liegen teils verstreut in `PostInfo`, `TradeOffersTab` und `TradeLicensePanel`.
- **Nachgeprüft 2026-11-17 (codegraph):** Befund bestätigt. `AccountsTab` (`apps/frontend/src/pages/trade.tsx:216-310`) rendert nur Name, `total / storageLimit`, Transferkapazität (Z. 266-269) und die Warenliste mit „Transferieren“ (Z. 291-300). Der Vertrag `TradeOverviewDto` (`packages/shared/src/lib/trade/index.ts:22-41`) enthält je Konto nur Ware und Menge, keine Angebotsreserve, keine Lizenzanzahl und keine Gebühren. Standort und Netz stecken zwar in `TradePostListItemDto` (`index.ts:5-20`, `location`, `networkId`), werden in der Kontobox aber nicht angezeigt. STU-Gegenstück: `src/html/trade/tradeAccounts.twig:21-58` (Bild, Waren lagernd, Waren in Angeboten, Standort mit Schiffsliste), `:61-79` (Netz, Schwarzes Brett, Transferkapazität nur bei NPC-Posten), `:82-90` (Lagerraum rot/grün über `TradeAccountWrapper::isOverStorage`, `src/Module/Trade/Lib/TradeAccountWrapper.php:111-114`), `:93-114` (Lizenzen und Gebühren).
  - **Zusätzliche Abweichung:** Die Belegungsanzeige in SWU zählt nur den Kontobestand (`trade.tsx:251`, `total` aus `accounts`). Der freie Platz für Transfers und Angebote wird aber aus Bestand **plus** Angebotsreserve berechnet (`apps/backend/src/modules/trade/trade-storage.service.ts:105-115`). Ein Konto kann in der Box also „Platz frei“ zeigen, während Transfer oder Lieferung wegen der Reserven am Platz scheitern. STU zählt in Anzeige und Prüfung einheitlich nur den Bestand (`TradeAccountWrapper.php:71-78`, `TradePostStorageManager.php:38-52`).
- **Auswirkung:** Spieler brauchen mehrere Tabs und Klicks, um zu sehen, wo das Konto liegt, was in Angeboten gebunden ist und was die Lizenz kostet. Der STU-typische Arbeitsablauf „Ware anklicken → Angebot/Transfer“ fehlt.
- **Ticket:** tmw-T1d, tmw-T2d und tmw-T4a sind resolved, obwohl die Kontobox unvollständig ist.

### 2. Sternenkarte: Feldinfo, Tooltip und Schiffsdetails deutlich ärmer

- **STU:** `src/Public/static/js/userStarmap.js` (`updateFieldDetails`, `buildSpacecraftDetailsHtml`) und `src/Module/Starmap/Lib/ExplorableStarMapItem.php` (`getTooltip`/`getTitle`) sowie `ExplorableStarMapItemTitleTrait.php`.
  - Tooltip und Feldpanel zeigen Feldname, Effekttexte, „Unpassierbar“, „Gebiet: Allianz (Spieler)“ des Einflussbesitzers, Handelsposten mit Lizenzkondition („… (Lizenz für n Tage: x Ware)“), „über X-System“ und die Regionsbeschreibung.
  - Der Knopf „Systemkarte“ öffnet den Datenbankeintrag.
  - Schiffseinträge zeigen Rumpfbild, Rumpf, Besitzer, Ort, Hülle, Schilde, Energie, Warpantrieb und Alarmstufe.
  - Getrennte Schalter für eigene und verbündete Schiffe, eigene und verbündete Stationen sowie Sensor-Livekontakte.
- **SWU:**
  - `apps/frontend/src/components/starmap/StarmapCanvas.tsx` (Zeile ~687): Der Tooltip zeigt nur Koordinaten, Systemname und Effektschlüssel (nur bei aktivem Overlay).
  - `apps/frontend/src/components/starmap/StarmapControlPanel.tsx` (Zeile ~163–175): Das Feldpanel zeigt Koordinaten, Sektor, Feldtyp, Fraktionszone und System/POI.
  - Die Daten fehlen schon im Vertrag: `packages/shared/src/lib/starmap/index.ts` `StarmapGalaxyFieldDto` hat `regionId`, aber keinen Namen, keinen Handelsposten und keinen Gebietsbesitzer. `StarmapInfluenceAreaDto` liefert nur eine Farbe ohne Namen.
  - `StarmapContactPanel.tsx` zeigt für eigene Schiffe nur Status, Alarm, Hülle und Crew. Schilde, EPS und Antrieb fehlen, ebenso Rumpfbild und Rumpfname.
  - Statt eines Datenbank-Links gibt es „Systemfelder laden“ (Inline-Raster).
  - Ein Schalter „Schiffe“ plus Allianz- und Partnerschiffe; keine Trennung nach Stationen.
- **Nachgeprüft 2026-11-17 (codegraph):** Befund bestätigt und ergänzt.
  - STU liefert je Feld `tooltip`, `icon`, `databaseId`, `territoryOwnerText/Html`, `effects` und `isImpassable` (`src/Module/Starmap/View/ShowUserStarmapData/ShowUserStarmapData.php:192-213`). Der Tooltip entsteht in `ExplorableStarMapItem::getTooltip`/`getTitle` (`src/Module/Starmap/Lib/ExplorableStarMapItem.php:60-126`). Der Handelspostentitel mit Lizenzkondition kommt aus `ExplorableStarMapItemTitleTrait.php:10-25`, der Gebietsbesitzer „Gebiet: Allianz (Spieler)“ aus `:27-57`.
  - SWU: `StarmapGalaxyFieldDto` (`packages/shared/src/lib/starmap/index.ts:113-128`) hat weder Handelsposten noch Gebietsbesitzer noch Regionsnamen. `StarmapInfluenceAreaDto` (`index.ts:552-560`) liefert nur `sourceType`, `sourceId`, Stärke und Farbe. Tooltip: `apps/frontend/src/components/starmap/StarmapCanvas.tsx:684-687`. Feldpanel: `StarmapControlPanel.tsx:163-175`.
  - **Neu (nachgeprüft 2026-11-17):** STU zeichnet Handelsposten als eigenes Kartensymbol (`ExplorableStarMapItem::getIcon`, `ExplorableStarMapItem.php:128-146`, Icon `tradepost`/`tradepostmapped`; gezeichnet in `src/Public/static/js/userStarmap.js:437-439` und `:1208-1215`). Die SWU-Galaxiekarte kennt keine Handelsposten: Weder `components/starmap/*` noch `pages/starmap.tsx` noch das Starmap-Backend enthalten einen Handelspostenbezug. Handelsposten sind auf der Karte also gar nicht auffindbar, nur über den Datenbanklink `/starmap?layer&x&y` (`apps/frontend/src/pages/database.tsx:660-664`).
  - Einschränkung: „Unpassierbar“ fehlt nur als Tooltip-Text. Als Overlay ist es vorhanden (`StarmapControlPanel.tsx:101`, `StarmapCanvas.tsx:325`).
- **Auswirkung:** Die Karte taugt nicht als Nachschlagewerk dafür, wem ein Gebiet gehört, wo Handelsposten liegen und was ihre Lizenz kostet, oder in welcher Region ein Feld liegt. Diese Information gibt es nur im Feldkontext eines anwesenden Schiffs (`FieldContextPanel.tsx` Region/Anomalien).
- **Ticket:** tmw-K4 ist resolved; Gebietsbesitzer-Text und Handelspostentitel waren nicht Teil der Akzeptanzkriterien. tmw-K8a nennt nur LSS und Feldkontext, nicht die Galaxiekarte.

### 3. Datenbank: Detailansichten der Einträge fehlen

- **STU:** `src/Module/Database/View/DatabaseEntry/ShowDatabaseEntry.php` und `src/html/database/databasecategory.twig`. Jeder entdeckte Eintrag ist klickbar:
  - `shiprump.twig`: Rumpfdetails mit Fraktion, Kategorie, Modullevel, Flugkosten, Lager, Beamfaktor, Masse, Traktorlast, Salven, Torpedolevel und -kapazität, Sensorreichweite, max. Crew, Baukosten, Bauzeit sowie Bauplan und Module.
  - `planettype.twig`: Oberflächenlayout.
  - `starsystemtype.twig`.
  - `regioninfo.twig`: Regionskarte mit Feldern, Effekten und Tooltips.
  - Die Rumpfliste zeigt Rumpfbilder.
- **SWU:**
  - `apps/frontend/src/pages/database.tsx` `ShipClasses` (Zeile ~1222) listet nur Name und Datum, ohne Bild und ohne Link.
  - `PlanetTypes` zeigt die Beschreibung nur im `title`-Tooltip; `SystemTypes` und `Regions` sind reine Tabellen.
  - Das Backend hat `GET database/ship-classes/:key` und `GET database/station-classes/:key` (`apps/backend/src/modules/database/database.controller.ts` Zeile 154/178). Kein Frontend-Code ruft sie auf; eine Suche nach `classes/` in `apps/frontend/src` findet nur die Listen.
  - Nur Sternensysteme haben eine Detailseite (`/database/systems/:id`).
- **Auswirkung:** Die Datenbank ist kein Nachschlagewerk für Rumpfwerte. Spieler sehen nicht, was ein entdeckter Rumpf kann; in STU ist das der Hauptzweck der Rumpfkategorie.
- **Nachgeprüft 2026-11-17 (codegraph):** Befund bleibt, wird aber eingeschränkt. Die Kolonie-Werft zeigt für **baubare** Rümpfe einen Teil der Werte:
  - Auswahlkarte mit Kategorie, Hülle, Schilde, Crew und Fracht (`apps/frontend/src/pages/colonies/components/PanelShipyard.tsx:1528-1537`).
  - Im Designer „Basiswerte“ mit Hülle, Schilde, Waffenschaden, Sensorreichweite, Hyperantrieb, Reaktor, EPS und Ausweichchance (`PanelShipyard.tsx:658-720`), dazu Crewbedarf (`:510-521`, `:648-654`), EPS-Kosten (`:1621-1628`) und feste Baukosten (`:1740-1743`).

  Es fehlen dort Modullevel-Spannen, Flugkosten, Beamfaktor, Masse, Traktorlast, Salven, Torpedokapazität, Bauzeit und eine Rumpfliste je Bauplan. Die Werte sieht man außerdem nur an einer eigenen Kolonie mit passender Werft, nicht für entdeckte Fremdrümpfe. Der Scan-Dialog (`components/spacecraft/TargetScanDialog.tsx:61-77`) zeigt den Zustand eines Schiffs (Lebenszeichen, Alarm, Schilde, Energie, Reaktor), aber keine Rumpfwerte. `GET database/ship-classes/:key` (`database.controller.ts:178-186`, `database.service.ts:712-725`) liefert die rohe Entity und hat weiterhin keinen Aufrufer im Frontend.
- **Ticket:** tmw-D6b ist resolved mit „Frontend-Test: Kategorie und Detail“, im Frontend gibt es aber keine Detailansicht. tmw-D4 ist resolved ohne Regionskarte.

### 4. Hutten-Deals und Auktionen mit weniger Information

- **STU:** `src/html/trade/deals.twig`
  - Deals nach Typ getrennt (Ware, Schiff, Bauplan, je Ware oder Prestige), mit Rumpfbild, Modulicons und benötigter Crew.
  - Auktionen mit „Höchstgebot“ und „Höchstbietender“ (Name).
  - „Beendete Auktionen“ für alle Spieler, mit Höchstbietendem und Enddatum.
- **SWU:** `apps/frontend/src/components/trade/TradeDealsTab.tsx`
  - Deals sind Text („Schiff: Name (Klasse)“, Zeile ~26), ohne Bild, Module und Crew.
  - Auktionen zeigen den aktuellen Preis und nur „(Höchstbietender)“ für einen selbst. Den Namen des Höchstbietenden liefert der Vertrag nicht (`packages/shared/src/lib/trade/index.ts` `TradeAuctionDto`).
  - Es gibt nur „Gewonnene Auktionen“ des eigenen Kontos, keine allgemeine Liste beendeter Auktionen.
- **Auswirkung:** Spieler können einen Schiffs- oder Bauplan-Deal nicht einschätzen (Module, Crew), und bei Auktionen fehlt die Konkurrenzinformation.
- **Ticket:** tmw-T8a und tmw-T8b sind resolved. tmw-T8b nennt „Höchstbietender“ als Datenbankfeld, die UI zeigt ihn nicht.

### 5. Siedlerliste ohne Suche, Sortierung, Seitenaufteilung und Allianz

- **STU:** `src/html/database/userList.twig` und `userListNavigation.twig` bieten Sortierung nach Id, Fraktion und Allianz, Seitenaufteilung, ein Suchfeld sowie je Zeile Avatar, Id, Allianz-Link, Profil- und PM-Link.
- **SWU:** `apps/frontend/src/pages/database.tsx` `Settlers` (Zeile ~1149) und `apps/backend/src/modules/database/database.service.ts` `getSettlers` liefern alle Nicht-NPC-Spieler, nach Name sortiert. Spalten: Siedler, Fraktion, Prestige, Kolonien, Schiffe, Forschung. Es gibt keine Suche, keine Sortierung, keine Seiten, keine Allianz, keinen Avatar und keinen PM-Link.
- **Auswirkung:** Mit wachsender Spielerzahl wird die Liste unbrauchbar, und Allianzzugehörigkeit ist nicht erkennbar. Dafür zeigt SWU mehr Zahlen je Spieler; ob das gewollt ist, ist offen.
- **Ticket:** Kein spezifisches Ticket. Die Inventur nennt die Siedlerliste „vollständig“ (`inventory/trade-map-world.md` Zeile ~124).

### 6. NPC-Werkzeuge nur teilweise ersetzt

- **STU:** `src/html/npc/tools.twig`, `shipCreator.twig`, `buildplanCreator.twig`, `npclog.twig`, `playerDetails.twig`, `settings.twig`; Actions `CommodityCheat`, `PrestigeCheat`, `CreateNpcAward`/`GiveNpcAward`, `CreateDeal`, `SaveWelcomeMessage`, `LogPlayerDetails`, `CreateHistoryEntry`.
- **SWU:**
  - Admin-Seiten `pages/admin-ships.tsx` (Schiffs-Spawn), `admin-awards.tsx` (Award vergeben), `admin-trade-deals.tsx` (Deals, Auktionen, Lotterie-Baupläne), `admin-users.tsx`, `admin-factions.tsx` (nur Wählbarkeit).
  - Es fehlen Waren- und Prestige-Werkzeug, eigene NPC-Awards anlegen, der protokollierte NPC-Log mit Begründungspflicht, History-Einträge und eine editierbare Willkommensnachricht. Die Willkommensnachricht ist fest im Code (`apps/backend/src/modules/onboarding/onboarding.service.ts`, soc-A8).
  - Alles ist an die Admin-Rolle gebunden, nicht an NPC-Konten.
- **Auswirkung:** Spielleitung und RPG-Betrieb sind eingeschränkt; Spieler merken das nur indirekt. Laut `map.md` Leitplanke 3 sind NPC-Konten nur so weit vorgesehen, wie der Handel sie braucht. Das ist also großteils gewollt; bei Prestige- und Waren-Werkzeug und NPC-Log bin ich unsicher.
- **Ticket:** tmw-W1 resolved (nur Handels-NPCs).

## Kleine Abweichungen

- **Angebotsliste:** Postenname ohne Info-Link und Filter-Klick, Waren ohne Klick-Filter, kein PM-/Profil-Link zum Anbieter (`TradeMarketTab.tsx`; STU `html/view/trade.twig`). Eigene Angebote lassen sich dort nicht löschen; STU zeigt in der Zeile einen x-Knopf.
- **Suchmodus:** Auswahlfeld statt drei Knöpfe „in Angeboten / beides / in Nachfragen“; kein „Auswahl zurücksetzen“-Icon (`TradeMarketTab.tsx`).
- **NPC-Posten-Angebotsregel:** In STU ist an NPC-Posten Latinum Pflichtgegenware, sofern man nicht selbst Latinum anbietet (`Module/Trade/View/ShowOfferMenuNewOffer/ShowOfferMenuNewOffer.php`, `html/trade/newOfferMenu/newOffer.twig`; nur in der UI erzwungen). SWU kennt diese Regel nicht (`apps/backend/src/modules/trade/trade-offer.service.ts` `getOptions`/`validate`).
- **Mehr als 99 Angebote:** STU setzt die Anzahl dann auf 1 (`Trade/Action/CreateOffer/CreateOffer.php`), SWU lehnt mit Fehler ab (`trade-offer.service.ts` `validate`). Für Spieler eher besser.
- **Lizenzinfo:** Ohne „Lizenzgebühr zuletzt geändert“ und ohne „(n übrig)“-Tage (`TradeLicensePanel.tsx`; STU `html/trade/license/info.twig`).
- **Ausgestellte Lizenzen:** Nur für den Eigentümer und ohne Kaufdatum. In STU sehen alle Lizenzinhaber die Liste (`ShowLicenseList.php`), mit Kaufdatum (`license/list.twig`). SWU begründet die Einschränkung mit einer PO-Entscheidung (`issues/tmw-T2-handelslizenzen.md` Comments).
- **Basishandel:** Je Konto ohne Lagerraum, Standort und Stationsbild. Das Diagrammlimit ist eine feste Liste 5–100 statt einer freien Zahl. Die Diagrammtitel zeigen „n Kurse“ statt „n Trades gesamt“ (`BasicTradeTab.tsx`, `BasicTradeLineChart.tsx`).
- **Lotterie:** Ohne Gewinnchance (%) und ohne „Vergangene Ziehungen“-Tabelle (`TradeLotteryTab.tsx`; `TradeLotteryDto` hat keine Felder dafür).
- **Posteninfo:** Ohne Stationsbild und Lizenzanzahl. „Eigene Schiffe vor Ort“ ohne Laderaumbelegung (`pages/trade.tsx` `PostInfo`; STU `tradePostShipList.twig`).
- **Netztransfer (nachgeprüft 2026-11-17):** Die Regeln sind im Effekt gleich, nur die Oberfläche weicht ab. STU bietet „Transferieren“ und die Kapazitätszeile nur an NPC-Posten an (`html/trade/tradeOfferMenu.twig:15-21`, `tradeAccounts.twig:72-79`). Das Backend selbst prüft nicht auf NPC (`Trade/Action/TransferCommodities/TransferCommodities.php:60-78`). Spielerposten entstehen aber mit Transferkapazität 0 (`Component/Station/StationUtility.php:201-203`), sodass von dort nie etwas gesendet werden kann. SWU macht es genauso: Spielerposten mit `transferCapacity: 0` und Netz = Eigentümer (`apps/backend/src/modules/trade/player-trade-post.service.ts:67-69`), Kapazitätsprüfung in `trade-network-transfer.service.ts:96-97`. SWU zeigt den Knopf „Transferieren“ aber an jeder Kontoware, auch an Spielerposten (`apps/frontend/src/pages/trade.tsx:291-300`). Der Spieler bekommt dann erst nach dem Absenden den Fehler „keine freie Transferkapazität“. Zusätzlich verlangt SWU eine Lizenz am Ziel (dokumentiert in tmw-T5).
- **Handelsposten-Kategorie:** STU listet Handelsposten erst nach Entdeckung (`???`, Koordinaten, Entdeckungsdatum, Ebenenfilter; `databasecategory.twig` `category_tradeposts`), und die Entdeckung zählt für Entdeckerpunkte. SWU listet alle Posten mit Name, Beschreibung, Netz und Betreiber. Nur der Ort ist erkundungsabhängig (`database.service.ts` `getTradePosts`; Vorgabe aus tmw-D6a). Damit gibt es keine Entdeckung und kein Prestige für Handelsposten.
- **Ranglisten:** Ohne Avatar, PM-Link, Erklärtext und Datums-Tooltip (`database.tsx` `RankingView`).
- **Rangliste „Vielflieger“ (nachgeprüft 2026-11-17):** Die Datenquelle entspricht STU, aber der eigene Punktestand fehlt. STU zeigt „Dein eigener Punktestand“ (`html/database/highscores/topFlights.twig`, `Database/View/FlightRanking/FlightRanking.php:43`). SWU liefert für anonyme Listen `currentUser: null` (`apps/backend/src/modules/database/database.service.ts:919`), und `RankingView` blendet die Zeile bei `anonymous` aus (`apps/frontend/src/pages/database.tsx:1211`).
- **Statistiken:** Ohne Reihen „bemannt“ und „NPC“ bei Schiffen und ohne „System“-Anteil bei geflogenen Feldern (`statistic-metrics.ts` gegen `ShowStatistics.php`). Zusätzliche Reihen sind vorhanden. Laut Inventur über die Spec entschieden.
- **Datenbank-Hub:** Ohne „Crew“-Eintrag. Die STU-Seite `crewManagement.twig` (alle eigenen Crewmitglieder mit Rang, Posten, Einsatzort und Filter) hat in SWU kein Pendant; es gibt nur die Crew je Schiff (nachgeprüft 2026-11-17, siehe Unsicherheiten). Ohne „History Events“-Block (`database.twig`).
- **Kategorie RPG-Schiffe:** `DatabaseCategoryTypeEnum::RPGSHIP` fehlt; kein Ticket gefunden (Inventur Zeile ~100: „fehlt“).
- **Kartenlegende:** SWU zeigt nur drei Symbole (System, Schiff, Hyperraumroute; `pages/starmap.tsx`). Stationen, Handelsposten, Wurmlöcher und Anomalien sind nicht erklärt.
- **Gebietsanzeige auf der Karte:** SWU zeigt „Gebiet: <Fraktion>“ aus `factionZone` (`StarmapControlPanel.tsx`). STU nennt den Spieler bzw. die Allianz, der die Einflussstation gehört.
- **Transferknopf an Spielerposten (nachgeprüft 2026-11-17):** SWU zeigt „Transferieren“ an jeder Kontoware (`apps/frontend/src/pages/trade.tsx:291-300`), auch dort, wo die Transferkapazität 0 ist. STU blendet Knopf und Kapazitätszeile an Spielerposten aus (`html/trade/tradeOfferMenu.twig:15-21`, `tradeAccounts.twig:72-79`).
- **Belegungsanzeige der Kontobox (nachgeprüft 2026-11-17):** Die Anzeige `x / Limit` zählt nur den Bestand (`trade.tsx:251`). Die Platzprüfung zählt Bestand plus Angebotsreserve (`apps/backend/src/modules/trade/trade-storage.service.ts:105-115`). Siehe Große Abweichung 1.
- **Umbenennen von Handelsposten:** Nur in der Stationsansicht (`components/spacecraft/StationTradePostPanel.tsx`), nicht aus dem Handelsbereich.

## Bewusste/entschiedene Abweichungen

- **Orion-Sklavenhandel** entfällt (`map.md` Leitplanke 2).
- **Piraten-Schutzvertrag (Kazon-NAP), Piratenrunde, Kazon-Rangliste:** Piraten sind out of scope (`map.md` Leitplanke 3, Duplikattabelle).
- **Quests** (NPC- und Spielerseite) sind out of scope (`map.md`).
- **Star-Wars-Ersatz:** Latinum heißt Aurodium, der Große Nagus und die Ferengi werden zum Hutten-Kartell (Deals, Lotterie, „Die 10 Günstlinge der Hutten“; `map.md` 2026-10-22 tmw-W1). Saisonale Anomalien heißen Lebenstag-Geschenke und Frühlings-Kapseln (`map.md` tmw-K10c).
- **Basishandel:** Kauf-Modifier −10 statt STU-Bug (`map.md` tmw-T7a). Warenliste Doonium, Transparistahl und Durastahl-Legierung (tmw-T7b).
- **Handelsabkommen** gibt kostenlose Lizenzen statt `tradeModifier` (tmw-T13).
- **Kontotransfer** über Feld-Kopräsenz statt Docking (tmw-T3).
- **Verlassene Posten** haben keinen Eigentümer statt `USER_NOONE` (tmw-T12c).
- **Ausgestellte Lizenzen** sehen nur Eigentümer (PO in `issues/tmw-T2-handelslizenzen.md`).
- **Galaxieflug statt zeitbasiertem Hyperraumsprung** (`docs/adr/0006-…`). Ebenenkenntnis und Kartenzyklus (`docs/adr/0008-…`/`0007-ebenenkenntnis…`). Persönliche Systementdeckung (`docs/adr/0002-…`), messpunktbasierte Kartographie (`docs/adr/0003-…`), Regionskartographie als einzige Regionsentdeckung (`docs/adr/0009-…`, tmw-D4 Option b).
- **Keine Routenvorschau** für Feldkosten (`map.md` 2026-11-15 tmw-K1b3, wie STU).
- **Datenbank-Awards** wie STU (tmw-D5a). Prestigewerte sind fest statt Kategoriepunkte (Inventur).
- **Statistik-Reihen** mit Fraktion statt NPC und Holonet statt KN (Spec `datenbank-statistiken`, Inventur).
- **Fraktionen:** Genau zwei spielbare Fraktionen (CONTEXT.md/Glossar). Keine fraktionsabhängigen Schiffswerte (tmw-FA1b2).
- **NPC-Konten** nur für den Handel (`map.md` Leitplanke 3); NPC-Werkzeuge sind daher Admin-Seiten.
- **SWU-Zusätze** (ändern das Spielgefühl merklich):
  - Tab „Handelsposten“ mit allen Posten.
  - Export der Karte als Bild und JSON (tmw-K6).
  - Hyperraumrouten-Overlay.
  - Fortschrittsbox in der Datenbank.
  - Rangliste „Höchstes Prestige“.

## Unsicherheiten – nachgeprüft (2026-11-17, codegraph)

Pfade ohne Präfix: STU = `st-universe/core/src/…`, SWU = `swuniverse/core/…`.

- **Netztransfer zwischen Spielerposten**
  - **Ergebnis:** Abweichung gefunden. Die Regel ist im Effekt gleich, die Oberfläche weicht ab.
  - **Begründung:**
    - STU: Die Action prüft nur Lizenz am Quellposten, gleiches Netz und ein nicht verlassenes Ziel. Eine NPC-Prüfung gibt es dort nicht (`Module/Trade/Action/TransferCommodities/TransferCommodities.php:60-78`). Die Zielliste filtert auf lizenzierte Posten desselben Netzes (`Module/Trade/View/ShowTransferMenu/ShowTransferMenu.php:37-48`). Spielerposten bekommen Netz = Eigentümer-ID und Transferkapazität 0 (`Component/Station/StationUtility.php:201-203`). Deshalb gibt es von dort nie freie Kapazität. Die Oberfläche blendet „Transferieren“ und die Kapazitätszeile nur an NPC-Posten ein (`html/trade/tradeOfferMenu.twig:15-21`, `html/trade/tradeAccounts.twig:72-79`).
    - SWU spiegelt das Datenmodell: Spielerposten mit `networkId = station.userId` und `transferCapacity: 0` (`apps/backend/src/modules/trade/player-trade-post.service.ts:67-69`), Kapazitätsprüfung in `trade-network-transfer.service.ts:96-97`, Netzprüfung in `:85`. tmw-T5 (`.scratch/stu-parity/issues/tmw-T5-transfers-im-handelsnetz.md`, Comments) dokumentiert als einzige Regelabweichung die zusätzliche Lizenzpflicht am Ziel.
    - Abweichung: Die Kontobox zeigt „Transferieren“ auch an Spielerposten (`apps/frontend/src/pages/trade.tsx:291-300`). Der Spieler läuft dort in den Fehler „keine freie Transferkapazität“. Die frühere Kleine Abweichung „SWU erlaubt Transfers zwischen allen Posten“ ist damit korrigiert.

- **Rumpfdetails an anderer Stelle (Werft, Hangar, Scan)**
  - **Ergebnis:** teilweise widerlegt. Die Werft zeigt einen Teil der Rumpfwerte, ein Ersatz für `shiprump.twig` existiert aber nicht.
  - **Begründung:**
    - STU: `html/database/shiprump.twig` über `Module/Database/View/DatabaseEntry/ShowDatabaseEntry.php`, für jeden entdeckten Rumpf.
    - SWU-Werft: Auswahlkarte mit Kategorie, Hülle, Schilde, Crew und Fracht (`apps/frontend/src/pages/colonies/components/PanelShipyard.tsx:1528-1537`). „Basiswerte“ mit Hülle, Schilde, Schaden, Sensor, Hyperantrieb, Reaktor, EPS und Ausweichen (`:658-720`). Crewbedarf, EPS-Kosten und feste Baukosten (`:510-521`, `:1621-1628`, `:1740-1743`). Das gilt nur für Rümpfe, die an der eigenen Kolonie baubar sind. Es fehlen Bauzeit, Flugkosten, Beamfaktor, Masse, Traktorlast, Salven, Torpedokapazität und Modullevel-Spannen.
    - SWU-Scan: `components/spacecraft/TargetScanDialog.tsx:61-77` zeigt den Zustand, nicht den Rumpf.
    - SWU-Hangar: Ein eigener Hangar-Bildschirm mit Rumpfwerten wurde nicht gefunden. Feste Hangar-Rümpfe laufen über denselben Werft-Designer (`PanelShipyard.tsx:1670-1675`).
    - `GET database/ship-classes/:key` (`apps/backend/src/modules/database/database.controller.ts:178-186`) hat weiterhin keinen Frontend-Aufrufer. Große Abweichung 3 bleibt, ergänzt um den Werft-Hinweis.

- **Rangliste „Vielflieger“: Anonymisierung und Datenquelle**
  - **Ergebnis:** bestätigt (Datenquelle gleich), dazu eine kleine Abweichung gefunden.
  - **Begründung:**
    - STU zählt Signaturen mit `to_direction != 0` der letzten 48 h je Spieler ab der ersten Nicht-NPC-ID und liefert Fraktion und Schiffsanzahl (`Orm/Repository/FlightSignatureRepository.php:191-222`, Fenster `Component/Ship/FlightSignatureVisibilityEnum.php:21`). Die Anzeige ist anonym mit Fraktionsbild und „Felder / Schiffe“ (`html/database/highscores/topFlights.twig`).
    - SWU zählt gleich: `toDirection IS NOT NULL`, 48 h (`FLIGHT_SIGNATURE_RETENTION_MS`, `apps/backend/src/modules/spacecraft/flight-signature.service.ts:16`), `isNpc = false`, Fraktion und `COUNT(DISTINCT spacecraftId)` (`apps/backend/src/modules/database/database.service.ts:1083-1112`). Anonyme Ausgabe in `:906-920` und `apps/frontend/src/pages/database.tsx:1199-1209`.
    - Wie in STU werden getarnte Flüge nicht ausgeschlossen, obwohl der STU-Erklärtext das behauptet. Das Signaturfeld `is_cloaked` existiert in beiden Systemen (STU `FlightSignatureCreator.php:87`, SWU `flight-signature.service.ts:66`), wird in beiden Ranglisten-Queries aber nicht gefiltert.
    - Abweichung: Den eigenen Punktestand zeigt STU (`Module/Database/View/FlightRanking/FlightRanking.php:43`), SWU nicht (`currentUser: null`, `database.service.ts:919`; ausgeblendet in `database.tsx:1211`). Unter Kleine Abweichungen eingetragen.

- **LSS-Tooltip und Feldkontext: Handelsposten mit Lizenzkonditionen**
  - **Ergebnis:** widerlegt für LSS (STU hat dort selbst keinen Handelspostentitel). Für Galaxiekarte und Feldkontext ist eine Abweichung gefunden.
  - **Begründung:**
    - STU: Der Lizenztitel entsteht nur in `ExplorableStarMapItemTitleTrait::getTradepostTitle` (`Module/Starmap/Lib/ExplorableStarMapItemTitleTrait.php:10-25`). Er wird nur von `ExplorableStarMapItem::getTitle` genutzt (`ExplorableStarMapItem.php:60-92`) und gelangt über `ShowUserStarmapData::normalizeField` (`View/ShowUserStarmapData/ShowUserStarmapData.php:192-213`) bzw. `UserYRow` (Kartenausschnitt) in die Sternenkarte.
    - Die LSS-Renderer (`Lib/Map/VisualPanel/Layer/Render/*`, `html/visualPanel/*.twig`) erzeugen keine Titel und keine Handelsposteninfo. `getLatestLicenseInfo` nutzen sonst nur Handelsmenü und Lizenzkauf (`Module/Spacecraft/View/ShowTradeMenu/ShowTradeMenu.php:64`, `Module/Ship/View/ShowTradeMenuPayment/ShowTradeMenuPayment.php:69`).
    - SWU-LSS: Der Zelltitel zeigt Koordinaten, Feldtyp, System, Region, Signaturen und Anomalien (`apps/frontend/src/components/spacecraft/LssMap.tsx:380`), das geht über STU hinaus. Am eigenen Schiff zeigt `TradePostEntry` (`apps/frontend/src/components/trade/TradePostEntry.tsx`, eingebunden in `pages/spacecraft-detail.tsx:245`) Postenname, Handelsmenü und Posteninfo. Das entspricht dem STU-Handelsmenü. Lizenzkonditionen stehen erst im Menü bzw. in der Posteninfo.
    - Für die Galaxiekarte (Handelsposten-Icon und Lizenztitel) fehlt das Pendant in SWU vollständig. Siehe Große Abweichung 2, ergänzt.

- **STU-Kartenbild mit Anomalie-Icons (`ShowUserStarmapImage`)**
  - **Ergebnis:** widerlegt (STU zeichnet auf der Galaxiekarte keine Anomalien), damit kein Abweichungsbefund.
  - **Begründung:**
    - `Module/Starmap/View/ShowUserStarmapImage/ShowUserStarmapImage.php:162-273` rendert nur Feldtyp-Kacheln (`renderMapField` → `getMapGraphicPath`, `:358-367`) und maskiert unerforschte Felder (`:195-234`).
    - Die einzigen Icons kommen aus `ExplorableStarMapItem::getIcon` (`ExplorableStarMapItem.php:128-146`) und betreffen nur `tradepost`/`mapped`. `userStarmap.js:437-439`/`:1208-1215` zeichnet genau diese Icons.
    - Anomalien rendert STU nur im LSS (`Lib/Map/VisualPanel/Layer/PanelLayerCreation.php:118`, `AnomalyLayerRenderer`). SWU verhält sich gleich: Anomalien erscheinen in LSS, Navigation und Feldkontext (`AnomalyMarker` in `components/spacecraft/LssMap.tsx`, `NavigationPanel.tsx`, `FieldContextPanel.tsx`), nicht in `components/starmap/StarmapCanvas.tsx`.
    - Nebenbefund: Das fehlende Handelsposten-Icon in SWU wurde in Große Abweichung 2 ergänzt.

- **Crew-Übersicht (Gegenstück zu `crewManagement.twig`)**
  - **Ergebnis:** bestätigt, es gibt kein Pendant.
  - **Begründung:**
    - STU: `Module/Database/View/ShowCrewManagement/ShowCrewManagement.php:28-56` lädt alle `CrewAssignment` des Spielers (Schiffe, Kolonien, Posten) mit Rangnamen, Expertise und Positionsreihenfolge. Verlinkt ist das im Datenbank-Hub (`html/view/database.twig:56`).
    - SWU: Crew-Management gibt es nur je Schiff (`apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts:65-121`, `GET spacecraft/:id/crew` in `spacecraft.controller.ts:827`). Je Kolonie gibt es nur Zähler (Kolonie, in Ausbildung, global; `apps/frontend/src/pages/colonies/components/PanelCrew.tsx:47-85`). Einen spielerweiten Endpunkt oder eine Seite, die alle Crewmitglieder mit Rang und Einsatzort listet, gibt es weder im Backend (keine Crew-Route außer `lost-crew/*` und `:id/crew`) noch im Frontend. Die Kleine Abweichung bleibt.

- **Gegenprüfung Große Abweichung 2 (`StarmapGalaxyFieldDto`)**
  - **Ergebnis:** bestätigt und erweitert.
  - **Begründung:** Siehe den Nachtrag in Große Abweichung 2.
    - `packages/shared/src/lib/starmap/index.ts:113-128` hat kein Feld für Handelsposten, Gebietsbesitzer, Regionsnamen oder Effekttexte. Nur `regionId` und Effektschlüssel sind da.
    - `StarmapInfluenceAreaDto` (`index.ts:552-560`) enthält `sourceType`/`sourceId`, aber keinen Namen.
    - Regionsnamen gibt es nur im Feldkontext eines Schiffs (`StarmapFieldContextDto.regionName`, `index.ts:260`) und über `GET starmap/regions/:id` (`apps/backend/src/modules/starmap/starmap.controller.ts:100-110`).
    - Neu: Handelsposten fehlen auf der SWU-Galaxiekarte vollständig, auch als Symbol.

- **Gegenprüfung Große Abweichung 1 (Warenkontobox)**
  - **Ergebnis:** bestätigt, dazu eine Abweichung in der Belegungsanzeige gefunden.
  - **Begründung:** Siehe den Nachtrag in Große Abweichung 1.
    - `AccountsTab` (`apps/frontend/src/pages/trade.tsx:216-310`) und `TradeOverviewDto` (`packages/shared/src/lib/trade/index.ts:22-41`) enthalten keine Angebotsreserve, keine Lizenzanzahl und keine Gebühren.
    - Die Belegung `x / Limit` zählt nur den Bestand, die Platzprüfung dagegen Bestand plus Reserve (`apps/backend/src/modules/trade/trade-storage.service.ts:105-115`).
    - STU zählt in beiden Fällen nur den Bestand (`Module/Trade/Lib/TradeAccountWrapper.php:71-78`, `:111-114`; `TradePostStorageManager.php:38-52`).
    - STU zeigt die Transferkapazität nur an NPC-Posten (`tradeAccounts.twig:72-79`), SWU an jedem Konto mit Kapazitätseintrag (`trade.tsx:266-269`).

- **Laufzeit**
  - **Ergebnis:** weiterhin offen, braucht ein laufendes Spiel.
  - **Begründung:** Alle Ergebnisse oben stammen aus statischer Codeanalyse. Nur zur Laufzeit prüfbar sind:
    - Farben und Überfüllungshinweise.
    - Ob `GET trade/overview` an Spielerposten tatsächlich `capacity: 0` liefert und der Fehler beim Transfer so erscheint.
    - Das tatsächliche Erscheinungsbild der Werft-Basiswerte je Rumpf (abhängig von `game-data`-Layouts).
    - Ob STU-Tooltips im Live-Spiel Lizenzkonditionen enthalten (setzt eine gesetzte `TradeLicenseInfo` voraus).
