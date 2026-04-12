import { demoPeople } from '../../prisma/seeds/demo-dataset';

export function createPersonFixture(overrides: Partial<(typeof demoPeople)[number]> = {}) {
  return {
    ...demoPeople[0],
    ...overrides,
  };
}
