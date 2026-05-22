import { VendorService } from '@src/modules/project-registry/application/vendor.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-100 / D-103-write-path round 10 — asserts VendorService.assignVendor,
 * updateVendorEngagement, endVendorEngagement populate actor-audit cols.
 */
describe('D-103 write-path — ProjectVendorEngagement actor-audit', () => {
  function buildStub(
    captureCreate: (d: Record<string, unknown>) => void,
    captureUpdate: (d: Record<string, unknown>) => void,
  ): PrismaService {
    return {
      vendor: {
        findUnique: async () => ({ id: 'v-1', name: 'Acme', isActive: true }),
      },
      projectVendorEngagement: {
        create: async (args: { data: Record<string, unknown> }) => {
          captureCreate(args.data);
          return {
            id: 'e-1',
            projectId: 'proj-1',
            vendorId: 'v-1',
            vendor: { name: 'Acme' },
            roleSummary: 'r',
            headcount: 1,
            monthlyRate: null,
            blendedDayRate: null,
            startDate: null,
            endDate: null,
            status: 'ACTIVE',
            notes: null,
          };
        },
        update: async (args: { data: Record<string, unknown> }) => {
          captureUpdate(args.data);
          return {
            id: 'e-1',
            projectId: 'proj-1',
            vendorId: 'v-1',
            vendor: { name: 'Acme' },
            roleSummary: 'r',
            headcount: 1,
            monthlyRate: null,
            blendedDayRate: null,
            startDate: null,
            endDate: null,
            status: args.data.status ?? 'ACTIVE',
            notes: null,
          };
        },
      },
    } as unknown as PrismaService;
  }

  it('assignVendor: populates createdByPersonId + updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new VendorService(buildStub((d) => (captured = d), () => undefined));
    await svc.assignVendor('proj-1', { vendorId: 'v-1', roleSummary: 'r' }, 'admin-7');
    expect(captured.createdByPersonId).toBe('admin-7');
    expect(captured.updatedByPersonId).toBe('admin-7');
  });

  it('updateVendorEngagement: populates updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new VendorService(buildStub(() => undefined, (d) => (captured = d)));
    await svc.updateVendorEngagement('e-1', { headcount: 3 }, 'admin-9');
    expect(captured.updatedByPersonId).toBe('admin-9');
  });

  it('endVendorEngagement: populates updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new VendorService(buildStub(() => undefined, (d) => (captured = d)));
    await svc.endVendorEngagement('e-1', 'TERMINATED', 'admin-3');
    expect(captured.updatedByPersonId).toBe('admin-3');
  });

  it('legacy assignVendor without actor: cols stay NULL', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new VendorService(buildStub((d) => (captured = d), () => undefined));
    await svc.assignVendor('proj-1', { vendorId: 'v-1', roleSummary: 'r' });
    expect(captured.createdByPersonId).toBeNull();
    expect(captured.updatedByPersonId).toBeNull();
  });
});
