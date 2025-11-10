/**
 * Blockchain Anchor Service Interface
 * Defines contract for both real and mock blockchain implementations
 */

import { ConsentState, ConsentStatus, HGTPResult, MerkleProof } from '@consentire/shared';

export interface BlockchainNetworkStatus {
  connected: boolean;
  mode: 'real' | 'mock' | 'error';
  endpoint?: string;
  nodeCount?: number;
  error?: string;
}

export interface IBlockchainAnchorService {
  /**
   * Anchor consent grant to blockchain
   */
  anchorConsent(consentState: ConsentState): Promise<HGTPResult>;

  /**
   * Update consent status (revoke, modify, etc.)
   */
  updateConsentStatus(consentId: string, status: ConsentStatus, metadata?: any): Promise<HGTPResult>;

  /**
   * Anchor controller verification request
   */
  anchorControllerVerification(
    controllerId: string, 
    userId: string, 
    purpose: string,
    timestamp: number
  ): Promise<HGTPResult>;

  /**
   * Anchor regulator audit query
   */
  anchorRegulatorAudit(
    regulatorId: string,
    auditType: string,
    scope: any,
    timestamp: number
  ): Promise<HGTPResult>;

  /**
   * Get merkle proof for consent verification
   */
  getMerkleProof(consentId: string): Promise<MerkleProof>;

  /**
   * Query consent from blockchain
   */
  queryConsent(consentId: string): Promise<any>;

  /**
   * Get latest snapshot information
   */
  getLatestSnapshot(): Promise<any>;

  /**
   * Get network status and mode
   */
  getNetworkStatus(): Promise<BlockchainNetworkStatus>;

  /**
   * Close connections
   */
  close(): Promise<void>;
}
