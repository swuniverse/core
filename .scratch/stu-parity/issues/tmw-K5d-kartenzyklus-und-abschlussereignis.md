# Kartenzyklus und Ereignis „Ebene vollständig erkundet“

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K5a, sh-AP-07a

## Ziel

Der tägliche Kartenzyklus erkennt vollständig erkundete Ebenen, setzt ihren Spielerstatus atomar auf `EXPLORED`, entfernt den persönlichen Ebenennebel und veröffentlicht genau einmal das Abschlussereignis für `soc-G2b`.

## STU-Quellen

- `src/Module/Maintenance/MapCycle.php`
- `src/Orm/Repository/MapRepository.php#countByLayer`
- `src/Orm/Repository/UserMapRepository.php#countByUserAndLayer`, `truncateByUserAndLayer`
- `tests/unit/Module/Maintenance/MapCycleTest.php`

## SWU-Pfade

- `apps/backend/src/modules/tick/maintenance.service.ts`
- `apps/backend/src/modules/starmap/exploration.service.ts`
- `apps/backend/src/modules/starmap/entities/exploration-state.entity.ts`
- Ereignisinfrastruktur unter `apps/backend/src/modules/events/`

## Akzeptanzkriterien

- [ ] Ein täglicher Maintenance-Handler verarbeitet ausschließlich Spieler-Ebenen im Status `KNOWN`.
- [ ] Vollständig erkundet bedeutet: Für jedes tatsächlich in der Ebene vorhandene Kartenfeld existiert für den Spieler persönliche Felderkundung; gezählt werden eindeutige Feldkoordinaten, und `>=` gilt als vollständig.
- [ ] Statuswechsel zu `EXPLORED`, Setzen von `exploredAt` und Löschen aller persönlichen Felderkundungszeilen dieser Spieler-Ebene erfolgen atomar mit geeigneten Sperren.
- [ ] Der erfolgreiche erste Übergang veröffentlicht genau einmal ein internes Ereignis mit Spieler-ID, Ebenen-ID und Abschlusszeitpunkt; Wiederholungen oder parallele Läufe veröffentlichen es nicht erneut.
- [ ] Das Ereignis vergibt selbst keinen Award. `soc-G2b` bindet die Award-Vergabe später als Consumer an.
- [ ] Persönliche Systementdeckungen und Kartographiepläne bleiben unverändert.
- [ ] Backend-Tests decken unvollständige und vollständige Ebenen, überschüssige beziehungsweise doppelte Daten, Nebellöschung, Transaktionsrollback, Parallelität und genau-einmal-Semantik ab.

## Entscheidung

Wie STU wird der Abschluss im täglichen Kartenzyklus festgestellt. SWU entkoppelt die spätere Award-Vergabe über ein idempotentes Domainereignis.
