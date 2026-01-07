# CI/CD Setup Guide

## Overview

The LA Noire NextGen project includes a comprehensive CI/CD pipeline using GitHub Actions. The pipeline automatically runs on every push and pull request to ensure code quality and test coverage.

## Pipeline Overview

The CI/CD pipeline consists of 6 main jobs:

```
┌─────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline                        │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┬──────────────┐
        │                                   │              │
   ┌────▼────┐                         ┌───▼───┐     ┌───▼────┐
   │  Lint   │                         │ Test  │     │Security│
   └────┬────┘                         └───┬───┘     └───┬────┘
        │                                  │             │
        └──────────┬───────────────────────┘             │
                   │                                     │
              ┌────▼─────┐                               │
              │Parallel  │                               │
              │Tests     │                               │
              └────┬─────┘                               │
                   │                                     │
        ┌──────────┴────────────┬────────────────────────┘
        │                       │
   ┌────▼─────┐            ┌───▼────┐
   │Test      │            │Notify  │
   │Summary   │            │        │
   └──────────┘            └────────┘
```

## Jobs Description

### 1. Lint & Code Quality

**Purpose**: Ensure code quality and consistency

**Checks**:
- **flake8**: Python linting for syntax errors and code quality
- **black**: Code formatting validation
- **isort**: Import statement ordering

**Configuration Files**:
- `.flake8` - Flake8 configuration
- `pyproject.toml` - Black and isort configuration

**Run Locally**:
```bash
# Install linting tools
pip install flake8 black isort

# Run flake8
flake8 src/

# Check formatting with black
black --check src/

# Check import sorting
isort --check-only src/

# Auto-fix formatting
black src/
isort src/
```

### 2. Unit Tests

**Purpose**: Run comprehensive test suite with coverage

**Features**:
- PostgreSQL 15 service container
- Database migrations
- Coverage reporting (XML, HTML, terminal)
- JUnit XML test results
- Automatic coverage upload to Codecov (optional)

**Environment Variables**:
```yaml
DJANGO_SETTINGS_MODULE: config.settings
PYTHONPATH: src/
SECRET_KEY: test-secret-key-for-ci-cd-only
DEBUG: True
DB_NAME: test_lanoire_db
DB_USER: postgres
DB_PASSWORD: postgres
DB_HOST: localhost
DB_PORT: 5432
```

**Artifacts**:
- `test-results.xml` - JUnit test results
- `coverage.xml` - Coverage report for Codecov
- `htmlcov/` - HTML coverage report

**Run Locally**:
```bash
# Run tests with coverage
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/ \
  --cov=apps \
  --cov-report=html \
  --cov-report=term-missing

# View coverage report
open htmlcov/index.html
```

### 3. Parallel Tests

**Purpose**: Run tests in parallel for faster execution

**Features**:
- Uses pytest-xdist for parallel execution
- Automatically detects available CPU cores
- Same test suite as unit tests job

**Run Locally**:
```bash
# Run tests in parallel
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src pytest tests/ -n auto
```

### 4. Security Scan

**Purpose**: Check for security vulnerabilities

**Tools**:
- **safety**: Checks Python dependencies for known vulnerabilities
- **bandit**: Static security analysis for Python code

**Configuration**:
- `.bandit` - Bandit configuration file

**Artifacts**:
- `bandit-report.json` - Security scan results

**Run Locally**:
```bash
# Install security tools
pip install safety bandit

# Check dependencies
safety check

# Run security linting
bandit -r src/
```

### 5. Test Summary

**Purpose**: Generate and publish test result summary

**Features**:
- Downloads test results from artifacts
- Publishes test results to PR comments
- Adds summary to GitHub Actions summary page

### 6. Notify on Failure

**Purpose**: Create notification when pipeline fails

**Behavior**:
- Only runs if any job fails
- Adds failure message to GitHub Actions summary

## Triggers

The pipeline runs automatically on:

1. **Push to branches**:
   - `main`
   - `develop`

2. **Pull requests to**:
   - `main`
   - `develop`

3. **Manual trigger**:
   - Via GitHub Actions UI (workflow_dispatch)

## Configuration Files

### `.github/workflows/tests.yml`
Main CI/CD pipeline configuration

### `.flake8`
Flake8 linting configuration:
- Max line length: 127
- Max complexity: 10
- Excludes migrations, venv, etc.

### `pyproject.toml`
Python project configuration:
- Black formatting rules
- isort import sorting rules
- pytest configuration
- Coverage settings

### `.bandit`
Bandit security scanning configuration:
- Excluded directories
- Skipped tests
- Confidence and severity levels

## Coverage Goals

- **Minimum (Orange)**: 70%
- **Target (Green)**: 85%
- **Current**: ~88% (accounts app)

## Setting Up CI/CD

### For New Repository

1. **Create GitHub repository**
2. **Push code including `.github/workflows/tests.yml`**
3. **GitHub Actions will automatically detect and run the workflow**

### Optional: Codecov Integration

1. Sign up at [codecov.io](https://codecov.io)
2. Connect your GitHub repository
3. Get your Codecov token
4. Add as repository secret: `CODECOV_TOKEN`
5. The workflow will automatically upload coverage

### Repository Secrets

No secrets are required for basic operation. Optional:

- `CODECOV_TOKEN` - For Codecov integration (optional)

## Viewing Results

### GitHub Actions UI

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select a workflow run
4. View individual job logs

### PR Comments

- Test results automatically commented on PRs
- Coverage changes shown
- Links to detailed reports

### Artifacts

Access from workflow run page:
- `test-results` - JUnit XML results
- `coverage-report` - HTML coverage report
- `security-reports` - Security scan results

## Local Testing Before Push

Run the full test suite locally to catch issues before pushing:

```bash
# 1. Run linting
flake8 src/
black --check src/
isort --check-only src/

# 2. Run tests with coverage
DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=src \
  pytest tests/ --cov=apps --cov-report=html

# 3. Run security checks
safety check
bandit -r src/

# 4. View coverage
open htmlcov/index.html
```

Or use the test runner script:

```bash
# Run all checks
python run_tests.py all -v -c -p
```

## Troubleshooting

### Tests Fail in CI but Pass Locally

**Common causes**:
1. Environment differences (PostgreSQL version, Python version)
2. Missing environment variables
3. Database state issues

**Solution**:
- Check job logs for specific error
- Ensure local environment matches CI environment
- Verify all environment variables are set

### Coverage Drop Alert

**Cause**: New code added without tests

**Solution**:
- Add tests for new functionality
- Aim for 85%+ coverage
- Check coverage report for uncovered lines

### Linting Failures

**Cause**: Code doesn't follow style guidelines

**Solution**:
```bash
# Auto-fix most issues
black src/
isort src/

# Check remaining issues
flake8 src/
```

### PostgreSQL Connection Issues

**Symptoms**: Tests fail with database connection errors

**Solution**:
- Wait for PostgreSQL to be ready (already handled in workflow)
- Check PostgreSQL service configuration
- Verify database credentials

## Best Practices

### 1. Write Tests Before Pushing

```bash
# Always run tests before committing
pytest tests/ -v
```

### 2. Keep Tests Fast

- Use `pytest-xdist` for parallel execution
- Mock external services
- Use fixtures for common setup

### 3. Maintain High Coverage

- Aim for 85%+ coverage
- Write tests for critical paths first
- Don't obsess over 100% coverage

### 4. Follow Code Style

```bash
# Format code before committing
black src/
isort src/
```

### 5. Fix Security Issues Immediately

- Review Bandit reports
- Update vulnerable dependencies
- Don't skip security warnings

### 6. Keep CI Fast

- Current pipeline: ~3-5 minutes
- Use caching for dependencies
- Run expensive tests in parallel

## CI/CD Metrics

### Current Performance

- **Average Duration**: 3-5 minutes
- **Success Rate**: 100% (21/21 tests passing)
- **Coverage**: ~88% (accounts app)
- **Security Issues**: 0 critical

### Job Timing (Approximate)

| Job | Duration |
|-----|----------|
| Lint | ~30 seconds |
| Unit Tests | ~2 minutes |
| Parallel Tests | ~1 minute |
| Security Scan | ~1 minute |
| Test Summary | ~10 seconds |

## Future Enhancements

### Planned Improvements

1. **Deployment Pipeline**
   - Staging deployment on develop branch
   - Production deployment on main branch
   - Blue-green deployment strategy

2. **Additional Checks**
   - Type checking with mypy
   - Documentation build validation
   - API schema validation

3. **Performance Testing**
   - Automated stress tests in CI
   - Performance regression detection
   - Load testing on staging

4. **Integration Tests**
   - Cross-service integration tests
   - End-to-end API tests
   - Browser-based testing (if frontend added)

5. **Advanced Security**
   - SAST (Static Application Security Testing)
   - Dependency scanning
   - Container scanning (if using Docker)

## Support

### Getting Help

1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Check individual job logs for errors
4. Review test output in artifacts

### Common Issues & Solutions

See [Testing Guide](09-Testing-Guide.md) for detailed troubleshooting.

## Related Documentation

- [Testing Guide](09-Testing-Guide.md) - Comprehensive testing documentation
- [Testing Quick Reference](10-Testing-Quick-Reference.md) - Quick commands
- [Authentication](08-Authentication.md) - API authentication details

---

**Last Updated**: January 7, 2026

**Pipeline Status**: ✅ Active and passing

**Current Coverage**: ~88% (accounts app)
