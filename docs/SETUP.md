# ConsenTide Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Scala 2.13+ and sbt (for Metagraph)
- Git

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/consentire/consentire.git
cd consentire
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies (automatic with workspaces)
cd shared && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

### 4. Build Shared Types

```bash
cd shared
npm run build
```

## Development

### Start Backend API

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3001`

### Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Build Metagraph (Optional)

```bash
cd metagraph
sbt compile
```

## Production Build

### Build All Components

```bash
# From root directory
npm run build
```

### Start Production Server

```bash
# Backend
cd backend
npm run start

# Frontend
cd frontend
npm run start
```

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Metagraph Tests

```bash
cd metagraph
sbt test
```

## Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use:

1. Change `PORT` in backend `.env`
2. Change `NEXT_PUBLIC_API_URL` in frontend `.env`

### Workspace Dependencies

If workspace dependencies fail:

```bash
# Install from root
npm install

# Or install individually
cd shared && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### TypeScript Errors

If you see TypeScript errors:

1. Build shared types first: `cd shared && npm run build`
2. Restart TypeScript server in your IDE

## Next Steps

1. Review [API Documentation](./API.md)
2. Read [Architecture Documentation](./ARCHITECTURE.md)
3. Explore the [README](../README.md)

## Support

For issues or questions:
- GitHub Issues: https://github.com/consentire/consentire/issues
- Constellation Discord: https://discord.gg/constellation
