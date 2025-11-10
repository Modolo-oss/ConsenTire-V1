// Zod validation schemas for ConsenTide API

import { z } from 'zod';
import { LegalBasis, ConsentStatus, VoteChoice } from './types';

// Base validation patterns
const emailSchema = z.string().email().refine(
  (email: string) => !email.includes('@example.com'),
  { message: 'Please use a real email address' }
);

const hashSchema = z.string().regex(/^[a-fA-F0-9]{64}$/, 'Must be a valid SHA-256 hash');

const signatureSchema = z.string().regex(/^[A-Za-z0-9+/=]+$/, 'Must be a valid signature');

const timestampSchema = z.number().int().positive().refine(
  (ts: number) => ts <= Date.now() + 86400000, // Max 1 day in future
  'Timestamp cannot be more than 1 day in the future'
);

// User Registration
export const userRegistrationSchema = z.object({
  email: emailSchema,
  publicKey: z.string().min(32).max(512),
  metadata: z.record(z.unknown()).optional()
});

// User Registration Response
export const userRegistrationResponseSchema = z.object({
  userId: hashSchema,
  did: z.string(),
  walletAddress: z.string(),
  createdAt: z.number()
});

// Controller Registration
export const controllerRegistrationSchema = z.object({
  organizationName: z.string().min(1).max(100),
  organizationId: z.string().min(1).max(100),
  publicKey: z.string().min(32).max(512),
  metadata: z.record(z.unknown()).optional()
});

// Controller Registration Response
export const controllerRegistrationResponseSchema = z.object({
  controllerId: hashSchema,
  controllerHash: hashSchema,
  registeredAt: z.number()
});

// Consent Grant
export const consentGrantSchema = z.object({
  userId: z.string().min(1),
  controllerId: z.string().min(1),
  purpose: z.string().min(1).max(500),
  dataCategories: z.array(z.string()).min(1).max(20),
  lawfulBasis: z.nativeEnum(LegalBasis),
  expiresAt: z.number().int().positive().optional(),
  signature: signatureSchema
});

// Consent Grant Response
export const consentGrantResponseSchema = z.object({
  consentId: hashSchema,
  hgtpTxHash: z.string().min(1),
  status: z.nativeEnum(ConsentStatus),
  expiresAt: z.number().int().positive().optional(),
  grantedAt: z.number()
});

// Consent Verify
export const consentVerifySchema = z.object({
  userId: z.string().min(1),
  controllerId: z.string().min(1),
  purpose: z.string().min(1).max(500)
});

// Consent Verify Response
export const consentVerifyResponseSchema = z.object({
  isValid: z.boolean(),
  consentId: hashSchema.optional(),
  status: z.nativeEnum(ConsentStatus).optional(),
  error: z.string().optional(),
  zkProof: z.object({
    proof: z.string(),
    publicSignals: z.array(z.string()),
    circuitHash: z.string()
  }).optional(),
  merkleProof: z.object({
    root: z.string(),
    path: z.array(z.string()),
    leaf: z.string(),
    verified: z.boolean()
  }).optional()
});

// Consent Revoke
export const consentRevokeSchema = z.object({
  consentId: hashSchema,
  userId: z.string().min(1),
  signature: signatureSchema
});

// Consent Revoke Response
export const consentRevokeResponseSchema = z.object({
  consentId: hashSchema,
  status: z.nativeEnum(ConsentStatus),
  revokedAt: z.number(),
  hgtpTxHash: z.string().min(1)
});

// Privacy Proposal
export const privacyProposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  proposedChanges: z.object({
    field: z.string().min(1).max(100),
    oldValue: z.string(),
    newValue: z.string(),
    justification: z.string().min(1).max(1000)
  }),
  creatorSignature: signatureSchema,
  votingDeadline: timestampSchema
});

// Vote Record
export const voteRecordSchema = z.object({
  proposalId: hashSchema,
  voter: z.string().min(1),
  choice: z.nativeEnum(VoteChoice),
  votingPower: z.number().positive()
});

// API Error
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  timestamp: z.number()
});

// Compliance Status
export const complianceStatusSchema = z.object({
  controllerHash: hashSchema,
  gdprArticle7: z.boolean(),
  gdprArticle12: z.boolean(),
  gdprArticle13: z.boolean(),
  gdprArticle17: z.boolean(),
  gdprArticle20: z.boolean(),
  gdprArticle25: z.boolean(),
  gdprArticle30: z.boolean(),
  overallCompliance: z.number().min(0).max(100),
  lastAudit: z.number()
});

// Pagination
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Query Parameters
export const consentQuerySchema = z.object({
  userId: z.string().optional(),
  controllerId: z.string().optional(),
  status: z.nativeEnum(ConsentStatus).optional(),
  ...paginationSchema.shape
});

// Export all schemas
export const schemas = {
  userRegistration: userRegistrationSchema,
  userRegistrationResponse: userRegistrationResponseSchema,
  controllerRegistration: controllerRegistrationSchema,
  controllerRegistrationResponse: controllerRegistrationResponseSchema,
  consentGrant: consentGrantSchema,
  consentGrantResponse: consentGrantResponseSchema,
  consentVerify: consentVerifySchema,
  consentVerifyResponse: consentVerifyResponseSchema,
  consentRevoke: consentRevokeSchema,
  consentRevokeResponse: consentRevokeResponseSchema,
  privacyProposal: privacyProposalSchema,
  voteRecord: voteRecordSchema,
  apiError: apiErrorSchema,
  complianceStatus: complianceStatusSchema,
  pagination: paginationSchema,
  consentQuery: consentQuerySchema
};

// Helper function for request validation
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: true; 
  data: T; 
} | { 
  success: false; 
  error: z.ZodError 
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error: error as z.ZodError };
  }
}
