import { z } from 'zod';
import { LegalBasis, ConsentStatus, VoteChoice } from './types';
export declare const userRegistrationSchema: z.ZodObject<{
    email: z.ZodEffects<z.ZodString, string, string>;
    publicKey: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    publicKey: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    email: string;
    publicKey: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const userRegistrationResponseSchema: z.ZodObject<{
    userId: z.ZodString;
    did: z.ZodString;
    walletAddress: z.ZodString;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    did: string;
    userId: string;
    walletAddress: string;
    createdAt: number;
}, {
    did: string;
    userId: string;
    walletAddress: string;
    createdAt: number;
}>;
export declare const controllerRegistrationSchema: z.ZodObject<{
    organizationName: z.ZodString;
    organizationId: z.ZodString;
    publicKey: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    organizationId: string;
    publicKey: string;
    organizationName: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    organizationId: string;
    publicKey: string;
    organizationName: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const controllerRegistrationResponseSchema: z.ZodObject<{
    controllerId: z.ZodString;
    controllerHash: z.ZodString;
    registeredAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    controllerId: string;
    controllerHash: string;
    registeredAt: number;
}, {
    controllerId: string;
    controllerHash: string;
    registeredAt: number;
}>;
export declare const consentGrantSchema: z.ZodObject<{
    userId: z.ZodString;
    controllerId: z.ZodString;
    purpose: z.ZodString;
    dataCategories: z.ZodArray<z.ZodString, "many">;
    lawfulBasis: z.ZodNativeEnum<typeof LegalBasis>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    controllerId: string;
    purpose: string;
    dataCategories: string[];
    lawfulBasis: LegalBasis;
    signature: string;
    expiresAt?: number | undefined;
}, {
    userId: string;
    controllerId: string;
    purpose: string;
    dataCategories: string[];
    lawfulBasis: LegalBasis;
    signature: string;
    expiresAt?: number | undefined;
}>;
export declare const consentGrantResponseSchema: z.ZodObject<{
    consentId: z.ZodString;
    hgtpTxHash: z.ZodString;
    status: z.ZodNativeEnum<typeof ConsentStatus>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    grantedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: ConsentStatus;
    consentId: string;
    hgtpTxHash: string;
    grantedAt: number;
    expiresAt?: number | undefined;
}, {
    status: ConsentStatus;
    consentId: string;
    hgtpTxHash: string;
    grantedAt: number;
    expiresAt?: number | undefined;
}>;
export declare const consentVerifySchema: z.ZodObject<{
    userId: z.ZodString;
    controllerId: z.ZodString;
    purpose: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    controllerId: string;
    purpose: string;
}, {
    userId: string;
    controllerId: string;
    purpose: string;
}>;
export declare const consentVerifyResponseSchema: z.ZodObject<{
    isValid: z.ZodBoolean;
    consentId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof ConsentStatus>>;
    error: z.ZodOptional<z.ZodString>;
    zkProof: z.ZodOptional<z.ZodObject<{
        proof: z.ZodString;
        publicSignals: z.ZodArray<z.ZodString, "many">;
        circuitHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        proof: string;
        publicSignals: string[];
        circuitHash: string;
    }, {
        proof: string;
        publicSignals: string[];
        circuitHash: string;
    }>>;
    merkleProof: z.ZodOptional<z.ZodObject<{
        root: z.ZodString;
        path: z.ZodArray<z.ZodString, "many">;
        leaf: z.ZodString;
        verified: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        path: string[];
        root: string;
        leaf: string;
        verified: boolean;
    }, {
        path: string[];
        root: string;
        leaf: string;
        verified: boolean;
    }>>;
}, "strip", z.ZodTypeAny, {
    isValid: boolean;
    error?: string | undefined;
    status?: ConsentStatus | undefined;
    consentId?: string | undefined;
    zkProof?: {
        proof: string;
        publicSignals: string[];
        circuitHash: string;
    } | undefined;
    merkleProof?: {
        path: string[];
        root: string;
        leaf: string;
        verified: boolean;
    } | undefined;
}, {
    isValid: boolean;
    error?: string | undefined;
    status?: ConsentStatus | undefined;
    consentId?: string | undefined;
    zkProof?: {
        proof: string;
        publicSignals: string[];
        circuitHash: string;
    } | undefined;
    merkleProof?: {
        path: string[];
        root: string;
        leaf: string;
        verified: boolean;
    } | undefined;
}>;
export declare const consentRevokeSchema: z.ZodObject<{
    consentId: z.ZodString;
    userId: z.ZodString;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    signature: string;
    consentId: string;
}, {
    userId: string;
    signature: string;
    consentId: string;
}>;
export declare const consentRevokeResponseSchema: z.ZodObject<{
    consentId: z.ZodString;
    status: z.ZodNativeEnum<typeof ConsentStatus>;
    revokedAt: z.ZodNumber;
    hgtpTxHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: ConsentStatus;
    consentId: string;
    hgtpTxHash: string;
    revokedAt: number;
}, {
    status: ConsentStatus;
    consentId: string;
    hgtpTxHash: string;
    revokedAt: number;
}>;
export declare const privacyProposalSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    proposedChanges: z.ZodObject<{
        field: z.ZodString;
        oldValue: z.ZodString;
        newValue: z.ZodString;
        justification: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        field: string;
        oldValue: string;
        newValue: string;
        justification: string;
    }, {
        field: string;
        oldValue: string;
        newValue: string;
        justification: string;
    }>;
    creatorSignature: z.ZodString;
    votingDeadline: z.ZodEffects<z.ZodNumber, number, number>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    proposedChanges: {
        field: string;
        oldValue: string;
        newValue: string;
        justification: string;
    };
    creatorSignature: string;
    votingDeadline: number;
}, {
    title: string;
    description: string;
    proposedChanges: {
        field: string;
        oldValue: string;
        newValue: string;
        justification: string;
    };
    creatorSignature: string;
    votingDeadline: number;
}>;
export declare const voteRecordSchema: z.ZodObject<{
    proposalId: z.ZodString;
    voter: z.ZodString;
    choice: z.ZodNativeEnum<typeof VoteChoice>;
    votingPower: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    proposalId: string;
    voter: string;
    choice: VoteChoice;
    votingPower: number;
}, {
    proposalId: string;
    voter: string;
    choice: VoteChoice;
    votingPower: number;
}>;
export declare const apiErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    code: string;
    timestamp: number;
    details?: Record<string, unknown> | undefined;
}, {
    message: string;
    code: string;
    timestamp: number;
    details?: Record<string, unknown> | undefined;
}>;
export declare const complianceStatusSchema: z.ZodObject<{
    controllerHash: z.ZodString;
    gdprArticle7: z.ZodBoolean;
    gdprArticle12: z.ZodBoolean;
    gdprArticle13: z.ZodBoolean;
    gdprArticle17: z.ZodBoolean;
    gdprArticle20: z.ZodBoolean;
    gdprArticle25: z.ZodBoolean;
    gdprArticle30: z.ZodBoolean;
    overallCompliance: z.ZodNumber;
    lastAudit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    controllerHash: string;
    gdprArticle7: boolean;
    gdprArticle12: boolean;
    gdprArticle13: boolean;
    gdprArticle17: boolean;
    gdprArticle20: boolean;
    gdprArticle25: boolean;
    gdprArticle30: boolean;
    overallCompliance: number;
    lastAudit: number;
}, {
    controllerHash: string;
    gdprArticle7: boolean;
    gdprArticle12: boolean;
    gdprArticle13: boolean;
    gdprArticle17: boolean;
    gdprArticle20: boolean;
    gdprArticle25: boolean;
    gdprArticle30: boolean;
    overallCompliance: number;
    lastAudit: number;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const consentQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    userId: z.ZodOptional<z.ZodString>;
    controllerId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof ConsentStatus>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    status?: ConsentStatus | undefined;
    userId?: string | undefined;
    controllerId?: string | undefined;
    sortBy?: string | undefined;
}, {
    status?: ConsentStatus | undefined;
    userId?: string | undefined;
    controllerId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const schemas: {
    userRegistration: z.ZodObject<{
        email: z.ZodEffects<z.ZodString, string, string>;
        publicKey: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        publicKey: string;
        metadata?: Record<string, unknown> | undefined;
    }, {
        email: string;
        publicKey: string;
        metadata?: Record<string, unknown> | undefined;
    }>;
    userRegistrationResponse: z.ZodObject<{
        userId: z.ZodString;
        did: z.ZodString;
        walletAddress: z.ZodString;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        did: string;
        userId: string;
        walletAddress: string;
        createdAt: number;
    }, {
        did: string;
        userId: string;
        walletAddress: string;
        createdAt: number;
    }>;
    controllerRegistration: z.ZodObject<{
        organizationName: z.ZodString;
        organizationId: z.ZodString;
        publicKey: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        organizationId: string;
        publicKey: string;
        organizationName: string;
        metadata?: Record<string, unknown> | undefined;
    }, {
        organizationId: string;
        publicKey: string;
        organizationName: string;
        metadata?: Record<string, unknown> | undefined;
    }>;
    controllerRegistrationResponse: z.ZodObject<{
        controllerId: z.ZodString;
        controllerHash: z.ZodString;
        registeredAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        controllerId: string;
        controllerHash: string;
        registeredAt: number;
    }, {
        controllerId: string;
        controllerHash: string;
        registeredAt: number;
    }>;
    consentGrant: z.ZodObject<{
        userId: z.ZodString;
        controllerId: z.ZodString;
        purpose: z.ZodString;
        dataCategories: z.ZodArray<z.ZodString, "many">;
        lawfulBasis: z.ZodNativeEnum<typeof LegalBasis>;
        expiresAt: z.ZodOptional<z.ZodNumber>;
        signature: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        controllerId: string;
        purpose: string;
        dataCategories: string[];
        lawfulBasis: LegalBasis;
        signature: string;
        expiresAt?: number | undefined;
    }, {
        userId: string;
        controllerId: string;
        purpose: string;
        dataCategories: string[];
        lawfulBasis: LegalBasis;
        signature: string;
        expiresAt?: number | undefined;
    }>;
    consentGrantResponse: z.ZodObject<{
        consentId: z.ZodString;
        hgtpTxHash: z.ZodString;
        status: z.ZodNativeEnum<typeof ConsentStatus>;
        expiresAt: z.ZodOptional<z.ZodNumber>;
        grantedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        status: ConsentStatus;
        consentId: string;
        hgtpTxHash: string;
        grantedAt: number;
        expiresAt?: number | undefined;
    }, {
        status: ConsentStatus;
        consentId: string;
        hgtpTxHash: string;
        grantedAt: number;
        expiresAt?: number | undefined;
    }>;
    consentVerify: z.ZodObject<{
        userId: z.ZodString;
        controllerId: z.ZodString;
        purpose: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        controllerId: string;
        purpose: string;
    }, {
        userId: string;
        controllerId: string;
        purpose: string;
    }>;
    consentVerifyResponse: z.ZodObject<{
        isValid: z.ZodBoolean;
        consentId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNativeEnum<typeof ConsentStatus>>;
        error: z.ZodOptional<z.ZodString>;
        zkProof: z.ZodOptional<z.ZodObject<{
            proof: z.ZodString;
            publicSignals: z.ZodArray<z.ZodString, "many">;
            circuitHash: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            proof: string;
            publicSignals: string[];
            circuitHash: string;
        }, {
            proof: string;
            publicSignals: string[];
            circuitHash: string;
        }>>;
        merkleProof: z.ZodOptional<z.ZodObject<{
            root: z.ZodString;
            path: z.ZodArray<z.ZodString, "many">;
            leaf: z.ZodString;
            verified: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            path: string[];
            root: string;
            leaf: string;
            verified: boolean;
        }, {
            path: string[];
            root: string;
            leaf: string;
            verified: boolean;
        }>>;
    }, "strip", z.ZodTypeAny, {
        isValid: boolean;
        error?: string | undefined;
        status?: ConsentStatus | undefined;
        consentId?: string | undefined;
        zkProof?: {
            proof: string;
            publicSignals: string[];
            circuitHash: string;
        } | undefined;
        merkleProof?: {
            path: string[];
            root: string;
            leaf: string;
            verified: boolean;
        } | undefined;
    }, {
        isValid: boolean;
        error?: string | undefined;
        status?: ConsentStatus | undefined;
        consentId?: string | undefined;
        zkProof?: {
            proof: string;
            publicSignals: string[];
            circuitHash: string;
        } | undefined;
        merkleProof?: {
            path: string[];
            root: string;
            leaf: string;
            verified: boolean;
        } | undefined;
    }>;
    consentRevoke: z.ZodObject<{
        consentId: z.ZodString;
        userId: z.ZodString;
        signature: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        signature: string;
        consentId: string;
    }, {
        userId: string;
        signature: string;
        consentId: string;
    }>;
    consentRevokeResponse: z.ZodObject<{
        consentId: z.ZodString;
        status: z.ZodNativeEnum<typeof ConsentStatus>;
        revokedAt: z.ZodNumber;
        hgtpTxHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: ConsentStatus;
        consentId: string;
        hgtpTxHash: string;
        revokedAt: number;
    }, {
        status: ConsentStatus;
        consentId: string;
        hgtpTxHash: string;
        revokedAt: number;
    }>;
    privacyProposal: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        proposedChanges: z.ZodObject<{
            field: z.ZodString;
            oldValue: z.ZodString;
            newValue: z.ZodString;
            justification: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            field: string;
            oldValue: string;
            newValue: string;
            justification: string;
        }, {
            field: string;
            oldValue: string;
            newValue: string;
            justification: string;
        }>;
        creatorSignature: z.ZodString;
        votingDeadline: z.ZodEffects<z.ZodNumber, number, number>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        proposedChanges: {
            field: string;
            oldValue: string;
            newValue: string;
            justification: string;
        };
        creatorSignature: string;
        votingDeadline: number;
    }, {
        title: string;
        description: string;
        proposedChanges: {
            field: string;
            oldValue: string;
            newValue: string;
            justification: string;
        };
        creatorSignature: string;
        votingDeadline: number;
    }>;
    voteRecord: z.ZodObject<{
        proposalId: z.ZodString;
        voter: z.ZodString;
        choice: z.ZodNativeEnum<typeof VoteChoice>;
        votingPower: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        proposalId: string;
        voter: string;
        choice: VoteChoice;
        votingPower: number;
    }, {
        proposalId: string;
        voter: string;
        choice: VoteChoice;
        votingPower: number;
    }>;
    apiError: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        timestamp: number;
        details?: Record<string, unknown> | undefined;
    }, {
        message: string;
        code: string;
        timestamp: number;
        details?: Record<string, unknown> | undefined;
    }>;
    complianceStatus: z.ZodObject<{
        controllerHash: z.ZodString;
        gdprArticle7: z.ZodBoolean;
        gdprArticle12: z.ZodBoolean;
        gdprArticle13: z.ZodBoolean;
        gdprArticle17: z.ZodBoolean;
        gdprArticle20: z.ZodBoolean;
        gdprArticle25: z.ZodBoolean;
        gdprArticle30: z.ZodBoolean;
        overallCompliance: z.ZodNumber;
        lastAudit: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        controllerHash: string;
        gdprArticle7: boolean;
        gdprArticle12: boolean;
        gdprArticle13: boolean;
        gdprArticle17: boolean;
        gdprArticle20: boolean;
        gdprArticle25: boolean;
        gdprArticle30: boolean;
        overallCompliance: number;
        lastAudit: number;
    }, {
        controllerHash: string;
        gdprArticle7: boolean;
        gdprArticle12: boolean;
        gdprArticle13: boolean;
        gdprArticle17: boolean;
        gdprArticle20: boolean;
        gdprArticle25: boolean;
        gdprArticle30: boolean;
        overallCompliance: number;
        lastAudit: number;
    }>;
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortOrder: "asc" | "desc";
        sortBy?: string | undefined;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    consentQuery: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
        userId: z.ZodOptional<z.ZodString>;
        controllerId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNativeEnum<typeof ConsentStatus>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortOrder: "asc" | "desc";
        status?: ConsentStatus | undefined;
        userId?: string | undefined;
        controllerId?: string | undefined;
        sortBy?: string | undefined;
    }, {
        status?: ConsentStatus | undefined;
        userId?: string | undefined;
        controllerId?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
};
export declare function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    error: z.ZodError;
};
//# sourceMappingURL=validation.d.ts.map