import { demoAssignments } from '../../prisma/seeds/demo-dataset';

export function createAssignmentFixture(
  overrides: Partial<(typeof demoAssignments)[number]> = {},
) {
  return {
    ...demoAssignments[0],
    ...overrides,
  };
}
