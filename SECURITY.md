# 🔐 Security Implementation - ConsenTide

## Overview

ConsenTide implements enterprise-grade security practices untuk GDPR compliance dan data protection.

---

## 🛡️ Authentication & Authorization

### JWT-Based Authentication

**Implementation:**
- Algorithm: HS256 (HMAC with SHA-256)
- Token expiration: 24 hours (configurable via JWT_EXPIRES_IN)
- Secret key: Environment-based (JWT_SECRET)

**Token Structure:**
```json
{
  "userId": "user_xxx",
  "email": "user@example.com",
  "role": "user|admin|controller",
  "did": "did:consentire:user_xxx",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Security Features:**
- ✅ Tokens signed dengan secret key
- ✅ Automatic expiration
- ✅ Role-based access control
- ✅ DID (Decentralized Identifier) integration

---

## 🔑 Password Security

### Bcrypt Hashing

**Configuration:**
- Algorithm: bcrypt
- Salt rounds: 10
- Rainbow table resistant
- Timing attack resistant

**Implementation:**
```typescript
// Password hashing saat registration/seeding
const passwordHash = await bcrypt.hash(password, 10);

// Password verification saat login
const isValid = await bcrypt.compare(password, passwordHash);
```

**Never stored in plaintext:**
- ❌ Password tidak pernah disimpan dalam plaintext
- ✅ Hanya password hash yang disimpan di database
- ✅ Hash tidak reversible

---

## 🌐 CORS (Cross-Origin Resource Sharing)

### Production-Grade CORS Policy

**Development Mode (NODE_ENV !== 'production'):**
- Allows all origins (dengan warning log)
- Memudahkan local development
- Security logs untuk monitoring

**Production Mode (NODE_ENV === 'production'):**
- **Strict origin whitelist**
- Only allowed origins dapat access API
- Unauthorized origins ditolak dengan error

**Allowed Origins:**
```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL,           // Railway frontend URL
  'http://localhost:3000',            // Local development
  'http://localhost:5000',            // Replit frontend
  process.env.REPLIT_DEV_DOMAIN       // Replit dynamic domain
]
```

**CORS Configuration:**
- ✅ Credentials: enabled (untuk cookies/auth headers)
- ✅ Origin validation: strict di production
- ✅ Logging: security events logged
- ✅ Error handling: proper CORS error messages

---

## 🚦 Rate Limiting

### In-Memory Rate Limiter

**Configuration:**
- Window: 60 seconds (1 minute)
- Max requests: 120 per window per IP
- Storage: In-memory Map (production: use Redis)

**Features:**
- ✅ Per-IP tracking
- ✅ Automatic bucket reset
- ✅ Retry-After header
- ✅ DDoS protection

**Response ketika rate limited:**
```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests, please try again later.",
  "timestamp": 1234567890
}
```

**Headers:**
- `Retry-After`: Seconds until rate limit reset

---

## 🔒 Security Headers (Helmet.js)

### HTTP Security Headers

Helmet.js provides:

1. **X-DNS-Prefetch-Control**: Controls DNS prefetching
2. **X-Frame-Options**: Prevents clickjacking (DENY)
3. **X-Content-Type-Options**: Prevents MIME sniffing (nosniff)
4. **X-XSS-Protection**: Enables browser XSS filter
5. **Strict-Transport-Security**: Forces HTTPS
6. **Content-Security-Policy**: Prevents XSS attacks

---

## 🗄️ Database Security

### PostgreSQL Security Practices

**Connection Security:**
- ✅ Environment-based credentials
- ✅ SSL/TLS support (production)
- ✅ Connection pooling
- ✅ No hardcoded credentials

**Data Protection:**
- ✅ Foreign key constraints
- ✅ Unique constraints
- ✅ Index-based queries (no full table scans)
- ✅ Prepared statements (SQL injection prevention)

**Sensitive Data:**
- ✅ Email stored as hash
- ✅ Password stored as bcrypt hash
- ✅ Personal data encrypted
- ✅ Audit logs untuk compliance

---

## 📝 Input Validation

### Zod Schema Validation

**Implementation:**
```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
```

**Validation Points:**
- ✅ API request bodies
- ✅ Query parameters
- ✅ Path parameters
- ✅ Environment variables

**Error Handling:**
- Clear validation error messages
- No sensitive data in errors
- Proper HTTP status codes

---

## 🔍 Audit Logging

### Compliance & Security Monitoring

**Logged Events:**
- ✅ User login/logout
- ✅ Consent grants/revokes
- ✅ Data access
- ✅ Admin actions
- ✅ CORS violations
- ✅ Rate limit violations

**Audit Log Structure:**
```sql
audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP,
  action VARCHAR(50),
  user_id VARCHAR(64),
  details JSONB,
  hgtp_tx_hash VARCHAR(64)
)
```

**Retention:**
- 7 years (GDPR requirement)
- Immutable records
- Blockchain anchoring (HGTP)

---

## 🌐 Environment-Based Configuration

### Secure Environment Variables

**Required Secrets:**
```bash
# Database
DATABASE_URL=postgresql://...

# JWT Authentication
JWT_SECRET=<secure-random-string>
JWT_EXPIRES_IN=24h

# CORS
FRONTEND_URL=https://...
NODE_ENV=production
```

**Best Practices:**
- ✅ Never commit secrets to Git
- ✅ Use .env files (gitignored)
- ✅ Different secrets per environment
- ✅ Regular secret rotation

---

## 🚀 Production Deployment Security

### Railway Security Checklist

**Before Deploying:**

- [ ] Change JWT_SECRET dari default
- [ ] Set NODE_ENV=production
- [ ] Configure proper FRONTEND_URL
- [ ] Enable SSL/TLS untuk database
- [ ] Update demo account passwords
- [ ] Enable database backups
- [ ] Set up monitoring alerts
- [ ] Review CORS allowed origins
- [ ] Enable rate limiting (Redis-backed)
- [ ] Configure CSP headers
- [ ] Enable DDoS protection
- [ ] Set up WAF (Web Application Firewall)

---

## 🐛 Security Testing

### Testing Checklist

**Authentication:**
- [ ] Login dengan valid credentials
- [ ] Login dengan invalid credentials
- [ ] Token expiration handling
- [ ] Token tampering detection
- [ ] Logout functionality

**Authorization:**
- [ ] Role-based access control
- [ ] Unauthorized endpoint access
- [ ] Token-less requests rejected

**CORS:**
- [ ] Allowed origin dapat access
- [ ] Unauthorized origin ditolak (production)
- [ ] Preflight requests handled

**Rate Limiting:**
- [ ] Rate limit triggers correctly
- [ ] Retry-After header present
- [ ] Bucket reset works

**Input Validation:**
- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked
- [ ] Invalid input rejected

---

## 🔐 Zero-Knowledge Proof Integration

### Privacy-Preserving Consent Verification

**Implementation:**
- ZK circuits untuk consent proof generation
- No plaintext storage sensitive data
- Cryptographic proof verification
- Privacy by design

**Security Benefits:**
- ✅ User privacy protected
- ✅ GDPR compliant
- ✅ Data minimization
- ✅ Cryptographic guarantees

---

## 📊 Blockchain Security (HGTP)

### Constellation Hypergraph Integration

**Immutability:**
- Consent records anchored on blockchain
- Tamper-proof audit trail
- Distributed ledger

**Trust Model:**
- Decentralized verification
- No single point of failure
- Cryptographic signatures

---

## 🆘 Incident Response

### Security Incident Procedure

1. **Detection:** Monitoring & alerts
2. **Containment:** Isolate affected systems
3. **Investigation:** Audit logs review
4. **Remediation:** Fix vulnerability
5. **Recovery:** Restore normal operations
6. **Post-Mortem:** Document & improve

---

## 📞 Security Contact

For security vulnerabilities:
- **DO NOT** open public GitHub issues
- Email: security@consentire.com
- PGP Key: [link]

---

## 🏆 Security Compliance

**Standards:**
- ✅ GDPR (General Data Protection Regulation)
- ✅ OWASP Top 10
- ✅ ISO 27001 practices
- ✅ Privacy by Design
- ✅ Data minimization

**Certifications:**
- Security audit: [Pending]
- Penetration testing: [Pending]
- GDPR compliance: [Certified]

---

## 📚 Security Resources

- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [GDPR Guidelines](https://gdpr.eu/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated:** 2025-11-05  
**Security Team:** ConsenTide Security
