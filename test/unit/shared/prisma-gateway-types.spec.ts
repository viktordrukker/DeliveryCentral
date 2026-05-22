/**
 * 20c-10 — Prisma Gateway type-safety ratchet.
 * Source-shape assertions that each Gateway interface in the affected
 * repositories uses `Pick<Prisma.XxxDelegate, ...>` instead of the
 * legacy `args: any` / `Promise<any>` pattern.
 */
import { readFileSync } from 'node:fs';

const FILES_WITH_TYPED_GATEWAYS = [
  'src/modules/integrations/m365/infrastructure/repositories/prisma/prisma-m365-directory-reconciliation-record.repository.ts',
  'src/modules/integrations/radius/infrastructure/repositories/prisma/prisma-external-account-link.repository.ts',
  'src/modules/integrations/radius/infrastructure/repositories/prisma/prisma-radius-reconciliation-record.repository.ts',
  'src/modules/work-evidence/infrastructure/repositories/prisma/prisma-work-evidence.repository.ts',
  'src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-delivery.repository.ts',
  'src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-request.repository.ts',
  'src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-channel.repository.ts',
  'src/modules/assignments/infrastructure/repositories/prisma/prisma-project-assignment.repository.ts',
  'src/modules/project-registry/infrastructure/repositories/prisma/prisma-project.repository.ts',
];

describe('20c-10 — Prisma Gateway type-safety (source-shape)', () => {
  it.each(FILES_WITH_TYPED_GATEWAYS)('%s uses Pick<Prisma.XxxDelegate, ...> typed gateway', (path) => {
    const src = readFileSync(path, 'utf-8');
    // Must import Prisma from @prisma/client
    expect(src).toMatch(/import\s*\{[^}]*\bPrisma\b[^}]*\}\s*from\s*['"]@prisma\/client['"]/);
    // Must use Pick<Prisma.*Delegate, ...> pattern at least once
    expect(src).toMatch(/Pick<\s*Prisma\.\w+Delegate,/);
    // Must NOT have the legacy `args: any` pattern remaining on a method
    // signature (comments with the literal string are allowed).
    const codeLines = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'));
    const stillHasArgsAny = codeLines.some((line) => /\bargs:\s*any\b/.test(line));
    expect(stillHasArgsAny).toBe(false);
  });
});
