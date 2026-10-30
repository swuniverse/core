# Ebenenkenntnis: Fundament und Bestands-Backfill

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Ein persistenter Spieler-Ebenenstatus bildet bekannte und vollständig erkundete Ebenen unabhängig von persönlichen Felderkundungsdaten ab. Bestandsspieler erhalten ihre bereits belegten oder erkundeten Ebenen idempotent.

## STU-Quellen

- `src/Orm/Entity/UserLayer.php` (Spieler × Ebene, `map_type`)
- `src/Component/Map/MapEnum.php` (`MAPTYPE_INSERT`, `MAPTYPE_LAYER_EXPLORED`)
- `src/Migrations/pgsql/Version20260917123000_MoveUsersToCragganmore.php` (Migration vorhandener Ebenenkenntnis)

## SWU-Pfade

- `apps/backend/src/modules/starmap/entities/`
- `apps/backend/src/database/migrations/`
- Kolonie-, Schiffs- und `exploration_states`-Entitäten für das Backfill
- `packages/shared/` für den Statusvertrag

## Akzeptanzkriterien

- [ ] Eine Entität für Spieler × Ebene besitzt einen eindeutigen zusammengesetzten Schlüssel, Status `KNOWN | EXPLORED`, `knownAt` und optional `exploredAt`.
- [ ] Eine Migration legt Tabelle, Fremdschlüssel und Indizes an; das Löschen eines Spielers oder einer Ebene entfernt die zugehörigen Zeilen.
- [ ] Bestandsspieler erhalten idempotent den Status `KNOWN` für jede Ebene, auf der sie eine Kolonie, ein eigenes Schiff oder persönliche Felderkundungsdaten besitzen.
- [ ] Bei mehreren Quellen entsteht nur eine Zeile je Spieler und Ebene; vorhandene Daten werden nicht herabgestuft.
- [ ] Repository- beziehungsweise Service-Methoden können Ebenenkenntnis idempotent anlegen, den Status lesen und ausschließlich von `KNOWN` nach `EXPLORED` fortschreiben.
- [ ] Backend-Tests decken Schema, Eindeutigkeit, Backfill aller drei Quellen, Idempotenz und den monotonen Statusübergang ab.

## Entscheidung

`KNOWN` entspricht STU `MAPTYPE_INSERT`; `EXPLORED` entspricht `MAPTYPE_LAYER_EXPLORED`. Persönliche Felderkundungsdaten bleiben ein getrenntes Modell.
