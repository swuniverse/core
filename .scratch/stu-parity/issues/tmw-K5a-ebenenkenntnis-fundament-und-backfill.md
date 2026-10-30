# Ebenenkenntnis: Fundament und Bestands-Backfill

**Status:** resolved
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

- [x] Eine Entität für Spieler × Ebene besitzt einen eindeutigen zusammengesetzten Schlüssel, Status `KNOWN | EXPLORED`, `knownAt` und optional `exploredAt`.
- [x] Eine Migration legt Tabelle, Fremdschlüssel und Indizes an; das Löschen eines Spielers oder einer Ebene entfernt die zugehörigen Zeilen.
- [x] Bestandsspieler erhalten idempotent den Status `KNOWN` für jede Ebene, auf der sie eine Kolonie, ein eigenes Schiff oder persönliche Felderkundungsdaten besitzen.
- [x] Bei mehreren Quellen entsteht nur eine Zeile je Spieler und Ebene; vorhandene Daten werden nicht herabgestuft.
- [x] Repository- beziehungsweise Service-Methoden können Ebenenkenntnis idempotent anlegen, den Status lesen und ausschließlich von `KNOWN` nach `EXPLORED` fortschreiben.
- [x] Backend-Tests decken Schema, Eindeutigkeit, Backfill aller drei Quellen, Idempotenz und den monotonen Statusübergang ab.

## Entscheidung

`KNOWN` entspricht STU `MAPTYPE_INSERT`; `EXPLORED` entspricht `MAPTYPE_LAYER_EXPLORED`. Persönliche Felderkundungsdaten bleiben ein getrenntes Modell.

## Comments

Persistentes `LayerKnowledge`-Modell, monotone Service-API und Migration mit dedupliziertem Backfill aus Kolonien, Schiffsorten und `exploration_states` ergänzt. Fokussierte Tests und alle Builds sind grün; der vollständige Typecheck bleibt ausschließlich an den bereits vorhandenen, fachfremden Fixtures in `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts` rot (sh-AP-23).
