/**
 * PostgreSQL-powered Consent Service
 * Migrated from Supabase SDK to direct PostgreSQL queries
 */

import {
  ConsentGrantRequest,
  ConsentGrantResponse,
  ConsentVerifyRequest,
  ConsentVerifyResponse,
  ConsentRevokeRequest,
  ConsentRevokeResponse,
  ConsentStatus
} from '@consentire/shared';
import { databaseService } from '../services/databaseService';
import { realZKService } from './realZKService';
import { blockchainService, isDemoMode } from './blockchainFacade';
import { 
  hash, 
  generateConsentId, 
  generateControllerHash, 
  generatePurposeHash 
} from '../utils/crypto';
import { logger } from '../utils/logger';

interface ConsentRecord {
  consent_id: string;
  user_id: string;
  controller_hash: string;
  purpose_hash: string;
  data_categories: string[];
  lawful_basis: string;
  status: string;
  granted_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  zk_proof: any;
  hgtp_tx_hash: string | null;
}

interface AuditLogRecord {
  id?: number;
  consent_id?: string;
  user_id?: string;
  controller_hash?: string;
  action: string;
  details?: any;
  hgtp_tx_hash?: string;
  timestamp?: string;
}

class PgConsentService {
  
  /**
   * Grant consent with PostgreSQL persistence
   */
  async grantConsent(request: ConsentGrantRequest, userId: string): Promise<ConsentGrantResponse> {
    logger.info('Granting consent via PostgreSQL', { userId, controllerId: request.controllerId });

    try {
      // request.controllerId now contains controller_hash from frontend
      const controllerHash = request.controllerId;
      const purposeHash = generatePurposeHash(request.purpose);
      const timestamp = Date.now();
      const consentId = generateConsentId(
        userId,
        controllerHash,
        request.purpose,
        timestamp
      );

      // Verify controller exists
      const controllerResult = await databaseService.query(
        'SELECT id, controller_hash FROM controllers WHERE controller_hash = $1',
        [controllerHash]
      );

      if (controllerResult.rows.length === 0) {
        throw new Error('Controller not found. Please register the organization first.');
      }

      const controller = controllerResult.rows[0];

      // Check for existing consent
      const existingConsentResult = await databaseService.query(
        `SELECT consent_id AS id FROM consents 
         WHERE user_id = $1 
         AND controller_hash = $2 
         AND purpose_hash = $3 
         AND status = $4`,
        [userId, controllerHash, purposeHash, 'granted']
      );

      if (existingConsentResult.rows.length > 0) {
        throw new Error('Active consent already exists for this purpose');
      }

      const zkProof = await realZKService.generateConsentProof({
        controllerHash,
        purposeHash,
        timestamp: timestamp.toString(),
        userId: hash(userId),
        userSecret: hash(userId + request.lawfulBasis),
        nonce: hash(timestamp.toString() + userId)
      });

      const insertResult = await databaseService.query(
        `INSERT INTO consents (
          consent_id, user_id, controller_hash, purpose_hash,
          data_categories, lawful_basis, status, granted_at, expires_at, zk_proof
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          consentId,
          userId,
          controllerHash,
          purposeHash,
          request.dataCategories,
          request.lawfulBasis,
          'granted',
          new Date(timestamp).toISOString(),
          request.expiresAt ? new Date(request.expiresAt).toISOString() : null,
          JSON.stringify(zkProof)
        ]
      );

      if (insertResult.rows.length === 0) {
        throw new Error('Failed to insert consent');
      }

      // Try blockchain anchoring (non-blocking for demo)
      let hgtpTxHash = '';
      let anchoringTimestamp = Date.now();
      
      try {
        const hgtpResult = await blockchainService.anchorConsent({
          consentId,
          controllerHash,
          purposeHash,
          status: ConsentStatus.GRANTED,
          grantedAt: timestamp,
          expiresAt: request.expiresAt,
          hgtpTxHash: '',
          userId: hash(userId)
        });

        hgtpTxHash = hgtpResult.transactionHash;
        anchoringTimestamp = hgtpResult.anchoringTimestamp;

        await databaseService.query(
          'UPDATE consents SET hgtp_tx_hash = $1, anchoring_timestamp = $2 WHERE consent_id = $3',
          [hgtpTxHash, new Date(anchoringTimestamp).toISOString(), consentId]
        );

        logger.info('Consent anchored to blockchain successfully', { consentId, hgtpTxHash });
      } catch (blockchainError: any) {
        // Blockchain anchoring failed - use mock hash for demo
        logger.warn('Blockchain anchoring failed, using mock TX hash', { 
          error: blockchainError.message,
          consentId 
        });
        
        hgtpTxHash = `mock_tx_${consentId.substring(0, 16)}`;
        
        await databaseService.query(
          'UPDATE consents SET hgtp_tx_hash = $1, anchoring_timestamp = $2 WHERE consent_id = $3',
          [hgtpTxHash, new Date(anchoringTimestamp).toISOString(), consentId]
        );
      }

      await this.createAuditLog({
        consent_id: consentId,
        user_id: userId,
        controller_hash: controller.id,
        action: 'consent_granted',
        details: {
          purpose: request.purpose,
          lawfulBasis: request.lawfulBasis,
          dataCategories: request.dataCategories
        },
        hgtp_tx_hash: hgtpTxHash
      });

      logger.info('Consent granted successfully', { 
        consentId, 
        hgtpTxHash 
      });

      return {
        consentId,
        hgtpTxHash,
        status: ConsentStatus.GRANTED,
        expiresAt: request.expiresAt,
        grantedAt: timestamp
      };

    } catch (error) {
      logger.error('Failed to grant consent', { error, userId, controllerId: request.controllerId });
      throw error;
    }
  }

  /**
   * Verify consent with ZK proof (no personal data exposure)
   */
  async verifyConsent(request: ConsentVerifyRequest): Promise<ConsentVerifyResponse> {
    logger.info('Verifying consent via PostgreSQL', { 
      userId: request.userId, 
      controllerId: request.controllerId 
    });

    try {
      const controllerHash = generateControllerHash(request.controllerId);
      const purposeHash = generatePurposeHash(request.purpose);

      const consentResult = await databaseService.query(
        `SELECT * FROM consents 
         WHERE user_id = $1 
         AND controller_hash = $2 
         AND purpose_hash = $3`,
        [request.userId, controllerHash, purposeHash]
      );

      if (consentResult.rows.length === 0) {
        return {
          isValid: false,
          error: 'Consent not found'
        };
      }

      const consentRecord = consentResult.rows[0];

      if (consentRecord.expires_at && new Date() > new Date(consentRecord.expires_at)) {
        await databaseService.query(
          'UPDATE consents SET status = $1 WHERE consent_id = $2',
          ['expired', consentRecord.consent_id]
        );

        return {
          isValid: false,
          status: ConsentStatus.EXPIRED,
          error: 'Consent expired'
        };
      }

      if (consentRecord.status !== 'granted') {
        return {
          isValid: false,
          status: consentRecord.status as ConsentStatus,
          error: `Consent is ${consentRecord.status}`
        };
      }

      const zkProof = await realZKService.generateVerificationProof(
        consentRecord.controller_hash,
        consentRecord.purpose_hash,
        true,
        new Date(consentRecord.granted_at).getTime()
      );

      const merkleProof = await blockchainService.getMerkleProof(consentRecord.consent_id);

      await this.createAuditLog({
        consent_id: consentRecord.consent_id,
        user_id: request.userId,
        action: 'consent_verified',
        details: {
          purpose: request.purpose,
          verificationResult: 'valid'
        }
      });

      logger.info('Consent verified successfully', { 
        consentId: consentRecord.consent_id, 
        isValid: true 
      });

      return {
        isValid: true,
        consentId: consentRecord.consent_id,
        zkProof,
        merkleProof,
        status: ConsentStatus.GRANTED
      };

    } catch (error) {
      logger.error('Failed to verify consent', { error, request });
      return {
        isValid: false,
        error: 'Verification failed'
      };
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(request: ConsentRevokeRequest, userId: string): Promise<ConsentRevokeResponse> {
    logger.info('Revoking consent via PostgreSQL', { consentId: request.consentId, userId });

    try {
      const consentResult = await databaseService.query(
        'SELECT * FROM consents WHERE consent_id = $1 AND user_id = $2',
        [request.consentId, userId]
      );

      if (consentResult.rows.length === 0) {
        throw new Error('Consent not found or access denied');
      }

      const consentRecord = consentResult.rows[0];

      if (consentRecord.status !== 'granted') {
        throw new Error(`Cannot revoke consent with status: ${consentRecord.status}`);
      }

      const revokedAt = Date.now();

      const hgtpResult = await blockchainService.updateConsentStatus(
        request.consentId, 
        ConsentStatus.REVOKED
      );

      const updateResult = await databaseService.query(
        `UPDATE consents 
         SET status = $1, updated_at = $2, hgtp_tx_hash = $3, anchoring_timestamp = $4
         WHERE consent_id = $5`,
        [
          'revoked', 
          new Date(revokedAt).toISOString(), 
          hgtpResult.transactionHash,
          new Date(hgtpResult.anchoringTimestamp).toISOString(),
          request.consentId
        ]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Failed to revoke consent');
      }

      await this.createAuditLog({
        consent_id: request.consentId,
        user_id: userId,
        action: 'consent_revoked',
        details: {
          revokedAt,
          reason: 'user_request'
        },
        hgtp_tx_hash: hgtpResult.transactionHash
      });

      logger.info('Consent revoked successfully', { 
        consentId: request.consentId, 
        hgtpTxHash: hgtpResult.transactionHash 
      });

      return {
        consentId: request.consentId,
        status: ConsentStatus.REVOKED,
        revokedAt,
        hgtpTxHash: hgtpResult.transactionHash
      };

    } catch (error) {
      logger.error('Failed to revoke consent', { error, consentId: request.consentId, userId });
      throw error;
    }
  }

  /**
   * Get user's active consents
   */
  async getActiveConsents(userId: string): Promise<any[]> {
    try {
      const result = await databaseService.query(
        `SELECT *
         FROM consents
         WHERE user_id = $1 
         AND status = $2
         ORDER BY granted_at DESC`,
        [userId, 'granted']
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get active consents', { error, userId });
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(logData: Partial<AuditLogRecord>): Promise<void> {
    try {
      await databaseService.query(
        `INSERT INTO audit_logs (consent_id, user_id, controller_hash, action, details, hgtp_tx_hash, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          logData.consent_id || null,
          logData.user_id || null,
          logData.controller_hash || null,
          logData.action,
          JSON.stringify(logData.details || {}),
          logData.hgtp_tx_hash || null,
          new Date().toISOString()
        ]
      );
    } catch (error) {
      logger.error('Failed to create audit log', { error, logData });
    }
  }

  /**
   * Get compliance metrics for a controller
   */
  async getComplianceMetrics(controllerHash: string) {
    try {
      const countsResult = await databaseService.query(
        'SELECT status, lawful_basis, granted_at, zk_proof FROM consents WHERE controller_hash = $1',
        [controllerHash]
      );

      const consents = countsResult.rows;
      const totalConsents = consents.length;
      const activeConsents = consents.filter((c: any) => c.status === 'granted').length;
      const revokedConsents = consents.filter((c: any) => c.status === 'revoked').length;
      const expiredConsents = consents.filter((c: any) => c.status === 'expired').length;

      // Check audit logs for this controller
      const auditResult = await databaseService.query(
        'SELECT COUNT(*) as count FROM audit_logs WHERE controller_hash = $1',
        [controllerHash]
      );
      const hasAuditLogs = parseInt(auditResult.rows[0]?.count || '0') > 0;

      // GDPR Article Compliance Checks
      const gdprArticle7 = totalConsents > 0 && consents.every((c: any) => c.lawful_basis); // Consent records exist with lawful basis
      const gdprArticle12 = totalConsents > 0; // Transparent processing (consent records tracked)
      const gdprArticle13 = consents.every((c: any) => c.lawful_basis); // Purpose disclosed (lawful basis required)
      const gdprArticle17 = true; // Right to erasure enabled (revoke endpoint exists)
      const gdprArticle20 = true; // Data portability enabled (export endpoint exists)
      const gdprArticle25 = consents.filter((c: any) => c.zk_proof).length > 0; // Privacy by design (ZK proofs used)
      const gdprArticle30 = hasAuditLogs; // Record of processing activities

      const gdprCompliance = [
        gdprArticle7, gdprArticle12, gdprArticle13, gdprArticle17,
        gdprArticle20, gdprArticle25, gdprArticle30
      ];
      const gdprComplianceRate = (gdprCompliance.filter(Boolean).length / gdprCompliance.length) * 100;

      // Calculate overall score
      let complianceScore = 100;
      if (totalConsents > 0) {
        const revokedRate = (revokedConsents / totalConsents) * 100;
        const expiredRate = (expiredConsents / totalConsents) * 100;
        const baseScore = Math.max(0, 100 - (revokedRate * 0.5) - (expiredRate * 0.3));
        complianceScore = (baseScore * 0.6) + (gdprComplianceRate * 0.4);
      } else {
        complianceScore = gdprComplianceRate;
      }

      return {
        controllerHash,
        complianceScore: Math.round(complianceScore),
        totalConsents,
        activeConsents,
        revokedConsents,
        expiredConsents,
        gdprArticle7,
        gdprArticle12,
        gdprArticle13,
        gdprArticle17,
        gdprArticle20,
        gdprArticle25,
        gdprArticle30,
        lastAudit: Date.now()
      };
    } catch (error) {
      logger.error('Failed to get compliance metrics', { error, controllerHash });
      throw error;
    }
  }

  /**
   * Build detailed compliance report for a controller
   */
  async getComplianceReport(controllerHash: string) {
    try {
      const controllerResult = await databaseService.query(
        'SELECT * FROM controllers WHERE controller_hash = $1',
        [controllerHash]
      );

      if (controllerResult.rows.length === 0) {
        throw new Error('Controller not found');
      }

      const controller = controllerResult.rows[0];
      const metrics = await this.getComplianceMetrics(controllerHash);

      const consentsResult = await databaseService.query(
        `SELECT * FROM consents 
         WHERE controller_hash = $1 
         ORDER BY granted_at DESC 
         LIMIT 200`,
        [controllerHash]
      );

      const consents = consentsResult.rows;

      const auditLogsResult = await databaseService.query(
        `SELECT * FROM audit_logs 
         WHERE controller_id = $1 
         ORDER BY created_at DESC 
         LIMIT 200`,
        [controller.id]
      );

      const auditLogs = auditLogsResult.rows;

      const statusCounts = {
        granted: consents.filter((c: any) => c.status === 'granted').length,
        revoked: consents.filter((c: any) => c.status === 'revoked').length,
        expired: consents.filter((c: any) => c.status === 'expired').length
      };

      const recentConsents = consents.slice(0, 25).map((record: any) => ({
        consentId: record.id,
        purpose: record.purpose,
        status: record.status,
        grantedAt: record.granted_at,
        expiresAt: record.expires_at,
        revokedAt: record.revoked_at,
        hgtpTxHash: record.hgtp_tx_hash,
        lawfulBasis: record.lawful_basis,
        dataCategories: record.data_categories
      }));

      const recentAuditLogs = auditLogs.slice(0, 50).map((log: any) => ({
        id: log.id,
        action: log.action,
        consentId: log.consent_id,
        userId: log.user_id,
        details: log.details,
        hgtpTxHash: log.hgtp_tx_hash,
        timestamp: log.created_at
      }));

      return {
        controller: {
          id: controller.id,
          organizationName: controller.organization_name,
          organizationId: controller.organization_id,
          controllerHash: controller.controller_hash,
          createdAt: controller.created_at
        },
        metrics,
        summary: {
          totalConsents: metrics.totalConsents,
          activeConsents: metrics.activeConsents,
          revokedConsents: metrics.revokedConsents,
          expiredConsents: metrics.expiredConsents,
          statusCounts,
          lastUpdated: Date.now()
        },
        recentConsents,
        auditTrail: recentAuditLogs
      };
    } catch (error) {
      logger.error('Failed to build compliance report', { error, controllerHash });
      throw error;
    }
  }
}

export const pgConsentService = new PgConsentService();
