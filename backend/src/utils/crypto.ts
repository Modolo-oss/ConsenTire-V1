/**
 * Cryptographic utilities for hashing and encryption
 */

import crypto from 'crypto';

/**
 * Generate SHA-256 hash
 */
export function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate consent ID (SHA-256 of userId + controllerId + purpose + timestamp)
 */
export function generateConsentId(
  userId: string,
  controllerId: string,
  purpose: string,
  timestamp: number
): string {
  const input = `${userId}:${controllerId}:${purpose}:${timestamp}`;
  return hash(input);
}

/**
 * Generate controller hash
 */
export function generateControllerHash(controllerId: string): string {
  return hash(controllerId);
}

/**
 * Generate purpose hash
 */
export function generatePurposeHash(purpose: string): string {
  return hash(purpose);
}

/**
 * Generate user ID hash
 */
export function generateUserId(email: string, publicKey: string): string {
  return hash(`${email}:${publicKey}`);
}

/**
 * Generate DID (Decentralized Identifier)
 */
export function generateDID(publicKey: string): string {
  const keyHash = hash(publicKey);
  return `did:consentire:${keyHash.substring(0, 16)}`;
}

/**
 * Verify signature using real cryptographic verification
 */
export async function verifySignature(
  message: string, 
  signature: string, 
  publicKey: string,
  algorithm: 'ed25519' | 'secp256k1' = 'ed25519'
): Promise<boolean> {
  try {
    const { cryptoService, SignatureAlgorithm } = await import('../services/cryptoService');
    
    const algorithmEnum = algorithm === 'ed25519' 
      ? SignatureAlgorithm.ED25519 
      : SignatureAlgorithm.SECP256K1;
    
    const result = await cryptoService.verifySignature(
      message,
      signature,
      publicKey,
      algorithmEnum
    );
    
    return result.isValid;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Generate random nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}
