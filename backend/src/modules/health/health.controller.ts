import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  ProviderHealth,
  ProvidersHealthService,
} from './providers-health.service';

/**
 * Provider health endpoints.
 *
 *   GET /api/v1/health/providers
 *
 * Returns a per-concern status table. Used by the setup wizard's "test
 * connection" step and by the future admin Integrations page.
 *
 * Note: the basic GET /health endpoint already exists on AppController
 * at the root level — this controller adds the per-provider rollup.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly providersHealth: ProvidersHealthService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Per-provider health / status table' })
  providers(): {
    generatedAt: string;
    summary: { ready: number; skipped: number; error: number; planned: number };
    providers: ProviderHealth[];
  } {
    const rows = this.providersHealth.getAll();
    const summary = rows.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      { ready: 0, skipped: 0, error: 0, planned: 0 } as Record<string, number>,
    );
    return {
      generatedAt: new Date().toISOString(),
      summary: summary as {
        ready: number;
        skipped: number;
        error: number;
        planned: number;
      },
      providers: rows,
    };
  }
}
