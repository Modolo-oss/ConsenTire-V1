const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function seedDemoAccounts() {
  console.log('🌱 Seeding demo accounts for all stakeholders...\n');
  
  const accounts = [
    {
      email: 'user@consentire.io',
      password: 'password123',
      role: 'user',
      name: 'Demo User',
      emoji: '👥'
    },
    {
      email: 'org@consentire.io',
      password: 'password123',
      role: 'controller',
      name: 'Demo Organization',
      emoji: '🏢',
      organizationId: 'ORG-TECH-001'
    },
    {
      email: 'regulator@consentire.io',
      password: 'password123',
      role: 'regulator',
      name: 'Demo Regulator',
      emoji: '🔬'
    }
  ];

  try {
    await pool.query('BEGIN');

    for (const account of accounts) {
      const userId = `user_${randomBytes(8).toString('hex')}`;
      const emailHash = require('crypto').createHash('sha256').update(account.email).digest('hex');
      const did = `did:consent:${userId}`;
      const publicKey = `pk_${randomBytes(16).toString('hex')}`;
      const walletAddress = `0x${randomBytes(20).toString('hex')}`;
      const passwordHash = await bcrypt.hash(account.password, 10);

      console.log(`${account.emoji} Creating ${account.name}...`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Password: ${account.password}`);
      console.log(`   Role: ${account.role}`);

      const userExists = await pool.query(
        'SELECT id FROM users WHERE email_hash = $1',
        [emailHash]
      );

      if (userExists.rows.length > 0) {
        console.log(`   ⚠️  User exists, updating password...\n`);
        
        const existingUserId = userExists.rows[0].id;
        
        await pool.query(
          `UPDATE auth_credentials 
           SET password_hash = $1, role = $2, organization_id = $3, updated_at = NOW()
           WHERE user_id = $4`,
          [passwordHash, account.role, account.organizationId || null, existingUserId]
        );
      } else {
        await pool.query(
          `INSERT INTO users (id, email_hash, public_key, did, wallet_address, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [userId, emailHash, publicKey, did, walletAddress]
        );

        await pool.query(
          `INSERT INTO auth_credentials (user_id, email, password_hash, role, organization_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [userId, account.email, passwordHash, account.role, account.organizationId || null]
        );
        
        console.log(`   ✅ Created successfully!\n`);
      }
    }

    await pool.query('COMMIT');

    console.log('🎉 All demo accounts ready!\n');
    console.log('═══════════════════════════════════════════');
    console.log('📋 Login Credentials for Judges:');
    console.log('═══════════════════════════════════════════\n');
    console.log('👥 User Dashboard:');
    console.log('   Email:    user@consentire.io');
    console.log('   Password: password123\n');
    console.log('🏢 Controller Portal:');
    console.log('   Email:    org@consentire.io');
    console.log('   Password: password123\n');
    console.log('🔬 Regulator Console:');
    console.log('   Email:    regulator@consentire.io');
    console.log('   Password: password123\n');
    console.log('═══════════════════════════════════════════');
    console.log('🌐 Login at: http://localhost:5000/login\n');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error seeding accounts:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDemoAccounts();
