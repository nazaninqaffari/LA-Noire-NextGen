/**
 * Authentication Service
 * Handles user login, logout, and session management with TypeScript support
 */
import { api } from './api';
import { useState, useEffect } from 'react';
import type { User, AuthContextType } from '../types';

/**
 * Login user with credentials
 * @param identifier - Username, email, phone, or national_id
 * @param password - User password
 * @returns Promise with user data
 */
export const login = async (identifier: string, password: string): Promise<User> => {
  try {
    const response = await api.post<User>('/accounts/login/', {
      identifier,
      password,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Logout current user
 * @returns Promise with response data
 */
export const logout = async (): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>('/accounts/logout/');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get current user profile
 * @returns Promise with user data
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/accounts/profile/');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Custom hook for authentication state
 * @returns Auth state and methods
 */
export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (): Promise<void> => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err as Error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (identifier: string, password: string): Promise<void> => {
    try {
      await login(identifier, password);
      await checkAuth();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout,
    isAuthenticated: !!user,
  };
};

export default {
  login,
  logout,
  getCurrentUser,
  useAuth,
};
