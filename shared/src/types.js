// Shared TypeScript types for ConsenTide project
// This file provides common interfaces and types used across frontend, backend, and metagraph
export var LegalBasis;
(function (LegalBasis) {
    LegalBasis["CONSENT"] = "consent";
    LegalBasis["CONTRACT"] = "contract";
    LegalBasis["LEGAL_OBLIGATION"] = "legal_obligation";
    LegalBasis["VITAL_INTERESTS"] = "vital_interests";
    LegalBasis["PUBLIC_TASK"] = "public_task";
    LegalBasis["LEGITIMATE_INTERESTS"] = "legitimate_interests";
})(LegalBasis || (LegalBasis = {}));
export var ConsentStatus;
(function (ConsentStatus) {
    ConsentStatus["GRANTED"] = "granted";
    ConsentStatus["REVOKED"] = "revoked";
    ConsentStatus["EXPIRED"] = "expired";
    ConsentStatus["PENDING"] = "pending";
})(ConsentStatus || (ConsentStatus = {}));
export var VoteChoice;
(function (VoteChoice) {
    VoteChoice["FOR"] = "for";
    VoteChoice["AGAINST"] = "against";
    VoteChoice["ABSTAIN"] = "abstain";
})(VoteChoice || (VoteChoice = {}));
//# sourceMappingURL=types.js.map