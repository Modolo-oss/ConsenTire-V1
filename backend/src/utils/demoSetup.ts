/**
 * Demo Accounts Setup
 * Auto-creates demo accounts in Supabase for hackathon evaluation
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

interface DemoAccount {
  email: string;
  password: string;
  role: string;
  fullName?: string;
  organizationName?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
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

export async function createDemoAccounts(): Promise<void> {
  try {
    // Allow demo account creation in production for hackathon evaluation
    // if (process.env.NODE_ENV === 'production') {
    //   logger.info('Skipping demo account creation in production');
    //   return;
    // }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.warn('Supabase credentials not found, skipping demo account creation');
      logger.info('💡 To enable demo accounts, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file');
      return;
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logger.info('🔄 Checking and creating demo accounts...');

    for (const account of DEMO_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const userExists = existingUsers.users.some(user => user.email === account.email);

        if (userExists) {
          logger.info(`✅ Demo account ${account.email} already exists`);
          continue;
        }

        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // Auto-confirm email for demo
          user_metadata: {
            role: account.role,
            full_name: account.fullName,
            organization_name: account.organizationName,
            source: 'demo_setup'
          }
        });

        if (error) {
          logger.error(`❌ Failed to create demo account ${account.email}:`, error);
        } else {
          logger.info(`✅ Created demo account: ${account.email} (${account.role})`);
        }
      } catch (error) {
        logger.error(`❌ Error processing demo account ${account.email}:`, error);
      }
    }

    logger.info('🎉 Demo account setup completed!');
  } catch (error) {
    logger.error('❌ Demo account setup failed:', error);
  }
}

export async function cleanupDemoAccounts(): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.warn('Supabase credentials not found, skipping cleanup');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logger.info('🧹 Cleaning up demo accounts...');

    const { data: users } = await supabase.auth.admin.listUsers();

    for (const user of users.users) {
      const isDemoAccount = DEMO_ACCOUNTS.some(account => account.email === user.email);
      const isDemoSource = user.user_metadata?.source === 'demo_setup';

      if (isDemoAccount || isDemoSource) {
        await supabase.auth.admin.deleteUser(user.id);
        logger.info(`🗑️ Deleted demo account: ${user.email}`);
      }
    }

    logger.info('✅ Demo account cleanup completed!');
  } catch (error) {
    logger.error('❌ Demo account cleanup failed:', error);
  }
}