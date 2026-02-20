/**
 * Header Component
 * Top navigation bar with LAPD branding and role-based navigation.
 * Shows different menu items based on the user's assigned roles.
 */
import React, { useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import NotificationBell from './NotificationBell';
import './Header.css';

/** Check if user has a specific role (compares case-insensitively, treats _ and space as equal) */
const hasRole = (user: any, roleName: string): boolean => {
  const normalize = (s: string) => s.toLowerCase().replace(/_/g, ' ');
  const target = normalize(roleName);
  return user?.roles?.some((r: any) =>
    normalize(typeof r === 'string' ? r : r.name) === target
  ) ?? false;
};

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine role-based nav items
  const navItems = useMemo(() => {
    if (!isAuthenticated || !user) return [];

    const items: { to: string; label: string }[] = [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/cases', label: 'Cases' },
      { to: '/evidence', label: 'Evidence' },
      { to: '/suspects', label: 'Suspects' },
    ];

    // Detective-specific
    if (hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      items.push({ to: '/detective-board', label: 'Detective Board' });
    }

    // Suspect submissions – detective creates, sergeant reviews
    if (hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'sergeant')) {
      items.push({ to: '/suspect-submissions', label: 'Suspect Submissions' });
    }

    // Interrogations – detective, sergeant, captain
    if (hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'sergeant') || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      items.push({ to: '/interrogations', label: 'Interrogations' });
    }

    // Trial management – judges, captain, sergeant (for bail)
    if (hasRole(user, 'judge') || hasRole(user, 'captain') || hasRole(user, 'police_chief')
      || hasRole(user, 'sergeant')) {
      items.push({ to: '/trials', label: 'Trials' });
    }

    // Tip reviews – officer reviews pending, detective reviews officer-approved
    if (hasRole(user, 'cadet') || hasRole(user, 'patrol_officer') || hasRole(user, 'police_officer')
      || hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'sergeant') || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      items.push({ to: '/tip-reviews', label: 'Tip Reviews' });
    }

    // Bail management – sergeant approves, suspects/citizens pay
    if (hasRole(user, 'sergeant') || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      items.push({ to: '/bail-approvals', label: 'Bail Approvals' });
    }
    
    // Bail payments – available for all authenticated users (citizens, suspects)
    items.push({ to: '/bail', label: 'Bail' });

    // Reports – leadership
    if (hasRole(user, 'captain') || hasRole(user, 'police_chief') || hasRole(user, 'judge')) {
      items.push({ to: '/reports', label: 'Reports' });
    }

    // Admin panel – admin/superuser
    if (user.is_staff || user.is_superuser || hasRole(user, 'admin')) {
      items.push({ to: '/admin', label: 'Admin' });
    }

    return items;
  }, [user, isAuthenticated]);

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
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="header-brand">
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
          {/* Most Wanted is always visible */}
          <Link
            to="/most-wanted"
            className={`nav-link${location.pathname === '/most-wanted' ? ' active' : ''}`}
          >
            Most Wanted
          </Link>

          {isAuthenticated ? (
            <>
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-link${location.pathname.startsWith(item.to) ? ' active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="header-user">
                <NotificationBell />
                <span className="user-name">{user?.username}</span>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={`nav-link${location.pathname === '/login' ? ' active' : ''}`}>Login</Link>
              <Link to="/register" className={`nav-link${location.pathname === '/register' ? ' active' : ''}`}>Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
