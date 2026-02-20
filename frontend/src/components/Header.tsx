/**
 * Header Component
 * Top navigation bar with LAPD branding and role-based navigation.
 * Shows different menu items based on the user's assigned roles.
 * Nav items are grouped into dropdown menus for better organization.
 */
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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

interface NavItem {
  to: string;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Dropdown component for grouped nav items */
const NavDropdown: React.FC<{ group: NavGroup; currentPath: string }> = ({ group, currentPath }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isActive = group.items.some(item => currentPath.startsWith(item.to));

  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClose]);

  return (
    <div className={`nav-dropdown${open ? ' open' : ''}`} ref={ref}>
      <button
        className={`nav-dropdown-toggle${isActive ? ' active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {group.label}
        <span className="dropdown-arrow">▾</span>
      </button>
      {open && (
        <div className="nav-dropdown-menu">
          {group.items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-dropdown-item${currentPath.startsWith(item.to) ? ' active' : ''}`}
              onClick={handleClose}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Build grouped navigation items
  const navGroups = useMemo(() => {
    if (!isAuthenticated || !user) return { standalone: [] as NavItem[], groups: [] as NavGroup[] };

    const standalone: NavItem[] = [
      { to: '/dashboard', label: 'Dashboard' },
    ];

    // ── Cases & Evidence ──
    const casesItems: NavItem[] = [
      { to: '/cases', label: 'Cases' },
      { to: '/evidence', label: 'Evidence' },
      { to: '/suspects', label: 'Suspects' },
    ];

    // Public Cases visible to all authenticated users
    casesItems.push({ to: '/public-cases', label: 'Public Cases' });

    // ── Investigation ──
    const investigationItems: NavItem[] = [];

    if (hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      investigationItems.push({ to: '/detective-board', label: 'Detective Board' });
    }

    if (hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'sergeant')) {
      investigationItems.push({ to: '/suspect-submissions', label: 'Suspect Submissions' });
    }

    if (hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'sergeant') || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      investigationItems.push({ to: '/interrogations', label: 'Interrogations' });
    }

    if (hasRole(user, 'cadet') || hasRole(user, 'patrol_officer') || hasRole(user, 'police_officer')
      || hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'sergeant') || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      investigationItems.push({ to: '/tip-reviews', label: 'Tip Reviews' });
    }

    // ── Justice & Trials ──
    const justiceItems: NavItem[] = [];

    if (hasRole(user, 'judge') || hasRole(user, 'captain') || hasRole(user, 'police_chief')
      || hasRole(user, 'sergeant')) {
      justiceItems.push({ to: '/trials', label: 'Trials' });
    }

    if (hasRole(user, 'cadet') || hasRole(user, 'patrol_officer') || hasRole(user, 'police_officer')
      || hasRole(user, 'detective') || hasRole(user, 'senior_detective')
      || hasRole(user, 'sergeant') || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      justiceItems.push({ to: '/bail', label: 'Bail' });
    }

    if (hasRole(user, 'sergeant') || hasRole(user, 'captain') || hasRole(user, 'police_chief')) {
      justiceItems.push({ to: '/bail-approvals', label: 'Bail Approvals' });
    }

    // ── Admin & Reports ──
    const adminItems: NavItem[] = [];

    if (hasRole(user, 'captain') || hasRole(user, 'police_chief') || hasRole(user, 'judge')) {
      adminItems.push({ to: '/reports', label: 'Reports' });
    }

    if (user.is_staff || user.is_superuser || hasRole(user, 'admin')) {
      adminItems.push({ to: '/admin', label: 'Admin Panel' });
    }

    // Build groups (only include non-empty ones)
    const groups: NavGroup[] = [];
    if (casesItems.length > 0) groups.push({ label: 'Cases & Evidence', items: casesItems });
    if (investigationItems.length > 0) groups.push({ label: 'Investigation', items: investigationItems });
    if (justiceItems.length > 0) groups.push({ label: 'Justice', items: justiceItems });
    if (adminItems.length > 0) groups.push({ label: 'Admin', items: adminItems });

    return { standalone, groups };
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
              {/* Standalone links */}
              {navGroups.standalone.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-link${location.pathname.startsWith(item.to) ? ' active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Dropdown groups */}
              {navGroups.groups.map(group => (
                <NavDropdown key={group.label} group={group} currentPath={location.pathname} />
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
