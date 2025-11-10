#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initProductionDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Initializing production database...\n');
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schemaSQL);
    console.log('✅ Database schema initialized\n');
    
    const indexResult = await client.query(`
      CREATE INDEX IF NOT EXISTS idx_controllers_metadata_email 
      ON controllers((metadata->>'email'));
    `);
    console.log('✅ Performance indexes created\n');
    
    const tableCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    console.log(`✅ Production database ready (${tableCount.rows[0].count} tables)\n`);
    
  } catch (error) {
    if (error.code === '42P07') {
      console.log('ℹ️  Database already initialized, skipping...\n');
    } else {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

initProductionDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
