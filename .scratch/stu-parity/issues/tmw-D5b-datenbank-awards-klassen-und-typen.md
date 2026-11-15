# Datenbank-Awards: Schiffe, Planetentypen und Systemtypen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-D5a

## Ziel

Verknüpft neue Entdeckungen von Schiffsrümpfen, Planetentypen und Sternensystemtypen mit Datenbankmeldungen und der gemeinsamen Award-Completion-Prüfung aus `tmw-D5a`.

## STU-Quellen

- `src/Module/Database/Lib/CreateDatabaseEntry.php`
- Schiffsrumpf-, Planetentyp- und Systemtyp-Discovery-Flows aus den STU-`Module/Database`-Pfaden

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/ship-class-discovery.service.ts`
- `apps/backend/src/modules/starmap/celestial-class-discovery.service.ts`
- `apps/backend/src/modules/starmap/system-type-discovery.service.ts`
- `apps/backend/src/modules/events/game-event.service.ts`
- `packages/shared/src/lib/` (Spielereignisverträge)

## Akzeptanzkriterien

- [x] Neue Entdeckung einer Schiffsklasse, eines Planetentyps oder eines Sternensystemtyps löst die Completion-Prüfung der passenden Kategorie über `tmw-D5a` aus und verwendet deren gepflegte produktive Award-Zuordnung.
- [x] Jede neue Entdeckung erzeugt einmalig ein Spielereignis „Neuer Datenbankeintrag: <Name> (+x Prestige)“; ein Award erzeugt ein separates Ereignis über den Vertrag aus `tmw-D5a`.
- [x] Wiederholung oder parallele Discovery-Aufrufe erzeugen weder doppelte Entdeckungsmeldungen noch doppelte Awards.
- [x] NPC-Konten erhalten weder Prestige noch Awards.
- [x] Backend-Tests decken Kategorien, Idempotenz und Meldungen ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der erste produktive Umfang umfasst Schiffsrümpfe, Planetentypen und Sternensystemtypen. Regions-Awards bleiben ausgenommen, bis der autoritative Regionskatalog verfügbar ist.

## Comments

- 2026-11-06: Zweites geordnetes Child aus `tmw-D5`; setzt die gemeinsame Award-/Completion-Grundlage `tmw-D5a` voraus.
- 2026-11-15: Umgesetzt (0b5782a0).
  - `ShipClassDiscoveryService`, `CelestialClassDiscoveryService` und `SystemTypeDiscoveryService` melden eine neue Entdeckung nach dem Commit über den globalen Port `DATABASE_DISCOVERY` (`database-discovery.port.ts`, `DatabaseDiscoveryPortModule`). Der `DatabaseDiscoveryListener` im Database-Modul sendet `WsEventType.DATABASE_ENTRY_DISCOVERED` (`DatabaseEntryDiscoveredEventDto`, Text „Neuer Datenbankeintrag: <Name> (+x Prestige)“) und ruft `DatabaseCompletionService.checkCompletion` für die Kategorie auf; ein Award kommt separat als `AWARD_GRANTED` (tmw-D5a). Fehler der Award-Prüfung werden geloggt und machen die Entdeckung nicht rückgängig.
  - Abweichung von „Spielereignis“: STU zeigt die Meldung nur dem handelnden Spieler (`AchievementManager`), nicht als öffentliches Galaxie-Ereignis; SWU folgt STU mit einem Spieler-Ereignis. `game-event.service.ts` bleibt unverändert.
  - Idempotenz: das bestehende `INSERT … ON CONFLICT DO NOTHING` der Entdeckungen sorgt dafür, dass nur der erste Aufruf meldet; der Award-Dienst ist idempotent.
  - NPC (STU `createDatabaseEntryForUser`): Entdeckung wird gespeichert, aber ohne Prestige, Meldung und Award-Prüfung (`isNpcUser` in `auth/non-npc-users.ts`).
  - Tests: `database-completion.int-spec.ts` (Systemtyp mit Meldung und Award beim letzten Typ, parallele Entdeckung nur einmal, Planetentyp-Meldung und Rumpf-Vollständigkeit, NPC ohne Prestige/Meldung/Award); Fakes der drei Discovery-Unit-Specs ergänzt.
  - Gates: Lint 0 Fehler (1430/110), Typecheck und Build grün, Backend-Unit 2123/2123, Frontend 763/763, Integration 746/746.

