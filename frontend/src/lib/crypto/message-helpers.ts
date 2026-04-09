/**
 * Helper functions for encrypting/decrypting messages
 */

import { encryptionService } from './encryption.service';
import type { Message } from '../api/chat-api';

/**
 * Decrypt a single message if it's encrypted
 */
export async function decryptMessageIfNeeded(message: any): Promise<any> {
  // Check if message is encrypted
  if (!message.is_encrypted || !message.encrypted_content) {
    return message;
  }

  // Check if encryption service is initialized
  if (!encryptionService.isInitialized()) {
    console.warn('Cannot decrypt message: encryption not initialized');
    return {
      ...message,
      content: '[Encrypted message - unable to decrypt]',
    };
  }

  try {
    // Decrypt the message
    const decryptedContent = await encryptionService.decryptMessage({
      encryptedContent: message.encrypted_content,
      encryptionMetadata: message.encryption_metadata,
    });

    // Check if decrypted content is HTML or plain text
    const isHtml = decryptedContent.includes('<') && decryptedContent.includes('>');

    return {
      ...message,
      content: isHtml ? decryptedContent.replace(/<[^>]*>/g, '') : decryptedContent, // Strip HTML for plain content
      content_html: isHtml ? decryptedContent : undefined, // Keep HTML if present
      // Keep encrypted fields for reference
      _originalEncrypted: message.encrypted_content,
      _encryptionMetadata: message.encryption_metadata,
    };
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    return {
      ...message,
      content: '[Encrypted message - decryption failed]',
      content_html: '<p>[Encrypted message - decryption failed]</p>',
    };
  }
}

/**
 * Decrypt an array of messages
 */
export async function decryptMessages(messages: any[]): Promise<any[]> {
  if (!messages || messages.length === 0) {
    return messages;
  }

  // Decrypt all messages in parallel
  const decryptedMessages = await Promise.all(
    messages.map(msg => decryptMessageIfNeeded(msg))
  );

  return decryptedMessages;
}

/**
 * Check if a message is encrypted
 */
export function isMessageEncrypted(message: any): boolean {
  return Boolean(message?.is_encrypted && message?.encrypted_content);
}
