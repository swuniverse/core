# Star Wars - HoloNet

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Ein tick-basiertes Strategie-Browserspiel im Star Wars Universum, inspiriert von [Star Trek Universe (STU)](https://stuniverse.de).

🌐 **Live:** https://swholo.net

## 🌟 Features

### ✅ Implementiert
- **Authentifizierung**: Invite-Code basierte Registrierung, JWT Login
- **Faktionssystem**: Galaktisches Imperium & Rebellenallianz
- **Ressourcenverwaltung**: Credits, Metall, Kristall, Energie mit Produktionsraten
- **Planetenverwaltung**: STU-Style 10x10 Grid mit 3 Ebenen
  - Ebene 1 (ORBIT): Reihen 0-1, SPACE Felder für Raumstationen
  - Ebene 2 (OBERFLÄCHE): Reihen 2-7, LAND/WASSER/BERG Felder für Gebäude
  - Ebene 3 (UNTERGRUND): Reihen 8-9, ROCK/KRISTALL/METALL Felder für Minen
- **Gebäudesystem**: 11 Gebäudetypen mit Echtzeit-Konstruktion
  - Basis: Kommandozentrale, Solarkraftwerk, Metallmine, Kristallsammler, Lager, Handelszentrum
  - Erweitert: Werft, Forschungslabor, Verteidigungsgitter, Raffinerie, Hangar
  - Kategorisiertes Baumenü (Infrastruktur, Ressourcen, Produktion, Militär, Forschung)
  - Energieabhängige Aktivierung mit Auto-Deaktivierung
  - 50% Rückerstattung beim Abriss/Abbruch
- **Forschungssystem**: Tech-Tree mit Voraussetzungen
  - Level 0: Ressourcenbasierte Forschung (keine Labs erforderlich)
  - Level 1+: Forschungspunkte-basiert (erfordert Forschungslabore)
  - Schaltet Gebäude und Schiffstypen frei
- **Schiffskonstruktion**: 14 Schiffstypen in 7 Klassen
  - Jäger, Bomber, Fregatte, Kreuzer, Schlachtkreuzer, Schlachtschiff, Dreadnought
  - Bauqueue in der Werft mit Fortschrittsanzeige
  - Von TIE-Jägern bis Mon Calamari Kreuzern
- **Schiffsnavigation**: STU-Style Echtzeit-Bewegungssystem
  - Duales Energiesystem (Waffen + Antrieb)
  - Echtzeit-Bewegungsverarbeitung (1s Intervall)
  - Sensorbasierter Nebel des Krieges (sensorRange bestimmt Sichtbarkeit)
  - Antriebseffizienz beeinflusst Energieverbrauch
  - Schiffe können stranden wenn Energie ausgeht
  - Statusverfolgung: GEDOCKT, IM_FLUG, GESTRANDET
- **Galaxiekarte**: Mehrstufige hierarchische Navigation
  - 6x6 Sektoren (36 total)
  - 20x20 Felder pro Sektor (120x120 Galaxie)
  - System-Ebene zwischen Sektor und Planet
  - ~450 Systeme mit ~1360 Planeten
  - Systemtypen: EINZELSTERN (90%), DOPPELSTERN (8%), NEUTRONENSTERN (1.5%), SCHWARZES_LOCH (0.5%)
  - Orbitale Planetenvisualisierung
- **Comnet**: Galaxieweites RP-Forum
  - Optionaler Titel (100 Zeichen)
  - Nachricht (5000 Zeichen)
  - 30-Minuten Bearbeitungsfenster
  - Echtzeit-Updates via Socket.io
  - Fraktionsfarben für Posts
- **Echtzeit-Updates**: Socket.io Events
  - Gebäudeabschluss
  - Ressourcen-Updates
  - Forschungsfortschritt
  - Schiffskonstruktion
  - Schiffsbewegung und Ankunft
  - Comnet-Nachrichten
- **Lagersystem**: Kapazitätsgrenzen, erweiterbar mit Lagern
- **Tick-System**: 60-Sekunden-Intervalle für Ressourcenproduktion
- **Hintergrunddienste**:
  - Gebäudeabschluss (10s Check)
  - Forschungsfortschritt (10s Check)
  - Schiffsbau (10s Check)
  - Schiffsbewegung (1s Echtzeit-Verarbeitung)
- **Einstellungen**: Benutzername/Passwort ändern, Invite-Code Generierung

### 🚧 Geplant
- Gebäude-Upgrades (Level 2-10)
- Flottengruppierung und Formationen
- Kampfsystem
- Handelssystem
- Allianzen

## 🚀 Quick Start

Dieses Projekt nutzt **devenv** (Nix-basierte Entwicklungsumgebung) zur Verwaltung aller Services.

### Voraussetzungen
- [Nix Package Manager](https://nixos.org/download.html) installiert
- [devenv](https://devenv.sh/) installiert

### Installation

1. **Repository klonen:**
```bash
git clone https://github.com/swholonet/core.git
cd core
```

2. **Alle Services mit devenv starten:**
```bash
devenv up
```

Dieser einzelne Befehl startet:
- PostgreSQL 15 (Port 5432)
- Redis 7 (Port 6379)
- Backend API (Port 3000)
- Frontend Dev-Server (Port 5173)

Alle Services laufen mit Auto-Reload. Code-Änderungen werden automatisch erkannt.

3. **Datenbank initialisieren** (nur beim ersten Mal, in neuem Terminal):
```bash
cd backend
npm run db:reset
```

Dies erstellt das Schema, führt Migrationen aus, befüllt Fraktionen/Gebäude/Forschungstypen und generiert die Galaxie.

4. **Admin Invite-Code generieren:**
```bash
cd backend
npm run seed:admin
```

5. **Spiel öffnen:**
- Navigiere zu http://localhost:5173
- Registriere dich mit dem Invite-Code
- Generiere weitere Invite-Codes in den Einstellungen

### Wichtige Hinweise
- **NICHT** Backend/Frontend manuell mit npm/node Befehlen starten
- **NICHT** versuchen, Prozesse manuell zu beenden oder neu zu starten
- `devenv up` übernimmt automatisch das gesamte Hot-Reloading
- Stoppe alle Services mit Strg+C im `devenv up` Prozess
- Starte `devenv up` nur bei fundamentalen Config-Änderungen neu (schema.prisma, devenv.nix)

## 🐳 Docker Deployment

Für Production-Deployment via Docker siehe:
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Vollständige VPS/Server Deployment-Anleitung
- **[CADDY.md](CADDY.md)** - Caddy Reverse Proxy mit automatischem HTTPS
- **[DOCKER_FILES.md](DOCKER_FILES.md)** - Übersicht aller Docker/Config-Dateien

**Schnellstart:**
```bash
# 1. Docker Images bauen
./deploy.sh

# 2. Environment konfigurieren
cp .env.production.example .env.production
nano .env.production  # Secrets anpassen!

# 3. Container starten
docker compose -f docker-compose.prod.yml up -d

# 4. Reverse Proxy einrichten (siehe CADDY.md)
```

**Gebaute Images:**
- `swholo-backend:latest` (~500MB) - Node.js 20 (Debian) mit bcrypt Support
- `swholo-frontend:latest` (~220MB) - Node.js 20 (Alpine) mit Vite Build

**Wichtig:** Container lauschen nur auf `127.0.0.1` - für externen Zugriff ist Caddy (oder Nginx) als Reverse Proxy erforderlich!

This creates the schema, runs migrations, seeds factions/buildings/research types, and generates the galaxy.
This creates the schema, runs migrations, seeds factions/buildings/research types, and generates the galaxy.

4. **Generate an admin invite code:**
```bash
cd backend
npm run seed:admin
```

5. **Open the game:**
- Navigate to http://localhost:5173
- Register with the invite code
- Generate more invite codes in Settings

### Important Notes
- **DO NOT** manually start backend/frontend with npm/node commands
- **DO NOT** try to kill or restart processes manually
- `devenv up` handles all hot-reloading automatically
- Stop all services with Ctrl+C on the `devenv up` process
- Restart `devenv up` only for fundamental config changes (schema.prisma, devenv.nix)

## 🛠 Tech Stack

**Backend:**
- Node.js 20 + TypeScript + Express
- PostgreSQL 15 + Prisma ORM
- Redis 7 (caching)
- Socket.io (real-time)
- JWT authentication (bcrypt)

**Frontend:**
- React 18 + TypeScript + Vite 6
- Tailwind CSS
- Zustand (state management)
- Socket.io Client

**Development:**
- devenv (Nix-based unified dev environment)
- Prisma Migrate

## 📁 Project Structure

```
backend/
  src/
    index.ts              # Express server + Socket.io + service initialization
    routes/               # API endpoints (auth, planet, galaxy, ship, etc.)
    services/             # Business logic
      ├── tickSystem.ts            # Resource production (60s)
      ├── buildingCompletionService.ts  # Building checks (10s)
      ├── researchService.ts       # Research progress (10s)
      ├── shipMovementService.ts   # Real-time ship movement (1s)
      └── galaxyService.ts         # Galaxy/planet generation
    middleware/           # Auth middleware
    socket/               # Socket.io event handlers
  prisma/
    schema.prisma         # Database schema
    migrations/           # Database migrations
  scripts/
    reset-and-seed.ts     # Complete DB reset + seed

frontend/
  src/
    pages/                # React pages (Dashboard, Planet, Galaxy, Ship, Fleet, etc.)
    components/           # Reusable components (BuildMenu, Layout, etc.)
    stores/               # Zustand state management (gameStore)
    lib/                  # API client (Axios + Socket.io)
```

## 🔧 Verfügbare Befehle

### Datenbankverwaltung (aus backend/)
```bash
npm run db:reset      # Kompletter Reset: Migrationen + Seed Fraktionen/Gebäude/Forschung + Galaxie initialisieren
npm run db:migrate    # Nur Prisma Migrationen ausführen
npm run seed:admin    # Admin Invite-Code generieren
```

### Entwicklung
```bash
devenv up             # Alle Services starten (PostgreSQL, Redis, Backend, Frontend)
# Strg+C zum Stoppen aller Services
```

**Hinweis:** Verwende nicht `npm run dev` manuell. `devenv up` übernimmt alles.

### Docker (Production)
```bash
./deploy.sh           # Backend und Frontend Docker-Images bauen
docker images | grep swholo  # Gebaute Images anzeigen
```

## 🐛 Debugging & Logging

### Logging aktivieren

**Frontend** (`.env.development` oder `.env.local`):
```env
VITE_DEBUG_LOGGING=true
```

**Backend** (`.env`):
```env
DEBUG_LOGGING=true
```

### Logger verwenden

```typescript
import logger from '../lib/logger';

logger.debug('Debug-Nachricht', data);    // Nur bei DEBUG_LOGGING=true
logger.info('Info-Nachricht', data);      // Nur bei DEBUG_LOGGING=true
logger.warn('Warnung', data);             // Nur bei DEBUG_LOGGING=true
logger.error('Fehler', error);            // IMMER geloggt
logger.socket('Socket Event', data);       // Socket.io Events
logger.api('API Call', request);           // API Requests/Responses
logger.db('DB Query', query);              // Datenbankabfragen (Backend)
logger.tick('Tick System', tickNumber);    // Tick-System (Backend)
```

**Hinweis:** Fehler (`logger.error()`) werden IMMER geloggt, unabhängig von DEBUG_LOGGING.

## ⚙️ Spielmechaniken

### Duales Zeitsystem

1. **Tick-System** (`tickSystem.ts`): Läuft alle 60 Sekunden
   - Verarbeitet Ressourcenproduktion (Credits, Metall, Kristall)
   - Prüft Energiebilanz und deaktiviert Gebäude automatisch bei negativer Bilanz
   - Wird NICHT für Gebäudeabschluss verwendet

2. **Gebäudeabschluss-Service** (`buildingCompletionService.ts`): Läuft alle 10 Sekunden
   - Prüft `constructionStartedAt + buildTime` (in MINUTEN)
   - Echtzeit-Abschlusserkennung
   - Sendet Socket.io `building:completed` Event

3. **Schiffsbewegungsservice** (`shipMovementService.ts`): Läuft jede Sekunde
   - Echtzeit-Schiffsbewegungsverarbeitung
   - Energieverbrauch basierend auf Antriebseffizienz
   - Schiffe stranden bei erschöpfter Energie
   - Sendet `ship:moved`, `ship:arrived`, `ship:stranded` Events

### Ressourcen & Wirtschaft

- **Credits**: Hauptwährung, aus Kommandozentrale (100/Tick) und Handelszentrum (50/Tick)
- **Metall**: Aus Metallmine (30/Tick), kostet 10 Energie
- **Kristall**: Aus Kristallsammler (20/Tick), kostet 15 Energie
- **Energie**: Aus Solarkraftwerk (50 Produktion), verbraucht von aktiven Gebäuden
- **Lager**: Basis 1000, +500 pro Lager

### Planetenlayout (STU-Style)

- 10 Spalten × 10 Reihen
- 3 unterschiedliche Ebenen mit visueller Trennung:
  - **ORBIT** (Reihen 0-1): Raumstationen, orbitale Einrichtungen (SPACE Felder)
  - **OBERFLÄCHE** (Reihen 2-7): Hauptgebäude (LAND/WASSER/BERG Felder)
  - **UNTERGRUND** (Reihen 8-9): Ressourcenminen (ROCK/KRISTALL/METALL Felder)

### Gebäudesystem

- `buildTime` im Schema ist in **MINUTEN** (Echtzeit, nicht Ticks)
- Konstruktion startet bei Platzierung, berechnet Fertigstellung via Zeitstempel
- Frontend zeigt Countdown-Timer in Minuten/Sekunden
- 50% Rückerstattung bei Abriss/Abbruch
- Energieabhängige Aktivierung mit Auto-Deaktivierung bei negativer Energie

### Bauzeiten (Minuten)

- Kommandozentrale: 0 (sofort, Startgebäude)
- Solarkraftwerk, Lager: 5
- Metallmine: 10
- Kristallsammler, Handelszentrum, Verteidigungsgitter: 15
- Raffinerie: 18
- Werft: 20
- Forschungslabor: 25
- Hangar: 12

### Schiffsnavigationssystem

- **Duales Energiesystem**:
  - `energyWeapons`: Für Kampf (noch nicht implementiert)
  - `energyDrive`: Für Bewegung, verbraucht basierend auf Entfernung und Effizienz
- **Bewegung**:
  - Echtzeit-Verarbeitung jede Sekunde
  - Energiekosten: `Entfernung / Antriebseffizienz` pro Schritt
  - Schiffe bewegen sich 1 Feld/Sekunde zum Ziel
  - Status: GEDOCKT (am Planeten), IM_FLUG (bewegend), GESTRANDET (keine Energie)
- **Sensoransicht**:
  - Nebel des Krieges basierend auf `sensorRange`
  - Gridgröße: `(sensorRange * 2 + 1) × (sensorRange * 2 + 1)`
  - Zeigt sichtbare Sektoren, Systeme, Schiffe in Reichweite
- **Energieverwaltung**:
  - Aufladen am gedockten Planeten (kostet Planetenressourcen)
  - Max. Kapazität: `maxEnergyDrive` und `maxEnergyWeapons` pro Schiffstyp

## 🌌 Galaxiesystem

### Hierarchie

1. **Galaxie**: 6×6 Sektoren (36 gesamt)
2. **Sektor**: 20×20 Felder je (120×120 Galaxiegrid)
3. **System**: Zwischen Sektor und Planet (~8-16 pro Sektor, ~450 gesamt)
4. **Planet**: 1-5 pro System (~1360 gesamt)

### Systemtypen

- **EINZELSTERN**: 90% (einzelner Stern)
- **DOPPELSTERN**: 8% (Binärsystem)
- **NEUTRONENSTERN**: 1.5% (Neutronenstern)
- **SCHWARZES_LOCH**: 0.5% (Schwarzes Loch)

### Planetengenerierung

- Orbitalpositionen mit `orbitRadius` und `orbitAngle`
- 6 Startplaneten (3 pro Fraktion) mit vorgebauter Kommandozentrale
- Systemtyp beeinflusst Planetenanzahl und -eigenschaften

### Navigation

- Galaxie → Sektor → System → Planet
- Systemansicht zeigt orbitale Planeten um zentrale(n) Stern(e)
- Klick auf Planet → Planetendetailansicht (10×10 Grid)

## 🔬 Forschungssystem

### Level 0 (Starter-Forschung)

- Keine Forschungslabore erforderlich
- Ressourcenbasiert: `requiredMetalTotal`, `requiredCrystalTotal`, `requiredCreditsTotal`
- Automatischer Fortschritt via Tick-System
- Schaltet Basisgebäude frei

### Level 1-3 (Erweiterte Forschung)

- Erfordert Forschungslabore
- Forschungspunkte-basiert: `requiredResearchPoints`
- Voraussetzungen: Abhängigkeiten von anderer Forschung
- Schaltet erweiterte Gebäude und Schiffe frei

### Kategorien

- **Militär**: Waffen, Schilde, Schiffstechnologien
- **Wirtschaft**: Ressourceneffizienz, Handel
- **Energie**: Kraftwerke, Energiespeicher
- **Wissenschaft**: Forschungsgeschwindigkeit, neue Technologien

## 🔌 Socket.io Events

### Client → Server

- `join:planet` - Planetenraum betreten
- `leave:planet` - Planetenraum verlassen

### Server → Client

- `building:completed` - Gebäudekonstruktion abgeschlossen
- `resource:updated` - Ressourcen geändert (Tick-Verarbeitung)
- `energy:depleted` - Energie aufgebraucht
- `tick:update` - Tick verarbeitet
- `research:progress` - Forschungsfortschritt aktualisiert
- `ship:built` - Schiffskonstruktion abgeschlossen
- `ship:moved` - Schiffsposition geändert
- `ship:arrived` - Schiff hat Ziel erreicht
- `ship:stranded` - Schiff hat keine Energie mehr
- `comnet:message` - Neue Comnet-Nachricht
- `comnet:updated` - Comnet-Nachricht bearbeitet

## 📝 Umgebungsvariablen

### Backend (.env)

```env
NODE_ENV=development
PORT=3000

# Datenbank (automatisch von devenv verwaltet)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/swholo_game?schema=public"

# Redis (automatisch von devenv verwaltet)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Spieleinstellungen
TICK_INTERVAL=60000  # 60 Sekunden in Millisekunden

# Logging (optional)
DEBUG_LOGGING=true   # Aktiviert detailliertes Logging
```

### Frontend (.env.development)

```env
VITE_API_URL=http://localhost:3000
VITE_DEBUG_LOGGING=true  # Aktiviert Frontend-Logging
```

## 🗄 Datenbankschema

### Hauptmodelle

- **User & Player**: JWT Auth, Invite-System, Spielerprofil mit Ressourcen
- **Faction**: Imperium & Rebellenallianz
- **Galaxy, Sector, System, Planet**: Hierarchische Struktur
  - 6×6 Sektoren (36 gesamt)
  - 8-16 Systeme pro Sektor (~450 gesamt)
  - 1-5 Planeten pro System (~1360 gesamt)
  - Planeten mit `orbitRadius` und `orbitAngle`
- **PlanetField**: 10×10 Grid mit 3 Ebenen (ORBIT/OBERFLÄCHE/UNTERGRUND)
- **BuildingType & Building**: 11 Gebäudetypen mit Echtzeit-Konstruktionsfortschritt
- **ResearchType & PlayerResearch**:
  - Level 0: Ressourcenbasierte Forschung (`requiredMetalTotal`, etc.)
  - Level 1+: Forschungspunkte-basiert mit Voraussetzungen
  - Schaltet Gebäude und Schiffe frei
- **Fleet, Ship, ShipType**: Flottensystem mit Echtzeit-Navigation
  - Duales Energiesystem (Waffen + Antrieb)
  - Statusverfolgung (GEDOCKT/IM_FLUG/GESTRANDET)
  - Sensorreichweite und Antriebseffizienz
- **InviteCode**: Invite-basierte Registrierung mit Creator-Tracking
- **ComnetMessage**: RP-Forum mit Titel (optional), Nachricht, Bearbeitungshistorie

### Hauptmerkmale

- **System**: Zwischen Sektor und Planet, mit `systemType` (EINZELSTERN, DOPPELSTERN, etc.)
- **Planet**: Hat `systemId` statt direktem `sectorId`, mit Orbitalparametern
- **fieldLayer**: ORBIT, OBERFLÄCHE, UNTERGRUND
- **fieldType**: SPACE (Orbit), LAND/WASSER/BERG (Oberfläche), ROCK/KRISTALL/METALL (Untergrund)
- **constructionStartedAt**: Zeitstempel für Echtzeit-Gebäudefortschritt
- **storageCapacity**: Ressourcenlimit, erweiterbar mit Lager
- **Ship Navigation**: `currentGalaxyX/Y`, `currentSystemX/Y`, `destinationGalaxyX/Y`, Energiesysteme
- **ComnetMessage**: `title`, `message`, `createdAt`, `updatedAt` für Bearbeitungsverfolgung

## � Dokumentation

- **[README.md](README.md)** - Diese Datei (Projekt-Übersicht, Development)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production Deployment auf VPS/Server
- **[CADDY.md](CADDY.md)** - Reverse Proxy mit automatischem HTTPS
- **[DOCKER_FILES.md](DOCKER_FILES.md)** - Übersicht aller Docker/Config-Dateien
- **[NOTES.md](NOTES.md)** - Entwickler-Notizen und TODOs

## �📝 License

MIT

## 👥 Autor

Entwickelt mit ❤️ für Star Wars Fans
