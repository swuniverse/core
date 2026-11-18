# Handelsposten-Entdeckung in der Datenbank wie STU

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

In STU erscheint ein Handelsposten in der Datenbankkategorie „Handelsposten“ erst, wenn der Spieler ihn entdeckt hat. Entdeckt wird er beim **Öffnen des Handelsmenüs am Posten** (`ShowTradeMenu` → `checkDatabaseItem`), also nur bei Anwesenheit eines eigenen Schiffs am selben Ort. Die Entdeckung gibt Prestige (Kategorie-Prestige 5 laut STU-Testdaten) und zählt in die Entdeckerrangliste. Die Kategorienliste zeigt entdeckte Posten mit Name, Koordinaten und Entdeckungsdatum; unentdeckte als `???`; mit Ebenenfilter.

SWU listet alle Posten mit Name, Beschreibung, Netz und Betreiber; nur der Ort hängt von der Erkundung ab (tmw-D6a). Es gibt weder Entdeckung noch Prestige.

Umsetzung:

- Neue Entität `TradePostDiscovery` (Spieler, Posten, Zeitpunkt; eindeutig je Spieler/Posten) mit Migration.
- Entdeckung beim erfolgreichen Abruf des Handelsmenüs am Posten (`GET spacecraft/:id/trade/:postId`, nur wenn die Anwesenheitsprüfung besteht), einmalig, in eigener Transaktion analog `ShipClassDiscoveryService`; Prestige 5 (neue Konstante in `STU_PRESTIGE`), Datenbankmeldung über den Discovery-Port; NPC-Konten ohne Prestige.
- `GET database/trade-posts` liefert je Posten `discovered`; unentdeckte nur als Platzhalter (`???`, keine Namen/Netz/Betreiber/Ort). Entdeckte mit Name, Koordinaten (Ebene, x:y bzw. System), Entdeckungsdatum. Ebenenfilter wie bei den übrigen Katalogen.
- Fortschritt (`DatabaseProgress`) und Entdeckerrangliste berücksichtigen Handelsposten, wie in STU über die gemeinsame Datenbank-Entdeckung. Ob die Kategorie einen eigenen Award erhält, wird im Kommentar festgehalten (STU: Kategorie 3 mit Punkten).
- **Keine automatische Gutschrift für Bestandsspieler:** Die Migration legt keine Entdeckungen an, auch nicht für Eigentümer, Lizenzinhaber oder Kontoinhaber. Jeder Spieler entdeckt Posten ab Einführung neu über das Handelsmenü.
- Ein eigener Posten (Spielerposten) gilt ebenfalls erst nach Öffnen des Handelsmenüs als entdeckt, wie STU.

Hinweis: tmw-AUD-11 entfernt parallel den Handels-Tab „Handelsposten“; danach ist die Datenbankkategorie der Listeneinstieg zu bekannten Posten. Beide Tickets sind unabhängig umsetzbar.

## STU-Quellen

- `src/Module/Spacecraft/View/ShowTradeMenu/ShowTradeMenu.php` (Z. 50–63 `checkPosition`, `checkDatabaseItem`)
- `src/Component/Database/AchievementManager.php` (`checkDatabaseItem` Z. 28ff.), `src/Module/Database/Lib/CreateDatabaseEntry.php` (Prestige über Kategorie, NPC ohne Prestige)
- `src/Component/Database/DatabaseCategoryTypeEnum.php` (`TRADEPOST = 3`), `testdata/Migrations/VersionTestDatabaseCategories.php` (Kategorie 3, Prestige 5)
- `src/html/database/databasecategory.twig` (`category_tradeposts` Z. 103ff.: Ebenenfilter, Handelsposten, Koordinaten, Entdeckung)
- `src/admin/scripts/generate_tradepost_dbentries.php` (Datenbankeintrag je Posten)

## SWU-Pfade

- `apps/backend/src/modules/trade/trade-account-transfer.service.ts` (`getMenu` Z. 34), `trade-ship.controller.ts` (`GET :id/trade/:postId` Z. 23)
- `apps/backend/src/modules/trade/trade-post-presence.policy.ts`
- `apps/backend/src/modules/spacecraft/ship-class-discovery.service.ts` (Muster), `entities/ship-class-discovery.entity.ts`
- `apps/backend/src/modules/database/database-discovery.port.ts`, `database-discovery.listener.ts`, `database-completion.service.ts`, `database.service.ts` (`getTradePosts` Z. 164, `getDiscoveryRanking` Z. 1053)
- `apps/backend/src/modules/prestige/prestige.constants.ts`
- `packages/shared/src/lib/database/index.ts` (`DATABASE_AWARD_CATEGORIES`, Postenliste-DTO)
- `apps/frontend/src/pages/database.tsx` (`TradePosts` Z. 652), `apps/frontend/src/components/database/DatabaseProgress.tsx`
- Tests: `apps/backend/src/modules/database/database-trade-posts.service.spec.ts`, Handelsmenü-Specs, `apps/frontend/src/pages/database.spec.tsx`

## Akzeptanzkriterien

- [ ] Öffnen des Handelsmenüs am Posten entdeckt ihn genau einmal je Spieler, mit 5 Prestige und Datenbankmeldung; ohne Anwesenheit (abgelehnter Menüabruf) keine Entdeckung.
- [ ] `GET database/trade-posts` gibt für unentdeckte Posten keine identifizierenden Daten heraus.
- [ ] Liste zeigt entdeckte Posten mit Name, Koordinaten, Entdeckungsdatum; Ebenenfilter.
- [ ] Entdeckerrangliste und Datenbankfortschritt zählen Handelspostenentdeckungen.
- [ ] Migration legt keine Entdeckungen für Bestandsspieler an.
- [ ] Backend-Tests: Entdeckung beim Menüabruf, Wiederholung ohne zweites Prestige, NPC ohne Prestige, Redaktion unentdeckter Posten, Rangliste zählt mit. Frontend-Tests: `???`-Zeilen, entdeckte Zeile mit Datum, Ebenenfilter.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt F (durchgestrichener tmw-D6a-Eintrag → N4), H „Prestige: Ebenso fehlen Datenbankeinträge außerhalb von Scans (Handelsposten …)“, N2 „Handelsposten in der Datenbank ohne Entdeckung → Eintrag erst nach Entdeckung“, N4 „Handelsposten-Entdeckung“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) Kleine Abweichungen „Handelsposten-Kategorie“.
- PO-Nachtrag N4 vom 2026-11-17: wie STU, mit Prestige; bestehende Spieler bekommen keine automatische Gutschrift.
- Ersetzt tmw-D6a (POI-Liste aller Posten ohne Entdeckung) und den `map.md`-Eintrag „tmw-D6a – Handelsposten-Datenbankliste …“.

## Comments
