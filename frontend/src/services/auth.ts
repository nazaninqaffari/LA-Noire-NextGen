/**
 * Authentication Service
 * Handles user login, logout, and session management with TypeScript support
 */
import { api } from './api';
import type { User } from '../types';

/**
 * Register a new user
 * @param userData - User registration data
 * @returns Promise with user data
 */
export const register = async (userData: any): Promise<User> => {
  try {
    const response = await api.post<User>('/accounts/users/', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Login user with credentials
 * @param username - Username
 * @param password - User password
 * @returns Promise with user data
 */
export const login = async (username: string, password: string): Promise<User> => {
  try {
    const response = await api.post<{ user: User; message: string }>('/accounts/login/', {
      username,
      password,
    });
    return response.data.user;
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
    
    // Clear all cookies
    document.cookie.split(';').forEach((c) => {
      const cookie = c.trim();
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      // Clear the cookie by setting it to expire
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });
    
    return response.data;
  } catch (error) {
    // Even if logout fails, clear cookies
    document.cookie.split(';').forEach((c) => {
      const cookie = c.trim();
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });
    throw error;
  }
};

/**
 * Get current user profile
 * @returns Promise with user data
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/accounts/users/me/');
    return response.data;
  } catch (error) {
    throw error;
  }
};
