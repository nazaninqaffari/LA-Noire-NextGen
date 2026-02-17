/**
 * Suspects Page Tests
 * Tests suspect registry rendering, filtering, and card display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import Suspects from '../../src/pages/Suspects';

vi.mock('../../src/services/investigation', () => ({
  getSuspects: vi.fn(),
}));

import { getSuspects } from '../../src/services/investigation';

const renderSuspects = () =>
  render(
    <BrowserRouter>
      <NotificationProvider>
        <Suspects />
      </NotificationProvider>
    </BrowserRouter>
  );

const mockSuspects = [
  {
    id: 1,
    person: { first_name: 'John', last_name: 'Doe' },
    status: 'under_pursuit',
    danger_score: 65,
    reward_amount: 5000000,
    approved_by_sergeant: true,
    arrest_warrant_issued: false,
    case: 1,
    photo: null,
  },
  {
    id: 2,
    person: { first_name: 'Jane', last_name: 'Smith' },
    status: 'arrested',
    danger_score: 30,
    reward_amount: 0,
    approved_by_sergeant: true,
    arrest_warrant_issued: true,
    case: 2,
    photo: null,
  },
];

describe('Suspects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(getSuspects).mockResolvedValue({ results: mockSuspects });
    renderSuspects();
    expect(screen.getByText(/Suspect Registry/i)).toBeInTheDocument();
  });

  it('displays suspect cards', async () => {
    vi.mocked(getSuspects).mockResolvedValue({ results: mockSuspects });
    renderSuspects();

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
    });
  });

  it('shows filter buttons', async () => {
    vi.mocked(getSuspects).mockResolvedValue({ results: [] });
    renderSuspects();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText(/Under Pursuit/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrested/i)).toBeInTheDocument();
  });

  it('filters suspects when clicking status button', async () => {
    vi.mocked(getSuspects).mockResolvedValue({ results: mockSuspects });
    renderSuspects();

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    const arrestedBtn = screen.getAllByText(/Arrested/i)[0];
    fireEvent.click(arrestedBtn);

    // After filtering, getSuspects should be called again with status param
    await waitFor(() => {
      expect(getSuspects).toHaveBeenCalledTimes(2);
    });
  });

  it('shows loading skeleton initially', () => {
    vi.mocked(getSuspects).mockReturnValue(new Promise(() => {}));
    renderSuspects();
    // Should not crash; skeleton loading should be shown
    expect(screen.getByText(/Suspect Registry/i)).toBeInTheDocument();
  });

  it('shows empty state when no suspects', async () => {
    vi.mocked(getSuspects).mockResolvedValue({ results: [] });
    renderSuspects();

    await waitFor(() => {
      expect(screen.getByText(/No suspects matching/i)).toBeInTheDocument();
    });
  });
});
