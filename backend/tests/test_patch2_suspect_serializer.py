"""
Backend tests for Patch 2: Suspect Serializer person name fields.
Verifies that the SuspectSerializer returns person_first_name,
person_last_name, and person_full_name fields.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import Case, CrimeLevel
from apps.investigation.models import Suspect

User = get_user_model()


@pytest.fixture
def crime_level(db):
    return CrimeLevel.objects.create(name='Level 2 - Medium', level=2, description='Medium')


@pytest.fixture
def detective_role(db):
    return Role.objects.create(name='Detective', description='Detective', is_police_rank=True, hierarchy_level=4)


@pytest.fixture
def base_role(db):
    return Role.objects.create(name='Base User', description='Default', is_police_rank=False, hierarchy_level=0)


@pytest.fixture
def detective_user(db, detective_role):
    user = User.objects.create_user(
        username='det', email='det@test.com',
        phone_number='+13333333333', national_id='3333333333',
        password='pass123', first_name='Sam', last_name='Detective',
    )
    user.roles.add(detective_role)
    return user


@pytest.fixture
def suspect_person(db, base_role):
    user = User.objects.create_user(
        username='suspectperson', email='suspect@test.com',
        phone_number='+15555555555', national_id='5555555555',
        password='pass123', first_name='John', last_name='Doe',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def open_case(db, crime_level, suspect_person):
    return Case.objects.create(
        title='Test Case For Suspect',
        description='Test case.',
        crime_level=crime_level,
        status=Case.STATUS_OPEN,
        created_by=suspect_person,
    )


@pytest.fixture
def suspect(db, open_case, suspect_person, detective_user):
    return Suspect.objects.create(
        case=open_case,
        person=suspect_person,
        status=Suspect.STATUS_UNDER_PURSUIT,
        reason='Test suspect reason',
        identified_by_detective=detective_user,
    )


@pytest.mark.django_db
class TestSuspectSerializerPersonFields:
    """Verify Suspect API returns person name fields."""

    def test_suspect_list_includes_person_name_fields(self, detective_user, suspect):
        """Suspect list should include person_first_name, person_last_name, person_full_name."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        response = client.get('/api/v1/investigation/suspects/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) >= 1
        s = results[0]
        assert 'person_first_name' in s
        assert 'person_last_name' in s
        assert 'person_full_name' in s
        assert s['person_first_name'] == 'John'
        assert s['person_last_name'] == 'Doe'
        assert s['person_full_name'] == 'John Doe'

    def test_suspect_detail_includes_person_name_fields(self, detective_user, suspect):
        """Suspect detail should include person name fields."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        response = client.get(f'/api/v1/investigation/suspects/{suspect.pk}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['person_first_name'] == 'John'
        assert response.data['person_last_name'] == 'Doe'
        assert response.data['person_full_name'] == 'John Doe'

    def test_suspect_still_returns_person_pk(self, detective_user, suspect, suspect_person):
        """Suspect should still return the person FK as an integer."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        response = client.get(f'/api/v1/investigation/suspects/{suspect.pk}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['person'] == suspect_person.pk
