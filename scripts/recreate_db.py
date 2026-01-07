#!/usr/bin/env python
"""
Database recreation script for LA Noire NextGen.
Drops and recreates the database, runs migrations, and loads initial data.
"""
import os
import sys
import django
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from pathlib import Path
from decouple import config

# Add project to path
project_root = Path(__file__).resolve().parent.parent / 'src'
sys.path.insert(0, str(project_root))

def ensure_database_exists():
    """Ensure the target database exists, create it if not."""
    db_name = config('DB_NAME', default='lanoire_db')
    db_user = config('DB_USER', default='postgres')
    db_password = config('DB_PASSWORD', default='postgres')
    db_host = config('DB_HOST', default='localhost')
    db_port = config('DB_PORT', default='5432')
    
    print(f"🔍 Checking if database '{db_name}' exists...")
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (db_name,))
        exists = cur.fetchone()
        
        if not exists:
            print(f"🏗️  Database '{db_name}' not found. Creating...")
            cur.execute(f'CREATE DATABASE "{db_name}"')
            print(f"✅ Database '{db_name}' created successfully")
        else:
            print(f"✓ Database '{db_name}' exists")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"⚠️  Warning: Could not check/create database: {e}")
        print("   Continuing anyway, Django might still be able to connect.")

# Ensure database exists before Django tries to connect
ensure_database_exists()

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.db import connection
from django.contrib.auth import get_user_model

User = get_user_model()


def drop_database():
    """Drop all tables in the database."""
    print("🗑️  Dropping existing database tables...")
    with connection.cursor() as cursor:
        # Get all tables
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        """)
        tables = cursor.fetchall()
        
        # Drop each table
        for table in tables:
            cursor.execute(f'DROP TABLE IF EXISTS "{table[0]}" CASCADE')
    
    print("✅ Database tables dropped successfully")


def run_migrations():
    """Run Django migrations to create database schema."""
    print("\n📝 Running migrations...")
    call_command('makemigrations')
    call_command('migrate')
    print("✅ Migrations completed successfully")


def create_initial_roles():
    """Create default police ranks and roles."""
    from apps.accounts.models import Role
    
    print("\n👮 Creating initial roles...")
    
    roles_data = [
        # Non-police roles
        {'name': 'Base User', 'description': 'Default role for all users', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Complainant', 'description': 'Person filing complaint', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Witness', 'description': 'Crime witness', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Suspect', 'description': 'Crime suspect', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Criminal', 'description': 'Convicted criminal', 'is_police_rank': False, 'hierarchy_level': 0},
        
        # Police hierarchy (higher level = more authority)
        {'name': 'Cadet', 'description': 'Entry level - validates and reviews initial complaints', 'is_police_rank': True, 'hierarchy_level': 1},
        {'name': 'Patrol Officer', 'description': 'Field patrol - can report crime scenes', 'is_police_rank': True, 'hierarchy_level': 2},
        {'name': 'Police Officer', 'description': 'Regular officer - can report crime scenes and approve them', 'is_police_rank': True, 'hierarchy_level': 3},
        {'name': 'Detective', 'description': 'Investigates cases and identifies suspects', 'is_police_rank': True, 'hierarchy_level': 4},
        {'name': 'Sergeant', 'description': 'Oversees investigations and interrogations', 'is_police_rank': True, 'hierarchy_level': 5},
        {'name': 'Captain', 'description': 'Approves cases for trial', 'is_police_rank': True, 'hierarchy_level': 6},
        {'name': 'Police Chief', 'description': 'Chief of police - handles critical cases', 'is_police_rank': True, 'hierarchy_level': 7},
        
        # Judicial/Forensic
        {'name': 'Forensic Doctor', 'description': 'Reviews biological and medical evidence', 'is_police_rank': False, 'hierarchy_level': 0},
        {'name': 'Judge', 'description': 'Presides over trials', 'is_police_rank': False, 'hierarchy_level': 0},
        
        # Administrative
        {'name': 'Administrator', 'description': 'System administrator', 'is_police_rank': False, 'hierarchy_level': 10},
    ]
    
    for role_data in roles_data:
        role, created = Role.objects.get_or_create(
            name=role_data['name'],
            defaults=role_data
        )
        print(f"  {'✨ Created' if created else '✓ Exists'}: {role.name}")
    
    print("✅ Roles created successfully")


def create_crime_levels():
    """Create crime severity levels."""
    from apps.cases.models import CrimeLevel
    
    print("\n🔫 Creating crime levels...")
    
    levels = [
        {'name': 'Level 3 - Minor Crimes', 'level': 3, 'description': 'Petty theft, minor fraud, shoplifting'},
        {'name': 'Level 2 - Medium Crimes', 'level': 2, 'description': 'Car theft, burglary, assault'},
        {'name': 'Level 1 - Major Crimes', 'level': 1, 'description': 'Murder, armed robbery, kidnapping'},
        {'name': 'Critical - Severe Crimes', 'level': 0, 'description': 'Serial murder, terrorism, assassination of public figures'},
    ]
    
    for level_data in levels:
        level, created = CrimeLevel.objects.get_or_create(
            level=level_data['level'],
            defaults=level_data
        )
        print(f"  {'✨ Created' if created else '✓ Exists'}: {level.name}")
    
    print("✅ Crime levels created successfully")


def create_sample_users():
    """Create sample users for testing."""
    from apps.accounts.models import Role
    
    print("\n👤 Creating sample users...")
    
    # Create superuser
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
        admin.roles.add(Role.objects.get(name='Administrator'))
        print("  ✨ Created: admin (password: admin123)")
    
    # Create sample police personnel
    police_users = [
        {'username': 'cadet1', 'role': 'Cadet', 'first_name': 'John', 'last_name': 'Doe'},
        {'username': 'patrol1', 'role': 'Patrol Officer', 'first_name': 'Mike', 'last_name': 'Johnson'},
        {'username': 'officer1', 'role': 'Police Officer', 'first_name': 'Jane', 'last_name': 'Smith'},
        {'username': 'detective1', 'role': 'Detective', 'first_name': 'Cole', 'last_name': 'Phelps'},
        {'username': 'sergeant1', 'role': 'Sergeant', 'first_name': 'Hank', 'last_name': 'Merrill'},
        {'username': 'captain1', 'role': 'Captain', 'first_name': 'James', 'last_name': 'Donnelly'},
        {'username': 'chief1', 'role': 'Police Chief', 'first_name': 'William', 'last_name': 'Worrell'},
        {'username': 'forensic1', 'role': 'Forensic Doctor', 'first_name': 'Malcolm', 'last_name': 'Carruthers'},
        {'username': 'judge1', 'role': 'Judge', 'first_name': 'Margaret', 'last_name': 'Johnson'},
    ]
    
    for i, user_data in enumerate(police_users, start=2):
        if not User.objects.filter(username=user_data['username']).exists():
            user = User.objects.create_user(
                username=user_data['username'],
                email=f"{user_data['username']}@lanoire.gov",
                phone_number=f'+1123456{str(i).zfill(4)}',
                national_id=str(i).zfill(10),
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                password='password123'
            )
            role = Role.objects.get(name=user_data['role'])
            user.roles.add(role)
            print(f"  ✨ Created: {user.username} ({role.name}) - password: password123")
    
    # Create sample civilian users
    civilian_users = [
        {'username': 'citizen1', 'first_name': 'Alice', 'last_name': 'Williams'},
        {'username': 'citizen2', 'first_name': 'Bob', 'last_name': 'Brown'},
    ]
    
    base_role = Role.objects.get(name='Base User')
    for i, user_data in enumerate(civilian_users, start=20):
        if not User.objects.filter(username=user_data['username']).exists():
            user = User.objects.create_user(
                username=user_data['username'],
                email=f"{user_data['username']}@example.com",
                phone_number=f'+1123456{str(i).zfill(4)}',
                national_id=str(i).zfill(10),
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                password='password123'
            )
            user.roles.add(base_role)
            print(f"  ✨ Created: {user.username} (Base User) - password: password123")
    
    print("✅ Sample users created successfully")


def main():
    """Main execution function."""
    print("=" * 60)
    print("LA NOIRE NEXTGEN - DATABASE RECREATION SCRIPT")
    print("=" * 60)
    
    try:
        # Step 1: Drop existing database
        drop_database()
        
        # Step 2: Run migrations
        run_migrations()
        
        # Step 3: Create initial data
        create_initial_roles()
        create_crime_levels()
        create_sample_users()
        
        print("\n" + "=" * 60)
        print("✅ DATABASE SETUP COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\n📝 Default Credentials:")
        print("  Admin: admin / admin123")
        print("  All other users: [username] / password123")
        print("\n🚀 You can now start the development server:")
        print("  cd src && python manage.py runserver")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during database setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
