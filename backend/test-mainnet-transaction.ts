/**
 * Test Constellation Mainnet Transaction Submission
 * This script tests that consent records are properly anchored to Constellation Mainnet DAG
 */

import { supabaseConsentService } from './src/services/supabaseConsentService';
import { logger } from './src/utils/logger';

async function testMainnetTransaction() {
  try {
    logger.info('🧪 Starting Constellation Mainnet Transaction Test');
    
    // Use existing test user
    const testUserId = 'user_bd0062aa82f63623862b4c50069afd89';
    
    // Use organization_id that already exists in database
    // Note: The service will compute controller_hash from this, so we need to use
    // an organization_id that will hash to an existing controller_hash
    const testOrganizationId = 'ORG_A725C3AD0DED0932'; // Demo Corporation
    
    logger.info('Creating test consent request', {
      userId: testUserId,
      organizationId: testOrganizationId
    });

    // Grant consent - this should trigger HGTP anchoring to Constellation Mainnet
    const consentRequest = {
      controllerId: testOrganizationId,
      purpose: 'mainnet_integration_test_' + Date.now(), // Unique purpose to avoid duplicates
      dataCategories: ['profile_data', 'contact_info'],
      lawfulBasis: 'consent' as const,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };

    logger.info('Granting consent (will submit to Constellation Mainnet L1 DAG)...');
    const result = await supabaseConsentService.grantConsent(consentRequest, testUserId);

    logger.info('✅ Consent granted successfully!', {
      consentId: result.consentId,
      status: result.status,
      hgtpTxHash: result.hgtpTxHash,
      merkleRoot: result.merkleRoot,
      anchoringTimestamp: result.anchoringTimestamp
    });

    // Verify HGTP transaction hash exists
    if (!result.hgtpTxHash) {
      throw new Error('❌ HGTP transaction hash is missing - mainnet anchoring failed!');
    }

    logger.info('🎉 SUCCESS! Transaction submitted to Constellation Mainnet', {
      transactionHash: result.hgtpTxHash,
      explorerUrl: `https://explorer.constellationnetwork.io/transaction/${result.hgtpTxHash}`
    });

    logger.info('✅ All tests passed - Production mode working correctly!');

  } catch (error) {
    logger.error('❌ Test failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run the test
testMainnetTransaction()
  .then(() => {
    logger.info('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test failed with error', { error });
    process.exit(1);
  });
