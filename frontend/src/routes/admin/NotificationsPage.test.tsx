import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchNotificationOutcomes,
  fetchNotificationTemplates,
  sendNotificationTest,
} from '@/lib/api/notifications';
import { NotificationsPage } from './NotificationsPage';

vi.mock('@/lib/api/notifications', () => ({
  fetchNotificationOutcomes: vi.fn(),
  fetchNotificationTemplates: vi.fn(),
  sendNotificationTest: vi.fn(),
}));

const mockedFetchNotificationTemplates = vi.mocked(fetchNotificationTemplates);
const mockedFetchNotificationOutcomes = vi.mocked(fetchNotificationOutcomes);
const mockedSendNotificationTest = vi.mocked(sendNotificationTest);

describe('NotificationsPage', () => {
  beforeEach(() => {
    mockedFetchNotificationTemplates.mockReset();
    mockedFetchNotificationOutcomes.mockReset();
    mockedSendNotificationTest.mockReset();
  });

  it('renders notification templates, preview data, and recent outcomes', async () => {
    mockTemplates();
    mockOutcomes();

    renderWithRouter();

    expect(await screen.findByText('Notification Templates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assignment Created/i })).toBeInTheDocument();
    const previewSection = screen.getByRole('heading', { name: 'Template Preview' }).closest('section');
    const outcomesSection = screen
      .getByRole('heading', { name: 'Recent Notification Outcomes' })
      .closest('section');
    expect(previewSection).not.toBeNull();
    expect(outcomesSection).not.toBeNull();
    expect(within(previewSection as HTMLElement).getByText('assignment.created')).toBeInTheDocument();
    expect(screen.getByText('Assignment created for {{personName}}')).toBeInTheDocument();
    expect(screen.getByText('Recent Notification Outcomes')).toBeInTheDocument();
    expect(
      within(outcomesSection as HTMLElement).getByText((content, node) => {
        return node !== null && node.classList.contains('monitoring-list__title') && content === 'Assignment Created';
      }),
    ).toBeInTheDocument();
    expect(within(outcomesSection as HTMLElement).getByText('RETRYING')).toBeInTheDocument();
    expect(
      within(outcomesSection as HTMLElement).getByText('Email delivery temporarily failed.'),
    ).toBeInTheDocument();
  });

  it('submits a notification test send and refreshes outcomes', async () => {
    mockTemplates();
    mockedFetchNotificationOutcomes
      .mockResolvedValueOnce([
        {
          attemptedAt: '2026-04-04T10:30:00.000Z',
          attemptNumber: 1,
          channelKey: 'email',
          errorSummary: 'Email delivery temporarily failed.',
          eventName: 'assignment.created',
          notificationRequestId: 'request-older',
          status: 'RETRYING',
          targetSummary: 'op***@example.com',
          templateDisplayName: 'Assignment Created',
          templateKey: 'assignment-created-email',
        },
      ])
      .mockResolvedValueOnce([
        {
          attemptedAt: '2026-04-04T11:00:00.000Z',
          attemptNumber: 1,
          channelKey: 'ms_teams_webhook',
          eventName: 'test.assignment-created-teams',
          notificationRequestId: 'request-1',
          status: 'SUCCEEDED',
          targetSummary: 'Webhook target configured',
          templateDisplayName: 'Assignment Created',
          templateKey: 'assignment-created-teams',
        },
      ]);
    mockedSendNotificationTest.mockResolvedValue({
      deliveryId: 'delivery-1',
      notificationRequestId: 'request-1',
      status: 'SUCCEEDED',
    });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Notification Templates');

    await user.clear(screen.getByLabelText('Recipient'));
    await user.type(screen.getByLabelText('Recipient'), 'teams-channel-alias');
    fireEvent.change(screen.getByLabelText('Payload JSON'), {
      target: {
        value: '{"personName":"Mia Lopez","projectName":"Atlas ERP Rollout"}',
      },
    });
    await user.click(screen.getByRole('button', { name: 'Send test' }));

    await waitFor(() => {
      expect(mockedSendNotificationTest).toHaveBeenCalledWith({
        channelKey: 'ms_teams_webhook',
        payload: {
          personName: 'Mia Lopez',
          projectName: 'Atlas ERP Rollout',
        },
        recipient: 'teams-channel-alias',
        templateKey: 'assignment-created-teams',
      });
    });

    await waitFor(() => {
      expect(mockedFetchNotificationOutcomes).toHaveBeenCalledTimes(2);
    });

    const outcomesSection = screen
      .getByRole('heading', { name: 'Recent Notification Outcomes' })
      .closest('section');
    expect(outcomesSection).not.toBeNull();

    expect(
      await screen.findByText('Test notification succeeded for Assignment Created.'),
    ).toBeInTheDocument();
    expect(screen.getByText('delivery-1')).toBeInTheDocument();
    expect(
      await within(outcomesSection as HTMLElement).findByText(/Webhook target configured/i),
    ).toBeInTheDocument();
    expect(within(outcomesSection as HTMLElement).getByText('SUCCEEDED')).toBeInTheDocument();
  });
});

function mockTemplates(): void {
  mockedFetchNotificationTemplates.mockResolvedValue([
    {
      bodyTemplate: 'Assignment created for {{personName}}',
      channelKey: 'ms_teams_webhook',
      displayName: 'Assignment Created',
      eventName: 'assignment.created',
      subjectTemplate: 'Assignment Created',
      templateKey: 'assignment-created-teams',
    },
    {
      bodyTemplate: 'Project {{projectName}} closed.',
      channelKey: 'email',
      displayName: 'Project Closed',
      eventName: 'project.closed',
      subjectTemplate: 'Project Closed',
      templateKey: 'project-closed-email',
    },
  ]);
}

function mockOutcomes(): void {
  mockedFetchNotificationOutcomes.mockResolvedValue([
    {
      attemptedAt: '2026-04-04T10:30:00.000Z',
      attemptNumber: 2,
      channelKey: 'email',
      errorSummary: 'Email delivery temporarily failed.',
      eventName: 'assignment.created',
      notificationRequestId: 'request-1',
      status: 'RETRYING',
      targetSummary: 'op***@example.com',
      templateDisplayName: 'Assignment Created',
      templateKey: 'assignment-created-email',
    },
  ]);
}

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/admin/notifications']}>
      <Routes>
        <Route element={<NotificationsPage />} path="/admin/notifications" />
      </Routes>
    </MemoryRouter>,
  );
}
