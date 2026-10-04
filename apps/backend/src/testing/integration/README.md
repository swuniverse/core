# Backend-Integrationstests (Postgres)

Tests mit der Endung `*.int-spec.ts` laufen gegen eine echte Postgres-16-Datenbank, auf der alle Migrationen ausgeführt sind. Damit lassen sich Datenbank-Constraints und gleichzeitige Zugriffe prüfen. Das normale `test`-Target führt sie nicht aus und braucht keine Datenbank.

## Ausführen

```bash
# Mit Testcontainers (Docker muss laufen): startet postgres:16-alpine selbst
npx nx run backend:test-integration

# Gegen eine vorhandene, leere Wegwerf-Datenbank
INTEGRATION_DATABASE_URL=postgresql://swuniverse:devpassword@127.0.0.1:5490/swu_integration_test \
  npx nx run backend:test-integration
```

Achtung: Die Suite leert per `TRUNCATE` alle Tabellen der angegebenen Datenbank. Nie auf die Entwicklungs- oder Produktionsdatenbank zeigen lassen.

## Tests schreiben

```ts
import { connectIntegrationDatabase, resetDatabase } from '../../testing/integration/database';

let dataSource: DataSource;
beforeAll(async () => { dataSource = await connectIntegrationDatabase(); });
afterAll(() => dataSource.destroy());
beforeEach(() => resetDatabase(dataSource));
```

- `connectIntegrationDatabase()` verbindet sich und führt ausstehende Migrationen aus.
- `resetDatabase()` leert alle Tabellen außer den von Migrationen befüllten Stammdaten und legt die beiden Fraktionen an.
- Weitere Entities, die ein Test braucht, kommen nach `INTEGRATION_ENTITIES` in `data-source.ts`.
- Die Dateien laufen nacheinander (`maxWorkers: 1`), weil sie sich eine Datenbank teilen.
