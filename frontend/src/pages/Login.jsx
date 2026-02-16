/**
 * Login Page
 * User authentication interface
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(credentials.identifier, credentials.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
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

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="identifier">Username / Email / Phone / National ID</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={credentials.identifier}
              onChange={handleChange}
              placeholder="Enter your credentials"
              required
              autoComplete="username"
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
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Access System'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-notice">
            Authorized personnel only. All access is logged and monitored.
          </p>
          <p className="login-era">
            Est. 1940s • Digitized 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
