import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { createRole, deleteRole } from '../../services/admin';
import type { Role } from '../../types';

interface AdminRolesProps {
  roles: Role[];
  onRefresh: () => void;
}

const AdminRoles: React.FC<AdminRolesProps> = ({ roles, onRefresh }) => {
  const { showNotification } = useNotification();
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(1);
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleIsPolice, setNewRoleIsPolice] = useState(false);

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
      onRefresh();
    } catch {
      showNotification('Failed to create role', 'error');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await deleteRole(roleId);
      showNotification('Role deleted', 'success');
      onRefresh();
    } catch {
      showNotification('Failed to delete role', 'error');
    }
  };

  return (
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
                <span className="police-badge">Police Rank</span>
              )}
              <button
                className="btn-icon danger"
                onClick={() => handleDeleteRole(role.id)}
                title="Delete role"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRoles;
