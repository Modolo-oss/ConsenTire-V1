/**
 * System Status Routes
 * Provides blockchain mode, health check, and system information
 */

import express, { Request, Response } from 'express';
import { blockchainService, isDemoMode, blockchainMode, activeServiceName } from '../services/blockchainFacade';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/status
 * Get system status including blockchain mode
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const networkStatus = await blockchainService.getNetworkStatus();
    
    res.json({
      success: true,
      blockchain: {
        mode: blockchainMode,
        isDemo: isDemoMode,
        activeService: activeServiceName,
        networkStatus,
        message: isDemoMode 
          ? 'Running in DEMO mode - blockchain operations are simulated. Configure Digital Evidence API credentials to enable real blockchain anchoring.'
          : `Connected to real blockchain network via ${activeServiceName}`
      },
      database: {
        connected: true,
        type: 'PostgreSQL'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get system status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status'
    });
  }
});

/**
 * GET /api/status/health
 * Simple health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
