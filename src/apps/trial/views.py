from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import Trial, Verdict, Punishment, BailPayment
from .serializers import TrialSerializer, VerdictSerializer, PunishmentSerializer, BailPaymentSerializer


class TrialViewSet(viewsets.ModelViewSet):
    """ViewSet for Trials."""
    queryset = Trial.objects.all()
    serializer_class = TrialSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['case', 'suspect', 'judge']
    ordering = ['-trial_started_at']


class VerdictViewSet(viewsets.ModelViewSet):
    """ViewSet for Verdicts."""
    queryset = Verdict.objects.all()
    serializer_class = VerdictSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['trial', 'decision']
    ordering = ['-delivered_at']


class PunishmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Punishments."""
    queryset = Punishment.objects.all()
    serializer_class = PunishmentSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-assigned_at']


class BailPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for Bail Payments."""
    queryset = BailPayment.objects.all()
    serializer_class = BailPaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['suspect', 'status', 'approved_by_sergeant']
    ordering = ['-requested_at']
