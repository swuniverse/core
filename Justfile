set dotenv-load := true

# Worktrees share the existing development database unless explicitly overridden.
git_common_dir := `git rev-parse --path-format=absolute --git-common-dir`
export SWU_DEV_POSTGRES_DATA := env('SWU_DEV_POSTGRES_DATA', parent_directory(git_common_dir) / 'infra/postgres-data-dev')

# Show the available local development commands.
default: help

help:
    @just --list

# Start Postgres and Redis in the foreground.
infra:
    docker compose -f docker-compose.dev.yml up

# Start Postgres and Redis in the background.
infra-detached:
    docker compose -f docker-compose.dev.yml up -d

# Stop the local Postgres and Redis containers.
down:
    docker compose -f docker-compose.dev.yml down

# Follow local Postgres and Redis logs.
logs:
    docker compose -f docker-compose.dev.yml logs -f

# Start backend and frontend development servers.
dev:
    npm run dev

# Start only the backend development server.
backend:
    npx nx serve backend

# Start only the frontend development server.
frontend:
    npx nx serve frontend

# Start infrastructure, backend, and frontend in the process-compose UI.
up:
    process-compose --use-uds -f process-compose.yaml up

# Install dependencies, start local infrastructure, and apply pending migrations.
setup:
    npm install
    docker compose -f docker-compose.dev.yml up -d
    npm run typeorm:migrate

# Apply pending TypeORM migrations.
migrate:
    npm run typeorm:migrate

# Revert the latest TypeORM migration.
migrate-revert:
    npm run typeorm:migrate:revert

# Generate a TypeORM migration from schema changes.
migration-generate:
    npm run typeorm:migration:generate

# Create an empty TypeORM migration.
migration-create:
    npm run typeorm:migration:create

# Build all workspace projects.
build:
    npm run build

# Run all workspace tests.
test:
    npm run test

# Run workspace linting.
lint:
    npm run lint

# Run workspace type checks.
typecheck:
    npm run typecheck
