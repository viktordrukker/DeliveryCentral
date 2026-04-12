# Employee Dashboard API

The employee dashboard endpoint provides a self-oriented read model for one employee. It keeps the response focused on the employee's own assignments, workload, and recent work evidence without turning observational data into staffing truth.

## `GET /dashboard/employee/{personId}`

Returns:

- current assignments
- future assignments
- current workload summary
- recent work evidence summary
- pending self workflow items
- notification summary placeholder

### Query parameters

- `asOf` optional ISO timestamp used to evaluate current versus future assignment slices

### Example

```http
GET /dashboard/employee/11111111-1111-1111-1111-111111111008?asOf=2025-03-15T00:00:00.000Z
```

### Response shape

```json
{
  "asOf": "2025-03-15T00:00:00.000Z",
  "person": {
    "id": "11111111-1111-1111-1111-111111111008",
    "displayName": "Ethan Brooks",
    "primaryEmail": "ethan.brooks@example.com",
    "currentOrgUnit": {
      "id": "22222222-2222-2222-2222-222222222005",
      "code": "DEP-APP",
      "name": "Application Engineering"
    },
    "currentLineManager": {
      "id": "11111111-1111-1111-1111-111111111006",
      "displayName": "Sophia Kim"
    }
  },
  "currentAssignments": [],
  "futureAssignments": [],
  "currentWorkloadSummary": {
    "activeAssignmentCount": 0,
    "futureAssignmentCount": 0,
    "pendingSelfWorkflowItemCount": 0,
    "totalAllocationPercent": 0,
    "isOverallocated": false
  },
  "recentWorkEvidenceSummary": {
    "recentEntryCount": 0,
    "totalEffortHours": 0,
    "lastActivityDate": null,
    "sourceTypes": [],
    "recentItems": []
  },
  "pendingWorkflowItems": {
    "itemCount": 0,
    "items": []
  },
  "notificationsSummary": {
    "status": "PLACEHOLDER",
    "pendingCount": 0,
    "note": "Employee notification inbox summary is not enabled yet."
  },
  "dataSources": [
    "person_directory",
    "assignments",
    "work_evidence",
    "notifications_placeholder"
  ]
}
```

## Notes

- The endpoint is self-oriented by shape: the payload only describes the person identified by `personId`.
- `currentAssignments` and `futureAssignments` are derived from authoritative internal assignments.
- `recentWorkEvidenceSummary` is observational and does not change assignment truth.
- `pendingWorkflowItems` currently surfaces self-relevant requested assignments.
- `notificationsSummary` is an explicit placeholder until a self-service notification inbox/read model exists.
