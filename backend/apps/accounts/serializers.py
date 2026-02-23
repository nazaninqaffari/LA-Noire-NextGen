from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Role


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model."""
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_police_rank', 'hierarchy_level', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with role information."""
    roles = RoleSerializer(many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Role.objects.all(),
        write_only=True,
        source='roles',
        required=False
    )
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 'national_id',
            'first_name', 'last_name', 'full_name',
            'roles', 'role_ids', 'is_staff', 'is_superuser', 'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'date_joined', 'last_login']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 'national_id',
            'first_name', 'last_name', 'password', 'password_confirm'
        ]
        read_only_fields = ['id']
    
    def validate(self, data):
        """Validate that passwords match."""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        
        # Assign default 'Base User' role if it exists
        base_role, _ = Role.objects.get_or_create(
            name='Base User',
            defaults={'description': 'Default role for all registered users', 'is_police_rank': False}
        )
        user.roles.add(base_role)
        
        return user


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for admin user creation (no password_confirm needed)."""
    password = serializers.CharField(write_only=True, min_length=8)
    role_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Role.objects.all(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 'national_id',
            'first_name', 'last_name', 'password', 'role_ids', 'is_active'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        role_objects = validated_data.pop('role_ids', [])
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        if role_objects:
            user.roles.set(role_objects)
        return user

    def to_representation(self, instance):
        return UserSerializer(instance).data


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    def validate(self, data):
        """Authenticate user credentials."""
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Unable to log in with provided credentials.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            data['user'] = user
        else:
            raise serializers.ValidationError('Must include "username" and "password".')
        
        return data
