# Case Resolution System (حل پرونده)

## Overview

The Case Resolution system implements the detective investigation workflow where detectives organize evidence on investigation boards, connect related evidence, identify suspects, and submit them to sergeants for approval. The system includes a comprehensive notification system to keep all parties informed throughout the investigation process.

**Persian Name**: حل پرونده / تحقیقات کارآگاهی

---

## System Components

### 1. Detective Investigation Boards (تخته کارآگاه)

Detectives create investigation boards to visually organize evidence and build theories about cases.

**Key Features**:
- One board per case (OneToOne relationship)
- Place evidence at specific coordinates (X, Y positions)
- Connect related evidence with red lines
- Visual representation for frontend layout
- Detective-specific boards

**Models**:
- `DetectiveBoard` - Main board for each case
- `BoardItem` - Evidence placed on board with coordinates
- `EvidenceConnection` - Lines connecting related evidence

---

### 2. Suspect Submission Workflow (ارسال مظنونین)

The formal process where detectives propose main suspects to sergeants for approval.

**Workflow Steps**:
1. **Detective Investigation**: Detective identifies suspects through evidence analysis
2. **Submission Creation**: Detective submits suspects with reasoning to sergeant
3. **Case Status Update**: Case status changes to `SUSPECTS_IDENTIFIED`
4. **Sergeant Notification**: Sergeant receives notification about submission
5. **Sergeant Review**: Sergeant reviews evidence and reasoning
6. **Approval Decision**:
   - **If Approved**: 
     - Case status changes to `ARREST_APPROVED`
     - Arrest warrants issued for all suspects
     - Detective receives approval notification
     - Arrests can begin
   - **If Rejected**:
     - Case status returns to `UNDER_INVESTIGATION`
     - Detective receives rejection notification with sergeant's objections
     - Case remains open for further investigation

**Models**:
- `SuspectSubmission` - Detective's formal submission of suspects
- `Suspect` - Person identified as suspect in case

---

### 3. Notification System (اعلان‌های سیستم)

Comprehensive notification system to keep users informed about case updates.

**Notification Types**:
- **New Evidence** (`new_evidence`) - Evidence added during investigation
- **Suspect Submission** (`suspect_submission`) - Detective submitted suspects
- **Submission Approved** (`submission_approved`) - Sergeant approved arrests
- **Submission Rejected** (`submission_rejected`) - Sergeant rejected reasoning
- **Case Assigned** (`case_assigned`) - Case assigned to detective
- **Case Status Changed** (`case_status_changed`) - Case status updated
- **Tip-Off Submitted** (`tipoff_submitted`) - Public tip received
- **Reward Available** (`reward_available`) - Reward ready for collection
- **General** (`general`) - General notifications

**Features**:
- User-specific notifications
- Mark as read (single or bulk)
- Unread count endpoint
- Filter by type and read status
- Related to cases and objects

---

## API Endpoints

### Detective Boards

#### Create Detective Board
```http
POST /api/v1/investigation/detective-boards/
Content-Type: application/json

{
  "case": 1
}
```

**Response**:
```json
{
  "id": 1,
  "case": 1,
  "detective": 5,
  "items": [],
  "connections": [],
  "created_at": "2026-01-07T16:00:00Z",
  "updated_at": "2026-01-07T16:00:00Z"
}
```

**Permissions**: Detective role required

---

#### Place Evidence on Board
```http
POST /api/v1/investigation/board-items/
Content-Type: application/json

{
  "board": 1,
  "content_type": "testimony",
  "object_id": 5,
  "position_x": 150.5,
  "position_y": 200.3
}
```

**Parameters**:
- `content_type`: Evidence type (`testimony`, `biological`, `vehicle`, `id-document`, `generic`)
- `object_id`: ID of the evidence object
- `position_x`, `position_y`: Coordinates for UI positioning

---

#### Connect Evidence Items
```http
POST /api/v1/investigation/evidence-connections/
Content-Type: application/json

{
  "board": 1,
  "from_item": 3,
  "to_item": 7,
  "notes": "این شهادت با شواهد بیولوژیکی مطابقت دارد"
}
```

**Purpose**: Draw red lines between related evidence to show detective's reasoning

---

### Suspect Submission

#### Submit Suspects for Approval
```http
POST /api/v1/investigation/suspect-submissions/
Content-Type: application/json

{
  "case": 1,
  "suspects": [3, 7, 12],
  "reasoning": "بر اساس شواهد بیولوژیکی و شهادت شهود، این سه نفر در صحنه جرم حضور داشتند. شواهد خودرو و مدارک شناسایی نیز با این افراد مطابقت دارد."
}
```

**Response**:
```json
{
  "id": 10,
  "case": 1,
  "case_number": "CASE-2026-001",
  "detective": 5,
  "detective_name": "John Detective",
  "suspects": [3, 7, 12],
  "suspects_details": [
    {
      "id": 3,
      "person": 15,
      "status": "under_pursuit",
      "reason": "شواهد بیولوژیکی مطابقت دارد"
    }
  ],
  "reasoning": "بر اساس شواهد...",
  "status": "pending",
  "reviewed_by": null,
  "reviewed_by_name": null,
  "review_notes": "",
  "submitted_at": "2026-01-07T16:10:00Z",
  "reviewed_at": null
}
```

**Automatic Actions**:
- Case status changes to `SUSPECTS_IDENTIFIED`
- All sergeants receive notification

**Permissions**: Detective role required
**Validation**:
- Case must be `OPEN` or `UNDER_INVESTIGATION`
- At least one suspect required
- All suspects must belong to the case

---

#### Sergeant Reviews Submission

##### Approve Submission
```http
POST /api/v1/investigation/suspect-submissions/{id}/review/
Content-Type: application/json

{
  "decision": "approve",
  "review_notes": "شواهد کافی است. دستگیری مظنونین تایید شد."
}
```

**Response**:
```json
{
  "status": "approved",
  "message": "دستگیری مظنونین تایید شد.",
  "review_notes": "شواهد کافی است. دستگیری مظنونین تایید شد."
}
```

**Automatic Actions**:
- Submission status changes to `approved`
- Case status changes to `ARREST_APPROVED`
- Arrest warrants issued for all suspects
- Detective receives approval notification

---

##### Reject Submission
```http
POST /api/v1/investigation/suspect-submissions/{id}/review/
Content-Type: application/json

{
  "decision": "reject",
  "review_notes": "شواهد کافی نیست. نیاز به تحقیقات بیشتر دارد."
}
```

**Response**:
```json
{
  "status": "rejected",
  "message": "درخواست رد شد. پرونده همچنان باز است.",
  "review_notes": "شواهد کافی نیست. نیاز به تحقیقات بیشتر دارد."
}
```

**Automatic Actions**:
- Submission status changes to `rejected`
- Case status returns to `UNDER_INVESTIGATION`
- Detective receives rejection notification

**Permissions**: Sergeant role required
**Validation**:
- Review notes must be at least 10 characters
- Cannot review already-reviewed submissions

---

### Notifications

#### List User Notifications
```http
GET /api/v1/investigation/notifications/
```

**Response**:
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "recipient": 5,
      "recipient_name": "John Detective",
      "notification_type": "submission_approved",
      "notification_type_display": "Submission Approved",
      "title": "تایید دستگیری در پرونده CASE-2026-001",
      "message": "گروهبان تایید کرد. دستگیری مظنونین شروع شده است.",
      "related_case": 1,
      "case_number": "CASE-2026-001",
      "content_type": 15,
      "object_id": 10,
      "is_read": false,
      "read_at": null,
      "created_at": "2026-01-07T16:15:00Z"
    }
  ]
}
```

**Filters**:
- `notification_type`: Filter by type
- `is_read`: Filter by read status
- `related_case`: Filter by case

---

#### Mark Notifications as Read

##### Mark Specific Notifications
```http
POST /api/v1/investigation/notifications/mark_read/
Content-Type: application/json

{
  "notification_ids": [1, 2, 3]
}
```

##### Mark All Unread Notifications
```http
POST /api/v1/investigation/notifications/mark_read/
Content-Type: application/json

{}
```

**Response**:
```json
{
  "marked_read": 3,
  "message": "3 اعلان به عنوان خوانده شده علامت‌گذاری شد."
}
```

---

#### Get Unread Count
```http
GET /api/v1/investigation/notifications/unread_count/
```

**Response**:
```json
{
  "unread_count": 5
}
```

---

## Permissions & Access Control

### Role-Based Access

| Action | Detective | Sergeant | Police Officer | Admin |
|--------|-----------|----------|----------------|-------|
| Create detective board | ✅ (own) | ❌ | ❌ | ❌ |
| View detective boards | ✅ (own) | ✅ (all) | ❌ | ✅ (all) |
| Place evidence on board | ✅ | ❌ | ❌ | ❌ |
| Connect evidence | ✅ | ❌ | ❌ | ❌ |
| Submit suspects | ✅ | ❌ | ❌ | ❌ |
| Review submissions | ❌ | ✅ | ❌ | ❌ |
| View submissions | ✅ (own) | ✅ (all) | ❌ | ✅ (all) |
| View notifications | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) |

---

## Data Models

### DetectiveBoard
```python
{
    "id": Integer,
    "case": ForeignKey(Case),  # OneToOne
    "detective": ForeignKey(User),
    "created_at": DateTime,
    "updated_at": DateTime
}
```

### BoardItem
```python
{
    "id": Integer,
    "board": ForeignKey(DetectiveBoard),
    "content_type": String,  # Evidence type
    "object_id": Integer,    # Evidence ID
    "position_x": Float,     # X coordinate
    "position_y": Float,     # Y coordinate
    "added_at": DateTime
}
```

### EvidenceConnection
```python
{
    "id": Integer,
    "board": ForeignKey(DetectiveBoard),
    "from_item": ForeignKey(BoardItem),
    "to_item": ForeignKey(BoardItem),
    "notes": Text,
    "created_at": DateTime
}
```

### SuspectSubmission
```python
{
    "id": Integer,
    "case": ForeignKey(Case),
    "detective": ForeignKey(User),
    "suspects": ManyToMany(Suspect),
    "reasoning": Text,
    "status": Choice["pending", "approved", "rejected"],
    "reviewed_by": ForeignKey(User, null=True),
    "review_notes": Text,
    "submitted_at": DateTime,
    "reviewed_at": DateTime(null=True)
}
```

### Notification
```python
{
    "id": Integer,
    "recipient": ForeignKey(User),
    "notification_type": Choice[...],
    "title": String(200),
    "message": Text,
    "related_case": ForeignKey(Case, null=True),
    "content_type": ForeignKey(ContentType, null=True),
    "object_id": Integer(null=True),
    "is_read": Boolean(default=False),
    "read_at": DateTime(null=True),
    "created_at": DateTime
}
```

---

## Case Status Workflow

### Status Transitions

```
UNDER_INVESTIGATION
       ↓ (detective submits suspects)
SUSPECTS_IDENTIFIED
       ↓ (sergeant reviews)
       ├─→ ARREST_APPROVED (if approved)
       └─→ UNDER_INVESTIGATION (if rejected)
```

---

## Notification Workflow

### When Notifications are Created

1. **New Evidence Added**: When evidence is added to a case under investigation
   ```python
   Notification.create_new_evidence_notification(evidence, case, detective)
   ```

2. **Detective Submits Suspects**: When detective creates submission
   ```python
   Notification.create_submission_notification(submission, sergeant)
   ```

3. **Sergeant Approves**: When sergeant approves submission
   ```python
   Notification.create_approval_notification(submission)
   ```

4. **Sergeant Rejects**: When sergeant rejects submission
   ```python
   Notification.create_rejection_notification(submission)
   ```

---

## Error Responses

### Common Errors

#### 400 Bad Request - Invalid Submission
```json
{
  "suspects": ["حداقل یک مظنون باید شناسایی شود."]
}
```

#### 400 Bad Request - Already Reviewed
```json
{
  "error": "این درخواست قبلاً بررسی شده است."
}
```

#### 400 Bad Request - Short Review Notes
```json
{
  "review_notes": ["توضیحات بررسی باید حداقل 10 کاراکتر باشد."]
}
```

#### 403 Forbidden - Wrong Role
```json
{
  "error": "فقط گروهبان می‌تواند این درخواست را بررسی کند."
}
```

#### 404 Not Found
```json
{
  "detail": "Not found."
}
```

---

## Integration with Other Systems

### Evidence System
- Board items reference evidence objects
- Evidence types: Testimony, Biological, Vehicle, ID Document, Generic
- Frontend should display evidence details on board

### Case Management
- Investigation boards linked to cases
- Case status automatically updated during workflow
- Status transitions tracked

### User Management
- Role-based permissions enforced
- Detective and sergeant assignment
- User notifications personalized

---

## Best Practices

### For Detectives

1. **Build Case Theory First**: Place all relevant evidence on board before submitting suspects
2. **Connect Evidence**: Use connections to show reasoning between evidence items
3. **Document Reasoning**: Provide detailed reasoning when submitting suspects
4. **Monitor Notifications**: Check notifications for new evidence and sergeant decisions

### For Sergeants

1. **Review Thoroughly**: Check all evidence and connections before deciding
2. **Provide Clear Feedback**: Whether approving or rejecting, explain reasoning clearly
3. **Review Quickly**: Detectives are waiting for decision to proceed
4. **Cross-Reference Evidence**: Verify detective's connections make sense

### For System Administrators

1. **Monitor Pending Submissions**: Ensure sergeants are reviewing in timely manner
2. **Track Case Status**: Watch for cases stuck in particular statuses
3. **Review Notification Delivery**: Ensure users are receiving notifications
4. **Audit Approval Decisions**: Review sergeant decisions for quality control

---

## Frontend Implementation Guide

### Detective Board UI

**Recommended Features**:
- Drag-and-drop evidence items
- Visual connecting lines between items (red lines)
- Evidence preview on hover
- Connection notes display
- Save board state automatically
- Zoom and pan capabilities

**Example Board Layout**:
```
┌─────────────────────────────────────┐
│  Case: CASE-2026-001                │
│  Detective: John Detective           │
├─────────────────────────────────────┤
│                                     │
│    [Testimony]━━━━━┓                │
│         ↓           ┃                │
│    [Bio Evidence]   ┃                │
│                     ┃                │
│    [ID Doc]━━━━━━━━┛                │
│         ↓                           │
│    [Suspect Photo]                  │
│                                     │
└─────────────────────────────────────┘
```

### Notification UI

**Recommended Features**:
- Notification bell icon with unread count
- Notification dropdown panel
- Click to mark as read
- "Mark all as read" button
- Filter by notification type
- Link to related case/object

---

## Testing

### Test Coverage

**26 comprehensive tests** covering:
- ✅ Detective board creation (3 tests)
- ✅ Board item placement (2 tests)
- ✅ Evidence connections (1 test)
- ✅ Suspect submission (4 tests)
- ✅ Sergeant approval workflow (6 tests)
- ✅ Sergeant rejection workflow (3 tests)
- ✅ Notification system (5 tests)
- ✅ Permission controls (3 tests)

**All tests passing**: 87/87 tests (29 case formation + 32 evidence + 26 case resolution)

### Running Tests
```bash
pytest tests/test_case_resolution.py -v
```

---

## Swagger Documentation

All endpoints are fully documented in Swagger UI with:
- Persian descriptions (فارسی)
- Example requests and responses
- Parameter descriptions
- Response schemas

**Access Swagger**: `http://localhost:8000/api/docs/`

---

## Summary

The Case Resolution system provides a complete detective investigation workflow:

1. **Organization**: Detective boards for visual evidence organization
2. **Analysis**: Evidence connections showing reasoning
3. **Submission**: Formal suspect submission to sergeants
4. **Review**: Sergeant approval/rejection with feedback
5. **Notifications**: Real-time updates for all participants
6. **Status Tracking**: Automatic case status transitions

The system ensures proper oversight, clear communication, and documented reasoning throughout the investigation process.
