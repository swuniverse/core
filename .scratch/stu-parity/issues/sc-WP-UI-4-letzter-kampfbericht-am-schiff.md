# Letzten Kampfbericht am Schiff anzeigen

**Status:** needs-info
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

Umsetzung nach zwei Prüfversuchen abgebrochen und Produktcode verworfen: Backend- und Frontend-Tests sowie alle Builds waren grün, aber der verpflichtende Frontend-Typecheck scheitert repo-weit an bereits vorhandenen Fehlern (`database.tsx`-Faction-Typ sowie zahlreiche TS6305-Fehler für fehlende Deklarationsausgaben). Bitte den Typecheck-Baselinefehler beheben oder bestätigen, dass für dieses Issue ein sauberer Changed-Files-Typecheck genügt.
