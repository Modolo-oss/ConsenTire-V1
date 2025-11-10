export declare enum LegalBasis {
    CONSENT = "consent",
    CONTRACT = "contract",
    LEGAL_OBLIGATION = "legal_obligation",
    VITAL_INTERESTS = "vital_interests",
    PUBLIC_TASK = "public_task",
    LEGITIMATE_INTERESTS = "legitimate_interests"
}
export declare enum ConsentStatus {
    GRANTED = "granted",
    REVOKED = "revoked",
    EXPIRED = "expired",
    PENDING = "pending"
}
export declare enum VoteChoice {
    FOR = "for",
    AGAINST = "against",
    ABSTAIN = "abstain"
}
/**
 * Immutable consent record stored on HGTP
 */
export interface ConsentRecord {
    consentId: string;
    controllerHash: string;
    purposeHash: string;
    dataCategories: string[];
    lawfulBasis: LegalBasis;
    grantedAt: number;
    expiresAt?: number;
    lastAccessed: number;
    zkProof: ZKProof;
    hgtpTxHash: string;
    merkleRoot: string;
}
/**
 * Zero-knowledge proof structure
 */
export interface ZKProof {
    proof: string;
    publicSignals: string[];
    circuitHash: string;
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
    userId: string;
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
    signature: string;
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
    participation: number;
}
/**
 * User registration request
 */
export interface UserRegistrationRequest {
    email: string;
    publicKey: string;
    metadata?: Record<string, unknown>;
}
/**
 * User registration response
 */
export interface UserRegistrationResponse {
    userId: string;
    did: string;
    walletAddress: string;
    createdAt: number;
}
/**
 * Controller registration request
 */
export interface ControllerRegistrationRequest {
    organizationName: string;
    organizationId: string;
    publicKey: string;
    metadata?: Record<string, unknown>;
}
/**
 * Controller registration response
 */
export interface ControllerRegistrationResponse {
    controllerId: string;
    controllerHash: string;
    registeredAt: number;
}
/**
 * Compliance status
 */
export interface ComplianceStatus {
    controllerHash: string;
    gdprArticle7: boolean;
    gdprArticle12: boolean;
    gdprArticle13: boolean;
    gdprArticle17: boolean;
    gdprArticle20: boolean;
    gdprArticle25: boolean;
    gdprArticle30: boolean;
    overallCompliance: number;
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
//# sourceMappingURL=types.d.ts.map