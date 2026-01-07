# Interrogation System - Quick Reference

**Persian: راهنمای سریع سیستم بازجویی**

## Quick Start

### 1. Create Interrogation
```bash
POST /api/v1/investigation/interrogations/
{
  "suspect": <suspect_id>,
  "detective": <detective_user_id>,
  "sergeant": <sergeant_user_id>
}
```

### 2. Submit Ratings
```bash
POST /api/v1/investigation/interrogations/<id>/submit_ratings/
{
  "detective_guilt_rating": 8,  # 1-10
  "sergeant_guilt_rating": 7,   # 1-10
  "detective_notes": "Your notes (min 10 chars)",
  "sergeant_notes": "Your notes (min 10 chars)"
}
```

### 3. Captain Decision
```bash
POST /api/v1/investigation/captain-decisions/
{
  "interrogation": <interrogation_id>,
  "decision": "guilty",  # guilty | not_guilty | needs_more
  "reasoning": "Your reasoning (min 20 chars)"
}
```

### 4. Chief Approval (Critical Crimes Only)
```bash
POST /api/v1/investigation/chief-decisions/
{
  "captain_decision": <captain_decision_id>,
  "decision": "approved",  # approved | rejected
  "comments": "Your comments (min 10 chars)"
}
```

## Workflow

```
Arrested Suspect
       ↓
[Detective + Sergeant Interrogate]
       ↓
Both Rate Guilt (1-10)
       ↓
Submit to Captain
       ↓
┌──────────────────┐
│ Captain Reviews  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
Regular   Critical
Crime     Crime (Level 0)
    │         │
Completed    │
         ┌───┴────┐
         │ Chief  │
         │Reviews │
         └────────┘
             │
         Completed
```

## Rating Scale

| Rating | Meaning | When to Use |
|--------|---------|-------------|
| 1-3 | Likely Innocent | Weak evidence, alibi verified |
| 4-6 | Uncertain | Moderate evidence, conflicting statements |
| 7-8 | Likely Guilty | Strong evidence, suspicious behavior |
| 9-10 | Definitely Guilty | Overwhelming evidence, confession |

## Decision Types

### Captain Decisions
- **guilty**: Clear evidence of guilt
- **not_guilty**: Insufficient evidence
- **needs_more**: Requires additional investigation

### Chief Decisions
- **approved**: Agrees with captain
- **rejected**: Disagrees, case returns

## Permissions Matrix

| Endpoint | Detective | Sergeant | Captain | Police Chief |
|----------|-----------|----------|---------|--------------|
| Create Interrogation | ✅ | ✅ | ✅ | ✅ |
| View Interrogations | Own | Own | Submitted | - |
| Submit Ratings | ✅ | ✅ | - | - |
| Create Captain Decision | - | - | ✅ | - |
| View Captain Decisions | - | - | Own | Critical (awaiting) |
| Create Chief Decision | - | - | - | ✅ |
| View Chief Decisions | - | - | - | Own |

## Validation Rules

### Interrogation Ratings
- ✅ Must be 1-10
- ✅ Both required
- ✅ Notes min 10 characters
- ✅ Can only submit once

### Captain Decision
- ✅ Reasoning min 20 characters
- ✅ Interrogation must be complete
- ✅ One decision per interrogation

### Chief Decision
- ✅ Only for critical crimes
- ✅ Comments min 10 characters
- ✅ One decision per captain decision

## Common Errors

### Invalid Rating
```json
{
  "detective_guilt_rating": ["امتیاز گناه باید بین ۱ تا ۱۰ باشد."]
}
```
**Fix:** Use rating between 1-10

### Missing Ratings
```json
{
  "non_field_errors": ["هر دو امتیاز (کارآگاه و گروهبان) باید ارائه شوند."]
}
```
**Fix:** Provide both detective and sergeant ratings

### Already Submitted
```json
{
  "detail": "این بازجویی قبلاً ارسال شده است."
}
```
**Fix:** Cannot resubmit, create new interrogation if needed

### Wrong Role
```json
{
  "detail": "فقط سرگروه می‌تواند تصمیم بگیرد."
}
```
**Fix:** Use correct user role for operation

### Not Critical Crime
```json
{
  "captain_decision": ["این جنایت نیاز به تایید رئیس پلیس ندارد."]
}
```
**Fix:** Chief decisions only for Level 0 (Critical) crimes

## Status Transitions

### Interrogation
```
pending → submitted → reviewed
```

### Captain Decision (Regular)
```
pending → completed
```

### Captain Decision (Critical)
```
pending → awaiting_chief → completed
```

## Example Full Workflow

### Regular Crime
```bash
# 1. Create
POST /api/v1/investigation/interrogations/
{"suspect": 1, "detective": 2, "sergeant": 3}
# Response: status="pending"

# 2. Submit
POST /api/v1/investigation/interrogations/1/submit_ratings/
{
  "detective_guilt_rating": 7,
  "sergeant_guilt_rating": 6,
  "detective_notes": "Suspicious behavior",
  "sergeant_notes": "Some evidence"
}
# Response: status="submitted", average=6.5

# 3. Captain decides
POST /api/v1/investigation/captain-decisions/
{
  "interrogation": 1,
  "decision": "guilty",
  "reasoning": "Based on evidence and ratings..."
}
# Response: status="completed"
# ✅ DONE - No chief approval needed
```

### Critical Crime
```bash
# Steps 1-2 same as above

# 3. Captain decides
POST /api/v1/investigation/captain-decisions/
{
  "interrogation": 1,
  "decision": "guilty",
  "reasoning": "Critical case with strong evidence..."
}
# Response: status="awaiting_chief", requires_chief=true

# 4. Chief approves
POST /api/v1/investigation/chief-decisions/
{
  "captain_decision": 1,
  "decision": "approved",
  "comments": "Decision is correct and justified..."
}
# Response: chief decision created
# Captain decision status updated to "completed"
# ✅ DONE
```

## API Response Examples

### Interrogation
```json
{
  "id": 1,
  "suspect": 1,
  "suspect_name": "John Doe",
  "detective": 2,
  "detective_name": "Det. Smith",
  "sergeant": 3,
  "sergeant_name": "Sgt. Jones",
  "status": "submitted",
  "detective_guilt_rating": 8,
  "sergeant_guilt_rating": 7,
  "average_rating": 7.5,
  "detective_notes": "Nervous behavior, conflicting statements",
  "sergeant_notes": "Strong physical evidence",
  "is_complete": true,
  "interrogated_at": "2024-01-15T10:00:00Z",
  "submitted_at": "2024-01-15T11:00:00Z"
}
```

### Captain Decision
```json
{
  "id": 1,
  "interrogation": 1,
  "captain": 5,
  "captain_name": "Capt. Williams",
  "suspect_name": "John Doe",
  "decision": "guilty",
  "reasoning": "High guilt ratings and strong evidence...",
  "status": "completed",
  "requires_chief": false,
  "decided_at": "2024-01-15T14:00:00Z"
}
```

### Chief Decision
```json
{
  "id": 1,
  "captain_decision": 1,
  "police_chief": 8,
  "chief_name": "Chief Anderson",
  "suspect_name": "John Doe",
  "decision": "approved",
  "comments": "Captain's decision is well-reasoned...",
  "decided_at": "2024-01-15T16:00:00Z"
}
```

## Testing

### Run Tests
```bash
cd src
pytest apps/investigation/tests/test_interrogation_system.py -v
# 20 tests should pass
```

### Test Coverage
- ✅ Interrogation creation (5 tests)
- ✅ Captain decisions (6 tests)
- ✅ Chief decisions (5 tests)
- ✅ Permissions (4 tests)

## Key Points

1. **Both Ratings Required**: Detective AND sergeant must both rate
2. **Rating Range**: 1-10 only, validated in serializer
3. **Critical Crimes**: Level 0 requires chief approval
4. **One Decision**: Each interrogation gets one captain decision
5. **Status Flow**: Follows strict state machine
6. **Role-Based**: Strict permission checks

## Related Documentation

- Full Documentation: `/doc/11-Interrogation-System.md`
- Case Resolution: `/doc/10-Case-Resolution.md`
- API Reference: `/doc/07-API-Reference.md`

---

**Quick Reference Version:** 1.0  
**Last Updated:** January 2024
