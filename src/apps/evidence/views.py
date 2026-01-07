"""
Views for Evidence Management.
Handles registration and management of all evidence types.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from django.utils import timezone
from .models import (
    Testimony, BiologicalEvidence, EvidenceImage,
    VehicleEvidence, IDDocument, GenericEvidence
)
from .serializers import (
    TestimonySerializer, BiologicalEvidenceSerializer, EvidenceImageSerializer,
    VehicleEvidenceSerializer, IDDocumentSerializer, GenericEvidenceSerializer,
    BiologicalEvidenceUpdateSerializer
)
from apps.cases.models import Case


def user_has_role(user, role_name):
    """Check if user has a specific role."""
    return user.roles.filter(name=role_name).exists()


class TestimonyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Testimony Evidence.
    
    Handles witness testimonies and local people statements.
    Can include transcripts and media files.
    """
    queryset = Testimony.objects.select_related('case', 'recorded_by', 'witness').all()
    serializer_class = TestimonySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'witness', 'recorded_by']
    search_fields = ['title', 'transcript', 'witness_name']
    ordering = ['-recorded_at']
    
    def get_queryset(self):
        """Filter based on user permissions."""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins and police see all
        if user_has_role(user, 'Administrator') or user.roles.filter(is_police_rank=True).exists():
            return queryset
        
        # Others see only evidence from their cases
        return queryset.filter(case__created_by=user)
    
    @extend_schema(
        summary="Register witness testimony",
        description="""Register testimony evidence from witnesses or local people.
        
        **استشهاد شاهدان یا افراد محلی**
        
        Testimony can include:
        - Written transcript of statements
        - Image evidence from locals
        - Audio recordings
        - Video recordings
        
        Either `witness` (registered user ID) or `witness_name` (text) must be provided.
        """,
        request=TestimonySerializer,
        responses={
            201: TestimonySerializer,
            400: {"description": "Validation error"}
        },
        examples=[
            OpenApiExample(
                'Testimony from registered witness',
                value={
                    "case": 1,
                    "title": "Eyewitness Account - Burglary",
                    "description": "Witness saw suspect breaking window",
                    "witness": 5,
                    "transcript": "I was walking my dog around 11 PM when I heard glass breaking. I looked up and saw a person in dark clothes climbing through the window of the jewelry store."
                },
                request_only=True
            ),
            OpenApiExample(
                'Testimony from local person with media',
                value={
                    "case": 1,
                    "title": "Security Camera Footage",
                    "description": "Local resident has camera footage",
                    "witness_name": "John Smith",
                    "transcript": "My security camera captured the incident. I'm providing the video file.",
                    "video": "<file upload>"
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Create testimony and automatically set recorded_by."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(recorded_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @extend_schema(
        summary="Update testimony",
        description="Update existing testimony evidence. Only the person who recorded it or admins can update."
    )
    def update(self, request, *args, **kwargs):
        """Update testimony."""
        instance = self.get_object()
        
        # Check permissions: only recorder or admin can update
        if instance.recorded_by != request.user and not user_has_role(request.user, 'Administrator'):
            return Response(
                {'error': 'Only the person who recorded this evidence or administrators can update it'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)


class BiologicalEvidenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Biological Evidence.
    
    Handles biological and medical evidence requiring forensic analysis.
    Examples: blood stains, hair samples, fingerprints.
    """
    queryset = BiologicalEvidence.objects.select_related(
        'case', 'recorded_by', 'verified_by_coroner', 'identity_match'
    ).prefetch_related('images').all()
    serializer_class = BiologicalEvidenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'evidence_type', 'verified_by_coroner']
    search_fields = ['title', 'evidence_type', 'coroner_analysis']
    ordering = ['-recorded_at']
    
    def get_queryset(self):
        """Filter based on user permissions."""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins and police see all
        if user_has_role(user, 'Administrator') or user.roles.filter(is_police_rank=True).exists():
            return queryset
        
        # Forensic doctors see all for verification
        if user_has_role(user, 'Forensic Doctor'):
            return queryset
        
        # Others see only evidence from their cases
        return queryset.filter(case__created_by=user)
    
    @extend_schema(
        summary="Register biological evidence",
        description="""Register biological or medical evidence requiring forensic analysis.
        
        **شواهد زیستی و پزشکی**
        
        Examples:
        - Blood stains (لکه خون)
        - Hair samples (تار مو)
        - Fingerprints (اثر انگشت)
        
        Evidence requires verification by forensic doctor or national identity database.
        Results (coroner_analysis, identity_match) are initially empty and filled later.
        """,
        request=BiologicalEvidenceSerializer,
        responses={
            201: BiologicalEvidenceSerializer,
            400: {"description": "Validation error"}
        },
        examples=[
            OpenApiExample(
                'Blood stain evidence',
                value={
                    "case": 1,
                    "title": "Blood Sample from Crime Scene",
                    "description": "Blood stain found on wall near entry point",
                    "evidence_type": "blood",
                    "images": [1, 2]
                },
                request_only=True
            ),
            OpenApiExample(
                'Fingerprint evidence',
                value={
                    "case": 1,
                    "title": "Fingerprint on Window",
                    "description": "Clear fingerprint lifted from broken window",
                    "evidence_type": "fingerprint",
                    "images": [3]
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Create biological evidence and automatically set recorded_by."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(recorded_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @extend_schema(
        summary="Add forensic analysis results",
        description="""Add forensic analysis results to biological evidence.
        
        **For Forensic Doctors only.**
        
        Update evidence with:
        - Coroner analysis results
        - Identity match from national database
        - Verification timestamp
        """,
        request=BiologicalEvidenceUpdateSerializer,
        responses={
            200: BiologicalEvidenceSerializer,
            403: {"description": "Only forensic doctors can verify evidence"}
        },
        examples=[
            OpenApiExample(
                'Add forensic analysis',
                value={
                    "coroner_analysis": "Blood type O+. DNA analysis shows 99.9% match with suspect ID 12345.",
                    "identity_match": 15
                },
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Add forensic analysis results (Forensic Doctor only)."""
        if not user_has_role(request.user, 'Forensic Doctor'):
            return Response(
                {'error': 'Only forensic doctors can verify biological evidence'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        evidence = self.get_object()
        serializer = BiologicalEvidenceUpdateSerializer(evidence, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(verified_by_coroner=request.user, verified_at=timezone.now())
        
        response_serializer = self.get_serializer(evidence)
        return Response(response_serializer.data)


class EvidenceImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Evidence Images.
    
    Manages image uploads for biological and other evidence.
    """
    queryset = EvidenceImage.objects.all()
    serializer_class = EvidenceImageSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-uploaded_at']
    
    @extend_schema(
        summary="Upload evidence image",
        description="Upload an image for evidence documentation",
        request=EvidenceImageSerializer,
        responses={201: EvidenceImageSerializer}
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)


class VehicleEvidenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Vehicle Evidence.
    
    Handles vehicles found at crime scenes.
    """
    queryset = VehicleEvidence.objects.select_related('case', 'recorded_by').all()
    serializer_class = VehicleEvidenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'recorded_by']
    search_fields = ['title', 'model', 'license_plate', 'serial_number', 'color']
    ordering = ['-recorded_at']
    
    def get_queryset(self):
        """Filter based on user permissions."""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins and police see all
        if user_has_role(user, 'Administrator') or user.roles.filter(is_police_rank=True).exists():
            return queryset
        
        # Others see only evidence from their cases
        return queryset.filter(case__created_by=user)
    
    @extend_schema(
        summary="Register vehicle evidence",
        description="""Register vehicle found at crime scene.
        
        **وسایل نقلیه**
        
        Vehicle must have either:
        - License plate (پلاک) - if vehicle is registered
        - Serial number (شماره سریال) - if no license plate
        
        **Important**: Cannot have both license plate AND serial number simultaneously.
        """,
        request=VehicleEvidenceSerializer,
        responses={
            201: VehicleEvidenceSerializer,
            400: {"description": "Validation error"}
        },
        examples=[
            OpenApiExample(
                'Vehicle with license plate',
                value={
                    "case": 1,
                    "title": "Suspect Vehicle - Black Sedan",
                    "description": "Black sedan seen fleeing crime scene",
                    "model": "Toyota Camry 2020",
                    "color": "Black",
                    "license_plate": "ABC-1234"
                },
                request_only=True
            ),
            OpenApiExample(
                'Vehicle without plates (serial number)',
                value={
                    "case": 1,
                    "title": "Abandoned Motorcycle",
                    "description": "Motorcycle found near scene with no plates",
                    "model": "Honda CBR600",
                    "color": "Red",
                    "serial_number": "JH2PC40046M200123"
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Create vehicle evidence and automatically set recorded_by."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(recorded_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class IDDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ID Document Evidence.
    
    Handles identification documents found at crime scenes.
    """
    queryset = IDDocument.objects.select_related('case', 'recorded_by').all()
    serializer_class = IDDocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'document_type', 'recorded_by']
    search_fields = ['title', 'owner_full_name', 'document_type']
    ordering = ['-recorded_at']
    
    def get_queryset(self):
        """Filter based on user permissions."""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins and police see all
        if user_has_role(user, 'Administrator') or user.roles.filter(is_police_rank=True).exists():
            return queryset
        
        # Others see only evidence from their cases
        return queryset.filter(case__created_by=user)
    
    @extend_schema(
        summary="Register ID document evidence",
        description="""Register identification document found at crime scene.
        
        **مدارک شناسایی**
        
        Store:
        - Owner's full name (required)
        - Document type (e.g., national ID, driver's license, work badge)
        - Additional attributes as flexible key-value pairs
        
        **Note**: Attributes can be empty or contain any number of key-value pairs.
        Example: {"id_number": "1234567890", "issue_date": "2020-01-01", "expiry_date": "2030-01-01"}
        """,
        request=IDDocumentSerializer,
        responses={
            201: IDDocumentSerializer,
            400: {"description": "Validation error"}
        },
        examples=[
            OpenApiExample(
                'National ID card',
                value={
                    "case": 1,
                    "title": "Suspect National ID Card",
                    "description": "National ID found at crime scene near broken window",
                    "owner_full_name": "John Michael Doe",
                    "document_type": "National ID Card",
                    "attributes": {
                        "id_number": "1234567890",
                        "issue_date": "2020-05-15",
                        "expiry_date": "2030-05-15",
                        "address": "123 Main St, Los Angeles"
                    }
                },
                request_only=True
            ),
            OpenApiExample(
                'Driver license with minimal info',
                value={
                    "case": 1,
                    "title": "Driver License Fragment",
                    "description": "Partially burned driver's license",
                    "owner_full_name": "Jane Smith",
                    "document_type": "Driver's License",
                    "attributes": {
                        "license_number": "D1234567"
                    }
                },
                request_only=True
            ),
            OpenApiExample(
                'Work badge (name only)',
                value={
                    "case": 1,
                    "title": "Security Guard Badge",
                    "description": "Work badge found near entrance",
                    "owner_full_name": "Robert Johnson",
                    "document_type": "Work Badge",
                    "attributes": {}
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Create ID document evidence and automatically set recorded_by."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(recorded_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class GenericEvidenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Generic Evidence.
    
    Handles any other evidence not fitting specific categories.
    """
    queryset = GenericEvidence.objects.select_related('case', 'recorded_by').all()
    serializer_class = GenericEvidenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'recorded_by']
    search_fields = ['title', 'description']
    ordering = ['-recorded_at']
    
    def get_queryset(self):
        """Filter based on user permissions."""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins and police see all
        if user_has_role(user, 'Administrator') or user.roles.filter(is_police_rank=True).exists():
            return queryset
        
        # Others see only evidence from their cases
        return queryset.filter(case__created_by=user)
    
    @extend_schema(
        summary="Register generic evidence",
        description="""Register any other evidence not fitting specific categories.
        
        **سایر موارد**
        
        Simple title-description format for:
        - Physical items
        - Documents
        - Any other evidence
        """,
        request=GenericEvidenceSerializer,
        responses={
            201: GenericEvidenceSerializer,
            400: {"description": "Validation error"}
        },
        examples=[
            OpenApiExample(
                'Physical item',
                value={
                    "case": 1,
                    "title": "Crowbar",
                    "description": "Metal crowbar found at crime scene with paint chips matching door frame"
                },
                request_only=True
            ),
            OpenApiExample(
                'Document',
                value={
                    "case": 1,
                    "title": "Handwritten Note",
                    "description": "Threatening note left at scene. Text reads: 'This is just the beginning.'"
                },
                request_only=True
            ),
            OpenApiExample(
                'Clothing item',
                value={
                    "case": 1,
                    "title": "Black Glove",
                    "description": "Single black leather glove found near entry point. Size large."
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Create generic evidence and automatically set recorded_by."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(recorded_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
