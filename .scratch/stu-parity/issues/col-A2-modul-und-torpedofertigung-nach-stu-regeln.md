# Modul- und Torpedofertigung nach STU-Regeln

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** col-A1b

## Ziel

SWU übernimmt die STU-Fertigung: Module kosten EPS je Stück, die bestellbare Menge wird auf EPS, Material und Lager begrenzt, gleiche Aufträge werden aufgestockt und Teilmengen vollständig erstattet. Module entstehen im nächsten Kolonie-Tick; Torpedos sofort. Die dafür verbindlichen Funktionsmodifikatoren werden aus den autoritativen STU-Daten auf die SWU-Funktions-IDs 10–18 abgebildet.

## STU-Quellen

- `src/Module/Colony/Action/CreateModules/`, `src/Module/Colony/Action/CancelModuleCreation/`, `src/Module/Colony/Action/BuildTorpedos/BuildTorpedos.php` (Kürzung auf EPS: Z. 45–46, Abzug Z. 80)
- `src/Module/Colony/Lib/ModuleQueueLib.php`
- `src/Module/Tick/Colony/ColonyTick.php::proceedModules`
- `src/html/colony/menu/moduleFab.twig`, `src/html/colony/menu/torpedoFab.twig`, `src/Module/Colony/View/ShowModuleFab/`, `ShowModuleCancel/`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-fabrication.service.ts` (`queueFabrication`, `cancelFabricationQueue`, `processFabricationQueue`)
- `apps/backend/src/modules/colony/entities/colony-fabrication-queue.entity.ts`
- `apps/frontend/src/pages/colonies/components/PanelFabrication.tsx`
- `game-data/data/fabrication/stu-fabrication.yaml` (enthält heute kein `energyCost`; `durationSeconds`), `game-data/data/torpedoes/stu-torpedoes.yaml` (hat `energyCost`)

## Akzeptanzkriterien

- [ ] Die autoritativen STU-`module_building_function.modificator`-Werte sind explizit auf die SWU-Funktions-IDs 10–18 abgebildet; daraus wird je Modul `energyCost = Modifikator × Modulstufe` materialisiert.
- [ ] Modulaufträge kosten EPS je Stück; die Menge wird auf verfügbare EPS, Material und Lager gekürzt, mit Meldung „Es wurden X von Y Modulen in Auftrag gegeben“.
- [ ] Ein weiterer Auftrag für dasselbe Modul in derselben Funktion stockt den bestehenden Auftrag auf; mehrere verschiedene Module je Funktion sind möglich.
- [ ] Teilmengen können abgebrochen werden; Material wird für die stornierten Einheiten zu 100 % erstattet (Lager gekappt), EPS nur für Einheiten, die beim Auftrag tatsächlich EPS bezahlt haben.
- [ ] Module werden im nächsten Kolonie-Tick fertig, nur bei aktiver Funktion; `durationSeconds` wird nicht mehr ausgewertet.
- [ ] Torpedos werden sofort gegen Material und EPS produziert (keine Queue).
- [ ] Laufende Altaufträge werden mit Menge und Materialinvestition in das neue Modell übernommen, ohne rückwirkende EPS-Belastung und ohne EPS-Erstattung. Nur später hinzugefügte Mengen zahlen die neuen EPS-Kosten.
- [ ] `PanelFabrication.tsx` zeigt EPS-Kosten, „In Bau“, „Lagernd“, Mengenfeld und Teilabbruch wie `moduleFab.twig`/`torpedoFab.twig` (UI-Konventionen aus `inventory/shell-admin-runtime.md` Abschnitt 3).
- [ ] Backend- und Frontend-Tests für Datenzuordnung, Kürzung, Aufstocken, Teilabbruch einschließlich Legacy-Mengen, Tick-Fertigstellung und Torpedo-Sofortbau.

## Entscheidung

Vorgabe: STU-Modell mit autoritativen Funktionsmodifikatoren für SWU-IDs 10–18. Legacy-Mengen sind zum alten Null-EPS-Modell gültig bestellt und werden deshalb ohne nachträgliche Belastung oder Erstattung übernommen; Aufstockungen zahlen die neuen EPS-Kosten. Die SWU-Zeitqueue (`durationSeconds`, ein Auftrag je Funktion, 50 % Erstattung) entfällt; keine ADR.

## Comments

- 2026-10-22 Agent: Blocker: Die verbindlichen STU-`ecost`-Werte für die 172 Moduldatensätze sind weder in `stu-fabrication.yaml` noch in den genannten Laufzeitquellen enthalten; dort werden sie nur aus `module_building_function.modificator * module.level` berechnet. Für eine verlustfreie Migration laufender Altaufträge fehlt außerdem die historische, bereits abgezogene EPS-Menge in der Queue. Bitte festlegen, (1) aus welcher konkreten STU-Datenquelle/Zuordnung die Modifikatoren für die SWU-Funktions-IDs 10–18 übernommen werden sollen und (2) ob bestehende Queuezeilen ohne gespeicherte EPS-Kosten mit berechneten aktuellen Kosten weitergeführt, ohne zusätzliche EPS migriert oder erstattet werden sollen.

- 2026-10-21 Product Owner: Option b – Modul- und Torpedofertigung folgen dem STU-Modell: EPS-Kosten je Stück, Kürzung auf EPS/Lager, Aufstocken, Teilabbruch mit 100 % Erstattung, Modulfertigstellung im nächsten Kolonie-Tick und Torpedos sofort.
- 2026-10-27 Product Owner: Die autoritativen STU-Modifikatoren werden auf SWU-Funktions-IDs 10–18 abgebildet. Bestehende Mengen werden ohne rückwirkende EPS-Belastung oder -Erstattung übernommen; nur spätere Aufstockungen zahlen neue EPS.
