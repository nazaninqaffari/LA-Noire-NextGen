"""
Investigation models - Detective boards, suspects, interrogations, and rewards.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import timedelta
from apps.cases.models import Case


class DetectiveBoard(models.Model):
    """
    Detective's investigation board for organizing evidence and connections.
    Each detective can place evidence at specific positions and connect related items.
    """
    case = models.OneToOneField(
        Case,
        on_delete=models.CASCADE,
        related_name='detective_board',
        help_text="Case being investigated"
    )
    detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='detective_boards',
        help_text="Detective managing this board"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Detective Board'
        verbose_name_plural = 'Detective Boards'

    def __str__(self):
        return f"Board: {self.case.case_number} - {self.detective.get_full_name()}"


class BoardItem(models.Model):
    """
    Evidence or document placed on detective board.
    Stores position coordinates for visual layout.
    """
    board = models.ForeignKey(
        DetectiveBoard,
        on_delete=models.CASCADE,
        related_name='items',
        help_text="Detective board containing this item"
    )
    # Generic foreign key pattern for different evidence types
    content_type = models.CharField(
        max_length=100,
        help_text="Type of evidence (e.g., 'testimony', 'biological', 'vehicle')"
    )
    object_id = models.IntegerField(
        help_text="ID of the evidence object"
    )
    # Visual position on board
    position_x = models.FloatField(
        help_text="X coordinate on board (for UI positioning)"
    )
    position_y = models.FloatField(
        help_text="Y coordinate on board (for UI positioning)"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Board Item'
        verbose_name_plural = 'Board Items'
        ordering = ['added_at']

    def __str__(self):
        return f"{self.content_type} #{self.object_id} on {self.board}"


class EvidenceConnection(models.Model):
    """
    Red line connections between related evidence items on detective board.
    Represents detective's reasoning about relationships between evidence.
    """
    board = models.ForeignKey(
        DetectiveBoard,
        on_delete=models.CASCADE,
        related_name='connections',
        help_text="Detective board containing this connection"
    )
    from_item = models.ForeignKey(
        BoardItem,
        on_delete=models.CASCADE,
        related_name='outgoing_connections',
        help_text="Starting evidence item"
    )
    to_item = models.ForeignKey(
        BoardItem,
        on_delete=models.CASCADE,
        related_name='incoming_connections',
        help_text="Connected evidence item"
    )
    notes = models.TextField(
        blank=True,
        help_text="Detective's notes about this connection"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Evidence Connection'
        verbose_name_plural = 'Evidence Connections'
        unique_together = ['board', 'from_item', 'to_item']

    def __str__(self):
        return f"Connection: {self.from_item} -> {self.to_item}"


class Suspect(models.Model):
    """
    Person identified as suspect in a case.
    Tracks pursuit status and calculates danger level/reward.
    """
    # Suspect status
    STATUS_UNDER_PURSUIT = 'under_pursuit'  # Being tracked (< 1 month)
    STATUS_INTENSIVE_PURSUIT = 'intensive_pursuit'  # Tracked > 1 month (public wanted list)
    STATUS_ARRESTED = 'arrested'  # Captured
    STATUS_CLEARED = 'cleared'  # Proven innocent
    
    STATUS_CHOICES = [
        (STATUS_UNDER_PURSUIT, 'Under Pursuit'),
        (STATUS_INTENSIVE_PURSUIT, 'Intensive Pursuit'),
        (STATUS_ARRESTED, 'Arrested'),
        (STATUS_CLEARED, 'Cleared'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='suspects',
        help_text="Case where person is suspected"
    )
    person = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='suspicions',
        help_text="Person under suspicion"
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_UNDER_PURSUIT,
        help_text="Current suspect status"
    )
    reason = models.TextField(
        help_text="Why this person is suspected"
    )
    identified_by_detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='identified_suspects',
        help_text="Detective who identified this suspect"
    )
    approved_by_sergeant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_suspects',
        help_text="Sergeant who approved pursuit"
    )
    sergeant_approval_message = models.TextField(
        blank=True,
        help_text="Sergeant's approval or rejection message"
    )
    arrest_warrant_issued = models.BooleanField(
        default=False,
        help_text="Whether arrest warrant has been issued"
    )
    photo = models.ImageField(
        upload_to='suspects/photos/',
        null=True,
        blank=True,
        help_text="Photo for wanted poster (if intensive pursuit)"
    )
    identified_at = models.DateTimeField(auto_now_add=True)
    arrested_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Suspect'
        verbose_name_plural = 'Suspects'
        unique_together = ['case', 'person']
        ordering = ['-identified_at']

    def __str__(self):
        return f"{self.person.get_full_name()} - {self.case.case_number}"

    def is_intensive_pursuit(self):
        """Check if suspect has been under pursuit for > 1 month."""
        if self.status not in [self.STATUS_UNDER_PURSUIT, self.STATUS_INTENSIVE_PURSUIT]:
            return False
        one_month_ago = timezone.now() - timedelta(days=30)
        return self.identified_at <= one_month_ago

    def get_danger_score(self):
        """
        Calculate danger score: max(days_pursued) * max(crime_level).
        Used for ranking on wanted list.
        """
        days_pursued = (timezone.now() - self.identified_at).days
        crime_level_value = self.case.crime_level.level
        # Convert level to score (0=Critical=4, 1=3, 2=2, 3=1)
        level_score = 4 - crime_level_value
        return days_pursued * level_score

    def get_reward_amount(self):
        """
        Calculate reward: max(days_pursued) * max(crime_level) * 20,000,000 Rials.
        """
        return self.get_danger_score() * 20_000_000


class Interrogation(models.Model):
    """
    Interrogation session of a suspect by detective and sergeant.
    Both provide guilt ratings (1-10), which go to captain for final decision.
    """
    STATUS_PENDING = 'pending'
    STATUS_SUBMITTED = 'submitted'
    STATUS_REVIEWED = 'reviewed'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'در انتظار تکمیل'),
        (STATUS_SUBMITTED, 'ارسال شده'),
        (STATUS_REVIEWED, 'بررسی شده'),
    ]
    
    suspect = models.ForeignKey(
        Suspect,
        on_delete=models.CASCADE,
        related_name='interrogations',
        help_text="Suspect being interrogated"
    )
    detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='detective_interrogations',
        help_text="Detective conducting interrogation"
    )
    sergeant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sergeant_interrogations',
        help_text="Sergeant conducting interrogation"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current status of interrogation"
    )
    detective_guilt_rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Detective's guilt rating (1-10, 10=most guilty)"
    )
    sergeant_guilt_rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Sergeant's guilt rating (1-10, 10=most guilty)"
    )
    detective_notes = models.TextField(
        blank=True,
        help_text="Detective's interrogation notes"
    )
    sergeant_notes = models.TextField(
        blank=True,
        help_text="Sergeant's interrogation notes"
    )
    interrogated_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Interrogation'
        verbose_name_plural = 'Interrogations'
        ordering = ['-interrogated_at']

    def __str__(self):
        return f"Interrogation: {self.suspect} at {self.interrogated_at}"
    
    def is_complete(self):
        """Check if both ratings are provided."""
        return (
            self.detective_guilt_rating is not None and
            self.sergeant_guilt_rating is not None
        )
    
    def average_guilt_rating(self):
        """Calculate average guilt rating from detective and sergeant."""
        if self.is_complete():
            return (self.detective_guilt_rating + self.sergeant_guilt_rating) / 2
        return None


class CaptainDecision(models.Model):
    """
    Captain's final decision on interrogation based on detective and sergeant ratings.
    For critical crimes, this decision goes to police chief for additional approval.
    """
    DECISION_GUILTY = 'guilty'
    DECISION_NOT_GUILTY = 'not_guilty'
    DECISION_NEEDS_MORE_INVESTIGATION = 'needs_more'
    
    DECISION_CHOICES = [
        (DECISION_GUILTY, 'مجرم'),
        (DECISION_NOT_GUILTY, 'بی‌گناه'),
        (DECISION_NEEDS_MORE_INVESTIGATION, 'نیاز به تحقیقات بیشتر'),
    ]
    
    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'
    STATUS_AWAITING_CHIEF = 'awaiting_chief'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'در انتظار بررسی'),
        (STATUS_COMPLETED, 'تکمیل شده'),
        (STATUS_AWAITING_CHIEF, 'در انتظار رئیس پلیس'),
    ]
    
    interrogation = models.OneToOneField(
        Interrogation,
        on_delete=models.CASCADE,
        related_name='captain_decision',
        help_text="Related interrogation"
    )
    captain = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='captain_decisions',
        help_text="Captain making the decision"
    )
    decision = models.CharField(
        max_length=20,
        choices=DECISION_CHOICES,
        help_text="Captain's final decision"
    )
    reasoning = models.TextField(
        help_text="Captain's reasoning for the decision"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Status of captain's decision"
    )
    decided_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Captain Decision'
        verbose_name_plural = 'Captain Decisions'
        ordering = ['-decided_at']

    def __str__(self):
        return f"Captain Decision: {self.interrogation.suspect} - {self.decision}"
    
    def requires_chief_approval(self):
        """Check if crime level is critical and requires police chief approval."""
        return self.interrogation.suspect.case.crime_level.level == 0


class PoliceChiefDecision(models.Model):
    """
    Police Chief's approval/rejection of captain's decision.
    Only required for critical level crimes.
    """
    DECISION_APPROVED = 'approved'
    DECISION_REJECTED = 'rejected'
    
    DECISION_CHOICES = [
        (DECISION_APPROVED, 'تایید شده'),
        (DECISION_REJECTED, 'رد شده'),
    ]
    
    captain_decision = models.OneToOneField(
        CaptainDecision,
        on_delete=models.CASCADE,
        related_name='chief_decision',
        help_text="Related captain decision"
    )
    police_chief = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chief_decisions',
        help_text="Police chief making the decision"
    )
    decision = models.CharField(
        max_length=20,
        choices=DECISION_CHOICES,
        help_text="Police chief's decision"
    )
    comments = models.TextField(
        help_text="Police chief's comments"
    )
    decided_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Police Chief Decision'
        verbose_name_plural = 'Police Chief Decisions'
        ordering = ['-decided_at']

    def __str__(self):
        return f"Chief Decision: {self.captain_decision.interrogation.suspect} - {self.decision}"


class TipOff(models.Model):
    """
    Public tip submitted about a case or suspect.
    Goes through police officer review, then detective approval.
    Approved tips generate unique redemption codes for rewards.
    """
    STATUS_PENDING = 'pending'  # Submitted, awaiting officer review
    STATUS_OFFICER_REJECTED = 'officer_rejected'  # Officer deemed invalid
    STATUS_OFFICER_APPROVED = 'officer_approved'  # Officer approved, awaiting detective
    STATUS_DETECTIVE_REJECTED = 'detective_rejected'  # Detective deemed not useful
    STATUS_APPROVED = 'approved'  # Detective approved, reward issued
    STATUS_REDEEMED = 'redeemed'  # Reward has been collected
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_OFFICER_REJECTED, 'Rejected by Officer'),
        (STATUS_OFFICER_APPROVED, 'Approved by Officer'),
        (STATUS_DETECTIVE_REJECTED, 'Rejected by Detective'),
        (STATUS_APPROVED, 'Approved - Reward Available'),
        (STATUS_REDEEMED, 'Reward Redeemed'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='tipoffs',
        help_text="Case this tip is about"
    )
    suspect = models.ForeignKey(
        Suspect,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tipoffs',
        help_text="Suspect this tip is about (optional)"
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_tipoffs',
        help_text="User who submitted tip"
    )
    information = models.TextField(
        help_text="Tip information provided"
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current tip status"
    )
    # Review chain
    reviewed_by_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_tipoffs_officer',
        help_text="Officer who reviewed tip"
    )
    reviewed_by_detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_tipoffs_detective',
        help_text="Detective who reviewed tip"
    )
    # Reward information
    redemption_code = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="Unique code for reward redemption"
    )
    reward_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        help_text="Reward amount in Rials"
    )
    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    redeemed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Tip-Off'
        verbose_name_plural = 'Tip-Offs'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Tip by {self.submitted_by.username} - {self.case.case_number}"

    def generate_redemption_code(self):
        """Generate unique redemption code for approved tip."""
        import uuid
        self.redemption_code = f"REWARD-{uuid.uuid4().hex[:10].upper()}"
        return self.redemption_code


class SuspectSubmission(models.Model):
    """
    Detective's formal submission of identified suspects to sergeant for approval.
    Represents the case resolution workflow where detective proposes main suspects
    and sergeant reviews evidence before approving arrests.
    
    Persian: ارسال مظنونین برای تایید گروهبان
    """
    # Submission status
    STATUS_PENDING = 'pending'  # Awaiting sergeant review
    STATUS_APPROVED = 'approved'  # Sergeant approved arrests
    STATUS_REJECTED = 'rejected'  # Sergeant rejected reasoning
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='suspect_submissions',
        help_text="Case being resolved"
    )
    detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='suspect_submissions',
        help_text="Detective submitting suspects"
    )
    suspects = models.ManyToManyField(
        Suspect,
        related_name='submissions',
        help_text="Main suspects identified by detective"
    )
    reasoning = models.TextField(
        help_text="Detective's reasoning for identifying these suspects"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current submission status"
    )
    # Sergeant review
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_submissions',
        help_text="Sergeant who reviewed this submission"
    )
    review_notes = models.TextField(
        blank=True,
        help_text="Sergeant's review notes (approval or objection)"
    )
    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Suspect Submission'
        verbose_name_plural = 'Suspect Submissions'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Submission: {self.case.case_number} by {self.detective.get_full_name()}"


class Notification(models.Model):
    """
    System notification for users about case updates, approvals, new evidence, etc.
    Supports generic foreign keys to reference any related object.
    
    Persian: اعلان‌های سیستم
    """
    # Notification types
    TYPE_NEW_EVIDENCE = 'new_evidence'  # New evidence added to case
    TYPE_SUSPECT_SUBMISSION = 'suspect_submission'  # Detective submitted suspects
    TYPE_SUBMISSION_APPROVED = 'submission_approved'  # Sergeant approved submission
    TYPE_SUBMISSION_REJECTED = 'submission_rejected'  # Sergeant rejected submission
    TYPE_CASE_ASSIGNED = 'case_assigned'  # Case assigned to detective
    TYPE_CASE_STATUS_CHANGED = 'case_status_changed'  # Case status updated
    TYPE_TIPOFF_SUBMITTED = 'tipoff_submitted'  # New tip received
    TYPE_REWARD_AVAILABLE = 'reward_available'  # Reward ready for redemption
    TYPE_GENERAL = 'general'  # General notification
    
    TYPE_CHOICES = [
        (TYPE_NEW_EVIDENCE, 'New Evidence'),
        (TYPE_SUSPECT_SUBMISSION, 'Suspect Submission'),
        (TYPE_SUBMISSION_APPROVED, 'Submission Approved'),
        (TYPE_SUBMISSION_REJECTED, 'Submission Rejected'),
        (TYPE_CASE_ASSIGNED, 'Case Assigned'),
        (TYPE_CASE_STATUS_CHANGED, 'Case Status Changed'),
        (TYPE_TIPOFF_SUBMITTED, 'Tip-Off Submitted'),
        (TYPE_REWARD_AVAILABLE, 'Reward Available'),
        (TYPE_GENERAL, 'General'),
    ]
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="User receiving this notification"
    )
    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        help_text="Type of notification"
    )
    title = models.CharField(
        max_length=200,
        help_text="Notification title"
    )
    message = models.TextField(
        help_text="Notification message body"
    )
    # Related case (most notifications are case-related)
    related_case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Case this notification relates to"
    )
    # Generic foreign key for any other related object
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Type of related object"
    )
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of related object"
    )
    related_object = GenericForeignKey('content_type', 'object_id')
    # Read status
    is_read = models.BooleanField(
        default=False,
        help_text="Whether notification has been read"
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When notification was read"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.notification_type} for {self.recipient.username}"

    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    @classmethod
    def create_new_evidence_notification(cls, evidence, case, detective):
        """
        Helper to create notification when new evidence is added during investigation.
        
        Args:
            evidence: Evidence object (any evidence model)
            case: Case object
            detective: Detective user to notify
        """
        evidence_type = evidence.__class__.__name__
        return cls.objects.create(
            recipient=detective,
            notification_type=cls.TYPE_NEW_EVIDENCE,
            title=f"شواهد جدید در پرونده {case.case_number}",
            message=f"شواهد جدید از نوع {evidence_type} به پرونده اضافه شد.",
            related_case=case,
            content_type=ContentType.objects.get_for_model(evidence),
            object_id=evidence.id
        )

    @classmethod
    def create_submission_notification(cls, submission, sergeant):
        """
        Notify sergeant about new suspect submission from detective.
        
        Args:
            submission: SuspectSubmission object
            sergeant: Sergeant user to notify
        """
        return cls.objects.create(
            recipient=sergeant,
            notification_type=cls.TYPE_SUSPECT_SUBMISSION,
            title=f"ارسال مظنونین در پرونده {submission.case.case_number}",
            message=f"کارآگاه {submission.detective.get_full_name()} مظنونین اصلی را شناسایی کرده است.",
            related_case=submission.case,
            content_type=ContentType.objects.get_for_model(submission),
            object_id=submission.id
        )

    @classmethod
    def create_approval_notification(cls, submission):
        """
        Notify detective about sergeant's approval of suspect submission.
        
        Args:
            submission: Approved SuspectSubmission object
        """
        return cls.objects.create(
            recipient=submission.detective,
            notification_type=cls.TYPE_SUBMISSION_APPROVED,
            title=f"تایید دستگیری در پرونده {submission.case.case_number}",
            message=f"گروهبان تایید کرد. دستگیری مظنونین شروع شده است.",
            related_case=submission.case,
            content_type=ContentType.objects.get_for_model(submission),
            object_id=submission.id
        )

    @classmethod
    def create_rejection_notification(cls, submission):
        """
        Notify detective about sergeant's rejection of suspect submission.
        
        Args:
            submission: Rejected SuspectSubmission object
        """
        return cls.objects.create(
            recipient=submission.detective,
            notification_type=cls.TYPE_SUBMISSION_REJECTED,
            title=f"عدم تایید در پرونده {submission.case.case_number}",
            message=f"گروهبان با استدلال شما مخالفت کرد. پرونده همچنان باز است.",
            related_case=submission.case,
            content_type=ContentType.objects.get_for_model(submission),
            object_id=submission.id
        )
