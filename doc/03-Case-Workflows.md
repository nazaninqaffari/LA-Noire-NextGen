# Case Workflows

## Case Formation

There are two ways to create a case in the system:

### 1. Complaint-Based Formation

**Workflow**: Citizen → Cadet → Police Officer → Open Case

#### Step 1: Citizen Files Complaint
1. Complainant logs into system
2. Navigates to "File Complaint" section
3. Fills out case information:
   - Title
   - Description
   - Crime level
   - Complainant statement
4. Submits complaint

**Case Status**: `draft`

#### Step 2: Cadet Review
1. Cadet receives complaint notification
2. Reviews complaint information
3. Verifies complainant details
4. Makes decision:
   - **Approve**: Sends to police officer for final review
   - **Reject**: Returns to complainant with feedback message

**Rules**:
- If rejected, complainant can resubmit with corrections
- Maximum 3 rejections allowed
- After 3 rejections, case is permanently rejected (`rejected` status)

**Case Status After Approval**: `officer_review`

#### Step 3: Police Officer Review
1. Police officer receives complaint from cadet
2. Reviews all information
3. Makes final decision:
   - **Approve**: Case is officially opened
   - **Reject**: Sends back to cadet for re-review (not directly to complainant)

**Case Status After Approval**: `open`, `opened_at` timestamp recorded

#### Multiple Complainants
- A case can have multiple complainants
- Only the primary complainant initiates the case
- Additional complainants can be added later
- Each complainant's information must be verified by cadet

### 2. Crime Scene-Based Formation

**Workflow**: Officer/Detective/Sergeant Reports → Supervisor Approves → Open Case

#### Step 1: Officer Reports Crime Scene
1. Police officer (or higher rank) encounters crime scene
2. Creates crime scene report with:
   - Title
   - Description
   - Crime level
   - Location
   - Date/time of discovery
   - Witness information (phone numbers, national IDs)
3. Submits report

**Case Status**: `officer_review` (awaiting supervisor approval)

#### Step 2: Supervisor Approval
1. Officer's immediate supervisor reviews report
2. Makes decision:
   - **Approve**: Case is officially opened
   - **Reject**: Returns to reporting officer with feedback

**Special Cases**:
- If Chief reports crime scene, no approval needed (auto-approved)
- If Captain reports, only Chief approval needed

**Case Status After Approval**: `open`, `opened_at` timestamp recorded

**Initial State**:
- No complainants initially
- Complainants can be added later if victims come forward

## Case Status Flow

```
Complaint Path:
draft → cadet_review → officer_review → open → under_investigation → 
suspects_identified → arrest_approved → interrogation → 
trial_pending → closed

Crime Scene Path:
officer_review → open → under_investigation → suspects_identified → 
arrest_approved → interrogation → trial_pending → closed

Rejection Path:
Any status → rejected (if validation fails 3 times)
```

### Status Descriptions

| Status | Description |
|--------|-------------|
| `draft` | Initial complaint submission |
| `cadet_review` | Under cadet review |
| `officer_review` | Awaiting police officer approval |
| `rejected` | Permanently rejected (3 failed attempts) |
| `open` | Approved and ready for assignment |
| `under_investigation` | Detective assigned and investigating |
| `suspects_identified` | Detective identified suspects |
| `arrest_approved` | Sergeant approved suspect arrest |
| `interrogation` | Suspects being interrogated |
| `trial_pending` | Submitted to court, awaiting trial |
| `closed` | Verdict delivered, case closed |

## Case Assignment

### Detective Assignment
- Open cases can be assigned to detectives
- Detective creates investigation board
- Detective works to identify suspects

### Sergeant Assignment
- Sergeant oversees detective's work
- Approves suspect identifications
- Participates in interrogations

## Case Review History

Every review action is recorded:
- Reviewer identity
- Decision (approved/rejected)
- Rejection reason (if rejected)
- Timestamp

This creates an audit trail for accountability.

## Crime Levels and Approval Requirements

| Level | Name | Cadet Review | Officer Review | Trial Submission |
|-------|------|--------------|----------------|------------------|
| 3 | Minor | ✅ Yes | ✅ Yes | Captain |
| 2 | Medium | ✅ Yes | ✅ Yes | Captain |
| 1 | Major | ✅ Yes | ✅ Yes | Captain |
| 0 | Critical | ✅ Yes | ✅ Yes | Chief required |

## API Examples

### Create Complaint-Based Case
```http
POST /api/v1/cases/cases/
Content-Type: application/json
Authorization: Session [token]

{
  "title": "Burglary at 5th Street",
  "description": "My store was broken into last night",
  "crime_level": 2,
  "formation_type": "complaint",
  "complainant_statement": "I arrived at my store this morning and found the window smashed and cash register empty."
}
```

### Create Crime Scene Case
```http
POST /api/v1/cases/cases/
Content-Type: application/json
Authorization: Session [token]

{
  "title": "Homicide at Downtown Alley",
  "description": "Body discovered in alley behind Main Street",
  "crime_level": 1,
  "crime_scene_location": "Alley behind 123 Main St",
  "crime_scene_datetime": "2026-01-05T14:30:00Z",
  "witness_data": [
    {
      "full_name": "John Smith",
      "phone_number": "+11234567890",
      "national_id": "1234567890"
    }
  ]
}
```

### Cadet Review
```http
POST /api/v1/cases/cases/{case_id}/cadet_review/
Content-Type: application/json

{
  "decision": "approved"  // or "rejected"
  "rejection_reason": ""  // required if rejected
}
```

### Officer Review
```http
POST /api/v1/cases/cases/{case_id}/officer_review/
Content-Type: application/json

{
  "decision": "approved",
  "rejection_reason": ""
}
```

## See Also

- [[01-Overview|System Overview]]
- [[02-User-Roles|User Roles]]
- [[04-Evidence-Management|Evidence Management]]
- [[05-Investigation-Process|Investigation Process]]
