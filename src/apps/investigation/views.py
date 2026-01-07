"""
Investigation views - Detective boards, suspect submissions, and notifications.
Handles case resolution workflow with detective-sergeant approval process.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter

from apps.cases.models import Case
from .models import (
    DetectiveBoard, BoardItem, EvidenceConnection, Suspect,
    Interrogation, TipOff, SuspectSubmission, Notification
)
from .serializers import (
    DetectiveBoardSerializer, BoardItemSerializer, EvidenceConnectionSerializer,
    SuspectSerializer, InterrogationSerializer, TipOffSerializer,
    SuspectSubmissionSerializer, SuspectSubmissionReviewSerializer,
    NotificationSerializer, NotificationMarkReadSerializer
)


def user_has_role(user, role_name):
    """Helper to check if user has a specific role."""
    return user.roles.filter(name=role_name).exists()


class DetectiveBoardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Detective Investigation Boards.
    Detectives create boards to organize evidence and build case theories.
    
    Persian: تخته کارآگاه - سازماندهی شواهد و مدارک
    """
    queryset = DetectiveBoard.objects.select_related('case', 'detective').all()
    serializer_class = DetectiveBoardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['case', 'detective']

    def get_queryset(self):
        """Filter boards based on user role."""
        user = self.request.user
        queryset = self.queryset
        
        # Detectives see their own boards
        if user_has_role(user, 'Detective'):
            queryset = queryset.filter(detective=user)
        # Sergeants and admins see all boards
        elif not (user_has_role(user, 'Sergeant') or user_has_role(user, 'Administrator')):
            queryset = queryset.none()
        
        return queryset

    def perform_create(self, serializer):
        """Automatically set detective to current user."""
        serializer.save(detective=self.request.user)

    @extend_schema(
        summary="Create detective investigation board",
        description="کارآگاه یک تخته تحقیقاتی برای یک پرونده ایجاد می‌کند",
        examples=[
            OpenApiExample(
                'Create Board',
                value={
                    'case': 1
                },
                request_only=True
            ),
        ]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)


class BoardItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Board Items - evidence placed on detective boards.
    Stores visual position coordinates for frontend layout.
    
    Persian: قرار دادن شواهد روی تخته کارآگاه
    """
    queryset = BoardItem.objects.select_related('board').all()
    serializer_class = BoardItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['board', 'content_type']

    @extend_schema(
        summary="Place evidence on board",
        description="کارآگاه شواهد را روی تخته قرار می‌دهد",
        examples=[
            OpenApiExample(
                'Add Testimony to Board',
                value={
                    'board': 1,
                    'content_type': 'testimony',
                    'object_id': 5,
                    'position_x': 100.5,
                    'position_y': 200.3
                },
                request_only=True
            ),
        ]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)


class EvidenceConnectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Evidence Connections - red lines between related evidence.
    Represents detective's reasoning about relationships.
    
    Persian: اتصال شواهد با خط قرمز
    """
    queryset = EvidenceConnection.objects.select_related('board', 'from_item', 'to_item').all()
    serializer_class = EvidenceConnectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['board']

    @extend_schema(
        summary="Connect related evidence",
        description="کارآگاه شواهد مرتبط را با خط قرمز به هم وصل می‌کند",
        examples=[
            OpenApiExample(
                'Connect Evidence Items',
                value={
                    'board': 1,
                    'from_item': 3,
                    'to_item': 7,
                    'notes': 'این شهادت با شواهد زیستی مطابقت دارد'
                },
                request_only=True
            ),
        ]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)


class SuspectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Suspects in cases.
    Tracks suspect status, danger scores, and rewards.
    
    Persian: مظنونین
    """
    queryset = Suspect.objects.select_related('case', 'person', 'identified_by_detective').all()
    serializer_class = SuspectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['case', 'status', 'arrest_warrant_issued']
    search_fields = ['person__username', 'person__first_name', 'person__last_name']
    ordering = ['-identified_at']

    @extend_schema(
        summary="Add suspect to case",
        description="اضافه کردن مظنون به پرونده",
        examples=[
            OpenApiExample(
                'Identify Suspect',
                value={
                    'case': 1,
                    'person': 15,
                    'reason': 'شواهد بیولوژیکی با این فرد مطابقت دارد. شهود او را در صحنه جرم دیده‌اند.'
                },
                request_only=True
            ),
        ]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)


class InterrogationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Interrogations of suspects.
    Detective and sergeant both provide guilt ratings.
    
    Persian: بازجویی از مظنونین
    """
    queryset = Interrogation.objects.select_related('suspect', 'detective', 'sergeant').all()
    serializer_class = InterrogationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['suspect', 'detective', 'sergeant']
    ordering = ['-interrogated_at']


class TipOffViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Public Tip-Offs about cases.
    Goes through officer and detective review process.
    
    Persian: اخبار عمومی درباره پرونده‌ها
    """
    queryset = TipOff.objects.select_related('case', 'suspect', 'submitted_by').all()
    serializer_class = TipOffSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['case', 'suspect', 'status', 'submitted_by']
    search_fields = ['redemption_code', 'information']
    ordering = ['-submitted_at']


class SuspectSubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Suspect Submissions - detective proposes suspects to sergeant.
    Implements case resolution workflow where detective identifies main suspects
    and sergeant reviews evidence before approving arrests.
    
    Workflow:
    1. Detective creates submission with suspects and reasoning
    2. Sergeant receives notification
    3. Sergeant reviews and approves/rejects via /review/ action
    4. Detective receives notification of decision
    5. If approved, case status changes and arrests begin
    
    Persian: ارسال مظنونین برای تایید گروهبان
    """
    queryset = SuspectSubmission.objects.select_related(
        'case', 'detective', 'reviewed_by'
    ).prefetch_related('suspects').all()
    serializer_class = SuspectSubmissionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['case', 'detective', 'status']
    ordering = ['-submitted_at']

    def get_queryset(self):
        """
        Filter submissions based on user role:
        - Detectives see their own submissions
        - Sergeants see pending submissions for review
        - Admins see all submissions
        """
        user = self.request.user
        queryset = self.queryset
        
        if user_has_role(user, 'Detective'):
            queryset = queryset.filter(detective=user)
        elif user_has_role(user, 'Sergeant'):
            # Sergeants see all submissions (to review cases in their jurisdiction)
            pass
        elif not user_has_role(user, 'Administrator'):
            queryset = queryset.none()
        
        return queryset

    def perform_create(self, serializer):
        """
        Create submission and notify sergeant.
        Automatically sets detective to current user.
        """
        submission = serializer.save(detective=self.request.user)
        
        # Update case status
        case = submission.case
        case.status = Case.STATUS_SUSPECTS_IDENTIFIED
        case.save(update_fields=['status'])
        
        # Find sergeant to notify (simplified - get any sergeant)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        sergeants = User.objects.filter(roles__name='Sergeant')
        
        # Notify all sergeants (or you could assign specific sergeant to case)
        for sergeant in sergeants:
            Notification.create_submission_notification(submission, sergeant)

    @extend_schema(
        summary="Submit suspects for sergeant approval",
        description="کارآگاه مظنونین اصلی را شناسایی کرده و برای تایید به گروهبان ارسال می‌کند",
        examples=[
            OpenApiExample(
                'Submit Suspects',
                value={
                    'case': 1,
                    'suspects': [3, 7, 12],
                    'reasoning': 'بر اساس شواهد بیولوژیکی و شهادت شهود، این سه نفر در صحنه جرم حضور داشتند. '
                                'شواهد خودرو و مدارک شناسایی نیز با این افراد مطابقت دارد.'
                },
                request_only=True
            ),
        ]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Review suspect submission (Sergeant only)",
        description="گروهبان مظنونین را بررسی کرده و تایید یا رد می‌کند",
        request=SuspectSubmissionReviewSerializer,
        examples=[
            OpenApiExample(
                'Approve Submission',
                value={
                    'decision': 'approve',
                    'review_notes': 'شواهد کافی است. دستگیری مظنونین تایید شد.'
                },
                request_only=True
            ),
            OpenApiExample(
                'Reject Submission',
                value={
                    'decision': 'reject',
                    'review_notes': 'شواهد کافی نیست. نیاز به تحقیقات بیشتر دارد.'
                },
                request_only=True
            ),
        ]
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def review(self, request, pk=None):
        """
        Sergeant reviews and approves/rejects suspect submission.
        
        Requires: Sergeant role
        Body: {decision: 'approve'|'reject', review_notes: 'text'}
        """
        # Check sergeant role
        if not user_has_role(request.user, 'Sergeant'):
            return Response(
                {'error': 'فقط گروهبان می‌تواند این درخواست را بررسی کند.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        submission = self.get_object()
        
        # Check if already reviewed
        if submission.status != SuspectSubmission.STATUS_PENDING:
            return Response(
                {'error': 'این درخواست قبلاً بررسی شده است.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SuspectSubmissionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        decision = serializer.validated_data['decision']
        review_notes = serializer.validated_data['review_notes']
        
        # Update submission
        submission.reviewed_by = request.user
        submission.reviewed_at = timezone.now()
        submission.review_notes = review_notes
        
        if decision == 'approve':
            submission.status = SuspectSubmission.STATUS_APPROVED
            
            # Update case status
            case = submission.case
            case.status = Case.STATUS_ARREST_APPROVED
            case.save(update_fields=['status'])
            
            # Update suspects - issue arrest warrants
            for suspect in submission.suspects.all():
                suspect.approved_by_sergeant = request.user
                suspect.sergeant_approval_message = review_notes
                suspect.arrest_warrant_issued = True
                suspect.save(update_fields=[
                    'approved_by_sergeant', 'sergeant_approval_message', 'arrest_warrant_issued'
                ])
            
            # Notify detective of approval
            Notification.create_approval_notification(submission)
            
            message = 'دستگیری مظنونین تایید شد.'
        else:
            submission.status = SuspectSubmission.STATUS_REJECTED
            
            # Case remains open for investigation
            case = submission.case
            case.status = Case.STATUS_UNDER_INVESTIGATION
            case.save(update_fields=['status'])
            
            # Notify detective of rejection
            Notification.create_rejection_notification(submission)
            
            message = 'درخواست رد شد. پرونده همچنان باز است.'
        
        submission.save()
        
        return Response({
            'status': submission.status,
            'message': message,
            'review_notes': review_notes
        })


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for System Notifications.
    Handles all user notifications including new evidence, submissions, approvals.
    
    Features:
    - List user's notifications (unread first)
    - Mark single or multiple notifications as read
    - Filter by read/unread status
    - Filter by notification type
    
    Persian: اعلان‌های سیستم
    """
    queryset = Notification.objects.select_related('recipient', 'related_case').all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['notification_type', 'is_read', 'related_case']
    ordering = ['-created_at']

    def get_queryset(self):
        """Users only see their own notifications."""
        return self.queryset.filter(recipient=self.request.user)

    @extend_schema(
        summary="Mark notifications as read",
        description="علامت‌گذاری اعلان‌ها به عنوان خوانده شده",
        request=NotificationMarkReadSerializer,
        examples=[
            OpenApiExample(
                'Mark Specific Notifications',
                value={
                    'notification_ids': [1, 2, 3]
                },
                request_only=True
            ),
            OpenApiExample(
                'Mark All Notifications',
                value={},
                request_only=True
            ),
        ]
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_read(self, request):
        """
        Mark one or more notifications as read.
        
        Body: {notification_ids: [1, 2, 3]} or {} for all unread
        """
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data.get('notification_ids')
        
        if notification_ids:
            # Mark specific notifications
            notifications = self.get_queryset().filter(
                id__in=notification_ids,
                is_read=False
            )
        else:
            # Mark all unread notifications
            notifications = self.get_queryset().filter(is_read=False)
        
        count = notifications.count()
        for notification in notifications:
            notification.mark_as_read()
        
        return Response({
            'marked_read': count,
            'message': f'{count} اعلان به عنوان خوانده شده علامت‌گذاری شد.'
        })

    @extend_schema(
        summary="Get unread notification count",
        description="تعداد اعلان‌های خوانده نشده"
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
