# Bojen setzen, analysieren und aufnehmen

**Status:** needs-info
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Wie in STU setzt ein Schiff eine Boje mit Text auf seinem Feld, andere lesen sie per Analyse, der Eigentümer nimmt sie wieder auf. Der Sektor-Scan füllt `buoys`.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/{DropBuoy,TakeBuoy}`, `Module/Spacecraft/View/ShowAnalyseBuoy`, `Module/Ship/View/ShowBuoyList`
- `Orm/Entity/Buoy.php`, `html/ship/analysebuoy.twig`

## SWU-Pfade

- neue Entity `apps/backend/src/modules/spacecraft/entities/buoy.entity.ts`, Migration
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (`buoys: []`), `spacecraft.controller.ts`
- `apps/frontend/src/components/spacecraft/SensorOperationsPanel.tsx`, `FieldContextPanel.tsx`

## Akzeptanzkriterien

- [ ] Boje setzen mit Text (Länge begrenzt, BBCode wie Logbuch), Kosten/Limit wie STU (ggf. Ware Boje); eine Liste der eigenen Bojen.
- [ ] Bojen am Feld erscheinen im Sektor-Scan und im Feldkontext; Analyse zeigt Text, Eigentümer und Datum.
- [ ] Nur der Eigentümer nimmt die Boje auf.
- [ ] Backend-Tests (setzen, lesen, aufnehmen, Fremdaufnahme abgelehnt), Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Blockiert durch fehlende Produktentscheidung: STU setzt Bojen nur mit gesunder Torpedorampe, 1 EPS und einer Ware „Boje“, erlaubt höchstens 16 eigene Bojen und begrenzt den Text auf 60 Zeichen. In SWU existieren weder eine kanonische Bojen-Waren-ID noch eine festgelegte Kosten-/Rückgabe-Regel. Soll eine neue Ware „Boje“ eingeführt werden (bitte ID und Herstellungs-/Bezugsweg festlegen), oder sollen Bojen vorerst nur 1 EPS ohne Warenverbrauch kosten? Zusätzlich widerspricht das Akzeptanzkriterium „Nur der Eigentümer nimmt die Boje auf“ dem STU-Verhalten, das auch Fremdaufnahme mit Eigentümerbenachrichtigung erlaubt; bitte bestätigen, dass SWU bewusst eigentümerexklusiv bleiben soll.
