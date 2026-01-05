#!/usr/bin/env python
"""
Initial setup script for LA Noire NextGen - for fresh installations.
This script handles everything needed to set up the project on a new machine.
"""
import os
import sys
import subprocess
from pathlib import Path
from decouple import config, UndefinedValueError
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(text)
    print("=" * 60)


def print_step(text):
    """Print a step message."""
    print(f"\n🔧 {text}...")


def print_success(text):
    """Print a success message."""
    print(f"✅ {text}")


def print_error(text):
    """Print an error message."""
    print(f"❌ {text}")


def print_warning(text):
    """Print a warning message."""
    print(f"⚠️  {text}")


def check_python_version():
    """Check if Python version is 3.10 or higher."""
    print_step("Checking Python version")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 10:
        print_success(f"Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print_error(f"Python {version.major}.{version.minor} detected. Python 3.10+ required")
        return False


def check_virtualenv():
    """Check if running in a virtual environment."""
    print_step("Checking virtual environment")
    in_venv = hasattr(sys, 'real_prefix') or (
        hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
    )
    if in_venv:
        print_success("Running in virtual environment")
        return True
    else:
        print_warning("Not running in virtual environment")
        print("  It's recommended to use a virtual environment")
        response = input("  Continue anyway? (y/n): ")
        return response.lower() == 'y'


def check_env_file():
    """Check if .env file exists."""
    print_step("Checking .env file")
    project_root = Path(__file__).resolve().parent.parent
    env_file = project_root / '.env'
    
    if env_file.exists():
        print_success(".env file found")
        return True
    else:
        print_warning(".env file not found")
        env_example = project_root / '.env.example'
        if env_example.exists():
            print("  Creating .env from .env.example...")
            import shutil
            shutil.copy(env_example, env_file)
            print_success(".env file created from template")
            print("  Please review and update .env with your database credentials")
            return True
        else:
            print_error("No .env.example found to copy from")
            print("  Please create .env file manually with database credentials")
            return False


def ensure_database_exists():
    """Ensure the target database exists, create it if not."""
    print_step("Checking/creating database")
    
    try:
        db_name = config('DB_NAME', default='lanoire_db')
        db_user = config('DB_USER', default='postgres')
        db_password = config('DB_PASSWORD', default='postgres')
        db_host = config('DB_HOST', default='localhost')
        db_port = config('DB_PORT', default='5432')
    except UndefinedValueError as e:
        print_error(f"Missing configuration: {e}")
        return False
    
    try:
        # Connect to postgres database to create target database
        conn = psycopg2.connect(
            dbname='postgres',
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute(
            "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
            (db_name,)
        )
        exists = cur.fetchone()
        
        if not exists:
            print(f"  Database '{db_name}' not found. Creating...")
            cur.execute(f'CREATE DATABASE "{db_name}"')
            print_success(f"Database '{db_name}' created")
        else:
            print_success(f"Database '{db_name}' exists")
        
        cur.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print_error(f"Database connection failed: {e}")
        print("  Please ensure PostgreSQL is running and credentials are correct")
        return False
    except Exception as e:
        print_error(f"Database error: {e}")
        return False


def create_migration_directories():
    """Create migration directories for all apps."""
    print_step("Creating migration directories")
    
    project_root = Path(__file__).resolve().parent.parent
    apps = ['accounts', 'cases', 'evidence', 'investigation', 'trial']
    
    for app in apps:
        migration_dir = project_root / 'src' / 'apps' / app / 'migrations'
        migration_dir.mkdir(parents=True, exist_ok=True)
        
        init_file = migration_dir / '__init__.py'
        if not init_file.exists():
            init_file.touch()
            print(f"  ✨ Created migrations directory for {app}")
        else:
            print(f"  ✓ Migrations directory exists for {app}")
    
    print_success("Migration directories ready")
    return True


def run_django_command(command_list, description):
    """Run a Django management command."""
    print_step(description)
    
    project_root = Path(__file__).resolve().parent.parent
    src_dir = project_root / 'src'
    
    try:
        result = subprocess.run(
            [sys.executable, 'manage.py'] + command_list,
            cwd=src_dir,
            capture_output=True,
            text=True,
            check=True
        )
        if result.stdout:
            print(result.stdout)
        print_success(f"{description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"{description} failed")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(e.stderr)
        return False


def create_initial_data():
    """Create initial roles, crime levels, and admin user."""
    print_step("Creating initial data")
    
    project_root = Path(__file__).resolve().parent.parent
    src_dir = project_root / 'src'
    sys.path.insert(0, str(src_dir))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    import django
    django.setup()
    
    from django.contrib.auth import get_user_model
    from apps.accounts.models import Role
    from apps.cases.models import CrimeLevel
    
    User = get_user_model()
    
    # Create roles
    print("  Creating roles...")
    roles_data = [
        # Non-police roles
        {'name': 'Base User', 'description': 'Default role for all users', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Complainant', 'description': 'Person filing complaint', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Witness', 'description': 'Crime witness', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Suspect', 'description': 'Crime suspect', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Criminal', 'description': 'Convicted criminal', 'is_police_rank': False, 'hierarchy_level': 0},
        
        # Police hierarchy
        {'name': 'Cadet', 'description': 'Entry level - reviews initial complaints', 'is_police_rank': True, 'hierarchy_level': 1},
        {'name': 'Patrol Officer', 'description': 'Field patrol officer', 'is_police_rank': True, 'hierarchy_level': 2},
        {'name': 'Police Officer', 'description': 'Regular police officer - reports crime scenes', 'is_police_rank': True, 'hierarchy_level': 3},
        {'name': 'Detective', 'description': 'Investigates cases and identifies suspects', 'is_police_rank': True, 'hierarchy_level': 4},
        {'name': 'Sergeant', 'description': 'Oversees investigations and interrogations', 'is_police_rank': True, 'hierarchy_level': 5},
        {'name': 'Lieutenant', 'description': 'Supervises detectives and sergeants', 'is_police_rank': True, 'hierarchy_level': 6},
        {'name': 'Captain', 'description': 'Approves cases for trial', 'is_police_rank': True, 'hierarchy_level': 7},
        {'name': 'Deputy Chief', 'description': 'Second in command of police department', 'is_police_rank': True, 'hierarchy_level': 8},
        {'name': 'Chief', 'description': 'Handles critical cases', 'is_police_rank': True, 'hierarchy_level': 9},
        
        # Judicial
        {'name': 'Judge', 'description': 'Presides over trials', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Coroner', 'description': 'Forensic medical examiner', 'is_police_rank': False, 'hierarchy_level': 0},
        
        # Administrative
        {'name': 'Administrator', 'description': 'System administrator', 'is_police_rank': False, 'hierarchy_level': 10},
    ]
    
    roles_created = 0
    for role_data in roles_data:
        role, created = Role.objects.get_or_create(
            name=role_data['name'],
            defaults=role_data
        )
        if created:
            roles_created += 1
    
    print(f"    ✓ {roles_created} roles created, {len(roles_data) - roles_created} already existed")
    
    # Create crime levels
    print("  Creating crime levels...")
    levels_data = [
        {'name': 'Level 3 - Minor Crimes', 'level': 3, 'description': 'Petty theft, minor fraud, shoplifting'},
        {'name': 'Level 2 - Medium Crimes', 'level': 2, 'description': 'Car theft, burglary, assault'},
        {'name': 'Level 1 - Major Crimes', 'level': 1, 'description': 'Murder, armed robbery, kidnapping'},
        {'name': 'Critical - Severe Crimes', 'level': 0, 'description': 'Serial murder, terrorism, assassination'},
    ]
    
    levels_created = 0
    for level_data in levels_data:
        level, created = CrimeLevel.objects.get_or_create(
            level=level_data['level'],
            defaults=level_data
        )
        if created:
            levels_created += 1
    
    print(f"    ✓ {levels_created} crime levels created, {len(levels_data) - levels_created} already existed")
    
    # Create admin user
    print("  Creating admin user...")
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@lanoire.gov',
            phone_number='+11234567890',
            national_id='0000000001',
            first_name='System',
            last_name='Administrator',
            password='admin123'
        )
        admin_role = Role.objects.get(name='Administrator')
        admin.roles.add(admin_role)
        print("    ✓ Admin user created (username: admin, password: admin123)")
    else:
        print("    ✓ Admin user already exists")
    
    print_success("Initial data created")
    return True


def main():
    """Main setup function."""
    print_header("LA NOIRE NEXTGEN - INITIAL SETUP")
    print("This script will set up your development environment from scratch")
    
    # Step 1: Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Step 2: Check virtual environment
    if not check_virtualenv():
        sys.exit(1)
    
    # Step 3: Check .env file
    if not check_env_file():
        sys.exit(1)
    
    # Step 4: Ensure database exists
    if not ensure_database_exists():
        sys.exit(1)
    
    # Step 5: Create migration directories
    if not create_migration_directories():
        sys.exit(1)
    
    # Step 6: Create migrations
    if not run_django_command(['makemigrations'], "Creating migrations"):
        sys.exit(1)
    
    # Step 7: Run migrations
    if not run_django_command(['migrate'], "Applying migrations"):
        sys.exit(1)
    
    # Step 8: Create initial data
    try:
        if not create_initial_data():
            sys.exit(1)
    except Exception as e:
        print_error(f"Failed to create initial data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # Success!
    print_header("✅ SETUP COMPLETED SUCCESSFULLY!")
    print("\n📝 Default Admin Credentials:")
    print("   Username: admin")
    print("   Password: admin123")
    print("\n🚀 Next Steps:")
    print("   1. cd src")
    print("   2. python manage.py runserver")
    print("   3. Visit http://localhost:8000/api/docs/")
    print("\n💡 Tip: You can run scripts/verify_setup.py to verify your installation")
    print("=" * 60)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
