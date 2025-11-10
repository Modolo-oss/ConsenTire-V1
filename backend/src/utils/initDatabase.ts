import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initializeDatabaseSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL not set, skipping schema initialization');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    try {
      const tableCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users';
      `);
      
      if (parseInt(tableCheck.rows[0].count) > 0) {
        logger.info('✅ Database already initialized');
        return;
      }

      logger.info('🔧 Initializing database schema...');
      
      const schemaPath = join(__dirname, '../../..', 'database', 'schema.sql');
      const schemaSQL = readFileSync(schemaPath, 'utf8');
      
      await client.query(schemaSQL);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_controllers_metadata_email 
        ON controllers((metadata->>'email'));
      `);
      
      logger.info('✅ Database schema initialized successfully');
      
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.code === '42P07') {
      logger.info('ℹ️  Database schema already exists');
    } else {
      logger.error('Failed to initialize database schema:', error);
    }
  } finally {
    await pool.end();
  }
}
