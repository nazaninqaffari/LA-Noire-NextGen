"""Views for Case formation and management.
Handles complaint-based and crime scene-based case workflows.
"""
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from django.utils import timezone
from django.db import transaction
from .models import CrimeLevel, Case, Complainant, Witness, CaseReview
from .serializers import (
    CrimeLevelSerializer, CaseSerializer, CaseCreateSerializer,
    CrimeSceneCaseCreateSerializer, ComplainantSerializer,
    WitnessSerializer, CaseReviewSerializer, CaseReviewActionSerializer,
    ComplainantAddSerializer, ComplainantVerificationSerializer
)
from apps.accounts.models import Role, User


def user_has_role(user, role_name):
    """Check if user has a specific role."""
    return user.roles.filter(name=role_name).exists()


def get_user_highest_police_role(user):
    """Get user's highest police role by hierarchy level."""
    return user.roles.filter(is_police_rank=True).order_by('-hierarchy_level').first()


class PublicStatsView(views.APIView):
    """Public endpoint returning case statistics without authentication."""
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Public case statistics",
        description="Returns aggregate case counts. No authentication required.",
        responses={
            200: OpenApiExample(
                'Stats',
                value={
                    'total_cases': 42,
                    'active_cases': 15,
                    'solved_cases': 20,
                },
                response_only=True
            )
        }
    )
    def get(self, request):
        total = Case.objects.count()
        solved = Case.objects.filter(status=Case.STATUS_CLOSED).count()
        active = total - solved - Case.objects.filter(
            status__in=[Case.STATUS_REJECTED, Case.STATUS_DRAFT]
        ).count()
        return Response({
            'total_cases': total,
            'active_cases': max(active, 0),
            'solved_cases': solved,
        })


class CrimeLevelViewSet(viewsets.ModelViewSet):
    """ViewSet for managing crime levels."""
    queryset = CrimeLevel.objects.all()
    serializer_class = CrimeLevelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['level']
    ordering = ['level']
    
    @extend_schema(
        summary="List crime levels",
        description="Get all crime severity levels (Level 3, 2, 1, Critical)"
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cases.
    Handles both complaint-based and crime scene-based case workflows.
    """
    queryset = Case.objects.all().select_related(
        'crime_level', 'created_by', 'assigned_cadet',
        'assigned_officer', 'assigned_detective', 'assigned_sergeant'
    ).prefetch_related(
        'complainants__user', 'witnesses', 'reviews__reviewer'
    )
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'crime_level', 'formation_type', 'created_by']
    search_fields = ['case_number', 'title', 'description']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins see all cases
        if user_has_role(user, 'Administrator'):
            return queryset
        
        # Police Chief sees all cases
        if user_has_role(user, 'Police Chief'):
            return queryset
        
        # Captain sees all cases (oversees interrogations, creates trials)
        if user_has_role(user, 'Captain'):
            return queryset
        
        # Cadets see cases in cadet review, cases they've been assigned to, and reviewed cases
        if user_has_role(user, 'Cadet'):
            return (queryset.filter(
                status__in=[Case.STATUS_CADET_REVIEW, Case.STATUS_OFFICER_REVIEW, Case.STATUS_DRAFT]
            ) | queryset.filter(assigned_cadet=user) | queryset.filter(created_by=user)).distinct()
        
        # Detectives see cases assigned to them at any stage, plus open cases
        if user_has_role(user, 'Detective'):
            return (queryset.filter(
                status__in=[
                    Case.STATUS_OPEN,
                    Case.STATUS_UNDER_INVESTIGATION,
                    Case.STATUS_SUSPECTS_IDENTIFIED,
                    Case.STATUS_ARREST_APPROVED,
                    Case.STATUS_INTERROGATION,
                    Case.STATUS_TRIAL_PENDING,
                ]
            ) | queryset.filter(assigned_detective=user) | queryset.filter(created_by=user)).distinct()
        
        # Sergeants see cases they're assigned to plus relevant statuses
        if user_has_role(user, 'Sergeant'):
            return (queryset.filter(
                status__in=[
                    Case.STATUS_OPEN,
                    Case.STATUS_UNDER_INVESTIGATION,
                    Case.STATUS_SUSPECTS_IDENTIFIED,
                    Case.STATUS_ARREST_APPROVED,
                    Case.STATUS_INTERROGATION,
                ]
            ) | queryset.filter(assigned_sergeant=user) | queryset.filter(created_by=user)).distinct()
        
        # Officers see cases in officer review, assigned to them, or that they created
        police_roles = user.roles.filter(is_police_rank=True).exclude(name='Cadet')
        if police_roles.exists():
            return (queryset.filter(
                status__in=[Case.STATUS_OFFICER_REVIEW, Case.STATUS_OPEN]
            ) | queryset.filter(assigned_officer=user) | queryset.filter(created_by=user)).distinct()
        
        # Regular users see their own cases
        return queryset.filter(created_by=user)
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'create':
            # Check if request has crime scene fields
            has_crime_scene_fields = ('crime_scene_location' in self.request.data or 
                                     'crime_scene_datetime' in self.request.data)
            
            # Check if user is police (excluding Cadet)
            is_police = self.request.user.roles.filter(
                is_police_rank=True
            ).exclude(name='Cadet').exists()
            
            # If crime scene fields present, use crime scene serializer
            # (validation will check if user is police)
            if has_crime_scene_fields:
                return CrimeSceneCaseCreateSerializer
            
            # Otherwise use complaint serializer
            return CaseCreateSerializer
        return CaseSerializer
    
    @extend_schema(
        summary="Create new case via complaint",
        description="""Create a new case by filing a complaint.
        
        **Workflow:**
        1. Complainant submits case with statement
        2. Case goes to Cadet for review
        3. If approved by Cadet, goes to Officer for final approval
        4. If approved by Officer, case opens for investigation
        
        **Note:** Police officers should use crime scene formation instead.
        """,
        request=CaseCreateSerializer,
        responses={201: CaseSerializer},
        examples=[
            OpenApiExample(
                'Complaint Case',
                value={
                    "title": "Stolen Vehicle - 1947 Buick Roadmaster",
                    "description": "My car was stolen from 5th Street parking lot between 2-4 PM today",
                    "crime_level": 2,
                    "complainant_statement": "I parked my vehicle at 2 PM and returned at 4 PM to find it missing. The vehicle is a blue 1947 Buick Roadmaster with license plate CA-4567."
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Create case and return full case details."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        
        # Return full case details using CaseSerializer
        response_serializer = CaseSerializer(case, context={'request': request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_update(self, serializer):
        """Only allow updates to cases in draft status by the original creator.
        Administrators can update any case regardless of status (e.g., assign detective).
        """
        case = self.get_object()
        user = self.request.user
        # Admins can always update (e.g., to assign detective/sergeant)
        if user_has_role(user, 'Administrator'):
            serializer.save()
            return
        if case.status != Case.STATUS_DRAFT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only cases in draft status can be edited.')
        if case.created_by != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the case creator can edit this case.')
        serializer.save()

    @extend_schema(
        summary="Resubmit a draft case for review",
        description="""Resubmit a case that was rejected back to draft.
        The complainant (case creator) can call this after editing the case
        to send it back to cadet_review. Only works for cases in draft status.
        The same cadet who previously reviewed it will see it again.
        """,
        request=None,
        responses={
            200: CaseSerializer,
            400: {"description": "Case not in draft status or max rejections reached"},
            403: {"description": "User is not the case creator"}
        },
        examples=[
            OpenApiExample(
                'Resubmit Case',
                value={"message": "Case resubmitted for review"},
                response_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        """Resubmit a draft case back to cadet_review after editing."""
        case = self.get_object()
        user = request.user

        # Only the case creator (complainant) can resubmit
        if case.created_by != user:
            return Response(
                {'error': 'Only the case creator can resubmit.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if case.status != Case.STATUS_DRAFT:
            return Response(
                {'error': 'Only cases in draft status can be resubmitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if case.rejection_count >= 3:
            return Response(
                {'error': 'This case has been permanently rejected after 3 failed submissions.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Move case back to cadet_review
        case.status = Case.STATUS_CADET_REVIEW
        case.save()

        response_serializer = self.get_serializer(case)
        return Response(response_serializer.data)
    
    @extend_schema(
        summary="Cadet reviews case",
        description="""Cadet reviews and approves or rejects a case in cadet review status.
        
        **Workflow:**
        - If approved: Case moves to officer review
        - If rejected: Case returns to complainant (if < 3 attempts) or gets rejected permanently
        - Rejection count increments on each rejection
        - After 3 rejections, case is permanently rejected
        """,
        request=CaseReviewActionSerializer,
        responses={
            200: CaseSerializer,
            400: {"description": "Case not in cadet review status or validation error"},
            403: {"description": "User is not a Cadet"}
        },
        examples=[
            OpenApiExample(
                'Approve Case',
                value={"decision": "approved"},
                request_only=True
            ),
            OpenApiExample(
                'Reject Case',
                value={
                    "decision": "rejected",
                    "rejection_reason": "Missing witness contact information. Please provide phone numbers for all witnesses mentioned."
                },
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def cadet_review(self, request, pk=None):
        """Cadet reviews and approves/rejects case."""
        # Check if user is cadet
        if not user_has_role(request.user, 'Cadet'):
            return Response(
                {'error': 'Only Cadets can review cases in cadet review status'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        serializer = CaseReviewActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        decision = serializer.validated_data['decision']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')
        
        if case.status != Case.STATUS_CADET_REVIEW:
            # Provide clear, contextual error about why review can't proceed
            current = case.get_status_display()
            if case.status == Case.STATUS_OFFICER_REVIEW:
                msg = f'This case has already passed cadet review and is now in officer review stage.'
            elif case.status == Case.STATUS_OPEN:
                msg = f'This case is already open for investigation — it has been fully approved.'
            elif case.status == Case.STATUS_REJECTED:
                msg = f'This case has been permanently rejected after {case.rejection_count} failed review(s).'
            elif case.status == Case.STATUS_DRAFT:
                msg = f'This case is a draft and has not been submitted for cadet review yet.'
            else:
                msg = f'This case is currently in "{current}" status and cannot be reviewed by a cadet.'
            return Response(
                {'error': msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create review record
        with transaction.atomic():
            CaseReview.objects.create(
                case=case,
                reviewer=request.user,
                decision=decision,
                rejection_reason=rejection_reason
            )
            
            if decision == 'approved':
                # Move to officer review
                case.status = Case.STATUS_OFFICER_REVIEW
                case.assigned_cadet = request.user
            else:
                # Rejection
                case.rejection_count += 1
                if case.rejection_count >= 3:
                    # Permanently rejected after 3 attempts
                    case.status = Case.STATUS_REJECTED
                else:
                    # Return to complainant for corrections
                    case.status = Case.STATUS_DRAFT
            
            case.save()
        
        response_serializer = self.get_serializer(case)
        return Response(response_serializer.data)
    
    @extend_schema(
        summary="Officer reviews case",
        description="""Police officer reviews and approves or rejects a case.
        
        **For complaint cases:**
        - If approved: Case opens for investigation
        - If rejected: Case returns to Cadet for re-review (not directly to complainant)
        
        **For crime scene cases:**
        - If approved: Case opens for investigation
        - If rejected: Case returns to reporting officer with rejection reason
        
        **Note:** Police Chief's reports are auto-approved.
        """,
        request=CaseReviewActionSerializer,
        responses={
            200: CaseSerializer,
            400: {"description": "Case not in officer review status"},
            403: {"description": "User is not a Police Officer or higher"}
        },
        examples=[
            OpenApiExample(
                'Approve Case',
                value={"decision": "approved"},
                request_only=True
            ),
            OpenApiExample(
                'Reject Case',
                value={
                    "decision": "rejected",
                    "rejection_reason": "Crime scene location is not specific enough. Please provide exact address."
                },
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def officer_review(self, request, pk=None):
        """Police officer reviews and approves/rejects case."""
        # Check if user is officer or higher (not cadet)
        police_roles = request.user.roles.filter(is_police_rank=True).exclude(name='Cadet')
        if not police_roles.exists():
            return Response(
                {'error': 'Only Police Officers or higher can review cases in officer review status'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        serializer = CaseReviewActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        decision = serializer.validated_data['decision']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')
        
        if case.status != Case.STATUS_OFFICER_REVIEW:
            # Provide clear, contextual error about why review can't proceed
            current = case.get_status_display()
            if case.status == Case.STATUS_CADET_REVIEW:
                msg = f'This case is still awaiting cadet review and has not reached the officer review stage yet.'
            elif case.status == Case.STATUS_OPEN:
                msg = f'This case is already open for investigation — it has been fully approved.'
            elif case.status == Case.STATUS_REJECTED:
                msg = f'This case has been permanently rejected after {case.rejection_count} failed review(s).'
            elif case.status == Case.STATUS_DRAFT:
                msg = f'This case is a draft and must pass cadet review before officer review.'
            else:
                msg = f'This case is currently in "{current}" status and cannot be reviewed by an officer.'
            return Response(
                {'error': msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create review record
        with transaction.atomic():
            CaseReview.objects.create(
                case=case,
                reviewer=request.user,
                decision=decision,
                rejection_reason=rejection_reason
            )
            
            if decision == 'approved':
                # Case approved - open for investigation
                case.status = Case.STATUS_OPEN
                case.assigned_officer = request.user
                case.opened_at = timezone.now()
            else:
                # Rejection logic depends on formation type
                if case.formation_type == Case.FORMATION_COMPLAINT:
                    # Send back to cadet for re-review (not directly to complainant)
                    case.status = Case.STATUS_CADET_REVIEW
                else:
                    # Crime scene case - return to reporting officer
                    case.status = Case.STATUS_DRAFT
            
            case.save()
        
        response_serializer = self.get_serializer(case)
        return Response(response_serializer.data)
    
    @extend_schema(
        summary="Add additional complainant",
        description="""Add an additional complainant to a case.
        
        Only Cadets can add additional complainants during case review.
        Complainant must be verified by Cadet before case approval.
        """,
        request=ComplainantAddSerializer,
        responses={
            201: ComplainantSerializer,
            400: {"description": "Validation error or case not in valid status"},
            403: {"description": "User is not a Cadet"}
        },
        examples=[
            OpenApiExample(
                'Add Complainant',
                value={
                    "user_id": 5,
                    "statement": "I also witnessed the theft and can confirm the vehicle description provided by the primary complainant."
                },
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def add_complainant(self, request, pk=None):
        """Add additional complainant to case (Cadet only)."""
        if not user_has_role(request.user, 'Cadet'):
            return Response(
                {'error': 'Only Cadets can add complainants to cases'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        serializer = ComplainantAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = serializer.validated_data['user_id']
        statement = serializer.validated_data['statement']
        
        # Check if case is in a valid status for adding complainants
        if case.status not in [Case.STATUS_CADET_REVIEW, Case.STATUS_OFFICER_REVIEW]:
            return Response(
                {'error': 'Can only add complainants to cases in review status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is already a complainant
        if case.complainants.filter(user_id=user_id).exists():
            return Response(
                {'error': 'User is already a complainant on this case'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create complainant
        complainant = Complainant.objects.create(
            case=case,
            user_id=user_id,
            statement=statement,
            is_primary=False,
            verified_by_cadet=False
        )
        
        complainant_serializer = ComplainantSerializer(complainant)
        return Response(complainant_serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        summary="Verify complainant",
        description="""Verify an additional complainant's information.
        
        Cadet must verify all additional complainants before approving case.
        """,
        request=ComplainantVerificationSerializer,
        responses={
            200: ComplainantSerializer,
            403: {"description": "User is not a Cadet"}
        },
        examples=[
            OpenApiExample(
                'Verify Complainant',
                value={
                    "verified": True,
                    "notes": "Verified national ID and contact information"
                },
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'], url_path='complainants/(?P<complainant_id>[^/.]+)/verify')
    def verify_complainant(self, request, pk=None, complainant_id=None):
        """Verify complainant information (Cadet only)."""
        if not user_has_role(request.user, 'Cadet'):
            return Response(
                {'error': 'Only Cadets can verify complainants'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        serializer = ComplainantVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            complainant = case.complainants.get(id=complainant_id)
        except Complainant.DoesNotExist:
            return Response(
                {'error': 'Complainant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        complainant.verified_by_cadet = serializer.validated_data['verified']
        complainant.save()
        
        complainant_serializer = ComplainantSerializer(complainant)
        return Response(complainant_serializer.data)


class ComplainantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing complainants."""
    queryset = Complainant.objects.all().select_related('case', 'user')
    serializer_class = ComplainantSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['case', 'is_primary', 'verified_by_cadet']
    
    @extend_schema(
        summary="List complainants",
        description="Get all complainants, optionally filtered by case"
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class WitnessViewSet(viewsets.ModelViewSet):
    """ViewSet for managing witnesses."""
    queryset = Witness.objects.all().select_related('case', 'user', 'added_by')
    serializer_class = WitnessSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['case']
    
    def perform_create(self, serializer):
        """Set added_by to current user."""
        serializer.save(added_by=self.request.user)
    
    @extend_schema(
        summary="List witnesses",
        description="Get all witnesses for cases"
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class CaseReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing case review history."""
    queryset = CaseReview.objects.all().select_related('case', 'reviewer')
    serializer_class = CaseReviewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['case', 'reviewer', 'decision']
    ordering = ['-reviewed_at']
    
    @extend_schema(
        summary="List case reviews",
        description="Get review history for cases"
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
