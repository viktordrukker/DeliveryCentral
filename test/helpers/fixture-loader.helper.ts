import { demoDatasetFixture } from '../fixtures/demo-dataset.fixture';
import { orgRestructureScenarioFixture } from '../scenarios/org-restructure/org-restructure.fixture';

const fixtureRegistry = {
  demoDataset: demoDatasetFixture,
  orgRestructureScenario: orgRestructureScenarioFixture,
} as const;

export type FixtureName = keyof typeof fixtureRegistry;

export function loadFixture<TName extends FixtureName>(name: TName): (typeof fixtureRegistry)[TName] {
  return fixtureRegistry[name];
}
