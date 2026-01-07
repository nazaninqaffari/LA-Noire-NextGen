"""
Base test classes with authentication support for LA Noire NextGen tests.
"""
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role

User = get_user_model()


class BaseTestCase(TestCase):
    """Base test case with common setup."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data for the entire TestCase."""
        # Create base role
        cls.base_role = Role.objects.create(
            name='Base User',
            description='Default role for all users',
            is_police_rank=False,
            hierarchy_level=0
        )
        
        # Create test roles
        cls.detective_role = Role.objects.create(
            name='Detective',
            description='Investigates cases',
            is_police_rank=True,
            hierarchy_level=4
        )
        
        cls.captain_role = Role.objects.create(
            name='Captain',
            description='Supervises detectives',
            is_police_rank=True,
            hierarchy_level=6
        )
    
    def create_user(self, username='testuser', **kwargs):
        """Helper method to create a user."""
        defaults = {
            'email': f'{username}@example.com',
            'phone_number': f'+1123456{username[-4:].zfill(4)}',
            'national_id': f'{hash(username) % 10000000000:010d}',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        defaults.update(kwargs)
        password = defaults.pop('password')
        user = User.objects.create_user(username=username, password=password, **defaults)
        return user


class AuthenticatedAPITestCase(APITestCase):
    """API test case with authentication support."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data for the entire TestCase."""
        # Create base role
        cls.base_role = Role.objects.create(
            name='Base User',
            description='Default role for all users',
            is_police_rank=False,
            hierarchy_level=0
        )
        
        # Create test roles
        cls.detective_role = Role.objects.create(
            name='Detective',
            description='Investigates cases',
            is_police_rank=True,
            hierarchy_level=4
        )
        
        cls.captain_role = Role.objects.create(
            name='Captain',
            description='Supervises detectives',
            is_police_rank=True,
            hierarchy_level=6
        )
    
    def setUp(self):
        """Set up each test."""
        self.client = APIClient()
    
    def create_user(self, username='testuser', **kwargs):
        """Helper method to create a user."""
        defaults = {
            'email': f'{username}@example.com',
            'phone_number': f'+1123456{username[-4:].zfill(4)}',
            'national_id': f'{hash(username) % 10000000000:010d}',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        defaults.update(kwargs)
        password = defaults.pop('password')
        user = User.objects.create_user(username=username, password=password, **defaults)
        return user
    
    def authenticate(self, user):
        """Authenticate a user for the test client."""
        self.client.force_authenticate(user=user)
    
    def login_user(self, username='testuser', password='testpass123'):
        """Login a user using session authentication."""
        response = self.client.post('/api/v1/accounts/login/', {
            'username': username,
            'password': password
        })
        return response
    
    def logout_user(self):
        """Logout the current user."""
        return self.client.post('/api/v1/accounts/logout/')
