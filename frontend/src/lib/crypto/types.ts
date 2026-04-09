/**
 * E2EE Type Definitions
 */

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
  encryptionMetadata: EncryptionMetadata;
}

export interface EncryptionMetadata {
  algorithm: string;
  version: string;
  nonce: string;
  conversationId: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  publicKey: string;
  isActive?: boolean;
  lastUsedAt?: string;
  createdAt?: string;
}

export interface PublicKeyResponse {
  userId: string;
  publicKey: string;
  deviceId: string;
  deviceName?: string;
}
