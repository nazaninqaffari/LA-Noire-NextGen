"""
Stress tests for LA Noire NextGen API using Locust.

Run with:
    locust -f tests/stress_tests.py --host=http://localhost:8000
    
Or for headless mode:
    locust -f tests/stress_tests.py --host=http://localhost:8000 --users 100 --spawn-rate 10 --run-time 60s --headless
"""
from locust import HttpUser, task, between, TaskSet
import random
import string


def generate_random_string(length=10):
    """Generate a random string."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def generate_phone():
    """Generate a random phone number."""
    return f'+1{random.randint(1000000000, 9999999999)}'


def generate_national_id():
    """Generate a random national ID."""
    return f'{random.randint(1000000000, 9999999999)}'


class AuthenticatedUserBehavior(TaskSet):
    """Behavior of an authenticated user."""
    
    def on_start(self):
        """Login when starting."""
        self.username = f'user_{generate_random_string()}'
        self.password = 'testpass123'
        
        # Register user
        register_data = {
            'username': self.username,
            'email': f'{self.username}@example.com',
            'phone_number': generate_phone(),
            'national_id': generate_national_id(),
            'first_name': 'Test',
            'last_name': 'User',
            'password': self.password,
            'password_confirm': self.password
        }
        
        response = self.client.post('/api/v1/accounts/users/', json=register_data)
        if response.status_code != 201:
            print(f"Registration failed: {response.text}")
            return
        
        # Login
        login_data = {
            'username': self.username,
            'password': self.password
        }
        
        response = self.client.post('/api/v1/accounts/login/', json=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
    
    @task(3)
    def get_profile(self):
        """Get user profile."""
        self.client.get('/api/v1/accounts/users/me/')
    
    @task(2)
    def list_users(self):
        """List users."""
        self.client.get('/api/v1/accounts/users/')
    
    @task(2)
    def list_roles(self):
        """List roles."""
        self.client.get('/api/v1/accounts/roles/')
    
    @task(1)
    def search_users(self):
        """Search users."""
        search_term = random.choice(['test', 'user', 'detective', 'captain'])
        self.client.get(f'/api/v1/accounts/users/?search={search_term}')
    
    @task(1)
    def filter_users(self):
        """Filter users."""
        self.client.get('/api/v1/accounts/users/?is_active=true')
    
    def on_stop(self):
        """Logout when stopping."""
        self.client.post('/api/v1/accounts/logout/')


class UnauthenticatedUserBehavior(TaskSet):
    """Behavior of an unauthenticated user."""
    
    @task(5)
    def register_user(self):
        """Register a new user."""
        username = f'user_{generate_random_string()}'
        data = {
            'username': username,
            'email': f'{username}@example.com',
            'phone_number': generate_phone(),
            'national_id': generate_national_id(),
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpass123',
            'password_confirm': 'testpass123'
        }
        
        self.client.post('/api/v1/accounts/users/', json=data)
    
    @task(10)
    def login_user(self):
        """Attempt to login with random credentials."""
        data = {
            'username': f'user_{generate_random_string()}',
            'password': 'testpass123'
        }
        
        # This will mostly fail, but tests the login endpoint
        self.client.post('/api/v1/accounts/login/', json=data)


class AuthenticationStressTest(HttpUser):
    """Stress test for authentication endpoints."""
    wait_time = between(1, 3)
    tasks = [UnauthenticatedUserBehavior, AuthenticatedUserBehavior]
    weight = 2


class AuthenticatedUserStressTest(HttpUser):
    """Stress test for authenticated user operations."""
    wait_time = between(1, 2)
    tasks = [AuthenticatedUserBehavior]
    weight = 3


class RegistrationStressTest(HttpUser):
    """Focused stress test on registration."""
    wait_time = between(0.5, 1.5)
    
    @task
    def register(self):
        """Register users rapidly."""
        username = f'user_{generate_random_string()}'
        data = {
            'username': username,
            'email': f'{username}@example.com',
            'phone_number': generate_phone(),
            'national_id': generate_national_id(),
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpass123',
            'password_confirm': 'testpass123'
        }
        
        self.client.post('/api/v1/accounts/users/', json=data)


class LoginStressTest(HttpUser):
    """Focused stress test on login."""
    wait_time = between(0.5, 1)
    
    def on_start(self):
        """Create a user to login with."""
        self.username = f'loginuser_{generate_random_string()}'
        self.password = 'testpass123'
        
        # Register user
        register_data = {
            'username': self.username,
            'email': f'{self.username}@example.com',
            'phone_number': generate_phone(),
            'national_id': generate_national_id(),
            'first_name': 'Login',
            'last_name': 'Test',
            'password': self.password,
            'password_confirm': self.password
        }
        
        self.client.post('/api/v1/accounts/users/', json=register_data)
    
    @task
    def login(self):
        """Login repeatedly."""
        data = {
            'username': self.username,
            'password': self.password
        }
        
        response = self.client.post('/api/v1/accounts/login/', json=data)
        if response.status_code == 200:
            # Logout immediately
            self.client.post('/api/v1/accounts/logout/')
