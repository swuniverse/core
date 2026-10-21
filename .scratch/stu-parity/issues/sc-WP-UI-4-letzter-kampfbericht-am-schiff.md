# Letzten Kampfbericht am Schiff anzeigen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Wie STU (`showFightLog`) kann der Spieler am Schiff den letzten Kampfbericht erneut öffnen, auch nach Seitenwechsel. Der Regionsteil des ursprünglichen Pakets liegt kanonisch in tmw-K8a.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/spacecraft/spacecraft.twig` Z. 10 (`showFightLog`)
- `Lib/Battle/*` (Kampflog-Erzeugung)

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts`, `combat-report.formatter.ts`
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` bzw. neue Tabelle für den letzten Bericht
- `apps/frontend/src/components/spacecraft/CombatReportDialog.tsx`, `ShipQuickActions.tsx`

## Akzeptanzkriterien

- [ ] Nach jedem Kampf wird der formatierte Bericht für jedes beteiligte, nicht zerstörte Schiff als „letzter Kampfbericht“ gespeichert (Migration nach `docs/typeorm-migrations.md`), nur für den Eigentümer lesbar.
- [ ] `GET /spacecraft/:id/last-combat-report` liefert ihn oder 404; Backend-Test inklusive Fremdzugriff.
- [ ] In der Schiffsansicht öffnet ein Icon den Bericht im `CombatReportDialog`; ohne Bericht ist das Icon ausgeblendet.
- [ ] Frontend-Test für Anzeige und Ausblendung.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
