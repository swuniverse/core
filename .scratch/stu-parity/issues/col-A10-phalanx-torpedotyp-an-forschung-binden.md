# Phalanx-Torpedotyp an die Forschung binden

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

`setDefenseTorpedoType` prüft nur, ob der Torpedotyp existiert. STU erlaubt nur Torpedotypen, die der Spieler erforscht hat (`TorpedoTypeRepository::getForUser`), und meldet sonst „Unerlaubter Torpedo-Typ“. Auch die Auswahl in der UI soll nur erlaubte Typen anbieten.

## STU-Quellen

- `src/Module/Colony/Action/ChangeTorpedoType/ChangeTorpedoType.php` (Z. 37–39)
- `src/Orm/Repository/TorpedoTypeRepository.php::getForUser`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` (`setDefenseTorpedoType`, Z. ~689)
- `apps/backend/src/modules/research/research.service.ts`, `unlock-resolver.service.ts` (erforschte Techs)
- `game-data/data/torpedoes/stu-torpedoes.yaml` (`researchId`)
- `apps/frontend/src/pages/colonies/components/PanelDefense.tsx`

## Akzeptanzkriterien

- [x] Ein Torpedotyp mit `researchId` ist nur wählbar, wenn der Spieler diese Forschung abgeschlossen hat; sonst `400` mit „Unerlaubter Torpedo-Typ“. Typen ohne `researchId` sind immer erlaubt; `null` (kein Torpedo) bleibt erlaubt.
- [x] Die Projektion bzw. ein Endpunkt liefert die erlaubten Typen; `PanelDefense.tsx` bietet nur diese an.
- [x] Backend-Tests: erlaubter, nicht erforschter und unbekannter Typ.
- [x] Frontend-Test: nicht erforschter Typ erscheint nicht in der Auswahl.

## Comments

Research authorization is enforced in `ColonyService`, and the colony projection now returns every researched torpedo type regardless of current stock. The frontend request contract was aligned with the backend and `PanelDefense` coverage verifies that only projected options appear. No follow-up gaps found.
