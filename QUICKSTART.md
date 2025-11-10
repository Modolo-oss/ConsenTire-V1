# ConsenTide Quick Start Guide

Get up and running with ConsenTide in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn

## Quick Setup

### 1. Install Dependencies

```bash
# From project root
npm install
```

### 2. Build Shared Types

```bash
cd shared
npm run build
cd ..
```

### 3. Start Backend

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3001`

### 4. Start Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## First Steps

### 1. Visit the Dashboard

Open `http://localhost:3000` in your browser.

### 2. Grant Your First Consent

1. Click "Get Started" or navigate to `/dashboard`
2. Click "Grant New Consent"
3. Fill in the form:
   - **Controller ID**: Any organization identifier (e.g., "acme-corp")
   - **Purpose**: What the data will be used for (e.g., "Marketing communications")
   - **Lawful Basis**: Select from dropdown (default: "consent")
   - **Expiration**: Optional expiration date
4. Click "Grant Consent"

### 3. Verify Consent (Zero-Knowledge)

Use the API to verify consent without exposing personal data:

```bash
curl "http://localhost:3001/api/v1/consent/verify/<userId>/<controllerId>/<purpose>"
```

### 4. Check Compliance

1. Navigate to `/admin`
2. Enter a controller hash
3. View GDPR compliance status

## API Examples

### Register a User

```bash
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "publicKey": "pk_example"
  }'
```

### Grant Consent

```bash
curl -X POST http://localhost:3001/api/v1/consent/grant \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<userId>",
    "controllerId": "acme-corp",
    "purpose": "Marketing communications",
    "dataCategories": ["email", "name"],
    "lawfulBasis": "consent",
    "signature": "sig_example"
  }'
```

### Verify Consent (ZK)

```bash
curl "http://localhost:3001/api/v1/consent/verify/<userId>/acme-corp/Marketing%20communications"
```

### Revoke Consent

```bash
curl -X POST http://localhost:3001/api/v1/consent/revoke/<consentId> \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<userId>",
    "signature": "sig_example"
  }'
```

## Next Steps

- Read the [Full Setup Guide](./docs/SETUP.md)
- Explore [API Documentation](./docs/API.md)
- Review [Architecture](./docs/ARCHITECTURE.md)

## Troubleshooting

### Port Already in Use

Change the port in backend `.env`:
```
PORT=3002
```

And update frontend `.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Module Not Found

Rebuild shared types:
```bash
cd shared && npm run build
```

### TypeScript Errors

Restart your IDE's TypeScript server or run:
```bash
cd frontend && npm run build
```

## Support

- GitHub Issues: [Report Issues](https://github.com/consentire/consentire/issues)
- Documentation: See `/docs` directory
