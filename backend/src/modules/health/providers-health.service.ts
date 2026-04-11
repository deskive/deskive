/**
 * Provider health service for deskive.
 *
 * Reports the runtime status of each pluggable infrastructure concern
 * (storage, ai, email, push, search, auth, video). Consumed by
 * `/api/v1/health/providers`, the setup wizard's "test connection"
 * step, and a future admin Integrations page.
 *
 * When an adapter PR merges into main, flip its `planned()` entry to
 * a real factory call. See how the existing `video-call-providers/`
 * and the in-flight storage/ai/email/push/search/auth adapter PRs
 * (#28-33) can be wired up once they land.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ProviderStatus = 'ready' | 'skipped' | 'error' | 'planned';

export interface ProviderHealth {
  concern: string;
  label: string;
  provider: string;
  envVar: string;
  status: ProviderStatus;
  details: string;
  adapterImplemented: boolean;
  issue?: number;
}

@Injectable()
export class ProvidersHealthService {
  private readonly logger = new Logger(ProvidersHealthService.name);

  constructor(private readonly config: ConfigService) {}

  getAll(): ProviderHealth[] {
    return [
      this.planned({
        concern: 'storage',
        label: 'File storage',
        envVar: 'STORAGE_PROVIDER',
        currentHardcoded: 'r2',
        requiredEnvVars: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
        issue: 20,
      }),
      this.planned({
        concern: 'ai',
        label: 'AI / LLM (text, vision, embeddings)',
        envVar: 'AI_PROVIDER',
        currentHardcoded: 'openai',
        requiredEnvVars: ['OPENAI_API_KEY'],
        issue: 21,
      }),
      this.planned({
        concern: 'email',
        label: 'Email (transactional)',
        envVar: 'EMAIL_PROVIDER',
        currentHardcoded: 'smtp',
        requiredEnvVars: ['SMTP_HOST'],
        issue: 22,
      }),
      this.planned({
        concern: 'push',
        label: 'Push notifications',
        envVar: 'PUSH_PROVIDER',
        currentHardcoded: 'fcm',
        requiredEnvVars: ['FIREBASE_SERVICE_ACCOUNT'],
        issue: 23,
      }),
      this.planned({
        concern: 'search',
        label: 'Keyword search',
        envVar: 'SEARCH_PROVIDER',
        currentHardcoded: 'pg-trgm',
        requiredEnvVars: [],
        issue: 24,
      }),
      this.planned({
        concern: 'auth',
        label: 'Auth / SSO providers',
        envVar: 'AUTH_PROVIDERS',
        currentHardcoded: 'local,google,github',
        requiredEnvVars: [],
        issue: 25,
      }),
      this.planned({
        concern: 'video',
        label: 'Video conferencing',
        envVar: 'VIDEO_PROVIDER',
        currentHardcoded: 'livekit',
        requiredEnvVars: ['LIVEKIT_HOST', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'],
        issue: 0,
      }),
      this.planned({
        concern: 'vector-db',
        label: 'Vector database (semantic search)',
        envVar: 'VECTOR_DB_PROVIDER',
        currentHardcoded: 'qdrant',
        requiredEnvVars: ['QDRANT_HOST'],
        issue: 0,
      }),
    ];
  }

  /**
   * Heuristic status resolver for concerns whose adapter pattern is
   * still planned. Reports 'planned' if the env vars for the current
   * hardcoded implementation look configured, and 'skipped' otherwise.
   */
  private planned(args: {
    concern: string;
    label: string;
    envVar: string;
    currentHardcoded: string;
    requiredEnvVars: string[];
    issue: number;
  }): ProviderHealth {
    const explicit = this.config.get<string>(args.envVar);
    const missing = args.requiredEnvVars.filter(
      (k) => !this.config.get<string>(k),
    );
    const selected = explicit || args.currentHardcoded;

    if (args.requiredEnvVars.length > 0 && missing.length > 0) {
      return {
        concern: args.concern,
        label: args.label,
        envVar: args.envVar,
        provider: selected,
        status: 'skipped',
        details: args.issue
          ? `adapter #${args.issue} not yet merged on main; current stack needs ${missing.join(', ')}`
          : `missing env vars: ${missing.join(', ')}`,
        adapterImplemented: false,
        issue: args.issue || undefined,
      };
    }
    return {
      concern: args.concern,
      label: args.label,
      envVar: args.envVar,
      provider: selected,
      status: 'planned',
      details: args.issue
        ? `adapter #${args.issue} not yet merged on main; current hardcoded stack (${args.currentHardcoded}) appears configured`
        : `${args.currentHardcoded} appears configured`,
      adapterImplemented: false,
      issue: args.issue || undefined,
    };
  }
}
