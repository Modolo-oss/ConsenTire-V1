/**
 * Digital Evidence API Service
 * Real blockchain anchoring via Constellation Network's Digital Evidence API
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { cryptoService } from './cryptoService';
import {
  ConsentState,
  ConsentStatus,
  HGTPResult,
  MerkleProof
} from '@consentire/shared';
import { IBlockchainAnchorService, BlockchainNetworkStatus } from './IBlockchainAnchorService';
import { createHash } from 'crypto';
import * as secp256k1 from '@noble/secp256k1';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import canonicalize from 'canonicalize';

// Configure secp256k1 to use noble/hashes for HMAC and SHA256
secp256k1.etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) => {
  return hmac(sha256, key, secp256k1.etc.concatBytes(...messages));
};
secp256k1.etc.hmacSha256Async = async (key: Uint8Array, ...messages: Uint8Array[]) => {
  return hmac(sha256, key, secp256k1.etc.concatBytes(...messages));
};

interface FingerprintValue {
  orgId: string;
  tenantId: string;
  eventId: string;
  documentId: string;
  documentRef: string;
  timestamp: string;
  version: number;
}

interface SignatureProof {
  id: string;
  signature: string;
  algorithm: string;
}

interface SignedFingerprint {
  content: FingerprintValue;
  proofs: SignatureProof[];
}

interface FingerprintSubmission {
  attestation: SignedFingerprint;
  metadata?: {
    hash?: string;
    tags?: Record<string, string>;
  };
}

interface FingerprintResponse {
  hash: string;
  fingerprintTimestamp: string;
  status: string;
  organizationId: string;
  tenantId: string;
  documentId: string;
  eventId: string;
  documentRef: string;
  confirmationTimestamp?: string;
  batchGlobalSnapshotHash?: string;
  batchMetagraphSnapshotHash?: string;
}

class DigitalEvidenceService implements IBlockchainAnchorService {
  private client: AxiosInstance;
  private orgId: string;
  private tenantId: string;
  private apiKey: string;
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;

  constructor() {
    const apiKey = process.env.DIGITAL_EVIDENCE_API_KEY;
    const orgId = process.env.DIGITAL_EVIDENCE_ORG_ID;
    const tenantId = process.env.DIGITAL_EVIDENCE_TENANT_ID;

    if (!apiKey || !orgId || !tenantId) {
      throw new Error('Missing Digital Evidence API credentials: DIGITAL_EVIDENCE_API_KEY, DIGITAL_EVIDENCE_ORG_ID, DIGITAL_EVIDENCE_TENANT_ID');
    }

    this.apiKey = apiKey;
    this.orgId = orgId;
    this.tenantId = tenantId;

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: 'https://de-api.constellationnetwork.io/v1',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Generate ephemeral keypair for signing (or load from env if needed)
    this.privateKey = secp256k1.utils.randomPrivateKey();
    this.publicKey = secp256k1.getPublicKey(this.privateKey, false);

    logger.info('✅ Digital Evidence API Service initialized', {
      baseURL: 'https://de-api.constellationnetwork.io/v1',
      orgId: this.orgId,
      tenantId: this.tenantId
    });
  }

  /**
   * Generate RFC 8785 canonical JSON using official implementation
   */
  private canonicalJSON(obj: any): string {
    return canonicalize(obj) || '';
  }

  /**
   * Convert ECDSA signature (r, s) to DER format
   */
  private signatureToDER(r: bigint, s: bigint): Uint8Array {
    const rBytes = this.bigintToBytes(r);
    const sBytes = this.bigintToBytes(s);
    
    // DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
    const totalLength = 2 + rBytes.length + 2 + sBytes.length;
    const der = new Uint8Array(2 + totalLength);
    
    let offset = 0;
    der[offset++] = 0x30; // SEQUENCE
    der[offset++] = totalLength;
    der[offset++] = 0x02; // INTEGER (r)
    der[offset++] = rBytes.length;
    der.set(rBytes, offset);
    offset += rBytes.length;
    der[offset++] = 0x02; // INTEGER (s)
    der[offset++] = sBytes.length;
    der.set(sBytes, offset);
    
    return der;
  }

  /**
   * Convert bigint to bytes with proper padding for DER
   */
  private bigintToBytes(n: bigint): Uint8Array {
    let hex = n.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    
    // Add 0x00 prefix if high bit is set (DER requirement)
    if (bytes[0] & 0x80) {
      const padded = new Uint8Array(bytes.length + 1);
      padded[0] = 0x00;
      padded.set(bytes, 1);
      return padded;
    }
    
    return bytes;
  }

  /**
   * Sign fingerprint value using SECP256K1_RFC8785_V1
   * 
   * Per Digital Evidence API spec:
   * 1. RFC 8785 canonicalize content
   * 2. SHA-256 hash
   * 3. Convert hash to hex string → treat as UTF-8 bytes
   * 4. SHA-512 hash
   * 5. Truncate to 32 bytes
   * 6. Sign with secp256k1
   */
  private signFingerprintValue(fingerprintValue: FingerprintValue): SignatureProof {
    // Step 1: RFC 8785 canonical JSON
    const canonical = this.canonicalJSON(fingerprintValue);
    
    // Step 2: SHA-256 hash
    const firstHash = sha256(new TextEncoder().encode(canonical));
    
    // Step 3: Convert hash to hex string
    const hashHex = bytesToHex(firstHash);
    
    // Step 4: Treat hex string as UTF-8 bytes and SHA-512 hash
    const secondHash = sha512(new TextEncoder().encode(hashHex));
    
    // Step 5: Truncate to 32 bytes
    const messageToSign = secondHash.slice(0, 32);
    
    // Step 6: Sign with secp256k1
    const signature = secp256k1.sign(messageToSign, this.privateKey);
    
    // Convert to DER format
    const derSignature = this.signatureToDER(signature.r, signature.s);

    return {
      id: bytesToHex(this.publicKey), // Uncompressed public key (04 + X + Y)
      signature: bytesToHex(derSignature), // DER-encoded signature (per API spec)
      algorithm: 'SECP256K1_RFC8785_V1'
    };
  }

  /**
   * Create FingerprintValue from ConsentState
   */
  private createFingerprintValue(
    consentState: ConsentState,
    eventType: string
  ): FingerprintValue {
    // Generate proper UUIDv4 for eventId (required by Digital Evidence API spec)
    const eventId = crypto.randomUUID();
    const documentRef = cryptoService.hash(
      `${consentState.userId}:${consentState.controllerHash}:${consentState.purposeHash}`
    );

    return {
      orgId: this.orgId,
      tenantId: this.tenantId,
      eventId,
      documentId: consentState.consentId,
      documentRef,
      timestamp: new Date(consentState.grantedAt).toISOString(),
      version: 1
    };
  }

  /**
   * Submit fingerprint to Digital Evidence API
   */
  private async submitFingerprint(
    fingerprintValue: FingerprintValue,
    tags?: Record<string, string>
  ): Promise<FingerprintResponse> {
    const proof = this.signFingerprintValue(fingerprintValue);
    
    // Calculate hash of FingerprintValue for metadata
    const canonical = this.canonicalJSON(fingerprintValue);
    const fingerprintHash = bytesToHex(sha256(new TextEncoder().encode(canonical)));
    
    const submission: FingerprintSubmission = {
      attestation: {
        content: fingerprintValue,
        proofs: [proof]
      },
      metadata: {
        hash: fingerprintHash,
        tags: tags || {}
      }
    };

    // Digital Evidence API expects array directly (not wrapped in object)
    const payload = [submission];

    logger.info('Submitting fingerprint to Digital Evidence API', {
      eventId: fingerprintValue.eventId,
      documentId: fingerprintValue.documentId,
      payloadSize: JSON.stringify(payload).length
    });

    try {
      const response = await this.client.post('/fingerprints', payload);

      logger.info('Digital Evidence API response received', {
        statusCode: response.status,
        responseData: JSON.stringify(response.data, null, 2)
      });

      // API returns array directly (not wrapped in { results: [...] })
      const results = Array.isArray(response.data) ? response.data : [response.data];
      const result = results[0];
      
      if (!result || result.accepted !== true) {
        logger.error('Fingerprint submission rejected by API', {
          result: JSON.stringify(result, null, 2),
          accepted: result?.accepted,
          errors: result?.errors
        });
        throw new Error(`Fingerprint submission rejected: ${result?.errors?.join(', ') || 'Unknown error'}`);
      }

      logger.info('✅ Fingerprint submitted to blockchain', {
        hash: result.hash,
        eventId: fingerprintValue.eventId,
        documentId: fingerprintValue.documentId
      });

      // Return minimal fingerprint response (skip detailed fetch to avoid timestamp parsing issues)
      return {
        hash: result.hash,
        fingerprintTimestamp: fingerprintValue.timestamp,
        status: 'accepted',
        organizationId: fingerprintValue.orgId,
        tenantId: fingerprintValue.tenantId,
        documentId: fingerprintValue.documentId,
        eventId: fingerprintValue.eventId,
        documentRef: fingerprintValue.documentRef
      };

    } catch (error: any) {
      logger.error('Failed to submit fingerprint to Digital Evidence API', {
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Convert Digital Evidence response to HGTPResult
   */
  private toHGTPResult(response: FingerprintResponse): HGTPResult {
    return {
      transactionHash: response.hash,
      merkleRoot: response.batchGlobalSnapshotHash || response.hash,
      blockHeight: 0, // Digital Evidence doesn't expose block height directly
      anchoringTimestamp: new Date(response.fingerprintTimestamp).getTime()
    };
  }

  /**
   * Anchor consent grant to blockchain
   */
  async anchorConsent(consentState: ConsentState): Promise<HGTPResult> {
    logger.info('Anchoring consent grant to blockchain', {
      consentId: consentState.consentId,
      status: consentState.status
    });

    const fingerprintValue = this.createFingerprintValue(consentState, 'consent-grant');
    const tags = {
      action: 'grant',
      status: consentState.status,
      controller: consentState.controllerHash.substring(0, 16)
    };

    const response = await this.submitFingerprint(fingerprintValue, tags);
    return this.toHGTPResult(response);
  }

  /**
   * Update consent status (revoke, modify, etc.)
   */
  async updateConsentStatus(
    consentId: string,
    status: ConsentStatus,
    metadata?: any
  ): Promise<HGTPResult> {
    logger.info('Updating consent status on blockchain', {
      consentId,
      status
    });

    const eventType = status === ConsentStatus.REVOKED ? 'consent-revoke' : 'consent-update';
    const consentState: ConsentState = {
      consentId,
      controllerHash: metadata?.controllerHash || '',
      purposeHash: metadata?.purposeHash || '',
      status,
      grantedAt: Date.now(),
      hgtpTxHash: '',
      userId: metadata?.userId || ''
    };

    const fingerprintValue = this.createFingerprintValue(consentState, eventType);
    const tags = {
      action: eventType,
      status,
      previousStatus: metadata?.previousStatus || ''
    };

    const response = await this.submitFingerprint(fingerprintValue, tags);
    return this.toHGTPResult(response);
  }

  /**
   * Anchor controller verification request
   */
  async anchorControllerVerification(
    controllerId: string,
    userId: string,
    purpose: string,
    timestamp: number
  ): Promise<HGTPResult> {
    logger.info('Anchoring controller verification request', {
      controllerId,
      purpose
    });

    const eventId = `verify-${controllerId}-${Date.now()}`;
    const documentRef = cryptoService.hash(`${userId}:${controllerId}:${purpose}`);

    const fingerprintValue: FingerprintValue = {
      orgId: this.orgId,
      tenantId: this.tenantId,
      eventId,
      documentId: `verify-${controllerId}`,
      documentRef,
      timestamp: new Date(timestamp).toISOString(),
      version: 1
    };

    const tags = {
      action: 'verify',
      controller: controllerId.substring(0, 16)
    };

    const response = await this.submitFingerprint(fingerprintValue, tags);
    return this.toHGTPResult(response);
  }

  /**
   * Anchor regulator audit query
   */
  async anchorRegulatorAudit(
    regulatorId: string,
    auditType: string,
    scope: any,
    timestamp: number
  ): Promise<HGTPResult> {
    logger.info('Anchoring regulator audit query', {
      regulatorId,
      auditType
    });

    const eventId = `audit-${regulatorId}-${Date.now()}`;
    const documentRef = cryptoService.hash(`${regulatorId}:${auditType}:${JSON.stringify(scope)}`);

    const fingerprintValue: FingerprintValue = {
      orgId: this.orgId,
      tenantId: this.tenantId,
      eventId,
      documentId: `audit-${auditType}`,
      documentRef,
      timestamp: new Date(timestamp).toISOString(),
      version: 1
    };

    const tags = {
      action: 'audit',
      auditType,
      regulator: regulatorId.substring(0, 16)
    };

    const response = await this.submitFingerprint(fingerprintValue, tags);
    return this.toHGTPResult(response);
  }

  /**
   * Get merkle proof for consent verification
   */
  async getMerkleProof(consentId: string): Promise<MerkleProof> {
    logger.warn('Merkle proof retrieval not yet implemented for Digital Evidence API');
    
    // Digital Evidence API provides Merkle Patricia Trie proofs via Explorer download
    // This would require additional API endpoint or Explorer integration
    return {
      root: '',
      path: [],
      leaf: consentId,
      verified: false
    };
  }

  /**
   * Query consent from blockchain
   */
  async queryConsent(consentId: string): Promise<any> {
    try {
      const response = await this.client.get('/fingerprints', {
        params: {
          document_id: consentId,
          limit: 100
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to query consent from Digital Evidence API', {
        consentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get latest snapshot information
   */
  async getLatestSnapshot(): Promise<any> {
    try {
      const response = await this.client.get('/fingerprints/latest');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get latest snapshot from Digital Evidence API', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get network status and mode
   */
  async getNetworkStatus(): Promise<BlockchainNetworkStatus> {
    try {
      // Test API connectivity
      await this.client.get('/fingerprints/stats');

      return {
        connected: true,
        mode: 'real',
        endpoint: 'https://de-api.constellationnetwork.io/v1'
      };
    } catch (error: any) {
      return {
        connected: false,
        mode: 'error',
        endpoint: 'https://de-api.constellationnetwork.io/v1',
        error: error.message
      };
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    logger.info('Closing Digital Evidence API service');
    // Axios doesn't require explicit connection closing
  }
}

// Export singleton instance
export const digitalEvidenceService = new DigitalEvidenceService();
