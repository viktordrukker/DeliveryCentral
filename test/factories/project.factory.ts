import { demoProjects } from '../../prisma/seeds/demo-dataset';

export function createProjectFixture(overrides: Partial<(typeof demoProjects)[number]> = {}) {
  return {
    ...demoProjects[0],
    ...overrides,
  };
}
