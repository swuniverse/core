# Datenbankkategorie RPG-Schiffe

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU hat die Datenbankkategorie „RPG-Schiffe“ (`DatabaseCategoryTypeEnum::RPGSHIP`, Testdaten: 100 Prestige je Eintrag). Ein Admin weist einem einzelnen Schiff einen eigenen Datenbankeintrag zu (`Spacecraft::database_id`). Wer dieses Schiff scannt, entdeckt den Eintrag (`ShowScan` → `checkDatabaseItem($target->getDatabaseId())`) und erhält das Prestige. Der Datenbank-Hub listet die Kategorie mit `???` für unentdeckte Einträge. SWU kennt die Kategorie nicht.

Umsetzung:

- Admin kann einem Schiff einen RPG-Datenbankeintrag (Name, Beschreibung) zuweisen und entfernen; Pflege auf der bestehenden Admin-Seite für RPG-Schiffe.
- Zielscan eines Schiffs mit Eintrag entdeckt ihn einmalig je Spieler über den bestehenden Discovery-Port; Prestige wie STU (100).
- Datenbank-Hub: Kategorie „RPG-Schiffe“ mit Liste (entdeckt: Name, Entdeckungsdatum; sonst `???`).
- Entscheiden und im Kommentar festhalten, ob die Kategorie in den Award-Fortschritt eingeht (STU: Kategorie hat Punkte; `DATABASE_AWARD_CATEGORIES` in SWU enthält sie bisher nicht).

## STU-Quellen

- `src/Component/Database/DatabaseCategoryTypeEnum.php` (`RPGSHIP = 2`), `DatabaseEntryTypeEnum.php` (`DATABASE_TYPE_RPGSHIPS`)
- `src/Module/Game/Lib/View/Provider/DatabaseProvider.php` (`RPG_SHIP_LIST`), `src/html/view/database.twig` (Z. 8)
- `src/Module/Spacecraft/View/ShowScan/ShowScan.php` (Z. 105), `src/Orm/Entity/Spacecraft.php` (`database_id`)
- `src/Module/Database/Lib/CreateDatabaseEntry.php`, `testdata/Migrations/VersionTestDatabaseCategories.php` (Prestige 100)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts`, `ship-class-discovery.service.ts` (Muster für Entdeckung)
- `apps/backend/src/modules/database/database-discovery.port.ts`, `database-discovery.listener.ts`, `database.service.ts`, `database.controller.ts`
- `apps/backend/src/modules/spacecraft/rpg-transponder.controller.ts`, `apps/frontend/src/pages/admin-rpg-ships.tsx`
- `apps/backend/src/modules/prestige/prestige.constants.ts`
- `packages/shared/src/lib/database/index.ts`, `apps/frontend/src/pages/database.tsx` (Hub-Gruppen)
- Tests: Backend-Scan-/Discovery-Specs, `apps/frontend/src/pages/database.spec.tsx`, `admin-rpg-ships.spec.tsx`

## Akzeptanzkriterien

- [ ] Neue Entität für RPG-Datenbankeinträge (bzw. Spalten am Schiff) mit Migration; nur Admins pflegen sie.
- [ ] Scan entdeckt den Eintrag genau einmal je Spieler mit 100 Prestige und Datenbankmeldung; NPC-Konten erhalten kein Prestige.
- [ ] Hub-Kategorie „RPG-Schiffe“ mit Liste; unentdeckte Einträge als `???`.
- [ ] Zerstörung oder Admin-Entfernung lässt bestehende Entdeckungen bestehen.
- [ ] Backend-Tests: Zuweisung nur Admin, Entdeckung einmalig, Prestige. Frontend-Tests: Kategorie im Hub, Liste, Admin-Zuweisung.

## Herkunft

- Audit: [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) Seitenabgleich `database.twig` (Hub) und Kleine Abweichungen „Kategorie RPG-Schiffe“ (kein Ticket gefunden).
- Teil von tmw-AUD-06, wegen Größe als eigenes Ticket ausgegliedert.

## Comments
