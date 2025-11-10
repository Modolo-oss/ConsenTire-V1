/**
 * Production Cryptographic Service
 * Real signature generation and verification for ConsenTide
 */

import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';
import { sha512 } from '@noble/hashes/sha2.js';
import { createHash, randomBytes } from 'crypto';
import { logger } from '../utils/logger';

// Configure @noble/ed25519 for synchronous methods in Node.js
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

export enum SignatureAlgorithm {
  ED25519 = 'ed25519',
  SECP256K1 = 'secp256k1'
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
  algorithm: SignatureAlgorithm;
}

export interface SignatureResult {
  signature: string;
  publicKey: string;
  algorithm: SignatureAlgorithm;
  message: string;
}

export interface VerificationResult {
  isValid: boolean;
  publicKey: string;
  algorithm: SignatureAlgorithm;
}

class CryptographicService {
  
  /**
   * Generate a new key pair
   */
  async generateKeyPair(algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519): Promise<KeyPair> {
    try {
      switch (algorithm) {
        case SignatureAlgorithm.ED25519:
          const ed25519PrivateKey = ed25519.utils.randomPrivateKey();
          const ed25519PublicKey = await ed25519.getPublicKey(ed25519PrivateKey);
          
          return {
            privateKey: Buffer.from(ed25519PrivateKey).toString('hex'),
            publicKey: Buffer.from(ed25519PublicKey).toString('hex'),
            algorithm: SignatureAlgorithm.ED25519
          };
          
        case SignatureAlgorithm.SECP256K1:
          const secp256k1PrivateKey = secp256k1.utils.randomPrivateKey();
          const secp256k1PublicKey = secp256k1.getPublicKey(secp256k1PrivateKey);
          
          return {
            privateKey: Buffer.from(secp256k1PrivateKey).toString('hex'),
            publicKey: Buffer.from(secp256k1PublicKey).toString('hex'),
            algorithm: SignatureAlgorithm.SECP256K1
          };
          
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }
    } catch (error) {
      logger.error('Failed to generate key pair', { error, algorithm });
      throw error;
    }
  }

  /**
   * Sign a message with private key
   */
  async signMessage(
    message: string, 
    privateKey: string, 
    algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519
  ): Promise<SignatureResult> {
    try {
      const messageBytes = Buffer.from(message, 'utf8');
      const privateKeyBytes = Buffer.from(privateKey, 'hex');
      
      let signature: Uint8Array;
      let publicKey: string;
      
      switch (algorithm) {
        case SignatureAlgorithm.ED25519:
          signature = await ed25519.sign(messageBytes, privateKeyBytes);
          const ed25519PublicKey = await ed25519.getPublicKey(privateKeyBytes);
          publicKey = Buffer.from(ed25519PublicKey).toString('hex');
          break;
          
        case SignatureAlgorithm.SECP256K1:
          const secp256k1Signature = await secp256k1.sign(messageBytes, privateKeyBytes);
          signature = secp256k1Signature.toBytes();
          const secp256k1PublicKey = secp256k1.getPublicKey(privateKeyBytes);
          publicKey = Buffer.from(secp256k1PublicKey).toString('hex');
          break;
          
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }
      
      return {
        signature: Buffer.from(signature).toString('hex'),
        publicKey,
        algorithm,
        message
      };
    } catch (error) {
      logger.error('Failed to sign message', { error, algorithm });
      throw error;
    }
  }

  /**
   * Verify a signature
   */
  async verifySignature(
    message: string,
    signature: string,
    publicKey: string,
    algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519
  ): Promise<VerificationResult> {
    try {
      const messageBytes = Buffer.from(message, 'utf8');
      const signatureBytes = Buffer.from(signature, 'hex');
      const publicKeyBytes = Buffer.from(publicKey, 'hex');
      
      let isValid: boolean;
      
      switch (algorithm) {
        case SignatureAlgorithm.ED25519:
          isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
          break;
          
        case SignatureAlgorithm.SECP256K1:
          isValid = secp256k1.verify(signatureBytes, messageBytes, publicKeyBytes);
          break;
          
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }
      
      logger.info('Signature verification completed', { 
        isValid, 
        algorithm, 
        publicKey: publicKey.substring(0, 16) + '...' 
      });
      
      return {
        isValid,
        publicKey,
        algorithm
      };
    } catch (error) {
      logger.error('Failed to verify signature', { error, algorithm });
      return {
        isValid: false,
        publicKey,
        algorithm
      };
    }
  }

  /**
   * Generate a secure random nonce
   */
  generateNonce(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Create a message for consent signing
   */
  createConsentMessage(
    userId: string,
    controllerId: string,
    purpose: string,
    dataCategories: string[],
    lawfulBasis: string,
    timestamp: number,
    nonce?: string
  ): string {
    const nonceValue = nonce || this.generateNonce();
    
    const message = {
      action: 'grant_consent',
      userId,
      controllerId,
      purpose,
      dataCategories: dataCategories.sort(), // Ensure consistent ordering
      lawfulBasis,
      timestamp,
      nonce: nonceValue
    };
    
    return JSON.stringify(message, null, 0); // Compact JSON
  }

  /**
   * Create a message for consent revocation
   */
  createRevocationMessage(
    userId: string,
    consentId: string,
    timestamp: number,
    nonce?: string
  ): string {
    const nonceValue = nonce || this.generateNonce();
    
    const message = {
      action: 'revoke_consent',
      userId,
      consentId,
      timestamp,
      nonce: nonceValue
    };
    
    return JSON.stringify(message, null, 0);
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Generate a deterministic key pair from seed
   */
  async generateKeyPairFromSeed(
    seed: string, 
    algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519
  ): Promise<KeyPair> {
    try {
      const seedHash = this.hash(seed);
      const seedBytes = Buffer.from(seedHash, 'hex');
      
      switch (algorithm) {
        case SignatureAlgorithm.ED25519:
          const ed25519PublicKey = await ed25519.getPublicKey(seedBytes);
          
          return {
            privateKey: seedHash,
            publicKey: Buffer.from(ed25519PublicKey).toString('hex'),
            algorithm: SignatureAlgorithm.ED25519
          };
          
        case SignatureAlgorithm.SECP256K1:
          const secp256k1PublicKey = secp256k1.getPublicKey(seedBytes);
          
          return {
            privateKey: seedHash,
            publicKey: Buffer.from(secp256k1PublicKey).toString('hex'),
            algorithm: SignatureAlgorithm.SECP256K1
          };
          
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }
    } catch (error) {
      logger.error('Failed to generate key pair from seed', { error, algorithm });
      throw error;
    }
  }

  /**
   * Validate public key format
   */
  validatePublicKey(publicKey: string, algorithm: SignatureAlgorithm): boolean {
    try {
      const keyBytes = Buffer.from(publicKey, 'hex');
      
      switch (algorithm) {
        case SignatureAlgorithm.ED25519:
          return keyBytes.length === 32; // Ed25519 public keys are 32 bytes
          
        case SignatureAlgorithm.SECP256K1:
          return keyBytes.length === 33 || keyBytes.length === 65; // Compressed or uncompressed
          
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate signature format
   */
  validateSignature(signature: string, algorithm: SignatureAlgorithm): boolean {
    try {
      const sigBytes = Buffer.from(signature, 'hex');
      
      switch (algorithm) {
        case SignatureAlgorithm.ED25519:
          return sigBytes.length === 64; // Ed25519 signatures are 64 bytes
          
        case SignatureAlgorithm.SECP256K1:
          return sigBytes.length === 64; // SECP256K1 signatures are 64 bytes (r + s)
          
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

export const cryptoService = new CryptographicService();
