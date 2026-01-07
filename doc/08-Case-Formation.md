# Case Formation System

## Overview

The Case Formation system implements two distinct workflows for creating criminal cases in the LA Noire NextGen system:

1. **Complaint-Based Formation** (تشکیل پرونده از طریق شکایت): Citizens file complaints that go through multi-level review
2. **Crime Scene-Based Formation** (تشکیل پرونده از صحنه جرم): Police officers report crime scenes with witness information

## Case Formation Types

### 1. Complaint-Based Formation

**Purpose**: Allows citizens to file complaints that are reviewed by police personnel before becoming official cases.

**Workflow**:
```
Complainant → Cadet Review → Officer Review → Open Case
     ↓
  [Rejected]
     ↓
  Try Again (max 3 attempts) → Permanently Rejected
```

**Process**:
1. **Complainant Submission**: Civilian files complaint with:
   - Case title and description
   - Crime level
   - Complainant statement
   - Case automatically gets status: `DRAFT` → `CADET_REVIEW`
   - Case number format: `YYYY-CMPL-XXXXXXXX`

2. **Cadet Review**:
   - Cadet reviews complaint details
   - Can approve or reject with reason
   - **On Approval**: Case moves to `OFFICER_REVIEW`
   - **On Rejection**: 
     - Rejection count increments
     - If < 3 rejections: Returns to `DRAFT` status for corrections
     - If = 3 rejections: Permanently `REJECTED`
   - Cadet can add additional complainants
   - Cadet verifies complainant information

3. **Officer Review**:
   - Police Officer (or higher) reviews case
   - Can approve or reject
   - **On Approval**: Case status becomes `OPEN` for investigation
   - **On Rejection**: Returns to `CADET_REVIEW` for re-evaluation

**Endpoint**: `POST /api/v1/cases/cases/`

**Request Example**:
```json
{
  "title": "Burglary at Downtown Store",
  "description": "My store was broken into last night...",
  "crime_level": 2,
  "complainant_statement": "I arrived at 8 AM and found the front window smashed..."
}
```

**Response**:
```json
{
  "id": 1,
  "case_number": "2026-CMPL-00000001",
  "title": "Burglary at Downtown Store",
  "status": "cadet_review",
  "formation_type": "complaint",
  "rejection_count": 0,
  "created_at": "2026-01-15T08:30:00Z",
  ...
}
```

### 2. Crime Scene-Based Formation

**Purpose**: Police officers create cases directly from crime scene investigations.

**Workflow**:
```
Officer Reports → Superior Review → Open Case
     ↓                    ↓
[Police Chief]      [Other Ranks]
     ↓                    ↓
Auto-Approved        Needs Review
```

**Process**:
1. **Officer Submission**: Police officer (not Cadet) reports crime scene with:
   - Case title and description
   - Crime level
   - Crime scene location (required)
   - Crime scene date/time (required)
   - Witness information (optional but recommended)
   - Case number format: `YYYY-SCEN-XXXXXXXX`

2. **Automatic Status Determination**:
   - **Police Chief**: Automatically approved → `OPEN` status
   - **Other Ranks**: Goes to `OFFICER_REVIEW` for superior approval

3. **Superior Review** (if not Police Chief):
   - Higher-ranking officer reviews case
   - Can approve or reject
   - **On Approval**: Case status becomes `OPEN`
   - **On Rejection**: Returns to `DRAFT` for officer to revise

**Endpoint**: `POST /api/v1/cases/cases/`

**Request Example**:
```json
{
  "title": "Homicide - Sunset Boulevard",
  "description": "Body found at crime scene...",
  "crime_level": 0,
  "crime_scene_location": "123 Sunset Blvd, Los Angeles",
  "crime_scene_datetime": "2026-01-14T22:30:00Z",
  "witnesses": [
    {
      "name": "John Smith",
      "phone_number": "+11234567890",
      "statement": "I heard gunshots around 10 PM..."
    }
  ]
}
```

**Response**:
```json
{
  "id": 2,
  "case_number": "2026-SCEN-00000001",
  "title": "Homicide - Sunset Boulevard",
  "status": "open",
  "formation_type": "crime_scene",
  "crime_scene_location": "123 Sunset Blvd, Los Angeles",
  "created_at": "2026-01-15T09:00:00Z",
  ...
}
```

## Review Actions

### Cadet Review

**Endpoint**: `POST /api/v1/cases/cases/{id}/cadet_review/`

**Permission**: Cadet role only

**Request**:
```json
{
  "decision": "approved"
}
```

Or with rejection:
```json
{
  "decision": "rejected",
  "rejection_reason": "Missing witness contact information. Please provide phone numbers."
}
```

**Behavior**:
- Approved: Moves case to Officer Review
- Rejected: Increments rejection count, returns to Draft (or Rejected if 3rd attempt)
- Creates `CaseReview` record

### Officer Review

**Endpoint**: `POST /api/v1/cases/cases/{id}/officer_review/`

**Permission**: Police Officer or higher (excluding Cadet)

**Request**: Same format as cadet review

**Behavior**:
- **Complaint Cases**:
  - Approved: Opens case for investigation
  - Rejected: Returns to Cadet Review
- **Crime Scene Cases**:
  - Approved: Opens case
  - Rejected: Returns to Draft for officer to revise

## Additional Complainant Management

### Add Complainant

**Endpoint**: `POST /api/v1/cases/cases/{id}/add_complainant/`

**Permission**: Cadet only

**Purpose**: Add additional complainants to a complaint case

**Request**:
```json
{
  "user_id": 123,
  "statement": "I also witnessed the burglary..."
}
```

**Validation**:
- User must exist
- User cannot already be a complainant on this case
- Only works for complaint-based cases

### Verify Complainant

**Endpoint**: `POST /api/v1/cases/cases/{id}/complainants/{complainant_id}/verify/`

**Permission**: Cadet only

**Purpose**: Mark complainant information as verified

**Request**:
```json
{
  "verified": true
}
```

## Case Number Format

Case numbers are automatically generated with the following format:

- **Complaint Cases**: `YYYY-CMPL-XXXXXXXX`
  - Example: `2026-CMPL-00000001`
  
- **Crime Scene Cases**: `YYYY-SCEN-XXXXXXXX`
  - Example: `2026-SCEN-00000001`

Where:
- `YYYY`: Current year
- `CMPL/SCEN`: Formation type
- `XXXXXXXX`: 8-digit sequential number (zero-padded)

## Case Status Flow

### Complaint-Based Case Statuses

```
DRAFT → CADET_REVIEW → OFFICER_REVIEW → OPEN
  ↓           ↓              ↓
[Created] [Reviewing]  [Final Review]
              ↓
         REJECTED (after 3 attempts)
```

### Crime Scene-Based Case Statuses

```
DRAFT → OFFICER_REVIEW → OPEN
  ↓           ↓
[Created] [Reviewing]

OR (for Police Chief):

DRAFT → OPEN (auto-approved)
```

## Rejection System

### Complaint Cases

- **Maximum Attempts**: 3
- **Rejection Counter**: Increments with each rejection
- **After 3rd Rejection**: Case status becomes `REJECTED` permanently
- **Before 3rd Rejection**: Case returns to `DRAFT` for complainant to correct

### Crime Scene Cases

- No rejection limit
- Rejected cases return to `DRAFT` for officer to revise
- Officer can resubmit indefinitely

## Role-Based Permissions

### Case Visibility (Queryset Filtering)

- **Administrators**: See all cases
- **Police Chief**: See all cases
- **Cadets**: See cases in DRAFT, CADET_REVIEW, OFFICER_REVIEW statuses + cases assigned to them
- **Officers**: See cases in OFFICER_REVIEW and OPEN statuses + cases assigned to them + cases they created
- **Civilians**: See only their own cases

### Action Permissions

| Action | Allowed Roles |
|--------|---------------|
| Create Complaint Case | Civilians only |
| Create Crime Scene Case | Police Officers (not Cadet) |
| Cadet Review | Cadet only |
| Officer Review | Officer, Detective, Sergeant, Captain, Police Chief |
| Add Complainant | Cadet only |
| Verify Complainant | Cadet only |

## Review History Tracking

All review actions are recorded in the `CaseReview` model:

- Reviewer user
- Decision (approved/rejected)
- Rejection reason (if rejected)
- Timestamp

**Query Reviews**: The case serializer includes all reviews in chronological order.

## API Examples

### Create Complaint Case (Civilian)

```bash
POST /api/v1/cases/cases/
Content-Type: application/json

{
  "title": "Vandalism of Property",
  "description": "Someone spray-painted graffiti on my building wall",
  "crime_level": 3,
  "complainant_statement": "I discovered the graffiti this morning at 6 AM. It covers approximately 10 square feet of the south wall."
}
```

### Create Crime Scene Case (Officer)

```bash
POST /api/v1/cases/cases/
Content-Type: application/json

{
  "title": "Armed Robbery - Convenience Store",
  "description": "Robbery with weapon at 24/7 Mart",
  "crime_level": 1,
  "crime_scene_location": "456 Main St, Los Angeles",
  "crime_scene_datetime": "2026-01-15T03:15:00Z",
  "witnesses": [
    {
      "name": "Store Clerk",
      "phone_number": "+11234567890",
      "statement": "Two masked individuals entered at 3:15 AM with handguns"
    }
  ]
}
```

### Cadet Approves Case

```bash
POST /api/v1/cases/cases/1/cadet_review/
Content-Type: application/json

{
  "decision": "approved"
}
```

### Officer Rejects Case

```bash
POST /api/v1/cases/cases/1/officer_review/
Content-Type: application/json

{
  "decision": "rejected",
  "rejection_reason": "Insufficient evidence. Please obtain witness statements from neighbors."
}
```

## Validation Rules

### Complaint Cases

- ✅ Must include `complainant_statement`
- ✅ Cannot be created by police personnel
- ✅ `crime_scene_location` and `crime_scene_datetime` not allowed

### Crime Scene Cases

- ✅ Must include `crime_scene_location`
- ✅ Must include `crime_scene_datetime`
- ✅ Can only be created by police officers (not Cadets)
- ✅ `complainant_statement` not allowed
- ✅ Can include witness information

### Review Actions

- ✅ Rejection must include `rejection_reason`
- ✅ Approval does not need rejection reason
- ✅ Can only review cases in appropriate status

## Error Handling

### Common Error Responses

**Unauthorized Role**:
```json
{
  "error": "Only Cadets can review cases in cadet review status"
}
```

**Wrong Status**:
```json
{
  "error": "Case is not in cadet review status"
}
```

**Missing Required Field**:
```json
{
  "complainant_statement": ["This field is required."]
}
```

**Permission Denied**:
```json
{
  "detail": "You do not have permission to perform this action."
}
```

## Testing

The case formation system includes comprehensive test coverage:

- ✅ 29 tests across 8 test classes
- ✅ 100% pass rate
- ✅ Tests cover all workflows, permissions, validations, and edge cases

**Test Classes**:
1. TestComplaintCaseFormation (4 tests)
2. TestCadetReview (6 tests)
3. TestOfficerReview (4 tests)
4. TestCrimeSceneCaseFormation (6 tests)
5. TestAdditionalComplainants (3 tests)
6. TestComplainantVerification (2 tests)
7. TestCaseQueryFiltering (3 tests)
8. TestCaseReviewHistory (1 test)

Run tests:
```bash
pytest tests/test_case_formation.py -v
```

## Future Enhancements

- [ ] Email notifications on case status changes
- [ ] Automatic assignment of cases to available officers
- [ ] Evidence attachment during case creation
- [ ] Bulk case import for police
- [ ] Statistical dashboard for case formation metrics
