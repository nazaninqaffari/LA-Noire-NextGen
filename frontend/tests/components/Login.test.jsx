/**
 * Login Component Tests
 * Tests for the Login page component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../utils';
import Login from '../../src/pages/Login';

// Mock AuthContext - Login uses useAuth().login
const mockLogin = vi.fn();
vi.mock('../../src/contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../src/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    }),
  };
});

// Mock NotificationContext - Login uses showNotification for errors
const mockShowNotification = vi.fn();
vi.mock('../../src/contexts/NotificationContext', async () => {
  const actual = await vi.importActual('../../src/contexts/NotificationContext');
  return {
    ...actual,
    useNotification: () => ({
      showNotification: mockShowNotification,
      notifications: [],
      removeNotification: vi.fn(),
    }),
  };
});

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    renderWithRouter(<Login />);

    expect(screen.getByText(/LA Noire NextGen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('updates input fields on change', () => {
    renderWithRouter(<Login />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls login on form submission', async () => {
    mockLogin.mockResolvedValue(undefined);

    renderWithRouter(<Login />);

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  it('shows notification on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    renderWithRouter(<Login />);

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalled();
    });
  });

  it('shows loading skeleton while authenticating', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithRouter(<Login />);

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      // Login component replaces the form with "Authenticating..." + skeleton
      expect(screen.getByText(/Authenticating/i)).toBeInTheDocument();
    });
  });

  it('renders create account link', () => {
    renderWithRouter(<Login />);
    expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
  });
});
