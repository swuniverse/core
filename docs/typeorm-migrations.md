# TypeORM Migration Setup

## Ziel

Saubere, reproduzierbare DB-Schema-Änderungen statt impliziter Dev-Synchronisation.

## Neu angelegt

- `apps/backend/src/database/typeorm-migration.config.ts`
- `apps/backend/src/database/migrations/20260506130000-add-admin-and-starmap-world-model.ts`

## Enthaltene erste Migration

Diese Migration zieht nach:

- `users.isAdmin`
- `galaxy_field_types`
- `galaxy_fields`
- `system_fields`
- Indizes und Foreign Keys für neue Starmap-Tabellen

## Scripts

Im Root-`package.json`:

```bash
npm run typeorm:migrate
npm run typeorm:migrate:revert
npm run typeorm:migration:generate
npm run typeorm:migration:create
```

## Ausführen

Wichtig:

- `DATABASE_URL` muss gesetzt sein
- CLI nutzt `TS_NODE_PROJECT=apps/backend/tsconfig.app.json`, damit Decorators und Backend-TS-Setup korrekt geladen werden

### Docker Compose lokal

Lokaler Default in `docker-compose.yml`:

- DB-Port auf Host: `5490`
- separater Override-Compose-File: `docker-compose.migrate.yml`
- Tool-Service darin: `migrate`
- DB-Service-Name im Compose-Netz: `db`

Empfohlener Weg lokal mit Docker Compose:

```bash
npm run docker:typeorm:migrate
```

Direkter Rohbefehl dahinter:

```bash
docker compose -f docker-compose.yml -f docker-compose.migrate.yml run --rm migrate
```

Warum dieser Weg besser ist:

- eigener Tool-Container statt abgespecktem Runtime-Backend
- Repo wird nach `/workspace` gemountet
- Source-Dateien für DataSource und Migrationen sind vorhanden
- Hostname `db` funktioniert im Compose-Netz direkt

Wichtig:

- DB-Container muss laufen
- falls nicht, zuerst `docker compose up -d db`
- erster Lauf kann etwas dauern, weil im Tool-Container `npm ci` läuft

### Direkt auf Host

Nur sinnvoll, wenn `DATABASE_URL` vom Host aus erreichbar ist.

Beispiel lokal gegen Compose-Postgres-Port:

```bash
export DATABASE_URL=postgres://swuniverse:password@localhost:5490/swuniverse
npm run typeorm:migrate
```

Oder mit vorhandener `.env`, wenn dort host-taugliche `DATABASE_URL` steht:

```bash
npm run typeorm:migrate
```

## Revert

Direkt:

```bash
npm run typeorm:migrate:revert
```

Mit Docker Compose:

```bash
npm run docker:typeorm:migrate:revert
```

Direkter Rohbefehl dahinter:

```bash
docker compose -f docker-compose.yml -f docker-compose.migrate.yml run --rm migrate sh -lc "npm ci --ignore-scripts && npm run typeorm:migrate:revert"
```

Nur in Dev/Test nutzen.

## Neue Migration erzeugen

### Automatisch generieren

```bash
npm run typeorm:migration:generate -- -n add-something
```

### Leere Migration anlegen

```bash
npm run typeorm:migration:create
```

## Synchronize-Verhalten

`AppModule` nutzt jetzt nicht mehr implizit `NODE_ENV`, sondern explizit:

- `TYPEORM_SYNCHRONIZE=true` → Schema-Sync aktiv
- sonst → Schema-Sync aus

Empfehlung:

- Standard immer `false`
- Schema nur noch über Migrationen ändern

In diesem Projekt ist `.env.example` bereits auf `false` gesetzt.
Auch `docker-compose.yml` und `docker-compose.prod.yml` reichen standardmäßig `false` durch.

Nur für Ausnahmefälle in lokaler Entwicklung kurz aktivieren:

```bash
TYPEORM_SYNCHRONIZE=true npm run dev
```

Oder mit Docker Compose in `.env` setzen.

Danach wieder zurück auf `false`.

## Wichtiger Hinweis

Falls DB bereits manuell verändert wurde, kann erste Migration teils auf schon vorhandene Tabellen/Spalten treffen.

Darum ist diese erste Migration defensiv gebaut mit:

- `IF NOT EXISTS`
- `DROP ... IF EXISTS`
- FK-Anlage mit toleranter Fehlerbehandlung

Das erleichtert Übergang von manuell gepflegten Dev-Datenbanken.
