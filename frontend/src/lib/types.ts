export enum LegalBasis {
  CONSENT = "consent",
  CONTRACT = "contract",
  LEGAL_OBLIGATION = "legal_obligation",
  VITAL_INTERESTS = "vital_interests",
  PUBLIC_TASK = "public_task",
  LEGITIMATE_INTERESTS = "legitimate_interests"
}

export enum ConsentStatus {
  GRANTED = "granted",
  REVOKED = "revoked",
  EXPIRED = "expired",
  PENDING = "pending"
}

export interface ConsentState {
  consentId: string;
  controllerHash: string;
  purposeHash: string;
  status: ConsentStatus;
  grantedAt: number;
  expiresAt?: number;
  hgtpTxHash: string;
  userId: string;
  anchoringTimestamp?: number;
}

export interface ConsentGrantRequest {
  userId: string;
  controllerId: string;
  purpose: string;
  dataCategories: string[];
  lawfulBasis: LegalBasis;
  expiresAt?: number;
  signature: string;
}

export interface APIError {
  message: string;
  code: string;
  details?: unknown;
}

export interface ComplianceStatus {
  controllerHash: string;
  score: number;
  lastAudit: number;
  violations: string[];
  overallCompliance: number;
  gdprArticle7: boolean;
  gdprArticle12: boolean;
  gdprArticle13: boolean;
  gdprArticle17: boolean;
  gdprArticle20: boolean;
  gdprArticle25: boolean;
  gdprArticle30: boolean;
}
