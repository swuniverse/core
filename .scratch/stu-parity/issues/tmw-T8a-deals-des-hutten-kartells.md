# Deals des Hutten-Kartells (Sofortangebote)

**Status:** ready-for-agent
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

- [ ] Die Entität `TradeDeal` (Typ Sofortkauf bzw. Auktion für tmw-T8b; Gegenstand Ware/Schiff/Bauplan; Preis Ware bzw. Aurodium oder Prestige; Menge; Fraktion optional; Start und Ende) ist per Migration angelegt.
- [ ] Admins können Deals anlegen, bearbeiten und beenden (`admin/trade/deals`, Formular in `admin.tsx`).
- [ ] `GET trade/deals` liefert die aktiven Sofort-Deals für Spieler mit Lizenz am Hutten-Posten, gefiltert nach Fraktion. Ohne Lizenz kommt der Hinweis „Handelslizenz beim Hutten-Kartell erforderlich“.
- [ ] `POST trade/deals/:id/take { amount }` setzt die STU-Prüfungen um. Die Zahlung erfolgt aus dem Konto am Hutten-Posten bzw. als Prestige mit Prestigelog. Waren gehen aufs Konto, Schiffe entstehen am Postenort im Besitz des Käufers, Baupläne werden dem Spieler gutgeschrieben. Die Restmenge wird verringert, mit Sperre gegen Überverkauf.
- [ ] Ein Tick-Job meldet neu gestartete Deals einmalig per Handelsnachricht des Hutten-Kartells an alle lizenzierten Spieler.
- [ ] Backend-Tests: Sichtbarkeit (Lizenz, Fraktion, Zeitfenster), alle drei Gegenstandsarten, beide Zahlarten, Überverkauf bei Parallelität, Benachrichtigung genau einmal. Frontend-Tests: Dealliste und Annahmedialog.

## Comments
