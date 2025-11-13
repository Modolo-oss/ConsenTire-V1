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
import { authService } from '../services/authService';
import { cryptoService, SignatureAlgorithm } from '../services/cryptoService';

export const consentRouter = Router();

// SECURITY: In-memory nonce store to prevent signature replay attacks
// Production should use Redis or database with TTL
interface NonceEntry {
  signature: string;
  timestamp: number;
}

const usedSignatures = new Map<string, NonceEntry>();

// Cleanup expired nonces every minute
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  for (const [key, entry] of usedSignatures.entries()) {
    if (now - entry.timestamp > maxAge) {
      usedSignatures.delete(key);
    }
  }
}, 60 * 1000);

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
    const { signature, timestamp } = req.body;  // SECURITY FIX: Don't accept publicKey from client
    const userId = req.user!.id; // From auth middleware
    
    if (!signature || !timestamp) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: signature and timestamp',
        timestamp: Date.now()
      } as APIError);
    }

    // SECURITY: Enforce timestamp freshness (prevent replay attacks)
    const now = Date.now();
    const requestTimestamp = parseInt(timestamp);
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (isNaN(requestTimestamp)) {
      return res.status(400).json({
        code: 'INVALID_TIMESTAMP',
        message: 'Timestamp must be a valid number',
        timestamp: now
      } as APIError);
    }

    if (Math.abs(now - requestTimestamp) > maxAge) {
      logger.warn('Timestamp outside acceptable window', {
        userId,
        consentId,
        requestTimestamp,
        now,
        difference: Math.abs(now - requestTimestamp)
      });
      return res.status(401).json({
        code: 'TIMESTAMP_EXPIRED',
        message: 'Request timestamp too old or too far in future. Please try again.',
        timestamp: now
      } as APIError);
    }

    // SECURITY: ATOMIC check-and-set to prevent replay attacks
    // CRITICAL: Must set IMMEDIATELY after check (NO awaits between) to prevent race conditions
    if (usedSignatures.has(signature)) {
      logger.warn('Signature already used - replay attack detected', {
        userId,
        consentId,
        signaturePrefix: signature.substring(0, 16) + '...',
        originalTimestamp: usedSignatures.get(signature)?.timestamp
      });
      return res.status(401).json({
        code: 'SIGNATURE_REPLAY',
        message: 'This signature has already been used. Replay attack prevented.',
        timestamp: now
      } as APIError);
    }

    // ATOMIC: Reserve signature IMMEDIATELY (before any await)
    // NOTE: In-memory store clears on process restart. Production should use Redis with SETNX.
    usedSignatures.set(signature, {
      signature,
      timestamp: now
    });

    // From this point forward, if any validation fails, we must remove the signature to allow retry
    try {
      // Reconstruct the message that was signed
      const messagePayload = {
        action: 'revoke_consent',
        consentId,
        userId,
        timestamp: requestTimestamp
      };
      const message = JSON.stringify(messagePayload);

      // SECURITY FIX: Fetch user's stored public key from database (don't trust client)
      const user = await authService.getUserById(userId);
      if (!user || !user.public_key) {
        usedSignatures.delete(signature); // Allow retry if key not found
        return res.status(401).json({
          code: 'MISSING_PUBLIC_KEY',
          message: 'User public key not found. Please log in again to generate signing keys.',
          timestamp: now
        } as APIError);
      }

      // Verify Ed25519 signature using STORED public key (not client-supplied)
      const verificationResult = await cryptoService.verifySignature(
        message,
        signature,
        user.public_key,  // SECURITY: This comes from database, not from client
        SignatureAlgorithm.ED25519
      );

      if (!verificationResult.isValid) {
        usedSignatures.delete(signature); // Allow retry if signature invalid
        logger.warn('Invalid signature for revoke consent', {
          userId,
          consentId,
          signatureProvided: signature.substring(0, 16) + '...',
          storedPublicKey: user.public_key.substring(0, 16) + '...'
        });
        return res.status(401).json({
          code: 'INVALID_SIGNATURE',
          message: 'Invalid cryptographic signature. Request denied.',
          timestamp: now
        } as APIError);
      }

      logger.info('✅ Signature verified successfully for revoke consent', {
        userId,
        consentId,
        algorithm: 'Ed25519',
        publicKeyUsed: user.public_key.substring(0, 16) + '...'
      });

      // Execute revocation
      const request: ConsentRevokeRequest = {
        consentId,
        userId,
        signature
      };

      const result = await pgConsentService.revokeConsent(request, userId);
      
      logger.info('✅ Consent revoked successfully', {
        userId,
        consentId,
        signatureStored: true
      });
      
      res.json(result);
    } catch (error: any) {
      // If ANY validation or revocation fails, remove signature to allow retry
      usedSignatures.delete(signature);
      throw error;
    }
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
