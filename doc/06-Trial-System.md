# Trial System

The trial system handles court proceedings after investigation completion, including verdicts, punishments, and bail payments.

## Trial Workflow Overview

```
Investigation Complete
   ↓
Captain/Chief Submits to Trial
   ↓
Judge Reviews Case
   ↓
Verdict Delivered
   ↓
Punishment Assigned (if guilty)
   OR
Bail Payment Option (eligible cases)
```

## Submitting Case to Trial

### Authority Requirements

| Crime Level | Submitter | Notes |
|-------------|-----------|-------|
| Level 3 (Minor) | Captain | Regular approval process |
| Level 2 (Medium) | Captain | Regular approval process |
| Level 1 (Major) | Captain | Requires comprehensive evidence |
| Critical | **Chief** | Only Chief can submit critical cases |

### Creating a Trial

**API Endpoint**: `POST /api/v1/trial/trials/`

**For Regular Cases (Captain)**:
```json
{
  "case": 1,
  "suspect": 1,
  "judge": 15,
  "submitted_by_captain": 6,
  "captain_notes": "Strong evidence of guilt. Multiple eyewitness testimonies corroborate forensic evidence. Interrogation ratings: Detective 8/10, Sergeant 9/10. Ready for trial."
}
```

**For Critical Cases (Chief)**:
```json
{
  "case": 2,
  "suspect": 3,
  "judge": 15,
  "submitted_by_chief": 9,
  "chief_notes": "Serial murder case. DNA evidence matches all three crime scenes. Weapon recovered with suspect's fingerprints. Overwhelming evidence of guilt."
}
```

**Response**:
```json
{
  "id": 1,
  "case": {
    "id": 1,
    "case_number": "CASE-ABC123",
    "title": "Downtown Armed Robbery",
    "crime_level": {
      "level": 2,
      "name": "Level 2 - Medium Crimes"
    }
  },
  "suspect": {
    "id": 1,
    "person": {
      "full_name": "John Smith"
    },
    "status": "arrested"
  },
  "judge": {
    "id": 15,
    "full_name": "Margaret Johnson"
  },
  "submitted_by_captain": {
    "id": 6,
    "full_name": "James Donnelly"
  },
  "captain_notes": "Strong evidence of guilt...",
  "trial_started_at": "2026-01-05T10:00:00Z"
}
```

## Judge Review Process

### Case File Contents

Judge receives complete case package including:

1. **Case Information**
   - Case number
   - Crime type and level
   - Formation details (complaint/crime scene)
   - Timeline of events

2. **All Evidence**
   - Testimonies with transcripts
   - Biological/forensic evidence with coroner analysis
   - Vehicle evidence
   - ID documents
   - Generic evidence items
   - Evidence images

3. **Investigation Details**
   - Detective board layout
   - Evidence connections and detective reasoning
   - Suspect identification process
   - Sergeant approval messages

4. **Interrogation Records**
   - Detective guilt rating (1-10)
   - Sergeant guilt rating (1-10)
   - Detailed notes from both
   - Suspect statements

5. **Personnel Involved**
   - Complete details of all police who worked on case:
     - Cadet who approved complaint (if applicable)
     - Officer who approved case
     - Officers who reported crime scene
     - Detective assigned to case
     - Sergeant who supervised
     - Captain/Chief who submitted to trial

6. **Review Chain**
   - All case reviews with decisions
   - Rejection reasons (if any)
   - Approval timestamps

### Accessing Trial Details

**API Endpoint**: `GET /api/v1/trial/trials/1/`

Returns comprehensive trial package with all nested information.

## Delivering Verdict

### Verdict Options

- **Guilty** (گناهکار): Suspect is convicted
- **Innocent** (بی‌گناه): Suspect is acquitted

### Creating Verdict

**API Endpoint**: `POST /api/v1/trial/verdicts/`

**Guilty Verdict**:
```json
{
  "trial": 1,
  "decision": "guilty",
  "reasoning": "The evidence presented is overwhelming and conclusive. Multiple eyewitnesses identified the defendant at the crime scene. Forensic evidence including fingerprints and DNA match the defendant. The defendant's alibi has been thoroughly discredited. Based on the totality of evidence, this court finds the defendant guilty beyond reasonable doubt."
}
```

**Innocent Verdict**:
```json
{
  "trial": 1,
  "decision": "innocent",
  "reasoning": "While suspicion exists, the prosecution has failed to prove guilt beyond reasonable doubt. Key evidence is circumstantial. The defendant has presented a credible alibi supported by witnesses. Forensic evidence is inconclusive. The court finds the defendant not guilty and orders immediate release."
}
```

**Response**:
```json
{
  "id": 1,
  "trial": {
    "id": 1,
    "case": {
      "case_number": "CASE-ABC123"
    },
    "suspect": {
      "person": {
        "full_name": "John Smith"
      }
    }
  },
  "decision": "guilty",
  "reasoning": "The evidence presented is overwhelming...",
  "delivered_at": "2026-01-05T15:00:00Z"
}
```

### Post-Verdict Actions

**If Innocent**:
- Suspect status changes to "cleared"
- Case marked as closed
- Suspect released immediately
- Record remains for reference

**If Guilty**:
- Punishment must be assigned
- Case marked as closed with conviction
- Suspect becomes criminal
- Punishment record created

## Assigning Punishment

### Punishment Types

Common punishments based on crime level:

| Crime Level | Typical Punishments |
|-------------|---------------------|
| Level 3 | Fine, probation, community service, short jail term (< 1 year) |
| Level 2 | Fine + jail term (1-5 years), property confiscation |
| Level 1 | Long prison sentence (5-25 years), life imprisonment |
| Critical | Life imprisonment without parole, death penalty (jurisdiction dependent) |

### Creating Punishment

**API Endpoint**: `POST /api/v1/trial/punishments/`

```json
{
  "verdict": 1,
  "title": "10 years imprisonment + 100 million Rials fine",
  "description": "The defendant is hereby sentenced to ten (10) years imprisonment in state correctional facility. Additionally, the defendant shall pay a fine of 100,000,000 (one hundred million) Rials to be paid within 90 days. The defendant is also ordered to pay restitution to victims in the amount of 50,000,000 Rials. Upon release, defendant will be on supervised probation for 3 years."
}
```

**Response**:
```json
{
  "id": 1,
  "verdict": {
    "id": 1,
    "decision": "guilty",
    "trial": {
      "suspect": {
        "person": {
          "full_name": "John Smith"
        }
      }
    }
  },
  "title": "10 years imprisonment + 100 million Rials fine",
  "description": "The defendant is hereby sentenced...",
  "assigned_at": "2026-01-05T15:30:00Z"
}
```

## Bail Payment System

### Eligibility Criteria

**Eligible for Bail**:
- ✅ Level 3 (Minor) suspects - **Before conviction**
- ✅ Level 3 (Minor) criminals - **After conviction** (with sergeant approval)
- ✅ Level 2 (Medium) suspects - **Before conviction only**

**NOT Eligible for Bail**:
- ❌ Level 1 (Major) crimes
- ❌ Level 0 (Critical) crimes
- ❌ Level 2 criminals after conviction

### Bail for Suspects (Pre-Trial)

Level 2 and 3 suspects can request bail while awaiting trial.

**API Endpoint**: `POST /api/v1/trial/bail-payments/`

```json
{
  "suspect": 1,
  "amount": 50000000
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
      "crime_level": {
        "level": 2
      }
    }
  },
  "amount": "50000000",
  "status": "pending",
  "requested_at": "2026-01-05T09:00:00Z",
  "message": "Bail request submitted. Awaiting sergeant approval."
}
```

### Sergeant Approval

Sergeant must approve bail amount and release.

**Approve**: `PATCH /api/v1/trial/bail-payments/1/`
```json
{
  "approved_by_sergeant": 5,
  "status": "approved",
  "approved_at": "2026-01-05T10:00:00Z"
}
```

**Reject**: `PATCH /api/v1/trial/bail-payments/1/`
```json
{
  "approved_by_sergeant": 5,
  "status": "rejected"
}
```

### Fine for Criminals (Post-Conviction)

**Only Level 3 criminals** can pay fine instead of serving sentence (with sergeant approval).

**Request Fine Payment**: `POST /api/v1/trial/bail-payments/`
```json
{
  "suspect": 3,
  "amount": 25000000
}
```

Sergeant must approve:
```json
{
  "approved_by_sergeant": 5,
  "status": "approved",
  "approved_at": "2026-01-05T16:00:00Z"
}
```

### Payment Integration

**Payment Gateway Placeholder**:
```json
{
  "payment_reference": "GATEWAY-TXN-123456789",
  "status": "paid",
  "paid_at": "2026-01-05T10:30:00Z"
}
```

System should integrate with payment gateway:
- Generate payment link
- Verify transaction
- Update status to "paid" on success
- Release suspect/criminal

### Checking Bail Status

**API Endpoint**: `GET /api/v1/trial/bail-payments/?suspect=1`

```json
[
  {
    "id": 1,
    "suspect": 1,
    "amount": "50000000",
    "status": "approved",
    "approved_by_sergeant": {
      "full_name": "Hank Merrill"
    },
    "approved_at": "2026-01-05T10:00:00Z",
    "payment_url": "https://payment.gateway/pay/12345"
  }
]
```

## Trial Statistics

### Case Outcomes

**Query Verdicts**: `GET /api/v1/trial/verdicts/?decision=guilty`

```json
{
  "count": 45,
  "guilty_percentage": 73.5,
  "innocent_percentage": 26.5
}
```

### Judge Statistics

**Cases by Judge**: `GET /api/v1/trial/trials/?judge=15`

Shows all trials presided by specific judge.

### Crime Level Convictions

```sql
-- Conviction rate by crime level
SELECT 
  crime_level,
  COUNT(CASE WHEN decision = 'guilty' THEN 1 END) as guilty,
  COUNT(CASE WHEN decision = 'innocent' THEN 1 END) as innocent,
  COUNT(*) as total
FROM trials
GROUP BY crime_level
```

## Trial Workflow Examples

### Example 1: Successful Conviction

```
1. Captain submits case (Level 2 - Armed Robbery)
2. Judge reviews 2-week investigation:
   - 5 evidence items
   - 2 eyewitness testimonies
   - Fingerprint match
   - Interrogation: Detective 8/10, Sergeant 9/10
3. Trial conducted
4. Verdict: GUILTY
5. Punishment: 7 years imprisonment + 75M Rials fine
6. Case closed, suspect becomes criminal
```

### Example 2: Acquittal

```
1. Captain submits case (Level 1 - Murder)
2. Judge reviews investigation:
   - Circumstantial evidence only
   - No forensic match
   - Alibi supported by multiple witnesses
   - Interrogation: Detective 5/10, Sergeant 4/10
3. Trial conducted
4. Verdict: INNOCENT
5. Suspect cleared and released
6. Case closed without conviction
```

### Example 3: Bail Payment

```
1. Suspect arrested for Level 2 crime
2. Suspect requests bail: 50M Rials
3. Sergeant reviews:
   - Not flight risk
   - First offense
   - Community ties
4. Sergeant approves bail
5. Suspect pays via gateway
6. Suspect released pending trial
7. Trial date set
8. Suspect returns for trial
```

### Example 4: Fine Payment (Level 3 Criminal)

```
1. Verdict: Guilty (Level 3 - Shoplifting)
2. Punishment: 6 months jail OR 20M Rials fine
3. Criminal requests fine payment
4. Sergeant reviews:
   - Minor crime
   - First offense
   - Full restitution to victim
5. Sergeant approves fine option
6. Criminal pays 20M Rials
7. Released instead of serving sentence
```

## Trial Best Practices

### For Captains/Chiefs

1. **Complete package** - Ensure all evidence is collected before submitting
2. **Strong interrogation** - Both detective and sergeant should have high confidence
3. **Clear notes** - Explain why case is ready for trial
4. **Respect hierarchy** - Chief only for critical cases

### For Judges

1. **Thorough review** - Examine all evidence carefully
2. **Consider all factors** - Evidence quality, interrogation ratings, personnel notes
3. **Detailed reasoning** - Explain verdict thoroughly
4. **Appropriate punishment** - Match severity to crime level
5. **Consistency** - Similar cases should receive similar outcomes

### For Sergeants (Bail Approval)

1. **Assess risk** - Flight risk, community ties, prior offenses
2. **Crime severity** - Level 3 more lenient than Level 2
3. **Victim rights** - Consider victim restitution
4. **Clear communication** - Explain approval/rejection reasoning

## API Summary

### Trials
- `POST /api/v1/trial/trials/` - Create trial
- `GET /api/v1/trial/trials/` - List trials
- `GET /api/v1/trial/trials/{id}/` - Get trial details
- `PATCH /api/v1/trial/trials/{id}/` - Update trial

### Verdicts
- `POST /api/v1/trial/verdicts/` - Deliver verdict
- `GET /api/v1/trial/verdicts/` - List verdicts
- `GET /api/v1/trial/verdicts/{id}/` - Get verdict details

### Punishments
- `POST /api/v1/trial/punishments/` - Assign punishment
- `GET /api/v1/trial/punishments/` - List punishments
- `GET /api/v1/trial/punishments/{id}/` - Get punishment details

### Bail Payments
- `POST /api/v1/trial/bail-payments/` - Request bail
- `GET /api/v1/trial/bail-payments/` - List bail payments
- `GET /api/v1/trial/bail-payments/{id}/` - Get bail details
- `PATCH /api/v1/trial/bail-payments/{id}/` - Update bail status

## See Also

- [[05-Investigation-Process|Investigation Process]] - How cases reach trial
- [[03-Case-Workflows|Case Workflows]] - Case formation and approval
- [[02-User-Roles|User Roles]] - Captain, Chief, Judge permissions
- [[07-API-Reference|API Reference]] - Complete API documentation
