# LA Noire NextGen - Police Management System

A comprehensive police case management system inspired by the LA Noire video game, bringing 1940s-era manual police operations into the modern digital age for Los Angeles Police Department (2025).

## Features

- **Dynamic Role System**: Administrators can create and modify roles at runtime with hierarchy levels
- **Case Management**: Handle cases from complaint/crime scene formation through investigation to trial
- **Evidence Tracking**: Support for 5 evidence types (Testimony, Biological, Vehicle, ID Documents, Generic)
- **Investigation Tools**: 
  - Visual detective boards with evidence positioning and connections
  - Suspect identification and tracking with danger scores
  - Interrogation system with detective and sergeant ratings
  - Public tip-off system with reward redemption
- **Trial System**: Complete workflow from trial submission to verdict and punishment
- **Multi-Login Support**: Users can login with username, email, phone number, or national ID
- **RESTful API**: Complete REST API with filtering, searching, and ordering
- **Interactive Documentation**: Swagger UI and ReDoc for API exploration

## Technology Stack

- **Backend**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL (configurable)
- **API Documentation**: drf-spectacular (OpenAPI 3.0)
- **Authentication**: Session-based authentication
- **Filtering**: django-filter for advanced queries
- **Image Processing**: Pillow for evidence photos and suspect mugshots

## Project Structure

```
LA-Noire-NextGen/
├── src/                          # Main source directory
│   ├── manage.py                 # Django management script
│   ├── config/                   # Project configuration
│   │   ├── settings.py           # Django settings
│   │   ├── urls.py               # Root URL configuration
│   │   ├── wsgi.py               # WSGI configuration
│   │   └── asgi.py               # ASGI configuration
│   └── apps/                     # Django applications
│       ├── accounts/             # User authentication and roles
│       ├── cases/                # Case management
│       ├── evidence/             # Evidence collection
│       ├── investigation/        # Detective work and suspects
│       └── trial/                # Court trials and verdicts
├── scripts/                      # Utility scripts
│   ├── initial_setup.py          # Initial setup for fresh installs
│   ├── recreate_db.py            # Database recreation script
│   └── verify_setup.py           # Installation verification
├── doc/                          # Documentation (Obsidian format)
│   ├── 01-Overview.md
│   ├── 02-User-Roles.md
│   ├── 03-Case-Workflows.md
│   ├── 04-Evidence-Management.md
│   └── 07-API-Reference.md
└── requirements.txt              # Python dependencies
```

## Installation

### Quick Start (Recommended for New Installations)

```bash
# Clone repository
git clone <repository-url>
cd LA-Noire-NextGen

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run automated setup (handles everything)
python scripts/initial_setup.py

# Start server
cd src
python manage.py runserver
```

Visit http://localhost:8000/api/docs/ and login with `admin` / `admin123`

**For detailed setup instructions and troubleshooting, see [SETUP_GUIDE.md](SETUP_GUIDE.md)**

### Detailed Setup

### Prerequisites

- Python 3.10+
- PostgreSQL (or other database)
- pip

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd LA-Noire-NextGen
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run initial setup script**
```bash
python scripts/initial_setup.py
```

This automated script will:
- Check Python version (3.10+ required)
- Verify virtual environment
- Create .env file from .env.example (if not exists)
- Create/verify PostgreSQL database
- Create migration directories
- Generate and apply all migrations
- Create 17 predefined roles (police hierarchy + judicial + admin)
- Create 4 crime levels
- Create admin superuser (username: admin, password: admin123)

**Note**: Edit .env file with your database credentials before running if needed.

5. **Alternative: Manual database reset**
```bash
python scripts/recreate_db.py
```

Use this to drop and recreate database tables (useful for development reset).
This creates sample users including police personnel and civilians.

6. **Verify installation (optional)**
```bash
python scripts/verify_setup.py
```

This script checks:
- Python version
- All dependencies
- Django configuration
- Database connection
- Applied migrations
- Model imports
- Admin user exists

7. **Start development server**
```bash
cd src
python manage.py runserver
```

## Default Credentials

After running `initial_setup.py` or `recreate_db.py`, you can login with:

- **Admin**: `admin` / `admin123`

### Additional Users (recreate_db.py only)

The `recreate_db.py` script also creates sample users for testing:

- **All other users**: `<username>` / `password123`

Sample users include:
- Police personnel: cadet_john, officer_jane, detective_mike, sergeant_sarah, lieutenant_bob, captain_carol, deputy_chief_david, chief_emma
- Civilians: user1, user2

## API Documentation

### Interactive Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

### API Endpoints

**Base URL**: `http://localhost:8000/api/v1/`

#### Accounts
- `POST /accounts/users/` - Register user
- `GET /accounts/users/me/` - Get current user
- `GET /accounts/roles/` - List roles
- `POST /accounts/roles/` - Create role (admin only)

#### Cases
- `GET /cases/cases/` - List cases
- `POST /cases/cases/` - Create case
- `POST /cases/cases/{id}/cadet_review/` - Cadet review
- `POST /cases/cases/{id}/officer_review/` - Officer review
- `GET /cases/crime-levels/` - List crime levels

#### Evidence
- `POST /evidence/testimony/` - Add testimony
- `POST /evidence/biological/` - Add biological evidence
- `POST /evidence/vehicles/` - Add vehicle evidence
- `POST /evidence/id-documents/` - Add ID document
- `POST /evidence/generic/` - Add generic evidence

#### Investigation
- `POST /investigation/detective-boards/` - Create board
- `POST /investigation/board-items/` - Add evidence to board
- `POST /investigation/evidence-connections/` - Connect evidence
- `POST /investigation/suspects/` - Identify suspect
- `POST /investigation/interrogations/` - Record interrogation
- `POST /investigation/tipoffs/` - Submit tip-off
- `GET /investigation/suspects/?status=intensive_pursuit` - Wanted list

#### Trials
- `POST /trial/trials/` - Create trial
- `POST /trial/verdicts/` - Deliver verdict
- `POST /trial/punishments/` - Assign punishment
- `POST /trial/bail-payments/` - Request bail payment

See [API Reference](doc/07-API-Reference.md) for complete documentation with examples.

## Documentation

Complete documentation is available in the `doc/` directory in Obsidian-compatible format:

1. **[System Overview](doc/01-Overview.md)** - Architecture and concepts
2. **[User Roles](doc/02-User-Roles.md)** - Role hierarchy and permissions
3. **[Case Workflows](doc/03-Case-Workflows.md)** - Case formation and approval processes
4. **[Evidence Management](doc/04-Evidence-Management.md)** - Evidence types and handling
5. **[Investigation Process](doc/05-Investigation-Process.md)** - Detective boards, suspects, interrogations, tip-offs
6. **[Trial System](doc/06-Trial-System.md)** - Court proceedings, verdicts, punishments, bail
7. **[API Reference](doc/07-API-Reference.md)** - Complete API documentation

## Key Concepts

### User Roles

17 predefined roles with hierarchy levels:
- **Police Ranks** (hierarchy 1-9): Cadet → Patrol Officer → Police Officer → Detective → Sergeant → Lieutenant → Captain → Deputy Chief → Chief
- **Other Roles**: Judge, Coroner, Complainant, Witness, Suspect, Criminal
- **System Roles**: Base User, Administrator

Administrators can create custom roles at runtime.

### Case Workflow

1. **Draft**: Case created (complaint or crime scene based)
2. **Cadet Review**: Initial verification
3. **Officer Review**: Secondary verification (max 3 rejections allowed)
4. **Open**: Detective assigned, investigation begins
5. **Investigation**: Evidence collection, suspect identification
6. **Trial Phase**: Court proceedings
7. **Closed**: Case resolved

### Crime Levels

- **Level 3**: Minor crimes (e.g., petty theft)
- **Level 2**: Medium crimes (e.g., burglary)
- **Level 1**: Major crimes (e.g., homicide)
- **Level 0**: Critical crimes (e.g., serial murders)

Higher levels require higher rank approvals.

### Wanted List

Suspects under intensive pursuit appear on wanted list with:
- **Danger Score**: `days_since_identification × crime_level`
- **Reward Amount**: `danger_score × 20,000,000` Rials

## Development

### Run Migrations
```bash
cd src
python manage.py makemigrations
python manage.py migrate
```

### Create Superuser
```bash
python manage.py createsuperuser
```

### Run Tests
```bash
python manage.py test
```

### Access Django Admin
http://localhost:8000/admin/

## License

[Specify your license here]

## Contributing

[Specify contribution guidelines here]

## Support

For issues and questions, please [create an issue](https://github.com/your-repo/issues).