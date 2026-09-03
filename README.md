# Star Wars Universe

Star Wars Universe ist ein tickbasiertes Browser-Strategiespiel im Star-Wars-Setting, inspiriert von [Star Trek Universe](https://stuniverse.de). Dieses Repository enthält den aktuellen Nx-Monorepo-Stand für API, Web-Client und gemeinsame Typen.

## Aktueller Stand

Der Workspace deckt bereits die zentralen Spielsysteme und Verwaltungsoberflächen ab:

- **Authentifizierung & Einladungen** — Registrierung, Login, Token-Refresh, Profilabruf sowie Spieler- und Admin-Invite-Flows
- **Onboarding & Fraktionswahl** — Fraktion wählen, Startsektoren/Systeme/Planeten durchsuchen und Heimatwelt beanspruchen
- **Kolonien** — 7x7-Felder, Gebäude, Terraforming, Aktivierung/Deaktivierung, Lager, Crew, Fabrication, Reparaturen, Bau-/Retrofit-Warteschlangen und Orbit-Befehle
- **Kolonisierung** — Kolonieschiffe prüfen Ziele und gründen neue Kolonien direkt aus der Schiffsansicht
- **Raumfahrzeuge** — Flotten, Navigation im System und auf der Galaxiekarte, Warp, Reaktorverteilung, Laufzeitsysteme, Module, Torpedos und Frachttransfer
- **Scans & Karten** — Sternenkarte, lokale Schiffskarte, Oberflächen- und Koloniescans sowie Admin-Fullmap-Editor
- **Kampf & Verteidigung** — Kampfsystem, Schilde, Orbit-Verteidigung/Blockade und torpedobasierte Kolonieverteidigung
- **Forschung & Freischaltungen** — Forschungsübersicht, Forschungsbaum und Unlock-abhängige Inhalte
- **Community & Spielerprofile** — Nachrichten, HoloNet, öffentliche Datenbank, Rankings, Spielerprofile, persönliche Notizen und Kontoeinstellungen
- **Administration** — Admin-Dashboard, Benutzerrechte, Invite-Verwaltung und Schiffs-Spawn-Werkzeuge

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
- Git
- optional: Nix (`nix develop`) für reproduzierbare Dev-Shells

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
npm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npm run typeorm:migrate
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:3001>
- PostgreSQL: `127.0.0.1:5490`
- Redis: `127.0.0.1:6379`

### Alternative mit Nix

```bash
nix develop
npm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npm run typeorm:migrate
npm run dev
```

## Umgebungsvariablen

Ausgangspunkt ist `.env.example`:

```bash
cp .env.example .env
```

Wichtige Variablen:

- `DATABASE_URL` — lokale PostgreSQL-Verbindung
- `REDIS_URL` — Redis-Verbindung
- `JWT_SECRET` — Signaturschlüssel für Auth/JWT
- `GAME_DATA_PATH` — Pfad zum `game-data`-Submodul
- `TYPEORM_SYNCHRONIZE=false` — empfohlen; Schemaänderungen per Migration
- `GAME_MAIN_TICK_SCHEDULE_HOURS` / `GAME_BUILD_TIME_MULTIPLIER` — optionale Test-/Tick-Anpassungen
- SMTP-Variablen — optional für Mailversand

Für migrationsbasierte Schemaänderungen stehen u. a. diese Befehle bereit:

```bash
npm run typeorm:migrate
npm run typeorm:migrate:revert
npm run typeorm:migration:generate
npm run docker:typeorm:migrate
```

## Qualitätschecks

```bash
npm run build      # alle Apps/Packages bauen
npm run lint       # Linting im gesamten Workspace
npm run test       # Jest/Vitest-Suites ausführen
npm run typecheck  # TypeScript-Prüfung ohne Emit
```

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
