"""
Session 6 patch tests:
1. Bail request creation restricted to police officers (Cadet+)
2. Normal citizen blocked from creating bail request
3. Collaborative complaint — create with additional complainants
4. Public cases endpoint returns crime-scene cases only
5. Join case — citizen joins a public crime scene case
6. Join case — duplicate prevented
7. Join case — non-crime-scene case rejected
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import CrimeLevel, Case, Complainant
from apps.investigation.models import Suspect
from apps.trial.models import BailPayment

User = get_user_model()


# ─── Fixtures ───────────────────────────────────────────────────────────────


@pytest.fixture
def base_role(db):
    return Role.objects.get_or_create(
        name='Base User',
        defaults={'description': 'Default role', 'is_police_rank': False, 'hierarchy_level': 0}
    )[0]


@pytest.fixture
def cadet_role(db):
    return Role.objects.get_or_create(
        name='Cadet',
        defaults={'description': 'Trainee officer', 'is_police_rank': True, 'hierarchy_level': 1}
    )[0]


@pytest.fixture
def patrol_officer_role(db):
    return Role.objects.get_or_create(
        name='Patrol Officer',
        defaults={'description': 'Patrol officer', 'is_police_rank': True, 'hierarchy_level': 2}
    )[0]


@pytest.fixture
def police_officer_role(db):
    return Role.objects.get_or_create(
        name='Police Officer',
        defaults={'description': 'Police officer', 'is_police_rank': True, 'hierarchy_level': 3}
    )[0]


@pytest.fixture
def detective_role(db):
    return Role.objects.get_or_create(
        name='Detective',
        defaults={'description': 'Investigator', 'is_police_rank': True, 'hierarchy_level': 4}
    )[0]


@pytest.fixture
def sergeant_role(db):
    return Role.objects.get_or_create(
        name='Sergeant',
        defaults={'description': 'Supervising officer', 'is_police_rank': True, 'hierarchy_level': 5}
    )[0]


@pytest.fixture
def captain_role(db):
    return Role.objects.get_or_create(
        name='Captain',
        defaults={'description': 'Captain', 'is_police_rank': True, 'hierarchy_level': 6}
    )[0]


@pytest.fixture
def admin_role(db):
    return Role.objects.get_or_create(
        name='Administrator',
        defaults={'description': 'Administrator', 'is_police_rank': False, 'hierarchy_level': 10}
    )[0]


def _make_user(db, username, email, role=None, **kwargs):
    """Helper to create user with unique fields."""
    user = User.objects.create_user(
        username=username,
        email=email,
        phone_number=kwargs.get('phone', f'+1{abs(hash(username)) % 10**10:010d}'),
        national_id=kwargs.get('nid', f'{abs(hash(username)) % 10**10:010d}'),
        password='TestPass123!',
        first_name=kwargs.get('first_name', username.title()),
        last_name=kwargs.get('last_name', 'Tester'),
    )
    if role:
        user.roles.add(role)
    return user


@pytest.fixture
def citizen_user(db, base_role):
    return _make_user(db, 'citizen_s6', 'citizen_s6@test.com', base_role)


@pytest.fixture
def citizen_user2(db, base_role):
    return _make_user(db, 'citizen2_s6', 'citizen2_s6@test.com', base_role)


@pytest.fixture
def citizen_user3(db, base_role):
    return _make_user(db, 'citizen3_s6', 'citizen3_s6@test.com', base_role)


@pytest.fixture
def cadet_user(db, cadet_role):
    return _make_user(db, 'cadet_s6', 'cadet_s6@test.com', cadet_role)


@pytest.fixture
def officer_user(db, police_officer_role):
    return _make_user(db, 'officer_s6', 'officer_s6@test.com', police_officer_role)


@pytest.fixture
def detective_user(db, detective_role):
    return _make_user(db, 'detective_s6', 'detective_s6@test.com', detective_role)


@pytest.fixture
def sergeant_user(db, sergeant_role):
    return _make_user(db, 'sergeant_s6', 'sergeant_s6@test.com', sergeant_role)


@pytest.fixture
def crime_level_2(db):
    return CrimeLevel.objects.get_or_create(
        level=2,
        defaults={'name': 'Level 2 - Medium', 'description': 'Medium severity crime'}
    )[0]


@pytest.fixture
def crime_level_3(db):
    return CrimeLevel.objects.get_or_create(
        level=3,
        defaults={'name': 'Level 3 - Minor', 'description': 'Low severity crime'}
    )[0]


def _make_case_with_suspect(db, crime_level, officer, formation='complaint'):
    """Create a case with a suspect for bail testing."""
    import uuid
    case = Case.objects.create(
        case_number=f'2024-TEST-{uuid.uuid4().hex[:8].upper()}',
        title='Test bail case',
        description='Testing bail restrictions',
        crime_level=crime_level,
        formation_type=formation,
        status=Case.STATUS_TRIAL_PENDING,
        created_by=officer,
    )
    suspect = Suspect.objects.create(
        case=case,
        person=officer,
        status='arrested',
    )
    return case, suspect


# ═══════════════════════════════════════════════════════════════════════════
# 1. BAIL ROLE RESTRICTION TESTS
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestBailRoleRestriction:
    """Bail request creation restricted to police officers (Cadet+)."""

    def test_citizen_cannot_create_bail_request(self, citizen_user, officer_user, crime_level_2):
        """Normal citizen should be blocked from creating bail requests."""
        _, suspect = _make_case_with_suspect(None, crime_level_2, officer_user)
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect.id,
            'amount': '5000000',
        })
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert 'police officers' in resp.data['detail'].lower() or 'Cadet' in resp.data['detail']

    def test_cadet_can_create_bail_request(self, cadet_user, officer_user, crime_level_2):
        """Cadet (lowest police rank) should be allowed to create bail requests."""
        _, suspect = _make_case_with_suspect(None, crime_level_2, officer_user)
        client = APIClient()
        client.force_authenticate(user=cadet_user)
        resp = client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect.id,
            'amount': '5000000',
        })
        assert resp.status_code == status.HTTP_201_CREATED

    def test_detective_can_create_bail_request(self, detective_user, officer_user, crime_level_3):
        """Detective should be allowed to create bail requests."""
        _, suspect = _make_case_with_suspect(None, crime_level_3, officer_user)
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect.id,
            'amount': '10000000',
        })
        assert resp.status_code == status.HTTP_201_CREATED

    def test_sergeant_can_create_bail_request(self, sergeant_user, officer_user, crime_level_2):
        """Sergeant should be allowed to create bail requests."""
        _, suspect = _make_case_with_suspect(None, crime_level_2, officer_user)
        client = APIClient()
        client.force_authenticate(user=sergeant_user)
        resp = client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect.id,
            'amount': '5000000',
        })
        assert resp.status_code == status.HTTP_201_CREATED


# ═══════════════════════════════════════════════════════════════════════════
# 2. COLLABORATIVE COMPLAINT TESTS
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestCollaborativeComplaints:
    """Creating a complaint with additional complainants."""

    def test_create_complaint_with_additional_complainants(
        self, citizen_user, citizen_user2, citizen_user3, crime_level_2
    ):
        """Citizen can create complaint and add co-complainants."""
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post('/api/v1/cases/cases/', {
            'title': 'Neighbourhood break-in',
            'description': 'Multiple houses broken into on Elm Street',
            'crime_level': crime_level_2.id,
            'complainant_statement': 'My house was broken into and valuables stolen.',
            'additional_complainants': [
                {'user_id': citizen_user2.id, 'statement': 'My garage was broken into on the same night, tools are missing.'},
                {'user_id': citizen_user3.id, 'statement': 'My car was vandalized during the break-in spree on Elm Street.'},
            ],
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        case_id = resp.data['id']
        # Verify 3 complainants created
        complainants = Complainant.objects.filter(case_id=case_id)
        assert complainants.count() == 3
        assert complainants.filter(is_primary=True).count() == 1
        assert complainants.filter(is_primary=False).count() == 2

    def test_create_complaint_without_additional_complainants(
        self, citizen_user, crime_level_2
    ):
        """Standard complaint without co-complainants still works."""
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post('/api/v1/cases/cases/', {
            'title': 'Stolen bicycle',
            'description': 'My bicycle was stolen from outside the grocery store',
            'crime_level': crime_level_2.id,
            'complainant_statement': 'I left my bicycle locked at the grocery store and it was gone when I returned.',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        case_id = resp.data['id']
        complainants = Complainant.objects.filter(case_id=case_id)
        assert complainants.count() == 1
        assert complainants.first().is_primary is True

    def test_additional_complainant_duplicate_self_skipped(
        self, citizen_user, crime_level_2
    ):
        """If creator adds themselves as additional complainant, it is skipped."""
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post('/api/v1/cases/cases/', {
            'title': 'Noise complaint',
            'description': 'Excessive noise from construction site at night',
            'crime_level': crime_level_2.id,
            'complainant_statement': 'The construction noise is unbearable and continues past midnight.',
            'additional_complainants': [
                {'user_id': citizen_user.id, 'statement': 'Duplicate entry should be skipped by the system.'},
            ],
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        case_id = resp.data['id']
        complainants = Complainant.objects.filter(case_id=case_id)
        assert complainants.count() == 1  # Only primary, duplicate skipped


# ═══════════════════════════════════════════════════════════════════════════
# 3. PUBLIC CASES TESTS
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestPublicCases:
    """Public cases endpoint and join_case action."""

    def _make_scene_case(self, officer, crime_level, case_status=Case.STATUS_OPEN):
        """Create a crime scene case."""
        import uuid
        return Case.objects.create(
            case_number=f'2024-SCEN-{uuid.uuid4().hex[:8].upper()}',
            title='Armed robbery at Main St',
            description='Armed robbery reported at Main Street convenience store',
            crime_level=crime_level,
            formation_type=Case.FORMATION_CRIME_SCENE,
            status=case_status,
            created_by=officer,
            crime_scene_location='123 Main St, Los Angeles',
            crime_scene_datetime=timezone.now(),
        )

    def test_public_cases_returns_only_crime_scene(
        self, citizen_user, officer_user, crime_level_2
    ):
        """Public endpoint returns only crime_scene cases in valid statuses."""
        # Create one complaint and one scene case
        import uuid
        Case.objects.create(
            case_number=f'2024-CMPL-{uuid.uuid4().hex[:8].upper()}',
            title='Complaint case',
            description='Should not appear in public list',
            crime_level=crime_level_2,
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_OPEN,
            created_by=citizen_user,
        )
        scene = self._make_scene_case(officer_user, crime_level_2)

        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.get('/api/v1/cases/cases/public/')
        assert resp.status_code == status.HTTP_200_OK
        ids = [c['id'] for c in resp.data]
        assert scene.id in ids
        # Complaint should NOT be in public list
        complaint_ids = [c['id'] for c in resp.data if c['formation_type'] == 'complaint']
        assert len(complaint_ids) == 0

    def test_citizen_can_join_public_case(
        self, citizen_user, officer_user, crime_level_2
    ):
        """Citizen provides statement and becomes complainant on scene case."""
        scene = self._make_scene_case(officer_user, crime_level_2)
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(f'/api/v1/cases/cases/{scene.id}/join_case/', {
            'statement': 'I was a witness to the robbery and can identify the suspect.',
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert Complainant.objects.filter(case=scene, user=citizen_user).exists()

    def test_citizen_cannot_join_twice(
        self, citizen_user, officer_user, crime_level_2
    ):
        """Duplicate join attempt returns 400."""
        scene = self._make_scene_case(officer_user, crime_level_2)
        Complainant.objects.create(
            case=scene, user=citizen_user,
            statement='Already here', is_primary=False,
        )
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(f'/api/v1/cases/cases/{scene.id}/join_case/', {
            'statement': 'Trying to join again — should be blocked.',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already' in resp.data['error'].lower()

    def test_citizen_cannot_join_complaint_case(
        self, citizen_user, crime_level_2
    ):
        """Only crime scene cases are joinable — complaint cases return 400."""
        import uuid
        complaint = Case.objects.create(
            case_number=f'2024-CMPL-{uuid.uuid4().hex[:8].upper()}',
            title='Private complaint',
            description='Not a public case',
            crime_level=crime_level_2,
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_OPEN,
            created_by=citizen_user,
        )
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(f'/api/v1/cases/cases/{complaint.id}/join_case/', {
            'statement': 'Trying to join a complaint case — should fail.',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'crime scene' in resp.data['error'].lower()

    def test_join_case_short_statement_rejected(
        self, citizen_user, officer_user, crime_level_2
    ):
        """Statement must be at least 10 characters."""
        scene = self._make_scene_case(officer_user, crime_level_2)
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(f'/api/v1/cases/cases/{scene.id}/join_case/', {
            'statement': 'Short',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_closed_case_not_joinable(
        self, citizen_user, officer_user, crime_level_2
    ):
        """Closed crime scene case should not be joinable (404 or 400)."""
        scene = self._make_scene_case(officer_user, crime_level_2, case_status=Case.STATUS_CLOSED)
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(f'/api/v1/cases/cases/{scene.id}/join_case/', {
            'statement': 'Trying to join a closed case — should be blocked.',
        })
        # Closed case may be excluded from queryset (404) or handled by action (400)
        assert resp.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND)

    def test_public_cases_excludes_closed(
        self, citizen_user, officer_user, crime_level_2
    ):
        """Closed cases should not appear in public list."""
        self._make_scene_case(officer_user, crime_level_2, case_status=Case.STATUS_CLOSED)
        open_case = self._make_scene_case(officer_user, crime_level_2, case_status=Case.STATUS_OPEN)
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.get('/api/v1/cases/cases/public/')
        ids = [c['id'] for c in resp.data]
        assert open_case.id in ids
        # closed should not appear
        assert all(c['status'] != 'closed' for c in resp.data)
