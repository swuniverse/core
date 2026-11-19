# Beamen zwischen Kolonie und fremden Schiffen im Orbit wie STU

**Status:** ready-for-agent
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

- [ ] Kolonie-initiiertes Beamen zu und von fremden ungetarnten Schiffen im Orbit nach STU-Regeln; Crew-Transfer bleibt eigenen Schiffen vorbehalten.
- [ ] Angebot (Quote) gibt für fremde Schiffe keine Fracht- oder Crew-Details preis, die STU nicht zeigt.
- [ ] Sperren und Energieabbuchung wie beim bestehenden Kolonietransfer; Eigner bekommt eine Nachricht.
- [ ] Beam-Knöpfe im Orbit-Kasten für fremde Schiffe freigeschaltet.
- [ ] Backend-Tests (inkl. PostgreSQL): erlaubter Transfer, Schilde blockieren für Nicht-Freunde, getarntes Schiff abgelehnt; Frontend-Test der Knöpfe.

## Herkunft

- Aus col-AUD-11a abgespalten (Product Owner, 2026-11-19), weil SWU keine Kolonie↔Fremdschiff-Transferregeln hat.

## Comments
