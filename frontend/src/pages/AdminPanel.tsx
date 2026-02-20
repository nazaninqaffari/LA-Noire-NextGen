/**
 * Admin Panel Page
 * Thin shell that renders tab navigation and delegates to sub-components.
 * Restricted to administrators only.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getRoles } from '../services/admin';
import type { User, Role } from '../types';
import AdminDashboard from './admin/AdminDashboard';
import AdminUsers from './admin/AdminUsers';
import AdminRoles from './admin/AdminRoles';
import AdminCases from './admin/AdminCases';
import './AdminPanel.css';

type AdminTab = 'dashboard' | 'users' | 'roles' | 'cases';

/**
 * Check if a user has admin privileges.
 * An admin is: superuser, staff, or has the 'Administrator' role.
 */
function isAdmin(user: User | null): boolean {
  if (!user) return false;
  if (user.is_superuser || user.is_staff) return true;
  return (user.roles ?? []).some(
    (r) => r.name.toLowerCase() === 'administrator'
  );
}

const AdminPanel: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [roles, setRoles] = useState<Role[]>([]);

  // --- Admin guard: redirect non-admin users ---
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin(user as User)) {
      showNotification('Access denied. Administrator privileges required.', 'error');
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate, showNotification]);

  const fetchRoles = useCallback(async () => {
    try {
      const rolesData = await getRoles();
      setRoles(rolesData);
    } catch {
      // roles are not critical at shell level
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Don't render until auth is resolved and user is confirmed admin
  if (authLoading || !isAuthenticated || !isAdmin(user as User)) {
    return null;
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">System administration and management</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Roles
        </button>
        <button
          className={`tab-btn ${activeTab === 'cases' ? 'active' : ''}`}
          onClick={() => setActiveTab('cases')}
        >
          Cases
        </button>
      </div>

      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'users' && <AdminUsers roles={roles} onRefresh={fetchRoles} />}
      {activeTab === 'roles' && <AdminRoles roles={roles} onRefresh={fetchRoles} />}
      {activeTab === 'cases' && <AdminCases />}
    </div>
  );
};

export default AdminPanel;
