"""
Tests for admin panel endpoints: stats, toggle_active, admin_create, delete, assign_roles.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.accounts.models import Role

User = get_user_model()

USERS_URL = '/api/v1/accounts/users'
STATS_URL = '/api/v1/accounts/admin-stats/'


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def regular_client(test_user):
    client = APIClient()
    client.force_authenticate(user=test_user)
    return client


@pytest.fixture
def extra_user(db):
    return User.objects.create_user(
        username='extrauser',
        email='extra@example.com',
        phone_number='+11111111111',
        national_id='1111111111',
        password='extrapass123',
        first_name='Extra',
        last_name='User',
    )


# ─── AdminStats ────────────────────────────────────────────────────────────────


class TestAdminStats:
    def test_requires_authentication(self, api_client):
        resp = api_client.get(STATS_URL)
        assert resp.status_code in (401, 403)

    def test_requires_admin(self, regular_client):
        resp = regular_client.get(STATS_URL)
        assert resp.status_code == 403

    def test_returns_correct_counts(self, admin_client, admin_user, test_user, detective_role):
        resp = admin_client.get(STATS_URL)
        assert resp.status_code == 200
        data = resp.json()
        assert data['users']['total'] >= 2
        assert data['users']['active'] >= 2
        assert 'roles' in data
        assert 'cases' in data
        assert 'evidence' in data
        assert 'suspects' in data
        assert 'trials' in data


# ─── ToggleActive ──────────────────────────────────────────────────────────────


class TestToggleActive:
    def test_requires_admin(self, regular_client, extra_user):
        resp = regular_client.post(f'{USERS_URL}/{extra_user.id}/toggle_active/')
        assert resp.status_code == 403

    def test_deactivates_user(self, admin_client, extra_user):
        assert extra_user.is_active is True
        resp = admin_client.post(f'{USERS_URL}/{extra_user.id}/toggle_active/')
        assert resp.status_code == 200
        extra_user.refresh_from_db()
        assert extra_user.is_active is False

    def test_reactivates_user(self, admin_client, extra_user):
        extra_user.is_active = False
        extra_user.save()
        resp = admin_client.post(f'{USERS_URL}/{extra_user.id}/toggle_active/')
        assert resp.status_code == 200
        extra_user.refresh_from_db()
        assert extra_user.is_active is True

    def test_cannot_deactivate_self(self, admin_client, admin_user):
        resp = admin_client.post(f'{USERS_URL}/{admin_user.id}/toggle_active/')
        assert resp.status_code == 400
        assert 'cannot deactivate' in resp.json()['detail'].lower()


# ─── AdminCreateUser ───────────────────────────────────────────────────────────


class TestAdminCreateUser:
    def test_requires_admin(self, regular_client):
        resp = regular_client.post(f'{USERS_URL}/admin_create/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'phone_number': '+12222222222',
            'national_id': '2222222222',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'newpass12345',
        })
        assert resp.status_code == 403

    def test_creates_user_with_roles(self, admin_client, detective_role):
        resp = admin_client.post(f'{USERS_URL}/admin_create/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'phone_number': '+12222222222',
            'national_id': '2222222222',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'newpass12345',
            'role_ids': [detective_role.id],
        })
        assert resp.status_code == 201
        created = User.objects.get(username='newuser')
        assert created.roles.filter(id=detective_role.id).exists()

    def test_validates_required_fields(self, admin_client):
        resp = admin_client.post(f'{USERS_URL}/admin_create/', {})
        assert resp.status_code == 400


# ─── AdminDeleteUser ───────────────────────────────────────────────────────────


class TestAdminDeleteUser:
    def test_requires_admin(self, regular_client, extra_user):
        resp = regular_client.delete(f'{USERS_URL}/{extra_user.id}/')
        assert resp.status_code == 403

    def test_deletes_user(self, admin_client, extra_user):
        uid = extra_user.id
        resp = admin_client.delete(f'{USERS_URL}/{uid}/')
        assert resp.status_code == 204
        assert not User.objects.filter(id=uid).exists()

    def test_cannot_delete_self(self, admin_client, admin_user):
        resp = admin_client.delete(f'{USERS_URL}/{admin_user.id}/')
        assert resp.status_code == 400
        assert 'cannot delete' in resp.json()['detail'].lower()


# ─── AdminRoleAssignment ──────────────────────────────────────────────────────


class TestAdminRoleAssignment:
    def test_requires_admin(self, regular_client, extra_user, detective_role):
        resp = regular_client.post(
            f'{USERS_URL}/{extra_user.id}/assign_roles/',
            {'role_ids': [detective_role.id]},
        )
        assert resp.status_code == 403

    def test_assigns_roles(self, admin_client, extra_user, detective_role, captain_role):
        resp = admin_client.post(
            f'{USERS_URL}/{extra_user.id}/assign_roles/',
            {'role_ids': [detective_role.id, captain_role.id]},
            format='json',
        )
        assert resp.status_code == 200
        extra_user.refresh_from_db()
        role_names = set(extra_user.roles.values_list('name', flat=True))
        assert 'Detective' in role_names
        assert 'Captain' in role_names
