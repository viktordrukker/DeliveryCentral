import { InMemoryStaffingRequestService } from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';

const BASE_COMMAND = {
  allocationPercent: 50,
  endDate: '2026-09-30',
  priority: 'MEDIUM' as const,
  projectId: 'proj-1',
  requestedByPersonId: 'pm-1',
  role: 'Senior Engineer',
  startDate: '2026-05-01',
};

describe('InMemoryStaffingRequestService — create', () => {
  it('creates request with DRAFT status', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create(BASE_COMMAND);

    expect(req.status).toBe('DRAFT');
    expect(req.role).toBe('Senior Engineer');
    expect(req.headcountRequired).toBe(1); // default
    expect(req.headcountFulfilled).toBe(0);
    expect(req.fulfilments).toHaveLength(0);
  });

  it('uses headcountRequired from command when provided', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create({ ...BASE_COMMAND, headcountRequired: 3 });

    expect(req.headcountRequired).toBe(3);
  });

  it('assigns a unique id to each created request', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req1 = await svc.create(BASE_COMMAND);
    const req2 = await svc.create(BASE_COMMAND);

    expect(req1.id).not.toBe(req2.id);
  });
});

describe('InMemoryStaffingRequestService — submit', () => {
  it('transitions DRAFT → OPEN', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create(BASE_COMMAND);
    const submitted = await svc.submit(req.id);

    expect(submitted.status).toBe('OPEN');
  });

  it('throws when submitting non-DRAFT request', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create(BASE_COMMAND);
    await svc.submit(req.id); // now OPEN

    await expect(svc.submit(req.id)).rejects.toThrow();
  });
});

describe('InMemoryStaffingRequestService — fulfil + headcount auto-transition', () => {
  it('adds a fulfilment record and increments headcountFulfilled', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create({ ...BASE_COMMAND, headcountRequired: 2 });
    await svc.submit(req.id);
    const filled = await svc.fulfil(req.id, 'rm-1', 'person-A');

    expect(filled.fulfilments).toHaveLength(1);
    expect(filled.headcountFulfilled).toBe(1);
  });

  it('remains IN_REVIEW when headcount is partially fulfilled', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create({ ...BASE_COMMAND, headcountRequired: 2 });
    await svc.submit(req.id);
    const partial = await svc.fulfil(req.id, 'rm-1', 'person-A');

    expect(partial.status).toBe('IN_REVIEW');
    expect(partial.headcountFulfilled).toBe(1);
    expect(partial.headcountRequired).toBe(2);
  });

  it('auto-transitions to FULFILLED when headcount is fully met', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create({ ...BASE_COMMAND, headcountRequired: 2 });
    await svc.submit(req.id);
    await svc.fulfil(req.id, 'rm-1', 'person-A'); // partial
    const fulfilled = await svc.fulfil(req.id, 'rm-1', 'person-B'); // complete

    expect(fulfilled.status).toBe('FULFILLED');
    expect(fulfilled.headcountFulfilled).toBe(2);
    expect(fulfilled.fulfilments).toHaveLength(2);
  });

  it('auto-transitions to FULFILLED on first fulfil when headcountRequired=1', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create({ ...BASE_COMMAND, headcountRequired: 1 });
    await svc.submit(req.id);
    const fulfilled = await svc.fulfil(req.id, 'rm-1', 'person-A');

    expect(fulfilled.status).toBe('FULFILLED');
  });

  it('throws when fulfilling a CANCELLED request', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create(BASE_COMMAND);
    await svc.submit(req.id);
    await svc.cancel(req.id);

    await expect(svc.fulfil(req.id, 'rm-1', 'person-A')).rejects.toThrow();
  });

  it('throws when fulfilling an already FULFILLED request', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create({ ...BASE_COMMAND, headcountRequired: 1 });
    await svc.submit(req.id);
    await svc.fulfil(req.id, 'rm-1', 'person-A');

    await expect(svc.fulfil(req.id, 'rm-1', 'person-B')).rejects.toThrow();
  });
});

describe('InMemoryStaffingRequestService — cancel', () => {
  it('transitions OPEN → CANCELLED', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create(BASE_COMMAND);
    await svc.submit(req.id);
    const cancelled = await svc.cancel(req.id);

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeDefined();
  });

  it('throws when cancelling an already FULFILLED request', async () => {
    const svc = new InMemoryStaffingRequestService();
    const req = await svc.create({ ...BASE_COMMAND, headcountRequired: 1 });
    await svc.submit(req.id);
    await svc.fulfil(req.id, 'rm-1', 'person-A');

    await expect(svc.cancel(req.id)).rejects.toThrow();
  });
});

describe('InMemoryStaffingRequestService — list filters', () => {
  it('filters by status', async () => {
    const svc = new InMemoryStaffingRequestService();
    const r1 = await svc.create(BASE_COMMAND);
    await svc.create(BASE_COMMAND);
    await svc.submit(r1.id);

    const open = await svc.list({ status: 'OPEN' });
    const draft = await svc.list({ status: 'DRAFT' });

    expect(open).toHaveLength(1);
    expect(draft).toHaveLength(1);
  });

  it('filters by projectId', async () => {
    const svc = new InMemoryStaffingRequestService();
    await svc.create(BASE_COMMAND);
    await svc.create({ ...BASE_COMMAND, projectId: 'proj-2' });

    const proj1 = await svc.list({ projectId: 'proj-1' });
    expect(proj1).toHaveLength(1);
  });
});
