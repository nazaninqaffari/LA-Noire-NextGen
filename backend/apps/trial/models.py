"""
Trial models - Verdicts, punishments, and bail/fine payment system.
"""
from django.db import models
from django.conf import settings
from apps.cases.models import Case
from apps.investigation.models import Suspect, Interrogation


class Trial(models.Model):
    """
    Trial record for a suspect.
    Judge reviews complete case file, evidence, and all involved personnel.
    Persian: دادگاه و محاکمه
    """
    STATUS_PENDING = 'pending'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='trials',
        help_text="Case being tried"
    )
    suspect = models.ForeignKey(
        Suspect,
        on_delete=models.CASCADE,
        related_name='trials',
        help_text="Suspect on trial"
    )
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='presided_trials',
        help_text="Judge presiding over trial"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Trial status"
    )
    # Captain/Chief decision leading to trial
    submitted_by_captain = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='submitted_trials_captain',
        help_text="Captain who submitted case to trial"
    )
    submitted_by_chief = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='submitted_trials_chief',
        help_text="Chief who submitted case to trial (for critical crimes)"
    )
    captain_notes = models.TextField(
        blank=True,
        help_text="Captain's notes and reasoning"
    )
    chief_notes = models.TextField(
        blank=True,
        help_text="Chief's notes and reasoning (if critical case)"
    )
    trial_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Scheduled trial date"
    )
    trial_started_at = models.DateTimeField(auto_now_add=True)
    trial_ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Trial'
        verbose_name_plural = 'Trials'
        ordering = ['-trial_started_at']

    def __str__(self):
        return f"Trial: {self.suspect.person.get_full_name()} - {self.case.case_number}"
    
    def get_involved_police_members(self):
        """Get all police members involved in the case."""
        members = set()
        
        # Add case creator
        if self.case.created_by:
            members.add(self.case.created_by)
        
        # Add detective and sergeant from suspect identification
        if self.suspect.identified_by_detective:
            members.add(self.suspect.identified_by_detective)
        if self.suspect.approved_by_sergeant:
            members.add(self.suspect.approved_by_sergeant)
        
        # Add interrogation participants
        for interrogation in self.suspect.interrogations.all():
            members.add(interrogation.detective)
            members.add(interrogation.sergeant)
        
        # Add captain and chief if present
        if self.submitted_by_captain:
            members.add(self.submitted_by_captain)
        if self.submitted_by_chief:
            members.add(self.submitted_by_chief)
        
        return list(members)


class Verdict(models.Model):
    """
    Judge's final verdict on a trial.
    Determines guilt/innocence and punishment for guilty verdicts.
    """
    VERDICT_GUILTY = 'guilty'
    VERDICT_INNOCENT = 'innocent'
    
    VERDICT_CHOICES = [
        (VERDICT_GUILTY, 'Guilty'),
        (VERDICT_INNOCENT, 'Innocent'),
    ]
    
    trial = models.OneToOneField(
        Trial,
        on_delete=models.CASCADE,
        related_name='verdict',
        help_text="Trial this verdict belongs to"
    )
    decision = models.CharField(
        max_length=20,
        choices=VERDICT_CHOICES,
        help_text="Final verdict: guilty or innocent"
    )
    reasoning = models.TextField(
        help_text="Judge's detailed reasoning for verdict"
    )
    delivered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Verdict'
        verbose_name_plural = 'Verdicts'

    def __str__(self):
        return f"{self.decision.title()} - {self.trial}"


class Punishment(models.Model):
    """
    Punishment assigned to guilty verdict.
    Includes title and detailed description.
    """
    verdict = models.OneToOneField(
        Verdict,
        on_delete=models.CASCADE,
        related_name='punishment',
        help_text="Verdict this punishment is for"
    )
    title = models.CharField(
        max_length=500,
        help_text="Brief punishment title (e.g., '5 years imprisonment')"
    )
    description = models.TextField(
        help_text="Detailed punishment description"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Punishment'
        verbose_name_plural = 'Punishments'

    def __str__(self):
        return f"Punishment: {self.title}"


class BailPayment(models.Model):
    """
    Bail and fine payment for level 2 and 3 crimes (optional feature).
    Suspects of level 2/3 can pay bail to be released from detention.
    Level 3 criminals can pay fine (with sergeant approval) to be released.
    """
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_PAID = 'paid'
    STATUS_REJECTED = 'rejected'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Approval'),
        (STATUS_APPROVED, 'Approved - Awaiting Payment'),
        (STATUS_PAID, 'Paid - Released'),
        (STATUS_REJECTED, 'Rejected'),
    ]
    
    suspect = models.ForeignKey(
        Suspect,
        on_delete=models.CASCADE,
        related_name='bail_payments',
        help_text="Suspect requesting bail"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        help_text="Bail/fine amount in Rials"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Payment status"
    )
    approved_by_sergeant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_bail_payments',
        help_text="Sergeant who approved bail amount"
    )
    # Payment gateway integration placeholder
    payment_reference = models.CharField(
        max_length=200,
        blank=True,
        help_text="Payment gateway reference/transaction ID"
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Bail Payment'
        verbose_name_plural = 'Bail Payments'
        ordering = ['-requested_at']

    def __str__(self):
        return f"Bail: {self.suspect} - {self.amount} Rials"
