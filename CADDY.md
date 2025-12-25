# Caddyfile Dokumentation

## Übersicht

Das `Caddyfile` im Projekt-Root ist eine fertige Reverse-Proxy-Konfiguration für Production-Deployment auf einem VPS/Server.

## Features

- ✅ **Automatisches HTTPS** mit Let's Encrypt (keinerlei manuelle SSL-Konfiguration)
- ✅ **Automatische Zertifikat-Erneuerung** (Caddy managed das vollständig)
- ✅ **HTTP/2 und HTTP/3** Support (automatisch aktiviert)
- ✅ **Gzip & Zstd Compression** (automatisch)
- ✅ **Security Headers** (HSTS, X-Frame-Options, X-XSS-Protection, etc.)
- ✅ **WebSocket Support** für Socket.io
- ✅ **JSON Access Logs** in `/var/log/caddy/swu-access.log`

## Verwendung

### 1. Domain anpassen

Öffne `Caddyfile` und ändere die erste Zeile:

```caddy
# Von:
deine-domain.com {

# Zu deiner echten Domain:
starwars-game.example.com {
```

### 2. Auf Server kopieren

```bash
sudo cp Caddyfile /etc/caddy/Caddyfile
```

### 3. Konfiguration validieren

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

### 4. Caddy starten/neu laden

```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
```

### 5. Status prüfen

```bash
sudo systemctl status caddy
```

## Was macht die Konfiguration?

### Frontend (React SPA)

```caddy
handle {
    reverse_proxy localhost:8080
}
```

- Alle Requests (die nicht von anderen Handles gefangen werden) gehen zum Frontend
- Frontend Container läuft auf `127.0.0.1:8080`
- Caddy leitet Traffic von Port 443 (HTTPS) weiter

### Backend API

```caddy
handle /api/* {
    reverse_proxy localhost:3000
}
```

- Alle `/api/*` Requests gehen zum Backend
- Backend Container läuft auf `127.0.0.1:3000`

### Socket.io WebSockets

```caddy
handle /socket.io/* {
    reverse_proxy localhost:3000 {
        header_up Upgrade {http.request.header.Upgrade}
        header_up Connection {http.request.header.Connection}
    }
}
```

- WebSocket-Verbindungen für Echtzeit-Updates
- Spezielle Header für WebSocket-Upgrade
- Leitet zu Backend auf Port 3000

### Health Check

```caddy
handle /health {
    reverse_proxy localhost:3000
}
```

- Öffentlicher Health-Check Endpoint
- Für Monitoring und Load Balancer

## Sicherheit

### Aktivierte Security Headers

```caddy
header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Frame-Options "SAMEORIGIN"
    X-Content-Type-Options "nosniff"
    X-XSS-Protection "1; mode=block"
    Referrer-Policy "strict-origin-when-cross-origin"
}
```

- **HSTS**: Erzwingt HTTPS für 1 Jahr
- **X-Frame-Options**: Verhindert Clickjacking
- **X-Content-Type-Options**: Verhindert MIME-Type Sniffing
- **X-XSS-Protection**: Browser XSS-Filter
- **Referrer-Policy**: Kontrolliert Referrer-Header

### Container-Isolation

- Docker Container binden nur auf `127.0.0.1` (localhost)
- Kein direkter externer Zugriff auf Backend/Frontend
- Alle Requests müssen durch Caddy (Reverse Proxy)

## Logs

### Access Logs

```bash
sudo tail -f /var/log/caddy/swu-access.log
```

Format: JSON (maschinenlesbar)

### Error Logs

```bash
sudo journalctl -u caddy -f
```

## Troubleshooting

### Port 443 bereits belegt

```bash
# Prüfe was auf Port 443 läuft
sudo lsof -i :443

# Stoppe anderen Webserver (z.B. Apache)
sudo systemctl stop apache2
```

### Let's Encrypt Fehler

```bash
# Prüfe Logs
sudo journalctl -u caddy --no-pager | tail -50

# Häufige Ursachen:
# - Domain zeigt nicht auf Server-IP (DNS Check)
# - Firewall blockiert Port 80/443
# - Rate Limit von Let's Encrypt erreicht
```

### Reload ohne Downtime

```bash
# Caddy reloaded gracefully (0 downtime)
sudo systemctl reload caddy
```

## Vergleich: Caddy vs Nginx

| Feature | Caddy | Nginx |
|---------|-------|-------|
| Automatisches HTTPS | ✅ Ja | ❌ Nein (certbot nötig) |
| Zertifikat-Erneuerung | ✅ Automatisch | ⚠️ Cronjob nötig |
| Konfiguration | ✅ Einfach | ⚠️ Komplex |
| HTTP/3 | ✅ Standard | ⚠️ Extra Module |
| JSON Logs | ✅ Eingebaut | ⚠️ Extra Config |
| Reload | ✅ Graceful | ✅ Graceful |

## Erweiterte Konfiguration

### Mehrere Domains

```caddy
starwars-game.com, www.starwars-game.com {
    # ... config ...
}
```

### Staging/Test-Server

```caddy
staging.starwars-game.com {
    # Eigene Backend-Ports
    handle /api/* {
        reverse_proxy localhost:3001
    }
    handle {
        reverse_proxy localhost:8081
    }
}
```

### Rate Limiting

```caddy
rate_limit {
    zone {
        key {remote_host}
        events 100
        window 1m
    }
}
```

### Basic Auth (Admin-Bereich)

```caddy
handle /admin/* {
    basicauth {
        admin $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG
    }
    reverse_proxy localhost:3000
}
```

## Installation auf frischem Server

Vollständige Anleitung in [DEPLOYMENT.md](DEPLOYMENT.md) Abschnitt "Reverse Proxy Setup".

Kurzversion:

```bash
# 1. Caddy installieren
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 2. Domain in Caddyfile anpassen
nano Caddyfile

# 3. Caddyfile kopieren
sudo cp Caddyfile /etc/caddy/Caddyfile

# 4. Validieren & Starten
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
sudo systemctl enable caddy
```

## Weitere Ressourcen

- [Caddy Dokumentation](https://caddyserver.com/docs/)
- [Caddyfile Syntax](https://caddyserver.com/docs/caddyfile)
- [Reverse Proxy Guide](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
