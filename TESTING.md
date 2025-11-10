# ConsenTide Testing Guide

Complete testing documentation for all three stakeholder types: **Users**, **Controllers (Organizations)**, and **Regulators**.

---

## 🚀 Quick Start

### Prerequisites
1. **Backend server running**: `npm run dev` (port 3001)
2. **Frontend server running**: Navigate to webview URL
3. **PostgreSQL database**: Auto-configured via Replit
4. **Constellation wallet**: Configured in Replit Secrets

### Demo Credentials

| Stakeholder Type | Email | Password | Role | Description |
|-----------------|-------|----------|------|-------------|
| **User/Individual** | `user@consentire.io` | `password123` | `user` | End-user managing personal data consents |
| **Controller/Organization** | `org@consentire.io` | `password123` | `controller` | Organization processing user data (GDPR controller) |
| **Regulator** | `regulator@consentire.io` | `password123` | `regulator` | Compliance auditor with system-wide access |

---

## 👤 User/Individual Testing Flow

**Goal**: Test personal consent management, privacy rights enforcement, and blockchain verification.

### Step 1: Login as User
1. Navigate to `/login`
2. Enter credentials:
   - Email: `user@consentire.io`
   - Password: `password123`
3. Click "Sign In"
4. **Expected**: Redirect to `/dashboard`

### Step 2: View Existing Consents
1. On dashboard, locate "My Consents" section
2. **Expected**: See list of granted consents with:
   - Organization names
   - Purpose (e.g., "Newsletter Marketing", "Health Records Access")
   - Status badges (Granted/Active)
   - Grant dates
   - Blockchain transaction hashes (starting with `hgtp_tx_`)

### Step 3: Grant New Consent
1. Click "Grant New Consent" button
2. Fill out consent form:
   - **Organization**: Select from dropdown (e.g., "TechCorp Analytics")
   - **Purpose**: Enter purpose (e.g., "Product Analytics")
   - **Data Categories**: Select checkboxes (e.g., "Usage Data", "Device Info")
   - **Lawful Basis**: Select "Consent" or "Legitimate Interest"
   - **Expires At**: (Optional) Set expiration date
3. Click "Grant Consent"
4. **Expected**:
   - Success message: "Consent granted successfully"
   - New consent appears in list
   - Blockchain transaction hash visible
   - Status: "Granted"

### Step 4: Verify Blockchain Anchoring
1. Locate any consent with `hgtp_tx_hash`
2. Copy transaction hash (e.g., `hgtp_tx_162bde02abfe30bbca1bdf6949e22d6e`)
3. Visit: `https://explorer.constellationnetwork.io/transaction/{hash}`
4. **Expected**:
   - Transaction appears on Constellation Mainnet explorer
   - Shows timestamp, block height, and transaction data

### Step 5: Revoke Consent
1. Find an active consent in your list
2. Click "Revoke" or "Withdraw Consent" button
3. Confirm revocation in modal dialog
4. **Expected**:
   - Status changes to "Revoked"
   - Revocation timestamp recorded
   - Audit trail created (immutable record retained)
   - Organization loses data processing permission

### Step 6: View Audit Trail
1. Click on any consent to expand details
2. Navigate to "Activity Log" or "Audit Trail" tab
3. **Expected**: See chronological events:
   - `consent_granted` - Initial grant timestamp
   - `consent_verified` - Verification requests from organizations
   - `consent_revoked` - Revocation event (if applicable)
   - Each event shows timestamp and HGTP transaction hash

---

## 🏢 Controller/Organization Testing Flow

**Goal**: Test GDPR compliance dashboard, consent verification, and analytics.

### Step 1: Login as Controller
1. Navigate to `/login`
2. Enter credentials:
   - Email: `org@consentire.io`
   - Password: `password123`
3. Click "Sign In"
4. **Expected**: Redirect to `/compliance` dashboard

### Step 2: View Compliance Overview
1. Locate "Compliance Score" widget
2. **Expected**: See metrics:
   - **Compliance Score**: Percentage (e.g., 87%)
   - **Active Consents**: Number of valid user consents
   - **Pending Requests**: Consent requests awaiting user approval
   - **Revoked This Month**: Number of recent revocations

### Step 3: View Active Consents
1. Navigate to "Active Consents" table
2. **Expected**: See list with columns:
   - **User ID**: Hashed user identifier (privacy-preserved)
   - **Purpose**: Data processing purpose
   - **Status**: Active/Granted
   - **Granted Date**: Timestamp
   - **Expires**: Expiration date (if set)
   - **Actions**: Verify button

### Step 4: Verify User Consent (API Test)
1. Open terminal/Postman
2. Get JWT token by logging in via API:
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "org@consentire.io",
       "password": "password123"
     }'
   ```
3. Copy `accessToken` from response
4. Verify consent:
   ```bash
   curl -X GET "http://localhost:3001/api/v1/consent/verify/{userId}/{controllerId}/{purpose}" \
     -H "Authorization: Bearer {YOUR_TOKEN}"
   ```
5. **Expected Response**:
   ```json
   {
     "isValid": true,
     "status": "granted",
     "grantedAt": 1699876543210,
     "expiresAt": null,
     "zkProof": { ... }
   }
   ```

### Step 5: View Analytics Dashboard
1. Navigate to "Analytics" tab on `/compliance`
2. **Expected**: See charts/graphs:
   - **Consent Trends**: Line chart showing grants/revocations over time
   - **Purpose Breakdown**: Pie chart of consent purposes
   - **Data Category Usage**: Bar chart of requested data types
   - **Geographic Distribution**: (If applicable) Map of user locations

### Step 6: Test Consent Expiration
1. Locate consent with `expires_at` date in the past
2. Attempt to verify expired consent via API
3. **Expected**:
   - Status automatically updated to "expired"
   - `isValid: false` in verification response
   - Organization notified of expiration

### Step 7: Request New Consent
1. Click "Request Consent" button
2. Fill out request form:
   - **User Email/ID**: Target user
   - **Purpose**: "Payment Processing"
   - **Data Categories**: ["Financial Data", "Contact Info"]
   - **Lawful Basis**: "Contract"
3. Submit request
4. **Expected**:
   - Request sent to user's dashboard
   - Status: "Pending" until user grants
   - Notification sent to user

---

## 🔍 Regulator Testing Flow

**Goal**: Test system-wide compliance monitoring, governance, and audit capabilities.

### Step 1: Login as Regulator
1. Navigate to `/login`
2. Enter credentials:
   - Email: `regulator@consentire.io`
   - Password: `password123`
3. Click "Sign In"
4. **Expected**: Redirect to `/regulator` dashboard

### Step 2: View System-Wide Metrics
1. Locate "Regulatory Overview" panel
2. **Expected**: See aggregated metrics:
   - **Total Consents**: All consents across all organizations
   - **Active Organizations**: Registered data controllers
   - **Compliance Violations**: GDPR breaches detected
   - **Audit Requests**: Pending regulatory audits

### Step 3: Monitor Organization Compliance
1. Navigate to "Organizations" table
2. **Expected**: See list with:
   - **Organization Name**
   - **Compliance Score**: 0-100%
   - **Active Consents**: Count
   - **Violations**: Number of detected issues
   - **Last Audit**: Date of most recent audit
   - **Actions**: "Audit" button

### Step 4: Conduct Compliance Audit
1. Select an organization from list
2. Click "Conduct Audit" button
3. **Expected**: Audit report generated with:
   - **Consent Coverage**: % of data processing with valid consents
   - **Expired Consents**: List of expired/invalid permissions
   - **Data Breach Risk**: Assessment of compliance gaps
   - **Recommendations**: Suggested remediation actions

### Step 5: View Global Consent Trends
1. Navigate to "Analytics" tab
2. **Expected**: See system-wide visualizations:
   - **Consent Volume**: Total grants/revocations over time
   - **Top Organizations**: Leaderboard by consent count
   - **Purpose Distribution**: Most common processing purposes
   - **Revocation Rate**: % of consents withdrawn

### Step 6: Test Governance Voting
1. Navigate to "Governance" section
2. Click "Create Proposal" (if permitted)
3. Fill proposal form:
   - **Title**: "Update Data Retention Policy"
   - **Description**: Policy change details
   - **Type**: "policy_update"
4. Submit proposal
5. **Expected**:
   - Proposal appears in governance list
   - Status: "Active"
   - Voting period starts
   - El Paca token holders can vote

### Step 7: Vote on Governance Proposal
1. Find active proposal in list
2. Click "Vote" button
3. Select option: "For", "Against", or "Abstain"
4. Submit vote
5. **Expected**:
   - Vote recorded on blockchain
   - Vote count updated in real-time
   - Weighted by El Paca token holdings

### Step 8: Export Audit Report
1. Navigate to "Reports" section
2. Select date range (e.g., "Last 30 Days")
3. Click "Export Compliance Report"
4. **Expected**:
   - CSV/PDF file downloaded
   - Contains: All consents, violations, and audit trails
   - Cryptographically signed for legal validity

---

## ⛓️ Blockchain Verification

### Verify HGTP Transaction on Constellation Mainnet

1. **Get Transaction Hash** from any consent:
   ```bash
   curl -X GET "http://localhost:3001/api/v1/consent/list/user_io_user_002" \
     -H "Authorization: Bearer {TOKEN}"
   ```
   Response includes: `"hgtpTxHash": "hgtp_tx_162bde02abfe30bbca1bdf6949e22d6e"`

2. **Check Mainnet Explorer**:
   - URL: `https://explorer.constellationnetwork.io/transaction/hgtp_tx_162bde02abfe30bbca1bdf6949e22d6e`
   - **Expected**: Transaction details visible on Constellation Mainnet

3. **Verify Merkle Proof**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/hgtp/verify-merkle \
     -H "Content-Type: application/json" \
     -d '{
       "consentId": "consent_1007",
       "hgtpTxHash": "hgtp_tx_162bde02abfe30bbca1bdf6949e22d6e"
     }'
   ```
   **Expected Response**:
   ```json
   {
     "isValid": true,
     "merkleRoot": "0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385",
     "proof": ["0x...", "0x..."],
     "verified": true
   }
   ```

### Understand Wallet Architecture

**Enterprise Wallet Model**:
- **All transactions signed by single Constellation wallet** (stored in Replit Secrets)
- **Environment Variables**:
  - `CONSTELLATION_WALLET_ADDRESS`: Public wallet address
  - `CONSTELLATION_PRIVATE_KEY`: Ed25519 signing key
  - `CONSTELLATION_PUBLIC_KEY`: Verification key
- **Why Enterprise Wallet?**
  - Users don't need crypto wallets (just email/password)
  - GDPR compliance: System manages blockchain anchoring
  - Similar to Stripe (1 account for all transactions)

**Deployment Portability**:
- Same credentials work on Railway, Vercel, Docker
- Just set environment variables on new platform
- No code changes required

---

## 🧪 API Testing

### Authentication

**Register New User**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "role": "user"
  }'
```

**Login**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@consentire.io",
    "password": "password123"
  }'
```

**Expected Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_io_user_002",
    "email": "user@consentire.io",
    "role": "user"
  }
}
```

### Consent Management

**Grant Consent**:
```bash
curl -X POST http://localhost:3001/api/v1/consent/grant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "controllerId": "ORG_001",
    "purpose": "Product Analytics",
    "lawfulBasis": "consent",
    "dataCategories": ["usage_data", "device_info"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

**Expected Response**:
```json
{
  "consentId": "consent_abc123",
  "hgtpTxHash": "hgtp_tx_162bde02abfe30bbca1bdf6949e22d6e",
  "status": "granted",
  "grantedAt": 1699876543210,
  "expiresAt": 1735689599000
}
```

**Verify Consent**:
```bash
curl -X GET "http://localhost:3001/api/v1/consent/verify/user_io_user_002/ORG_001/Product%20Analytics" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Revoke Consent**:
```bash
curl -X POST http://localhost:3001/api/v1/consent/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "consentId": "consent_abc123",
    "reason": "No longer need this service"
  }'
```

### Controller Analytics

**Get Compliance Score**:
```bash
curl -X GET http://localhost:3001/api/v1/controller/analytics/compliance-score \
  -H "Authorization: Bearer {CONTROLLER_TOKEN}"
```

**Expected Response**:
```json
{
  "complianceScore": 87.5,
  "activeConsents": 245,
  "expiredConsents": 12,
  "revokedThisMonth": 8,
  "lastAudit": "2025-11-01T10:30:00Z"
}
```

**Get Consent Trends**:
```bash
curl -X GET "http://localhost:3001/api/v1/controller/analytics/trends?startDate=2025-10-01&endDate=2025-11-06" \
  -H "Authorization: Bearer {CONTROLLER_TOKEN}"
```

### Governance

**List Proposals**:
```bash
curl -X GET http://localhost:3001/api/v1/governance/proposals \
  -H "Authorization: Bearer {TOKEN}"
```

**Vote on Proposal**:
```bash
curl -X POST http://localhost:3001/api/v1/governance/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "proposalId": "proposal_001",
    "vote": "for",
    "tokenAmount": 100
  }'
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Consent grant fails with validation error"
- **Cause**: Missing required fields (`lawfulBasis`, `dataCategories`)
- **Fix**: Ensure all fields present in request body
- **Check**: Backend logs for specific validation errors

**Issue**: "Blockchain transaction not appearing on explorer"
- **Cause**: Constellation network delay (1-2 minutes for mainnet confirmation)
- **Fix**: Wait 2-3 minutes, then refresh explorer page
- **Verify**: Check `anchoring_timestamp` in database

**Issue**: "Controller cannot see user consents"
- **Cause**: Organization not registered in `controllers` table
- **Fix**: Register organization first:
  ```bash
  curl -X POST http://localhost:3001/api/v1/controller/register \
    -H "Content-Type: application/json" \
    -d '{
      "organizationId": "ORG_001",
      "organizationName": "TechCorp Analytics",
      "contactEmail": "admin@techcorp.com"
    }'
  ```

**Issue**: "JWT token expired"
- **Cause**: Token expiration (default: 24 hours)
- **Fix**: Login again to get new token
- **Check**: Token payload: `jwt.verify(token, JWT_SECRET)`

### Verify Workflow Status

Check if servers are running:
```bash
ps aux | grep node
```

Expected output:
- Backend process on port 3001
- Frontend process on port 5000

Restart workflows if needed:
```bash
npm run dev
```

### Database Queries for Debugging

**Check existing consents**:
```sql
SELECT consent_id, user_id, controller_hash, status, granted_at, hgtp_tx_hash 
FROM consents 
WHERE user_id = 'user_io_user_002' 
ORDER BY granted_at DESC 
LIMIT 10;
```

**Check controller registration**:
```sql
SELECT organization_id, organization_name, controller_hash 
FROM controllers;
```

**Check audit logs**:
```sql
SELECT consent_id, action, created_at, hgtp_tx_hash, details 
FROM audit_logs 
WHERE consent_id = 'consent_1007' 
ORDER BY created_at DESC;
```

**Check governance proposals**:
```sql
SELECT proposal_id, title, status, vote_for, vote_against, created_at 
FROM governance_proposals 
ORDER BY created_at DESC;
```

### Check Constellation Connection

Test HGTP service connectivity:
```bash
curl -X GET http://localhost:3001/api/v1/health/constellation
```

Expected response:
```json
{
  "status": "connected",
  "network": "mainnet",
  "l0Url": "https://l0-lb-mainnet.constellationnetwork.io",
  "l1Url": "https://l1-lb-mainnet.constellationnetwork.io",
  "walletAddress": "DAG..."
}
```

---

## ✅ Success Criteria

### User Testing Complete When:
- [x] Can login and view dashboard
- [x] Can grant new consent with blockchain anchoring
- [x] Can see HGTP transaction hash in UI
- [x] Can verify transaction on Constellation explorer
- [x] Can revoke consent and see status change
- [x] Audit trail shows all consent lifecycle events

### Controller Testing Complete When:
- [x] Can login and view compliance dashboard
- [x] Compliance score calculated correctly
- [x] Active consents listed with user privacy preserved
- [x] Can verify user consent via API
- [x] Analytics charts display trends
- [x] Can request new consent from users

### Regulator Testing Complete When:
- [x] Can login and view system-wide metrics
- [x] Can monitor all organization compliance scores
- [x] Can conduct audits and generate reports
- [x] Global analytics show accurate trends
- [x] Governance proposals visible and votable
- [x] Can export compliance reports for legal use

---

## 📊 Demo Data

The system includes pre-seeded demo data:

**Users**: 3 stakeholder accounts (user, org, regulator)
**Controllers**: 2 registered organizations
**Consents**: 5+ blockchain-anchored consent records
**Proposals**: 1 active governance proposal

All demo accounts use password: `password123`

---

## 🎥 Hackathon Demo Checklist

For Constellation x LegalTech Hackathon submission:

- [ ] Record 2-minute demo video showing all three stakeholder flows
- [ ] Show blockchain verification on Constellation explorer
- [ ] Demonstrate GDPR compliance features (consent, revocation, audit)
- [ ] Highlight enterprise wallet model (no crypto knowledge needed)
- [ ] Show analytics and governance features
- [ ] Mention deployment portability (env vars, not hardcoded)
- [ ] Submit to hackathon portal with demo video link

**Target Prizes**:
- Best RegTech Tool ($3,000)
- Most Impactful Public Interest App ($1,000)

---

## 🔗 Resources

- **Constellation Explorer**: https://explorer.constellationnetwork.io
- **API Documentation**: See `/api/v1/docs` (if Swagger enabled)
- **Replit.md**: Architecture and system design documentation
- **README.md**: Deployment and setup instructions

---

**Last Updated**: November 6, 2025
