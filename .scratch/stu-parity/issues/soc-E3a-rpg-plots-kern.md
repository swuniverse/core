# RPG-Plots: anlegen, Mitglieder, Listen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** soc-D1

## Ziel

Spieler legen RPG-Plots an (Titel 6–80 Zeichen, Beschreibung), bearbeiten und beenden sie. Der Ersteller ist erstes Mitglied und fügt als einziger Mitglieder hinzu oder entfernt sie, jeweils mit Systemnachricht. Es gibt Listen „alle Plots“ und „meine Plots“ sowie eine Plotdetailseite mit Mitgliedern. Die Zuordnung von HoloNet-Beiträgen folgt in soc-E3b.

## STU-Quellen

- `src/Module/Communication/Action/CreateKnPlot/CreateKnPlot.php`, `EditKnPlot`, `EndKnPlot`
- `src/Module/Communication/Action/AddKnPlotMember`, `DeleteKnPlotMember`, `src/Module/Communication/Lib/PlotMemberService.php`
- `src/Module/Communication/View/ShowPlotList`, `ShowUserPlotList`, `ShowKnPlot`, `ShowCreatePlot`, `ShowEditPlot`
- `src/html/communication/plot/createPlot.twig`, `editPlot.twig`, `plotList.twig`, `userPlots.twig`, `plots.twig`, `src/html/communication/plotdetails.twig`, `plotNavigation.twig`

## SWU-Pfade

- `apps/backend/src/modules/rpg/` (Entities `RpgPlot`, `RpgPlotMember`, Service, Controller)
- `apps/backend/src/modules/messaging/messaging.service.ts#sendSystem`
- `apps/frontend/src/pages/holonet.tsx` bzw. neue Seiten `/holonet/plots`, `/holonet/plots/:id` (Routen in `apps/frontend/src/app/app.tsx`)
- DTOs in `packages/shared`, Migration

## Akzeptanzkriterien

- [ ] Plot: Titel 6–80 Zeichen, Beschreibung ≤ 5.000 Zeichen BBCode, Ersteller, Startdatum, Enddatum (null = aktiv). Ersteller wird beim Anlegen automatisch Mitglied.
- [ ] Bearbeiten und Beenden nur durch den Ersteller; beendete Plots sind nicht mehr bearbeitbar und nehmen keine Mitglieder auf.
- [ ] Mitglied hinzufügen (Spieler-ID) / entfernen nur durch den Ersteller; Ersteller nicht entfernbar; doppelte Mitglieder abgelehnt; Betroffene erhalten eine Systemnachricht („Du wurdest dem RPG-Plot 'X' als Schreiber hinzugefügt“ bzw. „entfernt“).
- [ ] Listen „alle Plots“ (aktive zuerst, paginiert) und „meine Plots“ (Mitglied); Detail mit Beschreibung, Ersteller, Mitgliedern, Laufzeit.
- [ ] HoloNet-Navigation erhält den Eintrag „Plots“.
- [ ] Backend-Tests: Validierung, Rechte (Nicht-Ersteller 403), Beenden, Mitgliederverwaltung und Benachrichtigung. Frontend-Tests: Liste, Anlegen, Detail.

## Comments
