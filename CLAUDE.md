# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Star Wars Universe is a tick-based strategy browser game set in the Star Wars universe. Players can join either the Galactic Empire or Rebel Alliance, colonize planets, manage resources, build structures, research technologies, and engage in fleet combat across a galaxy-wide persistent world.

**Live Game:** https://swuniverse.net

## Development Environment

This project uses **devenv** (Nix-based development environment) to manage all services uniformly.

### Essential Commands

```bash
# Start all services (backend, frontend, database, Redis)
devenv up

# Reset and seed database (run from backend/)
cd backend && npm run db:reset

# Generate admin invite code (run from backend/)
npm run seed:admin

# Access local development
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
# Prisma Studio: http://localhost:5555 (after npm run prisma:studio)
```

**IMPORTANT:** Always use `devenv up` to start services. Do NOT manually start backend/frontend with npm commands. The devenv handles hot-reloading automatically.

### Database Operations

```bash
# From backend/ directory:
npm run db:reset              # Full reset + seed all data
npm run seed:buildings        # Seed building types only
npm run seed:research         # Seed research types only
npm run seed:factions         # Seed faction data only
npm run prisma:studio         # Open Prisma Studio
npm run prisma:migrate        # Run new migrations
```

### Testing Single Features

```bash
# Test specific API endpoints
tsx scripts/test-dashboard-api.ts

# Check research tree consistency
tsx scripts/check-research.ts
```

## Architecture Overview

### Technology Stack
- **Backend:** Node.js 20 + TypeScript + Express + PostgreSQL + Prisma + Redis + Socket.io
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Socket.io Client
- **Development:** devenv (Nix) for unified service management

### Project Structure

```
backend/src/
├── lib/           # Core utilities (prisma, redis, logger)
├── middleware/    # Express middleware (auth, admin, error handling)
├── routes/        # API route handlers
├── services/      # Core game logic services
├── socket/        # Socket.io event handlers
└── types/         # TypeScript type definitions

frontend/src/
├── components/    # React components (including shipyard/)
├── lib/          # Frontend utilities
├── pages/        # Page components
├── stores/       # Zustand state management
└── types/        # Frontend type definitions

backend/scripts/   # Database seeding and maintenance scripts
backend/prisma/    # Database schema and migrations
```

## Core Game Systems

### Dual Time System
The game uses two parallel timing systems:

1. **Tick System** (`tickSystem.ts`): 60-second intervals
   - Processes resource production (credits, metal, crystal)
   - Manages energy balance and building auto-deactivation
   - Handles scheduled game events

2. **Building Completion Service** (`buildingCompletionService.ts`): 10-second intervals
   - Real-time building construction completion
   - Emits Socket.io `building:completed` events
   - Uses timestamps + buildTime (in MINUTES)

### Planet Management System
Planets use a **10x10 grid with 3 distinct layers** (STU-style):

- **ORBIT** (rows 0-1): SPACE fields for orbital stations
- **SURFACE** (rows 2-7): LAND/WATER/MOUNTAIN for main buildings
- **UNDERGROUND** (rows 8-9): ROCK/CRYSTAL/METAL for mining

Key files:
- `backend/src/services/galaxyService.ts` - Galaxy/planet generation
- `frontend/src/pages/Planet.tsx` - 3-layer grid visualization

### Planet Image & Asset System
The planet image system uses STU-style planet assets with optimized size and consistency:

**Size Standards:**
- **Native Size**: 50x50px (no scaling artifacts)
- **Planets.tsx**: Uses `size={50}` for optimal display
- **Other pages**: PlanetSelection (80px, 200px), SystemView (20px) use different sizes as needed

**Asset Organization:**
- **200-series (2xx)**: Primary planet assets for consistent colonizable planet display
- **300-series (3xx)**: Legacy assets (normalized to 200-series for consistency)
- **400-series (4xx)**: Moon assets (reserved for future moon-specific features)

**Colonizable Planet Classes** (all use single 200-series asset for consistency):
- `CLASS_M`: [201] - Erdähnlich (like Coruscant, Naboo)
- `CLASS_O`: [202] - Ozeanisch (like Kamino, Mon Cala)
- `CLASS_L`: [203] - Bewaldet (like Endor, Kashyyyk)
- `CLASS_K`: [211] - Marsähnlich (like Jakku, Geonosis)
- `CLASS_H`: [213] - Wüstenwelt (like Tatooine)
- `CLASS_P`: [215] - Eiswelt (like Hoth)
- `CLASS_P_T`: [216] - Polare Eiswelt (like Orto Plutonia)
- `CLASS_G`: [219] - Tundrawelt (like Rhen Var)
- `CLASS_D`: [231] - Mondähnlich (like Yavin 4's moons)
- `CLASS_Q`: [221] - Dichte Atmosphäre (extreme environment)
- `CLASS_X`: [217] - Vulkanwelt (like Mustafar)

**Key Implementation Files:**
- `frontend/src/components/PlanetImage.tsx` - Planet image component with asset mapping logic
- `frontend/src/pages/Planets.tsx` - Main planet listing (uses 50px size)

### Resource & Energy System
- **Credits:** Main currency (Command Center: 100/tick, Trade Hub: 50/tick)
- **Metal:** From Metal Mines (30/tick, costs 10 energy)
- **Crystal:** From Crystal Harvesters (20/tick, costs 15 energy)
- **Energy:** From Solar Plants (50 production), consumed by active buildings
- **Storage:** Base 1000 capacity, +500 per Warehouse

Buildings auto-deactivate when energy balance becomes negative.

### Building System
- `buildTime` in database schema is in **MINUTES** (not ticks)
- Construction starts on placement, completion calculated via timestamps
- 50% resource refund on demolish/cancel
- Energy-dependent activation status

### Socket.io Events
- `building:completed` - Building construction finished
- `resource:updated` - Resources changed from tick processing
- `energy:depleted` - Energy balance went negative

## Key Service Files

- `backend/src/services/tickSystem.ts` - Main game tick processing (60s)
- `backend/src/services/buildingCompletionService.ts` - Building completion (10s)
- `backend/src/services/galaxyService.ts` - Galaxy/planet generation with 3-layer system
- `backend/scripts/reset-and-seed.ts` - Complete database reset and seeding

## Development Guidelines

### Database Schema
- Use Prisma schema as single source of truth for types
- Keep frontend and backend types synchronized
- Player table includes: metal, crystal, energy, maxEnergy, storageCapacity
- PlanetField has: fieldLayer (ORBIT/SURFACE/UNDERGROUND) and fieldType

### Language Requirements
**ALL UI text must be in German** - buttons, labels, messages, tooltips, error messages, etc. Code (variables, functions, comments) stays in English, but user-facing content is always German.

### Code Organization
- Backend services go in `backend/src/services/`
- API routes go in `backend/src/routes/`
- Frontend pages go in `frontend/src/pages/`
- Shared components go in appropriate component directories

### Common Issues
- BuildingType.buildTime is in MINUTES, not ticks
- Energy system auto-deactivates buildings when negative balance
- Galaxy uses multi-level navigation: 50x50 sectors within 10x10 regions
- Socket.io handles real-time updates for building completion and resource changes