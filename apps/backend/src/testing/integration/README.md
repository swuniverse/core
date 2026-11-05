# Backend-Integrationstests (Postgres)

Die `*.int-spec.ts`-Tests nutzen echtes PostgreSQL 16. Der gemeinsame Anwendungstest-Harness verwendet `public`, führt die echten TypeORM-Migrationen aus und benutzt kein Schema-Synchronisieren. Das normale `test`-Target braucht keine Datenbank.

**Achtung:** Nur eine eigens dafür angelegte, leere Wegwerf-Datenbank verwenden. Tests leeren Tabellen mit `TRUNCATE ... CASCADE`, führen Migrationen aus und erzeugen/löschen Schemas. Niemals eine Entwicklungs- oder Produktionsdatenbank angeben. Einzelne bestehende Tests starten zusätzlich eigene Testcontainers und benötigen Docker auch bei gesetzter URL.

## Seed-Daten

Ohne `SWU_MIGRATION_BUILDING_SEED_PATH` lesen die beiden historischen Gebäudemigrationen unverändert `game-data/data/buildings/stu-buildings.yaml` relativ zum aktuellen Arbeitsverzeichnis. Ein ausdrücklich gesetzter Pfad wird verwendet, nie stillschweigend ersetzt; fehlende oder ungültige Dateien schlagen fehl. Dieser Override ist ausschließlich für Migrationen gedacht, nicht als Anwendungskonfiguration.

Jest Global Setup setzt für die Tests ausdrücklich den absoluten Pfad zur eingecheckten Minimal-Fixture `fixtures/migration-buildings.yaml`, auch wenn vorher ein anderer Wert gesetzt war. Der vorherige Wert (einschließlich nicht gesetzt) wird beim Teardown wiederhergestellt. Die Fixture dient nur als Migrationseingabe für Tests und ersetzt keine produktiven Spieldaten. Für einen manuellen Migrationstest außerhalb dieses Setups kann der absolute Pfad selbst gesetzt werden:

```bash
export SWU_MIGRATION_BUILDING_SEED_PATH="$PWD/apps/backend/src/testing/integration/fixtures/migration-buildings.yaml"
```

## Ausführen

Im sauberen Checkout ab Repository-Root `npm ci` ausführen und Docker starten. Für einen frischen Lauf startet Testcontainers selbst eine leere Postgres-16-Datenbank:

```bash
npx nx run backend:test-integration
```

Für einen verifizierbaren zweiten Lauf auf derselben Wegwerf-Datenbank stattdessen eine neu angelegte leere Datenbank bereitstellen und dieselbe URL zweimal verwenden:

```bash
export INTEGRATION_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:PORT/EMPTY_DISPOSABLE_DATABASE
npx nx run backend:test-integration --skip-nx-cache
npx nx run backend:test-integration --skip-nx-cache
```

Ist Nx nicht verfügbar, direkt aus dem Repository-Root ausführen:

```bash
npx jest --config apps/backend/jest.integration.config.cts --runInBand
npx jest --config apps/backend/jest.integration.config.cts --runInBand
```

## Tests schreiben

`connectIntegrationDatabase()` verbindet sich, führt ausstehende Migrationen aus und stellt beide Standardfraktionen unmittelbar und idempotent bereit. `resetDatabase()` leert Anwendungstabellen, erhält migrationsgefüllte Stammdaten und stellt die Fraktionen erneut sicher. Testdateien laufen wegen des gemeinsamen `public`-Schemas sequenziell (`maxWorkers: 1`).

Migrationstests verwenden stattdessen ein UUID-Schema, ein explizites `search_path`, eine minimale historische Tabellenstruktur und einen eigenen QueryRunner. Schema und Verbindung werden auch bei Fehlern freigegeben; keine Anwendungstestdaten in `public` anfassen. Ein Beispiel ist `src/database/migration-tests/20260625-building-seed-migrations.int-spec.ts`.
