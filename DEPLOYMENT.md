# Star Wars Universe - VPS Deployment Guide

## 📋 Voraussetzungen auf dem VPS

1. **Ubuntu 22.04 LTS** (oder Debian 11+)
2. **Docker & Docker Compose** installiert
3. **Git** installiert
4. **Mindestens 2GB RAM** (4GB empfohlen)
5. **10GB freier Speicherplatz**

## 🚀 Installation auf dem VPS

### 1. Docker installieren (falls nicht vorhanden)

```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose installieren
sudo apt-get update
sudo apt-get install docker-compose-plugin

# User zu Docker-Gruppe hinzufügen (damit sudo nicht nötig)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Repository klonen

```bash
cd /var/www  # oder dein bevorzugtes Verzeichnis
git clone https://github.com/dein-username/swu.git
cd swu
```

### 3. Environment Variables konfigurieren

```bash
# .env.production erstellen
cp .env.production.example .env.production

# Mit Editor öffnen und anpassen
nano .env.production
```

**Wichtig - Setze diese Werte**:
```env
POSTGRES_PASSWORD=dein-sicheres-passwort-12345
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://deine-domain.com  # oder http://deine-ip
```

### 4. Deployment ausführen

```bash
./deploy.sh
```

Das Script wird:
- ✅ Container stoppen (falls vorhanden)
- ✅ Docker Images bauen
- ✅ PostgreSQL, Redis, Backend, Frontend starten
- ✅ Datenbank-Migrationen ausführen
- ✅ Optional: Seed-Daten einfügen

## 🌐 Nginx Reverse Proxy (ERFORDERLICH für externe Zugriffe)

Die Docker Container lauschen nur auf localhost (127.0.0.1) - für externe Zugriffe ist ein Nginx Reverse Proxy **erforderlich**.

### Installation

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

### Nginx Konfiguration

Die fertige Konfiguration ist in `nginx-vps.conf` enthalten. Einfach kopieren und anpassen:

```bash
# Konfiguration kopieren
sudo cp nginx-vps.conf /etc/nginx/sites-available/swu

# Domain anpassen (in der Datei)
sudo nano /etc/nginx/sites-available/swu
# → Ändere "server_name deine-domain.com;" zu deiner echten Domain

# Aktivieren
sudo ln -s /etc/nginx/sites-available/swu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL mit Let's Encrypt (nach DNS-Setup)
sudo certbot --nginx -d deine-domain.com
```

### Was die Konfiguration macht:
- **Port 443 (HTTPS)**: Einziger extern erreichbarer Port
- **Port 80 → 443**: Automatische HTTPS-Umleitung
- **Frontend**: Proxied zu `localhost:8080` (Docker Container)
- **Backend API**: Proxied zu `localhost:3000/api`
- **Socket.io**: Echtzeit-Updates über WebSocket
- **Security Headers**: HSTS, X-Frame-Options, XSS-Protection
- **Gzip Compression**: Reduzierte Bandbreite

### Wichtig:
Die Docker Container sind **nur über localhost erreichbar**:
- Frontend: `127.0.0.1:8080:80`
- Backend: `127.0.0.1:3000:3000`

Von extern ist nur HTTPS (Port 443) über Nginx erreichbar → maximale Sicherheit.

## 🔧 Wichtige Befehle

### Container Management
```bash
# Logs anzeigen
docker-compose -f docker-compose.prod.yml logs -f

# Nur Backend-Logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Container neustarten
docker-compose -f docker-compose.prod.yml restart

# Container stoppen
docker-compose -f docker-compose.prod.yml down

# Alles neu bauen und starten
docker-compose -f docker-compose.prod.yml up -d --build
```

### Datenbank
```bash
# Datenbank zurücksetzen und neu seeden
docker exec swu-backend npm run db:reset

# Nur Migrationen ausführen
docker exec swu-backend npx prisma migrate deploy

# Prisma Studio öffnen (auf Port 5555)
docker exec -it swu-backend npx prisma studio
```

### Updates deployen
```bash
cd /var/www/swu
git pull origin main
./deploy.sh
```

## 📊 Monitoring & Maintenance

### Backups einrichten

**Tägliches Backup** (`/etc/cron.daily/swu-backup`):
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/swu"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# PostgreSQL Backup
docker exec swu-postgres pg_dump -U postgres swu_game | gzip > $BACKUP_DIR/swu_$DATE.sql.gz

# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "swu_*.sql.gz" -mtime +7 -delete
```

### Logs rotieren
Docker macht das automatisch, aber du kannst es anpassen in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## 🔥 Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 🐛 Troubleshooting

### Container starten nicht
```bash
# Status prüfen
docker-compose -f docker-compose.prod.yml ps

# Logs prüfen
docker-compose -f docker-compose.prod.yml logs
```

### Datenbank-Verbindung fehlgeschlagen
```bash
# PostgreSQL Health Check
docker exec swu-postgres pg_isready -U postgres

# Container neu starten
docker-compose -f docker-compose.prod.yml restart postgres
docker-compose -f docker-compose.prod.yml restart backend
```

### Speicherplatz voll
```bash
# Docker aufräumen
docker system prune -a --volumes

# Alte Images löschen
docker image prune -a
```

## 📈 Performance-Optimierung

### Für Production anpassen:

1. **Backend** (`backend/src/index.ts`):
   - Rate Limiting aktivieren
   - CORS nur für deine Domain
   - Compression middleware

2. **PostgreSQL tuning** (für 4GB RAM):
   ```yaml
   # In docker-compose.prod.yml bei postgres hinzufügen:
   command:
     - "postgres"
     - "-c"
     - "shared_buffers=1GB"
     - "-c"
     - "effective_cache_size=3GB"
     - "-c"
     - "max_connections=200"
   ```

3. **Redis persistence**:
   Bereits aktiviert mit `--appendonly yes`

## 🔐 Security Checklist

- ✅ Starke Passwörter in `.env.production`
- ✅ JWT_SECRET mit 32+ Zeichen
- ✅ HTTPS mit Let's Encrypt
- ✅ Firewall aktiviert (nur Port 22, 80, 443)
- ✅ Regelmäßige Updates: `apt update && apt upgrade`
- ✅ Backups eingerichtet
- ✅ Fail2Ban für SSH (optional)

## 📞 Support

Bei Problemen prüfe:
1. Logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Container Status: `docker-compose -f docker-compose.prod.yml ps`
3. System Resources: `htop` oder `docker stats`
