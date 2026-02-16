"""
Pytest configuration and fixtures for LA Noire NextGen tests.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.accounts.models import Role

User = get_user_model()


@pytest.fixture
def api_client():
    """Fixture for API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, test_user):
    """Fixture for authenticated API client."""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def test_user(db):
    """Create a test user."""
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        phone_number='+11234567890',
        national_id='1234567890',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )
    return user


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    user = User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        phone_number='+10987654321',
        national_id='0987654321',
        password='adminpass123',
        first_name='Admin',
        last_name='User'
    )
    return user


@pytest.fixture
def detective_role(db):
    """Create a Detective role."""
    return Role.objects.create(
        name='Detective',
        description='Investigates cases and collects evidence',
        is_police_rank=True,
        hierarchy_level=4
    )


@pytest.fixture
def captain_role(db):
    """Create a Captain role."""
    return Role.objects.create(
        name='Captain',
        description='Supervises detectives and manages cases',
        is_police_rank=True,
        hierarchy_level=6
    )


@pytest.fixture
def base_role(db):
    """Create a Base User role."""
    return Role.objects.create(
        name='Base User',
        description='Default role for all users',
        is_police_rank=False,
        hierarchy_level=0
    )


@pytest.fixture
def detective_user(db, detective_role):
    """Create a user with Detective role."""
    user = User.objects.create_user(
        username='detective',
        email='detective@example.com',
        phone_number='+11234567891',
        national_id='1234567891',
        password='detectivepass123',
        first_name='John',
        last_name='Detective'
    )
    user.roles.add(detective_role)
    return user


@pytest.fixture
def captain_user(db, captain_role):
    """Create a user with Captain role."""
    user = User.objects.create_user(
        username='captain',
        email='captain@example.com',
        phone_number='+11234567892',
        national_id='1234567892',
        password='captainpass123',
        first_name='Jane',
        last_name='Captain'
    )
    user.roles.add(captain_role)
    return user
