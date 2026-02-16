# Evidence Management

## Evidence Types

All evidence shares common attributes:
- **Title**: Brief description
- **Description**: Detailed information
- **Recorded by**: Personnel who logged the evidence
- **Recorded at**: Timestamp when evidence was added

## 1. Testimony Evidence

Witness statements, transcripts, and media from locals or witnesses.

### Attributes
- **Witness**: Registered user (if witness has account) OR witness name (if not registered)
- **Transcript**: Written testimony
- **Media Attachments** (optional):
  - Image
  - Audio recording
  - Video recording

### Use Cases
- Recording witness statements
- Documenting local testimonies
- Storing media evidence from civilians

### API Example
```http
POST /api/v1/evidence/testimony/
Content-Type: multipart/form-data

{
  "case": 1,
  "title": "Eyewitness Account",
  "description": "Witness saw suspect fleeing scene",
  "witness": 5,  // or null if witness_name provided
  "witness_name": "",  // if witness is not registered
  "transcript": "I saw a tall man in black jacket running from the store around 10 PM",
  "image": [file],  // optional
  "audio": [file],  // optional
  "video": [file]   // optional
}
```

## 2. Biological/Medical Evidence

Physical evidence requiring forensic analysis.

### Attributes
- **Evidence Type**: Description (e.g., "blood stain", "hair sample", "fingerprint")
- **Images**: Multiple photos of evidence
- **Coroner Analysis**: Forensic report (initially empty)
- **Identity Match**: Matched person from database (if found)
- **Verified By**: Coroner who verified
- **Verified At**: Verification timestamp

### Workflow
1. Police personnel finds biological evidence at scene
2. Records evidence with photos
3. Sends to coroner for analysis
4. Coroner updates analysis field
5. If match found in national database, links to person

### Verification Sources
- Coroner's forensic analysis
- National identity database (for fingerprints, DNA)

### API Example
```http
POST /api/v1/evidence/biological/
Content-Type: application/json

{
  "case": 1,
  "title": "Blood Sample from Crime Scene",
  "description": "Blood found on victim's shirt",
  "evidence_type": "Blood Stain",
  "images": [1, 2, 3],  // Evidence image IDs
  "coroner_analysis": "",  // Empty initially
  "identity_match": null,  // Populated after analysis
  "verified_by_coroner": null
}
```

### Update After Analysis
```http
PATCH /api/v1/evidence/biological/{id}/
Content-Type: application/json

{
  "coroner_analysis": "Type O+ blood. DNA analysis shows 99.9% match with suspect #12",
  "identity_match": 12,
  "verified_by_coroner": 8,
  "verified_at": "2026-01-05T16:00:00Z"
}
```

## 3. Vehicle Evidence

Vehicles found at or related to crime scene.

### Attributes
- **Model**: Vehicle model/make
- **Color**: Vehicle color
- **License Plate**: Plate number (if available)
- **Serial Number**: VIN or serial (if no plate)

### Constraints
- **MUST have either license plate OR serial number**
- **Cannot have both simultaneously**

### Use Cases
- Getaway vehicle identification
- Abandoned vehicles at scene
- Stolen vehicle reports

### API Example
```http
POST /api/v1/evidence/vehicles/
Content-Type: application/json

{
  "case": 1,
  "title": "Suspect Vehicle",
  "description": "Black sedan seen fleeing scene",
  "model": "1947 Ford Deluxe",
  "color": "Black",
  "license_plate": "CAL-1234",  // Either this
  "serial_number": ""            // OR this (not both)
}
```

## 4. ID Document Evidence

Identification documents found at scene.

### Attributes
- **Owner Full Name**: Name on document
- **Document Type**: Type of ID (e.g., "National ID", "Driver's License", "Work Badge")
- **Attributes**: Flexible key-value pairs for any document information

### Flexible Structure
The `attributes` field allows storing any document information:
```json
{
  "id_number": "123456789",
  "issue_date": "2020-01-15",
  "expiry_date": "2030-01-15",
  "issuing_authority": "California DMV"
}
```

Or minimal information:
```json
{
  "company": "Acme Corp"
}
```

### API Example
```http
POST /api/v1/evidence/id-documents/
Content-Type: application/json

{
  "case": 1,
  "title": "Suspect's Driver's License",
  "description": "Found near victim's body",
  "owner_full_name": "John Doe",
  "document_type": "California Driver's License",
  "attributes": {
    "license_number": "D1234567",
    "issue_date": "2022-03-15",
    "expiry_date": "2026-03-15",
    "class": "C",
    "address": "123 Main St, Los Angeles, CA"
  }
}
```

## 5. Generic Evidence

Catch-all for any other evidence type.

### Attributes
- Only the common fields (title, description)

### Use Cases
- Physical objects (weapons, clothing, etc.)
- Documents not covered by ID document type
- Any miscellaneous evidence

### API Example
```http
POST /api/v1/evidence/generic/
Content-Type: application/json

{
  "case": 1,
  "title": "Murder Weapon",
  "description": ".38 caliber revolver found in suspect's apartment. Serial number filed off."
}
```

## Evidence Management Workflow

### Adding Evidence
1. Personnel discovers evidence during investigation
2. Logs evidence using appropriate endpoint
3. System records timestamp and person who logged it
4. Evidence becomes part of case file

### Evidence Verification
For biological evidence:
1. Coroner receives notification of pending evidence
2. Conducts forensic analysis
3. Updates evidence record with findings
4. If identity match found, links to person in database

### Evidence in Investigation
Detectives can:
- View all evidence for their assigned cases
- Add evidence to detective board
- Create connections between related evidence items

### Evidence in Trial
Judge can:
- Access complete evidence file
- Review all evidence with full details
- See verification status and results
- View timeline of evidence collection

## API Endpoints

### Testimony
```
GET    /api/v1/evidence/testimony/
POST   /api/v1/evidence/testimony/
GET    /api/v1/evidence/testimony/{id}/
PATCH  /api/v1/evidence/testimony/{id}/
DELETE /api/v1/evidence/testimony/{id}/
```

### Biological Evidence
```
GET    /api/v1/evidence/biological/
POST   /api/v1/evidence/biological/
GET    /api/v1/evidence/biological/{id}/
PATCH  /api/v1/evidence/biological/{id}/
DELETE /api/v1/evidence/biological/{id}/
```

### Vehicle Evidence
```
GET    /api/v1/evidence/vehicles/
POST   /api/v1/evidence/vehicles/
GET    /api/v1/evidence/vehicles/{id}/
PATCH  /api/v1/evidence/vehicles/{id}/
DELETE /api/v1/evidence/vehicles/{id}/
```

### ID Documents
```
GET    /api/v1/evidence/id-documents/
POST   /api/v1/evidence/id-documents/
GET    /api/v1/evidence/id-documents/{id}/
PATCH  /api/v1/evidence/id-documents/{id}/
DELETE /api/v1/evidence/id-documents/{id}/
```

### Generic Evidence
```
GET    /api/v1/evidence/generic/
POST   /api/v1/evidence/generic/
GET    /api/v1/evidence/generic/{id}/
PATCH  /api/v1/evidence/generic/{id}/
DELETE /api/v1/evidence/generic/{id}/
```

## Notifications

New evidence added to case triggers notifications to:
- Assigned detective
- Assigned sergeant
- All board members (if detective board exists)

## See Also

- [[03-Case-Workflows|Case Workflows]]
- [[05-Investigation-Process|Investigation Process]]
- [[07-API-Reference|API Reference]]
