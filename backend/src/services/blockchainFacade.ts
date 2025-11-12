/**
 * Blockchain Facade / Factory
 * Routes blockchain operations to real or mock implementation based on configuration
 */

import { logger } from '../utils/logger';
import { IBlockchainAnchorService } from './IBlockchainAnchorService';
import { realHGTPService } from './realHGTPService';
import { mockHGTPService } from './mockHGTPService';
import { digitalEvidenceService } from './digitalEvidenceService';

/**
 * Blockchain Service Factory
 * Returns appropriate implementation based on environment configuration
 */
class BlockchainServiceFactory {
  private service: IBlockchainAnchorService;
  private isDemoMode: boolean;

  constructor() {
    const hasDigitalEvidenceKey = !!(
      process.env.DIGITAL_EVIDENCE_API_KEY &&
      process.env.DIGITAL_EVIDENCE_ORG_ID &&
      process.env.DIGITAL_EVIDENCE_TENANT_ID
    );
    const hasConstellationCreds = !!(
      process.env.CONSTELLATION_PRIVATE_KEY && 
      process.env.CONSTELLATION_PUBLIC_KEY && 
      process.env.CONSTELLATION_WALLET_ADDRESS
    );

    // Priority 1: Digital Evidence API (recommended for production)
    if (hasDigitalEvidenceKey) {
      try {
        this.service = digitalEvidenceService;
        this.isDemoMode = false;
        logger.info('✅ Using Digital Evidence API for REAL blockchain anchoring', {
          mode: 'REAL',
          service: 'DigitalEvidenceService',
          endpoint: 'https://de-api.constellationnetwork.io/v1'
        });
        return;
      } catch (error: any) {
        logger.error('Failed to initialize Digital Evidence Service, falling back to mock mode', {
          error: error.message
        });
      }
    }

    // Priority 2: Direct Constellation Network (requires custom metagraph)
    if (hasConstellationCreds) {
      logger.warn('⚠️  Constellation credentials configured but /data endpoint requires custom metagraph - using mock mode', {
        note: 'Use Digital Evidence API for production blockchain anchoring'
      });
    }
    
    // Fallback: Mock mode for demo/testing
    this.service = mockHGTPService;
    this.isDemoMode = true;

    logger.info('🎭 Blockchain service initialized in DEMO MODE', {
      mode: 'MOCK (deterministic simulation)',
      service: 'MockHGTPService',
      note: 'Configure Digital Evidence API credentials for real blockchain anchoring'
    });
  }

  /**
   * Get the active blockchain service
   */
  getService(): IBlockchainAnchorService {
    return this.service;
  }

  /**
   * Check if running in demo mode
   */
  isDemo(): boolean {
    return this.isDemoMode;
  }

  /**
   * Get current mode as string
   */
  getMode(): 'real' | 'mock' {
    return this.isDemoMode ? 'mock' : 'real';
  }
}

// Export singleton instance
const factory = new BlockchainServiceFactory();

export const blockchainService = factory.getService();
export const isDemoMode = factory.isDemo();
export const blockchainMode = factory.getMode();

// Export factory for testing
export { BlockchainServiceFactory };
