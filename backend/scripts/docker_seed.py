"""Seed initial data (roles, crime levels, admin user) for Docker."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import CrimeLevel

User = get_user_model()

# Create roles
roles_data = [
    {'name': 'Base User', 'description': 'Default role for all users', 'is_police_rank': False, 'hierarchy_level': 0},
    {'name': 'Complainant', 'description': 'Person filing complaint', 'is_police_rank': False, 'hierarchy_level': 0},
    {'name': 'Witness', 'description': 'Crime witness', 'is_police_rank': False, 'hierarchy_level': 0},
    {'name': 'Suspect', 'description': 'Crime suspect', 'is_police_rank': False, 'hierarchy_level': 0},
    {'name': 'Criminal', 'description': 'Convicted criminal', 'is_police_rank': False, 'hierarchy_level': 0},
    {'name': 'Cadet', 'description': 'Entry level - reviews initial complaints', 'is_police_rank': True, 'hierarchy_level': 1},
    {'name': 'Patrol Officer', 'description': 'Field patrol officer', 'is_police_rank': True, 'hierarchy_level': 2},
    {'name': 'Police Officer', 'description': 'Regular police officer - reports crime scenes', 'is_police_rank': True, 'hierarchy_level': 3},
    {'name': 'Detective', 'description': 'Investigates cases and identifies suspects', 'is_police_rank': True, 'hierarchy_level': 4},
    {'name': 'Sergeant', 'description': 'Oversees investigations and interrogations', 'is_police_rank': True, 'hierarchy_level': 5},
    {'name': 'Lieutenant', 'description': 'Supervises detectives and sergeants', 'is_police_rank': True, 'hierarchy_level': 6},
    {'name': 'Captain', 'description': 'Approves cases for trial', 'is_police_rank': True, 'hierarchy_level': 7},
    {'name': 'Deputy Chief', 'description': 'Second in command of police department', 'is_police_rank': True, 'hierarchy_level': 8},
    {'name': 'Chief', 'description': 'Handles critical cases', 'is_police_rank': True, 'hierarchy_level': 9},
    {'name': 'Judge', 'description': 'Presides over trials', 'is_police_rank': False, 'hierarchy_level': 0},
    {'name': 'Coroner', 'description': 'Forensic medical examiner', 'is_police_rank': False, 'hierarchy_level': 0},
    {'name': 'Administrator', 'description': 'System administrator', 'is_police_rank': False, 'hierarchy_level': 10},
]

for role_data in roles_data:
    Role.objects.get_or_create(name=role_data['name'], defaults=role_data)
print(f"Roles: {Role.objects.count()} total")

# Create crime levels
levels_data = [
    {'name': 'Level 3 - Minor Crimes', 'level': 3, 'description': 'Petty theft, minor fraud, shoplifting'},
    {'name': 'Level 2 - Medium Crimes', 'level': 2, 'description': 'Car theft, burglary, assault'},
    {'name': 'Level 1 - Major Crimes', 'level': 1, 'description': 'Murder, armed robbery, kidnapping'},
    {'name': 'Critical - Severe Crimes', 'level': 0, 'description': 'Serial murder, terrorism, assassination'},
]

for level_data in levels_data:
    CrimeLevel.objects.get_or_create(level=level_data['level'], defaults=level_data)
print(f"Crime levels: {CrimeLevel.objects.count()} total")

# Create admin user
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
    print("Admin user created (admin / admin123)")
else:
    print("Admin user already exists")
