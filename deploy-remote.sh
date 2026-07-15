#!/bin/bash
set -e

echo "Star Wars Universe - Remote Deployment"
echo "======================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$GHCR_TOKEN" ]; then
    echo -e "${RED}Fehler: GHCR_TOKEN nicht gesetzt${NC}"
    exit 1
fi

if [ ! -f .env.production ]; then
    echo -e "${RED}Fehler: .env.production nicht gefunden${NC}"
    exit 1
fi

echo -e "${BLUE}[1/6] Login zu GHCR${NC}"
echo "$GHCR_TOKEN" | docker login ghcr.io -u swuniverse --password-stdin
echo -e "${GREEN}Login erfolgreich${NC}"
echo ""

echo -e "${BLUE}[2/6] Images pullen${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production pull
echo -e "${GREEN}Images gepullt${NC}"
echo ""

echo -e "${BLUE}[3/6] Container neu starten${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
echo -e "${GREEN}Container gestartet${NC}"
echo ""

echo -e "${BLUE}[4/6] Warten auf Backend (max 60s)${NC}"
for i in $(seq 1 60); do
    if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend wget --no-verbose --tries=1 --spider http://localhost:3001/api/health 2>/dev/null; then
        echo -e "${GREEN}Backend bereit (${i}s)${NC}"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo -e "${YELLOW}Health-Check Timeout — Container laeuft weiter${NC}"
        echo "  Logs: docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend"
        break
    fi
    sleep 1
done
echo ""

echo -e "${BLUE}[5/6] Migrationen ausfuehren${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production -f docker-compose.migrate.prod.yml run --rm migrate || echo -e "${YELLOW}Migration fehlgeschlagen (manuell pruefen)${NC}"
echo ""

echo -e "${BLUE}[6/6] Alte Images aufraeumen${NC}"
docker image prune -f
echo -e "${GREEN}Cleanup done${NC}"
echo ""

docker logout ghcr.io

echo -e "${GREEN}Deployment abgeschlossen!${NC}"
echo ""
echo "Container Status:"
docker compose -f docker-compose.prod.yml --env-file .env.production ps
