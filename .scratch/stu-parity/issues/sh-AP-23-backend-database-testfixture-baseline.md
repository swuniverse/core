# Backend-Testbaseline: ProfileVisitorService-Fixture ergänzen

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Die fachfremd rote Backend-Gesamttestbaseline wird wieder grün, indem manuelle `DatabaseService`-Testkonstruktionen den verpflichtenden `ProfileVisitorService` vollständig mocken. Produktive Profilbesuchersemantik bleibt unverändert.

## Ausgangslage

`nx test backend` scheitert reproduzierbar in zwei Tests aus `apps/backend/src/modules/database/database-settler-scans.service.spec.ts`. `DatabaseService.getSettler()` ruft den seit der Profilbesucher-Integration verpflichtenden Port `profileVisitorService.registerVisit(...)` auf; ältere manuelle Testkonstruktionen übergeben dafür keinen vollständigen Mock und laufen deshalb auf `undefined`.

## SWU-Pfade

- `apps/backend/src/modules/database/database-settler-scans.service.spec.ts`
- weitere manuelle `new DatabaseService(...)`-Testkonstruktionen, falls vom fokussierten Suchlauf betroffen
- `apps/backend/src/modules/database/database.service.ts`
- `apps/backend/src/modules/profile-visitor/profile-visitor.service.ts`

## Akzeptanzkriterien

- [x] Jede betroffene manuelle `DatabaseService`-Testkonstruktion übergibt einen typgerechten `ProfileVisitorService`-Mock mit `registerVisit`.
- [x] Die produktive Profilbesucherregistrierung wird weder optionalisiert noch durch stilles Optional Chaining übersprungen.
- [x] Die Tests prüfen weiterhin ihre ursprüngliche Settler-/Scan-Fachsemantik; Assertions oder Fälle werden nicht entfernt.
- [x] Ein fokussierter Test bestätigt, dass der Settler-Abruf den Profilbesucher-Port mit Besucher- und Zielspieler aufruft, soweit dies bereits Vertragsbestandteil ist.
- [x] `npx nx test backend -- database-settler-scans.service.spec.ts` ist grün.
- [x] `npx nx test backend` ist grün oder meldet ausschließlich einen nachweislich neu hinzugekommenen, separat erfassten und fachfremden Baselinefehler; dieses Issue darf keinen Fehler pauschal ausnehmen.
- [x] Backend-Typecheck und -Build sind grün.

## Entscheidung

Der Fehler wird als eigenes P1/S-Baseline-Issue behoben. Der Fix gehört in die Test-Fixture; produktiver Code wird nicht aufgeweicht. `sc-WP-ENG-2c` bleibt bis zur Auflösung dieses Issues `needs-info` und wird anschließend ohne Baseline-Ausnahme wieder freigegeben.

## Comments

- 2026-10-30 Verifikation: Die vorgesehene Fixture-Reparatur ist im aktuellen Arbeitsstand bereits vorhanden; `database-settler-scans.service.spec.ts` übergibt `profileVisitorService: { registerVisit: jest.fn() }`, ohne den produktiven Aufruf optional zu machen. Fokussierter Test 2/2, vollständige Backend-Suite 165/165 Suites und 1629/1629 Tests, Backend-Typecheck sowie Backend-Build sind grün. Das Baseline-Issue ist `resolved`.
