# Zeilensperren mit geladenen Relationen brechen auf PostgreSQL ab

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

TypeORM lädt `relations` per LEFT JOIN. Zusammen mit `lock: { mode: 'pessimistic_write' }` ohne `tables` erzeugt das `FOR UPDATE` auf alle verbundenen Tabellen, und Postgres bricht ab: „FOR UPDATE cannot be applied to the nullable side of an outer join“ → HTTP 500. Beim Traktorstrahl (sc-WP-TRACT-1d) ist das im Spiel aufgefallen; dasselbe Muster steckt in Entern, Übernahme und Holonet-Plotanträgen. Die Unit-Tests mocken die Datenbank und sehen den Fehler nicht.

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-boarding.service.ts` (`validate`: Schiffe; Crew-Zuweisungen)
- `apps/backend/src/modules/spacecraft/spacecraft-takeover.service.ts` (`start`; `processTick`: Ziel)
- `apps/backend/src/modules/holonet/holonet.service.ts` (`decidePlotPostRequest`)
- Vorbild: `ship-colony-context.service.ts`, `spacecraft-tractor.service.ts` (`tables: [...]`)

## Akzeptanzkriterien

- [x] Alle gefundenen Sperren mit `relations` sperren nur ihre Basistabelle (`tables: ['spacecraft']`, `['crew_assignments']`, `['plot_post_requests']`).
- [x] Vollständige Suche: Find-Optionen mit `relations` plus Sperre ohne `tables` (5 echte Treffer; 2 Fehltreffer im Allianz-Store ohne Relationen; keine `eager`-Relationen im Projekt) und QueryBuilder mit `setLock` plus `leftJoin` (keine Treffer).
- [x] PostgreSQL-Test je erreichbarem Pfad, vor dem Fix rot (QueryFailedError), danach grün.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

Commit: `fix(backend): lock only base tables when loading relations (stu-parity sc-AUD-13)`

- Neu: `apps/backend/src/modules/spacecraft/row-lock-relations.int-spec.ts` (Übernahme-Start, Übernahme-Tick, Entern, Plotantrag). Vor dem Fix 4/4 rot mit `QueryFailedError`, danach 4/4 grün.
- Für den Holonet-Test sind `HolonetPost`, `PlotPostRequest`, `RpgPlot`, `RpgPlotMember`, `UserCharacter` in `INTEGRATION_ENTITIES` aufgenommen.
- Nicht durch einen Test erreicht: die Crew-Sperre in `boarding.validate` (liegt hinter Truppenquartier- und Crewprüfungen); gleicher Mechanismus, gleicher Fix.
- Checks: Jest `spacecraft`, `holonet`, `alert-reaction`, `combat` 975/975; `nx typecheck backend` ✓; volle Integrationssuite 109 Suites, 1076 Tests ✓.
- Modell: Claude Opus 5.5 direkt.
- Ausstehend: gesammelter Verifikationslauf.
