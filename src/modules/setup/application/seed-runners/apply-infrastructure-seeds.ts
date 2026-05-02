import { Injectable } from '@nestjs/common';

import { SetupLoggerService } from '../setup-logger.service';

/**
 * Wires the wizard's `seed` step (profile = `preset` or `demo`) to the
 * existing infrastructure helpers in `prisma/seed.ts`. These helpers are
 * idempotent (upsert / ON CONFLICT DO NOTHING) so re-running them is
 * safe — required by the resumable + reset flows.
 *
 * Imports execute the seed file lazily via `require()` so the
 * `require.main === module` guard at the bottom of seed.ts kicks in
 * (i.e. the file's `main()` doesn't auto-fire).
 */
@Injectable()
export class ApplyInfrastructureSeedsRunner {
  public constructor(private readonly logger: SetupLoggerService) {}

  public async run(runId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seed = require('../../../../../prisma/seed') as {
      seedMetadata: () => Promise<void>;
      seedSkills: () => Promise<void>;
      seedRadiatorThresholds: () => Promise<void>;
      seedFullNotificationInfrastructure: () => Promise<void>;
      seedPlatformSettings: () => Promise<void>;
    };

    await this.logger.wrap(runId, 'seed', 'seed.infrastructure.metadata', () => seed.seedMetadata());
    await this.logger.wrap(runId, 'seed', 'seed.infrastructure.platformSettings', () =>
      seed.seedPlatformSettings(),
    );
    await this.logger.wrap(runId, 'seed', 'seed.infrastructure.skills', () => seed.seedSkills());
    await this.logger.wrap(runId, 'seed', 'seed.infrastructure.radiatorThresholds', () =>
      seed.seedRadiatorThresholds(),
    );
    await this.logger.wrap(runId, 'seed', 'seed.infrastructure.notificationInfrastructure', () =>
      seed.seedFullNotificationInfrastructure(),
    );
  }
}
