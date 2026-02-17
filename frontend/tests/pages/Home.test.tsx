/**
 * Home Page Tests
 * Tests the public landing page rendering, stats loading, and feature grid
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import Home from '../../src/pages/Home';

// Mock the case service
vi.mock('../../src/services/case', () => ({
  getCases: vi.fn(),
}));

// Mock auth context
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));

import { getCases } from '../../src/services/case';

const renderHome = () =>
  render(
    <BrowserRouter>
      <NotificationProvider>
        <Home />
      </NotificationProvider>
    </BrowserRouter>
  );

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero section with title', async () => {
    vi.mocked(getCases).mockResolvedValue({ count: 0, results: [] });
    renderHome();
    expect(screen.getByText(/LA Noire NextGen/i)).toBeInTheDocument();
  });

  it('renders feature cards', async () => {
    vi.mocked(getCases).mockResolvedValue({ count: 0, results: [] });
    renderHome();
    // "Case Management" appears in both hero subtitle and feature card — use getAllByText
    expect(screen.getAllByText(/Case Management/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Evidence Registry/i)).toBeInTheDocument();
    expect(screen.getByText(/Detective Board/i)).toBeInTheDocument();
  });

  it('shows stats once data is loaded', async () => {
    // Two calls: getCases({ page: 1 }) and getCases({ status: 'closed', page: 1 })
    vi.mocked(getCases).mockImplementation(async (params?: any) => {
      if (params?.status === 'closed') return { count: 1, results: [] };
      return { count: 5, results: [] };
    });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // total cases
    });
  });

  it('shows skeleton while loading', () => {
    // Never resolve so stays in loading state
    vi.mocked(getCases).mockReturnValue(new Promise(() => {}));
    renderHome();
    expect(screen.getByText(/Department Overview/i)).toBeInTheDocument();
  });

  it('shows login/register links when unauthenticated', () => {
    vi.mocked(getCases).mockResolvedValue({ count: 0, results: [] });
    renderHome();
    expect(screen.getByText(/Officer Login/i)).toBeInTheDocument();
    expect(screen.getByText(/New Registration/i)).toBeInTheDocument();
  });
});
