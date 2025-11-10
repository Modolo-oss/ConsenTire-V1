const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function seedDemoUser() {
  console.log('🌱 Seeding demo user...\n');
  
  try {
    const userId = `user_${randomBytes(8).toString('hex')}`;
    const email = 'user@consentire.io';
    const password = 'demo123'; // Simple password for demo
    const passwordHash = await bcrypt.hash(password, 10);
    
    const emailHash = require('crypto').createHash('sha256').update(email).digest('hex');
    const did = `did:consent:${userId}`;
    const publicKey = `pk_${randomBytes(16).toString('hex')}`;
    const walletAddress = `0x${randomBytes(20).toString('hex')}`;

    console.log('📝 Creating demo user with credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   DID: ${did}\n`);

    await pool.query('BEGIN');

    const userExists = await pool.query(
      'SELECT id FROM users WHERE email_hash = $1',
      [emailHash]
    );

    if (userExists.rows.length > 0) {
      console.log('⚠️  Demo user already exists. Updating password...\n');
      
      const existingUserId = userExists.rows[0].id;
      
      await pool.query(
        `UPDATE auth_credentials 
         SET password_hash = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [passwordHash, existingUserId]
      );
      
      console.log('✅ Password updated successfully!\n');
    } else {
      await pool.query(
        `INSERT INTO users (id, email_hash, public_key, did, wallet_address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, emailHash, publicKey, did, walletAddress]
      );

      await pool.query(
        `INSERT INTO auth_credentials (user_id, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, 'user', NOW(), NOW())`,
        [userId, email, passwordHash]
      );
      
      console.log('✅ Demo user created successfully!\n');
    }

    await pool.query('COMMIT');

    console.log('🎉 Demo user ready to use!');
    console.log('\n📋 Login credentials:');
    console.log('   Email: user@consentire.io');
    console.log('   Password: demo123');
    console.log('\n🌐 You can now login at: http://localhost:5000/login\n');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error seeding demo user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDemoUser();
