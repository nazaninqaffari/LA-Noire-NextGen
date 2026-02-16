/**
 * Authentication Service
 * Handles user login, logout, and session management
 */
import { api } from './api';
import { useState, useEffect } from 'react';

/**
 * Login user with credentials
 * @param {string} identifier - Username, email, phone, or national_id
 * @param {string} password - User password
 * @returns {Promise} API response
 */
export const login = async (identifier, password) => {
  try {
    const response = await api.post('/accounts/login/', {
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
 * @returns {Promise} API response
 */
export const logout = async () => {
  try {
    const response = await api.post('/accounts/logout/');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get current user profile
 * @returns {Promise} User data
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/accounts/profile/');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Custom hook for authentication state
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (identifier, password) => {
    try {
      await login(identifier, password);
      await checkAuth();
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      setError(err);
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
