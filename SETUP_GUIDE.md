# LA Noire NextGen - Setup Guide

This guide covers different setup scenarios for the LA Noire NextGen project.

## 🚀 Quick Start (Fresh Installation)

For setting up the project on a new machine:

```bash
# 1. Clone the repository
git clone <repository-url>
cd LA-Noire-NextGen

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run automated setup
python scripts/initial_setup.py

# 5. Start the server
cd src
python manage.py runserver
```

**Default credentials**: `admin` / `admin123`

## 📋 What Each Script Does

### initial_setup.py (Recommended for Fresh Installs)

**Use when**: Setting up on a new machine or first-time installation

**What it does**:
- ✅ Checks Python version (3.10+ required)
- ✅ Verifies virtual environment
- ✅ Creates .env from .env.example (if missing)
- ✅ Creates PostgreSQL database (if missing)
- ✅ Creates migration directories for all apps
- ✅ Generates migrations
- ✅ Applies all migrations
- ✅ Creates 17 roles (police hierarchy + others)
- ✅ Creates 4 crime levels
- ✅ Creates admin superuser

**Creates**: Only essential data (roles, crime levels, admin user)

```bash
python scripts/initial_setup.py
```

### recreate_db.py (Database Reset)

**Use when**: Resetting database during development or wanting sample data

**What it does**:
- ⚠️ **DROPS all database tables** (destructive!)
- ✅ Runs makemigrations and migrate
- ✅ Creates 17 roles
- ✅ Creates 4 crime levels
- ✅ Creates admin user
- ✅ Creates 10 sample police personnel users
- ✅ Creates 2 sample civilian users

**Creates**: Admin + 12 sample users for testing

```bash
python scripts/recreate_db.py
```

⚠️ **WARNING**: This script drops all existing data!

### verify_setup.py (Health Check)

**Use when**: Verifying installation or troubleshooting issues

**What it checks**:
- ✅ Python version
- ✅ Dependencies installed
- ✅ Django configuration
- ✅ Database connection
- ✅ Migrations status
- ✅ Models import correctly
- ✅ Admin user exists

```bash
python scripts/verify_setup.py
```

## 🔧 Common Scenarios

### Scenario 1: First Time Setup

```bash
python scripts/initial_setup.py
```

### Scenario 2: Database Already Exists (Just Need Migrations)

```bash
cd src
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### Scenario 3: Reset Everything and Start Fresh

```bash
python scripts/recreate_db.py
```

### Scenario 4: Something's Wrong (Troubleshooting)

```bash
# First, verify what's broken
python scripts/verify_setup.py

# Common fixes:
# - Missing migrations: cd src && python manage.py makemigrations
# - Unapplied migrations: cd src && python manage.py migrate
# - No admin user: python scripts/initial_setup.py (safe to re-run)
```

## 🗂️ Project Files

### Configuration Files

- **`.env`**: Environment variables (database credentials, SECRET_KEY)
- **`.env.example`**: Template for .env file
- **`.gitignore`**: Git ignore patterns (excludes venv/, *.pyc, .env, etc.)
- **`requirements.txt`**: Python dependencies

### Scripts

- **`scripts/initial_setup.py`**: Automated first-time setup
- **`scripts/recreate_db.py`**: Drop and recreate database with sample data
- **`scripts/verify_setup.py`**: Installation verification

## 🔐 Default Credentials

### Admin User (Created by both scripts)
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@lanoire.gov`
- **Roles**: Administrator

### Sample Users (Created by recreate_db.py only)

All sample users have password: `password123`

**Police Personnel**:
- `cadet1` - Cadet (John Doe)
- `officer1` - Police Officer (Jane Smith)
- `detective1` - Detective (Cole Phelps)
- `sergeant1` - Sergeant (Hank Merrill)
- `lieutenant1` - Lieutenant (Roy Earle)
- `captain1` - Captain (James Donnelly)
- `deputychief1` - Deputy Chief (Michael Anderson)
- `chief1` - Chief (William Worrell)
- `judge1` - Judge (Margaret Johnson)
- `coroner1` - Coroner (Malcolm Carruthers)

**Civilians**:
- `citizen1` - Base User (Alice Williams)
- `citizen2` - Base User (Bob Brown)

## 🗄️ Database Setup

### PostgreSQL Configuration

Edit `.env` file with your database settings:

```env
DB_NAME=lanoire_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

### Create Database Manually (if needed)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE lanoire_db;

# Exit
\q
```

The `initial_setup.py` script will create the database automatically if it doesn't exist.

## ⚠️ Troubleshooting

### "relation 'accounts_user' does not exist"

**Cause**: Migrations haven't been created or applied

**Solution**:
```bash
python scripts/initial_setup.py
```

### "No module named 'psycopg2'"

**Cause**: Dependencies not installed

**Solution**:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### "connection to server ... failed"

**Cause**: PostgreSQL not running or wrong credentials

**Solution**:
1. Start PostgreSQL: `brew services start postgresql` (macOS) or check system services
2. Verify credentials in `.env` file
3. Create database if needed

### "No such file or directory: '.env'"

**Cause**: .env file missing

**Solution**:
```bash
cp .env.example .env
# Edit .env with your settings
```

## 🎯 Next Steps After Setup

1. **Start the development server**:
   ```bash
   cd src
   python manage.py runserver
   ```

2. **Access API documentation**:
   - Swagger UI: http://localhost:8000/api/docs/
   - ReDoc: http://localhost:8000/api/redoc/
   - OpenAPI Schema: http://localhost:8000/api/schema/

3. **Django Admin Panel**:
   - URL: http://localhost:8000/admin/
   - Login with admin credentials

4. **Read the documentation**:
   - Check `doc/` directory for detailed guides
   - Start with `doc/01-Overview.md`

## 📚 Additional Resources

- [README.md](README.md) - Project overview and features
- [doc/01-Overview.md](doc/01-Overview.md) - System architecture
- [doc/02-User-Roles.md](doc/02-User-Roles.md) - Role hierarchy
- [doc/03-Case-Workflows.md](doc/03-Case-Workflows.md) - Case management
- [doc/07-API-Reference.md](doc/07-API-Reference.md) - Complete API docs
