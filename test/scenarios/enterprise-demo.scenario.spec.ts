import { loadFixture } from '../helpers/fixture-loader.helper';

describe('enterprise demo scenario registry', () => {
  it('keeps scenario fixture references stable for cross-layer tests', () => {
    const fixture = loadFixture('demoDataset');

    expect(fixture.scenarios.unassignedEvidencePersonId).toBeDefined();
    expect(fixture.scenarios.approvedAssignmentWithoutEvidencePersonId).toBeDefined();
  });
});
