/**
 * PostgreSQL-backed Governance Service (El Paca voting)
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import {
  PrivacyProposal,
  VoteRecord,
  VoteChoice,
  VoteResult
} from '@consentire/shared';

class PgGovernanceService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  /** Create proposal */
  async createProposal(input: Omit<PrivacyProposal, 'proposalId' | 'createdAt'>, userId: string): Promise<PrivacyProposal> {
    const votingDeadline = input.votingDeadline || (Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      const result = await this.pool.query(`
        INSERT INTO governance_proposals (
          proposal_id, title, description, proposed_changes, creator_signature, voting_deadline
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5
        )
        RETURNING proposal_id, title, description, proposed_changes, creator_signature, voting_deadline, created_at
      `, [
        input.title,
        input.description,
        JSON.stringify(input.proposedChanges),
        input.creatorSignature || '',
        new Date(votingDeadline).toISOString()
      ]);

      const data = result.rows[0];

      if (!data) {
        logger.error('Failed to create proposal');
        throw new Error('Failed to create proposal');
      }

      const proposal: PrivacyProposal = {
        proposalId: data.proposal_id,
        title: data.title,
        description: data.description,
        proposedChanges: typeof data.proposed_changes === 'string' 
          ? JSON.parse(data.proposed_changes) 
          : data.proposed_changes,
        creatorSignature: data.creator_signature || '',
        votingDeadline: new Date(data.voting_deadline).getTime(),
        createdAt: new Date(data.created_at).getTime()
      };

      return proposal;
    } catch (error: any) {
      logger.error('Failed to create proposal', { error });
      throw new Error(error?.message || 'Failed to create proposal');
    }
  }

  /** List proposals */
  async listProposals(): Promise<PrivacyProposal[]> {
    try {
      const result = await this.pool.query(`
        SELECT proposal_id, title, description, proposed_changes, creator_signature, voting_deadline, created_at
        FROM governance_proposals
        ORDER BY created_at DESC
      `);

      return (result.rows || []).map((p: any) => ({
        proposalId: p.proposal_id,
        title: p.title,
        description: p.description,
        proposedChanges: typeof p.proposed_changes === 'string' 
          ? JSON.parse(p.proposed_changes) 
          : p.proposed_changes,
        creatorSignature: p.creator_signature || '',
        votingDeadline: new Date(p.voting_deadline).getTime(),
        createdAt: new Date(p.created_at).getTime()
      }));
    } catch (error: any) {
      logger.error('Failed to list proposals', { error });
      throw error;
    }
  }

  /** Get proposal + tally */
  async getProposalWithTally(proposalId: string): Promise<{ proposal: PrivacyProposal | null; tally: VoteResult }> {
    try {
      const proposalResult = await this.pool.query(`
        SELECT proposal_id, title, description, proposed_changes, creator_signature, voting_deadline, created_at
        FROM governance_proposals
        WHERE proposal_id = $1
      `, [proposalId]);

      const p = proposalResult.rows[0];

      const tallyResult = await this.pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN choice = 'for' THEN voting_power ELSE 0 END), 0) as for_votes,
          COALESCE(SUM(CASE WHEN choice = 'against' THEN voting_power ELSE 0 END), 0) as against_votes,
          COALESCE(SUM(CASE WHEN choice = 'abstain' THEN voting_power ELSE 0 END), 0) as abstain_votes,
          COALESCE(SUM(voting_power), 0) as total_power,
          COUNT(DISTINCT voter) as voter_count
        FROM votes
        WHERE proposal_id = $1
      `, [proposalId]);
      
      const userCountResult = await this.pool.query('SELECT COUNT(*) as total FROM users');
      const totalUsers = Number(userCountResult.rows[0]?.total || 1);
      const voterCount = Number(tallyResult.rows[0]?.voter_count || 0);

      const tallyRow = tallyResult.rows[0];
      const participationRate = totalUsers > 0 ? (voterCount / totalUsers) * 100 : 0;
      
      const tally: VoteResult = {
        proposalId,
        forVotes: Number(tallyRow?.for_votes || 0),
        againstVotes: Number(tallyRow?.against_votes || 0),
        abstainVotes: Number(tallyRow?.abstain_votes || 0),
        totalPower: Number(tallyRow?.total_power || 0),
        participation: Math.round(participationRate * 100) / 100
      };

      const proposal: PrivacyProposal | null = p ? {
        proposalId: p.proposal_id,
        title: p.title,
        description: p.description,
        proposedChanges: typeof p.proposed_changes === 'string' 
          ? JSON.parse(p.proposed_changes) 
          : p.proposed_changes,
        creatorSignature: p.creator_signature || '',
        votingDeadline: new Date(p.voting_deadline).getTime(),
        createdAt: new Date(p.created_at).getTime()
      } : null;

      return { proposal, tally };
    } catch (error: any) {
      logger.error('Failed to get proposal with tally', { error });
      throw error;
    }
  }

  /** Cast or update a vote */
  async castVote(proposalId: string, voterId: string, choice: VoteChoice): Promise<VoteRecord> {
    try {
      const power = 1;

      const result = await this.pool.query(`
        INSERT INTO votes (proposal_id, voter, choice, voting_power)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (voter, proposal_id) 
        DO UPDATE SET 
          choice = EXCLUDED.choice,
          voting_power = EXCLUDED.voting_power,
          timestamp = NOW()
        RETURNING id, voter, proposal_id, choice, voting_power, timestamp
      `, [proposalId, voterId, choice, power]);

      const data = result.rows[0];

      if (!data) {
        logger.error('Failed to cast vote');
        throw new Error('Failed to cast vote');
      }

      const vote: VoteRecord = {
        voter: data.voter,
        proposalId: data.proposal_id,
        choice: data.choice,
        votingPower: Number(data.voting_power || power),
        timestamp: new Date(data.timestamp).getTime()
      };

      return vote;
    } catch (error: any) {
      logger.error('Failed to cast vote', { error });
      throw new Error(error?.message || 'Failed to cast vote');
    }
  }
}

export const pgGovernanceService = new PgGovernanceService();
