# Flottenkontrolle in der Schiffsansicht wie STU

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU `src/html/spacecraft/control/control_mid.twig` Z. 99–140: Der Flottenführer sieht in der Mitte die Tabelle „Flottenkontrolle“ (Aktivieren | Deaktivieren | Alarmstufe), rechts die Mitglieder (`fleetInfo`, umgesetzt in sc-AUD-23).

## Akzeptanzkriterien

- [x] Block „Flottenkontrolle“ unter der Schiffskontrolle, nur für den Flottenführer (`isFleetLeader`).
- [x] Aktivieren/Deaktivieren je Flotte für Nahbereichssensoren, Schilde, Strahlenwaffen, Torpedobänke, Tarnung, Hyperantrieb über `PATCH fleets/:id/systems/:key`; „Hyperantrieb aktivieren“ nur bei `isWarpPossible` (Hyperantrieb vorhanden, außerhalb eines Systems).
- [x] Alarmstufe Grün/Gelb/Rot für die Flotte über `PATCH fleets/:id/alert-state`.
- [x] Fehlschläge je Schiff als „Schiff: Grund“.
- [x] Icons `kss2`, `shldac1/2`, `act_phaser2`, `act_torp2`, `warp1/2` aus STU (Submodul `assets`).
- [x] Flottenstatus einzeilig wie STU `fleetInfo`: Schiffsbild (Name als Titel), vier gleich breite Kästchen Hülle/Schilde/EPS/Hyperantrieb mit festen STU-Farben (leer bei fehlendem System), Flagge; „fixiert“ mit Info-Icon.
- [x] Checkbox „Flotte“ beim Flottenführer in Reaktor aufladen (`fleet_reactor`), Reaktorverteilung/Übertrag (`fleetSplit`) und Ersatzbatterie entladen (`fleet_batt`): Befehl geht schiffsweise an jedes Mitglied, Ausgabe „Flottenbefehl ausgeführt: …“ plus „Schiff: Grund“ je Fehlschlag.

## Comments

### 2026-11-24 — umgesetzt, Prüfung ausstehend

- Kein Backend-Umbau (Endpunkte aus sc-AUD-05a).
- Tests: neu `FleetControlPanel.spec.tsx` (6). Vitest `components/spacecraft` + `spacecraft-detail` 267/267; `nx typecheck frontend` ✓.
- Ausstehend: gesammelter Verifikationslauf.
- Modell: Claude Opus 5.5 direkt.

### 2026-11-24 — Flottenstatus einzeilig und „Flotte“-Häkchen, Prüfung ausstehend

- STU: `control_right.twig` (`fleetInfo`, Checkboxen `fleet_reactor`, `fleetSplit`, `fleet_batt`), `LoadReactor.php`, `SplitReactorOutput.php`, `UnloadBattery.php`.
- SWU: kein Backend-Umbau; `ReactorPanel` ruft die Einzelschiff-Endpunkte (`reactor/load`, `battery/discharge`, `reactor-distribution`, alle mit Eigner-Prüfung) nacheinander für `fleetMembers` auf. Abweichung: volle Reaktoren meldet der Endpunkt pro Schiff, STU überspringt sie still.
- Tests: `ReactorPanel.spec.tsx` +4, `FleetStatusPanel.spec.tsx` angepasst. Vitest `components/spacecraft` + `spacecraft-detail` 271/271; `nx typecheck frontend` ✓; ESLint ohne Befund in den geänderten Dateien.

- 2026-11-24 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `83bca5c5`: Lint 0 Fehler (geänderte Dateien ohne neue Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 1003/1004 (Ausreißer `research.spec.tsx` einzeln 15/15 grün, nicht berührt), PostgreSQL-Integration 1081/1081. Diff-Review ohne Befund (Flottenbefehle nur über eignergeprüfte Einzelschiff-Endpunkte, Doppelklick-Sperre, Stationsregel nur fürs eigene Profil). Modell: Opus 5.5 direkt.
