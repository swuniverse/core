# Star Wars Universe - Docker Deployment Guide

Vollständige Anleitung für das Deployment der Star Wars Universe Applikation via Docker auf einem VPS oder Server.

## 📋 Voraussetzungen

### Server-Requirements
- **OS**: Ubuntu 22.04 LTS oder Debian 11+ (empfohlen)
- **RAM**: Mindestens 2GB (4GB empfohlen)
- **Speicher**: 10GB freier Speicherplatz
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+ (Plugin)

### Lokale Requirements (für Build)
- Docker Desktop oder Docker Engine
- Git
- Zugriff auf das Repository

## 🐳 Docker Images

Das Projekt besteht aus zwei Docker-Images:

### Backend Image (`swu-backend:latest`)
- **Basis**: `node:20-slim` (Debian-basiert, ~500MB)
- **Features**:
  - Native Module Support (bcrypt)
  - Build-Tools: python3, make, g++
  - Multi-stage Build für optimierte Image-Größe
  - PostgreSQL Client (Prisma)
  - TypeScript Compiler
- **Ports**: 3000 (Express API + Socket.io)

### Frontend Image (`swu-frontend:latest`)
- **Basis**: `node:20-alpine` (~220MB)
- **Features**:
  - Vite Production Build
  - Static File Server (serve)
  - Optimierte Bundle-Größe
- **Ports**: 3000 (intern, mapped auf Host)

## 🚀 Quick Start Deployment

### 1. Repository klonen

```bash
cd /opt  # oder dein bevorzugtes Verzeichnis
git clone https://github.com/dein-username/swu.git
cd swu
```

### 2. Environment konfigurieren

Erstelle `.env.production` Datei:

```bash
nano .env.production
```

**Minimal-Konfiguration:**
```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=ÄNDERE-MICH-SICHERES-PASSWORT
POSTGRES_DB=swu_game

# Backend
NODE_ENV=production
DATABASE_URL=postgresql://postgres:ÄNDERE-MICH-SICHERES-PASSWORT@postgres:5432/swu_game?schema=public
JWT_SECRET=GENERIERE-MIT-openssl-rand-base64-32
JWT_EXPIRES_IN=7d
PORT=3000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# CORS (wichtig!)
CORS_ORIGIN=https://deine-domain.com  # oder http://deine-ip
```

**Sichere Secrets generieren:**
```bash
# JWT Secret generieren
openssl rand -base64 32

# Starkes Passwort generieren
openssl rand -base64 24
```

### 3. Docker Images bauen

```bash
./deploy.sh
```

Das Script führt aus:
- ✅ Baut Backend-Image (mit bcrypt native compilation)
- ✅ Baut Frontend-Image (Vite production build)
- ✅ Zeigt gebaute Images an

**Erwartete Ausgabe:**
```
🚀 Star Wars Universe - Build Script
====================================

Schritt 1: Backend Docker Image bauen
[+] Building 45.2s (21/21) FINISHED
✅ Backend erfolgreich gebaut

Schritt 2: Frontend Docker Image bauen
[+] Building 32.1s (12/12) FINISHED
✅ Frontend erfolgreich gebaut

✅ Alle Images erfolgreich gebaut!
```

### 4. Container starten

Mit Docker Compose (erstelle zuerst `docker-compose.prod.yml`):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: swu-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - swu-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: swu-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - swu-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    image: swu-backend:latest
    container_name: swu-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PORT: 3000
    ports:
      - "127.0.0.1:3000:3000"  # Nur localhost!
    networks:
      - swu-network
    command: >
      sh -c "npx prisma migrate deploy &&
             npm run seed:admin &&
             node dist/index.js"

  frontend:
    image: swu-frontend:latest
    container_name: swu-frontend
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:3000"  # Nur localhost!
    networks:
      - swu-network

volumes:
  postgres_data:
  redis_data:

networks:
  swu-network:
    driver: bridge
```

**Container starten:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 5. Logs prüfen

```bash
# Alle Logs
docker compose -f docker-compose.prod.yml logs -f

# Nur Backend
docker compose -f docker-compose.prod.yml logs -f backend

# Nur Frontend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### 6. Datenbank initialisieren

```bash
# Migrationen sind bereits im Backend-Start-Command enthalten
# Prüfe ob erfolgreich:
docker compose -f docker-compose.prod.yml logs backend | grep "Migrations"

# Admin Invite-Code holen (für ersten Login):
docker compose -f docker-compose.prod.yml logs backend | grep "Admin invite code"
```

## 🌐 Reverse Proxy Setup (ERFORDERLICH)

Die Container lauschen nur auf `127.0.0.1` - für externe Zugriffe ist ein Reverse Proxy **erforderlich**.

### Option A: Caddy (Empfohlen)

**Warum Caddy?**
- ✅ Automatisches HTTPS mit Let's Encrypt
- ✅ Null Konfiguration für SSL
- ✅ Automatische Zertifikat-Erneuerung
- ✅ Einfachere Syntax als Nginx

**Installation:**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

**Caddyfile** (`/etc/caddy/Caddyfile`):
```caddy
deine-domain.com {
    # Automatisches HTTPS (Let's Encrypt)
    encode gzip

    # Frontend
    reverse_proxy localhost:8080

    # Backend API
    handle /api/* {
        reverse_proxy localhost:3000
    }

    # Socket.io WebSockets
    @websockets {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websockets localhost:3000

    # Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
    }

    # Logging
    log {
        output file /var/log/caddy/swu-access.log
    }
}
```

**Caddy starten:**
```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
sudo systemctl status caddy
```

**Das war's!** Caddy holt automatisch ein SSL-Zertifikat von Let's Encrypt.

### Option B: Nginx

**Installation:**
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

**Nginx Config** (`/etc/nginx/sites-available/swu`):
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name deine-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name deine-domain.com;

    # SSL Certificates (von certbot verwaltet)
    ssl_certificate /etc/letsencrypt/live/deine-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deine-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io WebSockets
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Aktivieren und SSL einrichten:**
```bash
sudo ln -s /etc/nginx/sites-available/swu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d deine-domain.com
```

**Alternative: Fertige nginx-vps.conf verwenden**

Im Projekt-Root liegt eine fertige `nginx-vps.conf` mit allen nötigen Einstellungen:

```bash
# Kopieren und anpassen
sudo cp nginx-vps.conf /etc/nginx/sites-available/swu
sudo nano /etc/nginx/sites-available/swu  # Domain anpassen!

# Aktivieren
sudo ln -s /etc/nginx/sites-available/swu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL einrichten
sudo certbot --nginx -d deine-domain.com
```

Die `nginx-vps.conf` enthält:
- ✅ HTTP → HTTPS Redirect
- ✅ SSL Optimierungen (TLS 1.2/1.3)
- ✅ Security Headers (HSTS, X-Frame-Options, etc.)
- ✅ Frontend Proxy (Port 8080)
- ✅ Backend API Proxy (Port 3000)
- ✅ Socket.io WebSocket Support mit Timeouts
- ✅ CORS Headers
- ✅ Gzip Compression
- ✅ Health Check Endpoint

## 🔧 Verwaltung & Wartung

### Container Management

```bash
# Status prüfen
docker compose -f docker-compose.prod.yml ps

# Container neu starten
docker compose -f docker-compose.prod.yml restart

# Container stoppen
docker compose -f docker-compose.prod.yml down

# Alles neu bauen und starten
git pull origin main
./deploy.sh
docker compose -f docker-compose.prod.yml up -d --build
```

### Datenbank-Befehle

```bash
# Datenbank zurücksetzen (VORSICHT!)
docker exec swu-backend npm run db:reset

# Nur Migrationen
docker exec swu-backend npx prisma migrate deploy

# Prisma Studio (DB GUI auf Port 5555)
docker exec -it swu-backend npx prisma studio

# Backup erstellen
docker exec swu-postgres pg_dump -U postgres swu_game | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup wiederherstellen
gunzip < backup_20231225.sql.gz | docker exec -i swu-postgres psql -U postgres swu_game
```

### Logs und Debugging

```bash
# Live Logs
docker compose -f docker-compose.prod.yml logs -f

# Letzte 100 Zeilen
docker compose -f docker-compose.prod.yml logs --tail=100

# Container Shell
docker exec -it swu-backend sh
docker exec -it swu-frontend sh

# Resource Usage
docker stats
```

## 📊 Monitoring & Backups

### Automatische Backups einrichten

Erstelle `/etc/cron.daily/swu-backup`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/swu"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# PostgreSQL Backup
docker exec swu-postgres pg_dump -U postgres swu_game | gzip > $BACKUP_DIR/swu_$DATE.sql.gz

# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "swu_*.sql.gz" -mtime +7 -delete

echo "Backup completed: swu_$DATE.sql.gz"
```

Ausführbar machen:
```bash
sudo chmod +x /etc/cron.daily/swu-backup
```

### Log Rotation

Docker rotiert Logs automatisch. Anpassung in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
}
}
```

Danach Docker neu starten:
```bash
sudo systemctl restart docker
```

## 🔥 Firewall Setup (UFW)

```bash
# UFW installieren (falls nicht vorhanden)
sudo apt install ufw

# Standard-Policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Ports öffnen
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Firewall aktivieren
sudo ufw enable

# Status prüfen
sudo ufw status verbose
```

## 🐛 Troubleshooting

### Container starten nicht

```bash
# Detaillierte Logs
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs postgres

# Service Health Check
docker compose -f docker-compose.prod.yml ps
```

### Datenbank-Verbindung fehlgeschlagen

```bash
# PostgreSQL Health
docker exec swu-postgres pg_isready -U postgres

# Database existiert?
docker exec swu-postgres psql -U postgres -l

# Container neu starten
docker compose -f docker-compose.prod.yml restart postgres
docker compose -f docker-compose.prod.yml restart backend
```

### bcrypt Fehler im Backend

Falls bcrypt-Fehler auftreten:
- Backend Image nutzt `node:20-slim` (Debian-basiert)
- Build-Tools (python3, make, g++) sind im Image enthalten
- Image neu bauen: `./deploy.sh`

### Frontend zeigt API-Fehler

```bash
# Backend erreichbar?
curl http://localhost:3000/api/health

# CORS-Origin richtig gesetzt?
docker compose -f docker-compose.prod.yml exec backend printenv CORS_ORIGIN
```

### Speicherplatz voll

```bash
# Docker aufräumen
docker system prune -a --volumes

# Alte Images löschen
docker image prune -a

# Große Logs finden
docker ps -a --format "table {{.Names}}\t{{.Size}}"
```

## 📈 Performance-Optimierung

### PostgreSQL Tuning (für 4GB RAM)

In `docker-compose.prod.yml` bei `postgres` hinzufügen:

```yaml
postgres:
  # ... existing config ...
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=1GB"
    - "-c"
    - "effective_cache_size=3GB"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "work_mem=5MB"
```

### Redis Persistence

Bereits konfiguriert mit:
```yaml
command: redis-server --appendonly yes
```

### Backend Rate Limiting

Bereits implementiert in Backend-Code. Für Anpassungen siehe `backend/src/index.ts`.

## 🔐 Security Best Practices

### Checkliste

- ✅ Starke Passwörter in `.env.production`
- ✅ JWT_SECRET mit 32+ Zeichen (generiert via `openssl rand -base64 32`)
- ✅ HTTPS via Let's Encrypt (Caddy/Nginx)
- ✅ Firewall aktiv (UFW)
- ✅ Container nur auf localhost (127.0.0.1)
- ✅ Reverse Proxy für externen Zugriff
- ✅ Regelmäßige Updates: `apt update && apt upgrade`
- ✅ Automatische Backups aktiv
- ✅ Log Rotation konfiguriert

### Zusätzliche Absicherung

**Fail2Ban für SSH:**
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

**SSH Key-Only Auth:**
```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes

# SSH neu laden
sudo systemctl restart sshd
```

## 📝 Environment Variables Referenz

### Erforderliche Variablen

| Variable | Beschreibung | Beispiel |
|----------|-------------|----------|
| `POSTGRES_USER` | PostgreSQL Benutzer | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL Passwort | `SICHERES-PASSWORT` |
| `POSTGRES_DB` | Datenbankname | `swu_game` |
| `DATABASE_URL` | Prisma Connection String | `postgresql://...` |
| `JWT_SECRET` | JWT Signing Key | `openssl rand -base64 32` |
| `CORS_ORIGIN` | Erlaubte Frontend-Origin | `https://domain.com` |

### Optionale Variablen

| Variable | Beschreibung | Standard |
|----------|-------------|----------|
| `JWT_EXPIRES_IN` | JWT Token Lifetime | `7d` |
| `PORT` | Backend Port | `3000` |
| `REDIS_HOST` | Redis Hostname | `redis` |
| `REDIS_PORT` | Redis Port | `6379` |
| `TICK_INTERVAL` | Game Tick in ms | `60000` |

## 🆘 Support & Hilfe

### Logs sammeln für Support

```bash
# System-Info
uname -a
docker --version
docker compose version

# Container Status
docker compose -f docker-compose.prod.yml ps

# Logs (letzte 100 Zeilen)
docker compose -f docker-compose.prod.yml logs --tail=100 > logs.txt
```

### Häufige Probleme

1. **"Cannot connect to database"**
   - Prüfe `DATABASE_URL` in `.env.production`
   - Stelle sicher dass `POSTGRES_PASSWORD` übereinstimmt
   - Warte auf PostgreSQL Health Check

2. **"CORS Error"**
   - Setze `CORS_ORIGIN` auf deine Domain/IP
   - Backend neu starten

3. **"bcrypt error"**
   - Backend-Image neu bauen mit `./deploy.sh`
   - Stelle sicher dass `Dockerfile.backend` node:20-slim nutzt

4. **"502 Bad Gateway"**
   - Prüfe ob Backend Container läuft
   - Prüfe Backend Logs
   - Teste direkt: `curl http://localhost:3000/api/health`

---

**Viel Erfolg beim Deployment!** Bei Fragen oder Problemen erstelle ein Issue im Repository.
