#!/usr/bin/env node

/**
 * Database Migration Script
 * Runs the complete schema.sql and adds missing auth_credentials table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Read and execute main schema
    console.log('📋 Creating main tables from schema.sql...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schemaSQL);
    console.log('✅ Main schema created successfully\n');
    
    // Create auth_credentials table (missing from original schema)
    console.log('🔐 Creating auth_credentials table...');
    await client.query(`
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
    `);
    console.log('✅ auth_credentials table created\n');
    
    // Create additional indexes for auth_credentials
    console.log('📊 Creating indexes for auth_credentials...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON auth_credentials(email);
      CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON auth_credentials(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_credentials_role ON auth_credentials(role);
      CREATE INDEX IF NOT EXISTS idx_auth_credentials_organization_id ON auth_credentials(organization_id);
    `);
    console.log('✅ Indexes created\n');
    
    // Verify tables
    console.log('🔍 Verifying database tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('✅ Database tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n✨ Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
