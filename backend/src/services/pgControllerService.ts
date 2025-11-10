/**
 * PostgreSQL-backed Controller (Organization) Service
 */

import {
  ControllerRegistrationRequest,
  ControllerRegistrationResponse
} from '@consentire/shared';
import { generateControllerHash } from '../utils/crypto';
import { logger } from '../utils/logger';
import { Pool } from 'pg';

class PgControllerService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * Register a new controller (organization)
   */
  async registerController(request: ControllerRegistrationRequest, creatorUserId: string): Promise<ControllerRegistrationResponse> {
    try {
      const controllerHash = generateControllerHash(request.organizationId);

      // Upsert controller by unique organization_id using PostgreSQL
      const result = await this.pool.query(`
        INSERT INTO controllers (
          organization_name, organization_id, controller_hash, public_key, metadata
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (organization_id) DO UPDATE SET
          organization_name = EXCLUDED.organization_name,
          controller_hash = EXCLUDED.controller_hash,
          public_key = EXCLUDED.public_key,
          metadata = EXCLUDED.metadata
        RETURNING id, organization_name, organization_id, controller_hash, public_key, metadata, created_at
      `, [
        request.organizationName,
        request.organizationId,
        controllerHash,
        request.publicKey,
        JSON.stringify(request.metadata || {})
      ]);

      const data = result.rows[0];

      if (!data) {
        throw new Error('Failed to register controller');
      }

      logger.info('Controller registered (PostgreSQL)', { id: data.id, controllerHash });

      return {
        controllerId: data.id, // UUID from DB
        controllerHash,
        registeredAt: Date.now()
      };
    } catch (error) {
      logger.error('registerController failed', { error, request });
      throw error;
    }
  }

  /**
   * Get controller info by DB id (UUID)
   */
  async getController(controllerId: string) {
    const result = await this.pool.query(
      'SELECT * FROM controllers WHERE id = $1',
      [controllerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Controller not found');
    }
    
    return result.rows[0];
  }

  /**
   * Get all controllers with consent counts
   */
  async getAllControllers() {
    try {
      const result = await this.pool.query(`
        SELECT 
          c.id,
          c.organization_name as name,
          c.controller_hash,
          COUNT(DISTINCT CASE WHEN co.status = 'granted' THEN co.consent_id END) as total_consents,
          c.created_at as last_audit
        FROM controllers c
        LEFT JOIN consents co ON c.controller_hash = co.controller_hash
        GROUP BY c.id, c.organization_name, c.controller_hash, c.created_at
        ORDER BY c.created_at DESC
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.organization_name || row.name,
        controller_hash: row.controller_hash,
        complianceScore: Math.floor(Math.random() * 30) + 70, // Mock score for now
        totalConsents: parseInt(row.total_consents) || 0,
        lastAudit: row.last_audit
      }));
    } catch (error) {
      logger.error('getAllControllers failed', { error });
      throw error;
    }
  }

  /**
   * Get overall controller statistics
   */
  async getControllerStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(DISTINCT c.id) as total_controllers,
          COUNT(DISTINCT CASE WHEN co.status = 'granted' THEN co.consent_id END) as active_consents,
          AVG(CASE 
            WHEN COUNT(co.consent_id) > 0 THEN 85
            ELSE 70
          END) as compliance_score
        FROM controllers c
        LEFT JOIN consents co ON c.controller_hash = co.controller_hash
      `);
      
      const stats = result.rows[0];
      return {
        totalControllers: parseInt(stats.total_controllers) || 0,
        activeConsents: parseInt(stats.active_consents) || 0,
        complianceScore: parseFloat(stats.compliance_score) || 75.0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('getControllerStats failed', { error });
      throw error;
    }
  }
}

export const pgControllerService = new PgControllerService();

