# Maintenance: täglicher Crew-XP-Tick, leere RPG-Plots löschen, fehlende Awards nachtragen

**Status:** ready-for-agent
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

- [ ] Neuer Handler `crew-experience` löst täglich `MAINTENANCE_TICK` für jedes Spieler-Spacecraft aus, das die STU-Auswahl erfüllt (kein NPC; Crew an Bord oder im Bau/Abwracken oder Bauplan ohne Crewbedarf; Besitzer nicht in wirksamem Urlaub nach `isVacationEffective`). Verarbeitung in Batches.
- [ ] Neuer Handler `empty-rpg-plots` löscht Plots mit Start älter als 7 Tage und ohne HoloNet-Beitrag mit `plotId`; Mitglieder samt Systemnachricht wie STU (deutsch).
- [ ] Neuer Handler `missing-awards` ruft für jeden Nicht-NPC-Spieler `checkCompletion` je Award-Kategorie auf (Sternsysteme je Ebene); vergibt nur fehlende Awards, keine doppelten Prestige-Gutschriften.
- [ ] Alle drei Handler sind in `MAINTENANCE_HANDLERS` registriert, liefern eine Zusammenfassung für die Laufhistorie und brechen bei Fehler eines Einzelobjekts nicht den ganzen Lauf ab.
- [ ] `map.md`/sc-WP-CREW-2: Ereignisquelle `MAINTENANCE_TICK` als umgesetzt vermerken.
- [ ] Backend-Tests: Crew-XP für bemanntes Schiff, nicht für NPC, nicht bei Urlaub > 48 h, wohl bei Urlaub < 48 h; Plot ohne Beitrag > 7 Tage gelöscht samt Nachricht, Plot mit Beitrag oder jünger bleibt; fehlender Award wird nachgetragen, vorhandener nicht doppelt (PostgreSQL-Integrationstest für Award und Plot).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B7 und Abschnitt D (sc-WP-CREW-2).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G9.
- PO-Linie 2026-11-17 „wie STU“. sc-WP-CREW-2 ist resolved („Ereignisquellen“), die Quelle `MAINTENANCE_TICK` fehlt aber.

## Comments
