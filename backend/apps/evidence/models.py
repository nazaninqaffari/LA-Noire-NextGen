"""
Evidence models for criminal investigations.
All evidence types share common fields: title, description, date, and recorder.
"""
from django.db import models
from django.conf import settings
from apps.cases.models import Case


class BaseEvidence(models.Model):
    """
    Abstract base class for all evidence types.
    Contains common fields shared by all evidence.
    
    Subclasses: Testimony, BiologicalEvidence, VehicleEvidence, IDDocument, GenericEvidence
    Each subclass inherits case, title, description, recorded_by, and recorded_at fields.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        help_text="Associated case"
    )
    title = models.CharField(
        max_length=500,
        help_text="Brief title of evidence"
    )
    description = models.TextField(
        help_text="Detailed description of evidence"
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        help_text="Personnel who recorded this evidence"
    )
    recorded_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When evidence was recorded"
    )

    class Meta:
        abstract = True
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.title} - {self.case.case_number}"


class Testimony(BaseEvidence):
    """
    Witness/complainant/local testimony evidence.
    Can include transcripts of statements, and media files (images, audio, video).
    """
    witness = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='testimonies',
        help_text="Person giving testimony (if registered user)"
    )
    witness_name = models.CharField(
        max_length=300,
        blank=True,
        help_text="Witness name (if not registered)"
    )
    transcript = models.TextField(
        help_text="Written transcript of testimony"
    )
    # Media attachments
    image = models.ImageField(
        upload_to='evidence/testimony/images/',
        null=True,
        blank=True,
        help_text="Image evidence from locals"
    )
    audio = models.FileField(
        upload_to='evidence/testimony/audio/',
        null=True,
        blank=True,
        help_text="Audio recording"
    )
    video = models.FileField(
        upload_to='evidence/testimony/video/',
        null=True,
        blank=True,
        help_text="Video recording"
    )

    class Meta:
        verbose_name = 'Testimony'
        verbose_name_plural = 'Testimonies'
        ordering = ['-recorded_at']

    def __str__(self):
        witness_name = self.witness.get_full_name() if self.witness else self.witness_name
        return f"Testimony: {witness_name} - {self.case.case_number}"


class BiologicalEvidence(BaseEvidence):
    """
    Biological and medical evidence requiring forensic analysis.
    Examples: blood stains, hair, fingerprints.
    Needs verification from coroner or national identity database.
    """
    evidence_type = models.CharField(
        max_length=200,
        help_text="Type of biological evidence (e.g., blood, hair, fingerprint)"
    )
    images = models.ManyToManyField(
        'EvidenceImage',
        related_name='biological_evidence',
        blank=True,
        help_text="Photos of biological evidence"
    )
    # Forensic analysis results
    coroner_analysis = models.TextField(
        blank=True,
        help_text="Analysis results from coroner"
    )
    identity_match = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matched_biological_evidence',
        help_text="Person matched via identity database"
    )
    verified_by_coroner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_biological_evidence',
        help_text="Coroner who verified evidence"
    )
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When evidence was verified"
    )

    class Meta:
        verbose_name = 'Biological Evidence'
        verbose_name_plural = 'Biological Evidence'
        ordering = ['-recorded_at']


class EvidenceImage(models.Model):
    """
    Image model for evidence that requires multiple photos.
    """
    image = models.ImageField(
        upload_to='evidence/images/',
        help_text="Evidence photograph"
    )
    caption = models.CharField(
        max_length=500,
        blank=True,
        help_text="Image caption/description"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Image: {self.caption or self.id}"


class VehicleEvidence(BaseEvidence):
    """
    Vehicle evidence found at crime scene.
    Must have either license_plate OR serial_number (not both).
    """
    model = models.CharField(
        max_length=200,
        help_text="Vehicle model"
    )
    color = models.CharField(
        max_length=100,
        help_text="Vehicle color"
    )
    license_plate = models.CharField(
        max_length=20,
        blank=True,
        help_text="License plate number (if available)"
    )
    serial_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Vehicle serial number (if no plate)"
    )

    class Meta:
        verbose_name = 'Vehicle Evidence'
        verbose_name_plural = 'Vehicle Evidence'
        ordering = ['-recorded_at']

    def clean(self):
        """Ensure either license_plate or serial_number is provided, but not both."""
        from django.core.exceptions import ValidationError
        if self.license_plate and self.serial_number:
            raise ValidationError("Vehicle cannot have both license plate and serial number")
        if not self.license_plate and not self.serial_number:
            raise ValidationError("Vehicle must have either license plate or serial number")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class IDDocument(BaseEvidence):
    """
    Identification document evidence found at crime scene.
    Stores owner's full name and additional key-value pairs (flexible structure).
    """
    owner_full_name = models.CharField(
        max_length=300,
        help_text="Full name on ID document"
    )
    document_type = models.CharField(
        max_length=200,
        help_text="Type of ID document (e.g., national ID, driver's license, work badge)"
    )
    # Flexible key-value storage for document attributes
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional document attributes as key-value pairs (e.g., {\"id_number\": \"123456\", \"issue_date\": \"2020-01-01\"})"
    )

    class Meta:
        verbose_name = 'ID Document'
        verbose_name_plural = 'ID Documents'
        ordering = ['-recorded_at']

    def __str__(self):
        return f"ID Document: {self.owner_full_name} - {self.document_type}"


class GenericEvidence(BaseEvidence):
    """
    Generic evidence type for any other evidence.
    Simple title-description format.
    """

    class Meta:
        verbose_name = 'Generic Evidence'
        verbose_name_plural = 'Generic Evidence'
        ordering = ['-recorded_at']
