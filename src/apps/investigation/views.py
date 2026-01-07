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
    Interrogation, TipOff, SuspectSubmission, Notification,
    CaptainDecision, PoliceChiefDecision
)
from .serializers import (
    DetectiveBoardSerializer, BoardItemSerializer, EvidenceConnectionSerializer,
    SuspectSerializer, IntensivePursuitSuspectSerializer, InterrogationSerializer, TipOffSerializer,
    SuspectSubmissionSerializer, SuspectSubmissionReviewSerializer,
    NotificationSerializer, NotificationMarkReadSerializer,
    InterrogationSubmitSerializer, CaptainDecisionSerializer, PoliceChiefDecisionSerializer
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
    
    @extend_schema(
        summary="Intensive Pursuit List - Public Wanted List",
        description="""
        لیست عمومی مظنونین تحت تعقیب شدید
        
        این صفحه عمومی است و برای همه کاربران قابل مشاهده است.
        مظنونینی که بیش از یک ماه تحت تعقیب هستند در این لیست نمایش داده می‌شوند.
        
        رتبه‌بندی براساس:
        - امتیاز خطر = تعداد روزهای فرار × سطح جرم (0=بحرانی/4، 1=3، 2=2، 3=1)
        - پاداش = امتیاز خطر × ۲۰,۰۰۰,۰۰۰ ریال
        
        Features:
        - Public access (no authentication required for viewing)
        - Shows photo, name, case details
        - Ordered by danger score (highest first)
        - Only suspects in intensive pursuit (> 30 days)
        """,
        responses={
            200: IntensivePursuitSuspectSerializer(many=True)
        },
        examples=[
            OpenApiExample(
                'Response',
                value=[
                    {
                        "id": 5,
                        "person_full_name": "علی احمدی",
                        "person_username": "ali_ahmad",
                        "photo": "/media/suspects/photos/ali.jpg",
                        "case_number": "CASE-2024-001",
                        "case_title": "قتل عمد",
                        "crime_level": 0,
                        "crime_level_name": "بحرانی",
                        "reason": "شواهد DNA مطابقت کامل دارد",
                        "days_at_large": 45,
                        "danger_score": 180,
                        "reward_amount": 3600000000,
                        "identified_at": "2023-11-23T10:00:00Z",
                        "status": "intensive_pursuit"
                    }
                ],
                response_only=True
            ),
        ]
    )
    @action(detail=False, methods=['get'], permission_classes=[])
    def intensive_pursuit(self, request):
        """
        Public endpoint for intensive pursuit wanted list.
        Shows suspects who have been at large for > 30 days.
        Ordered by danger score (days × crime_level).
        
        Persian: لیست عمومی تحت تعقیب شدید
        """
        from datetime import timedelta
        
        # Get suspects in intensive pursuit
        thirty_days_ago = timezone.now() - timedelta(days=30)
        suspects = Suspect.objects.filter(
            status__in=[Suspect.STATUS_UNDER_PURSUIT, Suspect.STATUS_INTENSIVE_PURSUIT],
            identified_at__lte=thirty_days_ago
        ).select_related(
            'person', 'case', 'case__crime_level'
        )
        
        # Update status to intensive pursuit if needed
        suspects_to_update = []
        for suspect in suspects:
            if suspect.status == Suspect.STATUS_UNDER_PURSUIT:
                suspect.status = Suspect.STATUS_INTENSIVE_PURSUIT
                suspects_to_update.append(suspect)
        
        if suspects_to_update:
            Suspect.objects.bulk_update(suspects_to_update, ['status'])
        
        # Sort by danger score (descending)
        suspects_sorted = sorted(
            suspects, 
            key=lambda s: s.get_danger_score(), 
            reverse=True
        )
        
        serializer = IntensivePursuitSuspectSerializer(suspects_sorted, many=True)
        return Response(serializer.data)


class InterrogationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Interrogations of suspects.
    Detective and sergeant both provide guilt ratings (1-10).
    When complete, interrogation is submitted to captain for final decision.
    
    Workflow:
    1. Create interrogation with suspect
    2. Detective and sergeant both add ratings and notes
    3. Submit to captain for review
    
    Persian: بازجویی از مظنونین
    """
    queryset = Interrogation.objects.select_related(
        'suspect', 'suspect__person', 'detective', 'sergeant'
    ).all()
    serializer_class = InterrogationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['suspect', 'detective', 'sergeant', 'status']
    ordering = ['-interrogated_at']
    
    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.role == 'detective':
            return queryset.filter(detective=user)
        elif user.role == 'sergeant':
            return queryset.filter(sergeant=user)
        elif user.role == 'captain':
            # Captain can see submitted interrogations
            return queryset.filter(status=Interrogation.STATUS_SUBMITTED)
        
        return queryset
    
    @extend_schema(
        request=InterrogationSubmitSerializer,
        responses={200: InterrogationSerializer},
        description="""
        Submit interrogation ratings to captain.
        Both detective and sergeant ratings required (1-10).
        
        Persian: ارسال نتایج بازجویی به سرگروه
        
        Example:
        ```json
        {
            "detective_guilt_rating": 8,
            "sergeant_guilt_rating": 7,
            "detective_notes": "مظنون در حین بازجویی علائم عصبی نشان داد",
            "sergeant_notes": "شواهد علیه او قوی است ولی ممکن است شریک جرم داشته باشد"
        }
        ```
        """,
        tags=['Interrogation']
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_ratings(self, request, pk=None):
        """
        Submit completed interrogation ratings to captain.
        Persian: ارسال امتیازات بازجویی به سرگروه
        """
        interrogation = self.get_object()
        serializer = InterrogationSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check permission - detective or sergeant only
        if request.user not in [interrogation.detective, interrogation.sergeant]:
            return Response(
                {"detail": "فقط کارآگاه یا گروهبان مسئول می‌توانند بازجویی را ارسال کنند."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already submitted
        if interrogation.status != Interrogation.STATUS_PENDING:
            return Response(
                {"detail": "این بازجویی قبلاً ارسال شده است."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update interrogation
        interrogation.detective_guilt_rating = serializer.validated_data['detective_guilt_rating']
        interrogation.sergeant_guilt_rating = serializer.validated_data['sergeant_guilt_rating']
        interrogation.detective_notes = serializer.validated_data['detective_notes']
        interrogation.sergeant_notes = serializer.validated_data['sergeant_notes']
        interrogation.status = Interrogation.STATUS_SUBMITTED
        interrogation.submitted_at = timezone.now()
        interrogation.save()
        
        return Response(
            InterrogationSerializer(interrogation).data,
            status=status.HTTP_200_OK
        )


class CaptainDecisionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Captain's decisions on interrogations.
    Captain reviews interrogation ratings, evidence, and makes final decision.
    For critical crimes, decision goes to police chief for additional approval.
    
    Workflow:
    1. Captain reviews submitted interrogation
    2. Makes decision: guilty, not guilty, or needs more investigation
    3. If critical crime level, decision awaits police chief approval
    
    Persian: تصمیم‌گیری سرگروه
    """
    queryset = CaptainDecision.objects.select_related(
        'interrogation', 'interrogation__suspect', 'interrogation__suspect__person',
        'interrogation__suspect__case', 'interrogation__suspect__case__crime_level',
        'captain'
    ).all()
    serializer_class = CaptainDecisionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['captain', 'decision', 'status']
    ordering = ['-decided_at']
    
    def get_queryset(self):
        """Captains see their own decisions, chiefs see critical decisions."""
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.role == 'captain':
            return queryset.filter(captain=user)
        elif user.role == 'police_chief':
            # Police chief sees decisions awaiting approval
            return queryset.filter(status=CaptainDecision.STATUS_AWAITING_CHIEF)
        
        return queryset
    
    @extend_schema(
        request=CaptainDecisionSerializer,
        responses={201: CaptainDecisionSerializer},
        description="""
        Create captain's decision on interrogation.
        Reviews detective and sergeant ratings, makes final call.
        
        Persian: ایجاد تصمیم سرگروه
        
        Example:
        ```json
        {
            "interrogation": 1,
            "decision": "guilty",
            "reasoning": "با توجه به امتیازات بالای کارآگاه و گروهبان، شواهد موجود، و اقرار جزئی مظنون، وی مجرم شناخته می‌شود."
        }
        ```
        """,
        tags=['Captain Decision']
    )
    def create(self, request, *args, **kwargs):
        """Captain creates decision on interrogation."""
        # Check permission
        if request.user.role != 'captain':
            return Response(
                {"detail": "فقط سرگروه می‌تواند تصمیم بگیرد."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set captain
        decision = serializer.save(captain=request.user)
        
        # Check if requires chief approval
        if decision.requires_chief_approval():
            decision.status = CaptainDecision.STATUS_AWAITING_CHIEF
            decision.save()
        else:
            decision.status = CaptainDecision.STATUS_COMPLETED
            decision.save()
        
        # Update interrogation status
        decision.interrogation.status = Interrogation.STATUS_REVIEWED
        decision.interrogation.save()
        
        return Response(
            CaptainDecisionSerializer(decision).data,
            status=status.HTTP_201_CREATED
        )


class PoliceChiefDecisionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Police Chief's decisions (critical crimes only).
    Final approval layer for critical level crimes.
    
    Workflow:
    1. Police chief reviews captain's decision
    2. Approves or rejects based on evidence and reasoning
    
    Persian: تصمیم رئیس پلیس (جنایات بحرانی)
    """
    queryset = PoliceChiefDecision.objects.select_related(
        'captain_decision', 'captain_decision__interrogation',
        'captain_decision__interrogation__suspect', 'police_chief'
    ).all()
    serializer_class = PoliceChiefDecisionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['police_chief', 'decision']
    ordering = ['-decided_at']
    
    def get_queryset(self):
        """Police chiefs see their own decisions."""
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.role == 'police_chief':
            return queryset.filter(police_chief=user)
        
        return queryset
    
    @extend_schema(
        request=PoliceChiefDecisionSerializer,
        responses={201: PoliceChiefDecisionSerializer},
        description="""
        Create police chief's decision on captain's decision (critical crimes only).
        Final approval for critical level crimes.
        
        Persian: ایجاد تصمیم رئیس پلیس
        
        Example:
        ```json
        {
            "captain_decision": 1,
            "decision": "approved",
            "comments": "تصمیم سرگروه صحیح است. شواهد کافی برای محکومیت وجود دارد."
        }
        ```
        """,
        tags=['Police Chief Decision']
    )
    def create(self, request, *args, **kwargs):
        """Police chief creates decision on captain's decision."""
        # Check permission
        if request.user.role != 'police_chief':
            return Response(
                {"detail": "فقط رئیس پلیس می‌تواند این تصمیم را بگیرد."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Save decision
        chief_decision = serializer.save(police_chief=request.user)
        
        # Update captain decision status
        captain_decision = chief_decision.captain_decision
        captain_decision.status = CaptainDecision.STATUS_COMPLETED
        captain_decision.save()
        
        return Response(
            PoliceChiefDecisionSerializer(chief_decision).data,
            status=status.HTTP_201_CREATED
        )


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
