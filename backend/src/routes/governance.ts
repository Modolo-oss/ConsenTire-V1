/**
 * Governance API routes (El Paca token voting)
 */

import { Router, Request, Response } from 'express';
import {
  PrivacyProposal,
  VoteRecord,
  VoteChoice,
  VoteResult,
  APIError
} from '@consentire/shared';
import { logger } from '../utils/logger';
import { authenticateUser } from '../middleware/supabaseAuth';
import { pgGovernanceService } from '../services/pgGovernanceService';

export const governanceRouter = Router();

// Production: Supabase-backed service

/**
 * POST /api/v1/governance/proposals
 * Submit a privacy policy proposal
 */
governanceRouter.post('/proposals', authenticateUser, async (req: Request, res: Response) => {
  try {
    const proposal: PrivacyProposal = req.body;

    if (!proposal.title || !proposal.description) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: title, description',
        timestamp: Date.now()
      } as APIError);
    }
    const created = await pgGovernanceService.createProposal(proposal, req.user!.id);
    res.status(201).json(created);
  } catch (error: any) {
    logger.error('Error creating proposal', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to create proposal',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/governance/proposals
 * Get all active proposals
 */
governanceRouter.get('/proposals', async (req: Request, res: Response) => {
  try {
    const proposals = await pgGovernanceService.listProposals();
    res.json({ proposals, count: proposals.length });
  } catch (error: any) {
    logger.error('Error getting proposals', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to get proposals',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * GET /api/v1/governance/proposals/:proposalId
 * Get proposal details
 */
governanceRouter.get('/proposals/:proposalId', async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { proposal, tally } = await pgGovernanceService.getProposalWithTally(proposalId);
    if (!proposal) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Proposal not found',
        timestamp: Date.now()
      } as APIError);
    }
    res.json({ proposal, tally });
  } catch (error: any) {
    logger.error('Error getting proposal', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to get proposal',
      timestamp: Date.now()
    } as APIError);
  }
});

/**
 * POST /api/v1/governance/vote
 * Cast a vote on a proposal
 */
governanceRouter.post('/vote', authenticateUser, async (req: Request, res: Response) => {
  try {
    const vote: VoteRecord = req.body;

    if (!vote.proposalId || !vote.choice) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: proposalId, choice',
        timestamp: Date.now()
      } as APIError);
    }
    const result = await pgGovernanceService.castVote(vote.proposalId, req.user!.id, vote.choice);
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Error casting vote', { error: error.message });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to cast vote',
      timestamp: Date.now()
    } as APIError);
  }
});
