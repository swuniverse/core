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
- 2026-11-11: Kandidat `7f5c7a6e5afe2dbf256cd7985692211b6f62a4a8` (Parent `b4a7a6fb8559fbd60ceab1afb0117f7ee3e20a81`, Tree `1751e1f0a2de05278bc4ac7a1d393b7531e2b564`). Generischer persistenter Kern, Registry, transaktionaler Lebenszyklus im Haupttick und Migration; keine Ellipsenregeln. Backend-Lint und Build grün; Backend-Tests 215 Suiten/2008 Tests, gezielte PostgreSQL-Integration 3 Suiten/6 Tests, jeweils 0 Skips. Typecheck **nicht grün**: unbenutztes `ExplorationState` in `starmap-query.service.ts:24` verhindert Deklarations-Build; danach zahlreiche TS6305-Folgefehler. Fokusprüfung mit deaktiviertem `noUnusedLocals` grün; Testtypen melden zwei Fehler in `layer-access-http.int-spec.ts:310,461`. Keine Baseline-Gegenprüfung ausgeführt, daher keine Aussage über vollständige Fehlergleichheit zur Basis. Status und Checkboxen bleiben unverändert, unabhängige Standards-/Security- und Spec-Reviews ausstehend. Detaillierte lokale Receipts und Bericht: `.workmux/tmw-K10a1-fast-report-20261111.md`.
- 2026-11-11: Beide unabhängigen Reviews meldeten laut Koordinator dieselbe P2-Race zwischen verschiedenen Tick-IDs. Korrektur `94164aed9bc4b05aedbdc4f6b7ce2a27d337a1b9` (Parent `7f5c7a6e5afe2dbf256cd7985692211b6f62a4a8`, Tree `e348a4f07d06e02fa38d474d86c6fc25de579897`) serialisiert die Anomaliephase transaktional. Echte PostgreSQL-REDs zeigten verlorenes Dekrement und doppelten Ablauf; danach gezielte PG-Gates 3 Suiten/10 Tests, Backend 215 Suiten/2008 Tests, Build und Lint grün, 0 Skips. Typecheck bleibt nicht grün: TS6133 und 977 TS6305 sowie Folgefehler; Base-Vergleich im Bericht `.workmux/tmw-K10a1-typecheck-investigation-20261111.md`. Frische Korrektur-spezifische TS7006-Folgefehler bei fehlenden Deklarationen sind nicht unabhängig von diesem Fehler isoliert. Keine Baseline-Reparatur. Status/Checkboxen unverändert; zwei unabhängige Korrektur-Reviews ausstehend. Einzelheiten `.workmux/tmw-K10a1-correction-report-20261111.md`.
- 2026-11-11: Laut Koordinator bestätigten beide Korrektur-Reviews den P2-Fix ohne neuen Lebenszyklusdefekt; Spec bleibt wegen Typecheck auf HOLD. Typ-Follow-up `d51c2d365ed0ba8a4a18cf5aa6cabcdb41eb770d` (Parent `94164aed9bc4b05aedbdc4f6b7ce2a27d337a1b9`, Tree `55d9df799c43bbf477e01c4c9fd7efcf90cea7aa`) typisiert sieben Callback-Parameter explizit, ohne Verhaltensänderung. Die sieben TS7006 im betroffenen Test entfallen im erneuten kanonischen Lauf; Typecheck bleibt dennoch rot (Exit 1, TS6133, 977 TS6305 und weitere Diagnosen), strikter Deklarations-Build scheitert unverändert an `starmap-query.service.ts:24` (Exit 2). Keine erfolgreiche strikte Deklarationsbasis für isolierten Spec-Typecheck; nicht alle restlichen Diagnosen sind als Baseline bewiesen. Backend-Lint/Build sowie 215 Suiten/2008 Tests und gezielte PostgreSQL-Tests 1 Suite/7 Tests grün, 0 Skips. Status/Checkboxen unverändert; Baseline-Änderung und Annahmeentscheidung beim Koordinator. Einzelheiten `.workmux/tmw-K10a1-type-validation-report-20261111.md`.
- 2026-11-11: Nach ausdrücklicher Freigabe wurden ausschließlich die Baseline-Typfehler in `starmap-query.service.ts` und `layer-access-http.int-spec.ts` korrigiert, Commit `3f92abcd3a215ecc53fa3341f00abf41acc20645` (Parent `d51c2d365ed0ba8a4a18cf5aa6cabcdb41eb770d`, Tree `9f10087350f06b24d55a09e694c16265cdd0baed`). Strikter Deklarations-Build und kanonischer Backend-Typecheck nun Exit 0 ohne verbleibende Diagnosen; Lint/Build grün, 215 Backend-Suiten/2008 Tests und gezielte PostgreSQL-Integration 2 Suiten/59 Tests grün, 0 Skips. Lint 1438 Warnungen. Status/Checkboxen unverändert, keine Integration; Einzelheiten und Receipts `.workmux/tmw-K10a1-baseline-fix-report-20261111.md`.
