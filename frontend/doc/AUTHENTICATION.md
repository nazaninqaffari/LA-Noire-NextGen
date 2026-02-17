# Authentication System Documentation

## Overview

The LA Noire NextGen authentication system supports flexible user login using multiple identifier types (username, email, phone number, or national ID) combined with a password. New users can register through a comprehensive registration form, and all accounts start with a "Normal User" role that can be elevated by system administrators.

## User Registration

### Registration Process

1. **User Self-Registration**
   - Users fill out a comprehensive registration form
   - Required fields:
     - Username (minimum 3 characters, unique)
     - Password (minimum 8 characters)
     - Confirm Password (must match)
     - Email (valid format, unique)
     - Phone Number (10-15 digits, unique)
     - First Name
     - Last Name
     - National ID (minimum 8 characters, unique)

2. **Initial Account Creation**
   - Account is created with "Normal User" role by default
   - Account may require administrator approval depending on system configuration

3. **Role Assignment**
   - System administrators assign additional roles as needed
   - Roles are dynamic and can be created/modified/deleted by admins
   - Multiple roles can be assigned to a single user

### Registration API Endpoint

**POST** `/auth/register/`

**Request Body:**
```json
{
  "username": "cole_phelps",
  "password": "SecurePass123!",
  "email": "cole.phelps@lapd.gov",
  "phone_number": "2135551234",
  "first_name": "Cole",
  "last_name": "Phelps",
  "national_id": "CA123456789"
}
```

**Success Response (201 Created):**
```json
{
  "id": 1,
  "username": "cole_phelps",
  "email": "cole.phelps@lapd.gov",
  "phone_number": "2135551234",
  "first_name": "Cole",
  "last_name": "Phelps",
  "national_id": "CA123456789",
  "role": {
    "id": 1,
    "name": "Normal User",
    "hierarchy_level": 10
  },
  "is_active": true,
  "date_joined": "2026-02-16T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors (duplicate username/email/phone/national_id, weak password, etc.)
- `500 Internal Server Error`: Server-side error

### Frontend Registration Component

Location: `/frontend/src/pages/Register.tsx`

**Features:**
- Multi-section form (Personal Info, Contact Info, Credentials)
- Real-time client-side validation
- Field-specific error messages
- Loading skeleton during submission
- Success notification with auto-redirect to login
- Responsive design for mobile devices
- Film Noir themed styling

**Validation Rules:**
- Username: Required, minimum 3 characters
- Email: Required, valid email format
- Phone: Required, 10-15 digits
- National ID: Required, minimum 8 characters
- First/Last Name: Required, non-empty
- Password: Required, minimum 8 characters
- Confirm Password: Must match password

## User Login

### Multi-Identifier Login

Users can log in using **ANY** of the following identifiers combined with their password:

1. **Username**: `cole_phelps`
2. **Email**: `cole.phelps@lapd.gov`
3. **Phone Number**: `2135551234`
4. **National ID**: `CA123456789`

All identifiers are unique in the system, so any can be used for authentication.

### Login API Endpoint

**POST** `/auth/login/`

**Request Body:**
```json
{
  "identifier": "cole_phelps",  // Can be username, email, phone, or national_id
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "cole_phelps",
    "email": "cole.phelps@lapd.gov",
    "first_name": "Cole",
    "last_name": "Phelps",
    "role": {
      "id": 2,
      "name": "Detective",
      "hierarchy_level": 5
    }
  }
}
```

**Authentication Method:**
- Session-based authentication with HTTP-only cookies
- CSRF protection enabled
- Cookies set with SameSite=Lax, Secure (in production)

**Error Responses:**
- `400 Bad Request`: Missing identifier or password
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account not active
- `500 Internal Server Error`: Server-side error

### Frontend Login Component

Location: `/frontend/src/pages/Login.tsx`

**Features:**
- Single identifier input that accepts any login method
- Clear instructions for users
- Real-time validation
- Loading state with skeleton
- Success/error notifications
- "Forgot Password" link
- "Create Account" link to registration
- Information box about role assignment
- Responsive design
- Film Noir themed styling with LAPD badge

## Logout

### Logout API Endpoint

**POST** `/auth/logout/`

**Success Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

## Session Management

### Current User Endpoint

**GET** `/auth/me/`

**Headers:**
```
Cookie: sessionid=<session_token>
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "username": "cole_phelps",
  "email": "cole.phelps@lapd.gov",
  "phone_number": "2135551234",
  "first_name": "Cole",
  "last_name": "Phelps",
  "role": {
    "id": 2,
    "name": "Detective",
    "hierarchy_level": 5,
    "description": "Investigates crimes and gathers evidence"
  },
  "is_active": true,
  "date_joined": "2026-02-16T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated

### Frontend Auth Service

Location: `/frontend/src/services/auth.ts`

**Functions:**
- `login(identifier, password)`: Authenticate user
- `logout()`: End user session
- `getCurrentUser()`: Fetch current authenticated user
- `useAuth()`: React hook for auth state

## Notification System

The authentication system is integrated with a comprehensive notification system to provide user feedback.

### Notification Types

1. **Success** (Green): Successful login, successful registration
2. **Error** (Red): Login failed, registration failed, validation errors
3. **Warning** (Yellow): Missing fields, incomplete data
4. **Info** (Blue): General information, system messages

### Notification Features

- Auto-dismiss after configurable duration (default 5 seconds)
- Manual dismiss option
- Multiple simultaneous notifications
- Slide-in animations
- Accessible with ARIA labels
- Mobile-responsive
- Film Noir themed styling

### Frontend Notification Components

**NotificationContext** (`/frontend/src/contexts/NotificationContext.tsx`):
- Global state management for notifications
- `useNotification()` hook for easy access

**Notification Component** (`/frontend/src/components/Notification.tsx`):
- Individual notification display
- Type-based styling (success, error, warning, info)

**NotificationContainer** (`/frontend/src/components/NotificationContainer.tsx`):
- Renders all active notifications
- Fixed position in top-right corner

### Usage Example

```typescript
import { useNotification } from '../contexts/NotificationContext';

const MyComponent = () => {
  const { addNotification } = useNotification();

  const handleAction = () => {
    addNotification({
      type: 'success',
      title: 'Action Complete',
      message: 'Your action was successful',
      duration: 3000,
    });
  };

  return <button onClick={handleAction}>Do Something</button>;
};
```

## Loading States

### Skeleton Components

The system includes skeleton loader components for better UX during data fetching.

**Available Skeletons:**
- `Skeleton`: Basic text/rectangular/circular skeleton
- `SkeletonCard`: Card-shaped placeholder
- `SkeletonTable`: Table placeholder
- `SkeletonStats`: Dashboard stats placeholder
- `SkeletonForm`: Form placeholder (used in login/register)

**Usage in Login/Register:**
- Displayed during form submission
- Shows loading spinner and skeleton form fields
- Prevents multiple submissions
- Provides visual feedback

## Security Features

### Client-Side

1. **Input Validation**
   - Required field validation
   - Format validation (email, phone)
   - Length validation (password, username)
   - Password matching validation

2. **CSRF Protection**
   - CSRF token extracted from cookies
   - Automatically included in all API requests
   - Configured in Axios interceptor

3. **Secure Password Handling**
   - Password fields use `type="password"`
   - AutoComplete attributes configured
   - Passwords never logged or exposed

### Server-Side

1. **Password Hashing**
   - Passwords hashed with bcrypt
   - Never stored in plain text

2. **Session Security**
   - HTTP-only cookies
   - SameSite policy
   - Secure flag in production

3. **Rate Limiting**
   - Login attempt rate limiting (configured on backend)
   - Registration rate limiting

4. **Input Sanitization**
   - All inputs sanitized on backend
   - SQL injection prevention with ORM
   - XSS prevention

## Testing

### Test Files

1. **Login Component Tests**: `/frontend/tests/components/Login.test.tsx`
2. **Register Component Tests**: `/frontend/tests/components/Register.test.tsx`
3. **Notification Tests**: `/frontend/tests/components/Notification.test.tsx`
4. **Auth Service Tests**: `/frontend/tests/services/auth.test.ts`

### Test Coverage

- Component rendering
- Form submission
- Validation logic
- Error handling
- Success flows
- API integration
- Notification display

## Responsive Design

All authentication components are fully responsive:

**Mobile (<768px):**
- Full-width forms
- Stacked form fields
- Larger touch targets
- Reduced spacing
- Simplified layouts

**Tablet (768px-1024px):**
- Optimized form widths
- Balanced spacing
- Appropriate font sizes

**Desktop (>1024px):**
- Side-by-side form fields (when appropriate)
- Maximum widths for readability
- Enhanced visual effects

## Accessibility

- Keyboard navigation support
- ARIA labels on all interactive elements
- Focus indicators (gold outline)
- Error announcements
- Screen reader friendly
- High contrast ratios (WCAG AA compliant)
- Semantic HTML structure

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - SMS or email verification codes
   - Authenticator app support

2. **Password Reset Flow**
   - Email-based password reset
   - Security questions

3. **Social Login**
   - OAuth integration
   - SSO support

4. **Biometric Authentication**
   - Fingerprint/Face ID on mobile devices

5. **Session Management**
   - View active sessions
   - Revoke sessions
   - Device tracking

## Related Documentation

- [User Roles Documentation](../../backend/doc/02-User-Roles.md)
- [API Reference](../../backend/doc/07-API-Reference.md)
- [Design System](../DESIGN_SYSTEM.md)
- [Testing Guide](../../backend/doc/09-Testing-Guide.md)

---

**Last Updated:** February 16, 2026  
**Version:** 1.0
