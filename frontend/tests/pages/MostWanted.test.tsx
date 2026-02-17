/**
 * MostWanted Page Tests
 * Tests the public most-wanted page and tip submission
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import MostWanted from '../../src/pages/MostWanted';

vi.mock('../../src/services/investigation', () => ({
  getIntensivePursuitSuspects: vi.fn(),
  createTipOff: vi.fn(),
  verifyReward: vi.fn(),
}));

import { getIntensivePursuitSuspects } from '../../src/services/investigation';

const renderMostWanted = () =>
  render(
    <BrowserRouter>
      <NotificationProvider>
        <MostWanted />
      </NotificationProvider>
    </BrowserRouter>
  );

const mockSuspects = [
  {
    id: 1,
    person: { first_name: 'John', last_name: 'Doe' },
    status: 'intensive_pursuit',
    danger_score: 90,
    reward_amount: 10000000,
    photo: null,
    case: 1,
  },
];

describe('MostWanted Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(getIntensivePursuitSuspects).mockResolvedValue(mockSuspects);
    renderMostWanted();
    expect(screen.getByText(/Most Wanted/i)).toBeInTheDocument();
  });

  it('displays wanted suspect cards', async () => {
    vi.mocked(getIntensivePursuitSuspects).mockResolvedValue(mockSuspects);
    renderMostWanted();

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no wanted suspects', async () => {
    vi.mocked(getIntensivePursuitSuspects).mockResolvedValue([]);
    renderMostWanted();

    await waitFor(() => {
      expect(screen.getByText(/No fugitives currently/i)).toBeInTheDocument();
    });
  });

  it('shows tip submission button', async () => {
    vi.mocked(getIntensivePursuitSuspects).mockResolvedValue(mockSuspects);
    renderMostWanted();

    await waitFor(() => {
      // Multiple matches for "Submit a Tip" (warning text + button) — target the button
      expect(screen.getByRole('button', { name: /Submit a Tip/i })).toBeInTheDocument();
    });
  });
});
