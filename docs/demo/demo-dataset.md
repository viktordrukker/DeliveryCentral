# Demo Dataset

## Purpose

The demo dataset provides a deterministic, readable baseline for:

- local development
- automated tests
- UI prototyping
- demo walkthroughs

## Coverage

- 2 directorates
- 4 departments
- 2 resource pools
- 12 people
- 6 projects
- internal-only and Jira-linked projects
- active assignments
- future-dated assignments
- one person with no assignment
- one project with no assigned people
- dotted-line reporting
- Jira work evidence without approved assignment
- approved assignment without work evidence

## Organization

### Directorates

- Delivery Directorate
- Platform Directorate

### Departments

- Consulting Delivery
- Program Management Office
- Application Engineering
- Data Engineering

## Key scenario markers

- Person with no assignment: `Zoe Turner`
- Person with dotted-line reporting: `Ethan Brooks`
- Person with Jira work evidence but no approved assignment: `Harper Ali`
- Person with approved assignment but no work evidence yet: `Mia Lopez`
- Project with no assigned people: `Internal Bench Planning`

## Projects

### Internal-only

- `PRJ-100` Internal Bench Planning
- `PRJ-101` Delivery Central Platform
- `PRJ-105` Polaris Security Hardening

### Jira-linked

- `PRJ-102` Atlas ERP Rollout
- `PRJ-103` Beacon Mobile Revamp
- `PRJ-104` Nova Analytics Migration

## Seed usage

Run:

```bash
npm run db:seed
```

The seed script loads the deterministic dataset from `prisma/seeds/demo-dataset.ts`.
