# ConsenTide - GDPR Consent Dynamic Ledger

**Privacy-first GDPR consent management with real blockchain anchoring, Ed25519 cryptographic signatures, and zero-knowledge proof architecture**

Built for **Constellation x LegalTech Hackathon**

---

## 🎯 Overview

ConsenTide is a production-ready privacy-first consent ledger that enables users to grant, monitor, and revoke data-processing permissions across organizations without exposing personal data. The platform features **real blockchain anchoring** via Constellation Network's Digital Evidence API and **Ed25519 cryptographic signatures** for tamper-proof consent revocations.

### Key Features

✅ **Real Blockchain Anchoring** - Consent records immutably anchored to Constellation Network  
✅ **Ed25519 Cryptographic Signatures** - Client-side signing for consent revocations  
✅ **Zero-Knowledge Proof Architecture** - Privacy-preserving consent verification (architecture ready)  
✅ **Multi-Role Dashboards** - User, Controller/Organization, and Regulator interfaces  
✅ **Audit Trail Compliance** - Complete lifecycle tracking for GDPR compliance  
✅ **PostgreSQL Database** - Production-grade data persistence  

---

## 🏗️ System Architecture

### Technology Stack

**Frontend**
- Next.js 14 (React 18, TypeScript)
- Tailwind CSS for styling
- @noble/ed25519 for client-side cryptography
- Server-side rendering (SSR) for performance

**Backend**
- Node.js + Express.js (TypeScript)
- Native PostgreSQL driver (`pg`)
- JWT authentication with bcrypt password hashing
- Ed25519 signature verification using @noble/ed25519

**Blockchain Integration**
- **Constellation Network Digital Evidence API** (ACTIVE)
- SECP256K1_RFC8785_V1 signature algorithm
- RFC 8785 canonical JSON for deterministic hashing
- DER-encoded signatures with double-hashing (SHA-256 → SHA-512)

**Cryptography**
- Ed25519 for user consent signing (client-side generation)
- SECP256K1 for blockchain anchoring signatures
- SHA-256 hashing for controller/purpose identifiers
- bcryptjs (10 salt rounds) for password hashing

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  User       │  │  Controller  │  │    Regulator     │   │
│  │  Dashboard  │  │  Portal      │  │    Console       │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │             │
│         │   Ed25519 Signing (sessionStorage)  │             │
│         └────────────────┴────────────────────┘             │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (JWT Auth)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 API GATEWAY LAYER                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Express.js API (Port 3001)                           │  │
│  │  • JWT Authentication & RBAC Authorization            │  │
│  │  • Ed25519 Signature Verification                     │  │
│  │  • Helmet.js Security Headers                         │  │
│  │  • CORS Policy Enforcement                            │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                             │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Auth Service │  │Consent Service│  │ Crypto Service  │  │
│  │ (PostgreSQL) │  │  (PostgreSQL) │  │ (Ed25519/SECP)  │  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬────────┘  │
│         │                  │                    │           │
│         │     ┌────────────▼─────────┐          │           │
│         │     │ Blockchain Facade    │          │           │
│         │     │ ┌──────────────────┐ │          │           │
│         │     │ │DigitalEvidence   │ │ ✅ ACTIVE │           │
│         │     │ │Service           │ │          │           │
│         │     │ │(Constellation)   │ │          │           │
│         │     │ └──────────────────┘ │          │           │
│         │     │ ┌──────────────────┐ │          │           │
│         │     │ │ MockHGTPService  │ │ (Fallback)│           │
│         │     │ └──────────────────┘ │          │           │
│         │     └──────────────────────┘          │           │
└─────────┼────────────────┬────────────────────────┼─────────┘
          │                │                        │
          ▼                ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Replit Native)                           │  │
│  │  • users (DIDs, Ed25519 public keys, roles)           │  │
│  │  • auth_credentials (bcrypt password hashes)          │  │
│  │  • consents (status, blockchain TX hashes)            │  │
│  │  • controllers (organization registry)                │  │
│  │  • audit_logs (complete lifecycle tracking)           │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────┬────────────┘
                                                  │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │  Constellation Network   │
                                    │  Digital Evidence API    │
                                    │  (Immutable Ledger)      │
                                    └──────────────────────────┘
```

---

## 🔐 Cryptographic Signature Flow

### Ed25519 User Signatures

1. **Login**: Client-side keypair generation using `@noble/ed25519`
   - Private key stored in `sessionStorage` (destroyed on tab close)
   - Public key sent to backend and stored in PostgreSQL

2. **Revoke Consent**: User signs revocation request
   ```typescript
   const message = JSON.stringify({
     action: 'revoke_consent',
     consentId: '370e8010c5eda...',
     userId: 'user_57dffcf7994...',
     timestamp: 1763023786258
   })
   const signature = await signMessage(message, privateKey)
   ```

3. **Verification**: Backend verifies Ed25519 signature
   ```typescript
   const isValid = await cryptoService.verifySignature(
     message,
     signature,
     user.public_key,
     SignatureAlgorithm.ED25519
   )
   ```

### SECP256K1 Blockchain Signatures

Constellation Digital Evidence API uses SECP256K1_RFC8785_V1:
- **Canonical JSON** (RFC 8785) for deterministic payloads
- **Double-hashing**: SHA-256(payload) → hex → SHA-512 → truncate → ECDSA sign
- **DER encoding** for signature format
- **Uncompressed public keys** (04 + X + Y coordinates)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (Replit provides this)
- PostgreSQL database (Replit auto-provisions)
- Constellation Digital Evidence API credentials

### Environment Variables

Required for real blockchain anchoring:

```bash
DIGITAL_EVIDENCE_API_KEY=your_api_key
DIGITAL_EVIDENCE_ORG_ID=your_org_id
DIGITAL_EVIDENCE_TENANT_ID=your_tenant_id

DATABASE_URL=postgresql://... (auto-set by Replit)
JWT_SECRET=your_jwt_secret
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Database will auto-initialize on first run

3. Start development servers:
```bash
npm run dev
```

Frontend: `http://localhost:5000`  
Backend: `http://localhost:3001`

### Demo Accounts

```
👥 User: user@consentire.io / password123
🏢 Controller: org@consentire.io / password123
⚖️ Regulator: regulator@consentire.io / password123
```

---

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login (returns JWT + user profile)
- `POST /api/v1/auth/update-public-key` - Store Ed25519 public key
- `GET /api/v1/auth/me` - Get current user profile

### Consent Management
- `POST /api/v1/consent/grant` - Grant consent (auto-anchors to blockchain)
- `POST /api/v1/consent/revoke/:consentId` - Revoke consent (requires Ed25519 signature)
- `GET /api/v1/consent/user/me` - Get user's consents
- `GET /api/v1/consent/verify/:userId/:controllerId/:purpose` - Verify consent

### Controllers & Analytics
- `GET /api/v1/controllers/all` - List all registered controllers
- `GET /api/v1/analytics/controller/:controllerHash` - Controller analytics
- `GET /api/v1/analytics/regulator/overview` - System-wide compliance metrics

### System Status
- `GET /api/v1/status` - Blockchain mode, database status, health check

---

## 🔒 Security Considerations

### ⚠️ Hackathon Demo Limitations

**sessionStorage for Ed25519 Keys**
- Private keys stored in browser `sessionStorage` for demo purposes
- Keys destroyed when tab closes
- **NOT production-safe** - vulnerable to XSS attacks
- See [SECURITY.md](./SECURITY.md) for detailed XSS attack vectors

### Production Hardening Roadmap

- [ ] WebCrypto API non-extractable keys
- [ ] Hardware security module integration
- [ ] Content Security Policy (CSP) enforcement
- [ ] Input sanitization for XSS prevention
- [ ] Rate limiting with Redis
- [ ] Real ZK circuit compilation (Circom + snarkJS)

---

## 🧪 Testing

### Manual Testing - Consent Flow

1. **Login** as user@consentire.io
   - Ed25519 keypair generated client-side
   - Check browser console: "🔐 Signing keypair generated successfully"

2. **Grant Consent**
   - Select organization from dashboard
   - Grant consent for "Marketing Emails"
   - Consent anchored to Constellation Network
   - Verify blockchain TX hash in response

3. **Revoke Consent**
   - Click "Revoke" on active consent
   - Message signed with Ed25519 private key
   - Backend verifies signature before processing
   - Success message: "✓ Signed with Ed25519 signature"

### Verify Real Blockchain Anchoring

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@consentire.io","password":"password123"}'

# Extract token from response
TOKEN="eyJhbGc..."

curl -X POST http://localhost:3001/api/v1/consent/grant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "controllerId": "ced860bbb74328763c8b8e4f28da9a3e...",
    "purpose": "Test Purpose",
    "dataCategories": ["email"],
    "lawfulBasis": "consent"
  }'

# Response contains REAL blockchain hash:
# {"hgtpTxHash":"18c9120a3cff866391be006caa5ed7a65..."}
```

---

## 📁 Project Structure

```
consentire/
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── app/       # Page routes
│   │   ├── components/# React components
│   │   └── lib/
│   │       ├── api.ts # API client
│   │       └── crypto.ts # Ed25519 crypto utilities
│   └── package.json
│
├── backend/            # Express.js API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/
│   │   │   ├── digitalEvidenceService.ts # Constellation integration
│   │   │   ├── cryptoService.ts         # Ed25519/SECP256K1
│   │   │   ├── authService.ts           # JWT authentication
│   │   │   └── pgConsentService.ts      # Consent management
│   │   ├── middleware/# Auth, CORS, security
│   │   └── utils/     # Logging, database init
│   └── package.json
│
├── database/
│   └── schema.sql     # PostgreSQL schema
│
└── replit.md         # Architecture documentation
```

---

## 🏆 Hackathon Features

### Implemented ✅

1. **Real Blockchain Anchoring**
   - Constellation Digital Evidence API integration
   - Transaction hashes: `18c9120a3cff866391be006caa5ed7a65a33fa674ee8ea3714d7ffdad09cae97`
   - RFC 8785 canonical JSON
   - SECP256K1 signatures with DER encoding

2. **Ed25519 Cryptographic Signatures**
   - Client-side keypair generation
   - sessionStorage key management
   - Backend signature verification
   - Tamper-proof consent revocations

3. **Multi-Role Interfaces**
   - User Dashboard: Grant/revoke consents, export data
   - Controller Portal: Analytics, compliance scores
   - Regulator Console: System-wide oversight

4. **Privacy-First Design**
   - Hashed user identifiers (SHA-256)
   - ZK proof architecture (ready for Circom circuits)
   - No plaintext personal data in audit logs

### Architecture Ready 🏗️

1. **Zero-Knowledge Proofs**
   - Circom circuit structure defined
   - snarkJS integration points ready
   - Mock ZK service for demos

2. **Governance System**
   - El Paca token voting (placeholder)
   - Privacy policy proposals
   - Democratic consent rules

---

## 📚 Additional Documentation

- [SECURITY.md](./SECURITY.md) - Security disclaimers, XSS attack vectors, hardening roadmap
- [PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md) - English description for hackathon judges
- [replit.md](./replit.md) - Technical architecture and system design

---

## 🤝 Contributing

This is a hackathon project. For production use, please review [SECURITY.md](./SECURITY.md) for hardening requirements.

---

## 📜 License

MIT License - Built for Constellation x LegalTech Hackathon

---

## 🔗 Links

- **Constellation Network**: https://constellationnetwork.io
- **Digital Evidence API**: https://de-api.constellationnetwork.io
- **@noble/ed25519**: https://github.com/paulmillr/noble-ed25519

---

**Built with ❤️ for GDPR compliance and user privacy**
