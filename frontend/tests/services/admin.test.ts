/**
 * Admin Service Tests
 * Tests API calls for user management and role CRUD
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/services/api';
import {
  getUsers,
  getUser,
  updateUser,
  assignRoles,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from '../../src/services/admin';

vi.mock('../../src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Admin Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Users', () => {
    it('getUsers calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getUsers();
      expect(api.get).toHaveBeenCalledWith('/accounts/users/', { params: undefined });
    });

    it('getUsers with search param', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getUsers({ search: 'cole' });
      expect(api.get).toHaveBeenCalledWith('/accounts/users/', { params: { search: 'cole' } });
    });

    it('getUser calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { id: 1 } });
      await getUser(1);
      expect(api.get).toHaveBeenCalledWith('/accounts/users/1/');
    });

    it('updateUser patches user data', async () => {
      const data = { first_name: 'Updated' };
      vi.mocked(api.patch).mockResolvedValue({ data: { id: 1, ...data } });
      await updateUser(1, data);
      expect(api.patch).toHaveBeenCalledWith('/accounts/users/1/', data);
    });

    it('assignRoles posts role IDs', async () => {
      const roleIds = [1, 2, 3];
      vi.mocked(api.post).mockResolvedValue({ data: {} });
      await assignRoles(1, roleIds);
      expect(api.post).toHaveBeenCalledWith('/accounts/users/1/assign_roles/', { role_ids: roleIds });
    });
  });

  describe('Roles', () => {
    it('getRoles calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getRoles();
      expect(api.get).toHaveBeenCalledWith('/accounts/roles/');
    });

    it('createRole posts role data', async () => {
      const data = { name: 'sergeant', hierarchy_level: 4, description: 'Sergeant rank' };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1, ...data } });
      await createRole(data);
      expect(api.post).toHaveBeenCalledWith('/accounts/roles/', data);
    });

    it('updateRole patches role data', async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: {} });
      await updateRole(1, { description: 'Updated' });
      expect(api.patch).toHaveBeenCalledWith('/accounts/roles/1/', { description: 'Updated' });
    });

    it('deleteRole calls correct endpoint', async () => {
      vi.mocked(api.delete).mockResolvedValue({});
      await deleteRole(3);
      expect(api.delete).toHaveBeenCalledWith('/accounts/roles/3/');
    });
  });
});
