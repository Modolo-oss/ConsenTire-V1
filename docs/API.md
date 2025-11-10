# ConsenTide API Documentation

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

Currently, the API uses user IDs stored in localStorage for demo purposes. In production, implement proper JWT authentication.

## Endpoints

### Consent Management

#### Grant Consent

**POST** `/consent/grant`

Grant a new consent for data processing.

**Request Body:**
```json
{
  "userId": "string",
  "controllerId": "string",
  "purpose": "string",
  "dataCategories": ["string"],
  "lawfulBasis": "consent" | "contract" | "legal_obligation" | "vital_interests" | "public_task" | "legitimate_interests",
  "expiresAt": 1234567890,
  "signature": "string"
}
```

**Response:**
```json
{
  "consentId": "string",
  "hgtpTxHash": "string",
  "status": "granted",
  "expiresAt": 1234567890,
  "grantedAt": 1234567890
}
```

#### Verify Consent

**GET** `/consent/verify/:userId/:controllerId/:purpose`

Verify consent without exposing personal data (Zero-Knowledge).

**Response:**
```json
{
  "isValid": true,
  "consentId": "string",
  "zkProof": {
    "proof": "string",
    "publicSignals": ["string"],
    "circuitHash": "string"
  },
  "merkleProof": {
    "root": "string",
    "path": ["string"],
    "leaf": "string",
    "verified": true
  },
  "status": "granted"
}
```

#### Revoke Consent

**POST** `/consent/revoke/:consentId`

Revoke an existing consent.

**Request Body:**
```json
{
  "userId": "string",
  "signature": "string"
}
```

**Response:**
```json
{
  "consentId": "string",
  "status": "revoked",
  "revokedAt": 1234567890,
  "hgtpTxHash": "string"
}
```

#### Get User Consents

**GET** `/consent/user/:userId`

Get all active consents for a user.

**Response:**
```json
{
  "consents": [
    {
      "consentId": "string",
      "controllerHash": "string",
      "purposeHash": "string",
      "status": "granted",
      "grantedAt": 1234567890,
      "expiresAt": 1234567890,
      "hgtpTxHash": "string",
      "userId": "string"
    }
  ],
  "count": 1
}
```

### User Management

#### Register User

**POST** `/users/register`

Register a new user.

**Request Body:**
```json
{
  "email": "string",
  "publicKey": "string",
  "metadata": {}
}
```

**Response:**
```json
{
  "userId": "string",
  "did": "string",
  "walletAddress": "string",
  "createdAt": 1234567890
}
```

#### Get User

**GET** `/users/:userId`

Get user information.

**Response:**
```json
{
  "userId": "string",
  "did": "string",
  "walletAddress": "string",
  "createdAt": 1234567890
}
```

### Controller Management

#### Register Controller

**POST** `/controllers/register`

Register a new data controller (organization).

**Request Body:**
```json
{
  "organizationName": "string",
  "organizationId": "string",
  "publicKey": "string",
  "metadata": {}
}
```

**Response:**
```json
{
  "controllerId": "string",
  "controllerHash": "string",
  "registeredAt": 1234567890
}
```

#### Get Controller

**GET** `/controllers/:controllerId`

Get controller information.

**Response:**
```json
{
  "controllerId": "string",
  "controllerHash": "string",
  "registeredAt": 1234567890
}
```

### Compliance

#### Get Compliance Status

**GET** `/compliance/status/:controllerHash`

Get GDPR compliance status for a controller. Requires an authenticated admin token.

**Response:**
```json
{
  "controllerHash": "string",
  "gdprArticle7": true,
  "gdprArticle12": true,
  "gdprArticle13": true,
  "gdprArticle17": true,
  "gdprArticle20": true,
  "gdprArticle25": true,
  "gdprArticle30": true,
  "overallCompliance": 100,
  "lastAudit": 1234567890
}
```

#### Generate Compliance Report

**GET** `/compliance/report/:controllerHash`

Generate a detailed compliance report. Requires an authenticated admin token.

**Response:**
```json
{
"controller": {
  "organizationName": "string",
  "organizationId": "string",
  "controllerHash": "string"
},
"summary": {
  "totalConsents": 42,
  "activeConsents": 40,
  "revokedConsents": 1,
  "expiredConsents": 1
},
"metrics": {
  "complianceScore": 97.5,
  "totalConsents": 42,
  "activeConsents": 40,
  "revokedConsents": 1,
  "expiredConsents": 1,
  "lastAudit": 1700000000000
},
"recentConsents": [
  {
    "consentId": "uuid",
    "purpose": "Marketing communications",
    "status": "granted",
    "grantedAt": "2024-01-01T00:00:00.000Z",
    "hgtpTxHash": "hash"
  }
],
"auditTrail": [
  {
    "id": "uuid",
    "action": "consent_granted",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "hgtpTxHash": "hash"
  }
],
"generatedAt": 1700000000000
}
```

### Governance

#### Submit Proposal

**POST** `/governance/proposals`

Submit a privacy policy proposal.

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "proposedChanges": {
    "field": "string",
    "oldValue": "string",
    "newValue": "string",
    "justification": "string"
  },
  "creatorSignature": "string",
  "votingDeadline": 1234567890
}
```

**Response:**
```json
{
  "proposalId": "string",
  "title": "string",
  "description": "string",
  "proposedChanges": {},
  "creatorSignature": "string",
  "votingDeadline": 1234567890,
  "createdAt": 1234567890
}
```

#### Get Proposals

**GET** `/governance/proposals`

Get all active proposals.

**Response:**
```json
{
  "proposals": [],
  "count": 0
}
```

#### Get Proposal

**GET** `/governance/proposals/:proposalId`

Get proposal details with vote tally.

**Response:**
```json
{
  "proposal": {},
  "tally": {
    "proposalId": "string",
    "forVotes": 0,
    "againstVotes": 0,
    "abstainVotes": 0,
    "totalPower": 0,
    "participation": 0
  }
}
```

#### Cast Vote

**POST** `/governance/vote`

Cast a vote on a proposal.

**Request Body:**
```json
{
  "voter": "string",
  "proposalId": "string",
  "choice": "for" | "against" | "abstain",
  "votingPower": 1
}
```

**Response:**
```json
{
  "voter": "string",
  "proposalId": "string",
  "choice": "for",
  "votingPower": 1,
  "timestamp": 1234567890
}
```

## Error Responses

All endpoints may return errors in the following format:

```json
{
  "code": "ERROR_CODE",
  "message": "Error message",
  "timestamp": 1234567890,
  "details": {}
}
```

Common error codes:
- `VALIDATION_ERROR` (400): Missing or invalid request fields
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_ERROR` (500): Server error
