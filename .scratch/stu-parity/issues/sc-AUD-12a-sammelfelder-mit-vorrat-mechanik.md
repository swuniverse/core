# Sammelfelder mit Vorrat wie STU – Mechanik

**Status:** resolved
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

- [x] Neue Entity/Tabelle für Ortsvorräte (Ort, Ware, `actualAmount`, `maxAmount`, `depletedAt`), angelegt beim ersten Sammeln bzw. per Migration für Felder mit Sammelressourcen; Startwert `maxAmount` aus einem vorläufigen Default je Feldtyp/Ware (Kalibrierung in sc-AUD-12b).
- [x] Sammeln je Tick: Zufall 95–105, mit fraktionsgebundenem Kollektormodul 190–220 (Zuordnung im Ticket festlegen), begrenzt durch Vorrat und freien Lagerraum; Vorrat wird abgezogen. Die bisherige feste Feldtyp-Rate entfällt als Sammelmenge (Feldtyp bestimmt nur, welche Waren vorkommen).
- [x] Bei Erschöpfung: `depletedAt` gesetzt, Meldung wie STU an den Eigner, Sammeln endet; späteres Sammeln mit Vorrat > 0 löscht `depletedAt`.
- [x] Maintenance-Handler regeneriert Einträge, die seit ≥ 20 Tagen erschöpft sind: aus 0 auf `max(1, ceil(5 % max))`, sonst `ceil(×1,15)`, gekappt auf max (dann `depletedAt = null`).
- [x] `ResourceCollectionPanel` zeigt den Vorrat je Ware am Feld.
- [x] Backend-Tests (Abzug, Kappung Lager/Vorrat, Meldung, Regeneration, Fraktionsmodul), PostgreSQL-Integrationstest für Nebenläufigkeit mehrerer Sammler am selben Feld; Frontend-Test für die Vorratsanzeige.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte H („Sammeln“), I (Entscheidung „Wie STU“) und N2; [spacecraft.md](../audit-2026-11-17/spacecraft.md) Seitenabgleich „Bussard/Aggregation“.
- PO-Entscheidung vom 2026-11-17 (Abschnitt I). Ändert die `map.md`-Entscheidung sc-WP-RES-1 („je 100 Einheiten/Tick“, unbegrenzt); betrifft [sc-WP-RES-1](sc-WP-RES-1-ressourcen-sammeln-mining.md).

## Comments

- 2026-11-20 – **umgesetzt, Prüfung ausstehend** (Commit `feat(spacecraft): finite collection field stock like STU (stu-parity sc-AUD-12a)`, Opus direkt, keine Delegation wegen Nebenläufigkeit/Migration).
  - Tabelle `location_mining` (Migration `20261120160000-add-location-mining.ts`, Entity `LocationMining`), Zeile je Ort/Ware wird beim ersten Sammel-Tick per `INSERT … ON CONFLICT DO NOTHING` angelegt und mit `FOR UPDATE` gesperrt; parallele Sammler am selben Feld serialisieren darauf.
  - Vorläufiger Vorrat `DEFAULT_FIELD_STOCK = 10 000` für alle Feldtypen/Waren (`resource-collection-state.ts`, `shortcut:`-Kommentar); Kalibrierung in sc-AUD-12b. Die Feldtyp-`rate` bleibt im Karteneditor erhalten, bestimmt aber keine Menge mehr.
  - **Entscheidung Fraktionsmodul:** Ein Kollektormodul ist fraktionsgebunden, wenn seine Moduldefinition in den Spieldaten `secret.faction` trägt. Derzeit hat kein SWU-Modul das, also sammeln alle 95–105.
  - Erschöpfung: `depletedAt` gesetzt, Meldung „Es sind keine <Ware> bei den Koordinaten x|y vorhanden! Sammeln beendet.“, Sammeln stoppt; Start auf erschöpftem Vorrat wird mit derselben Meldung abgelehnt. Grenzfall: Wartung regeneriert ab genau 20 Tagen (Ticket „≥ 20“, STU nutzt strikt `<`).
  - Wartung `LocationMiningRegenerationService` (ein atomares `UPDATE`, im `TickModule` registriert).
  - Panel zeigt „Vorrat x/max“ je Ware statt „n je Tick“.
  - Checks: `nx typecheck backend`/`frontend` grün; Jest `resource-collection.spec`, `maintenance.service.spec` (36) grün; Vitest `ResourceCollectionPanel.spec` (4) grün; PostgreSQL `resource-collection|resource-conversion|maintenance` (59, inkl. Nebenläufigkeitstest) grün; ESLint ohne Fehler.
  - Ausstehend: gesammelte vollständige Verifikation (`npm run lint && npm run typecheck && npm run test`, alle Integrationstests).
- 2026-11-20 – **resolved nach Verifikation.** Review ok; Nebenläufigkeitstest mehrerer Sammler in der Integrationssuite grün. Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
