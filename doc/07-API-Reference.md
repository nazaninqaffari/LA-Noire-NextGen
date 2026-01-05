# API Reference

Complete API reference for LA Noire NextGen Police Management System.

**Base URL**: `http://localhost:8000/api/v1/`

**Authentication**: Session-based authentication required for most endpoints.

## Interactive Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## Authentication

### Register User
```http
POST /accounts/users/
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "phone_number": "+11234567890",
  "national_id": "1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepass123",
  "password_confirm": "securepass123"
}
```

**Response**: 201 Created
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "phone_number": "+11234567890",
  "national_id": "1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "roles": [
    {
      "id": 1,
      "name": "Base User",
      "description": "Default role for all registered users"
    }
  ],
  "is_active": true,
  "date_joined": "2026-01-05T10:00:00Z"
}
```

### Login
Use Django's built-in session authentication or implement token authentication.

### Get Current User
```http
GET /accounts/users/me/
Authorization: Session [token]
```

## Roles

### List Roles
```http
GET /accounts/roles/
```

**Response**: 200 OK
```json
[
  {
    "id": 1,
    "name": "Detective",
    "description": "Investigates cases and identifies suspects",
    "is_police_rank": true,
    "hierarchy_level": 4,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

### Create Role (Admin Only)
```http
POST /accounts/roles/
Content-Type: application/json

{
  "name": "Forensic Specialist",
  "description": "Analyzes physical evidence",
  "is_police_rank": true,
  "hierarchy_level": 3
}
```

## Cases

### Create Complaint-Based Case
```http
POST /cases/cases/
Content-Type: application/json

{
  "title": "Burglary at Downtown Store",
  "description": "Store broken into overnight, cash register stolen",
  "crime_level": 2,
  "formation_type": "complaint",
  "complainant_statement": "I arrived at 8 AM to find window smashed and register gone"
}
```

**Response**: 201 Created
```json
{
  "id": 1,
  "case_number": "CASE-A1B2C3D4E5F6",
  "title": "Burglary at Downtown Store",
  "status": "draft",
  "crime_level_details": {
    "id": 2,
    "name": "Level 2 - Medium Crimes",
    "level": 2
  },
  "complainants": [
    {
      "user": 5,
      "is_primary": true,
      "statement": "I arrived at 8 AM to find window smashed and register gone"
    }
  ],
  "created_at": "2026-01-05T10:00:00Z"
}
```

### Create Crime Scene Case
```http
POST /cases/cases/
Content-Type: application/json

{
  "title": "Homicide at 5th Street",
  "description": "Body discovered in alley",
  "crime_level": 1,
  "crime_scene_location": "Alley behind 456 5th St",
  "crime_scene_datetime": "2026-01-05T02:30:00Z",
  "witness_data": [
    {
      "full_name": "Jane Smith",
      "phone_number": "+11234567891",
      "national_id": "9876543210"
    }
  ]
}
```

### List Cases
```http
GET /cases/cases/?status=open&crime_level=1
```

**Query Parameters**:
- `status`: Filter by case status
- `crime_level`: Filter by crime level ID
- `formation_type`: complaint or crime_scene
- `assigned_detective`: Filter by detective user ID
- `search`: Search in case_number, title, description

### Cadet Review
```http
POST /cases/cases/1/cadet_review/
Content-Type: application/json

{
  "decision": "approved"
}
```

### Officer Review
```http
POST /cases/cases/1/officer_review/
Content-Type: application/json

{
  "decision": "approved"
}
```

## Evidence

### Add Testimony
```http
POST /evidence/testimony/
Content-Type: multipart/form-data

case: 1
title: "Eyewitness Statement"
description: "Witness saw suspect"
witness: 5
transcript: "I saw the suspect running away at 10 PM"
image: [binary file data]
```

### Add Biological Evidence
```http
POST /evidence/biological/
Content-Type: application/json

{
  "case": 1,
  "title": "Blood Sample",
  "description": "Blood found on victim's clothing",
  "evidence_type": "Blood Stain",
  "images": [1, 2]
}
```

### Add Vehicle Evidence
```http
POST /evidence/vehicles/
Content-Type: application/json

{
  "case": 1,
  "title": "Suspect Vehicle",
  "description": "Black sedan",
  "model": "1947 Ford",
  "color": "Black",
  "license_plate": "CAL-5678"
}
```

### Add ID Document
```http
POST /evidence/id-documents/
Content-Type: application/json

{
  "case": 1,
  "title": "Suspect ID",
  "description": "Driver's license found at scene",
  "owner_full_name": "John Doe",
  "document_type": "Driver's License",
  "attributes": {
    "license_number": "D123456",
    "issue_date": "2022-01-01"
  }
}
```

## Investigation

### Create Detective Board
```http
POST /investigation/detective-boards/
Content-Type: application/json

{
  "case": 1,
  "detective": 4
}
```

### Add Evidence to Board
```http
POST /investigation/board-items/
Content-Type: application/json

{
  "board": 1,
  "content_type": "testimony",
  "object_id": 1,
  "position_x": 100.5,
  "position_y": 200.3
}
```

### Create Evidence Connection
```http
POST /investigation/evidence-connections/
Content-Type: application/json

{
  "board": 1,
  "from_item": 1,
  "to_item": 2,
  "notes": "Both evidence items link suspect to scene"
}
```

### Identify Suspect
```http
POST /investigation/suspects/
Content-Type: application/json

{
  "case": 1,
  "person": 10,
  "reason": "Fingerprints match those found at scene",
  "identified_by_detective": 4
}
```

### Sergeant Approve Suspect
```http
PATCH /investigation/suspects/1/
Content-Type: application/json

{
  "approved_by_sergeant": 5,
  "sergeant_approval_message": "Approved. Issue arrest warrant.",
  "arrest_warrant_issued": true,
  "status": "arrested"
}
```

### Record Interrogation
```http
POST /investigation/interrogations/
Content-Type: application/json

{
  "suspect": 1,
  "detective": 4,
  "sergeant": 5,
  "detective_guilt_rating": 8,
  "sergeant_guilt_rating": 9,
  "detective_notes": "Suspect's story has inconsistencies",
  "sergeant_notes": "Body language suggests deception"
}
```

### Submit Tip-Off
```http
POST /investigation/tipoffs/
Content-Type: application/json

{
  "case": 1,
  "suspect": 1,
  "information": "I saw the suspect at 5th street on the night of the crime"
}
```

**Response**:
```json
{
  "id": 1,
  "case": 1,
  "suspect": 1,
  "submitted_by": 20,
  "information": "I saw the suspect at 5th street on the night of the crime",
  "status": "pending",
  "submitted_at": "2026-01-05T14:00:00Z"
}
```

### Get Wanted List (Intensive Pursuit)
```http
GET /investigation/suspects/?status=intensive_pursuit
```

Returns suspects with `danger_score` and `reward_amount` calculated.

## Trials

### Create Trial
```http
POST /trial/trials/
Content-Type: application/json

{
  "case": 1,
  "suspect": 1,
  "judge": 15,
  "submitted_by_captain": 6,
  "captain_notes": "Strong evidence of guilt. Ready for trial."
}
```

### Deliver Verdict
```http
POST /trial/verdicts/
Content-Type: application/json

{
  "trial": 1,
  "decision": "guilty",
  "reasoning": "Overwhelming evidence including fingerprints, witness testimony, and suspect's confession."
}
```

### Assign Punishment
```http
POST /trial/punishments/
Content-Type: application/json

{
  "verdict": 1,
  "title": "10 years imprisonment",
  "description": "Defendant sentenced to 10 years in state prison for burglary and assault."
}
```

### Request Bail Payment
```http
POST /trial/bail-payments/
Content-Type: application/json

{
  "suspect": 1,
  "amount": 50000000
}
```

**Response**:
```json
{
  "id": 1,
  "suspect": 1,
  "amount": "50000000",
  "status": "pending",
  "requested_at": "2026-01-05T16:00:00Z"
}
```

### Approve Bail (Sergeant)
```http
PATCH /trial/bail-payments/1/
Content-Type: application/json

{
  "approved_by_sergeant": 5,
  "status": "approved",
  "approved_at": "2026-01-05T16:30:00Z"
}
```

## Filtering & Searching

Most list endpoints support:
- **Filtering**: `?field=value`
- **Search**: `?search=query`
- **Ordering**: `?ordering=-created_at` (prefix `-` for descending)
- **Pagination**: `?page=2&page_size=20`

## Error Responses

### 400 Bad Request
```json
{
  "field_name": ["Error message"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

## Rate Limiting

No rate limiting implemented in current version. Consider adding for production.

## See Also

- [[01-Overview|System Overview]]
- [[02-User-Roles|User Roles]]
- [[03-Case-Workflows|Case Workflows]]
- [[04-Evidence-Management|Evidence Management]]
