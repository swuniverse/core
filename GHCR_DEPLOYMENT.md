# GitHub Container Registry (GHCR) Deployment Setup

## 🎯 Übersicht

Das Projekt nutzt jetzt GitHub Container Registry (GHCR) für Docker Images. Builds erfolgen in GitHub Actions, der Hetzner-Server pullt nur noch fertige Images.

## 📋 Benötigte GitHub Secrets

Gehe zu: **https://github.com/swholonet/core/settings/secrets/actions**

### 1. SSH_HOST
```
Name: SSH_HOST
Secret: [Deine Hetzner-Server IP oder Domain]
Beispiel: 116.203.xxx.xxx oder swholo.net
```

### 2. SSH_USERNAME
```
Name: SSH_USERNAME
Secret: root
```
Standard-User für Hetzner Root-Server.

### 3. SSH_KEY
```
Name: SSH_KEY
Secret: [Dein kompletter SSH Private Key]
```

**Private Key erstellen (falls noch nicht vorhanden):**
```bash
# Auf deinem lokalen Rechner
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy

# Public Key auf Server kopieren
ssh-copy-id -i ~/.ssh/github_deploy.pub root@DEIN-SERVER-IP

# Private Key für GitHub Secret kopieren
cat ~/.ssh/github_deploy
```

Kopiere den **kompletten** Key inkl.:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 4. SSH_PORT
```
Name: SSH_PORT
Secret: 22
```
Standard SSH-Port. Nur ändern wenn du einen anderen Port nutzt.

### 5. GHCR_TOKEN

**Wichtig:** Dies ist ein GitHub Personal Access Token (PAT) mit `write:packages` Berechtigung.

```
Name: GHCR_TOKEN
Secret: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Personal Access Token erstellen:**

1. Gehe zu: https://github.com/settings/tokens
2. Klicke "Generate new token" → "Generate new token (classic)"
3. Token-Name: `GHCR Deployment Token`
4. Wähle folgende Scopes:
   - ✅ `write:packages` (Upload packages to GitHub Package Registry)
   - ✅ `read:packages` (Download packages from GitHub Package Registry)
   - ✅ `delete:packages` (Delete packages from GitHub Package Registry)
5. Klicke "Generate token"
6. **Kopiere den Token sofort** (wird nur einmal angezeigt!)
7. Füge ihn als `GHCR_TOKEN` Secret hinzu

## 🔧 Workflow-Ablauf

### Bei jedem Push auf `main`:

1. **TypeScript Check** (Backend & Frontend)
   - Fängt Build-Fehler ab
   - Kein fehlerhafter Code wird deployed

2. **Docker Build & Push**
   - Backend-Image: `ghcr.io/swholonet/core/backend:latest`
   - Frontend-Image: `ghcr.io/swholonet/core/frontend:latest`
   - Nutzt GitHub Actions Cache für schnellere Builds

3. **Server Deployment**
   - SSH-Verbindung zum Hetzner-Server
   - Login zu GHCR mit Token
   - Pull neue Images
   - Container-Neustart
   - Prisma-Migrationen
   - Alte Images aufräumen

## 🖥️ Server-Vorbereitung

### 1. Docker & Docker Compose installieren

```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose (als Plugin)
apt-get update
apt-get install docker-compose-plugin
```

### 2. Repository clonen

```bash
cd /root/swholonet
git clone https://github.com/swholonet/core.git
cd core
```

### 3. .env.production erstellen

```bash
cp .env.production.example .env.production
nano .env.production
```

**Wichtig:** Setze sichere Passwörter:
```env
POSTGRES_PASSWORD=<sicheres-postgres-passwort>
JWT_SECRET=<generierter-jwt-secret>
CORS_ORIGIN=https://swholo.net
```

Secrets generieren:
```bash
openssl rand -base64 32  # Für JWT_SECRET
openssl rand -base64 24  # Für POSTGRES_PASSWORD
```

### 4. Script ausführbar machen

```bash
chmod +x deploy-remote.sh
```

### 5. SSH-Key autorisieren

```bash
# Auf dem Server
nano ~/.ssh/authorized_keys
# Füge deinen Public Key ein
```

### 6. Erster Deploy

**Manuell** (zum Testen):
```bash
export GHCR_TOKEN="ghp_dein_token_hier"
./deploy-remote.sh
```

## 📦 Container Images

Die Images werden automatisch zu GHCR gepusht:

- **Backend**: `ghcr.io/swholonet/core/backend:latest`
- **Frontend**: `ghcr.io/swholonet/core/frontend:latest`

Images sind **privat** und nur mit Authentication erreichbar.

### Images anzeigen

Gehe zu: https://github.com/swholonet?tab=packages

## 🔍 Troubleshooting

### Build schlägt fehl

**Ursache:** TypeScript-Fehler

**Lösung:**
```bash
# Lokal testen
cd backend && npm run build
cd ../frontend && npm run build
```

### GHCR Login schlägt fehl

**Ursache:** Falsches Token oder fehlende Berechtigung

**Prüfen:**
```bash
# Auf dem Server manuell testen
echo "ghp_dein_token" | docker login ghcr.io -u swholonet --password-stdin
```

**Lösung:**
- Token neu generieren mit `write:packages`
- GHCR_TOKEN Secret in GitHub aktualisieren

### Images können nicht gepullt werden

**Ursache:** Token fehlt auf Server

**Lösung:**
```bash
# In deploy-remote.sh ist GHCR_TOKEN vorhanden?
echo $GHCR_TOKEN
```

### Container starten nicht

**Ursache:** .env.production fehlt oder falsch

**Prüfen:**
```bash
cat /root/swholonet/core/.env.production
docker compose -f docker-compose.prod.yml config
```

### Migrationen schlagen fehl

**Ursache:** Datenbank nicht erreichbar

**Prüfen:**
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs postgres
```

**Manuell ausführen:**
```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## 🚀 Deployment auslösen

### Automatisch

```bash
git add .
git commit -m "Update feature"
git push origin main
```

GitHub Actions startet automatisch.

### Manuell

1. Gehe zu: https://github.com/swholonet/core/actions
2. Wähle "Build, Push to GHCR and Deploy"
3. Klicke "Run workflow"
4. Branch: `main`
5. Klicke "Run workflow"

## 📊 Logs anzeigen

### GitHub Actions Logs

https://github.com/swholonet/core/actions

### Server Logs

```bash
# Alle Container
docker compose -f docker-compose.prod.yml logs -f

# Nur Backend
docker compose -f docker-compose.prod.yml logs -f backend

# Nur Frontend
docker compose -f docker-compose.prod.yml logs -f frontend

# Postgres
docker compose -f docker-compose.prod.yml logs -f postgres
```

## 🔐 Sicherheit

### Images sind privat

GHCR Images sind standardmäßig privat. Nur Nutzer mit Authentication können sie pullen.

### Token-Rotation

PAT regelmäßig erneuern:
1. Neuen Token erstellen
2. `GHCR_TOKEN` Secret in GitHub updaten
3. Kein Downtime

### SSH-Key Best Practices

- Separater Deploy-Key (nicht dein persönlicher)
- Passphrase optional (für CI/CD nicht empfohlen)
- Key regelmäßig rotieren

## 🧹 Cleanup & Wartung

### Alte Images löschen

```bash
# Auf dem Server
docker image prune -a -f

# Nur ungenutzte Images
docker image prune -f
```

### Alte GHCR Images löschen

1. Gehe zu: https://github.com/swholonet?tab=packages
2. Wähle Package (backend/frontend)
3. Klicke auf alte Versionen
4. "Delete this version"

### Container-Status prüfen

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml top
```

### Speicherplatz prüfen

```bash
df -h
docker system df
```

## 📈 Performance

### Build-Cache

GitHub Actions nutzt Layer-Caching:
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

Builds dauern:
- Erster Build: ~5-10 Minuten
- Cached Builds: ~2-3 Minuten

### Image-Größen

Optimierte Multi-Stage Builds:
- Backend: ~500MB
- Frontend: ~220MB

## ✅ Checklist vor erstem Deployment

- [ ] GitHub Secrets konfiguriert (5 Stück)
- [ ] PAT mit `write:packages` erstellt
- [ ] Server hat Docker & Docker Compose
- [ ] Repository auf Server gecloned
- [ ] `.env.production` mit sicheren Passwörtern
- [ ] `deploy-remote.sh` ist ausführbar
- [ ] SSH-Key auf Server autorisiert
- [ ] Manueller Test erfolgreich
- [ ] GitHub Actions Workflow grün

## 🎉 Nächste Schritte

Nach erfolgreichem Setup:

1. **Push auf main** triggert automatisches Deployment
2. **Logs überwachen** in GitHub Actions
3. **Testen** auf https://swholo.net
4. **Monitoring** einrichten (optional)

---

**Bei Problemen:** Check GitHub Actions Logs und Server-Logs parallel!
