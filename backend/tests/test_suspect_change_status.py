"""
Tests for the Suspect change_status endpoint.
Verifies role-based access control and status transition logic.
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import Case, CrimeLevel
from apps.investigation.models import Suspect

User = get_user_model()
CHANGE_STATUS_URL = '/api/v1/investigation/suspects/{pk}/change-status/'


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def crime_level(db):
    return CrimeLevel.objects.create(name='Critical', level=0, description='Most severe')


@pytest.fixture
def cadet_role(db):
    return Role.objects.create(name='Cadet', description='Police cadet', is_police_rank=True, hierarchy_level=1)


@pytest.fixture
def detective_role(db):
    return Role.objects.create(name='Detective', description='Detective', is_police_rank=True, hierarchy_level=4)


@pytest.fixture
def sergeant_role(db):
    return Role.objects.create(name='Sergeant', description='Sergeant', is_police_rank=True, hierarchy_level=5)


@pytest.fixture
def captain_role(db):
    return Role.objects.create(name='Captain', description='Captain', is_police_rank=True, hierarchy_level=7)


@pytest.fixture
def base_role(db):
    return Role.objects.create(name='Base User', description='Normal user', is_police_rank=False, hierarchy_level=0)


@pytest.fixture
def detective_user(db, detective_role):
    user = User.objects.create_user(
        username='det_status', email='det_status@test.com',
        phone_number='09120000001', national_id='1234567890', password='testpass',
    )
    user.roles.add(detective_role)
    return user


@pytest.fixture
def sergeant_user(db, sergeant_role):
    user = User.objects.create_user(
        username='sgt_status', email='sgt_status@test.com',
        phone_number='09120000002', national_id='1234567891', password='testpass',
    )
    user.roles.add(sergeant_role)
    return user


@pytest.fixture
def captain_user(db, captain_role):
    user = User.objects.create_user(
        username='cpt_status', email='cpt_status@test.com',
        phone_number='09120000003', national_id='1234567892', password='testpass',
    )
    user.roles.add(captain_role)
    return user


@pytest.fixture
def cadet_user(db, cadet_role):
    user = User.objects.create_user(
        username='cadet_status', email='cadet_status@test.com',
        phone_number='09120000004', national_id='1234567893', password='testpass',
    )
    user.roles.add(cadet_role)
    return user


@pytest.fixture
def suspect_person(db, base_role):
    user = User.objects.create_user(
        username='suspect_person', email='suspect@test.com',
        phone_number='09120000005', national_id='1234567894', password='testpass',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def open_case(db, crime_level, detective_user):
    return Case.objects.create(
        title='Change Status Test Case',
        description='For status change tests',
        crime_level=crime_level,
        status=Case.STATUS_OPEN,
        created_by=detective_user,
    )


@pytest.fixture
def suspect(db, open_case, suspect_person, detective_user):
    return Suspect.objects.create(
        case=open_case,
        person=suspect_person,
        status=Suspect.STATUS_UNDER_PURSUIT,
        reason='Testing status changes',
        identified_by_detective=detective_user,
    )


# ── Tests ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSuspectChangeStatus:
    """Tests for POST /api/v1/investigation/suspects/{pk}/change-status/"""

    def _url(self, pk):
        return CHANGE_STATUS_URL.format(pk=pk)

    def test_detective_can_change_status(self, detective_user, suspect):
        """Detectives can change suspect status."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.post(self._url(suspect.id), {'status': 'intensive_pursuit'})
        assert resp.status_code == 200
        suspect.refresh_from_db()
        assert suspect.status == 'intensive_pursuit'

    def test_sergeant_can_change_status(self, sergeant_user, suspect):
        """Sergeants can change suspect status."""
        client = APIClient()
        client.force_authenticate(user=sergeant_user)
        resp = client.post(self._url(suspect.id), {'status': 'arrested'})
        assert resp.status_code == 200
        suspect.refresh_from_db()
        assert suspect.status == 'arrested'

    def test_captain_can_change_status(self, captain_user, suspect):
        """Captains can change suspect status."""
        client = APIClient()
        client.force_authenticate(user=captain_user)
        resp = client.post(self._url(suspect.id), {'status': 'cleared'})
        assert resp.status_code == 200
        suspect.refresh_from_db()
        assert suspect.status == 'cleared'

    def test_cadet_cannot_change_status(self, cadet_user, suspect):
        """Cadets are NOT allowed to change suspect status."""
        client = APIClient()
        client.force_authenticate(user=cadet_user)
        resp = client.post(self._url(suspect.id), {'status': 'arrested'})
        assert resp.status_code == 403
        suspect.refresh_from_db()
        assert suspect.status == Suspect.STATUS_UNDER_PURSUIT  # unchanged

    def test_unauthenticated_cannot_change_status(self, suspect):
        """Unauthenticated users are denied."""
        client = APIClient()
        resp = client.post(self._url(suspect.id), {'status': 'arrested'})
        assert resp.status_code in (401, 403)

    def test_invalid_status_rejected(self, detective_user, suspect):
        """Invalid status values are rejected with 400."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.post(self._url(suspect.id), {'status': 'nonexistent'})
        assert resp.status_code == 400

    def test_arrested_sets_timestamp(self, detective_user, suspect):
        """Changing status to 'arrested' records arrested_at timestamp."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        assert suspect.arrested_at is None
        resp = client.post(self._url(suspect.id), {'status': 'arrested'})
        assert resp.status_code == 200
        suspect.refresh_from_db()
        assert suspect.arrested_at is not None

    def test_intensive_pursuit_manual(self, detective_user, suspect):
        """
        A detective can manually escalate a suspect to intensive_pursuit
        (most wanted) without waiting for the 30-day automatic threshold.
        """
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.post(self._url(suspect.id), {'status': 'intensive_pursuit'})
        assert resp.status_code == 200
        suspect.refresh_from_db()
        assert suspect.status == 'intensive_pursuit'

    def test_change_status_returns_serialized_suspect(self, detective_user, suspect):
        """Response body contains full serialized suspect data."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.post(self._url(suspect.id), {'status': 'arrested'})
        data = resp.json()
        assert data['id'] == suspect.id
        assert data['status'] == 'arrested'
        assert 'person_full_name' in data or 'person' in data
