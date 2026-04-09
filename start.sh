#!/bin/bash

echo "Starting Deskive Platform..."
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${BLUE}Starting Infrastructure (Docker)...${NC}"

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}Created backend/.env - please update with your credentials.${NC}"
fi

docker compose --env-file .env.docker up -d postgres redis qdrant

echo -e "${BLUE}Waiting for services...${NC}"
sleep 5

timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker compose --env-file .env.docker ps | grep -q "deskive-postgres.*healthy"; then
        echo -e "${GREEN}PostgreSQL ready!${NC}"
        break
    fi
    echo -n "."
    sleep 2
    ((counter+=2))
done

echo ""
echo -e "${GREEN}Infrastructure ready:${NC}"
echo -e "   PostgreSQL: ${GREEN}localhost:5432${NC}"
echo -e "   Redis:      ${GREEN}localhost:6379${NC}"
echo -e "   Qdrant:     ${GREEN}http://localhost:6333${NC}"
echo ""

cd backend
[ ! -d "node_modules" ] && npm install
npm run migrate 2>/dev/null || true
npm run start:dev &
sleep 5
cd ..

cd frontend
[ ! -f .env ] && cp .env.example .env
[ ! -d "node_modules" ] && npm install

echo ""
echo -e "${GREEN}Starting dev servers...${NC}"
echo -e "   Backend:  ${GREEN}http://localhost:3002${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:5175${NC}"
echo ""

npm run dev
