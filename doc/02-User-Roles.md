# User Roles and Permissions

## Role System

LA Noire NextGen implements a **dynamic role system** where administrators can create, modify, and delete roles without any code changes.

## Role Types

### Administrative Roles

#### Administrator (System Admin)
- **Hierarchy Level**: 10
- **Permissions**: Full system access
- **Responsibilities**:
  - Manage user accounts
  - Create/modify/delete roles
  - Assign roles to users
  - System configuration

#### Base User
- **Hierarchy Level**: 0
- **Permissions**: Limited access
- **Responsibilities**:
  - File complaints
  - Submit tip-offs
  - View own profile

### Police Hierarchy

The police ranks follow a strict hierarchy (higher level = more authority):

#### Cadet (Level 1)
- **Responsibilities**:
  - Review initial complaints from citizens
  - Verify complainant information
  - Approve/reject complaint for officer review
  - Can reject complaints with feedback (max 3 rejections)

#### Patrol Officer (Level 2)
- **Responsibilities**:
  - Field patrol duties
  - Report suspicious activities
  - Initial crime scene documentation

#### Police Officer (Level 3)
- **Responsibilities**:
  - Report crime scenes
  - Create crime scene cases
  - Final approval for complaint-based cases
  - Add witnesses to cases

#### Detective (Level 4)
- **Responsibilities**:
  - Investigate assigned cases
  - Create and manage detective boards
  - Organize evidence and make connections
  - Identify suspects
  - Conduct interrogations
  - Provide guilt ratings (1-10)
  - Approve/reject public tip-offs

#### Sergeant (Level 5)
- **Responsibilities**:
  - Oversee investigations
  - Approve suspect identifications
  - Conduct interrogations
  - Provide guilt ratings (1-10)
  - Submit interrogation results to Captain
  - Approve bail amounts (for eligible suspects)

#### Captain (Level 6)
- **Responsibilities**:
  - Review interrogation results
  - Make final determination on guilt
  - Submit cases to trial (non-critical crimes)
  - Coordinate with sergeant and detective

#### Chief (Level 7)
- **Responsibilities**:
  - Handle critical-level crimes
  - Approve captain's decisions for critical cases
  - Submit critical cases to trial
  - Oversee major investigations

### Judicial Roles

#### Judge
- **Hierarchy Level**: 0 (non-police)
- **Responsibilities**:
  - Preside over trials
  - Review complete case files
  - Review all evidence
  - Interview involved police personnel
  - Deliver verdicts (guilty/innocent)
  - Assign punishments for guilty verdicts

#### Coroner (Forensic Examiner)
- **Hierarchy Level**: 0 (non-police)
- **Responsibilities**:
  - Analyze biological/medical evidence
  - Verify blood samples, fingerprints, hair
  - Provide forensic analysis reports
  - Identify remains

### Civilian Roles

#### Complainant
- File complaints about crimes
- Provide statements
- Track case status

#### Witness
- Provide testimony
- Submit evidence (photos, videos, audio)
- Attend trials if required

#### Suspect
- Person under investigation
- Subject to interrogation
- Can request bail (if eligible)

#### Criminal
- Convicted person
- Serving punishment
- Can pay fines (if eligible)

## Role Assignment

### Initial Registration
1. User registers with required information:
   - Username (unique)
   - Email (unique)
   - Phone number (unique)
   - National ID (unique)
   - First name
   - Last name
   - Password

2. System automatically assigns **Base User** role

3. Administrator manually assigns additional roles based on user's position

### Multiple Roles
- Users can have multiple roles simultaneously
- Example: A user might be both a Detective and a Sergeant (promotion case)
- Role permissions are cumulative

### Role Modification
Only administrators can:
- Create new roles
- Delete existing roles (except system roles)
- Modify role descriptions
- Assign/remove roles from users

## Permission Hierarchy

### Case Access

| Role | Create | Review/Approve | Investigate | Trial |
|------|--------|----------------|-------------|-------|
| Base User | Complaint only | View own | No | No |
| Cadet | No | Complaint review | No | No |
| Police Officer | Crime scene | Final approval | No | No |
| Detective | No | No | Yes | No |
| Sergeant | No | No | Supervise | No |
| Captain | No | No | No | Submit non-critical |
| Chief | No | No | No | Submit critical |
| Judge | No | No | No | Preside |

### Evidence Access

- **Add Evidence**: Police Officer, Detective, Sergeant
- **Verify Biological Evidence**: Coroner only
- **View Evidence**: All police ranks, Judge (during trial)

### Suspect Management

- **Identify Suspects**: Detective
- **Approve Pursuit**: Sergeant
- **Issue Arrest Warrant**: Sergeant
- **Conduct Interrogation**: Detective + Sergeant (together)

## API Endpoints

### Role Management
```
GET    /api/v1/accounts/roles/          # List all roles
POST   /api/v1/accounts/roles/          # Create role (admin only)
GET    /api/v1/accounts/roles/{id}/     # Get role details
PUT    /api/v1/accounts/roles/{id}/     # Update role (admin only)
DELETE /api/v1/accounts/roles/{id}/     # Delete role (admin only)
```

### User Role Assignment
```
POST /api/v1/accounts/users/{id}/assign_roles/
Body: {
  "role_ids": [1, 2, 3]
}
```

## See Also

- [[01-Overview|System Overview]]
- [[03-Case-Workflows|Case Workflows]]
- [[07-API-Reference|API Reference]]
