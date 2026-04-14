import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App | null = null;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase credentials are provided via environment variable
      const firebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!firebaseCredentials) {
        this.logger.warn(
          '⚠️ Firebase credentials not found. FCM push notifications will be disabled.',
        );
        this.logger.warn(
          'To enable FCM, set FIREBASE_SERVICE_ACCOUNT environment variable with your service account JSON.',
        );
        return;
      }

      // Parse the service account JSON
      const serviceAccount = JSON.parse(firebaseCredentials);

      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.logger.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error(
        `❌ Failed to initialize Firebase Admin SDK: ${error.message}`,
        error.stack,
      );
      this.logger.warn('FCM push notifications will be disabled');
    }
  }

  /**
   * Check if Firebase is initialized and ready to use
   */
  isInitialized(): boolean {
    return this.firebaseApp !== null;
  }

  /**
   * Get Firebase Messaging instance
   */
  getMessaging(): admin.messaging.Messaging | null {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized. Cannot get Messaging instance.');
      return null;
    }
    return admin.messaging(this.firebaseApp);
  }

  /**
   * Send FCM notification to a single device token
   */
  async sendToToken(
    token: string,
    notification: {
      title: string;
      body: string;
    },
    data?: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> {
    const messaging = this.getMessaging();

    if (!messaging) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
            priority: 'high',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.send(message);
      this.logger.log(`✅ FCM notification sent successfully: ${response}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Failed to send FCM notification: ${error.message}`, error.stack);

      // Handle invalid token errors
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send FCM notification to multiple device tokens
   */
  async sendToMultipleTokens(
    tokens: string[],
    notification: {
      title: string;
      body: string;
    },
    data?: Record<string, string>,
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    const messaging = this.getMessaging();

    if (!messaging) {
      this.logger.warn('Firebase not initialized. Cannot send to multiple tokens.');
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
            priority: 'high',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      // Collect invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          // Log detailed error for debugging
          this.logger.error(
            `❌ FCM Error for token ${tokens[idx].substring(0, 20)}...: ${resp.error?.code} - ${resp.error?.message}`,
          );

          if (
            resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      this.logger.log(
        `✅ FCM multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );

      if (invalidTokens.length > 0) {
        this.logger.warn(
          `⚠️ Found ${invalidTokens.length} invalid tokens that should be cleaned up`,
        );
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send multicast FCM notification: ${error.message}`,
        error.stack,
      );
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }

  /**
   * Send data-only FCM message (for incoming calls)
   * Data-only messages allow the app to handle notifications with custom UI
   */
  async sendDataOnlyToMultipleTokens(
    tokens: string[],
    data: Record<string, string>,
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    const messaging = this.getMessaging();

    if (!messaging) {
      this.logger.warn('Firebase not initialized. Cannot send data-only messages.');
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        data, // Only data payload, no notification
        android: {
          priority: 'high',
          // For call notifications, use a specific channel
          data: {
            ...data,
            notification_type: 'incoming_call',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10', // High priority for iOS
          },
          payload: {
            aps: {
              'content-available': 1, // Wake up app in background
              sound: 'default',
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      // Collect invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          this.logger.error(
            `❌ FCM Error for token ${tokens[idx].substring(0, 20)}...: ${resp.error?.code} - ${resp.error?.message}`,
          );

          if (
            resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      this.logger.log(
        `✅ FCM data-only multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );

      if (invalidTokens.length > 0) {
        this.logger.warn(
          `⚠️ Found ${invalidTokens.length} invalid tokens that should be cleaned up`,
        );
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to send data-only multicast FCM: ${error.message}`, error.stack);
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }

  /**
   * Validate if a token is still valid
   */
  async validateToken(token: string): Promise<boolean> {
    const messaging = this.getMessaging();

    if (!messaging) {
      return false;
    }

    try {
      // Try to send a dry-run message to validate the token
      await messaging.send(
        {
          token,
          notification: {
            title: 'Test',
            body: 'Test',
          },
        },
        true,
      ); // dry run

      return true;
    } catch (error) {
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        return false;
      }
      // If it's another error, assume token might still be valid
      return true;
    }
  }
}
