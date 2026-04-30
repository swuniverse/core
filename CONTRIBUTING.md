# Contributing to Star Wars Universe

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Start services: `docker compose up db redis -d`
5. Start dev: `npm run dev`

## Development Workflow

- Create a feature branch from `main`
- Make your changes
- Ensure `npx nx run-many --target=build --all` passes
- Submit a PR against `main`

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(colony): add building queue system
fix(combat): correct shield damage calculation
docs: update API documentation
```

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- NestJS patterns for backend (modules, services, controllers)
- React functional components with hooks for frontend

## Architecture

- `apps/backend` — NestJS API + WebSocket server
- `apps/frontend` — React SPA
- `packages/shared` — Shared TypeScript types and DTOs
- `game-data/` — Private submodule with game balancing data

## Need Help?

Open an issue or start a discussion.
