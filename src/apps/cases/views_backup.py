"""Views for Case formation and management.
Handles complaint-based and crime scene-based case workflows.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
from apps.accounts.models import Role


def user_has_role(user, role_name):
    """Check if user has a specific role."""
    return user.roles.filter(name=role_name).exists()


def get_user_highest_police_role(user):
    """Get user's highest police role by hierarchy level."""
    return user.roles.filter(is_police_rank=True).order_by('-hierarchy_level').first()


class CrimeLevelViewSet(viewsets.ModelViewSet):
    """ViewSet for managing crime levels."""
    queryset = CrimeLevel.objects.all()
    serializer_class = CrimeLevelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['level']
    ordering = ['level']


class CaseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing cases."""
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'crime_level', 'formation_type']
    search_fields = ['case_number', 'title', 'description']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'create':
            formation_type = self.request.data.get('formation_type')
            if formation_type == Case.FORMATION_CRIME_SCENE:
                return CrimeSceneCaseCreateSerializer
            return CaseCreateSerializer
        return CaseSerializer
    
    @extend_schema(
        summary="Cadet reviews case",
        description="Cadet reviews and approves or rejects a case in cadet review status",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'decision': {
                        'type': 'string',
                        'enum': ['approved', 'rejected'],
                        'description': 'Cadet decision on the case'
                    },
                    'rejection_reason': {
                        'type': 'string',
                        'description': 'Reason for rejection (required if rejected)'
                    }
                },
                'required': ['decision']
            }
        },
        examples=[
            OpenApiExample(
                'Approve Case',
                value={
                    "decision": "approved"
                },
                request_only=True
            ),
            OpenApiExample(
                'Reject Case',
                value={
                    "decision": "rejected",
                    "rejection_reason": "Insufficient evidence provided"
                },
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def cadet_review(self, request, pk=None):
        """Cadet reviews and approves/rejects case."""
        case = self.get_object()
        decision = request.data.get('decision')  # 'approved' or 'rejected'
        rejection_reason = request.data.get('rejection_reason', '')
        
        if case.status != Case.STATUS_CADET_REVIEW:
            return Response(
                {'error': 'Case is not in cadet review status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create review record
        CaseReview.objects.create(
            case=case,
            reviewer=request.user,
            decision=decision,
            rejection_reason=rejection_reason
        )
        
        if decision == 'approved':
            case.status = Case.STATUS_OFFICER_REVIEW
            case.assigned_cadet = request.user
        else:
            case.rejection_count += 1
            if case.rejection_count >= 3:
                case.status = Case.STATUS_REJECTED
            else:
                case.status = Case.STATUS_DRAFT
        
        case.save()
        serializer = self.get_serializer(case)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def officer_review(self, request, pk=None):
        """Police officer reviews and approves/rejects case."""
        case = self.get_object()
        decision = request.data.get('decision')
        rejection_reason = request.data.get('rejection_reason', '')
        
        if case.status != Case.STATUS_OFFICER_REVIEW:
            return Response(
                {'error': 'Case is not in officer review status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        CaseReview.objects.create(
            case=case,
            reviewer=request.user,
            decision=decision,
            rejection_reason=rejection_reason
        )
        
        if decision == 'approved':
            case.status = Case.STATUS_OPEN
            case.assigned_officer = request.user
            from django.utils import timezone
            case.opened_at = timezone.now()
        else:
            # Send back to cadet for re-review
            case.status = Case.STATUS_CADET_REVIEW
        
        case.save()
        serializer = self.get_serializer(case)
        return Response(serializer.data)


class ComplainantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing complainants."""
    queryset = Complainant.objects.all()
    serializer_class = ComplainantSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['case', 'is_primary', 'verified_by_cadet']


class WitnessViewSet(viewsets.ModelViewSet):
    """ViewSet for managing witnesses."""
    queryset = Witness.objects.all()
    serializer_class = WitnessSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['case']
