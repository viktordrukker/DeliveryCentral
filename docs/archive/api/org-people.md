# Org People API

## POST `/org/people`

Creates an employee in the Organization domain.

### Request body

```json
{
  "name": "Riley Morgan",
  "email": "riley.morgan@example.com",
  "status": "INACTIVE",
  "orgUnitId": "22222222-2222-2222-2222-222222222005",
  "grade": "G7",
  "role": "Solutions Analyst",
  "skillsets": ["Facilitation", "SQL"]
}
```

### Rules

- `email` must be unique
- `orgUnitId` must reference an existing org unit
- `status` is optional and defaults to `INACTIVE`
- `name` must include at least given and family name

### Success response

`201 Created`

```json
{
  "id": "generated-uuid",
  "name": "Riley Morgan",
  "email": "riley.morgan@example.com",
  "status": "INACTIVE",
  "orgUnitId": "22222222-2222-2222-2222-222222222005",
  "grade": "G7",
  "role": "Solutions Analyst",
  "skillsets": ["Facilitation", "SQL"]
}
```

### Error responses

- `409 Conflict`: duplicate employee email
- `404 Not Found`: org unit does not exist
- `400 Bad Request`: invalid name, invalid email, or malformed payload

## Existing read endpoints

- `GET /org/people`
- `GET /org/people/{id}`

These continue to provide the person directory read slice.

## POST `/org/people/{id}/deactivate`

Deactivates an employee without deleting records.

### Rules

- employee must exist
- employee cannot already be inactive
- existing assignments and history remain intact
- inactive employees cannot receive new assignments

### Success response

`200 OK`

```json
{
  "id": "11111111-1111-1111-1111-111111111001",
  "name": "Ava Rowe",
  "email": "ava.rowe@example.com",
  "status": "INACTIVE",
  "orgUnitId": "22222222-2222-2222-2222-222222222003",
  "skillsets": []
}
```

### Error responses

- `404 Not Found`: employee does not exist
- `400 Bad Request`: employee is already inactive
