from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.contrib.auth import login, logout
from django.db.models import ProtectedError
from .models import User, Role
from .permissions import IsAdminUser
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    AdminUserCreateSerializer,
    RoleSerializer,
    LoginSerializer
)


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
        """Allow registration without authentication.
        
        Permission matrix:
        - create (signup): public, no auth needed
        - assign_roles / destroy / toggle_active / admin_create: admin only
        - all other actions (list, retrieve, update): authenticated users
        """
        if self.action == 'create':
            return [AllowAny()]
        if self.action in ('assign_roles', 'destroy', 'toggle_active', 'admin_create'):
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        """Use different serializer for registration."""
        if self.action == 'create':
            return UserRegistrationSerializer
        if self.action == 'admin_create':
            return AdminUserCreateSerializer
        return UserSerializer

    @extend_schema(
        summary="Register a new user (Signup)",
        description="""Register a new user account in the system. This is the signup endpoint.

        **Authentication**: Not required (public endpoint)

        **Validation Rules**:
        - Username must be unique
        - Email must be unique and valid
        - Phone number must be unique
        - National ID must be unique
        - Password must be at least 8 characters
        - Password and password_confirm must match

        **Automatic Behavior**:
        - User is assigned the 'Base User' role by default
        - User account is active immediately
        - Password is securely hashed using PBKDF2
        """,
        request=UserRegistrationSerializer,
        responses={
            201: UserRegistrationSerializer,
            400: OpenApiExample(
                'Validation Error',
                value={
                    'username': ['A user with that username already exists.'],
                    'email': ['User with this email already exists.'],
                    'non_field_errors': ['Passwords do not match']
                },
                response_only=True
            )
        },
        examples=[
            OpenApiExample(
                'Signup Request',
                value={
                    'username': 'johndoe',
                    'email': 'john.doe@example.com',
                    'phone_number': '+11234567890',
                    'national_id': '1234567890',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'password': 'SecurePass123!',
                    'password_confirm': 'SecurePass123!'
                },
                request_only=True
            ),
            OpenApiExample(
                'Signup Response - Success',
                value={
                    'id': 1,
                    'username': 'johndoe',
                    'email': 'john.doe@example.com',
                    'phone_number': '+11234567890',
                    'national_id': '1234567890',
                    'first_name': 'John',
                    'last_name': 'Doe'
                },
                response_only=True,
                status_codes=['201']
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        """Handle user registration (signup)."""
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a user (admin only). Prevents self-deletion."""
        user = self.get_object()
        if user.id == request.user.id:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            return Response(
                {'detail': 'Cannot delete this user because they have related records.'},
                status=status.HTTP_409_CONFLICT
            )

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

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle a user's is_active status (admin only). Prevents self-deactivation."""
        user = self.get_object()
        if user.id == request.user.id:
            return Response(
                {'detail': 'You cannot deactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def admin_create(self, request):
        """Admin creates a user with roles directly (admin only)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminStatsView(views.APIView):
    """Dashboard statistics for the admin panel."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from apps.cases.models import Case
        from apps.evidence.models import Testimony, BiologicalEvidence, VehicleEvidence, IDDocument, GenericEvidence
        from apps.investigation.models import Suspect
        from apps.trial.models import Trial

        # User counts
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        inactive_users = total_users - active_users

        # Role count
        total_roles = Role.objects.count()

        # Case counts by status
        total_cases = Case.objects.count()
        cases_open = Case.objects.filter(status='open').count()
        cases_closed = Case.objects.filter(status='closed').count()
        cases_under_investigation = Case.objects.filter(status='under_investigation').count()

        # Evidence counts
        total_testimonies = Testimony.objects.count()
        total_biological = BiologicalEvidence.objects.count()
        total_vehicle = VehicleEvidence.objects.count()
        total_id_documents = IDDocument.objects.count()
        total_generic = GenericEvidence.objects.count()
        total_evidence = total_testimonies + total_biological + total_vehicle + total_id_documents + total_generic

        # Suspect and trial counts
        total_suspects = Suspect.objects.count()
        total_trials = Trial.objects.count()

        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'inactive': inactive_users,
            },
            'roles': total_roles,
            'cases': {
                'total': total_cases,
                'open': cases_open,
                'closed': cases_closed,
                'under_investigation': cases_under_investigation,
            },
            'evidence': {
                'total': total_evidence,
                'testimonies': total_testimonies,
                'biological': total_biological,
                'vehicle': total_vehicle,
                'id_documents': total_id_documents,
                'generic': total_generic,
            },
            'suspects': total_suspects,
            'trials': total_trials,
        })


class LoginView(views.APIView):
    """
    User login endpoint using session authentication.
    Creates a session cookie (sessionid) that must be included in subsequent requests.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(
        summary="User login",
        description="""Authenticate user credentials and create a session.

        **Authentication**: Not required (public endpoint)

        **Cookie-Based Authentication**:
        Upon successful login, a session cookie named 'sessionid' is automatically set in the response.
        This cookie must be included in all subsequent requests to authenticated endpoints.

        **Response Headers**:
        - Set-Cookie: sessionid=<session_id>; HttpOnly; Path=/; SameSite=Lax

        **Client Usage**:
        - JavaScript: Use `credentials: 'include'` in fetch/axios
        - Python requests: Use `session = requests.Session()`
        - cURL: Use `-c cookies.txt` to save and `-b cookies.txt` to send cookies

        **Session Lifetime**:
        - Default: 2 weeks
        - Sessions are stored server-side
        - Cookie is HTTP-only (not accessible via JavaScript)
        """,
        request=LoginSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiExample(
                'Login Failed',
                value={
                    'non_field_errors': ['Unable to log in with provided credentials.']
                },
                response_only=True
            )
        },
        examples=[
            OpenApiExample(
                'Login Request',
                value={
                    'username': 'johndoe',
                    'password': 'SecurePass123!'
                },
                request_only=True
            ),
            OpenApiExample(
                'Login Response - Success',
                value={
                    'user': {
                        'id': 1,
                        'username': 'johndoe',
                        'email': 'john.doe@example.com',
                        'phone_number': '+11234567890',
                        'national_id': '1234567890',
                        'first_name': 'John',
                        'last_name': 'Doe',
                        'full_name': 'John Doe',
                        'roles': [
                            {
                                'id': 1,
                                'name': 'Detective',
                                'description': 'Investigates cases and collects evidence',
                                'is_police_rank': True,
                                'hierarchy_level': 4,
                                'created_at': '2026-01-07T10:00:00Z',
                                'updated_at': '2026-01-07T10:00:00Z'
                            }
                        ],
                        'is_active': True,
                        'date_joined': '2026-01-05T10:00:00Z',
                        'last_login': '2026-01-07T12:00:00Z'
                    },
                    'message': 'Login successful'
                },
                response_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'Login Failed - Invalid Credentials',
                value={
                    'non_field_errors': ['Unable to log in with provided credentials.']
                },
                response_only=True,
                status_codes=['400']
            ),
            OpenApiExample(
                'Login Failed - Inactive Account',
                value={
                    'non_field_errors': ['User account is disabled.']
                },
                response_only=True,
                status_codes=['400']
            )
        ]
    )
    def post(self, request):
        """Login user and create session with cookie."""
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            # Create session and set cookie
            login(request, user)
            user_serializer = UserSerializer(user)
            return Response({
                'user': user_serializer.data,
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(views.APIView):
    """
    User logout endpoint.
    Destroys the session and clears the session cookie.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="User logout",
        description="""Logout the current user and destroy their session.

        **Authentication**: Required (must be logged in)
        **Cookie Required**: sessionid cookie must be present

        **Behavior**:
        - Destroys server-side session
        - Clears the sessionid cookie
        - Requires re-login for subsequent authenticated requests

        **Note**: You must include the session cookie in the request.
        """,
        responses={
            200: OpenApiExample(
                'Logout Success',
                value={'message': 'Logout successful'},
                response_only=True
            ),
            401: OpenApiExample(
                'Not Authenticated',
                value={'detail': 'Authentication credentials were not provided.'},
                response_only=True
            ),
            403: OpenApiExample(
                'Forbidden',
                value={'detail': 'Authentication credentials were not provided.'},
                response_only=True
            )
        },
        examples=[
            OpenApiExample(
                'Logout Success',
                value={'message': 'Logout successful'},
                response_only=True,
                status_codes=['200']
            )
        ]
    )
    def post(self, request):
        """Logout user and destroy session."""
        # Destroy session and clear cookie
        logout(request)
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
