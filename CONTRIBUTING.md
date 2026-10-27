# Contributing to Star Wars Universe

## Prerequisites

- Node.js 22+
- Docker & Docker Compose
- [just](https://github.com/casey/just)
- Git

## Getting Started

```bash
git clone --recurse-submodules https://github.com/swuniverse/core.git
cd core
cp .env.example .env
just setup
just up
```

`just setup` installiert Abhängigkeiten, startet PostgreSQL und Redis im Hintergrund und führt ausstehende Migrationen aus. `just up` startet Infrastruktur, Backend und Frontend im Vordergrund.

Backend: `http://localhost:3001` | Frontend: `http://localhost:5173`

## Project Structure

```
apps/backend/       NestJS API + WebSocket server
apps/frontend/      React + Vite SPA
packages/shared/    Shared TypeScript types and DTOs
game-data/          Private submodule (game balancing data)
```

### Backend Modules

| Module | Purpose |
|--------|---------|
| auth | JWT auth, registration, user profiles |
| colony | Colony management, buildings, resources |
| spacecraft | Ship fleet, navigation, warp |
| starmap | Galaxy layers, star systems, celestial objects |
| combat | Round-based ship combat engine |
| research | Tech tree with prerequisites |
| messaging | Player-to-player messages |
| holonet | Forum posts (News, RP, Trade, Recruitment) |
| alliance | Player alliances: founding, applications, offices, details, diplomacy, member forum, internal chronicle, member overview |
| tick | Scheduled game ticks + building completion |
| websocket | Socket.io gateway for real-time events |

## Commands

```bash
just up               # Start infrastructure, backend, and frontend
just infra-detached   # Start PostgreSQL and Redis in the background
just dev              # Start backend + frontend
just migrate          # Run pending TypeORM migrations
just build            # Build all projects
just lint             # Lint all
just test             # Run tests
just typecheck        # TypeScript check (no emit)
```

## Development Workflow

1. Create feature branch from `main`
2. Make changes
3. Ensure `npx nx run-many --targets=build` passes
4. Submit PR against `main`

## Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) — `feat(colony): add building queue`
- **Language**: Code and commits in English
- **Types**: Shared DTOs/interfaces go in `packages/shared`
- **Backend**: NestJS modules (entity → service → controller → module)
- **Frontend**: React functional components + Zustand stores

## Adding a New Module

1. `mkdir apps/backend/src/modules/<name>/entities/`
2. Create entity, service, controller, module files
3. Register in `app.module.ts` (add to imports + entities array)
4. Create frontend page at `apps/frontend/src/pages/<name>.tsx`
5. Add route in `apps/frontend/src/app/app.tsx`
6. Add nav item in `apps/frontend/src/components/layout/sidebar.tsx`

## Docker

```bash
just infra-detached                                  # lokale Datenbank und Redis
just down                                            # lokale Infrastruktur stoppen
docker compose -f docker-compose.prod.yml up -d      # Production
```

## License

MIT
