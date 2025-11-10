#!/usr/bin/env node

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEMO_ACCOUNTS = [
  {
    email: 'user@consentire.io',
    password: 'password123',
    role: 'user',
  },
  {
    email: 'org@consentire.io',
    password: 'password123',
    role: 'controller',
    organizationName: 'Demo Corporation',
  },
  {
    email: 'regulator@consentire.io',
    password: 'password123',
    role: 'regulator',
  },
];

function generateId() {
  return randomBytes(16).toString('hex');
}

function hashEmail(email) {
  return randomBytes(32).toString('hex');
}

async function seedProduction() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding production database...\n');
    
    for (const account of DEMO_ACCOUNTS) {
      const userId = `user_${generateId()}`;
      const publicKey = `pk_${randomBytes(32).toString('hex')}`;
      const did = `did:consentire:${userId}`;
      const emailHash = hashEmail(account.email);
      const passwordHash = await bcrypt.hash(account.password, 10);

      const userExists = await client.query(
        'SELECT email FROM auth_credentials WHERE email = $1',
        [account.email]
      );

      if (userExists.rows.length === 0) {
        await client.query(
          `INSERT INTO users (id, email_hash, public_key, did, wallet_address, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [userId, emailHash, publicKey, did, `0x${randomBytes(20).toString('hex')}`]
        );

        await client.query(
          `INSERT INTO auth_credentials (user_id, email, password_hash, role, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, account.email, passwordHash, account.role]
        );

        console.log(`✅ Created ${account.role}: ${account.email}`);

        if (account.role === 'controller' && account.organizationName) {
          const controllerId = `ctrl_${generateId()}`;
          const controllerHash = randomBytes(32).toString('hex');
          const orgId = `ORG_${randomBytes(8).toString('hex').toUpperCase()}`;

          await client.query(
            `INSERT INTO controllers (id, organization_name, organization_id, controller_hash, public_key, metadata, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
              controllerId,
              account.organizationName,
              orgId,
              controllerHash,
              publicKey,
              JSON.stringify({ userId, email: account.email }),
            ]
          );
          console.log(`   📋 Organization: ${account.organizationName}`);
        }
      } else {
        console.log(`⏭️  Already exists: ${account.email}`);
      }
    }
    
    console.log('\n✅ Production database seeded successfully!\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedProduction().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
