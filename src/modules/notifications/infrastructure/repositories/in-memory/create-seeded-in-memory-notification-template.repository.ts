import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';

export function createSeededInMemoryNotificationTemplateRepository() {
  return [
    NotificationTemplate.create(
      {
        bodyTemplate: 'Assignment {{assignmentId}} was created for project {{projectId}} with role {{staffingRole}}.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Assignment Created Email',
        eventName: 'assignment.created',
        isSystemManaged: true,
        subjectTemplate: 'Assignment created: {{assignmentId}}',
        templateKey: 'assignment-created-email',
      },
      '72222222-2222-2222-2222-222222222001',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Assignment {{assignmentId}} was approved.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Assignment Approved Email',
        eventName: 'assignment.approved',
        isSystemManaged: true,
        subjectTemplate: 'Assignment approved: {{assignmentId}}',
        templateKey: 'assignment-approved-email',
      },
      '72222222-2222-2222-2222-222222222002',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Assignment {{assignmentId}} was rejected. Reason: {{reason}}',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Assignment Rejected Email',
        eventName: 'assignment.rejected',
        isSystemManaged: true,
        subjectTemplate: 'Assignment rejected: {{assignmentId}}',
        templateKey: 'assignment-rejected-email',
      },
      '72222222-2222-2222-2222-222222222003',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Project {{projectId}} was activated.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Project Activated Email',
        eventName: 'project.activated',
        isSystemManaged: true,
        subjectTemplate: 'Project activated: {{projectName}}',
        templateKey: 'project-activated-email',
      },
      '72222222-2222-2222-2222-222222222004',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Project {{projectId}} was closed with {{totalMandays}} mandays recorded.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Project Closed Email',
        eventName: 'project.closed',
        isSystemManaged: true,
        subjectTemplate: 'Project closed: {{projectName}}',
        templateKey: 'project-closed-email',
      },
      '72222222-2222-2222-2222-222222222005',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Integration sync failed for {{provider}} {{resourceType}}. Error: {{errorMessage}}',
        channelId: '71111111-1111-1111-1111-111111111002',
        displayName: 'Integration Sync Failed Teams',
        eventName: 'integration.sync_failed',
        isSystemManaged: true,
        subjectTemplate: 'Integration sync failed',
        templateKey: 'integration-sync-failed-teams',
      },
      '72222222-2222-2222-2222-222222222006',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Case {{caseId}} ({{caseType}}) was created for {{subjectPersonId}} and assigned to {{ownerPersonId}}.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Case Created Email',
        eventName: 'case.created',
        isSystemManaged: true,
        subjectTemplate: 'Case created: {{caseId}}',
        templateKey: 'case-created-email',
      },
      '72222222-2222-2222-2222-222222222007',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'A step in case {{caseId}} was completed.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Case Step Completed Email',
        eventName: 'case.step_completed',
        isSystemManaged: true,
        subjectTemplate: 'Case step completed: {{caseId}}',
        templateKey: 'case-step-completed-email',
      },
      '72222222-2222-2222-2222-222222222008',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Case {{caseId}} has been closed.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Case Closed Email',
        eventName: 'case.closed',
        isSystemManaged: true,
        subjectTemplate: 'Case closed: {{caseId}}',
        templateKey: 'case-closed-email',
      },
      '72222222-2222-2222-2222-222222222009',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Assignment {{assignmentId}} has been ended.',
        channelId: '71111111-1111-1111-1111-111111111001',
        displayName: 'Assignment Ended Email',
        eventName: 'assignment.ended',
        isSystemManaged: true,
        subjectTemplate: 'Assignment ended: {{assignmentId}}',
        templateKey: 'assignment-ended-email',
      },
      '72222222-2222-2222-2222-222222222010',
    ),
    NotificationTemplate.create(
      {
        bodyTemplate: 'Employee {{personId}} has been terminated.',
        channelId: '71111111-1111-1111-1111-111111111002',
        displayName: 'Employee Terminated Teams',
        eventName: 'employee.terminated',
        isSystemManaged: true,
        subjectTemplate: 'Employee terminated',
        templateKey: 'employee-terminated-teams',
      },
      '72222222-2222-2222-2222-222222222011',
    ),
  ];
}
