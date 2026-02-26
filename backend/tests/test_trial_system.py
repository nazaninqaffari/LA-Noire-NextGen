"""
Comprehensive tests for Trial System.
Tests court proceedings, verdicts, punishments, and case summary review by judge.

Persian: تست‌های سیستم دادگاه و محاکمه
"""
import pytest
from unittest.mock import patch, MagicMock
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status as http_status
from django.contrib.auth import get_user_model

from apps.cases.models import Case, CrimeLevel
from apps.accounts.models import Role
from apps.investigation.models import Suspect, Interrogation, CaptainDecision
from apps.trial.models import Trial, Verdict, Punishment, BailPayment

User = get_user_model()


@pytest.fixture
def client():
    """Create API client."""
    return APIClient()


@pytest.fixture
def setup_roles(db):
    """Create all necessary roles."""
    judge_role, _ = Role.objects.get_or_create(name='Judge')
    captain_role, _ = Role.objects.get_or_create(name='Captain')
    detective_role, _ = Role.objects.get_or_create(name='Detective', defaults={'is_police_rank': True})
    sergeant_role, _ = Role.objects.get_or_create(name='Sergeant', defaults={'is_police_rank': True})
    return {
        'judge': judge_role,
        'captain': captain_role,
        'detective': detective_role,
        'sergeant': sergeant_role,
    }


@pytest.fixture
def setup_users(db, setup_roles):
    """Create users with different roles."""
    judge = User.objects.create_user(
        username='judge1',
        password='pass123',
        email='judge@test.com',
        phone_number='09121234571',
        national_id='1234567894'
    )
    judge.role = 'judge'
    judge.save()
    judge.roles.add(setup_roles['judge'])
    
    captain = User.objects.create_user(
        username='captain1',
        password='pass123',
        email='captain@test.com',
        phone_number='09121234572',
        national_id='1234567895'
    )
    captain.role = 'captain'
    captain.save()
    captain.roles.add(setup_roles['captain'])
    
    detective = User.objects.create_user(
        username='detective1',
        password='pass123',
        email='detective@test.com',
        phone_number='09121234573',
        national_id='1234567896'
    )
    detective.role = 'detective'
    detective.save()
    detective.roles.add(setup_roles['detective'])
    
    sergeant = User.objects.create_user(
        username='sergeant1',
        password='pass123',
        email='sergeant@test.com',
        phone_number='09121234574',
        national_id='1234567897'
    )
    sergeant.role = 'sergeant'
    sergeant.save()
    sergeant.roles.add(setup_roles['sergeant'])
    
    return {
        'judge': judge,
        'captain': captain,
        'detective': detective,
        'sergeant': sergeant,
    }


@pytest.fixture
def setup_case_with_guilty_decision(db, setup_users):
    """Create a complete case with guilty decision ready for trial."""
    detective = setup_users['detective']
    sergeant = setup_users['sergeant']
    captain = setup_users['captain']
    
    # Create crime level
    crime_level, _ = CrimeLevel.objects.get_or_create(
        level=1,
        defaults={'name': 'Level 1 - Major', 'description': 'Major crimes'}
    )
    
    # Create case
    case = Case.objects.create(
        case_number='TR-2024-001',
        title='Murder Case',
        description='Murder investigation',
        crime_level=crime_level,
        status=Case.STATUS_TRIAL_PENDING,
        created_by=detective
    )
    
    # Create suspect
    suspect_person = User.objects.create_user(
        username='suspect1',
        email='suspect1@test.com',
        phone_number='09121234575',
        national_id='1234567898',
        first_name='John',
        last_name='Doe',
        password='pass123'
    )
    
    suspect = Suspect.objects.create(
        case=case,
        person=suspect_person,
        status=Suspect.STATUS_ARRESTED,
        reason='Strong evidence',
        identified_by_detective=detective,
        approved_by_sergeant=sergeant
    )
    
    # Create interrogation
    interrogation = Interrogation.objects.create(
        suspect=suspect,
        detective=detective,
        sergeant=sergeant,
        status=Interrogation.STATUS_SUBMITTED,
        detective_guilt_rating=9,
        sergeant_guilt_rating=8,
        detective_notes="Clear evidence of guilt",
        sergeant_notes="Confession obtained",
        submitted_at=timezone.now()
    )
    
    # Create captain decision (guilty)
    captain_decision = CaptainDecision.objects.create(
        interrogation=interrogation,
        captain=captain,
        decision=CaptainDecision.DECISION_GUILTY,
        reasoning="Based on strong evidence and confession",
        status=CaptainDecision.STATUS_COMPLETED
    )
    
    # Update interrogation status
    interrogation.status = Interrogation.STATUS_REVIEWED
    interrogation.save()
    
    return {
        'case': case,
        'suspect': suspect,
        'interrogation': interrogation,
        'captain_decision': captain_decision,
    }


@pytest.mark.django_db
class TestTrialCreation:
    """Test trial creation and initialization."""
    
    def test_create_trial(self, client, setup_users, setup_case_with_guilty_decision):
        """Test creating a trial for guilty suspect."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        case_data = setup_case_with_guilty_decision
        
        client.force_authenticate(user=judge)
        
        response = client.post('/api/v1/trial/trials/', {
            'case': case_data['case'].id,
            'suspect': case_data['suspect'].id,
            'judge': judge.id,
            'submitted_by_captain': captain.id,
            'captain_notes': 'Suspect found guilty, proceeding to trial'
        })
        
        assert response.status_code == http_status.HTTP_201_CREATED
        assert response.data['status'] == Trial.STATUS_PENDING
        assert response.data['case'] == case_data['case'].id
    
    def test_trial_requires_guilty_decision(self, client, setup_users):
        """Test that trial requires a guilty captain decision."""
        judge = setup_users['judge']
        detective = setup_users['detective']
        
        # Create case without guilty decision
        crime_level, _ = CrimeLevel.objects.get_or_create(
            level=1,
            defaults={'name': 'Level 1', 'description': 'Major crimes'}
        )
        case = Case.objects.create(
            case_number='TR-2024-002',
            title='Test Case',
            description='Test',
            crime_level=crime_level,
            created_by=detective
        )
        
        suspect_person = User.objects.create_user(
            username='suspect2',
            email='suspect2@test.com',
            phone_number='09121234576',
            national_id='1234567899',
            password='pass123'
        )
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            status=Suspect.STATUS_ARRESTED,
            reason='Test',
            identified_by_detective=detective
        )
        
        client.force_authenticate(user=judge)
        
        response = client.post('/api/v1/trial/trials/', {
            'case': case.id,
            'suspect': suspect.id,
            'judge': judge.id
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'guilty decision' in str(response.data).lower()


@pytest.mark.django_db
class TestCaseSummary:
    """Test case summary endpoint for judge review."""
    
    def test_judge_can_view_case_summary(self, client, setup_users, setup_case_with_guilty_decision):
        """Test judge can view complete case summary."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        case_data = setup_case_with_guilty_decision
        
        # Create trial
        trial = Trial.objects.create(
            case=case_data['case'],
            suspect=case_data['suspect'],
            judge=judge,
            submitted_by_captain=captain,
            captain_notes='Guilty verdict'
        )
        
        client.force_authenticate(user=judge)
        
        response = client.get(f'/api/v1/trial/trials/{trial.id}/case_summary/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert 'case' in response.data
        assert 'suspect' in response.data
        assert 'police_members' in response.data
        assert 'interrogations' in response.data
        assert len(response.data['interrogations']) > 0
    
    def test_non_judge_cannot_view_case_summary(self, client, setup_users, setup_case_with_guilty_decision):
        """Test non-judge cannot view case summary."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        detective = setup_users['detective']
        case_data = setup_case_with_guilty_decision
        
        trial = Trial.objects.create(
            case=case_data['case'],
            suspect=case_data['suspect'],
            judge=judge,
            submitted_by_captain=captain
        )
        
        client.force_authenticate(user=detective)
        
        response = client.get(f'/api/v1/trial/trials/{trial.id}/case_summary/')
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestVerdict:
    """Test verdict delivery by judge."""
    
    def test_judge_delivers_guilty_verdict_with_punishment(self, client, setup_users, setup_case_with_guilty_decision):
        """Test judge delivers guilty verdict with punishment."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        case_data = setup_case_with_guilty_decision
        
        trial = Trial.objects.create(
            case=case_data['case'],
            suspect=case_data['suspect'],
            judge=judge,
            submitted_by_captain=captain
        )
        
        client.force_authenticate(user=judge)
        
        response = client.post(f'/api/v1/trial/trials/{trial.id}/deliver_verdict/', {
            'decision': 'guilty',
            'reasoning': 'با توجه به شواهد و اقرار مظنون، متهم مجرم شناخته می‌شود',
            'punishment_title': '10 سال حبس',
            'punishment_description': 'محکومیت به 10 سال حبس در زندان با احتساب ایام بازداشت'
        })
        
        assert response.status_code == http_status.HTTP_201_CREATED
        assert response.data['decision'] == 'guilty'
        assert 'punishment' in response.data
        assert response.data['punishment']['title'] == '10 سال حبس'
        
        # Check trial status updated
        trial.refresh_from_db()
        assert trial.status == Trial.STATUS_COMPLETED
        assert trial.trial_ended_at is not None
    
    def test_judge_delivers_innocent_verdict(self, client, setup_users, setup_case_with_guilty_decision):
        """Test judge delivers innocent verdict (no punishment)."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        case_data = setup_case_with_guilty_decision
        
        trial = Trial.objects.create(
            case=case_data['case'],
            suspect=case_data['suspect'],
            judge=judge,
            submitted_by_captain=captain
        )
        
        client.force_authenticate(user=judge)
        
        response = client.post(f'/api/v1/trial/trials/{trial.id}/deliver_verdict/', {
            'decision': 'innocent',
            'reasoning': 'شواهد کافی برای محکومیت وجود ندارد و متهم بی‌گناه شناخته می‌شود'
        })
        
        assert response.status_code == http_status.HTTP_201_CREATED
        assert response.data['decision'] == 'innocent'
        assert response.data['punishment'] is None
    
    def test_guilty_verdict_requires_punishment(self, client, setup_users, setup_case_with_guilty_decision):
        """Test guilty verdict requires punishment details."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        case_data = setup_case_with_guilty_decision
        
        trial = Trial.objects.create(
            case=case_data['case'],
            suspect=case_data['suspect'],
            judge=judge,
            submitted_by_captain=captain
        )
        
        client.force_authenticate(user=judge)
        
        response = client.post(f'/api/v1/trial/trials/{trial.id}/deliver_verdict/', {
            'decision': 'guilty',
            'reasoning': 'با توجه به شواهد کافی، متهم مجرم شناخته می‌شود و نیازمند مجازات است'
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'punishment' in str(response.data).lower()
    
    def test_only_assigned_judge_can_deliver_verdict(self, client, setup_users, setup_case_with_guilty_decision):
        """Test only the assigned judge can deliver verdict."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        case_data = setup_case_with_guilty_decision
        
        # Create another judge
        other_judge = User.objects.create_user(
            username='judge2',
            password='pass123',
            email='judge2@test.com',
            phone_number='09121234577',
            national_id='1234567900'
        )
        other_judge.role = 'judge'
        other_judge.save()
        
        trial = Trial.objects.create(
            case=case_data['case'],
            suspect=case_data['suspect'],
            judge=judge,
            submitted_by_captain=captain
        )
        
        client.force_authenticate(user=other_judge)
        
        response = client.post(f'/api/v1/trial/trials/{trial.id}/deliver_verdict/', {
            'decision': 'guilty',
            'reasoning': 'Test reasoning',
            'punishment_title': 'Test',
            'punishment_description': 'Test description here'
        })
        
        assert response.status_code == http_status.HTTP_403_FORBIDDEN
    
    def test_cannot_deliver_verdict_twice(self, client, setup_users, setup_case_with_guilty_decision):
        """Test cannot deliver verdict twice for same trial."""
        judge = setup_users['judge']
        captain = setup_users['captain']
        case_data = setup_case_with_guilty_decision
        
        trial = Trial.objects.create(
            case=case_data['case'],
            suspect=case_data['suspect'],
            judge=judge,
            submitted_by_captain=captain
        )
        
        # Create verdict
        Verdict.objects.create(
            trial=trial,
            decision=Verdict.VERDICT_GUILTY,
            reasoning='First verdict'
        )
        
        client.force_authenticate(user=judge)
        
        response = client.post(f'/api/v1/trial/trials/{trial.id}/deliver_verdict/', {
            'decision': 'innocent',
            'reasoning': 'Second verdict attempt'
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestBailPayment:
    """Test bail payment system for level 2/3 crimes."""
    
    def test_create_bail_request(self, client, setup_users):
        """Test suspect creates bail payment request."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        
        # Create level 2 crime
        crime_level, _ = CrimeLevel.objects.get_or_create(
            level=2,
            defaults={'name': 'Level 2', 'description': 'Medium crimes'}
        )
        case = Case.objects.create(
            case_number='BAIL-001',
            title='Theft Case',
            description='Theft',
            crime_level=crime_level,
            created_by=detective
        )
        
        suspect_person = User.objects.create_user(
            username='suspect_bail',
            email='suspect_bail@test.com',
            phone_number='09121234578',
            national_id='1234567901',
            password='pass123'
        )
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            status=Suspect.STATUS_ARRESTED,
            reason='Theft',
            identified_by_detective=detective
        )
        
        client.force_authenticate(user=suspect_person)
        
        response = client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect.id,
            'amount': 50_000_000  # 50 million Rials
        })
        
        assert response.status_code == http_status.HTTP_201_CREATED
        # Level 2 crimes are auto-approved on creation
        assert response.data['status'] == BailPayment.STATUS_APPROVED
        assert response.data['amount'] == '50000000'
    
    def test_bail_only_for_level_2_3_crimes(self, client, setup_users):
        """Test bail is only for level 2 and 3 crimes."""
        detective = setup_users['detective']
        
        # Create level 0 crime (critical)
        crime_level, _ = CrimeLevel.objects.get_or_create(
            level=0,
            defaults={'name': 'Critical', 'description': 'Critical crimes'}
        )
        case = Case.objects.create(
            case_number='BAIL-002',
            title='Murder',
            description='Murder case',
            crime_level=crime_level,
            created_by=detective
        )
        
        suspect_person = User.objects.create_user(
            username='suspect_no_bail',
            email='suspect_no_bail@test.com',
            phone_number='09121234579',
            national_id='1234567902',
            password='pass123'
        )
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            status=Suspect.STATUS_ARRESTED,
            reason='Murder',
            identified_by_detective=detective
        )
        
        client.force_authenticate(user=suspect_person)
        
        response = client.post('/api/v1/trial/bail-payments/', {
            'suspect': suspect.id,
            'amount': 50_000_000
        })
        
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert 'level 2 and 3' in str(response.data).lower()
    
    def test_sergeant_approves_bail(self, client, setup_users):
        """Test sergeant approves bail payment."""
        sergeant = setup_users['sergeant']
        detective = setup_users['detective']
        
        crime_level, _ = CrimeLevel.objects.get_or_create(
            level=2,
            defaults={'name': 'Level 2', 'description': 'Medium'}
        )
        case = Case.objects.create(
            case_number='BAIL-003',
            title='Theft',
            description='Theft',
            crime_level=crime_level,
            created_by=detective
        )
        
        suspect_person = User.objects.create_user(
            username='suspect3',
            email='suspect3@test.com',
            phone_number='09121234580',
            national_id='1234567903',
            password='pass123'
        )
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            status=Suspect.STATUS_ARRESTED,
            reason='Theft',
            identified_by_detective=detective
        )
        
        bail = BailPayment.objects.create(
            suspect=suspect,
            amount=50_000_000
        )
        
        client.force_authenticate(user=sergeant)
        
        response = client.post(f'/api/v1/trial/bail-payments/{bail.id}/approve/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['status'] == BailPayment.STATUS_APPROVED
        assert response.data['sergeant_name'] is not None
    
    def test_suspect_pays_bail(self, client, setup_users):
        """Test suspect pays approved bail."""
        sergeant = setup_users['sergeant']
        detective = setup_users['detective']
        
        crime_level, _ = CrimeLevel.objects.get_or_create(
            level=2,
            defaults={'name': 'Level 2', 'description': 'Medium'}
        )
        case = Case.objects.create(
            case_number='BAIL-004',
            title='Theft',
            description='Theft',
            crime_level=crime_level,
            created_by=detective
        )
        
        suspect_person = User.objects.create_user(
            username='suspect4',
            email='suspect4@test.com',
            phone_number='09121234581',
            national_id='1234567904',
            password='pass123'
        )
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            status=Suspect.STATUS_ARRESTED,
            reason='Theft',
            identified_by_detective=detective
        )
        
        bail = BailPayment.objects.create(
            suspect=suspect,
            amount=50_000_000,
            status=BailPayment.STATUS_APPROVED,
            approved_by_sergeant=sergeant,
            approved_at=timezone.now()
        )
        
        client.force_authenticate(user=suspect_person)

        # Step 1: Initiate payment (mock Zarinpal request API)
        mock_pay_response = MagicMock()
        mock_pay_response.json.return_value = {
            'data': {'code': 100, 'authority': 'test-authority-123'}
        }
        with patch('requests.post', return_value=mock_pay_response):
            response = client.post(f'/api/v1/trial/bail-payments/{bail.id}/pay/')

        assert response.status_code == http_status.HTTP_200_OK
        assert 'redirect_url' in response.data

        # Step 2: Verify payment (mock Zarinpal verify API)
        mock_verify_response = MagicMock()
        mock_verify_response.json.return_value = {
            'data': {'code': 100, 'ref_id': '1234567890'}
        }
        with patch('requests.post', return_value=mock_verify_response):
            response = client.post('/api/v1/trial/bail-payments/verify_payment/', {
                'authority': 'test-authority-123',
                'status': 'OK'
            })

        assert response.status_code == http_status.HTTP_200_OK
        assert response.data['status'] == 'success'

        bail.refresh_from_db()
        assert bail.status == BailPayment.STATUS_PAID
        assert bail.payment_reference is not None
