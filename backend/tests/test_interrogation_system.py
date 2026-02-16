"""
Comprehensive tests for Interrogation System.
Tests interrogation workflow: detective + sergeant interrogate → captain decides → (if critical) chief approves.

Persian: تست‌های سیستم بازجویی
"""
import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from apps.cases.models import Case, CrimeLevel
from apps.accounts.models import Role
from apps.investigation.models import (
    Suspect, Interrogation, CaptainDecision, PoliceChiefDecision
)

User = get_user_model()


@pytest.fixture
def client():
    """Create API client."""
    return APIClient()


@pytest.fixture
def setup_users(db):
    """Create users with different roles."""
    # Create roles
    detective_role, _ = Role.objects.get_or_create(name='detective')
    sergeant_role, _ = Role.objects.get_or_create(name='sergeant')
    captain_role, _ = Role.objects.get_or_create(name='captain')
    chief_role, _ = Role.objects.get_or_create(name='police_chief')
    
    # Create users
    detective = User.objects.create_user(
        username='detective1',
        password='pass123',
        email='detective@test.com',
        phone_number='09121234567',
        national_id='1234567890'
    )
    detective.role = 'detective'
    detective.save()
    detective.roles.add(detective_role)
    
    sergeant = User.objects.create_user(
        username='sergeant1',
        password='pass123',
        email='sergeant@test.com',
        phone_number='09121234568',
        national_id='1234567891'
    )
    sergeant.role = 'sergeant'
    sergeant.save()
    sergeant.roles.add(sergeant_role)
    
    captain = User.objects.create_user(
        username='captain1',
        password='pass123',
        email='captain@test.com',
        phone_number='09121234569',
        national_id='1234567892'
    )
    captain.role = 'captain'
    captain.save()
    captain.roles.add(captain_role)
    
    chief = User.objects.create_user(
        username='chief1',
        password='pass123',
        email='chief@test.com',
        phone_number='09121234570',
        national_id='1234567893'
    )
    chief.role = 'police_chief'
    chief.save()
    chief.roles.add(chief_role)
    
    return {
        'detective': detective,
        'sergeant': sergeant,
        'captain': captain,
        'chief': chief,
    }


@pytest.fixture
def setup_cases(db, setup_users):
    """Create cases with different crime levels."""
    detective = setup_users['detective']
    
    # Create crime levels
    critical_level, _ = CrimeLevel.objects.get_or_create(
        level=0,
        defaults={'name': 'Critical', 'description': 'Critical level crimes requiring chief approval'}
    )
    high_level, _ = CrimeLevel.objects.get_or_create(
        level=1,
        defaults={'name': 'Level 1 - Major', 'description': 'Major crimes'}
    )
    
    # Create cases
    critical_case = Case.objects.create(
        case_number='CR-2024-001',
        title='Murder Case',
        description='Critical murder investigation',
        crime_level=critical_level,
        status=Case.STATUS_INTERROGATION,
        created_by=detective
    )
    
    regular_case = Case.objects.create(
        case_number='RG-2024-001',
        title='Theft Case',
        description='Regular theft investigation',
        crime_level=high_level,
        status=Case.STATUS_INTERROGATION,
        created_by=detective
    )
    
    return {
        'critical': critical_case,
        'regular': regular_case,
        'critical_level': critical_level,
        'high_level': high_level,
    }


@pytest.fixture
def setup_suspects(db, setup_cases, setup_users):
    """Create suspects for interrogation."""
    detective = setup_users['detective']
    sergeant = setup_users['sergeant']
    
    # Create person suspects
    person1 = User.objects.create_user(
        username='suspect1',
        email='suspect1@test.com',
        phone_number='09121111111',
        national_id='1111111111',
        first_name='John',
        last_name='Doe',
        password='pass123'
    )
    
    person2 = User.objects.create_user(
        username='suspect2',
        email='suspect2@test.com',
        phone_number='09122222222',
        national_id='2222222222',
        first_name='Jane',
        last_name='Smith',
        password='pass123'
    )
    
    # Create suspects
    critical_suspect = Suspect.objects.create(
        case=setup_cases['critical'],
        person=person1,
        status=Suspect.STATUS_ARRESTED,
        reason='Strong evidence',
        identified_by_detective=detective,
        approved_by_sergeant=sergeant
    )
    
    regular_suspect = Suspect.objects.create(
        case=setup_cases['regular'],
        person=person2,
        status=Suspect.STATUS_ARRESTED,
        reason='Caught at scene',
        identified_by_detective=detective,
        approved_by_sergeant=sergeant
    )
    
    return {
        'critical': critical_suspect,
        'regular': regular_suspect,
    }


@pytest.mark.django_db
class TestInterrogationCreation:
    """Test interrogation creation and rating submission."""
    
    def test_create_interrogation(self, client, setup_users, setup_suspects):
        """Test creating an interrogation."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        suspect = setup_suspects['regular']
        
        client.force_authenticate(user=detective)
        
        data = {
            'suspect': suspect.id,
            'detective': detective.id,
            'sergeant': sergeant.id,
        }
        
        response = client.post('/api/v1/investigation/interrogations/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['suspect'] == suspect.id
        assert response.data['status'] == Interrogation.STATUS_PENDING
        assert response.data['detective_guilt_rating'] is None
        assert response.data['sergeant_guilt_rating'] is None
    
    def test_submit_interrogation_ratings(self, client, setup_users, setup_suspects):
        """Test submitting interrogation ratings to captain."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        suspect = setup_suspects['regular']
        
        # Create interrogation
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_PENDING
        )
        
        client.force_authenticate(user=detective)
        
        data = {
            'detective_guilt_rating': 8,
            'sergeant_guilt_rating': 7,
            'detective_notes': 'Suspect showed nervous behavior during interrogation',
            'sergeant_notes': 'Strong evidence against suspect but may have accomplices'
        }
        
        response = client.post(
            f'/api/v1/investigation/interrogations/{interrogation.id}/submit_ratings/',
            data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Interrogation.STATUS_SUBMITTED
        assert response.data['detective_guilt_rating'] == 8
        assert response.data['sergeant_guilt_rating'] == 7
        assert response.data['average_rating'] == 7.5
    
    def test_submit_ratings_requires_both_ratings(self, client, setup_users, setup_suspects):
        """Test that both ratings are required."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        suspect = setup_suspects['regular']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_PENDING
        )
        
        client.force_authenticate(user=detective)
        
        # Missing sergeant rating
        data = {
            'detective_guilt_rating': 8,
            'detective_notes': 'Some notes here',
            'sergeant_notes': 'Some notes here'
        }
        
        response = client.post(
            f'/api/v1/investigation/interrogations/{interrogation.id}/submit_ratings/',
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_rating_validation(self, client, setup_users, setup_suspects):
        """Test rating must be between 1-10."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        suspect = setup_suspects['regular']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_PENDING
        )
        
        client.force_authenticate(user=detective)
        
        # Rating too high
        data = {
            'detective_guilt_rating': 11,
            'sergeant_guilt_rating': 7,
            'detective_notes': 'Some notes here',
            'sergeant_notes': 'Some notes here'
        }
        
        response = client.post(
            f'/api/v1/investigation/interrogations/{interrogation.id}/submit_ratings/',
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_cannot_submit_already_submitted_interrogation(self, client, setup_users, setup_suspects):
        """Test cannot resubmit an already submitted interrogation."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        suspect = setup_suspects['regular']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_SUBMITTED,
            detective_guilt_rating=8,
            sergeant_guilt_rating=7
        )
        
        client.force_authenticate(user=detective)
        
        data = {
            'detective_guilt_rating': 9,
            'sergeant_guilt_rating': 8,
            'detective_notes': 'New notes',
            'sergeant_notes': 'New notes'
        }
        
        response = client.post(
            f'/api/v1/investigation/interrogations/{interrogation.id}/submit_ratings/',
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCaptainDecision:
    """Test captain decision on interrogation."""
    
    def test_captain_creates_decision(self, client, setup_users, setup_suspects):
        """Test captain creates decision on interrogation."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['regular']
        
        # Create submitted interrogation
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_SUBMITTED,
            detective_guilt_rating=8,
            sergeant_guilt_rating=7,
            detective_notes='Suspicious behavior',
            sergeant_notes='Strong evidence'
        )
        
        client.force_authenticate(user=captain)
        
        data = {
            'interrogation': interrogation.id,
            'decision': CaptainDecision.DECISION_GUILTY,
            'reasoning': 'Based on high ratings from detective and sergeant, strong evidence, and partial confession by suspect, the suspect is found guilty.'
        }
        
        response = client.post('/api/v1/investigation/captain-decisions/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['decision'] == CaptainDecision.DECISION_GUILTY
        assert response.data['captain'] == captain.id
        
        # Check interrogation status updated
        interrogation.refresh_from_db()
        assert interrogation.status == Interrogation.STATUS_REVIEWED
    
    def test_only_captain_can_create_decision(self, client, setup_users, setup_suspects):
        """Test only captain can create decision."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        suspect = setup_suspects['regular']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_SUBMITTED,
            detective_guilt_rating=8,
            sergeant_guilt_rating=7
        )
        
        client.force_authenticate(user=detective)
        
        data = {
            'interrogation': interrogation.id,
            'decision': CaptainDecision.DECISION_GUILTY,
            'reasoning': 'This should not work because user is not captain'
        }
        
        response = client.post('/api/v1/investigation/captain-decisions/', data)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_captain_decision_requires_complete_interrogation(self, client, setup_users, setup_suspects):
        """Test captain decision requires complete interrogation."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['regular']
        
        # Create incomplete interrogation (no ratings)
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_PENDING
        )
        
        client.force_authenticate(user=captain)
        
        data = {
            'interrogation': interrogation.id,
            'decision': CaptainDecision.DECISION_GUILTY,
            'reasoning': 'This should fail because interrogation incomplete'
        }
        
        response = client.post('/api/v1/investigation/captain-decisions/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_captain_decision_reasoning_validation(self, client, setup_users, setup_suspects):
        """Test captain decision requires adequate reasoning."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['regular']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_SUBMITTED,
            detective_guilt_rating=8,
            sergeant_guilt_rating=7
        )
        
        client.force_authenticate(user=captain)
        
        data = {
            'interrogation': interrogation.id,
            'decision': CaptainDecision.DECISION_GUILTY,
            'reasoning': 'Too short'  # Less than 20 characters
        }
        
        response = client.post('/api/v1/investigation/captain-decisions/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_critical_crime_requires_chief_approval(self, client, setup_users, setup_suspects):
        """Test critical crimes set status to awaiting chief."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['critical']  # Critical level crime
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_SUBMITTED,
            detective_guilt_rating=9,
            sergeant_guilt_rating=9
        )
        
        client.force_authenticate(user=captain)
        
        data = {
            'interrogation': interrogation.id,
            'decision': CaptainDecision.DECISION_GUILTY,
            'reasoning': 'High ratings and critical evidence point to guilt beyond reasonable doubt.'
        }
        
        response = client.post('/api/v1/investigation/captain-decisions/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == CaptainDecision.STATUS_AWAITING_CHIEF
        assert response.data['requires_chief'] is True
    
    def test_regular_crime_completed_immediately(self, client, setup_users, setup_suspects):
        """Test regular crimes are completed without chief approval."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['regular']  # Regular crime
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_SUBMITTED,
            detective_guilt_rating=6,
            sergeant_guilt_rating=7
        )
        
        client.force_authenticate(user=captain)
        
        data = {
            'interrogation': interrogation.id,
            'decision': CaptainDecision.DECISION_GUILTY,
            'reasoning': 'Evidence and ratings support guilty verdict.'
        }
        
        response = client.post('/api/v1/investigation/captain-decisions/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == CaptainDecision.STATUS_COMPLETED
        assert response.data['requires_chief'] is False


@pytest.mark.django_db
class TestPoliceChiefDecision:
    """Test police chief decision for critical crimes."""
    
    def test_chief_approves_captain_decision(self, client, setup_users, setup_suspects):
        """Test police chief approves captain's decision."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        chief = setup_users['chief']
        suspect = setup_suspects['critical']
        
        # Create interrogation and captain decision
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=9,
            sergeant_guilt_rating=9
        )
        
        captain_decision = CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Strong evidence supports guilty verdict.',
            status=CaptainDecision.STATUS_AWAITING_CHIEF
        )
        
        client.force_authenticate(user=chief)
        
        data = {
            'captain_decision': captain_decision.id,
            'decision': PoliceChiefDecision.DECISION_APPROVED,
            'comments': 'Captain decision is correct. Sufficient evidence for conviction.'
        }
        
        response = client.post('/api/v1/investigation/chief-decisions/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['decision'] == PoliceChiefDecision.DECISION_APPROVED
        
        # Check captain decision status updated
        captain_decision.refresh_from_db()
        assert captain_decision.status == CaptainDecision.STATUS_COMPLETED
    
    def test_chief_rejects_captain_decision(self, client, setup_users, setup_suspects):
        """Test police chief rejects captain's decision."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        chief = setup_users['chief']
        suspect = setup_suspects['critical']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=5,
            sergeant_guilt_rating=6
        )
        
        captain_decision = CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Ratings indicate guilt.',
            status=CaptainDecision.STATUS_AWAITING_CHIEF
        )
        
        client.force_authenticate(user=chief)
        
        data = {
            'captain_decision': captain_decision.id,
            'decision': PoliceChiefDecision.DECISION_REJECTED,
            'comments': 'Insufficient evidence for such a critical case. Need more investigation.'
        }
        
        response = client.post('/api/v1/investigation/chief-decisions/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['decision'] == PoliceChiefDecision.DECISION_REJECTED
    
    def test_only_chief_can_create_decision(self, client, setup_users, setup_suspects):
        """Test only police chief can create decision."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['critical']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=9,
            sergeant_guilt_rating=9
        )
        
        captain_decision = CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Strong evidence.',
            status=CaptainDecision.STATUS_AWAITING_CHIEF
        )
        
        # Try with captain (not chief)
        client.force_authenticate(user=captain)
        
        data = {
            'captain_decision': captain_decision.id,
            'decision': PoliceChiefDecision.DECISION_APPROVED,
            'comments': 'This should not work'
        }
        
        response = client.post('/api/v1/investigation/chief-decisions/', data)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_chief_decision_only_for_critical_crimes(self, client, setup_users, setup_suspects):
        """Test chief decision only allowed for critical crimes."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        chief = setup_users['chief']
        suspect = setup_suspects['regular']  # NOT critical
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=7,
            sergeant_guilt_rating=8
        )
        
        captain_decision = CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Evidence supports verdict.',
            status=CaptainDecision.STATUS_COMPLETED
        )
        
        client.force_authenticate(user=chief)
        
        data = {
            'captain_decision': captain_decision.id,
            'decision': PoliceChiefDecision.DECISION_APPROVED,
            'comments': 'This should fail for non-critical crime'
        }
        
        response = client.post('/api/v1/investigation/chief-decisions/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_chief_comments_validation(self, client, setup_users, setup_suspects):
        """Test chief decision requires adequate comments."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        chief = setup_users['chief']
        suspect = setup_suspects['critical']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=9,
            sergeant_guilt_rating=9
        )
        
        captain_decision = CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Strong evidence.',
            status=CaptainDecision.STATUS_AWAITING_CHIEF
        )
        
        client.force_authenticate(user=chief)
        
        data = {
            'captain_decision': captain_decision.id,
            'decision': PoliceChiefDecision.DECISION_APPROVED,
            'comments': 'Short'  # Less than 10 characters
        }
        
        response = client.post('/api/v1/investigation/chief-decisions/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestInterrogationPermissions:
    """Test permission controls for interrogation system."""
    
    def test_detective_can_view_own_interrogations(self, client, setup_users, setup_suspects):
        """Test detective can only view their own interrogations."""
        detective1 = setup_users['detective']
        sergeant = setup_users['sergeant']
        suspect = setup_suspects['regular']
        
        # Create detective's interrogation
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective1,
            sergeant=sergeant
        )
        
        client.force_authenticate(user=detective1)
        
        response = client.get('/api/v1/investigation/interrogations/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == interrogation.id
    
    def test_captain_can_view_submitted_interrogations(self, client, setup_users, setup_suspects):
        """Test captain can view submitted interrogations."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['regular']
        
        # Create submitted interrogation
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_SUBMITTED,
            detective_guilt_rating=8,
            sergeant_guilt_rating=7
        )
        
        # Create pending interrogation (should not appear)
        Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_PENDING
        )
        
        client.force_authenticate(user=captain)
        
        response = client.get('/api/v1/investigation/interrogations/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == interrogation.id
    
    def test_captain_can_view_own_decisions(self, client, setup_users, setup_suspects):
        """Test captain can view their own decisions."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        suspect = setup_suspects['regular']
        
        interrogation = Interrogation.objects.create(
            suspect=suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=8,
            sergeant_guilt_rating=7
        )
        
        decision = CaptainDecision.objects.create(
            interrogation=interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Evidence supports verdict.',
            status=CaptainDecision.STATUS_COMPLETED
        )
        
        client.force_authenticate(user=captain)
        
        response = client.get('/api/v1/investigation/captain-decisions/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == decision.id
    
    def test_chief_can_view_critical_decisions(self, client, setup_users, setup_suspects):
        """Test chief can view decisions awaiting approval."""
        detective = setup_users['detective']
        sergeant = setup_users['sergeant']
        captain = setup_users['captain']
        chief = setup_users['chief']
        critical_suspect = setup_suspects['critical']
        regular_suspect = setup_suspects['regular']
        
        # Critical interrogation
        critical_interrogation = Interrogation.objects.create(
            suspect=critical_suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=9,
            sergeant_guilt_rating=9
        )
        
        critical_decision = CaptainDecision.objects.create(
            interrogation=critical_interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Strong evidence.',
            status=CaptainDecision.STATUS_AWAITING_CHIEF
        )
        
        # Regular interrogation (should not appear for chief)
        regular_interrogation = Interrogation.objects.create(
            suspect=regular_suspect,
            detective=detective,
            sergeant=sergeant,
            status=Interrogation.STATUS_REVIEWED,
            detective_guilt_rating=7,
            sergeant_guilt_rating=7
        )
        
        CaptainDecision.objects.create(
            interrogation=regular_interrogation,
            captain=captain,
            decision=CaptainDecision.DECISION_GUILTY,
            reasoning='Evidence supports verdict.',
            status=CaptainDecision.STATUS_COMPLETED
        )
        
        client.force_authenticate(user=chief)
        
        response = client.get('/api/v1/investigation/captain-decisions/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == critical_decision.id
