/**
 * Consent service - business logic for consent management
 */

import {
  ConsentGrantRequest,
  ConsentGrantResponse,
  ConsentVerifyRequest,
  ConsentVerifyResponse,
  ConsentRevokeRequest,
  ConsentRevokeResponse,
  ConsentState,
  ConsentStatus,
  ZKProof,
  MerkleProof,
  HGTPResult
} from '@consentire/shared';
import { hgtpService } from './hgtpService';
import { zkService } from './zkService';
import { 
  hash, 
  generateConsentId, 
  generateControllerHash, 
  generatePurposeHash 
} from '../utils/crypto';
import { logger } from '../utils/logger';

class ConsentService {
  private consentStore: Map<string, ConsentState> = new Map();

  /**
   * Grant consent
   */
  async grantConsent(request: ConsentGrantRequest): Promise<ConsentGrantResponse> {
    logger.info('Granting consent', { userId: request.userId, controllerId: request.controllerId });

    // Validate signature
    // TODO: Implement actual signature verification
    
    // Generate hashes
    const controllerHash = generateControllerHash(request.controllerId);
    const purposeHash = generatePurposeHash(request.purpose);
    const timestamp = Date.now();
    const consentId = generateConsentId(
      request.userId,
      request.controllerId,
      request.purpose,
      timestamp
    );

    // Check if consent already exists
    if (this.consentStore.has(consentId)) {
      throw new Error('Consent already exists');
    }

    // Generate ZK proof
    const zkProof = await zkService.generateConsentProof({
      userId: request.userId,
      controllerId: request.controllerId,
      purpose: request.purpose,
      dataCategories: request.dataCategories,
      lawfulBasis: request.lawfulBasis
    });

    // Create consent state
    const consentState: ConsentState = {
      consentId,
      controllerHash,
      purposeHash,
      status: ConsentStatus.GRANTED,
      grantedAt: timestamp,
      expiresAt: request.expiresAt,
      hgtpTxHash: '', // Will be filled after HGTP anchoring
      userId: hash(request.userId)
    };

    // Anchor to HGTP
    const hgtpResult = await hgtpService.anchorConsent(consentState);
    consentState.hgtpTxHash = hgtpResult.transactionHash;

    // Store consent
    this.consentStore.set(consentId, consentState);

    logger.info('Consent granted', { consentId, hgtpTxHash: hgtpResult.transactionHash });

    return {
      consentId,
      hgtpTxHash: hgtpResult.transactionHash,
      status: ConsentStatus.GRANTED,
      expiresAt: request.expiresAt,
      grantedAt: timestamp
    };
  }

  /**
   * Verify consent (ZK - no personal data exposed)
   */
  async verifyConsent(request: ConsentVerifyRequest): Promise<ConsentVerifyResponse> {
    logger.info('Verifying consent', { userId: request.userId, controllerId: request.controllerId });

    // Find consent by searching all consents (in production, use indexed database)
    const consentId = this.findConsentId(request.userId, request.controllerId, request.purpose);
    
    if (!consentId) {
      return {
        isValid: false,
        error: 'Consent not found'
      };
    }

    const consentState = this.consentStore.get(consentId);
    if (!consentState) {
      return {
        isValid: false,
        error: 'Consent state not found'
      };
    }

    // Check purpose match
    const requestedPurposeHash = generatePurposeHash(request.purpose);
    if (consentState.purposeHash !== requestedPurposeHash) {
      return {
        isValid: false,
        error: 'Purpose mismatch'
      };
    }

    // Check expiration
    if (consentState.expiresAt && Date.now() > consentState.expiresAt) {
      consentState.status = ConsentStatus.EXPIRED;
      return {
        isValid: false,
        status: ConsentStatus.EXPIRED,
        error: 'Consent expired'
      };
    }

    // Check status
    if (consentState.status !== ConsentStatus.GRANTED) {
      return {
        isValid: false,
        status: consentState.status,
        error: `Consent is ${consentState.status}`
      };
    }

    // Generate ZK proof for verification
    const zkProof = await zkService.generateVerificationProof(consentState);
    
    // Generate merkle proof from HGTP
    const merkleProof = await hgtpService.getMerkleProof(consentId);

    logger.info('Consent verified', { consentId, isValid: true });

    return {
      isValid: true,
      consentId,
      zkProof,
      merkleProof,
      status: ConsentStatus.GRANTED
    };
  }

  /**
   * Revoke consent
   */
  async revokeConsent(request: ConsentRevokeRequest): Promise<ConsentRevokeResponse> {
    logger.info('Revoking consent', { consentId: request.consentId });

    const consentState = this.consentStore.get(request.consentId);
    if (!consentState) {
      throw new Error('Consent not found');
    }

    // Verify user owns this consent
    // TODO: Implement signature verification

    // Update status
    consentState.status = ConsentStatus.REVOKED;
    const revokedAt = Date.now();

    // Update HGTP
    const hgtpResult = await hgtpService.updateConsentStatus(request.consentId, ConsentStatus.REVOKED);

    // Store updated consent
    this.consentStore.set(request.consentId, consentState);

    logger.info('Consent revoked', { consentId: request.consentId, hgtpTxHash: hgtpResult.transactionHash });

    return {
      consentId: request.consentId,
      status: ConsentStatus.REVOKED,
      revokedAt,
      hgtpTxHash: hgtpResult.transactionHash
    };
  }

  /**
   * Get user's active consents
   */
  getActiveConsents(userId: string): ConsentState[] {
    const userHash = hash(userId);
    return Array.from(this.consentStore.values())
      .filter(consent => consent.userId === userHash && consent.status === ConsentStatus.GRANTED);
  }

  /**
   * Find consent ID by user, controller, and purpose
   */
  private findConsentId(userId: string, controllerId: string, purpose: string): string | null {
    const controllerHash = generateControllerHash(controllerId);
    const purposeHash = generatePurposeHash(purpose);
    const userHash = hash(userId);

    for (const [consentId, consentState] of this.consentStore.entries()) {
      if (
        consentState.userId === userHash &&
        consentState.controllerHash === controllerHash &&
        consentState.purposeHash === purposeHash
      ) {
        return consentId;
      }
    }

    return null;
  }
}

export const consentService = new ConsentService();
