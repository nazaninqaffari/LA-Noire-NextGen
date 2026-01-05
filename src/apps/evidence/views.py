from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import (
    Testimony, BiologicalEvidence, EvidenceImage,
    VehicleEvidence, IDDocument, GenericEvidence
)
from .serializers import (
    TestimonySerializer, BiologicalEvidenceSerializer, EvidenceImageSerializer,
    VehicleEvidenceSerializer, IDDocumentSerializer, GenericEvidenceSerializer
)


class TestimonyViewSet(viewsets.ModelViewSet):
    """ViewSet for Testimony evidence."""
    queryset = Testimony.objects.all()
    serializer_class = TestimonySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'witness', 'recorded_by']
    search_fields = ['title', 'transcript', 'witness_name']
    ordering = ['-recorded_at']


class BiologicalEvidenceViewSet(viewsets.ModelViewSet):
    """ViewSet for Biological evidence."""
    queryset = BiologicalEvidence.objects.all()
    serializer_class = BiologicalEvidenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'evidence_type', 'verified_by_coroner']
    search_fields = ['title', 'evidence_type', 'coroner_analysis']
    ordering = ['-recorded_at']


class EvidenceImageViewSet(viewsets.ModelViewSet):
    """ViewSet for Evidence images."""
    queryset = EvidenceImage.objects.all()
    serializer_class = EvidenceImageSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-uploaded_at']


class VehicleEvidenceViewSet(viewsets.ModelViewSet):
    """ViewSet for Vehicle evidence."""
    queryset = VehicleEvidence.objects.all()
    serializer_class = VehicleEvidenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'recorded_by']
    search_fields = ['title', 'model', 'license_plate', 'serial_number']
    ordering = ['-recorded_at']


class IDDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for ID Document evidence."""
    queryset = IDDocument.objects.all()
    serializer_class = IDDocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'document_type', 'recorded_by']
    search_fields = ['title', 'owner_full_name', 'document_type']
    ordering = ['-recorded_at']


class GenericEvidenceViewSet(viewsets.ModelViewSet):
    """ViewSet for Generic evidence."""
    queryset = GenericEvidence.objects.all()
    serializer_class = GenericEvidenceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'recorded_by']
    search_fields = ['title', 'description']
    ordering = ['-recorded_at']
