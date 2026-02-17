/**
 * Admin Panel Page
 * Custom admin panel (non-Django) for user and role management
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { getUsers, assignRoles } from '../services/admin';
import { getRoles, createRole, deleteRole } from '../services/admin';
import type { User, Role } from '../types';
import { SkeletonTable } from '../components/LoadingSkeleton';
import './AdminPanel.css';

type AdminTab = 'users' | 'roles';

const AdminPanel: React.FC = () => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Role assignment state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // New role form
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(1);
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleIsPolice, setNewRoleIsPolice] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesData] = await Promise.all([
        getUsers({ search: searchTerm || undefined }),
        getRoles(),
      ]);
      setUsers(usersRes.results);
      setRoles(rolesData);
    } catch {
      showNotification('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    try {
      await assignRoles(selectedUser.id, selectedRoles);
      showNotification(`Roles assigned to ${selectedUser.username}`, 'success');
      setSelectedUser(null);
      setSelectedRoles([]);
      fetchData();
    } catch {
      showNotification('Failed to assign roles', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRole({
        name: newRoleName,
        hierarchy_level: newRoleLevel,
        description: newRoleDesc || undefined,
        is_police_rank: newRoleIsPolice,
      });
      showNotification('Role created successfully', 'success');
      setShowNewRole(false);
      setNewRoleName('');
      setNewRoleLevel(1);
      setNewRoleDesc('');
      setNewRoleIsPolice(false);
      fetchData();
    } catch {
      showNotification('Failed to create role', 'error');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await deleteRole(roleId);
      showNotification('Role deleted', 'success');
      fetchData();
    } catch {
      showNotification('Failed to delete role', 'error');
    }
  };

  const toggleRoleSelection = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const openRoleAssignment = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles?.map((r) => r.id) || []);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">User and role management</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          🔑 Roles
        </button>
      </div>

      {loading ? (
        <SkeletonTable />
      ) : activeTab === 'users' ? (
        /* ─── Users Tab ─────────────────────────────────────────── */
        <div className="admin-users">
          <div className="admin-toolbar">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search"
            />
          </div>

          {/* Role Assignment Modal */}
          {selectedUser && (
            <div className="role-assignment card">
              <h3>Assign Roles — {selectedUser.username}</h3>
              <div className="role-checkboxes">
                {roles.map((role) => (
                  <label key={role.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => toggleRoleSelection(role.id)}
                    />
                    <span className="role-name">{role.name}</span>
                    <span className="role-level">Level {role.hierarchy_level}</span>
                  </label>
                ))}
              </div>
              <div className="form-actions-inline">
                <button
                  className="btn btn-primary"
                  onClick={handleAssignRoles}
                  disabled={assigning}
                >
                  {assigning ? 'Saving...' : 'Save Roles'}
                </button>
                <button className="btn" onClick={() => setSelectedUser(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="username-cell">{user.username}</td>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <div className="role-tags">
                      {(user.roles || []).map((r) => (
                        <span key={r.id} className="role-tag">{r.name}</span>
                      ))}
                      {(!user.roles || user.roles.length === 0) && (
                        <span className="role-tag none">No roles</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`user-status ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm"
                      onClick={() => openRoleAssignment(user)}
                    >
                      Assign Roles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── Roles Tab ─────────────────────────────────────────── */
        <div className="admin-roles">
          <div className="admin-toolbar">
            <button
              className="btn btn-primary"
              onClick={() => setShowNewRole(!showNewRole)}
            >
              + Create Role
            </button>
          </div>

          {showNewRole && (
            <form onSubmit={handleCreateRole} className="card new-role-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Role Name</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g., Detective"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hierarchy Level</label>
                  <input
                    type="number"
                    value={newRoleLevel}
                    onChange={(e) => setNewRoleLevel(Number(e.target.value))}
                    min={0}
                    max={100}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Role description (optional)"
                />
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newRoleIsPolice}
                  onChange={(e) => setNewRoleIsPolice(e.target.checked)}
                />
                Is Police Rank
              </label>
              <div className="form-actions-inline">
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn" onClick={() => setShowNewRole(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="roles-grid">
            {Array.isArray(roles) && roles.map((role) => (
              <div key={role.id} className="role-card">
                <div className="role-card-header">
                  <h3>{role.name}</h3>
                  <span className="role-hierarchy">Level {role.hierarchy_level}</span>
                </div>
                {role.description && (
                  <p className="role-description">{role.description}</p>
                )}
                <div className="role-card-footer">
                  {role.is_police_rank && (
                    <span className="police-badge">🔰 Police Rank</span>
                  )}
                  <button
                    className="btn-icon danger"
                    onClick={() => handleDeleteRole(role.id)}
                    title="Delete role"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
