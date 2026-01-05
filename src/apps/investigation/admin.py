from django.contrib import admin
from .models import (
    DetectiveBoard, BoardItem, EvidenceConnection,
    Suspect, Interrogation, TipOff
)


@admin.register(DetectiveBoard)
class DetectiveBoardAdmin(admin.ModelAdmin):
    """Admin interface for Detective Boards."""
    list_display = ['case', 'detective', 'created_at']
    search_fields = ['case__case_number', 'detective__username']
    ordering = ['-created_at']


@admin.register(BoardItem)
class BoardItemAdmin(admin.ModelAdmin):
    """Admin interface for Board Items."""
    list_display = ['board', 'content_type', 'object_id', 'position_x', 'position_y']
    list_filter = ['content_type']
    ordering = ['board', 'added_at']


@admin.register(EvidenceConnection)
class EvidenceConnectionAdmin(admin.ModelAdmin):
    """Admin interface for Evidence Connections."""
    list_display = ['board', 'from_item', 'to_item', 'created_at']
    ordering = ['-created_at']


@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    """Admin interface for Suspects."""
    list_display = ['person', 'case', 'status', 'identified_at', 'arrest_warrant_issued']
    list_filter = ['status', 'arrest_warrant_issued']
    search_fields = ['person__username', 'case__case_number']
    ordering = ['-identified_at']


@admin.register(Interrogation)
class InterrogationAdmin(admin.ModelAdmin):
    """Admin interface for Interrogations."""
    list_display = ['suspect', 'detective', 'sergeant', 'detective_guilt_rating', 'sergeant_guilt_rating']
    list_filter = ['interrogated_at']
    ordering = ['-interrogated_at']


@admin.register(TipOff)
class TipOffAdmin(admin.ModelAdmin):
    """Admin interface for Tip-Offs."""
    list_display = ['case', 'submitted_by', 'status', 'reward_amount', 'submitted_at']
    list_filter = ['status']
    search_fields = ['case__case_number', 'submitted_by__username', 'redemption_code']
    ordering = ['-submitted_at']
