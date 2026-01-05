from rest_framework import serializers
from .models import Trial, Verdict, Punishment, BailPayment


class TrialSerializer(serializers.ModelSerializer):
    """Serializer for Trials."""
    class Meta:
        model = Trial
        fields = [
            'id', 'case', 'suspect', 'judge',
            'submitted_by_captain', 'submitted_by_chief',
            'captain_notes', 'chief_notes',
            'trial_started_at', 'trial_ended_at'
        ]
        read_only_fields = ['id', 'trial_started_at', 'trial_ended_at']


class PunishmentSerializer(serializers.ModelSerializer):
    """Serializer for Punishments."""
    class Meta:
        model = Punishment
        fields = ['id', 'verdict', 'title', 'description', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']


class VerdictSerializer(serializers.ModelSerializer):
    """Serializer for Verdicts."""
    punishment = PunishmentSerializer(read_only=True)
    
    class Meta:
        model = Verdict
        fields = ['id', 'trial', 'decision', 'reasoning', 'punishment', 'delivered_at']
        read_only_fields = ['id', 'delivered_at']


class BailPaymentSerializer(serializers.ModelSerializer):
    """Serializer for Bail Payments."""
    class Meta:
        model = BailPayment
        fields = [
            'id', 'suspect', 'amount', 'status',
            'approved_by_sergeant', 'payment_reference',
            'requested_at', 'approved_at', 'paid_at'
        ]
        read_only_fields = ['id', 'status', 'requested_at', 'approved_at', 'paid_at']
