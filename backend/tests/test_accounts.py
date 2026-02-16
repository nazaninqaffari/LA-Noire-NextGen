"""
Unit tests for accounts app.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import Role

User = get_user_model()


@pytest.mark.django_db
class TestUserRegistration:
    """Test user registration functionality."""
    
    def test_user_registration_success(self, api_client, base_role):
        """Test successful user registration."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'phone_number': '+11234567899',
            'national_id': '9876543210',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'securepass123',
            'password_confirm': 'securepass123'
        }
        
        response = api_client.post('/api/v1/accounts/users/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'id' in response.data
        assert response.data['username'] == 'newuser'
        assert response.data['email'] == 'newuser@example.com'
        assert 'password' not in response.data
        
        # Verify user was created
        user = User.objects.get(username='newuser')
        assert user.email == 'newuser@example.com'
        assert user.check_password('securepass123')
        assert user.roles.filter(name='Base User').exists()
    
    def test_user_registration_password_mismatch(self, api_client):
        """Test registration with mismatched passwords."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'phone_number': '+11234567899',
            'national_id': '9876543210',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'securepass123',
            'password_confirm': 'differentpass123'
        }
        
        response = api_client.post('/api/v1/accounts/users/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Passwords do not match' in str(response.data)
    
    def test_user_registration_duplicate_username(self, api_client, test_user):
        """Test registration with duplicate username."""
        data = {
            'username': 'testuser',  # Already exists
            'email': 'different@example.com',
            'phone_number': '+11234567899',
            'national_id': '9876543210',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'securepass123',
            'password_confirm': 'securepass123'
        }
        
        response = api_client.post('/api/v1/accounts/users/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data
    
    def test_user_registration_duplicate_email(self, api_client, test_user):
        """Test registration with duplicate email."""
        data = {
            'username': 'newuser',
            'email': 'test@example.com',  # Already exists
            'phone_number': '+11234567899',
            'national_id': '9876543210',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'securepass123',
            'password_confirm': 'securepass123'
        }
        
        response = api_client.post('/api/v1/accounts/users/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
    
    def test_user_registration_short_password(self, api_client):
        """Test registration with too short password."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'phone_number': '+11234567899',
            'national_id': '9876543210',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'short',
            'password_confirm': 'short'
        }
        
        response = api_client.post('/api/v1/accounts/users/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data


@pytest.mark.django_db
class TestUserLogin:
    """Test user login functionality."""
    
    def test_login_success(self, api_client, test_user):
        """Test successful login."""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        
        response = api_client.post('/api/v1/accounts/login/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data
        assert response.data['user']['username'] == 'testuser'
        assert response.data['message'] == 'Login successful'
        
        # Verify session was created
        assert '_auth_user_id' in api_client.session
    
    def test_login_invalid_password(self, api_client, test_user):
        """Test login with invalid password."""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        
        response = api_client.post('/api/v1/accounts/login/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Unable to log in' in str(response.data)
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with nonexistent user."""
        data = {
            'username': 'nonexistent',
            'password': 'somepassword'
        }
        
        response = api_client.post('/api/v1/accounts/login/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_inactive_user(self, api_client, test_user):
        """Test login with inactive user."""
        test_user.is_active = False
        test_user.save()
        
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        
        response = api_client.post('/api/v1/accounts/login/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_missing_credentials(self, api_client):
        """Test login with missing credentials."""
        # Missing password
        response = api_client.post('/api/v1/accounts/login/', {'username': 'testuser'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Missing username
        response = api_client.post('/api/v1/accounts/login/', {'password': 'testpass123'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogout:
    """Test user logout functionality."""
    
    def test_logout_success(self, api_client, test_user):
        """Test successful logout."""
        # First login
        api_client.force_authenticate(user=test_user)
        
        # Then logout
        response = api_client.post('/api/v1/accounts/logout/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == 'Logout successful'
    
    def test_logout_without_authentication(self, api_client):
        """Test logout without being authenticated."""
        response = api_client.post('/api/v1/accounts/logout/')
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
class TestUserProfile:
    """Test user profile functionality."""
    
    def test_get_current_user_profile(self, authenticated_client, test_user):
        """Test getting current user profile."""
        response = authenticated_client.get('/api/v1/accounts/users/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
        assert response.data['email'] == 'test@example.com'
        assert 'roles' in response.data
    
    def test_get_profile_without_authentication(self, api_client):
        """Test getting profile without authentication."""
        response = api_client.get('/api/v1/accounts/users/me/')
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
class TestRoleManagement:
    """Test role management functionality."""
    
    def test_create_role(self, authenticated_client, admin_user):
        """Test creating a new role."""
        authenticated_client.force_authenticate(user=admin_user)
        
        data = {
            'name': 'Sergeant',
            'description': 'Supervises patrol officers',
            'is_police_rank': True,
            'hierarchy_level': 5
        }
        
        response = authenticated_client.post('/api/v1/accounts/roles/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Sergeant'
        assert response.data['hierarchy_level'] == 5
        
        # Verify role was created
        assert Role.objects.filter(name='Sergeant').exists()
    
    def test_list_roles(self, authenticated_client, detective_role, captain_role):
        """Test listing all roles."""
        response = authenticated_client.get('/api/v1/accounts/roles/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 2
    
    def test_filter_roles_by_police_rank(self, authenticated_client, detective_role, base_role):
        """Test filtering roles by police rank."""
        response = authenticated_client.get('/api/v1/accounts/roles/?is_police_rank=true')
        
        assert response.status_code == status.HTTP_200_OK
        # All results should be police ranks
        for role in response.data['results']:
            assert role['is_police_rank'] is True
    
    def test_assign_roles_to_user(self, authenticated_client, admin_user, test_user, detective_role):
        """Test assigning roles to a user."""
        authenticated_client.force_authenticate(user=admin_user)
        
        data = {
            'role_ids': [detective_role.id]
        }
        
        response = authenticated_client.post(
            f'/api/v1/accounts/users/{test_user.id}/assign_roles/',
            data,
            format='json'
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.data}")
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify role was assigned
        test_user.refresh_from_db()
        assert test_user.roles.filter(id=detective_role.id).exists()


@pytest.mark.django_db
class TestUserFiltering:
    """Test user filtering and searching."""
    
    def test_search_users_by_username(self, authenticated_client, test_user):
        """Test searching users by username."""
        response = authenticated_client.get('/api/v1/accounts/users/?search=test')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
        assert any(user['username'] == 'testuser' for user in response.data['results'])
    
    def test_search_users_by_email(self, authenticated_client, test_user):
        """Test searching users by email."""
        response = authenticated_client.get('/api/v1/accounts/users/?search=test@example')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
    
    def test_filter_users_by_active_status(self, authenticated_client, test_user):
        """Test filtering users by active status."""
        # Create an inactive user
        inactive_user = User.objects.create_user(
            username='inactive',
            email='inactive@example.com',
            phone_number='+19999999999',
            national_id='9999999999',
            password='testpass123',
            is_active=False
        )
        
        response = authenticated_client.get('/api/v1/accounts/users/?is_active=true')
        
        assert response.status_code == status.HTTP_200_OK
        usernames = [user['username'] for user in response.data['results']]
        assert 'testuser' in usernames
        assert 'inactive' not in usernames
