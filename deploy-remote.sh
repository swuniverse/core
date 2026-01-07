#!/bin/bash
set -e

echo "🚀 Star Wars - HoloNet - Remote Deployment"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Prüfe ob GHCR_TOKEN gesetzt ist
if [ -z "$GHCR_TOKEN" ]; then
    echo -e "${RED}❌ Fehler: GHCR_TOKEN Umgebungsvariable nicht gesetzt${NC}"
    exit 1
fi

echo -e "${BLUE}Schritt 1: Login zu GitHub Container Registry${NC}"
echo "$GHCR_TOKEN" | docker login ghcr.io -u swholonet --password-stdin
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ GHCR Login erfolgreich${NC}"
else
    echo -e "${RED}❌ GHCR Login fehlgeschlagen${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Schritt 2: Neue Images von GHCR pullen${NC}"
docker compose -f docker-compose.prod.yml pull
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Images erfolgreich gepullt${NC}"
else
    echo -e "${RED}❌ Image Pull fehlgeschlagen${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Schritt 3: Container neu starten${NC}"
docker compose -f docker-compose.prod.yml up -d
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Container erfolgreich gestartet${NC}"
else
    echo -e "${RED}❌ Container Start fehlgeschlagen${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Schritt 4: Prisma Migrationen anwenden${NC}"
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Datenbank-Migrationen erfolgreich angewendet${NC}"
else
    echo -e "${YELLOW}⚠️  Migrationen übersprungen oder fehlgeschlagen${NC}"
fi
echo ""

echo -e "${BLUE}Schritt 5: Alte Images aufräumen${NC}"
docker image prune -f
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Alte Images entfernt${NC}"
else
    echo -e "${YELLOW}⚠️  Cleanup übersprungen${NC}"
fi
echo ""

echo -e "${GREEN}✅ Deployment erfolgreich abgeschlossen!${NC}"
echo ""
echo "Container Status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo -e "${BLUE}Logs anzeigen:${NC}"
echo "  docker compose -f docker-compose.prod.yml logs -f backend"
echo "  docker compose -f docker-compose.prod.yml logs -f frontend"
