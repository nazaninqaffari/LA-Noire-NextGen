from rest_framework import serializers
from .models import DetectiveBoard, BoardItem, EvidenceConnection, Suspect, Interrogation, TipOff


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
        read_only_fields = ['id', 'created_at', 'updated_at']


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
