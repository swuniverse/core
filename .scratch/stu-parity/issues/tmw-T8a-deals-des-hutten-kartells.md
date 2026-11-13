# Deals des Hutten-Kartells (Sofortangebote)

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T3, tmw-W1

## Ziel

Am Hutten-Handelsposten (Pendant zu „Zur Goldenen Kugel“, siehe tmw-W1) gibt es zeitlich begrenzte Sonderangebote. Ein Deal gibt eine Ware, ein Schiff nach Bauplan oder einen Bauplan gegen Aurodium bzw. eine andere Ware oder gegen Prestige. Er kann auf eine Fraktion beschränkt sein. Spieler mit Lizenz am Hutten-Posten nehmen Deals n-fach an. Deals legen Admins an, weil NPC-Werkzeuge (STU `NPC/Action/CreateDeal`) über den Handelsbedarf hinausgehen und daher nicht angelegt werden. Bei Erscheinen neuer Deals erhalten lizenzierte Spieler eine Handelsnachricht.

## STU-Quellen

- `src/Module/Trade/View/ShowDeals/ShowDeals.php` (`hasFergLicense`, aktive Deals, Auktionen, eigene gewonnene Auktionen), `src/html/trade/deals.twig`
- `src/Module/Trade/Action/DealsTakeOffer/DealsTakeOffer.php`: nicht mehr verfügbar, NPC, Anzahl, Prestige- bzw. Warenzahlung, Kontoplatz; Schiff aus Bauplan via `ShipCreator` am Postenort; Bauplan an den Spieler.
- `src/Orm/Entity/Deals.php` (auction, amount, give/want commodity + amount, want_prestige, buildplan, ship, start, end, faction)
- `src/Module/NPC/Action/CreateDeal/*`, `src/Module/Tick/Process/NewDealsInformation.php`
- `src/Module/Trade/Lib/DealAccountWrapper.php`

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/`, NPC-Konto `HUTT_CARTEL` aus tmw-W1
- Schiffserzeugung: `apps/backend/src/modules/spacecraft/spacecraft.service.ts#adminSpawnShip`, `entities/admin-ship-buildplan.entity.ts`; Spielerbaupläne `apps/backend/src/modules/colony/entities/colony-ship-buildplan.entity.ts`
- `apps/backend/src/modules/prestige/prestige.service.ts` (Prestigezahlung mit Log)
- `apps/backend/src/modules/messaging/messaging.service.ts` (Ordner `TRADE`), `apps/backend/src/modules/tick/tick.service.ts`
- Frontend: `apps/frontend/src/pages/trade.tsx` (Tab „Hutten-Deals“), `apps/frontend/src/pages/admin.tsx`

## Akzeptanzkriterien

- [x] Die Entität `TradeDeal` (Typ Sofortkauf bzw. Auktion für tmw-T8b; Gegenstand Ware/Schiff/Bauplan; Preis Ware bzw. Aurodium oder Prestige; Menge; Fraktion optional; Start und Ende) ist per Migration angelegt.
- [x] Admins können Deals anlegen, bearbeiten und beenden (`admin/trade/deals`, Formular in `admin.tsx`).
- [x] `GET trade/deals` liefert die aktiven Sofort-Deals für Spieler mit Lizenz am Hutten-Posten, gefiltert nach Fraktion. Ohne Lizenz kommt der Hinweis „Handelslizenz beim Hutten-Kartell erforderlich“.
- [x] `POST trade/deals/:id/take { amount }` setzt die STU-Prüfungen um. Die Zahlung erfolgt aus dem Konto am Hutten-Posten bzw. als Prestige mit Prestigelog. Waren gehen aufs Konto, Schiffe entstehen am Postenort im Besitz des Käufers, Baupläne werden dem Spieler gutgeschrieben. Die Restmenge wird verringert, mit Sperre gegen Überverkauf.
- [x] Ein Tick-Job meldet neu gestartete Deals einmalig per Handelsnachricht des Hutten-Kartells an alle lizenzierten Spieler.
- [x] Backend-Tests: Sichtbarkeit (Lizenz, Fraktion, Zeitfenster), alle drei Gegenstandsarten, beide Zahlarten, Überverkauf bei Parallelität, Benachrichtigung genau einmal. Frontend-Tests: Dealliste und Annahmedialog.

## Comments

- 2026-11-13: Umgesetzt.
  - Entität `TradeDeal` (Migration `20261113120000-add-trade-deals`): `auction` für tmw-T8b, Restanzahl (`null` = unbegrenzt), angebotene Ware oder Admin-Bauplan (`ship` = Schiff nach Bauplan, sonst Bauplankopie), Preis Ware oder Prestige, Fraktion optional, Start/Ende, `notifiedAt`. Datenbank-Checks erzwingen genau ein Angebot und genau einen Preis.
  - `GET trade/deals` und `POST trade/deals/:id/take` (`TradeDealService`) nach STU `ShowDeals`/`DealsTakeOffer`: Hutten-Posten ist der Posten des NPC `HUTT_CARTEL`; ohne gültige Lizenz „Handelslizenz beim Hutten-Kartell erforderlich“. Nur gestartete, nicht abgelaufene Sofort-Deals ohne bzw. mit eigener Fraktion. Annahme mit Kürzung auf Bestand, Kontoplatz und Restanzahl, Zahlung aus dem Konto am Hutten-Posten oder als Prestige mit Prestigelog („Eingebüßt beim Deal des Hutten-Kartells“), ausverkaufte Deals werden wie in STU gelöscht. Transaktion mit Sperren in der Reihenfolge Posten → Deal → Spieler → Kontozeilen; Schiffs- und Bauplan-Deals immer einmal.
  - Abweichung von STU (Fehler behoben): STU zieht beim Prestige-Deal den Prestigepreis vom Kontoplatz ab; SWU rechnet nur die erhaltene Ware gegen den freien Platz.
  - Schiffe und Baupläne liefert `TradeDealFulfillmentAdapter` im Spacecraft-Modul über den Port `TradeDealFulfillment` (registriert sich beim Handelsdienst, kein Import der Schiffsdomäne in Handel). Schiff wie STU `ShipCreator`: am Postenort, Besitz des Käufers, ohne Crew, Energie/Reaktor/Warp zu 25 %; dafür ist der Schiffsbau aus `adminSpawnShip` in `SpacecraftService.createShipInManager` ausgelagert (läuft in der Deal-Transaktion). Bauplan als Spielerbauplan mit Signatur aus `ShipbuildingCoreService`; besitzt der Spieler die Konfiguration bereits, wird die Annahme samt Zahlung zurückgerollt.
  - Admin: `admin/trade/deals` (Liste, anlegen, bearbeiten, beenden) und Seite `/admin/trade-deals` (Karte „Hutten-Deals“). Ein verschobener Start setzt die Benachrichtigung zurück.
  - Benachrichtigung: `TradeDealNotificationService` jede Minute (STU prüft je Prozess-Tick die letzten 60 Sekunden); neue Deals werden in derselben Transaktion markiert und gesperrte Zeilen übersprungen, daher genau einmal je Deal. Empfänger sind Spieler mit gültiger Lizenz am Hutten-Posten, bei Fraktions-Deals nur diese Fraktion; Ordner `TRADE`.
  - Frontend: Tab „Hutten-Deals“ mit Liste (Angebot, Preis, Verfügbarkeit, Ende, eigener Aurodium- und Prestigestand) und Annahmedialog (Anzahl nur bei Warendeals).
  - Modulgraph: `TradeModule` importiert `AuthModule` per `forwardRef`, weil Auth über Kolonie und Spacecraft wieder bei Handel ankommt.
  - Tests: `trade-deals.int-spec.ts` (Sichtbarkeit nach Lizenz, Fraktion, Zeitfenster, Auktion; Ware gegen Ware mit Kürzungen und Löschung; Prestigezahlung mit Log; Schiff; Bauplan inklusive Duplikat-Rollback; Fehlerfälle; Überverkauf bei 5 parallelen Käufern; Benachrichtigung genau einmal, auch bei überlappenden Läufen; Admin-Validierung), `TradeDealsTab.spec.tsx`, `admin-trade-deals.spec.tsx`, `trade.spec.tsx`. Die Mutationsproben (Sperren entfernt, `notifiedAt` nicht gesetzt) lassen die Tests scheitern. Der Schiffsbau selbst ist im Integrationstest durch einen Stellvertreter ersetzt; `createShipInManager` ist eine reine Auslagerung des bestehenden Admin-Spawns.
