# Deployment Files Übersicht

Dieses Dokument erklärt alle Deployment-relevanten Dateien im Projekt.

## 📦 Docker Files

### `Dockerfile.backend`
**Zweck:** Baut das Backend Docker Image mit Node.js, TypeScript, Prisma und bcrypt Support.

**Key Features:**
- Multi-stage Build (builder + production)
- Basis: `node:20-slim` (Debian-basiert)
- Build-Tools: python3, make, g++ für native Module (bcrypt)
- SSL-Workaround: `npm config set strict-ssl false`
- Finale Image-Größe: ~500MB

**Verwendung:**
```bash
docker build -f Dockerfile.backend -t swu-backend:latest .
```

---

### `Dockerfile.frontend`
**Zweck:** Baut das Frontend Docker Image mit Vite Production Build.

**Key Features:**
- Multi-stage Build (builder + production)
- Basis: `node:20-alpine` (kleiner)
- Vite production build
- Servier mit `serve` Package
- Finale Image-Größe: ~220MB

**Verwendung:**
```bash
docker build -f Dockerfile.frontend -t swu-frontend:latest .
```

---

### `deploy.sh`
**Zweck:** Automatisches Build-Script für beide Docker Images.

**Was es macht:**
1. Baut Backend-Image (`swu-backend:latest`)
2. Baut Frontend-Image (`swu-frontend:latest`)
3. Zeigt gebaute Images an

**Verwendung:**
```bash
./deploy.sh
```

**Erwartete Ausgabe:**
```
🚀 Star Wars Universe - Build Script
✅ Backend erfolgreich gebaut
✅ Frontend erfolgreich gebaut
✅ Alle Images erfolgreich gebaut!
```

---

### `docker-compose.prod.yml`
**Zweck:** Production deployment mit allen Services (PostgreSQL, Redis, Backend, Frontend).

**Services:**
- `postgres` - PostgreSQL 15 mit Health Checks
- `redis` - Redis 7 mit Persistence
- `backend` - SWU Backend API + Socket.io
- `frontend` - SWU React Frontend

**Container Ports:**
- PostgreSQL: `5432:5432`
- Redis: `6379:6379`
- Backend: `127.0.0.1:3000:3000` (nur localhost!)
- Frontend: `127.0.0.1:8080:3000` (nur localhost!)

**Wichtig:** Container sind nur über localhost erreichbar. Für externen Zugriff ist ein Reverse Proxy (Caddy/Nginx) erforderlich!

**Verwendung:**
```bash
# Starten
docker compose -f docker-compose.prod.yml up -d

# Logs anzeigen
docker compose -f docker-compose.prod.yml logs -f

# Stoppen
docker compose -f docker-compose.prod.yml down
```

---

## 🌐 Reverse Proxy

### `Caddyfile`
**Zweck:** Caddy Reverse Proxy Konfiguration mit automatischem HTTPS.

**Features:**
- Automatisches Let's Encrypt SSL
- HTTP → HTTPS Redirect (automatisch)
- WebSocket Support für Socket.io
- Security Headers (HSTS, X-Frame-Options, etc.)
- Gzip/Zstd Compression
- JSON Access Logs

**Installation & Setup:** Siehe [CADDY.md](CADDY.md)

**Wichtige Punkte:**
- Domain in Zeile 5 anpassen: `deine-domain.com` → `echte-domain.com`
- Nach `/etc/caddy/Caddyfile` kopieren
- Caddy neustarten: `sudo systemctl restart caddy`

---

### `nginx-vps.conf`
**Zweck:** Nginx Reverse Proxy Konfiguration (Alternative zu Caddy).

**Features:**
- HTTP → HTTPS Redirect
- SSL Optimierungen (TLS 1.2/1.3)
- Security Headers (HSTS, X-Frame-Options, etc.)
- Frontend Proxy (Port 8080)
- Backend API Proxy (Port 3000)
- Socket.io WebSocket Support mit erweiterten Timeouts
- CORS Headers
- Gzip Compression
- Health Check Endpoint

**Installation & Setup:**
```bash
# Kopieren und anpassen
sudo cp nginx-vps.conf /etc/nginx/sites-available/swu
sudo nano /etc/nginx/sites-available/swu  # Domain anpassen!

# Aktivieren
sudo ln -s /etc/nginx/sites-available/swu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL mit certbot
sudo certbot --nginx -d deine-domain.com
```

**Wann verwenden:**
- Wenn du Nginx bereits kennst
- Wenn Nginx bereits auf dem Server installiert ist
- Wenn du manuelle SSL-Kontrolle bevorzugst

**Caddy vs Nginx:**
- **Caddy**: Einfacher, automatisches SSL, empfohlen für neue Setups
- **Nginx**: Mehr Kontrolle, bewährtes Tool, benötigt certbot

---

## ⚙️ Environment Files

### `.env.production.example`
**Zweck:** Template für Production Environment Variables.

**Setup:**
```bash
cp .env.production.example .env.production
nano .env.production  # Werte anpassen
```

**Kritische Variablen:**
- `POSTGRES_PASSWORD` - MUSS geändert werden
- `JWT_SECRET` - Mit `openssl rand -base64 32` generieren
- `DATABASE_URL` - Passwort muss mit POSTGRES_PASSWORD übereinstimmen
- `CORS_ORIGIN` - Auf echte Domain/IP setzen

---

## 📚 Dokumentation

### `DEPLOYMENT.md`
**Zweck:** Vollständige Deployment-Anleitung für VPS/Server.

**Inhalt:**
- Server-Requirements
- Docker Installation
- Image Build & Container Start
- Caddy/Nginx Reverse Proxy Setup
- Datenbank-Management
- Monitoring & Backups
- Troubleshooting
- Security Best Practices

**Für wen:** DevOps, Server-Admins, Production Deployment

---

### `CADDY.md`
**Zweck:** Detaillierte Caddy-Dokumentation und Konfigurationsbeispiele.

**Inhalt:**
- Caddyfile Aufbau und Features
- Installation auf Ubuntu/Debian
- Domain-Konfiguration
- WebSocket Support
- Security Headers Erklärung
- Troubleshooting
- Erweiterte Konfiguration (Multi-Domain, Rate Limiting, etc.)

**Für wen:** Jeden der Caddy als Reverse Proxy nutzen möchte

---

### `README.md`
**Zweck:** Hauptdokumentation des Projekts.

**Inhalt:**
- Feature-Übersicht
- devenv Quick Start (Development)
- Docker Deployment Quick Start
- Tech Stack
- Spielmechaniken
- Datenbank-Schema
- Socket.io Events
- Logging & Debugging

**Für wen:** Entwickler, neue Contributor, Nutzer

---

## 🔄 Workflow Übersicht

### Development (lokal)
```bash
# devenv.nix verwaltet PostgreSQL, Redis, Backend, Frontend
devenv up
```

### Production Deployment
```bash
# 1. Images bauen
./deploy.sh

# 2. .env.production konfigurieren
cp .env.production.example .env.production
nano .env.production

# 3. Container starten
docker compose -f docker-compose.prod.yml up -d

# 4a. Reverse Proxy mit Caddy (empfohlen)
sudo cp Caddyfile /etc/caddy/Caddyfile
# Domain in Caddyfile anpassen!
sudo systemctl restart caddy

# 4b. Alternativ: Nginx
sudo cp nginx-vps.conf /etc/nginx/sites-available/swu
# Domain anpassen!
sudo ln -s /etc/nginx/sites-available/swu /etc/nginx/sites-enabled/
sudo systemctl restart nginx
sudo certbot --nginx -d deine-domain.com
```

---

## ❌ Gelöschte/Obsolete Dateien

Die folgenden Dateien wurden entfernt da sie nicht mehr benötigt werden:

- ❌ `nginx.conf` - War für Frontend-Container (Frontend nutzt jetzt `serve`)
- ❌ `docker-compose.yml` - Redundant (devenv nutzt eigene Services, Production nutzt docker-compose.prod.yml)
- ❌ `DEPLOYMENT_README.md` - Redundant zu DEPLOYMENT.md
- ❌ `LOGGING.md` - In README.md integriert
- ❌ `backend/.dockerignore` - Nicht benötigt
- ❌ `frontend/.dockerignore` - Nicht benötigt
- ❌ `frontend/nginx.conf` - Frontend nutzt jetzt `serve`, Caddy ist Reverse Proxy

---

## 🎯 Quick Reference

| Datei | Zweck | Wann verwenden |
|-------|-------|----------------|
| `deploy.sh` | Docker Images bauen | Vor Production Deployment |
| `docker-compose.prod.yml` | Container orchestrieren | Production Server |
| `Caddyfile` | Reverse Proxy (Caddy) | VPS mit Domain (automatisches HTTPS, empfohlen) |
| `nginx-vps.conf` | Reverse Proxy (Nginx) | Alternative zu Caddy, wenn Nginx bevorzugt |
| `.env.production.example` | Config Template | Vor erstem Deployment kopieren |
| `DEPLOYMENT.md` | Deployment Guide | Bei VPS-Setup |
| `CADDY.md` | Caddy Doku | Bei Caddy Reverse Proxy Setup |
| `README.md` | Projekt-Doku | Immer zuerst lesen |

---

## 🆘 Hilfe benötigt?

1. **Development-Probleme:** Siehe [README.md](README.md)
2. **Production-Deployment:** Siehe [DEPLOYMENT.md](DEPLOYMENT.md)
3. **Caddy-Konfiguration:** Siehe [CADDY.md](CADDY.md)
4. **Container-Fehler:** Logs prüfen: `docker compose -f docker-compose.prod.yml logs -f`
