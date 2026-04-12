import { demoWorkEvidence } from '../../prisma/seeds/demo-dataset';

export function createWorkEvidenceFixture(
  overrides: Partial<(typeof demoWorkEvidence)[number]> = {},
) {
  return {
    ...demoWorkEvidence[0],
    ...overrides,
  };
}
