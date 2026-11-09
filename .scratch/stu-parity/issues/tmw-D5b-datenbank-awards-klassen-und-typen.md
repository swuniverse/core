# Datenbank-Awards: Schiffe, Planetentypen und Systemtypen

**Status:** ready-for-agent
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

- [ ] Neue Entdeckung einer Schiffsklasse, eines Planetentyps oder eines Sternensystemtyps löst die Completion-Prüfung der passenden Kategorie über `tmw-D5a` aus und verwendet deren gepflegte produktive Award-Zuordnung.
- [ ] Jede neue Entdeckung erzeugt einmalig ein Spielereignis „Neuer Datenbankeintrag: <Name> (+x Prestige)“; ein Award erzeugt ein separates Ereignis über den Vertrag aus `tmw-D5a`.
- [ ] Wiederholung oder parallele Discovery-Aufrufe erzeugen weder doppelte Entdeckungsmeldungen noch doppelte Awards.
- [ ] NPC-Konten erhalten weder Prestige noch Awards.
- [ ] Backend-Tests decken Kategorien, Idempotenz und Meldungen ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der erste produktive Umfang umfasst Schiffsrümpfe, Planetentypen und Sternensystemtypen. Regions-Awards bleiben ausgenommen, bis der autoritative Regionskatalog verfügbar ist.

## Comments

- 2026-11-06: Zweites geordnetes Child aus `tmw-D5`; setzt die gemeinsame Award-/Completion-Grundlage `tmw-D5a` voraus.
