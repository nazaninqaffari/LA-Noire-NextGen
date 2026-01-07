# Evidence Registration System (ثبت شواهد)

## Overview

The Evidence Registration System handles all types of evidence collection and management for criminal investigations. Evidence is categorized into five main types, all sharing common attributes: title, description, registration date, and registrar.

## Common Evidence Attributes

All evidence types include:
- **Title** (عنوان): Brief title of the evidence
- **Description** (توضیحات): Detailed description
- **Recorded By** (ثبت‌کننده): Personnel who registered the evidence
- **Recorded At** (تاریخ ثبت): Registration timestamp
- **Case**: Associated criminal case (must be OPEN or UNDER_INVESTIGATION)

## Evidence Types

### 1. Testimony Evidence (استشهاد شاهدان یا افراد محلی)

**Purpose**: Record witness statements and local people testimonies about the case.

**Fields**:
- All common fields
- `witness` (optional): Registered user who gave testimony
- `witness_name` (optional): Name of unregistered witness
- `transcript` (required): Written statement
- `image` (optional): Image evidence from locals
- `audio` (optional): Audio recording
- `video` (optional): Video recording

**Validation Rules**:
- Either `witness` OR `witness_name` must be provided
- Case must be in OPEN or UNDER_INVESTIGATION status
- Only recorder or admin can update testimony

**Endpoint**: `POST /api/v1/evidence/testimonies/`

**Example Request**:
```json
{
  "case": 1,
  "title": "Eyewitness Account - Burglary",
  "description": "Witness saw suspect breaking window",
  "witness": 5,
  "transcript": "I was walking my dog around 11 PM when I heard glass breaking. I looked up and saw a person in dark clothes climbing through the window of the jewelry store."
}
```

**Example with Local Person + Media**:
```json
{
  "case": 1,
  "title": "Security Camera Footage",
  "description": "Local resident has camera footage",
  "witness_name": "John Smith",
  "transcript": "My security camera captured the incident. I'm providing the video file.",
  "video": "<file upload>"
}
```

### 2. Biological Evidence (شواهد زیستی و پزشکی)

**Purpose**: Document biological and medical evidence requiring forensic analysis.

**Examples**: Blood stains (لکه خون), Hair samples (تار مو), Fingerprints (اثر انگشت)

**Fields**:
- All common fields
- `evidence_type` (required): Type of biological evidence
- `images`: Multiple photos of evidence
- `coroner_analysis` (initially empty): Forensic analysis results
- `identity_match` (initially empty): Person matched via national ID database
- `verified_by_coroner`: Forensic doctor who verified evidence
- `verified_at`: Verification timestamp

**Workflow**:
1. Officer registers biological evidence at crime scene
2. Evidence initially has empty analysis fields
3. Forensic doctor later adds analysis results via `/verify/` endpoint
4. System automatically sets verification timestamp

**Registration Endpoint**: `POST /api/v1/evidence/biological/`

**Example Request**:
```json
{
  "case": 1,
  "title": "Blood Sample from Crime Scene",
  "description": "Blood stain found on wall near entry point",
  "evidence_type": "blood",
  "images": [1, 2]
}
```

**Verification Endpoint**: `POST /api/v1/evidence/biological/{id}/verify/`

**Verification Request** (Forensic Doctor only):
```json
{
  "coroner_analysis": "Blood type O+. DNA analysis shows 99.9% match with suspect ID 12345.",
  "identity_match": 15
}
```

**Response**:
```json
{
  "id": 1,
  "case": 1,
  "title": "Blood Sample from Crime Scene",
  "evidence_type": "blood",
  "coroner_analysis": "Blood type O+. DNA analysis shows 99.9% match...",
  "identity_match": 15,
  "identity_match_name": "John Doe",
  "verified_by_coroner": 8,
  "verified_by_name": "Dr. Sarah Smith",
  "verified_at": "2026-01-07T14:30:00Z",
  "recorded_by": 3,
  "recorded_at": "2026-01-07T10:00:00Z"
}
```

### 3. Vehicle Evidence (وسایل نقلیه)

**Purpose**: Document vehicles found at crime scenes.

**Fields**:
- All common fields
- `model` (required): Vehicle model
- `color` (required): Vehicle color
- `license_plate` (conditional): License plate number
- `serial_number` (conditional): Vehicle serial number if no plate

**Critical Validation**:
- Must have EITHER `license_plate` OR `serial_number`
- **Cannot have both simultaneously** (دقت کنید در هنگام ذخیره نمی‌توانند همزمان مقدار داشته باشند)

**Endpoint**: `POST /api/v1/evidence/vehicles/`

**Example with License Plate**:
```json
{
  "case": 1,
  "title": "Suspect Vehicle - Black Sedan",
  "description": "Black sedan seen fleeing crime scene",
  "model": "Toyota Camry 2020",
  "color": "Black",
  "license_plate": "ABC-1234"
}
```

**Example with Serial Number** (no plates):
```json
{
  "case": 1,
  "title": "Abandoned Motorcycle",
  "description": "Motorcycle found near scene with no plates",
  "model": "Honda CBR600",
  "color": "Red",
  "serial_number": "JH2PC40046M200123"
}
```

### 4. ID Document Evidence (مدارک شناسایی)

**Purpose**: Record identification documents found at crime scenes.

**Fields**:
- All common fields
- `owner_full_name` (required): Full name on document
- `document_type` (required): Type of document (e.g., national ID, driver's license, work badge)
- `attributes` (flexible): Additional document information as key-value pairs

**Key-Value Flexibility**:
- Attributes field uses JSON format
- Can have **any number** of key-value pairs
- Can be **completely empty** (e.g., work badge with only name)
- Common attributes: id_number, issue_date, expiry_date, address

**Endpoint**: `POST /api/v1/evidence/id-documents/`

**Example with Full Attributes**:
```json
{
  "case": 1,
  "title": "Suspect National ID Card",
  "description": "National ID found at crime scene near broken window",
  "owner_full_name": "John Michael Doe",
  "document_type": "National ID Card",
  "attributes": {
    "id_number": "1234567890",
    "issue_date": "2020-05-15",
    "expiry_date": "2030-05-15",
    "address": "123 Main St, Los Angeles"
  }
}
```

**Example with Minimal Attributes**:
```json
{
  "case": 1,
  "title": "Driver License Fragment",
  "description": "Partially burned driver's license",
  "owner_full_name": "Jane Smith",
  "document_type": "Driver's License",
  "attributes": {
    "license_number": "D1234567"
  }
}
```

**Example with No Attributes** (name only):
```json
{
  "case": 1,
  "title": "Security Guard Badge",
  "description": "Work badge found near entrance",
  "owner_full_name": "Robert Johnson",
  "document_type": "Work Badge",
  "attributes": {}
}
```

### 5. Generic Evidence (سایر موارد)

**Purpose**: Record any other evidence not fitting specific categories.

**Fields**:
- All common fields only (title + description)

**Use Cases**:
- Physical items (crowbar, knife, clothing)
- Documents (notes, letters)
- Any other evidence

**Endpoint**: `POST /api/v1/evidence/generic/`

**Examples**:
```json
{
  "case": 1,
  "title": "Crowbar",
  "description": "Metal crowbar found at crime scene with paint chips matching door frame"
}
```

```json
{
  "case": 1,
  "title": "Handwritten Note",
  "description": "Threatening note left at scene. Text reads: 'This is just the beginning.'"
}
```

```json
{
  "case": 1,
  "title": "Black Glove",
  "description": "Single black leather glove found near entry point. Size large."
}
```

## Permissions and Access Control

### Role-Based Access

| Role | Can Register | Can View | Can Verify | Can Update |
|------|-------------|----------|-----------|-----------|
| **Police Officers** | ✅ All evidence types | ✅ All evidence | ❌ | ✅ Own evidence |
| **Forensic Doctors** | ✅ All evidence types | ✅ All evidence | ✅ Biological only | ✅ Own evidence |
| **Administrators** | ✅ All evidence types | ✅ All evidence | ❌ | ✅ All evidence |
| **Civilians** | ✅ All evidence types (limited) | ⚠️ Own cases only | ❌ | ✅ Own evidence |

### Automatic Fields

The system automatically sets:
- `recorded_by`: Current authenticated user
- `recorded_at`: Current timestamp
- `verified_by_coroner`: Current user (when verifying biological evidence)
- `verified_at`: Current timestamp (when verifying biological evidence)

## Filtering and Search

All evidence endpoints support:

### Filtering by Field
```bash
GET /api/v1/evidence/testimonies/?case=1
GET /api/v1/evidence/biological/?evidence_type=blood
GET /api/v1/evidence/vehicles/?recorded_by=5
GET /api/v1/evidence/id-documents/?document_type=National%20ID
```

### Text Search
```bash
GET /api/v1/evidence/testimonies/?search=eyewitness
GET /api/v1/evidence/vehicles/?search=Toyota
GET /api/v1/evidence/generic/?search=crowbar
```

### Ordering
```bash
GET /api/v1/evidence/testimonies/?ordering=-recorded_at
GET /api/v1/evidence/biological/?ordering=evidence_type
```

## API Endpoints Summary

### Testimony Evidence
- `GET /api/v1/evidence/testimonies/` - List all testimonies
- `POST /api/v1/evidence/testimonies/` - Register new testimony
- `GET /api/v1/evidence/testimonies/{id}/` - Get testimony details
- `PUT /api/v1/evidence/testimonies/{id}/` - Update testimony (recorder/admin only)
- `DELETE /api/v1/evidence/testimonies/{id}/` - Delete testimony (recorder/admin only)

### Biological Evidence
- `GET /api/v1/evidence/biological/` - List all biological evidence
- `POST /api/v1/evidence/biological/` - Register new biological evidence
- `GET /api/v1/evidence/biological/{id}/` - Get evidence details
- `POST /api/v1/evidence/biological/{id}/verify/` - Add forensic analysis (forensic doctor only)
- `PUT /api/v1/evidence/biological/{id}/` - Update evidence
- `DELETE /api/v1/evidence/biological/{id}/` - Delete evidence

### Vehicle Evidence
- `GET /api/v1/evidence/vehicles/` - List all vehicles
- `POST /api/v1/evidence/vehicles/` - Register new vehicle
- `GET /api/v1/evidence/vehicles/{id}/` - Get vehicle details
- `PUT /api/v1/evidence/vehicles/{id}/` - Update vehicle
- `DELETE /api/v1/evidence/vehicles/{id}/` - Delete vehicle

### ID Document Evidence
- `GET /api/v1/evidence/id-documents/` - List all ID documents
- `POST /api/v1/evidence/id-documents/` - Register new ID document
- `GET /api/v1/evidence/id-documents/{id}/` - Get document details
- `PUT /api/v1/evidence/id-documents/{id}/` - Update document
- `DELETE /api/v1/evidence/id-documents/{id}/` - Delete document

### Generic Evidence
- `GET /api/v1/evidence/generic/` - List all generic evidence
- `POST /api/v1/evidence/generic/` - Register new evidence
- `GET /api/v1/evidence/generic/{id}/` - Get evidence details
- `PUT /api/v1/evidence/generic/{id}/` - Update evidence
- `DELETE /api/v1/evidence/generic/{id}/` - Delete evidence

### Evidence Images
- `GET /api/v1/evidence/images/` - List all images
- `POST /api/v1/evidence/images/` - Upload new image
- `GET /api/v1/evidence/images/{id}/` - Get image details
- `DELETE /api/v1/evidence/images/{id}/` - Delete image

## Validation Rules Summary

### Common Validations
- ✅ Case must be in OPEN or UNDER_INVESTIGATION status
- ✅ Title and description required for all evidence
- ✅ User must be authenticated

### Testimony Specific
- ✅ Either `witness` (user ID) OR `witness_name` (string) required
- ✅ Transcript is required

### Biological Specific
- ✅ `evidence_type` is required
- ✅ Only forensic doctors can add analysis results
- ✅ Coroner analysis required when verifying

### Vehicle Specific
- ✅ Must have either `license_plate` OR `serial_number`
- ❌ Cannot have both license plate AND serial number
- ✅ Model and color required

### ID Document Specific
- ✅ `owner_full_name` is required
- ✅ `document_type` is required
- ✅ `attributes` must be a valid JSON object/dict (can be empty)

## Error Responses

### Common Errors

**Case Not Open**:
```json
{
  "case": ["Cannot add evidence to case with status 'Rejected'. Case must be open or under investigation."]
}
```

**Missing Required Field**:
```json
{
  "evidence_type": ["This field is required"]
}
```

**Permission Denied**:
```json
{
  "error": "Only forensic doctors can verify biological evidence"
}
```

**Vehicle Validation Error**:
```json
{
  "license_plate": ["Vehicle cannot have both license plate and serial number. Provide only one."]
}
```

**Testimony Witness Error**:
```json
{
  "witness": ["Either witness (registered user) or witness_name must be provided"]
}
```

## Testing

The evidence system includes comprehensive test coverage:

**Test Coverage**: 25 tests across 7 test classes
- ✅ TestTestimonyEvidence (6 tests)
- ✅ TestBiologicalEvidence (4 tests)
- ✅ TestVehicleEvidence (4 tests)
- ✅ TestIDDocumentEvidence (4 tests)
- ✅ TestGenericEvidence (2 tests)
- ✅ TestEvidencePermissions (3 tests)
- ✅ TestEvidenceFiltering (2 tests)

**Run Tests**:
```bash
pytest tests/test_evidence.py -v
```

## Integration with Case Management

Evidence registration integrates with the case management system:

1. **Case Status Validation**: Evidence can only be added to OPEN or UNDER_INVESTIGATION cases
2. **Case Association**: All evidence is linked to a specific case
3. **Timeline Tracking**: Evidence timestamps help build case timeline
4. **Investigation Flow**: Evidence supports the investigation process workflow

## Best Practices

### For Officers
1. Register evidence as soon as it's discovered
2. Provide detailed descriptions
3. Take multiple photos for biological evidence
4. Verify vehicle information carefully (plate vs serial)

### For Forensic Doctors
1. Review all biological evidence promptly
2. Provide detailed analysis results
3. Check national ID database for matches
4. Update evidence with verification results

### For Investigators
1. Review all evidence before making decisions
2. Cross-reference evidence with witness testimonies
3. Use search and filtering to find related evidence
4. Keep evidence organized by case

## Future Enhancements

- [ ] Chain of custody tracking
- [ ] Evidence expiration dates
- [ ] Bulk evidence import
- [ ] Evidence relationship mapping
- [ ] Automated evidence analysis using AI
- [ ] Evidence integrity verification (hashing)
- [ ] Evidence transfer between cases
