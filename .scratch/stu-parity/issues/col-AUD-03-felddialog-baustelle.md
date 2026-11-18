# Felddialog Baustelle: Restzeit, Fortschritt, „Nach Bau aktivieren“ umschaltbar

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Für eine Baustelle zeigt der SWU-Felddialog nur „IM BAU“. Fertigstellungszeit und Fortschritt fehlen, und die Wahl „Nach Fertigstellung deaktivieren“ lässt sich nach dem Bauauftrag nicht mehr ändern. STU zeigt einen Fortschrittsbalken und „Fertigstellung: Datum“ und hat die Knöpfe „Nach Bau aktivieren/deaktivieren“. Auf der Oberfläche zeigt STU den Fortschritt anteilig als Overlay. Dieses Ticket ergänzt Anzeige und Umschalter samt Backend-Endpunkt.

## STU-Quellen

- `src/html/colony/component/fieldAction.twig` (Block `isUnderConstruction`, Z. ~40–60: Statusbalken, „Fertigstellung“, `B_ACTIVATE`/`B_DEACTIVATE` „Nach Bau aktivieren/deaktivieren“)
- `src/Module/Colony/Action/ActivateBuilding/ActivateBuilding.php` und `DeactivateBuilding/DeactivateBuilding.php` (Z. 26–27: Baustelle → `setActivateAfterBuild`)
- `src/html/colony/component/colonySurface.twig` (Fortschritts-Overlay `getOverlayWidth`)

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/ColonyFieldDialog.tsx` („IM BAU“ Z. 324–328, keine Aktionen für `isBuilding` Z. 521)
- `apps/frontend/src/pages/colonies/components/FieldCell.tsx` (nur `animate-pulse` Z. 98)
- `apps/frontend/src/pages/colonies/types.ts` (`buildFinishesAt` Z. 31, ungenutzt), `apps/frontend/src/pages/colonies/api.ts`
- `apps/backend/src/modules/colony/colony.controller.ts` (`activateAfterBuild` nur beim Bauauftrag, Z. 82/354)
- `apps/backend/src/modules/colony/colony-construction.service.ts` (`toggleBuilding` lehnt Baustellen ab, Z. 1125/1133)
- `apps/backend/src/modules/colony/building-lifecycle.service.ts` (`finishBuilding` wertet `activateAfterBuild` aus, Z. 29–52)

## Akzeptanzkriterien

- [ ] Backend: Für eine eigene Baustelle lässt sich `activateAfterBuild` ändern, wie in STU über Aktivieren/Deaktivieren am Baustellenfeld (Erweiterung von `toggleBuilding` oder eigener Endpunkt, z. B. `PATCH :id/fields/:fieldIndex/activate-after-build`). Für fertige Gebäude, fremde Kolonien und Felder ohne Baustelle wird abgelehnt.
- [ ] Bei Fertigstellung gilt der zuletzt gesetzte Wert (bestehende Auswertung in `finishBuilding`).
- [ ] Der Felddialog zeigt bei einer Baustelle: Zielgebäude, Fortschrittsbalken in Prozent, „Fertigstellung: Datum, Uhrzeit“ aus `buildFinishesAt`, den aktuellen Zustand „wird nach dem Bau aktiviert/deaktiviert“ und den passenden Knopf zum Umschalten.
- [ ] Das Oberflächenfeld zeigt den Baufortschritt anteilig (Overlay oder Balken) statt nur zu pulsieren.
- [ ] Backend-Tests: Umschalten in beide Richtungen, Ablehnungsfälle, Fertigstellung respektiert den Wert.
- [ ] Frontend-Tests `ColonyFieldDialog.spec.tsx` (Anzeige, Umschalter ruft API) und `ColonyMap.spec.tsx` bzw. `FieldCell` (Overlay-Breite).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Felddialog Baustelle“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Felddialog“ und „Oberfläche“, Große Abweichung Nr. 3, kleine Abweichung „Oberfläche: Baustelle ohne anteiliges Fortschritts-Overlay“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. col-AUD-01 und col-AUD-06a ändern ebenfalls `ColonyFieldDialog.tsx`.
