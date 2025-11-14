/**
 * Blockchain Facade / Factory
 * Routes blockchain operations to real or mock implementation based on configuration
 */

import { logger } from '../utils/logger.js';
import { IBlockchainAnchorService } from './IBlockchainAnchorService.js';
import { realHGTPService } from './realHGTPService.js';
import { mockHGTPService } from './mockHGTPService.js';
import { createDigitalEvidenceService } from './digitalEvidenceService.js';

/**
 * Blockchain Service Factory
 * Auto-detects credentials and routes to appropriate blockchain service:
 * 1. Digital Evidence API (if API_KEY + ORG_ID + TENANT_ID configured)
 * 2. Constellation HGTP (if PRIVATE_KEY + PUBLIC_KEY + WALLET_ADDRESS configured)
 * 3. Mock Service (fallback for demo mode)
 * 
 * Blockchain hash verification: https://digitalevidence.constellationnetwork.io/fingerprint/[hash]
 */
class BlockchainServiceFactory {
  private service: IBlockchainAnchorService;
  private isDemoMode: boolean;
  private activeServiceName: string;

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

    const allowMockFallback = process.env.ALLOW_MOCK_FALLBACK === 'true';

    // Priority 1: Digital Evidence API (preferred for GDPR consent anchoring)
    if (hasDigitalEvidenceKey) {
      try {
        this.service = createDigitalEvidenceService();
        this.isDemoMode = false;
        this.activeServiceName = 'DigitalEvidenceService';
        
        logger.info('🔗 DigitalEvidenceService initialized - REAL BLOCKCHAIN MODE', {
          service: 'Digital Evidence API',
          mode: 'PRODUCTION',
          explorer: 'https://digitalevidence.constellationnetwork.io/fingerprint/[hash]'
        });
        return;
      } catch (error: any) {
        const errorMsg = `Failed to initialize Digital Evidence service: ${error.message}`;
        logger.error('❌ Digital Evidence initialization failed', {
          error: error.message,
          hasCredentials: true,
          allowFallback: allowMockFallback
        });

        // HARD FAIL if credentials present but initialization failed (unless explicit override)
        if (!allowMockFallback) {
          logger.error('🚨 FATAL: Digital Evidence credentials configured but service failed to initialize', {
            error: errorMsg,
            solution: 'Fix Digital Evidence credentials or set ALLOW_MOCK_FALLBACK=true to use mock mode'
          });
          throw new Error(`Blockchain initialization failed: ${errorMsg}. Set ALLOW_MOCK_FALLBACK=true to allow mock fallback.`);
        }

        logger.warn('⚠️ FALLING BACK TO MOCK MODE (ALLOW_MOCK_FALLBACK=true)', {
          reason: 'Digital Evidence service initialization failed',
          error: error.message
        });
      }
    }
    
    // Priority 2: Constellation HGTP (direct blockchain integration)
    if (hasConstellationCreds) {
      this.service = realHGTPService;
      this.isDemoMode = false;
      this.activeServiceName = 'RealHGTPService';
      
      logger.info('🔗 RealHGTPService initialized - REAL BLOCKCHAIN MODE', {
        service: 'Constellation HGTP',
        mode: 'PRODUCTION',
        explorer: 'https://be.constellationnetwork.io/mainnet/transactions/[hash]'
      });
      return;
    }
    
    // Priority 3: Mock Service (demo/testing)
    this.service = mockHGTPService;
    this.isDemoMode = true;
    this.activeServiceName = 'MockHGTPService';

    logger.warn('🎭 MockHGTPService initialized - DEMO MODE', {
      message: 'No blockchain credentials configured. Using deterministic mock for demo.',
      note: 'Configure DIGITAL_EVIDENCE_API_KEY or CONSTELLATION credentials for real blockchain'
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

  /**
   * Get active service name
   */
  getActiveServiceName(): string {
    return this.activeServiceName;
  }
}

// Export singleton instance
const factory = new BlockchainServiceFactory();

export const blockchainService = factory.getService();
export const isDemoMode = factory.isDemo();
export const blockchainMode = factory.getMode();
export const activeServiceName = factory.getActiveServiceName();

// Export factory for testing
export { BlockchainServiceFactory };
