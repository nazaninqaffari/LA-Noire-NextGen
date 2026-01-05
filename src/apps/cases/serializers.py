from rest_framework import serializers
from .models import CrimeLevel, Case, Complainant, Witness, CaseReview
from apps.accounts.serializers import UserSerializer


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
        read_only_fields = ['id', 'case_number', 'created_at', 'updated_at', 'opened_at', 'closed_at']


class CaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a case via complaint."""
    complainant_statement = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = Case
        fields = [
            'title', 'description', 'crime_level',
            'formation_type', 'complainant_statement'
        ]
    
    def create(self, validated_data):
        """Create case and primary complainant."""
        complainant_statement = validated_data.pop('complainant_statement')
        user = self.context['request'].user
        
        # Generate case number
        import uuid
        validated_data['case_number'] = f"CASE-{uuid.uuid4().hex[:12].upper()}"
        validated_data['created_by'] = user
        validated_data['status'] = Case.STATUS_DRAFT
        
        case = Case.objects.create(**validated_data)
        
        # Create primary complainant
        Complainant.objects.create(
            case=case,
            user=user,
            statement=complainant_statement,
            is_primary=True
        )
        
        return case


class CrimeSceneCaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a case via crime scene report."""
    witness_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="List of witnesses with phone_number and national_id"
    )
    
    class Meta:
        model = Case
        fields = [
            'title', 'description', 'crime_level',
            'crime_scene_location', 'crime_scene_datetime',
            'witness_data'
        ]
    
    def create(self, validated_data):
        """Create crime scene case."""
        witness_data = validated_data.pop('witness_data', [])
        user = self.context['request'].user
        
        # Generate case number
        import uuid
        validated_data['case_number'] = f"CASE-{uuid.uuid4().hex[:12].upper()}"
        validated_data['created_by'] = user
        validated_data['formation_type'] = Case.FORMATION_CRIME_SCENE
        validated_data['status'] = Case.STATUS_OFFICER_REVIEW  # Needs supervisor approval
        
        case = Case.objects.create(**validated_data)
        
        # Add witnesses
        for witness_info in witness_data:
            Witness.objects.create(
                case=case,
                phone_number=witness_info.get('phone_number', ''),
                national_id=witness_info.get('national_id', ''),
                full_name=witness_info.get('full_name', ''),
                added_by=user
            )
        
        return case
