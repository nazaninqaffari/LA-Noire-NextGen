/**
 * Authentication Context
 * Global authentication state management
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../services/auth';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
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

  const login = async (username: string, password: string): Promise<User> => {
    try {
      const userData = await loginApi(username, password);
      setUser(userData);
      setError(null);
      return userData;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
      setUser(null);
      setError(null);
    } catch (err) {
      setError(err as Error);
      // Still clear user even if API call fails
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
