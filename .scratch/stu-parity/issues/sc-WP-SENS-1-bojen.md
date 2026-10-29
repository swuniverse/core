# Bojen setzen, analysieren und aufnehmen

**Status:** claimed
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
