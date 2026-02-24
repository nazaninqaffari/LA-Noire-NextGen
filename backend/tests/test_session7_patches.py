"""
Session 7 patch tests:
1. Bug 1 – Co-complainant can see the case in their dashboard
2. Bug 2 – (frontend only, no backend test needed)
3. Bug 3 – Trial creation works with STATUS_AWAITING_CHIEF (critical crimes)
4. Bug 4 – Error messages are in English (no Persian in validation errors)
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import CrimeLevel, Case, Complainant
from apps.investigation.models import (
    Suspect, Interrogation, CaptainDecision, PoliceChiefDecision, Notification,
)
from apps.trial.models import Trial, BailPayment

User = get_user_model()


# ─── Fixtures ───────────────────────────────────────────────────────────────


@pytest.fixture
def base_role(db):
    return Role.objects.get_or_create(
        name='Base User',
        defaults={'description': 'Default role', 'is_police_rank': False, 'hierarchy_level': 0},
    )[0]


@pytest.fixture
def detective_role(db):
    return Role.objects.get_or_create(
        name='Detective',
        defaults={'description': 'Investigator', 'is_police_rank': True, 'hierarchy_level': 4},
    )[0]


@pytest.fixture
def sergeant_role(db):
    return Role.objects.get_or_create(
        name='Sergeant',
        defaults={'description': 'Supervising officer', 'is_police_rank': True, 'hierarchy_level': 5},
    )[0]


@pytest.fixture
def captain_role(db):
    return Role.objects.get_or_create(
        name='Captain',
        defaults={'description': 'Captain', 'is_police_rank': True, 'hierarchy_level': 6},
    )[0]


@pytest.fixture
def judge_role(db):
    return Role.objects.get_or_create(
        name='Judge',
        defaults={'description': 'Judge', 'is_police_rank': False, 'hierarchy_level': 0},
    )[0]


@pytest.fixture
def crime_level_critical(db):
    return CrimeLevel.objects.get_or_create(
        level=CrimeLevel.LEVEL_CRITICAL,
        defaults={'name': 'Critical', 'description': 'Critical crimes'},
    )[0]


@pytest.fixture
def crime_level_minor(db):
    return CrimeLevel.objects.get_or_create(
        level=CrimeLevel.LEVEL_3,
        defaults={'name': 'Level 3 - Minor', 'description': 'Minor crimes'},
    )[0]


@pytest.fixture
def crime_level_medium(db):
    return CrimeLevel.objects.get_or_create(
        level=CrimeLevel.LEVEL_2,
        defaults={'name': 'Level 2 - Medium', 'description': 'Medium crimes'},
    )[0]


@pytest.fixture
def creator_user(db, base_role):
    user = User.objects.create_user(
        username='creator7', email='creator7@test.com',
        phone_number='+17000000001', national_id='7000000001',
        password='pass123', first_name='Creator', last_name='Seven',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def cocomplainant_user(db, base_role):
    user = User.objects.create_user(
        username='cocomplainant7', email='cocomplainant7@test.com',
        phone_number='+17000000002', national_id='7000000002',
        password='pass123', first_name='CoCom', last_name='Seven',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def detective_user(db, detective_role):
    user = User.objects.create_user(
        username='detective7', email='detective7@test.com',
        phone_number='+17000000003', national_id='7000000003',
        password='pass123', first_name='Det', last_name='Seven',
    )
    user.roles.add(detective_role)
    return user


@pytest.fixture
def sergeant_user(db, sergeant_role):
    user = User.objects.create_user(
        username='sergeant7', email='sergeant7@test.com',
        phone_number='+17000000004', national_id='7000000004',
        password='pass123', first_name='Sgt', last_name='Seven',
    )
    user.roles.add(sergeant_role)
    return user


@pytest.fixture
def captain_user(db, captain_role):
    user = User.objects.create_user(
        username='captain7', email='captain7@test.com',
        phone_number='+17000000005', national_id='7000000005',
        password='pass123', first_name='Cpt', last_name='Seven',
    )
    user.roles.add(captain_role)
    return user


@pytest.fixture
def judge_user(db, judge_role):
    user = User.objects.create_user(
        username='judge7', email='judge7@test.com',
        phone_number='+17000000006', national_id='7000000006',
        password='pass123', first_name='Judge', last_name='Seven',
    )
    user.roles.add(judge_role)
    return user


@pytest.fixture
def person_user(db, base_role):
    """A regular user who acts as the suspect 'person'."""
    user = User.objects.create_user(
        username='suspect_person7', email='suspect_person7@test.com',
        phone_number='+17000000007', national_id='7000000007',
        password='pass123', first_name='Suspect', last_name='Person',
    )
    user.roles.add(base_role)
    return user


# ─── Bug 1: Co-complainant sees case in dashboard ──────────────────────────

@pytest.mark.django_db
class TestBug1CoComplainantDashboard:
    """Co-complainants should see the case in their own dashboard."""

    def test_cocomplainant_sees_case(
        self, creator_user, cocomplainant_user, crime_level_minor
    ):
        """A co-complainant added to a case should be able to list it."""
        client = APIClient()

        # 1 ─ Creator creates a case
        case = Case.objects.create(
            title='Shared Complaint Case',
            description='Test co-complainant visibility',
            crime_level=crime_level_minor,
            created_by=creator_user,
            status=Case.STATUS_DRAFT,
        )

        # Primary complainant
        Complainant.objects.create(
            case=case, user=creator_user,
            statement='I was there', is_primary=True,
        )

        # Co-complainant
        Complainant.objects.create(
            case=case, user=cocomplainant_user,
            statement='I was also there', is_primary=False,
        )

        # 2 ─ Co-complainant queries /api/v1/cases/cases/
        client.force_authenticate(user=cocomplainant_user)
        resp = client.get('/api/v1/cases/cases/')
        assert resp.status_code == status.HTTP_200_OK

        case_ids = [c['id'] for c in resp.data['results']]
        assert case.id in case_ids, (
            "Co-complainant should see the case in their dashboard"
        )

    def test_creator_also_sees_case(
        self, creator_user, cocomplainant_user, crime_level_minor
    ):
        """Creator should still see the case after co-complainant is added."""
        client = APIClient()

        case = Case.objects.create(
            title='Creator Visibility Case',
            description='Ensure creator still sees it',
            crime_level=crime_level_minor,
            created_by=creator_user,
            status=Case.STATUS_DRAFT,
        )
        Complainant.objects.create(
            case=case, user=creator_user,
            statement='My statement', is_primary=True,
        )
        Complainant.objects.create(
            case=case, user=cocomplainant_user,
            statement='Also involved', is_primary=False,
        )

        client.force_authenticate(user=creator_user)
        resp = client.get('/api/v1/cases/cases/')
        assert resp.status_code == status.HTTP_200_OK

        case_ids = [c['id'] for c in resp.data['results']]
        assert case.id in case_ids

    def test_unrelated_user_does_not_see_case(
        self, creator_user, cocomplainant_user, crime_level_minor, base_role
    ):
        """A user who is NOT a complainant should not see someone else's case."""
        outsider = User.objects.create_user(
            username='outsider7', email='outsider7@test.com',
            phone_number='+17000000099', national_id='7000000099',
            password='pass123', first_name='Out', last_name='Sider',
        )
        outsider.roles.add(base_role)

        case = Case.objects.create(
            title='Private Case',
            description='No outsider access',
            crime_level=crime_level_minor,
            created_by=creator_user,
            status=Case.STATUS_DRAFT,
        )
        Complainant.objects.create(
            case=case, user=creator_user,
            statement='Mine', is_primary=True,
        )

        client = APIClient()
        client.force_authenticate(user=outsider)
        resp = client.get('/api/v1/cases/cases/')
        assert resp.status_code == status.HTTP_200_OK

        case_ids = [c['id'] for c in resp.data['results']]
        assert case.id not in case_ids


# ─── Bug 3: Trial creation with STATUS_AWAITING_CHIEF ──────────────────────

@pytest.mark.django_db
class TestBug3TrialCriticalCrime:
    """Trial creation should succeed when captain decision has
    STATUS_AWAITING_CHIEF (critical crimes go through chief approval)."""

    def _setup_case_with_awaiting_chief(
        self,
        crime_level_critical,
        creator_user,
        detective_user,
        sergeant_user,
        captain_user,
        person_user,
    ):
        """Helper: build a case up to STATUS_AWAITING_CHIEF captain decision."""
        case = Case.objects.create(
            title='Critical Murder',
            description='Serial case requiring chief',
            crime_level=crime_level_critical,
            created_by=creator_user,
            status=Case.STATUS_INTERROGATION,
            assigned_detective=detective_user,
            assigned_sergeant=sergeant_user,
        )
        Complainant.objects.create(
            case=case, user=creator_user,
            statement='Saw the crime', is_primary=True,
        )

        suspect = Suspect.objects.create(
            case=case, person=person_user,
            status=Suspect.STATUS_ARRESTED,
            arrested_at=timezone.now(),
        )

        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective_user,
            sergeant=sergeant_user,
            detective_guilt_rating=9,
            sergeant_guilt_rating=8,
            detective_notes='Clear guilt evidence',
            sergeant_notes='Confirmed by sergeant',
            status=Interrogation.STATUS_REVIEWED,
        )

        captain_decision = CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain_user,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Overwhelming evidence of guilt in this critical case.',
            status=CaptainDecision.STATUS_AWAITING_CHIEF,
        )

        return case, suspect, captain_decision

    def test_trial_creation_with_awaiting_chief(
        self,
        crime_level_critical,
        creator_user,
        detective_user,
        sergeant_user,
        captain_user,
        judge_user,
        person_user,
    ):
        """POST /api/trials/ should succeed when captain decision status is
        AWAITING_CHIEF (critical crime)."""
        case, suspect, _ = self._setup_case_with_awaiting_chief(
            crime_level_critical, creator_user, detective_user,
            sergeant_user, captain_user, person_user,
        )

        client = APIClient()
        client.force_authenticate(user=captain_user)
        resp = client.post('/api/v1/trial/trials/', {
            'case': case.id,
            'suspect': suspect.id,
            'judge': judge_user.id,
            'captain_notes': 'Ready for trial – critical crime, chief not yet reviewed',
        }, format='json')

        assert resp.status_code == status.HTTP_201_CREATED, (
            f"Trial creation should succeed with AWAITING_CHIEF; got {resp.data}"
        )
        assert Trial.objects.filter(case=case).exists()

    def test_trial_creation_with_completed_status(
        self,
        crime_level_minor,
        creator_user,
        detective_user,
        sergeant_user,
        captain_user,
        judge_user,
        person_user,
    ):
        """Normal (non-critical) trial creation with STATUS_COMPLETED should still work."""
        case = Case.objects.create(
            title='Minor Theft',
            description='Non-critical case',
            crime_level=crime_level_minor,
            created_by=creator_user,
            status=Case.STATUS_INTERROGATION,
            assigned_detective=detective_user,
            assigned_sergeant=sergeant_user,
        )
        Complainant.objects.create(
            case=case, user=creator_user,
            statement='Stolen property', is_primary=True,
        )

        suspect = Suspect.objects.create(
            case=case, person=person_user,
            status=Suspect.STATUS_ARRESTED,
            arrested_at=timezone.now(),
        )

        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective_user,
            sergeant=sergeant_user,
            detective_guilt_rating=7,
            sergeant_guilt_rating=6,
            detective_notes='Guilt confirmed',
            sergeant_notes='Agreed',
            status=Interrogation.STATUS_REVIEWED,
        )

        CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain_user,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Found guilty based on evidence and testimony.',
            status=CaptainDecision.STATUS_COMPLETED,
        )

        client = APIClient()
        client.force_authenticate(user=captain_user)
        resp = client.post('/api/v1/trial/trials/', {
            'case': case.id,
            'suspect': suspect.id,
            'judge': judge_user.id,
            'captain_notes': 'Ready for trial',
        }, format='json')

        assert resp.status_code == status.HTTP_201_CREATED, (
            f"Trial creation should succeed with STATUS_COMPLETED; got {resp.data}"
        )

    def test_trial_rejected_without_guilty_decision(
        self,
        crime_level_minor,
        creator_user,
        detective_user,
        sergeant_user,
        captain_user,
        judge_user,
        person_user,
    ):
        """Trial creation should fail if captain decided NOT_GUILTY."""
        case = Case.objects.create(
            title='Acquittal case',
            description='Not guilty decision',
            crime_level=crime_level_minor,
            created_by=creator_user,
            status=Case.STATUS_INTERROGATION,
            assigned_detective=detective_user,
            assigned_sergeant=sergeant_user,
        )
        Complainant.objects.create(
            case=case, user=creator_user,
            statement='Claim', is_primary=True,
        )

        suspect = Suspect.objects.create(
            case=case, person=person_user,
            status=Suspect.STATUS_ARRESTED,
            arrested_at=timezone.now(),
        )

        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective_user,
            sergeant=sergeant_user,
            detective_guilt_rating=3,
            sergeant_guilt_rating=2,
            detective_notes='Weak evidence',
            sergeant_notes='Not convincing',
            status=Interrogation.STATUS_REVIEWED,
        )

        CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain_user,
            decision=CaptainDecision.DECISION_NOT_GUILTY,
            reasoning='Insufficient evidence to determine guilt.',
            status=CaptainDecision.STATUS_COMPLETED,
        )

        client = APIClient()
        client.force_authenticate(user=captain_user)
        resp = client.post('/api/v1/trial/trials/', {
            'case': case.id,
            'suspect': suspect.id,
            'judge': judge_user.id,
            'captain_notes': 'Attempted trial',
        }, format='json')

        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ─── Bug 4: Error messages in English ──────────────────────────────────────

@pytest.mark.django_db
class TestBug4EnglishErrors:
    """Validation errors should be in English, not Persian."""

    def test_bail_amount_too_low_english(self, crime_level_medium, creator_user, person_user):
        """Bail with amount < 1 million should give English error."""
        from apps.trial.serializers import BailPaymentSerializer

        case = Case.objects.create(
            title='Bail Test', description='test',
            crime_level=crime_level_medium,
            created_by=creator_user, status=Case.STATUS_INTERROGATION,
        )
        suspect = Suspect.objects.create(
            case=case, person=person_user,
            status=Suspect.STATUS_ARRESTED, arrested_at=timezone.now(),
        )

        serializer = BailPaymentSerializer(data={
            'suspect': suspect.id,
            'amount': 100,
        })
        assert not serializer.is_valid()
        error_text = str(serializer.errors)
        # Should NOT contain any Persian characters
        import re
        assert not re.search(r'[\u0600-\u06FF]', error_text), (
            f"Error contains Persian characters: {error_text}"
        )
        assert 'Rials' in error_text or 'amount' in error_text.lower()

    def test_interrogation_guilt_rating_english(self):
        """Guilt rating out of range should give English error."""
        from apps.investigation.serializers import InterrogationSerializer

        serializer = InterrogationSerializer()
        with pytest.raises(Exception) as exc_info:
            serializer.validate_detective_guilt_rating(15)
        error_msg = str(exc_info.value)
        import re
        assert not re.search(r'[\u0600-\u06FF]', error_msg), (
            f"Error contains Persian characters: {error_msg}"
        )

    def test_captain_decision_reasoning_too_short_english(self):
        """Reasoning < 20 chars should give English error."""
        from apps.investigation.serializers import CaptainDecisionSerializer

        serializer = CaptainDecisionSerializer()
        with pytest.raises(Exception) as exc_info:
            serializer.validate_reasoning("short")
        error_msg = str(exc_info.value)
        import re
        assert not re.search(r'[\u0600-\u06FF]', error_msg), (
            f"Error contains Persian: {error_msg}"
        )

    def test_trial_serializer_error_english(
        self,
        crime_level_minor,
        creator_user,
        detective_user,
        sergeant_user,
        captain_user,
        judge_user,
        person_user,
    ):
        """Trial creation with no guilty decision should return English error."""
        case = Case.objects.create(
            title='English Error Test',
            description='test',
            crime_level=crime_level_minor,
            created_by=creator_user,
            status=Case.STATUS_INTERROGATION,
            assigned_detective=detective_user,
            assigned_sergeant=sergeant_user,
        )
        suspect = Suspect.objects.create(
            case=case, person=person_user,
            status=Suspect.STATUS_ARRESTED, arrested_at=timezone.now(),
        )

        client = APIClient()
        client.force_authenticate(user=captain_user)
        resp = client.post('/api/v1/trial/trials/', {
            'case': case.id,
            'suspect': suspect.id,
            'judge': judge_user.id,
        }, format='json')

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        error_text = str(resp.data)
        import re
        assert not re.search(r'[\u0600-\u06FF]', error_text), (
            f"Error contains Persian: {error_text}"
        )

    def test_investigation_status_choices_english(self):
        """Interrogation STATUS_CHOICES should be in English."""
        for code, label in Interrogation.STATUS_CHOICES:
            import re
            assert not re.search(r'[\u0600-\u06FF]', label), (
                f"STATUS_CHOICES label contains Persian: {label}"
            )

    def test_captain_decision_choices_english(self):
        """CaptainDecision DECISION_CHOICES should be in English."""
        for code, label in CaptainDecision.DECISION_CHOICES:
            import re
            assert not re.search(r'[\u0600-\u06FF]', label), (
                f"DECISION_CHOICES label contains Persian: {label}"
            )

    def test_trial_status_choices_english(self):
        """Trial STATUS_CHOICES should be in English."""
        for code, label in Trial.STATUS_CHOICES:
            import re
            assert not re.search(r'[\u0600-\u06FF]', label), (
                f"Trial STATUS_CHOICES label contains Persian: {label}"
            )
