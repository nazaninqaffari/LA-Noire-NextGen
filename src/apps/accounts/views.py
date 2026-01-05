from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .models import User, Role
from .serializers import UserSerializer, UserRegistrationSerializer, RoleSerializer


class RoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing roles.
    Allows administrators to create, read, update, and delete roles dynamically.
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_police_rank', 'hierarchy_level']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'hierarchy_level', 'created_at']
    ordering = ['-hierarchy_level', 'name']


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    Supports user registration, profile management, and role assignment.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'roles']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'national_id', 'phone_number']
    ordering_fields = ['username', 'date_joined']
    ordering = ['-date_joined']
    
    def get_permissions(self):
        """Allow registration without authentication."""
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        """Use different serializer for registration."""
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer
    
    @extend_schema(
        summary="Get current user profile",
        description="Returns the profile information of the currently authenticated user",
        responses={200: UserSerializer},
        examples=[
            OpenApiExample(
                'Current User Response',
                value={
                    "id": 1,
                    "username": "johndoe",
                    "email": "john@example.com",
                    "phone_number": "+11234567890",
                    "national_id": "1234567890",
                    "first_name": "John",
                    "last_name": "Doe",
                    "full_name": "John Doe",
                    "roles": [
                        {
                            "id": 1,
                            "name": "Detective",
                            "description": "Investigates cases",
                            "is_police_rank": True,
                            "hierarchy_level": 4
                        }
                    ],
                    "is_active": True,
                    "date_joined": "2026-01-05T10:00:00Z"
                },
                response_only=True
            )
        ]
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_roles(self, request, pk=None):
        """Assign roles to a user (admin only)."""
        user = self.get_object()
        role_ids = request.data.get('role_ids', [])
        
        roles = Role.objects.filter(id__in=role_ids)
        user.roles.set(roles)
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)
