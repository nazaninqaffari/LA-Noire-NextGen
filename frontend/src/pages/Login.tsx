/**
 * Login Page
 * User authentication with username and password
 */
import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { SkeletonForm } from '../components/LoadingSkeleton';
import type { LoginCredentials } from '../types';
import type { AxiosError } from 'axios';
import { extractErrorMessage } from '../utils/errorHandler';
import './Login.css';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Basic validation
    if (!credentials.username.trim()) {
      showNotification('Please enter your username', 'warning', 'Missing Information');
      return;
    }

    if (!credentials.password) {
      showNotification('Please enter your password', 'warning', 'Missing Password');
      return;
    }

    setLoading(true);

    try {
      const userData = await login(credentials.username, credentials.password);
      
      // Dynamic greeting based on user role
      const greeting = getGreeting(userData);
      showNotification(greeting, 'success', 'Login Successful');

      // Small delay to show the success notification
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      const axiosError = err as AxiosError;
      const errorMessage = extractErrorMessage(
        axiosError,
        'Login failed. Please check your credentials and try again.'
      );
      
      showNotification(errorMessage, 'error', 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="spinner"></div>
            <h1>Authenticating...</h1>
          </div>
          <SkeletonForm fields={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          {/* LAPD Badge */}
          <svg className="login-badge" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 5 L65 25 L90 30 L70 50 L75 75 L50 65 L25 75 L30 50 L10 30 L35 25 Z" 
                  fill="var(--color-gold)" 
                  stroke="var(--color-noir-off-white)" 
                  strokeWidth="2"/>
            <circle cx="50" cy="50" r="15" fill="var(--color-noir-charcoal)"/>
            <text x="50" y="55" textAnchor="middle" fontSize="12" fill="var(--color-gold)" fontFamily="serif">LAPD</text>
          </svg>
          <h1>LA Noire NextGen</h1>
          <p className="login-subtitle">Los Angeles Police Department</p>
          <p className="login-tagline">Case Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary login-button" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="forgot-password">
            <a href="/forgot-password">Forgot your password?</a>
          </p>
          <p className="signup-link">
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </div>

        <div className="login-info">
          <p className="info-text">
            <strong>For System Access:</strong> After creating an account, wait for 
            administrator approval and role assignment.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Get personalized greeting based on user role
 */
const getGreeting = (user: any): string => {
  if (!user) return 'Welcome back!';
  
  const role = user.role?.name?.toLowerCase() || '';
  
  if (role.includes('detective')) return 'Welcome back, Detective!';
  if (role.includes('officer')) return 'Welcome back, Officer!';
  if (role.includes('sergeant')) return 'Welcome back, Sergeant!';
  if (role.includes('lieutenant')) return 'Welcome back, Lieutenant!';
  if (role.includes('captain')) return 'Welcome back, Captain!';
  if (role.includes('chief')) return 'Welcome back, Chief!';
  if (role.includes('judge')) return 'Welcome back, Your Honor!';
  if (role.includes('coroner')) return 'Welcome back, Coroner!';
  if (role.includes('admin')) return 'Welcome back, Administrator!';
  
  return `Welcome back, ${user.first_name || user.username}!`;
};

export default Login;
