/**
 * Video provider factory.
 *
 * Reads VIDEO_PROVIDER from config and returns the matching provider.
 * Add a new provider by:
 *   1. Implementing VideoProvider in <name>.provider.ts
 *   2. Adding a case to createVideoProvider() below
 *   3. Documenting env vars in MIGRATION.md
 */
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { VideoProvider } from './video-provider.interface';
import { LiveKitProvider } from './livekit.provider';
import { DailyProvider } from './daily.provider';
import { JitsiProvider } from './jitsi.provider';
import { NoneProvider } from './none.provider';

const log = new Logger('VideoProviderFactory');

export function createVideoProvider(config: ConfigService): VideoProvider {
  const choice = (config.get<string>('VIDEO_PROVIDER') || 'none').toLowerCase().trim();

  switch (choice) {
    case 'livekit': {
      const p = new LiveKitProvider(config);
      log.log(`Selected video provider: livekit (available=${p.isAvailable()})`);
      return p;
    }
    case 'daily':
    case 'dailyco':
    case 'daily.co': {
      const p = new DailyProvider(config);
      log.log(`Selected video provider: daily (available=${p.isAvailable()})`);
      return p;
    }
    case 'jitsi':
    case 'jitsi-meet': {
      const p = new JitsiProvider(config);
      log.log(`Selected video provider: jitsi (available=${p.isAvailable()})`);
      return p;
    }
    case 'none':
    case '':
      return new NoneProvider();
    default:
      log.warn(`Unknown VIDEO_PROVIDER="${choice}". Falling back to "none". Valid values: livekit, daily, jitsi, none.`);
      return new NoneProvider();
  }
}

export * from './video-provider.interface';
export { LiveKitProvider } from './livekit.provider';
export { DailyProvider } from './daily.provider';
export { JitsiProvider } from './jitsi.provider';
export { NoneProvider } from './none.provider';
