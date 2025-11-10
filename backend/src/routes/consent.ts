/**
 * Consent API routes with Supabase integration
 */

import { Router, Request, Response } from 'express';
import {
  ConsentGrantRequest,
  ConsentVerifyRequest,
  ConsentRevokeRequest,
  APIError
} from '@consentire/shared';
import { pgConsentService } from '../services/pgConsentService';
import { authenticateUser, optionalAuth } from '../middleware/supabaseAuth';
import { logger } from '../utils/logger';

export const consentRouter = Router();

/**
 * POST /api/v1/consent/grant
 * Grant consent (requires authentication)
 */
consentRouter.post('/grant', authenticateUser, async (req: Request, res: Response) => {
  try {
    const request: ConsentGrantRequest = req.body;
    const userId = req.user!.id; // From Supabase auth middleware
    
    // Validate request
    if (!request.controllerId || !request.purpose) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: controllerId, purpose',
        timestamp: Date.now()
      } as APIError);
    }

    const result = await pgConsentService.grantConsent(request, userId);
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Error granting consent', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to grant consent',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/consent/verify/:userId/:controllerId/:purpose
 * Verify consent (ZK - no personal data)
 */
consentRouter.get('/verify/:userId/:controllerId/:purpose', async (req: Request, res: Response) => {
  try {
    const { userId, controllerId, purpose } = req.params;
    
    const request: ConsentVerifyRequest = {
      userId: decodeURIComponent(userId),
      controllerId: decodeURIComponent(controllerId),
      purpose: decodeURIComponent(purpose)
    };

    const result = await pgConsentService.verifyConsent(request);
    
    if (!result.isValid) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Error verifying consent', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to verify consent',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * POST /api/v1/consent/revoke/:consentId
 * Revoke consent (requires authentication)
 */
consentRouter.post('/revoke/:consentId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { consentId } = req.params;
    const { signature } = req.body;
    const userId = req.user!.id; // From Supabase auth middleware
    
    if (!signature) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required field: signature',
        timestamp: Date.now()
      } as APIError);
    }

    const request: ConsentRevokeRequest = {
      consentId,
      userId,
      signature
    };

    const result = await pgConsentService.revokeConsent(request, userId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error revoking consent', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to revoke consent',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/consent/user/me
 * Get all active consents for authenticated user
 */
consentRouter.get('/user/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // From Supabase auth middleware
    const consents = await pgConsentService.getActiveConsents(userId);
    res.json({ consents, count: consents.length });
  } catch (error: any) {
    logger.error('Error getting user consents', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to get user consents',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/consent/user/:userId
 * Get all active consents for a specific user (admin only)
 */
consentRouter.get('/user/:userId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user!.id;
    
    // Users can only access their own consents unless they're admin
    if (userId !== requestingUserId && req.user!.role !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied: can only view your own consents',
        timestamp: Date.now()
      } as APIError);
    }
    
    const consents = await pgConsentService.getActiveConsents(userId);
    res.json({ consents, count: consents.length });
  } catch (error: any) {
    logger.error('Error getting user consents', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to get user consents',
      timestamp: Date.now()
    } as APIError);
  }
});
