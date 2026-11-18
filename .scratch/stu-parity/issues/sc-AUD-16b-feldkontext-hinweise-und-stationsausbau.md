# Kleine Schiffs-UI-Lücken: Feldkontext-Hinweise und Stationsausbau

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Im Feldkontext (Informationsblock) fehlen gegenüber STU drei Angaben:
- der Hinweis „Anomalie in der Nähe“,
- der Hinweis „kolonisierbare Kolonie in der Nähe“,
- die Zeile zu Territorium bzw. Einflussbereich der Allianz oder des Siedlers.

Beim Stationsausbau fehlen die Anzeige des Baufortschritts (verbleibende Ticks, benötigte Workbees) während `UNDER_CONSTRUCTION` und die Auswahl der Spezialmodule. `constructionTicksRemaining` steht bereits im DTO, wird aber nicht gerendert.

## STU-Quellen

- `src/html/spacecraft/control/control_mid.twig` (Hinweise Anomalie/kolonisierbar, Makro `influenceArea`)
- `src/html/spacecraft/control/control_right.twig` (Baufortschritt, „Auswahl der Spezialmodule“)
- `src/Module/Station/Action/BuildStation/`, `src/Module/Station/View/ShowStationInfo/`, `ShowStationCosts/`

## SWU-Pfade

- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` bzw. Feldkontext-DTO in `packages/shared/src/lib/spacecraft/index.ts`
- `apps/backend/src/modules/starmap/entities/influence-area.entity.ts`
- `apps/frontend/src/components/spacecraft/StationExpansionPanel.tsx`, `apps/backend/src/modules/spacecraft/station-construction.service.ts`
- `packages/shared/src/lib/spacecraft/index.ts` (`constructionTicksRemaining`, Z. ~527)

## Akzeptanzkriterien

- [ ] Feldkontext-DTO liefert „Anomalie in Nähe“ und „kolonisierbare Kolonie in Nähe“ nach STU-Regel (gleiche Reichweite/Bedingungen) sowie Territorium/Einflussbereich (Allianz bzw. Siedler) des Feldes; das Panel zeigt sie wie STU.
- [ ] Während des Stationsbaus zeigt das Schiffsdetail den Baufortschritt: verbleibende Ticks und benötigte/vorhandene Workbees.
- [ ] Beim Ausbau lassen sich Spezialmodule wie STU auswählen (erlaubte Module der Rolle, Lagerprüfung); die Auswahl wird beim Bau verbaut.
- [ ] Backend-Tests für die neuen DTO-Felder und die Spezialmodul-Auswahl; Frontend-Tests für Hinweise, Territoriumszeile, Baufortschritt und Modulauswahl.

## Herkunft

- Audit 2026-11-17: [spacecraft.md](../audit-2026-11-17/spacecraft.md) Seitenabgleich „Informationen/Sternensystem/Kolonie“ und „Konstrukt/Baufortschritt/Stationsbau“, kleine Abweichungen (Feldkontext, Stationsausbau).
- Gesplittet aus sc-AUD-16 (Teil a: Flottenkopf und Systemleiste). [sc-WP-STAT-1b](sc-WP-STAT-1b-station-ausbauen.md) (resolved) ohne Baufortschrittsanzeige und Spezialmodulauswahl. PO-Linie „wie STU“ vom 2026-11-17.

## Comments

- „Nachricht an Kolonie senden“ gehört zur Schnell-PM aus Audit-Abschnitt M4 und ist hier nicht enthalten.
