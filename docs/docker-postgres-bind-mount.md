# PostgreSQL dev von Docker Volume auf lokales Verzeichnis umziehen

Ziel: nur lokale/dev PostgreSQL-Daten nicht mehr im Docker named volume, sondern im Repo unter `infra/` als Bind-Mount speichern.

## Aktueller Stand

- `docker-compose.yml` → `./infra/postgres-data`
- `docker-compose.dev.yml` → `./infra/postgres-data-dev`
- `docker-compose.prod.yml` bleibt auf Docker volume `postgres_data`

## Migration bestehender Dev-Daten

### Default local (`core_postgres_data` → `infra/postgres-data`)

```bash
docker compose down
mkdir -p infra/postgres-data
rm -rf infra/postgres-data/*
docker run --rm \
  -v core_postgres_data:/from \
  -v "$PWD/infra/postgres-data":/to \
  alpine sh -lc 'cp -a /from/. /to/'
```

### Dev compose (`core_postgres_dev_data` → `infra/postgres-data-dev`)

```bash
docker compose -f docker-compose.dev.yml down
mkdir -p infra/postgres-data-dev
rm -rf infra/postgres-data-dev/*
docker run --rm \
  -v core_postgres_dev_data:/from \
  -v "$PWD/infra/postgres-data-dev":/to \
  alpine sh -lc 'cp -a /from/. /to/'
```

## Start danach

```bash
docker compose up -d db
# oder
docker compose -f docker-compose.dev.yml up -d db
```

## Prüfen

```bash
docker compose exec db psql -U swuniverse -d swuniverse -c '\l'
docker compose -f docker-compose.dev.yml exec db psql -U swuniverse -d swuniverse -c '\l'
du -sh infra/postgres-data infra/postgres-data-dev 2>/dev/null
```

## Alte Dev-Volumes erst nach Prüfung löschen

```bash
docker volume rm core_postgres_data core_postgres_dev_data
```

Nur löschen, wenn lokale/dev DB sauber startet und Daten da sind.

## Wichtig

- Production unverändert auf named volume.
- Host-Pfad muss beschreibbar sein.
- PostgreSQL-Dateien enthalten Ownership `70:70` aus Container. `cp -a` behält das.
- `infra/postgres-data*` nicht ins Git committen.
