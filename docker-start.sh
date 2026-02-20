#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LA Noire NextGen - Docker Manager            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

usage() {
    echo -e "Usage: $0 {up|down|restart|logs|clean}"
    echo ""
    echo -e "  ${GREEN}up${NC}       Build and start all services"
    echo -e "  ${GREEN}down${NC}     Stop all services"
    echo -e "  ${GREEN}restart${NC}  Restart all services"
    echo -e "  ${GREEN}logs${NC}     Follow live logs"
    echo -e "  ${RED}clean${NC}    Stop all services and wipe the database"
    exit 1
}

case "${1:-up}" in
    up)
        echo -e "${YELLOW}Building and starting all services...${NC}"
        docker compose up --build -d
        echo ""
        echo -e "${GREEN}All services are running!${NC}"
        echo -e "  Frontend: ${BLUE}http://localhost:3000${NC}"
        echo -e "  Backend:  ${BLUE}http://localhost:8000${NC}"
        echo -e "  Database: ${BLUE}localhost:5432${NC}"
        echo ""
        echo -e "Run ${YELLOW}$0 logs${NC} to follow logs"
        ;;
    down)
        echo -e "${YELLOW}Stopping all services...${NC}"
        docker compose down
        echo -e "${GREEN}All services stopped.${NC}"
        ;;
    restart)
        echo -e "${YELLOW}Restarting all services...${NC}"
        docker compose down
        docker compose up --build -d
        echo -e "${GREEN}All services restarted!${NC}"
        ;;
    logs)
        docker compose logs -f
        ;;
    clean)
        echo -e "${RED}This will stop all services and DELETE the database!${NC}"
        read -p "Are you sure? (y/N) " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            docker compose down -v
            echo -e "${GREEN}All services stopped and volumes removed.${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    *)
        usage
        ;;
esac
