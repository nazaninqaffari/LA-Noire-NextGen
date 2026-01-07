"""
Comprehensive tests for Reward System (پاداش ۸.۴).
Tests citizen tip submission, officer review, detective confirmation,
and reward redemption workflow.

Persian: تست‌های سیستم پاداش برای اطلاعات شهروندان
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status as http_status

from apps.cases.models import Case, CrimeLevel
from apps.accounts.models import Role
from apps.investigation.models import Suspect, TipOff

User = get_user_model()


@pytest.fixture
def client():
    """Create API client."""
    return APIClient()


@pytest.fixture
def setup_roles(db):
    """Create necessary roles."""
    officer_role, _ = Role.objects.get_or_create(name='Police Officer', defaults={'is_police_rank': True, 'hierarchy_level': 3})
    detective_role, _ = Role.objects.get_or_create(name='Detective', defaults={'is_police_rank': True, 'hierarchy_level': 4})
    sergeant_role, _ = Role.objects.get_or_create(name='Sergeant', defaults={'is_police_rank': True, 'hierarchy_level': 5})
    return {
        'officer': officer_role,
        'detective': detective_role,
        'sergeant': sergeant_role,
    }


@pytest.fixture
def setup_users(db, setup_roles):
    """Create users with roles."""
    # Regular citizen
    citizen = User.objects.create_user(
        username='citizen1',
        password='pass123',
        email='citizen@test.com',
        phone_number='09121234567',
        national_id='1234567890',
        first_name='علی',
        last_name='محمدی'
    )
    
    # Police officer
    officer = User.objects.create_user(
        username='officer1',
        password='pass123',
        email='officer@test.com',
        phone_number='09121234568',
        national_id='1234567891',
        first_name='حسین',
        last_name='افسر'
    )
    officer.role = 'officer'
    officer.save()
    officer.roles.add(setup_roles['officer'])
    
    # Detective
    detective = User.objects.create_user(
        username='detective1',
        password='pass123',
        email='detective@test.com',
        phone_number='09121234569',
        national_id='1234567892',
        first_name='رضا',
        last_name='کارآگاه'
    )
    detective.role = 'detective'
    detective.save()
    detective.roles.add(setup_roles['detective'])
    
    # Sergeant for case creation
    sergeant = User.objects.create_user(
        username='sergeant1',
        password='pass123',
        email='sergeant@test.com',
        phone_number='09121234570',
        national_id='1234567893',
        first_name='احمد',
        last_name='گروهبان'
    )
    sergeant.role = 'sergeant'
    sergeant.save()
    sergeant.roles.add(setup_roles['sergeant'])
    
    # Suspect person
    suspect_person = User.objects.create_user(
        username='suspect1',
        password='pass123',
        email='suspect@test.com',
        phone_number='09121234571',
        national_id='1234567894',
        first_name='محمد',
        last_name='مظنون'
    )
    
    return {
        'citizen': citizen,
        'officer': officer,
        'detective': detective,
        'sergeant': sergeant,
        'suspect_person': suspect_person,
    }


@pytest.fixture
def setup_case_and_suspect(db, setup_users):
    """Create case with suspect."""
    crime_level, _ = CrimeLevel.objects.get_or_create(
        level=0,
        defaults={'name': 'بحرانی', 'description': 'جنایات شدید'}
    )
    
    case = Case.objects.create(
        case_number='REW-001',
        title='پرونده تست پاداش',
        description='پرونده برای تست سیستم پاداش',
        crime_level=crime_level,
        created_by=setup_users['sergeant'],
        assigned_detective=setup_users['detective'],
        status=Case.STATUS_OPEN
    )
    
    suspect = Suspect.objects.create(
        case=case,
        person=setup_users['suspect_person'],
        reason='مظنون اصلی',
        identified_by_detective=setup_users['detective']
    )
    
    return {'case': case, 'suspect': suspect}


@pytest.mark.django_db
class TestTipSubmission:
    """Test citizen tip submission."""
    
    def test_citizen_submits_tip(self, client, setup_users, setup_case_and_suspect):
        """Test citizen can submit tip about a case."""
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        client.force_authenticate(user=citizen)
        
        response = client.post('/api/v1/investigation/tipoffs/', {
            'case': case.id,
            'information': 'من اطلاعات مهمی درباره این پرونده دارم که می‌تواند کمک کننده باشد.'
        })
        
        assert response.status_code == http_status.HTTP_201_CREATED
        assert response.data['status'] == TipOff.STATUS_PENDING
        assert response.data['submitted_by'] == citizen.id
    
    def test_tip_includes_suspect_information(self, client, setup_users, setup_case_and_suspect):
        """Test tip can include specific suspect information."""
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        suspect = setup_case_and_suspect['suspect']
        
        client.force_authenticate(user=citizen)
        
        response = client.post('/api/v1/investigation/tipoffs/', {
            'case': case.id,
            'suspect': suspect.id,
            'information': 'این مظنون را در محل خاصی دیدم.'
        })
        
        assert response.status_code == http_status.HTTP_201_CREATED
        assert response.data['suspect'] == suspect.id
    
    def test_citizen_can_view_own_tips(self, client, setup_users, setup_case_and_suspect):
        """Test citizen can view their submitted tips."""
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create tip
        TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات تست'
        )
        
        client.force_authenticate(user=citizen)
        response = client.get('/api/v1/investigation/tipoffs/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['count'] == 1
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['submitted_by'] == citizen.id
    
    def test_citizen_cannot_view_others_tips(self, client, setup_users, setup_case_and_suspect):
        """Test citizen cannot see other citizens' tips."""
        citizen1 = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create another citizen
        citizen2 = User.objects.create_user(
            username='citizen2',
            password='pass123',
            email='citizen2@test.com',
            phone_number='09129999999',
            national_id='9999999999'
        )
        
        # citizen2 creates tip
        TipOff.objects.create(
            case=case,
            submitted_by=citizen2,
            information='اطلاعات شهروند دیگر'
        )
        
        # citizen1 tries to view
        client.force_authenticate(user=citizen1)
        response = client.get('/api/v1/investigation/tipoffs/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['count'] == 0  # Should not see citizen2's tip
        assert len(response.data['results']) == 0


@pytest.mark.django_db
class TestOfficerReview:
    """Test officer initial review process."""
    
    def test_officer_approves_valid_tip(self, client, setup_users, setup_case_and_suspect):
        """Test officer approves valid tip."""
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create pending tip
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات معتبر و مفید'
        )
        
        client.force_authenticate(user=officer)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_OFFICER_APPROVED
        assert tip.reviewed_by_officer == officer
        assert tip.officer_reviewed_at is not None
    
    def test_officer_rejects_invalid_tip(self, client, setup_users, setup_case_and_suspect):
        """Test officer rejects invalid tip with reason."""
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات نامعتبر'
        )
        
        client.force_authenticate(user=officer)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': False,
            'rejection_reason': 'اطلاعات کاملا نامعتبر و بدون منبع قابل اعتماد'
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_OFFICER_REJECTED
        assert tip.reviewed_by_officer == officer
        assert tip.officer_rejection_reason == 'اطلاعات کاملا نامعتبر و بدون منبع قابل اعتماد'
    
    def test_rejection_requires_reason(self, client, setup_users, setup_case_and_suspect):
        """Test officer must provide reason when rejecting."""
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات'
        )
        
        client.force_authenticate(user=officer)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': False
            # No rejection_reason
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'rejection_reason is required' in response.data['error']
    
    def test_non_officer_cannot_review(self, client, setup_users, setup_case_and_suspect):
        """Test non-officer cannot perform officer review."""
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات'
        )
        
        client.force_authenticate(user=citizen)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN
    
    def test_detective_cannot_do_officer_review(self, client, setup_users, setup_case_and_suspect):
        """Test detective cannot perform officer review (not their role)."""
        detective = setup_users['detective']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات'
        )
        
        client.force_authenticate(user=detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN
    
    def test_cannot_review_non_pending_tip(self, client, setup_users, setup_case_and_suspect):
        """Test officer cannot review already-reviewed tip."""
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_OFFICER_APPROVED
        )
        
        client.force_authenticate(user=officer)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/officer_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'Cannot review tip' in response.data['error']
    
    def test_officer_sees_pending_tips_only(self, client, setup_users, setup_case_and_suspect):
        """Test officer sees only pending tips in their queue."""
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create tips with various statuses
        TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='پندینگ',
            status=TipOff.STATUS_PENDING
        )
        TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='تایید شده',
            status=TipOff.STATUS_OFFICER_APPROVED
        )
        
        client.force_authenticate(user=officer)
        response = client.get('/api/v1/investigation/tipoffs/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['count'] == 1  # Only pending
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == TipOff.STATUS_PENDING


@pytest.mark.django_db
class TestDetectiveConfirmation:
    """Test detective confirmation process."""
    
    def test_detective_confirms_useful_tip(self, client, setup_users, setup_case_and_suspect):
        """Test detective confirms tip is useful and issues reward code."""
        detective = setup_users['detective']
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create officer-approved tip
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات مفید',
            status=TipOff.STATUS_OFFICER_APPROVED,
            reviewed_by_officer=officer
        )
        
        client.force_authenticate(user=detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/detective_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_APPROVED
        assert tip.reviewed_by_detective == detective
        assert tip.redemption_code is not None
        assert tip.redemption_code.startswith('REWARD-')
        assert tip.approved_at is not None
    
    def test_detective_rejects_not_useful_tip(self, client, setup_users, setup_case_and_suspect):
        """Test detective rejects tip as not useful."""
        detective = setup_users['detective']
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات بدون ارزش',
            status=TipOff.STATUS_OFFICER_APPROVED,
            reviewed_by_officer=officer
        )
        
        client.force_authenticate(user=detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/detective_review/', {
            'approved': False,
            'rejection_reason': 'این اطلاعات برای پرونده مفید نیست'
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_DETECTIVE_REJECTED
        assert tip.detective_rejection_reason == 'این اطلاعات برای پرونده مفید نیست'
        assert tip.redemption_code is None  # No code issued
    
    def test_detective_rejection_requires_reason(self, client, setup_users, setup_case_and_suspect):
        """Test detective must provide reason when rejecting."""
        detective = setup_users['detective']
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_OFFICER_APPROVED,
            reviewed_by_officer=officer
        )
        
        client.force_authenticate(user=detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/detective_review/', {
            'approved': False
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'rejection_reason is required' in response.data['error']
    
    def test_only_assigned_detective_can_review(self, client, setup_users, setup_case_and_suspect, setup_roles):
        """Test only case-assigned detective can review tip."""
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create another detective
        other_detective = User.objects.create_user(
            username='detective2',
            password='pass123',
            email='detective2@test.com',
            phone_number='09129999998',
            national_id='9999999998'
        )
        other_detective.role = 'detective'
        other_detective.save()
        other_detective.roles.add(setup_roles['detective'])
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_OFFICER_APPROVED,
            reviewed_by_officer=officer
        )
        
        client.force_authenticate(user=other_detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/detective_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN
        assert 'assigned detective' in response.data['error']
    
    def test_non_detective_cannot_confirm(self, client, setup_users, setup_case_and_suspect):
        """Test non-detective cannot perform detective review."""
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_OFFICER_APPROVED,
            reviewed_by_officer=officer
        )
        
        client.force_authenticate(user=officer)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/detective_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN
    
    def test_cannot_review_non_officer_approved_tip(self, client, setup_users, setup_case_and_suspect):
        """Test detective can only review officer-approved tips."""
        detective = setup_users['detective']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Pending tip (not yet officer-approved)
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_PENDING
        )
        
        client.force_authenticate(user=detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip.id}/detective_review/', {
            'approved': True
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'officer-approved' in response.data['error']
    
    def test_detective_sees_officer_approved_tips(self, client, setup_users, setup_case_and_suspect):
        """Test detective sees officer-approved tips in their queue."""
        detective = setup_users['detective']
        officer = setup_users['officer']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create tips with various statuses
        TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='پندینگ',
            status=TipOff.STATUS_PENDING
        )
        TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='تایید افسر',
            status=TipOff.STATUS_OFFICER_APPROVED,
            reviewed_by_officer=officer
        )
        
        client.force_authenticate(user=detective)
        response = client.get('/api/v1/investigation/tipoffs/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['count'] == 1  # Only officer-approved
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == TipOff.STATUS_OFFICER_APPROVED


@pytest.mark.django_db
class TestRewardVerification:
    """Test reward verification at police station."""
    
    def test_verify_valid_reward_code(self, client, setup_users, setup_case_and_suspect):
        """Test police officer verifies valid reward code and national ID."""
        sergeant = setup_users['sergeant']
        detective = setup_users['detective']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        # Create approved tip with reward code
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات مفید',
            status=TipOff.STATUS_APPROVED,
            reviewed_by_detective=detective,
            redemption_code='REWARD-ABC123XYZ',
            reward_amount=5000000
        )
        
        client.force_authenticate(user=sergeant)
        response = client.post('/api/v1/investigation/tipoffs/verify_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': tip.redemption_code
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['valid'] is True
        assert response.data['user_name'] == citizen.get_full_name()
        assert response.data['user_national_id'] == citizen.national_id
        assert response.data['reward_amount'] == 5000000
        assert response.data['case_number'] == case.case_number
    
    def test_verify_invalid_code(self, client, setup_users):
        """Test verification fails with invalid code."""
        sergeant = setup_users['sergeant']
        
        client.force_authenticate(user=sergeant)
        response = client.post('/api/v1/investigation/tipoffs/verify_reward/', {
            'national_id': '1234567890',
            'redemption_code': 'INVALID-CODE'
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['valid'] is False
        assert 'Invalid redemption code' in response.data['error']
    
    def test_verify_mismatched_national_id(self, client, setup_users, setup_case_and_suspect):
        """Test verification fails when national ID doesn't match."""
        sergeant = setup_users['sergeant']
        detective = setup_users['detective']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_APPROVED,
            reviewed_by_detective=detective,
            redemption_code='REWARD-TEST123'
        )
        
        client.force_authenticate(user=sergeant)
        response = client.post('/api/v1/investigation/tipoffs/verify_reward/', {
            'national_id': '9999999999',  # Wrong national ID
            'redemption_code': tip.redemption_code
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['valid'] is False
    
    def test_verify_already_redeemed_reward(self, client, setup_users, setup_case_and_suspect):
        """Test verification fails for already-redeemed reward."""
        sergeant = setup_users['sergeant']
        detective = setup_users['detective']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_REDEEMED,
            reviewed_by_detective=detective,
            redemption_code='REWARD-USED123',
            redeemed_by_officer=sergeant
        )
        
        client.force_authenticate(user=sergeant)
        response = client.post('/api/v1/investigation/tipoffs/verify_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': tip.redemption_code
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['valid'] is False
        assert 'already redeemed' in response.data['error']
    
    def test_non_police_cannot_verify(self, client, setup_users):
        """Test civilian cannot verify rewards."""
        citizen = setup_users['citizen']
        
        client.force_authenticate(user=citizen)
        response = client.post('/api/v1/investigation/tipoffs/verify_reward/', {
            'national_id': '1234567890',
            'redemption_code': 'REWARD-TEST'
        })
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestRewardRedemption:
    """Test reward redemption process."""
    
    def test_redeem_valid_reward(self, client, setup_users, setup_case_and_suspect):
        """Test police officer redeems valid reward."""
        sergeant = setup_users['sergeant']
        detective = setup_users['detective']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات مفید',
            status=TipOff.STATUS_APPROVED,
            reviewed_by_detective=detective,
            redemption_code='REWARD-REDEEM123',
            reward_amount=5000000
        )
        
        client.force_authenticate(user=sergeant)
        response = client.post('/api/v1/investigation/tipoffs/redeem_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': tip.redemption_code
        })
        
        assert response.status_code == http_status.HTTP_200_OK
        assert 'successfully redeemed' in response.data['message']
        
        tip.refresh_from_db()
        assert tip.status == TipOff.STATUS_REDEEMED
        assert tip.redeemed_by_officer == sergeant
        assert tip.redeemed_at is not None
    
    def test_cannot_redeem_twice(self, client, setup_users, setup_case_and_suspect):
        """Test reward can only be redeemed once."""
        sergeant = setup_users['sergeant']
        detective = setup_users['detective']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_APPROVED,
            reviewed_by_detective=detective,
            redemption_code='REWARD-ONCE123'
        )
        
        client.force_authenticate(user=sergeant)
        
        # First redemption
        response1 = client.post('/api/v1/investigation/tipoffs/redeem_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': tip.redemption_code
        })
        assert response1.status_code == http_status.HTTP_200_OK
        
        # Second redemption attempt
        response2 = client.post('/api/v1/investigation/tipoffs/redeem_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': tip.redemption_code
        })
        assert response2.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'already redeemed' in response2.data['error']
    
    def test_cannot_redeem_unapproved_tip(self, client, setup_users, setup_case_and_suspect):
        """Test can only redeem approved tips."""
        sergeant = setup_users['sergeant']
        citizen = setup_users['citizen']
        case = setup_case_and_suspect['case']
        
        tip = TipOff.objects.create(
            case=case,
            submitted_by=citizen,
            information='اطلاعات',
            status=TipOff.STATUS_PENDING
        )
        
        client.force_authenticate(user=sergeant)
        response = client.post('/api/v1/investigation/tipoffs/redeem_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': 'FAKE-CODE'
        })
        
        assert response.status_code == http_status.HTTP_404_NOT_FOUND
    
    def test_non_police_cannot_redeem(self, client, setup_users):
        """Test civilian cannot process redemption."""
        citizen = setup_users['citizen']
        
        client.force_authenticate(user=citizen)
        response = client.post('/api/v1/investigation/tipoffs/redeem_reward/', {
            'national_id': '1234567890',
            'redemption_code': 'REWARD-TEST'
        })
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCompleteWorkflow:
    """Test complete workflow from submission to redemption."""
    
    def test_full_reward_workflow(self, client, setup_users, setup_case_and_suspect):
        """Test complete workflow: submit → officer review → detective confirm → redeem."""
        citizen = setup_users['citizen']
        officer = setup_users['officer']
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        case = setup_case_and_suspect['case']
        
        # Step 1: Citizen submits tip
        client.force_authenticate(user=citizen)
        response = client.post('/api/v1/investigation/tipoffs/', {
            'case': case.id,
            'information': 'من شخص مظنون را در خیابان دیدم'
        })
        assert response.status_code == http_status.HTTP_201_CREATED
        tip_id = response.data['id']
        
        # Step 2: Officer approves
        client.force_authenticate(user=officer)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip_id}/officer_review/', {
            'approved': True
        })
        assert response.status_code == http_status.HTTP_200_OK
        
        # Step 3: Detective confirms and issues reward code
        client.force_authenticate(user=detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip_id}/detective_review/', {
            'approved': True
        })
        assert response.status_code == http_status.HTTP_200_OK
        redemption_code = response.data['tip']['redemption_code']
        assert redemption_code is not None
        
        # Step 4: Citizen goes to police station, officer verifies
        client.force_authenticate(user=sergeant)
        response = client.post('/api/v1/investigation/tipoffs/verify_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': redemption_code
        })
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['valid'] is True
        
        # Step 5: Officer processes redemption
        response = client.post('/api/v1/investigation/tipoffs/redeem_reward/', {
            'national_id': citizen.national_id,
            'redemption_code': redemption_code
        })
        assert response.status_code == http_status.HTTP_200_OK
        
        # Verify final state
        tip = TipOff.objects.get(id=tip_id)
        assert tip.status == TipOff.STATUS_REDEEMED
        assert tip.reviewed_by_officer == officer
        assert tip.reviewed_by_detective == detective
        assert tip.redeemed_by_officer == sergeant
    
    def test_rejection_at_officer_level(self, client, setup_users, setup_case_and_suspect):
        """Test workflow when officer rejects tip."""
        citizen = setup_users['citizen']
        officer = setup_users['officer']
        case = setup_case_and_suspect['case']
        
        # Citizen submits
        client.force_authenticate(user=citizen)
        response = client.post('/api/v1/investigation/tipoffs/', {
            'case': case.id,
            'information': 'اطلاعات نامعتبر'
        })
        tip_id = response.data['id']
        
        # Officer rejects
        client.force_authenticate(user=officer)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip_id}/officer_review/', {
            'approved': False,
            'rejection_reason': 'اطلاعات قابل اعتماد نیست'
        })
        assert response.status_code == http_status.HTTP_200_OK
        
        tip = TipOff.objects.get(id=tip_id)
        assert tip.status == TipOff.STATUS_OFFICER_REJECTED
        assert tip.redemption_code is None  # No reward code
    
    def test_rejection_at_detective_level(self, client, setup_users, setup_case_and_suspect):
        """Test workflow when detective rejects tip."""
        citizen = setup_users['citizen']
        officer = setup_users['officer']
        detective = setup_users['detective']
        case = setup_case_and_suspect['case']
        
        # Citizen submits
        client.force_authenticate(user=citizen)
        response = client.post('/api/v1/investigation/tipoffs/', {
            'case': case.id,
            'information': 'اطلاعات معمولی'
        })
        tip_id = response.data['id']
        
        # Officer approves
        client.force_authenticate(user=officer)
        client.post(f'/api/v1/investigation/tipoffs/{tip_id}/officer_review/', {
            'approved': True
        })
        
        # Detective rejects as not useful
        client.force_authenticate(user=detective)
        response = client.post(f'/api/v1/investigation/tipoffs/{tip_id}/detective_review/', {
            'approved': False,
            'rejection_reason': 'این اطلاعات جدید نیست'
        })
        assert response.status_code == http_status.HTTP_200_OK
        
        tip = TipOff.objects.get(id=tip_id)
        assert tip.status == TipOff.STATUS_DETECTIVE_REJECTED
        assert tip.redemption_code is None  # No reward code
