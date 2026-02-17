#!/bin/bash

# LA Noire NextGen - Quick Start Script
# This script automatically starts the database, backend, and frontend

set -e  # Exit on error

# Disable Homebrew auto-update
export HOMEBREW_NO_AUTO_UPDATE=1

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Log file for processes
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LA Noire NextGen - Quick Start Script      ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if PostgreSQL is running
check_postgres() {
    if command_exists pg_isready; then
        pg_isready -h localhost -p 5432 >/dev/null 2>&1
        return $?
    else
        # Alternative check using psql
        psql -h localhost -p 5432 -U postgres -c "SELECT 1" >/dev/null 2>&1
        return $?
    fi
}

# Function to start PostgreSQL
start_postgres() {
    echo -e "${YELLOW}📊 Checking PostgreSQL status...${NC}"
    
    if check_postgres; then
        echo -e "${GREEN}✓ PostgreSQL is already running${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}🚀 Starting PostgreSQL...${NC}"
    
    # Try different methods to start PostgreSQL
    if command_exists brew; then
        # macOS with Homebrew - try specific version first
        brew services start postgresql@15 2>/dev/null || \
        brew services start postgresql@14 2>/dev/null || \
        brew services start postgresql@16 2>/dev/null || \
        brew services start postgresql 2>/dev/null || true
        
        # Wait for PostgreSQL to start
        echo -e "${YELLOW}⏳ Waiting for PostgreSQL to start...${NC}"
        for i in {1..30}; do
            if check_postgres; then
                echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
                return 0
            fi
            sleep 1
        done
    elif command_exists systemctl; then
        # Linux with systemd
        sudo systemctl start postgresql
        sleep 2
        if check_postgres; then
            echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
            return 0
        fi
    elif command_exists service; then
        # Linux with service command
        sudo service postgresql start
        sleep 2
        if check_postgres; then
            echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}✗ Failed to start PostgreSQL automatically${NC}"
    echo -e "${YELLOW}Please start PostgreSQL manually and run this script again.${NC}"
    exit 1
}

# Function to check if database exists
check_database() {
    psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw lanoire_db
    return $?
}

# Function to create database if it doesn't exist
ensure_database() {
    echo -e "${YELLOW}🗃️  Checking database...${NC}"
    
    if check_database; then
        echo -e "${GREEN}✓ Database 'lanoire_db' exists${NC}"
    else
        echo -e "${YELLOW}📝 Creating database 'lanoire_db'...${NC}"
        createdb -h localhost -U postgres lanoire_db || {
            echo -e "${RED}✗ Failed to create database${NC}"
            exit 1
        }
        echo -e "${GREEN}✓ Database created successfully${NC}"
    fi
}

# Function to run Django migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    cd "$BACKEND_DIR"
    
    if [ -d "venv" ]; then
        source venv/bin/activate
    elif [ -d "../venv" ]; then
        source ../venv/bin/activate
    fi
    
    python manage.py migrate --noinput || {
        echo -e "${RED}✗ Migrations failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Migrations completed${NC}"
    cd "$PROJECT_ROOT"
}

# Function to start backend
start_backend() {
    echo -e "${YELLOW}🐍 Starting Django backend...${NC}"
    cd "$BACKEND_DIR"
    
    if [ -d "venv" ]; then
        source venv/bin/activate
    elif [ -d "../venv" ]; then
        source ../venv/bin/activate
    fi
    
    # Kill any existing Django process on port 8000
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    # Start Django in background
    nohup python manage.py runserver 8000 > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"
    
    # Wait for backend to start
    echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health/ >/dev/null 2>&1 || \
           curl -s http://localhost:8000/ >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend started successfully on http://localhost:8000${NC}"
            cd "$PROJECT_ROOT"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${GREEN}✓ Backend process started (PID: $BACKEND_PID)${NC}"
    cd "$PROJECT_ROOT"
}

# Function to start frontend
start_frontend() {
    echo -e "${YELLOW}⚛️  Starting React frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    # Kill any existing process on port 3000-3010
    for port in {3000..3010}; do
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    done
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
        npm install || {
            echo -e "${RED}✗ Failed to install dependencies${NC}"
            exit 1
        }
    fi
    
    # Start frontend in background
    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"
    
    # Wait for frontend to start
    echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3000/ >/dev/null 2>&1 || \
           curl -s http://localhost:3001/ >/dev/null 2>&1 || \
           curl -s http://localhost:3002/ >/dev/null 2>&1; then
            FRONTEND_PORT=$(lsof -ti:3000 >/dev/null 2>&1 && echo "3000" || \
                          lsof -ti:3001 >/dev/null 2>&1 && echo "3001" || \
                          lsof -ti:3002 >/dev/null 2>&1 && echo "3002" || echo "3000")
            echo -e "${GREEN}✓ Frontend started successfully on http://localhost:$FRONTEND_PORT${NC}"
            cd "$PROJECT_ROOT"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${GREEN}✓ Frontend process started (PID: $FRONTEND_PID)${NC}"
    cd "$PROJECT_ROOT"
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    
    if [ -f "$LOG_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$LOG_DIR/backend.pid")
        kill $BACKEND_PID 2>/dev/null || true
        rm "$LOG_DIR/backend.pid"
        echo -e "${GREEN}✓ Backend stopped${NC}"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$LOG_DIR/frontend.pid")
        kill $FRONTEND_PID 2>/dev/null || true
        rm "$LOG_DIR/frontend.pid"
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi
    
    echo -e "${BLUE}👋 Goodbye!${NC}"
}

# Trap Ctrl+C and other termination signals
trap cleanup EXIT INT TERM

# Main execution
main() {
    # Step 1: Start PostgreSQL
    start_postgres
    
    # Step 2: Ensure database exists
    ensure_database
    
    # Step 3: Run migrations
    run_migrations
    
    # Step 4: Start backend
    start_backend
    
    # Step 5: Start frontend
    start_frontend
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         🎉 All services are running! 🎉       ║${NC}"
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo ""
    echo -e "${BLUE}📍 Services:${NC}"
    echo -e "   Backend:  ${GREEN}http://localhost:8000${NC}"
    echo -e "   Frontend: ${GREEN}http://localhost:3000${NC} (or check ports 3001-3002)"
    echo -e "   Database: ${GREEN}localhost:5432${NC} (lanoire_db)"
    echo ""
    echo -e "${BLUE}📋 Logs:${NC}"
    echo -e "   Backend:  ${YELLOW}tail -f $LOG_DIR/backend.log${NC}"
    echo -e "   Frontend: ${YELLOW}tail -f $LOG_DIR/frontend.log${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Keep script running and show logs
    echo -e "${BLUE}════════════ Live Logs (Ctrl+C to exit) ════════════${NC}"
    tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" 2>/dev/null || {
        # If tail fails, just wait
        while true; do
            sleep 1
        done
    }
}

# Run main function
main
