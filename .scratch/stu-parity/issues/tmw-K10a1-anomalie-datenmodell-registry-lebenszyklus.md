# Anomalien: Datenmodell, Registry und Lebenszyklus

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1a, tmw-K3c

## Ziel

Legt den persistenten, generischen Anomalie-Kern an, auf dem konkrete Anomalietypen und ihre Anzeigen aufbauen: Datenmodell, Handler-Registry und den tick-gesteuerten Lebenszyklus. Die Subraumellipse und ihre Wirkungen folgen in `tmw-K10a2`; Scan-/UI-Verträge in `tmw-K10a3`.

## STU-Quellen

- `src/Component/Anomaly/AnomalyCreation.php`, `AnomalyHandling.php` (`processExistingAnomalies`, `createNewAnomalies`, `decreaseLifespan`)
- `src/Component/Anomaly/Type/AnomalyHandlerInterface.php`, `AnomalyTypeEnum.php`
- `src/Orm/Entity/Anomaly.php`, `AnomalyType.php`
- `src/Module/Tick/Spacecraft/ManagerComponent/AnomalyProcessing.php`, `AnomalyCreationCheck.php`

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.service.ts`
- `apps/backend/src/modules/starmap/entities/space-location.entity.ts`
- `apps/backend/src/modules/spacecraft/`
- Migrationen gemäß `docs/typeorm-migrations.md`

## Akzeptanzkriterien

- [ ] Migration und Entities modellieren Anomalietyp sowie Anomalie mit nullablem Ort für Wurzelobjekte, Restticks, JSON-Daten und Eltern-/Kindbeziehungen.
- [ ] Ein Handler-Register definiert `checkForCreation`, `handleTick`, `handleIncomingSpacecraft` und `onDisappear` für konkrete Typen.
- [ ] Der Haupttick verarbeitet zuerst existierende Anomalien und danach Erzeugungsprüfungen; Restticks werden einmal je Tick reduziert und Anomalien bei Ablauf entfernt.
- [ ] Der generische Kern kennt keine Subraumellipse-spezifischen Zufalls-, Schadens- oder Renderingregeln.
- [ ] Backend-Tests decken Persistenzbeziehungen, Handler-Registrierung und Lebenszyklus einschließlich Ablauf ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Das Framework wird generisch registrierbar umgesetzt; Typ-spezifisches Verhalten bleibt in Handlern. Die Subraumellipse ist der erste Handler und wird separat in `tmw-K10a2` integriert.

## Comments

- 2026-11-06: Erstes geordnetes Child aus `tmw-K10a`; die Voraussetzungen `tmw-K1a` und `tmw-K3c` sind abgeschlossen.
