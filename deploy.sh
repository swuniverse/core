#!/bin/bash
set -e

echo "🚀 Star Wars Universe - VPS Deployment Script"
echo "=============================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Überprüfe ob .env.production existiert
if [ ! -f .env.production ]; then
    echo -e "${RED}ERROR: .env.production nicht gefunden!${NC}"
    echo "Kopiere .env.production.example zu .env.production und fülle die Werte aus:"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production"
    exit 1
fi

# Lade Environment Variables
export $(grep -v '^#' .env.production | xargs)

echo -e "${YELLOW}Schritt 1: Docker Container stoppen (falls vorhanden)${NC}"
docker-compose -f docker-compose.prod.yml down

echo ""
echo -e "${YELLOW}Schritt 2: Docker Images bauen${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo ""
echo -e "${YELLOW}Schritt 3: Container starten${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${YELLOW}Schritt 4: Warte auf Datenbank (10 Sekunden)${NC}"
sleep 10

echo ""
echo -e "${YELLOW}Schritt 5: Datenbank initialisieren${NC}"
echo "Führe Migrations aus..."
docker exec swu-backend npx prisma migrate deploy

echo ""
echo -e "${YELLOW}Schritt 6: Seeding (Fraktionen, Gebäude, Forschung, Schiffe, Galaxie)${NC}"
read -p "Möchtest du die Datenbank mit Seed-Daten füllen? (j/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Jj]$ ]]; then
    docker exec swu-backend npm run db:reset
fi

echo ""
echo -e "${GREEN}✅ Deployment abgeschlossen!${NC}"
echo ""
echo "Services:"
echo "  Frontend:  http://$(hostname -I | awk '{print $1}')/"
echo "  Backend:   http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Logs anzeigen:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Container neustarten:"
echo "  docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "Container stoppen:"
echo "  docker-compose -f docker-compose.prod.yml down"
