# Gebäudevorschau mit Limits und Bilanzvorschau, Upgrade mit Dauer und Produktion

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Die STU-Gebäudevorschau zeigt die Baulimits (Kolonie/Account) und eine Vorschau der neuen Koloniebilanz, also das Delta, das das Gebäude bewirkt. Bei Upgrade-Optionen nennt STU Dauer und Produktion des Zielgebäudes. Beim Lagergebäude gibt es einen Link „Warenübersicht“. In SWU fehlt das. Die Bilanz-Delta-Berechnung existiert ähnlich bereits in der Sandbox-Vorschau (col-G3c) und soll wiederverwendet werden.

## STU-Quellen

- `src/html/colony/component/buildingPreview.twig` („Limits“ Kolonie/Account Z. ~30–40, Vorschau der Koloniebilanz)
- `src/Module/Colony/View/ShowBuilding/`
- `src/Module/Colony/Lib/BuildingCommodityDeltaTracker.php`, `ColonyProductionPreviewWrapper.php`, `ColonyEpsProductionPreviewWrapper.php`
- `src/html/colony/component/fieldAction.twig` (`UPGRADE_OPTIONS` Z. ~226–290, `isWarehouse` Z. ~143)

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/BuildInspector.tsx` (keine Limits)
- `apps/frontend/src/pages/colonies/components/PanelBuild.tsx`
- `apps/frontend/src/pages/colonies/ColoniesPage.tsx` (Hover-Tooltip Z. 1031–1081)
- `apps/frontend/src/pages/colonies/components/ColonyFieldDialog.tsx` (`renderUpgradeCosts` Z. 186–227, Upgrade-Optionen Z. 439–482)
- `apps/backend/src/modules/colony/colony-sandbox-preview.service.ts`, `colony-stats.service.ts` (Bilanzberechnung)
- `apps/backend/src/modules/database/` bzw. `apps/frontend/src/pages/database.tsx` (View `commodity-overview`)

## Akzeptanzkriterien

- [ ] Die Gebäudevorschau zeigt „Limits“: je Kolonie und je Account (falls gesetzt), mit aktueller Anzahl, z. B. „Kolonie: 1/2“.
- [ ] Die Gebäudevorschau zeigt die neue Koloniebilanz bei Bau und Aktivierung: Energie, Waren, Wohnraum, Arbeiter jeweils alt → neu. Das Backend berechnet sie mit derselben Logik wie Statistik und Sandbox (keine dritte Formel).
- [ ] Jede Upgrade-Option im Felddialog zeigt Bauzeit, Produktion/Verbrauch und Auswirkungen des Zielgebäudes neben den Kosten.
- [ ] Lagergebäude haben im Felddialog den Knopf „Warenübersicht“, der die Datenbank-Warenübersicht öffnet.
- [ ] Backend-Test für die Bilanzvorschau (Energie und eine Ware, mit und ohne vorhandenes Gebäude auf dem Feld).
- [ ] Frontend-Tests `PanelBuild.spec.tsx`/`BuildInspector` (Limits, Bilanz) und `ColonyFieldDialog.spec.tsx` (Upgrade-Dauer/-Produktion, Warenübersicht).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Informationsdichte), Abschnitt H „Kolonie“.
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Gebäudevorschau“ und „Felddialog“, kleine Abweichungen „Gebäudevorschau ohne Limits …“, „Upgrade-Option ohne Dauer …“, „Lagergebäude ohne Knopf Warenübersicht“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. „Informationen“ und Schreibfehler stehen in col-AUD-06b.
