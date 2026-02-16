# LA Noire NextGen - Backend

Django REST API backend for the LA Noire NextGen case management system.

## Technology Stack

- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL (configurable)
- **API Documentation**: drf-spectacular (OpenAPI 3.0)
- **Authentication**: Session-based authentication with cookie support
- **Testing**: pytest + pytest-django

## Project Structure

```
backend/
├── apps/                     # Django applications
│   ├── accounts/            # User authentication and roles
│   ├── cases/               # Case management
│   ├── evidence/            # Evidence collection
│   ├── investigation/       # Detective work and suspects
│   └── trial/               # Court trials and verdicts
├── config/                  # Django configuration
│   ├── settings.py         # Project settings
│   ├── urls.py             # URL configuration
│   ├── wsgi.py             # WSGI configuration
│   └── asgi.py             # ASGI configuration
├── tests/                   # Test suite
├── scripts/                 # Utility scripts
├── docs/                    # Backend documentation
├── manage.py               # Django management script
├── requirements.txt        # Python dependencies
└── pytest.ini              # Pytest configuration
```

## Setup & Installation

### Prerequisites

- Python 3.10+
- PostgreSQL 12+ (or SQLite for development)
- pip

### Installation Steps

1. **Create virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   Create a `.env` file in the backend directory:
   ```env
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   DATABASE_URL=postgresql://user:password@localhost:5432/lanoire
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   ```

4. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Create superuser**:
   ```bash
   python manage.py createsuperuser
   ```

6. **Run initial setup** (optional - loads sample data):
   ```bash
   python scripts/initial_setup.py
   ```

## Running the Server

### Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

### API Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## Testing

### Run All Tests

```bash
pytest
```

### Run Specific Test File

```bash
pytest tests/test_accounts.py
```

### Run with Coverage

```bash
pytest --cov=apps --cov-report=html
```

View coverage report at `htmlcov/index.html`

### Run Tests in Parallel

```bash
pytest -n auto
```

### Run Stress Tests

```bash
locust -f tests/stress_tests.py
```

## API Endpoints

### Authentication
- `POST /api/accounts/login/` - Login with credentials
- `POST /api/accounts/logout/` - Logout current user
- `GET /api/accounts/profile/` - Get current user profile

### Cases
- `GET /api/cases/` - List all cases
- `POST /api/cases/` - Create new case
- `GET /api/cases/{id}/` - Get case details
- `PUT /api/cases/{id}/` - Update case
- `DELETE /api/cases/{id}/` - Delete case

### Evidence
- `GET /api/evidence/` - List all evidence
- `POST /api/evidence/` - Register new evidence
- `GET /api/evidence/{id}/` - Get evidence details

### Investigation
- `GET /api/suspects/` - List suspects
- `POST /api/suspects/` - Add new suspect
- `GET /api/suspects/wanted/` - Get public wanted list

### Trials
- `GET /api/trials/` - List trials
- `POST /api/trials/` - Submit case to trial
- `POST /api/trials/{id}/verdict/` - Deliver verdict

## Code Quality

### Linting

```bash
flake8 apps/
```

### Format Code

```bash
black apps/
isort apps/
```

### Security Check

```bash
bandit -r apps/
safety check
```

## Database Management

### Create Database Backup

```bash
python manage.py dumpdata > backup.json
```

### Restore Database

```bash
python manage.py loaddata backup.json
```

### Reset Database

```bash
python scripts/recreate_db.py
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | Required |
| `DEBUG` | Debug mode | `False` |
| `DATABASE_URL` | Database connection string | SQLite (dev) |
| `ALLOWED_HOSTS` | Allowed host names | `localhost` |
| `CORS_ALLOWED_ORIGINS` | CORS allowed origins | None |

## Development Guidelines

1. **Code Style**: Follow PEP 8 guidelines
2. **Comments**: Document complex logic and business rules
3. **Testing**: Write tests for all new features
4. **API Docs**: Update Swagger docs for new endpoints
5. **Migrations**: Create migrations for model changes
6. **Security**: Never commit secrets or credentials

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
pg_ctl status

# Restart PostgreSQL
pg_ctl restart
```

### Migration Conflicts

```bash
# Show migrations
python manage.py showmigrations

# Fake migration
python manage.py migrate --fake app_name migration_name
```

### Clear Cache

```bash
python manage.py flush
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow and guidelines.

## Documentation

Full documentation is available in the `docs/` directory:
- [01-Overview.md](docs/01-Overview.md) - System overview
- [02-User-Roles.md](docs/02-User-Roles.md) - Role management
- [03-Case-Workflows.md](docs/03-Case-Workflows.md) - Case lifecycle
- [04-Evidence-Management.md](docs/04-Evidence-Management.md) - Evidence system
- [And more...](docs/)

## License

Internal LAPD System - All Rights Reserved
