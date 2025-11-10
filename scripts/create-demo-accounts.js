#!/usr/bin/env node

/**
 * Demo Accounts Creation Script
 * Run this script to create demo accounts in Supabase for hackathon evaluation
 *
 * Usage: node scripts/create-demo-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const DEMO_ACCOUNTS = [
  {
    email: 'admin@consentire.io',
    password: 'admin123',
    role: 'admin',
    fullName: 'Admin User'
  },
  {
    email: 'user@consentire.io',
    password: 'user123',
    role: 'user',
    fullName: 'John Doe'
  },
  {
    email: 'org@consentire.io',
    password: 'org123',
    role: 'organization',
    organizationName: 'Acme Corp'
  },
  {
    email: 'regulator@consentire.io',
    password: 'reg123',
    role: 'regulator',
    fullName: 'Jane Smith'
  }
];

async function createDemoAccounts() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in backend/.env');
    console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    console.error('📋 How to get these credentials:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Go to Settings → API');
    console.error('4. Copy Project URL and service_role key');
    console.error('');
    console.error('💡 For hackathon evaluation, these accounts will be available:');
    DEMO_ACCOUNTS.forEach(account => {
      console.error(`   ${account.email} / ${account.password} (${account.role})`);
    });
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔄 Creating demo accounts...');

  for (const account of DEMO_ACCOUNTS) {
    try {
      console.log(`\n📧 Processing ${account.email}...`);

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers.users.some(user => user.email === account.email);

      if (userExists) {
        console.log(`✅ ${account.email} already exists - skipping`);
        continue;
      }

      // Create new user
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Auto-confirm for demo
        user_metadata: {
          role: account.role,
          full_name: account.fullName,
          organization_name: account.organizationName,
          source: 'demo_script'
        }
      });

      if (error) {
        console.error(`❌ Failed to create ${account.email}:`, error.message);
      } else {
        console.log(`✅ Created ${account.email} (${account.role})`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error.message);
    }
  }

  console.log('\n🎉 Demo account creation completed!');
  console.log('\n📋 Demo Accounts Available:');
  DEMO_ACCOUNTS.forEach(account => {
    console.log(`   ${account.email} / ${account.password} (${account.role})`);
  });
  console.log('\n🚀 You can now login at http://localhost:3000/login');
}

async function cleanupDemoAccounts() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🧹 Cleaning up demo accounts...');

  const { data: users } = await supabase.auth.admin.listUsers();

  for (const user of users.users) {
    const isDemoAccount = DEMO_ACCOUNTS.some(account => account.email === user.email);
    const isDemoSource = user.user_metadata?.source === 'demo_script';

    if (isDemoAccount || isDemoSource) {
      await supabase.auth.admin.deleteUser(user.id);
      console.log(`🗑️ Deleted: ${user.email}`);
    }
  }

  console.log('✅ Cleanup completed!');
}

// Main execution
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupDemoAccounts().catch(console.error);
} else {
  createDemoAccounts().catch(console.error);
}