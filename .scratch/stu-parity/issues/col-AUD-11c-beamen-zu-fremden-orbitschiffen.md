# Beamen zwischen Kolonie und fremden Schiffen im Orbit wie STU

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** col-AUD-11a

## Ziel

Seit col-AUD-11a zeigt der Orbit-Kasten fremde ungetarnte Schiffe, die Beam-Knöpfe sind für sie aber gesperrt („Beamen zu fremden Schiffen ist noch nicht möglich“). Der SWU-Kolonietransfer (`ShipColonyContextService.requireContext`) verlangt, dass Schiff und Kolonie demselben Spieler gehören. STU erlaubt Warentransfer zwischen eigener Kolonie und fremden Schiffen nach `CommodityTransferStrategy` (fremde Schilde blockieren, Freundschaft nach `TransferInformationFactory`, Zieleigner-Sicht).

## STU-Quellen

- `src/Lib/Transfer/Strategy/CommodityTransferStrategy.php` (Z. ~40–110, `shieldsAreBlocking`)
- `src/Lib/Transfer/TransferInformationFactory.php`, `TransferInformation.php` (`isFriend`)
- `src/html/colony/menu/management.twig` (Z. 59–69, Beam-Knöpfe am Orbit-Kasten)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/ship-colony-context.service.ts` (`requireContext`, `getQuote`)
- `apps/backend/src/modules/spacecraft/transfer.service.ts` (`loadCargo`/`unloadCargo` mit `initiator: 'COLONY'`; Schiff-zu-Schiff-Regeln Z. ~720–790 als Vorbild)
- `apps/frontend/src/pages/colonies/components/PanelOrbit.tsx` (`FOREIGN_BEAM_BLOCKED`)

## Akzeptanzkriterien

- [x] Kolonie-initiiertes Beamen zu und von fremden ungetarnten Schiffen im Orbit nach STU-Regeln; Crew-Transfer bleibt eigenen Schiffen vorbehalten.
- [x] Angebot (Quote) gibt für fremde Schiffe keine Fracht- oder Crew-Details preis, die STU nicht zeigt.
- [x] Sperren und Energieabbuchung wie beim bestehenden Kolonietransfer; Eigner bekommt eine Nachricht.
- [x] Beam-Knöpfe im Orbit-Kasten für fremde Schiffe freigeschaltet.
- [x] Backend-Tests (inkl. PostgreSQL): erlaubter Transfer, Schilde blockieren für Nicht-Freunde, getarntes Schiff abgelehnt; Frontend-Test der Knöpfe.

## Herkunft

- Aus col-AUD-11a abgespalten (Product Owner, 2026-11-19), weil SWU keine Kolonie↔Fremdschiff-Transferregeln hat.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

Commit: `feat(colony): beam between colony and foreign orbit ships (stu-parity col-AUD-11c)`

- Regeln (STU `Transfer`/`CommodityTransferStrategy`): Kolonie-initiiertes Beamen (`initiator: 'COLONY'`) mit fremden ungetarnten Schiffen in beide Richtungen; getarnt → „Ship not found“; Eigner im Urlaubsmodus → abgelehnt; aktive Schilde des Fremdschiffs blockieren. SWU-Ausnahme wie Orbitalmanagement/Schiff-zu-Schiff: Freund aus Sicht des Zieleigners (`mayProvisionProtectedShip`) darf zu einem geschirmten Schiff beamen, nicht von ihm. Schiff-initiierte Transfers und Crew-Transfer bleiben eigenen Schiffen vorbehalten (`requireContext` filtert dort weiter nach `userId`).
- Quote (`GET /spacecraft/:id/transfer-quote?initiator=COLONY&direction=…`): für fremde Schiffe nur Lagerbalken (used/max), Schiffsladung nur bei `TO_COLONY` (STU `BEAMABLE_STORAGE`), keine Crewdaten.
- Sperren/Energie unverändert über `requireContext` + `chargeTransferEnergy`; Eigner erhält nach Commit Nachricht „Warentransfer im Orbit“ im Ordner TRADE (STU SPECIAL_TRADE).
- Frontend: Beam-Knöpfe in `PanelOrbit` freigeschaltet; `TransferDialog` lädt Quote mit Initiator/Richtung, zeigt Sperrgrund, blendet Crew-Reiter für Fremdschiffe aus.
- Checks: `nx typecheck backend` ✓, `nx typecheck frontend` ✓, Jest `transfer.service.spec` + `ship-colony-context.service.spec` (44) ✓, PostgreSQL `colony-foreign-ship-transfer.int-spec.ts` (5) ✓, Vitest `TransferDialog.spec` + `PanelOrbit.spec` (8) ✓, `nx lint frontend` ohne neue Befunde.
- Modell: Claude Opus 5.5 direkt (Sol/Luna in dieser Sitzung nicht verfügbar; Ticket betrifft Autorisierung/Informationspreisgabe → Direktumsetzung).
- Ausstehend: gesammelter Verifikationslauf (Diff-Review gegen AK, volle Backend-/Frontend-Suiten).

- 2026-11-23 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `afa856fb`: Lint 0 Fehler (in den geänderten Dateien keine Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 990/991 (Ausreißer `settings-tutorial.spec.tsx` einzeln 23/23 grün, nicht berührt), PostgreSQL-Integration 1076/1076. Diff-Review gegen Akzeptanzkriterien ohne Befund (Rechte: Kolonie-Eigentum, Orbit, Tarnung; Flottenendpunkte prüfen den Eigner). Modell: Opus 5.5 direkt.
