/**
 * Blockchain Facade / Factory
 * Routes blockchain operations to real or mock implementation based on configuration
 */

import { logger } from '../utils/logger';
import { IBlockchainAnchorService } from './IBlockchainAnchorService';
import { realHGTPService } from './realHGTPService';
import { mockHGTPService } from './mockHGTPService';

/**
 * Blockchain Service Factory
 * Returns appropriate implementation based on environment configuration
 */
class BlockchainServiceFactory {
  private service: IBlockchainAnchorService;
  private isDemoMode: boolean;

  constructor() {
    // DEMO MODE ONLY - Real blockchain adapter not yet implemented
    // This facade provides the abstraction layer for easy future integration
    
    const hasDigitalEvidenceKey = !!process.env.DIGITAL_EVIDENCE_API_KEY;
    const hasConstellationCreds = !!(
      process.env.CONSTELLATION_PRIVATE_KEY && 
      process.env.CONSTELLATION_PUBLIC_KEY && 
      process.env.CONSTELLATION_WALLET_ADDRESS
    );

    // TODO: Implement Digital Evidence API adapter
    // When implemented, uncomment this section:
    /*
    if (hasDigitalEvidenceKey) {
      this.service = new DigitalEvidenceService();
      this.isDemoMode = false;
      logger.info('✅ Using Digital Evidence API for real blockchain anchoring');
      return;
    }
    */

    // Current: ALWAYS use mock for hackathon demo
    if (hasDigitalEvidenceKey) {
      logger.warn('⚠️  Digital Evidence API key detected but adapter NOT IMPLEMENTED - using mock mode');
    }
    if (hasConstellationCreds) {
      logger.warn('⚠️  Constellation credentials configured but /data endpoint requires custom metagraph - using mock mode');
    }
    
    this.service = mockHGTPService;
    this.isDemoMode = true;

    logger.info('🎭 Blockchain service initialized in DEMO MODE ONLY', {
      mode: 'MOCK (deterministic simulation)',
      service: 'MockHGTPService',
      note: 'Real blockchain adapter not yet implemented'
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
