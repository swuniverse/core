# Flugsignaturen: Modell, Erzeugung, Verfall und Sektor-Scan des Schiffs

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Jede Bewegung hinterlässt wie in STU Flugsignaturen auf Start- und Zielfeld (Schiff, Name, Rumpf, Richtung, Zeit, Tarnung). Der Sektor-Scan des Schiffs zeigt damit echte `signatures` und `fadedSignatures`. Kanonischer Eigentümer des Themas laut map.md; übernimmt den Modell- und Wartungsteil von tmw-K9. Grundlage für sc-WP-NAV-2b, sc-WP-NAV-2c, sc-WP-SENS-2a und sc-WP-CLOAK-2a.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Movement/Component/FlightSignatureCreator.php` (zwei Signaturen je Schritt, `toDirection`/`fromDirection`)
- `Orm/Entity/FlightSignature.php`, `Orm/Repository/FlightSignatureRepository.php` (`getVisibleSignatures`)
- `Component/Ship/FlightSignatureVisibilityEnum.php` (Name 12 h ungetarnt, 0 getarnt; Rumpf 24 h bzw. 12 h; Signatur 48 h bzw. 18 h)
- `Module/Spacecraft/View/ShowSectorScan/ShowSectorScan.php`, `html/spacecraft/sectorScan.twig`
- `Module/Maintenance/OldFlightSignatureDeletion.php`

## SWU-Pfade

- neue Entity `apps/backend/src/modules/spacecraft/entities/flight-signature.entity.ts` plus Migration (`docs/typeorm-migrations.md`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, `warp`/`processMovement`)
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (heute `signatures: []`, `fadedSignatures: { uncloaked: 0, cloaked: 0 }`)
- `apps/backend/src/modules/tick/tick.service.ts` (Löschung alter Signaturen)
- `packages/shared/src/lib/spacecraft/index.ts`, `apps/frontend/src/components/spacecraft/SensorOperationsPanel.tsx`

## Akzeptanzkriterien

- [ ] Jeder Feldwechsel eines Schiffs erzeugt zwei Signaturen (Abflug mit Zielrichtung, Ankunft mit Herkunftsrichtung) mit Eigentümer, Schiffs-ID, Schiffsname, Klasse, Tarnflag (vorerst `false`) und Zeitstempel; Hyperraumsprünge erzeugen Signaturen an Start- und Zielfeld.
- [ ] Der Sektor-Scan liefert die Signaturen fremder Spieler am Feld, je Schiff nur die jüngste; Name, Klasse und Signatur werden gemäß den STU-Sichtbarkeitsfenstern angezeigt bzw. als „verblasst“ gezählt (`fadedSignatures.uncloaked`/`cloaked`).
- [ ] Eigene Signaturen erscheinen nicht.
- [ ] Ein Tick- bzw. Wartungsjob löscht Signaturen älter als 48 h.
- [ ] Die Sektor-Scan-Ansicht zeigt Signaturen als Tabelle (Klasse, Name, Richtung, Alter) wie `sectorScan.twig`.
- [ ] Backend-Tests: Erzeugung bei Systemflug und Galaxieflug, Sichtbarkeitsfenster an den Grenzen, Löschung; Frontend-Test der Tabelle.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
