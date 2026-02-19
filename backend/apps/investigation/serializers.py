from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.cases.models import Case
from .models import (
    DetectiveBoard, BoardItem, EvidenceConnection, Suspect, 
    Interrogation, TipOff, SuspectSubmission, Notification,
    CaptainDecision, PoliceChiefDecision
)

User = get_user_model()


class BoardItemSerializer(serializers.ModelSerializer):
    """Serializer for Board Items. Includes label and notes for UI display."""
    class Meta:
        model = BoardItem
        fields = ['id', 'board', 'content_type', 'object_id', 'label', 'notes', 'position_x', 'position_y', 'added_at']
        read_only_fields = ['id', 'added_at']


class EvidenceConnectionSerializer(serializers.ModelSerializer):
    """Serializer for Evidence Connections."""
    class Meta:
        model = EvidenceConnection
        fields = ['id', 'board', 'from_item', 'to_item', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class DetectiveBoardSerializer(serializers.ModelSerializer):
    """Serializer for Detective Boards."""
    items = BoardItemSerializer(many=True, read_only=True)
    connections = EvidenceConnectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = DetectiveBoard
        fields = ['id', 'case', 'detective', 'items', 'connections', 'created_at', 'updated_at']
        read_only_fields = ['id', 'detective', 'created_at', 'updated_at']


class SuspectSerializer(serializers.ModelSerializer):
    """Serializer for Suspects."""
    danger_score = serializers.IntegerField(source='get_danger_score', read_only=True)
    reward_amount = serializers.IntegerField(source='get_reward_amount', read_only=True)
    
    class Meta:
        model = Suspect
        fields = [
            'id', 'case', 'person', 'status', 'reason',
            'identified_by_detective', 'approved_by_sergeant', 'sergeant_approval_message',
            'arrest_warrant_issued', 'photo', 'danger_score', 'reward_amount',
            'identified_at', 'arrested_at'
        ]
        read_only_fields = ['id', 'identified_at', 'arrested_at']


class IntensivePursuitSuspectSerializer(serializers.ModelSerializer):
    """
    Public serializer for suspects in intensive pursuit (wanted list).
    Displays photo, details, danger score, and reward.
    
    Persian: لیست تحت تعقیب شدید - صفحه عمومی
    """
    person_full_name = serializers.CharField(source='person.get_full_name', read_only=True)
    person_username = serializers.CharField(source='person.username', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    case_title = serializers.CharField(source='case.title', read_only=True)
    crime_level = serializers.IntegerField(source='case.crime_level.level', read_only=True)
    crime_level_name = serializers.CharField(source='case.crime_level.name', read_only=True)
    days_at_large = serializers.SerializerMethodField()
    danger_score = serializers.IntegerField(source='get_danger_score', read_only=True)
    reward_amount = serializers.IntegerField(source='get_reward_amount', read_only=True)
    
    class Meta:
        model = Suspect
        fields = [
            'id', 'person_full_name', 'person_username', 'photo',
            'case_number', 'case_title', 'crime_level', 'crime_level_name',
            'reason', 'days_at_large', 'danger_score', 'reward_amount',
            'identified_at', 'status'
        ]
    
    def get_days_at_large(self, obj):
        """Calculate days suspect has been pursued."""
        return (timezone.now() - obj.identified_at).days


class InterrogationSerializer(serializers.ModelSerializer):
    """
    Serializer for Interrogations.
    Both detective and sergeant provide guilt ratings (1-10).
    Persian: بازجویی مظنونین
    """
    suspect_name = serializers.CharField(source='suspect.person.full_name', read_only=True)
    detective_name = serializers.CharField(source='detective.get_full_name', read_only=True)
    sergeant_name = serializers.CharField(source='sergeant.get_full_name', read_only=True)
    average_rating = serializers.FloatField(source='average_guilt_rating', read_only=True)
    is_complete = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Interrogation
        fields = [
            'id', 'suspect', 'suspect_name', 'detective', 'detective_name',
            'sergeant', 'sergeant_name', 'status',
            'detective_guilt_rating', 'sergeant_guilt_rating', 'average_rating',
            'detective_notes', 'sergeant_notes', 'is_complete',
            'interrogated_at', 'submitted_at'
        ]
        read_only_fields = ['id', 'status', 'interrogated_at', 'submitted_at']

    def validate_detective_guilt_rating(self, value):
        """Ensure detective rating is in valid range."""
        if value is not None and (value < 1 or value > 10):
            raise serializers.ValidationError(
                "امتیاز گناه باید بین ۱ تا ۱۰ باشد."
            )
        return value

    def validate_sergeant_guilt_rating(self, value):
        """Ensure sergeant rating is in valid range."""
        if value is not None and (value < 1 or value > 10):
            raise serializers.ValidationError(
                "امتیاز گناه باید بین ۱ تا ۱۰ باشد."
            )
        return value

    def validate(self, attrs):
        """Ensure both ratings are provided when submitting."""
        detective_rating = attrs.get('detective_guilt_rating')
        sergeant_rating = attrs.get('sergeant_guilt_rating')
        
        # If submitting, both ratings must be provided
        if self.instance and self.instance.status == Interrogation.STATUS_PENDING:
            if detective_rating is None or sergeant_rating is None:
                raise serializers.ValidationError(
                    "هر دو امتیاز (کارآگاه و گروهبان) باید ارائه شوند."
                )
        
        return attrs


class InterrogationSubmitSerializer(serializers.Serializer):
    """
    Serializer for submitting interrogation ratings to captain.
    Persian: ارسال نتایج بازجویی به سرگروه
    """
    detective_guilt_rating = serializers.IntegerField(min_value=1, max_value=10)
    sergeant_guilt_rating = serializers.IntegerField(min_value=1, max_value=10)
    detective_notes = serializers.CharField(required=True, min_length=10)
    sergeant_notes = serializers.CharField(required=True, min_length=10)


class CaptainDecisionSerializer(serializers.ModelSerializer):
    """
    Serializer for Captain's decision on interrogation.
    Captain reviews ratings, evidence, and statements to make final decision.
    Persian: تصمیم سرگروه
    """
    interrogation_details = InterrogationSerializer(source='interrogation', read_only=True)
    captain_name = serializers.CharField(source='captain.get_full_name', read_only=True)
    suspect_name = serializers.CharField(source='interrogation.suspect.person.full_name', read_only=True)
    requires_chief = serializers.BooleanField(source='requires_chief_approval', read_only=True)
    
    class Meta:
        model = CaptainDecision
        fields = [
            'id', 'interrogation', 'interrogation_details', 'captain', 'captain_name',
            'suspect_name', 'decision', 'reasoning', 'status', 'requires_chief',
            'decided_at'
        ]
        read_only_fields = ['id', 'captain', 'status', 'decided_at']

    def validate_reasoning(self, value):
        """Ensure reasoning is comprehensive."""
        if len(value) < 20:
            raise serializers.ValidationError(
                "استدلال باید حداقل ۲۰ کاراکتر باشد."
            )
        return value

    def validate_interrogation(self, value):
        """Ensure interrogation is complete and submitted."""
        if not value.is_complete():
            raise serializers.ValidationError(
                "بازجویی باید تکمیل شده باشد."
            )
        if value.status != Interrogation.STATUS_SUBMITTED:
            raise serializers.ValidationError(
                "بازجویی باید ارسال شده باشد."
            )
        # Check if already has a decision
        if hasattr(value, 'captain_decision'):
            raise serializers.ValidationError(
                "این بازجویی قبلاً بررسی شده است."
            )
        return value


class PoliceChiefDecisionSerializer(serializers.ModelSerializer):
    """
    Serializer for Police Chief's decision (only for critical crimes).
    Final approval/rejection of captain's decision.
    Persian: تصمیم رئیس پلیس (فقط برای جنایات بحرانی)
    """
    captain_decision_details = CaptainDecisionSerializer(source='captain_decision', read_only=True)
    chief_name = serializers.CharField(source='police_chief.get_full_name', read_only=True)
    suspect_name = serializers.CharField(source='captain_decision.interrogation.suspect.person.full_name', read_only=True)
    
    class Meta:
        model = PoliceChiefDecision
        fields = [
            'id', 'captain_decision', 'captain_decision_details', 'police_chief',
            'chief_name', 'suspect_name', 'decision', 'comments', 'decided_at'
        ]
        read_only_fields = ['id', 'police_chief', 'decided_at']

    def validate_comments(self, value):
        """Ensure comments are provided."""
        if len(value) < 10:
            raise serializers.ValidationError(
                "نظرات باید حداقل ۱۰ کاراکتر باشد."
            )
        return value

    def validate_captain_decision(self, value):
        """Ensure captain decision requires chief approval and hasn't been reviewed."""
        if not value.requires_chief_approval():
            raise serializers.ValidationError(
                "این جنایت نیاز به تایید رئیس پلیس ندارد."
            )
        if hasattr(value, 'chief_decision'):
            raise serializers.ValidationError(
                "این تصمیم قبلاً توسط رئیس پلیس بررسی شده است."
            )
        return value


class TipOffSerializer(serializers.ModelSerializer):
    """
    Serializer for Tip-Offs with complete review workflow.
    Tracks officer review → detective confirmation → reward redemption.
    """
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    submitted_by_national_id = serializers.CharField(source='submitted_by.national_id', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    case_title = serializers.CharField(source='case.title', read_only=True)
    suspect_name = serializers.CharField(source='suspect.person.get_full_name', read_only=True, allow_null=True)
    reviewed_by_officer_name = serializers.CharField(source='reviewed_by_officer.get_full_name', read_only=True, allow_null=True)
    reviewed_by_detective_name = serializers.CharField(source='reviewed_by_detective.get_full_name', read_only=True, allow_null=True)
    redeemed_by_officer_name = serializers.CharField(source='redeemed_by_officer.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = TipOff
        fields = [
            'id', 'case', 'case_number', 'case_title', 'suspect', 'suspect_name',
            'submitted_by', 'submitted_by_name', 'submitted_by_national_id',
            'information', 'status',
            'reviewed_by_officer', 'reviewed_by_officer_name', 'officer_rejection_reason', 'officer_reviewed_at',
            'reviewed_by_detective', 'reviewed_by_detective_name', 'detective_rejection_reason', 'detective_reviewed_at',
            'redemption_code', 'reward_amount',
            'redeemed_by_officer', 'redeemed_by_officer_name',
            'submitted_at', 'approved_at', 'redeemed_at'
        ]
        read_only_fields = [
            'id', 'status', 'redemption_code', 'submitted_at', 'approved_at', 'redeemed_at',
            'officer_reviewed_at', 'detective_reviewed_at',
            'reviewed_by_officer', 'reviewed_by_detective', 'redeemed_by_officer',
            'submitted_by'  # Automatically set to current user
        ]


class RewardVerificationSerializer(serializers.Serializer):
    """Serializer for verifying reward code and national ID."""
    national_id = serializers.CharField(max_length=10, help_text="National ID of reward recipient")
    redemption_code = serializers.CharField(max_length=20, help_text="Unique reward redemption code")


class SuspectSubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer for suspect submission by detective to sergeant.
    Detective proposes main suspects with reasoning, sergeant reviews and approves/rejects.
    
    Persian: ارسال مظنونین برای تایید گروهبان
    """
    detective_name = serializers.CharField(source='detective.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    suspects_details = SuspectSerializer(source='suspects', many=True, read_only=True)
    
    class Meta:
        model = SuspectSubmission
        fields = [
            'id', 'case', 'case_number', 'detective', 'detective_name',
            'suspects', 'suspects_details', 'reasoning', 'status',
            'reviewed_by', 'reviewed_by_name', 'review_notes',
            'submitted_at', 'reviewed_at'
        ]
        read_only_fields = ['id', 'detective', 'status', 'reviewed_by', 'reviewed_at', 'submitted_at']

    def validate_case(self, value):
        """Ensure case is in investigation status."""
        if value.status not in [Case.STATUS_OPEN, Case.STATUS_UNDER_INVESTIGATION]:
            raise serializers.ValidationError(
                "پرونده باید در حالت باز یا تحت بررسی باشد."
            )
        return value

    def validate_suspects(self, value):
        """Ensure at least one suspect is submitted."""
        if not value:
            raise serializers.ValidationError(
                "حداقل یک مظنون باید شناسایی شود."
            )
        return value

    def validate(self, attrs):
        """Ensure all suspects belong to the submitted case."""
        case = attrs.get('case')
        suspects = attrs.get('suspects', [])
        
        for suspect in suspects:
            if suspect.case != case:
                raise serializers.ValidationError(
                    f"مظنون {suspect.person.get_full_name()} متعلق به این پرونده نیست."
                )
        
        return attrs


class SuspectSubmissionReviewSerializer(serializers.Serializer):
    """
    Serializer for sergeant's review of suspect submission.
    Sergeant can approve or reject with review notes.
    
    Persian: بررسی و تایید مظنونین توسط گروهبان
    """
    DECISION_APPROVE = 'approve'
    DECISION_REJECT = 'reject'
    DECISION_CHOICES = [
        (DECISION_APPROVE, 'Approve'),
        (DECISION_REJECT, 'Reject'),
    ]
    
    decision = serializers.ChoiceField(
        choices=DECISION_CHOICES,
        help_text="Sergeant's decision: approve or reject"
    )
    review_notes = serializers.CharField(
        required=True,
        help_text="Sergeant's reasoning for approval or objection"
    )

    def validate_review_notes(self, value):
        """Ensure review notes are provided."""
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError(
                "توضیحات بررسی باید حداقل 10 کاراکتر باشد."
            )
        return value


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for system notifications.
    Supports all notification types with generic related objects.
    
    Persian: اعلان‌های سیستم
    """
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    case_number = serializers.CharField(source='related_case.case_number', read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_name', 'notification_type', 'notification_type_display',
            'title', 'message', 'related_case', 'case_number',
            'content_type', 'object_id', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class NotificationMarkReadSerializer(serializers.Serializer):
    """
    Simple serializer for marking notifications as read.
    Can mark single or multiple notifications.
    
    Persian: علامت‌گذاری اعلان به عنوان خوانده شده
    """
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of notification IDs to mark as read (optional - marks all if not provided)"
    )
