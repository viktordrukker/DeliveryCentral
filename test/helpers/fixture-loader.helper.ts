import { demoDatasetFixture } from '../fixtures/demo-dataset.fixture';

const fixtureRegistry = {
  demoDataset: demoDatasetFixture,
} as const;

export type FixtureName = keyof typeof fixtureRegistry;

export function loadFixture<TName extends FixtureName>(name: TName): (typeof fixtureRegistry)[TName] {
  return fixtureRegistry[name];
}
