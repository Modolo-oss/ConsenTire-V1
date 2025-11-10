// Shared TypeScript types for ConsenTide project
// This file provides common interfaces and types used across frontend, backend, and metagraph

export enum LegalBasis {
  CONSENT = "consent",
  CONTRACT = "contract",
  LEGAL_OBLIGATION = "legal_obligation",
  VITAL_INTERESTS = "vital_interests",
  PUBLIC_TASK = "public_task",
  LEGITIMATE_INTERESTS = "legitimate_interests"
}

export enum ConsentStatus {
  GRANTED = "granted",
  REVOKED = "revoked",
  EXPIRED = "expired",
  PENDING = "pending"
}

export enum VoteChoice {
  FOR = "for",
  AGAINST = "against",
  ABSTAIN = "abstain"
}

/**
 * Immutable consent record stored on HGTP
 */
export interface ConsentRecord {
  // Immutable Identity (hashed, not stored directly)
  consentId: string;          // SHA-256 of (userId + purpose + timestamp)
  controllerHash: string;     // SHA-256 of organization identifier
  
  // Consent Details (encrypted)
  purposeHash: string;        // SHA-256 of data processing purpose
  dataCategories: string[];   // Encrypted array of data types
  lawfulBasis: LegalBasis;    // Article 6 GDPR lawful basis
  
  // Temporal Constraints
  grantedAt: number;          // Unix timestamp
  expiresAt?: number;         // Optional expiration
  lastAccessed: number;       // For audit
  
  // Zero-Knowledge Proof
  zkProof: ZKProof;          // SNARK proof of consent validity
  
  // HGTP Anchoring
  hgtpTxHash: string;        // Transaction hash on Hypergraph
  merkleRoot: string;        // Root of consent ledger merkle tree
}

/**
 * Zero-knowledge proof structure
 */
export interface ZKProof {
  proof: string;             // SNARK proof string
  publicSignals: string[];   // Public signals for verification
  circuitHash: string;       // Hash of the ZK circuit used
}

/**
 * ZK Verification result (no personal data exposed)
 */
export interface ZKVerificationResult {
  isValid: boolean;
  consentId: string;
  proof: ZKProof;
  hgtpMerkleProof: MerkleProof;
  purposeMatch: boolean;
  temporalValid: boolean;
}

/**
 * Merkle proof for HGTP verification
 */
export interface MerkleProof {
  root: string;
  path: string[];
  leaf: string;
  verified: boolean;
}

/**
 * Consent state for Metagraph
 */
export interface ConsentState {
  consentId: string;
  controllerHash: string;
  purposeHash: string;
  status: ConsentStatus;
  grantedAt: number;
  expiresAt?: number;
  hgtpTxHash: string;
  userId: string;            // Hashed user identifier
}

/**
 * Request to grant consent
 */
export interface ConsentGrantRequest {
  userId: string;
  controllerId: string;
  purpose: string;
  dataCategories: string[];
  lawfulBasis: LegalBasis;
  expiresAt?: number;
  signature: string;         // User's cryptographic signature
}

/**
 * Response from consent grant
 */
export interface ConsentGrantResponse {
  consentId: string;
  hgtpTxHash: string;
  status: ConsentStatus;
  expiresAt?: number;
  grantedAt: number;
}

/**
 * Request to verify consent
 */
export interface ConsentVerifyRequest {
  userId: string;
  controllerId: string;
  purpose: string;
}

/**
 * Response from consent verification (ZK - no personal data)
 */
export interface ConsentVerifyResponse {
  isValid: boolean;
  consentId?: string;
  zkProof?: ZKProof;
  merkleProof?: MerkleProof;
  status?: ConsentStatus;
  error?: string;
}

/**
 * Request to revoke consent
 */
export interface ConsentRevokeRequest {
  consentId: string;
  userId: string;
  signature: string;
}

/**
 * Response from consent revocation
 */
export interface ConsentRevokeResponse {
  consentId: string;
  status: ConsentStatus;
  revokedAt: number;
  hgtpTxHash: string;
}

/**
 * HGTP transaction result
 */
export interface HGTPResult {
  transactionHash: string;
  blockHeight: number;
  merkleRoot: string;
  anchoringTimestamp: number;
}

/**
 * Privacy proposal for governance
 */
export interface PrivacyProposal {
  proposalId: string;
  title: string;
  description: string;
  proposedChanges: PolicyChange;
  creatorSignature: string;
  votingDeadline: number;
  createdAt: number;
}

/**
 * Policy change structure
 */
export interface PolicyChange {
  field: string;
  oldValue: string;
  newValue: string;
  justification: string;
}

/**
 * Vote record for governance
 */
export interface VoteRecord {
  voter: string;
  proposalId: string;
  choice: VoteChoice;
  votingPower: number;
  timestamp: number;
}

/**
 * Vote result/tally
 */
export interface VoteResult {
  proposalId: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalPower: number;
  participation: number;     // Percentage
}

/**
 * User registration request
 */
export interface UserRegistrationRequest {
  email: string;             // Will be hashed
  publicKey: string;         // Cryptographic public key
  metadata?: Record<string, unknown>;
}

/**
 * User registration response
 */
export interface UserRegistrationResponse {
  userId: string;            // Hashed identifier
  did: string;               // Decentralized identifier
  walletAddress: string;
  createdAt: number;
}

/**
 * Controller registration request
 */
export interface ControllerRegistrationRequest {
  organizationName: string;
  organizationId: string;     // Legal entity identifier
  publicKey: string;
  metadata?: Record<string, unknown>;
}

/**
 * Controller registration response
 */
export interface ControllerRegistrationResponse {
  controllerId: string;
  controllerHash: string;     // SHA-256 hash
  registeredAt: number;
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  controllerHash: string;
  gdprArticle7: boolean;     // Conditions for consent
  gdprArticle12: boolean;     // Transparent information
  gdprArticle13: boolean;     // Information to be provided
  gdprArticle17: boolean;     // Right to erasure
  gdprArticle20: boolean;     // Data portability
  gdprArticle25: boolean;     // Data protection by design
  gdprArticle30: boolean;     // Records of processing
  overallCompliance: number;  // Percentage 0-100
  lastAudit: number;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  timestamp: number;
  action: string;
  consentId?: string;
  controllerHash?: string;
  userId?: string;
  details: Record<string, unknown>;
  hgtpTxHash: string;
}

/**
 * El Paca token balance
 */
export interface ElPacaBalance {
  address: string;
  balance: number;
  staked: number;
  votingPower: number;
  lastUpdated: number;
}

/**
 * API error response
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Database connection interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

/**
 * Environment configuration
 */
export interface EnvConfig {
  nodeEnv: string;
  port: number;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  database: DatabaseConfig;
  redis: RedisConfig;
  constellation: {
    nodeUrl: string;
    networkId: string;
    walletAddress: string;
    privateKey: string;
    publicKey: string;
  };
  encryption: {
    key: string;
    iv: string;
    salt: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}
