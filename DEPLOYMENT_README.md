## Star Wars Universe - VPS Deployment Files

Für das Hosting auf deinem VPS wurden folgende Dateien erstellt:

### 📦 Docker Configuration
- `Dockerfile.backend` - Backend Container
- `Dockerfile.frontend` - Frontend Container mit Nginx
- `docker-compose.prod.yml` - Production Setup
- `nginx.conf` - Nginx Konfiguration

### 🔧 Deployment
- `deploy.sh` - Automatisches Deployment-Script
- `.env.production.example` - Environment Template
- `DEPLOYMENT.md` - Komplette Deployment-Anleitung

### 🚀 Deployment auf VPS

1. **Auf deinem VPS**:
   ```bash
   git clone <dein-repo>
   cd swu
   ```

2. **Environment konfigurieren**:
   ```bash
   cp .env.production.example .env.production
   nano .env.production  # Passwörter & Secrets eintragen
   ```

3. **Deployen**:
   ```bash
   ./deploy.sh
   ```

Das wars! Die App läuft dann auf:
- Frontend: http://deine-ip/
- Backend: http://deine-ip:3000

### 📚 Vollständige Dokumentation
Siehe `DEPLOYMENT.md` für:
- Docker Installation
- Nginx Reverse Proxy Setup
- SSL/HTTPS mit Let's Encrypt
- Backups, Monitoring, Troubleshooting
- Security Best Practices

### ⚠️ Wichtig vor dem ersten Deploy
1. Generiere sichere Secrets:
   ```bash
   openssl rand -base64 32  # Für JWT_SECRET
   ```
2. Setze CORS_ORIGIN auf deine Domain
3. Ändere POSTGRES_PASSWORD zu einem sicheren Passwort
