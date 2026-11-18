# Kolonisierung: Vorkommen zwischen min und max würfeln, STU-Mengen

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** col-AUD-12

## Ziel

STU würfelt beim Kolonisieren je Vorkommen der Kolonieklasse `random_int(min, max)`. Ein Vorkommen legt es nur an, wenn der Spieler dort noch keins hat. SWU setzt immer `maxAmount` und legt Zeilen ohne Prüfung an. Die SWU-Daten leiten Vorkommen aus `baseProduction` mit `min = max = amount` ab; dadurch sind die Vorkommen nach wenigen Ticks erschöpft. Die echten Mengen stehen bei STU nur in der Tabelle `stu_colony_class_deposit` (Datenanfrage col-AUD-12).

## STU-Quellen

- `src/Module/Ship/Action/Colonize/Colonize.php` (Z. 179–198)
- DB-Tabelle `stu_colony_class_deposit` (nicht im Repo; siehe col-AUD-12)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-seed.service.ts` (Z. 695/715)
- `apps/backend/src/modules/game-data/game-data.service.ts` (`deposits` aus `baseProduction`, Z. 1215–1219)
- `game-data/data/colony-classes/stu-colony-classes.yaml`
- `apps/backend/src/modules/colony/entities/colony-deposit-mining.entity.ts`

## Akzeptanzkriterien

- [ ] Kolonieklassen haben eigene Vorkommensdaten (`commodityId`, `minAmount`, `maxAmount`) unabhängig von `baseProduction`. Die Werte stammen aus der STU-Antwort (col-AUD-12) oder, ohne Antwort, aus SWU-eigener Balance. Die Quelle steht in den Daten als Kommentar („STU-Export vom …“ bzw. „SWU-eigene Balance“).
- [ ] Beim Kolonisieren wird je Vorkommen `random(min, max)` gewürfelt. Hat der Spieler an dieser Kolonie schon einen Eintrag, wird keiner angelegt.
- [ ] Bestehende Kolonien werden nicht verändert; ob ein einmaliger Ausgleich nötig ist, wird unter Comments festgehalten.
- [ ] SWU-Extras (Aurodium 300–900, Asteroiden je Spieler) bleiben erhalten.
- [ ] Backend-Tests: Wert liegt in [min, max] (mit gemocktem Zufall), keine Doppelanlage.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ und Abschnitt I (Vorkommensmengen, Datenanfrage Punkt 1).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), kleine Abweichung „Kolonisierung, Vorkommen“, Unsicherheit Nr. 1.
- PO-Entscheidung 2026-11-17 (Abschnitt I): PO fragt bei STU nach; Fallback eigene Balance.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Status ready-for-agent, aber blockiert durch col-AUD-12. Wird col-AUD-12 als wontfix geschlossen (keine Antwort), gilt der Fallback SWU-eigene Balance.
