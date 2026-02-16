# Testing Quick Reference

## Quick Commands

### Running Tests

```bash
# Run all tests
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/

# Run specific test file
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/test_accounts.py

# Run with coverage
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/ --cov=apps --cov-report=html

# Run in parallel
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/ -n auto
```

### Using Test Runner

```bash
# Unit tests
python run_tests.py unit -v -c

# All tests
python run_tests.py all -p -c

# Stress tests
python run_tests.py stress --users 100 --spawn-rate 10 --duration 60s

# Stress tests with UI
python run_tests.py stress-web

# View coverage
python run_tests.py coverage
```

## Test Status

### Accounts App Tests (21/21 passing ✅)

#### User Registration
- ✅ test_user_registration_success
- ✅ test_user_registration_password_mismatch
- ✅ test_user_registration_duplicate_username
- ✅ test_user_registration_duplicate_email
- ✅ test_user_registration_short_password

#### User Login
- ✅ test_login_success
- ✅ test_login_invalid_password
- ✅ test_login_nonexistent_user
- ✅ test_login_inactive_user
- ✅ test_login_missing_credentials

#### Session Management
- ✅ test_logout_success
- ✅ test_logout_without_authentication

#### User Profile
- ✅ test_get_current_user_profile
- ✅ test_get_profile_without_authentication

#### Role Management
- ✅ test_create_role
- ✅ test_list_roles
- ✅ test_filter_roles_by_police_rank
- ✅ test_assign_roles_to_user

#### User Filtering
- ✅ test_search_users_by_username
- ✅ test_search_users_by_email
- ✅ test_filter_users_by_active_status

## Authentication Endpoints

### Register
```bash
POST /api/v1/accounts/users/
{
  "username": "user",
  "email": "user@example.com",
  "phone_number": "+11234567890",
  "national_id": "1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "password": "secure123",
  "password_confirm": "secure123"
}
```

### Login
```bash
POST /api/v1/accounts/login/
{
  "username": "user",
  "password": "secure123"
}
```

### Logout
```bash
POST /api/v1/accounts/logout/
```

### Get Profile
```bash
GET /api/v1/accounts/users/me/
```

## Common Test Patterns

### Basic Test
```python
@pytest.mark.django_db
def test_something(api_client):
    response = api_client.get('/endpoint/')
    assert response.status_code == 200
```

### Authenticated Test
```python
@pytest.mark.django_db
def test_authenticated(authenticated_client):
    response = authenticated_client.get('/protected/')
    assert response.status_code == 200
```

### With Fixtures
```python
@pytest.mark.django_db
def test_with_user(test_user, api_client):
    api_client.force_authenticate(user=test_user)
    response = api_client.get('/endpoint/')
    assert response.status_code == 200
```

## Available Fixtures

- `api_client` - Unauthenticated API client
- `authenticated_client` - Pre-authenticated API client with test_user
- `test_user` - Basic test user
- `admin_user` - Admin/superuser
- `detective_user` - User with Detective role
- `captain_user` - User with Captain role
- `detective_role` - Detective role
- `captain_role` - Captain role
- `base_role` - Base User role

## Test Data Factories

```python
from tests.factories import UserFactory, RoleFactory

# Create user
user = UserFactory(username='test', password='pass123')

# Create multiple users
users = UserFactory.create_batch(10)

# Create role
role = RoleFactory(name='Detective', hierarchy_level=4)

# Create user with role
user = UserFactory(roles=[role])
```

## Debugging

```bash
# Verbose output
pytest tests/ -v

# Show print statements
pytest tests/ -s

# Stop on first failure
pytest tests/ -x

# Show local variables
pytest tests/ -l

# Debug on failure
pytest tests/ --pdb
```

## Coverage Goals

- **Current**: ~88% (accounts app)
- **Target**: 85% overall
- **Critical paths**: 95%+

## Next Testing Priorities

1. ⏳ Cases app tests
2. ⏳ Evidence app tests
3. ⏳ Investigation app tests
4. ⏳ Trial app tests
5. ⏳ Integration tests
6. ⏳ E2E tests
