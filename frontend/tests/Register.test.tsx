/**
 * Register Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../src/pages/Register';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import * as api from '../src/services/api';

// Mock the API module
vi.mock('../src/services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderRegister = () => {
  return render(
    <BrowserRouter>
      <NotificationProvider>
        <Register />
      </NotificationProvider>
    </BrowserRouter>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form with all fields', () => {
    renderRegister();

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/national id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    renderRegister();

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/national id is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderRegister();

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('validates phone number format', async () => {
    renderRegister();

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '123' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    renderRegister();

    const passwordInput = screen.getByLabelText(/^password/i);
    fireEvent.change(passwordInput, { target: { value: 'short' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    renderRegister();

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'SecurePass123' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass123' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('validates username length', async () => {
    renderRegister();

    const usernameInput = screen.getByLabelText(/^username/i);
    fireEvent.change(usernameInput, { target: { value: 'ab' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('validates national ID length', async () => {
    renderRegister();

    const nationalIdInput = screen.getByLabelText(/national id/i);
    fireEvent.change(nationalIdInput, { target: { value: '1234567' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/national id must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('clears error messages when user starts typing', async () => {
    renderRegister();

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Cole' } });

    await waitFor(() => {
      expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
    });
  });

  it('submits form successfully with valid data', async () => {
    const mockApiPost = vi.mocked(api.api.post);
    mockApiPost.mockResolvedValueOnce({ data: { id: 1, username: 'cole_phelps' } });

    renderRegister();

    // Fill in all fields with valid data
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Cole' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Phelps' } });
    fireEvent.change(screen.getByLabelText(/national id/i), { target: { value: 'CA123456789' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'cole@lapd.gov' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '2135551234' } });
    fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: 'cole_phelps' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'SecurePass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'SecurePass123' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/register/', {
        username: 'cole_phelps',
        password: 'SecurePass123',
        email: 'cole@lapd.gov',
        phone_number: '2135551234',
        first_name: 'Cole',
        last_name: 'Phelps',
        national_id: 'CA123456789',
      });
    });
  });

  it('shows loading skeleton during submission', async () => {
    const mockApiPost = vi.mocked(api.api.post);
    mockApiPost.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderRegister();

    // Fill in valid data
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Cole' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Phelps' } });
    fireEvent.change(screen.getByLabelText(/national id/i), { target: { value: 'CA123456789' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'cole@lapd.gov' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '2135551234' } });
    fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: 'cole_phelps' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'SecurePass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'SecurePass123' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/creating your account/i)).toBeInTheDocument();
    });
  });

  it('displays link to login page', () => {
    renderRegister();

    const loginLink = screen.getByText(/sign in/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('displays information note about role assignment', () => {
    renderRegister();

    expect(screen.getByText(/after registration/i)).toBeInTheDocument();
    expect(screen.getByText(/normal user/i)).toBeInTheDocument();
  });
});
