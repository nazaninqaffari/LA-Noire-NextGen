from django.contrib import admin
from .models import CrimeLevel, Case, Complainant, Witness, CaseReview


@admin.register(CrimeLevel)
class CrimeLevelAdmin(admin.ModelAdmin):
    """Admin interface for Crime Levels."""
    list_display = ['name', 'level', 'created_at']
    ordering = ['level']


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    """Admin interface for Cases."""
    list_display = ['case_number', 'title', 'crime_level', 'status', 'formation_type', 'created_at']
    list_filter = ['status', 'crime_level', 'formation_type']
    search_fields = ['case_number', 'title', 'description']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'opened_at', 'closed_at']


@admin.register(Complainant)
class ComplainantAdmin(admin.ModelAdmin):
    """Admin interface for Complainants."""
    list_display = ['user', 'case', 'is_primary', 'verified_by_cadet', 'added_at']
    list_filter = ['is_primary', 'verified_by_cadet']
    search_fields = ['user__username', 'case__case_number']
    ordering = ['-added_at']


@admin.register(Witness)
class WitnessAdmin(admin.ModelAdmin):
    """Admin interface for Witnesses."""
    list_display = ['get_name', 'case', 'phone_number', 'added_at']
    search_fields = ['full_name', 'user__username', 'case__case_number', 'national_id']
    ordering = ['-added_at']
    
    def get_name(self, obj):
        return obj.user.get_full_name() if obj.user else obj.full_name
    get_name.short_description = 'Name'


@admin.register(CaseReview)
class CaseReviewAdmin(admin.ModelAdmin):
    """Admin interface for Case Reviews."""
    list_display = ['case', 'reviewer', 'decision', 'reviewed_at']
    list_filter = ['decision']
    search_fields = ['case__case_number', 'reviewer__username']
    ordering = ['-reviewed_at']
