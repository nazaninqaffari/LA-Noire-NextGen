# Critical Bug Fix: Authentication & API Endpoint URLs

## Issue
Login/Register were failing with 404 errors because the frontend was hitting wrong URLs:
- **Trying:** `/api/accounts/login/` ❌
- **Expected:** `/api/v1/accounts/login/` ✅

The HTML 404 page was being returned as error, showing character-by-character in the error message.

## Root Cause
Inconsistent API baseURL configuration:
- `api.ts` had `baseURL: '/api'`
- Services were using `/v1/accounts/...` paths
- But axios was concatenating them incorrectly

## What Was Fixed

### 1. **API Base URL** ([api.ts](frontend/src/services/api.ts))
```typescript
// BEFORE
baseURL: '/api',

// AFTER
baseURL: '/api/v1',
```

### 2. **Auth Service URLs** ([auth.ts](frontend/src/services/auth.ts))
All endpoints updated to be relative (removed `/v1` prefix):
```typescript
// BEFORE
'/v1/accounts/login/'
'/v1/accounts/logout/'
'/v1/accounts/users/'
'/v1/accounts/users/me/'

// AFTER
'/accounts/login/'
'/accounts/logout/'
'/accounts/users/'
'/accounts/users/me/'
```

### 3. **Case Service URLs** ([case.ts](frontend/src/services/case.ts))
```typescript
// BEFORE
const CASES_BASE_URL = '/api/v1/cases/cases';

// AFTER
const CASES_BASE_URL = '/cases/cases';
```

## URL Resolution
Now all API calls correctly resolve:
```
api.baseURL    + service path      = final URL
'/api/v1'      + '/accounts/login/' = '/api/v1/accounts/login/' ✅
'/api/v1'      + '/cases/cases/'    = '/api/v1/cases/cases/' ✅
```

## Testing Added

### Frontend Unit Tests
**New File:** [tests/auth.test.ts](frontend/tests/auth.test.ts)

Tests cover:
- ✅ Login with valid credentials
- ✅ Login with invalid credentials  
- ✅ Login with disabled account
- ✅ Registration with valid data
- ✅ Registration with duplicate username
- ✅ Registration with duplicate email
- ✅ Registration with mismatched passwords
- ✅ Logout
- ✅ Get current user profile
- ✅ Unauthenticated requests

All tests verify correct endpoint URLs and response structures.

## Verification Steps

1. **Build Test:**
   ```bash
   cd frontend && npm run build
   ```
   ✅ Builds successfully

2. **Unit Tests:**
   ```bash
   cd frontend && npm test
   ```
   ✅ All auth tests pass

3. **Manual Test:**
   - Start backend: `cd backend && python manage.py runserver`
   - Start frontend: `cd frontend && npm run dev`
   - Try login with existing credentials
   - ✅ Should work now

## Files Changed
1. `frontend/src/services/api.ts` - Fixed baseURL
2. `frontend/src/services/auth.ts` - Fixed all endpoint paths
3. `frontend/src/services/case.ts` - Fixed base URL
4. `frontend/tests/auth.test.ts` - NEW (comprehensive test suite)
5. `frontend/src/utils/errorHandler.ts` - Already fixed in previous commit
6. All page components - Already using errorHandler from previous commit

## Backend Endpoints (Verified Correct)
```
POST /api/v1/accounts/login/      # Login
POST /api/v1/accounts/logout/     # Logout  
POST /api/v1/accounts/users/      # Register
GET  /api/v1/accounts/users/me/   # Current user
GET  /api/v1/cases/cases/         # List cases
POST /api/v1/cases/cases/         # Create case
```

## Next Steps
- [x] Fix API URLs
- [x] Add comprehensive tests
- [x] Verify build succeeds
- [ ] Manual testing with real backend
- [ ] Integration tests (optional enhancement)

## Notes
This was the actual issue - not the error handling (which was fixed previously), but the fundamental API endpoint URLs being wrong. The error handler was correctly showing the backend response (HTML 404 page), which made the real issue visible.
