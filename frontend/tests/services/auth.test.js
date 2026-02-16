/**
 * Auth Service Tests
 * Tests for authentication service functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { login, logout, getCurrentUser, useAuth } from '../../src/services/auth';
import { api } from '../../src/services/api';
import { createMockUser, mockApiResponse, mockApiError } from '../utils';

// Mock the API service
vi.mock('../../src/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('sends login request with correct credentials', async () => {
      const mockUser = createMockUser();
      api.post.mockResolvedValue(mockApiResponse(mockUser));
      
      await login('testuser', 'password123');
      
      expect(api.post).toHaveBeenCalledWith('/accounts/login/', {
        identifier: 'testuser',
        password: 'password123',
      });
    });

    it('returns user data on successful login', async () => {
      const mockUser = createMockUser();
      api.post.mockResolvedValue(mockApiResponse(mockUser));
      
      const result = await login('testuser', 'password123');
      
      expect(result).toEqual(mockUser);
    });

    it('throws error on failed login', async () => {
      api.post.mockRejectedValue(mockApiError('Invalid credentials', 401));
      
      await expect(login('wronguser', 'wrongpass')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('sends logout request', async () => {
      api.post.mockResolvedValue(mockApiResponse({ message: 'Logged out' }));
      
      await logout();
      
      expect(api.post).toHaveBeenCalledWith('/accounts/logout/');
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user profile', async () => {
      const mockUser = createMockUser();
      api.get.mockResolvedValue(mockApiResponse(mockUser));
      
      const result = await getCurrentUser();
      
      expect(api.get).toHaveBeenCalledWith('/accounts/profile/');
      expect(result).toEqual(mockUser);
    });

    it('throws error if user not authenticated', async () => {
      api.get.mockRejectedValue(mockApiError('Not authenticated', 401));
      
      await expect(getCurrentUser()).rejects.toThrow();
    });
  });

  describe('useAuth hook', () => {
    it('initializes with loading state', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
    });

    it('sets user data on successful auth check', async () => {
      const mockUser = createMockUser();
      api.get.mockResolvedValue(mockApiResponse(mockUser));
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('handles authentication failure', async () => {
      api.get.mockRejectedValue(mockApiError('Not authenticated', 401));
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });
});
