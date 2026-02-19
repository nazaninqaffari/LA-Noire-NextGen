"""
Trial views - Court proceedings, verdicts, and punishments.
Handles complete trial workflow with case summary review by judge.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import models
from drf_spectacular.utils import extend_schema

from apps.evidence.models import Testimony, BiologicalEvidence, VehicleEvidence
from .models import Trial, Verdict, Punishment, BailPayment


def user_has_role(user, role_name):
    """Check if user has a specific role."""
    return user.roles.filter(name=role_name).exists()


from .serializers import (
    TrialSerializer, VerdictSerializer, PunishmentSerializer,
    BailPaymentSerializer, VerdictWithPunishmentSerializer,
    CaseSummarySerializer
)


class TrialViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Trials (court proceedings).
    Judge reviews complete case file with all evidence and personnel involved.
    
    Workflow:
    1. Create trial for guilty suspect
    2. Judge reviews case summary (all evidence, police members, reports)
    3. Judge delivers verdict (guilty/innocent)
    4. If guilty, judge assigns punishment
    
    Persian: دادگاه و محاکمه
    """
    queryset = Trial.objects.select_related(
        'case', 'suspect', 'suspect__person', 'judge',
        'submitted_by_captain', 'submitted_by_chief'
    ).prefetch_related('suspect__interrogations').all()
    serializer_class = TrialSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'suspect', 'judge', 'status']
    search_fields = ['case__case_number', 'suspect__person__first_name', 'suspect__person__last_name']
    ordering = ['-trial_started_at']
    
    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.roles.filter(name='Judge').exists():
            # Judges see their assigned trials
            return queryset.filter(judge=user)
        elif user.roles.filter(name__in=['Captain', 'Police Chief']).exists():
            # Captains and chiefs see trials they submitted
            return queryset.filter(
                models.Q(submitted_by_captain=user) | models.Q(submitted_by_chief=user)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Set trial status to pending."""
        serializer.save(status=Trial.STATUS_PENDING)
    
    @extend_schema(
        responses={200: CaseSummarySerializer},
        description="""
        Get complete case summary for judge review.
        Includes all evidence, police members involved, interrogations, 
        captain/chief decisions, and all reports.
        
        Persian: دریافت خلاصه کامل پرونده برای قاضی
        
        This endpoint provides:
        - Complete case details
        - Suspect information
        - All police members involved (detective, sergeant, captain, chief)
        - All interrogation records with ratings
        - All evidence (testimonies, biological, vehicle, etc.)
        - Captain and Chief decisions with reasoning
        """,
        tags=['Trial']
    )
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def case_summary(self, request, pk=None):
        """
        Get complete case summary for judge review.
        Persian: خلاصه کامل پرونده
        """
        trial = self.get_object()
        
        # Check permission - judge only
        if request.user != trial.judge and not user_has_role(request.user, 'Judge'):
            return Response(
                {"detail": "فقط قاضی می‌تواند خلاصه پرونده را مشاهده کند."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Gather all case information
        case = trial.case
        suspect = trial.suspect
        
        # Get all police members involved
        police_members = trial.get_involved_police_members()
        
        # Get all interrogations
        interrogations = suspect.interrogations.all()
        
        # Get all evidence
        testimonies = Testimony.objects.filter(case=case)
        biological_evidence = BiologicalEvidence.objects.filter(case=case)
        vehicle_evidence = VehicleEvidence.objects.filter(case=case)
        
        # Build comprehensive summary
        summary_data = {
            'case': case,
            'suspect': suspect,
            'police_members': police_members,
            'interrogations': interrogations,
            'testimonies': testimonies,
            'biological_evidence': biological_evidence,
            'vehicle_evidence': vehicle_evidence,
            'captain_notes': trial.captain_notes,
            'chief_notes': trial.chief_notes,
            'submitted_by_captain': trial.submitted_by_captain,
            'submitted_by_chief': trial.submitted_by_chief,
        }
        
        serializer = CaseSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @extend_schema(
        request=VerdictWithPunishmentSerializer,
        responses={201: VerdictSerializer},
        description="""
        Judge delivers verdict on trial.
        If verdict is guilty, punishment must be provided.
        
        Persian: ثبت حکم قاضی
        
        Example for Guilty Verdict:
        ```json
        {
            "decision": "guilty",
            "reasoning": "با توجه به شواهد موجود، اقرار مظنون، امتیازات بالای بازجویی، و گزارش کارآگاه، متهم مجرم شناخته می‌شود.",
            "punishment_title": "10 سال حبس",
            "punishment_description": "محکومیت به 10 سال حبس در زندان با احتساب ایام بازداشت، بدون امکان آزادی مشروط"
        }
        ```
        
        Example for Innocent Verdict:
        ```json
        {
            "decision": "innocent",
            "reasoning": "شواهد کافی برای محکومیت وجود ندارد و متهم بی‌گناه شناخته می‌شود."
        }
        ```
        """,
        tags=['Trial']
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def deliver_verdict(self, request, pk=None):
        """
        Judge delivers verdict on trial.
        Persian: ثبت حکم نهایی
        """
        trial = self.get_object()
        
        # Check permission - judge assigned to trial only
        if request.user != trial.judge:
            return Response(
                {"detail": "فقط قاضی مسئول این پرونده می‌تواند حکم صادر کند."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already has verdict
        if hasattr(trial, 'verdict'):
            return Response(
                {"detail": "این دادگاه قبلاً حکم دریافت کرده است."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate input
        input_serializer = VerdictWithPunishmentSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        
        data = input_serializer.validated_data
        
        # Create verdict
        verdict = Verdict.objects.create(
            trial=trial,
            decision=data['decision'],
            reasoning=data['reasoning']
        )
        
        # If guilty, create punishment
        if data['decision'] == Verdict.VERDICT_GUILTY:
            Punishment.objects.create(
                verdict=verdict,
                title=data['punishment_title'],
                description=data['punishment_description']
            )
        
        # Update trial status
        trial.status = Trial.STATUS_COMPLETED
        trial.trial_ended_at = timezone.now()
        trial.save()
        
        # Return verdict details
        serializer = VerdictSerializer(verdict)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VerdictViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Verdicts (read-only).
    View final verdicts delivered by judges.
    
    Persian: احکام صادر شده
    """
    queryset = Verdict.objects.select_related(
        'trial', 'trial__case', 'trial__suspect', 'trial__judge'
    ).prefetch_related('punishment').all()
    serializer_class = VerdictSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['trial', 'decision']
    ordering = ['-delivered_at']


class PunishmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Punishments (read-only).
    View punishments assigned to guilty verdicts.
    
    Persian: مجازات‌های تعیین شده
    """
    queryset = Punishment.objects.select_related(
        'verdict', 'verdict__trial'
    ).all()
    serializer_class = PunishmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['verdict']
    ordering = ['-assigned_at']


class BailPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Bail Payments (level 2 and 3 crimes only).
    Suspects can request bail, sergeant approves, then payment is processed.
    
    Workflow:
    1. Suspect requests bail
    2. Sergeant reviews and approves amount
    3. Suspect pays through payment gateway
    4. Upon payment, suspect is released
    
    Persian: پرداخت وثیقه
    """
    queryset = BailPayment.objects.select_related(
        'suspect', 'suspect__person', 'approved_by_sergeant'
    ).all()
    serializer_class = BailPaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['suspect', 'status', 'approved_by_sergeant']
    ordering = ['-requested_at']
    
    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.roles.filter(name='Sergeant').exists():
            # Sergeants see all bail requests
            return queryset
        else:
            # Others see only their own requests
            return queryset.filter(suspect__person=user)
    
    @extend_schema(
        description="""
        Sergeant approves bail amount for suspect.
        Only for level 2 and 3 crimes.
        
        Persian: تایید مبلغ وثیقه توسط گروهبان
        """,
        tags=['Bail Payment']
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """
        Sergeant approves bail payment.
        Persian: تایید وثیقه
        """
        bail = self.get_object()
        
        # Check permission - sergeant only
        if not user_has_role(request.user, 'Sergeant'):
            return Response(
                {"detail": "فقط گروهبان می‌تواند وثیقه را تایید کند."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already approved/paid
        if bail.status != BailPayment.STATUS_PENDING:
            return Response(
                {"detail": "این درخواست قبلاً بررسی شده است."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Approve bail
        bail.status = BailPayment.STATUS_APPROVED
        bail.approved_by_sergeant = request.user
        bail.approved_at = timezone.now()
        bail.save()
        
        serializer = self.get_serializer(bail)
        return Response(serializer.data)
    
    @extend_schema(
        description="""
        Process bail payment (payment gateway integration).
        When payment is confirmed, suspect is released.
        
        Persian: پرداخت وثیقه
        """,
        tags=['Bail Payment']
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def pay(self, request, pk=None):
        """
        Process bail payment.
        Persian: پرداخت وثیقه
        """
        bail = self.get_object()
        
        # Check permission - suspect themselves
        if request.user != bail.suspect.person:
            return Response(
                {"detail": "فقط خود مظنون می‌تواند وثیقه را پرداخت کند."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if approved
        if bail.status != BailPayment.STATUS_APPROVED:
            return Response(
                {"detail": "وثیقه هنوز تایید نشده است."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Simulate payment processing (in real app, integrate with payment gateway)
        payment_reference = f"PAY-{bail.id}-{timezone.now().timestamp()}"
        
        bail.status = BailPayment.STATUS_PAID
        bail.payment_reference = payment_reference
        bail.paid_at = timezone.now()
        bail.save()
        
        serializer = self.get_serializer(bail)
        return Response(serializer.data)

