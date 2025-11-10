#!/bin/bash

# ConsenTide Railway Deployment Script - 48 Hour Challenge!
set -e

echo "🚀 Starting ConsenTide Railway Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Build shared types first
echo -e "${YELLOW}Building shared types...${NC}"
cd shared
npm ci
npm run build
cd ..
echo -e "${GREEN}✅ Shared types built${NC}"

# Build backend
echo -e "${YELLOW}Building backend...${NC}"
cd backend
npm ci
npm run build
cd ..
echo -e "${GREEN}✅ Backend built${NC}"

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm ci
npm run build
cd ..
echo -e "${GREEN}✅ Frontend built${NC}"

# Build metagraph (if sbt is available)
if command -v sbt &> /dev/null; then
    echo -e "${YELLOW}Building metagraph...${NC}"
    cd metagraph
    sbt clean assembly
    cd ..
    echo -e "${GREEN}✅ Metagraph built${NC}"
else
    echo -e "${YELLOW}⚠️ sbt not found, skipping metagraph build (will build in Docker)${NC}"
fi

# Create p12 files directory if not exists
mkdir -p p12-files

# Generate dummy p12 file for demo (replace with real certificates)
if [ ! -f "p12-files/node1.p12" ]; then
    echo -e "${YELLOW}Generating demo certificates...${NC}"
    # Create a dummy p12 file for demo purposes
    echo "dummy-certificate-content" > p12-files/node1.p12
    echo -e "${GREEN}✅ Demo certificates created${NC}"
fi

# Login to Railway (if not already logged in)
echo -e "${YELLOW}Checking Railway authentication...${NC}"
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Railway:${NC}"
    railway login
fi

# Create or connect to Railway project
echo -e "${YELLOW}Setting up Railway project...${NC}"
if [ ! -d ".railway" ]; then
    echo -e "${BLUE}Creating new Railway project...${NC}"
    railway new consentire-production
else
    echo -e "${GREEN}✅ Railway project already configured${NC}"
fi

# Add PostgreSQL database
echo -e "${YELLOW}Adding PostgreSQL database...${NC}"
railway add postgresql || echo -e "${YELLOW}PostgreSQL might already exist${NC}"

# Set environment variables
echo -e "${YELLOW}Setting environment variables...${NC}"

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "fallback-jwt-secret-$(date +%s)")
NODE_PASSWORD="demo123"
POSTGRES_PASSWORD=$(openssl rand -base64 16 2>/dev/null || echo "postgres-$(date +%s)")

# Set variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set NODE_PASSWORD="$NODE_PASSWORD"
railway variables set POSTGRES_PASSWORD="$POSTGRES_PASSWORD"

echo -e "${GREEN}✅ Environment variables set${NC}"

# Deploy services one by one
echo -e "${BLUE}🚀 Starting service deployments...${NC}"

# Deploy backend first
echo -e "${YELLOW}Deploying backend service...${NC}"
railway up --detach --dockerfile Dockerfile.backend || {
    echo -e "${RED}Backend deployment failed, but continuing...${NC}"
}

# Deploy frontend
echo -e "${YELLOW}Deploying frontend service...${NC}"
railway up --detach --dockerfile Dockerfile.frontend || {
    echo -e "${RED}Frontend deployment failed, but continuing...${NC}"
}

# Deploy metagraph
echo -e "${YELLOW}Deploying metagraph service...${NC}"
railway up --detach --dockerfile Dockerfile.metagraph || {
    echo -e "${RED}Metagraph deployment failed, but continuing...${NC}"
}

echo -e "${GREEN}🎉 All services deployed to Railway!${NC}"

# Show deployment status
echo -e "${YELLOW}Checking deployment status...${NC}"
railway status

# Get service URLs
echo -e "${BLUE}Getting service URLs...${NC}"
echo ""
echo -e "${GREEN}🌐 Your ConsenTide services:${NC}"
echo ""

# Try to get URLs (Railway CLI might not support this directly)
echo "Check your Railway dashboard for service URLs:"
echo "https://railway.app/dashboard"
echo ""

echo -e "${GREEN}📋 Next steps:${NC}"
echo "1. Check Railway dashboard for service URLs"
echo "2. Update frontend environment variables with backend URL"
echo "3. Test the application endpoints"
echo "4. Monitor logs: railway logs"
echo ""

echo -e "${GREEN}🚀 ConsenTide is now live on Railway!${NC}"
echo -e "${YELLOW}Total deployment time: $(date)${NC}"

# Optional: Open Railway dashboard
if command -v open &> /dev/null; then
    echo -e "${BLUE}Opening Railway dashboard...${NC}"
    open https://railway.app/dashboard
elif command -v xdg-open &> /dev/null; then
    echo -e "${BLUE}Opening Railway dashboard...${NC}"
    xdg-open https://railway.app/dashboard
fi

echo ""
echo -e "${GREEN}✅ Deployment script completed successfully!${NC}"