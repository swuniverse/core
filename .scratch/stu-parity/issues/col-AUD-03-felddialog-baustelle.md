# Felddialog Baustelle: Restzeit, Fortschritt, „Nach Bau aktivieren“ umschaltbar

**Status:** claimed
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

- [x] Backend: Für eine eigene Baustelle lässt sich `activateAfterBuild` ändern, wie in STU über Aktivieren/Deaktivieren am Baustellenfeld (Erweiterung von `toggleBuilding` oder eigener Endpunkt, z. B. `PATCH :id/fields/:fieldIndex/activate-after-build`). Für fertige Gebäude, fremde Kolonien und Felder ohne Baustelle wird abgelehnt.
- [x] Bei Fertigstellung gilt der zuletzt gesetzte Wert (bestehende Auswertung in `finishBuilding`).
- [x] Der Felddialog zeigt bei einer Baustelle: Zielgebäude, Fortschrittsbalken in Prozent, „Fertigstellung: Datum, Uhrzeit“ aus `buildFinishesAt`, den aktuellen Zustand „wird nach dem Bau aktiviert/deaktiviert“ und den passenden Knopf zum Umschalten.
- [x] Das Oberflächenfeld zeigt den Baufortschritt anteilig (Overlay oder Balken) statt nur zu pulsieren.
- [x] Backend-Tests: Umschalten in beide Richtungen, Ablehnungsfälle, Fertigstellung respektiert den Wert.
- [x] Frontend-Tests `ColonyFieldDialog.spec.tsx` (Anzeige, Umschalter ruft API) und `ColonyMap.spec.tsx` bzw. `FieldCell` (Overlay-Breite).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Felddialog Baustelle“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Felddialog“ und „Oberfläche“, Große Abweichung Nr. 3, kleine Abweichung „Oberfläche: Baustelle ohne anteiliges Fortschritts-Overlay“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. col-AUD-01 und col-AUD-06a ändern ebenfalls `ColonyFieldDialog.tsx`.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Umsetzung an Sonnet-Agent delegiert, Review durch Opus 5.5. Commit `91f4cfcf`.
  - `PATCH colonies/:id/fields/:fieldIndex/activate-after-build` (`{ activateAfterBuild: boolean }`): Feld über die eigene Kolonie aufgelöst (fremd/fehlend → NotFound), dann ein bedingtes Update `isBuilding = true`; 0 Zeilen → „Auf diesem Feld wird nicht gebaut“. Kein Lesen-Ändern-Speichern, daher keine Überschreibung durch den Minutenabschluss.
  - Fortschritt ohne Startspalte: Gesamtdauer = skalierte `costs.buildTime` des Zielgebäudes; beide Aufrufer von `prepareBuildJob` (Neubau und Upgrade) nutzen genau diesen Wert. `buildProgress` der Entity bleibt 0/100 und wird nicht verwendet.
  - Dialog „Baustelle“ mit Zielgebäude, Balken/Prozent, „Fertigstellung“, Zustand und Umschaltknopf (in der Sandbox ausgeblendet); `FieldCell` mit anteiligem Overlay, Pulsieren nur ohne Prozent.
  - Restfenster (wie STU): Liest der Abschluss das Feld unmittelbar vor dem Umschalten, gilt für dieses Gebäude noch der alte Wert, obwohl die Anfrage erfolgreich war.
  - Checks: Jest `colony-tick` 241/241, Vitest `src/pages/colonies` 122/122, `tsc` sauber, `nx lint frontend` 0 Fehler (die 3 vom Agenten gemeldeten Fehler waren ein Aufruf ohne Projektkonfiguration). Kein PostgreSQL-Test für das bedingte Update (keine passende Suite für den Kolonie-Bau).
  - Offen für den Prüfpass: Browserprüfung (Dialog, Umschalten, Overlay), gemeinsamer Build; Fortschritt bewegt sich nur beim Neuladen.
- 2026-11-19 – Prüfpass (Opus 5.5): Diff bei der Übergabe geprüft, kein weiterer Befund. Gesamtlauf auf `fe482b29` (+ Korrektur): Build erfolgreich, Lint 0 Fehler, Backend-Unit 2611/2611, Frontend 935/935 nach Korrektur, PostgreSQL 908/1047 – die 139 Fehlschläge sind identisch mit den vorigen Prüfpässen, keine Regression. Offen: Browserprüfung – Felddialog Baustelle, Umschalten, Overlay. Status bleibt `claimed`.
