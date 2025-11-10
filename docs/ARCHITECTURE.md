# ConsenTide Architecture Documentation

## System Overview

ConsenTide is a three-layer architecture built on Constellation's Hypergraph for immutable GDPR consent management.

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│                  Front-End UI                   │
│  (User Dashboard • Admin Console • API Gateway) │
├─────────────────────────────────────────────────┤
│  ConsenTide Metagraph (Custom Logic + Token)    │
│  ├─ Consent State Engine                        │
│  ├─ ZKP Verification Service                    │
│  ├─ El Paca Governance Module                   │
│  └─ Cross‑Platform API Adapter                  │
├─────────────────────────────────────────────────┤
│         HGTP (Immutable Consent Ledger)         │
│  ├─ Hash‑chained consent records                │
│  ├─ Zero‑knowledge proof anchoring              │
│  └─ Cross‑chain verification endpoints          │
└─────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (Next.js + React)

**Location:** `frontend/`

**Technologies:**
- Next.js 14
- React 18
- Tailwind CSS
- TypeScript

**Features:**
- User dashboard for consent management
- Admin console for compliance monitoring
- Real-time consent status visualization
- Mobile-responsive design

### 2. Backend API Gateway (Node.js + Express)

**Location:** `backend/`

**Technologies:**
- Node.js
- Express.js
- TypeScript
- Winston (logging)

**Services:**
- `consentService.ts` - Core consent business logic
- `hgtpService.ts` - HGTP anchoring service
- `zkService.ts` - Zero-knowledge proof generation

**Routes:**
- `/api/v1/consent` - Consent management
- `/api/v1/users` - User registration
- `/api/v1/controllers` - Controller registration
- `/api/v1/compliance` - GDPR compliance status
- `/api/v1/governance` - El Paca token governance

### 3. Metagraph (Scala L0 Framework)

**Location:** `metagraph/`

**Technologies:**
- Scala 2.13
- Constellation L0 Framework (TODO: integrate)

**Modules:**
- `ConsentEngine.scala` - Consent state machine
- `HGTPConsentAnchor.scala` - HGTP anchoring logic
- `ElPacaGovernance.scala` - Token governance

**Features:**
- Immutable consent state management
- Zero-knowledge proof generation
- HGTP transaction handling
- El Paca token voting

### 4. Shared Types

**Location:** `shared/`

**Purpose:**
- TypeScript types shared across frontend and backend
- GDPR compliance enums and interfaces
- API request/response types

## Data Flow

### Consent Grant Flow

1. User submits consent via frontend
2. Frontend sends request to backend API
3. Backend validates and processes consent
4. Backend generates ZK proof
5. Backend anchors consent to HGTP via Metagraph
6. HGTP transaction hash returned to user
7. Consent stored in Metagraph state

### Consent Verification Flow

1. Controller requests consent verification
2. Backend queries Metagraph for consent
3. Metagraph generates ZK proof (no personal data)
4. Merkle proof generated from HGTP
5. Verification result returned (boolean + proofs)
6. No personal data exposed to controller

### Consent Revocation Flow

1. User requests revocation via frontend
2. Backend validates user ownership
3. Metagraph updates consent status
4. HGTP transaction created for revocation
5. Connected systems notified via webhook
6. API access immediately revoked

## Privacy & Security

### Zero-Knowledge Proofs

- Consent verification without exposing personal data
- SNARK-based proofs (Circom/snarkJS)
- Public signals contain only hashes

### Data Storage

- Personal data: Never stored on-chain
- Consent metadata: Hashed and anchored to HGTP
- User data: Encrypted on user's device or IPFS

### Immutability

- All consent actions anchored to HGTP
- Merkle tree for efficient verification
- Unbreakable audit trail

## Integration Points

### HGTP Integration

- Transaction submission
- Merkle proof generation
- Query capabilities

### ZK Circuit Integration

- Consent eligibility proofs
- Verification proofs
- Privacy-preserving operations

### El Paca Token Integration

- Governance voting
- Token balance checking
- Voting power calculation

## Future Enhancements

1. **Real HGTP Client:** Replace simulated HGTP service with actual Constellation SDK
2. **ZK Circuit Implementation:** Implement actual Circom circuits for proofs
3. **Persistent Storage:** Replace in-memory stores with database
4. **Authentication:** Implement JWT-based authentication
5. **Webhook System:** Real-time notifications for consent changes
6. **IPFS Integration:** Store encrypted personal data on IPFS
7. **Multi-chain Support:** Extend to other blockchain networks

## Performance Targets

- 10,000+ consent operations/second (Metagraph scaling)
- <100ms verification time (ZK proof optimization)
- 99.9% uptime (Constellation consensus)
- $0.001 per consent verification (micro-payments)

## Deployment

### Development

```bash
# Install dependencies
npm install

# Run backend
cd backend && npm run dev

# Run frontend
cd frontend && npm run dev
```

### Production

- Backend: Deploy to cloud (AWS, GCP, Azure)
- Frontend: Deploy to Vercel or similar
- Metagraph: Deploy L0 nodes on Constellation network
- Database: PostgreSQL or MongoDB for persistent storage
