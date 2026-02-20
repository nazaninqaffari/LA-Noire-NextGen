"""
Session 5 patch tests:
1. Bail payment auto-approve for level 2, pending for level 3
2. Sergeant bail approval action
3. Zarinpal pay action (mocked HTTP)
4. Zarinpal verify_payment action (mocked HTTP)
5. Suspect cleared after bail payment
6. Officer review permissions for Cadet, Patrol Officer, Police Officer
7. Officer review denied for Detective
8. TipOff queryset shows pending tips for Cadet
"""
import pytest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import CrimeLevel, Case
from apps.investigation.models import Suspect, TipOff
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
def police_chief_role(db):
    return Role.objects.get_or_create(
        name='Police Chief',
        defaults={'description': 'Chief of police', 'is_police_rank': True, 'hierarchy_level': 8}
    )[0]


@pytest.fixture
def judge_role(db):
    return Role.objects.get_or_create(
        name='Judge',
        defaults={'description': 'Judge', 'is_police_rank': False, 'hierarchy_level': 0}
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
def cadet_user(db, cadet_role):
    return _make_user(db, 'cadet_s5', 'cadet_s5@test.com', cadet_role)


@pytest.fixture
def patrol_officer_user(db, patrol_officer_role):
    return _make_user(db, 'patrol_s5', 'patrol_s5@test.com', patrol_officer_role)


@pytest.fixture
def police_officer_user(db, police_officer_role):
    return _make_user(db, 'officer_s5', 'officer_s5@test.com', police_officer_role)


@pytest.fixture
def detective_user(db, detective_role):
    return _make_user(db, 'detective_s5', 'detective_s5@test.com', detective_role)


@pytest.fixture
def sergeant_user(db, sergeant_role):
    return _make_user(db, 'sergeant_s5', 'sergeant_s5@test.com', sergeant_role)


@pytest.fixture
def captain_user(db, captain_role):
    return _make_user(db, 'captain_s5', 'captain_s5@test.com', captain_role)


@pytest.fixture
def citizen_user(db, base_role):
    return _make_user(db, 'citizen_s5', 'citizen_s5@test.com', base_role)


@pytest.fixture
def judge_user(db, judge_role):
    return _make_user(db, 'judge_s5', 'judge_s5@test.com', judge_role)


@pytest.fixture
def crime_level_2(db):
    return CrimeLevel.objects.get_or_create(
        level=2,
        defaults={'name': 'Level 2 - Medium', 'description': 'Medium crimes like car theft'}
    )[0]


@pytest.fixture
def crime_level_3(db):
    return CrimeLevel.objects.get_or_create(
        level=3,
        defaults={'name': 'Level 3 - Minor', 'description': 'Minor crimes like petty theft'}
    )[0]


@pytest.fixture
def case_level2(db, crime_level_2, detective_user):
    return Case.objects.create(
        case_number='CASE-S5-LVL2-001',
        title='Car Theft Case',
        description='A car was stolen',
        crime_level=crime_level_2,
        formation_type='complaint',
        status='active',
        created_by=detective_user,
    )


@pytest.fixture
def case_level3(db, crime_level_3, detective_user):
    return Case.objects.create(
        case_number='CASE-S5-LVL3-001',
        title='Petty Theft Case',
        description='Minor shoplifting',
        crime_level=crime_level_3,
        formation_type='complaint',
        status='active',
        created_by=detective_user,
    )


@pytest.fixture
def suspect_level2(db, case_level2, citizen_user, detective_user):
    return Suspect.objects.create(
        case=case_level2,
        person=citizen_user,
        reason='Caught on camera stealing a car',
        identified_by_detective=detective_user,
        status='under_pursuit',
    )


@pytest.fixture
def suspect_level3(db, case_level3, citizen_user, detective_user):
    # Need a different person for this suspect
    person = _make_user(db, 'suspect_lvl3', 'suspect_lvl3@test.com')
    return Suspect.objects.create(
        case=case_level3,
        person=person,
        reason='Caught shoplifting on camera',
        identified_by_detective=detective_user,
        status='under_pursuit',
    )


@pytest.fixture
def api_client():
    return APIClient()


# ─── Bail Payment Tests ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestBailAutoApprove:
    """Test auto-approve for level 2 and pending for level 3."""

    def test_bail_level2_auto_approved(self, api_client, sergeant_user, suspect_level2):
        """Level 2 bail requests should be auto-approved."""
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect_level2.id,
            'amount': 50_000_000,
        })
        assert response.status_code == status.HTTP_201_CREATED
        bail = BailPayment.objects.get(id=response.data['id'])
        assert bail.status == BailPayment.STATUS_APPROVED
        assert bail.approved_at is not None

    def test_bail_level3_stays_pending(self, api_client, sergeant_user, suspect_level3):
        """Level 3 bail requests should stay pending (needs sergeant approval)."""
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect_level3.id,
            'amount': 10_000_000,
        })
        assert response.status_code == status.HTTP_201_CREATED
        bail = BailPayment.objects.get(id=response.data['id'])
        assert bail.status == BailPayment.STATUS_PENDING
        assert bail.approved_at is None


@pytest.mark.django_db
class TestSergeantBailApproval:
    """Test sergeant bail approval action."""

    def test_sergeant_can_approve_pending_bail(self, api_client, sergeant_user, suspect_level3):
        """Sergeant can approve a pending bail request."""
        bail = BailPayment.objects.create(
            suspect=suspect_level3,
            amount=Decimal('10000000'),
            status=BailPayment.STATUS_PENDING,
        )
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post(f'/api/v1/trial/bail-payments/{bail.id}/approve/')
        assert response.status_code == status.HTTP_200_OK
        bail.refresh_from_db()
        assert bail.status == BailPayment.STATUS_APPROVED
        assert bail.approved_by_sergeant == sergeant_user
        assert bail.approved_at is not None

    def test_non_sergeant_cannot_approve(self, api_client, captain_user, suspect_level3):
        """Non-sergeant users (e.g. Captain) should be forbidden from approving bail."""
        bail = BailPayment.objects.create(
            suspect=suspect_level3,
            amount=Decimal('10000000'),
            status=BailPayment.STATUS_PENDING,
        )
        # Captain can see bails (queryset allows it) but cannot approve
        api_client.force_authenticate(user=captain_user)
        response = api_client.post(f'/api/v1/trial/bail-payments/{bail.id}/approve/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_approve_already_approved(self, api_client, sergeant_user, suspect_level3):
        """Cannot approve bail that's already approved."""
        bail = BailPayment.objects.create(
            suspect=suspect_level3,
            amount=Decimal('10000000'),
            status=BailPayment.STATUS_APPROVED,
        )
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post(f'/api/v1/trial/bail-payments/{bail.id}/approve/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestZarinpalPay:
    """Test Zarinpal pay action with mocked HTTP calls."""

    @patch('apps.trial.views.BailPaymentViewSet.pay')
    def test_pay_returns_redirect_url(self, mock_pay, api_client, sergeant_user, suspect_level2):
        """Pay action returns Zarinpal redirect URL on success (integration-level mock)."""
        # Instead of mocking the action itself, we mock requests.post inside the action
        pass  # covered by test below

    @patch('requests.post')
    def test_zarinpal_pay_success(self, mock_post, api_client, sergeant_user, suspect_level2):
        """Successful Zarinpal payment request returns redirect URL."""
        # Create approved bail
        bail = BailPayment.objects.create(
            suspect=suspect_level2,
            amount=Decimal('50000000'),
            status=BailPayment.STATUS_APPROVED,
        )
        # Mock Zarinpal response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'data': {
                'code': 100,
                'authority': 'A00000000000000000000000000217885',
            }
        }
        mock_post.return_value = mock_response

        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post(f'/api/v1/trial/bail-payments/{bail.id}/pay/')
        assert response.status_code == status.HTTP_200_OK
        assert 'redirect_url' in response.data
        assert 'authority' in response.data
        assert 'A00000000000000000000000000217885' in response.data['redirect_url']

        # Authority stored in payment_reference
        bail.refresh_from_db()
        assert bail.payment_reference == 'A00000000000000000000000000217885'

    @patch('requests.post')
    def test_zarinpal_pay_gateway_error(self, mock_post, api_client, sergeant_user, suspect_level2):
        """Zarinpal payment gateway error returns 502."""
        bail = BailPayment.objects.create(
            suspect=suspect_level2,
            amount=Decimal('50000000'),
            status=BailPayment.STATUS_APPROVED,
        )
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'data': {'code': -9},
            'errors': ['Invalid merchant']
        }
        mock_post.return_value = mock_response

        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post(f'/api/v1/trial/bail-payments/{bail.id}/pay/')
        assert response.status_code == status.HTTP_502_BAD_GATEWAY

    def test_pay_not_approved_returns_400(self, api_client, sergeant_user, suspect_level3):
        """Cannot pay unapproved bail."""
        bail = BailPayment.objects.create(
            suspect=suspect_level3,
            amount=Decimal('10000000'),
            status=BailPayment.STATUS_PENDING,
        )
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post(f'/api/v1/trial/bail-payments/{bail.id}/pay/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestZarinpalVerify:
    """Test Zarinpal verify_payment action with mocked HTTP calls."""

    @patch('requests.post')
    def test_verify_success_clears_suspect(self, mock_post, api_client, citizen_user, suspect_level2):
        """Successful payment verification marks bail as paid and clears suspect."""
        authority = 'A00000000000000000000000000217885'
        bail = BailPayment.objects.create(
            suspect=suspect_level2,
            amount=Decimal('50000000'),
            status=BailPayment.STATUS_APPROVED,
            payment_reference=authority,
        )
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'data': {
                'code': 100,
                'ref_id': '123456789',
            }
        }
        mock_post.return_value = mock_response

        # Authenticate as the suspect's person (citizen paying bail)
        api_client.force_authenticate(user=citizen_user)
        response = api_client.post('/api/v1/trial/bail-payments/verify_payment/', {
            'authority': authority,
            'status': 'OK',
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        assert response.data['ref_id'] == '123456789'

        # Bail marked as paid
        bail.refresh_from_db()
        assert bail.status == BailPayment.STATUS_PAID
        assert 'ZP-123456789' in bail.payment_reference
        assert bail.paid_at is not None

        # Suspect status changed to cleared
        suspect_level2.refresh_from_db()
        assert suspect_level2.status == 'cleared'

    def test_verify_missing_authority_returns_400(self, api_client, citizen_user):
        """Missing authority returns 400."""
        api_client.force_authenticate(user=citizen_user)
        response = api_client.post('/api/v1/trial/bail-payments/verify_payment/', {
            'status': 'OK',
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_invalid_authority_returns_404(self, api_client, citizen_user):
        """Invalid authority code returns 404."""
        api_client.force_authenticate(user=citizen_user)
        response = api_client.post('/api/v1/trial/bail-payments/verify_payment/', {
            'authority': 'INVALID_AUTH_CODE',
            'status': 'OK',
        })
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_verify_nok_status_returns_failure(self, api_client, citizen_user, suspect_level2):
        """NOK payment status returns failure without calling Zarinpal verify."""
        authority = 'A00000000000000000000000000217885'
        BailPayment.objects.create(
            suspect=suspect_level2,
            amount=Decimal('50000000'),
            status=BailPayment.STATUS_APPROVED,
            payment_reference=authority,
        )
        api_client.force_authenticate(user=citizen_user)
        response = api_client.post('/api/v1/trial/bail-payments/verify_payment/', {
            'authority': authority,
            'status': 'NOK',
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'failed'

    @patch('requests.post')
    def test_verify_already_paid_idempotent(self, mock_post, api_client, citizen_user, suspect_level2):
        """Re-verifying an already-paid bail is idempotent."""
        authority = 'A00000000000000000000000000217885'
        bail = BailPayment.objects.create(
            suspect=suspect_level2,
            amount=Decimal('50000000'),
            status=BailPayment.STATUS_PAID,
            payment_reference=authority,
            paid_at=timezone.now(),
        )
        api_client.force_authenticate(user=citizen_user)
        response = api_client.post('/api/v1/trial/bail-payments/verify_payment/', {
            'authority': authority,
            'status': 'OK',
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'already_paid'
        # Zarinpal should NOT be called
        mock_post.assert_not_called()


@pytest.mark.django_db
class TestBailQueryset:
    """Test bail payment queryset visibility."""

    def test_sergeant_sees_all_bails(self, api_client, sergeant_user, suspect_level2, suspect_level3):
        """Sergeants see all bail requests."""
        BailPayment.objects.create(suspect=suspect_level2, amount=Decimal('50000000'))
        BailPayment.objects.create(suspect=suspect_level3, amount=Decimal('10000000'))
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.get('/api/v1/trial/bail-payments/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_captain_sees_all_bails(self, api_client, captain_user, suspect_level2):
        """Captains see all bail requests."""
        BailPayment.objects.create(suspect=suspect_level2, amount=Decimal('50000000'))
        api_client.force_authenticate(user=captain_user)
        response = api_client.get('/api/v1/trial/bail-payments/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_citizen_sees_only_own_bails(self, api_client, citizen_user, suspect_level2, suspect_level3):
        """Citizens only see bails where they are the suspect."""
        BailPayment.objects.create(suspect=suspect_level2, amount=Decimal('50000000'))
        BailPayment.objects.create(suspect=suspect_level3, amount=Decimal('10000000'))
        api_client.force_authenticate(user=citizen_user)
        response = api_client.get('/api/v1/trial/bail-payments/')
        assert response.status_code == status.HTTP_200_OK
        # citizen_user is person on suspect_level2 only
        assert len(response.data['results']) == 1


# ─── TipOff Officer Review Permission Tests ────────────────────────────────


@pytest.mark.django_db
class TestOfficerReviewPermissions:
    """Test that Cadet, Patrol Officer, and Police Officer can review tips."""

    def _create_tip(self, case, citizen_user):
        """Helper to create a pending tip."""
        return TipOff.objects.create(
            case=case,
            submitted_by=citizen_user,
            information='I saw the suspect near the market at 9pm',
            status=TipOff.STATUS_PENDING,
        )

    def test_cadet_can_officer_review(self, api_client, cadet_user, case_level2, citizen_user):
        """Cadets can perform officer_review on tips."""
        tip = self._create_tip(case_level2, citizen_user)
        api_client.force_authenticate(user=cadet_user)
        response = api_client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True,
        })
        assert response.status_code == status.HTTP_200_OK
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_OFFICER_APPROVED

    def test_patrol_officer_can_officer_review(self, api_client, patrol_officer_user, case_level2, citizen_user):
        """Patrol Officers can perform officer_review on tips."""
        tip = self._create_tip(case_level2, citizen_user)
        api_client.force_authenticate(user=patrol_officer_user)
        response = api_client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': False,
            'rejection_reason': 'Information is too vague to be useful',
        })
        assert response.status_code == status.HTTP_200_OK
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_OFFICER_REJECTED

    def test_police_officer_can_officer_review(self, api_client, police_officer_user, case_level2, citizen_user):
        """Police Officers can perform officer_review on tips."""
        tip = self._create_tip(case_level2, citizen_user)
        api_client.force_authenticate(user=police_officer_user)
        response = api_client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True,
        })
        assert response.status_code == status.HTTP_200_OK
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_OFFICER_APPROVED

    def test_detective_cannot_officer_review(self, api_client, detective_user, case_level2, citizen_user):
        """Detectives should NOT be able to perform officer_review."""
        tip = self._create_tip(case_level2, citizen_user)
        api_client.force_authenticate(user=detective_user)
        response = api_client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True,
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_citizen_cannot_officer_review(self, api_client, citizen_user, case_level2):
        """Citizens should NOT be able to perform officer_review."""
        tip = self._create_tip(case_level2, citizen_user)
        api_client.force_authenticate(user=citizen_user)
        response = api_client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True,
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTipOffQueryset:
    """Test TipOff queryset filtering by role."""

    def _create_tip(self, case, citizen_user, tip_status=TipOff.STATUS_PENDING):
        return TipOff.objects.create(
            case=case,
            submitted_by=citizen_user,
            information='Saw suspect at the mall',
            status=tip_status,
        )

    def test_cadet_sees_pending_tips(self, api_client, cadet_user, case_level2, citizen_user):
        """Cadets should see pending tips in list view."""
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_PENDING)
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_OFFICER_APPROVED)
        api_client.force_authenticate(user=cadet_user)
        response = api_client.get('/api/v1/investigation/tipoffs/')
        assert response.status_code == status.HTTP_200_OK
        # Should only see pending tips
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['status'] == 'pending'

    def test_patrol_officer_sees_pending_tips(self, api_client, patrol_officer_user, case_level2, citizen_user):
        """Patrol Officers should see pending tips in list view."""
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_PENDING)
        api_client.force_authenticate(user=patrol_officer_user)
        response = api_client.get('/api/v1/investigation/tipoffs/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_detective_sees_officer_approved_tips(self, api_client, detective_user, case_level2, citizen_user):
        """Detectives should see officer-approved tips."""
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_PENDING)
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_OFFICER_APPROVED)
        api_client.force_authenticate(user=detective_user)
        response = api_client.get('/api/v1/investigation/tipoffs/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['status'] == 'officer_approved'

    def test_citizen_sees_own_tips_only(self, api_client, citizen_user, case_level2):
        """Citizens should only see their own tips."""
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_PENDING)
        # Create tip by different user
        other = _make_user(None, 'othercitizen_s5', 'othercitizen@test.com')
        self._create_tip(case_level2, other, TipOff.STATUS_PENDING)
        api_client.force_authenticate(user=citizen_user)
        response = api_client.get('/api/v1/investigation/tipoffs/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_sergeant_sees_all_tips(self, api_client, sergeant_user, case_level2, citizen_user):
        """Sergeants should see all tips regardless of status."""
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_PENDING)
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_OFFICER_APPROVED)
        self._create_tip(case_level2, citizen_user, TipOff.STATUS_OFFICER_REJECTED)
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.get('/api/v1/investigation/tipoffs/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3


# ─── Bail Serializer Validation Tests ──────────────────────────────────────


@pytest.mark.django_db
class TestBailSerializerValidation:
    """Test BailPaymentSerializer validation rules."""

    def test_amount_too_low_rejected(self, api_client, sergeant_user, suspect_level2):
        """Bail amount below 1M Rials is rejected."""
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect_level2.id,
            'amount': 500_000,
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_amount_too_high_rejected(self, api_client, sergeant_user, suspect_level2):
        """Bail amount above 10B Rials is rejected."""
        api_client.force_authenticate(user=sergeant_user)
        response = api_client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect_level2.id,
            'amount': 11_000_000_000,
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST
