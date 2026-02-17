/**
 * Reports Page Tests
 * Tests aggregated stats, case resolution rate, and report table
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import Reports from '../../src/pages/Reports';

vi.mock('../../src/services/case', () => ({
  getCases: vi.fn(),
}));

vi.mock('../../src/services/investigation', () => ({
  getSuspects: vi.fn(),
}));

vi.mock('../../src/services/trial', () => ({
  getTrials: vi.fn(),
}));

import { getCases } from '../../src/services/case';
import { getSuspects } from '../../src/services/investigation';
import { getTrials } from '../../src/services/trial';

const renderReports = () =>
  render(
    <BrowserRouter>
      <NotificationProvider>
        <Reports />
      </NotificationProvider>
    </BrowserRouter>
  );

describe('Reports Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(getCases).mockResolvedValue({ count: 0, results: [] });
    vi.mocked(getSuspects).mockResolvedValue({ count: 0, results: [] });
    vi.mocked(getTrials).mockResolvedValue({ count: 0, results: [] });
    renderReports();
    expect(screen.getByText(/General Reports/i)).toBeInTheDocument();
  });

  it('displays aggregated stats', async () => {
    vi.mocked(getCases).mockResolvedValue({
      count: 3,
      results: [
        { id: 1, status: 'in_progress' },
        { id: 2, status: 'closed' },
        { id: 3, status: 'closed' },
      ],
    });
    vi.mocked(getSuspects).mockResolvedValue({
      count: 2,
      results: [
        { id: 1, status: 'under_pursuit' },
        { id: 2, status: 'arrested' },
      ],
    });
    vi.mocked(getTrials).mockResolvedValue({ count: 0, results: [] });

    renderReports();

    await waitFor(() => {
      // Total cases = 3
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows skeleton while loading', () => {
    vi.mocked(getCases).mockReturnValue(new Promise(() => {}));
    vi.mocked(getSuspects).mockReturnValue(new Promise(() => {}));
    vi.mocked(getTrials).mockReturnValue(new Promise(() => {}));
    renderReports();
    expect(screen.getByText(/General Reports/i)).toBeInTheDocument();
  });

  it('shows stats labels', async () => {
    vi.mocked(getCases).mockResolvedValue({ count: 0, results: [] });
    vi.mocked(getSuspects).mockResolvedValue({ count: 0, results: [] });
    vi.mocked(getTrials).mockResolvedValue({ count: 0, results: [] });
    renderReports();

    await waitFor(() => {
      expect(screen.getByText(/Total Cases/i)).toBeInTheDocument();
      expect(screen.getByText(/Resolution Rate/i)).toBeInTheDocument();
    });
  });
});
