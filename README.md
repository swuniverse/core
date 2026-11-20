# Star Wars Universe

Star Wars Universe ist ein tickbasiertes Browser-Strategiespiel im Star-Wars-Setting, inspiriert von [Star Trek Universe](https://stuniverse.de). Dieses Repository enthält den aktuellen Nx-Monorepo-Stand für API, Web-Client und gemeinsame Typen.

## Aktueller Stand

Der Workspace deckt bereits die zentralen Spielsysteme und Verwaltungsoberflächen ab:

- **Authentifizierung** — offene Registrierung mit E-Mail-Verifizierung, Login, Token-Refresh und Profilabruf
- **Onboarding & Fraktionswahl** — Fraktion wählen, Startsektoren/Systeme/Planeten durchsuchen und Heimatwelt beanspruchen
- **Kolonien** — 7x7-Felder, Gebäude, Terraforming, Aktivierung/Deaktivierung, Lager, Crew, Fabrication, Reparaturen, Bau-/Retrofit-Warteschlangen und Orbit-Befehle
- **Kolonisierung** — Kolonieschiffe prüfen Ziele und gründen neue Kolonien direkt aus der Schiffsansicht
- **Raumfahrzeuge** — Flotten, Navigation im System und auf der Galaxiekarte, Warp, Reaktorverteilung, Laufzeitsysteme, Module, Torpedos und Frachttransfer
- **Scans & Karten** — Sternenkarte, lokale Schiffskarte, Oberflächen- und Koloniescans sowie Admin-Fullmap-Editor
- **Kampf & Verteidigung** — Kampfsystem, Schilde, Orbit-Verteidigung/Blockade und torpedobasierte Kolonieverteidigung
- **Forschung & Freischaltungen** — Forschungsübersicht, Forschungsbaum und Unlock-abhängige Inhalte
- **Community & Spielerprofile** — Nachrichten, HoloNet, öffentliche Datenbank, Rankings, Spielerprofile, persönliche Notizen und Kontoeinstellungen
- **Administration** — Admin-Dashboard, Benutzerrechte und Schiffs-Spawn-Werkzeuge

## Laufzeitarchitektur

- **Monorepo:** Nx Workspace mit `apps/*` und `packages/*`
- **Frontend:** React 19 + Vite + React Router + Zustand + Tailwind CSS
- **Backend:** NestJS 11 + TypeORM
- **Datenhaltung:** PostgreSQL 16
- **Caching/Queues/State:** Redis 7
- **Realtime:** Socket.io Gateway (`/game`) für Tick-, Kampf- und Spielstatus-Updates
- **Gemeinsame Typen:** `packages/shared`

## Lokales Setup

### Voraussetzungen

- Node.js 22+
- Docker & Docker Compose
- [just](https://github.com/casey/just)
- [process-compose](https://f1bonacc1.github.io/process-compose/installation/) (z. B. `brew install f1bonacc1/tap/process-compose` auf macOS)
- Git

### Repository klonen

Das Repository verwendet ein `game-data`-Submodule.

```bash
git clone --recurse-submodules https://github.com/swuniverse/core.git
cd core
```

Wenn das Repository schon ohne Submodule geklont wurde:

```bash
git submodule update --init --recursive
```

### Entwicklungsumgebung starten

```bash
cp .env.example .env
just setup
just up
```

`just setup` installiert Abhängigkeiten, startet PostgreSQL und Redis im Hintergrund und führt ausstehende Migrationen aus. `just up` startet anschließend Infrastruktur, Backend und Frontend in der process-compose-Oberfläche. Dort lassen sich die Prozesse auswählen, ihre Logs getrennt ansehen und Prozesse neu starten. Mit Ctrl-C oder F10 wird die Umgebung beendet; die Daten bleiben im lokalen Volume erhalten. Backend und Frontend werden weiterhin über Nx gestartet.

Backend und Frontend starten erst, wenn PostgreSQL und Redis bereit sind. Sind sie nach etwa zehn Minuten noch nicht bereit, markiert process-compose die Infrastruktur als fehlgeschlagen.

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:3001>
- PostgreSQL: `127.0.0.1:5490`
- Redis: `127.0.0.1:6379`

### Häufige Entwicklungsbefehle

```bash
just infra-detached  # PostgreSQL und Redis im Hintergrund starten
just dev             # Backend und Frontend starten
just down            # lokale Infrastruktur stoppen
just logs            # Infrastruktur-Logs verfolgen
just migrate         # ausstehende Migrationen ausführen
just migrate-revert  # letzte Migration zurücknehmen
```

## Umgebungsvariablen

Ausgangspunkt ist `.env.example`:

```bash
cp .env.example .env
```

Wichtige Variablen:

- `NODE_ENV=development` — lokale Laufzeitumgebung
- `DATABASE_URL` — lokale PostgreSQL-Verbindung
- `REDIS_URL` — Redis-Verbindung
- `JWT_SECRET` — Signaturschlüssel für Auth/JWT
- `GAME_DATA_PATH` — Pfad zum `game-data`-Submodul
- `TYPEORM_SYNCHRONIZE=false` — empfohlen; Schemaänderungen per Migration
- `GAME_MAIN_TICK_SCHEDULE_HOURS` / `GAME_BUILD_TIME_MULTIPLIER` — optionale Test-/Tick-Anpassungen
- SMTP-Variablen — optional für Mailversand

Für migrationsbasierte Schemaänderungen stehen u. a. diese Befehle bereit:

```bash
just migrate
just migrate-revert
just migration-generate
npm run docker:typeorm:migrate
```

## Qualitätschecks

```bash
just build      # alle Apps/Packages bauen
just lint       # Linting im gesamten Workspace
just test       # Jest/Vitest-Suites ausführen
just typecheck  # TypeScript-Prüfung ohne Emit
```

Backend-Integrationstests gegen echtes Postgres 16 (Docker oder `INTEGRATION_DATABASE_URL`) laufen separat mit `npx nx run backend:test-integration`, siehe `apps/backend/src/testing/integration/README.md`.

## Projektstruktur

```text
apps/
  backend/       NestJS API inkl. Tick- und WebSocket-Server
  frontend/      React/Vite SPA mit Spiel-, Admin- und Datenbankseiten
packages/
  shared/        Gemeinsame TypeScript-Typen, DTOs und Konstanten
game-data/       Spiel- und Balancingdaten (Git-Submodule)
docs/            Projektdokumentation
infra/           Lokale Persistenzdaten und Infrastrukturdateien
```

## Mitwirken

Weitere Konventionen und Workflows stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

MIT
