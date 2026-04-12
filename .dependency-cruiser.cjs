/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-context-imports-into-assignment',
      comment:
        'Integrations Hub must not import Assignment & Workload internals directly. Staffing truth stays internal.',
      severity: 'error',
      from: {
        path: '^src/modules/(integrations-hub|integrations)/',
      },
      to: {
        path: '^src/modules/(assignment-workload|assignments)/',
      },
    },
    {
      name: 'no-work-evidence-imports-into-assignment',
      comment:
        'Time & Work Evidence must not directly depend on Assignment & Workload internals.',
      severity: 'error',
      from: {
        path: '^src/modules/time-work-evidence/',
      },
      to: {
        path: '^src/modules/assignment-workload/',
      },
    },
    {
      name: 'project-owned-only-by-project-registry',
      comment:
        'Canonical Project and ProjectExternalLink live in Project Registry only and may not be redefined elsewhere.',
      severity: 'error',
      from: {
        path: '^src/modules/(?!project-registry/).+',
      },
      to: {
        path: '^src/modules/project-registry/domain/entities/',
      },
    },
    {
      name: 'reporting-structures-owned-by-organization',
      comment:
        'Reporting lines and org structures are owned by Organization & Org Chart.',
      severity: 'error',
      from: {
        path: '^src/modules/(?!organization/).+',
      },
      to: {
        path:
          '^src/modules/organization/(domain|application|infrastructure)/',
      },
    },
    {
      name: 'metadata-must-not-depend-on-integrations',
      comment:
        'Customization / Metadata is a platform capability and must not depend on external integration adapters.',
      severity: 'error',
      from: {
        path: '^src/modules/customization-metadata/',
      },
      to: {
        path: '^src/modules/integrations-hub/',
      },
    },
    {
      name: 'no-orphans',
      comment: 'All modules should be connected intentionally.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: ['(^|/)main\\.ts$', '^src/app\\.module\\.ts$'],
      },
      to: {},
    },
  ],
  options: {
    combinedDependencies: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: ['\\.spec\\.ts$', '\\.e2e-spec\\.ts$'],
    },
  },
};
