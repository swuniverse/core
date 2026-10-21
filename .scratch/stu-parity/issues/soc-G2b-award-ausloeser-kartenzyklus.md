# Award-Auslöser: Ebene vollständig erkundet (Kartenzyklus)

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-G1, tmw-K5

## Ziel

STU vergibt im Kartenzyklus (`MapCycle`) den Award der Ebene, sobald ein Spieler eine Ebene vollständig kartiert hat. In SWU entsteht der Kartenzyklus mit tmw-K5 (Ebenen-Kenntnis und Kartenzyklus). Dieses Issue hängt die Award-Vergabe an dessen Ereignis „Ebene vollständig erkundet“.

## STU-Quellen

- `src/Module/Maintenance/MapCycle.php` (`$userLayer->getLayer()->getAward()` → `createAwardForUser`)
- `src/Orm/Entity/Layer.php` (`award`)

## SWU-Pfade

- Kartenzyklus/Ebenenstatus aus tmw-K5 (voraussichtlich `apps/backend/src/modules/starmap/*`)
- Ebenen-Konfiguration (Award-Key je Ebene, optional)
- `apps/backend/src/modules/awards/*`

## Akzeptanzkriterien

- [ ] Ebenen können optional einen `awardKey` tragen.
- [ ] Wechselt eine Ebene für einen Spieler in den Status „explored“, wird der Award vergeben; bei wiederholtem Zyklus mit `incrementExisting` (Anzahl steigt), wie STU über die Count-Logik.
- [ ] Fehler bei der Vergabe brechen den Zyklus nicht ab.
- [ ] Backend-Tests: Vergabe bei Erkundung, keine Vergabe ohne `awardKey`, Wiederholung.

## Comments
