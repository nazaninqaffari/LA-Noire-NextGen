/**
 * Login Component Tests
 * Tests for the Login page component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithRouter, mockApiResponse, mockApiError, createMockUser } from '../utils';
import Login from '../../src/pages/Login';
import * as authService from '../../src/services/auth';

// Mock the auth service
vi.mock('../../src/services/auth', () => ({
  login: vi.fn(),
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

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
    expect(screen.getByLabelText(/Username \/ Email \/ Phone \/ National ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Access System/i })).toBeInTheDocument();
  });

  it('updates input fields on change', () => {
    renderWithRouter(<Login />);
    
    const identifierInput = screen.getByLabelText(/Username \/ Email \/ Phone \/ National ID/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    
    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(identifierInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls login service on form submission', async () => {
    authService.login.mockResolvedValue(createMockUser());
    
    renderWithRouter(<Login />);
    
    const identifierInput = screen.getByLabelText(/Username \/ Email \/ Phone \/ National ID/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Access System/i });
    
    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  it('navigates to dashboard on successful login', async () => {
    authService.login.mockResolvedValue(createMockUser());
    
    renderWithRouter(<Login />);
    
    const identifierInput = screen.getByLabelText(/Username \/ Email \/ Phone \/ National ID/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Access System/i });
    
    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    authService.login.mockRejectedValue(mockApiError(errorMessage, 401));
    
    renderWithRouter(<Login />);
    
    const identifierInput = screen.getByLabelText(/Username \/ Email \/ Phone \/ National ID/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Access System/i });
    
    fireEvent.change(identifierInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Login failed/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    authService.login.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithRouter(<Login />);
    
    const identifierInput = screen.getByLabelText(/Username \/ Email \/ Phone \/ National ID/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Access System/i });
    
    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/Authenticating/i)).toBeInTheDocument();
    });
  });
});
