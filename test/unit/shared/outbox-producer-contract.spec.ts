import * as fs from 'fs';
import * as path from 'path';

/**
 * F-6.5 / D-142 — outbox-producer contract.
 *
 * The plan's toggle-promotion schedule flips `flag.outboxEnabled` to ON
 * "after F-6.5 wires ≥3 real producers". This test guarantees those
 * three producers stay wired: deleting any of these call sites should
 * fail this test before it reaches CI.
 *
 * Each entry is a (service file, expected translator method) pair.
 * The check is static-grep — no Nest container booted — so it stays
 * fast and obvious in failure mode.
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

interface ProducerSite {
  file: string;
  method: 'assignmentCreated' | 'projectActivated' | 'caseCreated';
  label: string;
}

const REQUIRED_PRODUCERS: ProducerSite[] = [
  {
    file: 'src/modules/assignments/application/create-project-assignment.service.ts',
    method: 'assignmentCreated',
    label: 'Assignment created',
  },
  {
    file: 'src/modules/project-registry/application/activate-project.service.ts',
    method: 'projectActivated',
    label: 'Project activated',
  },
  {
    file: 'src/modules/case-management/application/create-case.service.ts',
    method: 'caseCreated',
    label: 'Case opened',
  },
];

describe('F-6.5 / D-142 outbox producer contract', () => {
  it.each(REQUIRED_PRODUCERS)(
    '$label → invokes notificationEventTranslator.$method',
    ({ file, method }) => {
      const full = path.join(REPO_ROOT, file);
      expect(fs.existsSync(full)).toBe(true);
      const src = fs.readFileSync(full, 'utf8');
      const pattern = new RegExp(
        `this\\.notificationEventTranslator\\??\\.${method}\\s*\\(`,
      );
      expect(src).toMatch(pattern);
    },
  );
});
