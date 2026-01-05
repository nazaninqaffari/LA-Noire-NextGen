from django.contrib import admin
from .models import Trial, Verdict, Punishment, BailPayment


@admin.register(Trial)
class TrialAdmin(admin.ModelAdmin):
    """Admin interface for Trials."""
    list_display = ['case', 'suspect', 'judge', 'trial_started_at', 'trial_ended_at']
    list_filter = ['trial_started_at']
    search_fields = ['case__case_number', 'suspect__person__username', 'judge__username']
    ordering = ['-trial_started_at']


@admin.register(Verdict)
class VerdictAdmin(admin.ModelAdmin):
    """Admin interface for Verdicts."""
    list_display = ['trial', 'decision', 'delivered_at']
    list_filter = ['decision', 'delivered_at']
    ordering = ['-delivered_at']


@admin.register(Punishment)
class PunishmentAdmin(admin.ModelAdmin):
    """Admin interface for Punishments."""
    list_display = ['verdict', 'title', 'assigned_at']
    search_fields = ['title', 'description']
    ordering = ['-assigned_at']


@admin.register(BailPayment)
class BailPaymentAdmin(admin.ModelAdmin):
    """Admin interface for Bail Payments."""
    list_display = ['suspect', 'amount', 'status', 'approved_by_sergeant', 'requested_at']
    list_filter = ['status']
    search_fields = ['suspect__person__username', 'payment_reference']
    ordering = ['-requested_at']
