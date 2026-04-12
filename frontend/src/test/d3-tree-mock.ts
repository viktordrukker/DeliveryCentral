import { vi } from 'vitest';

vi.mock('d3-org-chart', () => {
  function createChainableMock(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const m of ['container', 'data', 'nodeWidth', 'nodeHeight', 'nodeId', 'parentNodeId', 'nodeContent', 'onNodeClick', 'compact', 'render', 'fit', 'connections']) {
      obj[m] = vi.fn(() => obj);
    }
    return obj;
  }
  return { OrgChart: vi.fn().mockImplementation(createChainableMock) };
});
