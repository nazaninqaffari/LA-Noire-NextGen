import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  getUsers,
  assignRoles,
  createUser,
  deleteUser,
  toggleUserActive,
} from '../../services/admin';
import Pagination from '../../components/Pagination';
import type { User, Role, AdminCreateUserData } from '../../types';

interface AdminUsersProps {
  roles: Role[];
  onRefresh: () => void;
}

const PAGE_SIZE = 10;

const AdminUsers: React.FC<AdminUsersProps> = ({ roles, onRefresh }) => {
  const { user: currentUser } = useAuth();
  const { showNotification } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Role assignment
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<AdminCreateUserData>({
    username: '',
    email: '',
    phone_number: '',
    national_id: '',
    first_name: '',
    last_name: '',
    password: '',
    role_ids: [],
    is_active: true,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ page, search: searchTerm || undefined });
      setUsers(res.results);
      setTotalCount(res.count);
    } catch {
      showNotification('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, showNotification]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    try {
      await assignRoles(selectedUser.id, selectedRoles);
      showNotification(`Roles assigned to ${selectedUser.username}`, 'success');
      setSelectedUser(null);
      setSelectedRoles([]);
      fetchUsers();
      onRefresh();
    } catch {
      showNotification('Failed to assign roles', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await toggleUserActive(user.id);
      showNotification(
        `${user.username} ${user.is_active ? 'deactivated' : 'activated'}`,
        'success'
      );
      fetchUsers();
    } catch {
      showNotification('Failed to toggle user status', 'error');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      showNotification(`User ${user.username} deleted`, 'success');
      fetchUsers();
      onRefresh();
    } catch {
      showNotification('Failed to delete user', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(createForm);
      showNotification('User created successfully', 'success');
      setShowCreate(false);
      setCreateForm({
        username: '',
        email: '',
        phone_number: '',
        national_id: '',
        first_name: '',
        last_name: '',
        password: '',
        role_ids: [],
        is_active: true,
      });
      fetchUsers();
      onRefresh();
    } catch {
      showNotification('Failed to create user', 'error');
    }
  };

  const toggleRoleSelection = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleCreateFormRole = (roleId: number) => {
    setCreateForm((prev) => {
      const ids = prev.role_ids || [];
      return {
        ...prev,
        role_ids: ids.includes(roleId)
          ? ids.filter((id) => id !== roleId)
          : [...ids, roleId],
      };
    });
  };

  const openRoleAssignment = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles?.map((r) => r.id) || []);
  };

  return (
    <div className="admin-users">
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-search"
        />
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          + Create User
        </button>
      </div>

      {/* Create User Form */}
      {showCreate && (
        <form onSubmit={handleCreateUser} className="card admin-create-form">
          <h3>Create New User</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={createForm.first_name}
                onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={createForm.last_name}
                onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                value={createForm.phone_number}
                onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                placeholder="+11234567890"
                required
              />
            </div>
            <div className="form-group">
              <label>National ID</label>
              <input
                type="text"
                value={createForm.national_id}
                onChange={(e) => setCreateForm({ ...createForm, national_id: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Roles</label>
            <div className="role-checkboxes">
              {roles.map((role) => (
                <label key={role.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(createForm.role_ids || []).includes(role.id)}
                    onChange={() => toggleCreateFormRole(role.id)}
                  />
                  <span className="role-name">{role.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-actions-inline">
            <button type="submit" className="btn btn-primary">Create User</button>
            <button type="button" className="btn" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

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

      {loading ? (
        <p className="admin-loading">Loading users...</p>
      ) : (
        <>
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
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="username-cell">{u.username}</td>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <div className="role-tags">
                      {(u.roles || []).map((r) => (
                        <span key={r.id} className="role-tag">{r.name}</span>
                      ))}
                      {(!u.roles || u.roles.length === 0) && (
                        <span className="role-tag none">No roles</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`user-status ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm"
                        onClick={() => openRoleAssignment(u)}
                      >
                        Roles
                      </button>
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className="btn btn-sm danger"
                            onClick={() => handleDelete(u)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default AdminUsers;
