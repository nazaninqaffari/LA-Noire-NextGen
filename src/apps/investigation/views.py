from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import DetectiveBoard, BoardItem, EvidenceConnection, Suspect, Interrogation, TipOff
from .serializers import (
    DetectiveBoardSerializer, BoardItemSerializer, EvidenceConnectionSerializer,
    SuspectSerializer, InterrogationSerializer, TipOffSerializer
)


class DetectiveBoardViewSet(viewsets.ModelViewSet):
    """ViewSet for Detective Boards."""
    queryset = DetectiveBoard.objects.all()
    serializer_class = DetectiveBoardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['case', 'detective']


class BoardItemViewSet(viewsets.ModelViewSet):
    """ViewSet for Board Items."""
    queryset = BoardItem.objects.all()
    serializer_class = BoardItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['board', 'content_type']


class EvidenceConnectionViewSet(viewsets.ModelViewSet):
    """ViewSet for Evidence Connections."""
    queryset = EvidenceConnection.objects.all()
    serializer_class = EvidenceConnectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['board']


class SuspectViewSet(viewsets.ModelViewSet):
    """ViewSet for Suspects."""
    queryset = Suspect.objects.all()
    serializer_class = SuspectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'status', 'arrest_warrant_issued']
    search_fields = ['person__username', 'person__first_name', 'person__last_name']
    ordering = ['-identified_at']


class InterrogationViewSet(viewsets.ModelViewSet):
    """ViewSet for Interrogations."""
    queryset = Interrogation.objects.all()
    serializer_class = InterrogationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['suspect', 'detective', 'sergeant']
    ordering = ['-interrogated_at']


class TipOffViewSet(viewsets.ModelViewSet):
    """ViewSet for Tip-Offs."""
    queryset = TipOff.objects.all()
    serializer_class = TipOffSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['case', 'suspect', 'status', 'submitted_by']
    search_fields = ['redemption_code', 'information']
    ordering = ['-submitted_at']
