import { BadRequestException } from '@nestjs/common';

import { MeHomeService } from '@src/modules/dashboard/application/me-home.service';

function makeStubExec(label: string) {
  return { execute: async (..._args: unknown[]) => ({ label }) };
}

function buildService() {
  const employee = makeStubExec('employee');
  const pm = makeStubExec('pm');
  const rm = makeStubExec('rm');
  const dm = makeStubExec('dm');
  const hr = makeStubExec('hr');
  const director = makeStubExec('director');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new MeHomeService(employee as any, pm as any, rm as any, dm as any, hr as any, director as any);
}

describe('MeHomeService (FE-#314)', () => {
  it('picks director home when caller has director role', async () => {
    const svc = buildService();
    const r = await svc.getHome('p1', ['director', 'project_manager']);
    expect(r.homeKind).toBe('director');
  });

  it('admin sees director home (governance-equivalent view)', async () => {
    const svc = buildService();
    const r = await svc.getHome('p1', ['admin']);
    expect(r.homeKind).toBe('admin');
    expect((r.payload as { label: string }).label).toBe('director');
  });

  it('respects role priority: dm > pm > rm > hr > employee', async () => {
    const svc = buildService();
    expect((await svc.getHome('p1', ['delivery_manager', 'project_manager'])).homeKind).toBe('dm');
    expect((await svc.getHome('p1', ['project_manager', 'resource_manager'])).homeKind).toBe('pm');
    expect((await svc.getHome('p1', ['resource_manager', 'hr_manager'])).homeKind).toBe('rm');
    expect((await svc.getHome('p1', ['hr_manager', 'employee'])).homeKind).toBe('hr');
    expect((await svc.getHome('p1', ['employee'])).homeKind).toBe('employee');
  });

  it('throws when role needs personId and caller has none', async () => {
    const svc = buildService();
    await expect(svc.getHome(undefined, ['project_manager'])).rejects.toThrow(BadRequestException);
    await expect(svc.getHome(undefined, ['employee'])).rejects.toThrow(BadRequestException);
  });

  it('director / dm dont need personId (tenant-wide views)', async () => {
    const svc = buildService();
    await expect(svc.getHome(undefined, ['director'])).resolves.toMatchObject({ homeKind: 'director' });
    await expect(svc.getHome(undefined, ['delivery_manager'])).resolves.toMatchObject({ homeKind: 'dm' });
  });

  it('defaults to employee home when no recognized role', async () => {
    const svc = buildService();
    const r = await svc.getHome('p1', ['unknown_role']);
    expect(r.homeKind).toBe('employee');
  });
});
