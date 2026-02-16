"""
Comprehensive test suite for Evidence Registration.
Tests all evidence types: testimony, biological, vehicle, ID documents, and generic.
"""
import pytest
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import Case, CrimeLevel
from apps.evidence.models import (
    Testimony, BiologicalEvidence, VehicleEvidence,
    IDDocument, GenericEvidence, EvidenceImage
)

User = get_user_model()


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()


@pytest.fixture
def crime_levels(db):
    """Create crime levels."""
    return [
        CrimeLevel.objects.create(name='Level 3 - Minor', level=3, description='Minor crimes'),
        CrimeLevel.objects.create(name='Level 2 - Medium', level=2, description='Medium crimes'),
        CrimeLevel.objects.create(name='Level 1 - Major', level=1, description='Major crimes'),
    ]


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
def police_role(db):
    """Create police officer role."""
    return Role.objects.create(
        name='Police Officer',
        description='Police officer',
        is_police_rank=True,
        hierarchy_level=3
    )


@pytest.fixture
def forensic_role(db):
    """Create forensic doctor role."""
    return Role.objects.create(
        name='Forensic Doctor',
        description='Forensic medical examiner',
        is_police_rank=False,
        hierarchy_level=0
    )


@pytest.fixture
def admin_role(db):
    """Create administrator role."""
    return Role.objects.create(
        name='Administrator',
        description='System administrator',
        is_police_rank=False,
        hierarchy_level=10
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
def officer_user(db, police_role):
    """Create police officer user."""
    user = User.objects.create_user(
        username='officer1',
        email='officer1@lanoire.gov',
        phone_number='+11234567891',
        national_id='1234567891',
        first_name='Mike',
        last_name='Johnson',
        password='password123'
    )
    user.roles.add(police_role)
    return user


@pytest.fixture
def forensic_user(db, forensic_role):
    """Create forensic doctor user."""
    user = User.objects.create_user(
        username='forensic1',
        email='forensic1@lanoire.gov',
        phone_number='+11234567892',
        national_id='1234567892',
        first_name='Sarah',
        last_name='Smith',
        password='password123'
    )
    user.roles.add(forensic_role)
    return user


@pytest.fixture
def admin_user(db, admin_role):
    """Create admin user."""
    user = User.objects.create_user(
        username='admin1',
        email='admin1@lanoire.gov',
        phone_number='+11234567893',
        national_id='1234567893',
        first_name='Admin',
        last_name='User',
        password='password123'
    )
    user.roles.add(admin_role)
    return user


@pytest.fixture
def authenticated_client_civilian(civilian_user):
    """API client authenticated as civilian."""
    client = APIClient()
    client.force_authenticate(user=civilian_user)
    return client


@pytest.fixture
def authenticated_client_officer(officer_user):
    """API client authenticated as officer."""
    client = APIClient()
    client.force_authenticate(user=officer_user)
    return client


@pytest.fixture
def authenticated_client_forensic(forensic_user):
    """API client authenticated as forensic doctor."""
    client = APIClient()
    client.force_authenticate(user=forensic_user)
    return client


@pytest.fixture
def authenticated_client_admin(admin_user):
    """API client authenticated as admin."""
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def open_case(db, officer_user, crime_levels):
    """Create an open case for evidence registration."""
    return Case.objects.create(
        case_number='2026-SCEN-TEST001',
        title='Test Crime Scene',
        description='Test case for evidence',
        crime_level=crime_levels[1],
        formation_type=Case.FORMATION_CRIME_SCENE,
        status=Case.STATUS_OPEN,
        created_by=officer_user
    )


@pytest.fixture
def witness_user(db, base_role):
    """Create witness user."""
    user = User.objects.create_user(
        username='witness1',
        email='witness1@example.com',
        phone_number='+11234567894',
        national_id='1234567894',
        first_name='Jane',
        last_name='Smith',
        password='password123'
    )
    user.roles.add(base_role)
    return user


# ============================================================================
# TESTIMONY TESTS
# ============================================================================

@pytest.mark.django_db
class TestTestimonyEvidence:
    """Test testimony evidence registration."""
    
    def test_officer_registers_testimony_with_registered_witness(
        self, authenticated_client_officer, open_case, witness_user
    ):
        """Officer registers testimony from registered witness."""
        data = {
            'case': open_case.id,
            'title': 'Eyewitness Account',
            'description': 'Witness saw suspect at scene',
            'witness': witness_user.id,
            'transcript': 'I saw a person in dark clothes near the building around midnight.'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/testimonies/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Eyewitness Account'
        assert response.data['witness'] == witness_user.id
        assert 'recorded_at' in response.data
        assert 'recorded_by' in response.data
    
    def test_officer_registers_testimony_with_unregistered_witness(
        self, authenticated_client_officer, open_case
    ):
        """Officer registers testimony from unregistered local person."""
        data = {
            'case': open_case.id,
            'title': 'Local Resident Statement',
            'description': 'Local person provided information',
            'witness_name': 'John Public',
            'transcript': 'I heard loud noises around 11 PM and saw a car speeding away.'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/testimonies/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['witness_name'] == 'John Public'
        assert response.data['witness'] is None
    
    def test_testimony_requires_either_witness_or_witness_name(
        self, authenticated_client_officer, open_case
    ):
        """Testimony must have either witness or witness_name."""
        data = {
            'case': open_case.id,
            'title': 'Test Testimony',
            'description': 'Test',
            'transcript': 'Test transcript'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/testimonies/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'witness' in str(response.data).lower()
    
    def test_cannot_add_testimony_to_closed_case(
        self, authenticated_client_officer, officer_user, crime_levels
    ):
        """Cannot add testimony to non-open case."""
        closed_case = Case.objects.create(
            case_number='2026-SCEN-CLOSED',
            title='Closed Case',
            description='Test',
            crime_level=crime_levels[1],
            formation_type=Case.FORMATION_CRIME_SCENE,
            status=Case.STATUS_REJECTED,
            created_by=officer_user
        )
        
        data = {
            'case': closed_case.id,
            'title': 'Testimony',
            'description': 'Test',
            'witness_name': 'John Doe',
            'transcript': 'Test'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/testimonies/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'status' in str(response.data).lower() or 'open' in str(response.data).lower()
    
    def test_civilian_cannot_see_other_case_testimonies(
        self, authenticated_client_civilian, open_case, officer_user
    ):
        """Civilian cannot see testimonies from cases they didn't create."""
        # Create testimony on officer's case
        Testimony.objects.create(
            case=open_case,
            title='Police Testimony',
            description='Test',
            witness_name='Test Witness',
            transcript='Test transcript',
            recorded_by=officer_user
        )
        
        response = authenticated_client_civilian.get('/api/v1/evidence/testimonies/')
        
        assert response.status_code == status.HTTP_200_OK
        # Civilian shouldn't see officer's case testimony
        assert len(response.data['results']) == 0
    
    def test_officer_can_see_all_testimonies(
        self, authenticated_client_officer, open_case, officer_user
    ):
        """Officer can see all testimonies."""
        Testimony.objects.create(
            case=open_case,
            title='Testimony 1',
            description='Test',
            witness_name='Witness 1',
            transcript='Test',
            recorded_by=officer_user
        )
        
        response = authenticated_client_officer.get('/api/v1/evidence/testimonies/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1


# ============================================================================
# BIOLOGICAL EVIDENCE TESTS
# ============================================================================

@pytest.mark.django_db
class TestBiologicalEvidence:
    """Test biological evidence registration and verification."""
    
    def test_officer_registers_biological_evidence(
        self, authenticated_client_officer, open_case
    ):
        """Officer registers biological evidence."""
        data = {
            'case': open_case.id,
            'title': 'Blood Sample',
            'description': 'Blood stain on wall',
            'evidence_type': 'blood'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/biological/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['evidence_type'] == 'blood'
        assert response.data['coroner_analysis'] == ''
        assert response.data['identity_match'] is None
        assert response.data['verified_by_coroner'] is None
    
    def test_forensic_doctor_verifies_biological_evidence(
        self, authenticated_client_officer, authenticated_client_forensic,
        open_case, witness_user
    ):
        """Forensic doctor adds analysis results."""
        # Create evidence
        evidence_data = {
            'case': open_case.id,
            'title': 'Fingerprint Evidence',
            'description': 'Fingerprint on window',
            'evidence_type': 'fingerprint'
        }
        
        response1 = authenticated_client_officer.post(
            '/api/v1/evidence/biological/',
            evidence_data,
            format='json'
        )
        evidence_id = response1.data['id']
        
        # Forensic doctor verifies
        verify_data = {
            'coroner_analysis': 'Fingerprint matches national database. 99.9% confidence.',
            'identity_match': witness_user.id
        }
        
        response2 = authenticated_client_forensic.post(
            f'/api/v1/evidence/biological/{evidence_id}/verify/',
            verify_data,
            format='json'
        )
        
        assert response2.status_code == status.HTTP_200_OK
        assert 'Fingerprint matches' in response2.data['coroner_analysis']
        assert response2.data['identity_match'] == witness_user.id
        assert response2.data['verified_by_coroner'] is not None
        assert response2.data['verified_at'] is not None
    
    def test_non_forensic_cannot_verify_evidence(
        self, authenticated_client_officer, open_case
    ):
        """Non-forensic doctor cannot verify biological evidence."""
        # Create evidence
        evidence = BiologicalEvidence.objects.create(
            case=open_case,
            title='Blood Sample',
            description='Test',
            evidence_type='blood',
            recorded_by=authenticated_client_officer.handler._force_user
        )
        
        verify_data = {
            'coroner_analysis': 'Test analysis',
            'identity_match': None
        }
        
        response = authenticated_client_officer.post(
            f'/api/v1/evidence/biological/{evidence.id}/verify/',
            verify_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'forensic' in str(response.data).lower()
    
    def test_biological_evidence_requires_type(
        self, authenticated_client_officer, open_case
    ):
        """Biological evidence requires evidence_type."""
        data = {
            'case': open_case.id,
            'title': 'Evidence',
            'description': 'Test',
            'evidence_type': ''
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/biological/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# VEHICLE EVIDENCE TESTS
# ============================================================================

@pytest.mark.django_db
class TestVehicleEvidence:
    """Test vehicle evidence registration."""
    
    def test_officer_registers_vehicle_with_license_plate(
        self, authenticated_client_officer, open_case
    ):
        """Officer registers vehicle with license plate."""
        data = {
            'case': open_case.id,
            'title': 'Suspect Vehicle',
            'description': 'Black sedan at scene',
            'model': 'Toyota Camry 2020',
            'color': 'Black',
            'license_plate': 'ABC-1234',
            'serial_number': ''
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/vehicles/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['license_plate'] == 'ABC-1234'
        assert response.data['serial_number'] == ''
    
    def test_officer_registers_vehicle_with_serial_number(
        self, authenticated_client_officer, open_case
    ):
        """Officer registers vehicle with serial number (no plates)."""
        data = {
            'case': open_case.id,
            'title': 'Abandoned Motorcycle',
            'description': 'No plates',
            'model': 'Honda CBR600',
            'color': 'Red',
            'license_plate': '',
            'serial_number': 'JH2PC40046M200123'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/vehicles/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['serial_number'] == 'JH2PC40046M200123'
        assert response.data['license_plate'] == ''
    
    def test_vehicle_cannot_have_both_plate_and_serial(
        self, authenticated_client_officer, open_case
    ):
        """Vehicle cannot have both license plate and serial number."""
        data = {
            'case': open_case.id,
            'title': 'Test Vehicle',
            'description': 'Test',
            'model': 'Test Model',
            'color': 'Black',
            'license_plate': 'ABC-123',
            'serial_number': 'SERIAL123'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/vehicles/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'both' in str(response.data).lower()
    
    def test_vehicle_must_have_plate_or_serial(
        self, authenticated_client_officer, open_case
    ):
        """Vehicle must have either license plate or serial number."""
        data = {
            'case': open_case.id,
            'title': 'Test Vehicle',
            'description': 'Test',
            'model': 'Test Model',
            'color': 'Black',
            'license_plate': '',
            'serial_number': ''
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/vehicles/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'either' in str(response.data).lower() or 'must' in str(response.data).lower()


# ============================================================================
# ID DOCUMENT TESTS
# ============================================================================

@pytest.mark.django_db
class TestIDDocumentEvidence:
    """Test ID document evidence registration."""
    
    def test_officer_registers_id_document_with_attributes(
        self, authenticated_client_officer, open_case
    ):
        """Officer registers ID document with full attributes."""
        data = {
            'case': open_case.id,
            'title': 'Suspect National ID',
            'description': 'ID found at scene',
            'owner_full_name': 'John Michael Doe',
            'document_type': 'National ID Card',
            'attributes': {
                'id_number': '1234567890',
                'issue_date': '2020-05-15',
                'expiry_date': '2030-05-15',
                'address': '123 Main St'
            }
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/id-documents/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['owner_full_name'] == 'John Michael Doe'
        assert response.data['attributes']['id_number'] == '1234567890'
        assert len(response.data['attributes']) == 4
    
    def test_officer_registers_id_document_without_attributes(
        self, authenticated_client_officer, open_case
    ):
        """Officer registers ID document with no additional attributes."""
        data = {
            'case': open_case.id,
            'title': 'Work Badge',
            'description': 'Badge with name only',
            'owner_full_name': 'Jane Smith',
            'document_type': 'Work Badge',
            'attributes': {}
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/id-documents/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['owner_full_name'] == 'Jane Smith'
        assert response.data['attributes'] == {}
    
    def test_id_document_requires_owner_name(
        self, authenticated_client_officer, open_case
    ):
        """ID document requires owner's full name."""
        data = {
            'case': open_case.id,
            'title': 'ID Document',
            'description': 'Test',
            'owner_full_name': '',
            'document_type': 'National ID',
            'attributes': {}
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/id-documents/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_id_document_attributes_must_be_dict(
        self, authenticated_client_officer, open_case
    ):
        """ID document attributes must be a dictionary."""
        data = {
            'case': open_case.id,
            'title': 'ID Document',
            'description': 'Test',
            'owner_full_name': 'John Doe',
            'document_type': 'National ID',
            'attributes': 'not a dict'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/id-documents/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# EVIDENCE IMAGE TESTS
# ============================================================================

@pytest.mark.django_db
class TestEvidenceImage:
    """Test evidence image upload and management."""
    
    def test_officer_uploads_evidence_image(
        self, authenticated_client_officer
    ):
        """Officer uploads an evidence image."""
        # Create a simple test image
        image_content = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        image_file = SimpleUploadedFile(
            'evidence.gif',
            image_content,
            content_type='image/gif'
        )
        
        data = {
            'image': image_file,
            'caption': 'Blood stain evidence photo'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/images/',
            data,
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['caption'] == 'Blood stain evidence photo'
        assert 'uploaded_at' in response.data
        assert 'image' in response.data
    
    def test_officer_uploads_image_without_caption(
        self, authenticated_client_officer
    ):
        """Officer uploads image without caption (caption is optional)."""
        image_content = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        image_file = SimpleUploadedFile(
            'evidence2.gif',
            image_content,
            content_type='image/gif'
        )
        
        data = {
            'image': image_file,
            'caption': ''
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/images/',
            data,
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['caption'] == ''
    
    def test_civilian_can_upload_evidence_image(
        self, authenticated_client_civilian
    ):
        """Civilian can upload evidence images."""
        image_content = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        image_file = SimpleUploadedFile(
            'civilian_photo.gif',
            image_content,
            content_type='image/gif'
        )
        
        data = {
            'image': image_file,
            'caption': 'Photo from my security camera'
        }
        
        response = authenticated_client_civilian.post(
            '/api/v1/evidence/images/',
            data,
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_list_evidence_images(
        self, authenticated_client_officer
    ):
        """List all evidence images."""
        # Upload an image first
        image_content = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        image_file = SimpleUploadedFile(
            'test_list.gif',
            image_content,
            content_type='image/gif'
        )
        
        authenticated_client_officer.post(
            '/api/v1/evidence/images/',
            {'image': image_file, 'caption': 'Test'},
            format='multipart'
        )
        
        response = authenticated_client_officer.get('/api/v1/evidence/images/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
    
    def test_get_image_details(
        self, authenticated_client_officer
    ):
        """Get specific image details."""
        # Upload an image
        image_content = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        image_file = SimpleUploadedFile(
            'details_test.gif',
            image_content,
            content_type='image/gif'
        )
        
        create_response = authenticated_client_officer.post(
            '/api/v1/evidence/images/',
            {'image': image_file, 'caption': 'Detailed test'},
            format='multipart'
        )
        image_id = create_response.data['id']
        
        response = authenticated_client_officer.get(f'/api/v1/evidence/images/{image_id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['caption'] == 'Detailed test'
        assert response.data['id'] == image_id
    
    def test_delete_evidence_image(
        self, authenticated_client_officer
    ):
        """Delete an evidence image."""
        # Upload an image
        image_content = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        image_file = SimpleUploadedFile(
            'delete_test.gif',
            image_content,
            content_type='image/gif'
        )
        
        create_response = authenticated_client_officer.post(
            '/api/v1/evidence/images/',
            {'image': image_file, 'caption': 'To be deleted'},
            format='multipart'
        )
        image_id = create_response.data['id']
        
        # Delete the image
        delete_response = authenticated_client_officer.delete(
            f'/api/v1/evidence/images/{image_id}/'
        )
        
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify it's deleted
        get_response = authenticated_client_officer.get(
            f'/api/v1/evidence/images/{image_id}/'
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_biological_evidence_can_reference_images(
        self, authenticated_client_officer, open_case
    ):
        """Biological evidence can reference uploaded images."""
        # Upload images first
        image_content = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x4c\x01\x00\x3b'
        )
        image1 = SimpleUploadedFile('img1.gif', image_content, content_type='image/gif')
        image2 = SimpleUploadedFile('img2.gif', image_content, content_type='image/gif')
        
        img1_response = authenticated_client_officer.post(
            '/api/v1/evidence/images/',
            {'image': image1, 'caption': 'Blood stain - angle 1'},
            format='multipart'
        )
        img2_response = authenticated_client_officer.post(
            '/api/v1/evidence/images/',
            {'image': image2, 'caption': 'Blood stain - angle 2'},
            format='multipart'
        )
        
        img1_id = img1_response.data['id']
        img2_id = img2_response.data['id']
        
        # Create biological evidence with these images
        bio_data = {
            'case': open_case.id,
            'title': 'Blood Evidence with Photos',
            'description': 'Blood stain documented from multiple angles',
            'evidence_type': 'blood',
            'images': [img1_id, img2_id]
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/biological/',
            bio_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['images']) == 2
        assert len(response.data['images_data']) == 2
        assert response.data['images_data'][0]['caption'] in ['Blood stain - angle 1', 'Blood stain - angle 2']


# ============================================================================
# GENERIC EVIDENCE TESTS
# ============================================================================

@pytest.mark.django_db
class TestGenericEvidence:
    """Test generic evidence registration."""
    
    def test_officer_registers_generic_evidence(
        self, authenticated_client_officer, open_case
    ):
        """Officer registers generic evidence."""
        data = {
            'case': open_case.id,
            'title': 'Crowbar',
            'description': 'Metal crowbar found at scene with paint chips'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/generic/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Crowbar'
        assert 'recorded_at' in response.data
    
    def test_generic_evidence_simple_title_description(
        self, authenticated_client_officer, open_case
    ):
        """Generic evidence only requires title and description."""
        data = {
            'case': open_case.id,
            'title': 'Black Glove',
            'description': 'Single black leather glove, size large'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/generic/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'Black Glove' in response.data['title']


# ============================================================================
# PERMISSIONS TESTS
# ============================================================================

@pytest.mark.django_db
class TestEvidencePermissions:
    """Test evidence permissions and access control."""
    
    def test_unauthenticated_cannot_access_evidence(self, api_client):
        """Unauthenticated users cannot access evidence endpoints."""
        response = api_client.get('/api/v1/evidence/testimonies/')
        # DRF returns 403 Forbidden when no authentication is provided and IsAuthenticated is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_authenticated_users_can_register_evidence(
        self, authenticated_client_officer, open_case
    ):
        """Authenticated users can register evidence on open cases."""
        data = {
            'case': open_case.id,
            'title': 'Test Evidence',
            'description': 'Test'
        }
        
        response = authenticated_client_officer.post(
            '/api/v1/evidence/generic/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_admin_can_see_all_evidence(
        self, authenticated_client_admin, open_case, officer_user
    ):
        """Admin can see all evidence."""
        GenericEvidence.objects.create(
            case=open_case,
            title='Test Evidence',
            description='Test',
            recorded_by=officer_user
        )
        
        response = authenticated_client_admin.get('/api/v1/evidence/generic/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1


# ============================================================================
# FILTERING AND SEARCH TESTS
# ============================================================================

@pytest.mark.django_db
class TestEvidenceFiltering:
    """Test evidence filtering and search."""
    
    def test_filter_evidence_by_case(
        self, authenticated_client_officer, open_case, officer_user
    ):
        """Filter evidence by case."""
        # Create evidence for this case
        GenericEvidence.objects.create(
            case=open_case,
            title='Evidence 1',
            description='Test',
            recorded_by=officer_user
        )
        
        # Create another case and evidence
        other_case = Case.objects.create(
            case_number='2026-SCEN-OTHER',
            title='Other Case',
            description='Test',
            crime_level=open_case.crime_level,
            formation_type=Case.FORMATION_CRIME_SCENE,
            status=Case.STATUS_OPEN,
            created_by=officer_user
        )
        GenericEvidence.objects.create(
            case=other_case,
            title='Evidence 2',
            description='Test',
            recorded_by=officer_user
        )
        
        response = authenticated_client_officer.get(
            f'/api/v1/evidence/generic/?case={open_case.id}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Evidence 1'
    
    def test_search_evidence_by_title(
        self, authenticated_client_officer, open_case, officer_user
    ):
        """Search evidence by title."""
        GenericEvidence.objects.create(
            case=open_case,
            title='Crowbar Evidence',
            description='Test',
            recorded_by=officer_user
        )
        GenericEvidence.objects.create(
            case=open_case,
            title='Glove Evidence',
            description='Test',
            recorded_by=officer_user
        )
        
        response = authenticated_client_officer.get(
            '/api/v1/evidence/generic/?search=Crowbar'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
        assert 'Crowbar' in response.data['results'][0]['title']
