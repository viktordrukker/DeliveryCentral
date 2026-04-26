const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Ensure email channel exists
  const emailChannel = await prisma.notificationChannel.upsert({
    where: { channelKey: 'email' },
    create: {
      channelKey: 'email',
      displayName: 'Email',
      kind: 'EMAIL',
      isEnabled: true,
      config: { fromAddress: 'noreply@deliverycentral.local' },
    },
    update: {},
  });
  console.log('Email channel:', emailChannel.id);

  const templates = [
    {
      templateKey: 'staffing-request-submitted-email',
      eventName: 'staffingRequest.submitted',
      displayName: 'Staffing Request Submitted',
      subjectTemplate: 'New staffing request: {{role}}',
      bodyTemplate: 'A new staffing request for role "{{role}}" has been submitted for project {{projectId}}. Request ID: {{requestId}}.',
    },
    {
      templateKey: 'staffing-request-in-review-email',
      eventName: 'staffingRequest.inReview',
      displayName: 'Staffing Request In Review',
      subjectTemplate: 'Your staffing request is under review',
      bodyTemplate: 'Your staffing request ({{requestId}}) is now under review by the resource management team.',
    },
    {
      templateKey: 'staffing-request-fulfilled-email',
      eventName: 'staffingRequest.fulfilled',
      displayName: 'Staffing Request Fulfilled',
      subjectTemplate: 'Staffing request fulfilled',
      bodyTemplate: 'Staffing request {{requestId}} has been fulfilled. All required headcount has been assigned.',
    },
    {
      templateKey: 'staffing-request-cancelled-email',
      eventName: 'staffingRequest.cancelled',
      displayName: 'Staffing Request Cancelled',
      subjectTemplate: 'Staffing request cancelled',
      bodyTemplate: 'Staffing request {{requestId}} has been cancelled.',
    },
    {
      templateKey: 'approval-pending-nudge-email',
      eventName: 'approval.pending.nudge',
      displayName: 'Approval Pending Nudge',
      subjectTemplate: 'Reminder: pending approval on {{requestId}}',
      bodyTemplate: 'You have a pending approval on request {{requestId}}. The requester is asking for a status update. View it in the inbox to approve, reject, or comment.',
    },
  ];

  for (const tmpl of templates) {
    const result = await prisma.notificationTemplate.upsert({
      where: { templateKey: tmpl.templateKey },
      create: { ...tmpl, channelId: emailChannel.id },
      update: {},
    });
    console.log('Template upserted:', result.templateKey);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
