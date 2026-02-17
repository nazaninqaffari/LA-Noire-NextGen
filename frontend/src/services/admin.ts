/**
 * Admin Service
 * API functions for user management and role assignment
 */
import { api } from './api';
import type { User, Role, PaginatedResponse } from '../types';

const USERS_URL = '/accounts/users';
const ROLES_URL = '/accounts/roles';

/* ─── Users ─────────────────────────────────────────────────────── */

export const getUsers = async (params?: {
  page?: number;
  search?: string;
}): Promise<PaginatedResponse<User>> => {
  const response = await api.get<PaginatedResponse<User>>(`${USERS_URL}/`, { params });
  return response.data;
};

export const getUser = async (id: number): Promise<User> => {
  const response = await api.get<User>(`${USERS_URL}/${id}/`);
  return response.data;
};

export const updateUser = async (id: number, data: Partial<User>): Promise<User> => {
  const response = await api.patch<User>(`${USERS_URL}/${id}/`, data);
  return response.data;
};

export const assignRoles = async (
  userId: number,
  roleIds: number[]
): Promise<User> => {
  const response = await api.post<User>(`${USERS_URL}/${userId}/assign_roles/`, {
    role_ids: roleIds,
  });
  return response.data;
};

/* ─── Roles ─────────────────────────────────────────────────────── */

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get<Role[] | PaginatedResponse<Role>>(`${ROLES_URL}/`);
  // Handle both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return (response.data as PaginatedResponse<Role>).results;
};

export const createRole = async (
  data: { name: string; hierarchy_level: number; description?: string; is_police_rank?: boolean }
): Promise<Role> => {
  const response = await api.post<Role>(`${ROLES_URL}/`, data);
  return response.data;
};

export const updateRole = async (id: number, data: Partial<Role>): Promise<Role> => {
  const response = await api.patch<Role>(`${ROLES_URL}/${id}/`, data);
  return response.data;
};

export const deleteRole = async (id: number): Promise<void> => {
  await api.delete(`${ROLES_URL}/${id}/`);
};
