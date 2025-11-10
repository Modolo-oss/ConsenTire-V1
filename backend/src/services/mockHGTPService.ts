/**
 * Mock HGTP Service
 * Deterministic blockchain simulation for demo/testing purposes
 */

import { logger } from '../utils/logger';
import { cryptoService } from './cryptoService';
import {
  ConsentState,
  ConsentStatus,
  HGTPResult,
  MerkleProof
} from '@consentire/shared';
import { IBlockchainAnchorService, BlockchainNetworkStatus } from './IBlockchainAnchorService';

class MockHGTPService implements IBlockchainAnchorService {
  private mockBlockHeight: number = 1000000; // Start from realistic block height
  private mockCache: Map<string, HGTPResult> = new Map();

  constructor() {
    logger.warn('🎭 MockHGTPService initialized - DEMO MODE ACTIVE', {
      message: 'All blockchain operations are simulated. Configure Digital Evidence API credentials to enable real blockchain anchoring.'
    });
  }

  /**
   * Generate deterministic mock transaction hash
   */
  private generateMockTxHash(action: string, data: any): string {
    const seed = {
      action,
      data,
      timestamp: Math.floor(Date.now() / 60000) // Round to minute for determinism
    };
    
    const hash = cryptoService.hash(JSON.stringify(seed));
    return `mock::${action}::${hash.substring(0, 32)}`;
  }

  /**
   * Generate deterministic mock merkle root
   */
  private generateMockMerkleRoot(txHash: string): string {
    return cryptoService.hash(`merkle::${txHash}`).substring(0, 32);
  }

  /**
   * Create mock HGTP result with realistic structure
   */
  private createMockResult(action: string, data: any): HGTPResult {
    const transactionHash = this.generateMockTxHash(action, data);
    const merkleRoot = this.generateMockMerkleRoot(transactionHash);
    
    this.mockBlockHeight++;

    const result: HGTPResult = {
      transactionHash,
      merkleRoot,
      blockHeight: this.mockBlockHeight,
      anchoringTimestamp: Date.now()
    };

    // Cache for future queries
    const cacheKey = data.consentId || data.controllerId || `${action}-${Date.now()}`;
    this.mockCache.set(cacheKey, result);

    logger.info(`🎭 Mock blockchain operation: ${action}`, {
      transactionHash,
      blockHeight: this.mockBlockHeight,
      mode: 'DEMO'
    });

    return result;
  }

  /**
   * Anchor consent grant (MOCK)
   */
  async anchorConsent(consentState: ConsentState): Promise<HGTPResult> {
    logger.info('🎭 Mock: Anchoring consent grant', { 
      consentId: consentState.consentId,
      mode: 'DEMO'
    });

    return this.createMockResult('grant_consent', {
      consentId: consentState.consentId,
      controllerHash: consentState.controllerHash,
      purposeHash: consentState.purposeHash,
      status: consentState.status,
      grantedAt: consentState.grantedAt
    });
  }

  /**
   * Update consent status - revoke, modify, etc. (MOCK)
   */
  async updateConsentStatus(
    consentId: string, 
    status: ConsentStatus,
    metadata?: any
  ): Promise<HGTPResult> {
    const actionMap: Record<ConsentStatus, string> = {
      [ConsentStatus.GRANTED]: 'grant_consent',
      [ConsentStatus.REVOKED]: 'revoke_consent',
      [ConsentStatus.EXPIRED]: 'expire_consent',
      [ConsentStatus.PENDING]: 'pending_consent'
    };

    const action = actionMap[status] || 'update_consent';

    logger.info(`🎭 Mock: Updating consent status to ${status}`, { 
      consentId,
      action,
      mode: 'DEMO'
    });

    return this.createMockResult(action, {
      consentId,
      status,
      timestamp: Date.now(),
      ...metadata
    });
  }

  /**
   * Anchor controller verification request (MOCK)
   */
  async anchorControllerVerification(
    controllerId: string,
    userId: string,
    purpose: string,
    timestamp: number
  ): Promise<HGTPResult> {
    logger.info('🎭 Mock: Anchoring controller verification', {
      controllerId,
      purpose,
      mode: 'DEMO'
    });

    return this.createMockResult('controller_verify', {
      controllerId,
      userId: cryptoService.hash(userId), // Hash for privacy
      purpose,
      timestamp
    });
  }

  /**
   * Anchor regulator audit query (MOCK)
   */
  async anchorRegulatorAudit(
    regulatorId: string,
    auditType: string,
    scope: any,
    timestamp: number
  ): Promise<HGTPResult> {
    logger.info('🎭 Mock: Anchoring regulator audit', {
      regulatorId,
      auditType,
      mode: 'DEMO'
    });

    return this.createMockResult('regulator_audit', {
      regulatorId,
      auditType,
      scope,
      timestamp
    });
  }

  /**
   * Get merkle proof (MOCK)
   */
  async getMerkleProof(consentId: string): Promise<MerkleProof> {
    logger.info('🎭 Mock: Generating merkle proof', { 
      consentId,
      mode: 'DEMO'
    });

    // Check cache first
    const cached = this.mockCache.get(consentId);
    const merkleRoot = cached?.merkleRoot || this.generateMockMerkleRoot(consentId);

    return {
      root: merkleRoot,
      path: [
        cryptoService.hash(`proof1::${consentId}`),
        cryptoService.hash(`proof2::${consentId}`),
        cryptoService.hash(`proof3::${consentId}`)
      ],
      leaf: cryptoService.hash(consentId),
      verified: true
    };
  }

  /**
   * Query consent from blockchain (MOCK - returns null, data from DB)
   */
  async queryConsent(consentId: string): Promise<any> {
    logger.info('🎭 Mock: Query consent (returns null - data from PostgreSQL)', {
      consentId,
      mode: 'DEMO'
    });
    
    // In mock mode, data always comes from PostgreSQL
    return null;
  }

  /**
   * Get latest snapshot (MOCK)
   */
  async getLatestSnapshot(): Promise<any> {
    logger.info('🎭 Mock: Getting latest snapshot', { mode: 'DEMO' });

    return {
      ordinal: this.mockBlockHeight,
      hash: cryptoService.hash(`snapshot::${this.mockBlockHeight}`),
      height: this.mockBlockHeight,
      timestamp: Date.now(),
      merkleRoot: cryptoService.hash(`merkle::${this.mockBlockHeight}`),
      stateRoot: cryptoService.hash(`state::${this.mockBlockHeight}`),
      blocks: []
    };
  }

  /**
   * Get network status (MOCK)
   */
  async getNetworkStatus(): Promise<BlockchainNetworkStatus> {
    return {
      connected: true,
      mode: 'mock',
      endpoint: 'mock://localhost',
      nodeCount: 0
    };
  }

  /**
   * Close connections (MOCK - no-op)
   */
  async close(): Promise<void> {
    this.mockCache.clear();
    logger.info('🎭 Mock HGTP service closed');
  }
}

export const mockHGTPService = new MockHGTPService();
