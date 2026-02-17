/**
 * Authentication Service Tests
 * Tests for login, register, and user management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { login, register, logout, getCurrentUser } from '../src/services/auth';
import { api } from '../src/services/api';
import type { User } from '../src/types';

// Mock axios
vi.mock('../src/services/api');

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '1234567890',
        national_id: '1234567890',
        first_name: 'Test',
        last_name: 'User',
        role: {
          id: 1,
          name: 'Base User',
          description: 'Default role',
          hierarchy_level: 1,
        },
        is_active: true,
        date_joined: '2026-01-01T00:00:00Z',
      };

      const mockResponse = {
        data: {
          user: mockUser,
          message: 'Login successful',
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await login('testuser', 'password123');

      expect(api.post).toHaveBeenCalledWith('/accounts/login/', {
        username: 'testuser',
        password: 'password123',
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error with invalid credentials', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            non_field_errors: ['Unable to log in with provided credentials.'],
          },
        },
      };

      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      await expect(login('wronguser', 'wrongpass')).rejects.toEqual(mockError);
      expect(api.post).toHaveBeenCalledWith('/accounts/login/', {
        username: 'wronguser',
        password: 'wrongpass',
      });
    });

    it('should throw error when user account is disabled', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            non_field_errors: ['User account is disabled.'],
          },
        },
      };

      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      await expect(login('disableduser', 'password123')).rejects.toEqual(mockError);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        password_confirm: 'SecurePass123!',
        phone_number: '1234567890',
        national_id: '1234567890',
        first_name: 'New',
        last_name: 'User',
      };

      const mockUser: User = {
        id: 2,
        username: 'newuser',
        email: 'new@example.com',
        phone_number: '1234567890',
        national_id: '1234567890',
        first_name: 'New',
        last_name: 'User',
        role: {
          id: 1,
          name: 'Base User',
          description: 'Default role',
          hierarchy_level: 1,
        },
        is_active: true,
        date_joined: '2026-02-17T00:00:00Z',
      };

      const mockResponse = {
        data: mockUser,
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await register(registrationData);

      expect(api.post).toHaveBeenCalledWith('/accounts/users/', registrationData);
      expect(result).toEqual(mockUser);
    });

    it('should throw error when username already exists', async () => {
      const registrationData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123',
        password_confirm: 'password123',
        phone_number: '1234567890',
        national_id: '1234567890',
        first_name: 'Test',
        last_name: 'User',
      };

      const mockError = {
        response: {
          status: 400,
          data: {
            username: ['A user with that username already exists.'],
          },
        },
      };

      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      await expect(register(registrationData)).rejects.toEqual(mockError);
    });

    it('should throw error when passwords do not match', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        password_confirm: 'differentpassword',
        phone_number: '1234567890',
        national_id: '1234567890',
        first_name: 'Test',
        last_name: 'User',
      };

      const mockError = {
        response: {
          status: 400,
          data: {
            non_field_errors: ['Passwords do not match'],
          },
        },
      };

      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      await expect(register(registrationData)).rejects.toEqual(mockError);
    });

    it('should throw error when email already exists', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
        password_confirm: 'password123',
        phone_number: '1234567890',
        national_id: '1234567890',
        first_name: 'Test',
        last_name: 'User',
      };

      const mockError = {
        response: {
          status: 400,
          data: {
            email: ['User with this email already exists.'],
          },
        },
      };

      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      await expect(register(registrationData)).rejects.toEqual(mockError);
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const mockResponse = {
        data: {
          message: 'Logged out successfully',
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await logout();

      expect(api.post).toHaveBeenCalledWith('/accounts/logout/');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle logout error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            detail: 'Authentication credentials were not provided.',
          },
        },
      };

      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      await expect(logout()).rejects.toEqual(mockError);
    });
  });

  describe('getCurrentUser', () => {
    it('should successfully get current user profile', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '1234567890',
        national_id: '1234567890',
        first_name: 'Test',
        last_name: 'User',
        role: {
          id: 1,
          name: 'Detective',
          description: 'Investigates cases',
          hierarchy_level: 4,
        },
        is_active: true,
        date_joined: '2026-01-01T00:00:00Z',
      };

      const mockResponse = {
        data: mockUser,
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await getCurrentUser();

      expect(api.get).toHaveBeenCalledWith('/accounts/users/me/');
      expect(result).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            detail: 'Authentication credentials were not provided.',
          },
        },
      };

      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(getCurrentUser()).rejects.toEqual(mockError);
    });
  });
});
