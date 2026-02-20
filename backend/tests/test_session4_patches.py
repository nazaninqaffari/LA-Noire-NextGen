"""
Tests for Bug Fix Patches (Session 4):
1. Most Wanted: manually-set intensive_pursuit suspects appear in the list
2. Tip-Off workflow: tip creation, officer review, detective review, reward
3. Detective case visibility: detectives see cases in interrogation/investigation status
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import Case, CrimeLevel
from apps.investigation.models import Suspect, TipOff

User = get_user_model()


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def crime_level(db):
    return CrimeLevel.objects.create(name='Critical', level=0, description='Most severe')


@pytest.fixture
def base_role(db):
    return Role.objects.create(name='Base User', description='Normal user', is_police_rank=False, hierarchy_level=0)


@pytest.fixture
def police_officer_role(db):
    return Role.objects.create(name='Police Officer', description='Police Officer', is_police_rank=True, hierarchy_level=3)


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
def citizen_user(db, base_role):
    user = User.objects.create_user(
        username='citizen_s4', email='citizen_s4@test.com',
        phone_number='09121110001', national_id='4000000001', password='testpass',
        first_name='Ali', last_name='Citizen',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def officer_user(db, police_officer_role):
    user = User.objects.create_user(
        username='officer_s4', email='officer_s4@test.com',
        phone_number='09121110002', national_id='4000000002', password='testpass',
        first_name='Officer', last_name='Smith',
    )
    user.roles.add(police_officer_role)
    return user


@pytest.fixture
def detective_user(db, detective_role):
    user = User.objects.create_user(
        username='detective_s4', email='detective_s4@test.com',
        phone_number='09121110003', national_id='4000000003', password='testpass',
        first_name='Det', last_name='Holmes',
    )
    user.roles.add(detective_role)
    return user


@pytest.fixture
def sergeant_user(db, sergeant_role):
    user = User.objects.create_user(
        username='sgt_s4', email='sgt_s4@test.com',
        phone_number='09121110004', national_id='4000000004', password='testpass',
        first_name='Sgt', last_name='Friday',
    )
    user.roles.add(sergeant_role)
    return user


@pytest.fixture
def captain_user(db, captain_role):
    user = User.objects.create_user(
        username='cpt_s4', email='cpt_s4@test.com',
        phone_number='09121110005', national_id='4000000005', password='testpass',
        first_name='Cpt', last_name='Brass',
    )
    user.roles.add(captain_role)
    return user


@pytest.fixture
def suspect_person(db, base_role):
    user = User.objects.create_user(
        username='suspect_s4', email='suspect_s4@test.com',
        phone_number='09121110006', national_id='4000000006', password='testpass',
        first_name='Bad', last_name='Guy',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def open_case(db, crime_level, detective_user, sergeant_user):
    return Case.objects.create(
        title='Session 4 Test Case',
        description='For session 4 patch tests',
        crime_level=crime_level,
        status=Case.STATUS_OPEN,
        created_by=detective_user,
        assigned_detective=detective_user,
        assigned_sergeant=sergeant_user,
    )


@pytest.fixture
def under_pursuit_suspect(db, open_case, suspect_person, detective_user):
    return Suspect.objects.create(
        case=open_case,
        person=suspect_person,
        status=Suspect.STATUS_UNDER_PURSUIT,
        reason='Seen fleeing',
        identified_by_detective=detective_user,
    )


# ── Bug 1: Most Wanted - manually-set intensive_pursuit ──────────

@pytest.mark.django_db
class TestMostWantedManualIntensivePursuit:
    """
    Bug 1: When admin manually sets a suspect to 'intensive_pursuit',
    they should appear on the most wanted page regardless of identified_at date.
    Previously the endpoint filtered by identified_at <= 30 days ago,
    so manually-set suspects identified recently would NOT appear.
    """

    INTENSIVE_URL = '/api/v1/investigation/suspects/intensive_pursuit/'

    def test_manually_set_intensive_pursuit_appears(self, under_pursuit_suspect):
        """Suspect manually set to intensive_pursuit appears on list even if identified recently."""
        # Set to intensive_pursuit manually (identified recently, less than 30 days ago)
        under_pursuit_suspect.status = Suspect.STATUS_INTENSIVE_PURSUIT
        under_pursuit_suspect.save(update_fields=['status'])

        client = APIClient()
        resp = client.get(self.INTENSIVE_URL)
        assert resp.status_code == 200
        ids = [s['id'] for s in resp.data]
        assert under_pursuit_suspect.id in ids

    def test_manually_set_intensive_pursuit_includes_case_id(self, under_pursuit_suspect):
        """The intensive pursuit serializer returns the 'case' FK ID for frontend tip form."""
        under_pursuit_suspect.status = Suspect.STATUS_INTENSIVE_PURSUIT
        under_pursuit_suspect.save(update_fields=['status'])

        client = APIClient()
        resp = client.get(self.INTENSIVE_URL)
        assert resp.status_code == 200
        data = resp.data[0]
        assert 'case' in data
        assert data['case'] == under_pursuit_suspect.case_id

    def test_auto_upgrade_still_works(self, open_case, suspect_person, detective_user):
        """Under_pursuit suspects > 30 days auto-upgrade to intensive_pursuit."""
        old_suspect = Suspect.objects.create(
            case=open_case,
            person=User.objects.create_user(
                username='old_suspect', email='old@test.com',
                phone_number='09121110099', national_id='4000000099', password='testpass',
            ),
            status=Suspect.STATUS_UNDER_PURSUIT,
            reason='Old suspect',
            identified_by_detective=detective_user,
        )
        # Backdate identified_at to 60 days ago
        Suspect.objects.filter(id=old_suspect.id).update(
            identified_at=timezone.now() - timedelta(days=60)
        )

        client = APIClient()
        resp = client.get(self.INTENSIVE_URL)
        assert resp.status_code == 200
        old_suspect.refresh_from_db()
        assert old_suspect.status == Suspect.STATUS_INTENSIVE_PURSUIT

    def test_under_pursuit_recent_not_auto_upgraded(self, under_pursuit_suspect):
        """Under_pursuit suspects < 30 days should NOT be auto-upgraded."""
        client = APIClient()
        resp = client.get(self.INTENSIVE_URL)
        assert resp.status_code == 200
        under_pursuit_suspect.refresh_from_db()
        assert under_pursuit_suspect.status == Suspect.STATUS_UNDER_PURSUIT


# ── Bug 2: Tip-Off Workflow ──────────────────────────────────────

@pytest.mark.django_db
class TestTipOffWorkflow:
    """
    Bug 2: Full tip-off workflow tests.
    citizen submits → officer reviews → detective confirms → reward code → redemption
    """

    TIPOFFS_URL = '/api/v1/investigation/tipoffs/'

    def test_citizen_can_create_tip_with_case(self, citizen_user, open_case):
        """Citizens can create tips with a case (required field)."""
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(self.TIPOFFS_URL, {
            'case': open_case.id,
            'information': 'I saw the suspect near the station',
        })
        assert resp.status_code == 201
        assert resp.data['status'] == 'pending'
        assert resp.data['case'] == open_case.id

    def test_citizen_can_create_tip_with_suspect(self, citizen_user, open_case, under_pursuit_suspect):
        """Citizens can create tips about a specific suspect."""
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(self.TIPOFFS_URL, {
            'case': open_case.id,
            'suspect': under_pursuit_suspect.id,
            'information': 'Suspect was at the mall',
        })
        assert resp.status_code == 201
        assert resp.data['suspect'] == under_pursuit_suspect.id

    def test_tip_requires_case(self, citizen_user):
        """Creating a tip without a case should fail."""
        client = APIClient()
        client.force_authenticate(user=citizen_user)
        resp = client.post(self.TIPOFFS_URL, {
            'information': 'No case specified',
        })
        assert resp.status_code == 400

    def test_officer_can_approve_tip(self, officer_user, citizen_user, open_case):
        """Officer can approve a pending tip."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Valid tip', status=TipOff.STATUS_PENDING,
        )
        client = APIClient()
        client.force_authenticate(user=officer_user)
        resp = client.post(f'{self.TIPOFFS_URL}{tip.id}/officer_review/', {
            'approved': True,
        })
        assert resp.status_code == 200
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_OFFICER_APPROVED

    def test_officer_can_reject_tip(self, officer_user, citizen_user, open_case):
        """Officer can reject a tip with reason."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Bad tip', status=TipOff.STATUS_PENDING,
        )
        client = APIClient()
        client.force_authenticate(user=officer_user)
        resp = client.post(f'{self.TIPOFFS_URL}{tip.id}/officer_review/', {
            'approved': False,
            'rejection_reason': 'Information is clearly false',
        })
        assert resp.status_code == 200
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_OFFICER_REJECTED

    def test_officer_reject_requires_reason(self, officer_user, citizen_user, open_case):
        """Rejecting without reason fails."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Some tip', status=TipOff.STATUS_PENDING,
        )
        client = APIClient()
        client.force_authenticate(user=officer_user)
        resp = client.post(f'{self.TIPOFFS_URL}{tip.id}/officer_review/', {
            'approved': False,
        })
        assert resp.status_code == 400

    def test_detective_can_approve_officer_approved_tip(self, detective_user, citizen_user, open_case):
        """Detective can approve an officer-approved tip and reward code is generated."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Great tip', status=TipOff.STATUS_OFFICER_APPROVED,
        )
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.post(f'{self.TIPOFFS_URL}{tip.id}/detective_review/', {
            'approved': True,
        })
        assert resp.status_code == 200
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_APPROVED
        assert tip.redemption_code is not None
        assert tip.redemption_code.startswith('REWARD-')

    def test_detective_can_reject_tip(self, detective_user, citizen_user, open_case):
        """Detective can reject an officer-approved tip."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Not useful tip', status=TipOff.STATUS_OFFICER_APPROVED,
        )
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.post(f'{self.TIPOFFS_URL}{tip.id}/detective_review/', {
            'approved': False,
            'rejection_reason': 'Information not relevant',
        })
        assert resp.status_code == 200
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_DETECTIVE_REJECTED

    def test_reward_verification(self, officer_user, citizen_user, open_case):
        """Officer can verify a valid reward code."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Verified tip', status=TipOff.STATUS_APPROVED,
        )
        tip.generate_redemption_code()
        tip.save(update_fields=['redemption_code'])

        client = APIClient()
        client.force_authenticate(user=officer_user)
        resp = client.post(f'{self.TIPOFFS_URL}verify_reward/', {
            'redemption_code': tip.redemption_code,
            'national_id': citizen_user.national_id,
        })
        assert resp.status_code == 200
        assert resp.data['valid'] is True

    def test_reward_redemption(self, officer_user, citizen_user, open_case):
        """Officer can process reward redemption."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Redeemable tip', status=TipOff.STATUS_APPROVED,
        )
        tip.generate_redemption_code()
        tip.save(update_fields=['redemption_code'])

        client = APIClient()
        client.force_authenticate(user=officer_user)
        resp = client.post(f'{self.TIPOFFS_URL}redeem_reward/', {
            'redemption_code': tip.redemption_code,
            'national_id': citizen_user.national_id,
        })
        assert resp.status_code == 200
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_REDEEMED

    def test_double_redeem_fails(self, officer_user, citizen_user, open_case):
        """Cannot redeem same reward twice."""
        tip = TipOff.objects.create(
            case=open_case, submitted_by=citizen_user,
            information='Already redeemed', status=TipOff.STATUS_APPROVED,
        )
        tip.generate_redemption_code()
        tip.save(update_fields=['redemption_code'])

        client = APIClient()
        client.force_authenticate(user=officer_user)
        # First redeem
        client.post(f'{self.TIPOFFS_URL}redeem_reward/', {
            'redemption_code': tip.redemption_code,
            'national_id': citizen_user.national_id,
        })
        # Second redeem should fail
        resp = client.post(f'{self.TIPOFFS_URL}redeem_reward/', {
            'redemption_code': tip.redemption_code,
            'national_id': citizen_user.national_id,
        })
        assert resp.status_code == 400


# ── Bug 3: Detective Case Visibility ─────────────────────────────

@pytest.mark.django_db
class TestDetectiveCaseVisibility:
    """
    Bug 3: When a case comes back from captain (e.g. interrogation status),
    the detective should see it in their cases list.
    """

    CASES_URL = '/api/v1/cases/cases/'

    def test_detective_sees_interrogation_case(self, detective_user, crime_level):
        """Detective sees cases in interrogation status."""
        case = Case.objects.create(
            title='Interrogation Case',
            description='Returned from captain',
            crime_level=crime_level,
            status=Case.STATUS_INTERROGATION,
            created_by=detective_user,
            assigned_detective=detective_user,
        )
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.get(self.CASES_URL)
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data['results']]
        assert case.id in ids

    def test_detective_sees_under_investigation_case(self, detective_user, crime_level):
        """Detective sees cases under investigation."""
        case = Case.objects.create(
            title='Under Investigation',
            description='Active investigation',
            crime_level=crime_level,
            status=Case.STATUS_UNDER_INVESTIGATION,
            created_by=detective_user,
            assigned_detective=detective_user,
        )
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.get(self.CASES_URL)
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data['results']]
        assert case.id in ids

    def test_detective_sees_suspects_identified_case(self, detective_user, crime_level):
        """Detective sees cases with suspects_identified status."""
        case = Case.objects.create(
            title='Suspects Identified',
            description='Suspects found',
            crime_level=crime_level,
            status=Case.STATUS_SUSPECTS_IDENTIFIED,
            created_by=detective_user,
            assigned_detective=detective_user,
        )
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.get(self.CASES_URL)
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data['results']]
        assert case.id in ids

    def test_detective_sees_trial_pending_case(self, detective_user, crime_level):
        """Detective sees cases with trial_pending status."""
        case = Case.objects.create(
            title='Trial Pending',
            description='Going to trial',
            crime_level=crime_level,
            status=Case.STATUS_TRIAL_PENDING,
            created_by=detective_user,
            assigned_detective=detective_user,
        )
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.get(self.CASES_URL)
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data['results']]
        assert case.id in ids

    def test_detective_sees_assigned_case_any_status(self, detective_user, crime_level):
        """Detective sees any case assigned to them regardless of status."""
        case = Case.objects.create(
            title='Assigned Case',
            description='Assigned directly',
            crime_level=crime_level,
            status=Case.STATUS_ARREST_APPROVED,
            created_by=detective_user,
            assigned_detective=detective_user,
        )
        client = APIClient()
        client.force_authenticate(user=detective_user)
        resp = client.get(self.CASES_URL)
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data['results']]
        assert case.id in ids

    def test_sergeant_sees_interrogation_case(self, sergeant_user, detective_user, crime_level):
        """Sergeant also sees cases in interrogation status."""
        case = Case.objects.create(
            title='Sgt Interrogation Case',
            description='Sgt can see',
            crime_level=crime_level,
            status=Case.STATUS_INTERROGATION,
            created_by=detective_user,
            assigned_sergeant=sergeant_user,
        )
        client = APIClient()
        client.force_authenticate(user=sergeant_user)
        resp = client.get(self.CASES_URL)
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data['results']]
        assert case.id in ids

    def test_sergeant_sees_assigned_case(self, sergeant_user, detective_user, crime_level):
        """Sergeant sees cases assigned to them."""
        case = Case.objects.create(
            title='Sgt Assigned Case',
            description='For sergeant',
            crime_level=crime_level,
            status=Case.STATUS_OPEN,
            created_by=detective_user,
            assigned_sergeant=sergeant_user,
        )
        client = APIClient()
        client.force_authenticate(user=sergeant_user)
        resp = client.get(self.CASES_URL)
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data['results']]
        assert case.id in ids
