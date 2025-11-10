#!/bin/bash

# ConsenTide Quick Setup - 48 Hour Challenge!
set -e

echo "⚡ ConsenTide Quick Setup Starting..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found! Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Install dependencies in parallel
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Shared types
echo -e "${BLUE}Installing shared dependencies...${NC}"
cd shared
npm install &
SHARED_PID=$!

# Backend
echo -e "${BLUE}Installing backend dependencies...${NC}"
cd ../backend
npm install &
BACKEND_PID=$!

# Frontend
echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd ../frontend
npm install &
FRONTEND_PID=$!

# Wait for all installations
cd ..
wait $SHARED_PID
echo -e "${GREEN}✅ Shared dependencies installed${NC}"

wait $BACKEND_PID
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

wait $FRONTEND_PID
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

# Build shared types
echo -e "${YELLOW}🔨 Building shared types...${NC}"
cd shared
npm run build
cd ..
echo -e "${GREEN}✅ Shared types built${NC}"

# Build backend
echo -e "${YELLOW}🔨 Building backend...${NC}"
cd backend
npm run build
cd ..
echo -e "${GREEN}✅ Backend built${NC}"

# Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
cd frontend
npm run build
cd ..
echo -e "${GREEN}✅ Frontend built${NC}"

# Create environment files if they don't exist
echo -e "${YELLOW}⚙️ Setting up environment files...${NC}"

# Backend .env
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/consentire_dev
REDIS_URL=redis://localhost:6379
METAGRAPH_L0_URL=http://localhost:9200
JWT_SECRET=dev-jwt-secret-$(date +%s)
FRONTEND_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ Backend .env created${NC}"
fi

# Frontend .env.local
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_METAGRAPH_URL=http://localhost:9200
NEXT_PUBLIC_ENV=development
EOF
    echo -e "${GREEN}✅ Frontend .env.local created${NC}"
fi

# Make scripts executable
chmod +x scripts/*.sh

echo ""
echo -e "${GREEN}🎉 ConsenTide Quick Setup Complete!${NC}"
echo ""
echo -e "${BLUE}🚀 To start development:${NC}"
echo ""
echo -e "${YELLOW}1. Start Backend:${NC}"
echo "   cd backend && npm run dev"
echo ""
echo -e "${YELLOW}2. Start Frontend (in new terminal):${NC}"
echo "   cd frontend && npm run dev"
echo ""
echo -e "${YELLOW}3. Deploy to Railway:${NC}"
echo "   ./scripts/deploy-railway.sh"
echo ""
echo -e "${GREEN}✨ Happy coding! Let's build the future of GDPR compliance!${NC}"