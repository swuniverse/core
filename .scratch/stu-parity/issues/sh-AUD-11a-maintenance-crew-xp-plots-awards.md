# Maintenance: täglicher Crew-XP-Tick, leere RPG-Plots löschen, fehlende Awards nachtragen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die tägliche Wartung (3 Uhr) hat in SWU 7 Handler, STU registriert 22. Drei spielrelevante Lücken schließt dieses Ticket:

1. **Crew-XP-Wartungstick:** `CrewEnhancementEvent.MAINTENANCE_TICK` ist in `crew-expertise.ts` definiert (TECHNICAL +1), wird aber nirgends ausgelöst. Technik-Crew sammelt keine tägliche Grund-XP, Beförderungen kommen langsamer als in STU. STU: `MaintenanceCrewExperienceHandler` löst für jedes Spieler-Spacecraft aus `getPlayerSpacecraftsForTick` (kein NPC; mit Crew, oder im Bau/Abwracken, oder Bauplan ohne Crew; Besitzer nicht in wirksamem Urlaub) `SkillEnhancementEnum::MAINTENANCE_TICK` aus.
2. **Leere RPG-Plots:** STU `EmptyPlotDeletion` löscht Plots, die älter als 7 Tage sind und keinen HoloNet-Beitrag haben. Jedes Mitglied erhält eine Systemnachricht „Der Plot "<Titel>" wurde gelöscht, da er veraltet ist und keine Beiträge enthält.“
3. **Fehlende Awards:** STU `CreateMissingUserAwards` prüft für jeden Nicht-NPC-Spieler jede Datenbankkategorie auf Vollständigkeit und vergibt fehlende Kategorie-Awards nach (z. B. nach neu hinzugefügten Kategorien/Awards oder verpassten Ereignissen).

## STU-Quellen

- `src/Module/Maintenance/services.php` (Z. 30–53, Handlerliste)
- `src/Module/Maintenance/MaintenanceCrewExperienceHandler.php`
- `src/Orm/Repository/SpacecraftRepository.php` (Z. ~193–225, `getPlayerSpacecraftsForTick`)
- `src/Component/Crew/Skill/SkillEnhancementEnum.php` (Z. 30, `MAINTENANCE_TICK`)
- `src/Module/Maintenance/EmptyPlotDeletion.php` (`MAX_AGE_IN_SECONDS = 7 Tage`)
- `src/Orm/Repository/RpgPlotRepository.php` (Z. ~83–100, `getEmptyOldPlots`)
- `src/Module/Maintenance/CreateMissingUserAwards.php`
- `src/Module/Database/Lib/CreateDatabaseEntry.php` (`checkForCategoryCompletion`)

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.module.ts` (Z. ~91–111, `MAINTENANCE_HANDLERS`)
- `apps/backend/src/modules/tick/maintenance.service.ts` (`MaintenanceHandler`-Interface, Cron 3 Uhr)
- `apps/backend/src/modules/spacecraft/crew-expertise.ts` (Z. 28, 69), `crew-enhancement.service.ts#enhanceSpacecraft`
- `packages/shared/src/lib/auth/index.ts` (`isVacationEffective`)
- `apps/backend/src/modules/rpg/rpg-plot.service.ts`, `rpg-plot.entity.ts`, `rpg-plot-member.entity.ts`
- `apps/backend/src/modules/holonet/entities/holonet-post.entity.ts` (`plotId`)
- `apps/backend/src/modules/messaging/` (`sendSystem`)
- `apps/backend/src/modules/database/database-completion.service.ts#checkCompletion`
- `apps/backend/src/modules/awards/award.service.ts`

## Akzeptanzkriterien

- [x] Neuer Handler `crew-experience` löst täglich `MAINTENANCE_TICK` für jedes Spieler-Spacecraft aus, das die STU-Auswahl erfüllt (kein NPC; Crew an Bord oder im Bau/Abwracken oder Bauplan ohne Crewbedarf; Besitzer nicht in wirksamem Urlaub nach `isVacationEffective`). Verarbeitung in Batches.
- [x] Neuer Handler `empty-rpg-plots` löscht Plots mit Start älter als 7 Tage und ohne HoloNet-Beitrag mit `plotId`; Mitglieder samt Systemnachricht wie STU (deutsch).
- [x] Neuer Handler `missing-awards` ruft für jeden Nicht-NPC-Spieler `checkCompletion` je Award-Kategorie auf (Sternsysteme je Ebene); vergibt nur fehlende Awards, keine doppelten Prestige-Gutschriften.
- [x] Alle drei Handler sind in `MAINTENANCE_HANDLERS` registriert, liefern eine Zusammenfassung für die Laufhistorie und brechen bei Fehler eines Einzelobjekts nicht den ganzen Lauf ab.
- [x] `map.md`/sc-WP-CREW-2: Ereignisquelle `MAINTENANCE_TICK` als umgesetzt vermerken.
- [x] Backend-Tests: Crew-XP für bemanntes Schiff, nicht für NPC, nicht bei Urlaub > 48 h, wohl bei Urlaub < 48 h; Plot ohne Beitrag > 7 Tage gelöscht samt Nachricht, Plot mit Beitrag oder jünger bleibt; fehlender Award wird nachgetragen, vorhandener nicht doppelt (PostgreSQL-Integrationstest für Award und Plot).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B7 und Abschnitt D (sc-WP-CREW-2).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G9.
- PO-Linie 2026-11-17 „wie STU“. sc-WP-CREW-2 ist resolved („Ereignisquellen“), die Quelle `MAINTENANCE_TICK` fehlt aber.

## Comments

### 2026-11-24 – umgesetzt, Prüfung ausstehend

Commit `727a3fe9` (feat(maintenance): STU crew XP tick, empty RPG plot deletion, missing award backfill).

- `tick/crew-experience-maintenance.service.ts` (`crew-experience`): Keyset-Batches à 500 über Spacecraft mit Crew-Zuweisung, Besitzer kein NPC, `isVacationEffective` ausgeschlossen; je Schiff eigene Transaktion über `CrewEnhancementService#enhanceSpacecraft(MAINTENANCE_TICK)`. Schiffe ohne Crew werden nicht gewählt (bekämen auch in STU keine XP).
- `rpg/empty-plot-maintenance.service.ts` (`empty-rpg-plots`): Plots mit `startedAt` älter als 7 Tage ohne nicht gelöschten HoloNet-Beitrag; Löschung und Systemnachricht („Plot gelöscht“, STU-Text) je Plot in einer Transaktion.
- `tick/missing-awards-maintenance.service.ts` (`missing-awards`): je Nicht-NPC-Spieler `checkCompletion` für alle `DATABASE_AWARD_CATEGORIES` (Sternsysteme über alle Ebenen); `AwardService#grant` ist idempotent.
- Alle drei in `MAINTENANCE_HANDLERS` registriert, liefern Zusammenfassungstext, fangen Fehler je Schiff/Plot/Spieler ab.
- Tests: `tick/maintenance-handlers.int-spec.ts` (Crew-XP inkl. NPC/Urlaub 49 h/47 h; Plot alt/jung/mit Beitrag samt Nachrichten), `database/database-completion.int-spec.ts` (Award-Nachtrag einmalig, NPC ausgeschlossen) – PostgreSQL grün. `nx typecheck backend` grün, ESLint der geänderten Dateien sauber, `app-module-graph.spec`, `maintenance.service.spec`, `rpg-transponder.int-spec` (AppModule-Start) grün.
- Routing: Sol/Luna in dieser Session nicht verfügbar, direkt mit Claude Opus 5.5 umgesetzt.

Ausstehend: gesammelter Verifikationslauf (Diff-Review gegen AK, volle Backend-Unit- und Integrationssuite).

- 2026-11-24 – **resolved.** Gesammelter Verifikationslauf (Claude Opus 5.5; Sol/Luna in dieser Session nicht verfügbar) auf `f1e0c2f2`: `nx run-many -t build typecheck lint` (backend, frontend, shared) grün; Unit Backend 2764/2764, Frontend 1028/1028; PostgreSQL-Integration 1045/1089 im Gesamtlauf – die 44 Fehler (6 Suiten) waren Test-Fixtures mit alten `sendSystem`-Argumentpositionen bzw. der historische Kolonie-Ereignis-Migrationstest nach dem Betreff-Wegfall (soc-AUD-07b), behoben in `f1e0c2f2`, betroffene Suiten danach 112/112 grün. Diff-Review ohne inhaltlichen Befund (Auswahl nur bemannter Schiffe begründet, da ohne Crew keine XP). `maintenance-handlers.int-spec` hatte nach soc-AUD-07b eine veraltete Argumentposition, korrigiert und grün.
