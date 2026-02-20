"""Serializers for Case formation and management.
Handles complaint-based and crime scene-based case creation workflows.
"""
from rest_framework import serializers
from django.db import transaction
from .models import CrimeLevel, Case, Complainant, Witness, CaseReview
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import Role


class CrimeLevelSerializer(serializers.ModelSerializer):
    """Serializer for Crime Level."""
    
    class Meta:
        model = CrimeLevel
        fields = ['id', 'name', 'level', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class WitnessSerializer(serializers.ModelSerializer):
    """Serializer for Witness."""
    user_details = UserSerializer(source='user', read_only=True)
    added_by_details = UserSerializer(source='added_by', read_only=True)
    
    class Meta:
        model = Witness
        fields = [
            'id', 'case', 'user', 'user_details', 'full_name', 'phone_number',
            'national_id', 'added_at', 'added_by', 'added_by_details'
        ]
        read_only_fields = ['id', 'added_at']


class ComplainantSerializer(serializers.ModelSerializer):
    """Serializer for Complainant."""
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Complainant
        fields = [
            'id', 'case', 'user', 'user_details', 'statement',
            'is_primary', 'verified_by_cadet', 'added_at'
        ]
        read_only_fields = ['id', 'added_at']


class CaseReviewSerializer(serializers.ModelSerializer):
    """Serializer for Case Review."""
    reviewer_details = UserSerializer(source='reviewer', read_only=True)
    
    class Meta:
        model = CaseReview
        fields = [
            'id', 'case', 'reviewer', 'reviewer_details',
            'decision', 'rejection_reason', 'reviewed_at'
        ]
        read_only_fields = ['id', 'reviewed_at']


class CaseSerializer(serializers.ModelSerializer):
    """Serializer for Case with full details."""
    crime_level_details = CrimeLevelSerializer(source='crime_level', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    assigned_cadet_details = UserSerializer(source='assigned_cadet', read_only=True)
    assigned_officer_details = UserSerializer(source='assigned_officer', read_only=True)
    assigned_detective_details = UserSerializer(source='assigned_detective', read_only=True)
    assigned_sergeant_details = UserSerializer(source='assigned_sergeant', read_only=True)
    
    complainants = ComplainantSerializer(many=True, read_only=True)
    witnesses = WitnessSerializer(many=True, read_only=True)
    reviews = CaseReviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'description',
            'crime_level', 'crime_level_details', 'formation_type',
            'status', 'rejection_count',
            'crime_scene_location', 'crime_scene_datetime',
            'created_by', 'created_by_details',
            'assigned_cadet', 'assigned_cadet_details',
            'assigned_officer', 'assigned_officer_details',
            'assigned_detective', 'assigned_detective_details',
            'assigned_sergeant', 'assigned_sergeant_details',
            'complainants', 'witnesses', 'reviews',
            'created_at', 'updated_at', 'opened_at', 'closed_at'
        ]
        read_only_fields = [
            'id', 'case_number', 'status', 'rejection_count', 'formation_type',
            'created_by', 'assigned_cadet', 'assigned_officer',
            'created_at', 'updated_at', 'opened_at', 'closed_at'
        ]
        # Note: assigned_detective and assigned_sergeant are intentionally
        # writable so Administrators can assign them via PATCH (see perform_update).


class CaseCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a case via complaint.
    Complainant submits case information and initial statement.
    Supports collaborative complaints – the creator can add other persons.
    """
    complainant_statement = serializers.CharField(
        write_only=True,
        required=True,
        min_length=10,
        help_text="Primary complainant's statement about the incident"
    )
    additional_complainants = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="List of additional complainants: [{user_id, statement}, ...]"
    )
    
    class Meta:
        model = Case
        fields = [
            'title', 'description', 'crime_level',
            'complainant_statement', 'additional_complainants'
        ]
    
    def validate(self, data):
        """Validate case creation data."""
        # Ensure user is not a police officer (except cadet)
        user = self.context['request'].user
        police_roles = user.roles.filter(is_police_rank=True).exclude(name='Cadet')
        
        if police_roles.exists():
            raise serializers.ValidationError(
                "Police personnel (except Cadets) cannot file complaints. "
                "Use crime scene report instead."
            )
        
        return data
    
    def validate_additional_complainants(self, value):
        """Validate each additional complainant entry."""
        from apps.accounts.models import User
        for entry in value:
            if 'user_id' not in entry:
                raise serializers.ValidationError("Each entry must have a 'user_id' field.")
            if 'statement' not in entry or len(str(entry['statement'])) < 10:
                raise serializers.ValidationError(
                    "Each entry must have a 'statement' of at least 10 characters."
                )
            try:
                User.objects.get(id=entry['user_id'])
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    f"User with id {entry['user_id']} not found."
                )
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        """Create case with complainant(s) and set to cadet review."""
        complainant_statement = validated_data.pop('complainant_statement')
        additional_complainants = validated_data.pop('additional_complainants', [])
        user = self.context['request'].user
        
        # Generate unique case number
        import uuid
        from datetime import datetime
        year = datetime.now().year
        validated_data['case_number'] = f"{year}-CMPL-{uuid.uuid4().hex[:8].upper()}"
        validated_data['created_by'] = user
        validated_data['formation_type'] = Case.FORMATION_COMPLAINT
        validated_data['status'] = Case.STATUS_CADET_REVIEW
        
        # Create case
        case = Case.objects.create(**validated_data)
        
        # Create primary complainant
        Complainant.objects.create(
            case=case,
            user=user,
            statement=complainant_statement,
            is_primary=True,
            verified_by_cadet=False
        )
        
        # Create additional complainants
        for entry in additional_complainants:
            uid = entry['user_id']
            stmt = entry['statement']
            # Skip if same as primary complainant
            if int(uid) == user.id:
                continue
            Complainant.objects.create(
                case=case,
                user_id=uid,
                statement=stmt,
                is_primary=False,
                verified_by_cadet=False
            )
        
        return case


class CrimeSceneCaseCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a case via crime scene report.
    Police officer (non-cadet) reports witnessed or reported crime scene.
    """
    witness_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="List of witnesses: [{full_name, phone_number, national_id}, ...]"
    )
    
    class Meta:
        model = Case
        fields = [
            'title', 'description', 'crime_level',
            'crime_scene_location', 'crime_scene_datetime',
            'witness_data'
        ]
    
    def validate(self, data):
        """Validate crime scene case creation."""
        user = self.context['request'].user
        
        # Must be police officer (not cadet)
        police_roles = user.roles.filter(is_police_rank=True).exclude(name='Cadet')
        
        if not police_roles.exists():
            raise serializers.ValidationError(
                "Only police personnel (except Cadets) can report crime scenes."
            )
        
        # Crime scene location and datetime are required
        if not data.get('crime_scene_location'):
            raise serializers.ValidationError({
                'crime_scene_location': 'Crime scene location is required for crime scene reports'
            })
        
        if not data.get('crime_scene_datetime'):
            raise serializers.ValidationError({
                'crime_scene_datetime': 'Crime scene date/time is required for crime scene reports'
            })
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Create crime scene case and add witnesses."""
        witness_data = validated_data.pop('witness_data', [])
        user = self.context['request'].user
        
        # Generate unique case number
        import uuid
        from datetime import datetime
        year = datetime.now().year
        validated_data['case_number'] = f"{year}-SCEN-{uuid.uuid4().hex[:8].upper()}"
        validated_data['created_by'] = user
        validated_data['formation_type'] = Case.FORMATION_CRIME_SCENE
        
        # Determine initial status based on reporter's rank
        user_role = user.roles.filter(is_police_rank=True).order_by('-hierarchy_level').first()
        
        # Police Chief doesn't need approval
        if user_role and user_role.name == 'Police Chief':
            validated_data['status'] = Case.STATUS_OPEN
            validated_data['assigned_officer'] = user
            from django.utils import timezone
            validated_data['opened_at'] = timezone.now()
        else:
            # Others need superior approval
            validated_data['status'] = Case.STATUS_OFFICER_REVIEW
        
        # Create case
        case = Case.objects.create(**validated_data)
        
        # Add witnesses
        for witness_info in witness_data:
            Witness.objects.create(
                case=case,
                full_name=witness_info.get('full_name', ''),
                phone_number=witness_info.get('phone_number', ''),
                national_id=witness_info.get('national_id', ''),
                added_by=user
            )
        
        return case


class ComplainantAddSerializer(serializers.Serializer):
    """
    Serializer for adding additional complainants to a case.
    Used by cadets to add more complainants during review.
    """
    user_id = serializers.IntegerField(
        required=True,
        help_text="ID of user to add as complainant"
    )
    statement = serializers.CharField(
        required=True,
        min_length=10,
        help_text="Complainant's statement about the incident"
    )
    
    def validate_user_id(self, value):
        """Validate user exists."""
        from apps.accounts.models import User
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
        return value


class CaseReviewActionSerializer(serializers.Serializer):
    """
    Serializer for cadet/officer case review actions.
    Handles approval or rejection with reasons.
    """
    DECISION_APPROVED = 'approved'
    DECISION_REJECTED = 'rejected'
    
    DECISION_CHOICES = [
        (DECISION_APPROVED, 'Approved'),
        (DECISION_REJECTED, 'Rejected'),
    ]
    
    decision = serializers.ChoiceField(
        choices=DECISION_CHOICES,
        required=True,
        help_text="Review decision: 'approved' or 'rejected'"
    )
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for rejection (required if decision is 'rejected')"
    )
    
    def validate(self, data):
        """Validate that rejection reason is provided for rejections."""
        if data['decision'] == self.DECISION_REJECTED:
            if not data.get('rejection_reason'):
                raise serializers.ValidationError({
                    'rejection_reason': 'Rejection reason is required when rejecting a case'
                })
        return data


class ComplainantVerificationSerializer(serializers.Serializer):
    """
    Serializer for cadet to verify additional complainants.
    """
    verified = serializers.BooleanField(
        required=True,
        help_text="Whether complainant information is verified"
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional verification notes"
    )
