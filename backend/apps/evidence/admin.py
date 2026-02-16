from django.contrib import admin
from .models import (
    Testimony, BiologicalEvidence, EvidenceImage,
    VehicleEvidence, IDDocument, GenericEvidence
)


@admin.register(Testimony)
class TestimonyAdmin(admin.ModelAdmin):
    """Admin interface for Testimony."""
    list_display = ['title', 'case', 'witness', 'witness_name', 'recorded_at']
    list_filter = ['recorded_at']
    search_fields = ['title', 'transcript', 'case__case_number', 'witness__username']
    ordering = ['-recorded_at']


@admin.register(BiologicalEvidence)
class BiologicalEvidenceAdmin(admin.ModelAdmin):
    """Admin interface for Biological Evidence."""
    list_display = ['title', 'case', 'evidence_type', 'verified_by_coroner', 'verified_at']
    list_filter = ['verified_at', 'evidence_type']
    search_fields = ['title', 'evidence_type', 'case__case_number']
    ordering = ['-recorded_at']


@admin.register(EvidenceImage)
class EvidenceImageAdmin(admin.ModelAdmin):
    """Admin interface for Evidence Images."""
    list_display = ['id', 'caption', 'uploaded_at']
    ordering = ['-uploaded_at']


@admin.register(VehicleEvidence)
class VehicleEvidenceAdmin(admin.ModelAdmin):
    """Admin interface for Vehicle Evidence."""
    list_display = ['title', 'case', 'model', 'color', 'license_plate', 'serial_number']
    search_fields = ['title', 'model', 'license_plate', 'serial_number', 'case__case_number']
    ordering = ['-recorded_at']


@admin.register(IDDocument)
class IDDocumentAdmin(admin.ModelAdmin):
    """Admin interface for ID Documents."""
    list_display = ['title', 'case', 'owner_full_name', 'document_type', 'recorded_at']
    search_fields = ['title', 'owner_full_name', 'document_type', 'case__case_number']
    ordering = ['-recorded_at']


@admin.register(GenericEvidence)
class GenericEvidenceAdmin(admin.ModelAdmin):
    """Admin interface for Generic Evidence."""
    list_display = ['title', 'case', 'recorded_at']
    search_fields = ['title', 'description', 'case__case_number']
    ordering = ['-recorded_at']
