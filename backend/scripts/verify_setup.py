#!/usr/bin/env python
"""
Verify the LA Noire NextGen installation is configured correctly.
Run this script to check all dependencies, database connection, and configurations.
"""

import os
import sys
import django


def check_python_version():
    """Check if Python version is 3.10 or higher."""
    print("Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print(f"❌ Python 3.10+ required. You have Python {version.major}.{version.minor}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_dependencies():
    """Check if all required packages are installed."""
    print("\nChecking dependencies...")
    required_packages = [
        'django',
        'rest_framework',  # djangorestframework imports as rest_framework
        'psycopg2',
        'drf_spectacular',
        'django_filters',
        'corsheaders',
        'PIL',
        'decouple'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - NOT INSTALLED")
            missing.append(package)
    
    if missing:
        print(f"\nMissing packages: {', '.join(missing)}")
        print("Install with: pip install -r requirements.txt")
        return False
    return True


def check_django_setup():
    """Check if Django can be configured."""
    print("\nChecking Django setup...")
    try:
        # Add src directory to path
        src_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
        sys.path.insert(0, src_path)
        
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        print("✅ Django configuration loaded")
        return True
    except Exception as e:
        print(f"❌ Django setup failed: {e}")
        return False


def check_database_connection():
    """Check if database connection works."""
    print("\nChecking database connection...")
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ Database connection successful")
        return True
    except Exception as e:
        error_msg = str(e).lower()
        print(f"❌ Database connection failed")
        
        if 'does not exist' in error_msg:
            print("\n⚠️  Database does not exist. Run: python scripts/recreate_db.py")
        elif 'password authentication failed' in error_msg:
            print("\n⚠️  Database password incorrect. Check your .env file")
        elif 'could not connect' in error_msg or 'connection refused' in error_msg:
            print("\n⚠️  PostgreSQL server is not running")
            print("   Start PostgreSQL: brew services start postgresql (macOS)")
        elif '.env' in error_msg or 'environment' in error_msg:
            print("\n⚠️  .env file missing or incomplete")
            print("   1. Copy: cp .env.example .env")
            print("   2. Edit .env with your database credentials")
        else:
            print(f"   Error: {e}")
            print("\n📝 Troubleshooting:")
            print("   1. Ensure .env file exists with DB credentials")
            print("   2. Ensure PostgreSQL is running")
            print("   3. Run: python scripts/recreate_db.py")
        
        return False


def check_migrations():
    """Check if all migrations are applied."""
    print("\nChecking migrations...")
    try:
        from django.core.management import call_command
        from io import StringIO
        
        # Capture output
        out = StringIO()
        call_command('showmigrations', stdout=out, no_color=True)
        output = out.getvalue()
        
        # Check if any migrations are unapplied (marked with [ ])
        if '[ ]' in output:
            print("❌ Unapplied migrations found")
            print(output)
            print("\nRun: python src/manage.py migrate")
            return False
        
        print("✅ All migrations applied")
        return True
    except Exception as e:
        print(f"❌ Migration check failed: {e}")
        return False


def check_models():
    """Check if all models can be imported."""
    print("\nChecking models...")
    try:
        from apps.accounts.models import User, Role
        from apps.cases.models import Case, CrimeLevel
        from apps.evidence.models import Testimony, BiologicalEvidence
        from apps.investigation.models import DetectiveBoard, Suspect
        from apps.trial.models import Trial, Verdict
        
        print("✅ All models imported successfully")
        return True
    except Exception as e:
        print(f"❌ Model import failed: {e}")
        return False


def check_admin_user():
    """Check if admin user exists."""
    print("\nChecking for admin user...")
    try:
        from apps.accounts.models import User
        if User.objects.filter(username='admin').exists():
            print("✅ Admin user exists (username: admin)")
            return True
        else:
            print("⚠️  No admin user found")
            print("Run: python scripts/recreate_db.py")
            print("Or create manually: python src/manage.py createsuperuser")
            return False
    except Exception as e:
        print(f"❌ Admin check failed: {e}")
        return False


def print_summary(checks):
    """Print summary of all checks."""
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    total = len(checks)
    passed = sum(checks.values())
    
    for check_name, result in checks.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {check_name}")
    
    print("=" * 60)
    print(f"Result: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 All checks passed! Your installation is ready.")
        print("\nNext steps:")
        print("  1. cd src")
        print("  2. python manage.py runserver")
        print("  3. Visit http://localhost:8000/api/docs/ for API documentation")
    else:
        print("\n⚠️  Some checks failed. Please fix the issues above.")


def main():
    """Run all verification checks."""
    print("LA Noire NextGen - Installation Verification")
    print("=" * 60)
    
    checks = {}
    
    # Run all checks
    checks['Python Version'] = check_python_version()
    checks['Dependencies'] = check_dependencies()
    
    if checks['Dependencies']:
        checks['Django Setup'] = check_django_setup()
        
        if checks['Django Setup']:
            checks['Database Connection'] = check_database_connection()
            
            if checks['Database Connection']:
                checks['Migrations'] = check_migrations()
                checks['Models'] = check_models()
                checks['Admin User'] = check_admin_user()
    
    # Print summary
    print_summary(checks)
    
    # Exit with appropriate code
    sys.exit(0 if all(checks.values()) else 1)


if __name__ == '__main__':
    main()
