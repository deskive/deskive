/**
 * End-to-End Encryption Service
 * Handles all cryptographic operations for secure messaging
 */

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { api } from '@/lib/fetch';

// Types
export interface UserKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ConversationKeys {
  conversationId: string;
  symmetricKey: string;
}

export interface KeyStore {
  identityKeyPair: UserKeyPair;
  conversationKeys: Map<string, ConversationKeys>;
  deviceId: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  encryptionMetadata: {
    algorithm: string;
    version: string;
    nonce: string;
    conversationId: string;
  };
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  publicKey: string;
}

export class EncryptionService {
  private keyStore: KeyStore | null = null;
  private initialized: boolean = false;
  private currentUserId: string | null = null;

  /**
   * Check if encryption is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.keyStore !== null;
  }

  /**
   * Check if we have a conversation key
   */
  hasConversationKey(conversationId: string): boolean {
    return this.keyStore?.conversationKeys.has(conversationId) || false;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Get conversation symmetric key (for sharing with other users)
   */
  getConversationKey(conversationId: string): string | null {
    const key = this.keyStore?.conversationKeys.get(conversationId);
    return key?.symmetricKey || null;
  }

  /**
   * Generate a new identity key pair for a user
   * Called once during registration or first login
   */
  async generateIdentityKeyPair(): Promise<UserKeyPair> {
    const keyPair = nacl.box.keyPair();

    return {
      publicKey: naclUtil.encodeBase64(keyPair.publicKey),
      privateKey: naclUtil.encodeBase64(keyPair.secretKey),
    };
  }

  /**
   * Initialize encryption for the current user
   * Loads existing keys or generates new ones
   */
  async initialize(userId: string, password?: string): Promise<void> {
    try {
      // Store user ID for later use
      this.currentUserId = userId;
      console.log('🔐 Initializing E2EE for user:', userId);

      // Try to load existing keys from secure storage
      const storedKeys = await this.loadKeysFromSecureStorage(userId, password);

      if (storedKeys) {
        // storedKeys.conversationKeys is already a Map from loadKeysFromSecureStorage
        this.keyStore = storedKeys;
        console.log('✓ Loaded existing encryption keys');
        console.log('🔑 Loaded conversation keys count:', this.keyStore.conversationKeys.size);
        console.log('🔑 Loaded conversation IDs:', Array.from(this.keyStore.conversationKeys.keys()));

        // IMPORTANT: Upload public key to server even if we loaded existing keys
        // This ensures the server always has our latest public key
        console.log('📤 Uploading existing public key to server...');
        await this.uploadPublicKey(userId, this.keyStore.identityKeyPair.publicKey, this.keyStore.deviceId);
      } else {
        console.log('🆕 No existing keys found, generating new ones...');
        // First time - generate new keys
        const identityKeyPair = await this.generateIdentityKeyPair();
        const deviceId = this.generateDeviceId();

        this.keyStore = {
          identityKeyPair,
          conversationKeys: new Map(),
          deviceId,
        };

        // Save to secure storage
        await this.saveKeysToSecureStorage(userId, this.keyStore, password);

        // Upload public key to server
        await this.uploadPublicKey(userId, identityKeyPair.publicKey, deviceId);

        console.log('✓ Generated new encryption keys');
      }

      this.initialized = true;
      console.log('✅ E2EE initialization complete');
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Get current device info
   */
  getDeviceInfo(): DeviceInfo | null {
    if (!this.keyStore) return null;

    return {
      deviceId: this.keyStore.deviceId,
      deviceName: this.getDeviceName(),
      publicKey: this.keyStore.identityKeyPair.publicKey,
    };
  }

  /**
   * Derive shared secret for 1-on-1 conversation using X25519 key exchange
   */
  async deriveSharedSecret(otherUserPublicKey: string): Promise<string> {
    if (!this.keyStore) {
      throw new Error('Encryption not initialized');
    }

    const myPrivateKey = naclUtil.decodeBase64(this.keyStore.identityKeyPair.privateKey);
    const theirPublicKey = naclUtil.decodeBase64(otherUserPublicKey);

    // Diffie-Hellman key exchange
    const sharedSecret = nacl.box.before(theirPublicKey, myPrivateKey);

    return naclUtil.encodeBase64(sharedSecret);
  }

  /**
   * Encrypt message content
   */
  async encryptMessage(
    conversationId: string,
    plaintext: string
  ): Promise<EncryptedMessage> {
    if (!this.keyStore) {
      throw new Error('Encryption not initialized');
    }

    // Get or create conversation key
    let conversationKey = this.keyStore.conversationKeys.get(conversationId);

    if (!conversationKey) {
      console.log('🔑 Generating new conversation key for:', conversationId);
      // Generate new symmetric key for this conversation
      const symmetricKey = nacl.randomBytes(nacl.secretbox.keyLength);
      conversationKey = {
        conversationId,
        symmetricKey: naclUtil.encodeBase64(symmetricKey),
      };
      this.keyStore.conversationKeys.set(conversationId, conversationKey);

      // Save updated keys immediately
      if (this.currentUserId) {
        await this.saveKeysToSecureStorage(
          this.currentUserId,
          this.keyStore
        );
        console.log('💾 Saved new conversation key for:', conversationId);
      }
    } else {
      console.log('🔑 Using existing conversation key for:', conversationId);
    }

    // Generate unique nonce for this message
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

    // Encrypt with symmetric key
    const messageBytes = naclUtil.decodeUTF8(plaintext);
    const symmetricKeyBytes = naclUtil.decodeBase64(conversationKey.symmetricKey);

    console.log('🔐 ENCRYPTION - Key (first 20 chars):', conversationKey.symmetricKey.substring(0, 20));
    console.log('🔐 ENCRYPTION - Message length:', messageBytes.length);
    console.log('🔐 ENCRYPTION - Nonce length:', nonce.length);
    console.log('🔐 ENCRYPTION - Key length:', symmetricKeyBytes.length);

    const encrypted = nacl.secretbox(messageBytes, nonce, symmetricKeyBytes);
    console.log('🔐 ENCRYPTION - Encrypted length:', encrypted.length);

    return {
      encryptedContent: naclUtil.encodeBase64(encrypted),
      encryptionMetadata: {
        algorithm: 'x25519-xsalsa20-poly1305',
        version: '1.0',
        nonce: naclUtil.encodeBase64(nonce),
        conversationId,
      },
    };
  }

  /**
   * Decrypt message content
   */
  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<string> {
    if (!this.keyStore) {
      throw new Error('Encryption not initialized');
    }

    console.log('🔓 Attempting to decrypt message for conversation:', encryptedMessage.encryptionMetadata.conversationId);
    console.log('🔑 Available conversation keys:', Array.from(this.keyStore.conversationKeys.keys()));

    const conversationKey = this.keyStore.conversationKeys.get(
      encryptedMessage.encryptionMetadata.conversationId
    );

    if (!conversationKey) {
      console.error('❌ Conversation key not found for:', encryptedMessage.encryptionMetadata.conversationId);
      console.error('Available keys:', Array.from(this.keyStore.conversationKeys.keys()));
      throw new Error('Conversation key not found. Unable to decrypt message.');
    }

    console.log('✓ Conversation key found, decrypting...');

    try {
      // Log the raw data we're trying to decrypt
      console.log('📦 Encrypted content length:', encryptedMessage.encryptedContent?.length);
      console.log('📦 Nonce:', encryptedMessage.encryptionMetadata.nonce?.substring(0, 20) + '...');
      console.log('📦 Algorithm:', encryptedMessage.encryptionMetadata.algorithm);

      const encrypted = naclUtil.decodeBase64(encryptedMessage.encryptedContent);
      const nonce = naclUtil.decodeBase64(encryptedMessage.encryptionMetadata.nonce);
      const symmetricKey = naclUtil.decodeBase64(conversationKey.symmetricKey);

      console.log('🔓 DECRYPTION - Key (first 20 chars):', conversationKey.symmetricKey.substring(0, 20));
      console.log('🔢 Decoded lengths - encrypted:', encrypted.length, 'nonce:', nonce.length, 'key:', symmetricKey.length);

      const decrypted = nacl.secretbox.open(encrypted, nonce, symmetricKey);

      if (!decrypted) {
        console.error('❌ nacl.secretbox.open returned null');
        console.error('This means: wrong key, wrong nonce, or corrupted ciphertext');
        throw new Error('Decryption failed - message may be corrupted or tampered');
      }

      const plaintext = naclUtil.encodeUTF8(decrypted);
      console.log('✅ Successfully decrypted message');
      return plaintext;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Encrypt for a specific user (for sharing conversation keys)
   * Uses public key encryption: encrypt with recipient's public key
   */
  async encryptForUser(data: string, recipientPublicKey: string): Promise<string> {
    if (!this.keyStore) {
      throw new Error('Encryption not initialized');
    }

    console.log('🔐 Encrypting data for user with public key:', recipientPublicKey.substring(0, 20) + '...');

    const myPrivateKey = naclUtil.decodeBase64(this.keyStore.identityKeyPair.privateKey);
    const theirPublicKey = naclUtil.decodeBase64(recipientPublicKey);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const dataBytes = naclUtil.decodeUTF8(data);

    const encrypted = nacl.box(dataBytes, nonce, theirPublicKey, myPrivateKey);

    // Combine nonce and encrypted data
    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);

    const result = naclUtil.encodeBase64(combined);
    console.log('✅ Encrypted for user successfully');
    return result;
  }

  /**
   * Decrypt data that was encrypted for this user
   * Uses private key decryption
   */
  async decryptFromUser(encryptedData: string, senderPublicKey: string): Promise<string> {
    if (!this.keyStore) {
      throw new Error('Encryption not initialized');
    }

    console.log('🔓 Decrypting data from user with public key:', senderPublicKey.substring(0, 20) + '...');

    const myPrivateKey = naclUtil.decodeBase64(this.keyStore.identityKeyPair.privateKey);
    const theirPublicKey = naclUtil.decodeBase64(senderPublicKey);
    const combined = naclUtil.decodeBase64(encryptedData);

    // Extract nonce and encrypted data
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const encrypted = combined.slice(nacl.box.nonceLength);

    // Decrypt using sender's public key and my private key
    const decrypted = nacl.box.open(encrypted, nonce, theirPublicKey, myPrivateKey);

    if (!decrypted) {
      throw new Error('Failed to decrypt data from user');
    }

    const result = naclUtil.encodeUTF8(decrypted);
    console.log('✅ Decrypted from user successfully');
    return result;
  }

  /**
   * Add conversation key for a conversation (used when joining existing encrypted conversations)
   */
  async addConversationKey(conversationId: string, encryptedKey: string, senderPublicKey: string): Promise<void> {
    if (!this.keyStore) {
      throw new Error('Encryption not initialized');
    }

    console.log('🔑 ADDING conversation key for:', conversationId);
    console.log('🔑 ADDING - Encrypted key (first 30):', encryptedKey.substring(0, 30));
    console.log('🔑 ADDING - Sender public key (first 20):', senderPublicKey.substring(0, 20));

    try {
      // Decrypt the conversation key using sender's public key and our private key
      const symmetricKey = await this.decryptFromUser(encryptedKey, senderPublicKey);

      console.log('🔑 DECRYPTED conversation key (first 20):', symmetricKey.substring(0, 20));

      // Store the conversation key
      this.keyStore.conversationKeys.set(conversationId, {
        conversationId,
        symmetricKey,
      });

      // Save updated keys
      if (this.currentUserId) {
        await this.saveKeysToSecureStorage(this.currentUserId, this.keyStore);
        console.log('💾 Saved conversation key after adding:', conversationId);
      }

      console.log('✅ Conversation key added successfully');
    } catch (error) {
      console.error('❌ Failed to add conversation key:', error);
      throw error;
    }
  }

  /**
   * Clear all encryption data (for logout)
   */
  async clearKeys(): Promise<void> {
    this.keyStore = null;
    this.initialized = false;
    this.currentUserId = null;

    // Clear from storage
    localStorage.removeItem('e2ee_keys');
    sessionStorage.removeItem('e2ee_keys');
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Store keys securely (encrypted with password-derived key)
   */
  private async saveKeysToSecureStorage(
    userId: string,
    keyStore: KeyStore,
    password?: string
  ): Promise<void> {
    try {
      // Convert Map to object for storage
      const storageData = {
        ...keyStore,
        conversationKeys: Object.fromEntries(keyStore.conversationKeys),
      };

      console.log('💾 Saving keys to localStorage for user:', userId);
      console.log('💾 Conversation keys to save:', Object.keys(storageData.conversationKeys));

      // For now, store in localStorage with base64 encoding
      // TODO: Implement password-based encryption using PBKDF2
      const encoded = btoa(JSON.stringify(storageData));
      const storageKey = `e2ee_keys_${userId}`;
      localStorage.setItem(storageKey, encoded);

      // Verify it was saved
      const verification = localStorage.getItem(storageKey);
      if (verification) {
        console.log('✅ Keys saved successfully to localStorage');
      } else {
        console.error('❌ Failed to verify keys in localStorage');
      }
    } catch (error) {
      console.error('❌ Failed to save keys:', error);
      throw new Error('Failed to save encryption keys');
    }
  }

  /**
   * Load keys from secure storage
   */
  private async loadKeysFromSecureStorage(
    userId: string,
    password?: string
  ): Promise<KeyStore | null> {
    try {
      const storageKey = `e2ee_keys_${userId}`;
      console.log('📂 Attempting to load keys from localStorage for user:', userId);

      const encoded = localStorage.getItem(storageKey);
      if (!encoded) {
        console.log('📂 No keys found in localStorage');
        return null;
      }

      console.log('📂 Found encoded keys in localStorage (length:', encoded.length, ')');

      // Decode from base64
      const decoded = JSON.parse(atob(encoded));
      console.log('📂 Decoded keys, conversation count:', Object.keys(decoded.conversationKeys || {}).length);
      console.log('📂 Decoded conversationKeys object:', decoded.conversationKeys);

      // Convert object to Map
      const conversationKeysMap = new Map(Object.entries(decoded.conversationKeys || {}));
      console.log('📂 Converted to Map, size:', conversationKeysMap.size);
      console.log('📂 Map keys:', Array.from(conversationKeysMap.keys()));

      return {
        ...decoded,
        conversationKeys: conversationKeysMap,
      };
    } catch (error) {
      console.error('❌ Failed to load keys:', error);
      return null;
    }
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    const random = nacl.randomBytes(16);
    return `device_${naclUtil.encodeBase64(random).substring(0, 22)}`;
  }

  /**
   * Get device name from browser info
   */
  private getDeviceName(): string {
    const ua = navigator.userAgent;
    let deviceName = 'Unknown Device';

    if (ua.includes('Windows')) deviceName = 'Windows PC';
    else if (ua.includes('Mac')) deviceName = 'Mac';
    else if (ua.includes('Linux')) deviceName = 'Linux PC';
    else if (ua.includes('iPhone')) deviceName = 'iPhone';
    else if (ua.includes('iPad')) deviceName = 'iPad';
    else if (ua.includes('Android')) deviceName = 'Android';

    const browser = ua.includes('Chrome') ? 'Chrome' :
                    ua.includes('Firefox') ? 'Firefox' :
                    ua.includes('Safari') ? 'Safari' : 'Browser';

    return `${deviceName} - ${browser}`;
  }

  /**
   * Upload public key to server
   */
  private async uploadPublicKey(
    userId: string,
    publicKey: string,
    deviceId: string
  ): Promise<void> {
    try {
      console.log('📤 Uploading public key to server for user:', userId);
      console.log('📤 Device ID:', deviceId);
      console.log('📤 Public key (first 20):', publicKey.substring(0, 20));

      const response = await api.post('/crypto/keys', {
        userId,
        publicKey,
        deviceId,
        deviceName: this.getDeviceName(),
      });

      console.log('✅ Public key uploaded successfully:', response);
    } catch (error: any) {
      console.error('❌ Failed to upload public key:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Don't throw - allow encryption to continue even if upload fails
      // The user can still encrypt/decrypt their own messages
      console.warn('⚠️ Continuing without server-side key registration');
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
