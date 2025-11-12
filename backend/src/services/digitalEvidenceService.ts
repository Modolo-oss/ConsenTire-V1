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
import { sha256 } from '@noble/hashes/sha2.js';
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
   * Sign fingerprint value using SECP256K1
   */
  private signFingerprintValue(fingerprintValue: FingerprintValue): SignatureProof {
    const canonical = this.canonicalJSON(fingerprintValue);
    const messageHash = sha256(new TextEncoder().encode(canonical));
    const signature = secp256k1.sign(messageHash, this.privateKey);

    return {
      id: bytesToHex(this.publicKey),
      signature: signature.toCompactHex(),
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
    const eventId = `${eventType}-${consentState.consentId}-${Date.now()}`;
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
    
    const submission: FingerprintSubmission = {
      attestation: {
        content: fingerprintValue,
        proofs: [proof]
      }
    };
    
    // Only add metadata if tags are provided
    if (tags && Object.keys(tags).length > 0) {
      (submission as any).metadata = { tags };
    }

    const payload = {
      fingerprints: [submission]
    };

    logger.info('Submitting fingerprint to Digital Evidence API', {
      payload: JSON.stringify(payload, null, 2)
    });

    try {
      const response = await this.client.post('/fingerprints', payload);

      const result = response.data.results?.[0];
      if (!result || !result.accepted) {
        throw new Error(`Fingerprint submission rejected: ${result?.error || 'Unknown error'}`);
      }

      logger.info('✅ Fingerprint submitted to blockchain', {
        hash: result.hash,
        eventId: fingerprintValue.eventId,
        documentId: fingerprintValue.documentId
      });

      // Fetch full fingerprint details
      const detailResponse = await this.client.get(`/fingerprints/${result.hash}`);
      return detailResponse.data;

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
