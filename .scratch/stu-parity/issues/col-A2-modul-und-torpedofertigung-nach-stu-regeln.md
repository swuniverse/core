# Modul- und Torpedofertigung nach STU-Regeln

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** col-A1b

## Ziel

SWU fertigt Module und Torpedos über eine zeitbasierte Queue ohne Energiekosten, mit einem Auftrag je Funktion und 50 % Erstattung beim Abbruch. STU verlangt EPS-Kosten je Stück, kürzt die Menge auf verfügbare EPS und Lager („X von Y“), stockt bestehende Aufträge auf, erlaubt den Abbruch von Teilmengen mit 100 % Rückerstattung und stellt Module im nächsten Kolonie-Tick fertig; Torpedos entstehen sofort. Das ist eine Abweichung bei Fertigungskosten (Leitplanke 1) und wird erst nach Entscheidung umgesetzt.

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

- [ ] Modulaufträge kosten EPS je Stück (`energyCost` in den Fabrikationsdaten, Werte aus STU `ecost`); die Menge wird auf verfügbare EPS und Material gekürzt, mit Meldung „Es wurden X von Y Modulen in Auftrag gegeben“.
- [ ] Ein weiterer Auftrag für dasselbe Modul in derselben Funktion stockt den bestehenden Auftrag auf; mehrere verschiedene Module je Funktion sind möglich.
- [ ] Teilmengen können abgebrochen werden; Material und EPS werden zu 100 % erstattet (Lager gekappt).
- [ ] Module werden im nächsten Kolonie-Tick fertig, nur bei aktiver Funktion; `durationSeconds` wird nicht mehr ausgewertet.
- [ ] Torpedos werden sofort gegen Material und EPS produziert (keine Queue).
- [ ] Laufende Altaufträge der Zeitqueue werden per Migration in das neue Modell überführt (verlustfrei, ohne Doppelerstattung).
- [ ] `PanelFabrication.tsx` zeigt EPS-Kosten, „In Bau“, „Lagernd“, Mengenfeld und Teilabbruch wie `moduleFab.twig`/`torpedoFab.twig` (UI-Konventionen aus `inventory/shell-admin-runtime.md` Abschnitt 3).
- [ ] Backend- und Frontend-Tests für Kürzung, Aufstocken, Teilabbruch, Tick-Fertigstellung, Torpedo-Sofortbau.

## Entscheidung

Vorgabe: Variante (b), STU-Modell. EPS-Kosten je Stück, Kürzung der Menge auf verfügbare EPS und Material, Aufstocken bestehender Aufträge, Teilabbruch mit 100 % Rückerstattung, Fertigstellung der Module im nächsten Kolonie-Tick bei aktiver Funktion, Torpedos sofort. Die SWU-Zeitqueue (`durationSeconds`, ein Auftrag je Funktion, 50 % Erstattung) entfällt; keine ADR.

## Comments

- 2026-10-22 Agent: Blocker: Die verbindlichen STU-`ecost`-Werte für die 172 Moduldatensätze sind weder in `stu-fabrication.yaml` noch in den genannten Laufzeitquellen enthalten; dort werden sie nur aus `module_building_function.modificator * module.level` berechnet. Für eine verlustfreie Migration laufender Altaufträge fehlt außerdem die historische, bereits abgezogene EPS-Menge in der Queue. Bitte festlegen, (1) aus welcher konkreten STU-Datenquelle/Zuordnung die Modifikatoren für die SWU-Funktions-IDs 10–18 übernommen werden sollen und (2) ob bestehende Queuezeilen ohne gespeicherte EPS-Kosten mit berechneten aktuellen Kosten weitergeführt, ohne zusätzliche EPS migriert oder erstattet werden sollen.

- 2026-10-21 Product Owner: Option b – Modul- und Torpedofertigung folgen dem STU-Modell: EPS-Kosten je Stück, Kürzung auf EPS/Lager, Aufstocken, Teilabbruch mit 100 % Erstattung, Modulfertigstellung im nächsten Kolonie-Tick und Torpedos sofort.
- 2026-10-30 Product Owner: Option 1. Die Detailentscheidung aus `map.md` gilt: Die im STU-Dump hinterlegten Funktionsmodifikatoren werden auf die SWU-Funktions-IDs 10–18 abgebildet. Bestehende Legacy-Mengen werden ohne rückwirkende EPS-Belastung oder Erstattung übernommen; nur spätere Aufstockungen zahlen die neuen EPS-Kosten. Damit sind Datenquelle und Migration festgelegt; das Issue ist `ready-for-agent`.
