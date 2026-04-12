import { loadFixture } from '../helpers/fixture-loader.helper';

describe('fixture loader helper', () => {
  it('loads deterministic named fixtures', () => {
    const fixture = loadFixture('demoDataset');

    expect(fixture.people).toBeGreaterThanOrEqual(12);
    expect(fixture.projects).toBeGreaterThanOrEqual(6);
  });
});
