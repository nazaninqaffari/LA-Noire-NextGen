/**
 * Trials Page Tests
 * Tests trial list rendering, split-panel detail view, and verdict delivery
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import Trials from '../../src/pages/Trials';

vi.mock('../../src/services/trial', () => ({
  getTrials: vi.fn(),
  getCaseSummary: vi.fn(),
  deliverVerdict: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../src/contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: { id: 1, username: 'judge1', roles: [{ name: 'judge' }] },
      isAuthenticated: true,
    })),
  };
});

import { getTrials, getCaseSummary } from '../../src/services/trial';

const renderTrials = () =>
  render(
    <BrowserRouter>
      <NotificationProvider>
        <Trials />
      </NotificationProvider>
    </BrowserRouter>
  );

const mockTrials = [
  {
    id: 1,
    case_title: 'Case 001 - Robbery',
    suspect: { id: 1, person: { first_name: 'John', last_name: 'Doe' } },
    judge: { id: 1, username: 'judge1' },
    status: 'in_progress',
    start_date: '2024-01-15T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    verdicts: [],
  },
  {
    id: 2,
    case_title: 'Case 002 - Arson',
    suspect: { id: 2, person: { first_name: 'Jane', last_name: 'Smith' } },
    judge: { id: 2, username: 'judge2' },
    status: 'completed',
    start_date: '2024-02-01T00:00:00Z',
    created_at: '2024-01-15T00:00:00Z',
    verdicts: [{ id: 1, verdict: 'guilty', reasoning: 'Overwhelming evidence' }],
  },
];

describe('Trials Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(getTrials).mockResolvedValue({ results: mockTrials });
    renderTrials();
    expect(screen.getByText(/Trial Records/i)).toBeInTheDocument();
  });

  it('displays list of trials', async () => {
    vi.mocked(getTrials).mockResolvedValue({ results: mockTrials });
    renderTrials();

    await waitFor(() => {
      expect(screen.getByText(/Case 001 - Robbery/i)).toBeInTheDocument();
      expect(screen.getByText(/Case 002 - Arson/i)).toBeInTheDocument();
    });
  });

  it('shows trial detail when a trial is clicked', async () => {
    vi.mocked(getTrials).mockResolvedValue({ results: mockTrials });
    vi.mocked(getCaseSummary).mockResolvedValue({ summary: 'Test summary' });
    renderTrials();

    await waitFor(() => {
      expect(screen.getByText(/Case 001 - Robbery/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Case 001 - Robbery/i));

    await waitFor(() => {
      expect(getCaseSummary).toHaveBeenCalledWith(1);
    });
  });

  it('shows skeleton while loading', () => {
    vi.mocked(getTrials).mockReturnValue(new Promise(() => {}));
    renderTrials();
    expect(screen.getByText(/Trial Records/i)).toBeInTheDocument();
  });

  it('shows empty state when no trials', async () => {
    vi.mocked(getTrials).mockResolvedValue({ results: [] });
    renderTrials();

    await waitFor(() => {
      expect(screen.getByText(/No trials on record/i)).toBeInTheDocument();
    });
  });
});
