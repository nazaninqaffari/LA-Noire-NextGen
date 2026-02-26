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
        """Set trial status to pending.
        
        IMPORTANT: Trial creation should only happen after captain/chief approval.
        The initial status is always PENDING until a judge reviews the case.
        """
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
                {"detail": "Only the assigned judge can view the case summary."},
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
                {"detail": "Only the judge assigned to this case can deliver the verdict."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already has verdict
        if hasattr(trial, 'verdict'):
            return Response(
                {"detail": "This trial has already received a verdict."},
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
    Suspects can request bail, sergeant approves (required for level 3),
    then payment is processed via Zarinpal payment gateway.
    
    Workflow:
    1. Suspect requests bail
    2. Level 2: auto-approved / Level 3: sergeant must approve
    3. Suspect pays through Zarinpal payment gateway
    4. Upon payment, suspect status changes to cleared (released)
    
    Persian: پرداخت وثیقه
    """
    queryset = BailPayment.objects.select_related(
        'suspect', 'suspect__person', 'suspect__case',
        'suspect__case__crime_level', 'approved_by_sergeant'
    ).all()
    serializer_class = BailPaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['suspect', 'status', 'approved_by_sergeant']
    ordering = ['-requested_at']
    
    def get_queryset(self):
        """All authenticated users can see bail payments."""
        return super().get_queryset()
    
    def create(self, request, *args, **kwargs):
        """
        Any authenticated user can request bail.
        Citizens/suspects request bail for their case,
        and police officers can also issue bail requests.
        """
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        Auto-approve level 2 bail requests.
        Level 3 requires sergeant approval.
        """
        bail = serializer.save()
        crime_level = bail.suspect.case.crime_level.level
        if crime_level == 2:
            # Level 2: auto-approve, no sergeant needed
            bail.status = BailPayment.STATUS_APPROVED
            bail.approved_at = timezone.now()
            bail.save(update_fields=['status', 'approved_at'])
    
    @extend_schema(
        description="""
        Sergeant approves bail amount for suspect.
        Only for level 3 crimes (level 2 is auto-approved).
        
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
                {"detail": "Only a sergeant can approve bail."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already approved/paid
        if bail.status != BailPayment.STATUS_PENDING:
            return Response(
                {"detail": "This request has already been reviewed."},
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
        Initiate bail payment via Zarinpal payment gateway.
        Returns a redirect URL to send the user to Zarinpal for payment.
        
        Persian: شروع پرداخت وثیقه از طریق زرین‌پال
        """,
        tags=['Bail Payment']
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def pay(self, request, pk=None):
        """
        Initiate bail payment via Zarinpal.
        Returns redirect URL for payment gateway.
        """
        import requests as http_requests
        from django.conf import settings as django_settings
        
        bail = self.get_object()
        
        # Check permission - suspect themselves or any authenticated user
        # (a citizen/family member paying on behalf)
        if request.user != bail.suspect.person and not request.user.roles.filter(
            name__in=['Sergeant', 'Captain', 'Police Chief']
        ).exists():
            return Response(
                {"detail": "Only the suspect or their family can pay bail."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if approved
        if bail.status != BailPayment.STATUS_APPROVED:
            return Response(
                {"detail": "Bail has not been approved yet."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Call Zarinpal payment request API
        callback_url = f"{django_settings.ZARINPAL_CALLBACK_URL}?bail_id={bail.id}"
        payload = {
            "merchant_id": django_settings.ZARINPAL_MERCHANT_ID,
            "amount": int(bail.amount),
            "callback_url": callback_url,
            "description": f"Bail payment for suspect in case {bail.suspect.case.case_number}",
            "metadata": {
                "mobile": "09999813456",
                "email": "alef@gmail.com",
                "order_id": str(bail.id),
            }
        }
        
        try:
            response = http_requests.post(
                django_settings.ZARINPAL_REQUEST_URL,
                json=payload,
                headers={'accept': 'application/json', 'content-type': 'application/json'},
                timeout=30
            )
            result = response.json()
            
            if result.get('data', {}).get('code') == 100:
                authority = result['data']['authority']
                # Store authority in payment_reference for later verification
                bail.payment_reference = authority
                bail.save(update_fields=['payment_reference'])
                
                redirect_url = f"{django_settings.ZARINPAL_STARTPAY_URL}{authority}"
                return Response({
                    "redirect_url": redirect_url,
                    "authority": authority,
                })
            else:
                errors = result.get('errors', [])
                return Response(
                    {"detail": f"Payment gateway error: {errors}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )
        except http_requests.RequestException as e:
            return Response(
                {"detail": f"Payment gateway connection failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )
    
    @extend_schema(
        description="""
        Verify Zarinpal payment after user returns from gateway.
        Called by frontend with Authority from URL query params.
        
        Persian: تایید پرداخت زرین‌پال
        """,
        tags=['Bail Payment']
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_payment(self, request):
        """
        Verify Zarinpal payment callback.
        Expects: { authority: string, status: string ('OK'|'NOK') }
        """
        import requests as http_requests
        from django.conf import settings as django_settings
        
        authority = request.data.get('authority')
        payment_status = request.data.get('status', '')  # 'OK' or 'NOK'
        
        if not authority:
            return Response(
                {"detail": "authority is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the bail payment by stored authority
        try:
            bail = BailPayment.objects.select_related(
                'suspect', 'suspect__person', 'suspect__case'
            ).get(payment_reference=authority)
        except BailPayment.DoesNotExist:
            return Response(
                {"detail": "Invalid authority code"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if payment_status != 'OK':
            return Response({
                "detail": "Payment was cancelled or failed",
                "bail_id": bail.id,
                "status": "failed"
            })
        
        # Already paid? (idempotency)
        if bail.status == BailPayment.STATUS_PAID:
            serializer = self.get_serializer(bail)
            return Response({
                "detail": "Payment already verified",
                "bail": serializer.data,
                "status": "already_paid"
            })
        
        # Call Zarinpal verify API
        payload = {
            "merchant_id": django_settings.ZARINPAL_MERCHANT_ID,
            "amount": int(bail.amount),
            "authority": authority,
        }
        
        try:
            response = http_requests.post(
                django_settings.ZARINPAL_VERIFY_URL,
                json=payload,
                headers={'accept': 'application/json', 'content-type': 'application/json'},
                timeout=30
            )
            result = response.json()
            
            code = result.get('data', {}).get('code')
            if code in (100, 101):
                ref_id = result['data'].get('ref_id', '')
                
                # Mark bail as paid
                bail.status = BailPayment.STATUS_PAID
                bail.payment_reference = f"ZP-{ref_id}"
                bail.paid_at = timezone.now()
                bail.save(update_fields=['status', 'payment_reference', 'paid_at'])
                
                # Release suspect - change status to cleared
                suspect = bail.suspect
                suspect.status = 'cleared'
                suspect.save(update_fields=['status'])
                
                serializer = self.get_serializer(bail)
                return Response({
                    "detail": "Payment verified successfully. Suspect released.",
                    "ref_id": ref_id,
                    "bail": serializer.data,
                    "status": "success"
                })
            else:
                return Response({
                    "detail": "Payment verification failed",
                    "bail_id": bail.id,
                    "status": "failed"
                })
        except http_requests.RequestException as e:
            return Response(
                {"detail": f"Verification connection failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )


