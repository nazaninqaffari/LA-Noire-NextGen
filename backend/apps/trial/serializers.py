from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.cases.serializers import CaseSerializer
from apps.investigation.serializers import SuspectSerializer, InterrogationSerializer
from apps.evidence.serializers import TestimonySerializer, BiologicalEvidenceSerializer, VehicleEvidenceSerializer
from .models import Trial, Verdict, Punishment, BailPayment

User = get_user_model()


class PoliceMemberSerializer(serializers.ModelSerializer):
    """Serializer for police members involved in case."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'roles', 'email', 'phone_number']
        read_only_fields = fields
    
    def get_roles(self, obj):
        """Get list of role names."""
        return [role.name for role in obj.roles.all()]


class PunishmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Punishments assigned to guilty verdicts.
    Persian: مجازات مجرم
    """
    class Meta:
        model = Punishment
        fields = ['id', 'verdict', 'title', 'description', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']
    
    def validate_title(self, value):
        """Ensure title is provided."""
        if len(value) < 5:
            raise serializers.ValidationError(
                "Punishment title must be at least 5 characters."
            )
        return value
    
    def validate_description(self, value):
        """Ensure description is comprehensive."""
        if len(value) < 20:
            raise serializers.ValidationError(
                "Punishment description must be at least 20 characters."
            )
        return value


class VerdictSerializer(serializers.ModelSerializer):
    """
    Serializer for Judge's verdict.
    Persian: حکم قاضی
    """
    punishment = PunishmentSerializer(read_only=True)
    trial_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Verdict
        fields = ['id', 'trial', 'decision', 'reasoning', 'punishment', 'trial_details', 'delivered_at']
        read_only_fields = ['id', 'delivered_at']
    
    def get_trial_details(self, obj):
        """Get basic trial info."""
        return {
            'case_number': obj.trial.case.case_number,
            'suspect_name': obj.trial.suspect.person.get_full_name(),
            'judge_name': obj.trial.judge.get_full_name()
        }
    
    def validate_reasoning(self, value):
        """Ensure reasoning is comprehensive."""
        if len(value) < 30:
            raise serializers.ValidationError(
                "Verdict reasoning must be at least 30 characters."
            )
        return value
    
    def validate_trial(self, value):
        """Ensure trial doesn't already have a verdict."""
        if hasattr(value, 'verdict'):
            raise serializers.ValidationError(
                "This trial has already received a verdict."
            )
        return value


class VerdictWithPunishmentSerializer(serializers.Serializer):
    """
    Serializer for submitting verdict with punishment (if guilty).
    Persian: ثبت حکم به همراه مجازات
    """
    decision = serializers.ChoiceField(choices=Verdict.VERDICT_CHOICES)
    reasoning = serializers.CharField(min_length=30)
    punishment_title = serializers.CharField(required=False, min_length=5)
    punishment_description = serializers.CharField(required=False, min_length=20)
    
    def validate(self, attrs):
        """If guilty verdict, punishment is required."""
        if attrs['decision'] == Verdict.VERDICT_GUILTY:
            if not attrs.get('punishment_title') or not attrs.get('punishment_description'):
                raise serializers.ValidationError(
                    "Punishment is required for a guilty verdict."
                )
        return attrs


class CaseSummarySerializer(serializers.Serializer):
    """
    Complete case summary for judge review.
    Includes all evidence, police members, interrogations, etc.
    Persian: خلاصه کامل پرونده برای قاضی
    """
    case = CaseSerializer(read_only=True)
    suspect = SuspectSerializer(read_only=True)
    police_members = PoliceMemberSerializer(many=True, read_only=True)
    interrogations = InterrogationSerializer(many=True, read_only=True)
    testimonies = TestimonySerializer(many=True, read_only=True)
    biological_evidence = BiologicalEvidenceSerializer(many=True, read_only=True)
    vehicle_evidence = VehicleEvidenceSerializer(many=True, read_only=True)
    captain_notes = serializers.CharField()
    chief_notes = serializers.CharField()
    captain_decision = serializers.SerializerMethodField()
    chief_decision = serializers.SerializerMethodField()
    
    def get_captain_decision(self, obj):
        """Get captain's decision details."""
        captain = obj.get('submitted_by_captain')
        return {
            'captain_name': captain.get_full_name() if captain else None,
            'notes': obj.get('captain_notes')
        }
    
    def get_chief_decision(self, obj):
        """Get chief's decision details (if applicable)."""
        chief = obj.get('submitted_by_chief')
        if chief:
            return {
                'chief_name': chief.get_full_name(),
                'notes': obj.get('chief_notes')
            }
        return None


class TrialSerializer(serializers.ModelSerializer):
    """
    Serializer for Trials.
    Persian: دادگاه
    """
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    suspect_name = serializers.CharField(source='suspect.person.get_full_name', read_only=True)
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True)
    verdict_details = VerdictSerializer(source='verdict', read_only=True)
    has_verdict = serializers.SerializerMethodField()
    
    class Meta:
        model = Trial
        fields = [
            'id', 'case', 'case_number', 'suspect', 'suspect_name',
            'judge', 'judge_name', 'status', 'trial_date',
            'submitted_by_captain', 'submitted_by_chief',
            'captain_notes', 'chief_notes',
            'verdict_details', 'has_verdict',
            'trial_started_at', 'trial_ended_at'
        ]
        read_only_fields = ['id', 'status', 'trial_started_at', 'trial_ended_at']
    
    def get_has_verdict(self, obj):
        """Check if trial has a verdict."""
        return hasattr(obj, 'verdict')
    
    def validate_case(self, value):
        """Ensure case has a guilty decision from captain/chief."""
        # Check if case has captain decision marked as guilty
        from apps.investigation.models import CaptainDecision
        captain_decisions = CaptainDecision.objects.filter(
            interrogation__suspect__case=value,
            decision=CaptainDecision.DECISION_GUILTY,
        )
        if not captain_decisions.exists():
            raise serializers.ValidationError(
                "Case must have a guilty decision from captain."
            )
        # Accept completed OR awaiting_chief (chief approval is independent step)
        finalized = captain_decisions.filter(
            status__in=[CaptainDecision.STATUS_COMPLETED, CaptainDecision.STATUS_AWAITING_CHIEF]
        )
        if not finalized.exists():
            raise serializers.ValidationError(
                "Captain's guilty decision has not been finalized yet."
            )
        return value


class BailPaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Bail Payments.
    Persian: قرار وثیقه
    """
    suspect_name = serializers.CharField(source='suspect.person.get_full_name', read_only=True)
    sergeant_name = serializers.CharField(source='approved_by_sergeant.get_full_name', read_only=True)
    
    class Meta:
        model = BailPayment
        fields = [
            'id', 'suspect', 'suspect_name', 'amount', 'status',
            'approved_by_sergeant', 'sergeant_name', 'payment_reference',
            'requested_at', 'approved_at', 'paid_at'
        ]
        read_only_fields = ['id', 'status', 'requested_at', 'approved_at', 'paid_at']
    
    def validate_amount(self, value):
        """Ensure bail amount is reasonable."""
        if value < 1_000_000:  # Minimum 1 million Rials
            raise serializers.ValidationError(
                "Bail amount must be at least 1,000,000 Rials."
            )
        if value > 10_000_000_000:  # Maximum 10 billion Rials
            raise serializers.ValidationError(
                "Bail amount cannot exceed 10,000,000,000 Rials."
            )
        return value
    
    def validate_suspect(self, value):
        """Ensure suspect is eligible for bail (level 2 or 3 crimes only)."""
        crime_level = value.case.crime_level.level
        if crime_level < 2:  # Only level 2 and 3
            raise serializers.ValidationError(
                "Only level 2 and 3 crimes are eligible for bail."
            )
        return value
