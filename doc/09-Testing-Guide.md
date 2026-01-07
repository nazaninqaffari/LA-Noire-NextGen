# Testing Guide

## Overview

The LA Noire NextGen project uses a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test interactions between components
- **Stress Tests**: Test system performance under load
- **Coverage Reports**: Track code coverage

## Testing Stack

### Core Testing Tools

- **pytest**: Modern Python testing framework
- **pytest-django**: Django integration for pytest
- **pytest-xdist**: Parallel test execution
- **pytest-cov**: Code coverage reporting
- **Factory Boy**: Test data generation
- **Faker**: Realistic fake data generation
- **Locust**: Load and stress testing

### Test Structure

```
tests/
├── __init__.py              # Test package initialization
├── conftest.py              # Pytest fixtures and configuration
├── base.py                  # Base test classes with auth support
├── factories.py             # Factory Boy factories for test data
├── test_accounts.py         # Unit tests for accounts app
├── test_cases.py            # Unit tests for cases app (future)
├── test_evidence.py         # Unit tests for evidence app (future)
└── stress_tests.py          # Locust stress tests
```

## Running Tests

### Quick Start

```bash
# Install test dependencies (already in requirements.txt)
pip install pytest pytest-django pytest-xdist pytest-cov locust factory-boy faker freezegun

# Run all unit tests
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/

# Run specific test file
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/test_accounts.py

# Run specific test class
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/test_accounts.py::TestUserRegistration

# Run specific test
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/test_accounts.py::TestUserRegistration::test_user_registration_success
```

### Using the Test Runner Script

The project includes a convenient test runner script:

```bash
# Run unit tests
python run_tests.py unit

# Run unit tests with verbose output
python run_tests.py unit -v

# Run unit tests with coverage
python run_tests.py unit -c

# Run all tests
python run_tests.py all

# Run all tests in parallel
python run_tests.py all -p

# Run stress tests (headless mode)
python run_tests.py stress --users 100 --spawn-rate 10 --duration 60s

# Run stress tests with web UI
python run_tests.py stress-web

# Open coverage report
python run_tests.py coverage
```

## Unit Tests

### Test Categories

#### 1. User Registration Tests

Tests for user registration endpoint:

- ✅ Successful registration
- ✅ Password mismatch validation
- ✅ Duplicate username handling
- ✅ Duplicate email handling
- ✅ Short password validation

**Example:**
```python
@pytest.mark.django_db
def test_user_registration_success(api_client, base_role):
    """Test successful user registration."""
    data = {
        'username': 'newuser',
        'email': 'newuser@example.com',
        'phone_number': '+11234567899',
        'national_id': '9876543210',
        'first_name': 'New',
        'last_name': 'User',
        'password': 'securepass123',
        'password_confirm': 'securepass123'
    }
    
    response = api_client.post('/api/v1/accounts/users/', data)
    
    assert response.status_code == 201
    assert 'id' in response.data
    assert response.data['username'] == 'newuser'
```

#### 2. User Login Tests

Tests for authentication endpoints:

- ✅ Successful login
- ✅ Invalid password handling
- ✅ Nonexistent user handling
- ✅ Inactive user handling
- ✅ Missing credentials validation

#### 3. Session Management Tests

Tests for logout and session handling:

- ✅ Successful logout
- ✅ Logout without authentication

#### 4. User Profile Tests

Tests for profile endpoints:

- ✅ Get current user profile
- ✅ Get profile without authentication

#### 5. Role Management Tests

Tests for role CRUD operations:

- ✅ Create role
- ✅ List roles
- ✅ Filter roles by police rank
- ✅ Assign roles to user

#### 6. User Filtering Tests

Tests for search and filter functionality:

- ✅ Search users by username
- ✅ Search users by email
- ✅ Filter users by active status

### Using Fixtures

The test suite includes reusable fixtures defined in `conftest.py`:

```python
# Basic fixtures
def test_with_client(api_client):
    """api_client provides an API client."""
    pass

def test_with_auth(authenticated_client, test_user):
    """authenticated_client is pre-authenticated with test_user."""
    pass

# User fixtures
def test_with_users(test_user, admin_user, detective_user, captain_user):
    """Various pre-created users with different roles."""
    pass

# Role fixtures
def test_with_roles(detective_role, captain_role, base_role):
    """Pre-created roles for testing."""
    pass
```

### Using Factory Boy

Create test data easily with factories:

```python
from tests.factories import UserFactory, RoleFactory

def test_with_factory():
    # Create a user with default values
    user = UserFactory()
    
    # Create a user with specific values
    user = UserFactory(
        username='detective',
        first_name='John',
        password='testpass123'
    )
    
    # Create a role
    role = RoleFactory(
        name='Detective',
        is_police_rank=True,
        hierarchy_level=4
    )
    
    # Create a user with roles
    user = UserFactory(roles=[role])
    
    # Create multiple users
    users = UserFactory.create_batch(10)
```

## Stress Tests

### What are Stress Tests?

Stress tests simulate multiple concurrent users accessing the API to:

- Identify performance bottlenecks
- Test system behavior under load
- Measure response times
- Detect memory leaks
- Validate rate limiting

### Running Stress Tests

#### Headless Mode (Command Line)

```bash
# Start the development server first
cd src
python manage.py runserver

# In another terminal, run stress tests
locust -f tests/stress_tests.py --host=http://localhost:8000 \
  --users 100 --spawn-rate 10 --run-time 60s --headless

# Or use the test runner
python run_tests.py stress --users 100 --spawn-rate 10 --duration 60s
```

#### Web UI Mode

```bash
# Start Locust with web interface
locust -f tests/stress_tests.py --host=http://localhost:8000

# Or use the test runner
python run_tests.py stress-web

# Then open http://localhost:8089 in your browser
```

### Stress Test Scenarios

#### 1. Authentication Stress Test

Tests authentication endpoints with mixed users:

- 40% authenticated users performing various operations
- 60% unauthenticated users (login/register attempts)

**Simulated Operations:**
- User registration (weight: 5)
- User login attempts (weight: 10)
- Profile retrieval (weight: 3)
- User listing (weight: 2)
- Role listing (weight: 2)
- User search (weight: 1)
- User filtering (weight: 1)

#### 2. Registration Stress Test

Focused test on user registration endpoint:

- Rapid registration of new users
- Tests unique constraint handling
- Validates database transaction handling

#### 3. Login Stress Test

Focused test on login endpoint:

- Repeated login/logout cycles
- Tests session creation/destruction
- Validates session management

### Interpreting Results

#### Key Metrics

- **RPS (Requests Per Second)**: Number of requests handled per second
- **Response Time**: Average, median, 95th percentile response times
- **Failure Rate**: Percentage of failed requests
- **Users**: Number of simulated concurrent users

#### Example Output

```
Type     Name                          # reqs      # fails  |     Avg     Min     Max  Median  |   req/s failures/s
--------|------------------------------|-----------|---------|-------|-------|-------|-------|--------|----------
POST     /api/v1/accounts/login/       1500        10       |     120      45     890     110   |   25.0       0.17
POST     /api/v1/accounts/logout/      1450         0       |      35      20     180      32   |   24.2       0.00
GET      /api/v1/accounts/users/       800          0       |      85      40     320      78   |   13.3       0.00
POST     /api/v1/accounts/users/       300          5       |     250     120    1200     230   |    5.0       0.08
--------|------------------------------|-----------|---------|-------|-------|-------|-------|--------|----------
         Aggregated                    4050        15       |      98      20    1200      85   |   67.5       0.25
```

#### What to Look For

✅ **Good Signs:**
- Low failure rate (<1%)
- Consistent response times
- High RPS capacity
- No memory leaks

⚠️ **Warning Signs:**
- Increasing response times
- High failure rate (>5%)
- Errors in logs
- Memory usage growing continuously

## Code Coverage

### Generating Coverage Reports

```bash
# Run tests with coverage
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/ --cov=apps --cov-report=html --cov-report=term-missing

# Or use the test runner
python run_tests.py all -c

# Open the HTML report
python run_tests.py coverage
```

### Coverage Report Example

```
Name                                   Stmts   Miss  Cover   Missing
--------------------------------------------------------------------
apps/__init__.py                          0      0   100%
apps/accounts/__init__.py                 1      0   100%
apps/accounts/models.py                  70     10    86%   41, 150-158
apps/accounts/serializers.py             49      5    90%   45-49
apps/accounts/views.py                   67      8    88%   120-127
apps/accounts/urls.py                     7      0   100%
--------------------------------------------------------------------
TOTAL                                   194     23    88%
```

### Coverage Goals

- **Minimum**: 70% coverage
- **Target**: 85% coverage
- **Ideal**: 90%+ coverage

**Note:** 100% coverage is not always necessary or practical. Focus on:
- Critical business logic
- Authentication and authorization
- Data validation
- Error handling

## Testing Best Practices

### 1. Test Organization

```python
@pytest.mark.django_db
class TestFeatureName:
    """Test suite for specific feature."""
    
    def test_success_case(self):
        """Test successful operation."""
        pass
    
    def test_validation_error(self):
        """Test validation error handling."""
        pass
    
    def test_edge_case(self):
        """Test edge case."""
        pass
```

### 2. Test Naming

- Use descriptive names: `test_user_registration_with_invalid_email`
- Follow pattern: `test_<what>_<condition>_<expected_result>`
- Be specific: `test_login_inactive_user` not `test_login_fail`

### 3. Test Independence

```python
# ✅ Good: Each test is independent
def test_create_user(api_client):
    user = UserFactory()  # Fresh user for this test
    # ... test logic

# ❌ Bad: Tests depend on each other
shared_user = None

def test_create_user_step1():
    global shared_user
    shared_user = UserFactory()

def test_create_user_step2():
    # Depends on step1
    shared_user.username = 'new'
```

### 4. Use Fixtures

```python
# ✅ Good: Reusable setup
@pytest.fixture
def authenticated_user(api_client):
    user = UserFactory()
    api_client.force_authenticate(user=user)
    return user, api_client

def test_feature(authenticated_user):
    user, client = authenticated_user
    # ... test logic

# ❌ Bad: Repeated setup
def test_feature():
    client = APIClient()
    user = UserFactory()
    client.force_authenticate(user=user)
    # ... test logic
```

### 5. Test Both Success and Failure

```python
def test_login_success(api_client, test_user):
    """Test successful login."""
    response = api_client.post('/api/v1/accounts/login/', {
        'username': 'testuser',
        'password': 'testpass123'
    })
    assert response.status_code == 200

def test_login_invalid_password(api_client, test_user):
    """Test login with invalid password."""
    response = api_client.post('/api/v1/accounts/login/', {
        'username': 'testuser',
        'password': 'wrongpassword'
    })
    assert response.status_code == 400
```

### 6. Use Meaningful Assertions

```python
# ✅ Good: Clear assertions
assert response.status_code == 200
assert 'id' in response.data
assert response.data['username'] == 'testuser'
assert len(response.data['roles']) > 0

# ❌ Bad: Vague assertions
assert response  # What are we checking?
assert response.data  # Is this checking for existence?
```

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Run tests
        env:
          DJANGO_SETTINGS_MODULE: config.settings
          PYTHONPATH: src
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: test_db
          DB_USER: postgres
          DB_PASSWORD: postgres
        run: |
          pytest tests/ --cov=apps --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

## Debugging Tests

### Running Tests with Debug Output

```bash
# Verbose output
pytest tests/ -v

# Show print statements
pytest tests/ -s

# Stop on first failure
pytest tests/ -x

# Show local variables on failure
pytest tests/ -l

# Combination
pytest tests/ -vsx -l
```

### Using pdb (Python Debugger)

```python
def test_something():
    user = UserFactory()
    import pdb; pdb.set_trace()  # Breakpoint
    # ... test continues
```

### Using pytest-pdb

```bash
# Drop into debugger on failure
pytest tests/ --pdb

# Drop into debugger on error
pytest tests/ --pdb --pdbcls=IPython.terminal.debugger:TerminalPdb
```

## Common Testing Pitfalls

### 1. Database State

❌ **Problem**: Tests fail due to database state from previous tests

✅ **Solution**: Use `@pytest.mark.django_db` and transactions

### 2. Time-Dependent Tests

❌ **Problem**: Tests fail at certain times or dates

✅ **Solution**: Use `freezegun` to mock time

```python
from freezegun import freeze_time

@freeze_time("2026-01-07 12:00:00")
def test_with_fixed_time():
    # Time is now frozen
    pass
```

### 3. External Dependencies

❌ **Problem**: Tests depend on external services

✅ **Solution**: Mock external calls

```python
from unittest.mock import patch

@patch('apps.accounts.send_email')
def test_registration_sends_email(mock_send_email):
    # send_email is mocked
    response = register_user()
    mock_send_email.assert_called_once()
```

### 4. Flaky Tests

❌ **Problem**: Tests pass sometimes and fail sometimes

✅ **Solution**:
- Remove race conditions
- Use proper fixtures
- Mock time-dependent code
- Avoid random data without seeding

## Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-django Documentation](https://pytest-django.readthedocs.io/)
- [Locust Documentation](https://docs.locust.io/)
- [Factory Boy Documentation](https://factoryboy.readthedocs.io/)
- [Django Testing Documentation](https://docs.djangoproject.com/en/stable/topics/testing/)

## Next Steps

1. **Write tests for other apps** (cases, evidence, investigation, trial)
2. **Add integration tests** for cross-app workflows
3. **Set up CI/CD** with automated testing
4. **Add performance benchmarks** to track improvements
5. **Implement load testing** in staging environment
