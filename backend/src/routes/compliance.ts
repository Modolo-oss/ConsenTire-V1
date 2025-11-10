/**
 * Compliance API routes
 */

import { Router, Request, Response } from 'express';
import { ComplianceStatus, APIError } from '@consentire/shared';
import { logger } from '../utils/logger';
import { pgConsentService } from '../services/pgConsentService';
import { authenticateUser, requireAdmin } from '../middleware/supabaseAuth';
import { databaseService } from '../services/databaseService';

export const complianceRouter = Router();

/**
 * Helper function to get authorized controller_hash for compliance access
 * Returns controller_hash if user is controller, null if regulator/admin (access all data)
 */
async function getAuthorizedControllerHashForCompliance(req: Request): Promise<string | null> {
  const user = req.user;
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Regulators and admins can access all data - no filtering
  if (user.role === 'regulator' || user.role === 'admin') {
    return null;
  }

  // Controllers can only access their own organization's data
  if (user.role === 'controller' && user.organizationId) {
    // Resolve controller_hash from organizationId
    const result = await databaseService.query(
      'SELECT controller_hash FROM controllers WHERE organization_id = $1',
      [user.organizationId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`No controller found for organizationId: ${user.organizationId}`);
    }
    
    return result.rows[0].controller_hash;
  }

  // Regular users shouldn't access compliance
  throw new Error('Insufficient permissions to access compliance data');
}

/**
 * GET /api/v1/compliance/status/:controllerHash
 * Get GDPR compliance status for a controller
 * SERVER-SIDE VALIDATION: Controllers can only access their own organization's compliance
 */
complianceRouter.get('/status/:controllerHash', authenticateUser, async (req: Request, res: Response) => {
  try {
    const requestedHash = req.params.controllerHash;
    
    // Get authorized controller_hash from JWT (server-side, cannot be tampered)
    const authorizedControllerHash = await getAuthorizedControllerHashForCompliance(req);

    // Validate: If user is a controller, they can only access their own organization's data
    if (authorizedControllerHash && requestedHash !== authorizedControllerHash) {
      logger.warn('Controller attempted to access another organization\'s compliance', {
        userId: req.user?.id,
        requestedHash,
        authorizedHash: authorizedControllerHash
      });
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied: You can only access your own organization\'s compliance data',
        timestamp: Date.now()
      } as APIError);
    }

    // Use the authorized hash (or requested hash for regulators)
    const controllerHash = authorizedControllerHash || requestedHash;
    
    const metrics = await pgConsentService.getComplianceMetrics(controllerHash);
    const complianceStatus: ComplianceStatus = {
      controllerHash: metrics.controllerHash,
      gdprArticle7: true,
      gdprArticle12: true,
      gdprArticle13: true,
      gdprArticle17: true,
      gdprArticle20: true,
      gdprArticle25: true,
      gdprArticle30: true,
      overallCompliance: Math.round(metrics.complianceScore),
      lastAudit: metrics.lastAudit
    };
    res.json(complianceStatus);
  } catch (error: any) {
    logger.error('Error getting compliance status', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to get compliance status',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/compliance/report/:controllerHash
 * Generate detailed compliance report (admin only)
 */
complianceRouter.get('/report/:controllerHash', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { controllerHash } = req.params;
    const report = await pgConsentService.getComplianceReport(controllerHash);
    res.json({
      controller: report.controller,
      metrics: report.metrics,
      summary: report.summary,
      recentConsents: report.recentConsents,
      auditTrail: report.auditTrail,
      generatedAt: Date.now()
    });
  } catch (error: any) {
    logger.error('Error generating compliance report', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to generate compliance report',
      timestamp: Date.now()
    } as APIError);
  }
});
