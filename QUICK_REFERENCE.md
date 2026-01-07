# Quick Reference Guide

Quick reference for common operations in LA Noire NextGen.

## Table of Contents

- [Setup & Maintenance](#setup--maintenance)
- [Common Django Commands](#common-django-commands)
- [Database Operations](#database-operations)
- [User Management](#user-management)
- [Case Operations](#case-operations)
- [API Testing](#api-testing)
- [Troubleshooting](#troubleshooting)

## Setup & Maintenance

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd LA-Noire-NextGen
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
python scripts/recreate_db.py
```

### Daily Development
```bash
# Activate environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start server
cd src
python manage.py runserver

# Run tests
python manage.py test
```

### Update Dependencies
```bash
pip install --upgrade -r requirements.txt
```

## Common Django Commands

### Server Management
```bash
# Start development server
python manage.py runserver

# Start on different port
python manage.py runserver 8080

# Start on all interfaces
python manage.py runserver 0.0.0.0:8000
```

### Database Migrations
```bash
# Create migrations for all apps
python manage.py makemigrations

# Create migration for specific app
python manage.py makemigrations accounts

# Show migration SQL
python manage.py sqlmigrate accounts 0001

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Revert migration
python manage.py migrate accounts 0001
```

### Shell Access
```bash
# Django shell
python manage.py shell

# Django shell with IPython
pip install ipython
python manage.py shell
```

### User Management
```bash
# Create superuser
python manage.py createsuperuser

# Change user password
python manage.py changepassword username
```

## Database Operations

### Reset Database
```bash
# Complete reset with sample data
python scripts/recreate_db.py
```

### Backup Database
```bash
# PostgreSQL backup
pg_dump -U postgres la_noire_db > backup.sql

# Restore
psql -U postgres la_noire_db < backup.sql
```

### Query Database
```bash
# Django shell
python manage.py shell

>>> from apps.cases.models import Case
>>> Case.objects.all()
>>> Case.objects.filter(status='open')
>>> Case.objects.filter(crime_level__level=1)
```

### Export Data
```bash
# Export all data
python manage.py dumpdata > data.json

# Export specific app
python manage.py dumpdata accounts > accounts.json

# Import data
python manage.py loaddata data.json
```

## User Management

### Create Users (Python Shell)
```python
from apps.accounts.models import User, Role

# Create regular user
user = User.objects.create_user(
    username='johndoe',
    email='john@example.com',
    phone_number='+11234567890',
    national_id='1234567890',
    password='password123',
    first_name='John',
    last_name='Doe'
)

# Assign role
detective_role = Role.objects.get(name='Detective')
user.roles.add(detective_role)
```

### Assign Roles
```python
# Get user and role
user = User.objects.get(username='johndoe')
role = Role.objects.get(name='Detective')

# Add role
user.roles.add(role)

# Remove role
user.roles.remove(role)

# Set roles (replaces all)
user.roles.set([role1, role2])

# Clear all roles
user.roles.clear()
```

### Check Roles
```python
user = User.objects.get(username='johndoe')

# Check if user has role
user.has_role('Detective')  # Returns True/False

# Get highest police rank
user.get_highest_police_rank()  # Returns Role object or None

# Get all roles
user.roles.all()
```

## Case Operations

### Create Case (Python Shell)
```python
from apps.cases.models import Case, CrimeLevel
from apps.accounts.models import User

# Get crime level
crime_level = CrimeLevel.objects.get(level=2)

# Create complaint-based case
case = Case.objects.create(
    title='Burglary Report',
    description='Store broken into overnight',
    crime_level=crime_level,
    formation_type='complaint'
)

# Add complainant
complainant = User.objects.get(username='user1')
case.complainants.add(complainant, through_defaults={
    'statement': 'My store was broken into',
    'is_primary': True
})
```

### Case Workflow
```python
case = Case.objects.get(case_number='CASE-ABC123')

# Check status
print(case.status)  # 'draft', 'cadet_review', etc.

# Change status
case.status = Case.STATUS_CADET_REVIEW
case.save()

# Assign detective
detective = User.objects.get(username='detective_mike')
case.assigned_detective = detective
case.save()
```

### Query Cases
```python
# All open cases
Case.objects.filter(status='open')

# Cases by crime level
Case.objects.filter(crime_level__level=1)

# Cases assigned to detective
Case.objects.filter(assigned_detective__username='detective_mike')

# Cases in trial phase
Case.objects.filter(status='trial_phase')

# Recent cases
Case.objects.order_by('-created_at')[:10]
```

## API Testing

### Using cURL

#### Register User
```bash
curl -X POST http://localhost:8000/api/v1/accounts/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "password_confirm": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

#### Login (Get Session)
```bash
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  -c cookies.txt
```

#### Create Case (Authenticated)
```bash
curl -X POST http://localhost:8000/api/v1/cases/cases/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Test Case",
    "description": "Test description",
    "crime_level": 2,
    "formation_type": "complaint"
  }'
```

#### List Cases
```bash
curl http://localhost:8000/api/v1/cases/cases/ \
  -b cookies.txt
```

### Using Python Requests
```python
import requests

BASE_URL = 'http://localhost:8000/api/v1'

# Create session
session = requests.Session()

# Login
response = session.post(f'{BASE_URL}/login/', json={
    'username': 'admin',
    'password': 'admin123'
})

# Create case
response = session.post(f'{BASE_URL}/cases/cases/', json={
    'title': 'API Test Case',
    'description': 'Created via API',
    'crime_level': 2,
    'formation_type': 'complaint'
})

print(response.status_code)
print(response.json())
```

### Using HTTPie
```bash
# Install httpie
pip install httpie

# Register user
http POST localhost:8000/api/v1/accounts/users/ \
  username=testuser \
  email=test@example.com \
  password=password123 \
  password_confirm=password123

# Login and save session
http --session=admin POST localhost:8000/api/login/ \
  username=admin password=admin123

# Create case (using saved session)
http --session=admin POST localhost:8000/api/v1/cases/cases/ \
  title="Test Case" \
  description="Test" \
  crime_level:=2 \
  formation_type=complaint
```

## Troubleshooting

### Database Connection Errors
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check .env configuration
cat .env

# Test connection
python -c "import psycopg2; conn = psycopg2.connect('dbname=la_noire_db user=postgres')"
```

### Migration Errors
```bash
# Show migration status
python manage.py showmigrations

# Fake migrations (if needed)
python manage.py migrate --fake accounts

# Clear migrations and start over
# 1. Delete migration files (except __init__.py)
# 2. Drop database tables
# 3. Recreate migrations
python manage.py makemigrations
python manage.py migrate
```

### Import Errors
```bash
# Check Python path
python -c "import sys; print('\n'.join(sys.path))"

# Verify Django settings
python manage.py check

# Check installed apps
python manage.py diffsettings | grep INSTALLED_APPS
```

### Static Files Issues
```bash
# Collect static files
python manage.py collectstatic

# Find static files
python manage.py findstatic filename.css
```

### Permission Denied Errors
```bash
# Check file permissions
ls -la src/

# Fix permissions
chmod +x scripts/*.py
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
python manage.py runserver 8080
```

### Clear Cache
```bash
# Clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -name "*.pyc" -delete

# Clear Django cache (if configured)
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
```

## Useful Queries

### Role Statistics
```python
from apps.accounts.models import User, Role

# Users per role
for role in Role.objects.all():
    count = role.users.count()
    print(f"{role.name}: {count} users")

# Police officers only
police_users = User.objects.filter(roles__is_police_rank=True).distinct()
```

### Case Statistics
```python
from apps.cases.models import Case
from django.db.models import Count

# Cases by status
Case.objects.values('status').annotate(count=Count('id'))

# Cases by crime level
Case.objects.values('crime_level__name').annotate(count=Count('id'))

# Detective workload
from django.db.models import Q
Case.objects.filter(
    Q(status='open') | Q(status='investigation')
).values('assigned_detective__username').annotate(
    case_count=Count('id')
).order_by('-case_count')
```

### Evidence Statistics
```python
from apps.evidence.models import *

# Count by type
print(f"Testimonies: {Testimony.objects.count()}")
print(f"Biological: {BiologicalEvidence.objects.count()}")
print(f"Vehicles: {VehicleEvidence.objects.count()}")
print(f"Documents: {IDDocument.objects.count()}")
print(f"Generic: {GenericEvidence.objects.count()}")
```

## Quick Links

- **API Documentation**: http://localhost:8000/api/docs/
- **Django Admin**: http://localhost:8000/admin/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Schema**: http://localhost:8000/api/schema/

## Environment Variables

Common `.env` variables:
```bash
DEBUG=True
SECRET_KEY=your-secret-key-here
DB_NAME=la_noire_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

## Performance Tips

### Query Optimization
```python
# Use select_related for foreign keys
Case.objects.select_related('crime_level', 'assigned_detective')

# Use prefetch_related for many-to-many
Case.objects.prefetch_related('complainants', 'witnesses')

# Combine them
Case.objects.select_related('crime_level').prefetch_related('complainants')

# Only fetch needed fields
Case.objects.only('title', 'case_number', 'status')

# Exclude large fields
Case.objects.defer('description')
```

### Bulk Operations
```python
# Bulk create
Case.objects.bulk_create([case1, case2, case3])

# Bulk update
cases = Case.objects.filter(status='draft')
cases.update(status='cadet_review')
```

## See Also

- [README.md](README.md) - Project overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [doc/](doc/) - Detailed documentation
  - [11-Interrogation-System.md](doc/11-Interrogation-System.md) - Interrogation workflow
  - [12-Trial-System.md](doc/12-Trial-System.md) - Trial and court proceedings
  - [13-Suspect-Status-System.md](doc/13-Suspect-Status-System.md) - Suspect status tracking and intensive pursuit

---

## Suspect Status System Quick Reference

### Get Public Wanted List (No Auth Required)
```bash
# Get intensive pursuit suspects (public access)
GET /api/v1/investigation/suspects/intensive_pursuit/

# Returns suspects over 30 days at large, ordered by danger score
```

### Response Format
```json
{
  "person_full_name": "علی رضایی",
  "person_username": "ali_rezaei",
  "photo": "/media/suspects/photo.jpg",
  "case_number": "CR-2024-001",
  "case_title": "پرونده سرقت مسلحانه",
  "crime_level": 0,
  "crime_level_name": "بحرانی",
  "days_at_large": 45,
  "danger_score": 180,
  "reward_amount": 3600000000,
  "status": "intensive_pursuit"
}
```

### Danger Score Formula
```
Danger Score = Days at Large × (4 - Crime Level)

Crime Level Weights:
- Level 0 (Critical): ×4
- Level 1 (Major): ×3
- Level 2 (Medium): ×2
- Level 3 (Minor): ×1

Examples:
- 45 days, Critical: 45 × 4 = 180
- 50 days, Major: 50 × 3 = 150
- 100 days, Medium: 100 × 2 = 200
```

### Reward Formula
```
Reward = Danger Score × 20,000,000 Rials

Examples:
- Score 180: 3,600,000,000 Rials
- Score 150: 3,000,000,000 Rials
- Score 200: 4,000,000,000 Rials
```

### Status Transitions
```
Identified → under_pursuit → intensive_pursuit (after 30 days) → arrested/cleared
```

### Key Features
- No authentication required (public endpoint)
- Auto-updates status to intensive_pursuit for suspects > 30 days
- Excludes arrested and cleared suspects
- Ordered by danger score (highest first)
- Includes photo for wanted posters

---

## Trial System Quick Reference

### Submit Case to Trial (Captain/Chief)
```bash
# Captain submits guilty suspect
POST /api/v1/trial/trials/
{
  "case": 1,
  "suspect": 2,
  "judge": 3,
  "submitted_by_captain": 4,
  "captain_notes": "پرونده کامل ارسال می‌شود"
}
```

### Judge Reviews Complete Case File
```bash
# Get comprehensive case summary
GET /api/v1/trial/trials/{id}/case_summary/

# Returns: case, suspect, all police members, 
# all interrogations, all evidence, captain/chief notes
```

### Judge Delivers Verdict
```bash
# Guilty verdict with punishment
POST /api/v1/trial/trials/{id}/deliver_verdict/
{
  "decision": "guilty",
  "reasoning": "شواهد کافی برای اثبات جرم وجود دارد و متهم مجرم است",
  "punishment_title": "پنج سال حبس",
  "punishment_description": "محکومیت به پنج سال حبس در زندان"
}

# Innocent verdict
POST /api/v1/trial/trials/{id}/deliver_verdict/
{
  "decision": "innocent",
  "reasoning": "شواهد کافی برای اثبات جرم وجود ندارد"
}
```

### Bail Payment (Level 2-3 Crimes Only)
```bash
# 1. Suspect requests bail
POST /api/v1/trial/bail-payments/
{
  "suspect": 2,
  "amount": 50000000
}

# 2. Sergeant approves
POST /api/v1/trial/bail-payments/{id}/approve/

# 3. Suspect pays
POST /api/v1/trial/bail-payments/{id}/pay/
```

### Trial Status Flow
```
pending → in_progress → completed
```

### Key Validations
- Reasoning: Min 30 characters
- Punishment title: Min 5 characters
- Punishment description: Min 20 characters
- Bail amount: 1M - 10B Rials
- Bail only for crime levels 2-3
- Cannot deliver verdict twice