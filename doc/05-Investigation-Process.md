# Investigation Process

The investigation process in LA Noire NextGen involves detectives analyzing evidence, identifying suspects, conducting interrogations, and coordinating with public tip-offs.

## Detective Board System

### Overview

After a case is formed and approved, a detective can create a **Detective Board** (تخته کارآگاه) to visually organize evidence and build connections.

### Board Structure

```
Detective Board
├── Evidence Items (positioned at x, y coordinates)
├── Red Line Connections (linking related evidence)
└── Notes and Reasoning
```

### Creating a Detective Board

**API Endpoint**: `POST /api/v1/investigation/detective-boards/`

```json
{
  "case": 1,
  "detective": 4
}
```

**Response**:
```json
{
  "id": 1,
  "case": {
    "id": 1,
    "case_number": "CASE-A1B2C3D4E5F6",
    "title": "Downtown Burglary"
  },
  "detective": {
    "id": 4,
    "username": "detective1",
    "full_name": "Cole Phelps"
  },
  "created_at": "2026-01-05T10:00:00Z"
}
```

### Adding Evidence to Board

Evidence items are placed at specific coordinates (x, y) for visual organization.

**API Endpoint**: `POST /api/v1/investigation/board-items/`

```json
{
  "board": 1,
  "content_type": "testimony",
  "object_id": 3,
  "position_x": 150.5,
  "position_y": 200.0
}
```

**Supported Evidence Types**:
- `testimony` - Witness statements
- `biological` - Forensic evidence
- `vehicle` - Vehicle evidence
- `id_document` - ID documents
- `generic` - Other evidence

### Connecting Evidence

Detectives draw red lines between related evidence items to show connections.

**API Endpoint**: `POST /api/v1/investigation/evidence-connections/`

```json
{
  "board": 1,
  "from_item": 1,
  "to_item": 2,
  "notes": "Fingerprints on weapon match suspect's ID document"
}
```

**Response**:
```json
{
  "id": 1,
  "board": 1,
  "from_item": 1,
  "to_item": 2,
  "notes": "Fingerprints on weapon match suspect's ID document",
  "created_at": "2026-01-05T11:00:00Z"
}
```

## Suspect Identification

### Process Flow

1. **Detective identifies suspect** based on evidence analysis
2. **Sergeant reviews and approves** the identification
3. **Arrest warrant issued** if approved
4. **Suspect status changes** based on progress

### Suspect Statuses

| Status | Persian | Description |
|--------|---------|-------------|
| `under_pursuit` | تحت تعقیب | Being tracked (< 1 month) |
| `intensive_pursuit` | پیگیری شدید | Tracked > 1 month (public wanted list) |
| `arrested` | دستگیر شده | Captured |
| `cleared` | پاک شده | Proven innocent |

### Identifying a Suspect

**API Endpoint**: `POST /api/v1/investigation/suspects/`

```json
{
  "case": 1,
  "person": 15,
  "reason": "Fingerprints found at crime scene match this individual. Witness testimony places him near the scene at time of crime.",
  "identified_by_detective": 4
}
```

**Response**:
```json
{
  "id": 1,
  "case": 1,
  "person": {
    "id": 15,
    "username": "suspect1",
    "full_name": "John Smith",
    "national_id": "1234567890"
  },
  "status": "under_pursuit",
  "reason": "Fingerprints found at crime scene...",
  "identified_by_detective": 4,
  "approved_by_sergeant": null,
  "arrest_warrant_issued": false,
  "identified_at": "2026-01-05T12:00:00Z"
}
```

### Sergeant Approval

After detective identifies a suspect, sergeant must approve before arrest warrant is issued.

**API Endpoint**: `PATCH /api/v1/investigation/suspects/1/`

```json
{
  "approved_by_sergeant": 5,
  "sergeant_approval_message": "Evidence is solid. Approved for arrest warrant.",
  "arrest_warrant_issued": true,
  "status": "under_pursuit"
}
```

### Sergeant Rejection

If sergeant rejects, case remains open for further investigation.

```json
{
  "approved_by_sergeant": 5,
  "sergeant_approval_message": "Insufficient evidence. Need more concrete proof before issuing warrant.",
  "arrest_warrant_issued": false
}
```

## Wanted List (Intensive Pursuit)

### Automatic Escalation

Suspects under pursuit for **more than 30 days** automatically move to "intensive pursuit" status and appear on the public wanted list.

### Danger Score Formula

```
danger_score = max(days_pursued) × max(crime_level_score)
```

Where crime_level_score is:
- Level 3 (Minor) = 1
- Level 2 (Medium) = 2
- Level 1 (Major) = 3
- Level 0 (Critical) = 4

**Example**: Suspect pursued for 45 days for Level 1 crime
```
danger_score = 45 × 3 = 135
```

### Reward Amount Formula

```
reward_amount = danger_score × 20,000,000 Rials
```

Using the example above:
```
reward_amount = 135 × 20,000,000 = 2,700,000,000 Rials
```

### Wanted List API

**Endpoint**: `GET /api/v1/investigation/suspects/?status=intensive_pursuit`

```json
[
  {
    "id": 1,
    "person": {
      "full_name": "John Smith",
      "photo": "/media/suspects/photos/john_smith.jpg"
    },
    "case": {
      "case_number": "CASE-ABC123",
      "title": "Armed Robbery",
      "crime_level": {
        "level": 1,
        "name": "Level 1 - Major Crimes"
      }
    },
    "status": "intensive_pursuit",
    "identified_at": "2025-11-20T10:00:00Z",
    "days_pursued": 46,
    "danger_score": 138,
    "reward_amount": "2760000000"
  }
]
```

### Display on Public Page

All users can see wanted list, sorted by danger score (highest first).

**UI Elements**:
- Suspect photo (mugshot)
- Full name
- Case number and crime type
- Days at large
- Danger score
- Reward amount in Rials

## Interrogation System

### Dual Rating System

Both detective and sergeant conduct interrogations and provide independent guilt ratings.

### Rating Scale

**1 to 10** (1 = likely innocent, 10 = highly guilty)

### Conducting Interrogation

**API Endpoint**: `POST /api/v1/investigation/interrogations/`

```json
{
  "suspect": 1,
  "detective": 4,
  "sergeant": 5,
  "detective_guilt_rating": 8,
  "sergeant_guilt_rating": 9,
  "detective_notes": "Suspect's story has multiple inconsistencies. Changed timeline three times during questioning.",
  "sergeant_notes": "Body language suggests deception. Avoided eye contact when asked about alibi."
}
```

**Response**:
```json
{
  "id": 1,
  "suspect": {
    "id": 1,
    "person": {
      "full_name": "John Smith"
    },
    "case": {
      "case_number": "CASE-ABC123"
    }
  },
  "detective": {
    "id": 4,
    "full_name": "Cole Phelps"
  },
  "sergeant": {
    "id": 5,
    "full_name": "Hank Merrill"
  },
  "detective_guilt_rating": 8,
  "sergeant_guilt_rating": 9,
  "detective_notes": "Suspect's story has multiple inconsistencies...",
  "sergeant_notes": "Body language suggests deception...",
  "interrogated_at": "2026-01-05T14:00:00Z"
}
```

### Interrogation Results

Results go to Captain (or Chief for critical crimes) who makes final decision on proceeding to trial.

**Key Points**:
- Multiple interrogations can occur for same suspect
- Ratings help captain assess strength of case
- Notes provide detailed reasoning
- Both detective and sergeant must participate

## Public Tip-Off System

### Overview

Regular users can submit tips about cases or suspects. Tips go through two-stage approval: police officer → detective.

### Tip-Off Statuses

| Status | Description |
|--------|-------------|
| `pending` | Submitted, awaiting officer review |
| `officer_rejected` | Officer deemed invalid |
| `officer_approved` | Officer approved, awaiting detective |
| `detective_rejected` | Detective deemed not useful |
| `approved` | Detective approved, reward issued |
| `redeemed` | Reward has been collected |

### Submitting a Tip

**API Endpoint**: `POST /api/v1/investigation/tipoffs/`

```json
{
  "case": 1,
  "suspect": 1,
  "information": "I saw the suspect at 5th Street Diner on the night of the crime around 9 PM. He was arguing with someone on the phone."
}
```

**Response**:
```json
{
  "id": 1,
  "case": 1,
  "suspect": 1,
  "submitted_by": {
    "id": 20,
    "username": "citizen1",
    "full_name": "Alice Williams"
  },
  "information": "I saw the suspect at 5th Street Diner...",
  "status": "pending",
  "submitted_at": "2026-01-05T16:00:00Z"
}
```

### Officer Review

Police officer performs initial validation.

**Approve**: `PATCH /api/v1/investigation/tipoffs/1/`
```json
{
  "status": "officer_approved",
  "reviewed_by_officer": 3
}
```

**Reject**: `PATCH /api/v1/investigation/tipoffs/1/`
```json
{
  "status": "officer_rejected",
  "reviewed_by_officer": 3
}
```

### Detective Review

If officer approved, detective reviews for usefulness.

**Approve with Reward**: `PATCH /api/v1/investigation/tipoffs/1/`
```json
{
  "status": "approved",
  "reviewed_by_detective": 4,
  "reward_amount": 5000000
}
```

**System automatically**:
- Generates unique redemption code
- Notifies user via system
- Sets approved_at timestamp

**Response**:
```json
{
  "id": 1,
  "status": "approved",
  "redemption_code": "REWARD-A1B2C3D4E5",
  "reward_amount": "5000000",
  "approved_at": "2026-01-05T17:00:00Z",
  "message": "Your tip has been approved! Visit police station with code REWARD-A1B2C3D4E5 to claim 5,000,000 Rials."
}
```

### Redeeming Reward

**At Police Station**: All police ranks can verify and mark redemption.

**API Endpoint**: `POST /api/v1/investigation/tipoffs/redeem/`
```json
{
  "redemption_code": "REWARD-A1B2C3D4E5",
  "national_id": "1234567890"
}
```

**Verification Response**:
```json
{
  "valid": true,
  "tipoff_id": 1,
  "submitter": {
    "full_name": "Alice Williams",
    "national_id": "1234567890"
  },
  "reward_amount": "5000000",
  "case": "CASE-ABC123",
  "approved_at": "2026-01-05T17:00:00Z"
}
```

**Mark as Redeemed**: `PATCH /api/v1/investigation/tipoffs/1/`
```json
{
  "status": "redeemed",
  "redeemed_at": "2026-01-05T18:00:00Z"
}
```

## New Evidence Notifications

When new evidence is added to a case under investigation, detective receives notification.

**Notification Content**:
- Evidence type
- Who added it
- When added
- Link to evidence details

This allows detective to:
- Update detective board
- Create new connections
- Re-evaluate suspect list
- Plan additional interrogations

## Investigation Workflow Summary

```
1. Case Approved
   ↓
2. Detective Creates Board
   ↓
3. Add Evidence Items (positioned)
   ↓
4. Connect Related Evidence (red lines)
   ↓
5. Identify Suspect(s)
   ↓
6. Sergeant Approves → Arrest Warrant
   ↓
7. Suspect Arrested
   ↓
8. Interrogation (Detective + Sergeant ratings)
   ↓
9. Results to Captain/Chief
   ↓
10. Proceed to Trial
```

## Tips for Effective Investigation

### For Detectives

1. **Organize evidence systematically** - Use board positioning to group related items
2. **Document connections clearly** - Add detailed notes to evidence connections
3. **Build strong case** - Collect multiple evidence types before identifying suspects
4. **Thorough interrogation** - Document inconsistencies and body language

### For Sergeants

1. **Verify detective's reasoning** - Check evidence supports suspect identification
2. **Review criminal history** - Cross-reference with past cases
3. **Independent assessment** - Provide separate guilt rating during interrogation
4. **Clear communication** - Detailed approval/rejection messages

### For Public Users

1. **Specific information** - Provide dates, times, locations
2. **Relevant details** - Focus on suspect behavior, vehicles, conversations
3. **Honest reporting** - False tips waste police resources
4. **Save redemption code** - Required to collect reward

## See Also

- [[03-Case-Workflows|Case Workflows]] - How cases are formed and approved
- [[04-Evidence-Management|Evidence Management]] - Types of evidence and handling
- [[06-Trial-System|Trial System]] - Court proceedings after investigation
- [[02-User-Roles|User Roles]] - Detective, Sergeant, and other role permissions
