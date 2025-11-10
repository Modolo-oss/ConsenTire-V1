#!/bin/bash

# ConsenTide Production Deployment Script

set -e  # Exit on error

echo "🚀 Starting ConsenTide Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create .env.production with all required environment variables."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${GREEN}✓ Environment variables loaded${NC}"

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js not found!${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker not found!${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"

# Build shared types
echo "Building shared types..."
cd shared
npm install
npm run build
cd ..

echo -e "${GREEN}✓ Shared types built${NC}"

# Build backend
echo "Building backend..."
cd backend
npm install
npm run build
cd ..

echo -e "${GREEN}✓ Backend built${NC}"

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo -e "${GREEN}✓ Frontend built${NC}"

# Run database migrations (if using direct DB connection)
echo "Checking database migrations..."
# Add your migration commands here
# Example: npm run db:migrate

# Build Docker images
echo "Building Docker images..."
docker-compose -f docker/docker-compose.prod.yml build

echo -e "${GREEN}✓ Docker images built${NC}"

# Start services
echo "Starting services..."
docker-compose -f docker/docker-compose.prod.yml up -d

echo -e "${GREEN}✓ Services started${NC}"

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Health check
echo "Running health checks..."

# Backend health check
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    exit 1
fi

# Frontend health check
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend health check passed${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Services are running:"
echo "  - Backend API: http://localhost:3001"
echo "  - Frontend: http://localhost:3000"
echo "  - Database: localhost:5432"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker/docker-compose.prod.yml logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker/docker-compose.prod.yml down"
