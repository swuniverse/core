# Star Wars Strategy Game - Workspace Instructions

## Project Overview
Full-stack tick-based Star Wars strategy browser game with planet management, galaxy exploration, research, fleet management, and trading. Inspired by Star Trek Universe (STU).

## Tech Stack
- **Backend**: Node.js 20 + TypeScript + Express + PostgreSQL 15 + Prisma + Redis 7 + Socket.io
- **Frontend**: React 18 + TypeScript + Vite 6 + Tailwind CSS + Zustand + Socket.io Client
- **Development**: devenv (Nix-based dev environment)

## Current Implementation Status

### ✅ Completed Features
- **Authentication**: JWT-based login/register with bcrypt
- **Faction System**: Galactic Empire & Rebel Alliance
- **Planet Management**: STU-style 10x10 grid with 3 layers
  - Layer 1 (ORBIT): Rows 0-1, SPACE fields
  - Layer 2 (SURFACE): Rows 2-7, LAND/WATER/MOUNTAIN fields
  - Layer 3 (UNDERGROUND): Rows 8-9, ROCK/CRYSTAL/METAL fields
- **Building System**: 11 building types with real-time construction
  - Basic: Command Center, Solar Plant, Metal Mine, Crystal Harvester, Warehouse, Trade Hub
  - Advanced: Shipyard, Research Lab, Defense Grid, Refinery, Hangar
- **Resource System**: Credits, Metal, Crystal, Energy with production rates
- **Energy Management**: Auto-deactivation when energy balance negative
- **Storage System**: Capacity limits, expandable with Warehouses
- **Galaxy Map**: Multi-level navigation (50x50 sectors in 10x10 regions)
- **Real-time Updates**: Socket.io for building completion, resource updates
- **Settings**: Username/password change

### 🚧 Planned Features
- Building upgrades (levels 2-10)
- Research tree with technologies
- Ship construction in Shipyard
- Fleet management and movement
- Combat system
- Trading system
- Alliances

## Game Mechanics

### Dual Time System
1. **Tick System** (`tickSystem.ts`): Runs every 60 seconds
   - Processes resource production (credits, metal, crystal)
   - Checks energy balance and auto-deactivates buildings
   - NOT used for building completion anymore

2. **Building Completion Service** (`buildingCompletionService.ts`): Runs every 10 seconds
   - Checks constructionStartedAt + buildTime (in MINUTES)
   - Real-time completion detection
   - Emits Socket.io 'building:completed' event

### Planet Layout (STU-Style)
- 10 columns × 10 rows
- 3 distinct layers with visual separation:
  - **ORBIT** (rows 0-1): Space stations, orbital facilities
  - **SURFACE** (rows 2-7): Main buildings on land
  - **UNDERGROUND** (rows 8-9): Mines for resources

### Building System
- `buildTime` in schema is in MINUTES (real-time, not ticks)
- Construction starts on placement, calculates completion via timestamp
- Frontend displays countdown timers in minutes/seconds
- 50% refund on demolish/cancel
- Energy-dependent activation

### Resources & Economy
- **Credits**: Main currency, from Command Center (100/tick) and Trade Hub (50/tick)
- **Metal**: From Metal Mine (30/tick), costs 10 energy
- **Crystal**: From Crystal Harvester (20/tick), costs 15 energy
- **Energy**: From Solar Plant (50 production), consumed by active buildings
- **Storage**: Base 1000, +500 per Warehouse

## Development Guidelines

### Code Organization
- Backend services in `backend/src/services/`
- API routes in `backend/src/routes/`
- Frontend pages in `frontend/src/pages/`
- Shared types should match Prisma schema

### Database Management
- **Quick Reset**: `reset-db` or `npm run db:reset` (from backend/)
- Runs: migrations → seed factions → seed building types → initialize galaxy
- Creates 6 start planets (3 per faction)

### Key Files
- `backend/src/services/tickSystem.ts`: Resource production every 60s
- `backend/src/services/buildingCompletionService.ts`: Building completion every 10s
- `backend/src/services/galaxyService.ts`: Galaxy/planet generation with 3-layer system
- `backend/scripts/reset-and-seed.ts`: All-in-one DB reset script
- `frontend/src/pages/Planet.tsx`: 3-layer grid visualization
- `frontend/src/pages/Galaxy.tsx`: Multi-level map (regions → sectors)

### Socket.io Events
- `building:completed`: Building construction finished
- `resource:updated`: Resources changed (tick processing)
- `energy:depleted`: Energy ran out

### Building Times (Minutes)
- Command Center: 0 (instant, starter)
- Solar Plant, Warehouse: 5
- Metal Mine: 10
- Crystal Harvester, Trade Hub, Defense Grid: 15
- Refinery: 18
- Shipyard: 20
- Research Lab: 25
- Hangar: 12

## Important Notes
- BuildingType.buildTime is in MINUTES, not ticks
- Player table has: metal, crystal, energy, maxEnergy, storageCapacity
- PlanetField has: fieldLayer (ORBIT/SURFACE/UNDERGROUND) and fieldType
- Use TypeScript strict mode
- Follow existing naming conventions (camelCase for variables, PascalCase for components)
- Keep frontend and backend types synchronized with Prisma schema
- **ALL UI texts must be in German** - buttons, labels, messages, tooltips, placeholders, error messages, etc.
- Code (variables, functions, comments) stays in English, but user-facing content is always German
