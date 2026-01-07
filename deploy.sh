#!/bin/bash
set -e

echo "🚀 Star Wars - HoloNet - Build Script"
echo "===================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Schritt 1: Backend Docker Image bauen${NC}"
cd backend
docker build -t swholo-backend:latest -f ../Dockerfile.backend ..
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend erfolgreich gebaut${NC}"
else
    echo -e "${RED}❌ Backend Build fehlgeschlagen${NC}"
    exit 1
fi
cd ..

echo ""
echo -e "${YELLOW}Schritt 2: Frontend Docker Image bauen${NC}"
cd frontend
docker build -t swholo-frontend:latest -f ../Dockerfile.frontend ..
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend erfolgreich gebaut${NC}"
else
    echo -e "${RED}❌ Frontend Build fehlgeschlagen${NC}"
    exit 1
fi
cd ..

echo ""
echo -e "${GREEN}✅ Alle Images erfolgreich gebaut!${NC}"
echo ""
docker images | grep swholo
