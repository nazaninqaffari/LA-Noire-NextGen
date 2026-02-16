# Reward System (پاداش ۸.۴)

## Overview

The Reward System enables regular citizens to submit anonymous tips about criminal cases and receive financial rewards if their information proves useful. The system implements a three-stage review workflow with police officer verification, detective confirmation, and secure reward redemption.

**Persian**: سیستم پاداش برای اطلاعات شهروندان درباره پرونده‌های جنایی

## Key Features

- **Anonymous Tip Submission**: Citizens can submit information about any active case
- **Three-Stage Review**: Officer initial review → Detective confirmation → Reward issuance
- **Unique Redemption Codes**: Each approved tip receives a unique REWARD-XXXXXXXXXX code
- **One-Time Redemption**: Rewards can only be claimed once at police stations
- **National ID Verification**: Secure verification using national ID + redemption code
- **Default Reward Amount**: 5,000,000 Rials per approved tip
- **Complete Audit Trail**: All review decisions and redemptions are tracked

## Workflow

```
┌─────────────┐
│   Citizen   │
│  Submits    │
│    Tip      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Officer   │ ◄─── Initial Review
│   Reviews   │      - Checks validity
└──────┬──────┘      - Rejects if clearly invalid
       │             - Approves if potentially useful
       │
       ├─── Rejected ──► STATUS_OFFICER_REJECTED
       │
       ▼ Approved
┌─────────────┐
│  Detective  │ ◄─── Confirmation Review
│  Confirms   │      - Evaluates usefulness
└──────┬──────┘      - Only assigned detective
       │
       ├─── Not Useful ──► STATUS_DETECTIVE_REJECTED
       │
       ▼ Approved
┌─────────────┐
│   Reward    │ ◄─── Issues unique code
│    Code     │      - REWARD-XXXXXXXXXX
│   Issued    │      - Default: 5M Rials
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Citizen   │ ◄─── Redeems at station
│  Redeems    │      - Shows national ID
│   Reward    │      - Provides code
└─────────────┘      - Officer verifies & pays
```

## Database Schema

### TipOff Model

```python
class TipOff(models.Model):
    # Core fields
    case = ForeignKey(Case)                    # Related case
    suspect = ForeignKey(Suspect, optional)    # Optional suspect reference
    submitted_by = ForeignKey(User)            # Citizen who submitted
    information = TextField()                   # Tip content
    status = CharField(choices=STATUS_CHOICES) # Current status
    
    # Review chain
    reviewed_by_officer = ForeignKey(User, optional)
    officer_rejection_reason = TextField(optional)
    officer_reviewed_at = DateTimeField(optional)
    
    reviewed_by_detective = ForeignKey(User, optional)
    detective_rejection_reason = TextField(optional)
    detective_reviewed_at = DateTimeField(optional)
    
    # Reward information
    redemption_code = CharField(unique=True, optional)  # REWARD-XXXXXXXXXX
    reward_amount = DecimalField(default=5000000)        # 5M Rials
    redeemed_by_officer = ForeignKey(User, optional)
    
    # Timestamps
    submitted_at = DateTimeField(auto_now_add=True)
    approved_at = DateTimeField(optional)
    redeemed_at = DateTimeField(optional)
```

### Status Progression

1. **pending** → Initial submission, awaiting officer review
2. **officer_rejected** → Officer deemed information invalid (terminal)
3. **officer_approved** → Officer approved, awaiting detective review
4. **detective_rejected** → Detective deemed not useful (terminal)
5. **approved** → Detective approved, reward code issued
6. **redeemed** → Reward has been collected (terminal)

## API Endpoints

### 1. Submit Tip

**Endpoint**: `POST /api/v1/investigation/tipoffs/`

**Permission**: Authenticated users

**Request Body**:
```json
{
  "case": 1,
  "information": "من اطلاعات مهمی درباره این پرونده دارم",
  "suspect": 2  // Optional
}
```

**Response** (201 Created):
```json
{
  "id": 15,
  "case": 1,
  "case_number": "CASE-2024-001",
  "case_title": "پرونده سرقت مسلحانه",
  "suspect": 2,
  "suspect_name": "احمد رضایی",
  "submitted_by": 10,
  "submitted_by_name": "علی محمدی",
  "submitted_by_national_id": "1234567890",
  "information": "من اطلاعات مهمی درباره این پرونده دارم",
  "status": "pending",
  "reward_amount": "5000000",
  "submitted_at": "2026-01-07T10:30:00Z"
}
```

**Notes**:
- `submitted_by` is automatically set to the authenticated user
- Initial status is always `pending`
- Citizens can submit tips for any active case

---

### 2. Officer Review

**Endpoint**: `POST /api/v1/investigation/tipoffs/{id}/officer_review/`

**Permission**: Police Officers only (not detectives or higher ranks)

**Request Body**:
```json
{
  "approved": true
}
```

Or to reject:
```json
{
  "approved": false,
  "rejection_reason": "اطلاعات کاملا نامعتبر و بدون منبع قابل اعتماد"
}
```

**Response** (200 OK):
```json
{
  "message": "Tip approved and forwarded to detective",
  "tip": {
    "id": 15,
    "status": "officer_approved",
    "reviewed_by_officer": 3,
    "reviewed_by_officer_name": "حسین افسر",
    "officer_reviewed_at": "2026-01-07T11:00:00Z"
  }
}
```

**Validation**:
- Only officers with 'Police Officer' role can review
- Detectives cannot perform officer review
- Can only review tips with `status=pending`
- Rejection requires a reason

**Queryset Filtering**:
- Officers see only `pending` tips in list view
- Detail view allows access to any pending tip for review

---

### 3. Detective Confirmation

**Endpoint**: `POST /api/v1/investigation/tipoffs/{id}/detective_review/`

**Permission**: Detective assigned to the case

**Request Body**:
```json
{
  "approved": true
}
```

Or to reject:
```json
{
  "approved": false,
  "rejection_reason": "اطلاعات تکراری و قبلا بررسی شده"
}
```

**Response** (200 OK - Approved):
```json
{
  "message": "Tip approved. Reward code issued: REWARD-A1B2C3D4E5",
  "tip": {
    "id": 15,
    "status": "approved",
    "reviewed_by_detective": 5,
    "reviewed_by_detective_name": "رضا کارآگاه",
    "detective_reviewed_at": "2026-01-07T12:00:00Z",
    "redemption_code": "REWARD-A1B2C3D4E5",
    "reward_amount": "5000000",
    "approved_at": "2026-01-07T12:00:00Z"
  }
}
```

**Validation**:
- Only detectives with 'Detective' role can review
- Only the detective assigned to the case can review
- Can only review tips with `status=officer_approved`
- Rejection requires a reason
- Approval automatically generates unique redemption code

**Queryset Filtering**:
- Detectives see only `officer_approved` tips in list view
- Also see tips they've reviewed regardless of status

---

### 4. Verify Reward

**Endpoint**: `POST /api/v1/investigation/tipoffs/verify_reward/`

**Permission**: Any police rank (Officer, Detective, Sergeant, Lieutenant, Captain, Chief)

**Request Body**:
```json
{
  "national_id": "1234567890",
  "redemption_code": "REWARD-A1B2C3D4E5"
}
```

**Response** (200 OK - Valid):
```json
{
  "valid": true,
  "tip_id": 15,
  "user_name": "علی محمدی",
  "user_national_id": "1234567890",
  "case_number": "CASE-2024-001",
  "reward_amount": 5000000,
  "status": "approved",
  "approved_at": "2026-01-07T12:00:00Z"
}
```

**Response** (200 OK - Invalid):
```json
{
  "valid": false,
  "error": "Invalid redemption code or national ID does not match"
}
```

**Response** (200 OK - Already Redeemed):
```json
{
  "valid": false,
  "error": "Reward already redeemed",
  "redeemed_at": "2026-01-06T14:30:00Z"
}
```

**Validation**:
- Checks if redemption code exists
- Verifies national ID matches the tip submitter
- Ensures reward hasn't been redeemed already
- Ensures tip status is `approved`

**Use Case**: Officers verify the reward before processing payment

---

### 5. Redeem Reward

**Endpoint**: `POST /api/v1/investigation/tipoffs/redeem_reward/`

**Permission**: Any police rank

**Request Body**:
```json
{
  "national_id": "1234567890",
  "redemption_code": "REWARD-A1B2C3D4E5"
}
```

**Response** (200 OK):
```json
{
  "message": "Reward of 5000000 Rials successfully redeemed",
  "tip": {
    "id": 15,
    "status": "redeemed",
    "redeemed_by_officer": 8,
    "redeemed_by_officer_name": "احمد گروهبان",
    "redeemed_at": "2026-01-07T15:00:00Z",
    "reward_amount": "5000000"
  }
}
```

**Error Response** (400 Bad Request - Already Redeemed):
```json
{
  "error": "Reward already redeemed"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Invalid redemption code or national ID does not match"
}
```

**Validation**:
- Checks if already redeemed (highest priority check)
- Verifies redemption code and national ID match
- Ensures tip status is `approved`
- One-time operation - cannot be undone

**State Changes**:
- Status: `approved` → `redeemed`
- Sets `redeemed_by_officer` to processing officer
- Records `redeemed_at` timestamp

---

### 6. List Tips

**Endpoint**: `GET /api/v1/investigation/tipoffs/`

**Permission**: Authenticated users

**Queryset Filtering by Role**:

| Role | Visible Tips |
|------|--------------|
| Citizen | Only their own submitted tips |
| Police Officer | Only `pending` tips (for review queue) |
| Detective | `officer_approved` tips + tips they reviewed |
| Sergeant/Lieutenant/Captain/Chief | All tips (for verification) |

**Response** (200 OK):
```json
{
  "count": 10,
  "next": "http://api/tipoffs/?page=2",
  "previous": null,
  "results": [
    {
      "id": 15,
      "case_number": "CASE-2024-001",
      "status": "pending",
      "submitted_by_name": "علی محمدی",
      "information": "...",
      "submitted_at": "2026-01-07T10:30:00Z"
    }
  ]
}
```

**Query Parameters**:
- `case`: Filter by case ID
- `status`: Filter by status
- `search`: Search in redemption code or information text

---

## Permission Matrix

| Action | Citizen | Police Officer | Detective | Sergeant+ |
|--------|---------|----------------|-----------|-----------|
| Submit Tip | ✅ | ✅ | ✅ | ✅ |
| View Own Tips | ✅ | ✅ | ✅ | ✅ |
| Officer Review | ❌ | ✅ | ❌ | ❌ |
| Detective Review | ❌ | ❌ | ✅ (if assigned) | ❌ |
| Verify Reward | ❌ | ✅ | ✅ | ✅ |
| Redeem Reward | ❌ | ✅ | ✅ | ✅ |
| View All Tips | ❌ | ❌ (only pending) | ❌ (only officer-approved) | ✅ |

## Model Methods

### `generate_redemption_code()`
Generates a unique reward redemption code in format `REWARD-XXXXXXXXXX` where X is a random hex character.

**Usage**:
```python
tip.generate_redemption_code()  # Returns: "REWARD-A1B2C3D4E5"
tip.save()
```

### `approve_by_officer(officer)`
Officer approves tip and forwards to detective for confirmation.

**State Changes**:
- Status: `pending` → `officer_approved`
- Sets `reviewed_by_officer`
- Records `officer_reviewed_at`

**Usage**:
```python
tip.approve_by_officer(request.user)
```

### `reject_by_officer(officer, reason)`
Officer rejects tip as invalid.

**State Changes**:
- Status: `pending` → `officer_rejected`
- Sets `reviewed_by_officer`
- Records `officer_rejection_reason`
- Records `officer_reviewed_at`

**Usage**:
```python
tip.reject_by_officer(request.user, "اطلاعات نامعتبر است")
```

### `approve_by_detective(detective)`
Detective confirms tip is useful and issues reward code.

**State Changes**:
- Status: `officer_approved` → `approved`
- Sets `reviewed_by_detective`
- Records `detective_reviewed_at`
- Generates unique `redemption_code`
- Records `approved_at`

**Usage**:
```python
tip.approve_by_detective(request.user)
```

### `reject_by_detective(detective, reason)`
Detective rejects tip as not useful.

**State Changes**:
- Status: `officer_approved` → `detective_rejected`
- Sets `reviewed_by_detective`
- Records `detective_rejection_reason`
- Records `detective_reviewed_at`

**Usage**:
```python
tip.reject_by_detective(request.user, "اطلاعات تکراری است")
```

### `redeem_reward(officer)`
Process one-time reward redemption at police station.

**Validation**:
- Raises `ValueError` if already redeemed
- Raises `ValueError` if not approved

**State Changes**:
- Status: `approved` → `redeemed`
- Sets `redeemed_by_officer`
- Records `redeemed_at`

**Usage**:
```python
try:
    tip.redeem_reward(request.user)
except ValueError as e:
    return Response({'error': str(e)}, status=400)
```

## Security Features

### Authentication
- Cookie-based authentication for all endpoints
- Users must be logged in to submit tips or view rewards

### Authorization
- Role-based access control enforced at multiple levels:
  - ViewSet `get_queryset()` filters by role
  - Action methods check specific role requirements
  - Model methods validate state transitions

### Data Privacy
- Citizens can only see their own tips
- Officers and detectives see filtered views based on workflow stage
- National ID verification required for reward redemption
- Audit trail of all review decisions

### Anti-Fraud Measures
- Unique redemption codes prevent duplication
- One-time redemption only
- National ID must match original submitter
- Tip must be in `approved` status to redeem
- All redemptions are logged with officer ID

## Use Cases

### Use Case 1: Successful Tip Submission and Reward

1. **Citizen submits tip**:
   ```
   POST /tipoffs/
   {"case": 1, "information": "دیدم که مظنون در محل X بود"}
   ```

2. **Officer reviews and approves**:
   ```
   POST /tipoffs/15/officer_review/
   {"approved": true}
   ```

3. **Detective confirms and issues reward**:
   ```
   POST /tipoffs/15/detective_review/
   {"approved": true}
   ```
   → Receives code: `REWARD-A1B2C3D4E5`

4. **Citizen goes to police station with national ID**

5. **Officer verifies reward**:
   ```
   POST /tipoffs/verify_reward/
   {"national_id": "1234567890", "redemption_code": "REWARD-A1B2C3D4E5"}
   ```
   → Shows valid, 5M Rials

6. **Officer processes payment and redeems**:
   ```
   POST /tipoffs/redeem_reward/
   {"national_id": "1234567890", "redemption_code": "REWARD-A1B2C3D4E5"}
   ```
   → Payment processed, tip marked as redeemed

### Use Case 2: Officer Rejects Invalid Tip

1. **Citizen submits tip** → Status: `pending`

2. **Officer reviews and rejects**:
   ```
   POST /tipoffs/20/officer_review/
   {"approved": false, "rejection_reason": "بدون منبع معتبر"}
   ```
   → Status: `officer_rejected` (terminal state)

3. **Workflow ends** - No reward issued

### Use Case 3: Detective Rejects Not Useful Tip

1. **Citizen submits tip** → Status: `pending`

2. **Officer approves** → Status: `officer_approved`

3. **Detective reviews and rejects**:
   ```
   POST /tipoffs/25/detective_review/
   {"approved": false, "rejection_reason": "اطلاعات تکراری"}
   ```
   → Status: `detective_rejected` (terminal state)

4. **Workflow ends** - No reward issued

### Use Case 4: Prevent Double Redemption

1. **Tip is approved and redeemed** → Status: `redeemed`

2. **Someone tries to redeem again**:
   ```
   POST /tipoffs/redeem_reward/
   {"national_id": "1234567890", "redemption_code": "REWARD-A1B2C3D4E5"}
   ```
   → Error: "Reward already redeemed"

## Testing

### Test Coverage

The reward system has **30 comprehensive tests** covering:

- **Tip Submission** (4 tests)
  - Citizens can submit tips
  - Tips can reference specific suspects
  - Citizens see only their own tips
  - Privacy enforcement

- **Officer Review** (7 tests)
  - Approval workflow
  - Rejection with reason
  - Rejection validation
  - Permission checks
  - Status validation
  - Queue filtering

- **Detective Confirmation** (7 tests)
  - Approval with code generation
  - Rejection workflow
  - Assigned detective enforcement
  - Permission checks
  - Status validation
  - Queue filtering

- **Reward Verification** (5 tests)
  - Valid code verification
  - Invalid code handling
  - National ID mismatch
  - Already redeemed detection
  - Permission enforcement

- **Reward Redemption** (4 tests)
  - Successful redemption
  - Double redemption prevention
  - Unapproved tip rejection
  - Permission enforcement

- **Complete Workflow** (3 tests)
  - Full approval workflow
  - Rejection at officer level
  - Rejection at detective level

### Running Tests

```bash
# Run all reward system tests
pytest tests/test_reward_system.py -v

# Run specific test class
pytest tests/test_reward_system.py::TestOfficerReview -v

# Run specific test
pytest tests/test_reward_system.py::TestCompleteWorkflow::test_full_reward_workflow -v
```

## Integration Points

### With Case Management System
- Tips reference active cases via `case` foreign key
- Tips can optionally reference specific suspects
- Detective must be assigned to case to review tips

### With User Management System
- Role-based permissions (Police Officer, Detective, etc.)
- National ID verification for redemption
- Audit trail of all user actions

### With Evidence System
- Approved tips can be converted to evidence
- Tip information can support case building
- Detective boards can reference tip information

## Configuration

### Default Reward Amount
Located in `TipOff` model:
```python
reward_amount = models.DecimalField(
    max_digits=15,
    decimal_places=0,
    default=5000000,  # 5 million Rials
    help_text="Reward amount in Rials"
)
```

To customize, modify the model default or set per-tip via admin panel.

### Redemption Code Format
Generated in `generate_redemption_code()` method:
```python
self.redemption_code = f"REWARD-{uuid.uuid4().hex[:10].upper()}"
```

Format: `REWARD-` + 10 uppercase hexadecimal characters

## API Documentation

All endpoints are documented with Swagger/OpenAPI:

**Access**: `/api/schema/swagger-ui/`

Each endpoint includes:
- Persian descriptions
- Request/response examples
- Validation rules
- Permission requirements
- Status code meanings

## Error Handling

### Common Error Responses

**400 Bad Request** - Validation errors:
```json
{
  "error": "approved field is required"
}
```

**403 Forbidden** - Permission denied:
```json
{
  "error": "Only police officers can perform initial review"
}
```

**404 Not Found** - Resource not found:
```json
{
  "error": "Invalid redemption code or national ID does not match"
}
```

### Model Method Exceptions

Methods raise `ValueError` for business logic violations:
- Attempting to redeem already redeemed reward
- Attempting to redeem non-approved tip
- Invalid state transitions

Handle in views:
```python
try:
    tip.redeem_reward(request.user)
except ValueError as e:
    return Response({'error': str(e)}, status=400)
```

## Best Practices

### For Citizens
1. Provide detailed, specific information
2. Include location, time, and relevant details
3. Keep redemption code secure
4. Bring national ID when redeeming

### For Officers
1. Verify tip credibility before approving
2. Provide clear rejection reasons
3. Forward potentially useful tips to detectives
4. Check national ID carefully during redemption

### For Detectives
1. Evaluate tip usefulness for investigation
2. Only review tips for assigned cases
3. Provide feedback in rejection reasons
4. Consider tip context with existing evidence

### For Developers
1. Always check permissions in actions
2. Validate state transitions before updates
3. Use model methods for state changes
4. Log all redemption transactions
5. Handle exceptions gracefully

## Migration

The reward system was added in migration `0004_tipoff_detective_rejection_reason_and_more`:

**Fields Added**:
- `officer_rejection_reason`
- `detective_rejection_reason`
- `officer_reviewed_at`
- `detective_reviewed_at`
- `redeemed_by_officer`
- Modified `reward_amount` default to 5,000,000

**To Apply**:
```bash
python manage.py migrate investigation
```

## Performance Considerations

### Database Queries

**Optimized with select_related**:
```python
queryset = TipOff.objects.select_related(
    'case', 'suspect', 'submitted_by',
    'reviewed_by_officer', 'reviewed_by_detective', 
    'redeemed_by_officer'
).all()
```

This reduces N+1 query problems when listing tips.

### Indexing

Recommended indexes:
- `redemption_code` - Already unique, automatically indexed
- `status` - Frequently filtered in queries
- `submitted_by` + `case` - Common filter combination

### Pagination

All list endpoints return paginated results to handle large tip volumes.

## Future Enhancements

### Potential Features

1. **Variable Reward Amounts**: Allow detectives to set reward amount based on tip quality
2. **Anonymous Submissions**: Support truly anonymous tips with secure code delivery
3. **Tip Categories**: Categorize tips by crime type or information type
4. **Tip Ratings**: Let detectives rate tip quality for statistics
5. **Notification System**: Notify citizens when tip status changes
6. **Bulk Operations**: Allow officers to review multiple tips at once
7. **Statistics Dashboard**: Show tip approval rates, average times, etc.
8. **Mobile App Integration**: Dedicated mobile app for tip submission
9. **Reward Tiers**: Different reward amounts based on tip value
10. **Photo/Video Uploads**: Allow multimedia evidence with tips

## Troubleshooting

### Common Issues

**Issue**: "Only police officers can perform initial review"
- **Cause**: User doesn't have 'Police Officer' role
- **Solution**: Add role via admin panel or user management

**Issue**: "Only the assigned detective can review this tip"
- **Cause**: Detective reviewing tip for case they're not assigned to
- **Solution**: Assign detective to case first

**Issue**: "Reward already redeemed"
- **Cause**: Attempting to redeem same reward twice
- **Solution**: This is intentional - rewards are one-time only

**Issue**: Tips not showing in officer queue
- **Cause**: Tips may not be in 'pending' status
- **Solution**: Check tip status, officers only see pending tips

**Issue**: "Invalid redemption code or national ID does not match"
- **Cause**: Wrong code, wrong national ID, or non-existent tip
- **Solution**: Verify code and national ID carefully

## Support

For questions or issues:
1. Check test files for usage examples
2. Review Swagger documentation
3. Check model methods for available operations
4. Verify role permissions in permission matrix

## Changelog

### Version 1.0 (2026-01-07)
- Initial implementation
- Three-stage review workflow
- Unique redemption codes
- Role-based permissions
- Complete test coverage (30 tests)
- Swagger documentation
- Default 5M Rial reward amount

---

**Document Version**: 1.0  
**Last Updated**: January 7, 2026  
**Status**: Complete and Production Ready
