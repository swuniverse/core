# Beamblocker als eingebautes STU-Stationssystem

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-ENG-2c

## Ziel

Das tatsächliche Beamblocker-Verhalten der lokalen STU-Quelle übernehmen. Der frühere Vorschlag eines optionalen Fertigungsmoduls mit globaler Transfersperre ist durch die Nutzerentscheidung vom 2026-11-17 ersetzt.

## Verbindlicher STU-Abgleich

Referenz: lokaler STU-Commit `f8c8dda33`, Pfade relativ zu `../../st-universe/core/src/`.

- `Module/Spacecraft/Lib/Creation/SpacecraftSystemCreation.php`: jede Station erhält `BEAM_BLOCKER` als Standardsystem ohne zugeordnetes Fertigungsmodul, zunächst mit `MODE_OFF`. Schiffe erhalten es nicht als Standardsystem.
- `Component/Spacecraft/System/Type/BeamBlockerShipSystem.php`: Aktivierung und Standardmodus `MODE_ALWAYS_ON`; Aktivierung und Betrieb kosten 0 EPS.
- `Component/Spacecraft/System/SpacecraftSystemManager.php`: manuelle Deaktivierung von ALWAYS_ON wird abgewiesen. Erzwungener Shutdown darf es deaktivieren; zerstörte Systeme können nicht aktiviert werden. Aktivierung verlangt die reguläre Sollcrew.
- `Module/Spacecraft/Action/StandBy/StandBy.php`: ALWAYS_ON-Systeme bleiben aktiv.
- `Module/Spacecraft/Lib/Auxiliary/SpacecraftStartup.php`, `SpacecraftShutdown.php`, `Creation/SpacecraftConfigurator.php`: gesundes Standardsystem wird beim Start nach Crewbereitstellung aktiviert; vollständiger Crewverlust führt zu erzwungenem Shutdown.
- `Module/Spacecraft/Lib/Damage/SystemDamage.php`, `Module/Tick/Spacecraft/Handler/StationPassiveRepairHandler.php`: Systemzerstörung setzt Status 0 und MODE_OFF; passive Stationsreparatur stellt mit Crew an Bord den Standardmodus reparierter Systeme her, ohne Crew bleibt der Modus erhalten.
- `Lib/Transfer/Wrapper/SpacecraftStorageCommodityLogic.php`, `SpacecraftStorageCrewLogic.php`, `SpacecraftStorageTorpedoLogic.php` und vollständige Referenzsuche: kein Beamblocker-spezifischer Transfercheck. Waren-, Crew-, Torpedo- und Reaktortransfer erhalten deshalb keine zusätzliche Sperre.

## Akzeptanzkriterien

- [x] Bestehende und neu erzeugte Stationen einschließlich Konstrukten erhalten den persistenten eingebauten Beamblocker; normale Schiffe und Kleinschiffe nicht.
- [x] Shared-Laufzeitsystem und Stationsanzeige zeigen Beamblocker mit Zustand/Integrität und 0 EPS; keine Fertigungswaren, Forschung oder erfundenen Baukosten.
- [x] Neue unbemannte Konstrukte starten ausgeschaltet; Crewbereitstellung mit ausreichender Sollcrew und vorhandenem EPS-System aktiviert das gesunde System; Standby lässt es aktiv. Manuelles Ausschalten wird abgewiesen, Aktivierung nach Shutdown nutzt bestehende Crew-/Integritätsprüfungen und kostet 0 EPS.
- [x] Gespeicherter Schadens-/Shutdownzustand bleibt beim Lesen erhalten. Vollständiger Crewverlust schaltet aus; Crewbereitstellung startet bei ausreichender Sollcrew wieder. Die bestehende passive Stationsreparatur berücksichtigt den Beamblocker im Zwei-System-Budget und mit den vorhandenen Teilekosten; Reparatur stellt mit Crew an Bord den Standardmodus her; ohne Crew wird das reparierte System nicht gestartet.
- [x] Vorhandene Transfers bleiben beim aktiven Beamblocker in beiden Richtungen erlaubt, soweit ihre bisherigen Rechte-/Positions-/Sicherheitsregeln erfüllt sind.
- [x] Unit-, UI- und PostgreSQL-Tests prüfen Ausstattung, Lebenszyklus, Kosten, manuelle Deaktivierung und weiterhin mögliche Waren-/Crewtransfers.

## SWU-Anker

`spacecraft-runtime-state.service.ts`, `spacecraft.service.ts`, `spacecraft-resource-flow.service.ts`, persistierte `runtimeSystems`, Stationsbau-/Crewpfade, Systemanzeige und bestehende Transferdienste.

## Comments

- 2026-11-16 – Triage: Funktionsmatrix konkretisiert. Neue Ausstattungs-/Fertigungsentscheidung erforderlich; optionales Modul statt automatischem Stationssystem vorgeschlagen, daher needs-info. Siehe [Audit](../triage-2026-11-16.md).

- 2026-11-17 – Nutzerentscheidung: "nein, wir stellen stu parität her. Analysiere daher das stu verhalten und setzte dies dann um". Vertrag gegen den tatsächlichen STU-Code neu gefasst; optionale Fertigung und unbelegte Transfersperre gestrichen. Umsetzung beansprucht.

## Answer

STU-Commit `f8c8dda33` abgeglichen und der Beamblocker als eingebautes Stationssystem umgesetzt. Neue Stationen/Konstrukte erhalten das System zunächst ausgeschaltet. Bestehende bemannte Stationen mit ausreichender Sollcrew und EPS-System werden beim Backfill gestartet; vorhandene Zustände bleiben erhalten. Ein PostgreSQL-Trigger hält Ausstattung, Crewbereitstellung, vollständigen Crewverlust, Integritätsänderungen und Demontage in derselben Transaktion konsistent. Lesen startet kein ausgeschaltetes System neu.

Standby erhält den aktiven Zustand. Manuelle Deaktivierung wird abgewiesen; Aktivierung prüft Crew, Integrität, Cooldown und EPS-System und kostet 0 EPS. Die Anzeige enthält Zustand, Integrität und 0 EPS. Die passive Stationsreparatur zählt den Beamblocker im vorhandenen Zwei-System-Budget und verbraucht die vorhandenen Ersatzteile/Systemkomponenten. Mit Crew stellt sie den Standardmodus her; ohne Crew bleibt das reparierte System ausgeschaltet.

Keine neue Fertigung, Forschung oder Waren-/Crew-/Torpedo-/Reaktorsperre: Die aktuelle STU-Quelle verwendet den Beamblocker nicht als Transferbedingung. Tatsächliche Waren- und Crewtransfers in beide Richtungen sind über die Produktions-HTTP-App geprüft.

Der echte Reparaturabschluss deckte zwei vorhandene Crew-Expertisefehler auf: `CrewSkill` fehlte im Produktions-/Integrations-Datasource, und Erfahrungsvergabe/Beförderung fragten eine nicht definierte `skills`-Relation ab. Die vorhandenen Skill-Entities werden jetzt explizit geladen. Der Reparaturtest prüft die gespeicherte Erfahrung und die anschließende berechtigte Beförderung.

## Validation

- `npx nx test backend --maxWorkers=2`: **241 Suites / 2.341 Tests bestanden**. Nach abschließender Präzisierung des Reparaturmodus: `station-repair|spacecraft-damage|spacecraft-runtime-state|spacecraft-resource-flow` nochmals **5 Suites / 51 Tests bestanden**.
- `npx nx test frontend --maxWorkers=2`: **127 Dateien / 866 Tests bestanden**, einschließlich Beamblocker-Anzeige ohne manuellen Ausschalter.
- PostgreSQL/Produktions-HTTP: `station-beam-blocker|station-scrapping|trade-account-transfer|trade-network-transfer`: **4 Suites / 39 Tests bestanden**. Nachlauf des finalen Beamblocker-Vertrags: **10 Tests bestanden**, einschließlich tatsächlichem Systemschaden, bemannter und unbemannter passiver Reparatur, Teileverbrauch, Crew-Expertise und Beförderung.
- `npx nx affected -t lint typecheck --base=HEAD --parallel=2`: erfolgreich, keine Lintfehler; vorhandene Warnungen bleiben.
- `npx nx run-many --targets=build` und abschließende erzwungene Backend-Deklarationserzeugung: erfolgreich.
- Lokale Dev-DB: Migration `StationBeamBlocker1794880800000` erfolgreich eingespielt, ohne Datenbankreset. `git diff --check` sauber. Kein Push.
