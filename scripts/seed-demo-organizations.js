const { Pool } = require('pg');
const { randomBytes } = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function seedDemoOrganizations() {
  console.log('🏢 Seeding demo organizations...\n');
  
  const organizations = [
    {
      name: 'TechCorp Analytics',
      organizationId: 'ORG-TECH-001',
      description: 'AI-powered analytics platform',
      complianceScore: 95
    },
    {
      name: 'HealthPlus Medical',
      organizationId: 'ORG-HEALTH-002',
      description: 'Digital health services provider',
      complianceScore: 88
    },
    {
      name: 'FinanceHub',
      organizationId: 'ORG-FIN-003',
      description: 'Financial technology solutions',
      complianceScore: 92
    },
    {
      name: 'RetailMax',
      organizationId: 'ORG-RETAIL-004',
      description: 'E-commerce platform',
      complianceScore: 78
    },
    {
      name: 'EduLearn Platform',
      organizationId: 'ORG-EDU-005',
      description: 'Online education services',
      complianceScore: 85
    }
  ];

  try {
    await pool.query('BEGIN');

    for (const org of organizations) {
      const id = `ctrl_${randomBytes(12).toString('hex')}`;
      const controllerHash = require('crypto').createHash('sha256')
        .update(`${org.organizationId}-${Date.now()}`)
        .digest('hex');
      const publicKey = `pk_${randomBytes(24).toString('hex')}`;
      
      console.log(`📋 Creating ${org.name}...`);
      console.log(`   Organization ID: ${org.organizationId}`);
      console.log(`   Compliance Score: ${org.complianceScore}%`);

      const exists = await pool.query(
        'SELECT id FROM controllers WHERE organization_id = $1',
        [org.organizationId]
      );

      if (exists.rows.length > 0) {
        console.log(`   ⚠️  Already exists, skipping...\n`);
        continue;
      }

      await pool.query(
        `INSERT INTO controllers (
          id, 
          organization_name, 
          organization_id, 
          controller_hash, 
          public_key, 
          metadata,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          id,
          org.name,
          org.organizationId,
          controllerHash,
          publicKey,
          JSON.stringify({
            description: org.description,
            complianceScore: org.complianceScore,
            website: `https://${org.name.toLowerCase().replace(/\s+/g, '')}.example.com`,
            contactEmail: `privacy@${org.organizationId.toLowerCase()}.com`,
            dataProtectionOfficer: 'dpo@organization.com',
            gdprCompliant: true
          })
        ]
      );
      
      console.log(`   ✅ Created successfully!\n`);
    }

    await pool.query('COMMIT');

    console.log('═══════════════════════════════════════════');
    console.log('🎉 Demo organizations seeded successfully!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📊 Organizations created:');
    organizations.forEach(org => {
      console.log(`   • ${org.name} (${org.complianceScore}% compliant)`);
    });
    console.log('\n🌐 Users can now grant consent to these organizations!\n');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error seeding organizations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDemoOrganizations();
