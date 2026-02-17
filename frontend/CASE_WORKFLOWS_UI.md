# Case Workflow UI - Implementation Guide

## Overview
Complete implementation of the case management workflow system for LA Noire NextGen, featuring Film Noir themed UI components for complaint filing, crime scene reporting, and multi-level case review processes.

## Architecture

### Pages Implemented

#### 1. **Cases List Page** (`/cases`)
- **File**: `src/pages/Cases.tsx` + `.css`
- **Features**:
  - Paginated case display with card layout
  - Advanced filtering (status, crime level, search)
  - Empty states for no results
  - Quick action buttons for filing complaints and crime scenes
  - Loading skeletons during data fetch
- **Components Used**: CaseCard, CaseStatusBadge, CrimeLevelBadge, LoadingSkeleton
- **API**: `getCases()` with filter params

#### 2. **Complaint Creation** (`/cases/complaint/new`)
- **File**: `src/pages/CreateComplaint.tsx` + `.css`
- **Features**:
  - Citizen-initiated case formation
  - Fields: title, description, crime_level, complainant_statement
  - Crime severity selector with descriptions
  - Process information showing review workflow
  - Form validation
  - Success notification + redirect
- **API**: `createComplaintCase()`
- **Workflow**: Draft → Cadet Review → Officer Review → Open

#### 3. **Crime Scene Report** (`/cases/scene/new`)
- **File**: `src/pages/CreateCrimeScene.tsx` + `.css`
- **Features**:
  - Officer-initiated case formation
  - Additional fields: crime_scene_location, crime_scene_datetime
  - Dynamic witness data (add/remove witnesses)
  - Witness fields: full_name, phone_number, national_id
  - Officer guidelines display
  - Form validation for all witnesses
- **API**: `createSceneCase()`
- **Workflow**: Officer Review (Supervisor) → Open

#### 4. **Case Detail View** (`/cases/:id`)
- **File**: `src/pages/CaseDetail.tsx` + `.css`
- **Features**:
  - Complete case information display
  - Review history timeline
  - Formation-specific details (complaint statement OR crime scene data)
  - Witness information for crime scenes
  - Review action button when case is in review status
  - Two-column layout: case info + review history
- **APIs**: `getCase()`, `getCaseReviewHistory()`

#### 5. **Case Review Interface** (`/cases/:id/review`)
- **File**: `src/pages/CaseReview.tsx` + `.css`
- **Features**:
  - Role-based review (Cadet OR Officer)
  - Approve/Reject decision buttons
  - Mandatory rejection reason for rejections
  - Full case summary display
  - Review guidelines per role
  - Auto-detection of reviewer role from case status
  - 3-rejection limit warning for cadet reviews
- **APIs**: `submitCadetReview()`, `submitOfficerReview()`

### Components Implemented

#### 1. **CaseCard Component**
- **File**: `src/components/CaseCard.tsx` + `.css`
- **Purpose**: Reusable case display card for lists
- **Features**:
  - Status and crime level badges
  - Case metadata (ID, dates, creator, assigned officer)
  - Formation type indicator
  - Hover effects and animations
  - Responsive design

#### 2. **CaseStatusBadge Component**
- **File**: `src/components/CaseStatusBadge.tsx` + `.css`
- **Purpose**: Visual indicator for case status
- **Statuses Supported** (11 total):
  - draft (gray/silver)
  - cadet_review (yellow/warning)
  - officer_review (yellow/warning)
  - rejected (red/crimson)
  - open (gold)
  - under_investigation (blue)
  - suspects_identified (blue)
  - arrest_approved (brass)
  - interrogation (yellow-brown)
  - trial_pending (brass)
  - closed (green)

#### 3. **CrimeLevelBadge Component**
- **File**: `src/components/CrimeLevelBadge.tsx` + `.css`
- **Purpose**: Display crime severity
- **Levels**:
  - 0: Critical (red/crimson)
  - 1: Major (yellow)
  - 2: Medium (brass)
  - 3: Minor (silver)

### Service Layer

**File**: `src/services/case.ts`

9 API functions implemented:
1. `getCases(params)` - Fetch paginated/filtered cases
2. `getCase(id)` - Fetch single case
3. `createComplaintCase(data)` - Create complaint
4. `createSceneCase(data)` - Create crime scene report
5. `submitCadetReview(id, data)` - Cadet approval/rejection
6. `submitOfficerReview(id, data)` - Officer approval/rejection
7. `getCaseReviewHistory(id)` - Fetch review audit trail
8. `deleteCase(id)` - Delete case
9. `updateCase(id, data)` - Update draft case

### Type System

**File**: `src/types/index.ts`

Extended with case workflow types:
- `CaseStatus` - 11 status enum
- `CaseFormationType` - 'complaint' | 'crime_scene'
- `WitnessData` - Witness information structure
- `Case` interface - Extended with workflow fields
- `CaseCreateComplaintData` - Complaint creation payload
- `CaseCreateSceneData` - Crime scene creation payload
- `CaseReviewData` - Review decision payload
- `CaseReviewHistory` - Review audit interface

## Routing Configuration

**File**: `src/App.tsx`

Routes added:
```tsx
/cases                    → Cases list page
/cases/:id                → Case detail view
/cases/:id/review         → Review interface
/cases/complaint/new      → Complaint creation
/cases/scene/new          → Crime scene report
```

## Design System Integration

All pages follow the established Film Noir theme:

### Colors
- **Primary**: Gold (#D4AF37) for primary actions, open cases
- **Secondary**: Brass (#B8860B) for medium priority
- **Danger**: Crimson (#B22222) for rejections, critical cases
- **Success**: Green (#2ECC71) for closed/successful cases
- **Info**: Evidence Blue (#4682B4) for investigations
- **Warning**: Golden yellow for pending reviews

### Typography
- **Headings**: Playfair Display (serif, elegant)
- **Body**: Crimson Text (readable, vintage)
- **UI Elements**: Special Elite (typewriter monospace)

### Components
- Transparent card backgrounds with borders
- Film grain texture overlays
- Vintage badges and labels
- Smooth animations and transitions
- Responsive grid layouts

## Workflow Rules Implementation

### Complaint Path
1. **Citizen** files complaint → Status: `draft`
2. **Cadet** reviews → Status: `cadet_review`
   - Can approve (→ officer_review) or reject (→ feedback to citizen)
   - 3 rejections = permanently closed
3. **Officer** reviews → Status: `officer_review`
   - Can approve (→ open) or reject (→ back to cadet)
4. Case **opened** → Status: `open`

### Crime Scene Path
1. **Officer** reports scene → Status: `officer_review`
2. **Supervisor** approves → Status: `open`
3. **Chief** reports = auto-approved → Status: `open`

### Review Limits
- Cadet rejections tracked
- After 3 cadet rejections: case permanently rejected
- Officer rejection sends back to cadet (not to complainant)

## User Permissions (Ready for Implementation)

While not yet enforced in UI, the structure supports:
- **Citizens**: Create complaints only
- **Cadets**: Review complaints
- **Officers**: Create crime scenes, review after cadets
- **Chief**: All permissions, auto-approve own reports

## API Integration

All pages use Axios with:
- CSRF token handling (from `api.ts`)
- JWT authentication (when implemented)
- Error handling with user notifications
- Loading states during async operations

## Notification System Integration

All pages use `useNotification()` hook:
```tsx
const { showNotification } = useNotification();

// Success
showNotification('Case created successfully', 'success');

// Error
showNotification('Failed to submit review', 'error');

// Warning
showNotification('Case has been rejected 2 times', 'warning');
```

## Responsive Design

All pages are fully responsive:
- **Desktop** (>1024px): Full grid layouts, side-by-side columns
- **Tablet** (768-1024px): Adapted layouts, stacked sections
- **Mobile** (<768px): Single column, full-width buttons, touch-friendly

## Testing Checklist

### Unit Tests (To Do)
- [ ] CaseCard rendering with different statuses
- [ ] CaseStatusBadge displays correct labels
- [ ] CrimeLevelBadge color coding
- [ ] Form validation in CreateComplaint
- [ ] Witness add/remove in CreateCrimeScene

### Integration Tests (To Do)
- [ ] Complete complaint workflow
- [ ] Complete crime scene workflow
- [ ] Review approval/rejection flow
- [ ] 3-rejection limit enforcement
- [ ] Review history display

### E2E Tests (To Do)
- [ ] Citizen files complaint → Cadet approves → Officer approves → Case opens
- [ ] Officer creates crime scene → Supervisor approves → Case opens
- [ ] Cadet rejects 3 times → Case permanently closed

## Performance Optimizations

- Lazy loading for case lists (pagination)
- Optimistic UI updates for reviews
- Debounced search input
- Cached case data
- Loading skeletons for better UX

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly

## Next Steps

1. **Authentication Integration**: Connect with user role system
2. **Role-Based Access Control**: Enforce permissions in UI
3. **Real-Time Updates**: WebSocket for live case status changes
4. **Evidence Attachments**: File upload support for cases
5. **Advanced Filters**: Date ranges, assignee filters, location filters
6. **Case Assignment**: Interface for assigning cases to officers
7. **Bulk Operations**: Select multiple cases for batch actions
8. **Export**: PDF/CSV export of cases
9. **Analytics Dashboard**: Case statistics and metrics
10. **Mobile App**: Native mobile experience

## Files Created

### Pages (10 files)
- `src/pages/Cases.tsx` + `.css`
- `src/pages/CreateComplaint.tsx` + `.css`
- `src/pages/CreateCrimeScene.tsx` + `.css`
- `src/pages/CaseDetail.tsx` + `.css`
- `src/pages/CaseReview.tsx` + `.css`

### Components (6 files)
- `src/components/CaseCard.tsx` + `.css`
- `src/components/CaseStatusBadge.tsx` + `.css`
- `src/components/CrimeLevelBadge.tsx`

### Services (1 file)
- `src/services/case.ts`

### Types (Modified)
- `src/types/index.ts` (extended)
- `src/types/notification.ts` (added showNotification)

### Context (Modified)
- `src/contexts/NotificationContext.tsx` (added showNotification helper)

### Routing (Modified)
- `src/App.tsx` (added 5 case routes)

## Development Server

Run `npm run dev` from `/frontend` directory.
Access at: http://localhost:3001/

## Documentation

Backend case workflow documentation: `/doc/03-Case-Workflows.md`
Design system: `/frontend/DESIGN_SYSTEM.md`
