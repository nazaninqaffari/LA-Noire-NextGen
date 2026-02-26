"""
Serializers for Evidence Management.
Handles all types of evidence: testimony, biological, vehicle, ID documents, and generic.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Testimony, BiologicalEvidence, EvidenceImage,
    VehicleEvidence, IDDocument, GenericEvidence
)
from apps.cases.models import Case

User = get_user_model()


class EvidenceImageSerializer(serializers.ModelSerializer):
    """Serializer for Evidence Images."""
    
    class Meta:
        model = EvidenceImage
        fields = ['id', 'image', 'caption', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class TestimonySerializer(serializers.ModelSerializer):
    """
    Serializer for Testimony Evidence.
    
    Witness testimonies or local people statements about the case.
    Can include transcripts and media (images, audio, video).
    """
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    witness_full_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Testimony
        fields = [
            'id', 'case', 'title', 'description', 'witness', 'witness_name',
            'witness_full_name', 'transcript', 'image', 'audio', 'video',
            'recorded_by', 'recorded_by_name', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'recorded_at']
    
    def get_witness_full_name(self, obj):
        """Get witness full name from user or witness_name field."""
        if obj.witness:
            return obj.witness.get_full_name()
        return obj.witness_name
    
    def validate(self, data):
        """Ensure either witness or witness_name is provided.
        
        Validation rules:
        - At least one of witness (FK) or witness_name (text) must be set
        - If witness FK is provided, witness_name is ignored
        - Case must exist and be in an active investigation state
        """
        witness = data.get('witness')
        witness_name = data.get('witness_name', '')
        
        if not witness and not witness_name:
            raise serializers.ValidationError({
                "witness": "Either witness (registered user) or witness_name must be provided"
            })
        
        # Ensure case exists and is open
        case = data.get('case')
        if case and case.status not in [Case.STATUS_OPEN, Case.STATUS_UNDER_INVESTIGATION]:
            raise serializers.ValidationError({
                "case": f"Cannot add evidence to case with status '{case.get_status_display()}'. Case must be open or under investigation."
            })
        
        return data


class BiologicalEvidenceSerializer(serializers.ModelSerializer):
    """
    Serializer for Biological Evidence.
    
    Blood stains, hair, fingerprints requiring forensic analysis.
    Results from forensic doctor and identity database can be added later.
    Accepts either PK ids or raw file uploads for the 'images' field.
    """
    images_data = EvidenceImageSerializer(source='images', many=True, read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by_coroner.get_full_name', read_only=True)
    identity_match_name = serializers.CharField(source='identity_match.get_full_name', read_only=True)
    # Make the M2M 'images' field optional and write-only so DRF doesn't
    # complain when raw files arrive instead of PK values.
    images = serializers.PrimaryKeyRelatedField(
        queryset=EvidenceImage.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    
    class Meta:
        model = BiologicalEvidence
        fields = [
            'id', 'case', 'title', 'description', 'evidence_type',
            'images', 'images_data', 'coroner_analysis', 'identity_match', 'identity_match_name',
            'verified_by_coroner', 'verified_by_name', 'verified_at',
            'recorded_by', 'recorded_by_name', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'recorded_at', 'verified_at']

    def to_internal_value(self, data):
        """
        Override to gracefully skip PK validation on 'images' when raw
        file uploads are sent (multipart/form-data).  Files will be
        handled in create() instead.
        """
        from django.core.files.uploadedfile import UploadedFile
        # Check if any image value is a file upload
        images_raw = data.getlist('images') if hasattr(data, 'getlist') else data.get('images', [])
        has_file_uploads = any(isinstance(f, UploadedFile) for f in (images_raw or []))
        if has_file_uploads:
            # Temporarily remove images from data so PrimaryKeyRelatedField doesn't choke
            mutable = data.copy() if hasattr(data, 'copy') else dict(data)
            if hasattr(mutable, 'pop'):
                mutable.pop('images', None)
            elif 'images' in mutable:
                del mutable['images']
            return super().to_internal_value(mutable)
        return super().to_internal_value(data)
    
    def validate(self, data):
        """Validate biological evidence data."""
        # Ensure case exists and is open
        case = data.get('case')
        if case and case.status not in [Case.STATUS_OPEN, Case.STATUS_UNDER_INVESTIGATION]:
            raise serializers.ValidationError({
                "case": f"Cannot add evidence to case with status '{case.get_status_display()}'. Case must be open or under investigation."
            })
        
        # Ensure evidence type is provided
        if not data.get('evidence_type'):
            raise serializers.ValidationError({
                "evidence_type": "Evidence type is required (e.g., blood, hair, fingerprint)"
            })
        
        return data

    def create(self, validated_data):
        """
        Handle creation with optional raw image file uploads.
        If the request contains files under 'images', create EvidenceImage
        objects first, then link them via the M2M relationship.
        """
        # Pop out any PK-based images list (may be empty)
        image_pks = validated_data.pop('images', [])
        
        instance = BiologicalEvidence.objects.create(**validated_data)
        
        # Link any existing EvidenceImage objects by PK
        if image_pks:
            instance.images.set(image_pks)
        
        # Handle raw file uploads from the request
        request = self.context.get('request')
        if request and hasattr(request, 'FILES'):
            uploaded_files = request.FILES.getlist('images')
            for f in uploaded_files:
                img = EvidenceImage.objects.create(image=f, caption=f.name)
                instance.images.add(img)
        
        return instance


class BiologicalEvidenceUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating biological evidence with forensic results.
    Used by forensic doctors to add analysis results.
    """
    
    class Meta:
        model = BiologicalEvidence
        fields = ['coroner_analysis', 'identity_match', 'verified_by_coroner', 'verified_at']
        read_only_fields = ['verified_by_coroner', 'verified_at']
    
    def validate(self, data):
        """Ensure coroner analysis is provided when updating."""
        if not data.get('coroner_analysis'):
            raise serializers.ValidationError({
                "coroner_analysis": "Coroner analysis is required when updating evidence"
            })
        return data


class VehicleEvidenceSerializer(serializers.ModelSerializer):
    """
    Serializer for Vehicle Evidence.
    
    Vehicle found at crime scene.
    Must have either license_plate OR serial_number (not both simultaneously).
    """
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = VehicleEvidence
        fields = [
            'id', 'case', 'title', 'description', 'model', 'color',
            'license_plate', 'serial_number',
            'recorded_by', 'recorded_by_name', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'recorded_at']
    
    def validate(self, data):
        """Ensure either license_plate or serial_number is provided, but not both."""
        license_plate = data.get('license_plate', '').strip()
        serial_number = data.get('serial_number', '').strip()
        
        # For updates, check existing instance values
        if self.instance:
            if not license_plate:
                license_plate = self.instance.license_plate
            if not serial_number:
                serial_number = self.instance.serial_number
        
        if license_plate and serial_number:
            raise serializers.ValidationError(
                "Vehicle cannot have both license plate and serial number. Provide only one."
            )
        if not license_plate and not serial_number:
            raise serializers.ValidationError(
                "Vehicle must have either a license plate or a serial number."
            )
        
        # Ensure case exists and is open
        case = data.get('case')
        if case and case.status not in [Case.STATUS_OPEN, Case.STATUS_UNDER_INVESTIGATION]:
            raise serializers.ValidationError({
                "case": f"Cannot add evidence to case with status '{case.get_status_display()}'. Case must be open or under investigation."
            })
        
        return data


class IDDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for ID Document Evidence.
    
    Identification documents found at crime scene.
    Stores owner's full name and flexible key-value attributes.
    """
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = IDDocument
        fields = [
            'id', 'case', 'title', 'description', 'owner_full_name',
            'document_type', 'attributes',
            'recorded_by', 'recorded_by_name', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'recorded_at']
    
    def validate(self, data):
        """Validate ID document data."""
        # Ensure case exists and is open
        case = data.get('case')
        if case and case.status not in [Case.STATUS_OPEN, Case.STATUS_UNDER_INVESTIGATION]:
            raise serializers.ValidationError({
                "case": f"Cannot add evidence to case with status '{case.get_status_display()}'. Case must be open or under investigation."
            })
        
        # Ensure owner name is provided
        if not data.get('owner_full_name'):
            raise serializers.ValidationError({
                "owner_full_name": "Owner's full name is required"
            })
        
        # Validate attributes is a dict if provided
        attributes = data.get('attributes', {})
        if not isinstance(attributes, dict):
            raise serializers.ValidationError({
                "attributes": "Attributes must be a dictionary/object"
            })
        
        return data


class GenericEvidenceSerializer(serializers.ModelSerializer):
    """
    Serializer for Generic Evidence.
    
    Any other evidence not fitting specific categories.
    Simple title-description format.
    """
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = GenericEvidence
        fields = [
            'id', 'case', 'title', 'description',
            'recorded_by', 'recorded_by_name', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'recorded_at']
    
    def validate(self, data):
        """Validate generic evidence data."""
        # Ensure case exists and is open
        case = data.get('case')
        if case and case.status not in [Case.STATUS_OPEN, Case.STATUS_UNDER_INVESTIGATION]:
            raise serializers.ValidationError({
                "case": f"Cannot add evidence to case with status '{case.get_status_display()}'. Case must be open or under investigation."
            })
        
        return data
