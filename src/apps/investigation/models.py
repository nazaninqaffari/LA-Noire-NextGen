"""
Investigation models - Detective boards, suspects, interrogations, and rewards.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
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
    detective_guilt_rating = models.IntegerField(
        null=True,
        blank=True,
        help_text="Detective's guilt rating (1-10, 10=most guilty)"
    )
    sergeant_guilt_rating = models.IntegerField(
        null=True,
        blank=True,
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

    class Meta:
        verbose_name = 'Interrogation'
        verbose_name_plural = 'Interrogations'
        ordering = ['-interrogated_at']

    def __str__(self):
        return f"Interrogation: {self.suspect} at {self.interrogated_at}"


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
