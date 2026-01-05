from rest_framework import serializers
from .models import (
    Testimony, BiologicalEvidence, EvidenceImage,
    VehicleEvidence, IDDocument, GenericEvidence
)


class EvidenceImageSerializer(serializers.ModelSerializer):
    """Serializer for Evidence Images."""
    
    class Meta:
        model = EvidenceImage
        fields = ['id', 'image', 'caption', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class TestimonySerializer(serializers.ModelSerializer):
    """Serializer for Testimony Evidence."""
    
    class Meta:
        model = Testimony
        fields = [
            'id', 'case', 'title', 'description', 'witness', 'witness_name',
            'transcript', 'image', 'audio', 'video',
            'recorded_by', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at']


class BiologicalEvidenceSerializer(serializers.ModelSerializer):
    """Serializer for Biological Evidence."""
    images_data = EvidenceImageSerializer(source='images', many=True, read_only=True)
    
    class Meta:
        model = BiologicalEvidence
        fields = [
            'id', 'case', 'title', 'description', 'evidence_type',
            'images', 'images_data', 'coroner_analysis', 'identity_match',
            'verified_by_coroner', 'verified_at',
            'recorded_by', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at', 'verified_at']


class VehicleEvidenceSerializer(serializers.ModelSerializer):
    """Serializer for Vehicle Evidence."""
    
    class Meta:
        model = VehicleEvidence
        fields = [
            'id', 'case', 'title', 'description', 'model', 'color',
            'license_plate', 'serial_number',
            'recorded_by', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at']
    
    def validate(self, data):
        """Ensure either license_plate or serial_number is provided."""
        license_plate = data.get('license_plate', '')
        serial_number = data.get('serial_number', '')
        
        if license_plate and serial_number:
            raise serializers.ValidationError(
                "Vehicle cannot have both license plate and serial number"
            )
        if not license_plate and not serial_number:
            raise serializers.ValidationError(
                "Vehicle must have either license plate or serial number"
            )
        return data


class IDDocumentSerializer(serializers.ModelSerializer):
    """Serializer for ID Document Evidence."""
    
    class Meta:
        model = IDDocument
        fields = [
            'id', 'case', 'title', 'description', 'owner_full_name',
            'document_type', 'attributes',
            'recorded_by', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at']


class GenericEvidenceSerializer(serializers.ModelSerializer):
    """Serializer for Generic Evidence."""
    
    class Meta:
        model = GenericEvidence
        fields = [
            'id', 'case', 'title', 'description',
            'recorded_by', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at']
