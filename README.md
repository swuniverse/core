# Star Wars Universe - Strategy Browser Game

Ein Tick-basiertes Strategie-Browsergame im Star Wars Universum, inspiriert von Star Trek Universe (STU) https://stuniverse.de.

## 🌟 Features

### Implementiert ✅
- **Authentifizierung**: Registrierung mit Invite-Codes, Login mit JWT
- **Fraktionssystem**: Galactic Empire & Rebel Alliance
- **Ressourcensystem**: 8 Ressourcentypen
  - Credits (Hauptwährung)
  - Durastahl (Metall für Konstruktionen)
  - Kristall (Kristallines Silizium für Elektronik)
  - Energie (Strom für Gebäude)
  - Nahrung (Bevölkerungsversorgung)
  - Forschungspunkte (für Technologien)
  - Vorräte (Flottenversorgung)
  - Fertigwaren (Handel)
- **Planetenverwaltung**: STU-style 10x10 Grid mit 3 Layern
  - 2 Zeilen ORBIT (Space-Felder für Raumstationen)
  - 6 Zeilen SURFACE (Land/Water/Mountain für Gebäude)
  - 2 Zeilen UNDERGROUND (Rock/Crystal/Metal für Minen)
- **Gebäudesystem**: 11 Gebäudetypen mit Echtzeit-Bau
  - Ressourcengebäude (Solar Plant, Metal Mine, Crystal Harvester)
  - Produktionsgebäude (Command Center, Refinery, Trade Hub)
  - Fortgeschrittene Gebäude (Shipyard, Research Lab, Defense Grid)
  - Lagergebäude (Warehouse, Hangar)
  - Build-Menü mit 5 Kategorien (Infrastruktur, Ressourcen, Produktion, Militär, Forschung)
- **Forschungssystem**: 36 Technologien über 4 Level
  - 4 Kategorien: Militär, Wirtschaft, Energie, Wissenschaft
  - Level 0: Ressourcen-basiert (keine Labs erforderlich)
  - Level 1-3: Forschungspunkte-basiert (mit Research Labs)
  - Prerequisite-System für Technologie-Abhängigkeiten
  - Freischaltung von Gebäuden und Schiffen
- **Schiffbau-System**: 14 Schiffstypen
  - 7 Klassen: Fighter, Bomber, Frigate, Cruiser, Battlecruiser, Battleship, Dreadnought
  - Ressourcenkosten und Bauzeit pro Schiffstyp
  - Bauqueue in Shipyard mit Fortschrittsanzeige
  - Socket.io Updates bei Fertigstellung
  - TIE Fighter bis Mon Calamari Kreuzer
- **Echtzeit-Updates**: Socket.io für live Updates
  - Gebäude-Fertigstellung
  - Ressourcen-Updates
  - Forschungs-Fortschritt
  - Schiffsbau-Fortschritt
- **Energiesystem**: Automatische Deaktivierung bei Energiemangel
- **Speicherkapazität**: Ressourcenlimit mit Warehouse-Erweiterung
- **Galaxiekarte**: STU-style Navigation mit System-Hierarchie
  - 6x6 Sektoren (36 total)
  - 20x20 Felder pro Sektor (120x120 Galaxy)
  - System-Layer zwischen Sektor und Planet
  - ~450 Systeme mit ~1360 Planeten
  - Systemtypen: SINGLE_STAR (90%), BINARY_STAR (8%), NEUTRON_STAR (1.5%), BLACK_HOLE (0.5%)
  - Orbitale Planeten-Visualisierung im System
- **Tick-System**: Alle 60 Sekunden für Ressourcenproduktion
- **Background Services**: 
  - Building Completion (10s Check)
  - Research Progress (10s Check)
  - Ship Building (10s Check)
- **Settings**: Username/Password ändern, Invite-Codes generieren

### Geplant 🚧
- Gebäude-Upgrades (Level 2-10)
- Flottenverwaltung & Bewegung
- Kampfsystem
- Handelssystem
- Allianzen mit Rollen & Permissions

## 🛠 Tech Stack

### Backend
- Node.js + TypeScript
- Express.js (REST API)
- PostgreSQL (Datenbank)
- Prisma ORM
- Redis (Caching & Tick-System)
- Socket.io (Echtzeit-Updates)
- JWT Authentication

### Frontend
- React + TypeScript
- Vite (Build-Tool)
- Tailwind CSS
- Zustand (State Management)
- React Router
- Socket.io Client
- Axios

## 📋 Voraussetzungen

- [devenv](https://devenv.sh/) - Entwicklungsumgebung (empfohlen)
- Oder manuell: Node.js 20+, PostgreSQL 15+, Redis 7+

## 🚀 Quick Start (mit devenv)

### 1. Repository klonen

```bash
git clone <repository-url>
cd swu
```

### 2. Entwicklungsumgebung starten

```bash
# Erste Installation
devenv up

# In neuem Terminal: Setup ausführen
setup

# Oder manuell:
cd backend
npm install
cd ../frontend
npm install
```

### 3. Datenbank initialisieren

```bash
# Alle Migrationen, Seeding und Galaxy-Initialisierung in einem Befehl
reset-db

# Oder aus dem Backend-Verzeichnis:
npm run db:reset
```

### 4. Services starten

```bash
devenv up
```

Das Spiel läuft dann auf:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 🔧 Verfügbare Kommandos

### devenv Shortcuts
```bash
devenv up        # Startet alle Services (backend, frontend, postgres, redis)
setup            # Initial setup (install deps, migrate, seed)
migrate          # Datenbank-Migrationen ausführen
studio           # Prisma Studio öffnen
reset-db         # Komplettes DB-Reset mit Seeding
```

### Backend (npm scripts)
```bash
npm run dev              # Entwicklungsserver mit Hot-Reload
npm run build            # TypeScript kompilieren
npm start                # Produktionsserver
npm run prisma:generate  # Prisma Client generieren
npm run prisma:migrate   # Migration erstellen
npm run prisma:studio    # Datenbank-GUI öffnen
npm run db:reset         # Komplettes DB-Reset mit Seeding
```

### Frontend (npm scripts)
```bash
npm run dev      # Entwicklungsserver
npm run build    # Production-Build
npm run preview  # Build-Preview
npm run lint     # Linting
```

## 📁 Projektstruktur

```
swu/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Datenbank-Schema
│   │   ├── migrations/                # Migrationshistorie
│   │   └── schema.prisma              # Prisma Schema (gelöscht: seed.sql - nur noch TS Scripts)
│   ├── scripts/
│   │   ├── reset-and-seed.ts          # Komplettes DB-Reset Script
│   │   ├── seed-factions.ts           # Fraktionen seeden
│   │   └── seed-building-types.ts     # Gebäudetypen seeden
│   ├── src/
│   │   ├── index.ts                   # Server-Einstiegspunkt
│   │   ├── routes/                    # API-Routen
│   │   ├── services/
│   │   │   ├── tickSystem.ts          # Tick-Mechanik (Ressourcen/Energy)
│   │   │   ├── buildingCompletionService.ts  # Echtzeit-Gebäudefertigstellung
│   │   │   ├── planetService.ts       # Planetenverwaltung
│   │   │   ├── galaxyService.ts       # Galaxy & Startplaneten
│   │   │   └── authService.ts         # Authentifizierung
│   │   ├── middleware/                # Express-Middleware
│   │   ├── socket/                    # Socket.io Handler
│   │   └── lib/                       # Utilities
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                   # App-Einstiegspunkt
│   │   ├── App.tsx                    # Haupt-Komponente mit Routing
│   │   ├── pages/
│   │   │   ├── Login.tsx              # Login/Register mit Invite-Code
│   │   │   ├── PlanetSelection.tsx    # Startplanet wählen
│   │   │   ├── Dashboard.tsx          # Hauptübersicht mit Tick-Timer
│   │   │   ├── Planet.tsx             # Planetenansicht (3-Layer-Grid)
│   │   │   ├── Galaxy.tsx             # Galaxy & Sector Navigation
│   │   │   ├── SystemView.tsx         # Orbitale System-Visualisierung
│   │   │   ├── Research.tsx           # Forschungsbaum
│   │   │   ├── InviteCodes.tsx        # Invite-Code-Verwaltung
│   │   │   └── Settings.tsx           # Username/Password ändern
│   │   ├── components/
│   │   │   ├── BuildMenu.tsx          # Gebäudebau-Modal mit Kategorien-Tabs
│   │   │   ├── Layout.tsx             # Layout mit Navigation
│   │   │   └── ProtectedRoute.tsx     # Auth-Guard
│   │   ├── stores/
│   │   │   └── gameStore.ts           # Zustand State Management
│   │   └── lib/
│   │       └── api.ts                 # Axios API-Client
│   └── package.json
│
├── devenv.nix                          # Devenv-Konfiguration
└── README.md
```

## 🎮 Spielmechaniken

### Duales Zeitsystem
- **Tick-System**: Alle 60 Sekunden (konfigurierbar)
  - Verarbeitet Ressourcenproduktion
  - Energiebalance-Prüfung und Auto-Deaktivierung
- **Building Completion Service**: Alle 10 Sekunden
  - Prüft auf fertige Gebäude (Echtzeit-basiert)
  - Socket.io Notifications bei Fertigstellung

### Planeten (STU-Style)
- **3-Layer-System** (10x10 Grid):
  - **ORBIT** (Zeilen 0-1): Space-Felder für Raumstationen/Werften
  - **SURFACE** (Zeilen 2-7): Land/Water/Mountain für Hauptgebäude
  - **UNDERGROUND** (Zeilen 8-9): Rock/Crystal/Metal für Ressourcenminen
- Verschiedene Planetentypen: Desert, Ice, Jungle, Volcanic, Terran
- Echtzeit-Baufortschritt mit Live-Countdown

### Gebäudesystem
**Basic Buildings:**
- Command Center: +100 Credits/Tick (Starter)
- Solar Plant: +50 Energy (5 Min Bauzeit)
- Metal Mine: +30 Metal/Tick (10 Min)
- Crystal Harvester: +20 Crystal/Tick (15 Min)
- Warehouse: +500 Storage (5 Min)
- Trade Hub: +50 Credits/Tick (15 Min)

**Advanced Buildings:**
- Shipyard: Schiffsbau (20 Min, 800 Credits, 400 Metal, 200 Crystal)
- Research Lab: Forschung (25 Min, 1000 Credits, 300 Metal, 500 Crystal)
- Defense Grid: Planetenverteidigung (15 Min, 600 Credits, 500 Metal)
- Refinery: +15 Metal, +10 Crystal/Tick (18 Min)
- Hangar: Flottenkapazität (12 Min)

### Ressourcensystem
- **Credits**: Hauptwährung, generiert durch Command Center & Trade Hub
- **Metal**: Für Gebäude & Schiffe, generiert durch Metal Mines
- **Crystal**: Für fortgeschrittene Technologie, durch Crystal Harvester
- **Energy**: Benötigt für aktive Gebäude, generiert durch Solar Plants
- **Storage**: Begrenztes Lager, erweiterbar durch Warehouses

### Galaxie (STU-Inspired)
- **6x6 Sektoren** (36 total) mit **120x120 Galaxie-Koordinaten**
- Jeder Sektor: **20x20 Felder** mit 8-16 Systemen
- **System-Hierarchie**: Galaxy → Sector → System → Planet
- **~450 Systeme** mit **~1360 Planeten** insgesamt
- **Systemtypen**:
  - SINGLE_STAR: 90% (gelbe Sonne)
  - BINARY_STAR: 8% (Doppelsternsystem)
  - NEUTRON_STAR: 1.5% (Pulsar)
  - BLACK_HOLE: 0.5% (Schwarzes Loch)
- **Navigation**: Galaxy View → Sector View (20x20 Systems) → System View (Orbitale Planeten) → Planet View
- **SystemView**: Zentraler Stern mit Planeten auf Orbits (orbitRadius 2-6, orbitAngle 0-359°)
- Fraktions-Färbung (Empire/Rebels/Uncolonized)

## 🔧 Entwicklung

### Debugging & Tools
```bash
# Prisma Studio - Datenbank GUI
studio

# Komplettes DB-Reset (Migrationen + Seeding + Galaxy-Init)
reset-db

# Nur Migrationen
migrate

# Backend-Logs ansehen (während devenv up läuft)
# Separate Terminal mit devenv shell öffnen
```

### Häufige Entwicklungs-Tasks

**Neue Migration erstellen:**
```bash
cd backend
npx prisma migrate dev --name beschreibung_der_aenderung
```

**Prisma Client neu generieren (nach Schema-Änderungen):**
```bash
cd backend
npx prisma generate
```

**Datenbank komplett zurücksetzen:**
```bash
reset-db  # oder: cd backend && npm run db:reset
```

### Architektur-Notizen

**Duales Zeitsystem:**
- `tickSystem.ts` läuft alle 60s für Ressourcen & Energie
- `buildingCompletionService.ts` läuft alle 10s für Gebäudefertigstellung
- Grund: Bessere UX mit Echtzeit-Feedback für Gebäude

**Socket.io Events:**
- `building:completed` - Gebäude fertiggestellt
- `resource:updated` - Ressourcen aktualisiert (pro Tick)
- `energy:depleted` - Energie aufgebraucht

**Frontend State Management:**
- Zustand Store für User, Player, Planeten
- Socket.io Connection im Store
- Auto-Reconnect bei Verbindungsverlust

## � Umgebungsvariablen

### Backend (.env)

```env
NODE_ENV=development
PORT=3000

# Database (automatically managed by devenv)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/swu_game?schema=public"

# Redis (automatically managed by devenv)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Game Settings
TICK_INTERVAL=60000  # 60 Sekunden (1 Minute) in Millisekunden
```

## 🗄 Datenbank-Schema

### Hauptmodelle
- **User & Player**: JWT-Auth, Invite-System, Spielerprofil mit Ressourcen
- **Faction**: Empire & Rebel Alliance
- **Galaxy, Sector, System, Planet**: Hierarchische Struktur
  - 6x6 Sektoren (36 total)
  - 8-16 Systeme pro Sektor (~450 gesamt)
  - 1-5 Planeten pro System (~1360 gesamt)
  - Planeten mit orbitRadius und orbitAngle
- **PlanetField**: 10x10 Grid mit 3 Layers (ORBIT/SURFACE/UNDERGROUND)
- **BuildingType & Building**: 11 Gebäudetypen mit Echtzeit-Baufortschritt
- **ResearchType & PlayerResearch**: 
  - Level 0: Ressourcen-basierte Forschung (requiredMetalTotal, etc.)
  - Level 1+: FP-basierte Forschung mit Prerequisites
  - Freischaltung von Gebäuden
- **Fleet, Ship, ShipType**: Flottensystem (Schema vorhanden, UI TODO)
- **InviteCode**: Invite-basierte Registrierung mit Creator-Tracking

### Besonderheiten
- **System**: Zwischen Sector und Planet, mit systemType (SINGLE_STAR, BINARY_STAR, etc.)
- **Planet**: Hat systemId statt direktem sectorId, mit Orbit-Parametern
- **fieldLayer**: ORBIT, SURFACE, UNDERGROUND
- **fieldType**: SPACE (orbit), LAND/WATER/MOUNTAIN (surface), ROCK/CRYSTAL/METAL (underground)
- **constructionStartedAt**: Timestamp für Echtzeit-Baufortschritt
- **storageCapacity**: Ressourcenlimit, erweiterbar mit Warehouse
- **ResearchType**: requiredXTotal Felder für tick-basierte Level 0 Forschung

## 🚧 Entwicklungsstand & Roadmap

### ✅ Phase 1-12 Abgeschlossen
- [x] Backend-Setup mit Express, Prisma, Redis, Socket.io
- [x] Frontend-Setup mit React, Vite, Tailwind, Zustand
- [x] JWT-Authentifizierung mit Invite-Code-System
- [x] Fraktionswahl (Empire/Rebels)
- [x] Startplanet-Auswahl
- [x] STU-style Planeten-Grid (3 Layer: Orbit/Surface/Underground)
- [x] Gebäudesystem mit 11 Typen und kategorisiertem Build-Menü
- [x] Echtzeit-Baufortschritt mit Live-Timers
- [x] Ressourcenproduktion (Credits, Metal, Crystal)
- [x] Energiesystem mit Auto-Deaktivierung
- [x] Speicherkapazität mit Warehouse
- [x] Abriss/Cancel mit 50% Refund
- [x] STU-style Galaxiekarte mit System-Hierarchie
- [x] System-Visualisierung mit orbitalen Planeten
- [x] Forschungssystem (Level 0: Ressourcen, Level 1+: FP)
- [x] Gebäude-Freischaltung durch Forschung
- [x] Socket.io Echtzeit-Updates
- [x] Settings-Seite mit Invite-Code-Generator
- [x] Komplettes DB-Reset Script
- [x] Server lauscht auf allen Netzwerk-Interfaces (0.0.0.0)

### 🚧 Nächste Schritte
- [ ] Gebäude-Upgrades (Level 2-10)
- [ ] Erweiterte Forschungen (Level 1-3)
- [ ] Schiffsbau im Shipyard
- [ ] Flottenverwaltung UI
- [ ] Flottenbewegung zwischen Systemen
- [ ] Kampfsystem
- [ ] Handelssystem
- [ ] Allianzen
- [ ] Orbit-Gebäude (Raumstationen)
- [ ] Underground-Minen für spezielle Felder

## 📝 Lizenz

MIT

## 👥 Autor

Entwickelt mit ❤️ für Star Wars Fans
