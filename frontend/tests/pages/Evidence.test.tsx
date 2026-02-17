/**
 * Evidence Page Tests
 * Tests the evidence browser: tab switching, data fetching, card rendering
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider } from '../../src/contexts/NotificationContext';
import Evidence from '../../src/pages/Evidence';

// Mock all evidence service functions
vi.mock('../../src/services/evidence', () => ({
  getTestimonies: vi.fn(),
  getBiologicalEvidence: vi.fn(),
  getVehicleEvidence: vi.fn(),
  getIDDocuments: vi.fn(),
  getGenericEvidence: vi.fn(),
}));

import {
  getTestimonies,
  getBiologicalEvidence,
  getVehicleEvidence,
  getIDDocuments,
  getGenericEvidence,
} from '../../src/services/evidence';

const renderEvidence = () =>
  render(
    <MemoryRouter initialEntries={['/evidence']}>
      <NotificationProvider>
        <Evidence />
      </NotificationProvider>
    </MemoryRouter>
  );

const mockEmpty = () => ({ results: [] });

describe('Evidence Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTestimonies).mockResolvedValue(mockEmpty());
    vi.mocked(getBiologicalEvidence).mockResolvedValue(mockEmpty());
    vi.mocked(getVehicleEvidence).mockResolvedValue(mockEmpty());
    vi.mocked(getIDDocuments).mockResolvedValue(mockEmpty());
    vi.mocked(getGenericEvidence).mockResolvedValue(mockEmpty());
  });

  it('renders page title and tabs', async () => {
    renderEvidence();
    expect(screen.getByText(/Evidence Locker/i)).toBeInTheDocument();
    expect(screen.getByText(/Testimonies/i)).toBeInTheDocument();
    expect(screen.getByText(/Biological/i)).toBeInTheDocument();
    expect(screen.getByText(/Vehicles/i)).toBeInTheDocument();
  });

  it('fetches testimonies on initial load', async () => {
    renderEvidence();
    await waitFor(() => {
      expect(getTestimonies).toHaveBeenCalled();
    });
  });

  it('switches tabs and fetches correct data', async () => {
    renderEvidence();
    const vehiclesTab = screen.getByText(/Vehicles/i);
    fireEvent.click(vehiclesTab);

    await waitFor(() => {
      expect(getVehicleEvidence).toHaveBeenCalled();
    });
  });

  it('renders testimony cards when data available', async () => {
    vi.mocked(getTestimonies).mockResolvedValue({
      count: 1,
      results: [
        {
          id: 1,
          title: 'Witness Statement A',
          witness_name: 'Jane Doe',
          description: 'I saw the suspect flee',
          case: 1,
          recorded_at: '2024-01-01T00:00:00Z',
          recorded_by: { id: 1, username: 'officer1' },
        },
      ],
    });

    renderEvidence();
    await waitFor(() => {
      expect(screen.getByText('Witness Statement A')).toBeInTheDocument();
    });
  });

  it('shows empty state when no evidence found', async () => {
    vi.mocked(getTestimonies).mockResolvedValue({ count: 0, results: [] });
    renderEvidence();
    await waitFor(() => {
      expect(screen.getByText(/No testimonies recorded/i)).toBeInTheDocument();
    });
  });

  it('has a link to register new evidence', () => {
    renderEvidence();
    expect(screen.getByText(/Register Evidence/i)).toBeInTheDocument();
  });
});
