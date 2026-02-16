"""
Comprehensive tests for Suspect Status and Intensive Pursuit system.
Tests automatic status updates, danger score calculation, reward calculation,
and public wanted list functionality.

Persian: تست‌های سیستم وضعیت مظنونین و تعقیب شدید
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status as http_status

from apps.cases.models import Case, CrimeLevel
from apps.accounts.models import Role
from apps.investigation.models import Suspect

User = get_user_model()


@pytest.fixture
def client():
    """Create API client."""
    return APIClient()


@pytest.fixture
def setup_roles(db):
    """Create necessary roles."""
    detective_role, _ = Role.objects.get_or_create(name='detective')
    sergeant_role, _ = Role.objects.get_or_create(name='sergeant')
    return {
        'detective': detective_role,
        'sergeant': sergeant_role,
    }


@pytest.fixture
def setup_users(db, setup_roles):
    """Create users with roles."""
    detective = User.objects.create_user(
        username='detective1',
        password='pass123',
        email='detective@test.com',
        phone_number='09121234567',
        national_id='1234567890',
        first_name='رضا',
        last_name='کارآگاه'
    )
    detective.role = 'detective'
    detective.save()
    detective.roles.add(setup_roles['detective'])
    
    sergeant = User.objects.create_user(
        username='sergeant1',
        password='pass123',
        email='sergeant@test.com',
        phone_number='09121234568',
        national_id='1234567891',
        first_name='حسین',
        last_name='گروهبان'
    )
    sergeant.role = 'sergeant'
    sergeant.save()
    sergeant.roles.add(setup_roles['sergeant'])
    
    # Create suspect persons
    suspect1 = User.objects.create_user(
        username='suspect1',
        password='pass123',
        email='suspect1@test.com',
        phone_number='09121234569',
        national_id='1234567892',
        first_name='علی',
        last_name='مظنون'
    )
    
    suspect2 = User.objects.create_user(
        username='suspect2',
        password='pass123',
        email='suspect2@test.com',
        phone_number='09121234570',
        national_id='1234567893',
        first_name='محمد',
        last_name='متهم'
    )
    
    suspect3 = User.objects.create_user(
        username='suspect3',
        password='pass123',
        email='suspect3@test.com',
        phone_number='09121234571',
        national_id='1234567894',
        first_name='حسن',
        last_name='فراری'
    )
    
    return {
        'detective': detective,
        'sergeant': sergeant,
        'suspect1': suspect1,
        'suspect2': suspect2,
        'suspect3': suspect3,
    }


@pytest.fixture
def setup_crime_levels(db):
    """Create crime levels."""
    critical, _ = CrimeLevel.objects.get_or_create(
        level=0,
        defaults={'name': 'بحرانی', 'description': 'جنایات شدید'}
    )
    major, _ = CrimeLevel.objects.get_or_create(
        level=1,
        defaults={'name': 'عمده', 'description': 'جنایات عمده'}
    )
    medium, _ = CrimeLevel.objects.get_or_create(
        level=2,
        defaults={'name': 'متوسط', 'description': 'جرائم متوسط'}
    )
    minor, _ = CrimeLevel.objects.get_or_create(
        level=3,
        defaults={'name': 'جزئی', 'description': 'جرائم جزئی'}
    )
    return {
        'critical': critical,  # level 0
        'major': major,        # level 1
        'medium': medium,      # level 2
        'minor': minor,        # level 3
    }


@pytest.mark.django_db
class TestSuspectStatusTransitions:
    """Test automatic suspect status transitions based on time."""
    
    def test_new_suspect_starts_as_under_pursuit(self, setup_users, setup_crime_levels):
        """Test that new suspects start in under_pursuit status."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='SUS-001',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Test reason',
            identified_by_detective=detective
        )
        
        assert suspect.status == Suspect.STATUS_UNDER_PURSUIT
    
    def test_suspect_under_30_days_not_intensive(self, setup_users, setup_crime_levels):
        """Test suspect under 30 days is not intensive pursuit."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='SUS-002',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['major'],
            created_by=detective
        )
        
        # Created 20 days ago
        twenty_days_ago = timezone.now() - timedelta(days=20)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Test reason',
            identified_by_detective=detective
        )
        suspect.identified_at = twenty_days_ago
        suspect.save()
        
        assert not suspect.is_intensive_pursuit()
    
    def test_suspect_over_30_days_is_intensive(self, setup_users, setup_crime_levels):
        """Test suspect over 30 days qualifies for intensive pursuit."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='SUS-003',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        # Created 45 days ago
        forty_five_days_ago = timezone.now() - timedelta(days=45)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Test reason',
            identified_by_detective=detective
        )
        suspect.identified_at = forty_five_days_ago
        suspect.save()
        
        assert suspect.is_intensive_pursuit()
    
    def test_arrested_suspect_not_intensive_pursuit(self, setup_users, setup_crime_levels):
        """Test arrested suspects are not in intensive pursuit regardless of time."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='SUS-004',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['major'],
            created_by=detective
        )
        
        # Created 50 days ago but arrested
        fifty_days_ago = timezone.now() - timedelta(days=50)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Test reason',
            identified_by_detective=detective,
            status=Suspect.STATUS_ARRESTED
        )
        suspect.identified_at = fifty_days_ago
        suspect.save()
        
        assert not suspect.is_intensive_pursuit()


@pytest.mark.django_db
class TestDangerScoreCalculation:
    """Test danger score calculation: days_at_large × crime_level_score."""
    
    def test_danger_score_critical_crime(self, setup_users, setup_crime_levels):
        """Test danger score for critical crime (level 0 = score 4)."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='DANGER-001',
            title='Murder Case',
            description='Critical crime',
            crime_level=setup_crime_levels['critical'],  # level 0
            created_by=detective
        )
        
        # 45 days at large
        forty_five_days_ago = timezone.now() - timedelta(days=45)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Dangerous suspect',
            identified_by_detective=detective
        )
        suspect.identified_at = forty_five_days_ago
        suspect.save()
        
        # Score = 45 days × (4 - 0) = 45 × 4 = 180
        expected_score = 45 * 4
        assert suspect.get_danger_score() == expected_score
    
    def test_danger_score_major_crime(self, setup_users, setup_crime_levels):
        """Test danger score for major crime (level 1 = score 3)."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='DANGER-002',
            title='Major Crime',
            description='Major crime',
            crime_level=setup_crime_levels['major'],  # level 1
            created_by=detective
        )
        
        # 40 days at large
        forty_days_ago = timezone.now() - timedelta(days=40)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Major crime suspect',
            identified_by_detective=detective
        )
        suspect.identified_at = forty_days_ago
        suspect.save()
        
        # Score = 40 days × (4 - 1) = 40 × 3 = 120
        expected_score = 40 * 3
        assert suspect.get_danger_score() == expected_score
    
    def test_danger_score_medium_crime(self, setup_users, setup_crime_levels):
        """Test danger score for medium crime (level 2 = score 2)."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='DANGER-003',
            title='Medium Crime',
            description='Medium crime',
            crime_level=setup_crime_levels['medium'],  # level 2
            created_by=detective
        )
        
        # 30 days at large
        thirty_days_ago = timezone.now() - timedelta(days=30)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Medium crime suspect',
            identified_by_detective=detective
        )
        suspect.identified_at = thirty_days_ago
        suspect.save()
        
        # Score = 30 days × (4 - 2) = 30 × 2 = 60
        expected_score = 30 * 2
        assert suspect.get_danger_score() == expected_score
    
    def test_danger_score_minor_crime(self, setup_users, setup_crime_levels):
        """Test danger score for minor crime (level 3 = score 1)."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='DANGER-004',
            title='Minor Crime',
            description='Minor crime',
            crime_level=setup_crime_levels['minor'],  # level 3
            created_by=detective
        )
        
        # 50 days at large
        fifty_days_ago = timezone.now() - timedelta(days=50)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Minor crime suspect',
            identified_by_detective=detective
        )
        suspect.identified_at = fifty_days_ago
        suspect.save()
        
        # Score = 50 days × (4 - 3) = 50 × 1 = 50
        expected_score = 50 * 1
        assert suspect.get_danger_score() == expected_score


@pytest.mark.django_db
class TestRewardCalculation:
    """Test reward calculation: danger_score × 20,000,000 Rials."""
    
    def test_reward_calculation(self, setup_users, setup_crime_levels):
        """Test reward amount calculation."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='REWARD-001',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        # 45 days at large with critical crime
        forty_five_days_ago = timezone.now() - timedelta(days=45)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Test',
            identified_by_detective=detective
        )
        suspect.identified_at = forty_five_days_ago
        suspect.save()
        
        # Danger score = 45 × 4 = 180
        # Reward = 180 × 20,000,000 = 3,600,000,000 Rials
        expected_reward = 180 * 20_000_000
        assert suspect.get_reward_amount() == expected_reward
    
    def test_reward_increases_with_time(self, setup_users, setup_crime_levels):
        """Test that reward increases as days at large increase."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        case = Case.objects.create(
            case_number='REWARD-002',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['major'],
            created_by=detective
        )
        
        # 30 days at large
        thirty_days_ago = timezone.now() - timedelta(days=30)
        suspect = Suspect.objects.create(
            case=case,
            person=suspect_person,
            reason='Test',
            identified_by_detective=detective
        )
        suspect.identified_at = thirty_days_ago
        suspect.save()
        
        reward_30_days = suspect.get_reward_amount()
        
        # Now 60 days at large
        suspect.identified_at = timezone.now() - timedelta(days=60)
        suspect.save()
        
        reward_60_days = suspect.get_reward_amount()
        
        # Reward should double when days double
        assert reward_60_days > reward_30_days
        assert reward_60_days == reward_30_days * 2


@pytest.mark.django_db
class TestIntensivePursuitAPI:
    """Test intensive pursuit public API endpoint."""
    
    def test_public_access_no_authentication_required(self, client, setup_users, setup_crime_levels):
        """Test that intensive pursuit list is publicly accessible."""
        # No authentication - public access
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
    
    def test_only_shows_suspects_over_30_days(self, client, setup_users, setup_crime_levels):
        """Test that only suspects over 30 days appear in list."""
        detective = setup_users['detective']
        
        case1 = Case.objects.create(
            case_number='IP-001',
            title='Case 1',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        case2 = Case.objects.create(
            case_number='IP-002',
            title='Case 2',
            description='Test',
            crime_level=setup_crime_levels['major'],
            created_by=detective
        )
        
        # Suspect 1: 45 days (should appear)
        forty_five_days_ago = timezone.now() - timedelta(days=45)
        suspect1 = Suspect.objects.create(
            case=case1,
            person=setup_users['suspect1'],
            reason='Test',
            identified_by_detective=detective
        )
        suspect1.identified_at = forty_five_days_ago
        suspect1.save()
        
        # Suspect 2: 20 days (should NOT appear)
        twenty_days_ago = timezone.now() - timedelta(days=20)
        suspect2 = Suspect.objects.create(
            case=case2,
            person=setup_users['suspect2'],
            reason='Test',
            identified_by_detective=detective
        )
        suspect2.identified_at = twenty_days_ago
        suspect2.save()
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['days_at_large'] >= 30
    
    def test_ordered_by_danger_score_descending(self, client, setup_users, setup_crime_levels):
        """Test suspects are ordered by danger score (highest first)."""
        detective = setup_users['detective']
        
        # Case 1: Critical crime, 40 days = 160 score
        case1 = Case.objects.create(
            case_number='ORDER-001',
            title='Case 1',
            description='Test',
            crime_level=setup_crime_levels['critical'],  # level 0, score 4
            created_by=detective
        )
        
        # Case 2: Major crime, 50 days = 150 score
        case2 = Case.objects.create(
            case_number='ORDER-002',
            title='Case 2',
            description='Test',
            crime_level=setup_crime_levels['major'],  # level 1, score 3
            created_by=detective
        )
        
        # Case 3: Medium crime, 100 days = 200 score (highest)
        case3 = Case.objects.create(
            case_number='ORDER-003',
            title='Case 3',
            description='Test',
            crime_level=setup_crime_levels['medium'],  # level 2, score 2
            created_by=detective
        )
        
        # Suspect 1: 40 days, critical = 160
        suspect1 = Suspect.objects.create(
            case=case1,
            person=setup_users['suspect1'],
            reason='Test',
            identified_by_detective=detective
        )
        suspect1.identified_at = timezone.now() - timedelta(days=40)
        suspect1.save()
        
        # Suspect 2: 50 days, major = 150
        suspect2 = Suspect.objects.create(
            case=case2,
            person=setup_users['suspect2'],
            reason='Test',
            identified_by_detective=detective
        )
        suspect2.identified_at = timezone.now() - timedelta(days=50)
        suspect2.save()
        
        # Suspect 3: 100 days, medium = 200 (should be first)
        suspect3 = Suspect.objects.create(
            case=case3,
            person=setup_users['suspect3'],
            reason='Test',
            identified_by_detective=detective
        )
        suspect3.identified_at = timezone.now() - timedelta(days=100)
        suspect3.save()
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) == 3
        
        # Check ordering by danger score
        assert response.data[0]['danger_score'] >= response.data[1]['danger_score']
        assert response.data[1]['danger_score'] >= response.data[2]['danger_score']
        
        # Suspect 3 should be first (highest danger score)
        assert response.data[0]['danger_score'] == 200
    
    def test_includes_all_required_fields(self, client, setup_users, setup_crime_levels):
        """Test response includes all required fields."""
        detective = setup_users['detective']
        
        case = Case.objects.create(
            case_number='FIELDS-001',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        forty_days_ago = timezone.now() - timedelta(days=40)
        suspect = Suspect.objects.create(
            case=case,
            person=setup_users['suspect1'],
            reason='Test reason',
            identified_by_detective=detective
        )
        suspect.identified_at = forty_days_ago
        suspect.save()
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) == 1
        
        suspect_data = response.data[0]
        required_fields = [
            'id', 'person_full_name', 'person_username', 'photo',
            'case_number', 'case_title', 'crime_level', 'crime_level_name',
            'reason', 'days_at_large', 'danger_score', 'reward_amount',
            'identified_at', 'status'
        ]
        
        for field in required_fields:
            assert field in suspect_data
    
    def test_excludes_arrested_suspects(self, client, setup_users, setup_crime_levels):
        """Test arrested suspects don't appear in intensive pursuit list."""
        detective = setup_users['detective']
        
        case = Case.objects.create(
            case_number='ARREST-001',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        # Create suspect 50 days ago
        fifty_days_ago = timezone.now() - timedelta(days=50)
        suspect = Suspect.objects.create(
            case=case,
            person=setup_users['suspect1'],
            reason='Test',
            identified_by_detective=detective,
            status=Suspect.STATUS_ARRESTED
        )
        suspect.identified_at = fifty_days_ago
        suspect.save()
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) == 0
    
    def test_excludes_cleared_suspects(self, client, setup_users, setup_crime_levels):
        """Test cleared suspects don't appear in intensive pursuit list."""
        detective = setup_users['detective']
        
        case = Case.objects.create(
            case_number='CLEAR-001',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['major'],
            created_by=detective
        )
        
        # Create suspect 50 days ago
        fifty_days_ago = timezone.now() - timedelta(days=50)
        suspect = Suspect.objects.create(
            case=case,
            person=setup_users['suspect1'],
            reason='Test',
            identified_by_detective=detective,
            status=Suspect.STATUS_CLEARED
        )
        suspect.identified_at = fifty_days_ago
        suspect.save()
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) == 0
    
    def test_auto_updates_status_to_intensive_pursuit(self, client, setup_users, setup_crime_levels):
        """Test endpoint automatically updates status to intensive_pursuit."""
        detective = setup_users['detective']
        
        case = Case.objects.create(
            case_number='UPDATE-001',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        # Create suspect 40 days ago with under_pursuit status
        forty_days_ago = timezone.now() - timedelta(days=40)
        suspect = Suspect.objects.create(
            case=case,
            person=setup_users['suspect1'],
            reason='Test',
            identified_by_detective=detective,
            status=Suspect.STATUS_UNDER_PURSUIT
        )
        suspect.identified_at = forty_days_ago
        suspect.save()
        
        # Verify initial status
        assert suspect.status == Suspect.STATUS_UNDER_PURSUIT
        
        # Call endpoint
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        
        # Check status was updated
        suspect.refresh_from_db()
        assert suspect.status == Suspect.STATUS_INTENSIVE_PURSUIT
    
    def test_reward_displayed_correctly(self, client, setup_users, setup_crime_levels):
        """Test reward amount is calculated and displayed correctly."""
        detective = setup_users['detective']
        
        case = Case.objects.create(
            case_number='REWARD-TEST-001',
            title='Test Case',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        # 45 days at large with critical crime (level 0)
        # Score = 45 × 4 = 180
        # Reward = 180 × 20,000,000 = 3,600,000,000
        forty_five_days_ago = timezone.now() - timedelta(days=45)
        suspect = Suspect.objects.create(
            case=case,
            person=setup_users['suspect1'],
            reason='Test',
            identified_by_detective=detective
        )
        suspect.identified_at = forty_five_days_ago
        suspect.save()
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) == 1
        
        assert response.data[0]['danger_score'] == 180
        assert response.data[0]['reward_amount'] == 3_600_000_000


@pytest.mark.django_db
class TestComplexScenarios:
    """Test complex real-world scenarios."""
    
    def test_multiple_suspects_different_criteria(self, client, setup_users, setup_crime_levels):
        """Test multiple suspects with varying days and crime levels."""
        detective = setup_users['detective']
        
        # Create 3 cases with different crime levels
        cases = []
        for i, (level_key, level) in enumerate(setup_crime_levels.items()):
            case = Case.objects.create(
                case_number=f'MULTI-00{i+1}',
                title=f'Case {i+1}',
                description='Test',
                crime_level=level,
                created_by=detective
            )
            cases.append(case)
        
        # Create suspects with varying days at large
        days_list = [35, 45, 60, 90]
        suspects = []
        
        for i, (case, days) in enumerate(zip(cases, days_list)):
            person_key = f'suspect{(i % 3) + 1}'
            suspect = Suspect.objects.create(
                case=case,
                person=setup_users[person_key],
                reason=f'Suspect {i+1}',
                identified_by_detective=detective
            )
            suspect.identified_at = timezone.now() - timedelta(days=days)
            suspect.save()
            suspects.append(suspect)
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        assert len(response.data) == 4  # All over 30 days
        
        # Verify danger scores are calculated correctly
        for suspect_data in response.data:
            assert suspect_data['danger_score'] > 0
            assert suspect_data['reward_amount'] > 0
            assert suspect_data['days_at_large'] >= 30
    
    def test_same_person_multiple_cases(self, client, setup_users, setup_crime_levels):
        """Test same person suspected in multiple cases."""
        detective = setup_users['detective']
        suspect_person = setup_users['suspect1']
        
        # Create 2 cases
        case1 = Case.objects.create(
            case_number='SAME-001',
            title='Case 1',
            description='Test',
            crime_level=setup_crime_levels['critical'],
            created_by=detective
        )
        
        case2 = Case.objects.create(
            case_number='SAME-002',
            title='Case 2',
            description='Test',
            crime_level=setup_crime_levels['major'],
            created_by=detective
        )
        
        # Same person in both cases, both over 30 days
        forty_days_ago = timezone.now() - timedelta(days=40)
        
        suspect1 = Suspect.objects.create(
            case=case1,
            person=suspect_person,
            reason='Crime 1',
            identified_by_detective=detective
        )
        suspect1.identified_at = forty_days_ago
        suspect1.save()
        
        suspect2 = Suspect.objects.create(
            case=case2,
            person=suspect_person,
            reason='Crime 2',
            identified_by_detective=detective
        )
        suspect2.identified_at = forty_days_ago
        suspect2.save()
        
        response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
        
        assert response.status_code == http_status.HTTP_200_OK
        # Both entries should appear (different cases)
        assert len(response.data) == 2
