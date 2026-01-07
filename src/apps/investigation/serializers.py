from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.cases.models import Case
from .models import (
    DetectiveBoard, BoardItem, EvidenceConnection, Suspect, 
    Interrogation, TipOff, SuspectSubmission, Notification
)

User = get_user_model()


class BoardItemSerializer(serializers.ModelSerializer):
    """Serializer for Board Items."""
    class Meta:
        model = BoardItem
        fields = ['id', 'board', 'content_type', 'object_id', 'position_x', 'position_y', 'added_at']
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


class InterrogationSerializer(serializers.ModelSerializer):
    """Serializer for Interrogations."""
    class Meta:
        model = Interrogation
        fields = [
            'id', 'suspect', 'detective', 'sergeant',
            'detective_guilt_rating', 'sergeant_guilt_rating',
            'detective_notes', 'sergeant_notes', 'interrogated_at'
        ]
        read_only_fields = ['id', 'interrogated_at']


class TipOffSerializer(serializers.ModelSerializer):
    """Serializer for Tip-Offs."""
    class Meta:
        model = TipOff
        fields = [
            'id', 'case', 'suspect', 'submitted_by', 'information',
            'status', 'reviewed_by_officer', 'reviewed_by_detective',
            'redemption_code', 'reward_amount',
            'submitted_at', 'approved_at', 'redeemed_at'
        ]
        read_only_fields = ['id', 'status', 'redemption_code', 'reward_amount', 'submitted_at', 'approved_at', 'redeemed_at']


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
