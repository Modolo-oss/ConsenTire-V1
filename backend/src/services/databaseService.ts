/**
 * Database Service - PostgreSQL integration for ConsenTide
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { 
  ConsentState, 
  UserRegistrationRequest, 
  ControllerRegistrationRequest,
  PrivacyProposal,
  VoteRecord,
  ElPacaBalance 
} from '@consentire/shared';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

class DatabaseService {
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 5;

  constructor() {
    this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      // Check if DATABASE_URL is available
      if (!process.env.DATABASE_URL && !process.env.PGHOST) {
        logger.warn('⚠️  Database credentials not found - running in NO-DATABASE mode', {
          message: 'Database was created but environment variables not loaded yet. Restart Repl to load credentials.',
          tip: 'Click Stop → Start in Replit to reload environment variables'
        });
        this.scheduleRetry();
        return;
      }

      // Use DATABASE_URL if available (includes all config + SSL settings)
      if (process.env.DATABASE_URL) {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: false // Replit's internal database doesn't use SSL
        });
      } else {
        // Fallback to individual env vars
        const config: DatabaseConfig = {
          host: process.env.PGHOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432'),
          database: process.env.PGDATABASE || 'consentire',
          username: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || 'postgres',
          ssl: false
        };
        this.pool = new Pool(config);
      }
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      logger.info('✅ Connected to PostgreSQL database');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      logger.warn('⚠️  Backend will run in LIMITED mode without database', {
        message: 'Some features may not work. Restart Repl to reload database credentials.',
        retryIn: '30 seconds'
      });
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(() => {
        logger.info(`🔄 Retrying database connection (attempt ${this.retryCount}/${this.maxRetries})...`);
        this.initializeConnection();
      }, 30000); // Retry after 30 seconds
    }
  }

  private ensureConnected() {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Please restart Repl to load database credentials.');
    }
  }

  // ========== CONSENT OPERATIONS ==========
  
  async storeConsent(consent: ConsentState): Promise<void> {
    this.ensureConnected();
    try {
      await this.pool!.query(`
        INSERT INTO consents (
          consent_id, controller_hash, purpose_hash, status, 
          granted_at, expires_at, hgtp_tx_hash, user_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (consent_id) DO UPDATE SET
          status = EXCLUDED.status,
          expires_at = EXCLUDED.expires_at,
          hgtp_tx_hash = EXCLUDED.hgtp_tx_hash
      `, [
        consent.consentId,
        consent.controllerHash,
        consent.purposeHash,
        consent.status,
        new Date(consent.grantedAt),
        consent.expiresAt ? new Date(consent.expiresAt) : null,
        consent.hgtpTxHash,
        consent.userId
      ]);
    } catch (error) {
      logger.error('Failed to store consent:', error);
      throw error;
    }
  }

  async getConsent(consentId: string): Promise<ConsentState | null> {
    this.ensureConnected();
    try {
      const result = await this.pool!.query(
        'SELECT * FROM consents WHERE consent_id = $1',
        [consentId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        consentId: row.consent_id,
        controllerHash: row.controller_hash,
        purposeHash: row.purpose_hash,
        status: row.status,
        grantedAt: new Date(row.granted_at).getTime(),
        expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
        hgtpTxHash: row.hgtp_tx_hash,
        userId: row.user_hash
      };
    } catch (error) {
      logger.error('Failed to get consent:', error);
      return null;
    }
  }

  async findConsentByUserControllerPurpose(
    userHash: string, 
    controllerHash: string, 
    purposeHash: string
  ): Promise<ConsentState | null> {
    this.ensureConnected();
    try {
      const result = await this.pool!.query(`
        SELECT * FROM consents 
        WHERE user_hash = $1 AND controller_hash = $2 
        AND purpose_hash = $3 AND status = 'granted'
      `, [userHash, controllerHash, purposeHash]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        consentId: row.consent_id,
        controllerHash: row.controller_hash,
        purposeHash: row.purpose_hash,
        status: row.status,
        grantedAt: new Date(row.granted_at).getTime(),
        expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
        hgtpTxHash: row.hgtp_tx_hash,
        userId: row.user_hash
      };
    } catch (error) {
      logger.error('Failed to find consent:', error);
      return null;
    }
  }

  async getUserConsents(userHash: string): Promise<ConsentState[]> {
    this.ensureConnected();
    try {
      const result = await this.pool!.query(
        'SELECT * FROM consents WHERE user_hash = $1 ORDER BY granted_at DESC',
        [userHash]
      );

      return result.rows.map((row: any) => ({
        consentId: row.consent_id,
        controllerHash: row.controller_hash,
        purposeHash: row.purpose_hash,
        status: row.status,
        grantedAt: new Date(row.granted_at).getTime(),
        expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
        hgtpTxHash: row.hgtp_tx_hash,
        userId: row.user_hash
      }));
    } catch (error) {
      logger.error('Failed to get user consents:', error);
      return [];
    }
  }

  // ========== USER OPERATIONS ==========
  
  async storeUser(userData: UserRegistrationRequest): Promise<string> {
    this.ensureConnected();
    try {
      const userId = this.generateUserId(userData.email);
      
      await this.pool!.query(`
        INSERT INTO users (user_id, email_hash, public_key, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          public_key = EXCLUDED.public_key,
          metadata = EXCLUDED.metadata
      `, [
        userId,
        this.hashEmail(userData.email),
        userData.publicKey,
        JSON.stringify(userData.metadata || {}),
        new Date()
      ]);

      return userId;
    } catch (error) {
      logger.error('Failed to store user:', error);
      throw error;
    }
  }

  // ========== CONTROLLER OPERATIONS ==========
  
  async storeController(controllerData: ControllerRegistrationRequest): Promise<string> {
    this.ensureConnected();
    try {
      const controllerId = this.generateControllerId(controllerData.organizationId);
      
      await this.pool!.query(`
        INSERT INTO controllers (
          controller_id, organization_name, organization_id, 
          public_key, metadata, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (controller_id) DO UPDATE SET
          organization_name = EXCLUDED.organization_name,
          public_key = EXCLUDED.public_key,
          metadata = EXCLUDED.metadata
      `, [
        controllerId,
        controllerData.organizationName,
        controllerData.organizationId,
        controllerData.publicKey,
        JSON.stringify(controllerData.metadata || {}),
        new Date()
      ]);

      return controllerId;
    } catch (error) {
      logger.error('Failed to store controller:', error);
      throw error;
    }
  }

  // ========== GOVERNANCE OPERATIONS ==========
  
  async storeProposal(proposal: PrivacyProposal): Promise<void> {
    this.ensureConnected();
    try {
      await this.pool!.query(`
        INSERT INTO governance_proposals (
          proposal_id, title, description, proposed_changes,
          creator_signature, voting_deadline, created_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (proposal_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          proposed_changes = EXCLUDED.proposed_changes
      `, [
        proposal.proposalId,
        proposal.title,
        proposal.description,
        JSON.stringify(proposal.proposedChanges),
        proposal.creatorSignature,
        new Date(proposal.votingDeadline),
        new Date(proposal.createdAt),
        'active'
      ]);
    } catch (error) {
      logger.error('Failed to store proposal:', error);
      throw error;
    }
  }

  async storeVote(vote: VoteRecord): Promise<void> {
    this.ensureConnected();
    try {
      await this.pool!.query(`
        INSERT INTO governance_votes (
          proposal_id, voter_id, choice, voting_power, created_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (proposal_id, voter_id) DO UPDATE SET
          choice = EXCLUDED.choice,
          voting_power = EXCLUDED.voting_power,
          created_at = EXCLUDED.created_at
      `, [
        vote.proposalId,
        vote.voter,
        vote.choice,
        vote.votingPower,
        new Date(vote.timestamp)
      ]);
    } catch (error) {
      logger.error('Failed to store vote:', error);
      throw error;
    }
  }

  // ========== AUDIT OPERATIONS ==========
  
  async storeAuditLog(action: string, details: any): Promise<void> {
    if (!this.isConnected || !this.pool) {
      logger.warn('Skipping audit log - database not connected');
      return; // Don't throw error for audit logging
    }
    try {
      const auditEntry = {
        timestamp: Date.now(),
        action,
        details: JSON.stringify(details),
        hgtp_tx_hash: details.hgtpTxHash || ''
      };

      await this.pool!.query(`
        INSERT INTO audit_logs (timestamp, action, details, hgtp_tx_hash)
        VALUES ($1, $2, $3, $4)
      `, [auditEntry.timestamp, auditEntry.action, auditEntry.details, auditEntry.hgtp_tx_hash]);
    } catch (error) {
      logger.error('Failed to store audit log:', error);
      // Don't throw error for audit logging
    }
  }

  // ========== UTILITY METHODS ==========
  
  private generateUserId(email: string): string {
    // Generate a deterministic user ID based on email
    return `user_${this.hashEmail(email).substring(0, 16)}`;
  }

  private generateControllerId(organizationId: string): string {
    // Generate a deterministic controller ID
    return `ctrl_${organizationId.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 16)}`;
  }

  private hashEmail(email: string): string {
    // Simple email hashing (in production, use proper crypto)
    return Buffer.from(email.toLowerCase().trim()).toString('hex').substring(0, 64);
  }

  async query(sql: string, params?: any[]): Promise<any> {
    this.ensureConnected();
    try {
      return await this.pool!.query(sql, params);
    } catch (error) {
      logger.error('Database query failed:', error);
      throw error;
    }
  }

  get poolConnection(): Pool {
    this.ensureConnected();
    return this.pool!;
  }

  async close(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
      }
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

export const databaseService = new DatabaseService();
