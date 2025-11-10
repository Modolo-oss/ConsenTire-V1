-- ==============================================
-- CONSENTIRE DATABASE SCHEMA
-- Railway PostgreSQL Setup
-- ==============================================

-- Create database (if not exists)
-- Note: Railway creates the database automatically, just run the schema

-- ==============================================
-- USERS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email_hash VARCHAR(64) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    did VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- CONTROLLERS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS controllers (
    id VARCHAR(64) PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) UNIQUE NOT NULL,
    controller_hash VARCHAR(64) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- AUTH CREDENTIALS TABLE (AUTHENTICATION)
-- ==============================================
CREATE TABLE IF NOT EXISTS auth_credentials (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    organization_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==============================================
-- CONSENTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS consents (
    consent_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    controller_hash VARCHAR(64) NOT NULL,
    purpose_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    lawful_basis VARCHAR(30) NOT NULL,
    data_categories TEXT[],
    granted_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    last_accessed TIMESTAMP,
    hgtp_tx_hash VARCHAR(64),
    anchoring_timestamp TIMESTAMP,
    merkle_root VARCHAR(64),
    zk_proof JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (controller_hash) REFERENCES controllers(controller_hash)
);

-- ==============================================
-- AUDIT LOGS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    action VARCHAR(50) NOT NULL,
    consent_id VARCHAR(64),
    controller_hash VARCHAR(64),
    user_id VARCHAR(64),
    details JSONB,
    hgtp_tx_hash VARCHAR(64)
);

-- ==============================================
-- GOVERNANCE PROPOSALS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS governance_proposals (
    proposal_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    proposed_changes JSONB NOT NULL,
    creator_signature TEXT NOT NULL,
    voting_deadline TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- VOTES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    voter VARCHAR(64) NOT NULL,
    proposal_id VARCHAR(64) NOT NULL,
    choice VARCHAR(10) NOT NULL,
    voting_power BIGINT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (proposal_id) REFERENCES governance_proposals(proposal_id),
    UNIQUE(voter, proposal_id)
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_did ON users(did);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Auth credentials indexes
CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON auth_credentials(email);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON auth_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_role ON auth_credentials(role);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_organization_id ON auth_credentials(organization_id);

-- Controllers indexes
CREATE INDEX IF NOT EXISTS idx_controllers_organization_id ON controllers(organization_id);
CREATE INDEX IF NOT EXISTS idx_controllers_controller_hash ON controllers(controller_hash);
CREATE INDEX IF NOT EXISTS idx_controllers_created_at ON controllers(created_at);

-- Consents indexes
CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_controller_hash ON consents(controller_hash);
CREATE INDEX IF NOT EXISTS idx_consents_purpose_hash ON consents(purpose_hash);
CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status);
CREATE INDEX IF NOT EXISTS idx_consents_granted_at ON consents(granted_at);
CREATE INDEX IF NOT EXISTS idx_consents_expires_at ON consents(expires_at);
CREATE INDEX IF NOT EXISTS idx_consents_hgtp_tx_hash ON consents(hgtp_tx_hash);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_consent_id ON audit_logs(consent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_controller_hash ON audit_logs(controller_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Governance indexes
CREATE INDEX IF NOT EXISTS idx_governance_proposals_voting_deadline ON governance_proposals(voting_deadline);
CREATE INDEX IF NOT EXISTS idx_governance_proposals_created_at ON governance_proposals(created_at);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter);
CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(timestamp);

-- ==============================================
-- DEMO DATA (OPTIONAL - FOR TESTING)
-- ==============================================

-- Insert demo users (optional - uncomment if needed)
-- INSERT INTO users (id, email_hash, public_key, did, wallet_address) VALUES
-- ('user_demo_1', 'hash_admin_demo', 'pk_admin_demo', 'did:consent:user_demo_1', '0x123...'),
-- ('user_demo_2', 'hash_user_demo', 'pk_user_demo', 'did:consent:user_demo_2', '0x456...');

-- Insert demo controllers (optional - uncomment if needed)
-- INSERT INTO controllers (id, organization_name, organization_id, controller_hash, public_key) VALUES
-- ('ctrl_demo_1', 'Demo Corp', 'DEMO001', 'hash_demo_corp', 'pk_demo_corp'),
-- ('ctrl_demo_2', 'Test LLC', 'TEST001', 'hash_test_llc', 'pk_test_llc');

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

-- Schema created successfully!
-- Run this in Railway PostgreSQL console or via psql:
-- PGPASSWORD=uUpKLTJcGhPcssVrtptfDNGjRAKcCuGk psql -h trolley.proxy.rlwy.net -U postgres -p 47274 -d railway -f schema.sql