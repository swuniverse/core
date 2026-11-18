# Sammelfelder mit Vorrat wie STU – Mechanik

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

In SWU erschöpfen Sammelfelder nicht: Der Ressourcen-Kollektor liefert je Tick die konfigurierte Feldtyp-Rate, unbegrenzt. STU führt je Ort und Ware einen Vorrat (`stu_location_mining`: `actual_amount`, `max_amount`, `depleted_at`).
- Je Tick sammelt das Schiff 95–105 Einheiten, mit Fraktionsmodul 190–220, begrenzt durch Vorrat und freien Lagerraum.
- Fällt der Vorrat auf 0, setzt STU `depleted_at` und meldet „Es sind keine … bei den Koordinaten … vorhanden!“.
- Maintenance regeneriert erschöpfte Felder nach 20 Tagen: aus 0 auf 5 % von max (mind. 1), sonst +15 %, bis max; bei max wird `depleted_at` gelöscht.

## STU-Quellen

- `src/Orm/Entity/LocationMining.php`, `src/Orm/Repository/LocationMiningRepository.php` (`ISM_RECREATION_COOLDOWN = 1728000`, `findDepletedEntries`)
- `src/Module/Tick/Spacecraft/Handler/BussardCollectorHandler.php` (Z. ~24–81)
- `src/Module/Maintenance/CreateInterstellarMedia.php`
- `src/Orm/Entity/MiningQueue.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/resource-collection.service.ts` (`processTick` Z. ~100–172, `resources` Z. ~271–296)
- `apps/backend/src/modules/spacecraft/resource-collection-state.ts`
- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts` (`miningResources`), `space-location.entity.ts`
- `apps/backend/src/modules/tick/maintenance.service.ts` (neuer `MaintenanceHandler`)
- `apps/frontend/src/components/spacecraft/ResourceCollectionPanel.tsx`
- Migration unter `apps/backend/src/migrations/`

## Akzeptanzkriterien

- [ ] Neue Entity/Tabelle für Ortsvorräte (Ort, Ware, `actualAmount`, `maxAmount`, `depletedAt`), angelegt beim ersten Sammeln bzw. per Migration für Felder mit Sammelressourcen; Startwert `maxAmount` aus einem vorläufigen Default je Feldtyp/Ware (Kalibrierung in sc-AUD-12b).
- [ ] Sammeln je Tick: Zufall 95–105, mit fraktionsgebundenem Kollektormodul 190–220 (Zuordnung im Ticket festlegen), begrenzt durch Vorrat und freien Lagerraum; Vorrat wird abgezogen. Die bisherige feste Feldtyp-Rate entfällt als Sammelmenge (Feldtyp bestimmt nur, welche Waren vorkommen).
- [ ] Bei Erschöpfung: `depletedAt` gesetzt, Meldung wie STU an den Eigner, Sammeln endet; späteres Sammeln mit Vorrat > 0 löscht `depletedAt`.
- [ ] Maintenance-Handler regeneriert Einträge, die seit ≥ 20 Tagen erschöpft sind: aus 0 auf `max(1, ceil(5 % max))`, sonst `ceil(×1,15)`, gekappt auf max (dann `depletedAt = null`).
- [ ] `ResourceCollectionPanel` zeigt den Vorrat je Ware am Feld.
- [ ] Backend-Tests (Abzug, Kappung Lager/Vorrat, Meldung, Regeneration, Fraktionsmodul), PostgreSQL-Integrationstest für Nebenläufigkeit mehrerer Sammler am selben Feld; Frontend-Test für die Vorratsanzeige.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte H („Sammeln“), I (Entscheidung „Wie STU“) und N2; [spacecraft.md](../audit-2026-11-17/spacecraft.md) Seitenabgleich „Bussard/Aggregation“.
- PO-Entscheidung vom 2026-11-17 (Abschnitt I). Ändert die `map.md`-Entscheidung sc-WP-RES-1 („je 100 Einheiten/Tick“, unbegrenzt); betrifft [sc-WP-RES-1](sc-WP-RES-1-ressourcen-sammeln-mining.md).

## Comments
