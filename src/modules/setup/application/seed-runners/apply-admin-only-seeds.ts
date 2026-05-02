import { Injectable } from '@nestjs/common';

import { SetupLoggerService } from '../setup-logger.service';

interface AdminAccountInput {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Wizard's `admin` step. Always runs regardless of profile choice — every
 * install needs at least the superadmin account so the operator can log
 * in after wizard completion.
 *
 * Idempotent — `seedSuperadmin` skips if a LocalAccount with the email
 * already exists.
 */
@Injectable()
export class ApplyAdminOnlySeedsRunner {
  public constructor(private readonly logger: SetupLoggerService) {}

  public async run(runId: string, input: AdminAccountInput): Promise<void> {
    // The existing seedSuperadmin reads SEED_ADMIN_* env vars. Override
    // them in process.env for the duration of the call so the helper
    // picks up the wizard's values without needing a refactor.
    const previousEnv = {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      displayName: process.env.SEED_ADMIN_DISPLAY_NAME,
    };
    process.env.SEED_ADMIN_EMAIL = input.email;
    process.env.SEED_ADMIN_PASSWORD = input.password;
    if (input.displayName) {
      process.env.SEED_ADMIN_DISPLAY_NAME = input.displayName;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const seed = require('../../../../../prisma/seed') as {
        seedSuperadmin: () => Promise<void>;
      };
      await this.logger.wrap(runId, 'admin', 'seed.admin.superadmin', () => seed.seedSuperadmin());
    } finally {
      // Restore — never leak the wizard's password into the long-running env.
      if (previousEnv.email === undefined) delete process.env.SEED_ADMIN_EMAIL;
      else process.env.SEED_ADMIN_EMAIL = previousEnv.email;
      if (previousEnv.password === undefined) delete process.env.SEED_ADMIN_PASSWORD;
      else process.env.SEED_ADMIN_PASSWORD = previousEnv.password;
      if (previousEnv.displayName === undefined) delete process.env.SEED_ADMIN_DISPLAY_NAME;
      else process.env.SEED_ADMIN_DISPLAY_NAME = previousEnv.displayName;
    }
  }
}
