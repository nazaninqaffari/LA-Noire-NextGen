"""
Comprehensive test suite for Case Formation workflows.
Tests both complaint-based and crime scene-based case creation.
"""
import pytest
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import Case, CrimeLevel, Complainant, Witness, CaseReview

User = get_user_model()


@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()


@pytest.fixture
def crime_levels(db):
    """Create all crime levels."""
    levels = [
        CrimeLevel.objects.create(name='Level 3 - Minor', level=3, description='Minor crimes'),
        CrimeLevel.objects.create(name='Level 2 - Medium', level=2, description='Medium crimes'),
        CrimeLevel.objects.create(name='Level 1 - Major', level=1, description='Major crimes'),
        CrimeLevel.objects.create(name='Critical', level=0, description='Critical crimes'),
    ]
    return levels


@pytest.fixture
def base_role(db):
    """Create base user role."""
    return Role.objects.create(
        name='Base User',
        description='Default role',
        is_police_rank=False,
        hierarchy_level=0
    )


@pytest.fixture
def cadet_role(db):
    """Create cadet role."""
    return Role.objects.create(
        name='Cadet',
        description='Entry level officer',
        is_police_rank=True,
        hierarchy_level=1
    )


@pytest.fixture
def officer_role(db):
    """Create police officer role."""
    return Role.objects.create(
        name='Police Officer',
        description='Regular officer',
        is_police_rank=True,
        hierarchy_level=3
    )


@pytest.fixture
def detective_role(db):
    """Create detective role."""
    return Role.objects.create(
        name='Detective',
        description='Investigates cases',
        is_police_rank=True,
        hierarchy_level=4
    )


@pytest.fixture
def captain_role(db):
    """Create captain role."""
    return Role.objects.create(
        name='Captain',
        description='Approves for trial',
        is_police_rank=True,
        hierarchy_level=6
    )


@pytest.fixture
def chief_role(db):
    """Create police chief role."""
    return Role.objects.create(
        name='Police Chief',
        description='Chief of police',
        is_police_rank=True,
        hierarchy_level=7
    )


@pytest.fixture
def civilian_user(db, base_role):
    """Create civilian user."""
    user = User.objects.create_user(
        username='civilian1',
        email='civilian1@example.com',
        phone_number='+11234567890',
        national_id='1234567890',
        first_name='John',
        last_name='Doe',
        password='password123'
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def cadet_user(db, cadet_role):
    """Create cadet user."""
    user = User.objects.create_user(
        username='cadet1',
        email='cadet1@lanoire.gov',
        phone_number='+11234567891',
        national_id='1234567891',
        first_name='Jane',
        last_name='Smith',
        password='password123'
    )
    user.roles.add(cadet_role)
    return user


@pytest.fixture
def officer_user(db, officer_role):
    """Create police officer user."""
    user = User.objects.create_user(
        username='officer1',
        email='officer1@lanoire.gov',
        phone_number='+11234567892',
        national_id='1234567892',
        first_name='Mike',
        last_name='Johnson',
        password='password123'
    )
    user.roles.add(officer_role)
    return user


@pytest.fixture
def chief_user(db, chief_role):
    """Create police chief user."""
    user = User.objects.create_user(
        username='chief1',
        email='chief1@lanoire.gov',
        phone_number='+11234567893',
        national_id='1234567893',
        first_name='William',
        last_name='Worrell',
        password='password123'
    )
    user.roles.add(chief_role)
    return user


@pytest.fixture
def authenticated_client_civilian(civilian_user):
    """API client authenticated as civilian."""
    client = APIClient()
    client.force_authenticate(user=civilian_user)
    return client


@pytest.fixture
def authenticated_client_cadet(cadet_user):
    """API client authenticated as cadet."""
    client = APIClient()
    client.force_authenticate(user=cadet_user)
    return client


@pytest.fixture
def authenticated_client_officer(officer_user):
    """API client authenticated as officer."""
    client = APIClient()
    client.force_authenticate(user=officer_user)
    return client


@pytest.fixture
def authenticated_client_chief(chief_user):
    """API client authenticated as chief."""
    client = APIClient()
    client.force_authenticate(user=chief_user)
    return client


@pytest.mark.django_db
class TestComplaintCaseFormation:
    """Test complaint-based case formation workflow."""
    
    def test_civilian_creates_complaint_case(self, authenticated_client_civilian, crime_levels):
        """Test civilian can create a case via complaint."""
        data = {
            'title': 'Stolen Vehicle',
            'description': 'My car was stolen from parking lot',
            'crime_level': crime_levels[1].id,  # Level 2
            'complainant_statement': 'I parked my car at 2 PM and it was gone at 4 PM'
        }
        
        response = authenticated_client_civilian.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'case_number' in response.data
        assert response.data['status'] == Case.STATUS_CADET_REVIEW
        assert response.data['formation_type'] == Case.FORMATION_COMPLAINT
        assert response.data['rejection_count'] == 0
        
        # Check complainant was created
        case = Case.objects.get(id=response.data['id'])
        assert case.complainants.count() == 1
        complainant = case.complainants.first()
        assert complainant.is_primary is True
        assert complainant.verified_by_cadet is False
    
    def test_complaint_case_number_format(self, authenticated_client_civilian, crime_levels):
        """Test complaint case numbers follow correct format."""
        data = {
            'title': 'Test Case',
            'description': 'Test description',
            'crime_level': crime_levels[2].id,
            'complainant_statement': 'Test statement for complaint case'
        }
        
        response = authenticated_client_civilian.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        case_number = response.data['case_number']
        year = datetime.now().year
        assert case_number.startswith(f'{year}-CMPL-')
    
    def test_civilian_cannot_create_without_statement(self, authenticated_client_civilian, crime_levels):
        """Test complaint requires complainant statement."""
        data = {
            'title': 'Test Case',
            'description': 'Test description',
            'crime_level': crime_levels[1].id
        }
        
        response = authenticated_client_civilian.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'complainant_statement' in str(response.data)
    
    def test_officer_cannot_file_complaint(self, authenticated_client_officer, crime_levels):
        """Test police officers cannot file complaints."""
        data = {
            'title': 'Test Case',
            'description': 'Test description',
            'crime_level': crime_levels[1].id,
            'complainant_statement': 'This should fail'
        }
        
        response = authenticated_client_officer.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Police personnel' in str(response.data)


@pytest.mark.django_db
class TestCadetReview:
    """Test cadet review workflow."""
    
    @pytest.fixture
    def complaint_case(self, civilian_user, cadet_user, crime_levels):
        """Create a complaint case in cadet review."""
        case = Case.objects.create(
            case_number='2026-CMPL-TEST001',
            title='Test Complaint',
            description='Test description',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_CADET_REVIEW,
            created_by=civilian_user,
            assigned_cadet=cadet_user,
            rejection_count=0
        )
        Complainant.objects.create(
            case=case,
            user=civilian_user,
            statement='Initial complaint statement',
            is_primary=True,
            verified_by_cadet=False
        )
        return case
    
    def test_cadet_approves_case(self, authenticated_client_cadet, complaint_case):
        """Test cadet can approve a case."""
        data = {'decision': 'approved'}
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{complaint_case.id}/cadet_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Case.STATUS_OFFICER_REVIEW
        assert response.data['assigned_cadet'] is not None
        
        # Check review was created
        assert CaseReview.objects.filter(case=complaint_case).count() == 1
        review = CaseReview.objects.first()
        assert review.decision == 'approved'
    
    def test_cadet_rejects_case(self, authenticated_client_cadet, complaint_case):
        """Test cadet can reject a case."""
        data = {
            'decision': 'rejected',
            'rejection_reason': 'Insufficient information provided'
        }
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{complaint_case.id}/cadet_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Case.STATUS_DRAFT
        assert response.data['rejection_count'] == 1
        
        # Check review was created
        review = CaseReview.objects.first()
        assert review.decision == 'rejected'
        assert review.rejection_reason == 'Insufficient information provided'
    
    def test_cadet_reject_requires_reason(self, authenticated_client_cadet, complaint_case):
        """Test rejection requires a reason."""
        data = {'decision': 'rejected'}
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{complaint_case.id}/cadet_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'rejection_reason' in str(response.data)
    
    def test_case_rejected_after_3_attempts(self, authenticated_client_cadet, complaint_case):
        """Test case permanently rejected after 3 rejection attempts."""
        complaint_case.rejection_count = 2
        complaint_case.save()
        
        data = {
            'decision': 'rejected',
            'rejection_reason': 'Third rejection'
        }
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{complaint_case.id}/cadet_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Case.STATUS_REJECTED
        assert response.data['rejection_count'] == 3
    
    def test_non_cadet_cannot_review(self, authenticated_client_civilian, complaint_case):
        """Test non-cadets cannot perform cadet review."""
        data = {'decision': 'approved'}
        
        response = authenticated_client_civilian.post(
            f'/api/v1/cases/cases/{complaint_case.id}/cadet_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_cannot_review_wrong_status(self, authenticated_client_cadet, complaint_case):
        """Test cadet cannot review case not in cadet_review status."""
        complaint_case.status = Case.STATUS_OPEN
        complaint_case.save()
        
        data = {'decision': 'approved'}
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{complaint_case.id}/cadet_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestOfficerReview:
    """Test officer review workflow."""
    
    @pytest.fixture
    def officer_review_case(self, civilian_user, cadet_user, crime_levels):
        """Create a case in officer review."""
        case = Case.objects.create(
            case_number='2026-CMPL-TEST002',
            title='Test Officer Review',
            description='Test description',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_OFFICER_REVIEW,
            created_by=civilian_user,
            assigned_cadet=cadet_user,
            rejection_count=0
        )
        return case
    
    def test_officer_approves_case(self, authenticated_client_officer, officer_review_case):
        """Test officer can approve a case."""
        data = {'decision': 'approved'}
        
        response = authenticated_client_officer.post(
            f'/api/v1/cases/cases/{officer_review_case.id}/officer_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Case.STATUS_OPEN
        assert response.data['assigned_officer'] is not None
        assert response.data['opened_at'] is not None
    
    def test_officer_rejects_complaint_case(self, authenticated_client_officer, officer_review_case):
        """Test officer rejection returns complaint case to cadet."""
        data = {
            'decision': 'rejected',
            'rejection_reason': 'Need more evidence'
        }
        
        response = authenticated_client_officer.post(
            f'/api/v1/cases/cases/{officer_review_case.id}/officer_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        # Complaint cases go back to cadet, not complainant
        assert response.data['status'] == Case.STATUS_CADET_REVIEW
    
    def test_non_officer_cannot_review(self, authenticated_client_civilian, officer_review_case):
        """Test non-officers cannot perform officer review."""
        data = {'decision': 'approved'}
        
        response = authenticated_client_civilian.post(
            f'/api/v1/cases/cases/{officer_review_case.id}/officer_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_cadet_cannot_perform_officer_review(self, authenticated_client_cadet, officer_review_case):
        """Test cadets cannot perform officer review."""
        data = {'decision': 'approved'}
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{officer_review_case.id}/officer_review/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCrimeSceneCaseFormation:
    """Test crime scene-based case formation."""
    
    def test_officer_creates_crime_scene_case(self, authenticated_client_officer, crime_levels):
        """Test officer can create crime scene case."""
        data = {
            'title': 'Homicide at 5th Street',
            'description': 'Body found at crime scene',
            'crime_level': crime_levels[2].id,  # Level 1 - Major
            'crime_scene_location': '123 5th Street, Los Angeles',
            'crime_scene_datetime': timezone.now().isoformat(),
            'witness_data': [
                {
                    'full_name': 'John Witness',
                    'phone_number': '+11234560001',
                    'national_id': '9876543210'
                }
            ]
        }
        
        response = authenticated_client_officer.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['formation_type'] == Case.FORMATION_CRIME_SCENE
        assert response.data['status'] == Case.STATUS_OFFICER_REVIEW
        assert response.data['crime_scene_location'] == data['crime_scene_location']
        
        # Check witness was created
        case = Case.objects.get(id=response.data['id'])
        assert case.witnesses.count() == 1
        witness = case.witnesses.first()
        assert witness.full_name == 'John Witness'
    
    def test_crime_scene_case_number_format(self, authenticated_client_officer, crime_levels):
        """Test crime scene case numbers follow correct format."""
        data = {
            'title': 'Test Crime Scene',
            'description': 'Test description',
            'crime_level': crime_levels[1].id,
            'crime_scene_location': 'Test Location',
            'crime_scene_datetime': timezone.now().isoformat()
        }
        
        response = authenticated_client_officer.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        case_number = response.data['case_number']
        year = datetime.now().year
        assert case_number.startswith(f'{year}-SCEN-')
    
    def test_civilian_cannot_create_crime_scene_case(self, authenticated_client_civilian, crime_levels):
        """Test civilians cannot create crime scene cases."""
        data = {
            'title': 'Test Crime Scene',
            'description': 'Test description',
            'crime_level': crime_levels[1].id,
            'crime_scene_location': 'Test Location',
            'crime_scene_datetime': timezone.now().isoformat()
        }
        
        response = authenticated_client_civilian.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Only police personnel' in str(response.data)
    
    def test_crime_scene_requires_location(self, authenticated_client_officer, crime_levels):
        """Test crime scene case requires location."""
        data = {
            'title': 'Test Crime Scene',
            'description': 'Test description',
            'crime_level': crime_levels[1].id,
            'crime_scene_datetime': timezone.now().isoformat()
        }
        
        response = authenticated_client_officer.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'crime_scene_location' in str(response.data)
    
    def test_crime_scene_requires_datetime(self, authenticated_client_officer, crime_levels):
        """Test crime scene case requires datetime."""
        data = {
            'title': 'Test Crime Scene',
            'description': 'Test description',
            'crime_level': crime_levels[1].id,
            'crime_scene_location': 'Test Location'
        }
        
        response = authenticated_client_officer.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'crime_scene_datetime' in str(response.data)
    
    def test_chief_crime_scene_auto_approved(self, authenticated_client_chief, crime_levels):
        """Test Police Chief's crime scene reports are auto-approved."""
        data = {
            'title': 'Critical Crime Scene',
            'description': 'Serial killer case',
            'crime_level': crime_levels[3].id,  # Critical
            'crime_scene_location': '789 Main Street',
            'crime_scene_datetime': timezone.now().isoformat()
        }
        
        response = authenticated_client_chief.post('/api/v1/cases/cases/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == Case.STATUS_OPEN
        assert response.data['opened_at'] is not None
        # Chief assigned as officer
        assert response.data['assigned_officer'] is not None


@pytest.mark.django_db
class TestAdditionalComplainants:
    """Test adding additional complainants to cases."""
    
    @pytest.fixture
    def case_with_complainant(self, civilian_user, crime_levels):
        """Create case with primary complainant."""
        case = Case.objects.create(
            case_number='2026-CMPL-TEST003',
            title='Test Case',
            description='Test description',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_CADET_REVIEW,
            created_by=civilian_user
        )
        Complainant.objects.create(
            case=case,
            user=civilian_user,
            statement='Primary statement',
            is_primary=True
        )
        return case
    
    @pytest.fixture
    def second_civilian(self, db, base_role):
        """Create second civilian user."""
        user = User.objects.create_user(
            username='civilian2',
            email='civilian2@example.com',
            phone_number='+11234567894',
            national_id='1234567894',
            first_name='Alice',
            last_name='Williams',
            password='password123'
        )
        user.roles.add(base_role)
        return user
    
    def test_cadet_adds_additional_complainant(self, authenticated_client_cadet, 
                                                case_with_complainant, second_civilian):
        """Test cadet can add additional complainant."""
        data = {
            'user_id': second_civilian.id,
            'statement': 'I also witnessed the incident and can corroborate the primary complainant'
        }
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{case_with_complainant.id}/add_complainant/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['is_primary'] is False
        assert response.data['verified_by_cadet'] is False
        
        # Check complainant was added
        assert case_with_complainant.complainants.count() == 2
    
    def test_cannot_add_duplicate_complainant(self, authenticated_client_cadet, 
                                               case_with_complainant, civilian_user):
        """Test cannot add same user as complainant twice."""
        data = {
            'user_id': civilian_user.id,
            'statement': 'Duplicate statement'
        }
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{case_with_complainant.id}/add_complainant/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already a complainant' in str(response.data)
    
    def test_non_cadet_cannot_add_complainant(self, authenticated_client_civilian, 
                                               case_with_complainant, second_civilian):
        """Test non-cadets cannot add complainants."""
        data = {
            'user_id': second_civilian.id,
            'statement': 'Test statement'
        }
        
        response = authenticated_client_civilian.post(
            f'/api/v1/cases/cases/{case_with_complainant.id}/add_complainant/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestComplainantVerification:
    """Test complainant verification by cadet."""
    
    @pytest.fixture
    def unverified_complainant(self, civilian_user, crime_levels):
        """Create case with unverified complainant."""
        case = Case.objects.create(
            case_number='2026-CMPL-TEST004',
            title='Test Case',
            description='Test description',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_CADET_REVIEW,
            created_by=civilian_user
        )
        complainant = Complainant.objects.create(
            case=case,
            user=civilian_user,
            statement='Test statement',
            is_primary=False,
            verified_by_cadet=False
        )
        return case, complainant
    
    def test_cadet_verifies_complainant(self, authenticated_client_cadet, unverified_complainant):
        """Test cadet can verify complainant."""
        case, complainant = unverified_complainant
        data = {
            'verified': True,
            'notes': 'Verified national ID and contact information'
        }
        
        response = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{case.id}/complainants/{complainant.id}/verify/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['verified_by_cadet'] is True
        
        # Check database
        complainant.refresh_from_db()
        assert complainant.verified_by_cadet is True
    
    def test_non_cadet_cannot_verify(self, authenticated_client_civilian, unverified_complainant):
        """Test non-cadets cannot verify complainants."""
        case, complainant = unverified_complainant
        data = {'verified': True}
        
        response = authenticated_client_civilian.post(
            f'/api/v1/cases/cases/{case.id}/complainants/{complainant.id}/verify/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCaseQueryFiltering:
    """Test case querying and filtering."""
    
    def test_civilian_sees_only_own_cases(self, authenticated_client_civilian, 
                                          civilian_user, crime_levels, officer_user):
        """Test civilians only see their own cases."""
        # Create case by civilian
        Case.objects.create(
            case_number='2026-CMPL-TEST005',
            title='Civilian Case',
            description='Test',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_DRAFT,
            created_by=civilian_user
        )
        
        # Create case by officer
        Case.objects.create(
            case_number='2026-SCEN-TEST001',
            title='Officer Case',
            description='Test',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_CRIME_SCENE,
            status=Case.STATUS_OPEN,
            created_by=officer_user
        )
        
        response = authenticated_client_civilian.get('/api/v1/cases/cases/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['created_by'] == civilian_user.id
    
    def test_filter_by_status(self, authenticated_client_officer, crime_levels, officer_user):
        """Test filtering cases by status."""
        Case.objects.create(
            case_number='2026-SCEN-TEST002',
            title='Open Case',
            description='Test',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_CRIME_SCENE,
            status=Case.STATUS_OPEN,
            created_by=officer_user,
            assigned_officer=officer_user
        )
        
        Case.objects.create(
            case_number='2026-SCEN-TEST003',
            title='Closed Case',
            description='Test',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_CRIME_SCENE,
            status=Case.STATUS_CLOSED,
            created_by=officer_user
        )
        
        response = authenticated_client_officer.get(
            f'/api/v1/cases/cases/?status={Case.STATUS_OPEN}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == Case.STATUS_OPEN
    
    def test_search_by_case_number(self, authenticated_client_officer, crime_levels, officer_user):
        """Test searching cases by case number."""
        Case.objects.create(
            case_number='2026-SCEN-SEARCH1',
            title='Searchable Case',
            description='Test',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_CRIME_SCENE,
            status=Case.STATUS_OPEN,
            created_by=officer_user,
            assigned_officer=officer_user
        )
        
        response = authenticated_client_officer.get(
            '/api/v1/cases/cases/?search=SEARCH1'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'SEARCH1' in response.data['results'][0]['case_number']


@pytest.mark.django_db
class TestCaseReviewHistory:
    """Test case review history tracking."""
    
    def test_review_history_recorded(self, authenticated_client_cadet, 
                                     authenticated_client_officer, 
                                     civilian_user, cadet_user, crime_levels):
        """Test full workflow review history is recorded."""
        # Create case
        case = Case.objects.create(
            case_number='2026-CMPL-TEST006',
            title='Full Workflow Case',
            description='Test',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_COMPLAINT,
            status=Case.STATUS_CADET_REVIEW,
            created_by=civilian_user,
            assigned_cadet=cadet_user
        )
        
        # Cadet approves
        data = {'decision': 'approved'}
        response1 = authenticated_client_cadet.post(
            f'/api/v1/cases/cases/{case.id}/cadet_review/',
            data,
            format='json'
        )
        assert response1.status_code == status.HTTP_200_OK
        
        # Officer approves
        response2 = authenticated_client_officer.post(
            f'/api/v1/cases/cases/{case.id}/officer_review/',
            data,
            format='json'
        )
        assert response2.status_code == status.HTTP_200_OK
        
        # Check review history
        reviews = CaseReview.objects.filter(case=case).order_by('reviewed_at')
        assert reviews.count() == 2
        assert reviews[0].reviewer == cadet_user
        assert reviews[1].decision == 'approved'
