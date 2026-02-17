/**
 * AdminPanel Page Tests
 * Tests user list, role management, and assignment functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import AdminPanel from '../../src/pages/AdminPanel';

vi.mock('../../src/services/admin', () => ({
  getUsers: vi.fn(),
  assignRoles: vi.fn(),
  getRoles: vi.fn(),
  createRole: vi.fn(),
  deleteRole: vi.fn(),
}));

import { getUsers, getRoles } from '../../src/services/admin';

const renderAdmin = () =>
  render(
    <BrowserRouter>
      <NotificationProvider>
        <AdminPanel />
      </NotificationProvider>
    </BrowserRouter>
  );

const mockUsers = [
  {
    id: 1,
    username: 'admin1',
    email: 'admin@lapd.gov',
    first_name: 'Admin',
    last_name: 'User',
    is_active: true,
    roles: [{ id: 1, name: 'admin', hierarchy_level: 10 }],
  },
  {
    id: 2,
    username: 'detective1',
    email: 'det@lapd.gov',
    first_name: 'Cole',
    last_name: 'Phelps',
    is_active: true,
    roles: [{ id: 2, name: 'detective', hierarchy_level: 5 }],
  },
];

const mockRoles = [
  { id: 1, name: 'admin', hierarchy_level: 10, description: 'Admin', is_police_rank: false },
  { id: 2, name: 'detective', hierarchy_level: 5, description: 'Detective', is_police_rank: true },
];

describe('AdminPanel Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders page title and tabs', async () => {
    vi.mocked(getUsers).mockResolvedValue({ count: 2, results: mockUsers });
    vi.mocked(getRoles).mockResolvedValue(mockRoles);
    renderAdmin();
    expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Users/i)).toBeInTheDocument();
    expect(screen.getByText(/Roles/i)).toBeInTheDocument();
  });

  it('displays user table on users tab', async () => {
    vi.mocked(getUsers).mockResolvedValue({ count: 2, results: mockUsers });
    vi.mocked(getRoles).mockResolvedValue(mockRoles);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
      expect(screen.getByText('detective1')).toBeInTheDocument();
    });
  });

  it('switches to roles tab', async () => {
    vi.mocked(getUsers).mockResolvedValue({ count: 2, results: mockUsers });
    vi.mocked(getRoles).mockResolvedValue(mockRoles);
    renderAdmin();

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    // "Roles" appears in tab button and "Assign Roles" buttons — use exact match for tab
    const rolesTab = screen.getByRole('button', { name: /^🔑 Roles$/ });
    fireEvent.click(rolesTab);

    await waitFor(() => {
      expect(screen.getByText(/Create Role/i)).toBeInTheDocument();
    });
  });

  it('shows search functionality', async () => {
    vi.mocked(getUsers).mockResolvedValue({ count: 2, results: mockUsers });
    vi.mocked(getRoles).mockResolvedValue(mockRoles);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search users/i)).toBeInTheDocument();
    });
  });

  it('shows skeleton while loading', () => {
    vi.mocked(getUsers).mockReturnValue(new Promise(() => {}));
    vi.mocked(getRoles).mockReturnValue(new Promise(() => {}));
    renderAdmin();
    expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
  });
});
