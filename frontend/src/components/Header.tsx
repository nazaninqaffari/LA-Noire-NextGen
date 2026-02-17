/**
 * Header Component
 * Top navigation bar with LAPD branding
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './Header.css';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      showNotification('Logged out successfully', 'success');
      navigate('/login');
    } catch (error) {
      showNotification('Logout failed', 'error');
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link to="/dashboard" className="header-brand">
            <div className="badge-container">
              <svg className="badge-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 5 L65 25 L90 30 L70 50 L75 75 L50 65 L25 75 L30 50 L10 30 L35 25 Z" 
                      fill="var(--color-gold)" 
                      stroke="var(--color-noir-charcoal)" 
                      strokeWidth="2"/>
                <circle cx="50" cy="50" r="15" fill="var(--color-noir-charcoal)"/>
                <text x="50" y="55" textAnchor="middle" fontSize="12" fill="var(--color-gold)" fontFamily="serif">LAPD</text>
              </svg>
            </div>
            <div className="header-title">
              <h1 className="site-title">LA Noire NextGen</h1>
              <p className="site-subtitle">Los Angeles Police Department</p>
            </div>
          </Link>
        </div>
        
        <nav className="header-nav">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/cases" className="nav-link">Cases</Link>
              <Link to="/evidence" className="nav-link">Evidence</Link>
              <Link to="/suspects" className="nav-link">Suspects</Link>
              <div className="header-user">
                <span className="user-name">{user?.username}</span>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
