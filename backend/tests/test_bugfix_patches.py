"""
Backend tests for Bugfix Patches.
Tests specific bug fixes:
  1. Case review - descriptive error messages for wrong status
  2. Biological evidence - file upload handling for images
  3. Vehicle evidence - non-field validation errors
  4. Board item - label and notes persistence
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.cases.models import Case, CrimeLevel
from apps.evidence.models import (
    BiologicalEvidence, VehicleEvidence, EvidenceImage
)
from apps.investigation.models import DetectiveBoard, BoardItem

User = get_user_model()


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def crime_level(db):
    return CrimeLevel.objects.create(name='Level 2 - Medium', level=2, description='Medium')


@pytest.fixture
def base_role(db):
    return Role.objects.create(name='Base User', description='Default', is_police_rank=False, hierarchy_level=0)


@pytest.fixture
def cadet_role(db):
    return Role.objects.create(name='Cadet', description='Cadet', is_police_rank=True, hierarchy_level=1)


@pytest.fixture
def officer_role(db):
    return Role.objects.create(name='Police Officer', description='Officer', is_police_rank=True, hierarchy_level=3)


@pytest.fixture
def detective_role(db):
    return Role.objects.create(name='Detective', description='Detective', is_police_rank=True, hierarchy_level=4)


@pytest.fixture
def cadet_user(db, cadet_role):
    user = User.objects.create_user(
        username='cadet', email='cadet@test.com',
        phone_number='+11111111111', national_id='1111111111',
        password='pass123', first_name='Test', last_name='Cadet',
    )
    user.roles.add(cadet_role)
    return user


@pytest.fixture
def officer_user(db, officer_role):
    user = User.objects.create_user(
        username='officer', email='officer@test.com',
        phone_number='+12222222222', national_id='2222222222',
        password='pass123', first_name='Test', last_name='Officer',
    )
    user.roles.add(officer_role)
    return user


@pytest.fixture
def detective_user(db, detective_role):
    user = User.objects.create_user(
        username='det', email='det@test.com',
        phone_number='+13333333333', national_id='3333333333',
        password='pass123', first_name='Test', last_name='Detective',
    )
    user.roles.add(detective_role)
    return user


@pytest.fixture
def complainant_user(db, base_role):
    user = User.objects.create_user(
        username='complainant', email='comp@test.com',
        phone_number='+14444444444', national_id='4444444444',
        password='pass123', first_name='Test', last_name='User',
    )
    user.roles.add(base_role)
    return user


@pytest.fixture
def open_case(db, crime_level, complainant_user):
    """A case in 'open' status."""
    return Case.objects.create(
        title='Test Open Case',
        description='Test case that is open.',
        crime_level=crime_level,
        status=Case.STATUS_OPEN,
        created_by=complainant_user,
    )


@pytest.fixture
def draft_case(db, crime_level, complainant_user):
    """A case in 'draft' status."""
    return Case.objects.create(
        title='Test Draft Case',
        description='Test case in draft.',
        crime_level=crime_level,
        status=Case.STATUS_DRAFT,
        created_by=complainant_user,
    )


@pytest.fixture
def cadet_review_case(db, crime_level, complainant_user):
    """A case in 'cadet_review' status."""
    return Case.objects.create(
        title='Test Cadet Review Case',
        description='Test case in cadet review.',
        crime_level=crime_level,
        status=Case.STATUS_CADET_REVIEW,
        created_by=complainant_user,
    )


@pytest.fixture
def officer_review_case(db, crime_level, complainant_user):
    """A case in 'officer_review' status."""
    return Case.objects.create(
        title='Test Officer Review Case',
        description='Test case in officer review.',
        crime_level=crime_level,
        status=Case.STATUS_OFFICER_REVIEW,
        created_by=complainant_user,
    )


# ============================================================================
# BUG 1: Descriptive case review error messages
# ============================================================================

@pytest.mark.django_db
class TestCaseReviewErrorMessages:
    """Verify that case review endpoints return descriptive errors when status is wrong."""

    def test_cadet_review_on_draft_case_returns_descriptive_error(self, cadet_user, draft_case):
        """Cadet reviewing a draft case should get a clear message about draft status."""
        client = APIClient()
        client.force_authenticate(user=cadet_user)
        response = client.post(
            f'/api/v1/cases/cases/{draft_case.pk}/cadet_review/',
            {'decision': 'approved'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error = response.data.get('error', '')
        assert 'draft' in error.lower()

    def test_cadet_review_on_officer_review_case_returns_descriptive_error(self, cadet_user, officer_review_case):
        """Cadet reviewing an officer-review case should be told it has passed cadet review."""
        client = APIClient()
        client.force_authenticate(user=cadet_user)
        response = client.post(
            f'/api/v1/cases/cases/{officer_review_case.pk}/cadet_review/',
            {'decision': 'approved'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error = response.data.get('error', '')
        assert 'officer review' in error.lower()

    def test_cadet_review_on_open_case_returns_descriptive_error(self, cadet_user, open_case):
        """Cadet reviewing an already-open case should be told it's fully approved."""
        # Cadet queryset doesn't include 'open' status; set created_by so they can access it
        open_case.created_by = cadet_user
        open_case.save(update_fields=['created_by'])
        client = APIClient()
        client.force_authenticate(user=cadet_user)
        response = client.post(
            f'/api/v1/cases/cases/{open_case.pk}/cadet_review/',
            {'decision': 'approved'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error = response.data.get('error', '')
        assert 'open' in error.lower() or 'approved' in error.lower()

    def test_officer_review_on_cadet_review_case_returns_descriptive_error(self, officer_user, cadet_review_case):
        """Officer reviewing a case still in cadet review should get clear message."""
        # Officer queryset doesn't include 'cadet_review' status; set created_by so they can access it
        cadet_review_case.created_by = officer_user
        cadet_review_case.save(update_fields=['created_by'])
        client = APIClient()
        client.force_authenticate(user=officer_user)
        response = client.post(
            f'/api/v1/cases/cases/{cadet_review_case.pk}/officer_review/',
            {'decision': 'approved'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error = response.data.get('error', '')
        assert 'cadet review' in error.lower()

    def test_officer_review_on_draft_case_returns_descriptive_error(self, officer_user, draft_case):
        """Officer reviewing a draft case should be told it needs cadet review first."""
        # Officer queryset doesn't include 'draft' status; set created_by so they can access it
        draft_case.created_by = officer_user
        draft_case.save(update_fields=['created_by'])
        client = APIClient()
        client.force_authenticate(user=officer_user)
        response = client.post(
            f'/api/v1/cases/cases/{draft_case.pk}/officer_review/',
            {'decision': 'approved'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error = response.data.get('error', '')
        assert 'draft' in error.lower() or 'cadet' in error.lower()


# ============================================================================
# BUG 2: Biological evidence image file upload
# ============================================================================

@pytest.mark.django_db
class TestBiologicalEvidenceImageUpload:
    """Verify that biological evidence can be created with raw file uploads for images."""

    def test_create_with_file_upload_succeeds(self, detective_user, open_case):
        """Sending actual image files in the 'images' field should work."""
        client = APIClient()
        client.force_authenticate(user=detective_user)

        fake_img = SimpleUploadedFile(
            'test_image.jpg', b'\xff\xd8\xff\xe0test image data', content_type='image/jpeg'
        )

        response = client.post(
            '/api/v1/evidence/biological/',
            {
                'case': open_case.pk,
                'title': 'Blood sample',
                'description': 'Blood found at entrance',
                'evidence_type': 'blood',
                'images': [fake_img],
            },
            format='multipart',
        )
        assert response.status_code == status.HTTP_201_CREATED
        # The created evidence should have an image linked
        bio = BiologicalEvidence.objects.get(pk=response.data['id'])
        assert bio.images.count() == 1

    def test_create_without_images_succeeds(self, detective_user, open_case):
        """Creating biological evidence without images should still work."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        response = client.post(
            '/api/v1/evidence/biological/',
            {
                'case': open_case.pk,
                'title': 'Hair sample',
                'description': 'Hair found on floor',
                'evidence_type': 'hair',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_with_pk_images_still_works(self, detective_user, open_case):
        """Sending PK ids for existing EvidenceImage objects should still work."""
        client = APIClient()
        client.force_authenticate(user=detective_user)

        img = EvidenceImage.objects.create(
            image=SimpleUploadedFile('i.jpg', b'\xff\xd8\xff\xe0data', content_type='image/jpeg'),
            caption='Pre-uploaded',
        )
        response = client.post(
            '/api/v1/evidence/biological/',
            {
                'case': open_case.pk,
                'title': 'Fingerprint',
                'description': 'Fingerprint on glass',
                'evidence_type': 'fingerprint',
                'images': [img.pk],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        bio = BiologicalEvidence.objects.get(pk=response.data['id'])
        assert bio.images.count() == 1


# ============================================================================
# BUG 3: Vehicle evidence non-field validation error
# ============================================================================

@pytest.mark.django_db
class TestVehicleEvidenceValidation:
    """Verify that vehicle evidence validation returns non_field_errors for mutual exclusion."""

    def test_both_plate_and_serial_returns_non_field_error(self, detective_user, open_case):
        """Sending both license_plate and serial_number should return a non_field_errors error."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        response = client.post(
            '/api/v1/evidence/vehicles/',
            {
                'case': open_case.pk,
                'title': 'Suspicious car',
                'description': 'Red sedan at scene',
                'model': 'Toyota Camry',
                'color': 'Red',
                'license_plate': 'ABC-123',
                'serial_number': 'VIN12345',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Should be a non-field error, NOT under 'license_plate' key
        assert 'non_field_errors' in response.data
        msg = str(response.data['non_field_errors'][0])
        assert 'license plate' in msg.lower() and 'serial number' in msg.lower()

    def test_neither_plate_nor_serial_returns_non_field_error(self, detective_user, open_case):
        """Sending neither license_plate nor serial_number should return a non_field_errors error."""
        client = APIClient()
        client.force_authenticate(user=detective_user)
        response = client.post(
            '/api/v1/evidence/vehicles/',
            {
                'case': open_case.pk,
                'title': 'Unknown car',
                'description': 'A car was seen',
                'model': 'Unknown',
                'color': 'Blue',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'non_field_errors' in response.data


# ============================================================================
# BUG 5: Board item label and notes persistence
# ============================================================================

@pytest.mark.django_db
class TestBoardItemLabelNotes:
    """Verify that board items store and return label and notes fields."""

    def test_create_board_item_with_label_and_notes(self, detective_user, open_case):
        """Board item created with label/notes should persist them."""
        client = APIClient()
        client.force_authenticate(user=detective_user)

        # Create a detective board first
        board = DetectiveBoard.objects.create(case=open_case, detective=detective_user)
        response = client.post(
            '/api/v1/investigation/board-items/',
            {
                'board': board.pk,
                'content_type': 'testimony',
                'object_id': 1,
                'label': 'Testimony: Witness Statement',
                'notes': 'Key witness saw suspect enter at 10pm',
                'position_x': 100.0,
                'position_y': 200.0,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['label'] == 'Testimony: Witness Statement'
        assert response.data['notes'] == 'Key witness saw suspect enter at 10pm'

    def test_board_item_label_returned_in_board_detail(self, detective_user, open_case):
        """When fetching the board, items should include labels."""
        client = APIClient()
        client.force_authenticate(user=detective_user)

        board = DetectiveBoard.objects.create(case=open_case, detective=detective_user)
        BoardItem.objects.create(
            board=board, content_type='vehicle', object_id=5,
            label='Vehicle: Red Sedan', notes='License ABC-123',
            position_x=50, position_y=50,
        )

        response = client.get(f'/api/v1/investigation/detective-boards/{board.pk}/')
        assert response.status_code == status.HTTP_200_OK
        items = response.data.get('items', [])
        assert len(items) == 1
        assert items[0]['label'] == 'Vehicle: Red Sedan'
        assert items[0]['notes'] == 'License ABC-123'
