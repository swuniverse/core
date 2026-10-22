# Handels-Domänenmodell, NPC-Handelsposten und Handelsseite (lesend)

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** tmw-W1

## Ziel

Das Fundament des Handels: Entitäten für Handelsposten, Warenkonten (Spieler × Posten × Ware), Lizenzbedingungen, Lizenzen, Angebote und Transfers, dazu der Seed der NPC-Handelsposten und eine schreibgeschützte Handelsseite `/trade`. Die Seite zeigt Postenliste, eigene Konten mit freiem Platz und Posteninfo mit den Schiffen vor Ort. Alle weiteren Handels-Issues bauen darauf auf.

**Vorgaben (Leitplanken 2–4, ohne Abweichung von STU):**
- Zahlungsmittel ist **Aurodium** (Ware `id 50`, umbenanntes STU-Latinum, schon so in SWU).
- Handelsposten sind **eigene Ortsobjekte** (gebunden an `SpaceLocation`), nicht an Stationen. Die optionale Stationsbindung (`stationId`, nullable) wird für tmw-T12a vorbereitet. NPC-Posten gibt es sofort, Spielerposten erst mit Stationen.
- **Handelsnetze wie STU:** ganzzahlige Netz-ID. NPC-Posten gehören zu Fraktionsnetzen (1 = Galaktisches Imperium, 2 = Rebellenallianz) bzw. zum Netz des Hutten-Kartells. Spielerposten erhalten später die Netz-ID ihres Eigentümers.
- Eigentümer der NPC-Posten sind die NPCs aus tmw-W1. Der Agent legt pro Fraktionsnetz mindestens zwei Posten nahe den Heimatzonen und einen Hutten-Handelsposten in neutralem Raum an (Lage dokumentiert).

## STU-Quellen

- `src/Orm/Entity/TradePost.php` (Name, Beschreibung, Netz, Level, Transferkapazität, Lager, Station), `Storage.php` (`tradepost_id`, `tradeoffer_id`), `TradeLicense.php`, `TradeLicenseInfo.php`, `TradeOffer.php`, `TradeTransfer.php`, `TradeTransaction.php`
- `src/Module/Trade/View/ShowAccounts/*`, `ShowTradePostInfo/*`, `ShowShiplist/*`, `src/html/trade/*.twig` (insb. `tradePostInfo.twig`)
- `src/Module/Trade/Lib/TradeAccountWrapper.php`, `TradePostStorageManager.php` (freier Platz = Lagerlimit − Summe Konto + Angebote)
- `src/Component/Trade/TradeEnum.php`

## SWU-Pfade

- Neues Modul `apps/backend/src/modules/trade/` (entities, service, controller, module), Shared-DTOs `packages/shared/src/lib/trade/`
- `apps/backend/src/modules/starmap/entities/space-location.entity.ts`, `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Schiffe am Ort)
- `apps/backend/src/modules/game-data/game-data.service.ts` (`isTradeOnly`, Waren)
- Frontend: neue Seite `apps/frontend/src/pages/trade.tsx`, Route in `apps/frontend/src/app/app.tsx`, Navigation `apps/frontend/src/components/layout/sidebar.tsx`, `bottom-nav.tsx`
- Erweiterungspunkt der Lagerorte aus tmw-D1 (Konten als Quelle registrieren)

## Akzeptanzkriterien

- [ ] Die Entitäten `TradePost`, `TradeAccountStorage` (Spieler, Posten, Ware, Menge; eindeutig je Kombination), `TradeLicenseInfo`, `TradeLicense`, `TradeOffer` (mit Reserve-Menge), `TradeTransfer` und `TradeTransaction` sind per Migration angelegt, mit Indizes und Fremdschlüsseln, die beim Löschen sinnvoll kaskadieren.
- [ ] Ein `TradePostStorageService` berechnet Bestand, Belegung und freien Platz je Spieler und Posten und bietet `add`/`remove` mit Platzprüfung (pessimistische Sperre bzw. Transaktion gegen Doppelbuchung).
- [ ] Ein idempotenter Seed legt die NPC-Posten laut Vorgabe an, mit Lagerlimit, Transferkapazität und einer Lizenzbedingung (Ware Aurodium, Menge, Dauer), Werte orientiert an STU.
- [ ] `GET trade/posts` listet Posten mit Netz, Ort (nur bei erkundetem Feld), Eigentümer und „Lizenz vorhanden“. `GET trade/accounts` liefert die eigenen Konten je Posten mit Waren und freiem Platz. `GET trade/posts/:id` liefert die Posteninfo mit den eigenen Schiffen am Ort.
- [ ] Die Seite `/trade` (Navigation „Handel“) mit Seitenkopf `/ Handel` zeigt die Tabs „Warenkonten“ und „Handelsposten“ im STU-Layout (Box je Posten, Warenicon-Tabelle, „x / y belegt“) und eine Posteninfo als Dialog. Alle Aktionsknöpfe späterer Issues fehlen noch.
- [ ] Kontobestände erscheinen in der Warenübersicht bzw. bei den Lagerorten aus tmw-D1 (Quelle registriert).
- [ ] Die Vorgaben (Hutten-Kartell, Netze, Aurodium, Ortsobjekte) sind in `map.md` unter „Entscheidungen“ eingetragen.
- [ ] Backend-Tests: Speicherdienst (Platz, Überlauf, Nebenläufigkeit), Seed-Idempotenz, Endpunkte (nur eigene Konten, Nebel für Orte). Frontend-Tests (`trade.spec.tsx`): beide Tabs und Posteninfo.

## Comments
