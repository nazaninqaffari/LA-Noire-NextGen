/**
 * Header Component Tests
 * Tests for the Header navigation component with role-based links
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import Header from '../../src/components/Header';

// Mock useAuth to control authenticated state
const mockUseAuth = vi.fn();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderHeader = () =>
  render(
    <BrowserRouter>
      <NotificationProvider>
        <Header />
      </NotificationProvider>
    </BrowserRouter>
  );

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with site title', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, logout: vi.fn() });
    renderHeader();
    expect(screen.getByText(/LA Noire NextGen/i)).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles Police Department/i)).toBeInTheDocument();
  });

  it('shows Most Wanted link for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, logout: vi.fn() });
    renderHeader();
    expect(screen.getByText('Most Wanted')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('shows standard nav for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'cole', roles: [{ name: 'detective' }] },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    renderHeader();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Cases')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Suspects')).toBeInTheDocument();
    expect(screen.getByText('Detective Board')).toBeInTheDocument();
    expect(screen.getByText('cole')).toBeInTheDocument();
  });

  it('shows admin link for admin user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'admin', is_staff: true, roles: [] },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    renderHeader();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows trials and reports for judge', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'judge1', roles: [{ name: 'judge' }] },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    renderHeader();
    expect(screen.getByText('Trials')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('does not show admin link for regular detective', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'det', roles: [{ name: 'detective' }] },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    renderHeader();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('renders LAPD badge icon', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, logout: vi.fn() });
    renderHeader();
    const badge = document.querySelector('.badge-icon');
    expect(badge).toBeInTheDocument();
  });
});
