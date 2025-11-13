/**
 * Browser-side cryptography utilities for ConsenTide
 * Client-side keypair generation and message signing using Ed25519
 */

import * as ed25519 from '@noble/ed25519';

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export interface SignatureResult {
  signature: string;
  message: string;
  publicKey: string;
}

/**
 * Generate Ed25519 keypair in browser
 * Private key stays in client memory, never sent to server
 */
export async function generateKeyPair(): Promise<KeyPair> {
  // Generate 32 random bytes for private key
  const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);

  return {
    privateKey: bufferToHex(privateKeyBytes),
    publicKey: bufferToHex(publicKeyBytes)
  };
}

/**
 * Sign a message with private key
 */
export async function signMessage(message: string, privateKeyHex: string): Promise<SignatureResult> {
  const messageBytes = new TextEncoder().encode(message);
  const privateKeyBytes = hexToBuffer(privateKeyHex);
  
  const signatureBytes = await ed25519.signAsync(messageBytes, privateKeyBytes);
  const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);

  return {
    signature: bufferToHex(signatureBytes),
    message,
    publicKey: bufferToHex(publicKeyBytes)
  };
}

/**
 * Verify a signature (for testing purposes)
 */
export async function verifySignature(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = hexToBuffer(signatureHex);
    const publicKeyBytes = hexToBuffer(publicKeyHex);

    return await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Create standardized message for consent revocation
 */
export function createRevokeConsentMessage(
  consentId: string,
  userId: string,
  timestamp: number
): string {
  const message = {
    action: 'revoke_consent',
    consentId,
    userId,
    timestamp
  };
  return JSON.stringify(message);
}

/**
 * Store private key in sessionStorage (destroyed on tab close)
 * WARNING: This is more secure than localStorage but still vulnerable to XSS
 * For production, use non-extractable WebCrypto keys or hardware wallet
 */
export function storePrivateKey(privateKey: string): void {
  sessionStorage.setItem('consentire_private_key', privateKey);
}

/**
 * Retrieve private key from sessionStorage
 */
export function getPrivateKey(): string | null {
  return sessionStorage.getItem('consentire_private_key');
}

/**
 * Store public key in localStorage (safe to store, used for display)
 */
export function storePublicKey(publicKey: string): void {
  localStorage.setItem('consentire_public_key', publicKey);
}

/**
 * Retrieve public key from localStorage
 */
export function getPublicKey(): string | null {
  return localStorage.getItem('consentire_public_key');
}

/**
 * Clear all stored keys (on logout)
 */
export function clearKeys(): void {
  sessionStorage.removeItem('consentire_private_key');
  localStorage.removeItem('consentire_public_key');
}

/**
 * Check if user has signing keys available
 */
export function hasSigningKeys(): boolean {
  return getPrivateKey() !== null && getPublicKey() !== null;
}

// Utility functions
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
