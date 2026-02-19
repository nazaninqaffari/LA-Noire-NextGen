"""
Backend tests for public stats endpoint.
Tests that case statistics are returned without authentication.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import Case, CrimeLevel

User = get_user_model()

PUBLIC_STATS_URL = '/api/v1/cases/public-stats/'


@pytest.fixture
def crime_level(db):
    return CrimeLevel.objects.create(
        name='Level 2 - Medium', level=2, description='Medium crimes'
    )


@pytest.fixture
def base_role(db):
    return Role.objects.create(
        name='Base User', description='Default', is_police_rank=False, hierarchy_level=0
    )


@pytest.fixture
def citizen_user(db, base_role):
    user = User.objects.create_user(
        username='citizen_stats',
        email='cstats@example.com',
        phone_number='+15550090001',
        national_id='STATS001',
        password='TestPass123!',
        first_name='Stats',
        last_name='Citizen',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def sample_cases(db, crime_level, citizen_user):
    """Create a mix of cases in different statuses."""
    cases = []
    statuses = [
        ('draft', 'Draft Case'),
        ('cadet_review', 'Cadet Review Case'),
        ('open', 'Open Case'),
        ('under_investigation', 'Investigation Case'),
        ('closed', 'Closed Case 1'),
        ('closed', 'Closed Case 2'),
        ('rejected', 'Rejected Case'),
    ]
    for i, (st, title) in enumerate(statuses):
        cases.append(Case.objects.create(
            case_number=f'2026-STAT-{i:04d}',
            title=title,
            description=f'Test case for stats - {st}',
            crime_level=crime_level,
            formation_type='complaint',
            status=st,
            created_by=citizen_user,
        ))
    return cases


@pytest.mark.django_db
class TestPublicStatsEndpoint:
    """Tests for the public-stats endpoint."""

    def test_returns_stats_without_authentication(self, sample_cases):
        """Public stats endpoint should work without any authentication."""
        client = APIClient()  # unauthenticated
        response = client.get(PUBLIC_STATS_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'total_cases' in data
        assert 'active_cases' in data
        assert 'solved_cases' in data

    def test_correct_total_count(self, sample_cases):
        """total_cases should equal the total number of cases in the DB."""
        client = APIClient()
        response = client.get(PUBLIC_STATS_URL)
        data = response.json()
        assert data['total_cases'] == 7  # 7 cases created in fixture

    def test_correct_solved_count(self, sample_cases):
        """solved_cases should count only 'closed' cases."""
        client = APIClient()
        response = client.get(PUBLIC_STATS_URL)
        data = response.json()
        assert data['solved_cases'] == 2  # 2 closed cases

    def test_correct_active_count(self, sample_cases):
        """active_cases excludes draft, rejected, and closed."""
        client = APIClient()
        response = client.get(PUBLIC_STATS_URL)
        data = response.json()
        # Total=7, closed=2, draft=1, rejected=1 → active = 7 - 2 - 1 - 1 = 3
        assert data['active_cases'] == 3

    def test_empty_database(self, db):
        """With no cases, all stats should be 0."""
        client = APIClient()
        response = client.get(PUBLIC_STATS_URL)
        data = response.json()
        assert data['total_cases'] == 0
        assert data['active_cases'] == 0
        assert data['solved_cases'] == 0

    def test_authenticated_user_also_works(self, sample_cases, citizen_user):
        """Authenticated users should also be able to access public stats."""
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        response = client.get(PUBLIC_STATS_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['total_cases'] == 7
