"""
User and Role models for the LA Noire NextGen system.
Implements a dynamic role system where roles can be created and managed at runtime.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.core.validators import RegexValidator


class Role(models.Model):
    """
    Dynamic role system allowing administrators to create/modify roles without code changes.
    Each role has a unique name and description of permissions.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique role name (e.g., 'Detective', 'Captain')"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of role responsibilities and permissions"
    )
    is_police_rank = models.BooleanField(
        default=False,
        help_text="Whether this role is part of police hierarchy"
    )
    hierarchy_level = models.IntegerField(
        default=0,
        help_text="Level in police hierarchy (higher = more authority). 0 = non-police roles"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-hierarchy_level', 'name']
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    """Custom user manager to handle creation with unique fields."""
    
    def create_user(self, username, email, phone_number, national_id, password=None, **extra_fields):
        """Create and return a regular user."""
        if not username:
            raise ValueError('Users must have a username')
        if not email:
            raise ValueError('Users must have an email')
        if not phone_number:
            raise ValueError('Users must have a phone number')
        if not national_id:
            raise ValueError('Users must have a national ID')

        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            phone_number=phone_number,
            national_id=national_id,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, phone_number, national_id, password=None, **extra_fields):
        """Create and return a superuser with admin privileges."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        return self.create_user(username, email, phone_number, national_id, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model supporting multiple unique login methods.
    Users can login with: username, email, phone_number, or national_id.
    Each user starts with 'Base User' role, then admin assigns additional roles.
    """
    # Unique identifiers (all can be used for login)
    username = models.CharField(
        max_length=150,
        unique=True,
        help_text="Unique username for login"
    )
    email = models.EmailField(
        unique=True,
        help_text="Unique email address for login"
    )
    
    phone_validator = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(
        validators=[phone_validator],
        max_length=17,
        unique=True,
        help_text="Unique phone number for login"
    )
    
    national_id = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique national ID for login"
    )
    
    # Personal information
    first_name = models.CharField(max_length=150, help_text="First name")
    last_name = models.CharField(max_length=150, help_text="Last name")
    
    # Roles (many-to-many: user can have multiple roles)
    roles = models.ManyToManyField(
        Role,
        related_name='users',
        blank=True,
        help_text="Roles assigned to this user"
    )
    
    # Account status
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    # Timestamps
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    # Specify which field is used as the unique identifier
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'phone_number', 'national_id', 'first_name', 'last_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.username} ({self.get_full_name()})"

    def get_full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        """Return the user's first name."""
        return self.first_name

    def has_role(self, role_name):
        """Check if user has a specific role."""
        return self.roles.filter(name=role_name).exists()

    def get_highest_police_rank(self):
        """Get the user's highest police hierarchy level."""
        police_roles = self.roles.filter(is_police_rank=True)
        if police_roles.exists():
            return police_roles.order_by('-hierarchy_level').first()
        return None
