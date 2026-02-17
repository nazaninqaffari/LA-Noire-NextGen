/**
 * Auth Service Tests
 * Tests for authentication service functions (login, logout, register, getCurrentUser)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout, getCurrentUser, register } from '../../src/services/auth';

// Mock the API module
vi.mock('../../src/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '../../src/services/api';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('sends login request with username and password', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@lapd.gov' };
      vi.mocked(api.post).mockResolvedValue({ data: { user: mockUser, message: 'Welcome' } });

      await login('testuser', 'password123');

      expect(api.post).toHaveBeenCalledWith('/accounts/login/', {
        username: 'testuser',
        password: 'password123',
      });
    });

    it('returns user data from response.data.user', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@lapd.gov' };
      vi.mocked(api.post).mockResolvedValue({ data: { user: mockUser, message: 'Welcome' } });

      const result = await login('testuser', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('throws error on failed login', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Invalid credentials'));
      await expect(login('wronguser', 'wrongpass')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('sends logout request', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { message: 'Logged out' } });

      await logout();

      expect(api.post).toHaveBeenCalledWith('/accounts/logout/');
    });

    it('clears cookies on logout', async () => {
      document.cookie = 'sessionid=abc123; path=/';
      vi.mocked(api.post).mockResolvedValue({ data: { message: 'Logged out' } });

      await logout();

      // Cookies should be cleared
      expect(document.cookie).not.toContain('sessionid=abc123');
    });

    it('clears cookies even on failed logout', async () => {
      document.cookie = 'sessionid=abc123; path=/';
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      try {
        await logout();
      } catch {
        // Expected
      }

      // Cookies still cleared
      expect(document.cookie).not.toContain('sessionid=abc123');
    });
  });

  describe('register', () => {
    it('sends registration request with user data', async () => {
      const userData = { username: 'newuser', password: 'pass123', email: 'new@lapd.gov' };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1, ...userData } });

      await register(userData);

      expect(api.post).toHaveBeenCalledWith('/accounts/users/', userData);
    });

    it('returns created user data', async () => {
      const created = { id: 1, username: 'newuser', email: 'new@lapd.gov' };
      vi.mocked(api.post).mockResolvedValue({ data: created });

      const result = await register({ username: 'newuser', email: 'new@lapd.gov' });
      expect(result).toEqual(created);
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user from /accounts/users/me/', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@lapd.gov' };
      vi.mocked(api.get).mockResolvedValue({ data: mockUser });

      const result = await getCurrentUser();

      expect(api.get).toHaveBeenCalledWith('/accounts/users/me/');
      expect(result).toEqual(mockUser);
    });

    it('throws error if not authenticated', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Not authenticated'));
      await expect(getCurrentUser()).rejects.toThrow();
    });
  });
});
