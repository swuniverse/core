# Star Wars Universe

A tick-based strategy browser game set in the Star Wars universe, inspired by [Star Trek Universe](https://stuniverse.de).

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + Zustand
- **Backend:** NestJS + TypeORM + PostgreSQL + Redis
- **Realtime:** Socket.io WebSockets
- **Monorepo:** NX
- **Deploy:** Docker Compose + Caddy

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- (Optional) Nix for reproducible dev environment

### Development

```bash
# Start database & Redis
docker compose up db redis -d

# Install dependencies
npm install

# Start backend + frontend
npm run dev
```

Backend: http://localhost:3001/api
Frontend: http://localhost:5173

### Using Nix

```bash
nix develop
docker compose up db redis -d
npm run dev
```

### Environment

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

## Project Structure

```
apps/
  backend/       NestJS API server
  frontend/      React SPA
packages/
  shared/        Shared types, DTOs, constants
game-data/       Game balancing data (Git submodule, private)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
