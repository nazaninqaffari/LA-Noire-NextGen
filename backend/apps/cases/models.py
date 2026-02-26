"""
Case models for criminal investigations.
Supports case formation via complaints or crime scene reports.
"""
from django.db import models
from django.conf import settings


class CrimeLevel(models.Model):
    """
    Crime severity levels (Level 3, 2, 1, Critical).
    Determines required approvals and handling procedures.
    """
    LEVEL_3 = 3  # Minor crimes: petty theft, minor fraud
    LEVEL_2 = 2  # Medium crimes: car theft
    LEVEL_1 = 1  # Major crimes: murder
    LEVEL_CRITICAL = 0  # Critical crimes: serial murder, assassination
    
    LEVEL_CHOICES = [
        (LEVEL_3, 'Level 3 - Minor'),
        (LEVEL_2, 'Level 2 - Medium'),
        (LEVEL_1, 'Level 1 - Major'),
        (LEVEL_CRITICAL, 'Critical'),
    ]
    
    name = models.CharField(max_length=100, unique=True, help_text="Crime level name")
    level = models.IntegerField(
        choices=LEVEL_CHOICES,
        unique=True,
        help_text="Severity level (0=Critical, 1=Major, 2=Medium, 3=Minor)"
    )
    description = models.TextField(help_text="Description of crimes in this level")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['level']
        verbose_name = 'Crime Level'
        verbose_name_plural = 'Crime Levels'

    def __str__(self):
        return f"{self.name} (Level {self.level})"


class Case(models.Model):
    """
    Main case model representing a criminal investigation.
    Can be created via complaint or crime scene report.
    
    Status transitions follow a strict workflow:
    draft -> cadet_review -> officer_review -> open -> under_investigation
    -> suspects_identified -> arrest_approved -> interrogation -> trial_pending -> closed
    At any review stage, case can be rejected back to draft (max 3 attempts).
    """
    # Case formation types
    FORMATION_COMPLAINT = 'complaint'
    FORMATION_CRIME_SCENE = 'crime_scene'
    FORMATION_CHOICES = [
        (FORMATION_COMPLAINT, 'Complaint'),
        (FORMATION_CRIME_SCENE, 'Crime Scene'),
    ]
    
    # Case status workflow
    STATUS_DRAFT = 'draft'  # Initial submission by complainant
    STATUS_CADET_REVIEW = 'cadet_review'  # Under cadet review
    STATUS_OFFICER_REVIEW = 'officer_review'  # Under police officer review
    STATUS_REJECTED = 'rejected'  # Rejected (3 failed attempts or invalid)
    STATUS_OPEN = 'open'  # Approved and open for investigation
    STATUS_UNDER_INVESTIGATION = 'under_investigation'  # Detective assigned
    STATUS_SUSPECTS_IDENTIFIED = 'suspects_identified'  # Suspects identified
    STATUS_ARREST_APPROVED = 'arrest_approved'  # Sergeant approved arrest
    STATUS_INTERROGATION = 'interrogation'  # Suspects being interrogated
    STATUS_TRIAL_PENDING = 'trial_pending'  # Awaiting trial
    STATUS_CLOSED = 'closed'  # Case closed (verdict delivered)
    
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_CADET_REVIEW, 'Cadet Review'),
        (STATUS_OFFICER_REVIEW, 'Officer Review'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_OPEN, 'Open'),
        (STATUS_UNDER_INVESTIGATION, 'Under Investigation'),
        (STATUS_SUSPECTS_IDENTIFIED, 'Suspects Identified'),
        (STATUS_ARREST_APPROVED, 'Arrest Approved'),
        (STATUS_INTERROGATION, 'Interrogation'),
        (STATUS_TRIAL_PENDING, 'Trial Pending'),
        (STATUS_CLOSED, 'Closed'),
    ]
    
    # Basic information
    case_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique case identifier"
    )
    title = models.CharField(max_length=500, help_text="Brief case title")
    description = models.TextField(help_text="Detailed case description")
    
    # Case classification
    crime_level = models.ForeignKey(
        CrimeLevel,
        on_delete=models.PROTECT,
        related_name='cases',
        help_text="Severity level of the crime"
    )
    formation_type = models.CharField(
        max_length=20,
        choices=FORMATION_CHOICES,
        help_text="How the case was formed"
    )
    
    # Case status
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        help_text="Current case status"
    )
    rejection_count = models.IntegerField(
        default=0,
        help_text="Number of times case was rejected (max 3)"
    )
    
    # Crime scene information (for crime_scene formation type)
    crime_scene_location = models.CharField(
        max_length=500,
        blank=True,
        help_text="Location of crime scene"
    )
    crime_scene_datetime = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time of crime scene discovery"
    )
    
    # Personnel involved
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_cases',
        help_text="User who created the case (complainant or officer)"
    )
    assigned_cadet = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cadet_cases',
        help_text="Cadet reviewing the case"
    )
    assigned_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='officer_cases',
        help_text="Police officer reviewing the case"
    )
    assigned_detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detective_cases',
        help_text="Detective investigating the case"
    )
    assigned_sergeant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sergeant_cases',
        help_text="Sergeant overseeing the investigation"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    opened_at = models.DateTimeField(null=True, blank=True, help_text="When case was approved")
    closed_at = models.DateTimeField(null=True, blank=True, help_text="When case was closed")

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Case'
        verbose_name_plural = 'Cases'
        indexes = [
            models.Index(fields=['case_number']),
            models.Index(fields=['status']),
            models.Index(fields=['crime_level']),
        ]

    def __str__(self):
        return f"{self.case_number}: {self.title}"


class Complainant(models.Model):
    """
    Link between cases and complainants.
    A case can have multiple complainants.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='complainants',
        help_text="Associated case"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='complaints',
        help_text="User filing complaint"
    )
    statement = models.TextField(
        help_text="Complainant's statement about the incident"
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Whether this is the primary complainant who initiated the case"
    )
    verified_by_cadet = models.BooleanField(
        default=False,
        help_text="Whether cadet verified this complainant's information"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', '-added_at']
        verbose_name = 'Complainant'
        verbose_name_plural = 'Complainants'
        unique_together = ['case', 'user']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.case.case_number}"


class Witness(models.Model):
    """
    Witnesses to a crime.
    Stores basic contact information for follow-up.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='witnesses',
        help_text="Associated case"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='witnessed_cases',
        help_text="Registered user (if witness has account)"
    )
    # For witnesses without accounts
    full_name = models.CharField(
        max_length=300,
        blank=True,
        help_text="Full name (if not registered user)"
    )
    phone_number = models.CharField(
        max_length=17,
        blank=True,
        help_text="Contact phone number"
    )
    national_id = models.CharField(
        max_length=20,
        blank=True,
        help_text="National ID for identification"
    )
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='added_witnesses',
        help_text="Police personnel who added this witness"
    )

    class Meta:
        ordering = ['-added_at']
        verbose_name = 'Witness'
        verbose_name_plural = 'Witnesses'

    def __str__(self):
        if self.user:
            return f"{self.user.get_full_name()} - {self.case.case_number}"
        return f"{self.full_name} - {self.case.case_number}"


class CaseReview(models.Model):
    """
    Review history for cases during approval workflow.
    Tracks cadet and officer reviews with rejection reasons.
    """
    REVIEW_APPROVED = 'approved'
    REVIEW_REJECTED = 'rejected'
    REVIEW_CHOICES = [
        (REVIEW_APPROVED, 'Approved'),
        (REVIEW_REJECTED, 'Rejected'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='reviews',
        help_text="Case being reviewed"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='case_reviews',
        help_text="User conducting review"
    )
    decision = models.CharField(
        max_length=20,
        choices=REVIEW_CHOICES,
        help_text="Review decision"
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection (required if rejected)"
    )
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reviewed_at']
        verbose_name = 'Case Review'
        verbose_name_plural = 'Case Reviews'

    def __str__(self):
        return f"{self.case.case_number} - {self.decision} by {self.reviewer}"
