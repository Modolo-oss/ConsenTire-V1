/**
 * Controller (Organization) API routes
 */

import { Router, Request, Response } from 'express';
import {
  ControllerRegistrationRequest,
  ControllerRegistrationResponse,
  APIError
} from '@consentire/shared';
import { authenticateUser, requireAdmin } from '../middleware/supabaseAuth';
import { pgControllerService } from '../services/pgControllerService';
import { logger } from '../utils/logger';

export const controllerRouter = Router();

// Production: use Supabase-backed service

/**
 * POST /api/v1/controllers/register
 * Register a new data controller (organization)
 */
controllerRouter.post('/register', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const request: ControllerRegistrationRequest = req.body;
    
    // Validate request
    if (!request.organizationName || !request.organizationId || !request.publicKey) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: organizationName, organizationId, publicKey',
        timestamp: Date.now()
      } as APIError);
    }

    const response = await pgControllerService.registerController(request, req.user!.id);
    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Error registering controller', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to register controller',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/controllers/:controllerId
 * Get controller information
 */
/**
 * GET /api/v1/controllers/all
 * List all controllers with stats (accessible by authenticated users)
 */
controllerRouter.get('/all', authenticateUser, async (req: Request, res: Response) => {
  try {
    const controllers = await pgControllerService.getAllControllers();
    res.json({ controllers });
  } catch (error: any) {
    logger.error('Error listing controllers', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to list controllers',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/controllers/stats
 * Get overall controller statistics
 */
controllerRouter.get('/stats', authenticateUser, async (req: Request, res: Response) => {
  try {
    const stats = await pgControllerService.getControllerStats();
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting controller stats', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to get controller stats',
      timestamp: Date.now()
    } as APIError);
  }
});

controllerRouter.get('/:controllerId', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { controllerId } = req.params;
    const data = await pgControllerService.getController(controllerId);
    res.json({
      controllerId: data.id,
      controllerHash: data.controller_hash,
      organizationName: data.organization_name,
      organizationId: data.organization_id,
      registeredAt: new Date(data.created_at).getTime()
    });
  } catch (error: any) {
    logger.error('Error getting controller', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to get controller',
      timestamp: Date.now()
    } as APIError);
  }
});
