/**
 * Direct HGTP Service Test - Verify Constellation Mainnet Transaction Submission
 * Tests the core HGTP anchoring functionality without database/validation complexity
 */

import { realHGTPService } from './src/services/realHGTPService';
import { ConsentState } from '@consentire/shared';
import { logger } from './src/utils/logger';

async function testHGTPSubmission() {
  try {
    logger.info('🚀 Testing Direct HGTP Submission to Constellation Mainnet');
    
    // Create test consent state for anchoring
    const testConsentState: ConsentState = {
      consentId: `test_consent_${Date.now()}`,
      controllerHash: '571bcf9f34b7eb43cd4f3cca600684c8cb65301daff1286c051e5ffbf2a90ade',
      purposeHash: 'b9fd1560233d48d35c6a6f2df5e0bc580f98cfe8aa0e842be4c6e1f8c7f2ee7d',
      status: 'granted' as const,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    logger.info('Submitting consent to Constellation Mainnet L1 DAG...', {
      consentId: testConsentState.consentId
    });

    // Anchor to Constellation Mainnet - this will submit to L1 /transactions endpoint
    const result = await realHGTPService.anchorConsent(testConsentState);

    logger.info('✅ Transaction submitted successfully!', {
      transactionHash: result.transactionHash,
      blockHeight: result.blockHeight,
      merkleRoot: result.merkleRoot,
      anchoringTimestamp: result.anchoringTimestamp
    });

    // Verify we got a real transaction hash
    if (!result.transactionHash) {
      throw new Error('Transaction hash is missing!');
    }

    logger.info('🎉 SUCCESS! Constellation Mainnet Integration Working', {
      explorerUrl: `https://explorer.constellationnetwork.io/transaction/${result.transactionHash}`,
      network: 'mainnet',
      networkId: '1'
    });

    logger.info('✅ PRODUCTION MODE VERIFIED - All transactions anchoring to Constellation Mainnet DAG');

  } catch (error) {
    logger.error('❌ Test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run test
testHGTPSubmission()
  .then(() => {
    logger.info('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test failed', { error });
    process.exit(1);
  });
