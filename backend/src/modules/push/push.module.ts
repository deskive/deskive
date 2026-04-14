import { Module } from '@nestjs/common';
import { PushService } from './push.service';

/**
 * Push notification module — exposes the pluggable PushService for
 * all outbound push notifications (web, Android/iOS FCM, OneSignal,
 * Expo).
 *
 * Pick a provider by setting PUSH_PROVIDER in your .env. See
 * `docs/providers/push.md`.
 *
 * No controller is registered here — deskive already ships
 * `NotificationsController` which handles the HTTP surface. Modules
 * should inject `PushService` to send actual pushes.
 */
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
