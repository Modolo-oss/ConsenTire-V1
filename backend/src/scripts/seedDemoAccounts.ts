import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface DemoAccount {
  email: string;
  password: string;
  role: 'user' | 'controller' | 'regulator';
  organizationName?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
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

function generateId(): string {
  return randomBytes(16).toString('hex');
}

function hashEmail(email: string): string {
  return randomBytes(32).toString('hex');
}

async function seedDemoAccounts() {
  console.log('🌱 Starting database seeding...\n');

  try {
    for (const account of DEMO_ACCOUNTS) {
      const userId = `user_${generateId()}`;
      const publicKey = `pk_${randomBytes(32).toString('hex')}`;
      const did = `did:consentire:${userId}`;
      const emailHash = hashEmail(account.email);
      const passwordHash = await bcrypt.hash(account.password, 10);

      const userExists = await pool.query(
        'SELECT id FROM users WHERE did = $1',
        [did]
      );

      if (userExists.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (id, email_hash, public_key, did, wallet_address, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [userId, emailHash, publicKey, did, `0x${randomBytes(20).toString('hex')}`]
        );

        await pool.query(
          `INSERT INTO auth_credentials (user_id, email, password_hash, role, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, account.email, passwordHash, account.role]
        );

        console.log(`✅ Created ${account.role} account: ${account.email}`);

        if (account.role === 'controller' && account.organizationName) {
          const controllerId = `ctrl_${generateId()}`;
          const controllerHash = randomBytes(32).toString('hex');
          const orgId = `ORG_${randomBytes(8).toString('hex').toUpperCase()}`;

          await pool.query(
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

          console.log(`   📋 Created controller organization: ${account.organizationName}`);
        }
      } else {
        console.log(`⏭️  Skipped (already exists): ${account.email}`);
      }
    }

    const sampleConsents = [
      {
        userId: (await pool.query("SELECT user_id FROM auth_credentials WHERE email = 'user@consentire.io'")).rows[0]?.user_id,
        controllerHash: (await pool.query("SELECT controller_hash FROM controllers LIMIT 1")).rows[0]?.controller_hash,
      },
    ];

    if (sampleConsents[0].userId && sampleConsents[0].controllerHash) {
      const consentExists = await pool.query(
        'SELECT consent_id FROM consents WHERE user_id = $1',
        [sampleConsents[0].userId]
      );

      if (consentExists.rows.length === 0) {
        const consentId = `consent_${generateId()}`;
        await pool.query(
          `INSERT INTO consents (consent_id, user_id, controller_hash, purpose_hash, status, lawful_basis, data_categories, granted_at, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '1 year', NOW(), NOW())`,
          [
            consentId,
            sampleConsents[0].userId,
            sampleConsents[0].controllerHash,
            randomBytes(32).toString('hex'),
            'granted',
            'consent',
            ['email', 'name', 'profile'],
          ]
        );
        console.log('\n✅ Created sample consent record');
      }
    }

    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📝 DEMO CREDENTIALS FOR JUDGES:');
    console.log('═══════════════════════════════════════════════');
    console.log('\n👥 User/Individual:');
    console.log('   Email:    user@consentire.io');
    console.log('   Password: password123');
    console.log('\n🏢 Controller/Organization:');
    console.log('   Email:    org@consentire.io');
    console.log('   Password: password123');
    console.log('\n🔬 Regulator:');
    console.log('   Email:    regulator@consentire.io');
    console.log('   Password: password123');
    console.log('═══════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDemoAccounts()
  .then(() => {
    console.log('✅ Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
