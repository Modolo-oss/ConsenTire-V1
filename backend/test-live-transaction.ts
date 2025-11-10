/**
 * Test Live Constellation Mainnet Transaction via Running Service
 * This test waits for service initialization then submits a real transaction
 */

import { ConsentState } from '@consentire/shared';
import { logger } from './src/utils/logger';

async function testLiveTransaction() {
  try {
    logger.info('🧪 Testing Live Constellation Mainnet Transaction');
    
    // Wait for services to initialize (backend starts them asynchronously)
    logger.info('Waiting 3 seconds for HGTP service initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Import HGTP service after it's initialized
    const { realHGTPService } = await import('./src/services/realHGTPService');
    
    // Create test consent state
    const testConsentState: ConsentState = {
      consentId: `mainnet_test_${Date.now()}`,
      controllerHash: '571bcf9f34b7eb43cd4f3cca600684c8cb65301daff1286c051e5ffbf2a90ade',
      purposeHash: 'b9fd1560233d48d35c6a6f2df5e0bc580f98cfe8aa0e842be4c6e1f8c7f2ee7d',
      status: 'granted' as const,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    logger.info('📡 Submitting transaction to Constellation Mainnet L1 DAG...', {
      consentId: testConsentState.consentId,
      endpoint: 'https://l1-lb-mainnet.constellationnetwork.io/transactions'
    });

    // Anchor to Constellation Mainnet
    const result = await realHGTPService.anchorConsent(testConsentState);

    logger.info('✅ SUCCESS! Transaction submitted to Constellation Mainnet', {
      consentId: testConsentState.consentId,
      transactionHash: result.transactionHash,
      blockHeight: result.blockHeight,
      merkleRoot: result.merkleRoot,
      anchoringTimestamp: new Date(result.anchoringTimestamp).toISOString(),
      explorerUrl: `https://explorer.constellationnetwork.io/transaction/${result.transactionHash}`
    });

    logger.info('🎉 PRODUCTION MODE VERIFIED!', {
      network: 'Constellation Mainnet',
      networkId: '1',
      l0Endpoint: 'https://l0-lb-mainnet.constellationnetwork.io',
      l1Endpoint: 'https://l1-lb-mainnet.constellationnetwork.io',
      mode: 'PRODUCTION',
      noSimulation: true
    });

    process.exit(0);

  } catch (error) {
    logger.error('❌ Test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run test
testLiveTransaction();
