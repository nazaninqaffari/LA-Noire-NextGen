# Authentication System

## Overview

The LA Noire NextGen system uses a session-based authentication system built on Django REST Framework. This document covers the authentication endpoints, usage, and security considerations.

## Authentication Endpoints

### User Registration

**Endpoint:** `POST /api/v1/accounts/users/`

**Permission:** Public (AllowAny)

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "phone_number": "+11234567890",
  "national_id": "1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepassword123",
  "password_confirm": "securepassword123"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "phone_number": "+11234567890",
  "national_id": "1234567890",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Validation Rules:**
- Password must be at least 8 characters
- Password and password_confirm must match
- Username must be unique
- Email must be unique
- Phone number must be unique
- National ID must be unique

**Default Behavior:**
- All new users are automatically assigned the "Base User" role
- Users are active by default

### User Login

**Endpoint:** `POST /api/v1/accounts/login/`

**Permission:** Public (AllowAny)

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "phone_number": "+11234567890",
    "national_id": "1234567890",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "roles": [
      {
        "id": 1,
        "name": "Detective",
        "description": "Investigates cases and collects evidence",
        "is_police_rank": true,
        "hierarchy_level": 4,
        "created_at": "2026-01-05T10:00:00Z",
        "updated_at": "2026-01-05T10:00:00Z"
      }
    ],
    "is_active": true,
    "date_joined": "2026-01-05T10:00:00Z",
    "last_login": "2026-01-07T12:00:00Z"
  },
  "message": "Login successful"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid credentials:
```json
{
  "non_field_errors": [
    "Unable to log in with provided credentials."
  ]
}
```

- **400 Bad Request** - Inactive account:
```json
{
  "non_field_errors": [
    "User account is disabled."
  ]
}
```

**Session Handling:**
- Upon successful login, a session cookie is created
- The session cookie (`sessionid`) is automatically included in subsequent requests
- The cookie is HTTP-only and secure (in production)

### User Logout

**Endpoint:** `POST /api/v1/accounts/logout/`

**Permission:** Authenticated users only

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**Behavior:**
- Destroys the current session
- Clears the session cookie
- User must login again to access protected endpoints

### Get Current User Profile

**Endpoint:** `GET /api/v1/accounts/users/me/`

**Permission:** Authenticated users only

**Request Body:** None

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "phone_number": "+11234567890",
  "national_id": "1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "roles": [
    {
      "id": 1,
      "name": "Detective",
      "description": "Investigates cases",
      "is_police_rank": true,
      "hierarchy_level": 4
    }
  ],
  "is_active": true,
  "date_joined": "2026-01-05T10:00:00Z",
  "last_login": "2026-01-07T12:00:00Z"
}
```

## Authentication Flow

### Standard Authentication Flow

```
┌─────────┐                 ┌──────────┐                 ┌──────────┐
│ Client  │                 │   API    │                 │ Database │
└────┬────┘                 └────┬─────┘                 └────┬─────┘
     │                           │                            │
     │  1. POST /login/          │                            │
     │  {username, password}     │                            │
     ├──────────────────────────>│                            │
     │                           │                            │
     │                           │  2. Validate credentials   │
     │                           ├───────────────────────────>│
     │                           │                            │
     │                           │  3. User data              │
     │                           │<───────────────────────────┤
     │                           │                            │
     │  4. Session cookie        │                            │
     │  + User data              │                            │
     │<──────────────────────────┤                            │
     │                           │                            │
     │  5. GET /users/me/        │                            │
     │  Cookie: sessionid=...    │                            │
     ├──────────────────────────>│                            │
     │                           │                            │
     │                           │  6. Get user from session  │
     │                           ├───────────────────────────>│
     │                           │                            │
     │  7. User profile data     │                            │
     │<──────────────────────────┤                            │
     │                           │                            │
```

## Security Considerations

### Password Security

- Passwords are hashed using Django's default PBKDF2 algorithm
- Minimum password length: 8 characters
- Django's built-in password validators are enabled:
  - UserAttributeSimilarityValidator
  - MinimumLengthValidator
  - CommonPasswordValidator
  - NumericPasswordValidator

### Session Security

- Sessions are stored in the database
- Session cookies are:
  - HTTP-only (not accessible via JavaScript)
  - Secure (HTTPS only in production)
  - SameSite=Lax (CSRF protection)
- Session timeout: Default Django timeout (2 weeks)

### CSRF Protection

- CSRF middleware is enabled
- CSRF token is required for all state-changing operations
- Session authentication automatically handles CSRF tokens

### Best Practices

1. **Always use HTTPS in production**
2. **Set strong SECRET_KEY in production**
3. **Configure proper ALLOWED_HOSTS**
4. **Enable rate limiting on authentication endpoints**
5. **Implement account lockout after failed login attempts**
6. **Use secure session settings**

## Client Integration Examples

### JavaScript (Fetch API)

```javascript
// Login
async function login(username, password) {
  const response = await fetch('/api/v1/accounts/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important: include cookies
    body: JSON.stringify({ username, password }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('Logged in:', data.user);
    return data;
  } else {
    const error = await response.json();
    throw new Error(error.non_field_errors?.[0] || 'Login failed');
  }
}

// Get current user
async function getCurrentUser() {
  const response = await fetch('/api/v1/accounts/users/me/', {
    credentials: 'include', // Important: include cookies
  });
  
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error('Not authenticated');
  }
}

// Logout
async function logout() {
  const response = await fetch('/api/v1/accounts/logout/', {
    method: 'POST',
    credentials: 'include',
  });
  
  if (response.ok) {
    console.log('Logged out successfully');
  }
}
```

### Python (Requests)

```python
import requests

# Create a session to persist cookies
session = requests.Session()

# Login
response = session.post('http://localhost:8000/api/v1/accounts/login/', json={
    'username': 'johndoe',
    'password': 'securepassword123'
})

if response.status_code == 200:
    print('Logged in:', response.json()['user'])
else:
    print('Login failed:', response.json())

# Get current user (session cookie is automatically included)
response = session.get('http://localhost:8000/api/v1/accounts/users/me/')
print('Current user:', response.json())

# Logout
response = session.post('http://localhost:8000/api/v1/accounts/logout/')
print('Logged out')
```

### cURL

```bash
# Login and save cookies
curl -X POST http://localhost:8000/api/v1/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"securepassword123"}' \
  -c cookies.txt

# Get current user with saved cookies
curl -X GET http://localhost:8000/api/v1/accounts/users/me/ \
  -b cookies.txt

# Logout
curl -X POST http://localhost:8000/api/v1/accounts/logout/ \
  -b cookies.txt
```

## Troubleshooting

### Common Issues

**Issue: 403 Forbidden on POST requests**

Solution: CSRF token is required. Either:
1. Include the CSRF token in the `X-CSRFToken` header
2. Use session authentication with proper cookie handling
3. For development, you can temporarily exempt the endpoint from CSRF (not recommended for production)

**Issue: Session not persisting**

Solution:
1. Ensure `credentials: 'include'` in fetch requests
2. Check that cookies are not being blocked by browser
3. Verify CORS settings allow credentials
4. Check SESSION_COOKIE_SAMESITE and SESSION_COOKIE_SECURE settings

**Issue: 401 Unauthorized or 403 Forbidden**

Solution:
1. Verify user is logged in
2. Check session cookie is being sent
3. Verify user has required permissions
4. Check if session has expired

## Role-Based Access Control

See [User Roles Documentation](02-User-Roles.md) for details on:
- Available roles
- Role hierarchy
- Permission assignments
- Role management
