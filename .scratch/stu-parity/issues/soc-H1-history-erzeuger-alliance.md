# Globale History: Erzeuger ALLIANCE

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

In STU erzeugen Kriegserklärungen, Vertragsabschlüsse, Kündigungen und Siedler-Abkommen globale History-Einträge. SWU führt diese Ereignisse in der **Diplomatie-Chronik** je Allianz/Partei; der History-Typ ALLIANCE ist im Filter von `/events` sichtbar, aber immer leer. Dieses Issue spiegelt öffentliche Diplomatie-Ereignisse in die globale History, falls gewünscht.

## STU-Quellen

- `src/Component/History/Event/HistoryEntrySubscriber.php`
- `src/Component/Player/Relation/UserRelationHistory.php`
- `src/Module/Alliance/Action/AcceptOffer`, `CancelContract`

## SWU-Pfade

- `apps/backend/src/modules/events/game-event.service.ts` (neue Methode, z. B. `recordAlliance`)
- `apps/backend/src/modules/alliance/alliance.service.ts` (`appendPartyChronicleEntry`, `appendAllianceChronicle`), `typeorm-alliance.store.ts#appendDiplomacyChronicleEntry`
- `packages/shared/src/lib/common/index.ts` (`GameEventType.ALLIANCE`)
- `apps/frontend/src/pages/events.tsx`

## Akzeptanzkriterien

- [x] Kriegserklärung, Friedensschluss, Vertragsabschluss und Kündigung (Allianzen und Siedler-Abkommen) erzeugen in derselben Transaktion wie der Chronik-Eintrag einen `GameEvent` vom Typ ALLIANCE mit Parteinamen.
- [x] `/events` zeigt sie im Filter ALLIANCE.
- [x] Backend-Tests je Ereignistyp; Frontend-Test für den Filter.

## Entscheidung

Vorgabe: Variante (a). Alle Beziehungswechsel zwischen Parteien (Kriegserklärung, Friedensschluss, Vertragsabschluss, Kündigung; Allianzen und Siedler-Abkommen) erscheinen zusätzlich als `GameEvent` vom Typ ALLIANCE in `/events`. Die Diplomatie-Chronik bleibt bestehen.

## Comments

- 2026-10-21 Product Owner: Option a – Öffentliche Diplomatie-Ereignisse werden wie in STU zusätzlich als ALLIANCE-Ereignis in die globale History gespiegelt.
- 2026-11-05 Verifikation: `recordAlliance` schreibt mit dem aktiven EntityManager. Der zentrale öffentliche Diplomatie-Chronikpfad erzeugt genau ein ALLIANCE-Ereignis je Krieg, Frieden, Vertragsbeginn, akzeptierter Änderung und Kündigung; beide Namen und der Ereignistyp sind enthalten, Vertragsinhalte nicht. Akzeptierte Vertragsänderungen erhalten jetzt ebenfalls einen öffentlichen Chronikeintrag (bewusste Erweiterung der älteren Diplomatie-Kern-Regel). Vorschläge, Ablehnung, Rückzug und administrative Parteiwechsel erzeugen kein globales Ereignis. Ein erzwungener Fehler nach dem Event-Insert rollt Beziehung, Chronik und Event gemeinsam zurück. RED: Unit-Test meldete fehlendes `recordAlliance`; PostgreSQL-Matrix meldete fehlende Events bzw. den fehlenden Chronikeintrag bei Vertragsänderung. GREEN: 29 fokussierte PostgreSQL-Tests, einschließlich 24 Kombinationen aus sechs Übergängen und vier Partei-Anordnungen; 72 PostgreSQL-Tests über Event-, Lifecycle-, Reset- und Request-Suiten; 656 Backend-Unit-Tests über Allianz/Events; 80 Frontend-Tests für Events, Allianzen und Siedler-Diplomatie. Der ALLIANCE-Filter wurde ohne UI-Änderung bestätigt. App-Typechecks für Backend und Frontend, ESLint der geänderten Dateien und `git diff --check` bestanden.
- Verifikationshinweise: Nx konnte wegen fehlender pnpm-`.modules.yaml` nach `npm ci` keinen Projektgraphen erstellen; stattdessen liefen Jest, Vitest, TypeScript und ESLint direkt per `npx`. Die isolierte PostgreSQL-Datenbank brauchte vorhandene lokale Game-Data und temporäre Workarounds für bestehende Migrationsfehler (`user` statt `users`, zeitlich falsch einsortierte User-Characters-Migration, Migration-Glob lädt Spec-Dateien). Ein breiterer Lauf bestand 58 Tests, scheiterte aber im bestehenden Events-HTTP-Test an fehlenden `ExplorationState`-Metadaten im Integration-DataSource. Die zusätzlichen Test-TSConfigs melden bestehende, nicht mit dieser Änderung zusammenhängende Typfehler; die App-Typechecks und die geänderten Tests haben keine Typdiagnosen. ESLint übersprang die Nx-Boundary-Regel wegen des fehlenden Graphen.
- 2026-11-05 Review-Handoff: Status wieder `ready-for-agent`, da die erforderlichen unveränderten Integrationstests nicht sauber laufen. Erneuter direkter Jest-Lauf mit originaler `apps/backend/jest.integration.config.cts` und frischer Testcontainers-PostgreSQL-Datenbank, auch nach dem Review-Fix: beide Suiten (`alliance-events.int-spec.ts`, `events.int-spec.ts`) scheitern vor den Testfällen, weil die Migration `20261102090000-add-spacecraft-takeovers.ts` die nicht vorhandene Tabelle `user` statt `users` referenziert; zusätzlich lädt der Migration-Glob während der Ausführung zwei Spec-Dateien und Jest meldet `Cannot add a test after tests have started`. Der zuvor dokumentierte grüne PostgreSQL-Lauf verwendete temporäre Anpassungen und ist kein sauberer Lauf der unveränderten Suite; der neue PostgreSQL-Test für reine Berechtigungsänderungen konnte noch nicht ausgeführt werden. Vor erneuter Auflösung Migrationskette und Test-DataSource einschließlich `ExplorationState` reparieren und die relevanten Suiten ohne Workaround erfolgreich ausführen.
- 2026-11-05 Review-Fix: Reine Berechtigungsänderungen erzeugen keinen öffentlichen Chronik- oder History-Eintrag mehr; eine tatsächliche Vertragsänderung weiterhin schon. Die Unterscheidung erfolgt beim Akzeptieren unter der Beziehungssperre. RED: der neue Unit-Test sah unerwartet einen öffentlichen Chronikeintrag; GREEN: beide fokussierten Tests für Vertrags- und Berechtigungsänderung sowie 657 Backend- und 80 Frontend-Unit-Tests. Backend- und Frontend-App-Typechecks, ESLint (mit Warnungen und ohne Nx-Boundary-Regel) und `git diff --check` bestanden. Atomarität: der zentrale Hook nutzt den Transaktionsmanager; ein früherer PostgreSQL-Test erzwang nach dem Insert einen Rollback, allerdings mit den oben genannten Workarounds. Genau einmal gilt je aufgerufener öffentlicher Übergang: wiederholte Kriegserklärungen werden vom bestehenden Verhalten als neue Beziehung gespeichert und erzeugen jeweils einen weiteren Eintrag, nicht als idempotenter Retry behandelt.

- 2026-11-12: Im aktuellen Stand umgesetzt und ohne Migrations-Workarounds verifiziert. `appendPartyChronicleEntry` schreibt zusätzlich locationlose `ALLIANCE`-Events mit beiden Parteinamen über denselben `EntityManager`; die Event-Zeile rollt bei Fehler gemeinsam mit Beziehung und Diplomatie-Chronik zurück. Krieg, Frieden, Beginn, akzeptierte Beziehungs-/Vertragsänderung und Kündigung erzeugen Ereignisse für Allianz–Allianz, Allianz–Siedler, Siedler–Allianz und Siedler–Siedler. Vorschläge, abgelehnte/zurückgezogene Vorschläge, reine Berechtigungsänderungen sowie administrative Bereinigung beim Allianzbeitritt/-gründen bleiben privat. Der bestehende `/events`-Filter wird wiederverwendet; Vertragsinhalte werden nicht veröffentlicht.
  - Verifikation: Backend-Unit 2 Suiten/256 Tests grün; unveränderte PostgreSQL-Integration mit echten Migrationen 1 Suite/30 Tests grün; Events-Frontend 1 Datei/5 Tests grün; Nx-Typecheck backend/frontend/shared grün; ESLint 0 Fehler (7 `no-non-null-assertion`-Warnungen an unveränderten Altstellen); Prettier und `git diff --check` grün. Kein vollständiger Backend-Testlauf.
